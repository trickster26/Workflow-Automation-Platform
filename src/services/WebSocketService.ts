import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { executionService } from './ExecutionService';
import config from '../config';
import { createLogger } from '../utils/logger';

const logger = createLogger('WebSocketService');

export interface IWebSocketClient {
  id: string;
  userId?: string;
  ws: WebSocket;
  subscriptions: Set<string>;
  lastPing: Date;
  isAlive: boolean;
}

export interface IWebSocketMessage {
  type: string;
  data?: any;
  timestamp?: number;
  correlationId?: string;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private wss: WebSocketServer;
  private clients: Map<string, IWebSocketClient> = new Map();
  private executionSubscriptions: Map<string, Set<string>> = new Map();
  private pingInterval: NodeJS.Timeout;

  private constructor(server: any) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this),
    });

    this.setupWebSocketServer();
    this.setupExecutionServiceListeners();
    this.startPingInterval();
  }

  public static initialize(server: any): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService(server);
    }
    return WebSocketService.instance;
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      throw new Error('WebSocketService not initialized. Call initialize() first.');
    }
    return WebSocketService.instance;
  }

  private verifyClient(info: { origin: string; secure: boolean; req: IncomingMessage }): boolean {
    const url = new URL(info.req.url || '', `http://${info.req.headers.host}`);
    const token = url.searchParams.get('token');

    // In development mode, allow connections without token for testing
    if (config.nodeEnv === 'development' && !token) {
      logger.info('WebSocket connection accepted without token (development mode)');
      return true;
    }

    if (!token) {
      logger.warn('WebSocket connection rejected: No token provided');
      return false;
    }

    try {
      jwt.verify(token, config.jwtSecret);
      return true;
    } catch (error) {
      logger.warn('WebSocket connection rejected: Invalid token');
      return false;
    }
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const clientId = uuidv4();
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      
      let userId: string | undefined;
      
      if (token) {
        try {
          const decoded = jwt.verify(token, config.jwtSecret) as any;
          userId = decoded.userId;
        } catch (error) {
          ws.close(1008, 'Invalid token');
          return;
        }
      } else if (config.nodeEnv === 'development') {
        // In development mode, assign a default user ID for testing
        userId = 'dev-user';
        logger.info('WebSocket client connected in development mode without authentication');
      }

      const client: IWebSocketClient = {
        id: clientId,
        userId,
        ws,
        subscriptions: new Set(),
        lastPing: new Date(),
        isAlive: true,
      };

      this.clients.set(clientId, client);

      logger.info('WebSocket client connected', {
        clientId,
        userId,
        ip: req.socket.remoteAddress,
      });

      this.sendMessage(client, {
        type: 'connected',
        data: {
          clientId,
          serverTime: new Date().toISOString(),
        },
      });

      ws.on('message', (data: Buffer) => {
        try {
          const message: IWebSocketMessage = JSON.parse(data.toString());
          this.handleMessage(client, message);
        } catch (error: any) {
          logger.error(`Error parsing WebSocket message from ${clientId}:`, error);
          this.sendError(client, 'Invalid message format');
        }
      });

      ws.on('pong', () => {
        client.isAlive = true;
        client.lastPing = new Date();
      });

      ws.on('close', (code: number, reason: Buffer) => {
        logger.info('WebSocket client disconnected', {
          clientId,
          userId,
          code,
          reason: reason.toString(),
        });
        this.removeClient(clientId);
      });

      ws.on('error', (error: Error) => {
        logger.error(`WebSocket error for client ${clientId}:`, error);
        this.removeClient(clientId);
      });
    });

    this.wss.on('error', (error: Error) => {
      logger.error('WebSocket server error:', error);
    });

    logger.info('WebSocket server initialized');
  }

  private handleMessage(client: IWebSocketClient, message: IWebSocketMessage): void {
    logger.debug(`Received message from ${client.id}:`, { type: message.type });

    switch (message.type) {
      case 'ping':
        this.handlePing(client, message);
        break;
      case 'subscribe_execution':
        this.handleSubscribeExecution(client, message);
        break;
      case 'unsubscribe_execution':
        this.handleUnsubscribeExecution(client, message);
        break;
      case 'subscribe_workflow_executions':
        this.handleSubscribeWorkflowExecutions(client, message);
        break;
      case 'unsubscribe_workflow_executions':
        this.handleUnsubscribeWorkflowExecutions(client, message);
        break;
      case 'get_execution_status':
        this.handleGetExecutionStatus(client, message);
        break;
      case 'get_active_executions':
        this.handleGetActiveExecutions(client, message);
        break;
      default:
        logger.warn(`Unknown message type: ${message.type}`, {
          clientId: client.id,
        });
        this.sendError(client, `Unknown message type: ${message.type}`);
    }
  }

  private handlePing(client: IWebSocketClient, message: IWebSocketMessage): void {
    this.sendMessage(client, {
      type: 'pong',
      timestamp: Date.now(),
      correlationId: message.correlationId,
    });
  }

  private handleSubscribeExecution(client: IWebSocketClient, message: IWebSocketMessage): void {
    const { executionId } = message.data || {};
    
    if (!executionId) {
      this.sendError(client, 'executionId is required');
      return;
    }

    client.subscriptions.add(`execution:${executionId}`);
    
    if (!this.executionSubscriptions.has(executionId)) {
      this.executionSubscriptions.set(executionId, new Set());
    }
    this.executionSubscriptions.get(executionId)!.add(client.id);

    this.sendMessage(client, {
      type: 'subscription_confirmed',
      data: { type: 'execution', executionId },
      correlationId: message.correlationId,
    });

    logger.debug(`Client ${client.id} subscribed to execution ${executionId}`);
  }

  private handleUnsubscribeExecution(client: IWebSocketClient, message: IWebSocketMessage): void {
    const { executionId } = message.data || {};
    
    if (!executionId) {
      this.sendError(client, 'executionId is required');
      return;
    }

    client.subscriptions.delete(`execution:${executionId}`);
    
    const subscribers = this.executionSubscriptions.get(executionId);
    if (subscribers) {
      subscribers.delete(client.id);
      if (subscribers.size === 0) {
        this.executionSubscriptions.delete(executionId);
      }
    }

    this.sendMessage(client, {
      type: 'unsubscription_confirmed',
      data: { type: 'execution', executionId },
      correlationId: message.correlationId,
    });

    logger.debug(`Client ${client.id} unsubscribed from execution ${executionId}`);
  }

  private handleSubscribeWorkflowExecutions(client: IWebSocketClient, message: IWebSocketMessage): void {
    const { workflowId } = message.data || {};
    
    if (!workflowId) {
      this.sendError(client, 'workflowId is required');
      return;
    }

    client.subscriptions.add(`workflow_executions:${workflowId}`);

    this.sendMessage(client, {
      type: 'subscription_confirmed',
      data: { type: 'workflow_executions', workflowId },
      correlationId: message.correlationId,
    });

    logger.debug(`Client ${client.id} subscribed to workflow executions ${workflowId}`);
  }

  private handleUnsubscribeWorkflowExecutions(client: IWebSocketClient, message: IWebSocketMessage): void {
    const { workflowId } = message.data || {};
    
    if (!workflowId) {
      this.sendError(client, 'workflowId is required');
      return;
    }

    client.subscriptions.delete(`workflow_executions:${workflowId}`);

    this.sendMessage(client, {
      type: 'unsubscription_confirmed',
      data: { type: 'workflow_executions', workflowId },
      correlationId: message.correlationId,
    });

    logger.debug(`Client ${client.id} unsubscribed from workflow executions ${workflowId}`);
  }

  private async handleGetExecutionStatus(client: IWebSocketClient, message: IWebSocketMessage): Promise<void> {
    const { executionId } = message.data || {};
    
    if (!executionId) {
      this.sendError(client, 'executionId is required');
      return;
    }

    try {
      const status = await executionService.getExecutionStatus(executionId);
      
      this.sendMessage(client, {
        type: 'execution_status',
        data: { executionId, status },
        correlationId: message.correlationId,
      });
    } catch (error: any) {
      this.sendError(client, `Error getting execution status: ${error.message}`);
    }
  }

  private async handleGetActiveExecutions(client: IWebSocketClient, message: IWebSocketMessage): Promise<void> {
    try {
      const activeExecutions = await executionService.getActiveExecutions();
      
      this.sendMessage(client, {
        type: 'active_executions',
        data: { executions: activeExecutions },
        correlationId: message.correlationId,
      });
    } catch (error: any) {
      this.sendError(client, `Error getting active executions: ${error.message}`);
    }
  }

  private setupExecutionServiceListeners(): void {
    executionService.on('executionStarted', (execution) => {
      this.broadcastExecutionEvent('execution_started', execution);
    });

    executionService.on('executionCompleted', (result) => {
      this.broadcastExecutionEvent('execution_completed', result.execution);
    });

    executionService.on('executionFailed', (result) => {
      this.broadcastExecutionEvent('execution_failed', result.execution);
    });

    executionService.on('executionPaused', (execution) => {
      this.broadcastExecutionEvent('execution_paused', execution);
    });

    executionService.on('executionResumed', (execution) => {
      this.broadcastExecutionEvent('execution_resumed', execution);
    });

    executionService.on('executionCancelled', (execution) => {
      this.broadcastExecutionEvent('execution_cancelled', execution);
    });

    executionService.on('nodeExecutionStarted', ({ executionId, node }) => {
      this.broadcastToExecutionSubscribers(executionId, {
        type: 'node_execution_started',
        data: { executionId, node },
      });
    });

    executionService.on('nodeExecutionCompleted', ({ executionId, node, outputData }) => {
      this.broadcastToExecutionSubscribers(executionId, {
        type: 'node_execution_completed',
        data: { executionId, node, outputData },
      });
    });

    executionService.on('nodeExecutionFailed', ({ executionId, node, error }) => {
      this.broadcastToExecutionSubscribers(executionId, {
        type: 'node_execution_failed',
        data: { executionId, node, error: error.message },
      });
    });

    executionService.on('nodeSkipped', ({ executionId, node }) => {
      this.broadcastToExecutionSubscribers(executionId, {
        type: 'node_skipped',
        data: { executionId, node },
      });
    });

    executionService.on('nodeRetryAttempt', ({ executionId, node, retryCount, error }) => {
      this.broadcastToExecutionSubscribers(executionId, {
        type: 'node_retry_attempt',
        data: { executionId, node, retryCount, error: error.message },
      });
    });

    logger.info('Execution service event listeners registered');
  }

  private broadcastExecutionEvent(eventType: string, execution: any): void {
    this.broadcastToExecutionSubscribers(execution.id, {
      type: eventType,
      data: execution,
    });

    this.broadcastToWorkflowSubscribers(execution.workflowId, {
      type: eventType,
      data: execution,
    });
  }

  private broadcastToExecutionSubscribers(executionId: string, message: IWebSocketMessage): void {
    const subscribers = this.executionSubscriptions.get(executionId);
    if (!subscribers) return;

    for (const clientId of subscribers) {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(client, message);
      }
    }
  }

  private broadcastToWorkflowSubscribers(workflowId: string, message: IWebSocketMessage): void {
    const subscription = `workflow_executions:${workflowId}`;
    
    for (const client of this.clients.values()) {
      if (client.subscriptions.has(subscription) && client.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(client, message);
      }
    }
  }

  private sendMessage(client: IWebSocketClient, message: IWebSocketMessage): void {
    if (client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const messageWithTimestamp = {
      ...message,
      timestamp: message.timestamp || Date.now(),
    };

    try {
      client.ws.send(JSON.stringify(messageWithTimestamp));
    } catch (error: any) {
      logger.error(`Error sending message to client ${client.id}:`, error);
      this.removeClient(client.id);
    }
  }

  private sendError(client: IWebSocketClient, error: string): void {
    this.sendMessage(client, {
      type: 'error',
      data: { message: error },
    });
  }

  private removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    for (const subscription of client.subscriptions) {
      if (subscription.startsWith('execution:')) {
        const executionId = subscription.replace('execution:', '');
        const subscribers = this.executionSubscriptions.get(executionId);
        if (subscribers) {
          subscribers.delete(clientId);
          if (subscribers.size === 0) {
            this.executionSubscriptions.delete(executionId);
          }
        }
      }
    }

    this.clients.delete(clientId);
    
    try {
      client.ws.terminate();
    } catch (error) {
      // Ignore errors when terminating
    }

    logger.info(`Removed WebSocket client ${clientId}`);
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      for (const [clientId, client] of this.clients) {
        if (!client.isAlive) {
          logger.info(`Terminating inactive client ${clientId}`);
          this.removeClient(clientId);
          continue;
        }

        client.isAlive = false;
        
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        } else {
          this.removeClient(clientId);
        }
      }
    }, 30000); // Ping every 30 seconds

    logger.info('WebSocket ping interval started');
  }

  public broadcastMessage(message: IWebSocketMessage, filter?: (client: IWebSocketClient) => boolean): void {
    for (const client of this.clients.values()) {
      if (!filter || filter(client)) {
        this.sendMessage(client, message);
      }
    }
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public getSubscriptionStats(): any {
    const stats = {
      totalClients: this.clients.size,
      executionSubscriptions: this.executionSubscriptions.size,
      totalSubscriptions: 0,
    };

    for (const client of this.clients.values()) {
      stats.totalSubscriptions += client.subscriptions.size;
    }

    return stats;
  }

  public shutdown(): Promise<void> {
    return new Promise((resolve) => {
      logger.info('Shutting down WebSocket service...');

      if (this.pingInterval) {
        clearInterval(this.pingInterval);
      }

      for (const client of this.clients.values()) {
        try {
          client.ws.close(1001, 'Server shutting down');
        } catch (error) {
          // Ignore errors during shutdown
        }
      }

      this.clients.clear();
      this.executionSubscriptions.clear();

      this.wss.close(() => {
        logger.info('WebSocket service shutdown complete');
        resolve();
      });
    });
  }
}

export const createWebSocketService = (server: any) => WebSocketService.initialize(server);
export const getWebSocketService = () => WebSocketService.getInstance();