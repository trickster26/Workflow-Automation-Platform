import { Client as PgClient } from 'pg';
import mysql from 'mysql2/promise';
import { MongoClient } from 'mongodb';
import { INodeType, INodeExecuteFunctions } from '../NodeRegistry';

export const DatabaseNode: INodeType = {
  description: {
    displayName: 'Database',
    name: 'database',
    group: ['data'],
    version: 1,
    description: 'Execute database queries',
    defaults: {
      name: 'Database',
      color: '#336699',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'database',
        required: true,
      },
    ],
    properties: [
      {
        name: 'operation',
        displayName: 'Operation',
        type: 'options',
        options: [
          { name: 'Execute Query', value: 'executeQuery' },
          { name: 'Insert', value: 'insert' },
          { name: 'Update', value: 'update' },
          { name: 'Delete', value: 'delete' },
        ],
        default: 'executeQuery',
        description: 'Operation to perform',
      },
      {
        name: 'query',
        displayName: 'Query',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['executeQuery'],
          },
        },
        default: '',
        required: true,
        description: 'SQL query to execute',
      },
      {
        name: 'table',
        displayName: 'Table',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['insert', 'update', 'delete'],
          },
        },
        default: '',
        required: true,
        description: 'Table name',
      },
      {
        name: 'columns',
        displayName: 'Columns',
        type: 'collection',
        displayOptions: {
          show: {
            operation: ['insert', 'update'],
          },
        },
        default: {},
        description: 'Column values',
      },
      {
        name: 'where',
        displayName: 'Where Condition',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['update', 'delete'],
          },
        },
        default: '',
        description: 'WHERE clause condition',
      },
      {
        name: 'options',
        displayName: 'Options',
        type: 'collection',
        default: {},
        description: 'Additional options',
      },
    ],
  },

  async execute(this: INodeExecuteFunctions): Promise<any[]> {
    const items = this.getInputData();
    const returnData = [];
    const credentials = await this.getCredentials('database');
    const operation = this.getNodeParameter('operation', 0) as string;

    let connection: any;

    try {
      // Establish database connection based on type
      switch (credentials.type) {
        case 'postgres':
          connection = new PgClient({
            host: credentials.host,
            port: credentials.port,
            database: credentials.database,
            user: credentials.username,
            password: credentials.password,
          });
          await connection.connect();
          break;

        case 'mysql':
          connection = await mysql.createConnection({
            host: credentials.host,
            port: credentials.port,
            database: credentials.database,
            user: credentials.username,
            password: credentials.password,
          });
          break;

        case 'mongodb':
          const mongoUrl = `mongodb://${credentials.username}:${credentials.password}@${credentials.host}:${credentials.port}/${credentials.database}`;
          connection = new MongoClient(mongoUrl);
          await connection.connect();
          break;

        default:
          throw new Error(`Unsupported database type: ${credentials.type}`);
      }

      for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
        try {
          let result: any;

          switch (operation) {
            case 'executeQuery':
              result = await this.executeQuery(connection, credentials.type, itemIndex);
              break;

            case 'insert':
              result = await this.insertRecord(connection, credentials.type, itemIndex);
              break;

            case 'update':
              result = await this.updateRecord(connection, credentials.type, itemIndex);
              break;

            case 'delete':
              result = await this.deleteRecord(connection, credentials.type, itemIndex);
              break;

            default:
              throw new Error(`Unknown operation: ${operation}`);
          }

          returnData.push({
            json: result,
          });

        } catch (error: any) {
          if (this.continueOnFail?.()) {
            returnData.push({
              json: {
                error: error.message,
              },
              error,
            });
            continue;
          }
          throw error;
        }
      }
    } finally {
      // Close connection
      if (connection) {
        switch (credentials.type) {
          case 'postgres':
            await connection.end();
            break;
          case 'mysql':
            await connection.end();
            break;
          case 'mongodb':
            await connection.close();
            break;
        }
      }
    }

    return returnData;
  },

  async executeQuery(this: INodeExecuteFunctions, connection: any, dbType: string, itemIndex: number): Promise<any> {
    const query = this.getNodeParameter('query', itemIndex) as string;

    switch (dbType) {
      case 'postgres':
        const pgResult = await connection.query(query);
        return {
          rows: pgResult.rows,
          rowCount: pgResult.rowCount,
          command: pgResult.command,
        };

      case 'mysql':
        const [mysqlRows, fields] = await connection.execute(query);
        return {
          rows: mysqlRows,
          rowCount: Array.isArray(mysqlRows) ? mysqlRows.length : 1,
          fields: fields,
        };

      case 'mongodb':
        // For MongoDB, the query should be in JSON format
        const mongoQuery = JSON.parse(query);
        const db = connection.db();
        const collection = db.collection(mongoQuery.collection);
        
        let mongoResult;
        switch (mongoQuery.operation) {
          case 'find':
            mongoResult = await collection.find(mongoQuery.filter || {}).toArray();
            break;
          case 'findOne':
            mongoResult = await collection.findOne(mongoQuery.filter || {});
            break;
          case 'aggregate':
            mongoResult = await collection.aggregate(mongoQuery.pipeline || []).toArray();
            break;
          default:
            throw new Error(`Unsupported MongoDB operation: ${mongoQuery.operation}`);
        }

        return {
          rows: Array.isArray(mongoResult) ? mongoResult : [mongoResult],
          rowCount: Array.isArray(mongoResult) ? mongoResult.length : 1,
        };

      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }
  },

  async insertRecord(this: INodeExecuteFunctions, connection: any, dbType: string, itemIndex: number): Promise<any> {
    const table = this.getNodeParameter('table', itemIndex) as string;
    const columns = this.getNodeParameter('columns', itemIndex) as Record<string, any>;

    const columnNames = Object.keys(columns);
    const columnValues = Object.values(columns);

    switch (dbType) {
      case 'postgres':
        const pgPlaceholders = columnValues.map((_, i) => `$${i + 1}`).join(', ');
        const pgQuery = `INSERT INTO ${table} (${columnNames.join(', ')}) VALUES (${pgPlaceholders}) RETURNING *`;
        const pgResult = await connection.query(pgQuery, columnValues);
        return {
          insertedId: pgResult.rows[0]?.id,
          insertedRow: pgResult.rows[0],
          rowCount: pgResult.rowCount,
        };

      case 'mysql':
        const mysqlPlaceholders = columnValues.map(() => '?').join(', ');
        const mysqlQuery = `INSERT INTO ${table} (${columnNames.join(', ')}) VALUES (${mysqlPlaceholders})`;
        const [mysqlResult]: any = await connection.execute(mysqlQuery, columnValues);
        return {
          insertedId: mysqlResult.insertId,
          affectedRows: mysqlResult.affectedRows,
        };

      case 'mongodb':
        const db = connection.db();
        const collection = db.collection(table);
        const mongoResult = await collection.insertOne(columns);
        return {
          insertedId: mongoResult.insertedId,
          acknowledged: mongoResult.acknowledged,
        };

      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }
  },

  async updateRecord(this: INodeExecuteFunctions, connection: any, dbType: string, itemIndex: number): Promise<any> {
    const table = this.getNodeParameter('table', itemIndex) as string;
    const columns = this.getNodeParameter('columns', itemIndex) as Record<string, any>;
    const whereCondition = this.getNodeParameter('where', itemIndex) as string;

    const columnNames = Object.keys(columns);
    const columnValues = Object.values(columns);

    switch (dbType) {
      case 'postgres':
        const pgSetClause = columnNames.map((name, i) => `${name} = $${i + 1}`).join(', ');
        const pgQuery = `UPDATE ${table} SET ${pgSetClause} WHERE ${whereCondition} RETURNING *`;
        const pgResult = await connection.query(pgQuery, columnValues);
        return {
          updatedRows: pgResult.rows,
          rowCount: pgResult.rowCount,
        };

      case 'mysql':
        const mysqlSetClause = columnNames.map(name => `${name} = ?`).join(', ');
        const mysqlQuery = `UPDATE ${table} SET ${mysqlSetClause} WHERE ${whereCondition}`;
        const [mysqlResult]: any = await connection.execute(mysqlQuery, columnValues);
        return {
          affectedRows: mysqlResult.affectedRows,
          changedRows: mysqlResult.changedRows,
        };

      case 'mongodb':
        const db = connection.db();
        const collection = db.collection(table);
        // For MongoDB, whereCondition should be JSON
        const filter = JSON.parse(whereCondition);
        const mongoResult = await collection.updateMany(filter, { $set: columns });
        return {
          matchedCount: mongoResult.matchedCount,
          modifiedCount: mongoResult.modifiedCount,
        };

      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }
  },

  async deleteRecord(this: INodeExecuteFunctions, connection: any, dbType: string, itemIndex: number): Promise<any> {
    const table = this.getNodeParameter('table', itemIndex) as string;
    const whereCondition = this.getNodeParameter('where', itemIndex) as string;

    switch (dbType) {
      case 'postgres':
        const pgQuery = `DELETE FROM ${table} WHERE ${whereCondition} RETURNING *`;
        const pgResult = await connection.query(pgQuery);
        return {
          deletedRows: pgResult.rows,
          rowCount: pgResult.rowCount,
        };

      case 'mysql':
        const mysqlQuery = `DELETE FROM ${table} WHERE ${whereCondition}`;
        const [mysqlResult]: any = await connection.execute(mysqlQuery);
        return {
          affectedRows: mysqlResult.affectedRows,
        };

      case 'mongodb':
        const db = connection.db();
        const collection = db.collection(table);
        // For MongoDB, whereCondition should be JSON
        const filter = JSON.parse(whereCondition);
        const mongoResult = await collection.deleteMany(filter);
        return {
          deletedCount: mongoResult.deletedCount,
        };

      default:
        throw new Error(`Unsupported database type: ${dbType}`);
    }
  },
};