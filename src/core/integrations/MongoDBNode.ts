import { INodeType, INodeExecuteFunctions } from '../NodeRegistry';
import { AdvancedDatabaseService, DatabaseConnectionConfig } from '../../services/AdvancedDatabaseService';
import { createLogger } from '../../utils/logger';

const logger = createLogger('MongoDBNode');

export const MongoDBNode: INodeType = {
  description: {
    displayName: 'MongoDB',
    name: 'mongodb',
    group: ['database'],
    version: 1,
    description: 'Execute operations on MongoDB databases',
    defaults: {
      name: 'MongoDB',
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
            name: 'Find',
            value: 'find',
          },
          {
            name: 'Find One',
            value: 'findOne',
          },
          {
            name: 'Insert One',
            value: 'insertOne',
          },
          {
            name: 'Insert Many',
            value: 'insertMany',
          },
          {
            name: 'Update One',
            value: 'updateOne',
          },
          {
            name: 'Update Many',
            value: 'updateMany',
          },
          {
            name: 'Delete One',
            value: 'deleteOne',
          },
          {
            name: 'Delete Many',
            value: 'deleteMany',
          },
          {
            name: 'Aggregate',
            value: 'aggregate',
          },
          {
            name: 'Count',
            value: 'count',
          },
        ],
        default: 'find',
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
        default: 27017,
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
        placeholder: 'mongodb_user',
        description: 'Database username (optional)',
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
        description: 'Database password (optional)',
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
        placeholder: 'mongodb://username:password@localhost:27017/database',
        description: 'Full MongoDB connection string',
        displayOptions: {
          show: {
            connection: ['string'],
          },
        },
      },
      {
        displayName: 'Collection',
        name: 'collection',
        type: 'string',
        default: '',
        placeholder: 'users',
        description: 'Collection name',
      },
      {
        displayName: 'Filter',
        name: 'filter',
        type: 'string',
        typeOptions: {
          editor: 'code',
          editorLanguage: 'json',
        },
        default: '{}',
        placeholder: '{"active": true}',
        description: 'Filter query as JSON',
        displayOptions: {
          show: {
            operation: ['find', 'findOne', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'count'],
          },
        },
      },
      {
        displayName: 'Document',
        name: 'document',
        type: 'string',
        typeOptions: {
          editor: 'code',
          editorLanguage: 'json',
        },
        default: '{}',
        placeholder: '{"name": "John", "email": "john@example.com"}',
        description: 'Document to insert as JSON',
        displayOptions: {
          show: {
            operation: ['insertOne'],
          },
        },
      },
      {
        displayName: 'Documents',
        name: 'documents',
        type: 'string',
        typeOptions: {
          editor: 'code',
          editorLanguage: 'json',
        },
        default: '[]',
        placeholder: '[{"name": "John"}, {"name": "Jane"}]',
        description: 'Documents to insert as JSON array',
        displayOptions: {
          show: {
            operation: ['insertMany'],
          },
        },
      },
      {
        displayName: 'Update',
        name: 'update',
        type: 'string',
        typeOptions: {
          editor: 'code',
          editorLanguage: 'json',
        },
        default: '{}',
        placeholder: '{"$set": {"active": false}}',
        description: 'Update operation as JSON',
        displayOptions: {
          show: {
            operation: ['updateOne', 'updateMany'],
          },
        },
      },
      {
        displayName: 'Pipeline',
        name: 'pipeline',
        type: 'string',
        typeOptions: {
          editor: 'code',
          editorLanguage: 'json',
        },
        default: '[]',
        placeholder: '[{"$match": {"active": true}}, {"$group": {"_id": "$department", "count": {"$sum": 1}}}]',
        description: 'Aggregation pipeline as JSON array',
        displayOptions: {
          show: {
            operation: ['aggregate'],
          },
        },
      },
      {
        displayName: 'Projection',
        name: 'projection',
        type: 'string',
        typeOptions: {
          editor: 'code',
          editorLanguage: 'json',
        },
        default: '{}',
        placeholder: '{"name": 1, "email": 1}',
        description: 'Field projection as JSON (optional)',
        displayOptions: {
          show: {
            operation: ['find', 'findOne'],
          },
        },
      },
      {
        displayName: 'Sort',
        name: 'sort',
        type: 'string',
        typeOptions: {
          editor: 'code',
          editorLanguage: 'json',
        },
        default: '{}',
        placeholder: '{"createdAt": -1}',
        description: 'Sort order as JSON (optional)',
        displayOptions: {
          show: {
            operation: ['find'],
          },
        },
      },
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        default: 0,
        description: 'Maximum number of documents to return (0 = no limit)',
        displayOptions: {
          show: {
            operation: ['find'],
          },
        },
      },
      {
        displayName: 'Skip',
        name: 'skip',
        type: 'number',
        default: 0,
        description: 'Number of documents to skip',
        displayOptions: {
          show: {
            operation: ['find'],
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
    const port = this.getNodeParameter('port', 0, 27017) as number;
    const database = this.getNodeParameter('database', 0) as string;
    const username = this.getNodeParameter('username', 0) as string;
    const password = this.getNodeParameter('password', 0) as string;
    const connectionString = this.getNodeParameter('connectionString', 0) as string;
    const collection = this.getNodeParameter('collection', 0) as string;
    const filterString = this.getNodeParameter('filter', 0, '{}') as string;
    const documentString = this.getNodeParameter('document', 0, '{}') as string;
    const documentsString = this.getNodeParameter('documents', 0, '[]') as string;
    const updateString = this.getNodeParameter('update', 0, '{}') as string;
    const pipelineString = this.getNodeParameter('pipeline', 0, '[]') as string;
    const projectionString = this.getNodeParameter('projection', 0, '{}') as string;
    const sortString = this.getNodeParameter('sort', 0, '{}') as string;
    const limit = this.getNodeParameter('limit', 0, 0) as number;
    const skip = this.getNodeParameter('skip', 0, 0) as number;

    if (!collection) {
      throw new Error('Collection name is required');
    }

    logger.info('MongoDB node parameters', {
      operation,
      connection,
      host,
      database,
      collection
    });

    // Prepare connection config
    const config: DatabaseConnectionConfig = {
      type: 'mongodb',
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

        // Parse JSON parameters
        let filter: any = {};
        let document: any = {};
        let documents: any[] = [];
        let update: any = {};
        let pipeline: any[] = [];
        let projection: any = {};
        let sort: any = {};

        try {
          filter = JSON.parse(filterString);
          document = JSON.parse(documentString);
          documents = JSON.parse(documentsString);
          update = JSON.parse(updateString);
          pipeline = JSON.parse(pipelineString);
          projection = JSON.parse(projectionString);
          sort = JSON.parse(sortString);
        } catch (error) {
          throw new Error('Invalid JSON in parameters');
        }

        // Build MongoDB query object
        const mongoQuery: any = {
          collection,
          operation,
        };

        switch (operation) {
          case 'find':
            mongoQuery.filter = filter;
            mongoQuery.options = {};
            if (Object.keys(projection).length > 0) {
              mongoQuery.options.projection = projection;
            }
            if (Object.keys(sort).length > 0) {
              mongoQuery.options.sort = sort;
            }
            if (limit > 0) {
              mongoQuery.options.limit = limit;
            }
            if (skip > 0) {
              mongoQuery.options.skip = skip;
            }
            break;

          case 'findOne':
            mongoQuery.filter = filter;
            mongoQuery.options = {};
            if (Object.keys(projection).length > 0) {
              mongoQuery.options.projection = projection;
            }
            break;

          case 'insertOne':
            mongoQuery.document = document;
            break;

          case 'insertMany':
            mongoQuery.documents = documents;
            break;

          case 'updateOne':
          case 'updateMany':
            mongoQuery.filter = filter;
            mongoQuery.update = update;
            mongoQuery.options = { upsert: false };
            break;

          case 'deleteOne':
          case 'deleteMany':
            mongoQuery.filter = filter;
            break;

          case 'aggregate':
            mongoQuery.pipeline = pipeline;
            mongoQuery.options = {};
            break;

          case 'count':
            mongoQuery.filter = filter;
            // Convert count to find operation for our service
            mongoQuery.operation = 'find';
            break;

          default:
            throw new Error(`Unknown operation: ${operation}`);
        }

        // Execute query
        const result = await databaseService.executeQuery(connectionId, mongoQuery);

        if (!result.success) {
          throw new Error(result.error || 'Query execution failed');
        }

        logger.info('MongoDB operation executed successfully', {
          operation,
          collection,
          rowCount: result.rowCount,
          executionTime: result.executionTime
        });

        let responseData = result.data || [];

        // For count operation, return the count
        if (operation === 'count') {
          responseData = [{ count: result.rowCount || 0 }];
        }

        results.push({
          json: {
            success: true,
            operation,
            collection,
            data: responseData,
            rowCount: result.rowCount || 0,
            executionTime: result.executionTime,
            filter: operation.includes('find') || operation.includes('update') || operation.includes('delete') || operation === 'count' ? filter : undefined,
            document: operation === 'insertOne' ? document : undefined,
            documents: operation === 'insertMany' ? documents : undefined,
            update: operation.includes('update') ? update : undefined,
            pipeline: operation === 'aggregate' ? pipeline : undefined,
            inputIndex: index,
          },
        });

        // Close connection after use
        await databaseService.closeConnection(connectionId);

      } catch (error) {
        logger.error('MongoDB operation failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          operation,
          collection,
          index
        });

        results.push({
          json: {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            operation,
            collection,
            inputIndex: index,
          },
        });
      }
    }

    return results;
  },
};