import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { IncomingWebhook } from '@slack/webhook';
import { Client } from 'discord.js';
import { Client as GraphClient } from '@microsoft/microsoft-graph-client';
import webpush from 'web-push';
import { createLogger } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';
import handlebars from 'handlebars';

export interface NotificationChannel {
  id: string;
  type: 'email' | 'sms' | 'slack' | 'discord' | 'teams' | 'push' | 'webhook';
  name: string;
  config: any;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'slack' | 'discord' | 'teams' | 'push';
  subject?: string;
  body: string;
  variables: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationRequest {
  channel: string;
  template?: string;
  recipients: string[];
  subject?: string;
  message: string;
  data?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduled?: Date;
  attachments?: Array<{
    filename: string;
    path: string;
    contentType?: string;
  }>;
}

export interface NotificationHistory {
  id: string;
  channel: string;
  channelType: string;
  recipients: string[];
  subject?: string;
  message: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sentAt?: Date;
  failureReason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export class NotificationService {
  private logger: Logger;
  private emailTransporter?: nodemailer.Transporter;
  private twilioClient?: twilio.Twilio;
  private discordClient?: Client;
  private graphClient?: GraphClient;
  private channels: Map<string, NotificationChannel> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private history: NotificationHistory[] = [];

  constructor() {
    this.logger = createLogger('NotificationService');
    this.initializeServices();
    this.loadTemplates();
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize email service
      if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        this.emailTransporter = nodemailer.createTransporter({
          host: process.env.EMAIL_HOST,
          port: parseInt(process.env.EMAIL_PORT || '587'),
          secure: process.env.EMAIL_SECURE === 'true',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
        this.logger.info('Email service initialized');
      }

      // Initialize Twilio SMS service
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        this.twilioClient = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        this.logger.info('Twilio SMS service initialized');
      }

      // Initialize Discord bot
      if (process.env.DISCORD_BOT_TOKEN) {
        this.discordClient = new Client({ 
          intents: ['Guilds', 'GuildMessages'] 
        });
        await this.discordClient.login(process.env.DISCORD_BOT_TOKEN);
        this.logger.info('Discord bot initialized');
      }

      // Initialize Microsoft Graph for Teams
      if (process.env.GRAPH_CLIENT_ID && process.env.GRAPH_CLIENT_SECRET) {
        this.graphClient = GraphClient.init({
          authProvider: {
            getAccessToken: async () => {
              // Implement OAuth2 flow for Graph API
              return process.env.GRAPH_ACCESS_TOKEN || '';
            }
          }
        });
        this.logger.info('Microsoft Graph client initialized');
      }

      // Initialize Web Push
      if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webpush.setVapidDetails(
          process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY
        );
        this.logger.info('Web Push service initialized');
      }

    } catch (error) {
      this.logger.error('Failed to initialize notification services:', error);
    }
  }

  private async loadTemplates(): Promise<void> {
    try {
      const templatesDir = path.join(process.cwd(), 'src', 'templates', 'notifications');
      
      try {
        await fs.mkdir(templatesDir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }

      // Create default templates if they don't exist
      await this.createDefaultTemplates(templatesDir);
      
      this.logger.info('Notification templates loaded');
    } catch (error) {
      this.logger.error('Failed to load templates:', error);
    }
  }

  private async createDefaultTemplates(templatesDir: string): Promise<void> {
    const defaultTemplates = [
      {
        id: 'workflow-success',
        name: 'Workflow Success',
        type: 'email' as const,
        subject: 'Workflow "{{workflowName}}" completed successfully',
        body: `
          <h2>Workflow Completed Successfully</h2>
          <p>Your workflow "<strong>{{workflowName}}</strong>" has completed successfully.</p>
          <ul>
            <li><strong>Execution ID:</strong> {{executionId}}</li>
            <li><strong>Started:</strong> {{startTime}}</li>
            <li><strong>Completed:</strong> {{endTime}}</li>
            <li><strong>Duration:</strong> {{duration}}</li>
            <li><strong>Nodes Executed:</strong> {{nodesCount}}</li>
          </ul>
          <p>You can view the full execution details in your dashboard.</p>
        `,
        variables: ['workflowName', 'executionId', 'startTime', 'endTime', 'duration', 'nodesCount']
      },
      {
        id: 'workflow-failed',
        name: 'Workflow Failed',
        type: 'email' as const,
        subject: 'Workflow "{{workflowName}}" failed',
        body: `
          <h2>Workflow Failed</h2>
          <p>Your workflow "<strong>{{workflowName}}</strong>" has failed during execution.</p>
          <ul>
            <li><strong>Execution ID:</strong> {{executionId}}</li>
            <li><strong>Started:</strong> {{startTime}}</li>
            <li><strong>Failed:</strong> {{failTime}}</li>
            <li><strong>Error:</strong> {{errorMessage}}</li>
            <li><strong>Failed Node:</strong> {{failedNode}}</li>
          </ul>
          <p>Please check your workflow configuration and try again.</p>
        `,
        variables: ['workflowName', 'executionId', 'startTime', 'failTime', 'errorMessage', 'failedNode']
      },
      {
        id: 'system-alert',
        name: 'System Alert',
        type: 'slack' as const,
        body: `
🚨 *System Alert*
*Type:* {{alertType}}
*Message:* {{message}}
*Time:* {{timestamp}}
{{#if details}}*Details:* {{details}}{{/if}}
        `,
        variables: ['alertType', 'message', 'timestamp', 'details']
      }
    ];

    for (const template of defaultTemplates) {
      this.templates.set(template.id, {
        ...template,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  async sendNotification(request: NotificationRequest): Promise<string> {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const historyEntry: NotificationHistory = {
      id: notificationId,
      channel: request.channel,
      channelType: this.getChannelType(request.channel),
      recipients: request.recipients,
      subject: request.subject,
      message: request.message,
      status: 'pending',
      createdAt: new Date(),
      metadata: {
        template: request.template,
        priority: request.priority,
        scheduled: request.scheduled
      }
    };

    this.history.push(historyEntry);

    try {
      // If scheduled, handle later (in real implementation, use job queue)
      if (request.scheduled && request.scheduled > new Date()) {
        this.logger.info(`Notification ${notificationId} scheduled for ${request.scheduled}`);
        return notificationId;
      }

      // Process template if provided
      let finalMessage = request.message;
      let finalSubject = request.subject;

      if (request.template && this.templates.has(request.template)) {
        const template = this.templates.get(request.template)!;
        const compiledBody = handlebars.compile(template.body);
        const compiledSubject = template.subject ? handlebars.compile(template.subject) : null;
        
        finalMessage = compiledBody(request.data || {});
        if (compiledSubject) {
          finalSubject = compiledSubject(request.data || {});
        }
      }

      // Send via appropriate channel
      const channelType = this.getChannelType(request.channel);
      
      switch (channelType) {
        case 'email':
          await this.sendEmailNotification(request.recipients, finalSubject || '', finalMessage, request.attachments);
          break;
        case 'sms':
          await this.sendSMSNotification(request.recipients, finalMessage);
          break;
        case 'slack':
          await this.sendSlackNotification(request.channel, finalMessage);
          break;
        case 'discord':
          await this.sendDiscordNotification(request.channel, finalMessage);
          break;
        case 'teams':
          await this.sendTeamsNotification(request.channel, finalMessage);
          break;
        case 'push':
          await this.sendPushNotification(request.recipients, finalSubject || '', finalMessage);
          break;
        default:
          throw new Error(`Unsupported channel type: ${channelType}`);
      }

      // Update history
      const historyIndex = this.history.findIndex(h => h.id === notificationId);
      if (historyIndex !== -1) {
        this.history[historyIndex].status = 'sent';
        this.history[historyIndex].sentAt = new Date();
      }

      this.logger.info(`Notification ${notificationId} sent successfully via ${channelType}`);
      return notificationId;

    } catch (error) {
      this.logger.error(`Failed to send notification ${notificationId}:`, error);
      
      // Update history with failure
      const historyIndex = this.history.findIndex(h => h.id === notificationId);
      if (historyIndex !== -1) {
        this.history[historyIndex].status = 'failed';
        this.history[historyIndex].failureReason = error instanceof Error ? error.message : 'Unknown error';
      }

      throw error;
    }
  }

  private async sendEmailNotification(
    recipients: string[], 
    subject: string, 
    message: string, 
    attachments?: Array<{filename: string; path: string; contentType?: string}>
  ): Promise<void> {
    if (!this.emailTransporter) {
      throw new Error('Email service not configured');
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: recipients.join(', '),
      subject,
      html: message,
      attachments: attachments?.map(att => ({
        filename: att.filename,
        path: att.path,
        contentType: att.contentType
      }))
    };

    await this.emailTransporter.sendMail(mailOptions);
  }

  private async sendSMSNotification(recipients: string[], message: string): Promise<void> {
    if (!this.twilioClient) {
      throw new Error('SMS service not configured');
    }

    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!fromNumber) {
      throw new Error('Twilio phone number not configured');
    }

    for (const recipient of recipients) {
      await this.twilioClient.messages.create({
        body: message,
        from: fromNumber,
        to: recipient
      });
    }
  }

  private async sendSlackNotification(webhookUrl: string, message: string): Promise<void> {
    const webhook = new IncomingWebhook(webhookUrl);
    await webhook.send({
      text: message,
      mrkdwn: true
    });
  }

  private async sendDiscordNotification(channelId: string, message: string): Promise<void> {
    if (!this.discordClient || !this.discordClient.isReady()) {
      throw new Error('Discord bot not configured or ready');
    }

    const channel = await this.discordClient.channels.fetch(channelId);
    if (channel && channel.isTextBased()) {
      await channel.send(message);
    } else {
      throw new Error('Invalid Discord channel');
    }
  }

  private async sendTeamsNotification(webhookUrl: string, message: string): Promise<void> {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: message
      })
    });

    if (!response.ok) {
      throw new Error(`Teams webhook failed: ${response.statusText}`);
    }
  }

  private async sendPushNotification(subscriptions: string[], title: string, message: string): Promise<void> {
    for (const subscription of subscriptions) {
      try {
        const parsedSubscription = JSON.parse(subscription);
        await webpush.sendNotification(parsedSubscription, JSON.stringify({
          title,
          body: message,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png'
        }));
      } catch (error) {
        this.logger.error('Failed to send push notification:', error);
      }
    }
  }

  private getChannelType(channelIdentifier: string): string {
    // Determine channel type from identifier
    if (channelIdentifier.includes('@') && !channelIdentifier.startsWith('http')) {
      return 'email';
    }
    if (channelIdentifier.startsWith('+') || /^\d+$/.test(channelIdentifier)) {
      return 'sms';
    }
    if (channelIdentifier.includes('slack.com')) {
      return 'slack';
    }
    if (channelIdentifier.includes('discord')) {
      return 'discord';
    }
    if (channelIdentifier.includes('teams') || channelIdentifier.includes('office.com')) {
      return 'teams';
    }
    if (channelIdentifier.startsWith('{')) {
      return 'push'; // JSON subscription
    }
    return 'webhook';
  }

  // Template management
  async createTemplate(template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newTemplate: NotificationTemplate = {
      ...template,
      id: templateId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.templates.set(templateId, newTemplate);
    this.logger.info(`Notification template ${templateId} created`);
    return templateId;
  }

  async getTemplate(templateId: string): Promise<NotificationTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  async listTemplates(): Promise<NotificationTemplate[]> {
    return Array.from(this.templates.values());
  }

  async updateTemplate(templateId: string, updates: Partial<NotificationTemplate>): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const updatedTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date()
    };

    this.templates.set(templateId, updatedTemplate);
    this.logger.info(`Notification template ${templateId} updated`);
  }

  async deleteTemplate(templateId: string): Promise<void> {
    if (!this.templates.has(templateId)) {
      throw new Error(`Template ${templateId} not found`);
    }

    this.templates.delete(templateId);
    this.logger.info(`Notification template ${templateId} deleted`);
  }

  // Channel management
  async createChannel(channel: Omit<NotificationChannel, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const channelId = `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newChannel: NotificationChannel = {
      ...channel,
      id: channelId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.channels.set(channelId, newChannel);
    this.logger.info(`Notification channel ${channelId} created`);
    return channelId;
  }

  async listChannels(): Promise<NotificationChannel[]> {
    return Array.from(this.channels.values());
  }

  async getChannel(channelId: string): Promise<NotificationChannel | null> {
    return this.channels.get(channelId) || null;
  }

  // History and analytics
  async getNotificationHistory(limit?: number, offset?: number): Promise<{
    notifications: NotificationHistory[];
    total: number;
    stats: {
      sent: number;
      failed: number;
      pending: number;
    };
  }> {
    const start = offset || 0;
    const end = limit ? start + limit : undefined;
    const notifications = this.history.slice(start, end);

    const stats = {
      sent: this.history.filter(h => h.status === 'sent').length,
      failed: this.history.filter(h => h.status === 'failed').length,
      pending: this.history.filter(h => h.status === 'pending').length
    };

    return {
      notifications,
      total: this.history.length,
      stats
    };
  }

  async getNotificationStats(days: number = 7): Promise<{
    totalSent: number;
    totalFailed: number;
    successRate: number;
    channelBreakdown: Record<string, number>;
    dailyStats: Array<{
      date: string;
      sent: number;
      failed: number;
    }>;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentNotifications = this.history.filter(h => h.createdAt >= cutoffDate);
    
    const totalSent = recentNotifications.filter(h => h.status === 'sent').length;
    const totalFailed = recentNotifications.filter(h => h.status === 'failed').length;
    const successRate = totalSent + totalFailed > 0 ? totalSent / (totalSent + totalFailed) : 0;

    const channelBreakdown: Record<string, number> = {};
    recentNotifications.forEach(h => {
      channelBreakdown[h.channelType] = (channelBreakdown[h.channelType] || 0) + 1;
    });

    // Generate daily stats
    const dailyStats: Array<{date: string; sent: number; failed: number}> = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayNotifications = recentNotifications.filter(h => 
        h.createdAt.toISOString().split('T')[0] === dateStr
      );

      dailyStats.push({
        date: dateStr,
        sent: dayNotifications.filter(h => h.status === 'sent').length,
        failed: dayNotifications.filter(h => h.status === 'failed').length
      });
    }

    return {
      totalSent,
      totalFailed,
      successRate,
      channelBreakdown,
      dailyStats: dailyStats.reverse()
    };
  }
}

export const notificationService = new NotificationService();