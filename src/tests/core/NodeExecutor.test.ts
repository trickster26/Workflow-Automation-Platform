import { NodeExecutor } from '../../core/NodeExecutor';
import { NodeRegistry } from '../../core/NodeRegistry';
import { INode, NodeType, ITaskDataConnections, IExecuteData } from '../../types/workflow.types';

// Mock dependencies
jest.mock('../../core/NodeRegistry');

const mockNodeRegistry = NodeRegistry as jest.MockedClass<typeof NodeRegistry>;

describe('NodeExecutor', () => {
  let nodeExecutor: NodeExecutor;
  let mockNode: INode;
  let mockExecuteData: IExecuteData;

  beforeEach(() => {
    jest.clearAllMocks();

    nodeExecutor = NodeExecutor.getInstance();

    mockNode = {
      id: 'test-node',
      type: 'http' as NodeType,
      name: 'Test HTTP Node',
      position: { x: 100, y: 100 },
      parameters: {
        url: 'https://api.example.com/users',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    };

    mockExecuteData = {
      inputData: [
        {
          main: [
            {
              json: { userId: 123, action: 'fetch' },
            },
          ],
        },
      ],
      credentials: {},
      variables: { apiKey: 'test-key' },
    };
  });

  afterEach(() => {
    // Reset singleton instance
    (NodeExecutor as any).instance = undefined;
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = NodeExecutor.getInstance();
      const instance2 = NodeExecutor.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(NodeExecutor);
    });
  });

  describe('executeNode', () => {
    it('should execute node successfully', async () => {
      const mockNodeClass = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          data: [
            {
              main: [
                {
                  json: {
                    users: [
                      { id: 1, name: 'John Doe' },
                      { id: 2, name: 'Jane Smith' },
                    ],
                  },
                },
              ],
            },
          ],
        }),
      };

      mockNodeRegistry.getNode.mockReturnValue(mockNodeClass as any);

      const result = await nodeExecutor.executeNode(mockNode, mockExecuteData, {});

      expect(mockNodeRegistry.getNode).toHaveBeenCalledWith('http');
      expect(mockNodeClass.execute).toHaveBeenCalledWith(
        mockNode,
        mockExecuteData,
        expect.any(Object)
      );
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data[0].main[0].json.users).toHaveLength(2);
    });

    it('should handle node execution failure', async () => {
      const mockNodeClass = {
        execute: jest.fn().mockRejectedValue(new Error('HTTP request failed')),
      };

      mockNodeRegistry.getNode.mockReturnValue(mockNodeClass as any);

      const result = await nodeExecutor.executeNode(mockNode, mockExecuteData, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('HTTP request failed');
      expect(result.data).toEqual([]);
    });

    it('should handle unknown node type', async () => {
      mockNodeRegistry.getNode.mockReturnValue(null);

      const result = await nodeExecutor.executeNode(mockNode, mockExecuteData, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown node type');
      expect(result.data).toEqual([]);
    });

    it('should handle node class without execute method', async () => {
      const mockNodeClass = {}; // Missing execute method

      mockNodeRegistry.getNode.mockReturnValue(mockNodeClass as any);

      const result = await nodeExecutor.executeNode(mockNode, mockExecuteData, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not have an execute method');
      expect(result.data).toEqual([]);
    });

    it('should apply parameter interpolation', async () => {
      const nodeWithVariables: INode = {
        ...mockNode,
        parameters: {
          url: 'https://api.example.com/users/{{$json.userId}}',
          headers: {
            'Authorization': 'Bearer {{$variables.apiKey}}',
          },
        },
      };

      const mockNodeClass = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          data: [{ main: [{ json: { result: 'success' } }] }],
        }),
      };

      mockNodeRegistry.getNode.mockReturnValue(mockNodeClass as any);

      await nodeExecutor.executeNode(nodeWithVariables, mockExecuteData, {});

      expect(mockNodeClass.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: {
            url: 'https://api.example.com/users/123',
            headers: {
              'Authorization': 'Bearer test-key',
            },
          },
        }),
        mockExecuteData,
        expect.any(Object)
      );
    });

    it('should handle execution timeout', async () => {
      const mockNodeClass = {
        execute: jest.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: [] }), 2000))
        ),
      };

      mockNodeRegistry.getNode.mockReturnValue(mockNodeClass as any);

      const result = await nodeExecutor.executeNode(
        mockNode, 
        mockExecuteData, 
        { timeout: 1000 }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should validate required parameters', async () => {
      const nodeWithMissingParams: INode = {
        ...mockNode,
        parameters: {
          // Missing required 'url' parameter
          method: 'GET',
        },
      };

      const mockNodeClass = {
        execute: jest.fn(),
        validateParameters: jest.fn().mockReturnValue({
          isValid: false,
          errors: ['URL is required'],
        }),
      };

      mockNodeRegistry.getNode.mockReturnValue(mockNodeClass as any);

      const result = await nodeExecutor.executeNode(nodeWithMissingParams, mockExecuteData, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Parameter validation failed');
      expect(result.error).toContain('URL is required');
      expect(mockNodeClass.execute).not.toHaveBeenCalled();
    });

    it('should handle credential resolution', async () => {
      const nodeWithCredentials: INode = {
        ...mockNode,
        parameters: {
          ...mockNode.parameters,
          authentication: 'oauth2',
        },
        credentials: {
          oauth2: 'credential-id-123',
        },
      };

      const executeDataWithCredentials: IExecuteData = {
        ...mockExecuteData,
        credentials: {
          'credential-id-123': {
            type: 'oauth2',
            data: {
              accessToken: 'token-123',
              refreshToken: 'refresh-123',
            },
          },
        },
      };

      const mockNodeClass = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          data: [{ main: [{ json: { authenticated: true } }] }],
        }),
      };

      mockNodeRegistry.getNode.mockReturnValue(mockNodeClass as any);

      const result = await nodeExecutor.executeNode(
        nodeWithCredentials, 
        executeDataWithCredentials, 
        {}
      );

      expect(result.success).toBe(true);
      expect(mockNodeClass.execute).toHaveBeenCalledWith(
        nodeWithCredentials,
        executeDataWithCredentials,
        expect.any(Object)
      );
    });

    it('should handle array input data correctly', async () => {
      const multipleInputData: IExecuteData = {
        inputData: [
          {
            main: [
              { json: { id: 1, name: 'Item 1' } },
              { json: { id: 2, name: 'Item 2' } },
              { json: { id: 3, name: 'Item 3' } },
            ],
          },
        ],
        credentials: {},
        variables: {},
      };

      const mockNodeClass = {
        execute: jest.fn().mockImplementation(async (node, executeData) => {
          const processedItems = executeData.inputData[0].main.map((item: any) => ({
            json: { ...item.json, processed: true },
          }));
          
          return {
            success: true,
            data: [{ main: processedItems }],
          };
        }),
      };

      mockNodeRegistry.getNode.mockReturnValue(mockNodeClass as any);

      const result = await nodeExecutor.executeNode(mockNode, multipleInputData, {});

      expect(result.success).toBe(true);
      expect(result.data[0].main).toHaveLength(3);
      expect(result.data[0].main[0].json.processed).toBe(true);
    });

    it('should handle empty input data', async () => {
      const emptyInputData: IExecuteData = {
        inputData: [{ main: [] }],
        credentials: {},
        variables: {},
      };

      const mockNodeClass = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          data: [{ main: [] }],
        }),
      };

      mockNodeRegistry.getNode.mockReturnValue(mockNodeClass as any);

      const result = await nodeExecutor.executeNode(mockNode, emptyInputData, {});

      expect(result.success).toBe(true);
      expect(result.data[0].main).toHaveLength(0);
    });

    it('should track execution metrics', async () => {
      const mockNodeClass = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          data: [{ main: [{ json: { result: 'success' } }] }],
        }),
      };

      mockNodeRegistry.getNode.mockReturnValue(mockNodeClass as any);

      const startTime = Date.now();
      const result = await nodeExecutor.executeNode(mockNode, mockExecuteData, {});
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.executionTime).toBeDefined();
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.executionTime).toBeLessThanOrEqual(endTime - startTime + 10); // Allow small margin
    });
  });

  describe('interpolateParameters', () => {
    it('should interpolate string parameters', () => {
      const parameters = {
        url: 'https://api.example.com/users/{{$json.userId}}',
        message: 'Hello {{$json.name}}!',
      };

      const inputData = {
        json: { userId: 123, name: 'John' },
      };

      const result = nodeExecutor['interpolateParameters'](parameters, inputData, {});

      expect(result.url).toBe('https://api.example.com/users/123');
      expect(result.message).toBe('Hello John!');
    });

    it('should interpolate nested object parameters', () => {
      const parameters = {
        headers: {
          'Authorization': 'Bearer {{$variables.token}}',
          'User-Agent': 'MyApp/{{$json.version}}',
        },
        body: {
          userId: '{{$json.userId}}',
          action: 'update',
        },
      };

      const inputData = {
        json: { userId: 456, version: '1.0.0' },
      };

      const variables = { token: 'secret-token' };

      const result = nodeExecutor['interpolateParameters'](parameters, inputData, variables);

      expect(result.headers['Authorization']).toBe('Bearer secret-token');
      expect(result.headers['User-Agent']).toBe('MyApp/1.0.0');
      expect(result.body.userId).toBe('456');
      expect(result.body.action).toBe('update');
    });

    it('should handle missing interpolation values', () => {
      const parameters = {
        url: 'https://api.example.com/{{$json.missingValue}}',
        header: '{{$variables.missingVar}}',
      };

      const inputData = { json: {} };
      const variables = {};

      const result = nodeExecutor['interpolateParameters'](parameters, inputData, variables);

      expect(result.url).toBe('https://api.example.com/undefined');
      expect(result.header).toBe('undefined');
    });

    it('should handle complex interpolation expressions', () => {
      const parameters = {
        computed: '{{$json.firstName}} {{$json.lastName}} (ID: {{$json.id}})',
        conditional: '{{$json.status === "active" ? "enabled" : "disabled"}}',
      };

      const inputData = {
        json: {
          firstName: 'John',
          lastName: 'Doe',
          id: 123,
          status: 'active',
        },
      };

      const result = nodeExecutor['interpolateParameters'](parameters, inputData, {});

      expect(result.computed).toBe('John Doe (ID: 123)');
      // Note: Complex expressions would require a proper expression evaluator
    });
  });

  describe('validateNodeParameters', () => {
    it('should validate required parameters are present', () => {
      const validation = nodeExecutor['validateNodeParameters'](mockNode);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing required parameters', () => {
      const invalidNode: INode = {
        ...mockNode,
        parameters: {
          method: 'GET',
          // Missing required 'url' parameter
        },
      };

      const validation = nodeExecutor['validateNodeParameters'](invalidNode);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('URL parameter is required');
    });

    it('should validate parameter types', () => {
      const invalidNode: INode = {
        ...mockNode,
        parameters: {
          url: 123, // Should be string
          method: 'GET',
          timeout: 'not-a-number', // Should be number
        },
      };

      const validation = nodeExecutor['validateNodeParameters'](invalidNode);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(error => error.includes('URL must be a string'))).toBe(true);
      expect(validation.errors.some(error => error.includes('timeout must be a number'))).toBe(true);
    });

    it('should validate parameter constraints', () => {
      const invalidNode: INode = {
        ...mockNode,
        parameters: {
          url: 'invalid-url', // Should be valid URL
          method: 'INVALID', // Should be valid HTTP method
          timeout: -1, // Should be positive
        },
      };

      const validation = nodeExecutor['validateNodeParameters'](invalidNode);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(error => error.includes('URL must be a valid URL'))).toBe(true);
      expect(validation.errors.some(error => error.includes('method must be a valid HTTP method'))).toBe(true);
      expect(validation.errors.some(error => error.includes('timeout must be positive'))).toBe(true);
    });
  });
});