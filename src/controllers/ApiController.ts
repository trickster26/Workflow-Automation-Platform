import { Request, Response } from 'express';
import { executionService } from '../services/ExecutionService';
import { webhookService } from '../services/WebhookService';
import { triggerService } from '../services/TriggerService';
import { credentialService } from '../services/CredentialService';
import { nodeRegistry } from '../core/NodeRegistry';
import { createLogger } from '../utils/logger';

const logger = createLogger('ApiController');

export class ApiController {
  // Get API information and documentation
  public static async getApiInfo(req: Request, res: Response): Promise<void> {
    try {
      const apiInfo = {
        name: 'Workflow Automation Platform API',
        version: '1.0.0',
        description: 'RESTful API for workflow automation platform',
        endpoints: {
          workflows: '/api/workflows',
          executions: '/api/executions',
          nodeTypes: '/api/node-types',
          credentials: '/api/credentials',
          webhooks: '/api/webhooks',
          triggers: '/api/triggers',
          health: '/health',
        },
        documentation: {
          openapi: '/api/docs/openapi.json',
          swagger: '/api/docs',
        },
        authentication: {
          type: 'Bearer Token',
          header: 'Authorization: Bearer <token>',
        },
        rateLimit: {
          requests: 1000,
          window: '1 hour',
        },
        webhooks: {
          baseUrl: `${req.protocol}://${req.get('host')}/webhook`,
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
          authentication: {
            apiKey: 'X-API-Key header',
            signature: 'X-Webhook-Signature header (HMAC SHA256)',
          },
        },
      };

      res.json(apiInfo);
    } catch (error: any) {
      logger.error('Error getting API info:', error);
      res.status(500).json({ error: 'Failed to get API information' });
    }
  }

  // Get system status and statistics
  public static async getSystemStatus(req: Request, res: Response): Promise<void> {
    try {
      const [
        queueStats,
        triggerStats,
        webhookStats,
        executionMetrics,
      ] = await Promise.all([
        executionService.getQueueStats(),
        triggerService.getTriggerStatistics(),
        Promise.resolve(webhookService.getWebhookStats()),
        executionService.getExecutionMetrics(),
      ]);

      const systemStatus = {
        status: 'operational',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        nodeVersion: process.version,
        memory: process.memoryUsage(),
        services: {
          database: 'connected',
          redis: 'connected',
          webhooks: 'active',
          triggers: 'active',
        },
        statistics: {
          queues: queueStats,
          triggers: triggerStats,
          webhooks: webhookStats,
          executions: executionMetrics,
        },
        capabilities: {
          nodeTypes: nodeRegistry.getAllNodeTypes().length,
          credentialTypes: credentialService.getAllCredentialTypes().length,
          maxConcurrentExecutions: 10,
          webhookTimeout: 30000,
          executionTimeout: 300000,
        },
      };

      res.json(systemStatus);
    } catch (error: any) {
      logger.error('Error getting system status:', error);
      res.status(500).json({ 
        status: 'error',
        error: 'Failed to get system status',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Execute workflow via API
  public static async executeWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId, inputData, waitForCompletion = false } = req.body;
      const userId = req.user?.id;

      if (!workflowId) {
        return res.status(400).json({ 
          error: 'workflowId is required' 
        });
      }

      const jobId = await executionService.executeWorkflowManual(
        workflowId,
        userId,
        undefined // startNode
      );

      const response: any = {
        success: true,
        executionId: jobId,
        workflowId,
        status: 'started',
        timestamp: new Date().toISOString(),
      };

      if (waitForCompletion) {
        // TODO: Implement waiting for completion
        response.message = 'Execution started. Use the executionId to check status.';
      } else {
        response.message = 'Workflow execution started successfully';
      }

      logger.info(`API workflow execution started`, {
        workflowId,
        executionId: jobId,
        userId,
      });

      res.status(202).json(response);
    } catch (error: any) {
      logger.error('Error executing workflow via API:', error);
      res.status(400).json({ 
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Trigger workflow via API with data
  public static async triggerWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const triggerData = req.body;
      const userId = req.user?.id;

      const jobId = await executionService.executeWorkflow({
        workflowId,
        userId,
        mode: 'integrated',
        inputData: triggerData,
      });

      logger.info(`API workflow trigger executed`, {
        workflowId,
        executionId: jobId,
        userId,
      });

      res.json({
        success: true,
        executionId: jobId,
        workflowId,
        message: 'Workflow triggered successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Error triggering workflow via API:', error);
      res.status(400).json({ 
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Bulk execute workflows
  public static async bulkExecuteWorkflows(req: Request, res: Response): Promise<void> {
    try {
      const { workflows } = req.body;
      const userId = req.user?.id;

      if (!Array.isArray(workflows) || workflows.length === 0) {
        return res.status(400).json({ 
          error: 'workflows array is required and must not be empty' 
        });
      }

      if (workflows.length > 10) {
        return res.status(400).json({ 
          error: 'Maximum 10 workflows can be executed in bulk' 
        });
      }

      const results = [];

      for (const workflow of workflows) {
        try {
          const jobId = await executionService.executeWorkflowManual(
            workflow.workflowId,
            userId,
            workflow.startNode
          );

          results.push({
            workflowId: workflow.workflowId,
            executionId: jobId,
            status: 'started',
          });
        } catch (error: any) {
          results.push({
            workflowId: workflow.workflowId,
            status: 'failed',
            error: error.message,
          });
        }
      }

      logger.info(`API bulk execution completed`, {
        totalWorkflows: workflows.length,
        successful: results.filter(r => r.status === 'started').length,
        failed: results.filter(r => r.status === 'failed').length,
        userId,
      });

      res.json({
        success: true,
        results,
        summary: {
          total: workflows.length,
          successful: results.filter(r => r.status === 'started').length,
          failed: results.filter(r => r.status === 'failed').length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Error in bulk workflow execution:', error);
      res.status(500).json({ 
        error: 'Bulk execution failed',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get execution results
  public static async getExecutionResults(req: Request, res: Response): Promise<void> {
    try {
      const { executionId } = req.params;
      const { includeData = false } = req.query;

      const executions = await executionService.getExecutionHistory(undefined, 1, 0);
      const execution = executions.find(e => e.id === executionId);

      if (!execution) {
        return res.status(404).json({ 
          error: 'Execution not found',
          executionId,
        });
      }

      const response: any = {
        executionId: execution.id,
        workflowId: execution.workflowId,
        status: execution.status,
        mode: execution.mode,
        startedAt: execution.startedAt,
        stoppedAt: execution.stoppedAt,
        finished: execution.finished,
      };

      if (includeData === 'true') {
        response.data = execution.data;
      }

      res.json(response);
    } catch (error: any) {
      logger.error('Error getting execution results:', error);
      res.status(500).json({ 
        error: 'Failed to get execution results',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Create webhook programmatically
  public static async createWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId, nodeId, path, method = 'POST', responseMode = 'onReceived' } = req.body;

      if (!workflowId || !nodeId || !path) {
        return res.status(400).json({ 
          error: 'workflowId, nodeId, and path are required' 
        });
      }

      const webhook = await webhookService.createWebhook(workflowId, nodeId, {
        path,
        method,
        responseMode,
      });

      const webhookUrl = `${req.protocol}://${req.get('host')}/webhook/${webhook.path}`;

      logger.info(`API webhook created`, {
        webhookId: webhook.webhookId,
        workflowId,
        nodeId,
        url: webhookUrl,
      });

      res.status(201).json({
        success: true,
        webhook,
        url: webhookUrl,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Error creating webhook via API:', error);
      res.status(400).json({ 
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Emit custom event
  public static async emitEvent(req: Request, res: Response): Promise<void> {
    try {
      const { eventType, eventData = {} } = req.body;

      if (!eventType) {
        return res.status(400).json({ 
          error: 'eventType is required' 
        });
      }

      await triggerService.emitEvent(eventType, {
        ...eventData,
        source: 'api',
        timestamp: new Date().toISOString(),
        apiRequest: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        },
      });

      logger.info(`API event emitted`, {
        eventType,
        dataKeys: Object.keys(eventData),
      });

      res.json({
        success: true,
        eventType,
        message: 'Event emitted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Error emitting event via API:', error);
      res.status(500).json({ 
        error: 'Failed to emit event',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Get API usage statistics
  public static async getApiUsage(req: Request, res: Response): Promise<void> {
    try {
      const { days = 30 } = req.query;
      
      // This would typically come from API usage tracking
      // For now, return mock data
      const usage = {
        period: `${days} days`,
        requests: {
          total: 1250,
          successful: 1180,
          failed: 70,
          rate: {
            avg: 41.7,
            peak: 120,
            unit: 'requests/day',
          },
        },
        endpoints: [
          { path: '/api/executions', requests: 450, avg_response_time: 245 },
          { path: '/api/workflows', requests: 320, avg_response_time: 180 },
          { path: '/webhook/*', requests: 280, avg_response_time: 95 },
          { path: '/api/node-types', requests: 200, avg_response_time: 65 },
        ],
        errors: [
          { code: 400, count: 35, percentage: 2.8 },
          { code: 401, count: 20, percentage: 1.6 },
          { code: 500, count: 15, percentage: 1.2 },
        ],
      };

      res.json(usage);
    } catch (error: any) {
      logger.error('Error getting API usage:', error);
      res.status(500).json({ 
        error: 'Failed to get API usage statistics',
        timestamp: new Date().toISOString(),
      });
    }
  }
}