import { Request, Response } from 'express';
import { executionMonitoringService } from '../services/ExecutionMonitoringService';
import { executionLoggingService } from '../services/ExecutionLoggingService';
import { AuthenticatedRequest } from '../middleware/auth';
import { createLogger } from '../utils/logger';

const logger = createLogger('MonitoringController');

export class MonitoringController {
  public static async getExecutionMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { executionId } = req.params;
      
      if (!executionId) {
        res.status(400).json({
          success: false,
          message: 'Execution ID is required',
        });
        return;
      }

      const metrics = executionMonitoringService.getExecutionMetrics(executionId);
      
      if (!metrics) {
        res.status(404).json({
          success: false,
          message: 'Execution metrics not found',
        });
        return;
      }

      res.json({
        success: true,
        metrics,
      });
    } catch (error: any) {
      logger.error('Error getting execution metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get execution metrics',
        error: error.message,
      });
    }
  }

  public static async getAllActiveMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const metrics = executionMonitoringService.getAllActiveMetrics();
      
      // Filter by user permissions
      const filteredMetrics = metrics.filter(metric => {
        if (req.user?.role === 'admin') return true;
        return metric.userId === req.user?.id;
      });

      res.json({
        success: true,
        metrics: filteredMetrics,
        total: filteredMetrics.length,
      });
    } catch (error: any) {
      logger.error('Error getting active metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get active metrics',
        error: error.message,
      });
    }
  }

  public static async getWorkflowHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const { days = 7 } = req.query;
      
      if (!workflowId) {
        res.status(400).json({
          success: false,
          message: 'Workflow ID is required',
        });
        return;
      }

      const health = await executionMonitoringService.getWorkflowHealth(
        workflowId,
        parseInt(days as string)
      );

      res.json({
        success: true,
        health,
      });
    } catch (error: any) {
      logger.error('Error getting workflow health:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get workflow health',
        error: error.message,
      });
    }
  }

  public static async getSystemMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const metrics = await executionMonitoringService.getSystemMetrics();

      res.json({
        success: true,
        metrics,
      });
    } catch (error: any) {
      logger.error('Error getting system metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get system metrics',
        error: error.message,
      });
    }
  }

  public static async getPerformanceTrends(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { days = 30 } = req.query;
      
      const trends = await executionMonitoringService.getPerformanceTrends(
        parseInt(days as string)
      );

      res.json({
        success: true,
        trends,
      });
    } catch (error: any) {
      logger.error('Error getting performance trends:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get performance trends',
        error: error.message,
      });
    }
  }

  public static async getExecutionLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { executionId } = req.params;
      const { level, nodeId, limit = 100, offset = 0 } = req.query;
      
      if (!executionId) {
        res.status(400).json({
          success: false,
          message: 'Execution ID is required',
        });
        return;
      }

      const logs = await executionLoggingService.getExecutionLogs(executionId, {
        level: level as string,
        nodeId: nodeId as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      res.json({
        success: true,
        logs: logs.map(log => ({
          id: log.id,
          level: log.level,
          message: log.message,
          details: log.details,
          nodeId: log.nodeId,
          nodeName: log.nodeName,
          nodeType: log.nodeType,
          stepIndex: log.stepIndex,
          timestamp: log.timestamp,
          duration: log.duration,
          memoryUsage: log.memoryUsage,
          cpuUsage: log.cpuUsage,
          metadata: log.metadata,
        })),
        total: logs.length,
      });
    } catch (error: any) {
      logger.error('Error getting execution logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get execution logs',
        error: error.message,
      });
    }
  }

  public static async getWorkflowLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const { level, startDate, endDate, limit = 100, offset = 0 } = req.query;
      
      if (!workflowId) {
        res.status(400).json({
          success: false,
          message: 'Workflow ID is required',
        });
        return;
      }

      const logs = await executionLoggingService.getWorkflowLogs(workflowId, {
        level: level as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      res.json({
        success: true,
        logs: logs.map(log => ({
          id: log.id,
          executionId: log.executionId,
          level: log.level,
          message: log.message,
          details: log.details,
          nodeId: log.nodeId,
          nodeName: log.nodeName,
          nodeType: log.nodeType,
          stepIndex: log.stepIndex,
          timestamp: log.timestamp,
          duration: log.duration,
          memoryUsage: log.memoryUsage,
          cpuUsage: log.cpuUsage,
          metadata: log.metadata,
        })),
        total: logs.length,
      });
    } catch (error: any) {
      logger.error('Error getting workflow logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get workflow logs',
        error: error.message,
      });
    }
  }

  public static async getExecutionSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { executionId } = req.params;
      
      if (!executionId) {
        res.status(400).json({
          success: false,
          message: 'Execution ID is required',
        });
        return;
      }

      const summary = await executionLoggingService.getExecutionSummary(executionId);

      res.json({
        success: true,
        summary,
      });
    } catch (error: any) {
      logger.error('Error getting execution summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get execution summary',
        error: error.message,
      });
    }
  }

  public static async searchLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        workflowId,
        executionId,
        level,
        message,
        nodeId,
        startDate,
        endDate,
        limit = 100,
        offset = 0,
      } = req.query;

      const { logs, total } = await executionLoggingService.searchLogs({
        workflowId: workflowId as string,
        executionId: executionId as string,
        level: level as string,
        message: message as string,
        nodeId: nodeId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      res.json({
        success: true,
        logs: logs.map(log => ({
          id: log.id,
          executionId: log.executionId,
          workflowId: log.workflowId,
          level: log.level,
          message: log.message,
          details: log.details,
          nodeId: log.nodeId,
          nodeName: log.nodeName,
          nodeType: log.nodeType,
          stepIndex: log.stepIndex,
          timestamp: log.timestamp,
          duration: log.duration,
          memoryUsage: log.memoryUsage,
          cpuUsage: log.cpuUsage,
          metadata: log.metadata,
        })),
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });
    } catch (error: any) {
      logger.error('Error searching logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search logs',
        error: error.message,
      });
    }
  }

  public static async getLogStatistics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { workflowId, startDate, endDate } = req.query;

      const statistics = await executionLoggingService.getLogStatistics({
        workflowId: workflowId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.json({
        success: true,
        statistics,
      });
    } catch (error: any) {
      logger.error('Error getting log statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get log statistics',
        error: error.message,
      });
    }
  }

  public static async getDashboardMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const [systemMetrics, performanceTrends] = await Promise.all([
        executionMonitoringService.getSystemMetrics(),
        executionMonitoringService.getPerformanceTrends(7), // Last 7 days
      ]);

      const activeMetrics = executionMonitoringService.getAllActiveMetrics();
      
      // Filter by user permissions
      const userActiveMetrics = activeMetrics.filter(metric => {
        if (req.user?.role === 'admin') return true;
        return metric.userId === req.user?.id;
      });

      res.json({
        success: true,
        dashboard: {
          system: systemMetrics,
          trends: performanceTrends,
          active: {
            executions: userActiveMetrics,
            count: userActiveMetrics.length,
          },
          summary: {
            totalActiveExecutions: userActiveMetrics.length,
            runningExecutions: userActiveMetrics.filter(m => m.status === 'running').length,
            completedToday: systemMetrics.totalExecutionsToday,
            successRateToday: systemMetrics.successRateToday,
            avgExecutionTime: systemMetrics.avgExecutionTime,
          },
        },
      });
    } catch (error: any) {
      logger.error('Error getting dashboard metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get dashboard metrics',
        error: error.message,
      });
    }
  }

  public static async cleanupOldLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Only admin can cleanup logs
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Only administrators can cleanup logs',
        });
        return;
      }

      const { retentionDays = 30 } = req.body;
      
      const deletedCount = await executionLoggingService.cleanupOldLogs(
        parseInt(retentionDays as string)
      );

      res.json({
        success: true,
        message: `Cleaned up ${deletedCount} old log entries`,
        deletedCount,
        retentionDays: parseInt(retentionDays as string),
      });
    } catch (error: any) {
      logger.error('Error cleaning up logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup logs',
        error: error.message,
      });
    }
  }
}