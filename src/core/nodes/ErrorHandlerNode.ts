import { WorkflowNode, NodeExecution, NodeInput, NodeOutput } from '../../types/workflow.types';
import { createLogger } from '../../utils/logger';

interface ErrorHandlerConfig {
  mode: 'tryCatch' | 'fallback' | 'circuit' | 'ignore';
  fallbackValue?: any; // Value to return on error
  ignoreErrorTypes?: string[]; // Error types to ignore
  logErrors?: boolean; // Whether to log errors
  propagateErrors?: boolean; // Whether to propagate certain errors
  errorMapping?: { [key: string]: any }; // Map error types to responses
  retryOnError?: boolean; // Whether to retry on error
  retryCount?: number; // Number of retries
  retryDelay?: number; // Delay between retries
  circuitBreakerThreshold?: number; // Number of consecutive failures to open circuit
  circuitBreakerTimeout?: number; // Timeout before trying again
  alertOnError?: boolean; // Whether to send alerts on errors
  includeStackTrace?: boolean; // Include stack trace in error output
}

interface ErrorContext {
  originalError: Error;
  errorType: string;
  errorMessage: string;
  timestamp: number;
  retryCount: number;
  nodeId: string;
  stackTrace?: string;
}

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

export class ErrorHandlerNode implements WorkflowNode {
  public readonly type = 'errorHandler';
  public readonly name = 'Error Handler';
  public readonly category = 'Flow Control';
  public readonly description = 'Handle errors with try/catch logic, fallbacks, and circuit breakers';

  private logger: Logger;
  private circuitBreakers: Map<string, CircuitBreakerState>;

  constructor() {
    this.logger = createLogger('ErrorHandlerNode');
    this.circuitBreakers = new Map();
  }

  async execute(execution: NodeExecution): Promise<NodeOutput[]> {
    try {
      const config = execution.node.config as ErrorHandlerConfig;
      const inputs = execution.inputs;
      const nodeId = execution.node.id;

      // Validate configuration
      this.validateConfig(config);

      this.logger.debug(`Error handler executing for node ${nodeId} with mode: ${config.mode}`);

      const startTime = Date.now();
      let result: NodeOutput[];

      switch (config.mode) {
        case 'tryCatch':
          result = await this.executeTryCatch(execution, config, inputs);
          break;
        case 'fallback':
          result = await this.executeFallback(execution, config, inputs);
          break;
        case 'circuit':
          result = await this.executeCircuitBreaker(execution, config, inputs);
          break;
        case 'ignore':
          result = await this.executeIgnoreErrors(execution, config, inputs);
          break;
        default:
          throw new Error(`Unsupported error handler mode: ${config.mode}`);
      }

      const executionTime = Date.now() - startTime;
      
      // Add execution metadata
      result.forEach(output => {
        output.metadata = {
          ...output.metadata,
          executionTime,
          errorHandlerMode: config.mode
        };
      });

      return result;

    } catch (error) {
      this.logger.error('Error handler node execution failed:', error);
      return [{
        nodeId: execution.node.id,
        data: { error: error.message, handlerFailed: true },
        metadata: { executionTime: 0, failed: true }
      }];
    }
  }

  private validateConfig(config: ErrorHandlerConfig): void {
    if (!config.mode) {
      throw new Error('Error handler mode is required');
    }

    if (config.retryCount && config.retryCount < 0) {
      throw new Error('Retry count cannot be negative');
    }

    if (config.retryDelay && config.retryDelay < 0) {
      throw new Error('Retry delay cannot be negative');
    }

    if (config.circuitBreakerThreshold && config.circuitBreakerThreshold < 1) {
      throw new Error('Circuit breaker threshold must be at least 1');
    }
  }

  private async executeTryCatch(
    execution: NodeExecution,
    config: ErrorHandlerConfig,
    inputs: NodeInput[]
  ): Promise<NodeOutput[]> {
    const nodeId = execution.node.id;

    try {
      // Execute the main logic (simulate child node execution)
      const result = await this.executeMainLogic(execution, inputs);
      
      return [{
        nodeId,
        data: {
          success: true,
          result,
          executionPath: 'try'
        }
      }];

    } catch (error: any) {
      this.logger.error(`Try block failed for node ${nodeId}:`, error);

      const errorContext = this.createErrorContext(error, nodeId);
      
      // Log error if configured
      if (config.logErrors !== false) {
        this.logError(errorContext, config);
      }

      // Check if should retry
      if (config.retryOnError && config.retryCount && config.retryCount > 0) {
        return await this.executeWithRetry(execution, config, inputs, errorContext);
      }

      // Handle error in catch block
      return [{
        nodeId,
        data: {
          success: false,
          error: {
            type: errorContext.errorType,
            message: errorContext.errorMessage,
            timestamp: errorContext.timestamp,
            stackTrace: config.includeStackTrace ? errorContext.stackTrace : undefined
          },
          fallbackValue: config.fallbackValue,
          executionPath: 'catch'
        }
      }];
    }
  }

  private async executeFallback(
    execution: NodeExecution,
    config: ErrorHandlerConfig,
    inputs: NodeInput[]
  ): Promise<NodeOutput[]> {
    const nodeId = execution.node.id;

    try {
      // Try primary execution
      const result = await this.executeMainLogic(execution, inputs);
      
      return [{
        nodeId,
        data: {
          success: true,
          result,
          source: 'primary'
        }
      }];

    } catch (error: any) {
      this.logger.warn(`Primary execution failed for node ${nodeId}, using fallback:`, error);

      const errorContext = this.createErrorContext(error, nodeId);
      
      if (config.logErrors !== false) {
        this.logError(errorContext, config);
      }

      // Use fallback value or execute fallback logic
      let fallbackResult = config.fallbackValue;
      
      // Check if there's a mapped response for this error type
      if (config.errorMapping && config.errorMapping[errorContext.errorType]) {
        fallbackResult = config.errorMapping[errorContext.errorType];
      }

      return [{
        nodeId,
        data: {
          success: true,
          result: fallbackResult,
          source: 'fallback',
          originalError: {
            type: errorContext.errorType,
            message: errorContext.errorMessage
          }
        }
      }];
    }
  }

  private async executeCircuitBreaker(
    execution: NodeExecution,
    config: ErrorHandlerConfig,
    inputs: NodeInput[]
  ): Promise<NodeOutput[]> {
    const nodeId = execution.node.id;
    const circuitState = this.getCircuitBreakerState(nodeId, config);

    // Check circuit breaker state
    if (circuitState.state === 'open') {
      const now = Date.now();
      if (now < circuitState.nextAttemptTime) {
        // Circuit is open, return fallback immediately
        return [{
          nodeId,
          data: {
            success: false,
            result: config.fallbackValue,
            circuitState: 'open',
            message: 'Circuit breaker is open'
          }
        }];
      } else {
        // Try to close circuit
        circuitState.state = 'half-open';
        this.logger.info(`Circuit breaker for node ${nodeId} moved to half-open state`);
      }
    }

    try {
      // Execute main logic
      const result = await this.executeMainLogic(execution, inputs);
      
      // Reset circuit breaker on success
      if (circuitState.state === 'half-open') {
        circuitState.state = 'closed';
        circuitState.failureCount = 0;
        this.logger.info(`Circuit breaker for node ${nodeId} closed successfully`);
      }

      return [{
        nodeId,
        data: {
          success: true,
          result,
          circuitState: circuitState.state
        }
      }];

    } catch (error: any) {
      const errorContext = this.createErrorContext(error, nodeId);
      
      if (config.logErrors !== false) {
        this.logError(errorContext, config);
      }

      // Update circuit breaker state
      circuitState.failureCount++;
      circuitState.lastFailureTime = Date.now();

      const threshold = config.circuitBreakerThreshold || 5;
      if (circuitState.failureCount >= threshold) {
        circuitState.state = 'open';
        const timeout = config.circuitBreakerTimeout || 60000; // 1 minute default
        circuitState.nextAttemptTime = Date.now() + timeout;
        
        this.logger.warn(`Circuit breaker for node ${nodeId} opened after ${circuitState.failureCount} failures`);
      }

      return [{
        nodeId,
        data: {
          success: false,
          result: config.fallbackValue,
          circuitState: circuitState.state,
          error: {
            type: errorContext.errorType,
            message: errorContext.errorMessage,
            failureCount: circuitState.failureCount
          }
        }
      }];
    }
  }

  private async executeIgnoreErrors(
    execution: NodeExecution,
    config: ErrorHandlerConfig,
    inputs: NodeInput[]
  ): Promise<NodeOutput[]> {
    const nodeId = execution.node.id;

    try {
      const result = await this.executeMainLogic(execution, inputs);
      
      return [{
        nodeId,
        data: {
          success: true,
          result
        }
      }];

    } catch (error: any) {
      const errorContext = this.createErrorContext(error, nodeId);
      
      // Check if this error type should be ignored
      const shouldIgnore = !config.ignoreErrorTypes || 
        config.ignoreErrorTypes.includes(errorContext.errorType) ||
        config.ignoreErrorTypes.includes('*');

      if (shouldIgnore) {
        this.logger.debug(`Ignoring error for node ${nodeId}:`, error);
        
        return [{
          nodeId,
          data: {
            success: true,
            result: config.fallbackValue || null,
            ignoredError: {
              type: errorContext.errorType,
              message: errorContext.errorMessage
            }
          }
        }];
      } else {
        // Don't ignore this error type
        if (config.logErrors !== false) {
          this.logError(errorContext, config);
        }

        if (config.propagateErrors) {
          throw error;
        }

        return [{
          nodeId,
          data: {
            success: false,
            error: {
              type: errorContext.errorType,
              message: errorContext.errorMessage
            }
          }
        }];
      }
    }
  }

  private async executeWithRetry(
    execution: NodeExecution,
    config: ErrorHandlerConfig,
    inputs: NodeInput[],
    initialError: ErrorContext
  ): Promise<NodeOutput[]> {
    const nodeId = execution.node.id;
    const maxRetries = config.retryCount || 3;
    const baseDelay = config.retryDelay || 1000;
    
    let lastError = initialError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Wait before retry (exponential backoff)
        if (attempt > 1) {
          const delay = baseDelay * Math.pow(2, attempt - 2);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        this.logger.info(`Retry attempt ${attempt}/${maxRetries} for node ${nodeId}`);
        
        const result = await this.executeMainLogic(execution, inputs);
        
        this.logger.info(`Retry successful for node ${nodeId} on attempt ${attempt}`);
        
        return [{
          nodeId,
          data: {
            success: true,
            result,
            retryInfo: {
              attempts: attempt,
              successful: true,
              initialError: {
                type: initialError.errorType,
                message: initialError.errorMessage
              }
            }
          }
        }];

      } catch (error: any) {
        lastError = this.createErrorContext(error, nodeId, attempt);
        this.logger.warn(`Retry attempt ${attempt}/${maxRetries} failed for node ${nodeId}:`, error);
      }
    }

    // All retries failed
    this.logger.error(`All retry attempts failed for node ${nodeId}`);
    
    if (config.logErrors !== false) {
      this.logError(lastError, config);
    }

    return [{
      nodeId,
      data: {
        success: false,
        error: {
          type: lastError.errorType,
          message: lastError.errorMessage,
          timestamp: lastError.timestamp
        },
        retryInfo: {
          attempts: maxRetries,
          successful: false,
          finalError: {
            type: lastError.errorType,
            message: lastError.errorMessage
          }
        },
        fallbackValue: config.fallbackValue
      }
    }];
  }

  private async executeMainLogic(execution: NodeExecution, inputs: NodeInput[]): Promise<any> {
    // Simulate main logic execution
    // In a real implementation, this would execute child nodes or the main workflow logic
    
    const simulateFailure = Math.random() < 0.3; // 30% failure rate for testing
    
    if (simulateFailure) {
      const errorTypes = ['NetworkError', 'ValidationError', 'TimeoutError', 'AuthenticationError'];
      const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
      throw new Error(`Simulated ${errorType}: Operation failed`);
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 200));
    
    return {
      processedData: inputs.length > 0 ? inputs[0].data : null,
      timestamp: new Date().toISOString(),
      success: true
    };
  }

  private createErrorContext(error: Error, nodeId: string, retryCount: number = 0): ErrorContext {
    return {
      originalError: error,
      errorType: error.constructor.name,
      errorMessage: error.message,
      timestamp: Date.now(),
      retryCount,
      nodeId,
      stackTrace: error.stack
    };
  }

  private logError(context: ErrorContext, config: ErrorHandlerConfig): void {
    const logData = {
      nodeId: context.nodeId,
      errorType: context.errorType,
      errorMessage: context.errorMessage,
      timestamp: new Date(context.timestamp).toISOString(),
      retryCount: context.retryCount
    };

    if (config.includeStackTrace && context.stackTrace) {
      this.logger.error('Error in workflow node:', { ...logData, stackTrace: context.stackTrace });
    } else {
      this.logger.error('Error in workflow node:', logData);
    }

    // Send alert if configured
    if (config.alertOnError) {
      this.sendErrorAlert(context, config);
    }
  }

  private sendErrorAlert(context: ErrorContext, config: ErrorHandlerConfig): void {
    // In a real implementation, this would integrate with alerting systems
    this.logger.warn(`ERROR ALERT: Node ${context.nodeId} failed with ${context.errorType}: ${context.errorMessage}`);
  }

  private getCircuitBreakerState(nodeId: string, config: ErrorHandlerConfig): CircuitBreakerState {
    if (!this.circuitBreakers.has(nodeId)) {
      this.circuitBreakers.set(nodeId, {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0
      });
    }
    return this.circuitBreakers.get(nodeId)!;
  }

  getNodeDefinition() {
    return {
      type: this.type,
      name: this.name,
      category: this.category,
      description: this.description,
      inputs: [
        {
          name: 'input',
          type: 'any',
          required: false,
          description: 'Input data to process'
        }
      ],
      outputs: [
        {
          name: 'success',
          type: 'any',
          description: 'Successful execution result'
        },
        {
          name: 'error',
          type: 'any',
          description: 'Error handling result'
        }
      ],
      properties: [
        {
          name: 'mode',
          type: 'select',
          required: true,
          options: [
            { value: 'tryCatch', label: 'Try/Catch' },
            { value: 'fallback', label: 'Fallback' },
            { value: 'circuit', label: 'Circuit Breaker' },
            { value: 'ignore', label: 'Ignore Errors' }
          ],
          description: 'Error handling mode'
        },
        {
          name: 'fallbackValue',
          type: 'json',
          required: false,
          description: 'Value to return on error or circuit open'
        },
        {
          name: 'logErrors',
          type: 'boolean',
          required: false,
          default: true,
          description: 'Log errors when they occur'
        },
        {
          name: 'includeStackTrace',
          type: 'boolean',
          required: false,
          default: false,
          description: 'Include stack trace in error output'
        },
        {
          name: 'retryOnError',
          type: 'boolean',
          required: false,
          default: false,
          description: 'Retry execution on error'
        },
        {
          name: 'retryCount',
          type: 'number',
          required: false,
          default: 3,
          description: 'Number of retry attempts',
          displayCondition: { retryOnError: true }
        },
        {
          name: 'retryDelay',
          type: 'number',
          required: false,
          default: 1000,
          description: 'Base delay between retries (ms)',
          displayCondition: { retryOnError: true }
        },
        {
          name: 'circuitBreakerThreshold',
          type: 'number',
          required: false,
          default: 5,
          description: 'Failures before opening circuit',
          displayCondition: { mode: 'circuit' }
        },
        {
          name: 'circuitBreakerTimeout',
          type: 'number',
          required: false,
          default: 60000,
          description: 'Circuit open timeout (ms)',
          displayCondition: { mode: 'circuit' }
        },
        {
          name: 'ignoreErrorTypes',
          type: 'tags',
          required: false,
          description: 'Error types to ignore (* for all)',
          displayCondition: { mode: 'ignore' }
        },
        {
          name: 'alertOnError',
          type: 'boolean',
          required: false,
          default: false,
          description: 'Send alerts on errors'
        },
        {
          name: 'propagateErrors',
          type: 'boolean',
          required: false,
          default: false,
          description: 'Propagate unhandled errors'
        }
      ]
    };
  }
}