import { WorkflowEngine } from '../../core/WorkflowEngine';
import { nodeExecutor } from '../../core/NodeExecutor';
import {
  IWorkflow,
  INode,
  ExecutionStatus,
  NodeType,
} from '../../types/workflow.types';

// Mock dependencies
jest.mock('../../core/NodeExecutor');

const mockNodeExecutor = nodeExecutor as jest.Mocked<typeof nodeExecutor>;

describe('WorkflowEngine', () => {
  let workflowEngine: WorkflowEngine;
  let mockWorkflow: IWorkflow;

  beforeEach(() => {
    jest.clearAllMocks();

    mockWorkflow = {
      id: 'workflow-123',
      name: 'Test Workflow',
      description: 'A test workflow',
      definition: {
        nodes: [
          {
            id: 'trigger-node',
            type: 'trigger' as NodeType,
            name: 'Webhook Trigger',
            position: { x: 100, y: 100 },
            parameters: {
              path: '/webhook',
              method: 'POST',
            },
          },
          {
            id: 'http-node',
            type: 'http' as NodeType,
            name: 'HTTP Request',
            position: { x: 300, y: 100 },
            parameters: {
              url: 'https://api.example.com/users',
              method: 'GET',
            },
          },
          {
            id: 'transform-node',
            type: 'transform' as NodeType,
            name: 'Data Transform',
            position: { x: 500, y: 100 },
            parameters: {
              script: 'return data.map(user => ({ id: user.id, name: user.name }));',
            },
          },
        ],
        connections: {
          'trigger-node': {
            main: [['http-node']],
          },
          'http-node': {
            main: [['transform-node']],
          },
        },
      },
      isActive: true,
      userId: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    workflowEngine = new WorkflowEngine(mockWorkflow, {
      userId: 'user-123',
      executionId: 'execution-123',
    });
  });

  describe('constructor', () => {
    it('should initialize workflow engine correctly', () => {
      expect(workflowEngine).toBeInstanceOf(WorkflowEngine);
      expect(workflowEngine['workflow']).toBe(mockWorkflow);
      expect(workflowEngine['additionalData'].userId).toBe('user-123');
      expect(workflowEngine['execution'].workflowId).toBe(mockWorkflow.id);
    });

    it('should generate execution id if not provided', () => {
      const engine = new WorkflowEngine(mockWorkflow);
      expect(engine['execution'].id).toBeDefined();
      expect(typeof engine['execution'].id).toBe('string');
    });
  });

  describe('execute', () => {
    it('should execute workflow successfully', async () => {
      const mockTriggerResult = {
        success: true,
        data: [{ webhookData: 'test' }],
      };

      const mockHttpResult = {
        success: true,
        data: [{ users: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }] }],
      };

      const mockTransformResult = {
        success: true,
        data: [{ transformedUsers: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }] }],
      };

      mockNodeExecutor.executeNode
        .mockResolvedValueOnce(mockTriggerResult) // trigger-node
        .mockResolvedValueOnce(mockHttpResult) // http-node
        .mockResolvedValueOnce(mockTransformResult); // transform-node

      const result = await workflowEngine.execute();

      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.data).toBeDefined();
      expect(mockNodeExecutor.executeNode).toHaveBeenCalledTimes(3);

      // Verify nodes were executed in correct order
      expect(mockNodeExecutor.executeNode).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ id: 'trigger-node' }),
        expect.any(Object),
        expect.any(Object)
      );
      expect(mockNodeExecutor.executeNode).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ id: 'http-node' }),
        expect.any(Object),
        expect.any(Object)
      );
      expect(mockNodeExecutor.executeNode).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ id: 'transform-node' }),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should handle node execution failure', async () => {
      const mockTriggerResult = {
        success: true,
        data: [{ webhookData: 'test' }],
      };

      mockNodeExecutor.executeNode
        .mockResolvedValueOnce(mockTriggerResult) // trigger-node succeeds
        .mockRejectedValueOnce(new Error('HTTP request failed')); // http-node fails

      const result = await workflowEngine.execute();

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.error).toContain('HTTP request failed');
      expect(mockNodeExecutor.executeNode).toHaveBeenCalledTimes(2);
    });

    it('should handle workflow cancellation', async () => {
      const mockTriggerResult = {
        success: true,
        data: [{ webhookData: 'test' }],
      };

      // Mock delayed execution to allow cancellation
      mockNodeExecutor.executeNode
        .mockResolvedValueOnce(mockTriggerResult)
        .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true, data: [] }), 1000)));

      const executePromise = workflowEngine.execute();

      // Cancel execution after a short delay
      setTimeout(() => {
        workflowEngine.cancel();
      }, 100);

      const result = await executePromise;

      expect(result.success).toBe(false);
      expect(result.status).toBe('cancelled');
      expect(result.error).toContain('cancelled');
    });

    it('should emit execution events', async () => {
      const onExecutionStart = jest.fn();
      const onNodeStart = jest.fn();
      const onNodeComplete = jest.fn();
      const onExecutionComplete = jest.fn();

      workflowEngine.on('executionStart', onExecutionStart);
      workflowEngine.on('nodeStart', onNodeStart);
      workflowEngine.on('nodeComplete', onNodeComplete);
      workflowEngine.on('executionComplete', onExecutionComplete);

      mockNodeExecutor.executeNode.mockResolvedValue({
        success: true,
        data: [{ result: 'test' }],
      });

      await workflowEngine.execute();

      expect(onExecutionStart).toHaveBeenCalledWith(expect.objectContaining({
        executionId: 'execution-123',
        workflowId: 'workflow-123',
      }));
      expect(onNodeStart).toHaveBeenCalledTimes(3);
      expect(onNodeComplete).toHaveBeenCalledTimes(3);
      expect(onExecutionComplete).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        status: 'completed',
      }));
    });
  });

  describe('executeFromNode', () => {
    it('should execute workflow starting from specific node', async () => {
      const mockHttpResult = {
        success: true,
        data: [{ users: [] }],
      };

      const mockTransformResult = {
        success: true,
        data: [{ transformedUsers: [] }],
      };

      mockNodeExecutor.executeNode
        .mockResolvedValueOnce(mockHttpResult) // http-node
        .mockResolvedValueOnce(mockTransformResult); // transform-node

      const result = await workflowEngine.executeFromNode('http-node', {
        inputData: [{ triggerData: 'test' }],
      });

      expect(result.success).toBe(true);
      expect(mockNodeExecutor.executeNode).toHaveBeenCalledTimes(2);
      expect(mockNodeExecutor.executeNode).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: 'trigger-node' }),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should return error for non-existent start node', async () => {
      const result = await workflowEngine.executeFromNode('non-existent-node', {
        inputData: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Start node not found');
    });
  });

  describe('pause and resume', () => {
    it('should pause and resume execution', async () => {
      let nodeExecutionCount = 0;

      mockNodeExecutor.executeNode.mockImplementation(async (node) => {
        nodeExecutionCount++;
        if (nodeExecutionCount === 2) {
          // Pause during second node execution
          workflowEngine.pause();
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        return { success: true, data: [{ result: 'test' }] };
      });

      const executePromise = workflowEngine.execute();

      // Resume after a delay
      setTimeout(() => {
        workflowEngine.resume();
      }, 200);

      const result = await executePromise;

      expect(result.success).toBe(true);
      expect(mockNodeExecutor.executeNode).toHaveBeenCalledTimes(3);
    });
  });

  describe('getExecutionData', () => {
    it('should return current execution data', async () => {
      mockNodeExecutor.executeNode.mockResolvedValue({
        success: true,
        data: [{ result: 'test' }],
      });

      await workflowEngine.execute();

      const executionData = workflowEngine.getExecutionData();

      expect(executionData.id).toBe('execution-123');
      expect(executionData.workflowId).toBe('workflow-123');
      expect(executionData.status).toBe('completed');
      expect(executionData.data).toBeDefined();
      expect(executionData.executedNodes).toHaveLength(3);
    });
  });

  describe('getNodeOutputData', () => {
    it('should return output data for specific node', async () => {
      const mockResult = {
        success: true,
        data: [{ users: [{ id: 1, name: 'John' }] }],
      };

      mockNodeExecutor.executeNode.mockResolvedValue(mockResult);

      await workflowEngine.execute();

      const nodeOutput = workflowEngine.getNodeOutputData('http-node');

      expect(nodeOutput).toBeDefined();
      expect(Array.isArray(nodeOutput)).toBe(true);
    });

    it('should return undefined for non-executed node', () => {
      const nodeOutput = workflowEngine.getNodeOutputData('non-executed-node');
      expect(nodeOutput).toBeUndefined();
    });
  });

  describe('validateWorkflow', () => {
    it('should validate workflow structure successfully', () => {
      const isValid = workflowEngine.validateWorkflow();
      expect(isValid.isValid).toBe(true);
    });

    it('should detect missing required nodes', () => {
      const invalidWorkflow: IWorkflow = {
        ...mockWorkflow,
        definition: {
          nodes: [], // Empty nodes
          connections: {},
        },
      };

      const engine = new WorkflowEngine(invalidWorkflow);
      const validation = engine.validateWorkflow();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Workflow must have at least one node');
    });

    it('should detect invalid connections', () => {
      const invalidWorkflow: IWorkflow = {
        ...mockWorkflow,
        definition: {
          nodes: mockWorkflow.definition.nodes,
          connections: {
            'trigger-node': {
              main: [['non-existent-node']], // Invalid connection
            },
          },
        },
      };

      const engine = new WorkflowEngine(invalidWorkflow);
      const validation = engine.validateWorkflow();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Connection references non-existent node: non-existent-node');
    });

    it('should detect circular dependencies', () => {
      const circularWorkflow: IWorkflow = {
        ...mockWorkflow,
        definition: {
          nodes: [
            {
              id: 'node-1',
              type: 'http' as NodeType,
              name: 'Node 1',
              position: { x: 100, y: 100 },
              parameters: {},
            },
            {
              id: 'node-2',
              type: 'transform' as NodeType,
              name: 'Node 2',
              position: { x: 300, y: 100 },
              parameters: {},
            },
          ],
          connections: {
            'node-1': { main: [['node-2']] },
            'node-2': { main: [['node-1']] }, // Circular dependency
          },
        },
      };

      const engine = new WorkflowEngine(circularWorkflow);
      const validation = engine.validateWorkflow();

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Circular dependency detected');
    });
  });

  describe('calculateExecutionOrder', () => {
    it('should calculate correct execution order', () => {
      const executionOrder = workflowEngine['calculateExecutionOrder']();

      expect(executionOrder).toEqual(['trigger-node', 'http-node', 'transform-node']);
    });

    it('should handle parallel branches correctly', () => {
      const parallelWorkflow: IWorkflow = {
        ...mockWorkflow,
        definition: {
          nodes: [
            { id: 'trigger', type: 'trigger' as NodeType, name: 'Trigger', position: { x: 0, y: 0 }, parameters: {} },
            { id: 'branch1', type: 'http' as NodeType, name: 'Branch 1', position: { x: 200, y: 0 }, parameters: {} },
            { id: 'branch2', type: 'http' as NodeType, name: 'Branch 2', position: { x: 200, y: 200 }, parameters: {} },
            { id: 'merge', type: 'merge' as NodeType, name: 'Merge', position: { x: 400, y: 100 }, parameters: {} },
          ],
          connections: {
            'trigger': { main: [['branch1', 'branch2']] },
            'branch1': { main: [['merge']] },
            'branch2': { main: [['merge']] },
          },
        },
      };

      const engine = new WorkflowEngine(parallelWorkflow);
      const executionOrder = engine['calculateExecutionOrder']();

      expect(executionOrder[0]).toBe('trigger');
      expect(executionOrder).toContain('branch1');
      expect(executionOrder).toContain('branch2');
      expect(executionOrder[executionOrder.length - 1]).toBe('merge');
    });
  });

  describe('error handling', () => {
    it('should handle node execution timeout', async () => {
      mockNodeExecutor.executeNode.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: [] }), 5000))
      );

      const result = await workflowEngine.execute({ timeout: 1000 });

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.error).toContain('timeout');
    });

    it('should handle memory limit exceeded', async () => {
      mockNodeExecutor.executeNode.mockResolvedValue({
        success: false,
        error: new Error('Memory limit exceeded'),
        data: [],
      });

      const result = await workflowEngine.execute();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Memory limit exceeded');
    });

    it('should handle invalid node parameters', async () => {
      const invalidWorkflow: IWorkflow = {
        ...mockWorkflow,
        definition: {
          ...mockWorkflow.definition,
          nodes: [
            {
              id: 'invalid-node',
              type: 'http' as NodeType,
              name: 'Invalid HTTP Node',
              position: { x: 100, y: 100 },
              parameters: {
                url: '', // Invalid empty URL
              },
            },
          ],
          connections: {},
        },
      };

      const engine = new WorkflowEngine(invalidWorkflow);
      mockNodeExecutor.executeNode.mockRejectedValue(new Error('Invalid URL parameter'));

      const result = await engine.execute();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid URL parameter');
    });
  });
});