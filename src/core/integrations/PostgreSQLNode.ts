import { INodeType, INodeExecuteFunctions } from '../NodeRegistry';
import { AdvancedDatabaseService, DatabaseConnectionConfig } from '../../services/AdvancedDatabaseService';
import { createLogger } from '../../utils/logger';

const logger = createLogger('PostgreSQLNode');

export const PostgreSQLNode: INodeType = {
  description: {
    displayName: 'PostgreSQL',
    name: 'postgresql',
    group: ['database'],
    version: 1,
    description: 'Execute queries on PostgreSQL databases',
    defaults: {
      name: 'PostgreSQL',
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
            name: 'Execute Query',
            value: 'query',
          },
          {
            name: 'Insert',
            value: 'insert',
          },
          {
            name: 'Update',
            value: 'update',
          },
          {
            name: 'Delete',
            value: 'delete',
          },
          {
            name: 'Select',
            value: 'select',
          },
        ],
        default: 'select',
        description: 'The operation to perform',
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
        description: 'How to specify the database connection',
      },
      {
        displayName: 'Host',
        name: 'host',
        type: 'string',
        default: 'localhost',
        placeholder: 'localhost',
        description: 'Database server hostname',
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
        default: 5432,
        description: 'Database server port',
        displayOptions: {
          show: {
            connection: ['parameters'],
          },
        },
      },
      {
        displayName: 'Database',
        name: 'database',
        type: 'string',
        default: '',
        placeholder: 'my_database',
        description: 'Database name',
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
        placeholder: 'postgres',
        description: 'Database username',
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
        description: 'Database password',
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
        placeholder: 'postgresql://user:password@localhost:5432/database',
        description: 'Full PostgreSQL connection string',
        displayOptions: {
          show: {
            connection: ['string'],
          },
        },
      },
      {
        displayName: 'Use SSL',
        name: 'ssl',
        type: 'boolean',
        default: false,
        description: 'Use SSL connection',
      },
      {
        displayName: 'Query',
        name: 'query',
        type: 'string',
        typeOptions: {
          editor: 'code',
          editorLanguage: 'sql',
        },
        default: 'SELECT * FROM table_name LIMIT 10',
        placeholder: 'SELECT * FROM users WHERE active = true',
        description: 'SQL query to execute',
        displayOptions: {
          show: {
            operation: ['query', 'select'],
          },
        },
      },
      {
        displayName: 'Table',
        name: 'table',
        type: 'string',
        default: '',
        placeholder: 'users',
        description: 'Table name for the operation',
        displayOptions: {
          show: {
            operation: ['insert', 'update', 'delete'],
          },
        },
      },
      {
        displayName: 'Data',
        name: 'data',
        type: 'string',
        typeOptions: {
          editor: 'code',
          editorLanguage: 'json',
        },
        default: '{}',
        placeholder: '{"name": "John", "email": "john@example.com"}',
        description: 'Data to insert/update as JSON',
        displayOptions: {
          show: {
            operation: ['insert', 'update'],
          },
        },
      },
      {
        displayName: 'Where Condition',
        name: 'whereCondition',
        type: 'string',
        default: '',
        placeholder: 'id = $1',
        description: 'WHERE clause for update/delete operations',
        displayOptions: {
          show: {
            operation: ['update', 'delete'],
          },
        },
      },
      {
        displayName: 'Parameters',
        name: 'parameters',
        type: 'string',
        typeOptions: {
          editor: 'code',
          editorLanguage: 'json',
        },
        default: '[]',
        placeholder: '[1, "active"]',
        description: 'Query parameters as JSON array',
      },
      {
        displayName: 'Return Fields',
        name: 'returnFields',
        type: 'string',
        default: '*',
        placeholder: 'id, name, email',
        description: 'Fields to return (for INSERT/UPDATE with RETURNING)',
        displayOptions: {
          show: {
            operation: ['insert', 'update'],
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
    const port = this.getNodeParameter('port', 0, 5432) as number;
    const database = this.getNodeParameter('database', 0) as string;
    const username = this.getNodeParameter('username', 0) as string;
    const password = this.getNodeParameter('password', 0) as string;
    const connectionString = this.getNodeParameter('connectionString', 0) as string;
    const ssl = this.getNodeParameter('ssl', 0, false) as boolean;
    const query = this.getNodeParameter('query', 0) as string;
    const table = this.getNodeParameter('table', 0) as string;
    const dataString = this.getNodeParameter('data', 0, '{}') as string;
    const whereCondition = this.getNodeParameter('whereCondition', 0) as string;
    const parametersString = this.getNodeParameter('parameters', 0, '[]') as string;
    const returnFields = this.getNodeParameter('returnFields', 0, '*') as string;

    logger.info('PostgreSQL node parameters', {
      operation,
      connection,
      host,
      database,
      table
    });

    // Prepare connection config
    const config: DatabaseConnectionConfig = {
      type: 'postgresql',
      ssl,
    };

    if (connection === 'string') {
      config.connectionString = connectionString;
    } else {
      config.host = host;
      config.port = port;
      config.database = database;
      config.username = username;
      config.password = password;
    }

    const results = [];

    for (const [index, item] of items.entries()) {
      try {
        // Create database connection
        const connectionId = await databaseService.createConnection(config);

        let finalQuery: string;
        let parameters: any[] = [];

        // Parse parameters
        try {
          parameters = JSON.parse(parametersString);
        } catch (error) {
          parameters = [];
        }

        // Build query based on operation
        switch (operation) {
          case 'query':
          case 'select':
            finalQuery = query;
            break;

          case 'insert':
            const insertData = JSON.parse(dataString);
            const insertFields = Object.keys(insertData);
            const insertValues = Object.values(insertData);
            const insertPlaceholders = insertValues.map((_, i) => `$${i + 1}`).join(', ');
            
            finalQuery = `INSERT INTO ${table} (${insertFields.join(', ')}) VALUES (${insertPlaceholders})`;
            if (returnFields !== '*') {
              finalQuery += ` RETURNING ${returnFields}`;
            } else {
              finalQuery += ` RETURNING *`;
            }
            parameters = insertValues;
            break;

          case 'update':
            const updateData = JSON.parse(dataString);
            const updateFields = Object.keys(updateData);
            const updateValues = Object.values(updateData);
            const updateSetClause = updateFields.map((field, i) => `${field} = $${i + 1}`).join(', ');
            
            finalQuery = `UPDATE ${table} SET ${updateSetClause}`;
            if (whereCondition) {
              const whereParams = parameters.map((_, i) => `$${updateValues.length + i + 1}`).join(', ');
              finalQuery += ` WHERE ${whereCondition}`;
              parameters = [...updateValues, ...parameters];
            } else {
              parameters = updateValues;
            }
            
            if (returnFields !== '*') {
              finalQuery += ` RETURNING ${returnFields}`;
            } else {
              finalQuery += ` RETURNING *`;
            }
            break;

          case 'delete':
            finalQuery = `DELETE FROM ${table}`;
            if (whereCondition) {
              finalQuery += ` WHERE ${whereCondition}`;
            }
            if (returnFields !== '*') {
              finalQuery += ` RETURNING ${returnFields}`;
            } else {
              finalQuery += ` RETURNING *`;
            }
            break;

          default:
            throw new Error(`Unknown operation: ${operation}`);
        }

        // Execute query
        const result = await databaseService.executeQuery(connectionId, finalQuery, parameters);

        if (!result.success) {
          throw new Error(result.error || 'Query execution failed');
        }

        logger.info('PostgreSQL query executed successfully', {
          operation,
          table,
          rowCount: result.rowCount,
          executionTime: result.executionTime
        });

        results.push({
          json: {
            success: true,
            operation,
            query: finalQuery,
            parameters,
            data: result.data || [],
            rowCount: result.rowCount || 0,
            executionTime: result.executionTime,
            table,
            inputIndex: index,
          },
        });

        // Close connection after use
        await databaseService.closeConnection(connectionId);

      } catch (error) {
        logger.error('PostgreSQL operation failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          operation,
          table,
          index
        });

        results.push({
          json: {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            operation,
            table,
            inputIndex: index,
          },
        });
      }
    }

    return results;
  },
};