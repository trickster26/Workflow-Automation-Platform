import { EventEmitter } from 'events';
import { ExecutionModel } from '../models/Execution.model';
import { WorkflowModel } from '../models/Workflow.model';
import { executionLoggingService, ILogContext } from './ExecutionLoggingService';
import { getWebSocketService } from './WebSocketService';
import { createLogger } from '../utils/logger';
import { Op } from 'sequelize';

const logger = createLogger('ExecutionMonitoringService');

export interface IExecutionMetrics {
  executionId: string;
  workflowId: string;
  userId?: string;
  status: 'running' | 'completed' | 'error' | 'cancelled' | 'paused';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  nodesExecuted: number;
  nodesTotal: number;
  errorCount: number;
  warningCount: number;
  memoryUsage: number;
  cpuUsage: number;
  throughput: number; // nodes per second
  dataProcessed: number; // bytes
  currentNode?: {
    id: string;
    name: string;
    type: string;
    startTime: Date;
  };
}

export interface IWorkflowHealth {
  workflowId: string;
  workflowName: string;
  totalExecutions: number;
  successRate: number;
  avgDuration: number;
  avgThroughput: number;
  lastExecution?: Date;
  errorRate: number;
  performance: 'excellent' | 'good' | 'fair' | 'poor';
  issues: string[];
  recommendations: string[];
}

export interface ISystemMetrics {
  activeExecutions: number;
  queuedExecutions: number;
  totalExecutionsToday: number;
  successRateToday: number;
  avgExecutionTime: number;
  systemLoad: {
    cpu: number;
    memory: number;
    disk: number;
  };
  topWorkflows: Array<{
    workflowId: string;
    name: string;
    executions: number;
    successRate: number;
  }>;
  recentErrors: Array<{
    executionId: string;
    workflowName: string;
    error: string;
    timestamp: Date;
  }>;
}

export interface IAlertRule {
  id: string;
  name: string;
  type: 'execution_failure' | 'execution_timeout' | 'high_error_rate' | 'performance_degradation';
  condition: {
    threshold: number;
    timeWindow: number; // minutes
    metric: string;
  };
  actions: Array<{
    type: 'email' | 'webhook' | 'slack';
    target: string;
  }>;
  enabled: boolean;
  lastTriggered?: Date;
}

export class ExecutionMonitoringService extends EventEmitter {
  private static instance: ExecutionMonitoringService;
  private activeExecutions: Map<string, IExecutionMetrics> = new Map();
  private alertRules: Map<string, IAlertRule> = new Map();
  private metricsHistory: Array<{ timestamp: Date; metrics: Partial<ISystemMetrics> }> = [];
  private monitoringInterval: NodeJS.Timeout;
  private alertCheckInterval: NodeJS.Timeout;

  private constructor() {
    super();
    this.initializeDefaultAlertRules();
    this.startMonitoring();
  }

  public static getInstance(): ExecutionMonitoringService {
    if (!ExecutionMonitoringService.instance) {
      ExecutionMonitoringService.instance = new ExecutionMonitoringService();
    }
    return ExecutionMonitoringService.instance;
  }

  public startExecutionMonitoring(
    executionId: string,
    workflowId: string,
    userId?: string,
    totalNodes: number = 0
  ): void {
    const metrics: IExecutionMetrics = {
      executionId,
      workflowId,
      userId,
      status: 'running',
      startTime: new Date(),
      nodesExecuted: 0,
      nodesTotal: totalNodes,
      errorCount: 0,
      warningCount: 0,
      memoryUsage: process.memoryUsage().heapUsed,
      cpuUsage: 0,
      throughput: 0,
      dataProcessed: 0,
    };

    this.activeExecutions.set(executionId, metrics);

    // Log execution start
    const logContext: ILogContext = {
      executionId,
      workflowId,
      userId,
    };

    executionLoggingService.logExecutionStart(logContext, {
      totalNodes,
      memoryUsage: metrics.memoryUsage,
    });

    this.emit('executionStarted', metrics);
    this.broadcastMetricsUpdate(executionId);

    logger.info('Started monitoring execution', { executionId, workflowId, totalNodes });
  }

  public updateExecutionProgress(
    executionId: string,
    update: {
      nodeId?: string;
      nodeName?: string;
      nodeType?: string;
      status?: 'running' | 'completed' | 'error' | 'cancelled' | 'paused';
      nodesExecuted?: number;
      errorCount?: number;
      warningCount?: number;
      dataProcessed?: number;
    }
  ): void {
    const metrics = this.activeExecutions.get(executionId);
    if (!metrics) {
      logger.warn('Execution metrics not found for update', { executionId });
      return;
    }

    // Update metrics
    if (update.status) metrics.status = update.status;
    if (update.nodesExecuted !== undefined) metrics.nodesExecuted = update.nodesExecuted;
    if (update.errorCount !== undefined) metrics.errorCount = update.errorCount;
    if (update.warningCount !== undefined) metrics.warningCount = update.warningCount;
    if (update.dataProcessed !== undefined) metrics.dataProcessed += update.dataProcessed;

    // Update current node
    if (update.nodeId) {
      metrics.currentNode = {
        id: update.nodeId,
        name: update.nodeName || update.nodeId,
        type: update.nodeType || 'unknown',
        startTime: new Date(),
      };
    }

    // Calculate performance metrics
    const duration = Date.now() - metrics.startTime.getTime();
    metrics.duration = duration;
    metrics.throughput = metrics.nodesExecuted > 0 ? (metrics.nodesExecuted / (duration / 1000)) : 0;
    metrics.memoryUsage = process.memoryUsage().heapUsed;

    this.emit('executionProgress', metrics);
    this.broadcastMetricsUpdate(executionId);
  }

  public completeExecutionMonitoring(
    executionId: string,
    status: 'completed' | 'error' | 'cancelled',
    finalData?: Record<string, any>
  ): void {
    const metrics = this.activeExecutions.get(executionId);
    if (!metrics) {
      logger.warn('Execution metrics not found for completion', { executionId });
      return;
    }

    metrics.status = status;
    metrics.endTime = new Date();
    metrics.duration = metrics.endTime.getTime() - metrics.startTime.getTime();
    
    if (metrics.nodesExecuted > 0) {
      metrics.throughput = metrics.nodesExecuted / (metrics.duration / 1000);
    }

    // Log execution completion
    const logContext: ILogContext = {
      executionId,
      workflowId: metrics.workflowId,
      userId: metrics.userId,
    };

    executionLoggingService.logExecutionComplete(logContext, status, {
      duration: metrics.duration,
      nodesExecuted: metrics.nodesExecuted,
      errorCount: metrics.errorCount,
      warningCount: metrics.warningCount,
      dataProcessed: metrics.dataProcessed,
      throughput: metrics.throughput,
      ...finalData,
    });

    this.emit('executionCompleted', metrics);
    this.broadcastMetricsUpdate(executionId);

    // Remove from active executions after a delay (for final metrics viewing)
    setTimeout(() => {
      this.activeExecutions.delete(executionId);
    }, 60000); // Keep for 1 minute after completion

    logger.info('Completed monitoring execution', {
      executionId,
      status,
      duration: metrics.duration,
      throughput: metrics.throughput,
    });
  }

  public getExecutionMetrics(executionId: string): IExecutionMetrics | undefined {
    return this.activeExecutions.get(executionId);
  }

  public getAllActiveMetrics(): IExecutionMetrics[] {
    return Array.from(this.activeExecutions.values());
  }

  public async getWorkflowHealth(workflowId: string, days: number = 7): Promise<IWorkflowHealth> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [workflow, executions] = await Promise.all([
      WorkflowModel.findByPk(workflowId),
      ExecutionModel.findAll({
        where: {
          workflowId,
          startedAt: { [Op.gte]: startDate },
        },
        order: [['startedAt', 'DESC']],
      }),
    ]);

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(e => e.status === 'completed').length;
    const errorExecutions = executions.filter(e => e.status === 'error').length;

    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
    const errorRate = totalExecutions > 0 ? (errorExecutions / totalExecutions) * 100 : 0;

    // Calculate average duration
    const completedExecutions = executions.filter(e => e.stoppedAt && e.startedAt);
    const avgDuration = completedExecutions.length > 0 
      ? completedExecutions.reduce((sum, e) => sum + (e.stoppedAt!.getTime() - e.startedAt!.getTime()), 0) / completedExecutions.length
      : 0;

    // Calculate average throughput (nodes per second)
    const avgThroughput = completedExecutions.length > 0
      ? completedExecutions.reduce((sum, e) => {
          const duration = (e.stoppedAt!.getTime() - e.startedAt!.getTime()) / 1000;
          const nodeCount = (e.data as any)?.nodesExecuted || 0;
          return sum + (nodeCount / duration);
        }, 0) / completedExecutions.length
      : 0;

    // Determine performance rating
    let performance: 'excellent' | 'good' | 'fair' | 'poor';
    if (successRate >= 95 && avgDuration < 30000) {
      performance = 'excellent';
    } else if (successRate >= 90 && avgDuration < 60000) {
      performance = 'good';
    } else if (successRate >= 80) {
      performance = 'fair';
    } else {
      performance = 'poor';
    }

    // Generate issues and recommendations
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (successRate < 90) {
      issues.push('High failure rate detected');
      recommendations.push('Review workflow logic and error handling');
    }

    if (avgDuration > 120000) { // 2 minutes
      issues.push('Long execution times');
      recommendations.push('Consider optimizing node configurations and data processing');
    }

    if (errorRate > 10) {
      issues.push('Frequent execution errors');
      recommendations.push('Add better error handling and retry logic');
    }

    return {
      workflowId,
      workflowName: workflow.name,
      totalExecutions,
      successRate,
      avgDuration,
      avgThroughput,
      lastExecution: executions[0]?.startedAt,
      errorRate,
      performance,
      issues,
      recommendations,
    };
  }

  public async getSystemMetrics(): Promise<ISystemMetrics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      activeExecutions,
      queuedExecutions,
      todayExecutions,
      topWorkflows,
      recentErrors,
    ] = await Promise.all([
      ExecutionModel.count({
        where: { status: 'running' },
      }),
      
      ExecutionModel.count({
        where: { status: 'waiting' },
      }),
      
      ExecutionModel.findAll({
        where: {
          startedAt: { [Op.gte]: today },
        },
        include: [{ model: WorkflowModel, as: 'workflow' }],
      }),
      
      ExecutionModel.findAll({
        attributes: [
          'workflowId',
          [ExecutionModel.sequelize!.fn('COUNT', '*'), 'count'],
          [ExecutionModel.sequelize!.fn('AVG', 
            ExecutionModel.sequelize!.literal("CASE WHEN status = 'completed' THEN 1.0 ELSE 0.0 END")
          ), 'successRate'],
        ],
        where: {
          startedAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        group: ['workflowId'],
        order: [[ExecutionModel.sequelize!.fn('COUNT', '*'), 'DESC']],
        limit: 5,
        include: [{ model: WorkflowModel, as: 'workflow' }],
        raw: false,
      }),
      
      ExecutionModel.findAll({
        where: {
          status: 'error',
          startedAt: { [Op.gte]: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
        },
        order: [['startedAt', 'DESC']],
        limit: 10,
        include: [{ model: WorkflowModel, as: 'workflow' }],
      }),
    ]);

    const totalExecutionsToday = todayExecutions.length;
    const successfulToday = todayExecutions.filter(e => e.status === 'completed').length;
    const successRateToday = totalExecutionsToday > 0 ? (successfulToday / totalExecutionsToday) * 100 : 0;

    // Calculate average execution time
    const completedToday = todayExecutions.filter(e => e.stoppedAt && e.startedAt);
    const avgExecutionTime = completedToday.length > 0
      ? completedToday.reduce((sum, e) => sum + (e.stoppedAt!.getTime() - e.startedAt!.getTime()), 0) / completedToday.length
      : 0;

    // System load (simplified - would need OS-specific monitoring in production)
    const memoryUsage = process.memoryUsage();
    const systemLoad = {
      cpu: Math.random() * 100, // Placeholder - would use actual CPU monitoring
      memory: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      disk: Math.random() * 100, // Placeholder - would use actual disk monitoring
    };

    return {
      activeExecutions: this.activeExecutions.size,
      queuedExecutions,
      totalExecutionsToday,
      successRateToday,
      avgExecutionTime,
      systemLoad,
      topWorkflows: (topWorkflows as any[]).map(w => ({
        workflowId: w.workflowId,
        name: w.workflow?.name || 'Unknown',
        executions: parseInt(w.dataValues.count),
        successRate: parseFloat(w.dataValues.successRate) * 100,
      })),
      recentErrors: recentErrors.map(e => ({
        executionId: e.id,
        workflowName: (e as any).workflow?.name || 'Unknown',
        error: (e.data as any)?.error || 'Unknown error',
        timestamp: e.startedAt!,
      })),
    };
  }

  public async getPerformanceTrends(days: number = 30): Promise<{
    executionTrends: Array<{
      date: string;
      executions: number;
      success: number;
      errors: number;
      avgDuration: number;
    }>;
    throughputTrends: Array<{
      date: string;
      avgThroughput: number;
      peakThroughput: number;
    }>;
    errorTrends: Array<{
      date: string;
      errorRate: number;
      topErrors: Array<{ error: string; count: number }>;
    }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get execution data for the period
    const executions = await ExecutionModel.findAll({
      where: {
        startedAt: { [Op.gte]: startDate },
      },
      order: [['startedAt', 'ASC']],
    });

    // Group by date and calculate metrics
    const dailyData = new Map<string, {
      executions: ExecutionModel[];
      date: string;
    }>();

    executions.forEach(execution => {
      const date = execution.startedAt!.toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, { executions: [], date });
      }
      dailyData.get(date)!.executions.push(execution);
    });

    const executionTrends = Array.from(dailyData.values()).map(day => {
      const total = day.executions.length;
      const success = day.executions.filter(e => e.status === 'completed').length;
      const errors = day.executions.filter(e => e.status === 'error').length;
      
      const completedExecutions = day.executions.filter(e => e.stoppedAt && e.startedAt);
      const avgDuration = completedExecutions.length > 0
        ? completedExecutions.reduce((sum, e) => sum + (e.stoppedAt!.getTime() - e.startedAt!.getTime()), 0) / completedExecutions.length
        : 0;

      return {
        date: day.date,
        executions: total,
        success,
        errors,
        avgDuration,
      };
    });

    // Calculate throughput trends (simplified)
    const throughputTrends = Array.from(dailyData.values()).map(day => {
      const completedExecutions = day.executions.filter(e => e.stoppedAt && e.startedAt);
      const throughputs = completedExecutions.map(e => {
        const duration = (e.stoppedAt!.getTime() - e.startedAt!.getTime()) / 1000;
        const nodeCount = (e.data as any)?.nodesExecuted || 1;
        return nodeCount / duration;
      });

      return {
        date: day.date,
        avgThroughput: throughputs.length > 0 ? throughputs.reduce((sum, t) => sum + t, 0) / throughputs.length : 0,
        peakThroughput: throughputs.length > 0 ? Math.max(...throughputs) : 0,
      };
    });

    // Calculate error trends
    const errorTrends = Array.from(dailyData.values()).map(day => {
      const errors = day.executions.filter(e => e.status === 'error');
      const errorRate = day.executions.length > 0 ? (errors.length / day.executions.length) * 100 : 0;
      
      // Group errors by message
      const errorCounts = new Map<string, number>();
      errors.forEach(e => {
        const errorMsg = (e.data as any)?.error || 'Unknown error';
        errorCounts.set(errorMsg, (errorCounts.get(errorMsg) || 0) + 1);
      });

      const topErrors = Array.from(errorCounts.entries())
        .map(([error, count]) => ({ error, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      return {
        date: day.date,
        errorRate,
        topErrors,
      };
    });

    return {
      executionTrends,
      throughputTrends,
      errorTrends,
    };
  }

  private initializeDefaultAlertRules(): void {
    const defaultRules: IAlertRule[] = [
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        type: 'high_error_rate',
        condition: {
          threshold: 20, // 20% error rate
          timeWindow: 60, // 1 hour
          metric: 'error_rate',
        },
        actions: [
          { type: 'email', target: 'admin@example.com' },
        ],
        enabled: true,
      },
      {
        id: 'execution-timeout',
        name: 'Long Running Executions',
        type: 'execution_timeout',
        condition: {
          threshold: 600000, // 10 minutes
          timeWindow: 0,
          metric: 'execution_duration',
        },
        actions: [
          { type: 'webhook', target: '/api/alerts/webhook' },
        ],
        enabled: true,
      },
      {
        id: 'performance-degradation',
        name: 'Performance Degradation',
        type: 'performance_degradation',
        condition: {
          threshold: 50, // 50% increase in avg execution time
          timeWindow: 120, // 2 hours
          metric: 'avg_execution_time',
        },
        actions: [
          { type: 'email', target: 'admin@example.com' },
        ],
        enabled: true,
      },
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  private startMonitoring(): void {
    // System metrics collection
    this.monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.getSystemMetrics();
        this.metricsHistory.push({
          timestamp: new Date(),
          metrics,
        });

        // Keep only last 24 hours of metrics
        const cutoffTime = Date.now() - 24 * 60 * 60 * 1000;
        this.metricsHistory = this.metricsHistory.filter(m => m.timestamp.getTime() > cutoffTime);

        this.emit('systemMetrics', metrics);
        this.broadcastSystemMetrics(metrics);
      } catch (error: any) {
        logger.error('Error collecting system metrics:', error);
      }
    }, 60000); // Every minute

    // Alert checking
    this.alertCheckInterval = setInterval(async () => {
      await this.checkAlerts();
    }, 30000); // Every 30 seconds
  }

  private async checkAlerts(): Promise<void> {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      try {
        await this.evaluateAlertRule(rule);
      } catch (error: any) {
        logger.error(`Error evaluating alert rule ${rule.id}:`, error);
      }
    }
  }

  private async evaluateAlertRule(rule: IAlertRule): Promise<void> {
    // Simplified alert evaluation - would need more sophisticated logic in production
    const now = Date.now();
    const windowStart = new Date(now - rule.condition.timeWindow * 60 * 1000);

    let shouldTrigger = false;

    switch (rule.type) {
      case 'high_error_rate':
        const recentMetrics = this.metricsHistory.filter(m => m.timestamp >= windowStart);
        if (recentMetrics.length > 0) {
          const avgErrorRate = recentMetrics.reduce((sum, m) => {
            const errorRate = 100 - (m.metrics.successRateToday || 0);
            return sum + errorRate;
          }, 0) / recentMetrics.length;
          
          shouldTrigger = avgErrorRate > rule.condition.threshold;
        }
        break;

      case 'execution_timeout':
        for (const metrics of this.activeExecutions.values()) {
          const duration = Date.now() - metrics.startTime.getTime();
          if (duration > rule.condition.threshold) {
            shouldTrigger = true;
            break;
          }
        }
        break;

      case 'performance_degradation':
        // Compare current avg execution time with historical average
        const currentMetrics = this.metricsHistory[this.metricsHistory.length - 1];
        const historicalMetrics = this.metricsHistory.slice(-60, -1); // Previous hour
        
        if (currentMetrics && historicalMetrics.length > 0) {
          const currentAvg = currentMetrics.metrics.avgExecutionTime || 0;
          const historicalAvg = historicalMetrics.reduce((sum, m) => sum + (m.metrics.avgExecutionTime || 0), 0) / historicalMetrics.length;
          
          if (historicalAvg > 0) {
            const increase = ((currentAvg - historicalAvg) / historicalAvg) * 100;
            shouldTrigger = increase > rule.condition.threshold;
          }
        }
        break;
    }

    if (shouldTrigger && (!rule.lastTriggered || (now - rule.lastTriggered.getTime()) > 300000)) { // 5 min cooldown
      await this.triggerAlert(rule);
    }
  }

  private async triggerAlert(rule: IAlertRule): Promise<void> {
    rule.lastTriggered = new Date();
    
    logger.warn(`Alert triggered: ${rule.name}`, {
      ruleId: rule.id,
      condition: rule.condition,
    });

    // Execute alert actions
    for (const action of rule.actions) {
      try {
        await this.executeAlertAction(rule, action);
      } catch (error: any) {
        logger.error(`Failed to execute alert action:`, error);
      }
    }

    this.emit('alertTriggered', { rule });
  }

  private async executeAlertAction(rule: IAlertRule, action: { type: string; target: string }): Promise<void> {
    switch (action.type) {
      case 'email':
        logger.info(`Would send email alert to ${action.target}`, { rule: rule.name });
        // TODO: Implement email sending
        break;
        
      case 'webhook':
        logger.info(`Would send webhook alert to ${action.target}`, { rule: rule.name });
        // TODO: Implement webhook sending
        break;
        
      case 'slack':
        logger.info(`Would send Slack alert to ${action.target}`, { rule: rule.name });
        // TODO: Implement Slack integration
        break;
    }
  }

  private broadcastMetricsUpdate(executionId: string): void {
    const metrics = this.activeExecutions.get(executionId);
    if (metrics) {
      const wsService = getWebSocketService();
      if (wsService) {
        wsService.broadcastToExecution(executionId, {
          type: 'execution_metrics',
          data: metrics,
        });
      }
    }
  }

  private broadcastSystemMetrics(metrics: ISystemMetrics): void {
    const wsService = getWebSocketService();
    if (wsService) {
      wsService.broadcastMessage({
        type: 'system_metrics',
        data: metrics,
      });
    }
  }

  public async shutdown(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
    }

    // Complete any remaining active executions
    for (const [executionId, metrics] of this.activeExecutions) {
      if (metrics.status === 'running') {
        this.completeExecutionMonitoring(executionId, 'cancelled', {
          reason: 'System shutdown',
        });
      }
    }

    logger.info('ExecutionMonitoringService shut down');
  }
}

export const executionMonitoringService = ExecutionMonitoringService.getInstance();