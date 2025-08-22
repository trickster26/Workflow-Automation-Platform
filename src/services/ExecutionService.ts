import { EventEmitter } from 'events';
import Bull, { Queue, Job, JobOptions } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowEngine, IWorkflowExecuteAdditionalData } from '../core/WorkflowEngine';
import { ExecutionModel } from '../models/Execution.model';
import { WorkflowModel } from '../models/Workflow.model';
import { IWorkflow, IExecution, ExecutionStatus, INode, NodeType } from '../types/workflow.types';
import config from '../config';
import { createLogger } from '../utils/logger';

const logger = createLogger('ExecutionService');

export interface IExecutionJobData {
  workflowId: string;
  userId?: string;
  mode: 'manual' | 'trigger' | 'webhook' | 'retry' | 'integrated' | 'cli';
  startNode?: string;
  inputData?: any;
  webhookData?: any;
  variables?: Record<string, any>;
  credentials?: Record<string, any>;
}

export interface IExecutionResult {
  execution: IExecution;
  success: boolean;
  error?: Error;
}

export class ExecutionService extends EventEmitter {
  private static instance: ExecutionService;
  private executionQueue: Queue;
  private activeExecutions: Map<string, WorkflowEngine> = new Map();
  private executionResults: Map<string, IExecutionResult> = new Map();

  private constructor() {
    super();
    this.executionQueue = new Bull('workflow-execution', {
      redis: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
      },
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.setupQueueHandlers();
  }

  public static getInstance(): ExecutionService {
    if (!ExecutionService.instance) {
      ExecutionService.instance = new ExecutionService();
    }
    return ExecutionService.instance;
  }

  private setupQueueHandlers(): void {
    this.executionQueue.process('execute-workflow', 5, async (job: Job<IExecutionJobData>) => {
      const { workflowId, userId, mode, startNode, inputData, webhookData, variables, credentials } = job.data;
      
      logger.info(`Starting workflow execution`, {
        workflowId,
        userId,
        mode,
        jobId: job.id,
      });

      try {
        const workflow = await this.getWorkflow(workflowId);
        if (!workflow) {
          throw new Error(`Workflow ${workflowId} not found`);
        }

        const execution = await this.createExecution(workflow, {
          userId,
          mode,
          webhookData,
          variables,
          credentials,
        });

        job.progress(10);

        const additionalData: IWorkflowExecuteAdditionalData = {
          userId,
          webhookData,
          variables,
          credentials,
        };

        const engine = new WorkflowEngine(workflow, additionalData);
        this.activeExecutions.set(execution.id, engine);

        this.setupEngineEventHandlers(engine, execution, job);

        job.progress(20);

        const result = await engine.execute(startNode);
        
        await this.updateExecution(result);
        
        this.activeExecutions.delete(execution.id);
        
        const executionResult: IExecutionResult = {
          execution: result,
          success: true,
        };
        
        this.executionResults.set(execution.id, executionResult);
        
        logger.info(`Workflow execution completed successfully`, {
          executionId: execution.id,
          workflowId,
          status: result.status,
        });

        job.progress(100);
        
        this.emit('executionCompleted', executionResult);
        
        return executionResult;

      } catch (error: any) {
        logger.error(`Workflow execution failed`, {
          workflowId,
          userId,
          error: error.message,
          stack: error.stack,
        });

        const executionResult: IExecutionResult = {
          execution: job.data as any,
          success: false,
          error,
        };

        this.executionResults.set(job.data.workflowId, executionResult);
        this.emit('executionFailed', executionResult);
        
        throw error;
      }
    });

    this.executionQueue.on('completed', (job: Job, result: IExecutionResult) => {
      logger.info(`Execution job completed`, {
        jobId: job.id,
        executionId: result.execution.id,
        workflowId: job.data.workflowId,
      });
    });

    this.executionQueue.on('failed', (job: Job, error: Error) => {
      logger.error(`Execution job failed`, {
        jobId: job.id,
        workflowId: job.data.workflowId,
        error: error.message,
      });
    });

    this.executionQueue.on('stalled', (job: Job) => {
      logger.warn(`Execution job stalled`, {
        jobId: job.id,
        workflowId: job.data.workflowId,
      });
    });
  }

  private setupEngineEventHandlers(engine: WorkflowEngine, execution: IExecution, job: Job): void {
    engine.on('executionStarted', (exec) => {
      this.emit('executionStarted', exec);
    });

    engine.on('nodeExecutionStarted', (node: INode) => {
      logger.debug(`Node execution started`, {
        executionId: execution.id,
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
      });
      
      this.emit('nodeExecutionStarted', {
        executionId: execution.id,
        node,
      });
    });

    engine.on('nodeExecutionCompleted', (node: INode, outputData: any) => {
      logger.debug(`Node execution completed`, {
        executionId: execution.id,
        nodeId: node.id,
        nodeName: node.name,
        outputCount: outputData.length,
      });
      
      this.emit('nodeExecutionCompleted', {
        executionId: execution.id,
        node,
        outputData,
      });
    });

    engine.on('nodeExecutionFailed', (node: INode, error: Error) => {
      logger.error(`Node execution failed`, {
        executionId: execution.id,
        nodeId: node.id,
        nodeName: node.name,
        error: error.message,
      });
      
      this.emit('nodeExecutionFailed', {
        executionId: execution.id,
        node,
        error,
      });
    });

    engine.on('nodeSkipped', (node: INode) => {
      logger.debug(`Node skipped`, {
        executionId: execution.id,
        nodeId: node.id,
        nodeName: node.name,
      });
      
      this.emit('nodeSkipped', {
        executionId: execution.id,
        node,
      });
    });

    engine.on('nodeRetryAttempt', (node: INode, retryCount: number, error: Error) => {
      logger.warn(`Node retry attempt`, {
        executionId: execution.id,
        nodeId: node.id,
        nodeName: node.name,
        retryCount,
        error: error.message,
      });
      
      this.emit('nodeRetryAttempt', {
        executionId: execution.id,
        node,
        retryCount,
        error,
      });
    });

    engine.on('executionPaused', (exec) => {
      logger.info(`Execution paused`, {
        executionId: exec.id,
      });
      
      this.emit('executionPaused', exec);
    });

    engine.on('executionResumed', (exec) => {
      logger.info(`Execution resumed`, {
        executionId: exec.id,
      });
      
      this.emit('executionResumed', exec);
    });

    engine.on('executionCancelled', (exec) => {
      logger.info(`Execution cancelled`, {
        executionId: exec.id,
      });
      
      this.emit('executionCancelled', exec);
    });
  }

  public async executeWorkflow(data: IExecutionJobData, options?: JobOptions): Promise<string> {
    const jobOptions: JobOptions = {
      delay: 0,
      priority: 0,
      ...options,
    };

    const job = await this.executionQueue.add('execute-workflow', data, jobOptions);
    
    logger.info(`Queued workflow execution`, {
      jobId: job.id,
      workflowId: data.workflowId,
      mode: data.mode,
      userId: data.userId,
    });

    return job.id?.toString() || '';
  }

  public async executeWorkflowManual(workflowId: string, userId?: string, startNode?: string): Promise<string> {
    return this.executeWorkflow({
      workflowId,
      userId,
      mode: 'manual',
      startNode,
    }, {
      priority: 10,
    });
  }

  public async executeWorkflowWebhook(
    workflowId: string,
    webhookData: any,
    nodeId: string
  ): Promise<string> {
    return this.executeWorkflow({
      workflowId,
      mode: 'webhook',
      webhookData,
      startNode: nodeId,
    }, {
      priority: 5,
    });
  }

  public async executeWorkflowTrigger(
    workflowId: string,
    triggerData: any,
    nodeId: string
  ): Promise<string> {
    return this.executeWorkflow({
      workflowId,
      mode: 'trigger',
      inputData: triggerData,
      startNode: nodeId,
    }, {
      priority: 3,
    });
  }

  public async retryExecution(executionId: string, userId?: string): Promise<string> {
    const execution = await this.getExecution(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    return this.executeWorkflow({
      workflowId: execution.workflowId,
      userId,
      mode: 'retry',
    }, {
      priority: 8,
    });
  }

  public async pauseExecution(executionId: string): Promise<boolean> {
    const engine = this.activeExecutions.get(executionId);
    if (!engine) {
      throw new Error(`Active execution ${executionId} not found`);
    }

    engine.pause();
    return true;
  }

  public async resumeExecution(executionId: string): Promise<boolean> {
    const engine = this.activeExecutions.get(executionId);
    if (!engine) {
      throw new Error(`Active execution ${executionId} not found`);
    }

    engine.resume();
    return true;
  }

  public async cancelExecution(executionId: string): Promise<boolean> {
    const engine = this.activeExecutions.get(executionId);
    if (!engine) {
      throw new Error(`Active execution ${executionId} not found`);
    }

    engine.cancel();
    return true;
  }

  public async getExecutionStatus(executionId: string): Promise<ExecutionStatus | null> {
    const execution = await this.getExecution(executionId);
    return execution?.status || null;
  }

  public async getActiveExecutions(): Promise<string[]> {
    return Array.from(this.activeExecutions.keys());
  }

  public async getQueueStats(): Promise<any> {
    const waiting = await this.executionQueue.getWaiting();
    const active = await this.executionQueue.getActive();
    const completed = await this.executionQueue.getCompleted();
    const failed = await this.executionQueue.getFailed();
    const delayed = await this.executionQueue.getDelayed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      totalActive: this.activeExecutions.size,
    };
  }

  public async cleanupCompletedJobs(olderThanDays: number = 7): Promise<void> {
    const olderThan = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    
    await this.executionQueue.clean(olderThan, 'completed');
    await this.executionQueue.clean(olderThan, 'failed');
    
    logger.info(`Cleaned up execution jobs older than ${olderThanDays} days`);
  }

  private async getWorkflow(workflowId: string): Promise<IWorkflow | null> {
    try {
      const workflow = await WorkflowModel.findByPk(workflowId);
      return workflow ? workflow.toJSON() as IWorkflow : null;
    } catch (error: any) {
      logger.error(`Error fetching workflow ${workflowId}:`, error);
      return null;
    }
  }

  private async createExecution(
    workflow: IWorkflow,
    additionalData: IWorkflowExecuteAdditionalData
  ): Promise<IExecution> {
    const execution: Partial<IExecution> = {
      id: uuidv4(),
      workflowId: workflow.id,
      workflowData: workflow,
      mode: additionalData.mode || 'manual',
      startedAt: new Date(),
      finished: false,
      status: ExecutionStatus.RUNNING,
      data: {
        resultData: {
          runData: {},
        },
      },
    };

    const executionModel = await ExecutionModel.create(execution as any);
    return executionModel.toJSON() as IExecution;
  }

  private async updateExecution(execution: IExecution): Promise<void> {
    try {
      await ExecutionModel.update(
        {
          status: execution.status,
          finished: execution.finished,
          stoppedAt: execution.stoppedAt,
          data: execution.data,
        },
        {
          where: { id: execution.id },
        }
      );
    } catch (error: any) {
      logger.error(`Error updating execution ${execution.id}:`, error);
    }
  }

  private async getExecution(executionId: string): Promise<IExecution | null> {
    try {
      const execution = await ExecutionModel.findByPk(executionId);
      return execution ? execution.toJSON() as IExecution : null;
    } catch (error: any) {
      logger.error(`Error fetching execution ${executionId}:`, error);
      return null;
    }
  }

  public async getExecutionHistory(
    workflowId?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<IExecution[]> {
    try {
      const whereClause = workflowId ? { workflowId } : {};
      
      const executions = await ExecutionModel.findAll({
        where: whereClause,
        order: [['startedAt', 'DESC']],
        limit,
        offset,
      });

      return executions.map(e => e.toJSON() as IExecution);
    } catch (error: any) {
      logger.error(`Error fetching execution history:`, error);
      return [];
    }
  }

  public async getExecutionMetrics(workflowId?: string, days: number = 30): Promise<any> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const whereClause: any = {
        startedAt: {
          [require('sequelize').Op.gte]: since,
        },
      };

      if (workflowId) {
        whereClause.workflowId = workflowId;
      }

      const executions = await ExecutionModel.findAll({
        where: whereClause,
        attributes: ['status', 'startedAt', 'stoppedAt'],
      });

      const metrics = {
        total: executions.length,
        success: 0,
        failed: 0,
        cancelled: 0,
        pending: 0,
        running: 0,
        averageExecutionTime: 0,
        successRate: 0,
      };

      let totalExecutionTime = 0;
      let completedExecutions = 0;

      for (const execution of executions) {
        switch (execution.status) {
          case ExecutionStatus.SUCCESS:
            metrics.success++;
            break;
          case ExecutionStatus.FAILED:
            metrics.failed++;
            break;
          case ExecutionStatus.CANCELLED:
            metrics.cancelled++;
            break;
          case ExecutionStatus.PENDING:
            metrics.pending++;
            break;
          case ExecutionStatus.RUNNING:
            metrics.running++;
            break;
        }

        if (execution.stoppedAt && execution.startedAt) {
          const executionTime = execution.stoppedAt.getTime() - execution.startedAt.getTime();
          totalExecutionTime += executionTime;
          completedExecutions++;
        }
      }

      if (completedExecutions > 0) {
        metrics.averageExecutionTime = totalExecutionTime / completedExecutions;
      }

      if (metrics.total > 0) {
        metrics.successRate = (metrics.success / metrics.total) * 100;
      }

      return metrics;
    } catch (error: any) {
      logger.error(`Error fetching execution metrics:`, error);
      return {
        total: 0,
        success: 0,
        failed: 0,
        cancelled: 0,
        pending: 0,
        running: 0,
        averageExecutionTime: 0,
        successRate: 0,
      };
    }
  }

  public async shutdown(): Promise<void> {
    logger.info('Shutting down execution service...');

    for (const [executionId, engine] of this.activeExecutions) {
      logger.info(`Cancelling active execution: ${executionId}`);
      engine.cancel();
    }

    await this.executionQueue.close();
    
    logger.info('Execution service shutdown complete');
  }
}

export const executionService = ExecutionService.getInstance();