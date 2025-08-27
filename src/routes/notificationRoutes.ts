import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { notificationService, NotificationRequest } from '../services/NotificationService';
import { createLogger } from '../utils/logger';
import joi from 'joi';

const router = Router();
const logger = createLogger('NotificationRoutes');

// Validation schemas
const notificationRequestSchema = joi.object({
  channel: joi.string().required(),
  template: joi.string().optional(),
  recipients: joi.array().items(joi.string()).min(1).required(),
  subject: joi.string().optional(),
  message: joi.string().required(),
  data: joi.object().optional(),
  priority: joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
  scheduled: joi.date().optional(),
  attachments: joi.array().items(joi.object({
    filename: joi.string().required(),
    path: joi.string().required(),
    contentType: joi.string().optional()
  })).optional()
});

const templateSchema = joi.object({
  name: joi.string().required(),
  type: joi.string().valid('email', 'sms', 'slack', 'discord', 'teams', 'push').required(),
  subject: joi.string().optional(),
  body: joi.string().required(),
  variables: joi.array().items(joi.string()).default([])
});

const channelSchema = joi.object({
  type: joi.string().valid('email', 'sms', 'slack', 'discord', 'teams', 'push', 'webhook').required(),
  name: joi.string().required(),
  config: joi.object().required(),
  enabled: joi.boolean().default(true)
});

// Send notification
router.post('/send', authenticate, async (req: Request, res: Response) => {
  try {
    const { error, value } = notificationRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        details: error.details
      });
    }

    const notificationRequest: NotificationRequest = value;
    const notificationId = await notificationService.sendNotification(notificationRequest);

    res.json({
      status: 'success',
      data: {
        notificationId,
        message: 'Notification sent successfully'
      }
    });
  } catch (error) {
    logger.error('Failed to send notification:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send notification',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send bulk notifications
router.post('/send/bulk', authenticate, async (req: Request, res: Response) => {
  try {
    const { notifications } = req.body;

    if (!Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Notifications array is required and must not be empty'
      });
    }

    const results: Array<{
      index: number;
      success: boolean;
      notificationId?: string;
      error?: string;
    }> = [];

    for (let i = 0; i < notifications.length; i++) {
      try {
        const { error, value } = notificationRequestSchema.validate(notifications[i]);
        if (error) {
          results.push({
            index: i,
            success: false,
            error: `Validation error: ${error.details.map(d => d.message).join(', ')}`
          });
          continue;
        }

        const notificationId = await notificationService.sendNotification(value);
        results.push({
          index: i,
          success: true,
          notificationId
        });
      } catch (error) {
        results.push({
          index: i,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.json({
      status: failureCount === 0 ? 'success' : (successCount > 0 ? 'partial' : 'error'),
      data: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
        results
      }
    });
  } catch (error) {
    logger.error('Failed to send bulk notifications:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send bulk notifications'
    });
  }
});

// Get notification history
router.get('/history', authenticate, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const history = await notificationService.getNotificationHistory(limit, offset);

    res.json({
      status: 'success',
      data: history
    });
  } catch (error) {
    logger.error('Failed to get notification history:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get notification history'
    });
  }
});

// Get notification statistics
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const stats = await notificationService.getNotificationStats(days);

    res.json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get notification stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get notification stats'
    });
  }
});

// Template management
router.post('/templates', authenticate, async (req: Request, res: Response) => {
  try {
    const { error, value } = templateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        details: error.details
      });
    }

    const templateId = await notificationService.createTemplate(value);

    res.status(201).json({
      status: 'success',
      data: {
        templateId,
        message: 'Template created successfully'
      }
    });
  } catch (error) {
    logger.error('Failed to create template:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create template'
    });
  }
});

router.get('/templates', authenticate, async (req: Request, res: Response) => {
  try {
    const templates = await notificationService.listTemplates();

    res.json({
      status: 'success',
      data: {
        templates,
        total: templates.length
      }
    });
  } catch (error) {
    logger.error('Failed to list templates:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list templates'
    });
  }
});

router.get('/templates/:templateId', authenticate, async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const template = await notificationService.getTemplate(templateId);

    if (!template) {
      return res.status(404).json({
        status: 'error',
        message: 'Template not found'
      });
    }

    res.json({
      status: 'success',
      data: template
    });
  } catch (error) {
    logger.error('Failed to get template:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get template'
    });
  }
});

router.put('/templates/:templateId', authenticate, async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const updates = req.body;

    // Remove id and timestamp fields from updates
    delete updates.id;
    delete updates.createdAt;
    delete updates.updatedAt;

    await notificationService.updateTemplate(templateId, updates);

    res.json({
      status: 'success',
      data: {
        message: 'Template updated successfully'
      }
    });
  } catch (error) {
    logger.error('Failed to update template:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to update template'
    });
  }
});

router.delete('/templates/:templateId', authenticate, async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    await notificationService.deleteTemplate(templateId);

    res.json({
      status: 'success',
      data: {
        message: 'Template deleted successfully'
      }
    });
  } catch (error) {
    logger.error('Failed to delete template:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to delete template'
    });
  }
});

// Channel management
router.post('/channels', authenticate, async (req: Request, res: Response) => {
  try {
    const { error, value } = channelSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        details: error.details
      });
    }

    const channelId = await notificationService.createChannel(value);

    res.status(201).json({
      status: 'success',
      data: {
        channelId,
        message: 'Channel created successfully'
      }
    });
  } catch (error) {
    logger.error('Failed to create channel:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create channel'
    });
  }
});

router.get('/channels', authenticate, async (req: Request, res: Response) => {
  try {
    const channels = await notificationService.listChannels();

    res.json({
      status: 'success',
      data: {
        channels,
        total: channels.length
      }
    });
  } catch (error) {
    logger.error('Failed to list channels:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list channels'
    });
  }
});

router.get('/channels/:channelId', authenticate, async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const channel = await notificationService.getChannel(channelId);

    if (!channel) {
      return res.status(404).json({
        status: 'error',
        message: 'Channel not found'
      });
    }

    res.json({
      status: 'success',
      data: channel
    });
  } catch (error) {
    logger.error('Failed to get channel:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get channel'
    });
  }
});

// Test notification endpoint
router.post('/test', authenticate, async (req: Request, res: Response) => {
  try {
    const { channelType, channel, recipient, message } = req.body;

    if (!channelType || !channel || !recipient || !message) {
      return res.status(400).json({
        status: 'error',
        message: 'channelType, channel, recipient, and message are required for testing'
      });
    }

    const testRequest: NotificationRequest = {
      channel,
      recipients: [recipient],
      subject: 'Test Notification',
      message: `Test notification: ${message}`,
      priority: 'low',
      data: {
        testMode: true,
        timestamp: new Date().toISOString()
      }
    };

    const notificationId = await notificationService.sendNotification(testRequest);

    res.json({
      status: 'success',
      data: {
        notificationId,
        message: 'Test notification sent successfully'
      }
    });
  } catch (error) {
    logger.error('Failed to send test notification:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send test notification',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get supported channel types and their requirements
router.get('/channels/types', authenticate, async (req: Request, res: Response) => {
  try {
    const channelTypes = {
      email: {
        name: 'Email',
        description: 'Send notifications via email',
        required: ['recipients', 'subject', 'message'],
        optional: ['attachments', 'scheduled'],
        config: {
          host: 'SMTP host',
          port: 'SMTP port',
          secure: 'Use SSL/TLS',
          auth: {
            user: 'Email username',
            pass: 'Email password'
          }
        }
      },
      sms: {
        name: 'SMS',
        description: 'Send notifications via SMS using Twilio',
        required: ['recipients', 'message'],
        optional: ['scheduled'],
        config: {
          accountSid: 'Twilio Account SID',
          authToken: 'Twilio Auth Token',
          phoneNumber: 'Twilio Phone Number'
        }
      },
      slack: {
        name: 'Slack',
        description: 'Send notifications to Slack channels',
        required: ['message'],
        optional: ['scheduled'],
        config: {
          webhookUrl: 'Slack Webhook URL'
        }
      },
      discord: {
        name: 'Discord',
        description: 'Send notifications to Discord channels',
        required: ['message'],
        optional: ['scheduled'],
        config: {
          botToken: 'Discord Bot Token',
          channelId: 'Discord Channel ID'
        }
      },
      teams: {
        name: 'Microsoft Teams',
        description: 'Send notifications to Teams channels',
        required: ['message'],
        optional: ['scheduled'],
        config: {
          webhookUrl: 'Teams Webhook URL'
        }
      },
      push: {
        name: 'Push Notification',
        description: 'Send browser/mobile push notifications',
        required: ['recipients', 'message'],
        optional: ['scheduled'],
        config: {
          vapidPublicKey: 'VAPID Public Key',
          vapidPrivateKey: 'VAPID Private Key',
          vapidSubject: 'VAPID Subject (email)'
        }
      }
    };

    res.json({
      status: 'success',
      data: {
        channelTypes,
        totalTypes: Object.keys(channelTypes).length
      }
    });
  } catch (error) {
    logger.error('Failed to get channel types:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get channel types'
    });
  }
});

// Preview template with sample data
router.post('/templates/:templateId/preview', authenticate, async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const { sampleData } = req.body;

    const template = await notificationService.getTemplate(templateId);
    if (!template) {
      return res.status(404).json({
        status: 'error',
        message: 'Template not found'
      });
    }

    const handlebars = require('handlebars');
    
    let renderedSubject = template.subject;
    if (template.subject) {
      const subjectTemplate = handlebars.compile(template.subject);
      renderedSubject = subjectTemplate(sampleData || {});
    }

    const bodyTemplate = handlebars.compile(template.body);
    const renderedBody = bodyTemplate(sampleData || {});

    res.json({
      status: 'success',
      data: {
        template: {
          id: template.id,
          name: template.name,
          type: template.type
        },
        preview: {
          subject: renderedSubject,
          body: renderedBody
        },
        sampleData: sampleData || {}
      }
    });
  } catch (error) {
    logger.error('Failed to preview template:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to preview template',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;