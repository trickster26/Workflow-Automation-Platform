import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { analyticsService } from '../services/AnalyticsService';
import { createLogger } from '../utils/logger';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

const router = Router();
const logger = createLogger('DashboardRoutes');

router.get('/metrics/system', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';
    
    const metrics = await analyticsService.getSystemMetrics(isAdmin ? undefined : userId);
    
    res.json({
      status: 'success',
      data: metrics
    });
  } catch (error) {
    logger.error('Failed to get system metrics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve system metrics'
    });
  }
});

router.get('/metrics/workflow/:workflowId', authenticate, async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    
    const statistics = await analyticsService.getWorkflowStatistics(workflowId);
    
    res.json({
      status: 'success',
      data: statistics
    });
  } catch (error) {
    logger.error('Failed to get workflow statistics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve workflow statistics'
    });
  }
});

router.get('/metrics/executions', authenticate, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';
    
    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };
    }
    
    const metrics = await analyticsService.getExecutionMetrics(
      dateRange,
      isAdmin ? undefined : userId
    );
    
    res.json({
      status: 'success',
      data: metrics
    });
  } catch (error) {
    logger.error('Failed to get execution metrics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve execution metrics'
    });
  }
});

router.get('/metrics/performance', authenticate, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';
    
    let dateRange;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      };
    }
    
    const metrics = await analyticsService.getPerformanceMetrics(
      dateRange,
      isAdmin ? undefined : userId
    );
    
    res.json({
      status: 'success',
      data: metrics
    });
  } catch (error) {
    logger.error('Failed to get performance metrics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve performance metrics'
    });
  }
});

router.get('/metrics/user-activity', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id!;
    const days = parseInt(req.query.days as string) || 30;
    
    const metrics = await analyticsService.getUserActivityMetrics(userId, days);
    
    res.json({
      status: 'success',
      data: metrics
    });
  } catch (error) {
    logger.error('Failed to get user activity metrics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve user activity metrics'
    });
  }
});

router.get('/reports/:type', authenticate, async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';
    
    if (!['daily', 'weekly', 'monthly'].includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid report type. Must be daily, weekly, or monthly'
      });
    }
    
    const report = await analyticsService.generateReport(
      type as 'daily' | 'weekly' | 'monthly',
      isAdmin ? undefined : userId
    );
    
    res.json({
      status: 'success',
      data: report
    });
  } catch (error) {
    logger.error('Failed to generate report:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate report'
    });
  }
});

router.get('/charts/execution-trend', authenticate, async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';
    
    const systemMetrics = await analyticsService.getSystemMetrics(isAdmin ? undefined : userId);
    
    res.json({
      status: 'success',
      data: {
        trend: systemMetrics.executionTrend,
        period: `${days} days`
      }
    });
  } catch (error) {
    logger.error('Failed to get execution trend:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve execution trend'
    });
  }
});

router.get('/charts/node-usage', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';
    
    const systemMetrics = await analyticsService.getSystemMetrics(isAdmin ? undefined : userId);
    
    res.json({
      status: 'success',
      data: systemMetrics.nodeUsageStats
    });
  } catch (error) {
    logger.error('Failed to get node usage stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve node usage statistics'
    });
  }
});

router.get('/charts/workflow-performance', authenticate, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';
    
    const systemMetrics = await analyticsService.getSystemMetrics(isAdmin ? undefined : userId);
    
    res.json({
      status: 'success',
      data: systemMetrics.topWorkflows.slice(0, limit)
    });
  } catch (error) {
    logger.error('Failed to get workflow performance:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve workflow performance data'
    });
  }
});

router.get('/summary', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';
    
    const [systemMetrics, todayMetrics, weekMetrics, performanceMetrics] = await Promise.all([
      analyticsService.getSystemMetrics(isAdmin ? undefined : userId),
      analyticsService.getExecutionMetrics(
        { start: startOfDay(new Date()), end: endOfDay(new Date()) },
        isAdmin ? undefined : userId
      ),
      analyticsService.getExecutionMetrics(
        { start: subDays(new Date(), 7), end: new Date() },
        isAdmin ? undefined : userId
      ),
      analyticsService.getPerformanceMetrics(
        { start: subDays(new Date(), 30), end: new Date() },
        isAdmin ? undefined : userId
      )
    ]);
    
    res.json({
      status: 'success',
      data: {
        overview: {
          totalWorkflows: systemMetrics.totalWorkflows,
          activeWorkflows: systemMetrics.activeWorkflows,
          totalExecutions: systemMetrics.totalExecutions,
          totalUsers: systemMetrics.totalUsers
        },
        today: {
          executions: todayMetrics.total,
          successRate: todayMetrics.successRate,
          averageDuration: todayMetrics.averageDuration
        },
        week: {
          executions: weekMetrics.total,
          successRate: weekMetrics.successRate,
          averageDuration: weekMetrics.averageDuration
        },
        performance: {
          avgExecutionTime: performanceMetrics.avgExecutionTime,
          p95ExecutionTime: performanceMetrics.p95ExecutionTime
        },
        topWorkflows: systemMetrics.topWorkflows.slice(0, 5),
        recentTrend: systemMetrics.executionTrend.slice(-7)
      }
    });
  } catch (error) {
    logger.error('Failed to get dashboard summary:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve dashboard summary'
    });
  }
});

router.post('/export', authenticate, async (req: Request, res: Response) => {
  try {
    const { format: exportFormat = 'json', reportType = 'monthly' } = req.body;
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';
    
    const report = await analyticsService.generateReport(
      reportType as 'daily' | 'weekly' | 'monthly',
      isAdmin ? undefined : userId
    );
    
    if (exportFormat === 'csv') {
      const csv = convertReportToCSV(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=analytics-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=analytics-report-${format(new Date(), 'yyyy-MM-dd')}.json`);
      res.json(report);
    }
  } catch (error) {
    logger.error('Failed to export analytics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to export analytics data'
    });
  }
});

function convertReportToCSV(report: any): string {
  const lines: string[] = [];
  
  lines.push('Analytics Report');
  lines.push(`Generated At,${report.generatedAt}`);
  lines.push(`Report Type,${report.reportType}`);
  lines.push('');
  
  lines.push('System Metrics');
  lines.push('Metric,Value');
  lines.push(`Total Workflows,${report.systemMetrics.totalWorkflows}`);
  lines.push(`Active Workflows,${report.systemMetrics.activeWorkflows}`);
  lines.push(`Total Executions,${report.systemMetrics.totalExecutions}`);
  lines.push(`Total Users,${report.systemMetrics.totalUsers}`);
  lines.push(`Executions Today,${report.systemMetrics.executionsToday}`);
  lines.push(`Executions This Week,${report.systemMetrics.executionsThisWeek}`);
  lines.push(`Executions This Month,${report.systemMetrics.executionsThisMonth}`);
  lines.push('');
  
  lines.push('Execution Metrics');
  lines.push('Metric,Value');
  lines.push(`Total,${report.executionMetrics.total}`);
  lines.push(`Succeeded,${report.executionMetrics.succeeded}`);
  lines.push(`Failed,${report.executionMetrics.failed}`);
  lines.push(`Running,${report.executionMetrics.running}`);
  lines.push(`Pending,${report.executionMetrics.pending}`);
  lines.push(`Average Duration (ms),${report.executionMetrics.averageDuration}`);
  lines.push(`Success Rate (%),${report.executionMetrics.successRate}`);
  lines.push('');
  
  lines.push('Performance Metrics');
  lines.push('Metric,Value');
  lines.push(`Average Execution Time (ms),${report.performanceMetrics.avgExecutionTime}`);
  lines.push(`P50 Execution Time (ms),${report.performanceMetrics.p50ExecutionTime}`);
  lines.push(`P95 Execution Time (ms),${report.performanceMetrics.p95ExecutionTime}`);
  lines.push(`P99 Execution Time (ms),${report.performanceMetrics.p99ExecutionTime}`);
  lines.push('');
  
  if (report.performanceMetrics.slowestWorkflows.length > 0) {
    lines.push('Slowest Workflows');
    lines.push('Workflow ID,Workflow Name,Average Duration (ms),Execution Count');
    report.performanceMetrics.slowestWorkflows.forEach((w: any) => {
      lines.push(`${w.workflowId},${w.workflowName},${w.avgDuration},${w.executionCount}`);
    });
  }
  
  return lines.join('\n');
}

export default router;