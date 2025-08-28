import { EventEmitter } from 'events';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Webhook as WebhookModel, Workflow as WorkflowModel } from '../models';
import { executionService } from './ExecutionService';
import { IWebhookData, IWorkflow, INode, NodeType } from '../types/workflow.types';
import { createLogger } from '../utils/logger';
import crypto from 'crypto';

const logger = createLogger('WebhookService');

export interface IWebhookRequest {
  id: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, any>;
  body: any;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
}

export interface IWebhookResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body?: any;
}

export class WebhookService extends EventEmitter {
  private static instance: WebhookService;
  private webhookRoutes: Map<string, IWebhookData> = new Map();
  private pendingRequests: Map<string, IWebhookRequest> = new Map();

  private constructor() {
    super();
  }

  public static getInstance(): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  public async initializeWebhooks(): Promise<void> {
    try {
      const webhooks = await WebhookModel.findAll({
        where: { isActive: true }
      });

      for (const webhook of webhooks) {
        this.registerWebhook(webhook.toJSON() as any);
      }

      logger.info(`Initialized ${webhooks.length} webhooks`);
    } catch (error: any) {
      // If the table doesn't exist yet, just log a warning and continue
      if (error.name === 'SequelizeDatabaseError' && error.parent?.code === 'ER_NO_SUCH_TABLE') {
        logger.warn('Webhooks table does not exist yet. Skipping webhook initialization.');
        return;
      }
      logger.error('Error initializing webhooks:', error);
    }
  }

  public async createWebhook(
    workflowId: string,
    nodeId: string,
    options: {
      path: string;
      method?: string;
      responseMode?: 'onReceived' | 'lastNode' | 'responseNode';
      responseCode?: number;
      responseHeaders?: Record<string, string>;
      isTest?: boolean;
    }
  ): Promise<IWebhookData> {
    const webhookId = this.generateWebhookId();
    
    const webhookData: Partial<IWebhookData> = {
      workflowId,
      nodeId,
      webhookId,
      method: options.method || 'POST',
      path: options.path,
      responseMode: options.responseMode || 'onReceived',
      responseCode: options.responseCode || 200,
      responseHeaders: options.responseHeaders || {},
      isTest: options.isTest || false,
    };

    const webhook = await WebhookModel.create(webhookData as any);
    const createdWebhook = webhook.toJSON() as IWebhookData;

    this.registerWebhook(createdWebhook);

    logger.info(`Created webhook: ${webhookId}`, {
      workflowId,
      nodeId,
      path: options.path,
      method: options.method,
    });

    return createdWebhook;
  }

  public async updateWebhook(
    webhookId: string,
    updates: Partial<IWebhookData>
  ): Promise<IWebhookData | null> {
    const webhook = await WebhookModel.findOne({
      where: { webhookId },
    });

    if (!webhook) {
      return null;
    }

    await webhook.update(updates);
    const updatedWebhook = webhook.toJSON() as IWebhookData;

    this.registerWebhook(updatedWebhook);

    logger.info(`Updated webhook: ${webhookId}`, updates);

    return updatedWebhook;
  }

  public async deleteWebhook(webhookId: string): Promise<boolean> {
    const deleted = await WebhookModel.destroy({
      where: { webhookId },
    });

    if (deleted > 0) {
      this.unregisterWebhook(webhookId);
      logger.info(`Deleted webhook: ${webhookId}`);
      return true;
    }

    return false;
  }

  public async getWorkflowWebhooks(workflowId: string): Promise<IWebhookData[]> {
    const webhooks = await WebhookModel.findAll({
      where: { workflowId },
    });

    return webhooks.map(w => w.toJSON() as IWebhookData);
  }

  public async handleWebhookRequest(
    path: string,
    method: string,
    req: Request,
    res: Response
  ): Promise<void> {
    const normalizedPath = this.normalizePath(path);
    const routeKey = `${method.toLowerCase()}:${normalizedPath}`;
    
    const webhook = this.webhookRoutes.get(routeKey);
    
    if (!webhook) {
      logger.warn(`Webhook not found for ${method} ${path}`);
      res.status(404).json({
        error: 'Webhook not found',
        path,
        method,
      });
      return;
    }

    const webhookRequest: IWebhookRequest = {
      id: uuidv4(),
      method,
      path,
      headers: req.headers as Record<string, string>,
      query: req.query as Record<string, any>,
      body: req.body,
      timestamp: new Date(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    };

    logger.info(`Processing webhook request: ${webhook.webhookId}`, {
      workflowId: webhook.workflowId,
      nodeId: webhook.nodeId,
      method,
      path,
      ip: req.ip,
    });

    try {
      // Store the request for potential use in workflow execution
      this.pendingRequests.set(webhookRequest.id, webhookRequest);

      // Handle response mode
      switch (webhook.responseMode) {
        case 'onReceived':
          await this.sendImmediateResponse(webhook, webhookRequest, res);
          this.executeWebhookWorkflow(webhook, webhookRequest);
          break;

        case 'lastNode':
          await this.executeWebhookWorkflowAndWaitForResponse(webhook, webhookRequest, res);
          break;

        case 'responseNode':
          await this.executeWebhookWorkflowWithResponseNode(webhook, webhookRequest, res);
          break;

        default:
          await this.sendImmediateResponse(webhook, webhookRequest, res);
          this.executeWebhookWorkflow(webhook, webhookRequest);
      }

      this.emit('webhookTriggered', {
        webhook,
        request: webhookRequest,
      });

    } catch (error: any) {
      logger.error(`Webhook execution error: ${webhook.webhookId}`, {
        error: error.message,
        stack: error.stack,
      });

      if (!res.headersSent) {
        res.status(500).json({
          error: 'Webhook execution failed',
          message: error.message,
        });
      }
    } finally {
      // Clean up pending request after some time
      setTimeout(() => {
        this.pendingRequests.delete(webhookRequest.id);
      }, 30000); // 30 seconds
    }
  }

  private registerWebhook(webhook: IWebhookData): void {
    const normalizedPath = this.normalizePath(webhook.path);
    const routeKey = `${webhook.method.toLowerCase()}:${normalizedPath}`;
    
    this.webhookRoutes.set(routeKey, webhook);
    
    logger.debug(`Registered webhook route: ${routeKey}`, {
      webhookId: webhook.webhookId,
      workflowId: webhook.workflowId,
    });
  }

  private unregisterWebhook(webhookId: string): void {
    for (const [routeKey, webhook] of this.webhookRoutes) {
      if (webhook.webhookId === webhookId) {
        this.webhookRoutes.delete(routeKey);
        logger.debug(`Unregistered webhook route: ${routeKey}`, {
          webhookId,
        });
        break;
      }
    }
  }

  private async sendImmediateResponse(
    webhook: IWebhookData,
    request: IWebhookRequest,
    res: Response
  ): Promise<void> {
    const statusCode = webhook.responseCode || 200;
    const headers = webhook.responseHeaders || {};
    
    // Set custom headers
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    let responseBody = webhook.responseData;
    
    // If no custom response data, return basic success response
    if (!responseBody) {
      responseBody = {
        message: 'Webhook received successfully',
        webhookId: webhook.webhookId,
        timestamp: request.timestamp.toISOString(),
      };
    } else if (typeof responseBody === 'string') {
      try {
        responseBody = JSON.parse(responseBody);
      } catch {
        // Keep as string if not valid JSON
      }
    }

    res.status(statusCode).json(responseBody);
  }

  private async executeWebhookWorkflow(
    webhook: IWebhookData,
    request: IWebhookRequest
  ): Promise<void> {
    try {
      await executionService.executeWorkflowWebhook(
        webhook.workflowId,
        this.createWebhookData(request),
        webhook.nodeId
      );
    } catch (error: any) {
      logger.error(`Error executing webhook workflow: ${webhook.workflowId}`, {
        error: error.message,
        webhookId: webhook.webhookId,
      });
    }
  }

  private async executeWebhookWorkflowAndWaitForResponse(
    webhook: IWebhookData,
    request: IWebhookRequest,
    res: Response
  ): Promise<void> {
    // This would require more complex implementation to wait for workflow completion
    // For now, fall back to immediate response
    await this.sendImmediateResponse(webhook, request, res);
    this.executeWebhookWorkflow(webhook, request);
  }

  private async executeWebhookWorkflowWithResponseNode(
    webhook: IWebhookData,
    request: IWebhookRequest,
    res: Response
  ): Promise<void> {
    // This would require identifying and waiting for a specific response node
    // For now, fall back to immediate response
    await this.sendImmediateResponse(webhook, request, res);
    this.executeWebhookWorkflow(webhook, request);
  }

  private createWebhookData(request: IWebhookRequest): any {
    return {
      headers: request.headers,
      query: request.query,
      body: request.body,
      method: request.method,
      path: request.path,
      timestamp: request.timestamp,
      webhookId: request.id,
      clientIP: request.ip,
      userAgent: request.userAgent,
    };
  }

  private normalizePath(path: string): string {
    // Remove leading slash and normalize
    return path.replace(/^\/+/, '').toLowerCase();
  }

  private generateWebhookId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  public async createWebhookForNode(workflowId: string, node: INode): Promise<IWebhookData | null> {
    if (node.type !== NodeType.WEBHOOK) {
      return null;
    }

    const path = node.parameters.path || `/webhook/${uuidv4()}`;
    const method = node.parameters.method || 'POST';
    const responseMode = node.parameters.responseMode || 'onReceived';

    return this.createWebhook(workflowId, node.id, {
      path,
      method,
      responseMode,
    });
  }

  public async removeWebhooksForWorkflow(workflowId: string): Promise<void> {
    const webhooks = await this.getWorkflowWebhooks(workflowId);
    
    for (const webhook of webhooks) {
      await this.deleteWebhook(webhook.webhookId);
    }
  }

  public async removeWebhooksForNode(workflowId: string, nodeId: string): Promise<void> {
    const webhooks = await WebhookModel.findAll({
      where: { workflowId, nodeId },
    });

    for (const webhook of webhooks) {
      await this.deleteWebhook(webhook.webhookId);
    }
  }

  public getWebhookStats(): any {
    return {
      totalWebhooks: this.webhookRoutes.size,
      pendingRequests: this.pendingRequests.size,
      registeredRoutes: Array.from(this.webhookRoutes.keys()),
    };
  }

  public async refreshWebhooks(): Promise<void> {
    logger.info('Refreshing webhook routes...');
    
    // Clear current routes
    this.webhookRoutes.clear();
    
    // Reload from database
    await this.initializeWebhooks();
  }
}

export const webhookService = WebhookService.getInstance();