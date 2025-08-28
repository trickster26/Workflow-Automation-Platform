import { TemplateService } from '../../services/TemplateService';
import { WorkflowModel } from '../../models/Workflow.model';

// Mock the WorkflowModel
jest.mock('../../models/Workflow.model');
const mockWorkflowModel = WorkflowModel as jest.Mocked<typeof WorkflowModel>;

describe('TemplateService', () => {
  let templateService: TemplateService;

  beforeEach(() => {
    templateService = new TemplateService();
    jest.clearAllMocks();
  });

  describe('createWorkflowFromTemplate', () => {
    const mockTemplate = {
      templateId: 'test-template',
      name: 'Test Template',
      description: 'A test template',
      nodes: [
        {
          id: 'node1',
          type: 'http',
          name: 'HTTP Request',
          position: { x: 100, y: 100 },
          configuration: { method: 'GET', url: 'https://api.test.com' }
        }
      ],
      connections: []
    };

    it('should create workflow from single node template', async () => {
      const mockWorkflow = {
        id: 123,
        name: 'Test Workflow',
        description: 'Created from template',
        userId: 1,
        nodes: mockTemplate.nodes,
        connections: mockTemplate.connections,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        toJSON: () => ({
          id: 123,
          name: 'Test Workflow',
          nodes: mockTemplate.nodes,
          connections: mockTemplate.connections
        })
      };

      mockWorkflowModel.create.mockResolvedValue(mockWorkflow as any);

      const result = await templateService.createWorkflowFromTemplate(
        mockTemplate,
        'Test Workflow',
        1
      );

      expect(mockWorkflowModel.create).toHaveBeenCalledWith({
        name: 'Test Workflow',
        description: `Created from template: ${mockTemplate.name}`,
        userId: 1,
        nodes: mockTemplate.nodes,
        connections: mockTemplate.connections,
        isActive: false,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });

      expect(result).toEqual({
        workflowId: 123,
        name: 'Test Workflow',
        nodes: mockTemplate.nodes,
        connections: mockTemplate.connections
      });
    });

    it('should create workflow from multi-node template', async () => {
      const multiNodeTemplate = {
        ...mockTemplate,
        nodes: [
          {
            id: 'node1',
            type: 'webhook',
            name: 'Webhook Trigger',
            position: { x: 100, y: 100 },
            configuration: {}
          },
          {
            id: 'node2',
            type: 'http',
            name: 'API Call',
            position: { x: 300, y: 100 },
            configuration: { method: 'POST', url: 'https://api.test.com' }
          }
        ],
        connections: [{ from: 'node1', to: 'node2' }]
      };

      const mockWorkflow = {
        id: 456,
        name: 'Multi-Node Workflow',
        userId: 1,
        nodes: multiNodeTemplate.nodes,
        connections: multiNodeTemplate.connections,
        toJSON: () => ({
          id: 456,
          name: 'Multi-Node Workflow',
          nodes: multiNodeTemplate.nodes,
          connections: multiNodeTemplate.connections
        })
      };

      mockWorkflowModel.create.mockResolvedValue(mockWorkflow as any);

      const result = await templateService.createWorkflowFromTemplate(
        multiNodeTemplate,
        'Multi-Node Workflow',
        1
      );

      expect(result.nodes).toHaveLength(2);
      expect(result.connections).toHaveLength(1);
      expect(result.connections[0]).toEqual({ from: 'node1', to: 'node2' });
    });

    it('should handle database errors gracefully', async () => {
      mockWorkflowModel.create.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        templateService.createWorkflowFromTemplate(mockTemplate, 'Test Workflow', 1)
      ).rejects.toThrow('Failed to create workflow from template: Database connection failed');
    });

    it('should validate template structure before creation', async () => {
      const invalidTemplate = {
        templateId: 'invalid',
        name: 'Invalid Template',
        description: 'Missing required fields'
        // Missing nodes and connections
      };

      await expect(
        templateService.createWorkflowFromTemplate(invalidTemplate as any, 'Test Workflow', 1)
      ).rejects.toThrow('Invalid template structure');
    });

    it('should generate unique node IDs for workflow', async () => {
      const mockWorkflow = {
        id: 789,
        name: 'Unique ID Test',
        userId: 1,
        toJSON: () => ({ id: 789, name: 'Unique ID Test', nodes: [], connections: [] })
      };

      mockWorkflowModel.create.mockResolvedValue(mockWorkflow as any);

      const result = await templateService.createWorkflowFromTemplate(
        mockTemplate,
        'Unique ID Test',
        1
      );

      expect(mockWorkflowModel.create).toHaveBeenCalled();
      const createCall = mockWorkflowModel.create.mock.calls[0][0];
      
      // Verify that node IDs are updated for the workflow context
      expect(createCall.nodes[0].id).toMatch(/^node1-\d+$/);
    });
  });

  describe('validateTemplateData', () => {
    it('should validate correct template structure', () => {
      const validTemplate = {
        name: 'Valid Template',
        description: 'A valid template',
        category: 'integration',
        difficulty: 'beginner',
        tags: ['test'],
        useCase: ['testing'],
        nodes: [{
          id: 'node1',
          type: 'http',
          name: 'HTTP Node',
          position: { x: 100, y: 100 },
          configuration: {}
        }],
        connections: []
      };

      expect(() => templateService.validateTemplateData(validTemplate)).not.toThrow();
    });

    it('should reject template without name', () => {
      const invalidTemplate = {
        description: 'Missing name',
        nodes: [],
        connections: []
      };

      expect(() => templateService.validateTemplateData(invalidTemplate as any))
        .toThrow('Template name is required');
    });

    it('should reject template without nodes', () => {
      const invalidTemplate = {
        name: 'No Nodes Template',
        description: 'Template without nodes',
        nodes: [],
        connections: []
      };

      expect(() => templateService.validateTemplateData(invalidTemplate))
        .toThrow('Template must have at least one node');
    });

    it('should reject template with invalid node structure', () => {
      const invalidTemplate = {
        name: 'Invalid Node Template',
        description: 'Template with invalid node',
        nodes: [{
          id: 'node1',
          // Missing type, name, position
          configuration: {}
        }],
        connections: []
      };

      expect(() => templateService.validateTemplateData(invalidTemplate as any))
        .toThrow('Invalid node structure');
    });

    it('should reject template with invalid connections', () => {
      const invalidTemplate = {
        name: 'Invalid Connection Template',
        description: 'Template with invalid connection',
        nodes: [{
          id: 'node1',
          type: 'http',
          name: 'HTTP Node',
          position: { x: 100, y: 100 },
          configuration: {}
        }],
        connections: [{
          from: 'nonexistent',
          to: 'node1'
        }]
      };

      expect(() => templateService.validateTemplateData(invalidTemplate))
        .toThrow('Invalid connection: references non-existent node');
    });
  });

  describe('searchTemplates', () => {
    const sampleTemplates = [
      {
        templateId: 'http-1',
        name: 'HTTP Request',
        description: 'Make HTTP API calls',
        category: 'integration',
        difficulty: 'beginner',
        tags: ['http', 'api']
      },
      {
        templateId: 'email-1',
        name: 'Email Sender',
        description: 'Send emails via SMTP',
        category: 'communication',
        difficulty: 'intermediate',
        tags: ['email', 'smtp']
      },
      {
        templateId: 'data-1',
        name: 'Data Transformer',
        description: 'Transform JSON data',
        category: 'data-processing',
        difficulty: 'advanced',
        tags: ['data', 'json', 'transform']
      }
    ];

    it('should search templates by name', () => {
      const results = templateService.searchTemplates(sampleTemplates, {
        search: 'http'
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('HTTP Request');
    });

    it('should search templates by description', () => {
      const results = templateService.searchTemplates(sampleTemplates, {
        search: 'smtp'
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Email Sender');
    });

    it('should search templates by tags', () => {
      const results = templateService.searchTemplates(sampleTemplates, {
        search: 'json'
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Data Transformer');
    });

    it('should filter by category', () => {
      const results = templateService.searchTemplates(sampleTemplates, {
        category: 'integration'
      });

      expect(results).toHaveLength(1);
      expect(results[0].category).toBe('integration');
    });

    it('should filter by difficulty', () => {
      const results = templateService.searchTemplates(sampleTemplates, {
        difficulty: 'beginner'
      });

      expect(results).toHaveLength(1);
      expect(results[0].difficulty).toBe('beginner');
    });

    it('should combine search and filters', () => {
      const results = templateService.searchTemplates(sampleTemplates, {
        search: 'data',
        category: 'data-processing',
        difficulty: 'advanced'
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Data Transformer');
    });

    it('should return empty array when no matches found', () => {
      const results = templateService.searchTemplates(sampleTemplates, {
        search: 'nonexistent'
      });

      expect(results).toHaveLength(0);
    });

    it('should be case insensitive', () => {
      const results = templateService.searchTemplates(sampleTemplates, {
        search: 'HTTP'
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('HTTP Request');
    });
  });

  describe('generateTemplateId', () => {
    it('should generate unique template IDs', () => {
      const id1 = templateService.generateTemplateId('Test Template');
      const id2 = templateService.generateTemplateId('Test Template');

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^test-template-\d+$/);
      expect(id2).toMatch(/^test-template-\d+$/);
    });

    it('should handle special characters in names', () => {
      const id = templateService.generateTemplateId('My Custom Template @#$%');

      expect(id).toMatch(/^my-custom-template-\d+$/);
    });

    it('should handle empty names', () => {
      const id = templateService.generateTemplateId('');

      expect(id).toMatch(/^template-\d+$/);
    });
  });

  describe('getTemplateStats', () => {
    it('should calculate template statistics correctly', () => {
      const templates = [
        { category: 'integration', difficulty: 'beginner', tags: ['http', 'api'] },
        { category: 'integration', difficulty: 'intermediate', tags: ['database'] },
        { category: 'communication', difficulty: 'beginner', tags: ['email'] }
      ];

      const stats = templateService.getTemplateStats(templates as any);

      expect(stats).toEqual({
        totalTemplates: 3,
        categoryCounts: {
          integration: 2,
          communication: 1
        },
        difficultyCounts: {
          beginner: 2,
          intermediate: 1
        },
        totalTags: 4,
        mostUsedTags: ['http', 'api', 'database', 'email']
      });
    });

    it('should handle empty template array', () => {
      const stats = templateService.getTemplateStats([]);

      expect(stats).toEqual({
        totalTemplates: 0,
        categoryCounts: {},
        difficultyCounts: {},
        totalTags: 0,
        mostUsedTags: []
      });
    });
  });
});