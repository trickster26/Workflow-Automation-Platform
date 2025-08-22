import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/AuthService';
import { UserModel } from '../models/User.model';
import { createLogger } from '../utils/logger';

const logger = createLogger('AuthMiddleware');

export interface AuthenticatedRequest extends Request {
  user?: UserModel;
  sessionId?: string;
}

export class AuthMiddleware {
  /**
   * Authenticate user from JWT token
   */
  public static async authenticate(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please provide a valid authentication token',
        });
      }

      const token = authHeader.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Token not provided',
        });
      }

      // Verify token
      const payload = await authService.verifyToken(token);
      
      // Get user from database
      const user = await UserModel.findByPk(payload.userId);
      
      if (!user) {
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'User not found',
        });
      }

      if (user.status !== 'active') {
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Account is not active',
        });
      }

      // Attach user and session to request
      req.user = user;
      req.sessionId = payload.sessionId;
      
      next();
    } catch (error: any) {
      logger.error('Authentication failed:', error);
      
      if (error.message === 'Token expired') {
        return res.status(401).json({
          error: 'Token expired',
          message: 'Please refresh your token',
          code: 'TOKEN_EXPIRED',
        });
      }
      
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid token',
      });
    }
  }

  /**
   * Optional authentication - doesn't fail if no token provided
   */
  public static async optionalAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(); // No token provided, continue without user
      }

      const token = authHeader.split(' ')[1];
      
      if (!token) {
        return next(); // No token provided, continue without user
      }

      // Verify token
      const payload = await authService.verifyToken(token);
      
      // Get user from database
      const user = await UserModel.findByPk(payload.userId);
      
      if (user && user.status === 'active') {
        req.user = user;
        req.sessionId = payload.sessionId;
      }
      
      next();
    } catch (error: any) {
      // Ignore authentication errors in optional auth
      logger.debug('Optional authentication failed:', error.message);
      next();
    }
  }

  /**
   * Check if user has required permission
   */
  public static requirePermission(permission: string) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please authenticate to access this resource',
        });
      }

      if (!req.user.hasPermission(permission)) {
        logger.warn('Permission denied', {
          userId: req.user.id,
          permission,
          userRole: req.user.role,
        });
        
        return res.status(403).json({
          error: 'Permission denied',
          message: `You don't have permission to ${permission}`,
        });
      }

      next();
    };
  }

  /**
   * Check if user has required role
   */
  public static requireRole(role: string | string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please authenticate to access this resource',
        });
      }

      const requiredRoles = Array.isArray(role) ? role : [role];
      
      if (!requiredRoles.includes(req.user.role)) {
        logger.warn('Role requirement not met', {
          userId: req.user.id,
          userRole: req.user.role,
          requiredRoles,
        });
        
        return res.status(403).json({
          error: 'Insufficient privileges',
          message: 'You don\'t have the required role to access this resource',
        });
      }

      next();
    };
  }

  /**
   * Check if user is admin
   */
  public static requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    return AuthMiddleware.requireRole('admin')(req, res, next);
  }

  /**
   * Validate API key for API endpoints
   */
  public static async validateApiKey(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const apiKey = req.headers['x-api-key'] as string;
      
      if (!apiKey) {
        return res.status(401).json({
          error: 'API key required',
          message: 'Please provide a valid API key in X-API-Key header',
        });
      }

      // For development, accept any API key
      if (process.env.NODE_ENV === 'development') {
        // Create a mock API user
        const mockUser = {
          id: 'api-user',
          email: 'api@system.local',
          username: 'api-user',
          role: 'api',
          status: 'active',
          hasPermission: (permission: string) => {
            const apiPermissions = [
              'workflows:read', 'workflows:create', 'workflows:update',
              'executions:read', 'executions:create', 'executions:cancel',
              'webhooks:read', 'webhooks:create'
            ];
            return apiPermissions.includes(permission) || permission === '*';
          },
          canAccessWorkflow: () => true,
        } as any;

        req.user = mockUser;
        return next();
      }

      // TODO: Implement proper API key validation
      // This would typically involve:
      // 1. Hash the API key and look it up in database
      // 2. Check if the API key is active and not expired
      // 3. Get associated user/permissions
      // 4. Rate limit the API key usage

      return res.status(401).json({
        error: 'Invalid API key',
        message: 'The provided API key is not valid',
      });
    } catch (error: any) {
      logger.error('API key validation failed:', error);
      return res.status(500).json({
        error: 'Authentication error',
        message: 'Internal authentication error',
      });
    }
  }

  /**
   * Rate limiting middleware
   */
  public static rateLimit(maxRequests: number = 100, windowMs: number = 60000) {
    const requestCounts = new Map<string, { count: number; resetTime: number }>();

    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const identifier = req.user?.id || req.ip || 'anonymous';
      const now = Date.now();
      
      const userLimit = requestCounts.get(identifier);
      
      if (!userLimit || now > userLimit.resetTime) {
        // Reset or initialize counter
        requestCounts.set(identifier, {
          count: 1,
          resetTime: now + windowMs,
        });
        return next();
      }

      if (userLimit.count >= maxRequests) {
        logger.warn(`Rate limit exceeded for user: ${identifier}`, {
          userId: req.user?.id,
          count: userLimit.count,
          limit: maxRequests,
        });
        
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((userLimit.resetTime - now) / 1000),
        });
      }

      userLimit.count++;
      next();
    };
  }

  /**
   * Security headers middleware
   */
  public static securityHeaders(req: Request, res: Response, next: NextFunction) {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // HSTS header for HTTPS
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // CSP header
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' https:; " +
      "connect-src 'self' ws: wss:;"
    );

    next();
  }

  /**
   * CORS middleware with authentication-aware settings
   */
  public static corsWithAuth() {
    return (req: Request, res: Response, next: NextFunction) => {
      const origin = req.headers.origin;
      const allowedOrigins = [
        process.env.FRONTEND_URL || 'http://localhost:3001',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
      ];

      // Allow requests from allowed origins or same origin
      if (allowedOrigins.includes(origin || '') || !origin) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
      }

      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 
        'Content-Type, Authorization, X-API-Key, X-Requested-With'
      );
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }

      next();
    };
  }

  /**
   * Audit logging middleware
   */
  public static auditLog(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    // Skip GET requests and health checks for audit logs
    if (req.method === 'GET' || req.path === '/health') {
      return next();
    }

    const originalSend = res.send;
    const startTime = Date.now();

    res.send = function(body: any) {
      const duration = Date.now() - startTime;
      
      // Log the request
      logger.info('API Request', {
        method: req.method,
        path: req.path,
        userId: req.user?.id,
        sessionId: req.sessionId,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('User-Agent')?.substring(0, 100),
      });

      return originalSend.call(this, body);
    };

    next();
  }

  /**
   * Validate workflow ownership
   */
  public static validateWorkflowOwnership(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    // This middleware would be used for workflow-specific routes
    // Implementation would check if user can access the specific workflow
    // For now, we'll implement basic ownership check in controllers
    next();
  }
}

// Helper function to extract user ID from request
export function getUserId(req: AuthenticatedRequest): string | undefined {
  return req.user?.id;
}

// Helper function to check if user is authenticated
export function isAuthenticated(req: AuthenticatedRequest): boolean {
  return !!req.user && req.user.status === 'active';
}

// Helper function to check if user is admin
export function isAdmin(req: AuthenticatedRequest): boolean {
  return !!req.user && req.user.role === 'admin';
}