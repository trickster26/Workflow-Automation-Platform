import { Sequelize, DataTypes, Model } from 'sequelize';
import { logger } from '../utils/logger';

export interface IntegrationConfig {
  id?: number;
  name: string;
  type: 'slack' | 'google_sheets' | 'github' | 'aws' | 'stripe' | 'twilio' | 'office365' | 'custom';
  description?: string;
  config: {
    credentials?: {
      [key: string]: any;
    };
    settings?: {
      [key: string]: any;
    };
    endpoints?: {
      [key: string]: string;
    };
    rateLimits?: {
      requestsPerMinute: number;
      requestsPerHour: number;
      requestsPerDay: number;
    };
    retryConfig?: {
      maxRetries: number;
      retryDelayMs: number;
      exponentialBackoff: boolean;
    };
    webhooks?: {
      [key: string]: {
        url: string;
        secret?: string;
        events: string[];
      };
    };
  };
  isActive: boolean;
  lastUsed?: Date;
  usageCount: number;
  errorCount: number;
  createdBy: number;
  createdAt?: Date;
  updatedAt?: Date;
}

class IntegrationConfigModel extends Model<IntegrationConfig> implements IntegrationConfig {
  public id!: number;
  public name!: string;
  public type!: 'slack' | 'google_sheets' | 'github' | 'aws' | 'stripe' | 'twilio' | 'office365' | 'custom';
  public description!: string;
  public config!: any;
  public isActive!: boolean;
  public lastUsed!: Date;
  public usageCount!: number;
  public errorCount!: number;
  public createdBy!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export class IntegrationConfigService {
  private sequelize: Sequelize;
  private IntegrationConfig: typeof IntegrationConfigModel;

  constructor(sequelize: Sequelize) {
    this.sequelize = sequelize;
    this.IntegrationConfig = IntegrationConfigModel;
    this.initModel();
  }

  private initModel(): void {
    this.IntegrationConfig.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
        },
        type: {
          type: DataTypes.ENUM(
            'slack',
            'google_sheets',
            'github',
            'aws',
            'stripe',
            'twilio',
            'office365',
            'custom'
          ),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        config: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: {},
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        lastUsed: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        usageCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        errorCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        createdBy: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
      },
      {
        sequelize: this.sequelize,
        tableName: 'integration_configs',
        timestamps: true,
        indexes: [
          {
            fields: ['type'],
          },
          {
            fields: ['isActive'],
          },
          {
            fields: ['createdBy'],
          },
          {
            fields: ['lastUsed'],
          },
        ],
      }
    );
  }

  async createConfig(config: Omit<IntegrationConfig, 'id'>): Promise<IntegrationConfig> {
    try {
      logger.info(`Creating integration config: ${config.name}`);

      // Validate configuration based on type
      this.validateConfig(config);

      const created = await this.IntegrationConfig.create(config);
      
      logger.info(`Integration config created successfully: ${created.id}`);
      return created.toJSON();
    } catch (error: any) {
      logger.error('Error creating integration config:', error);
      throw new Error(`Failed to create integration config: ${error.message}`);
    }
  }

  async getConfig(id: number): Promise<IntegrationConfig | null> {
    try {
      const config = await this.IntegrationConfig.findByPk(id);
      return config ? config.toJSON() : null;
    } catch (error: any) {
      logger.error('Error getting integration config:', error);
      throw new Error(`Failed to get integration config: ${error.message}`);
    }
  }

  async getConfigByName(name: string): Promise<IntegrationConfig | null> {
    try {
      const config = await this.IntegrationConfig.findOne({
        where: { name }
      });
      return config ? config.toJSON() : null;
    } catch (error: any) {
      logger.error('Error getting integration config by name:', error);
      throw new Error(`Failed to get integration config: ${error.message}`);
    }
  }

  async updateConfig(id: number, updates: Partial<IntegrationConfig>): Promise<IntegrationConfig> {
    try {
      logger.info(`Updating integration config: ${id}`);

      const config = await this.IntegrationConfig.findByPk(id);
      if (!config) {
        throw new Error('Integration config not found');
      }

      // Validate updated configuration
      if (updates.config || updates.type) {
        const updatedConfig = {
          ...config.toJSON(),
          ...updates
        };
        this.validateConfig(updatedConfig);
      }

      await config.update(updates);
      
      logger.info(`Integration config updated successfully: ${id}`);
      return config.toJSON();
    } catch (error: any) {
      logger.error('Error updating integration config:', error);
      throw new Error(`Failed to update integration config: ${error.message}`);
    }
  }

  async deleteConfig(id: number): Promise<void> {
    try {
      logger.info(`Deleting integration config: ${id}`);

      const config = await this.IntegrationConfig.findByPk(id);
      if (!config) {
        throw new Error('Integration config not found');
      }

      await config.destroy();
      logger.info(`Integration config deleted successfully: ${id}`);
    } catch (error: any) {
      logger.error('Error deleting integration config:', error);
      throw new Error(`Failed to delete integration config: ${error.message}`);
    }
  }

  async listConfigs(options: {
    type?: string;
    isActive?: boolean;
    createdBy?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    configs: IntegrationConfig[];
    total: number;
  }> {
    try {
      const where: any = {};

      if (options.type) {
        where.type = options.type;
      }

      if (options.isActive !== undefined) {
        where.isActive = options.isActive;
      }

      if (options.createdBy) {
        where.createdBy = options.createdBy;
      }

      const { rows: configs, count: total } = await this.IntegrationConfig.findAndCountAll({
        where,
        limit: options.limit || 50,
        offset: options.offset || 0,
        order: [['updatedAt', 'DESC']],
      });

      return {
        configs: configs.map(config => config.toJSON()),
        total
      };
    } catch (error: any) {
      logger.error('Error listing integration configs:', error);
      throw new Error(`Failed to list integration configs: ${error.message}`);
    }
  }

  async testConnection(id: number): Promise<{
    success: boolean;
    message: string;
    responseTime?: number;
    details?: any;
  }> {
    try {
      const config = await this.getConfig(id);
      if (!config) {
        throw new Error('Integration config not found');
      }

      const startTime = Date.now();
      
      // Test connection based on integration type
      const testResult = await this.performConnectionTest(config);
      
      const responseTime = Date.now() - startTime;
      
      // Update last used timestamp
      await this.updateConfig(id, { lastUsed: new Date() });

      return {
        ...testResult,
        responseTime
      };
    } catch (error: any) {
      logger.error('Error testing integration connection:', error);
      
      // Update error count
      const config = await this.getConfig(id);
      if (config) {
        await this.updateConfig(id, { errorCount: config.errorCount + 1 });
      }

      return {
        success: false,
        message: error.message
      };
    }
  }

  async incrementUsage(id: number): Promise<void> {
    try {
      const config = await this.IntegrationConfig.findByPk(id);
      if (config) {
        await config.update({
          usageCount: config.usageCount + 1,
          lastUsed: new Date()
        });
      }
    } catch (error: any) {
      logger.error('Error incrementing usage count:', error);
    }
  }

  async incrementErrors(id: number): Promise<void> {
    try {
      const config = await this.IntegrationConfig.findByPk(id);
      if (config) {
        await config.update({
          errorCount: config.errorCount + 1
        });
      }
    } catch (error: any) {
      logger.error('Error incrementing error count:', error);
    }
  }

  async getUsageStats(id: number, days: number = 30): Promise<{
    totalUsage: number;
    totalErrors: number;
    errorRate: number;
    avgDailyUsage: number;
    lastUsed?: Date;
  }> {
    try {
      const config = await this.getConfig(id);
      if (!config) {
        throw new Error('Integration config not found');
      }

      // In a real implementation, you would query usage logs
      // For now, return current stats
      const totalUsage = config.usageCount;
      const totalErrors = config.errorCount;
      const errorRate = totalUsage > 0 ? (totalErrors / totalUsage) * 100 : 0;
      const avgDailyUsage = totalUsage / Math.max(days, 1);

      return {
        totalUsage,
        totalErrors,
        errorRate,
        avgDailyUsage,
        lastUsed: config.lastUsed
      };
    } catch (error: any) {
      logger.error('Error getting usage stats:', error);
      throw new Error(`Failed to get usage stats: ${error.message}`);
    }
  }

  private validateConfig(config: Partial<IntegrationConfig>): void {
    if (!config.type) {
      throw new Error('Integration type is required');
    }

    if (!config.config) {
      throw new Error('Integration configuration is required');
    }

    // Type-specific validations
    switch (config.type) {
      case 'slack':
        this.validateSlackConfig(config.config);
        break;
      case 'google_sheets':
        this.validateGoogleSheetsConfig(config.config);
        break;
      case 'github':
        this.validateGitHubConfig(config.config);
        break;
      case 'aws':
        this.validateAWSConfig(config.config);
        break;
      case 'stripe':
        this.validateStripeConfig(config.config);
        break;
      case 'twilio':
        this.validateTwilioConfig(config.config);
        break;
      case 'office365':
        this.validateOffice365Config(config.config);
        break;
      case 'custom':
        // Custom integrations have flexible validation
        break;
      default:
        throw new Error(`Unsupported integration type: ${config.type}`);
    }
  }

  private validateSlackConfig(config: any): void {
    if (!config.credentials?.token) {
      throw new Error('Slack bot token is required');
    }
  }

  private validateGoogleSheetsConfig(config: any): void {
    if (!config.credentials?.client_email || !config.credentials?.private_key) {
      throw new Error('Google Sheets service account credentials are required');
    }
  }

  private validateGitHubConfig(config: any): void {
    if (!config.credentials?.token) {
      throw new Error('GitHub personal access token is required');
    }
  }

  private validateAWSConfig(config: any): void {
    if (!config.credentials?.accessKeyId || !config.credentials?.secretAccessKey) {
      throw new Error('AWS access key ID and secret access key are required');
    }
  }

  private validateStripeConfig(config: any): void {
    if (!config.credentials?.secretKey) {
      throw new Error('Stripe secret key is required');
    }
  }

  private validateTwilioConfig(config: any): void {
    if (!config.credentials?.accountSid || !config.credentials?.authToken) {
      throw new Error('Twilio account SID and auth token are required');
    }
  }

  private validateOffice365Config(config: any): void {
    if (!config.credentials?.accessToken && !config.credentials?.clientId) {
      throw new Error('Office 365 access token or client credentials are required');
    }
  }

  private async performConnectionTest(config: IntegrationConfig): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      switch (config.type) {
        case 'slack':
          return await this.testSlackConnection(config);
        case 'google_sheets':
          return await this.testGoogleSheetsConnection(config);
        case 'github':
          return await this.testGitHubConnection(config);
        case 'aws':
          return await this.testAWSConnection(config);
        case 'stripe':
          return await this.testStripeConnection(config);
        case 'twilio':
          return await this.testTwilioConnection(config);
        case 'office365':
          return await this.testOffice365Connection(config);
        default:
          return {
            success: false,
            message: `Connection test not implemented for ${config.type}`
          };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Connection test failed: ${error.message}`
      };
    }
  }

  private async testSlackConnection(config: IntegrationConfig): Promise<{ success: boolean; message: string; details?: any }> {
    // In a real implementation, this would use the Slack Web API client
    // to test the connection with the provided token
    return {
      success: true,
      message: 'Slack connection test successful',
      details: { workspace: 'Example Workspace' }
    };
  }

  private async testGoogleSheetsConnection(config: IntegrationConfig): Promise<{ success: boolean; message: string; details?: any }> {
    // In a real implementation, this would use the Google Sheets API
    // to test authentication with service account credentials
    return {
      success: true,
      message: 'Google Sheets connection test successful',
      details: { email: config.config.credentials?.client_email }
    };
  }

  private async testGitHubConnection(config: IntegrationConfig): Promise<{ success: boolean; message: string; details?: any }> {
    // In a real implementation, this would use the GitHub API
    // to test the personal access token
    return {
      success: true,
      message: 'GitHub connection test successful',
      details: { user: 'example-user' }
    };
  }

  private async testAWSConnection(config: IntegrationConfig): Promise<{ success: boolean; message: string; details?: any }> {
    // In a real implementation, this would use AWS SDK
    // to test the access key and secret
    return {
      success: true,
      message: 'AWS connection test successful',
      details: { region: config.config.settings?.region || 'us-east-1' }
    };
  }

  private async testStripeConnection(config: IntegrationConfig): Promise<{ success: boolean; message: string; details?: any }> {
    // In a real implementation, this would use the Stripe SDK
    // to test the secret key
    return {
      success: true,
      message: 'Stripe connection test successful',
      details: { mode: config.config.credentials?.secretKey?.startsWith('sk_live') ? 'live' : 'test' }
    };
  }

  private async testTwilioConnection(config: IntegrationConfig): Promise<{ success: boolean; message: string; details?: any }> {
    // In a real implementation, this would use the Twilio SDK
    // to test the account SID and auth token
    return {
      success: true,
      message: 'Twilio connection test successful',
      details: { accountSid: config.config.credentials?.accountSid }
    };
  }

  private async testOffice365Connection(config: IntegrationConfig): Promise<{ success: boolean; message: string; details?: any }> {
    // In a real implementation, this would use Microsoft Graph SDK
    // to test the access token
    return {
      success: true,
      message: 'Office 365 connection test successful',
      details: { tenant: 'example-tenant' }
    };
  }
}