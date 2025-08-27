import express, { Request, Response } from 'express';
import { AdvancedDatabaseService, DatabaseConnectionConfig } from '../services/AdvancedDatabaseService';
import { AuthMiddleware } from '../middleware/auth';
import { createLogger } from '../utils/logger';

const router = express.Router();
const logger = createLogger('DatabaseRoutes');
const databaseService = AdvancedDatabaseService.getInstance();

interface DatabaseTestRequest extends Request {
  body: {
    config: DatabaseConnectionConfig;
  };
}

interface DatabaseQueryRequest extends Request {
  body: {
    config: DatabaseConnectionConfig;
    query: string | object;
    parameters?: any[];
  };
}

router.post('/test-connection', AuthMiddleware.authenticate, async (req: DatabaseTestRequest, res: Response) => {
  try {
    const { config } = req.body;

    if (!config || !config.type) {
      return res.status(400).json({
        success: false,
        error: 'Database configuration is required'
      });
    }

    const result = await databaseService.testConnection(config);

    logger.info('Database connection test completed', {
      type: config.type,
      host: config.host,
      database: config.database,
      success: result.success
    });

    res.json(result);

  } catch (error: any) {
    logger.error('Database connection test failed', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/execute-query', AuthMiddleware.authenticate, async (req: DatabaseQueryRequest, res: Response) => {
  try {
    const { config, query, parameters = [] } = req.body;

    if (!config || !config.type) {
      return res.status(400).json({
        success: false,
        error: 'Database configuration is required'
      });
    }

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    const connectionId = await databaseService.createConnection(config);
    const result = await databaseService.executeQuery(connectionId, query, parameters);

    if (result.success) {
      await databaseService.closeConnection(connectionId);
    }

    logger.info('Database query executed', {
      type: config.type,
      success: result.success,
      rowCount: result.rowCount,
      executionTime: result.executionTime
    });

    res.json(result);

  } catch (error: any) {
    logger.error('Database query execution failed', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/connections', AuthMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const connections = databaseService.getActiveConnections();

    const connectionSummary = connections.map(conn => ({
      id: conn.id,
      type: conn.type,
      host: conn.config.host,
      database: conn.config.database,
      isConnected: conn.isConnected,
      createdAt: conn.createdAt,
      lastUsed: conn.lastUsed
    }));

    logger.info('Active database connections retrieved', {
      count: connections.length
    });

    res.json({
      success: true,
      connections: connectionSummary,
      count: connections.length
    });

  } catch (error: any) {
    logger.error('Failed to retrieve database connections', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/close-connection/:connectionId', AuthMiddleware.authenticate, async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;

    if (!connectionId) {
      return res.status(400).json({
        success: false,
        error: 'Connection ID is required'
      });
    }

    const result = await databaseService.closeConnection(connectionId);

    logger.info('Database connection close requested', {
      connectionId,
      success: result
    });

    res.json({
      success: result,
      message: result ? 'Connection closed successfully' : 'Connection not found or already closed'
    });

  } catch (error: any) {
    logger.error('Failed to close database connection', {
      connectionId: req.params.connectionId,
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;