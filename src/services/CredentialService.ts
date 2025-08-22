import { EventEmitter } from 'events';
import { Sequelize, DataTypes, Model } from 'sequelize';
import crypto from 'crypto';
import { db } from '../config/database';
import { createLogger } from '../utils/logger';
import config from '../config';

const logger = createLogger('CredentialService');

export interface ICredential {
  id: string;
  name: string;
  type: string;
  data: Record<string, any>;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICredentialType {
  name: string;
  displayName: string;
  documentationUrl?: string;
  properties: ICredentialProperty[];
  authenticate?: IAuthenticate;
  test?: ICredentialTest;
}

export interface ICredentialProperty {
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'options' | 'password';
  typeOptions?: {
    password?: boolean;
    multipleValues?: boolean;
    loadOptionsMethod?: string;
  };
  default?: any;
  required?: boolean;
  displayOptions?: {
    show?: Record<string, any>;
    hide?: Record<string, any>;
  };
  options?: Array<{
    name: string;
    value: string | number;
    description?: string;
  }>;
  placeholder?: string;
  description?: string;
}

export interface IAuthenticate {
  type: 'generic' | 'oauth1' | 'oauth2' | 'httpBasicAuth' | 'httpHeaderAuth';
  properties: Record<string, any>;
}

export interface ICredentialTest {
  request: {
    baseURL?: string;
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  };
  rules: Array<{
    type: 'responseSuccessBody' | 'responseCode';
    properties: Record<string, any>;
  }>;
}

class CredentialModel extends Model<ICredential> implements ICredential {
  public id!: string;
  public name!: string;
  public type!: string;
  public data!: Record<string, any>;
  public userId!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}

export class CredentialService extends EventEmitter {
  private static instance: CredentialService;
  private credentialTypes: Map<string, ICredentialType> = new Map();
  private encryptionKey: string;

  private constructor() {
    super();
    this.encryptionKey = config.jwtSecret; // Use JWT secret as encryption key
    this.initializeModel();
    this.registerBuiltInCredentialTypes();
  }

  public static getInstance(): CredentialService {
    if (!CredentialService.instance) {
      CredentialService.instance = new CredentialService();
    }
    return CredentialService.instance;
  }

  private initializeModel(): void {
    CredentialModel.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        type: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        data: {
          type: DataTypes.TEXT,
          allowNull: false,
          get() {
            const encryptedData = this.getDataValue('data');
            return this.decrypt(encryptedData);
          },
          set(value: Record<string, any>) {
            const encryptedData = this.encrypt(JSON.stringify(value));
            this.setDataValue('data', encryptedData);
          },
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
      },
      {
        sequelize: db.getSequelize(),
        modelName: 'Credential',
        tableName: 'credentials',
        timestamps: true,
        indexes: [
          {
            fields: ['userId'],
          },
          {
            fields: ['type'],
          },
        ],
      }
    );
  }

  private encrypt(text: string): string {
    const algorithm = 'aes-256-ctr';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, this.encryptionKey);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): Record<string, any> {
    try {
      const algorithm = 'aes-256-ctr';
      const parts = encryptedText.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      const decipher = crypto.createDecipher(algorithm, this.encryptionKey);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Error decrypting credential data:', error);
      return {};
    }
  }

  public registerCredentialType(credentialType: ICredentialType): void {
    this.credentialTypes.set(credentialType.name, credentialType);
    logger.info(`Registered credential type: ${credentialType.name}`);
  }

  public getCredentialType(name: string): ICredentialType | undefined {
    return this.credentialTypes.get(name);
  }

  public getAllCredentialTypes(): ICredentialType[] {
    return Array.from(this.credentialTypes.values());
  }

  public async createCredential(
    name: string,
    type: string,
    data: Record<string, any>,
    userId: string
  ): Promise<ICredential> {
    const credentialType = this.credentialTypes.get(type);
    if (!credentialType) {
      throw new Error(`Unknown credential type: ${type}`);
    }

    // Validate credential data
    await this.validateCredentialData(credentialType, data);

    const credential = await CredentialModel.create({
      name,
      type,
      data,
      userId,
    });

    logger.info(`Created credential: ${name} (${type})`, {
      credentialId: credential.id,
      userId,
    });

    return credential.toJSON() as ICredential;
  }

  public async getCredential(credentialId: string, userId?: string): Promise<Record<string, any>> {
    const whereClause: any = { id: credentialId };
    if (userId) {
      whereClause.userId = userId;
    }

    const credential = await CredentialModel.findOne({ where: whereClause });
    if (!credential) {
      throw new Error(`Credential ${credentialId} not found`);
    }

    return credential.data;
  }

  public async getUserCredentials(userId: string): Promise<ICredential[]> {
    const credentials = await CredentialModel.findAll({
      where: { userId },
      order: [['updatedAt', 'DESC']],
    });

    return credentials.map(c => ({
      ...c.toJSON(),
      data: {}, // Don't expose actual credential data in list
    })) as ICredential[];
  }

  public async updateCredential(
    credentialId: string,
    updates: Partial<ICredential>,
    userId: string
  ): Promise<ICredential> {
    const credential = await CredentialModel.findOne({
      where: { id: credentialId, userId },
    });

    if (!credential) {
      throw new Error(`Credential ${credentialId} not found`);
    }

    if (updates.data && updates.type) {
      const credentialType = this.credentialTypes.get(updates.type);
      if (credentialType) {
        await this.validateCredentialData(credentialType, updates.data);
      }
    }

    await credential.update(updates);

    logger.info(`Updated credential: ${credentialId}`, { userId });

    return credential.toJSON() as ICredential;
  }

  public async deleteCredential(credentialId: string, userId: string): Promise<void> {
    const deleted = await CredentialModel.destroy({
      where: { id: credentialId, userId },
    });

    if (deleted === 0) {
      throw new Error(`Credential ${credentialId} not found`);
    }

    logger.info(`Deleted credential: ${credentialId}`, { userId });
  }

  public async testCredential(
    type: string,
    data: Record<string, any>
  ): Promise<{ success: boolean; message?: string }> {
    const credentialType = this.credentialTypes.get(type);
    if (!credentialType || !credentialType.test) {
      return { success: true, message: 'No test available for this credential type' };
    }

    try {
      const testResult = await this.executeCredentialTest(credentialType, data);
      return { success: testResult, message: testResult ? 'Test successful' : 'Test failed' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  private async validateCredentialData(
    credentialType: ICredentialType,
    data: Record<string, any>
  ): Promise<void> {
    for (const property of credentialType.properties) {
      if (property.required && (data[property.name] === undefined || data[property.name] === null)) {
        throw new Error(`Required property "${property.displayName}" is missing`);
      }
    }
  }

  private async executeCredentialTest(
    credentialType: ICredentialType,
    data: Record<string, any>
  ): Promise<boolean> {
    const test = credentialType.test!;
    const axios = require('axios');

    try {
      const requestConfig = {
        method: test.request.method || 'GET',
        url: test.request.url,
        baseURL: test.request.baseURL,
        headers: test.request.headers || {},
        data: test.request.body,
      };

      // Apply authentication
      if (credentialType.authenticate) {
        this.applyAuthentication(requestConfig, credentialType.authenticate, data);
      }

      const response = await axios(requestConfig);

      // Check test rules
      for (const rule of test.rules) {
        switch (rule.type) {
          case 'responseCode':
            if (response.status !== rule.properties.value) {
              return false;
            }
            break;
          case 'responseSuccessBody':
            if (!response.data || typeof response.data !== 'object') {
              return false;
            }
            break;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  private applyAuthentication(
    requestConfig: any,
    authenticate: IAuthenticate,
    data: Record<string, any>
  ): void {
    switch (authenticate.type) {
      case 'httpBasicAuth':
        const username = data.username || data.user;
        const password = data.password;
        if (username && password) {
          const auth = Buffer.from(`${username}:${password}`).toString('base64');
          requestConfig.headers.Authorization = `Basic ${auth}`;
        }
        break;

      case 'httpHeaderAuth':
        const headerName = authenticate.properties.name || 'Authorization';
        const headerValue = data.token || data.apiKey || data.key;
        if (headerValue) {
          requestConfig.headers[headerName] = headerValue;
        }
        break;

      case 'oauth2':
        const accessToken = data.accessToken || data.access_token;
        if (accessToken) {
          requestConfig.headers.Authorization = `Bearer ${accessToken}`;
        }
        break;
    }
  }

  private registerBuiltInCredentialTypes(): void {
    // HTTP Basic Auth
    this.registerCredentialType({
      name: 'httpBasicAuth',
      displayName: 'HTTP Basic Auth',
      documentationUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Authentication',
      properties: [
        {
          name: 'username',
          displayName: 'Username',
          type: 'string',
          required: true,
        },
        {
          name: 'password',
          displayName: 'Password',
          type: 'password',
          typeOptions: { password: true },
          required: true,
        },
      ],
      authenticate: {
        type: 'httpBasicAuth',
        properties: {},
      },
    });

    // API Key
    this.registerCredentialType({
      name: 'httpHeaderAuth',
      displayName: 'Header Auth',
      properties: [
        {
          name: 'name',
          displayName: 'Header Name',
          type: 'string',
          default: 'Authorization',
          required: true,
        },
        {
          name: 'value',
          displayName: 'Header Value',
          type: 'password',
          typeOptions: { password: true },
          required: true,
        },
      ],
      authenticate: {
        type: 'httpHeaderAuth',
        properties: {},
      },
    });

    // Generic API Key
    this.registerCredentialType({
      name: 'genericApi',
      displayName: 'Generic API',
      properties: [
        {
          name: 'apiKey',
          displayName: 'API Key',
          type: 'password',
          typeOptions: { password: true },
          required: true,
        },
      ],
      authenticate: {
        type: 'httpHeaderAuth',
        properties: { name: 'Authorization' },
      },
    });

    // SMTP Credentials
    this.registerCredentialType({
      name: 'smtp',
      displayName: 'SMTP',
      properties: [
        {
          name: 'host',
          displayName: 'Host',
          type: 'string',
          required: true,
        },
        {
          name: 'port',
          displayName: 'Port',
          type: 'number',
          default: 587,
          required: true,
        },
        {
          name: 'secure',
          displayName: 'Use SSL/TLS',
          type: 'boolean',
          default: false,
        },
        {
          name: 'username',
          displayName: 'Username',
          type: 'string',
          required: true,
        },
        {
          name: 'password',
          displayName: 'Password',
          type: 'password',
          typeOptions: { password: true },
          required: true,
        },
      ],
      test: {
        request: {
          method: 'POST',
          url: '/test-connection',
        },
        rules: [
          {
            type: 'responseCode',
            properties: { value: 200 },
          },
        ],
      },
    });

    // Database Credentials
    this.registerCredentialType({
      name: 'database',
      displayName: 'Database',
      properties: [
        {
          name: 'type',
          displayName: 'Database Type',
          type: 'options',
          options: [
            { name: 'PostgreSQL', value: 'postgres' },
            { name: 'MySQL', value: 'mysql' },
            { name: 'MongoDB', value: 'mongodb' },
            { name: 'SQLite', value: 'sqlite' },
          ],
          required: true,
        },
        {
          name: 'host',
          displayName: 'Host',
          type: 'string',
          default: 'localhost',
          required: true,
        },
        {
          name: 'port',
          displayName: 'Port',
          type: 'number',
          required: true,
        },
        {
          name: 'database',
          displayName: 'Database Name',
          type: 'string',
          required: true,
        },
        {
          name: 'username',
          displayName: 'Username',
          type: 'string',
          required: true,
        },
        {
          name: 'password',
          displayName: 'Password',
          type: 'password',
          typeOptions: { password: true },
          required: true,
        },
      ],
    });

    logger.info(`Registered ${this.credentialTypes.size} built-in credential types`);
  }
}

export const credentialService = CredentialService.getInstance();