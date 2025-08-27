import { Pool as PostgresPool, PoolConfig as PostgresPoolConfig } from 'pg';
import { MongoClient, Db as MongoDB, MongoClientOptions } from 'mongodb';
import { createClient as createRedisClient, RedisClientType } from 'redis';
import * as sqlite3 from 'sqlite3';
import * as knex from 'knex';
import { logger } from '../utils/logger';

export interface DatabaseConnectionConfig {
  type: 'postgresql' | 'mongodb' | 'redis' | 'sqlite';
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  connectionString?: string;
  options?: Record<string, any>;
  ssl?: boolean;
  filepath?: string; // For SQLite
}

export interface QueryResult {
  success: boolean;
  data?: any[];
  rowCount?: number;
  error?: string;
  executionTime?: number;
}

export interface DatabaseConnection {
  id: string;
  type: string;
  config: DatabaseConnectionConfig;
  connection: any;
  isConnected: boolean;
  lastUsed: Date;
  createdAt: Date;
}

export class AdvancedDatabaseService {
  private static instance: AdvancedDatabaseService;
  private connections: Map<string, DatabaseConnection> = new Map();
  private connectionTimeout = 30000; // 30 seconds
  private maxConnections = 10;

  private constructor() {
    // Cleanup idle connections every 5 minutes
    setInterval(() => {
      this.cleanupIdleConnections();
    }, 5 * 60 * 1000);
  }

  public static getInstance(): AdvancedDatabaseService {
    if (!AdvancedDatabaseService.instance) {
      AdvancedDatabaseService.instance = new AdvancedDatabaseService();
    }
    return AdvancedDatabaseService.instance;
  }

  public async createConnection(config: DatabaseConnectionConfig): Promise<string> {
    const connectionId = this.generateConnectionId(config);
    
    // Check if connection already exists
    const existingConnection = this.connections.get(connectionId);
    if (existingConnection && existingConnection.isConnected) {
      existingConnection.lastUsed = new Date();
      return connectionId;
    }

    // Check connection limit
    if (this.connections.size >= this.maxConnections) {
      await this.cleanupOldestConnection();
    }

    try {
      let connection: any;
      let isConnected = false;

      switch (config.type) {
        case 'postgresql':
          connection = await this.createPostgreSQLConnection(config);
          isConnected = true;
          break;
        case 'mongodb':
          connection = await this.createMongoDBConnection(config);
          isConnected = connection ? true : false;
          break;
        case 'redis':
          connection = await this.createRedisConnection(config);
          isConnected = connection?.isReady || false;
          break;
        case 'sqlite':
          connection = await this.createSQLiteConnection(config);
          isConnected = true;
          break;
        default:
          throw new Error(`Unsupported database type: ${config.type}`);
      }

      const dbConnection: DatabaseConnection = {
        id: connectionId,
        type: config.type,
        config,
        connection,
        isConnected,
        lastUsed: new Date(),
        createdAt: new Date(),
      };

      this.connections.set(connectionId, dbConnection);

      logger.info('Database connection created', {
        module: 'AdvancedDatabaseService',
        connectionId,
        type: config.type,
        host: config.host,
        database: config.database
      });

      return connectionId;

    } catch (error: any) {
      logger.error('Failed to create database connection', {
        module: 'AdvancedDatabaseService',
        type: config.type,
        error: error.message
      });
      throw error;
    }
  }

  private async createPostgreSQLConnection(config: DatabaseConnectionConfig): Promise<PostgresPool> {
    const poolConfig: PostgresPoolConfig = {
      connectionString: config.connectionString,
      host: config.host,
      port: config.port || 5432,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: this.connectionTimeout,
      ...config.options
    };

    const pool = new PostgresPool(poolConfig);
    
    // Test connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    return pool;
  }

  private async createMongoDBConnection(config: DatabaseConnectionConfig): Promise<MongoDB> {
    const uri = config.connectionString || 
      `mongodb://${config.username ? config.username + ':' + config.password + '@' : ''}${config.host}:${config.port || 27017}/${config.database}`;

    const options: MongoClientOptions = {
      connectTimeoutMS: this.connectionTimeout,
      serverSelectionTimeoutMS: this.connectionTimeout,
      ...config.options
    };

    const client = new MongoClient(uri, options);
    await client.connect();
    
    return client.db(config.database);
  }

  private async createRedisConnection(config: DatabaseConnectionConfig): Promise<RedisClientType> {
    const url = config.connectionString || 
      `redis://${config.username ? config.username + ':' + config.password + '@' : ''}${config.host}:${config.port || 6379}/${config.database || 0}`;

    const client = createRedisClient({
      url,
      socket: {
        connectTimeout: this.connectionTimeout,
      },
      ...config.options
    });

    await client.connect();
    return client as RedisClientType;
  }

  private async createSQLiteConnection(config: DatabaseConnectionConfig): Promise<knex.Knex> {
    if (!config.filepath) {
      throw new Error('SQLite filepath is required');
    }

    const knexConfig = {
      client: 'sqlite3',
      connection: {
        filename: config.filepath,
      },
      useNullAsDefault: true,
      ...config.options
    };

    const connection = knex.knex(knexConfig);
    
    // Test connection
    await connection.raw('SELECT 1');
    
    return connection;
  }

  public async executeQuery(connectionId: string, query: string, params: any[] = []): Promise<QueryResult> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isConnected) {
      return {
        success: false,
        error: 'Connection not found or not connected'
      };
    }

    const startTime = Date.now();

    try {
      connection.lastUsed = new Date();

      let result: any;
      let rowCount = 0;

      switch (connection.type) {
        case 'postgresql':
          const pgResult = await connection.connection.query(query, params);
          result = pgResult.rows;
          rowCount = pgResult.rowCount;
          break;

        case 'mongodb':
          // For MongoDB, query should be a JSON object
          const mongoQuery = typeof query === 'string' ? JSON.parse(query) : query;
          const collection = connection.connection.collection(mongoQuery.collection);
          
          switch (mongoQuery.operation) {
            case 'find':
              result = await collection.find(mongoQuery.filter || {}, mongoQuery.options || {}).toArray();
              rowCount = result.length;
              break;
            case 'findOne':
              result = [await collection.findOne(mongoQuery.filter || {}, mongoQuery.options || {})];
              rowCount = result[0] ? 1 : 0;
              break;
            case 'insertOne':
              const insertResult = await collection.insertOne(mongoQuery.document);
              result = [{ insertedId: insertResult.insertedId, acknowledged: insertResult.acknowledged }];
              rowCount = insertResult.acknowledged ? 1 : 0;
              break;
            case 'insertMany':
              const insertManyResult = await collection.insertMany(mongoQuery.documents);
              result = [{ insertedIds: insertManyResult.insertedIds, insertedCount: insertManyResult.insertedCount }];
              rowCount = insertManyResult.insertedCount;
              break;
            case 'updateOne':
              const updateResult = await collection.updateOne(mongoQuery.filter, mongoQuery.update, mongoQuery.options || {});
              result = [{ matchedCount: updateResult.matchedCount, modifiedCount: updateResult.modifiedCount }];
              rowCount = updateResult.modifiedCount;
              break;
            case 'deleteOne':
              const deleteResult = await collection.deleteOne(mongoQuery.filter);
              result = [{ deletedCount: deleteResult.deletedCount }];
              rowCount = deleteResult.deletedCount;
              break;
            case 'aggregate':
              result = await collection.aggregate(mongoQuery.pipeline || [], mongoQuery.options || {}).toArray();
              rowCount = result.length;
              break;
            default:
              throw new Error(`Unsupported MongoDB operation: ${mongoQuery.operation}`);
          }
          break;

        case 'redis':
          // For Redis, query should specify the command and arguments
          const redisQuery = typeof query === 'string' ? JSON.parse(query) : query;
          const command = redisQuery.command.toLowerCase();
          const args = redisQuery.args || [];

          switch (command) {
            case 'get':
              result = [{ key: args[0], value: await connection.connection.get(args[0]) }];
              break;
            case 'set':
              result = [{ success: await connection.connection.set(args[0], args[1]) }];
              break;
            case 'del':
              result = [{ deleted: await connection.connection.del(args) }];
              break;
            case 'keys':
              const keys = await connection.connection.keys(args[0] || '*');
              result = keys.map(key => ({ key }));
              break;
            case 'hget':
              result = [{ field: args[1], value: await connection.connection.hGet(args[0], args[1]) }];
              break;
            case 'hset':
              result = [{ success: await connection.connection.hSet(args[0], args[1], args[2]) }];
              break;
            case 'exists':
              result = [{ exists: await connection.connection.exists(args[0]) }];
              break;
            default:
              throw new Error(`Unsupported Redis command: ${command}`);
          }
          rowCount = result.length;
          break;

        case 'sqlite':
          const sqliteResult = await connection.connection.raw(query, params);
          result = sqliteResult;
          rowCount = Array.isArray(result) ? result.length : 0;
          break;

        default:
          throw new Error(`Unsupported database type: ${connection.type}`);
      }

      const executionTime = Date.now() - startTime;

      logger.info('Database query executed successfully', {
        module: 'AdvancedDatabaseService',
        connectionId,
        type: connection.type,
        rowCount,
        executionTime
      });

      return {
        success: true,
        data: result,
        rowCount,
        executionTime
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      logger.error('Database query failed', {
        module: 'AdvancedDatabaseService',
        connectionId,
        type: connection.type,
        error: error.message,
        executionTime
      });

      return {
        success: false,
        error: error.message,
        executionTime
      };
    }
  }

  public async closeConnection(connectionId: string): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    try {
      switch (connection.type) {
        case 'postgresql':
          await connection.connection.end();
          break;
        case 'mongodb':
          await connection.connection.client.close();
          break;
        case 'redis':
          await connection.connection.quit();
          break;
        case 'sqlite':
          await connection.connection.destroy();
          break;
      }

      this.connections.delete(connectionId);

      logger.info('Database connection closed', {
        module: 'AdvancedDatabaseService',
        connectionId,
        type: connection.type
      });

      return true;

    } catch (error: any) {
      logger.error('Failed to close database connection', {
        module: 'AdvancedDatabaseService',
        connectionId,
        type: connection.type,
        error: error.message
      });
      return false;
    }
  }

  private generateConnectionId(config: DatabaseConnectionConfig): string {
    const key = `${config.type}_${config.host || config.filepath}_${config.port}_${config.database}_${config.username}`;
    return Buffer.from(key).toString('base64').substring(0, 16);
  }

  private async cleanupIdleConnections(): Promise<void> {
    const now = new Date();
    const idleTimeout = 10 * 60 * 1000; // 10 minutes

    for (const [connectionId, connection] of this.connections) {
      if (now.getTime() - connection.lastUsed.getTime() > idleTimeout) {
        await this.closeConnection(connectionId);
      }
    }
  }

  private async cleanupOldestConnection(): Promise<void> {
    let oldestConnection: DatabaseConnection | null = null;
    let oldestConnectionId = '';

    for (const [connectionId, connection] of this.connections) {
      if (!oldestConnection || connection.lastUsed < oldestConnection.lastUsed) {
        oldestConnection = connection;
        oldestConnectionId = connectionId;
      }
    }

    if (oldestConnectionId) {
      await this.closeConnection(oldestConnectionId);
    }
  }

  public getActiveConnections(): DatabaseConnection[] {
    return Array.from(this.connections.values());
  }

  public async testConnection(config: DatabaseConnectionConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const connectionId = await this.createConnection(config);
      await this.closeConnection(connectionId);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  public async shutdown(): Promise<void> {
    logger.info('Shutting down advanced database service...');
    
    const connectionIds = Array.from(this.connections.keys());
    await Promise.all(connectionIds.map(id => this.closeConnection(id)));
    
    logger.info('Advanced database service shutdown complete');
  }
}