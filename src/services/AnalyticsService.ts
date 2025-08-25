import { WorkflowExecution, Workflow, User, WorkflowNode } from '../models';
import { Op, fn, col, literal } from 'sequelize';
import { format, subDays, startOfDay, endOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { createLogger } from '../utils/logger';

interface ExecutionMetrics {
  total: number;
  succeeded: number;
  failed: number;
  running: number;
  pending: number;
  averageDuration: number;
  successRate: number;
}

interface WorkflowStatistics {
  workflowId: string;
  workflowName: string;
  executions: ExecutionMetrics;
  lastExecuted: Date | null;
  createdAt: Date;
  averageNodeCount: number;
}

interface SystemMetrics {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  totalUsers: number;
  executionsToday: number;
  executionsThisWeek: number;
  executionsThisMonth: number;
  topWorkflows: WorkflowStatistics[];
  executionTrend: TimeSeriesData[];
  nodeUsageStats: NodeUsageStats[];
}

interface TimeSeriesData {
  date: string;
  count: number;
  successCount: number;
  failureCount: number;
}

interface NodeUsageStats {
  nodeType: string;
  usageCount: number;
  percentage: number;
}

interface DateRange {
  start: Date;
  end: Date;
}

interface PerformanceMetrics {
  avgExecutionTime: number;
  p50ExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  slowestWorkflows: Array<{
    workflowId: string;
    workflowName: string;
    avgDuration: number;
    executionCount: number;
  }>;
}

export class AnalyticsService {
  private logger: Logger;

  constructor() {
    this.logger = createLogger('AnalyticsService');
  }

  async getSystemMetrics(userId?: string): Promise<SystemMetrics> {
    try {
      const userFilter = userId ? { userId } : {};
      
      // Get total workflows
      const totalWorkflows = await Workflow.count({
        where: userFilter
      });

      // Get active workflows (executed in last 7 days)
      const sevenDaysAgo = subDays(new Date(), 7);
      const activeWorkflows = await Workflow.count({
        where: {
          ...userFilter,
          '$executions.createdAt$': {
            [Op.gte]: sevenDaysAgo
          }
        },
        include: [{
          model: WorkflowExecution,
          as: 'executions',
          attributes: [],
          required: true
        }],
        distinct: true,
        col: 'Workflow.id'
      });

      // Get total executions
      const totalExecutions = await WorkflowExecution.count({
        include: userId ? [{
          model: Workflow,
          as: 'workflow',
          where: { userId },
          attributes: []
        }] : []
      });

      // Get total users
      const totalUsers = await User.count();

      // Get executions today
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());
      const executionsToday = await this.getExecutionCount({ start: todayStart, end: todayEnd }, userId);

      // Get executions this week
      const weekStart = startOfWeek(new Date());
      const executionsThisWeek = await this.getExecutionCount({ start: weekStart, end: new Date() }, userId);

      // Get executions this month
      const monthStart = startOfMonth(new Date());
      const executionsThisMonth = await this.getExecutionCount({ start: monthStart, end: new Date() }, userId);

      // Get top workflows
      const topWorkflows = await this.getTopWorkflows(10, userId);

      // Get execution trend (last 30 days)
      const executionTrend = await this.getExecutionTrend(30, userId);

      // Get node usage stats
      const nodeUsageStats = await this.getNodeUsageStats(userId);

      return {
        totalWorkflows,
        activeWorkflows,
        totalExecutions,
        totalUsers,
        executionsToday,
        executionsThisWeek,
        executionsThisMonth,
        topWorkflows,
        executionTrend,
        nodeUsageStats
      };
    } catch (error) {
      this.logger.error('Failed to get system metrics:', error);
      throw error;
    }
  }

  async getWorkflowStatistics(workflowId: string): Promise<WorkflowStatistics> {
    try {
      const workflow = await Workflow.findByPk(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const executions = await WorkflowExecution.findAll({
        where: { workflowId },
        attributes: [
          'status',
          'duration',
          'createdAt'
        ]
      });

      const metrics = this.calculateExecutionMetrics(executions);
      const lastExecution = executions.length > 0 
        ? executions.reduce((latest, exec) => 
            exec.createdAt > latest.createdAt ? exec : latest
          ).createdAt
        : null;

      // Calculate average node count
      const nodeData = workflow.nodes as any;
      const averageNodeCount = Array.isArray(nodeData) ? nodeData.length : 0;

      return {
        workflowId,
        workflowName: workflow.name,
        executions: metrics,
        lastExecuted: lastExecution,
        createdAt: workflow.createdAt,
        averageNodeCount
      };
    } catch (error) {
      this.logger.error('Failed to get workflow statistics:', error);
      throw error;
    }
  }

  async getExecutionMetrics(dateRange?: DateRange, userId?: string): Promise<ExecutionMetrics> {
    try {
      const whereClause: any = {};
      
      if (dateRange) {
        whereClause.createdAt = {
          [Op.between]: [dateRange.start, dateRange.end]
        };
      }

      const includeClause = userId ? [{
        model: Workflow,
        as: 'workflow',
        where: { userId },
        attributes: []
      }] : [];

      const executions = await WorkflowExecution.findAll({
        where: whereClause,
        include: includeClause,
        attributes: ['status', 'duration']
      });

      return this.calculateExecutionMetrics(executions);
    } catch (error) {
      this.logger.error('Failed to get execution metrics:', error);
      throw error;
    }
  }

  async getPerformanceMetrics(dateRange?: DateRange, userId?: string): Promise<PerformanceMetrics> {
    try {
      const whereClause: any = {
        status: 'completed',
        duration: { [Op.not]: null }
      };
      
      if (dateRange) {
        whereClause.createdAt = {
          [Op.between]: [dateRange.start, dateRange.end]
        };
      }

      const includeClause = userId ? [{
        model: Workflow,
        as: 'workflow',
        where: { userId },
        attributes: ['id', 'name']
      }] : [{
        model: Workflow,
        as: 'workflow',
        attributes: ['id', 'name']
      }];

      const executions = await WorkflowExecution.findAll({
        where: whereClause,
        include: includeClause,
        attributes: ['duration', 'workflowId'],
        order: [['duration', 'ASC']]
      });

      if (executions.length === 0) {
        return {
          avgExecutionTime: 0,
          p50ExecutionTime: 0,
          p95ExecutionTime: 0,
          p99ExecutionTime: 0,
          slowestWorkflows: []
        };
      }

      const durations = executions.map(e => e.duration || 0).sort((a, b) => a - b);
      const avgExecutionTime = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      
      const p50Index = Math.floor(durations.length * 0.5);
      const p95Index = Math.floor(durations.length * 0.95);
      const p99Index = Math.floor(durations.length * 0.99);

      // Group by workflow for slowest workflows
      const workflowDurations = new Map<string, { total: number, count: number, name: string }>();
      
      executions.forEach(exec => {
        const workflow = exec.get('workflow') as any;
        if (workflow) {
          const existing = workflowDurations.get(workflow.id) || { total: 0, count: 0, name: workflow.name };
          existing.total += exec.duration || 0;
          existing.count += 1;
          workflowDurations.set(workflow.id, existing);
        }
      });

      const slowestWorkflows = Array.from(workflowDurations.entries())
        .map(([id, data]) => ({
          workflowId: id,
          workflowName: data.name,
          avgDuration: data.total / data.count,
          executionCount: data.count
        }))
        .sort((a, b) => b.avgDuration - a.avgDuration)
        .slice(0, 10);

      return {
        avgExecutionTime,
        p50ExecutionTime: durations[p50Index],
        p95ExecutionTime: durations[p95Index],
        p99ExecutionTime: durations[p99Index],
        slowestWorkflows
      };
    } catch (error) {
      this.logger.error('Failed to get performance metrics:', error);
      throw error;
    }
  }

  async getUserActivityMetrics(userId: string, days: number = 30): Promise<any> {
    try {
      const startDate = subDays(new Date(), days);
      
      // Get user's workflows
      const workflows = await Workflow.findAll({
        where: { userId },
        attributes: ['id', 'name', 'createdAt']
      });

      const workflowIds = workflows.map(w => w.id);

      // Get executions for user's workflows
      const executions = await WorkflowExecution.findAll({
        where: {
          workflowId: { [Op.in]: workflowIds },
          createdAt: { [Op.gte]: startDate }
        },
        attributes: ['status', 'duration', 'createdAt', 'workflowId']
      });

      // Calculate daily activity
      const dailyActivity = new Map<string, number>();
      executions.forEach(exec => {
        const dateKey = format(exec.createdAt, 'yyyy-MM-dd');
        dailyActivity.set(dateKey, (dailyActivity.get(dateKey) || 0) + 1);
      });

      // Calculate workflow activity
      const workflowActivity = new Map<string, number>();
      executions.forEach(exec => {
        workflowActivity.set(exec.workflowId, (workflowActivity.get(exec.workflowId) || 0) + 1);
      });

      // Find most active workflows
      const mostActiveWorkflows = workflows
        .map(w => ({
          workflowId: w.id,
          workflowName: w.name,
          executionCount: workflowActivity.get(w.id) || 0
        }))
        .sort((a, b) => b.executionCount - a.executionCount)
        .slice(0, 5);

      // Calculate success rate
      const successfulExecutions = executions.filter(e => e.status === 'completed').length;
      const successRate = executions.length > 0 ? (successfulExecutions / executions.length) * 100 : 0;

      return {
        totalWorkflows: workflows.length,
        totalExecutions: executions.length,
        successRate: successRate.toFixed(2),
        averageExecutionsPerDay: (executions.length / days).toFixed(2),
        mostActiveWorkflows,
        dailyActivity: Array.from(dailyActivity.entries()).map(([date, count]) => ({
          date,
          count
        })).sort((a, b) => a.date.localeCompare(b.date))
      };
    } catch (error) {
      this.logger.error('Failed to get user activity metrics:', error);
      throw error;
    }
  }

  private async getExecutionCount(dateRange: DateRange, userId?: string): Promise<number> {
    const whereClause: any = {
      createdAt: {
        [Op.between]: [dateRange.start, dateRange.end]
      }
    };

    const includeClause = userId ? [{
      model: Workflow,
      as: 'workflow',
      where: { userId },
      attributes: []
    }] : [];

    return WorkflowExecution.count({
      where: whereClause,
      include: includeClause
    });
  }

  private async getTopWorkflows(limit: number, userId?: string): Promise<WorkflowStatistics[]> {
    try {
      const userFilter = userId ? { userId } : {};
      
      const workflows = await Workflow.findAll({
        where: userFilter,
        include: [{
          model: WorkflowExecution,
          as: 'executions',
          attributes: ['status', 'duration', 'createdAt']
        }],
        limit
      });

      const statistics = workflows.map(workflow => {
        const executions = workflow.get('executions') as any[];
        const metrics = this.calculateExecutionMetrics(executions || []);
        const lastExecution = executions && executions.length > 0
          ? executions.reduce((latest, exec) => 
              exec.createdAt > latest.createdAt ? exec : latest
            ).createdAt
          : null;

        const nodeData = workflow.nodes as any;
        const averageNodeCount = Array.isArray(nodeData) ? nodeData.length : 0;

        return {
          workflowId: workflow.id,
          workflowName: workflow.name,
          executions: metrics,
          lastExecuted: lastExecution,
          createdAt: workflow.createdAt,
          averageNodeCount
        };
      });

      return statistics.sort((a, b) => b.executions.total - a.executions.total);
    } catch (error) {
      this.logger.error('Failed to get top workflows:', error);
      throw error;
    }
  }

  private async getExecutionTrend(days: number, userId?: string): Promise<TimeSeriesData[]> {
    try {
      const trend: TimeSeriesData[] = [];
      const today = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(today, i);
        const dateStart = startOfDay(date);
        const dateEnd = endOfDay(date);

        const whereClause: any = {
          createdAt: {
            [Op.between]: [dateStart, dateEnd]
          }
        };

        const includeClause = userId ? [{
          model: Workflow,
          as: 'workflow',
          where: { userId },
          attributes: []
        }] : [];

        const [totalCount, successCount, failureCount] = await Promise.all([
          WorkflowExecution.count({
            where: whereClause,
            include: includeClause
          }),
          WorkflowExecution.count({
            where: { ...whereClause, status: 'completed' },
            include: includeClause
          }),
          WorkflowExecution.count({
            where: { ...whereClause, status: 'failed' },
            include: includeClause
          })
        ]);

        trend.push({
          date: format(date, 'yyyy-MM-dd'),
          count: totalCount,
          successCount,
          failureCount
        });
      }

      return trend;
    } catch (error) {
      this.logger.error('Failed to get execution trend:', error);
      throw error;
    }
  }

  private async getNodeUsageStats(userId?: string): Promise<NodeUsageStats[]> {
    try {
      const userFilter = userId ? { userId } : {};
      
      const workflows = await Workflow.findAll({
        where: userFilter,
        attributes: ['nodes']
      });

      const nodeTypeCount = new Map<string, number>();
      let totalNodes = 0;

      workflows.forEach(workflow => {
        const nodes = workflow.nodes as any;
        if (Array.isArray(nodes)) {
          nodes.forEach(node => {
            if (node.type) {
              nodeTypeCount.set(node.type, (nodeTypeCount.get(node.type) || 0) + 1);
              totalNodes++;
            }
          });
        }
      });

      const stats: NodeUsageStats[] = Array.from(nodeTypeCount.entries())
        .map(([nodeType, count]) => ({
          nodeType,
          usageCount: count,
          percentage: totalNodes > 0 ? (count / totalNodes) * 100 : 0
        }))
        .sort((a, b) => b.usageCount - a.usageCount);

      return stats;
    } catch (error) {
      this.logger.error('Failed to get node usage stats:', error);
      throw error;
    }
  }

  private calculateExecutionMetrics(executions: any[]): ExecutionMetrics {
    const total = executions.length;
    const succeeded = executions.filter(e => e.status === 'completed').length;
    const failed = executions.filter(e => e.status === 'failed').length;
    const running = executions.filter(e => e.status === 'running').length;
    const pending = executions.filter(e => e.status === 'pending').length;
    
    const durations = executions
      .filter(e => e.duration && e.status === 'completed')
      .map(e => e.duration);
    
    const averageDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;
    
    const successRate = total > 0 ? (succeeded / total) * 100 : 0;

    return {
      total,
      succeeded,
      failed,
      running,
      pending,
      averageDuration,
      successRate
    };
  }

  async generateReport(reportType: 'daily' | 'weekly' | 'monthly', userId?: string): Promise<any> {
    try {
      const now = new Date();
      let dateRange: DateRange;
      
      switch (reportType) {
        case 'daily':
          dateRange = {
            start: startOfDay(now),
            end: endOfDay(now)
          };
          break;
        case 'weekly':
          dateRange = {
            start: subDays(now, 7),
            end: now
          };
          break;
        case 'monthly':
          dateRange = {
            start: subDays(now, 30),
            end: now
          };
          break;
      }

      const [systemMetrics, executionMetrics, performanceMetrics] = await Promise.all([
        this.getSystemMetrics(userId),
        this.getExecutionMetrics(dateRange, userId),
        this.getPerformanceMetrics(dateRange, userId)
      ]);

      return {
        reportType,
        generatedAt: new Date(),
        dateRange,
        systemMetrics,
        executionMetrics,
        performanceMetrics
      };
    } catch (error) {
      this.logger.error('Failed to generate report:', error);
      throw error;
    }
  }
}

export const analyticsService = new AnalyticsService();