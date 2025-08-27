import { INodeType, INodeExecuteFunctions } from '../NodeRegistry';
import { AdvancedDatabaseService, DatabaseConnectionConfig } from '../../services/AdvancedDatabaseService';
import { createLogger } from '../../utils/logger';

const logger = createLogger('RedisNode');

export const RedisNode: INodeType = {
  description: {
    displayName: 'Redis',
    name: 'redis',
    group: ['database', 'cache'],
    version: 1,
    description: 'Execute operations on Redis cache/database',
    defaults: {
      name: 'Redis',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          {
            name: 'Get',
            value: 'get',
          },
          {
            name: 'Set',
            value: 'set',
          },
          {
            name: 'Delete',
            value: 'del',
          },
          {
            name: 'Keys',
            value: 'keys',
          },
          {
            name: 'Exists',
            value: 'exists',
          },
          {
            name: 'Hash Get',
            value: 'hget',
          },
          {
            name: 'Hash Set',
            value: 'hset',
          },
          {
            name: 'Hash Get All',
            value: 'hgetall',
          },
          {
            name: 'Hash Delete',
            value: 'hdel',
          },
          {
            name: 'List Push',
            value: 'lpush',
          },
          {
            name: 'List Pop',
            value: 'lpop',
          },
          {
            name: 'List Range',
            value: 'lrange',
          },
          {
            name: 'Expire',
            value: 'expire',
          },
          {
            name: 'TTL',
            value: 'ttl',
          },
        ],
        default: 'get',
        description: 'The Redis operation to perform',
      },
      {
        displayName: 'Connection',
        name: 'connection',
        type: 'options',
        options: [
          {
            name: 'From Parameters',
            value: 'parameters',
          },
          {
            name: 'From Connection String',
            value: 'string',
          },
        ],
        default: 'parameters',
        description: 'How to specify the Redis connection',
      },
      {
        displayName: 'Host',
        name: 'host',
        type: 'string',
        default: 'localhost',
        placeholder: 'localhost',
        description: 'Redis server hostname',
        displayOptions: {
          show: {
            connection: ['parameters'],
          },
        },
      },
      {
        displayName: 'Port',
        name: 'port',
        type: 'number',
        default: 6379,
        description: 'Redis server port',
        displayOptions: {
          show: {
            connection: ['parameters'],
          },
        },
      },
      {
        displayName: 'Database',
        name: 'database',
        type: 'number',
        default: 0,
        description: 'Redis database number (0-15)',
        displayOptions: {
          show: {
            connection: ['parameters'],
          },
        },
      },
      {
        displayName: 'Username',
        name: 'username',
        type: 'string',
        default: '',
        placeholder: 'redis_user',
        description: 'Redis username (optional, for Redis 6+)',
        displayOptions: {
          show: {
            connection: ['parameters'],
          },
        },
      },
      {
        displayName: 'Password',
        name: 'password',
        type: 'string',
        typeOptions: {
          password: true,
        },
        default: '',
        description: 'Redis password (optional)',
        displayOptions: {
          show: {
            connection: ['parameters'],
          },
        },
      },
      {
        displayName: 'Connection String',
        name: 'connectionString',
        type: 'string',
        default: '',
        placeholder: 'redis://username:password@localhost:6379/0',
        description: 'Full Redis connection string',
        displayOptions: {
          show: {
            connection: ['string'],
          },
        },
      },
      {
        displayName: 'Key',
        name: 'key',
        type: 'string',
        default: '',
        placeholder: 'my_key',
        description: 'Redis key name',
        displayOptions: {
          show: {
            operation: ['get', 'set', 'del', 'exists', 'expire', 'ttl'],
          },
        },
      },
      {
        displayName: 'Key Pattern',
        name: 'keyPattern',
        type: 'string',
        default: '*',
        placeholder: 'user:*',
        description: 'Key pattern for search',
        displayOptions: {
          show: {
            operation: ['keys'],
          },
        },
      },
      {
        displayName: 'Value',
        name: 'value',
        type: 'string',
        default: '',
        placeholder: 'my_value',
        description: 'Value to set',
        displayOptions: {
          show: {
            operation: ['set', 'lpush'],
          },
        },
      },
      {
        displayName: 'Hash Key',
        name: 'hashKey',
        type: 'string',
        default: '',
        placeholder: 'user:123',
        description: 'Hash key name',
        displayOptions: {
          show: {
            operation: ['hget', 'hset', 'hgetall', 'hdel'],
          },
        },
      },
      {
        displayName: 'Hash Field',
        name: 'hashField',
        type: 'string',
        default: '',
        placeholder: 'email',
        description: 'Hash field name',
        displayOptions: {
          show: {
            operation: ['hget', 'hset', 'hdel'],
          },
        },
      },
      {
        displayName: 'Hash Value',
        name: 'hashValue',
        type: 'string',
        default: '',
        placeholder: 'user@example.com',
        description: 'Hash field value',
        displayOptions: {
          show: {
            operation: ['hset'],
          },
        },
      },
      {
        displayName: 'List Key',
        name: 'listKey',
        type: 'string',
        default: '',
        placeholder: 'queue:tasks',
        description: 'List key name',
        displayOptions: {
          show: {
            operation: ['lpush', 'lpop', 'lrange'],
          },
        },
      },
      {
        displayName: 'Start Index',
        name: 'startIndex',
        type: 'number',
        default: 0,
        description: 'Start index for list range',
        displayOptions: {
          show: {
            operation: ['lrange'],
          },
        },
      },
      {
        displayName: 'End Index',
        name: 'endIndex',
        type: 'number',
        default: -1,
        description: 'End index for list range (-1 = end)',
        displayOptions: {
          show: {
            operation: ['lrange'],
          },
        },
      },
      {
        displayName: 'Expiration (seconds)',
        name: 'expiration',
        type: 'number',
        default: 3600,
        description: 'Expiration time in seconds',
        displayOptions: {
          show: {
            operation: ['expire'],
          },
        },
      },
      {
        displayName: 'TTL on Set',
        name: 'ttlOnSet',
        type: 'number',
        default: 0,
        description: 'Set TTL when setting value (0 = no expiration)',
        displayOptions: {
          show: {
            operation: ['set'],
          },
        },
      },
    ],
  },

  async execute(this: INodeExecuteFunctions): Promise<any[]> {
    const items = this.getInputData();
    const databaseService = AdvancedDatabaseService.getInstance();

    if (items.length === 0) {
      throw new Error('No input data provided');
    }

    // Get parameters
    const operation = this.getNodeParameter('operation', 0) as string;
    const connection = this.getNodeParameter('connection', 0) as string;
    const host = this.getNodeParameter('host', 0, 'localhost') as string;
    const port = this.getNodeParameter('port', 0, 6379) as number;
    const database = this.getNodeParameter('database', 0, 0) as number;
    const username = this.getNodeParameter('username', 0) as string;
    const password = this.getNodeParameter('password', 0) as string;
    const connectionString = this.getNodeParameter('connectionString', 0) as string;
    const key = this.getNodeParameter('key', 0) as string;
    const keyPattern = this.getNodeParameter('keyPattern', 0, '*') as string;
    const value = this.getNodeParameter('value', 0) as string;
    const hashKey = this.getNodeParameter('hashKey', 0) as string;
    const hashField = this.getNodeParameter('hashField', 0) as string;
    const hashValue = this.getNodeParameter('hashValue', 0) as string;
    const listKey = this.getNodeParameter('listKey', 0) as string;
    const startIndex = this.getNodeParameter('startIndex', 0, 0) as number;
    const endIndex = this.getNodeParameter('endIndex', 0, -1) as number;
    const expiration = this.getNodeParameter('expiration', 0, 3600) as number;
    const ttlOnSet = this.getNodeParameter('ttlOnSet', 0, 0) as number;

    logger.info('Redis node parameters', {
      operation,
      connection,
      host,
      database,
      key,
      hashKey,
      listKey
    });

    // Prepare connection config
    const config: DatabaseConnectionConfig = {
      type: 'redis',
      database,
    };

    if (connection === 'string') {
      config.connectionString = connectionString;
    } else {
      config.host = host;
      config.port = port;
      config.username = username;
      config.password = password;
    }

    const results = [];

    for (const [index, item] of items.entries()) {
      try {
        // Create database connection
        const connectionId = await databaseService.createConnection(config);

        // Build Redis command object
        let redisQuery: any = {
          command: operation,
          args: [],
        };

        switch (operation) {
          case 'get':
            if (!key) throw new Error('Key is required for GET operation');
            redisQuery.args = [key];
            break;

          case 'set':
            if (!key || !value) throw new Error('Key and value are required for SET operation');
            redisQuery.args = [key, value];
            if (ttlOnSet > 0) {
              redisQuery.command = 'setex';
              redisQuery.args = [key, ttlOnSet, value];
            }
            break;

          case 'del':
            if (!key) throw new Error('Key is required for DEL operation');
            redisQuery.args = [key];
            break;

          case 'keys':
            redisQuery.args = [keyPattern];
            break;

          case 'exists':
            if (!key) throw new Error('Key is required for EXISTS operation');
            redisQuery.args = [key];
            break;

          case 'hget':
            if (!hashKey || !hashField) throw new Error('Hash key and field are required for HGET operation');
            redisQuery.args = [hashKey, hashField];
            break;

          case 'hset':
            if (!hashKey || !hashField || !hashValue) throw new Error('Hash key, field, and value are required for HSET operation');
            redisQuery.args = [hashKey, hashField, hashValue];
            break;

          case 'hgetall':
            if (!hashKey) throw new Error('Hash key is required for HGETALL operation');
            redisQuery.command = 'hgetall';
            redisQuery.args = [hashKey];
            break;

          case 'hdel':
            if (!hashKey || !hashField) throw new Error('Hash key and field are required for HDEL operation');
            redisQuery.args = [hashKey, hashField];
            break;

          case 'lpush':
            if (!listKey || !value) throw new Error('List key and value are required for LPUSH operation');
            redisQuery.args = [listKey, value];
            break;

          case 'lpop':
            if (!listKey) throw new Error('List key is required for LPOP operation');
            redisQuery.args = [listKey];
            break;

          case 'lrange':
            if (!listKey) throw new Error('List key is required for LRANGE operation');
            redisQuery.args = [listKey, startIndex, endIndex];
            break;

          case 'expire':
            if (!key) throw new Error('Key is required for EXPIRE operation');
            redisQuery.args = [key, expiration];
            break;

          case 'ttl':
            if (!key) throw new Error('Key is required for TTL operation');
            redisQuery.args = [key];
            break;

          default:
            throw new Error(`Unknown operation: ${operation}`);
        }

        // Execute Redis command
        const result = await databaseService.executeQuery(connectionId, redisQuery);

        if (!result.success) {
          throw new Error(result.error || 'Redis operation failed');
        }

        logger.info('Redis operation executed successfully', {
          operation,
          key: key || hashKey || listKey,
          executionTime: result.executionTime
        });

        results.push({
          json: {
            success: true,
            operation,
            key: key || hashKey || listKey || keyPattern,
            data: result.data || [],
            result: result.data && result.data.length > 0 ? result.data[0] : null,
            executionTime: result.executionTime,
            args: redisQuery.args,
            inputIndex: index,
          },
        });

        // Close connection after use
        await databaseService.closeConnection(connectionId);

      } catch (error) {
        logger.error('Redis operation failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          operation,
          key: key || hashKey || listKey,
          index
        });

        results.push({
          json: {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            operation,
            key: key || hashKey || listKey,
            inputIndex: index,
          },
        });
      }
    }

    return results;
  },
};