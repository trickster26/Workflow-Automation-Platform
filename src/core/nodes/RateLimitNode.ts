import { WorkflowNode, NodeExecution, NodeInput, NodeOutput } from '../../types/workflow.types';
import { createLogger } from '../../utils/logger';

interface RateLimitConfig {
  mode: 'perSecond' | 'perMinute' | 'perHour' | 'perDay' | 'sliding' | 'token';
  limit: number; // Number of requests allowed
  windowSize?: number; // Window size in milliseconds for sliding mode
  tokensPerRefill?: number; // Tokens to add per refill (token bucket mode)
  refillInterval?: number; // Refill interval in milliseconds (token bucket mode)
  scope: 'global' | 'perUser' | 'perWorkflow' | 'perNode';
  queueRequests?: boolean; // Whether to queue requests when limit exceeded
  maxQueueSize?: number; // Maximum queue size
  dropOnOverflow?: boolean; // Drop requests when queue is full
  burstAllowed?: boolean; // Allow bursts up to limit
  failureAction: 'reject' | 'delay' | 'fallback';
  fallbackValue?: any; // Value to return when rate limited
}

interface RateLimiter {
  count: number;
  windowStart: number;
  tokens: number; // For token bucket algorithm
  lastRefill: number; // For token bucket algorithm
  queue: QueuedRequest[];
}

interface QueuedRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
  nodeId: string;
}

export class RateLimitNode implements WorkflowNode {
  public readonly type = 'rateLimit';
  public readonly name = 'Rate Limit';
  public readonly category = 'Flow Control';
  public readonly description = 'Control execution frequency with various rate limiting algorithms';

  private logger: Logger;
  private limiters: Map<string, RateLimiter>;
  private queueProcessor?: NodeJS.Timeout;

  constructor() {
    this.logger = createLogger('RateLimitNode');
    this.limiters = new Map();
    this.startQueueProcessor();
  }

  async execute(execution: NodeExecution): Promise<NodeOutput[]> {
    try {
      const config = execution.node.config as RateLimitConfig;
      const inputs = execution.inputs;
      const nodeId = execution.node.id;

      // Validate configuration
      this.validateConfig(config);

      // Determine limiter key based on scope
      const limiterKey = this.getLimiterKey(config, execution);
      
      // Get or create rate limiter
      const limiter = this.getLimiter(limiterKey, config);

      this.logger.debug(`Rate limiting check for ${limiterKey}`);

      const startTime = Date.now();

      // Check rate limit
      const allowed = await this.checkRateLimit(limiter, config, nodeId);

      if (allowed) {
        // Execute the main logic
        const result = await this.executeMainLogic(execution, inputs);
        const executionTime = Date.now() - startTime;

        return [{
          nodeId: execution.node.id,
          data: {
            success: true,
            result,
            rateLimitInfo: {
              allowed: true,
              remaining: this.getRemainingRequests(limiter, config),
              resetTime: this.getResetTime(limiter, config)
            }
          },
          metadata: { 
            executionTime,
            rateLimited: false
          }
        }];

      } else {
        // Handle rate limit exceeded
        return await this.handleRateLimitExceeded(execution, config, limiter, startTime);
      }

    } catch (error) {
      this.logger.error('Rate limit node execution failed:', error);
      return [{
        nodeId: execution.node.id,
        data: { error: error.message },
        metadata: { executionTime: 0, failed: true }
      }];
    }
  }

  private validateConfig(config: RateLimitConfig): void {
    if (!config.mode) {
      throw new Error('Rate limit mode is required');
    }

    if (!config.limit || config.limit < 1) {
      throw new Error('Limit must be a positive number');
    }

    if (!config.scope) {
      throw new Error('Scope is required');
    }

    if (config.mode === 'sliding' && (!config.windowSize || config.windowSize < 1)) {
      throw new Error('Window size is required for sliding mode');
    }

    if (config.mode === 'token') {
      if (!config.tokensPerRefill || config.tokensPerRefill < 1) {
        throw new Error('Tokens per refill is required for token bucket mode');
      }
      if (!config.refillInterval || config.refillInterval < 1) {
        throw new Error('Refill interval is required for token bucket mode');
      }
    }

    if (config.queueRequests && config.maxQueueSize && config.maxQueueSize < 1) {
      throw new Error('Max queue size must be positive');
    }
  }

  private getLimiterKey(config: RateLimitConfig, execution: NodeExecution): string {
    switch (config.scope) {
      case 'global':
        return 'global';
      case 'perUser':
        return `user:${execution.userId || 'anonymous'}`;
      case 'perWorkflow':
        return `workflow:${execution.workflowId}`;
      case 'perNode':
        return `node:${execution.node.id}`;
      default:
        return 'global';
    }
  }

  private getLimiter(key: string, config: RateLimitConfig): RateLimiter {
    if (!this.limiters.has(key)) {
      this.limiters.set(key, {
        count: 0,
        windowStart: Date.now(),
        tokens: config.limit, // Start with full bucket for token mode
        lastRefill: Date.now(),
        queue: []
      });
    }
    return this.limiters.get(key)!;
  }

  private async checkRateLimit(
    limiter: RateLimiter,
    config: RateLimitConfig,
    nodeId: string
  ): Promise<boolean> {
    const now = Date.now();

    switch (config.mode) {
      case 'perSecond':
        return this.checkFixedWindow(limiter, config, now, 1000);
      case 'perMinute':
        return this.checkFixedWindow(limiter, config, now, 60000);
      case 'perHour':
        return this.checkFixedWindow(limiter, config, now, 3600000);
      case 'perDay':
        return this.checkFixedWindow(limiter, config, now, 86400000);
      case 'sliding':
        return this.checkSlidingWindow(limiter, config, now);
      case 'token':
        return this.checkTokenBucket(limiter, config, now);
      default:
        throw new Error(`Unsupported rate limit mode: ${config.mode}`);
    }
  }

  private checkFixedWindow(
    limiter: RateLimiter,
    config: RateLimitConfig,
    now: number,
    windowMs: number
  ): boolean {
    // Reset window if needed
    if (now - limiter.windowStart >= windowMs) {
      limiter.count = 0;
      limiter.windowStart = now;
    }

    // Check if request is allowed
    if (limiter.count < config.limit) {
      limiter.count++;
      return true;
    }

    return false;
  }

  private checkSlidingWindow(
    limiter: RateLimiter,
    config: RateLimitConfig,
    now: number
  ): boolean {
    const windowSize = config.windowSize!;
    
    // For simplicity, we'll use a fixed window approach
    // In a production system, you'd want a proper sliding window implementation
    if (now - limiter.windowStart >= windowSize) {
      limiter.count = 0;
      limiter.windowStart = now;
    }

    if (limiter.count < config.limit) {
      limiter.count++;
      return true;
    }

    return false;
  }

  private checkTokenBucket(
    limiter: RateLimiter,
    config: RateLimitConfig,
    now: number
  ): boolean {
    // Refill tokens
    const timeSinceLastRefill = now - limiter.lastRefill;
    const refillInterval = config.refillInterval!;
    const tokensToAdd = Math.floor(timeSinceLastRefill / refillInterval) * config.tokensPerRefill!;
    
    if (tokensToAdd > 0) {
      limiter.tokens = Math.min(config.limit, limiter.tokens + tokensToAdd);
      limiter.lastRefill = now;
    }

    // Check if token is available
    if (limiter.tokens > 0) {
      limiter.tokens--;
      return true;
    }

    return false;
  }

  private async handleRateLimitExceeded(
    execution: NodeExecution,
    config: RateLimitConfig,
    limiter: RateLimiter,
    startTime: number
  ): Promise<NodeOutput[]> {
    const nodeId = execution.node.id;
    const executionTime = Date.now() - startTime;

    this.logger.warn(`Rate limit exceeded for node ${nodeId}`);

    switch (config.failureAction) {
      case 'reject':
        return [{
          nodeId: execution.node.id,
          data: {
            success: false,
            error: 'Rate limit exceeded',
            rateLimitInfo: {
              allowed: false,
              remaining: 0,
              resetTime: this.getResetTime(limiter, config),
              retryAfter: this.getRetryAfter(limiter, config)
            }
          },
          metadata: { 
            executionTime,
            rateLimited: true
          }
        }];

      case 'delay':
        if (config.queueRequests) {
          return await this.queueRequest(execution, config, limiter, startTime);
        } else {
          const delay = this.calculateDelay(limiter, config);
          await new Promise(resolve => setTimeout(resolve, delay));
          return await this.execute(execution); // Retry after delay
        }

      case 'fallback':
        return [{
          nodeId: execution.node.id,
          data: {
            success: true,
            result: config.fallbackValue,
            rateLimitInfo: {
              allowed: false,
              fallbackUsed: true,
              resetTime: this.getResetTime(limiter, config)
            }
          },
          metadata: { 
            executionTime,
            rateLimited: true,
            fallbackUsed: true
          }
        }];

      default:
        throw new Error(`Unsupported failure action: ${config.failureAction}`);
    }
  }

  private async queueRequest(
    execution: NodeExecution,
    config: RateLimitConfig,
    limiter: RateLimiter,
    startTime: number
  ): Promise<NodeOutput[]> {
    const maxQueueSize = config.maxQueueSize || 100;
    
    if (limiter.queue.length >= maxQueueSize) {
      if (config.dropOnOverflow) {
        this.logger.warn(`Queue full, dropping request for node ${execution.node.id}`);
        return [{
          nodeId: execution.node.id,
          data: {
            success: false,
            error: 'Queue full, request dropped',
            rateLimitInfo: {
              allowed: false,
              queueFull: true
            }
          },
          metadata: { 
            executionTime: Date.now() - startTime,
            rateLimited: true,
            dropped: true
          }
        }];
      } else {
        throw new Error('Rate limit queue is full');
      }
    }

    // Add to queue
    return new Promise((resolve) => {
      const queuedRequest: QueuedRequest = {
        resolve: (result) => resolve([{
          nodeId: execution.node.id,
          data: result,
          metadata: { 
            executionTime: Date.now() - startTime,
            rateLimited: true,
            queued: true
          }
        }]),
        reject: (error) => resolve([{
          nodeId: execution.node.id,
          data: { error: error.message },
          metadata: { 
            executionTime: Date.now() - startTime,
            rateLimited: true,
            failed: true
          }
        }]),
        timestamp: Date.now(),
        nodeId: execution.node.id
      };

      limiter.queue.push(queuedRequest);
      this.logger.debug(`Queued request for node ${execution.node.id}, queue size: ${limiter.queue.length}`);
    });
  }

  private calculateDelay(limiter: RateLimiter, config: RateLimitConfig): number {
    switch (config.mode) {
      case 'perSecond':
        return 1000 - (Date.now() - limiter.windowStart);
      case 'perMinute':
        return 60000 - (Date.now() - limiter.windowStart);
      case 'perHour':
        return 3600000 - (Date.now() - limiter.windowStart);
      case 'perDay':
        return 86400000 - (Date.now() - limiter.windowStart);
      case 'sliding':
        return config.windowSize! - (Date.now() - limiter.windowStart);
      case 'token':
        return config.refillInterval!;
      default:
        return 1000; // Default 1 second
    }
  }

  private getRemainingRequests(limiter: RateLimiter, config: RateLimitConfig): number {
    switch (config.mode) {
      case 'token':
        return limiter.tokens;
      default:
        return Math.max(0, config.limit - limiter.count);
    }
  }

  private getResetTime(limiter: RateLimiter, config: RateLimitConfig): number {
    switch (config.mode) {
      case 'perSecond':
        return limiter.windowStart + 1000;
      case 'perMinute':
        return limiter.windowStart + 60000;
      case 'perHour':
        return limiter.windowStart + 3600000;
      case 'perDay':
        return limiter.windowStart + 86400000;
      case 'sliding':
        return limiter.windowStart + config.windowSize!;
      case 'token':
        return limiter.lastRefill + config.refillInterval!;
      default:
        return Date.now() + 1000;
    }
  }

  private getRetryAfter(limiter: RateLimiter, config: RateLimitConfig): number {
    const resetTime = this.getResetTime(limiter, config);
    return Math.max(0, Math.ceil((resetTime - Date.now()) / 1000));
  }

  private startQueueProcessor(): void {
    this.queueProcessor = setInterval(() => {
      this.processQueues();
    }, 100); // Process every 100ms
  }

  private processQueues(): void {
    for (const [key, limiter] of this.limiters) {
      if (limiter.queue.length === 0) continue;

      // Try to process queued requests
      const now = Date.now();
      const processed: QueuedRequest[] = [];

      for (const request of limiter.queue) {
        // Check if this request can be processed now
        // This is a simplified check - in practice you'd need the config for each request
        if (limiter.tokens > 0 || limiter.count < 10) { // Simplified rate check
          processed.push(request);
          
          // Simulate processing
          request.resolve({
            success: true,
            result: { processed: true, queueTime: now - request.timestamp },
            rateLimitInfo: {
              allowed: true,
              processedFromQueue: true
            }
          });

          // Update limiter state
          if (limiter.tokens > 0) {
            limiter.tokens--;
          } else {
            limiter.count++;
          }
        }
      }

      // Remove processed requests
      limiter.queue = limiter.queue.filter(req => !processed.includes(req));
    }
  }

  private async executeMainLogic(execution: NodeExecution, inputs: NodeInput[]): Promise<any> {
    // Simulate main logic execution
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50));
    
    return {
      processedData: inputs.length > 0 ? inputs[0].data : null,
      timestamp: new Date().toISOString(),
      nodeId: execution.node.id
    };
  }

  // Cleanup method
  public cleanup(): void {
    if (this.queueProcessor) {
      clearInterval(this.queueProcessor);
    }
    this.limiters.clear();
  }

  getNodeDefinition() {
    return {
      type: this.type,
      name: this.name,
      category: this.category,
      description: this.description,
      inputs: [
        {
          name: 'input',
          type: 'any',
          required: false,
          description: 'Input data to process'
        }
      ],
      outputs: [
        {
          name: 'output',
          type: 'any',
          description: 'Processed data or rate limit info'
        }
      ],
      properties: [
        {
          name: 'mode',
          type: 'select',
          required: true,
          options: [
            { value: 'perSecond', label: 'Per Second' },
            { value: 'perMinute', label: 'Per Minute' },
            { value: 'perHour', label: 'Per Hour' },
            { value: 'perDay', label: 'Per Day' },
            { value: 'sliding', label: 'Sliding Window' },
            { value: 'token', label: 'Token Bucket' }
          ],
          description: 'Rate limiting algorithm'
        },
        {
          name: 'limit',
          type: 'number',
          required: true,
          description: 'Maximum number of requests allowed'
        },
        {
          name: 'windowSize',
          type: 'number',
          required: false,
          description: 'Window size in milliseconds',
          displayCondition: { mode: 'sliding' }
        },
        {
          name: 'tokensPerRefill',
          type: 'number',
          required: false,
          description: 'Tokens added per refill',
          displayCondition: { mode: 'token' }
        },
        {
          name: 'refillInterval',
          type: 'number',
          required: false,
          description: 'Refill interval in milliseconds',
          displayCondition: { mode: 'token' }
        },
        {
          name: 'scope',
          type: 'select',
          required: true,
          options: [
            { value: 'global', label: 'Global' },
            { value: 'perUser', label: 'Per User' },
            { value: 'perWorkflow', label: 'Per Workflow' },
            { value: 'perNode', label: 'Per Node' }
          ],
          description: 'Rate limit scope'
        },
        {
          name: 'failureAction',
          type: 'select',
          required: true,
          options: [
            { value: 'reject', label: 'Reject Request' },
            { value: 'delay', label: 'Delay Execution' },
            { value: 'fallback', label: 'Use Fallback' }
          ],
          description: 'Action when rate limit exceeded'
        },
        {
          name: 'queueRequests',
          type: 'boolean',
          required: false,
          default: false,
          description: 'Queue requests when rate limited',
          displayCondition: { failureAction: 'delay' }
        },
        {
          name: 'maxQueueSize',
          type: 'number',
          required: false,
          default: 100,
          description: 'Maximum queue size',
          displayCondition: { queueRequests: true }
        },
        {
          name: 'dropOnOverflow',
          type: 'boolean',
          required: false,
          default: false,
          description: 'Drop requests when queue is full',
          displayCondition: { queueRequests: true }
        },
        {
          name: 'fallbackValue',
          type: 'json',
          required: false,
          description: 'Value to return when rate limited',
          displayCondition: { failureAction: 'fallback' }
        }
      ]
    };
  }
}