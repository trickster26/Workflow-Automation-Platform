import { EventEmitter } from 'events';
import { ExecutionLogModel, IExecutionLogCreationAttributes } from '../models/ExecutionLog.model';
import { createLogger } from '../utils/logger';
import { getWebSocketService } from './WebSocketService';

const logger = createLogger('ExecutionLoggingService');

export interface ILogContext {
  executionId: string;
  workflowId: string;
  userId?: string;
  nodeId?: string;
  nodeName?: string;
  nodeType?: string;
  stepIndex?: number;
}

export interface ILogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  details?: Record<string, any>;
  duration?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  metadata?: Record<string, any>;
}

export interface IPerformanceMetrics {
  startTime: number;
  memoryStart: number;
  cpuStart: number;
}

export class ExecutionLoggingService extends EventEmitter {
  private static instance: ExecutionLoggingService;
  private logBuffer: Map<string, IExecutionLogCreationAttributes[]> = new Map();
  private flushInterval: NodeJS.Timeout;
  private performanceMetrics: Map<string, IPerformanceMetrics> = new Map();
  private bufferSize = 100;
  private flushIntervalMs = 5000; // 5 seconds

  private constructor() {
    super();
    this.startFlushInterval();
  }

  public static getInstance(): ExecutionLoggingService {
    if (!ExecutionLoggingService.instance) {
      ExecutionLoggingService.instance = new ExecutionLoggingService();
    }
    return ExecutionLoggingService.instance;
  }

  public async log(context: ILogContext, entry: ILogEntry): Promise<void> {
    try {
      const logEntry: IExecutionLogCreationAttributes = {
        executionId: context.executionId,
        workflowId: context.workflowId,
        userId: context.userId,
        level: entry.level,
        message: entry.message,
        details: entry.details,
        nodeId: context.nodeId,
        nodeName: context.nodeName,
        nodeType: context.nodeType,
        stepIndex: context.stepIndex,
        timestamp: new Date(),
        duration: entry.duration,
        memoryUsage: entry.memoryUsage,
        cpuUsage: entry.cpuUsage,
        metadata: entry.metadata || {},
      };

      // Add to buffer
      const executionLogs = this.logBuffer.get(context.executionId) || [];
      executionLogs.push(logEntry);
      this.logBuffer.set(context.executionId, executionLogs);

      // Emit real-time log event
      this.emit('logEntry', {
        executionId: context.executionId,
        workflowId: context.workflowId,
        log: logEntry,
      });

      // Send to WebSocket clients
      const wsService = getWebSocketService();
      if (wsService) {
        wsService.broadcastToExecution(context.executionId, {
          type: 'execution_log',
          data: {
            executionId: context.executionId,
            log: logEntry,
          },
        });
      }

      // Flush buffer if it's getting large
      if (executionLogs.length >= this.bufferSize) {
        await this.flushLogs(context.executionId);
      }

      // Log to system logger for important messages
      if (entry.level === 'error' || entry.level === 'warn') {
        logger[entry.level](`[${context.executionId}] ${entry.message}`, {
          executionId: context.executionId,
          workflowId: context.workflowId,
          nodeId: context.nodeId,
          details: entry.details,
        });
      }
    } catch (error: any) {
      logger.error('Failed to log execution entry:', error);
    }
  }

  public async debug(context: ILogContext, message: string, details?: Record<string, any>): Promise<void> {
    await this.log(context, { level: 'debug', message, details });
  }

  public async info(context: ILogContext, message: string, details?: Record<string, any>): Promise<void> {
    await this.log(context, { level: 'info', message, details });
  }

  public async warn(context: ILogContext, message: string, details?: Record<string, any>): Promise<void> {
    await this.log(context, { level: 'warn', message, details });
  }

  public async error(context: ILogContext, message: string, details?: Record<string, any>): Promise<void> {
    await this.log(context, { level: 'error', message, details });
  }

  public startPerformanceTracking(key: string): void {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.performanceMetrics.set(key, {
      startTime: Date.now(),
      memoryStart: memoryUsage.heapUsed,
      cpuStart: cpuUsage.user + cpuUsage.system,
    });
  }

  public stopPerformanceTracking(key: string): {
    duration: number;
    memoryDelta: number;
    cpuDelta: number;
  } | null {
    const metrics = this.performanceMetrics.get(key);
    if (!metrics) {
      return null;
    }

    const duration = Date.now() - metrics.startTime;
    const currentMemory = process.memoryUsage().heapUsed;
    const currentCpu = process.cpuUsage();
    
    const memoryDelta = currentMemory - metrics.memoryStart;
    const cpuDelta = (currentCpu.user + currentCpu.system) - metrics.cpuStart;

    this.performanceMetrics.delete(key);

    return {
      duration,
      memoryDelta,
      cpuDelta,
    };
  }

  public async logNodeExecution(
    context: ILogContext,
    action: 'start' | 'complete' | 'error',
    details?: Record<string, any>
  ): Promise<void> {
    const performanceKey = `${context.executionId}-${context.nodeId}`;
    
    if (action === 'start') {
      this.startPerformanceTracking(performanceKey);
      await this.info(context, `Starting node execution: ${context.nodeName}`, {
        nodeType: context.nodeType,
        stepIndex: context.stepIndex,
        ...details,
      });
    } else {
      const performance = this.stopPerformanceTracking(performanceKey);
      
      const logEntry: ILogEntry = {
        level: action === 'error' ? 'error' : 'info',
        message: `Node execution ${action}: ${context.nodeName}`,
        details: {
          nodeType: context.nodeType,
          stepIndex: context.stepIndex,
          ...details,
        },
        duration: performance?.duration,
        memoryUsage: performance?.memoryDelta,
        cpuUsage: performance?.cpuDelta,
      };

      await this.log(context, logEntry);
    }
  }

  public async logExecutionStart(context: ILogContext, details?: Record<string, any>): Promise<void> {
    this.startPerformanceTracking(`execution-${context.executionId}`);
    
    await this.info(context, 'Workflow execution started', {
      mode: details?.mode || 'manual',
      trigger: details?.trigger,
      inputData: details?.inputData ? 'present' : 'none',
      ...details,
    });
  }

  public async logExecutionComplete(
    context: ILogContext,
    status: 'success' | 'error' | 'cancelled',
    details?: Record<string, any>
  ): Promise<void> {
    const performance = this.stopPerformanceTracking(`execution-${context.executionId}`);
    
    await this.log(context, {
      level: status === 'error' ? 'error' : 'info',
      message: `Workflow execution ${status}`,
      details: {
        finalStatus: status,
        ...details,
      },
      duration: performance?.duration,
      memoryUsage: performance?.memoryDelta,
      cpuUsage: performance?.cpuDelta,
    });

    // Flush all remaining logs for this execution
    await this.flushLogs(context.executionId);
  }

  public async logDataFlow(
    context: ILogContext,
    fromNodeId: string,
    toNodeId: string,
    dataSize: number,
    details?: Record<string, any>
  ): Promise<void> {
    await this.debug(context, `Data flow: ${fromNodeId} → ${toNodeId}`, {
      fromNodeId,
      toNodeId,
      dataSize,
      dataSizeFormatted: this.formatBytes(dataSize),
      ...details,
    });
  }

  public async logError(
    context: ILogContext,
    error: Error,
    details?: Record<string, any>
  ): Promise<void> {
    await this.error(context, error.message, {
      errorName: error.name,
      errorStack: error.stack,
      ...details,
    });
  }

  public async logWebhookTrigger(
    context: ILogContext,
    webhookPath: string,
    method: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.info(context, `Webhook triggered: ${method} ${webhookPath}`, {
      webhookPath,
      method,
      ...details,
    });
  }

  public async logScheduleTrigger(
    context: ILogContext,
    schedule: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.info(context, `Schedule triggered: ${schedule}`, {
      schedule,
      ...details,
    });
  }

  public async getExecutionLogs(
    executionId: string,
    options?: {
      level?: string;
      nodeId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<ExecutionLogModel[]> {
    return ExecutionLogModel.findByExecution(executionId, options);
  }

  public async getWorkflowLogs(
    workflowId: string,
    options?: {
      level?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<ExecutionLogModel[]> {
    return ExecutionLogModel.findByWorkflow(workflowId, options);
  }

  public async getExecutionSummary(executionId: string): Promise<{
    totalLogs: number;
    logLevels: Array<{ level: string; count: number }>;
    errorCount: number;
    warningCount: number;
    duration: number;
    nodeStats: Array<{ nodeId: string; nodeName: string; logCount: number; errorCount: number }>;
  }> {
    return ExecutionLogModel.getExecutionSummary(executionId);
  }

  public async searchLogs(query: {
    workflowId?: string;
    executionId?: string;
    level?: string;
    message?: string;
    nodeId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{
    logs: ExecutionLogModel[];
    total: number;
  }> {
    const where: any = {};

    if (query.workflowId) where.workflowId = query.workflowId;
    if (query.executionId) where.executionId = query.executionId;
    if (query.level) where.level = query.level;
    if (query.nodeId) where.nodeId = query.nodeId;

    if (query.message) {
      where.message = {
        [ExecutionLogModel.sequelize!.Op.iLike]: `%${query.message}%`,
      };
    }

    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) {
        where.timestamp[ExecutionLogModel.sequelize!.Op.gte] = query.startDate;
      }
      if (query.endDate) {
        where.timestamp[ExecutionLogModel.sequelize!.Op.lte] = query.endDate;
      }
    }

    const { rows: logs, count } = await ExecutionLogModel.findAndCountAll({
      where,
      order: [['timestamp', 'DESC']],
      limit: query.limit || 100,
      offset: query.offset || 0,
    });

    return { logs, total: count };
  }

  public async getLogStatistics(options: {
    workflowId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalLogs: number;
    logsByLevel: Array<{ level: string; count: number }>;
    logsByHour: Array<{ hour: string; count: number }>;
    topErrorMessages: Array<{ message: string; count: number }>;
    nodePerformance: Array<{ nodeId: string; nodeName: string; avgDuration: number; errorRate: number }>;
    executionTrends: Array<{ date: string; executions: number; errors: number; avgDuration: number }>;
  }> {
    const where: any = {};

    if (options.workflowId) {
      where.workflowId = options.workflowId;
    }

    if (options.startDate || options.endDate) {
      where.timestamp = {};
      if (options.startDate) {
        where.timestamp[ExecutionLogModel.sequelize!.Op.gte] = options.startDate;
      }
      if (options.endDate) {
        where.timestamp[ExecutionLogModel.sequelize!.Op.lte] = options.endDate;
      }
    }

    const [
      totalLogs,
      logsByLevel,
      logsByHour,
      topErrorMessages,
      nodePerformance,
    ] = await Promise.all([
      ExecutionLogModel.count({ where }),
      
      ExecutionLogModel.findAll({
        where,
        attributes: [
          'level',
          [ExecutionLogModel.sequelize!.fn('COUNT', '*'), 'count'],
        ],
        group: ['level'],
        raw: true,
      }),
      
      ExecutionLogModel.findAll({
        where,
        attributes: [
          [ExecutionLogModel.sequelize!.fn('DATE_TRUNC', 'hour', ExecutionLogModel.sequelize!.col('timestamp')), 'hour'],
          [ExecutionLogModel.sequelize!.fn('COUNT', '*'), 'count'],
        ],
        group: [ExecutionLogModel.sequelize!.fn('DATE_TRUNC', 'hour', ExecutionLogModel.sequelize!.col('timestamp'))],
        order: [[ExecutionLogModel.sequelize!.fn('DATE_TRUNC', 'hour', ExecutionLogModel.sequelize!.col('timestamp')), 'DESC']],
        limit: 24,
        raw: true,
      }),
      
      ExecutionLogModel.findAll({
        where: { ...where, level: 'error' },
        attributes: [
          'message',
          [ExecutionLogModel.sequelize!.fn('COUNT', '*'), 'count'],
        ],
        group: ['message'],
        order: [[ExecutionLogModel.sequelize!.fn('COUNT', '*'), 'DESC']],
        limit: 10,
        raw: true,
      }),
      
      ExecutionLogModel.findAll({
        where: { ...where, nodeId: { [ExecutionLogModel.sequelize!.Op.ne]: null } },
        attributes: [
          'nodeId',
          'nodeName',
          [ExecutionLogModel.sequelize!.fn('AVG', ExecutionLogModel.sequelize!.col('duration')), 'avgDuration'],
          [ExecutionLogModel.sequelize!.literal(`
            (COUNT(CASE WHEN level = 'error' THEN 1 END)::float / COUNT(*)) * 100
          `), 'errorRate'],
        ],
        group: ['nodeId', 'nodeName'],
        having: ExecutionLogModel.sequelize!.where(
          ExecutionLogModel.sequelize!.fn('COUNT', '*'),
          ExecutionLogModel.sequelize!.Op.gte,
          5
        ),
        raw: true,
      }),
    ]);

    // For execution trends, we need to aggregate by day and calculate metrics
    const executionTrends = await ExecutionLogModel.findAll({
      where: {
        ...where,
        message: {
          [ExecutionLogModel.sequelize!.Op.like]: 'Workflow execution%',
        },
      },
      attributes: [
        [ExecutionLogModel.sequelize!.fn('DATE', ExecutionLogModel.sequelize!.col('timestamp')), 'date'],
        [ExecutionLogModel.sequelize!.fn('COUNT', 
          ExecutionLogModel.sequelize!.literal("CASE WHEN message LIKE 'Workflow execution started' THEN 1 END")
        ), 'executions'],
        [ExecutionLogModel.sequelize!.fn('COUNT',
          ExecutionLogModel.sequelize!.literal("CASE WHEN level = 'error' THEN 1 END")
        ), 'errors'],
        [ExecutionLogModel.sequelize!.fn('AVG', ExecutionLogModel.sequelize!.col('duration')), 'avgDuration'],
      ],
      group: [ExecutionLogModel.sequelize!.fn('DATE', ExecutionLogModel.sequelize!.col('timestamp'))],
      order: [[ExecutionLogModel.sequelize!.fn('DATE', ExecutionLogModel.sequelize!.col('timestamp')), 'DESC']],
      limit: 30,
      raw: true,
    });

    return {
      totalLogs,
      logsByLevel: logsByLevel as any[],
      logsByHour: logsByHour as any[],
      topErrorMessages: topErrorMessages as any[],
      nodePerformance: nodePerformance as any[],
      executionTrends: executionTrends as any[],
    };
  }

  public async cleanupOldLogs(retentionDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const deletedCount = await ExecutionLogModel.destroy({
      where: {
        timestamp: {
          [ExecutionLogModel.sequelize!.Op.lt]: cutoffDate,
        },
      },
    });

    logger.info(`Cleaned up ${deletedCount} old execution logs`, {
      cutoffDate: cutoffDate.toISOString(),
      retentionDays,
    });

    return deletedCount;
  }

  private async flushLogs(executionId?: string): Promise<void> {
    try {
      const executionsToFlush = executionId 
        ? [executionId] 
        : Array.from(this.logBuffer.keys());

      for (const execId of executionsToFlush) {
        const logs = this.logBuffer.get(execId);
        if (logs && logs.length > 0) {
          await ExecutionLogModel.bulkCreate(logs);
          this.logBuffer.delete(execId);
          
          logger.debug(`Flushed ${logs.length} logs for execution ${execId}`);
        }
      }
    } catch (error: any) {
      logger.error('Failed to flush execution logs:', error);
    }
  }

  private startFlushInterval(): void {
    this.flushInterval = setInterval(async () => {
      await this.flushLogs();
    }, this.flushIntervalMs);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  public async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    // Flush any remaining logs
    await this.flushLogs();
    
    logger.info('ExecutionLoggingService shut down');
  }
}

export const executionLoggingService = ExecutionLoggingService.getInstance();