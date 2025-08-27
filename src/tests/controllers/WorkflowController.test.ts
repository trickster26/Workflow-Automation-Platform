import { Request, Response } from 'express';
import { WorkflowController } from '../../controllers/WorkflowController';
import { Workflow as WorkflowModel } from '../../models';
import { executionService } from '../../services/ExecutionService';
import { AuthenticatedRequest } from '../../middleware/auth';

// Mock dependencies
jest.mock('../../models');
jest.mock('../../services/ExecutionService');
jest.mock('../../utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

const mockWorkflowModel = WorkflowModel as jest.Mocked<typeof WorkflowModel>;
const mockExecutionService = executionService as jest.Mocked<typeof executionService>;

describe('WorkflowController', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockSend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockJson = jest.fn();
    mockSend = jest.fn();
    mockStatus = jest.fn().mockReturnValue({
      json: mockJson,
      send: mockSend,
    });

    mockResponse = {
      status: mockStatus,
      json: mockJson,
      send: mockSend,
    };

    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: {
        userId: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user',
        status: 'active',
        sessionId: 'session-123',
      },
    };
  });

  describe('createWorkflow', () => {
    it('should create workflow successfully', async () => {
      mockRequest.body = {
        name: 'Test Workflow',
        description: 'A test workflow',
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
      };

      const mockWorkflow = {
        id: 'workflow-123',
        name: 'Test Workflow',
        description: 'A test workflow',
        userId: 'user-123',
        isActive: false,
        definition: mockRequest.body.definition,
        save: jest.fn(),
        toJSON: jest.fn().mockReturnValue({
          id: 'workflow-123',
          name: 'Test Workflow',
          description: 'A test workflow',
          userId: 'user-123',
          isActive: false,
          definition: mockRequest.body.definition,
        }),
      };

      mockWorkflowModel.create.mockResolvedValue(mockWorkflow as any);

      await WorkflowController.createWorkflow(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockWorkflowModel.create).toHaveBeenCalledWith({
        name: 'Test Workflow',
        description: 'A test workflow',
        userId: 'user-123',
        definition: mockRequest.body.definition,
        isActive: false,
      });
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Workflow created successfully',
        workflow: expect.objectContaining({
          id: 'workflow-123',
          name: 'Test Workflow',
        }),
      });
    });

    it('should return 400 for missing required fields', async () => {
      mockRequest.body = {
        // Missing name and definition
        description: 'A test workflow',
      };

      await WorkflowController.createWorkflow(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Missing required fields',
        message: 'Name and definition are required',
      });
      expect(mockWorkflowModel.create).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockRequest.body = {
        name: 'Test Workflow',
        definition: { nodes: [], connections: {} },
      };

      mockWorkflowModel.create.mockRejectedValue(new Error('Database error'));

      await WorkflowController.createWorkflow(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Failed to create workflow',
        message: 'Database error',
      });
    });
  });

  describe('getWorkflows', () => {
    it('should return user workflows with pagination', async () => {
      mockRequest.query = {
        page: '1',
        limit: '10',
      };

      const mockWorkflows = [
        {
          id: 'workflow-1',
          name: 'Workflow 1',
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: 'workflow-2',
          name: 'Workflow 2',
          isActive: false,
          createdAt: new Date(),
        },
      ];

      mockWorkflowModel.findAndCountAll.mockResolvedValue({
        rows: mockWorkflows,
        count: 2,
      } as any);

      await WorkflowController.getWorkflows(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockWorkflowModel.findAndCountAll).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        limit: 10,
        offset: 0,
        order: [['createdAt', 'DESC']],
        attributes: { exclude: ['definition'] },
      });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        workflows: mockWorkflows,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
        },
      });
    });

    it('should filter workflows by active status', async () => {
      mockRequest.query = {
        active: 'true',
      };

      await WorkflowController.getWorkflows(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockWorkflowModel.findAndCountAll).toHaveBeenCalledWith({
        where: { userId: 'user-123', isActive: true },
        limit: 50,
        offset: 0,
        order: [['createdAt', 'DESC']],
        attributes: { exclude: ['definition'] },
      });
    });

    it('should search workflows by name', async () => {
      mockRequest.query = {
        search: 'test',
      };

      await WorkflowController.getWorkflows(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockWorkflowModel.findAndCountAll).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          name: { [expect.any(Symbol)]: '%test%' },
        },
        limit: 50,
        offset: 0,
        order: [['createdAt', 'DESC']],
        attributes: { exclude: ['definition'] },
      });
    });
  });

  describe('getWorkflow', () => {
    it('should return workflow by id', async () => {
      mockRequest.params = { id: 'workflow-123' };

      const mockWorkflow = {
        id: 'workflow-123',
        name: 'Test Workflow',
        userId: 'user-123',
        definition: { nodes: [], connections: {} },
        toJSON: jest.fn().mockReturnValue({
          id: 'workflow-123',
          name: 'Test Workflow',
          definition: { nodes: [], connections: {} },
        }),
      };

      mockWorkflowModel.findOne.mockResolvedValue(mockWorkflow as any);

      await WorkflowController.getWorkflow(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockWorkflowModel.findOne).toHaveBeenCalledWith({
        where: { id: 'workflow-123', userId: 'user-123' },
      });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        workflow: expect.objectContaining({
          id: 'workflow-123',
          name: 'Test Workflow',
        }),
      });
    });

    it('should return 404 for non-existent workflow', async () => {
      mockRequest.params = { id: 'non-existent' };

      mockWorkflowModel.findOne.mockResolvedValue(null);

      await WorkflowController.getWorkflow(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Workflow not found',
        message: 'Workflow not found or access denied',
      });
    });
  });

  describe('updateWorkflow', () => {
    it('should update workflow successfully', async () => {
      mockRequest.params = { id: 'workflow-123' };
      mockRequest.body = {
        name: 'Updated Workflow',
        description: 'Updated description',
        isActive: true,
      };

      const mockWorkflow = {
        id: 'workflow-123',
        userId: 'user-123',
        update: jest.fn().mockResolvedValue({
          id: 'workflow-123',
          name: 'Updated Workflow',
          description: 'Updated description',
          isActive: true,
        }),
        toJSON: jest.fn().mockReturnValue({
          id: 'workflow-123',
          name: 'Updated Workflow',
          description: 'Updated description',
          isActive: true,
        }),
      };

      mockWorkflowModel.findOne.mockResolvedValue(mockWorkflow as any);

      await WorkflowController.updateWorkflow(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockWorkflow.update).toHaveBeenCalledWith({
        name: 'Updated Workflow',
        description: 'Updated description',
        isActive: true,
      });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Workflow updated successfully',
        workflow: expect.objectContaining({
          name: 'Updated Workflow',
        }),
      });
    });

    it('should return 404 for non-existent workflow', async () => {
      mockRequest.params = { id: 'non-existent' };
      mockRequest.body = { name: 'Updated' };

      mockWorkflowModel.findOne.mockResolvedValue(null);

      await WorkflowController.updateWorkflow(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Workflow not found',
        message: 'Workflow not found or access denied',
      });
    });
  });

  describe('deleteWorkflow', () => {
    it('should delete workflow successfully', async () => {
      mockRequest.params = { id: 'workflow-123' };

      const mockWorkflow = {
        id: 'workflow-123',
        userId: 'user-123',
        destroy: jest.fn(),
      };

      mockWorkflowModel.findOne.mockResolvedValue(mockWorkflow as any);

      await WorkflowController.deleteWorkflow(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockWorkflow.destroy).toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Workflow deleted successfully',
      });
    });

    it('should return 404 for non-existent workflow', async () => {
      mockRequest.params = { id: 'non-existent' };

      mockWorkflowModel.findOne.mockResolvedValue(null);

      await WorkflowController.deleteWorkflow(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Workflow not found',
        message: 'Workflow not found or access denied',
      });
    });
  });

  describe('executeWorkflow', () => {
    it('should execute workflow successfully', async () => {
      mockRequest.params = { id: 'workflow-123' };
      mockRequest.body = {
        inputData: { test: 'data' },
      };

      const mockWorkflow = {
        id: 'workflow-123',
        userId: 'user-123',
        isActive: true,
      };

      const mockExecutionResult = {
        execution: {
          id: 'execution-123',
          workflowId: 'workflow-123',
          status: 'running',
        },
        success: true,
      };

      mockWorkflowModel.findOne.mockResolvedValue(mockWorkflow as any);
      mockExecutionService.executeWorkflow.mockResolvedValue(mockExecutionResult as any);

      await WorkflowController.executeWorkflow(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockExecutionService.executeWorkflow).toHaveBeenCalledWith({
        workflowId: 'workflow-123',
        userId: 'user-123',
        mode: 'manual',
        inputData: { test: 'data' },
      });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Workflow execution started',
        execution: mockExecutionResult.execution,
      });
    });

    it('should return 404 for non-existent workflow', async () => {
      mockRequest.params = { id: 'non-existent' };

      mockWorkflowModel.findOne.mockResolvedValue(null);

      await WorkflowController.executeWorkflow(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Workflow not found',
        message: 'Workflow not found or access denied',
      });
      expect(mockExecutionService.executeWorkflow).not.toHaveBeenCalled();
    });

    it('should return 400 for inactive workflow', async () => {
      mockRequest.params = { id: 'workflow-123' };

      const mockWorkflow = {
        id: 'workflow-123',
        userId: 'user-123',
        isActive: false,
      };

      mockWorkflowModel.findOne.mockResolvedValue(mockWorkflow as any);

      await WorkflowController.executeWorkflow(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Cannot execute workflow',
        message: 'Workflow is not active',
      });
      expect(mockExecutionService.executeWorkflow).not.toHaveBeenCalled();
    });

    it('should handle execution service errors', async () => {
      mockRequest.params = { id: 'workflow-123' };

      const mockWorkflow = {
        id: 'workflow-123',
        userId: 'user-123',
        isActive: true,
      };

      mockWorkflowModel.findOne.mockResolvedValue(mockWorkflow as any);
      mockExecutionService.executeWorkflow.mockRejectedValue(new Error('Execution failed'));

      await WorkflowController.executeWorkflow(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Execution failed',
        message: 'Execution failed',
      });
    });
  });

  describe('duplicateWorkflow', () => {
    it('should duplicate workflow successfully', async () => {
      mockRequest.params = { id: 'workflow-123' };
      mockRequest.body = {
        name: 'Copy of Test Workflow',
      };

      const mockOriginalWorkflow = {
        id: 'workflow-123',
        name: 'Test Workflow',
        description: 'Original workflow',
        userId: 'user-123',
        definition: { nodes: [], connections: {} },
        toJSON: jest.fn().mockReturnValue({
          name: 'Test Workflow',
          description: 'Original workflow',
          definition: { nodes: [], connections: {} },
        }),
      };

      const mockDuplicatedWorkflow = {
        id: 'workflow-456',
        name: 'Copy of Test Workflow',
        description: 'Original workflow',
        userId: 'user-123',
        definition: { nodes: [], connections: {} },
        toJSON: jest.fn().mockReturnValue({
          id: 'workflow-456',
          name: 'Copy of Test Workflow',
          description: 'Original workflow',
          definition: { nodes: [], connections: {} },
        }),
      };

      mockWorkflowModel.findOne.mockResolvedValue(mockOriginalWorkflow as any);
      mockWorkflowModel.create.mockResolvedValue(mockDuplicatedWorkflow as any);

      await WorkflowController.duplicateWorkflow(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockWorkflowModel.create).toHaveBeenCalledWith({
        name: 'Copy of Test Workflow',
        description: 'Original workflow',
        userId: 'user-123',
        definition: { nodes: [], connections: {} },
        isActive: false,
      });
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Workflow duplicated successfully',
        workflow: expect.objectContaining({
          id: 'workflow-456',
          name: 'Copy of Test Workflow',
        }),
      });
    });

    it('should return 404 for non-existent workflow', async () => {
      mockRequest.params = { id: 'non-existent' };

      mockWorkflowModel.findOne.mockResolvedValue(null);

      await WorkflowController.duplicateWorkflow(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Workflow not found',
        message: 'Workflow not found or access denied',
      });
    });
  });
});