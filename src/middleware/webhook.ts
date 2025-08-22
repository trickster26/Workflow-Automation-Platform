import { Request, Response, NextFunction } from 'express';
import { webhookService } from '../services/WebhookService';
import { createLogger } from '../utils/logger';

const logger = createLogger('WebhookMiddleware');

export interface WebhookRequest extends Request {
  webhookPath?: string;
}

export class WebhookMiddleware {
  // Middleware to handle webhook requests
  public static async handleWebhookRequest(
    req: WebhookRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Extract webhook path from URL
      const webhookPath = req.path.replace(/^\/webhook\/?/, '');
      
      if (!webhookPath) {
        return next(); // Not a webhook request
      }

      req.webhookPath = webhookPath;

      // Handle the webhook request
      await webhookService.handleWebhookRequest(
        webhookPath,
        req.method,
        req,
        res
      );

      // Don't call next() as we've handled the response
    } catch (error: any) {
      logger.error('Webhook middleware error:', error);
      
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal webhook error',
          message: error.message,
        });
      }
    }
  }

  // Middleware to validate webhook signatures (for secured webhooks)
  public static validateWebhookSignature(secret: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const signature = req.headers['x-webhook-signature'] as string;
      
      if (!signature) {
        return res.status(401).json({
          error: 'Missing webhook signature',
        });
      }

      try {
        const crypto = require('crypto');
        const bodyString = JSON.stringify(req.body);
        const expectedSignature = crypto
          .createHmac('sha256', secret)
          .update(bodyString)
          .digest('hex');

        const providedSignature = signature.replace('sha256=', '');

        if (!crypto.timingSafeEqual(
          Buffer.from(expectedSignature, 'hex'),
          Buffer.from(providedSignature, 'hex')
        )) {
          return res.status(401).json({
            error: 'Invalid webhook signature',
          });
        }

        next();
      } catch (error: any) {
        logger.error('Signature validation error:', error);
        res.status(400).json({
          error: 'Signature validation failed',
        });
      }
    };
  }

  // Middleware to rate limit webhook requests
  public static rateLimitWebhooks(maxRequests: number = 100, windowMs: number = 60000) {
    const requestCounts = new Map<string, { count: number; resetTime: number }>();

    return (req: Request, res: Response, next: NextFunction) => {
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      const now = Date.now();
      
      const clientData = requestCounts.get(clientIP);
      
      if (!clientData || now > clientData.resetTime) {
        // Reset or initialize counter
        requestCounts.set(clientIP, {
          count: 1,
          resetTime: now + windowMs,
        });
        return next();
      }

      if (clientData.count >= maxRequests) {
        logger.warn(`Rate limit exceeded for IP: ${clientIP}`);
        return res.status(429).json({
          error: 'Too many webhook requests',
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
        });
      }

      clientData.count++;
      next();
    };
  }

  // Middleware to log webhook requests
  public static logWebhookRequests(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    
    // Log request
    logger.info('Webhook request received', {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: req.get('Content-Length'),
      timestamp: new Date().toISOString(),
    });

    // Log response when it's sent
    const originalSend = res.send;
    res.send = function(body: any) {
      const duration = Date.now() - startTime;
      
      logger.info('Webhook response sent', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        responseSize: typeof body === 'string' ? body.length : JSON.stringify(body).length,
      });

      return originalSend.call(this, body);
    };

    next();
  }

  // Middleware to handle webhook authentication
  public static authenticateWebhook(req: Request, res: Response, next: NextFunction) {
    // Check for API key in headers
    const apiKey = req.headers['x-api-key'] as string;
    const bearerToken = req.headers.authorization?.replace('Bearer ', '');

    // For development, allow requests without authentication
    if (process.env.NODE_ENV === 'development') {
      return next();
    }

    if (!apiKey && !bearerToken) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Provide either X-API-Key header or Authorization Bearer token',
      });
    }

    // TODO: Validate API key or token against database/cache
    // For now, just continue
    next();
  }

  // Middleware to parse different content types for webhooks
  public static parseWebhookBody(req: Request, res: Response, next: NextFunction) {
    const contentType = req.get('Content-Type') || '';

    // Handle different content types
    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Already handled by express.urlencoded()
      return next();
    }

    if (contentType.includes('multipart/form-data')) {
      // Would need multer or similar for file uploads
      logger.warn('Multipart form data not fully supported in webhooks');
      return next();
    }

    if (contentType.includes('text/plain')) {
      // Store raw text in body
      let data = '';
      req.on('data', chunk => {
        data += chunk;
      });
      req.on('end', () => {
        (req as any).rawBody = data;
        req.body = { text: data };
        next();
      });
      return;
    }

    // For JSON and other types, use default behavior
    next();
  }
}