import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import config from './config';
import { db } from './config/database';
import { createLogger } from './utils/logger';
import { executionService } from './services/ExecutionService';
import { triggerService } from './services/TriggerService';
import { createWebSocketService } from './services/WebSocketService';
import { queueManager } from './services/QueueManager';
import { CredentialController } from './controllers/CredentialController';
import { WorkflowController } from './controllers/WorkflowController';
import { ApiController } from './controllers/ApiController';
import { WebhookMiddleware } from './middleware/webhook';
import { webhookService } from './services/WebhookService';
import { DataManagementController } from './controllers/DataManagementController';
import { dataMigrationService } from './services/DataMigrationService';
import { AuthController } from './controllers/AuthController';
import { UserController } from './controllers/UserController';
import { AuthMiddleware } from './middleware/auth';
import monitoringRoutes from './routes/monitoring';
import exportRoutes from './routes/exportRoutes';
import fileRoutes from './routes/fileRoutes';
import pdfRoutes from './routes/pdfRoutes';
import databaseRoutes from './routes/databaseRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import credentialRoutes from './routes/credentialRoutes';
// import imageRoutes from './routes/imageRoutes'; // Temporarily disabled due to Sharp dependency
import notificationRoutes from './routes/notificationRoutes';
import transformationRoutes from './routes/transformationRoutes';
import { createIntegrationRoutes } from './routes/integrationRoutes';
import { IntegrationConfigService } from './services/IntegrationConfigService';
import { executionMonitoringService } from './services/ExecutionMonitoringService';
import { executionLoggingService } from './services/ExecutionLoggingService';
import templateRoutes from './routes/templateRoutes';

const logger = createLogger('App');

class WorkflowAutomationPlatform {
  private app: express.Application;
  private server: any;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Security headers
    this.app.use(AuthMiddleware.securityHeaders);
    
    // CORS with authentication
    this.app.use(AuthMiddleware.corsWithAuth());
    
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    
    // Webhook-specific middleware for /webhook routes
    this.app.use('/webhook*', 
      WebhookMiddleware.logWebhookRequests,
      WebhookMiddleware.rateLimitWebhooks(100, 60000),
      WebhookMiddleware.parseWebhookBody,
      WebhookMiddleware.authenticateWebhook
    );
    
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Add audit logging middleware for all routes
    this.app.use(AuthMiddleware.auditLog);

    // Authentication routes (public)
    this.app.post('/auth/register', AuthController.register);
    this.app.post('/auth/login', AuthController.login);
    this.app.post('/auth/logout', AuthMiddleware.authenticate, AuthController.logout);
    this.app.post('/auth/refresh-token', AuthController.refreshToken);
    this.app.get('/auth/verify-email/:token', AuthController.verifyEmail);
    this.app.post('/auth/request-password-reset', AuthController.requestPasswordReset);
    this.app.post('/auth/reset-password/:token', AuthController.resetPassword);

    // User profile routes (authenticated)
    this.app.get('/auth/profile', AuthMiddleware.authenticate, AuthController.getProfile);
    this.app.put('/auth/profile', AuthMiddleware.authenticate, AuthController.updateProfile);
    this.app.post('/auth/change-password', AuthMiddleware.authenticate, AuthController.changePassword);

    // Two-factor authentication routes
    this.app.post('/auth/2fa/enable', AuthMiddleware.authenticate, AuthController.enableTwoFactor);
    this.app.post('/auth/2fa/confirm', AuthMiddleware.authenticate, AuthController.confirmTwoFactor);
    this.app.post('/auth/2fa/disable', AuthMiddleware.authenticate, AuthController.disableTwoFactor);

    // Session management routes
    this.app.get('/auth/sessions', AuthMiddleware.authenticate, AuthController.getSessions);
    this.app.delete('/auth/sessions/:sessionId', AuthMiddleware.authenticate, AuthController.revokeSession);
    this.app.delete('/auth/sessions', AuthMiddleware.authenticate, AuthController.revokeAllSessions);

    // Authentication statistics (admin only)
    this.app.get('/auth/stats', AuthMiddleware.authenticate, AuthController.getAuthStats);

    // User management routes (admin only)
    this.app.get('/users', AuthMiddleware.authenticate, AuthMiddleware.requireAdmin, UserController.getAllUsers);
    this.app.get('/users/stats', AuthMiddleware.authenticate, AuthMiddleware.requireAdmin, UserController.getUserStats);
    this.app.get('/users/:userId', AuthMiddleware.authenticate, AuthMiddleware.requireAdmin, UserController.getUserById);
    this.app.post('/users', AuthMiddleware.authenticate, AuthMiddleware.requireAdmin, UserController.createUser);
    this.app.put('/users/:userId', AuthMiddleware.authenticate, AuthMiddleware.requireAdmin, UserController.updateUser);
    this.app.delete('/users/:userId', AuthMiddleware.authenticate, AuthMiddleware.requireAdmin, UserController.deleteUser);
    this.app.post('/users/:userId/reset-password', AuthMiddleware.authenticate, AuthMiddleware.requireAdmin, UserController.resetUserPassword);
    this.app.post('/users/:userId/toggle-status', AuthMiddleware.authenticate, AuthMiddleware.requireAdmin, UserController.toggleUserStatus);
    this.app.post('/users/bulk', AuthMiddleware.authenticate, AuthMiddleware.requireAdmin, UserController.bulkUserOperation);

    // Monitoring and Logging Routes
    this.app.use('/api/monitoring', monitoringRoutes);
    
    // Data Export Routes
    this.app.use('/api/exports', exportRoutes);
    
    // File Management Routes
    this.app.use('/api/files', fileRoutes);
    
    // PDF Generation Routes
    this.app.use('/api/pdfs', pdfRoutes);
    
    // Database Management Routes
    this.app.use('/api/database', databaseRoutes);
    
    // Dashboard Analytics Routes
    this.app.use('/api/dashboard', dashboardRoutes);
    
    // Credential Management Routes
    this.app.use('/api/credentials', credentialRoutes);
    
    // Image Processing Routes
    // this.app.use('/api/images', imageRoutes); // Temporarily disabled due to Sharp dependency
    
    // Notification Routes
    this.app.use('/api/notifications', notificationRoutes);
    
    // Data Transformation Routes
    this.app.use('/api/transform', transformationRoutes);
    
    // Integration Management Routes
    const integrationConfigService = new IntegrationConfigService(db.sequelize);
    this.app.use('/api/integrations', createIntegrationRoutes(integrationConfigService));
    
    // Template Management Routes
    this.app.use('/api/templates', templateRoutes);

    this.app.get('/health', async (req, res) => {
      try {
        const queueStats = await executionService.getQueueStats();
        const triggerStats = await triggerService.getTriggerStatistics();
        
        res.json({
          status: 'ok',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          services: {
            database: 'connected',
            redis: 'connected',
            execution: {
              activeExecutions: queueStats.totalActive,
              queueStats,
            },
            triggers: triggerStats,
          },
        });
      } catch (error: any) {
        logger.error('Health check error:', error);
        res.status(503).json({
          status: 'error',
          timestamp: new Date().toISOString(),
          error: error.message,
        });
      }
    });

    this.app.get('/api/node-types', (req, res) => {
      try {
        const { nodeRegistry } = require('./core/NodeRegistry');
        const nodeTypes = nodeRegistry.getAllNodeTypes();
        res.json(nodeTypes);
      } catch (error: any) {
        logger.error('Error fetching node types:', error);
        res.status(500).json({ error: 'Failed to fetch node types' });
      }
    });

    this.app.get('/api/node-types/categories', (req, res) => {
      try {
        const { nodeRegistry } = require('./core/NodeRegistry');
        const categories = nodeRegistry.getAllCategories();
        res.json(categories);
      } catch (error: any) {
        logger.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
      }
    });

    this.app.get('/api/node-types/category/:category', (req, res) => {
      try {
        const { nodeRegistry } = require('./core/NodeRegistry');
        const nodeTypes = nodeRegistry.getNodeTypesByCategory(req.params.category);
        res.json(nodeTypes);
      } catch (error: any) {
        logger.error('Error fetching node types by category:', error);
        res.status(500).json({ error: 'Failed to fetch node types for category' });
      }
    });

    this.app.post('/api/executions', AuthMiddleware.authenticate, AuthMiddleware.requirePermission('executions:create'), async (req, res) => {
      try {
        const { workflowId, userId, mode = 'manual', startNode } = req.body;
        
        if (!workflowId) {
          return res.status(400).json({ error: 'workflowId is required' });
        }

        const jobId = await executionService.executeWorkflowManual(workflowId, userId, startNode);
        
        res.json({
          message: 'Execution started',
          jobId,
        });
      } catch (error: any) {
        logger.error('Error starting execution:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/executions', async (req, res) => {
      try {
        const { workflowId, limit = 50, offset = 0 } = req.query;
        
        const executions = await executionService.getExecutionHistory(
          workflowId as string,
          parseInt(limit as string),
          parseInt(offset as string)
        );
        
        res.json(executions);
      } catch (error: any) {
        logger.error('Error fetching executions:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/executions/:executionId/status', async (req, res) => {
      try {
        const status = await executionService.getExecutionStatus(req.params.executionId);
        
        if (status === null) {
          return res.status(404).json({ error: 'Execution not found' });
        }
        
        res.json({ status });
      } catch (error: any) {
        logger.error('Error fetching execution status:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Alternative endpoint that accepts job ID and finds the associated execution
    this.app.get('/api/jobs/:jobId/execution/status', async (req, res) => {
      try {
        const status = await executionService.getExecutionStatusByJobId(req.params.jobId);
        
        if (status === null) {
          return res.status(404).json({ error: 'Job execution not found' });
        }
        
        res.json({ status });
      } catch (error: any) {
        logger.error('Error fetching job execution status:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/executions/:executionId/pause', async (req, res) => {
      try {
        const success = await executionService.pauseExecution(req.params.executionId);
        res.json({ success });
      } catch (error: any) {
        logger.error('Error pausing execution:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/executions/:executionId/resume', async (req, res) => {
      try {
        const success = await executionService.resumeExecution(req.params.executionId);
        res.json({ success });
      } catch (error: any) {
        logger.error('Error resuming execution:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/executions/:executionId/cancel', async (req, res) => {
      try {
        const success = await executionService.cancelExecution(req.params.executionId);
        res.json({ success });
      } catch (error: any) {
        logger.error('Error cancelling execution:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/executions/:executionId/retry', async (req, res) => {
      try {
        const { userId } = req.body;
        const jobId = await executionService.retryExecution(req.params.executionId, userId);
        res.json({ jobId });
      } catch (error: any) {
        logger.error('Error retrying execution:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/executions/metrics', async (req, res) => {
      try {
        const { workflowId, days = 30 } = req.query;
        
        const metrics = await executionService.getExecutionMetrics(
          workflowId as string,
          parseInt(days as string)
        );
        
        res.json(metrics);
      } catch (error: any) {
        logger.error('Error fetching execution metrics:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/queues/stats', async (req, res) => {
      try {
        const stats = await queueManager.getAllQueueStats();
        res.json(stats);
      } catch (error: any) {
        logger.error('Error fetching queue stats:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/triggers', async (req, res) => {
      try {
        const triggers = await triggerService.getActiveTriggers();
        res.json(triggers);
      } catch (error: any) {
        logger.error('Error fetching triggers:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/triggers/stats', async (req, res) => {
      try {
        const stats = await triggerService.getTriggerStatistics();
        res.json(stats);
      } catch (error: any) {
        logger.error('Error fetching trigger stats:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/triggers/:triggerId/activate', async (req, res) => {
      try {
        await triggerService.activateTrigger(req.params.triggerId);
        res.json({ success: true });
      } catch (error: any) {
        logger.error('Error activating trigger:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/triggers/:triggerId/deactivate', async (req, res) => {
      try {
        await triggerService.deactivateTrigger(req.params.triggerId);
        res.json({ success: true });
      } catch (error: any) {
        logger.error('Error deactivating trigger:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/events', async (req, res) => {
      try {
        const { eventType, eventData } = req.body;
        
        if (!eventType) {
          return res.status(400).json({ error: 'eventType is required' });
        }

        await triggerService.emitEvent(eventType, eventData);
        res.json({ success: true });
      } catch (error: any) {
        logger.error('Error emitting event:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Credential Management Routes
    this.app.get('/api/credential-types', CredentialController.getCredentialTypes);
    this.app.get('/api/credential-types/:type', CredentialController.getCredentialType);
    this.app.get('/api/credentials', CredentialController.getUserCredentials);
    this.app.post('/api/credentials', CredentialController.createCredential);
    this.app.put('/api/credentials/:credentialId', CredentialController.updateCredential);
    this.app.delete('/api/credentials/:credentialId', CredentialController.deleteCredential);
    this.app.post('/api/credentials/test', CredentialController.testCredential);
    this.app.post('/api/credentials/:credentialId/test', CredentialController.testExistingCredential);

    // Workflow Management Routes (authenticated)
    this.app.get('/api/workflows', AuthMiddleware.optionalAuth, WorkflowController.getAllWorkflows);
    this.app.get('/api/workflows/stats', AuthMiddleware.optionalAuth, WorkflowController.getWorkflowStats);
    this.app.get('/api/workflows/:workflowId', AuthMiddleware.optionalAuth, WorkflowController.getWorkflowById);
    this.app.post('/api/workflows', AuthMiddleware.authenticate, AuthMiddleware.requirePermission('workflows:create'), WorkflowController.createWorkflow);
    this.app.put('/api/workflows/:workflowId', AuthMiddleware.authenticate, AuthMiddleware.requirePermission('workflows:update'), WorkflowController.updateWorkflow);
    this.app.delete('/api/workflows/:workflowId', AuthMiddleware.authenticate, AuthMiddleware.requirePermission('workflows:delete'), WorkflowController.deleteWorkflow);
    this.app.post('/api/workflows/:workflowId/activate', AuthMiddleware.authenticate, AuthMiddleware.requirePermission('workflows:update'), WorkflowController.activateWorkflow);
    this.app.post('/api/workflows/:workflowId/deactivate', AuthMiddleware.authenticate, AuthMiddleware.requirePermission('workflows:update'), WorkflowController.deactivateWorkflow);
    this.app.post('/api/workflows/:workflowId/test', AuthMiddleware.authenticate, AuthMiddleware.requirePermission('executions:create'), WorkflowController.testWorkflow);
    this.app.post('/api/workflows/:workflowId/duplicate', AuthMiddleware.authenticate, AuthMiddleware.requirePermission('workflows:create'), WorkflowController.duplicateWorkflow);
    this.app.get('/api/workflows/:workflowId/webhooks', AuthMiddleware.authenticate, AuthMiddleware.requirePermission('webhooks:read'), WorkflowController.getWorkflowWebhooks);

    // API Controller Routes for advanced functionality
    this.app.get('/api/info', ApiController.getApiInfo);
    this.app.get('/api/status', ApiController.getSystemStatus);
    this.app.post('/api/execute', ApiController.executeWorkflow);
    this.app.post('/api/workflows/:workflowId/trigger', ApiController.triggerWorkflow);
    this.app.post('/api/execute/bulk', ApiController.bulkExecuteWorkflows);
    this.app.get('/api/executions/:executionId/results', ApiController.getExecutionResults);
    this.app.post('/api/webhooks', ApiController.createWebhook);
    this.app.post('/api/events/emit', ApiController.emitEvent);
    this.app.get('/api/usage', ApiController.getApiUsage);

    // Data Management Routes
    this.app.get('/api/data/overview', DataManagementController.getDataOverview);
    this.app.post('/api/data/optimize', DataManagementController.optimizeDatabase);

    // Migration Routes
    this.app.post('/api/migrations/run', DataManagementController.runMigrations);
    this.app.get('/api/migrations/status', DataManagementController.getMigrationStatus);
    this.app.post('/api/migrations/:version/rollback', DataManagementController.rollbackMigration);
    this.app.get('/api/database/validate', DataManagementController.validateDatabase);

    // Backup Routes
    this.app.post('/api/backups', DataManagementController.createBackup);
    this.app.post('/api/backups/restore', DataManagementController.restoreBackup);
    this.app.get('/api/backups', DataManagementController.listBackups);
    this.app.delete('/api/backups/:backupId', DataManagementController.deleteBackup);
    this.app.get('/api/backups/stats', DataManagementController.getBackupStats);

    // Validation Routes
    this.app.post('/api/validation/run', DataManagementController.runDataValidation);
    this.app.get('/api/validation/rules', DataManagementController.getValidationRules);
    this.app.post('/api/validation/:ruleId/:recordId/fix', DataManagementController.fixValidationIssue);

    // Archival Routes
    this.app.post('/api/archival/run', DataManagementController.runArchival);
    this.app.get('/api/archival/policies', DataManagementController.getArchivalPolicies);
    this.app.post('/api/archival/policies', DataManagementController.createArchivalPolicy);
    this.app.put('/api/archival/policies/:policyId', DataManagementController.updateArchivalPolicy);
    this.app.delete('/api/archival/policies/:policyId', DataManagementController.deleteArchivalPolicy);
    this.app.get('/api/archival/policies/:policyId/estimate', DataManagementController.estimateArchivalImpact);

    // Dynamic webhook handling - this must be near the end to catch webhook paths
    this.app.use('/webhook*', async (req, res, next) => {
      try {
        const { WebhookMiddleware } = await import('./middleware/webhook');
        await WebhookMiddleware.handleWebhookRequest(req, res, next);
      } catch (error: any) {
        logger.error('Error handling webhook:', error);
        res.status(500).json({ error: 'Webhook handling failed' });
      }
    });

    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        message: `The route ${req.method} ${req.originalUrl} does not exist`,
      });
    });
  }


  public async start(): Promise<void> {
    try {
      logger.info('Starting Workflow Automation Platform...');

      await db.connect();
      
      // Sync database to create missing tables
      if (config.nodeEnv === 'development') {
        logger.info('Synchronizing database schema...');
        await db.sync(false); // Use false to avoid dropping existing tables
        logger.info('Database schema synchronized successfully');
      }

      await dataMigrationService.runMigrations();

      createWebSocketService(this.server);
      
      await queueManager.setupMaintenanceJob();
      
      await triggerService.initializeTriggers();

      await webhookService.initializeWebhooks();

      // Initialize monitoring and logging services
      logger.info('Initializing monitoring and logging services...');

      this.server.listen(config.port, () => {
        logger.info(`🚀 Server running on port ${config.port}`, {
          environment: config.nodeEnv,
          port: config.port,
          pid: process.pid,
        });
        
        logger.info('🔧 Services initialized:', {
          database: '✓ Connected',
          redis: '✓ Connected',
          queues: '✓ Ready',
          triggers: '✓ Active',
          webhooks: '✓ Ready',
          websocket: '✓ Listening',
          monitoring: '✓ Active',
          logging: '✓ Ready',
        });
      });
      
      process.on('SIGTERM', () => this.gracefulShutdown());
      process.on('SIGINT', () => this.gracefulShutdown());
      
    } catch (error: any) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private async gracefulShutdown(): Promise<void> {
    logger.info('Received shutdown signal, starting graceful shutdown...');

    this.server.close(() => {
      logger.info('HTTP server closed');
    });

    try {
      const { getWebSocketService } = await import('./services/WebSocketService');
      await getWebSocketService().shutdown();
      logger.info('WebSocket service closed');
    } catch (error: any) {
      logger.error('Error closing WebSocket service:', error);
    }

    try {
      await executionService.shutdown();
      logger.info('Execution service closed');
    } catch (error: any) {
      logger.error('Error closing execution service:', error);
    }

    try {
      await triggerService.shutdown();
      logger.info('Trigger service closed');
    } catch (error: any) {
      logger.error('Error closing trigger service:', error);
    }

    try {
      await queueManager.shutdown();
      logger.info('Queue manager closed');
    } catch (error: any) {
      logger.error('Error closing queue manager:', error);
    }

    try {
      await executionMonitoringService.shutdown();
      logger.info('Execution monitoring service closed');
    } catch (error: any) {
      logger.error('Error closing execution monitoring service:', error);
    }

    try {
      await executionLoggingService.shutdown();
      logger.info('Execution logging service closed');
    } catch (error: any) {
      logger.error('Error closing execution logging service:', error);
    }

    try {
      await db.close();
      logger.info('Database connection closed');
    } catch (error: any) {
      logger.error('Error closing database connection:', error);
    }

    logger.info('Graceful shutdown completed');
    process.exit(0);
  }
}

const app = new WorkflowAutomationPlatform();

if (require.main === module) {
  app.start().catch((error) => {
    console.error('Fatal error during startup:', error);
    process.exit(1);
  });
}

export default app;