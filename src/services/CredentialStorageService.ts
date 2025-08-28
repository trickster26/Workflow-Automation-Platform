import crypto from 'crypto';
import { ICredential } from '../models/Credential';
import { createLogger } from '../utils/logger';
import { Op } from 'sequelize';
import axios from 'axios';
import { Client as SSHClient } from 'ssh2';
import mysql from 'mysql2/promise';
import { Client as PgClient } from 'pg';
import { MongoClient } from 'mongodb';
import Redis from 'redis';

interface CredentialType {
  type: string;
  name: string;
  description: string;
  fields: CredentialField[];
  icon?: string;
  testable: boolean;
}

interface CredentialField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'textarea' | 'select' | 'number';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  help?: string;
  encrypted?: boolean;
}

interface DecryptedCredential {
  [key: string]: any;
}

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

export class CredentialStorageService {
  private logger: Logger;
  private encryptionKey: Buffer;
  private algorithm = 'aes-256-gcm';
  private credentialTypes: Map<string, CredentialType>;

  constructor() {
    this.logger = createLogger('CredentialStorageService');
    
    // Use environment variable or generate a key (in production, always use env variable)
    const key = process.env.CREDENTIAL_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    this.encryptionKey = Buffer.from(key, 'hex');
    
    this.credentialTypes = this.initializeCredentialTypes();
  }

  private initializeCredentialTypes(): Map<string, CredentialType> {
    const types = new Map<string, CredentialType>();

    // API Key
    types.set('api_key', {
      type: 'api_key',
      name: 'API Key',
      description: 'Simple API key authentication',
      testable: true,
      fields: [
        {
          name: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: true,
          placeholder: 'Enter your API key',
          encrypted: true,
        },
        {
          name: 'headerName',
          label: 'Header Name',
          type: 'text',
          required: false,
          placeholder: 'X-API-Key (optional)',
          help: 'Custom header name for the API key',
        },
        {
          name: 'testUrl',
          label: 'Test URL',
          type: 'text',
          required: false,
          placeholder: 'https://api.example.com/test',
          help: 'URL to test the API key',
        },
      ],
    });

    // OAuth 2.0
    types.set('oauth2', {
      type: 'oauth2',
      name: 'OAuth 2.0',
      description: 'OAuth 2.0 authentication',
      testable: true,
      fields: [
        {
          name: 'clientId',
          label: 'Client ID',
          type: 'text',
          required: true,
          placeholder: 'Your OAuth client ID',
        },
        {
          name: 'clientSecret',
          label: 'Client Secret',
          type: 'password',
          required: true,
          placeholder: 'Your OAuth client secret',
          encrypted: true,
        },
        {
          name: 'accessToken',
          label: 'Access Token',
          type: 'password',
          required: false,
          placeholder: 'Current access token',
          encrypted: true,
        },
        {
          name: 'refreshToken',
          label: 'Refresh Token',
          type: 'password',
          required: false,
          placeholder: 'Refresh token',
          encrypted: true,
        },
        {
          name: 'tokenUrl',
          label: 'Token URL',
          type: 'text',
          required: true,
          placeholder: 'https://oauth.example.com/token',
        },
        {
          name: 'authUrl',
          label: 'Authorization URL',
          type: 'text',
          required: false,
          placeholder: 'https://oauth.example.com/authorize',
        },
        {
          name: 'scope',
          label: 'Scope',
          type: 'text',
          required: false,
          placeholder: 'read write',
          help: 'Space-separated list of scopes',
        },
      ],
    });

    // Basic Authentication
    types.set('basic_auth', {
      type: 'basic_auth',
      name: 'Basic Authentication',
      description: 'Username and password authentication',
      testable: true,
      fields: [
        {
          name: 'username',
          label: 'Username',
          type: 'text',
          required: true,
          placeholder: 'Your username',
        },
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          required: true,
          placeholder: 'Your password',
          encrypted: true,
        },
        {
          name: 'testUrl',
          label: 'Test URL',
          type: 'text',
          required: false,
          placeholder: 'https://api.example.com/test',
          help: 'URL to test the credentials',
        },
      ],
    });

    // Database Credentials
    types.set('database', {
      type: 'database',
      name: 'Database',
      description: 'Database connection credentials',
      testable: true,
      fields: [
        {
          name: 'dbType',
          label: 'Database Type',
          type: 'select',
          required: true,
          options: [
            { value: 'mysql', label: 'MySQL' },
            { value: 'postgresql', label: 'PostgreSQL' },
            { value: 'mongodb', label: 'MongoDB' },
            { value: 'redis', label: 'Redis' },
            { value: 'mssql', label: 'SQL Server' },
          ],
        },
        {
          name: 'host',
          label: 'Host',
          type: 'text',
          required: true,
          placeholder: 'localhost or database.example.com',
        },
        {
          name: 'port',
          label: 'Port',
          type: 'number',
          required: true,
          placeholder: '3306',
        },
        {
          name: 'database',
          label: 'Database Name',
          type: 'text',
          required: false,
          placeholder: 'my_database',
        },
        {
          name: 'username',
          label: 'Username',
          type: 'text',
          required: true,
          placeholder: 'db_user',
        },
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          required: true,
          placeholder: 'Database password',
          encrypted: true,
        },
        {
          name: 'ssl',
          label: 'Use SSL',
          type: 'select',
          required: false,
          options: [
            { value: 'false', label: 'No' },
            { value: 'true', label: 'Yes' },
          ],
        },
      ],
    });

    // SMTP/Email Credentials
    types.set('smtp', {
      type: 'smtp',
      name: 'SMTP',
      description: 'SMTP server credentials for sending emails',
      testable: true,
      fields: [
        {
          name: 'host',
          label: 'SMTP Host',
          type: 'text',
          required: true,
          placeholder: 'smtp.gmail.com',
        },
        {
          name: 'port',
          label: 'Port',
          type: 'number',
          required: true,
          placeholder: '587',
        },
        {
          name: 'secure',
          label: 'Use SSL/TLS',
          type: 'select',
          required: true,
          options: [
            { value: 'false', label: 'No (STARTTLS)' },
            { value: 'true', label: 'Yes (SSL/TLS)' },
          ],
        },
        {
          name: 'username',
          label: 'Username',
          type: 'text',
          required: true,
          placeholder: 'your-email@gmail.com',
        },
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          required: true,
          placeholder: 'Your email password or app password',
          encrypted: true,
        },
        {
          name: 'fromName',
          label: 'From Name',
          type: 'text',
          required: false,
          placeholder: 'Your Name',
          help: 'Display name for outgoing emails',
        },
      ],
    });

    // SSH Credentials
    types.set('ssh', {
      type: 'ssh',
      name: 'SSH',
      description: 'SSH connection credentials',
      testable: true,
      fields: [
        {
          name: 'host',
          label: 'Host',
          type: 'text',
          required: true,
          placeholder: 'server.example.com',
        },
        {
          name: 'port',
          label: 'Port',
          type: 'number',
          required: false,
          placeholder: '22',
        },
        {
          name: 'username',
          label: 'Username',
          type: 'text',
          required: true,
          placeholder: 'ssh_user',
        },
        {
          name: 'authType',
          label: 'Authentication Type',
          type: 'select',
          required: true,
          options: [
            { value: 'password', label: 'Password' },
            { value: 'privateKey', label: 'Private Key' },
          ],
        },
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          required: false,
          placeholder: 'SSH password',
          encrypted: true,
          help: 'Required if using password authentication',
        },
        {
          name: 'privateKey',
          label: 'Private Key',
          type: 'textarea',
          required: false,
          placeholder: '-----BEGIN RSA PRIVATE KEY-----\n...',
          encrypted: true,
          help: 'Required if using private key authentication',
        },
        {
          name: 'passphrase',
          label: 'Key Passphrase',
          type: 'password',
          required: false,
          placeholder: 'Private key passphrase (if applicable)',
          encrypted: true,
        },
      ],
    });

    // AWS Credentials
    types.set('aws', {
      type: 'aws',
      name: 'AWS',
      description: 'Amazon Web Services credentials',
      testable: true,
      fields: [
        {
          name: 'accessKeyId',
          label: 'Access Key ID',
          type: 'text',
          required: true,
          placeholder: 'AKIAIOSFODNN7EXAMPLE',
        },
        {
          name: 'secretAccessKey',
          label: 'Secret Access Key',
          type: 'password',
          required: true,
          placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          encrypted: true,
        },
        {
          name: 'region',
          label: 'Region',
          type: 'select',
          required: true,
          options: [
            { value: 'us-east-1', label: 'US East (N. Virginia)' },
            { value: 'us-west-2', label: 'US West (Oregon)' },
            { value: 'eu-west-1', label: 'EU (Ireland)' },
            { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
            { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
          ],
        },
        {
          name: 'sessionToken',
          label: 'Session Token',
          type: 'password',
          required: false,
          placeholder: 'Temporary session token (optional)',
          encrypted: true,
        },
      ],
    });

    // Custom Credentials
    types.set('custom', {
      type: 'custom',
      name: 'Custom',
      description: 'Custom credential configuration',
      testable: false,
      fields: [
        {
          name: 'data',
          label: 'Credential Data',
          type: 'textarea',
          required: true,
          placeholder: 'Enter JSON formatted credential data',
          encrypted: true,
          help: 'Provide credentials in JSON format',
        },
      ],
    });

    return types;
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  async createCredential(
    userId: string,
    name: string,
    type: ICredential['type'],
    data: any,
    description?: string,
    tags?: string[]
  ): Promise<ICredential> {
    try {
      // Validate credential type
      if (!this.credentialTypes.has(type)) {
        throw new Error(`Invalid credential type: ${type}`);
      }

      // Check for duplicate name
      const existing = await Credential.findOne({
        where: { userId, name },
      });

      if (existing) {
        throw new Error(`Credential with name "${name}" already exists`);
      }

      // Encrypt sensitive fields
      const encryptedData = this.encryptCredentialData(type, data);

      // Create credential
      const credential = await Credential.create({
        userId,
        name,
        type,
        description,
        encryptedData,
        isShared: false,
        isValid: true,
        tags,
        metadata: {
          createdBy: userId,
          lastModifiedBy: userId,
        },
      });

      // Test credential if possible
      if (this.credentialTypes.get(type)?.testable) {
        const testResult = await this.testCredential(credential.id);
        if (testResult.success) {
          await credential.update({
            validatedAt: new Date(),
            isValid: true,
          });
        }
      }

      this.logger.info(`Created credential: ${credential.id}`);
      return credential;
    } catch (error) {
      this.logger.error('Failed to create credential:', error);
      throw error;
    }
  }

  private encryptCredentialData(type: string, data: any): string {
    const credentialType = this.credentialTypes.get(type);
    if (!credentialType) {
      throw new Error(`Invalid credential type: ${type}`);
    }

    const dataToEncrypt: any = {};
    
    // Process each field
    credentialType.fields.forEach(field => {
      if (data[field.name] !== undefined) {
        if (field.encrypted) {
          // Field will be encrypted with the entire object
          dataToEncrypt[field.name] = data[field.name];
        } else {
          // Non-sensitive fields stored as-is
          dataToEncrypt[field.name] = data[field.name];
        }
      }
    });

    return this.encrypt(JSON.stringify(dataToEncrypt));
  }

  async getCredential(credentialId: string, userId: string): Promise<ICredential | null> {
    try {
      const credential = await Credential.findOne({
        where: {
          id: credentialId,
          [Op.or]: [
            { userId },
            { isShared: true, sharedWith: { [Op.contains]: [userId] } },
          ],
        },
      });

      if (credential) {
        // Update last used timestamp
        await credential.update({ lastUsed: new Date() });
      }

      return credential;
    } catch (error) {
      this.logger.error('Failed to get credential:', error);
      throw error;
    }
  }

  async getDecryptedCredential(credentialId: string, userId: string): Promise<DecryptedCredential | null> {
    try {
      const credential = await this.getCredential(credentialId, userId);
      if (!credential) {
        return null;
      }

      const decrypted = this.decrypt(credential.encryptedData);
      return JSON.parse(decrypted);
    } catch (error) {
      this.logger.error('Failed to decrypt credential:', error);
      throw error;
    }
  }

  async updateCredential(
    credentialId: string,
    userId: string,
    updates: Partial<{
      name: string;
      description: string;
      data: any;
      tags: string[];
    }>
  ): Promise<ICredential> {
    try {
      const credential = await Credential.findOne({
        where: { id: credentialId, userId },
      });

      if (!credential) {
        throw new Error('Credential not found or access denied');
      }

      const updateData: any = {
        metadata: {
          ...credential.metadata,
          lastModifiedBy: userId,
          lastModifiedAt: new Date(),
        },
      };

      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.tags) updateData.tags = updates.tags;
      
      if (updates.data) {
        updateData.encryptedData = this.encryptCredentialData(credential.type, updates.data);
        updateData.isValid = true;
        updateData.validatedAt = null;
      }

      await credential.update(updateData);

      // Re-test credential if data was updated
      if (updates.data && this.credentialTypes.get(credential.type)?.testable) {
        await this.testCredential(credential.id);
      }

      this.logger.info(`Updated credential: ${credential.id}`);
      return credential;
    } catch (error) {
      this.logger.error('Failed to update credential:', error);
      throw error;
    }
  }

  async deleteCredential(credentialId: string, userId: string): Promise<boolean> {
    try {
      const result = await Credential.destroy({
        where: { id: credentialId, userId },
      });

      if (result > 0) {
        this.logger.info(`Deleted credential: ${credentialId}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Failed to delete credential:', error);
      throw error;
    }
  }

  async listCredentials(userId: string, filters?: {
    type?: string;
    tags?: string[];
    isShared?: boolean;
  }): Promise<ICredential[]> {
    try {
      const where: any = {
        [Op.or]: [
          { userId },
          { isShared: true, sharedWith: { [Op.contains]: [userId] } },
        ],
      };

      if (filters?.type) {
        where.type = filters.type;
      }

      if (filters?.isShared !== undefined) {
        where.isShared = filters.isShared;
      }

      if (filters?.tags && filters.tags.length > 0) {
        where.tags = { [Op.overlap]: filters.tags };
      }

      const credentials = await Credential.findAll({
        where,
        order: [['name', 'ASC']],
      });

      return credentials;
    } catch (error) {
      this.logger.error('Failed to list credentials:', error);
      throw error;
    }
  }

  async shareCredential(
    credentialId: string,
    ownerId: string,
    userIds: string[],
    permissions: string[] = ['read', 'use']
  ): Promise<ICredential> {
    try {
      const credential = await Credential.findOne({
        where: { id: credentialId, userId: ownerId },
      });

      if (!credential) {
        throw new Error('Credential not found or access denied');
      }

      await credential.update({
        isShared: true,
        sharedWith: userIds,
        permissions,
      });

      this.logger.info(`Shared credential ${credentialId} with ${userIds.length} users`);
      return credential;
    } catch (error) {
      this.logger.error('Failed to share credential:', error);
      throw error;
    }
  }

  async testCredential(credentialId: string): Promise<TestResult> {
    try {
      const credential = await Credential.findByPk(credentialId);
      if (!credential) {
        return { success: false, message: 'Credential not found' };
      }

      const decryptedData = JSON.parse(this.decrypt(credential.encryptedData));

      let result: TestResult;
      switch (credential.type) {
        case 'api_key':
          result = await this.testApiKey(decryptedData);
          break;
        case 'basic_auth':
          result = await this.testBasicAuth(decryptedData);
          break;
        case 'database':
          result = await this.testDatabase(decryptedData);
          break;
        case 'smtp':
          result = await this.testSMTP(decryptedData);
          break;
        case 'ssh':
          result = await this.testSSH(decryptedData);
          break;
        case 'oauth2':
          result = await this.testOAuth2(decryptedData);
          break;
        case 'aws':
          result = await this.testAWS(decryptedData);
          break;
        default:
          result = { success: false, message: 'Test not available for this credential type' };
      }

      // Update credential validation status
      await credential.update({
        isValid: result.success,
        validatedAt: result.success ? new Date() : null,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to test credential:', error);
      return { success: false, message: `Test failed: ${error.message}` };
    }
  }

  private async testApiKey(data: any): Promise<TestResult> {
    try {
      if (!data.testUrl) {
        return { success: true, message: 'No test URL provided, assuming valid' };
      }

      const headers: any = {};
      const headerName = data.headerName || 'X-API-Key';
      headers[headerName] = data.apiKey;

      const response = await axios.get(data.testUrl, {
        headers,
        timeout: 5000,
      });

      return {
        success: response.status < 400,
        message: `API key test successful (status: ${response.status})`,
        details: { status: response.status },
      };
    } catch (error: any) {
      return {
        success: false,
        message: `API key test failed: ${error.message}`,
        details: { error: error.message },
      };
    }
  }

  private async testBasicAuth(data: any): Promise<TestResult> {
    try {
      if (!data.testUrl) {
        return { success: true, message: 'No test URL provided, assuming valid' };
      }

      const auth = Buffer.from(`${data.username}:${data.password}`).toString('base64');
      
      const response = await axios.get(data.testUrl, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
        timeout: 5000,
      });

      return {
        success: response.status < 400,
        message: `Basic auth test successful (status: ${response.status})`,
        details: { status: response.status },
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Basic auth test failed: ${error.message}`,
        details: { error: error.message },
      };
    }
  }

  private async testDatabase(data: any): Promise<TestResult> {
    try {
      switch (data.dbType) {
        case 'mysql':
          const mysqlConnection = await mysql.createConnection({
            host: data.host,
            port: data.port || 3306,
            user: data.username,
            password: data.password,
            database: data.database,
            ssl: data.ssl === 'true' ? {} : undefined,
          });
          await mysqlConnection.ping();
          await mysqlConnection.end();
          return { success: true, message: 'MySQL connection successful' };

        case 'postgresql':
          const pgClient = new PgClient({
            host: data.host,
            port: data.port || 5432,
            user: data.username,
            password: data.password,
            database: data.database,
            ssl: data.ssl === 'true',
          });
          await pgClient.connect();
          await pgClient.end();
          return { success: true, message: 'PostgreSQL connection successful' };

        case 'mongodb':
          const uri = `mongodb://${data.username}:${data.password}@${data.host}:${data.port || 27017}/${data.database}`;
          const mongoClient = new MongoClient(uri);
          await mongoClient.connect();
          await mongoClient.close();
          return { success: true, message: 'MongoDB connection successful' };

        case 'redis':
          const redisClient = Redis.createClient({
            host: data.host,
            port: data.port || 6379,
            password: data.password,
          });
          await new Promise((resolve, reject) => {
            redisClient.on('connect', resolve);
            redisClient.on('error', reject);
          });
          redisClient.quit();
          return { success: true, message: 'Redis connection successful' };

        default:
          return { success: false, message: `Unsupported database type: ${data.dbType}` };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Database connection failed: ${error.message}`,
        details: { error: error.message },
      };
    }
  }

  private async testSMTP(data: any): Promise<TestResult> {
    const nodemailer = require('nodemailer');
    
    try {
      // Create SMTP transporter
      const transporter = nodemailer.createTransporter({
        host: data.host,
        port: data.port || 587,
        secure: data.secure === 'true' || data.port === 465,
        auth: {
          user: data.username,
          pass: data.password,
        },
      });

      // Test connection
      await transporter.verify();
      
      return { success: true, message: 'SMTP connection successful' };
    } catch (error: any) {
      return {
        success: false,
        message: `SMTP connection failed: ${error.message}`,
        details: { error: error.message },
      };
    }
  }

  private async testSSH(data: any): Promise<TestResult> {
    return new Promise((resolve) => {
      const conn = new SSHClient();
      
      conn.on('ready', () => {
        conn.end();
        resolve({ success: true, message: 'SSH connection successful' });
      });

      conn.on('error', (err) => {
        resolve({
          success: false,
          message: `SSH connection failed: ${err.message}`,
          details: { error: err.message },
        });
      });

      const config: any = {
        host: data.host,
        port: data.port || 22,
        username: data.username,
      };

      if (data.authType === 'password') {
        config.password = data.password;
      } else if (data.authType === 'privateKey') {
        config.privateKey = data.privateKey;
        if (data.passphrase) {
          config.passphrase = data.passphrase;
        }
      }

      conn.connect(config);
    });
  }

  private async testOAuth2(data: any): Promise<TestResult> {
    try {
      // Test by attempting to refresh the token
      if (data.refreshToken && data.tokenUrl) {
        const response = await axios.post(data.tokenUrl, {
          grant_type: 'refresh_token',
          refresh_token: data.refreshToken,
          client_id: data.clientId,
          client_secret: data.clientSecret,
        });

        if (response.data.access_token) {
          return { success: true, message: 'OAuth2 credentials valid' };
        }
      }

      // If no refresh token, check if we have an access token
      if (data.accessToken) {
        return { success: true, message: 'OAuth2 access token present' };
      }

      return { success: false, message: 'OAuth2 credentials incomplete' };
    } catch (error: any) {
      return {
        success: false,
        message: `OAuth2 test failed: ${error.message}`,
        details: { error: error.message },
      };
    }
  }

  private async testAWS(data: any): Promise<TestResult> {
    try {
      // Simple validation for now
      // In production, you would use AWS SDK to test credentials
      if (data.accessKeyId && data.secretAccessKey && data.region) {
        return { success: true, message: 'AWS credentials format valid' };
      }
      return { success: false, message: 'AWS credentials incomplete' };
    } catch (error: any) {
      return {
        success: false,
        message: `AWS test failed: ${error.message}`,
        details: { error: error.message },
      };
    }
  }

  getCredentialTypes(): CredentialType[] {
    return Array.from(this.credentialTypes.values());
  }

  getCredentialType(type: string): CredentialType | undefined {
    return this.credentialTypes.get(type);
  }
}

export const credentialStorageService = new CredentialStorageService();