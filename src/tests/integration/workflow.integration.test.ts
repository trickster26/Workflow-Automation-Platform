import request from 'supertest';
import { Express } from 'express';
import { sequelize } from '../../config/database';
import { User as UserModel, Workflow as WorkflowModel, WorkflowExecution as ExecutionModel } from '../../models';

// Create a mock Express app for testing
const createTestApp = (): Express => {
  const express = require('express');
  const app = express();
  
  app.use(express.json());
  
  // Import actual routes
  const workflowRoutes = require('../../routes/workflows');
  app.use('/api/workflows', workflowRoutes);
  
  return app;
};

describe('Workflow Integration Tests', () => {
  let app: Express;
  let testUser: any;
  let validAccessToken: string;
  let testWorkflow: any;

  beforeAll(async () => {
    app = createTestApp();
    
    // Setup test database
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    // Clean up database
    await ExecutionModel.destroy({ where: {} });
    await WorkflowModel.destroy({ where: {} });
    await UserModel.destroy({ where: {} });
    
    // Create test user
    testUser = await UserModel.create({
      email: 'test@example.com',
      username: 'testuser',
      password: '$2a$12$hashedpassword',
      firstName: 'Test',
      lastName: 'User',
      status: 'active',
      emailVerified: true,
      role: 'user',
      isActive: true,
    });

    // Get access token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'password123',
      });

    validAccessToken = loginResponse.body.tokens.accessToken;

    // Create test workflow
    testWorkflow = await WorkflowModel.create({
      name: 'Test Workflow',
      description: 'A test workflow',
      userId: testUser.id,
      definition: {
        nodes: [
          {
            id: 'node-1',
            type: 'http',
            name: 'HTTP Request',
            position: { x: 100, y: 100 },
            parameters: { url: 'https://api.test.com' },
          },
        ],
        connections: {},
      },
      isActive: true,
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/workflows', () => {
    it('should create workflow successfully', async () => {
      const workflowData = {
        name: 'New Test Workflow',
        description: 'A new test workflow',
        definition: {
          nodes: [
            {
              id: 'node-1',
              type: 'email',
              name: 'Send Email',
              position: { x: 200, y: 200 },
              parameters: { to: 'test@example.com' },
            },
          ],
          connections: {},
        },
      };

      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(workflowData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.workflow.name).toBe(workflowData.name);
      expect(response.body.workflow.description).toBe(workflowData.description);
      expect(response.body.workflow.userId).toBe(testUser.id);
      expect(response.body.workflow.isActive).toBe(false);
      expect(response.body.workflow.definition).toEqual(workflowData.definition);
    });

    it('should return 401 for missing token', async () => {
      const workflowData = {
        name: 'Test Workflow',
        definition: { nodes: [], connections: {} },
      };

      const response = await request(app)
        .post('/api/workflows')
        .send(workflowData)
        .expect(401);

      expect(response.body.error).toBe('Access denied');
    });

    it('should return 400 for missing required fields', async () => {
      const workflowData = {
        description: 'Missing name and definition',
      };

      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(workflowData)
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
    });

    it('should return 400 for invalid definition structure', async () => {
      const workflowData = {
        name: 'Invalid Workflow',
        definition: 'invalid_definition', // Should be object
      };

      const response = await request(app)
        .post('/api/workflows')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(workflowData)
        .expect(400);

      expect(response.body.error).toContain('validation');
    });
  });

  describe('GET /api/workflows', () => {
    beforeEach(async () => {
      // Create additional workflows for pagination testing
      await WorkflowModel.bulkCreate([
        {
          name: 'Workflow 2',
          userId: testUser.id,
          definition: { nodes: [], connections: {} },
          isActive: false,
        },
        {
          name: 'Workflow 3',
          userId: testUser.id,
          definition: { nodes: [], connections: {} },
          isActive: true,
        },
      ]);
    });

    it('should get user workflows with pagination', async () => {
      const response = await request(app)
        .get('/api/workflows?page=1&limit=2')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.workflows).toHaveLength(2);
      expect(response.body.pagination.total).toBe(3);
      expect(response.body.pagination.pages).toBe(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
    });

    it('should filter workflows by active status', async () => {
      const response = await request(app)
        .get('/api/workflows?active=true')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.workflows).toHaveLength(2); // testWorkflow and Workflow 3
      response.body.workflows.forEach((workflow: any) => {
        expect(workflow.isActive).toBe(true);
      });
    });

    it('should search workflows by name', async () => {
      const response = await request(app)
        .get('/api/workflows?search=Test')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.workflows).toHaveLength(1);
      expect(response.body.workflows[0].name).toContain('Test');
    });

    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .get('/api/workflows')
        .expect(401);

      expect(response.body.error).toBe('Access denied');
    });

    it('should only return workflows belonging to the authenticated user', async () => {
      // Create another user with workflow
      const otherUser = await UserModel.create({
        email: 'other@example.com',
        username: 'otheruser',
        password: '$2a$12$hashedpassword',
        status: 'active',
        emailVerified: true,
      });

      await WorkflowModel.create({
        name: 'Other User Workflow',
        userId: otherUser.id,
        definition: { nodes: [], connections: {} },
      });

      const response = await request(app)
        .get('/api/workflows')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(response.body.workflows).toHaveLength(3); // Only testUser's workflows
      response.body.workflows.forEach((workflow: any) => {
        expect(workflow.userId).toBe(testUser.id);
      });
    });
  });

  describe('GET /api/workflows/:id', () => {
    it('should get workflow by id', async () => {
      const response = await request(app)
        .get(`/api/workflows/${testWorkflow.id}`)
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.workflow.id).toBe(testWorkflow.id);
      expect(response.body.workflow.name).toBe(testWorkflow.name);
      expect(response.body.workflow.definition).toEqual(testWorkflow.definition);
    });

    it('should return 404 for non-existent workflow', async () => {
      const response = await request(app)
        .get('/api/workflows/999999')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(404);

      expect(response.body.error).toBe('Workflow not found');
    });

    it('should return 404 for workflow belonging to another user', async () => {
      // Create another user with workflow
      const otherUser = await UserModel.create({
        email: 'other@example.com',
        username: 'otheruser',
        password: '$2a$12$hashedpassword',
        status: 'active',
        emailVerified: true,
      });

      const otherWorkflow = await WorkflowModel.create({
        name: 'Other User Workflow',
        userId: otherUser.id,
        definition: { nodes: [], connections: {} },
      });

      const response = await request(app)
        .get(`/api/workflows/${otherWorkflow.id}`)
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(404);

      expect(response.body.error).toBe('Workflow not found');
    });

    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .get(`/api/workflows/${testWorkflow.id}`)
        .expect(401);

      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('PUT /api/workflows/:id', () => {
    it('should update workflow successfully', async () => {
      const updateData = {
        name: 'Updated Workflow Name',
        description: 'Updated description',
        isActive: false,
        definition: {
          nodes: [
            {
              id: 'node-2',
              type: 'database',
              name: 'Database Query',
              position: { x: 300, y: 300 },
              parameters: { query: 'SELECT * FROM users' },
            },
          ],
          connections: {},
        },
      };

      const response = await request(app)
        .put(`/api/workflows/${testWorkflow.id}`)
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.workflow.name).toBe(updateData.name);
      expect(response.body.workflow.description).toBe(updateData.description);
      expect(response.body.workflow.isActive).toBe(updateData.isActive);
      expect(response.body.workflow.definition).toEqual(updateData.definition);
    });

    it('should return 404 for non-existent workflow', async () => {
      const updateData = { name: 'Updated Name' };

      const response = await request(app)
        .put('/api/workflows/999999')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.error).toBe('Workflow not found');
    });

    it('should return 404 for workflow belonging to another user', async () => {
      const otherUser = await UserModel.create({
        email: 'other@example.com',
        username: 'otheruser',
        password: '$2a$12$hashedpassword',
        status: 'active',
        emailVerified: true,
      });

      const otherWorkflow = await WorkflowModel.create({
        name: 'Other User Workflow',
        userId: otherUser.id,
        definition: { nodes: [], connections: {} },
      });

      const updateData = { name: 'Updated Name' };

      const response = await request(app)
        .put(`/api/workflows/${otherWorkflow.id}`)
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body.error).toBe('Workflow not found');
    });

    it('should return 401 for missing token', async () => {
      const updateData = { name: 'Updated Name' };

      const response = await request(app)
        .put(`/api/workflows/${testWorkflow.id}`)
        .send(updateData)
        .expect(401);

      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('DELETE /api/workflows/:id', () => {
    it('should delete workflow successfully', async () => {
      const response = await request(app)
        .delete(`/api/workflows/${testWorkflow.id}`)
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // Verify workflow is deleted
      const deletedWorkflow = await WorkflowModel.findByPk(testWorkflow.id);
      expect(deletedWorkflow).toBeNull();
    });

    it('should return 404 for non-existent workflow', async () => {
      const response = await request(app)
        .delete('/api/workflows/999999')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(404);

      expect(response.body.error).toBe('Workflow not found');
    });

    it('should return 404 for workflow belonging to another user', async () => {
      const otherUser = await UserModel.create({
        email: 'other@example.com',
        username: 'otheruser',
        password: '$2a$12$hashedpassword',
        status: 'active',
        emailVerified: true,
      });

      const otherWorkflow = await WorkflowModel.create({
        name: 'Other User Workflow',
        userId: otherUser.id,
        definition: { nodes: [], connections: {} },
      });

      const response = await request(app)
        .delete(`/api/workflows/${otherWorkflow.id}`)
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(404);

      expect(response.body.error).toBe('Workflow not found');
    });

    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .delete(`/api/workflows/${testWorkflow.id}`)
        .expect(401);

      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('POST /api/workflows/:id/execute', () => {
    it('should execute workflow successfully', async () => {
      const executionData = {
        inputData: { test: 'data' },
      };

      const response = await request(app)
        .post(`/api/workflows/${testWorkflow.id}/execute`)
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(executionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('execution started');
      expect(response.body.execution.workflowId).toBe(testWorkflow.id);
      expect(response.body.execution.status).toBe('running');
    });

    it('should return 400 for inactive workflow', async () => {
      // Update workflow to inactive
      await testWorkflow.update({ isActive: false });

      const executionData = {
        inputData: { test: 'data' },
      };

      const response = await request(app)
        .post(`/api/workflows/${testWorkflow.id}/execute`)
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(executionData)
        .expect(400);

      expect(response.body.error).toBe('Cannot execute workflow');
      expect(response.body.message).toContain('not active');
    });

    it('should return 404 for non-existent workflow', async () => {
      const executionData = {
        inputData: { test: 'data' },
      };

      const response = await request(app)
        .post('/api/workflows/999999/execute')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(executionData)
        .expect(404);

      expect(response.body.error).toBe('Workflow not found');
    });

    it('should return 401 for missing token', async () => {
      const executionData = {
        inputData: { test: 'data' },
      };

      const response = await request(app)
        .post(`/api/workflows/${testWorkflow.id}/execute`)
        .send(executionData)
        .expect(401);

      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('POST /api/workflows/:id/duplicate', () => {
    it('should duplicate workflow successfully', async () => {
      const duplicateData = {
        name: 'Copy of Test Workflow',
      };

      const response = await request(app)
        .post(`/api/workflows/${testWorkflow.id}/duplicate`)
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(duplicateData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.workflow.name).toBe(duplicateData.name);
      expect(response.body.workflow.description).toBe(testWorkflow.description);
      expect(response.body.workflow.definition).toEqual(testWorkflow.definition);
      expect(response.body.workflow.isActive).toBe(false);
      expect(response.body.workflow.userId).toBe(testUser.id);
      expect(response.body.workflow.id).not.toBe(testWorkflow.id);
    });

    it('should use default name if not provided', async () => {
      const response = await request(app)
        .post(`/api/workflows/${testWorkflow.id}/duplicate`)
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send({})
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.workflow.name).toContain('Copy of');
      expect(response.body.workflow.name).toContain(testWorkflow.name);
    });

    it('should return 404 for non-existent workflow', async () => {
      const duplicateData = {
        name: 'Copy of Workflow',
      };

      const response = await request(app)
        .post('/api/workflows/999999/duplicate')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(duplicateData)
        .expect(404);

      expect(response.body.error).toBe('Workflow not found');
    });

    it('should return 401 for missing token', async () => {
      const duplicateData = {
        name: 'Copy of Workflow',
      };

      const response = await request(app)
        .post(`/api/workflows/${testWorkflow.id}/duplicate`)
        .send(duplicateData)
        .expect(401);

      expect(response.body.error).toBe('Access denied');
    });
  });
});