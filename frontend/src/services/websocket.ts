export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: number;
  correlationId?: string;
}

// Simple browser-compatible event emitter
class EventEmitter {
  private events: Map<string, Set<Function>> = new Map();

  on(event: string, listener: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(listener);
  }

  once(event: string, listener: Function): void {
    const onceWrapper = (...args: any[]) => {
      listener(...args);
      this.off(event, onceWrapper);
    };
    this.on(event, onceWrapper);
  }

  off(event: string, listener: Function): void {
    this.events.get(event)?.delete(listener);
  }

  emit(event: string, ...args: any[]): void {
    this.events.get(event)?.forEach(listener => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}

class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private subscriptions = new Set<string>();
  private pingInterval: number | null = null;

  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        this.once('connected', resolve);
        this.once('error', reject);
        return;
      }

      this.isConnecting = true;
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//localhost:3000/ws${token ? `?token=${token}` : ''}`;

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startPing();
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.stopPing();
          this.emit('disconnected', event.code, event.reason);

          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          this.emit('error', error);
          reject(error);
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.stopPing();
    this.subscriptions.clear();
  }

  send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
    }
  }

  subscribeToExecution(executionId: string): void {
    const subscription = `execution:${executionId}`;
    if (this.subscriptions.has(subscription)) {
      return;
    }

    this.subscriptions.add(subscription);
    this.send({
      type: 'subscribe_execution',
      data: { executionId },
    });
  }

  unsubscribeFromExecution(executionId: string): void {
    const subscription = `execution:${executionId}`;
    if (!this.subscriptions.has(subscription)) {
      return;
    }

    this.subscriptions.delete(subscription);
    this.send({
      type: 'unsubscribe_execution',
      data: { executionId },
    });
  }

  subscribeToWorkflowExecutions(workflowId: string): void {
    const subscription = `workflow_executions:${workflowId}`;
    if (this.subscriptions.has(subscription)) {
      return;
    }

    this.subscriptions.add(subscription);
    this.send({
      type: 'subscribe_workflow_executions',
      data: { workflowId },
    });
  }

  unsubscribeFromWorkflowExecutions(workflowId: string): void {
    const subscription = `workflow_executions:${workflowId}`;
    if (!this.subscriptions.has(subscription)) {
      return;
    }

    this.subscriptions.delete(subscription);
    this.send({
      type: 'unsubscribe_workflow_executions',
      data: { workflowId },
    });
  }

  getExecutionStatus(executionId: string): void {
    this.send({
      type: 'get_execution_status',
      data: { executionId },
    });
  }

  getActiveExecutions(): void {
    this.send({
      type: 'get_active_executions',
    });
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'connected':
        this.emit('server_connected', message.data);
        break;
      case 'pong':
        // Handle ping response
        break;
      case 'execution_started':
        this.emit('execution_started', message.data);
        break;
      case 'execution_completed':
        this.emit('execution_completed', message.data);
        break;
      case 'execution_failed':
        this.emit('execution_failed', message.data);
        break;
      case 'execution_paused':
        this.emit('execution_paused', message.data);
        break;
      case 'execution_resumed':
        this.emit('execution_resumed', message.data);
        break;
      case 'execution_cancelled':
        this.emit('execution_cancelled', message.data);
        break;
      case 'node_execution_started':
        this.emit('node_execution_started', message.data);
        break;
      case 'node_execution_completed':
        this.emit('node_execution_completed', message.data);
        break;
      case 'node_execution_failed':
        this.emit('node_execution_failed', message.data);
        break;
      case 'node_skipped':
        this.emit('node_skipped', message.data);
        break;
      case 'node_retry_attempt':
        this.emit('node_retry_attempt', message.data);
        break;
      case 'execution_status':
        this.emit('execution_status_response', message.data);
        break;
      case 'active_executions':
        this.emit('active_executions_response', message.data);
        break;
      case 'subscription_confirmed':
        this.emit('subscription_confirmed', message.data);
        break;
      case 'unsubscription_confirmed':
        this.emit('unsubscription_confirmed', message.data);
        break;
      case 'error':
        this.emit('server_error', message.data);
        break;
      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  }

  private startPing(): void {
    this.pingInterval = window.setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000); // Ping every 30 seconds
  }

  private stopPing(): void {
    if (this.pingInterval) {
      window.clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.ws?.readyState !== WebSocket.OPEN) {
        this.connect().catch(console.error);
      }
    }, delay);
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get connectionState(): number | undefined {
    return this.ws?.readyState;
  }
}

export const websocketService = new WebSocketService();
export default websocketService;