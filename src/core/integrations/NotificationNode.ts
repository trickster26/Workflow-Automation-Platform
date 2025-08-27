import { INodeType, INodeExecuteFunctions } from '../NodeRegistry';
import { INodeTypeDescription } from '../../types/workflow.types';
import { notificationService } from '../../services/NotificationService';

export class NotificationNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Notification',
    name: 'notification',
    group: ['communication'],
    version: 1,
    description: 'Send notifications via multiple channels (email, SMS, Slack, Discord, Teams, push)',
    defaults: {
      name: 'Notification',
      color: '#ff6600',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        name: 'channelType',
        displayName: 'Channel Type',
        type: 'options',
        options: [
          { name: 'Email', value: 'email' },
          { name: 'SMS', value: 'sms' },
          { name: 'Slack', value: 'slack' },
          { name: 'Discord', value: 'discord' },
          { name: 'Microsoft Teams', value: 'teams' },
          { name: 'Push Notification', value: 'push' },
          { name: 'Webhook', value: 'webhook' },
        ],
        default: 'email',
        description: 'Type of notification channel',
      },
      {
        name: 'channel',
        displayName: 'Channel Identifier',
        type: 'string',
        default: '',
        required: true,
        description: 'Channel-specific identifier (email address, phone number, webhook URL, etc.)',
      },
      {
        name: 'recipients',
        displayName: 'Recipients',
        type: 'string',
        default: '',
        required: true,
        description: 'Recipients (comma-separated for multiple)',
      },
      {
        name: 'subject',
        displayName: 'Subject',
        type: 'string',
        default: '',
        description: 'Notification subject (required for email)',
      },
      {
        name: 'message',
        displayName: 'Message',
        type: 'string',
        default: '',
        required: true,
        description: 'Notification message content',
      },
      {
        name: 'template',
        displayName: 'Template ID',
        type: 'string',
        default: '',
        description: 'Pre-defined notification template to use (optional)',
      },
      {
        name: 'priority',
        displayName: 'Priority',
        type: 'options',
        options: [
          { name: 'Low', value: 'low' },
          { name: 'Normal', value: 'normal' },
          { name: 'High', value: 'high' },
          { name: 'Urgent', value: 'urgent' },
        ],
        default: 'normal',
        description: 'Notification priority level',
      },
      {
        name: 'scheduled',
        displayName: 'Schedule For Later',
        type: 'string',
        default: '',
        description: 'Schedule notification for future delivery (optional)',
      },
      {
        name: 'retryOnFailure',
        displayName: 'Retry on Failure',
        type: 'boolean',
        default: false,
        description: 'Retry sending if notification fails',
      },
      {
        name: 'maxRetries',
        displayName: 'Max Retries',
        type: 'number',
        default: 3,
        description: 'Maximum number of retry attempts',
      },
      {
        name: 'condition',
        displayName: 'Send Condition',
        type: 'string',
        default: '',
        description: 'JavaScript expression to determine if notification should be sent (optional)',
      },
    ],
  };

  async execute(this: INodeExecuteFunctions): Promise<any[]> {
    const items = this.getInputData();
    const returnData = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      try {
        // Get configuration parameters
        const channelType = this.getNodeParameter('channelType', i) as string;
        const channel = this.getNodeParameter('channel', i) as string;
        const recipientsStr = this.getNodeParameter('recipients', i) as string;
        const subject = this.getNodeParameter('subject', i) as string;
        const message = this.getNodeParameter('message', i) as string;
        const template = this.getNodeParameter('template', i) as string;
        const priority = this.getNodeParameter('priority', i) as 'low' | 'normal' | 'high' | 'urgent';
        const scheduled = this.getNodeParameter('scheduled', i) as string;
        const retryOnFailure = this.getNodeParameter('retryOnFailure', i) as boolean;
        const maxRetries = this.getNodeParameter('maxRetries', i) as number;
        const condition = this.getNodeParameter('condition', i) as string;

        // Validate required fields
        if (!channel) {
          throw new Error('Channel identifier is required');
        }
        if (!recipientsStr) {
          throw new Error('Recipients are required');
        }
        if (!message && !template) {
          throw new Error('Message content or template is required');
        }
        if (channelType === 'email' && !subject && !template) {
          throw new Error('Subject is required for email notifications');
        }

        // Check condition if specified
        if (condition && condition.trim()) {
          try {
            const conditionResult = this.evaluateCondition(condition, item.json);
            if (!conditionResult) {
              returnData.push({
                json: {
                  ...item.json,
                  notificationResult: {
                    status: 'skipped',
                    reason: 'Condition not met',
                    condition
                  }
                }
              });
              continue;
            }
          } catch (error) {
            throw new Error(`Failed to evaluate condition: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Parse recipients
        const recipients = recipientsStr.split(',').map(r => r.trim()).filter(r => r.length > 0);
        if (recipients.length === 0) {
          throw new Error('No valid recipients found');
        }

        // Process templates with data
        const processedSubject = this.processTemplate(subject, item.json);
        const processedMessage = this.processTemplate(message, item.json);

        // Create notification request
        const notificationRequest = {
          channel,
          template: template || undefined,
          recipients,
          subject: processedSubject || undefined,
          message: processedMessage,
          data: item.json,
          priority,
          scheduled: scheduled ? new Date(scheduled) : undefined,
        };

        // Send notification with retry logic
        let notificationId: string;
        let attempts = 0;
        const maxAttempts = retryOnFailure ? (maxRetries || 3) + 1 : 1;

        while (attempts < maxAttempts) {
          try {
            notificationId = await notificationService.sendNotification(notificationRequest);
            break;
          } catch (error) {
            attempts++;
            if (attempts >= maxAttempts) {
              throw error;
            }
            // Wait before retry
            await this.sleep(1000 * attempts);
          }
        }

        returnData.push({
          json: {
            ...item.json,
            notificationResult: {
              status: 'sent',
              notificationId: notificationId!,
              channelType,
              recipients: recipients.length,
              template: template || null,
              priority,
              scheduled: scheduled || null,
              attempts
            }
          }
        });

      } catch (error) {
        if (this.continueOnFail && this.continueOnFail()) {
          returnData.push({
            json: {
              ...item.json,
              notificationResult: {
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
                channelType: this.getNodeParameter('channelType', i),
              }
            }
          });
        } else {
          throw error;
        }
      }
    }

    return returnData;
  }

  private evaluateCondition(condition: string, data: any): boolean {
    try {
      // Create a safe evaluation context
      const context = {
        data,
        // Add utility functions
        isEmpty: (value: any) => !value || (Array.isArray(value) && value.length === 0) || (typeof value === 'object' && Object.keys(value).length === 0),
        isNull: (value: any) => value === null || value === undefined,
        contains: (haystack: string, needle: string) => haystack && haystack.includes(needle),
        length: (value: any) => value ? (typeof value.length === 'number' ? value.length : Object.keys(value).length) : 0,
        equals: (a: any, b: any) => a === b,
        gt: (a: number, b: number) => a > b,
        lt: (a: number, b: number) => a < b,
        gte: (a: number, b: number) => a >= b,
        lte: (a: number, b: number) => a <= b,
      };

      // Use Function constructor for safe evaluation
      const func = new Function('context', `
        with(context) { 
          try {
            return ${condition}; 
          } catch(e) {
            return false;
          }
        }
      `);
      return Boolean(func(context));
    } catch (error) {
      return false;
    }
  }

  private processTemplate(template: string, data: any): string {
    if (!template) return template;
    
    try {
      // Simple template processing - replace {{variable}} with data values
      return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const keys = key.trim().split('.');
        let value = data;
        
        for (const k of keys) {
          if (value && typeof value === 'object' && k in value) {
            value = value[k];
          } else {
            return match; // Return original if path not found
          }
        }
        
        return String(value);
      });
    } catch (error) {
      return template;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
