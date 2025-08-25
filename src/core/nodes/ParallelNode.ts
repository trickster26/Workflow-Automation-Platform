import { WorkflowNode, NodeExecution, NodeInput, NodeOutput } from '../../types/workflow.types';
import { createLogger } from '../../utils/logger';

interface ParallelNodeConfig {
  mode: 'allBranches' | 'firstToComplete' | 'majorityComplete' | 'waitForN';
  waitForCount?: number; // Number of branches to wait for (waitForN mode)
  timeout?: number; // Timeout in milliseconds
  continueOnError?: boolean; // Continue if some branches fail
  maxConcurrency?: number; // Limit concurrent executions
  failFast?: boolean; // Stop all branches if one fails
  collectOutputs?: boolean; // Whether to collect outputs from all branches
  retryFailedBranches?: boolean; // Retry failed branches
  retryCount?: number; // Number of retries for failed branches
  retryDelay?: number; // Delay between retries in milliseconds
}

interface BranchExecution {
  branchId: string;
  startTime: number;
  endTime?: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled';
  result?: any;
  error?: string;
  retryCount?: number;
}

export class ParallelNode implements WorkflowNode {
  public readonly type = 'parallel';
  public readonly name = 'Parallel Execution';
  public readonly category = 'Flow Control';
  public readonly description = 'Execute multiple workflow branches concurrently';

  private logger: Logger;

  constructor() {
    this.logger = createLogger('ParallelNode');
  }

  async execute(execution: NodeExecution): Promise<NodeOutput[]> {
    try {
      const config = execution.node.config as ParallelNodeConfig;
      const inputs = execution.inputs;

      // Validate configuration
      this.validateConfig(config);

      // Get branches to execute (these would typically be defined in the workflow)
      const branches = this.getBranches(execution);
      
      if (branches.length === 0) {
        this.logger.warn('No branches found for parallel execution');
        return [{
          nodeId: execution.node.id,
          data: { results: [], totalBranches: 0 },
          metadata: { executionTime: 0 }
        }];
      }

      // Execute branches in parallel
      const startTime = Date.now();
      const results = await this.executeBranches(config, branches, inputs);
      const executionTime = Date.now() - startTime;

      // Process results based on configuration
      const output = this.processResults(config, results);

      this.logger.info(`Parallel execution completed: ${branches.length} branches in ${executionTime}ms`);

      return [{
        nodeId: execution.node.id,
        data: output,
        metadata: { 
          executionTime,
          totalBranches: branches.length,
          completedBranches: results.filter(r => r.status === 'completed').length,
          failedBranches: results.filter(r => r.status === 'failed').length,
          timeoutBranches: results.filter(r => r.status === 'timeout').length
        }
      }];

    } catch (error) {
      this.logger.error('Parallel node execution failed:', error);
      return [{
        nodeId: execution.node.id,
        data: { error: error.message },
        metadata: { executionTime: 0, failed: true }
      }];
    }
  }

  private validateConfig(config: ParallelNodeConfig): void {
    if (!config.mode) {
      throw new Error('Parallel execution mode is required');
    }

    if (config.mode === 'waitForN') {
      if (!config.waitForCount || config.waitForCount < 1) {
        throw new Error('Wait for count must be a positive number for waitForN mode');
      }
    }

    if (config.timeout && config.timeout < 1) {
      throw new Error('Timeout must be a positive number');
    }

    if (config.maxConcurrency && config.maxConcurrency < 1) {
      throw new Error('Max concurrency must be a positive number');
    }

    if (config.retryCount && config.retryCount < 0) {
      throw new Error('Retry count cannot be negative');
    }
  }

  private getBranches(execution: NodeExecution): string[] {
    // In a real implementation, branches would be defined in the workflow
    // For now, we'll simulate branches based on the node configuration
    const branchCount = execution.node.config?.branchCount || 2;
    return Array.from({ length: branchCount }, (_, i) => `branch_${i + 1}`);
  }

  private async executeBranches(
    config: ParallelNodeConfig,
    branches: string[],
    inputs: NodeInput[]
  ): Promise<BranchExecution[]> {
    const executions: BranchExecution[] = branches.map(branchId => ({
      branchId,
      startTime: Date.now(),
      status: 'pending' as const
    }));

    const maxConcurrency = config.maxConcurrency || branches.length;
    const timeout = config.timeout || 300000; // 5 minutes default

    // Create execution promises
    const executionPromises = branches.map((branchId, index) => 
      this.executeBranch(branchId, inputs, executions[index], config, timeout)
    );

    // Handle different execution modes
    switch (config.mode) {
      case 'allBranches':
        return await this.executeAllBranches(executionPromises, executions, config);
      
      case 'firstToComplete':
        return await this.executeFirstToComplete(executionPromises, executions, config);
      
      case 'majorityComplete':
        return await this.executeMajorityComplete(executionPromises, executions, config);
      
      case 'waitForN':
        return await this.executeWaitForN(executionPromises, executions, config);
      
      default:
        return await this.executeAllBranches(executionPromises, executions, config);
    }
  }

  private async executeBranch(
    branchId: string,
    inputs: NodeInput[],
    execution: BranchExecution,
    config: ParallelNodeConfig,
    timeout: number
  ): Promise<BranchExecution> {
    execution.status = 'running';
    execution.startTime = Date.now();

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Branch execution timeout')), timeout);
      });

      // Execute branch (simulate execution for now)
      const branchPromise = this.simulateBranchExecution(branchId, inputs);

      // Race between execution and timeout
      const result = await Promise.race([branchPromise, timeoutPromise]);

      execution.status = 'completed';
      execution.result = result;
      execution.endTime = Date.now();

      return execution;

    } catch (error: any) {
      execution.status = error.message.includes('timeout') ? 'timeout' : 'failed';
      execution.error = error.message;
      execution.endTime = Date.now();

      // Handle retries
      if (config.retryFailedBranches && execution.status === 'failed') {
        return await this.retryBranch(branchId, inputs, execution, config);
      }

      return execution;
    }
  }

  private async retryBranch(
    branchId: string,
    inputs: NodeInput[],
    execution: BranchExecution,
    config: ParallelNodeConfig
  ): Promise<BranchExecution> {
    const maxRetries = config.retryCount || 3;
    const retryDelay = config.retryDelay || 1000;
    let currentRetry = execution.retryCount || 0;

    while (currentRetry < maxRetries) {
      currentRetry++;
      execution.retryCount = currentRetry;

      this.logger.info(`Retrying branch ${branchId}, attempt ${currentRetry}/${maxRetries}`);

      // Wait before retry
      if (retryDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, currentRetry - 1))); // Exponential backoff
      }

      try {
        const result = await this.simulateBranchExecution(branchId, inputs);
        execution.status = 'completed';
        execution.result = result;
        execution.endTime = Date.now();
        return execution;

      } catch (error: any) {
        execution.error = error.message;
        if (currentRetry === maxRetries) {
          execution.status = 'failed';
          execution.endTime = Date.now();
        }
      }
    }

    return execution;
  }

  private async simulateBranchExecution(branchId: string, inputs: NodeInput[]): Promise<any> {
    // Simulate branch execution with random delay and potential failure
    const executionTime = Math.random() * 2000 + 500; // 500-2500ms
    const failureRate = 0.1; // 10% failure rate

    await new Promise(resolve => setTimeout(resolve, executionTime));

    if (Math.random() < failureRate) {
      throw new Error(`Branch ${branchId} simulated failure`);
    }

    return {
      branchId,
      executionTime,
      result: `Result from ${branchId}`,
      input: inputs.length > 0 ? inputs[0].data : null,
      timestamp: new Date().toISOString()
    };
  }

  private async executeAllBranches(
    executionPromises: Promise<BranchExecution>[],
    executions: BranchExecution[],
    config: ParallelNodeConfig
  ): Promise<BranchExecution[]> {
    if (config.continueOnError) {
      // Wait for all branches, collecting both successful and failed results
      const results = await Promise.allSettled(executionPromises);
      return results.map((result, index) => 
        result.status === 'fulfilled' ? result.value : executions[index]
      );
    } else {
      // Fail fast if any branch fails
      return await Promise.all(executionPromises);
    }
  }

  private async executeFirstToComplete(
    executionPromises: Promise<BranchExecution>[],
    executions: BranchExecution[],
    config: ParallelNodeConfig
  ): Promise<BranchExecution[]> {
    try {
      const firstCompleted = await Promise.race(executionPromises);
      
      // Cancel remaining branches
      executions.forEach(exec => {
        if (exec.branchId !== firstCompleted.branchId && exec.status === 'running') {
          exec.status = 'cancelled';
          exec.endTime = Date.now();
        }
      });

      return [firstCompleted];

    } catch (error) {
      // If the first to complete fails, try others
      const results = await Promise.allSettled(executionPromises);
      const successful = results.find(r => r.status === 'fulfilled');
      
      if (successful) {
        return [successful.value];
      } else {
        throw new Error('All branches failed');
      }
    }
  }

  private async executeMajorityComplete(
    executionPromises: Promise<BranchExecution>[],
    executions: BranchExecution[],
    config: ParallelNodeConfig
  ): Promise<BranchExecution[]> {
    const majority = Math.ceil(executionPromises.length / 2);
    const completedBranches: BranchExecution[] = [];
    const pendingPromises = [...executionPromises];

    while (completedBranches.length < majority && pendingPromises.length > 0) {
      try {
        const completed = await Promise.race(pendingPromises);
        completedBranches.push(completed);
        
        // Remove completed promise
        const completedIndex = executions.findIndex(e => e.branchId === completed.branchId);
        if (completedIndex !== -1) {
          pendingPromises.splice(completedIndex, 1);
        }

      } catch (error) {
        // Continue trying with remaining branches
        continue;
      }
    }

    if (completedBranches.length < majority) {
      throw new Error('Could not complete majority of branches');
    }

    return completedBranches;
  }

  private async executeWaitForN(
    executionPromises: Promise<BranchExecution>[],
    executions: BranchExecution[],
    config: ParallelNodeConfig
  ): Promise<BranchExecution[]> {
    const waitForCount = config.waitForCount!;
    const completedBranches: BranchExecution[] = [];
    const pendingPromises = [...executionPromises];

    if (waitForCount > executionPromises.length) {
      throw new Error(`Cannot wait for ${waitForCount} branches when only ${executionPromises.length} exist`);
    }

    while (completedBranches.length < waitForCount && pendingPromises.length > 0) {
      try {
        const completed = await Promise.race(pendingPromises);
        completedBranches.push(completed);
        
        // Remove completed promise
        const completedIndex = executions.findIndex(e => e.branchId === completed.branchId);
        if (completedIndex !== -1) {
          pendingPromises.splice(completedIndex, 1);
        }

      } catch (error) {
        // Continue trying with remaining branches
        continue;
      }
    }

    if (completedBranches.length < waitForCount) {
      throw new Error(`Could not complete required ${waitForCount} branches`);
    }

    return completedBranches;
  }

  private processResults(config: ParallelNodeConfig, results: BranchExecution[]): any {
    const completedResults = results.filter(r => r.status === 'completed');
    const failedResults = results.filter(r => r.status === 'failed');
    const timeoutResults = results.filter(r => r.status === 'timeout');
    const cancelledResults = results.filter(r => r.status === 'cancelled');

    const summary = {
      totalBranches: results.length,
      completed: completedResults.length,
      failed: failedResults.length,
      timeout: timeoutResults.length,
      cancelled: cancelledResults.length,
      mode: config.mode,
      executionTimes: results.map(r => ({
        branchId: r.branchId,
        duration: r.endTime ? r.endTime - r.startTime : null,
        status: r.status
      }))
    };

    if (config.collectOutputs) {
      return {
        summary,
        results: completedResults.map(r => ({
          branchId: r.branchId,
          result: r.result,
          duration: r.endTime ? r.endTime - r.startTime : null
        })),
        errors: failedResults.map(r => ({
          branchId: r.branchId,
          error: r.error,
          retryCount: r.retryCount || 0
        }))
      };
    } else {
      return {
        summary,
        success: completedResults.length > 0,
        firstResult: completedResults.length > 0 ? completedResults[0].result : null
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
          description: 'Input data for parallel branches'
        }
      ],
      outputs: [
        {
          name: 'output',
          type: 'any',
          description: 'Results from parallel execution'
        }
      ],
      properties: [
        {
          name: 'mode',
          type: 'select',
          required: true,
          options: [
            { value: 'allBranches', label: 'Wait for All Branches' },
            { value: 'firstToComplete', label: 'First to Complete' },
            { value: 'majorityComplete', label: 'Majority Complete' },
            { value: 'waitForN', label: 'Wait for N Branches' }
          ],
          description: 'Parallel execution completion mode'
        },
        {
          name: 'waitForCount',
          type: 'number',
          required: false,
          description: 'Number of branches to wait for (waitForN mode)',
          displayCondition: { mode: 'waitForN' }
        },
        {
          name: 'branchCount',
          type: 'number',
          required: true,
          default: 2,
          description: 'Number of parallel branches to create'
        },
        {
          name: 'timeout',
          type: 'number',
          required: false,
          default: 300000,
          description: 'Timeout for branch execution in milliseconds'
        },
        {
          name: 'continueOnError',
          type: 'boolean',
          required: false,
          default: true,
          description: 'Continue execution if some branches fail'
        },
        {
          name: 'maxConcurrency',
          type: 'number',
          required: false,
          description: 'Maximum concurrent branch executions'
        },
        {
          name: 'failFast',
          type: 'boolean',
          required: false,
          default: false,
          description: 'Stop all branches if one fails'
        },
        {
          name: 'collectOutputs',
          type: 'boolean',
          required: false,
          default: true,
          description: 'Collect outputs from all completed branches'
        },
        {
          name: 'retryFailedBranches',
          type: 'boolean',
          required: false,
          default: false,
          description: 'Retry failed branches automatically'
        },
        {
          name: 'retryCount',
          type: 'number',
          required: false,
          default: 3,
          description: 'Number of retries for failed branches',
          displayCondition: { retryFailedBranches: true }
        },
        {
          name: 'retryDelay',
          type: 'number',
          required: false,
          default: 1000,
          description: 'Base delay between retries in milliseconds',
          displayCondition: { retryFailedBranches: true }
        }
      ]
    };
  }
}