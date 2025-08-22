import express from 'express';
import { MonitoringController } from '../controllers/MonitoringController';
import { AuthMiddleware } from '../middleware/auth';

const router = express.Router();

// All monitoring routes require authentication
router.use(AuthMiddleware.authenticate);

// Dashboard and overview routes
router.get('/dashboard', MonitoringController.getDashboardMetrics);
router.get('/system', MonitoringController.getSystemMetrics);
router.get('/trends', MonitoringController.getPerformanceTrends);

// Active execution monitoring
router.get('/executions/active', MonitoringController.getAllActiveMetrics);
router.get('/executions/:executionId/metrics', MonitoringController.getExecutionMetrics);

// Workflow health monitoring
router.get('/workflows/:workflowId/health', MonitoringController.getWorkflowHealth);

// Execution logs
router.get('/executions/:executionId/logs', MonitoringController.getExecutionLogs);
router.get('/executions/:executionId/summary', MonitoringController.getExecutionSummary);

// Workflow logs
router.get('/workflows/:workflowId/logs', MonitoringController.getWorkflowLogs);

// Log search and analytics
router.get('/logs/search', MonitoringController.searchLogs);
router.get('/logs/statistics', MonitoringController.getLogStatistics);

// Admin-only routes
router.post('/logs/cleanup', 
  AuthMiddleware.requirePermission('admin:manage'),
  MonitoringController.cleanupOldLogs
);

export default router;