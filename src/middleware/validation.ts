import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { createLogger } from '../utils/logger';

const logger = createLogger('ValidationMiddleware');

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn('Validation failed:', {
      path: req.path,
      method: req.method,
      errors: errors.array(),
      body: req.body,
      params: req.params,
      query: req.query,
    });
    
    return res.status(400).json({
      error: 'Validation failed',
      message: 'The request contains invalid data',
      details: errors.array(),
    });
  }
  
  next();
};

export const validateOptionalRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.debug('Optional validation failed (continuing):', {
      path: req.path,
      method: req.method,
      errors: errors.array(),
    });
    
    // Continue anyway for optional validation
  }
  
  next();
};