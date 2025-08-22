import axios, { AxiosRequestConfig } from 'axios';
import { NodeRegistry, INodeExecuteFunctions } from './NodeRegistry';
import { INode, ITaskDataConnections } from '../types/workflow.types';
import { CredentialService } from '../services/CredentialService';
import { createLogger } from '../utils/logger';

const logger = createLogger('NodeExecutor');

export interface INodeExecutionContext {
  node: INode;
  inputData: ITaskDataConnections[];
  credentials?: Record<string, any>;
  variables?: Record<string, any>;
  userId?: string;
  workflowId: string;
  executionId: string;
}

export class NodeExecutor {
  private nodeRegistry: NodeRegistry;
  private credentialService: CredentialService;

  constructor() {
    this.nodeRegistry = NodeRegistry.getInstance();
    this.credentialService = CredentialService.getInstance();
  }

  async executeNode(context: INodeExecutionContext): Promise<any[]> {
    const { node, inputData, credentials, variables, userId } = context;

    try {
      logger.info(`Executing node ${node.id} (${node.type})`, {
        nodeId: node.id,
        nodeType: node.type,
        executionId: context.executionId,
      });

      const nodeType = this.nodeRegistry.getNodeType(node.type);
      if (!nodeType) {
        throw new Error(`Unknown node type: ${node.type}`);
      }

      // Create execution functions for the node
      const executeFunctions = this.createExecuteFunctions(context);

      // Execute the node
      let result: any[];
      if (nodeType.execute) {
        result = await nodeType.execute.call(executeFunctions);
      } else {
        // Default pass-through behavior
        result = inputData.length > 0 ? inputData[0].data : [{}];
      }

      logger.info(`Node ${node.id} executed successfully`, {
        nodeId: node.id,
        outputCount: result.length,
        executionId: context.executionId,
      });

      return result;
    } catch (error: any) {
      logger.error(`Node ${node.id} execution failed`, {
        nodeId: node.id,
        error: error.message,
        stack: error.stack,
        executionId: context.executionId,
      });
      throw error;
    }
  }

  private createExecuteFunctions(context: INodeExecutionContext): INodeExecuteFunctions {
    const { node, inputData, credentials, variables } = context;

    return {
      getInputData: () => {
        return inputData.map(input => ({ json: input.data[0] || {} }));
      },

      getNodeParameter: (parameterName: string, itemIndex: number, fallbackValue?: any) => {
        const value = node.parameters[parameterName];
        if (value === undefined || value === null) {
          return fallbackValue;
        }
        return this.resolveExpression(value, inputData[itemIndex]?.data[0] || {}, variables);
      },

      getCredentials: async (type: string) => {
        if (!node.credentials || !node.credentials[type]) {
          throw new Error(`No credentials of type "${type}" found for node`);
        }

        const credentialId = node.credentials[type];
        return await this.credentialService.getCredential(credentialId, context.userId);
      },

      helpers: {
        request: async (options: any) => {
          return this.makeHttpRequest(options);
        },

        httpRequest: async (options: any) => {
          return this.makeHttpRequest(options);
        },

        prepareBinaryData: (buffer: Buffer, fileName?: string, mimeType?: string) => {
          return {
            data: buffer.toString('base64'),
            mimeType: mimeType || 'application/octet-stream',
            fileName: fileName || 'data.bin',
            fileSize: buffer.length,
          };
        },
      },
    };
  }

  private async makeHttpRequest(options: AxiosRequestConfig): Promise<any> {
    try {
      // Set default timeout
      const config: AxiosRequestConfig = {
        timeout: 30000,
        validateStatus: () => true, // Don't throw on HTTP errors
        ...options,
      };

      // Add default headers
      if (!config.headers) {
        config.headers = {};
      }

      if (!config.headers['User-Agent']) {
        config.headers['User-Agent'] = 'Workflow-Automation-Platform/1.0';
      }

      logger.debug(`Making HTTP request`, {
        method: config.method,
        url: config.url,
        headers: config.headers,
      });

      const response = await axios(config);

      logger.debug(`HTTP request completed`, {
        status: response.status,
        statusText: response.statusText,
        responseSize: JSON.stringify(response.data).length,
      });

      return {
        statusCode: response.status,
        statusMessage: response.statusText,
        headers: response.headers,
        body: response.data,
      };
    } catch (error: any) {
      logger.error(`HTTP request failed`, {
        error: error.message,
        url: options.url,
        method: options.method,
      });

      if (error.response) {
        return {
          statusCode: error.response.status,
          statusMessage: error.response.statusText,
          headers: error.response.headers,
          body: error.response.data,
          error: error.message,
        };
      }

      throw error;
    }
  }

  private resolveExpression(expression: any, data: any, variables?: Record<string, any>): any {
    if (typeof expression !== 'string') {
      return expression;
    }

    // Simple expression resolution - supports {{ }} syntax
    return expression.replace(/\{\{(.+?)\}\}/g, (match, path) => {
      const trimmedPath = path.trim();
      
      // Check if it's a variable
      if (trimmedPath.startsWith('$vars.')) {
        const varPath = trimmedPath.substring(6);
        return this.getNestedValue(variables || {}, varPath) || match;
      }
      
      // Check if it's input data
      if (trimmedPath.startsWith('$input.')) {
        const inputPath = trimmedPath.substring(7);
        return this.getNestedValue(data, inputPath) || match;
      }
      
      // Default to input data
      return this.getNestedValue(data, trimmedPath) || match;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
  }
}

export const nodeExecutor = new NodeExecutor();