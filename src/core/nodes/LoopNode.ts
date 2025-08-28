import { WorkflowNode, NodeExecution, NodeInput, NodeOutput } from '../../types/workflow.types';
import { createLogger } from '../../utils/logger';

interface LoopNodeConfig {
  mode: 'forEach' | 'while' | 'repeat' | 'range';
  inputData?: string; // JSONPath to array for forEach mode
  condition?: string; // Condition expression for while mode
  count?: number; // Number of iterations for repeat mode
  start?: number; // Start value for range mode
  end?: number; // End value for range mode
  step?: number; // Step value for range mode
  maxIterations?: number; // Safety limit
  concurrency?: number; // Max concurrent executions
  breakCondition?: string; // Optional condition to break early
  continueCondition?: string; // Optional condition to skip iteration
  outputMode: 'array' | 'lastItem' | 'aggregated';
  batchSize?: number; // Process items in batches
}

interface LoopContext {
  index: number;
  item: any;
  total: number;
  isFirst: boolean;
  isLast: boolean;
  previousResults: any[];
}

export class LoopNode implements WorkflowNode {
  public readonly type = 'loop';
  public readonly name = 'Loop';
  public readonly category = 'Flow Control';
  public readonly description = 'Execute workflow branches in loops with various iteration modes';

  private logger: Logger;

  constructor() {
    this.logger = createLogger('LoopNode');
  }

  async execute(execution: NodeExecution): Promise<NodeOutput[]> {
    try {
      const config = execution.node.config as LoopNodeConfig;
      const inputs = execution.inputs;

      // Validate configuration
      this.validateConfig(config);

      // Determine iteration strategy
      const iterations = await this.generateIterations(config, inputs);
      
      if (iterations.length === 0) {
        this.logger.warn('No iterations generated for loop node');
        return [{
          nodeId: execution.node.id,
          data: { results: [], totalIterations: 0 },
          metadata: { executionTime: 0 }
        }];
      }

      // Execute iterations
      const startTime = Date.now();
      let results: any[] = [];

      if (config.concurrency && config.concurrency > 1) {
        results = await this.executeParallelIterations(execution, config, iterations);
      } else {
        results = await this.executeSequentialIterations(execution, config, iterations);
      }

      // Process output based on mode
      const output = this.processOutput(config, results, iterations.length);
      const executionTime = Date.now() - startTime;

      this.logger.info(`Loop completed: ${iterations.length} iterations in ${executionTime}ms`);

      return [{
        nodeId: execution.node.id,
        data: output,
        metadata: { 
          executionTime,
          totalIterations: iterations.length,
          successfulIterations: results.filter(r => r.success).length,
          failedIterations: results.filter(r => !r.success).length
        }
      }];

    } catch (error) {
      this.logger.error('Loop node execution failed:', error);
      return [{
        nodeId: execution.node.id,
        data: { error: error.message },
        metadata: { executionTime: 0, failed: true }
      }];
    }
  }

  private validateConfig(config: LoopNodeConfig): void {
    if (!config.mode) {
      throw new Error('Loop mode is required');
    }

    switch (config.mode) {
      case 'forEach':
        if (!config.inputData) {
          throw new Error('Input data path is required for forEach mode');
        }
        break;
      case 'while':
        if (!config.condition) {
          throw new Error('Condition is required for while mode');
        }
        break;
      case 'repeat':
        if (!config.count || config.count < 1) {
          throw new Error('Count must be a positive number for repeat mode');
        }
        break;
      case 'range':
        if (config.start === undefined || config.end === undefined) {
          throw new Error('Start and end values are required for range mode');
        }
        break;
    }

    // Safety checks
    if (config.maxIterations && config.maxIterations < 1) {
      throw new Error('Max iterations must be a positive number');
    }

    if (config.concurrency && config.concurrency < 1) {
      throw new Error('Concurrency must be a positive number');
    }
  }

  private async generateIterations(config: LoopNodeConfig, inputs: NodeInput[]): Promise<any[]> {
    const maxIterations = config.maxIterations || 10000; // Safety limit
    let iterations: any[] = [];

    switch (config.mode) {
      case 'forEach':
        iterations = await this.generateForEachIterations(config, inputs);
        break;
      case 'while':
        iterations = await this.generateWhileIterations(config, inputs, maxIterations);
        break;
      case 'repeat':
        iterations = await this.generateRepeatIterations(config);
        break;
      case 'range':
        iterations = await this.generateRangeIterations(config);
        break;
    }

    // Apply safety limit
    if (iterations.length > maxIterations) {
      this.logger.warn(`Limiting iterations to ${maxIterations} for safety`);
      iterations = iterations.slice(0, maxIterations);
    }

    return iterations;
  }

  private async generateForEachIterations(config: LoopNodeConfig, inputs: NodeInput[]): Promise<any[]> {
    try {
      // Extract array from inputs using JSONPath or direct access
      let dataArray: any[] = [];

      if (config.inputData?.startsWith('$.')) {
        // JSONPath extraction
        const jsonpath = require('jsonpath');
        const inputData = inputs.length > 0 ? inputs[0].data : {};
        dataArray = jsonpath.query(inputData, config.inputData);
      } else {
        // Direct property access
        const inputData = inputs.length > 0 ? inputs[0].data : {};
        dataArray = inputData[config.inputData || ''] || [];
      }

      if (!Array.isArray(dataArray)) {
        throw new Error('Input data must be an array for forEach mode');
      }

      return dataArray.map((item, index) => ({
        index,
        item,
        total: dataArray.length,
        isFirst: index === 0,
        isLast: index === dataArray.length - 1
      }));

    } catch (error) {
      this.logger.error('Failed to generate forEach iterations:', error);
      throw new Error(`Invalid input data for forEach: ${error.message}`);
    }
  }

  private async generateWhileIterations(config: LoopNodeConfig, inputs: NodeInput[], maxIterations: number): Promise<any[]> {
    const iterations: any[] = [];
    let index = 0;
    let context = { inputs, index, previousResults: [] };

    while (index < maxIterations) {
      // Evaluate while condition
      const shouldContinue = await this.evaluateCondition(config.condition!, context);
      if (!shouldContinue) {
        break;
      }

      iterations.push({
        index,
        context: { ...context },
        isFirst: index === 0
      });

      index++;
      context.index = index;
    }

    if (index >= maxIterations) {
      this.logger.warn(`While loop terminated after ${maxIterations} iterations (safety limit)`);
    }

    return iterations;
  }

  private async generateRepeatIterations(config: LoopNodeConfig): Promise<any[]> {
    const count = config.count!;
    return Array.from({ length: count }, (_, index) => ({
      index,
      total: count,
      isFirst: index === 0,
      isLast: index === count - 1
    }));
  }

  private async generateRangeIterations(config: LoopNodeConfig): Promise<any[]> {
    const start = config.start!;
    const end = config.end!;
    const step = config.step || 1;
    const iterations: any[] = [];

    if (step === 0) {
      throw new Error('Step cannot be zero');
    }

    if (step > 0 && start <= end) {
      for (let i = start; i <= end; i += step) {
        iterations.push({
          value: i,
          index: iterations.length,
          start,
          end,
          step
        });
      }
    } else if (step < 0 && start >= end) {
      for (let i = start; i >= end; i += step) {
        iterations.push({
          value: i,
          index: iterations.length,
          start,
          end,
          step
        });
      }
    }

    return iterations;
  }

  private async executeSequentialIterations(
    execution: NodeExecution,
    config: LoopNodeConfig,
    iterations: any[]
  ): Promise<any[]> {
    const results: any[] = [];
    let previousResults: any[] = [];

    for (let i = 0; i < iterations.length; i++) {
      const iteration = iterations[i];
      
      // Check break condition
      if (config.breakCondition) {
        const shouldBreak = await this.evaluateCondition(
          config.breakCondition,
          { iteration, previousResults, index: i }
        );
        if (shouldBreak) {
          this.logger.info(`Loop break condition met at iteration ${i}`);
          break;
        }
      }

      // Check continue condition
      if (config.continueCondition) {
        const shouldSkip = await this.evaluateCondition(
          config.continueCondition,
          { iteration, previousResults, index: i }
        );
        if (shouldSkip) {
          this.logger.debug(`Skipping iteration ${i} due to continue condition`);
          results.push({ skipped: true, iteration: i });
          continue;
        }
      }

      // Execute iteration
      try {
        const iterationResult = await this.executeIteration(execution, iteration, previousResults);
        results.push({
          success: true,
          iteration: i,
          data: iterationResult,
          context: iteration
        });
        
        // Update previous results for next iteration
        previousResults.push(iterationResult);
        
      } catch (error) {
        this.logger.error(`Iteration ${i} failed:`, error);
        results.push({
          success: false,
          iteration: i,
          error: error.message,
          context: iteration
        });
      }
    }

    return results;
  }

  private async executeParallelIterations(
    execution: NodeExecution,
    config: LoopNodeConfig,
    iterations: any[]
  ): Promise<any[]> {
    const concurrency = config.concurrency!;
    const results: any[] = new Array(iterations.length);
    const executing: Promise<void>[] = [];
    let index = 0;

    const executeNext = async (): Promise<void> => {
      if (index >= iterations.length) return;

      const currentIndex = index++;
      const iteration = iterations[currentIndex];

      try {
        const iterationResult = await this.executeIteration(execution, iteration, []);
        results[currentIndex] = {
          success: true,
          iteration: currentIndex,
          data: iterationResult,
          context: iteration
        };
      } catch (error) {
        this.logger.error(`Parallel iteration ${currentIndex} failed:`, error);
        results[currentIndex] = {
          success: false,
          iteration: currentIndex,
          error: error.message,
          context: iteration
        };
      }
    };

    // Start initial batch of executions
    for (let i = 0; i < Math.min(concurrency, iterations.length); i++) {
      executing.push(executeNext().then(() => {
        // When one completes, start the next one
        if (index < iterations.length) {
          return executeNext();
        }
      }));
    }

    // Wait for all executions to complete
    await Promise.all(executing);

    return results.filter(result => result !== undefined);
  }

  private async executeIteration(
    execution: NodeExecution,
    iteration: any,
    previousResults: any[]
  ): Promise<any> {
    // Create iteration context
    const iterationContext: LoopContext = {
      index: iteration.index || 0,
      item: iteration.item || iteration,
      total: iteration.total || 1,
      isFirst: iteration.isFirst || false,
      isLast: iteration.isLast || false,
      previousResults
    };

    // Prepare execution context with loop variables
    const iterationExecution = {
      ...execution,
      context: {
        ...execution.context,
        loop: iterationContext
      }
    };

    // Execute child nodes (if any)
    // This would typically involve calling the workflow engine
    // For now, we'll simulate the execution
    return {
      iteration: iterationContext,
      timestamp: new Date().toISOString(),
      data: iteration.item || iteration
    };
  }

  private async evaluateCondition(condition: string, context: any): Promise<boolean> {
    try {
      // Simple condition evaluation
      // In a real implementation, you might use a more sophisticated expression parser
      
      // Replace context variables
      let evaluableCondition = condition;
      
      // Replace common patterns
      evaluableCondition = evaluableCondition.replace(/\$\{([^}]+)\}/g, (match, path) => {
        return this.getValueFromPath(context, path);
      });

      // Basic evaluation (use with caution in production)
      // Consider using a safer expression evaluator like expr-eval
      return Function(`"use strict"; return (${evaluableCondition})`)();
      
    } catch (error) {
      this.logger.error('Condition evaluation failed:', error);
      return false;
    }
  }

  private getValueFromPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private processOutput(config: LoopNodeConfig, results: any[], totalIterations: number): any {
    const successfulResults = results.filter(r => r.success).map(r => r.data);
    const failedResults = results.filter(r => !r.success);

    const baseOutput = {
      totalIterations,
      successfulIterations: successfulResults.length,
      failedIterations: failedResults.length,
      errors: failedResults.map(r => ({ iteration: r.iteration, error: r.error }))
    };

    switch (config.outputMode) {
      case 'array':
        return {
          ...baseOutput,
          results: successfulResults
        };

      case 'lastItem':
        return {
          ...baseOutput,
          result: successfulResults.length > 0 ? successfulResults[successfulResults.length - 1] : null
        };

      case 'aggregated':
        return {
          ...baseOutput,
          aggregated: {
            count: successfulResults.length,
            sum: successfulResults.reduce((acc, val) => acc + (typeof val === 'number' ? val : 0), 0),
            average: successfulResults.length > 0 ? 
              successfulResults.reduce((acc, val) => acc + (typeof val === 'number' ? val : 0), 0) / successfulResults.length : 0
          },
          results: successfulResults
        };

      default:
        return {
          ...baseOutput,
          results: successfulResults
        };
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
          description: 'Input data for the loop'
        }
      ],
      outputs: [
        {
          name: 'output',
          type: 'any',
          description: 'Results from loop execution'
        }
      ],
      properties: [
        {
          name: 'mode',
          type: 'select',
          required: true,
          options: [
            { value: 'forEach', label: 'For Each Item' },
            { value: 'while', label: 'While Condition' },
            { value: 'repeat', label: 'Repeat Count' },
            { value: 'range', label: 'Range' }
          ],
          description: 'Loop execution mode'
        },
        {
          name: 'inputData',
          type: 'string',
          required: false,
          description: 'JSONPath to array data (forEach mode)',
          displayCondition: { mode: 'forEach' }
        },
        {
          name: 'condition',
          type: 'string',
          required: false,
          description: 'Condition expression (while mode)',
          displayCondition: { mode: 'while' }
        },
        {
          name: 'count',
          type: 'number',
          required: false,
          description: 'Number of iterations (repeat mode)',
          displayCondition: { mode: 'repeat' }
        },
        {
          name: 'start',
          type: 'number',
          required: false,
          description: 'Start value (range mode)',
          displayCondition: { mode: 'range' }
        },
        {
          name: 'end',
          type: 'number',
          required: false,
          description: 'End value (range mode)',
          displayCondition: { mode: 'range' }
        },
        {
          name: 'step',
          type: 'number',
          required: false,
          default: 1,
          description: 'Step value (range mode)',
          displayCondition: { mode: 'range' }
        },
        {
          name: 'maxIterations',
          type: 'number',
          required: false,
          default: 10000,
          description: 'Maximum number of iterations (safety limit)'
        },
        {
          name: 'concurrency',
          type: 'number',
          required: false,
          default: 1,
          description: 'Maximum concurrent executions'
        },
        {
          name: 'outputMode',
          type: 'select',
          required: true,
          default: 'array',
          options: [
            { value: 'array', label: 'Array of Results' },
            { value: 'lastItem', label: 'Last Item Only' },
            { value: 'aggregated', label: 'Aggregated Results' }
          ],
          description: 'How to format the output'
        },
        {
          name: 'breakCondition',
          type: 'string',
          required: false,
          description: 'Condition to break loop early'
        },
        {
          name: 'continueCondition',
          type: 'string',
          required: false,
          description: 'Condition to skip iteration'
        }
      ]
    };
  }
}