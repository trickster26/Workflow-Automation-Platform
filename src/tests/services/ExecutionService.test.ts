import { ExecutionService } from '../../services/ExecutionService';
import { WorkflowEngine } from '../../core/WorkflowEngine';
import { WorkflowExecution as ExecutionModel, Workflow as WorkflowModel } from '../../models';
import Bull from 'bull';

// Mock dependencies
jest.mock('../../core/WorkflowEngine');
jest.mock('../../models');
jest.mock('bull');
jest.mock('../../utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

const mockExecutionModel = ExecutionModel as jest.Mocked<typeof ExecutionModel>;
const mockWorkflowModel = WorkflowModel as jest.Mocked<typeof WorkflowModel>;
const mockBull = Bull as jest.MockedClass<typeof Bull>;
const mockWorkflowEngine = WorkflowEngine as jest.MockedClass<typeof WorkflowEngine>;

describe('ExecutionService', () => {
  let executionService: ExecutionService;
  let mockQueue: jest.Mocked<Bull.Queue>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockQueue = {
      add: jest.fn(),
      process: jest.fn(),
      on: jest.fn(),
      getJob: jest.fn(),
      close: jest.fn(),
    } as any;
    
    mockBull.mockReturnValue(mockQueue);
    executionService = ExecutionService.getInstance();
  });

  afterEach(() => {
    // Reset singleton instance
    (ExecutionService as any).instance = undefined;
  });

  describe('executeWorkflow', () => {
    it('should execute workflow successfully', async () => {
      const workflowId = 'workflow-123';
      const executionData = {
        workflowId,
        userId: 'user-123',
        mode: 'manual' as const,
        inputData: { test: 'data' },
      };

      const mockWorkflow = {
        id: workflowId,
        name: 'Test Workflow',
        definition: {
          nodes: [
            {
              id: 'node-1',
              type: 'http' as const,
              name: 'HTTP Request',
              position: { x: 100, y: 100 },
              parameters: { url: 'https://api.test.com' },
            },
          ],
          connections: {},
        },
        isActive: true,
      };

      const mockExecution = {
        id: 'execution-123',
        workflowId,
        status: 'running',
        startedAt: new Date(),
        save: jest.fn(),
        update: jest.fn(),
      };

      mockWorkflowModel.findByPk.mockResolvedValue(mockWorkflow as any);
      mockExecutionModel.create.mockResolvedValue(mockExecution as any);
      mockQueue.add.mockResolvedValue({ id: 'job-123' } as any);

      const result = await executionService.executeWorkflow(executionData);

      expect(mockWorkflowModel.findByPk).toHaveBeenCalledWith(workflowId);
      expect(mockExecutionModel.create).toHaveBeenCalledWith({
        workflowId,
        userId: executionData.userId,
        status: 'running',
        mode: 'manual',
        data: executionData.inputData,
        startedAt: expect.any(Date),
      });
      expect(mockQueue.add).toHaveBeenCalled();
      expect(result.execution.id).toBe('execution-123');
    });

    it('should throw error for non-existent workflow', async () => {
      const workflowId = 'non-existent';
      const executionData = {
        workflowId,
        mode: 'manual' as const,
      };

      mockWorkflowModel.findByPk.mockResolvedValue(null);

      await expect(executionService.executeWorkflow(executionData)).rejects.toThrow('Workflow not found');
    });

    it('should throw error for inactive workflow', async () => {
      const workflowId = 'inactive-workflow';
      const executionData = {
        workflowId,
        mode: 'manual' as const,
      };

      const mockWorkflow = {
        id: workflowId,
        isActive: false,
      };

      mockWorkflowModel.findByPk.mockResolvedValue(mockWorkflow as any);

      await expect(executionService.executeWorkflow(executionData)).rejects.toThrow('Workflow is not active');
    });
  });

  describe('getExecution', () => {
    it('should return execution by id', async () => {
      const executionId = 'execution-123';
      const mockExecution = {
        id: executionId,
        workflowId: 'workflow-123',
        status: 'completed',
        data: { result: 'success' },
      };

      mockExecutionModel.findByPk.mockResolvedValue(mockExecution as any);

      const result = await executionService.getExecution(executionId);

      expect(mockExecutionModel.findByPk).toHaveBeenCalledWith(executionId);
      expect(result.id).toBe(executionId);
    });

    it('should return null for non-existent execution', async () => {
      const executionId = 'non-existent';

      mockExecutionModel.findByPk.mockResolvedValue(null);

      const result = await executionService.getExecution(executionId);

      expect(result).toBeNull();
    });
  });

  describe('getExecutions', () => {
    it('should return paginated executions', async () => {
      const mockExecutions = [
        { id: 'execution-1', workflowId: 'workflow-123', status: 'completed' },
        { id: 'execution-2', workflowId: 'workflow-123', status: 'running' },
      ];

      mockExecutionModel.findAndCountAll.mockResolvedValue({
        rows: mockExecutions,
        count: 2,
      } as any);

      const result = await executionService.getExecutions({
        workflowId: 'workflow-123',
        limit: 10,
        offset: 0,
      });

      expect(mockExecutionModel.findAndCountAll).toHaveBeenCalledWith({
        where: { workflowId: 'workflow-123' },
        limit: 10,
        offset: 0,
        order: [['createdAt', 'DESC']],
      });
      expect(result.executions).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter executions by status', async () => {
      const mockExecutions = [
        { id: 'execution-1', status: 'completed' },
      ];

      mockExecutionModel.findAndCountAll.mockResolvedValue({
        rows: mockExecutions,
        count: 1,
      } as any);

      await executionService.getExecutions({
        status: 'completed',
        limit: 10,
        offset: 0,
      });

      expect(mockExecutionModel.findAndCountAll).toHaveBeenCalledWith({
        where: { status: 'completed' },
        limit: 10,
        offset: 0,
        order: [['createdAt', 'DESC']],
      });
    });
  });

  describe('cancelExecution', () => {
    it('should cancel running execution', async () => {
      const executionId = 'execution-123';
      const mockExecution = {
        id: executionId,
        status: 'running',
        update: jest.fn(),
      };

      const mockEngine = {
        cancel: jest.fn(),
      };

      mockExecutionModel.findByPk.mockResolvedValue(mockExecution as any);
      executionService['activeExecutions'].set(executionId, mockEngine as any);

      const result = await executionService.cancelExecution(executionId);

      expect(mockExecution.update).toHaveBeenCalledWith({
        status: 'cancelled',
        finishedAt: expect.any(Date),
        error: 'Execution cancelled by user',
      });
      expect(mockEngine.cancel).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should throw error for non-existent execution', async () => {
      const executionId = 'non-existent';

      mockExecutionModel.findByPk.mockResolvedValue(null);

      await expect(executionService.cancelExecution(executionId)).rejects.toThrow('Execution not found');
    });

    it('should throw error for already finished execution', async () => {
      const executionId = 'execution-123';
      const mockExecution = {
        id: executionId,
        status: 'completed',
      };

      mockExecutionModel.findByPk.mockResolvedValue(mockExecution as any);

      await expect(executionService.cancelExecution(executionId)).rejects.toThrow('Execution is not running');
    });
  });

  describe('retryExecution', () => {
    it('should retry failed execution', async () => {
      const executionId = 'execution-123';
      const mockExecution = {
        id: executionId,
        workflowId: 'workflow-123',
        status: 'failed',
        data: { input: 'data' },
        userId: 'user-123',
      };

      const mockNewExecution = {
        id: 'execution-456',
        save: jest.fn(),
      };

      mockExecutionModel.findByPk.mockResolvedValue(mockExecution as any);
      mockExecutionModel.create.mockResolvedValue(mockNewExecution as any);
      mockQueue.add.mockResolvedValue({ id: 'job-456' } as any);

      const result = await executionService.retryExecution(executionId);

      expect(mockExecutionModel.create).toHaveBeenCalledWith({
        workflowId: 'workflow-123',
        userId: 'user-123',
        status: 'running',
        mode: 'retry',
        data: { input: 'data' },
        startedAt: expect.any(Date),
        parentExecutionId: executionId,
      });
      expect(mockQueue.add).toHaveBeenCalled();
      expect(result.execution.id).toBe('execution-456');
    });

    it('should throw error for successful execution', async () => {
      const executionId = 'execution-123';
      const mockExecution = {
        id: executionId,
        status: 'completed',
      };

      mockExecutionModel.findByPk.mockResolvedValue(mockExecution as any);

      await expect(executionService.retryExecution(executionId)).rejects.toThrow('Only failed executions can be retried');
    });
  });

  describe('processExecutionJob', () => {
    it('should process execution job successfully', async () => {
      const jobData = {
        workflowId: 'workflow-123',
        executionId: 'execution-123',
      };

      const mockJob = {
        data: jobData,
        progress: jest.fn(),
      };

      const mockExecution = {
        id: 'execution-123',
        workflowId: 'workflow-123',
        update: jest.fn(),
      };

      const mockWorkflow = {
        id: 'workflow-123',
        definition: {
          nodes: [],
          connections: {},
        },
      };

      const mockEngine = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          data: { result: 'success' },
        }),
      };

      mockExecutionModel.findByPk.mockResolvedValue(mockExecution as any);
      mockWorkflowModel.findByPk.mockResolvedValue(mockWorkflow as any);
      mockWorkflowEngine.mockImplementation(() => mockEngine as any);

      await executionService['processExecutionJob'](mockJob as any);

      expect(mockEngine.execute).toHaveBeenCalled();
      expect(mockExecution.update).toHaveBeenCalledWith({
        status: 'completed',
        finishedAt: expect.any(Date),
        data: { result: 'success' },
        executionTime: expect.any(Number),
      });
    });

    it('should handle execution job failure', async () => {
      const jobData = {
        workflowId: 'workflow-123',
        executionId: 'execution-123',
      };

      const mockJob = {
        data: jobData,
        progress: jest.fn(),
      };

      const mockExecution = {
        id: 'execution-123',
        update: jest.fn(),
      };

      const mockEngine = {
        execute: jest.fn().mockRejectedValue(new Error('Execution failed')),
      };

      mockExecutionModel.findByPk.mockResolvedValue(mockExecution as any);
      mockWorkflowEngine.mockImplementation(() => mockEngine as any);

      await expect(executionService['processExecutionJob'](mockJob as any)).rejects.toThrow('Execution failed');

      expect(mockExecution.update).toHaveBeenCalledWith({
        status: 'failed',
        finishedAt: expect.any(Date),
        error: 'Execution failed',
      });
    });
  });

  describe('getExecutionStatistics', () => {
    it('should return execution statistics', async () => {
      const mockStats = [
        { status: 'completed', count: '10' },
        { status: 'failed', count: '5' },
        { status: 'running', count: '2' },
      ];

      mockExecutionModel.findAll.mockResolvedValue(mockStats as any);

      const result = await executionService.getExecutionStatistics();

      expect(result.total).toBe(17);
      expect(result.completed).toBe(10);
      expect(result.failed).toBe(5);
      expect(result.running).toBe(2);
      expect(result.successRate).toBeCloseTo(66.67);
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      const mockEngine1 = { cancel: jest.fn() };
      const mockEngine2 = { cancel: jest.fn() };

      executionService['activeExecutions'].set('exec-1', mockEngine1 as any);
      executionService['activeExecutions'].set('exec-2', mockEngine2 as any);

      await executionService.shutdown();

      expect(mockEngine1.cancel).toHaveBeenCalled();
      expect(mockEngine2.cancel).toHaveBeenCalled();
      expect(mockQueue.close).toHaveBeenCalled();
      expect(executionService['activeExecutions'].size).toBe(0);
    });
  });
});