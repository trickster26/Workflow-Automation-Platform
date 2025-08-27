import { WorkflowNode, NodeExecution, NodeInput, NodeOutput } from '../../types/workflow.types';
import { createLogger } from '../../utils/logger';

interface WaitNodeConfig {
  mode: 'fixedTime' | 'condition' | 'webhook' | 'schedule' | 'dynamicTime';
  duration?: number; // Duration in milliseconds for fixedTime mode
  durationUnit?: 'milliseconds' | 'seconds' | 'minutes' | 'hours' | 'days';
  condition?: string; // Condition expression for condition mode
  pollInterval?: number; // Polling interval for condition checking
  maxWaitTime?: number; // Maximum wait time before timeout
  webhookPath?: string; // Webhook path for webhook mode
  scheduleExpression?: string; // Cron expression for schedule mode
  dynamicDurationPath?: string; // JSONPath to duration value in input data
  resumeOnTimeout?: boolean; // Whether to resume on timeout or fail
  timeoutAction?: 'continue' | 'fail' | 'retry';
  passthrough?: boolean; // Whether to pass input data through
}

interface WaitContext {
  startTime: number;
  expectedEndTime?: number;
  actualEndTime?: number;
  reason: 'duration' | 'condition' | 'webhook' | 'schedule' | 'timeout' | 'manual';
  metadata?: any;
}

export class WaitNode implements WorkflowNode {
  public readonly type = 'wait';
  public readonly name = 'Wait';
  public readonly category = 'Flow Control';
  public readonly description = 'Pause workflow execution with various wait conditions';

  private logger: Logger;
  private activeWaits: Map<string, WaitContext>;
  private conditionPollers: Map<string, NodeJS.Timeout>;

  constructor() {
    this.logger = createLogger('WaitNode');
    this.activeWaits = new Map();
    this.conditionPollers = new Map();
  }

  async execute(execution: NodeExecution): Promise<NodeOutput[]> {
    try {
      const config = execution.node.config as WaitNodeConfig;
      const inputs = execution.inputs;
      const nodeId = execution.node.id;

      // Validate configuration
      this.validateConfig(config);

      this.logger.info(`Starting wait for node ${nodeId} with mode: ${config.mode}`);

      // Create wait context
      const waitContext: WaitContext = {
        startTime: Date.now(),
        reason: 'duration'
      };

      this.activeWaits.set(nodeId, waitContext);

      // Execute wait based on mode
      let waitResult: any;
      const startTime = Date.now();

      try {
        switch (config.mode) {
          case 'fixedTime':
            waitResult = await this.waitFixedTime(config, waitContext, nodeId);
            break;
          case 'condition':
            waitResult = await this.waitForCondition(config, inputs, waitContext, nodeId);
            break;
          case 'webhook':
            waitResult = await this.waitForWebhook(config, waitContext, nodeId);
            break;
          case 'schedule':
            waitResult = await this.waitForSchedule(config, waitContext, nodeId);
            break;
          case 'dynamicTime':
            waitResult = await this.waitDynamicTime(config, inputs, waitContext, nodeId);
            break;
          default:
            throw new Error(`Unsupported wait mode: ${config.mode}`);
        }

        waitContext.actualEndTime = Date.now();
        waitContext.reason = waitResult.reason || 'duration';
        
        const executionTime = waitContext.actualEndTime - startTime;
        const waitDuration = waitContext.actualEndTime - waitContext.startTime;

        this.logger.info(`Wait completed for node ${nodeId}: ${waitDuration}ms`);

        // Prepare output data
        const outputData = this.prepareOutputData(config, inputs, waitContext, waitResult);

        return [{
          nodeId: execution.node.id,
          data: outputData,
          metadata: { 
            executionTime,
            waitDuration,
            waitReason: waitContext.reason,
            waitMode: config.mode
          }
        }];

      } catch (error: any) {
        this.logger.error(`Wait failed for node ${nodeId}:`, error);
        
        // Handle timeout based on configuration
        if (error.message.includes('timeout') && config.resumeOnTimeout) {
          return this.handleTimeout(execution, config, inputs, waitContext, startTime);
        }
        
        throw error;
      } finally {
        // Clean up
        this.cleanup(nodeId);
      }

    } catch (error) {
      this.logger.error('Wait node execution failed:', error);
      return [{
        nodeId: execution.node.id,
        data: { error: error.message },
        metadata: { executionTime: 0, failed: true }
      }];
    }
  }

  private validateConfig(config: WaitNodeConfig): void {
    if (!config.mode) {
      throw new Error('Wait mode is required');
    }

    switch (config.mode) {
      case 'fixedTime':
        if (!config.duration || config.duration < 0) {
          throw new Error('Duration must be a positive number for fixedTime mode');
        }
        break;
      case 'condition':
        if (!config.condition) {
          throw new Error('Condition is required for condition mode');
        }
        break;
      case 'webhook':
        if (!config.webhookPath) {
          throw new Error('Webhook path is required for webhook mode');
        }
        break;
      case 'schedule':
        if (!config.scheduleExpression) {
          throw new Error('Schedule expression is required for schedule mode');
        }
        break;
      case 'dynamicTime':
        if (!config.dynamicDurationPath) {
          throw new Error('Dynamic duration path is required for dynamicTime mode');
        }
        break;
    }

    if (config.maxWaitTime && config.maxWaitTime < 1) {
      throw new Error('Max wait time must be a positive number');
    }

    if (config.pollInterval && config.pollInterval < 100) {
      throw new Error('Poll interval must be at least 100ms');
    }
  }

  private async waitFixedTime(
    config: WaitNodeConfig,
    context: WaitContext,
    nodeId: string
  ): Promise<any> {
    const duration = this.convertDurationToMs(config.duration!, config.durationUnit);
    context.expectedEndTime = context.startTime + duration;

    this.logger.debug(`Fixed wait: ${duration}ms`);

    // Create timeout promise
    const waitPromise = new Promise((resolve) => {
      setTimeout(() => {
        resolve({ reason: 'duration', duration });
      }, duration);
    });

    // Create max wait timeout if specified
    if (config.maxWaitTime) {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Wait timeout exceeded'));
        }, config.maxWaitTime);
      });

      return Promise.race([waitPromise, timeoutPromise]);
    }

    return waitPromise;
  }

  private async waitForCondition(
    config: WaitNodeConfig,
    inputs: NodeInput[],
    context: WaitContext,
    nodeId: string
  ): Promise<any> {
    const pollInterval = config.pollInterval || 5000; // Default 5 seconds
    const maxWaitTime = config.maxWaitTime || 300000; // Default 5 minutes
    const endTime = Date.now() + maxWaitTime;

    return new Promise((resolve, reject) => {
      const checkCondition = async () => {
        try {
          // Check if max wait time exceeded
          if (Date.now() > endTime) {
            reject(new Error('Condition wait timeout exceeded'));
            return;
          }

          // Evaluate condition
          const conditionMet = await this.evaluateCondition(config.condition!, { inputs });

          if (conditionMet) {
            resolve({ reason: 'condition', conditionResult: true });
          } else {
            // Schedule next check
            const pollerId = setTimeout(checkCondition, pollInterval);
            this.conditionPollers.set(nodeId, pollerId);
          }

        } catch (error) {
          reject(new Error(`Condition evaluation failed: ${error.message}`));
        }
      };

      // Start first check
      checkCondition();
    });
  }

  private async waitForWebhook(
    config: WaitNodeConfig,
    context: WaitContext,
    nodeId: string
  ): Promise<any> {
    const maxWaitTime = config.maxWaitTime || 3600000; // Default 1 hour
    
    // Register webhook listener (this would integrate with the webhook service)
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Webhook wait timeout exceeded'));
      }, maxWaitTime);

      // Simulate webhook reception
      // In a real implementation, this would register with the webhook service
      setTimeout(() => {
        clearTimeout(timeout);
        resolve({ 
          reason: 'webhook', 
          webhookData: { received: true, path: config.webhookPath }
        });
      }, Math.random() * 10000 + 2000); // Random delay 2-12 seconds for simulation
    });
  }

  private async waitForSchedule(
    config: WaitNodeConfig,
    context: WaitContext,
    nodeId: string
  ): Promise<any> {
    const cron = require('node-cron');
    
    return new Promise((resolve, reject) => {
      try {
        // Validate cron expression
        if (!cron.validate(config.scheduleExpression!)) {
          reject(new Error('Invalid cron expression'));
          return;
        }

        // Calculate next execution time
        const nextExecution = this.getNextCronExecution(config.scheduleExpression!);
        const waitTime = nextExecution.getTime() - Date.now();

        if (waitTime <= 0) {
          resolve({ reason: 'schedule', nextExecution: nextExecution.toISOString() });
          return;
        }

        context.expectedEndTime = nextExecution.getTime();
        
        this.logger.debug(`Schedule wait: ${waitTime}ms until ${nextExecution.toISOString()}`);

        setTimeout(() => {
          resolve({ reason: 'schedule', nextExecution: nextExecution.toISOString() });
        }, waitTime);

      } catch (error: any) {
        reject(new Error(`Schedule wait failed: ${error.message}`));
      }
    });
  }

  private async waitDynamicTime(
    config: WaitNodeConfig,
    inputs: NodeInput[],
    context: WaitContext,
    nodeId: string
  ): Promise<any> {
    try {
      // Extract duration from input data
      const inputData = inputs.length > 0 ? inputs[0].data : {};
      let duration: number;

      if (config.dynamicDurationPath?.startsWith('$.')) {
        // JSONPath extraction
        const jsonpath = require('jsonpath');
        const values = jsonpath.query(inputData, config.dynamicDurationPath);
        duration = values.length > 0 ? Number(values[0]) : 0;
      } else {
        // Direct property access
        duration = Number(inputData[config.dynamicDurationPath!]) || 0;
      }

      if (duration < 0) {
        throw new Error('Dynamic duration must be non-negative');
      }

      // Convert to milliseconds if needed
      duration = this.convertDurationToMs(duration, config.durationUnit);
      
      context.expectedEndTime = context.startTime + duration;

      this.logger.debug(`Dynamic wait: ${duration}ms`);

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ reason: 'duration', dynamicDuration: duration });
        }, duration);
      });

    } catch (error: any) {
      throw new Error(`Dynamic time wait failed: ${error.message}`);
    }
  }

  private convertDurationToMs(duration: number, unit?: string): number {
    switch (unit) {
      case 'seconds':
        return duration * 1000;
      case 'minutes':
        return duration * 60 * 1000;
      case 'hours':
        return duration * 60 * 60 * 1000;
      case 'days':
        return duration * 24 * 60 * 60 * 1000;
      case 'milliseconds':
      default:
        return duration;
    }
  }

  private async evaluateCondition(condition: string, context: any): Promise<boolean> {
    try {
      // Simple condition evaluation
      // Replace context variables
      let evaluableCondition = condition;
      
      // Replace common patterns
      evaluableCondition = evaluableCondition.replace(/\$\{([^}]+)\}/g, (match, path) => {
        return JSON.stringify(this.getValueFromPath(context, path));
      });

      // Basic evaluation (use with caution in production)
      return Function(`"use strict"; return (${evaluableCondition})`)();
      
    } catch (error) {
      this.logger.error('Condition evaluation failed:', error);
      return false;
    }
  }

  private getValueFromPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private getNextCronExecution(cronExpression: string): Date {
    const cron = require('node-cron');
    // This is a simplified implementation
    // In practice, you'd use a proper cron parser to get the next execution time
    return new Date(Date.now() + 60000); // Next minute for simplicity
  }

  private prepareOutputData(
    config: WaitNodeConfig,
    inputs: NodeInput[],
    context: WaitContext,
    waitResult: any
  ): any {
    const outputData: any = {
      waitCompleted: true,
      waitDuration: context.actualEndTime! - context.startTime,
      waitReason: context.reason,
      waitResult
    };

    // Pass through input data if configured
    if (config.passthrough && inputs.length > 0) {
      outputData.originalData = inputs[0].data;
    }

    return outputData;
  }

  private handleTimeout(
    execution: NodeExecution,
    config: WaitNodeConfig,
    inputs: NodeInput[],
    context: WaitContext,
    startTime: number
  ): NodeOutput[] {
    const executionTime = Date.now() - startTime;
    context.reason = 'timeout';

    let outputData: any;
    
    switch (config.timeoutAction) {
      case 'continue':
        outputData = {
          waitCompleted: false,
          waitDuration: executionTime,
          waitReason: 'timeout',
          timedOut: true
        };
        if (config.passthrough && inputs.length > 0) {
          outputData.originalData = inputs[0].data;
        }
        break;
      
      case 'fail':
        outputData = { error: 'Wait timeout exceeded' };
        break;
      
      case 'retry':
        // In a real implementation, this would trigger a retry mechanism
        outputData = {
          waitCompleted: false,
          waitDuration: executionTime,
          waitReason: 'timeout',
          retry: true
        };
        break;
      
      default:
        outputData = { error: 'Wait timeout exceeded' };
    }

    return [{
      nodeId: execution.node.id,
      data: outputData,
      metadata: { 
        executionTime,
        waitDuration: executionTime,
        waitReason: 'timeout',
        timedOut: true
      }
    }];
  }

  private cleanup(nodeId: string): void {
    // Remove from active waits
    this.activeWaits.delete(nodeId);
    
    // Clear any active pollers
    const poller = this.conditionPollers.get(nodeId);
    if (poller) {
      clearTimeout(poller);
      this.conditionPollers.delete(nodeId);
    }
  }

  // Public method to manually resume a wait (for webhook or manual triggers)
  public resumeWait(nodeId: string, data?: any): void {
    const context = this.activeWaits.get(nodeId);
    if (context) {
      context.actualEndTime = Date.now();
      context.reason = 'manual';
      context.metadata = data;
      
      this.logger.info(`Manual resume for wait node ${nodeId}`);
      // This would trigger the resolution of the wait promise
    }
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
          description: 'Input data (optional)'
        }
      ],
      outputs: [
        {
          name: 'output',
          type: 'any',
          description: 'Wait completion data'
        }
      ],
      properties: [
        {
          name: 'mode',
          type: 'select',
          required: true,
          options: [
            { value: 'fixedTime', label: 'Fixed Time' },
            { value: 'condition', label: 'Wait for Condition' },
            { value: 'webhook', label: 'Wait for Webhook' },
            { value: 'schedule', label: 'Wait for Schedule' },
            { value: 'dynamicTime', label: 'Dynamic Time' }
          ],
          description: 'Wait mode'
        },
        {
          name: 'duration',
          type: 'number',
          required: false,
          description: 'Wait duration',
          displayCondition: { mode: 'fixedTime' }
        },
        {
          name: 'durationUnit',
          type: 'select',
          required: false,
          default: 'seconds',
          options: [
            { value: 'milliseconds', label: 'Milliseconds' },
            { value: 'seconds', label: 'Seconds' },
            { value: 'minutes', label: 'Minutes' },
            { value: 'hours', label: 'Hours' },
            { value: 'days', label: 'Days' }
          ],
          description: 'Duration unit',
          displayCondition: { mode: ['fixedTime', 'dynamicTime'] }
        },
        {
          name: 'condition',
          type: 'string',
          required: false,
          description: 'Condition expression to wait for',
          displayCondition: { mode: 'condition' }
        },
        {
          name: 'pollInterval',
          type: 'number',
          required: false,
          default: 5000,
          description: 'Condition polling interval (ms)',
          displayCondition: { mode: 'condition' }
        },
        {
          name: 'webhookPath',
          type: 'string',
          required: false,
          description: 'Webhook path to wait for',
          displayCondition: { mode: 'webhook' }
        },
        {
          name: 'scheduleExpression',
          type: 'string',
          required: false,
          placeholder: '0 0 * * *',
          description: 'Cron expression for schedule',
          displayCondition: { mode: 'schedule' }
        },
        {
          name: 'dynamicDurationPath',
          type: 'string',
          required: false,
          description: 'JSONPath to duration value in input',
          displayCondition: { mode: 'dynamicTime' }
        },
        {
          name: 'maxWaitTime',
          type: 'number',
          required: false,
          default: 300000,
          description: 'Maximum wait time (ms)'
        },
        {
          name: 'resumeOnTimeout',
          type: 'boolean',
          required: false,
          default: false,
          description: 'Resume execution on timeout'
        },
        {
          name: 'timeoutAction',
          type: 'select',
          required: false,
          default: 'fail',
          options: [
            { value: 'continue', label: 'Continue' },
            { value: 'fail', label: 'Fail' },
            { value: 'retry', label: 'Retry' }
          ],
          description: 'Action on timeout',
          displayCondition: { resumeOnTimeout: true }
        },
        {
          name: 'passthrough',
          type: 'boolean',
          required: false,
          default: true,
          description: 'Pass input data through to output'
        }
      ]
    };
  }
}