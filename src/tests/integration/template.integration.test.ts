import request from 'supertest';
import express from 'express';
import { simpleTemplateRoutes } from '../../routes/simpleTemplateRoutes';
import { WorkflowModel } from '../../models/Workflow.model';

const app = express();
app.use(express.json());
app.use('/api/templates', simpleTemplateRoutes);

// Mock the WorkflowModel for integration testing
jest.mock('../../models/Workflow.model');
const mockWorkflowModel = WorkflowModel as jest.Mocked<typeof WorkflowModel>;

describe('Template Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('End-to-End Template Workflow', () => {
    it('should complete full template lifecycle: browse -> fork -> customize -> save', async () => {
      // Step 1: Browse templates
      const browseResponse = await request(app)
        .get('/api/templates')
        .expect(200);

      expect(browseResponse.body.success).toBe(true);
      const templates = browseResponse.body.data.nodeTemplates;
      expect(templates.length).toBeGreaterThan(0);

      // Step 2: Get specific template
      const templateId = templates[0].templateId;
      const templateResponse = await request(app)
        .get(`/api/templates/${templateId}`)
        .expect(200);

      expect(templateResponse.body.success).toBe(true);
      expect(templateResponse.body.data.templateId).toBe(templateId);

      // Step 3: Fork template to create workflow
      mockWorkflowModel.create.mockResolvedValue({
        id: 123,
        name: 'Forked Workflow',
        description: 'Created from template',
        userId: 1,
        nodes: [],
        connections: [],
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        toJSON: () => ({
          id: 123,
          name: 'Forked Workflow',
          nodes: [],
          connections: []
        })
      } as any);

      const forkResponse = await request(app)
        .post(`/api/templates/fork/${templateId}`)
        .send({
          workflowName: 'My Custom Workflow',
          userId: 1
        })
        .expect(200);

      expect(forkResponse.body.success).toBe(true);
      expect(forkResponse.body.data.workflowId).toBe(123);

      // Step 4: Create custom template
      const customTemplate = {
        name: 'Integration Test Template',
        description: 'Created during integration testing',
        category: 'integration',
        difficulty: 'beginner',
        tags: ['test', 'integration'],
        useCase: ['testing'],
        nodes: [{
          id: 'test-node',
          type: 'http',
          name: 'Test HTTP Node',
          position: { x: 100, y: 100 },
          configuration: { method: 'GET', url: 'https://api.test.com' }
        }],
        connections: []
      };

      const customResponse = await request(app)
        .post('/api/templates/custom')
        .send(customTemplate)
        .expect(200);

      expect(customResponse.body.success).toBe(true);
      expect(customResponse.body.data.name).toBe(customTemplate.name);
    });

    it('should handle complex workflow template forking', async () => {
      // Mock workflow creation for complex template
      mockWorkflowModel.create.mockResolvedValue({
        id: 456,
        name: 'Complex Workflow',
        description: 'Multi-node workflow from template',
        userId: 1,
        nodes: [],
        connections: [],
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        toJSON: () => ({
          id: 456,
          name: 'Complex Workflow',
          nodes: [
            { id: 'node1', type: 'trigger', name: 'Webhook Trigger' },
            { id: 'node2', type: 'http', name: 'API Call' },
            { id: 'node3', type: 'email', name: 'Send Email' }
          ],
          connections: [
            { from: 'node1', to: 'node2' },
            { from: 'node2', to: 'node3' }
          ]
        })
      } as any);

      const response = await request(app)
        .post('/api/templates/fork/ecommerce-order-processing')
        .send({
          workflowName: 'My E-commerce Pipeline',
          userId: 1
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.nodes.length).toBeGreaterThan(1);
      expect(response.body.data.connections.length).toBeGreaterThan(0);
    });
  });

  describe('Template Search and Filtering Integration', () => {
    it('should support complex search and filtering combinations', async () => {
      const response = await request(app)
        .get('/api/templates')
        .query({
          search: 'api',
          category: 'integration',
          difficulty: 'beginner'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      const templates = response.body.data.nodeTemplates;
      
      templates.forEach((template: any) => {
        expect(template.category).toBe('integration');
        expect(template.difficulty).toBe('beginner');
        expect(
          template.name.toLowerCase().includes('api') ||
          template.description.toLowerCase().includes('api') ||
          template.tags.some((tag: string) => tag.toLowerCase().includes('api'))
        ).toBe(true);
      });
    });

    it('should return empty results for non-matching filters', async () => {
      const response = await request(app)
        .get('/api/templates')
        .query({
          search: 'nonexistentterm',
          category: 'nonexistentcategory'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.nodeTemplates).toHaveLength(0);
      expect(response.body.data.workflowTemplates).toHaveLength(0);
    });
  });

  describe('Template Performance Tests', () => {
    it('should handle high load of template requests', async () => {
      const promises = [];
      const requestCount = 10;

      // Create multiple concurrent requests
      for (let i = 0; i < requestCount; i++) {
        promises.push(
          request(app)
            .get('/api/templates')
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('nodeTemplates');
      });
    });

    it('should handle large custom template creation', async () => {
      const largeTemplate = {
        name: 'Large Template',
        description: 'A template with many nodes for performance testing',
        category: 'data-processing',
        difficulty: 'advanced',
        tags: ['performance', 'large', 'test'],
        useCase: ['performance-testing'],
        nodes: [],
        connections: []
      };

      // Create 50 nodes for performance testing
      for (let i = 0; i < 50; i++) {
        largeTemplate.nodes.push({
          id: `node-${i}`,
          type: i % 2 === 0 ? 'transformer' : 'filter',
          name: `Node ${i}`,
          position: { x: (i % 10) * 150, y: Math.floor(i / 10) * 100 },
          configuration: { param: `value-${i}` }
        });

        if (i > 0) {
          largeTemplate.connections.push({
            from: `node-${i-1}`,
            to: `node-${i}`
          });
        }
      }

      const startTime = Date.now();
      const response = await request(app)
        .post('/api/templates/custom')
        .send(largeTemplate)
        .expect(200);
      const endTime = Date.now();

      expect(response.body.success).toBe(true);
      expect(response.body.data.nodes).toHaveLength(50);
      expect(response.body.data.connections).toHaveLength(49);
      
      // Should complete within reasonable time (less than 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });

  describe('Template Data Integrity Tests', () => {
    it('should maintain data integrity when forking templates', async () => {
      mockWorkflowModel.create.mockImplementation(async (data: any) => {
        // Validate that the data passed to create is properly structured
        expect(data).toHaveProperty('name');
        expect(data).toHaveProperty('userId');
        expect(data).toHaveProperty('nodes');
        expect(data).toHaveProperty('connections');
        
        return {
          id: 789,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          toJSON: () => ({ id: 789, ...data })
        } as any;
      });

      const response = await request(app)
        .post('/api/templates/fork/slack-notification')
        .send({
          workflowName: 'Data Integrity Test',
          userId: 1
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockWorkflowModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Data Integrity Test',
          userId: 1,
          nodes: expect.any(Array),
          connections: expect.any(Array)
        })
      );
    });

    it('should preserve all template properties during custom template creation', async () => {
      const templateData = {
        name: 'Data Integrity Template',
        description: 'Testing data preservation',
        category: 'integration',
        difficulty: 'intermediate',
        tags: ['data', 'integrity', 'test'],
        useCase: ['testing', 'validation'],
        nodes: [{
          id: 'test-node',
          type: 'database',
          name: 'Database Node',
          position: { x: 200, y: 150 },
          configuration: {
            host: 'localhost',
            database: 'test_db',
            table: 'users'
          }
        }],
        connections: []
      };

      const response = await request(app)
        .post('/api/templates/custom')
        .send(templateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      const savedTemplate = response.body.data;
      
      expect(savedTemplate.name).toBe(templateData.name);
      expect(savedTemplate.description).toBe(templateData.description);
      expect(savedTemplate.category).toBe(templateData.category);
      expect(savedTemplate.difficulty).toBe(templateData.difficulty);
      expect(savedTemplate.tags).toEqual(templateData.tags);
      expect(savedTemplate.useCase).toEqual(templateData.useCase);
      expect(savedTemplate.nodes).toHaveLength(1);
      expect(savedTemplate.nodes[0].configuration).toEqual(templateData.nodes[0].configuration);
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle database connection failures gracefully', async () => {
      mockWorkflowModel.create.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/templates/fork/http-request')
        .send({
          workflowName: 'Test Workflow',
          userId: 1
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Failed to create workflow');
    });

    it('should validate and sanitize user input', async () => {
      const maliciousTemplate = {
        name: '<script>alert("xss")</script>',
        description: 'SQL injection attempt: \'; DROP TABLE users; --',
        category: 'integration',
        difficulty: 'beginner',
        tags: ['<img src=x onerror=alert(1)>'],
        useCase: ['testing'],
        nodes: [{
          id: 'node1',
          type: 'http',
          name: 'Test Node',
          position: { x: 100, y: 100 },
          configuration: {
            url: 'javascript:alert(1)'
          }
        }],
        connections: []
      };

      const response = await request(app)
        .post('/api/templates/custom')
        .send(maliciousTemplate)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Verify that malicious content is handled appropriately
      const savedTemplate = response.body.data;
      expect(savedTemplate.name).not.toContain('<script>');
      expect(savedTemplate.tags[0]).not.toContain('<img');
    });
  });
});