import express from 'express';
import { IntegrationConfigService } from '../services/IntegrationConfigService';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';
import { createLogger } from '../utils/logger';

const logger = createLogger('IntegrationRoutes');

const router = express.Router();

// Validation schemas
const createConfigSchema = [
  body('name').notEmpty().withMessage('Name is required'),
  body('type').isIn(['slack', 'google_sheets', 'github', 'aws', 'stripe', 'twilio', 'office365', 'custom']).withMessage('Invalid integration type'),
  body('config').isObject().withMessage('Configuration must be an object'),
  body('description').optional().isString(),
  body('isActive').optional().isBoolean(),
];

const updateConfigSchema = [
  param('id').isInt().withMessage('Invalid configuration ID'),
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('type').optional().isIn(['slack', 'google_sheets', 'github', 'aws', 'stripe', 'twilio', 'office365', 'custom']).withMessage('Invalid integration type'),
  body('config').optional().isObject().withMessage('Configuration must be an object'),
  body('description').optional().isString(),
  body('isActive').optional().isBoolean(),
];

const idParamSchema = [
  param('id').isInt().withMessage('Invalid configuration ID'),
];

const listConfigsSchema = [
  query('type').optional().isIn(['slack', 'google_sheets', 'github', 'aws', 'stripe', 'twilio', 'office365', 'custom']).withMessage('Invalid integration type'),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
];

export function createIntegrationRoutes(integrationConfigService: IntegrationConfigService) {
  // Create integration configuration
  router.post(
    '/configs',
    authenticateToken,
    createConfigSchema,
    validateRequest,
    async (req, res) => {
      try {
        const { name, type, description, config, isActive = true } = req.body;
        const userId = req.user?.id;

        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'User not authenticated'
          });
        }

        const integrationConfig = await integrationConfigService.createConfig({
          name,
          type,
          description,
          config,
          isActive,
          createdBy: userId,
          usageCount: 0,
          errorCount: 0
        });

        logger.info(`Integration config created: ${integrationConfig.id} by user ${userId}`);

        res.status(201).json({
          success: true,
          data: {
            ...integrationConfig,
            config: {
              // Hide sensitive credential information
              ...integrationConfig.config,
              credentials: integrationConfig.config.credentials ? '[HIDDEN]' : undefined
            }
          }
        });
      } catch (error: any) {
        logger.error('Error creating integration config:', error);
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Get integration configuration
  router.get(
    '/configs/:id',
    authenticateToken,
    idParamSchema,
    validateRequest,
    async (req, res) => {
      try {
        const configId = parseInt(req.params.id);
        const config = await integrationConfigService.getConfig(configId);

        if (!config) {
          return res.status(404).json({
            success: false,
            error: 'Integration configuration not found'
          });
        }

        // Hide sensitive credential information
        const sanitizedConfig = {
          ...config,
          config: {
            ...config.config,
            credentials: config.config.credentials ? '[HIDDEN]' : undefined
          }
        };

        res.json({
          success: true,
          data: sanitizedConfig
        });
      } catch (error: any) {
        logger.error('Error getting integration config:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Update integration configuration
  router.put(
    '/configs/:id',
    authenticateToken,
    updateConfigSchema,
    validateRequest,
    async (req, res) => {
      try {
        const configId = parseInt(req.params.id);
        const updates = req.body;

        const updatedConfig = await integrationConfigService.updateConfig(configId, updates);

        logger.info(`Integration config updated: ${configId} by user ${req.user?.id}`);

        // Hide sensitive credential information
        const sanitizedConfig = {
          ...updatedConfig,
          config: {
            ...updatedConfig.config,
            credentials: updatedConfig.config.credentials ? '[HIDDEN]' : undefined
          }
        };

        res.json({
          success: true,
          data: sanitizedConfig
        });
      } catch (error: any) {
        logger.error('Error updating integration config:', error);
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Delete integration configuration
  router.delete(
    '/configs/:id',
    authenticateToken,
    idParamSchema,
    validateRequest,
    async (req, res) => {
      try {
        const configId = parseInt(req.params.id);
        await integrationConfigService.deleteConfig(configId);

        logger.info(`Integration config deleted: ${configId} by user ${req.user?.id}`);

        res.json({
          success: true,
          message: 'Integration configuration deleted successfully'
        });
      } catch (error: any) {
        logger.error('Error deleting integration config:', error);
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // List integration configurations
  router.get(
    '/configs',
    authenticateToken,
    listConfigsSchema,
    validateRequest,
    async (req, res) => {
      try {
        const {
          type,
          isActive,
          limit = 50,
          offset = 0
        } = req.query;

        const options: any = {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        };

        if (type) {
          options.type = type as string;
        }

        if (isActive !== undefined) {
          options.isActive = isActive === 'true';
        }

        const result = await integrationConfigService.listConfigs(options);

        // Hide sensitive credential information
        const sanitizedConfigs = result.configs.map(config => ({
          ...config,
          config: {
            ...config.config,
            credentials: config.config.credentials ? '[HIDDEN]' : undefined
          }
        }));

        res.json({
          success: true,
          data: {
            configs: sanitizedConfigs,
            total: result.total,
            limit: options.limit,
            offset: options.offset
          }
        });
      } catch (error: any) {
        logger.error('Error listing integration configs:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Test integration connection
  router.post(
    '/configs/:id/test',
    authenticateToken,
    idParamSchema,
    validateRequest,
    async (req, res) => {
      try {
        const configId = parseInt(req.params.id);
        const testResult = await integrationConfigService.testConnection(configId);

        logger.info(`Integration connection test: ${configId} - ${testResult.success ? 'SUCCESS' : 'FAILED'}`);

        res.json({
          success: true,
          data: testResult
        });
      } catch (error: any) {
        logger.error('Error testing integration connection:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Get integration usage statistics
  router.get(
    '/configs/:id/stats',
    authenticateToken,
    idParamSchema,
    validateRequest,
    async (req, res) => {
      try {
        const configId = parseInt(req.params.id);
        const days = parseInt(req.query.days as string) || 30;

        const stats = await integrationConfigService.getUsageStats(configId, days);

        res.json({
          success: true,
          data: stats
        });
      } catch (error: any) {
        logger.error('Error getting usage stats:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Get integration by name
  router.get(
    '/configs/name/:name',
    authenticateToken,
    [param('name').notEmpty().withMessage('Name is required')],
    validateRequest,
    async (req, res) => {
      try {
        const name = req.params.name;
        const config = await integrationConfigService.getConfigByName(name);

        if (!config) {
          return res.status(404).json({
            success: false,
            error: 'Integration configuration not found'
          });
        }

        // Hide sensitive credential information
        const sanitizedConfig = {
          ...config,
          config: {
            ...config.config,
            credentials: config.config.credentials ? '[HIDDEN]' : undefined
          }
        };

        res.json({
          success: true,
          data: sanitizedConfig
        });
      } catch (error: any) {
        logger.error('Error getting integration config by name:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Get integration configuration templates
  router.get(
    '/templates',
    authenticateToken,
    async (req, res) => {
      try {
        const templates = {
          slack: {
            name: 'Slack Integration',
            description: 'Connect to Slack workspace for messaging',
            config: {
              credentials: {
                token: 'YOUR_SLACK_BOT_TOKEN'
              },
              settings: {
                defaultChannel: '#general',
                mentionUsers: true,
                useBlocks: true
              },
              rateLimits: {
                requestsPerMinute: 100,
                requestsPerHour: 1000,
                requestsPerDay: 10000
              },
              retryConfig: {
                maxRetries: 3,
                retryDelayMs: 1000,
                exponentialBackoff: true
              }
            }
          },
          google_sheets: {
            name: 'Google Sheets Integration',
            description: 'Connect to Google Sheets for data operations',
            config: {
              credentials: {
                client_email: 'YOUR_SERVICE_ACCOUNT_EMAIL',
                private_key: 'YOUR_SERVICE_ACCOUNT_PRIVATE_KEY'
              },
              settings: {
                defaultSpreadsheetId: '',
                headerRow: 1,
                dateFormat: 'MM/DD/YYYY'
              },
              rateLimits: {
                requestsPerMinute: 60,
                requestsPerHour: 500,
                requestsPerDay: 5000
              }
            }
          },
          github: {
            name: 'GitHub Integration',
            description: 'Connect to GitHub for repository operations',
            config: {
              credentials: {
                token: 'YOUR_GITHUB_PERSONAL_ACCESS_TOKEN'
              },
              settings: {
                defaultOwner: '',
                defaultRepo: ''
              },
              rateLimits: {
                requestsPerMinute: 60,
                requestsPerHour: 5000,
                requestsPerDay: 5000
              }
            }
          },
          aws: {
            name: 'AWS Integration',
            description: 'Connect to Amazon Web Services',
            config: {
              credentials: {
                accessKeyId: 'YOUR_AWS_ACCESS_KEY_ID',
                secretAccessKey: 'YOUR_AWS_SECRET_ACCESS_KEY'
              },
              settings: {
                region: 'us-east-1',
                defaultS3Bucket: ''
              }
            }
          },
          stripe: {
            name: 'Stripe Integration',
            description: 'Connect to Stripe for payment processing',
            config: {
              credentials: {
                secretKey: 'YOUR_STRIPE_SECRET_KEY'
              },
              settings: {
                mode: 'test', // or 'live'
                defaultCurrency: 'usd'
              },
              webhooks: {
                payments: {
                  url: 'https://your-domain.com/webhooks/stripe/payments',
                  events: ['payment_intent.succeeded', 'payment_intent.payment_failed']
                }
              }
            }
          },
          twilio: {
            name: 'Twilio Integration',
            description: 'Connect to Twilio for SMS and voice services',
            config: {
              credentials: {
                accountSid: 'YOUR_TWILIO_ACCOUNT_SID',
                authToken: 'YOUR_TWILIO_AUTH_TOKEN'
              },
              settings: {
                defaultFromNumber: '+1234567890'
              }
            }
          },
          office365: {
            name: 'Microsoft Office 365 Integration',
            description: 'Connect to Office 365 for email, calendar, and OneDrive',
            config: {
              credentials: {
                clientId: 'YOUR_AZURE_APP_CLIENT_ID',
                clientSecret: 'YOUR_AZURE_APP_CLIENT_SECRET',
                tenantId: 'YOUR_AZURE_TENANT_ID'
              },
              settings: {
                scopes: ['https://graph.microsoft.com/Mail.ReadWrite', 'https://graph.microsoft.com/Calendars.ReadWrite']
              }
            }
          }
        };

        res.json({
          success: true,
          data: templates
        });
      } catch (error: any) {
        logger.error('Error getting integration templates:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Health check for integrations service
  router.get('/health', async (req, res) => {
    try {
      // Check if the service is healthy
      // In a real implementation, you might check database connectivity, etc.
      res.json({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          service: 'integrations'
        }
      });
    } catch (error: any) {
      res.status(503).json({
        success: false,
        data: {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString(),
          service: 'integrations'
        }
      });
    }
  });

  return router;
}