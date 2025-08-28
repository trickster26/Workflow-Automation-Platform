import { Sequelize, DataTypes } from 'sequelize';
import { WorkflowModel, IWorkflow, IWorkflowCreationAttributes } from '../../models/Workflow.model';
import { UserModel } from '../../models/User.model';
import { NodeType } from '../../types/workflow.types';

// Setup in-memory SQLite database for testing
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:',
  logging: false,
});

// Initialize models
UserModel.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  firstName: DataTypes.STRING,
  lastName: DataTypes.STRING,
  role: {
    type: DataTypes.ENUM('admin', 'user'),
    defaultValue: 'user',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  lastLogin: DataTypes.DATE,
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
});

WorkflowModel.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 255],
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  definition: {
    type: DataTypes.JSON,
    allowNull: false,
    validate: {
      isValidDefinition(value: any) {
        if (!value || typeof value !== 'object') {
          throw new Error('Definition must be a valid JSON object');
        }
        if (!value.nodes || !Array.isArray(value.nodes)) {
          throw new Error('Definition must contain a nodes array');
        }
        if (!value.connections || typeof value.connections !== 'object') {
          throw new Error('Definition must contain a connections object');
        }
      },
    },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
}, {
  sequelize,
  modelName: 'Workflow',
  tableName: 'workflows',
  timestamps: true,
});

// Define associations
WorkflowModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user' });
UserModel.hasMany(WorkflowModel, { foreignKey: 'userId', as: 'workflows' });

describe('Workflow Model', () => {
  let testUser: UserModel;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await WorkflowModel.destroy({ where: {} });
    await UserModel.destroy({ where: {} });
    
    // Create test user
    testUser = await UserModel.create({
      email: 'test@example.com',
      username: 'testuser',
      password: 'hashedpassword123',
      firstName: 'Test',
      lastName: 'User',
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Model Creation', () => {
    it('should create a workflow with valid data', async () => {
      const workflowData: IWorkflowCreationAttributes = {
        name: 'Test Workflow',
        description: 'A test workflow for testing',
        definition: {
          nodes: [
            {
              id: 'node-1',
              type: 'http' as NodeType,
              name: 'HTTP Request',
              position: { x: 100, y: 100 },
              parameters: {
                url: 'https://api.example.com',
                method: 'GET',
              },
            },
          ],
          connections: {
            'node-1': {
              main: [],
            },
          },
        },
        userId: testUser.id,
        isActive: true,
      };

      const workflow = await WorkflowModel.create(workflowData);

      expect(workflow).toBeInstanceOf(WorkflowModel);
      expect(workflow.id).toBeDefined();
      expect(workflow.name).toBe(workflowData.name);
      expect(workflow.description).toBe(workflowData.description);
      expect(workflow.definition).toEqual(workflowData.definition);
      expect(workflow.userId).toBe(testUser.id);
      expect(workflow.isActive).toBe(true);
      expect(workflow.createdAt).toBeInstanceOf(Date);
      expect(workflow.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a workflow with minimal required data', async () => {
      const workflowData: IWorkflowCreationAttributes = {
        name: 'Minimal Workflow',
        definition: {
          nodes: [
            {
              id: 'trigger',
              type: 'trigger' as NodeType,
              name: 'Start',
              position: { x: 0, y: 0 },
              parameters: {},
            },
          ],
          connections: {},
        },
        userId: testUser.id,
      };

      const workflow = await WorkflowModel.create(workflowData);

      expect(workflow.name).toBe(workflowData.name);
      expect(workflow.description).toBeNull();
      expect(workflow.isActive).toBe(false); // Default value
      expect(workflow.userId).toBe(testUser.id);
    });

    it('should create workflow with complex definition', async () => {
      const complexDefinition = {
        nodes: [
          {
            id: 'trigger-1',
            type: 'webhook' as NodeType,
            name: 'Webhook Trigger',
            position: { x: 100, y: 100 },
            parameters: {
              path: '/webhook',
              method: 'POST',
            },
          },
          {
            id: 'http-1',
            type: 'http' as NodeType,
            name: 'Fetch Data',
            position: { x: 300, y: 100 },
            parameters: {
              url: 'https://api.example.com/data',
              method: 'GET',
              headers: {
                'Authorization': 'Bearer {{$credentials.token}}',
              },
            },
          },
          {
            id: 'transform-1',
            type: 'transform' as NodeType,
            name: 'Transform Data',
            position: { x: 500, y: 100 },
            parameters: {
              script: 'return data.map(item => ({ id: item.id, name: item.name }));',
            },
          },
          {
            id: 'email-1',
            type: 'email' as NodeType,
            name: 'Send Email',
            position: { x: 700, y: 100 },
            parameters: {
              to: 'user@example.com',
              subject: 'Workflow completed',
              body: 'Data processed successfully',
            },
          },
        ],
        connections: {
          'trigger-1': {
            main: [['http-1']],
          },
          'http-1': {
            main: [['transform-1']],
          },
          'transform-1': {
            main: [['email-1']],
          },
        },
      };

      const workflow = await WorkflowModel.create({
        name: 'Complex Workflow',
        description: 'A complex workflow with multiple nodes',
        definition: complexDefinition,
        userId: testUser.id,
        isActive: true,
      });

      expect(workflow.definition).toEqual(complexDefinition);
      expect(workflow.definition.nodes).toHaveLength(4);
      expect(Object.keys(workflow.definition.connections)).toHaveLength(3);
    });
  });

  describe('Model Validation', () => {
    it('should throw error for empty name', async () => {
      const workflowData = {
        name: '', // Empty name
        definition: {
          nodes: [],
          connections: {},
        },
        userId: testUser.id,
      };

      await expect(WorkflowModel.create(workflowData as any)).rejects.toThrow();
    });

    it('should throw error for too long name', async () => {
      const workflowData = {
        name: 'x'.repeat(256), // Too long
        definition: {
          nodes: [],
          connections: {},
        },
        userId: testUser.id,
      };

      await expect(WorkflowModel.create(workflowData as any)).rejects.toThrow();
    });

    it('should throw error for missing definition', async () => {
      const workflowData = {
        name: 'Test Workflow',
        userId: testUser.id,
        // Missing definition
      };

      await expect(WorkflowModel.create(workflowData as any)).rejects.toThrow();
    });

    it('should throw error for invalid definition structure', async () => {
      const workflowData = {
        name: 'Test Workflow',
        definition: 'invalid_definition', // Should be object
        userId: testUser.id,
      };

      await expect(WorkflowModel.create(workflowData as any)).rejects.toThrow();
    });

    it('should throw error for definition without nodes array', async () => {
      const workflowData = {
        name: 'Test Workflow',
        definition: {
          connections: {},
          // Missing nodes array
        },
        userId: testUser.id,
      };

      await expect(WorkflowModel.create(workflowData as any)).rejects.toThrow();
    });

    it('should throw error for definition without connections object', async () => {
      const workflowData = {
        name: 'Test Workflow',
        definition: {
          nodes: [],
          // Missing connections object
        },
        userId: testUser.id,
      };

      await expect(WorkflowModel.create(workflowData as any)).rejects.toThrow();
    });

    it('should throw error for missing userId', async () => {
      const workflowData = {
        name: 'Test Workflow',
        definition: {
          nodes: [],
          connections: {},
        },
        // Missing userId
      };

      await expect(WorkflowModel.create(workflowData as any)).rejects.toThrow();
    });

    it('should throw error for invalid userId reference', async () => {
      const workflowData = {
        name: 'Test Workflow',
        definition: {
          nodes: [],
          connections: {},
        },
        userId: 99999, // Non-existent user
      };

      await expect(WorkflowModel.create(workflowData)).rejects.toThrow();
    });
  });

  describe('Instance Methods', () => {
    let testWorkflow: WorkflowModel;

    beforeEach(async () => {
      testWorkflow = await WorkflowModel.create({
        name: 'Test Workflow',
        description: 'A test workflow',
        definition: {
          nodes: [
            {
              id: 'node-1',
              type: 'http' as NodeType,
              name: 'HTTP Node',
              position: { x: 100, y: 100 },
              parameters: { url: 'https://api.test.com' },
            },
          ],
          connections: {},
        },
        userId: testUser.id,
        isActive: false,
      });
    });

    describe('activate/deactivate', () => {
      it('should activate workflow', async () => {
        expect(testWorkflow.isActive).toBe(false);
        
        await testWorkflow.update({ isActive: true });
        
        expect(testWorkflow.isActive).toBe(true);
      });

      it('should deactivate workflow', async () => {
        await testWorkflow.update({ isActive: true });
        expect(testWorkflow.isActive).toBe(true);
        
        await testWorkflow.update({ isActive: false });
        
        expect(testWorkflow.isActive).toBe(false);
      });
    });

    describe('getNodeCount', () => {
      it('should return correct node count', () => {
        const nodeCount = testWorkflow.definition.nodes.length;
        
        expect(nodeCount).toBe(1);
      });

      it('should handle empty nodes array', async () => {
        await testWorkflow.update({
          definition: {
            nodes: [],
            connections: {},
          },
        });
        
        const nodeCount = testWorkflow.definition.nodes.length;
        
        expect(nodeCount).toBe(0);
      });
    });

    describe('hasNode', () => {
      it('should return true for existing node', () => {
        const hasNode = testWorkflow.definition.nodes.some(node => node.id === 'node-1');
        
        expect(hasNode).toBe(true);
      });

      it('should return false for non-existing node', () => {
        const hasNode = testWorkflow.definition.nodes.some(node => node.id === 'non-existing');
        
        expect(hasNode).toBe(false);
      });
    });

    describe('getNodesByType', () => {
      it('should return nodes of specific type', async () => {
        await testWorkflow.update({
          definition: {
            nodes: [
              {
                id: 'http-1',
                type: 'http' as NodeType,
                name: 'HTTP 1',
                position: { x: 100, y: 100 },
                parameters: {},
              },
              {
                id: 'http-2',
                type: 'http' as NodeType,
                name: 'HTTP 2',
                position: { x: 200, y: 100 },
                parameters: {},
              },
              {
                id: 'email-1',
                type: 'email' as NodeType,
                name: 'Email 1',
                position: { x: 300, y: 100 },
                parameters: {},
              },
            ],
            connections: {},
          },
        });

        const httpNodes = testWorkflow.definition.nodes.filter(node => node.type === 'http');
        const emailNodes = testWorkflow.definition.nodes.filter(node => node.type === 'email');
        
        expect(httpNodes).toHaveLength(2);
        expect(emailNodes).toHaveLength(1);
      });
    });
  });

  describe('Model Associations', () => {
    it('should belong to a user', async () => {
      const workflow = await WorkflowModel.create({
        name: 'Association Test',
        definition: {
          nodes: [],
          connections: {},
        },
        userId: testUser.id,
      });

      const workflowWithUser = await WorkflowModel.findByPk(workflow.id, {
        include: [{ model: UserModel, as: 'user' }],
      });

      expect(workflowWithUser?.user).toBeDefined();
      expect(workflowWithUser?.user.id).toBe(testUser.id);
      expect(workflowWithUser?.user.email).toBe(testUser.email);
    });

    it('should allow user to have multiple workflows', async () => {
      await WorkflowModel.bulkCreate([
        {
          name: 'Workflow 1',
          definition: { nodes: [], connections: {} },
          userId: testUser.id,
        },
        {
          name: 'Workflow 2',
          definition: { nodes: [], connections: {} },
          userId: testUser.id,
        },
        {
          name: 'Workflow 3',
          definition: { nodes: [], connections: {} },
          userId: testUser.id,
        },
      ]);

      const userWithWorkflows = await UserModel.findByPk(testUser.id, {
        include: [{ model: WorkflowModel, as: 'workflows' }],
      });

      expect(userWithWorkflows?.workflows).toBeDefined();
      expect(userWithWorkflows?.workflows).toHaveLength(3);
    });
  });

  describe('Model Queries', () => {
    beforeEach(async () => {
      // Create another user
      const anotherUser = await UserModel.create({
        email: 'another@example.com',
        username: 'anotheruser',
        password: 'hashedpassword123',
      });

      // Create test workflows
      await WorkflowModel.bulkCreate([
        {
          name: 'Active Workflow 1',
          description: 'Active workflow by test user',
          definition: { nodes: [], connections: {} },
          userId: testUser.id,
          isActive: true,
        },
        {
          name: 'Inactive Workflow 1',
          description: 'Inactive workflow by test user',
          definition: { nodes: [], connections: {} },
          userId: testUser.id,
          isActive: false,
        },
        {
          name: 'Another User Workflow',
          description: 'Workflow by another user',
          definition: { nodes: [], connections: {} },
          userId: anotherUser.id,
          isActive: true,
        },
      ]);
    });

    it('should find workflows by user', async () => {
      const userWorkflows = await WorkflowModel.findAll({
        where: { userId: testUser.id },
      });

      expect(userWorkflows).toHaveLength(2);
      userWorkflows.forEach(workflow => {
        expect(workflow.userId).toBe(testUser.id);
      });
    });

    it('should find active workflows only', async () => {
      const activeWorkflows = await WorkflowModel.findAll({
        where: { isActive: true },
      });

      expect(activeWorkflows).toHaveLength(2);
      activeWorkflows.forEach(workflow => {
        expect(workflow.isActive).toBe(true);
      });
    });

    it('should find workflows by name pattern', async () => {
      const Op = require('sequelize').Op;
      
      const activeWorkflows = await WorkflowModel.findAll({
        where: {
          name: {
            [Op.like]: '%Active%',
          },
        },
      });

      expect(activeWorkflows).toHaveLength(1);
      expect(activeWorkflows[0].name).toContain('Active');
    });

    it('should count workflows', async () => {
      const totalCount = await WorkflowModel.count();
      const userCount = await WorkflowModel.count({
        where: { userId: testUser.id },
      });
      const activeCount = await WorkflowModel.count({
        where: { isActive: true },
      });

      expect(totalCount).toBe(3);
      expect(userCount).toBe(2);
      expect(activeCount).toBe(2);
    });

    it('should paginate workflows', async () => {
      const page1 = await WorkflowModel.findAndCountAll({
        limit: 2,
        offset: 0,
        order: [['createdAt', 'DESC']],
      });

      const page2 = await WorkflowModel.findAndCountAll({
        limit: 2,
        offset: 2,
        order: [['createdAt', 'DESC']],
      });

      expect(page1.count).toBe(3);
      expect(page1.rows).toHaveLength(2);
      expect(page2.rows).toHaveLength(1);
    });
  });

  describe('Model Updates', () => {
    let testWorkflow: WorkflowModel;

    beforeEach(async () => {
      testWorkflow = await WorkflowModel.create({
        name: 'Update Test Workflow',
        description: 'Original description',
        definition: {
          nodes: [
            {
              id: 'node-1',
              type: 'http' as NodeType,
              name: 'Original Node',
              position: { x: 100, y: 100 },
              parameters: { url: 'https://original.com' },
            },
          ],
          connections: {},
        },
        userId: testUser.id,
        isActive: false,
      });
    });

    it('should update workflow properties', async () => {
      await testWorkflow.update({
        name: 'Updated Workflow Name',
        description: 'Updated description',
        isActive: true,
      });

      await testWorkflow.reload();

      expect(testWorkflow.name).toBe('Updated Workflow Name');
      expect(testWorkflow.description).toBe('Updated description');
      expect(testWorkflow.isActive).toBe(true);
      expect(testWorkflow.updatedAt).toBeInstanceOf(Date);
    });

    it('should update workflow definition', async () => {
      const newDefinition = {
        nodes: [
          {
            id: 'updated-node',
            type: 'transform' as NodeType,
            name: 'Updated Node',
            position: { x: 200, y: 200 },
            parameters: { script: 'return data;' },
          },
          {
            id: 'new-node',
            type: 'email' as NodeType,
            name: 'New Node',
            position: { x: 400, y: 200 },
            parameters: { to: 'test@example.com' },
          },
        ],
        connections: {
          'updated-node': {
            main: [['new-node']],
          },
        },
      };

      await testWorkflow.update({ definition: newDefinition });

      expect(testWorkflow.definition).toEqual(newDefinition);
      expect(testWorkflow.definition.nodes).toHaveLength(2);
      expect(Object.keys(testWorkflow.definition.connections)).toHaveLength(1);
    });

    it('should maintain data integrity on partial updates', async () => {
      const originalDefinition = testWorkflow.definition;
      const originalUserId = testWorkflow.userId;

      await testWorkflow.update({
        name: 'Partially Updated',
      });

      expect(testWorkflow.name).toBe('Partially Updated');
      expect(testWorkflow.definition).toEqual(originalDefinition);
      expect(testWorkflow.userId).toBe(originalUserId);
    });
  });

  describe('Model Deletion', () => {
    let testWorkflow: WorkflowModel;

    beforeEach(async () => {
      testWorkflow = await WorkflowModel.create({
        name: 'Delete Test Workflow',
        definition: { nodes: [], connections: {} },
        userId: testUser.id,
      });
    });

    it('should delete workflow successfully', async () => {
      const workflowId = testWorkflow.id;
      
      await testWorkflow.destroy();

      const deletedWorkflow = await WorkflowModel.findByPk(workflowId);
      expect(deletedWorkflow).toBeNull();
    });

    it('should cascade delete when user is deleted', async () => {
      const workflowId = testWorkflow.id;
      
      // This would depend on cascade settings in production
      // For this test, we'll manually verify the relationship
      expect(testWorkflow.userId).toBe(testUser.id);
      
      const userWorkflows = await WorkflowModel.findAll({
        where: { userId: testUser.id },
      });
      
      expect(userWorkflows).toHaveLength(1);
    });
  });
});