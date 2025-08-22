import { Sequelize, QueryInterface, DataTypes } from 'sequelize';
import { createLogger } from '../utils/logger';
import { db } from '../config/database';
import fs from 'fs/promises';
import path from 'path';

const logger = createLogger('DataMigrationService');

export interface IMigration {
  version: string;
  name: string;
  description: string;
  up: (queryInterface: QueryInterface) => Promise<void>;
  down: (queryInterface: QueryInterface) => Promise<void>;
}

export class DataMigrationService {
  private static instance: DataMigrationService;
  private migrations: IMigration[] = [];
  private migrationsDir: string;

  private constructor() {
    this.migrationsDir = path.join(__dirname, '../migrations');
    this.initializeMigrations();
  }

  public static getInstance(): DataMigrationService {
    if (!DataMigrationService.instance) {
      DataMigrationService.instance = new DataMigrationService();
    }
    return DataMigrationService.instance;
  }

  private async initializeMigrations(): Promise<void> {
    // Core system migrations
    this.migrations = [
      {
        version: '001',
        name: 'create_schema_version_table',
        description: 'Create table to track migration versions',
        up: async (queryInterface: QueryInterface) => {
          await queryInterface.createTable('schema_versions', {
            id: {
              type: DataTypes.INTEGER,
              primaryKey: true,
              autoIncrement: true,
            },
            version: {
              type: DataTypes.STRING(10),
              allowNull: false,
              unique: true,
            },
            name: {
              type: DataTypes.STRING(255),
              allowNull: false,
            },
            description: {
              type: DataTypes.TEXT,
              allowNull: true,
            },
            appliedAt: {
              type: DataTypes.DATE,
              allowNull: false,
              defaultValue: DataTypes.NOW,
            },
          });

          // Create indexes
          await queryInterface.addIndex('schema_versions', ['version'], {
            name: 'idx_schema_versions_version',
            unique: true,
          });
        },
        down: async (queryInterface: QueryInterface) => {
          await queryInterface.dropTable('schema_versions');
        },
      },
      {
        version: '002',
        name: 'add_workflow_indexes',
        description: 'Add performance indexes to workflows table',
        up: async (queryInterface: QueryInterface) => {
          const indexExists = async (tableName: string, indexName: string): Promise<boolean> => {
            try {
              const indexes = await queryInterface.showIndex(tableName);
              return indexes.some((index: any) => index.name === indexName);
            } catch (error: any) {
              return false;
            }
          };

          const indexesToCreate = [
            { fields: ['userId'], name: 'idx_workflows_user_id' },
            { fields: ['isActive'], name: 'idx_workflows_is_active' },
            { fields: ['createdAt'], name: 'idx_workflows_created_at' },
            { fields: ['updatedAt'], name: 'idx_workflows_updated_at' },
            { fields: ['userId', 'isActive'], name: 'idx_workflows_user_is_active' },
          ];

          for (const index of indexesToCreate) {
            try {
              const exists = await indexExists('workflows', index.name);
              if (!exists) {
                await queryInterface.addIndex('workflows', index.fields, {
                  name: index.name,
                });
              }
            } catch (error: any) {
              if (!error.message.includes('Duplicate key name')) {
                throw error;
              }
            }
          }
        },
        down: async (queryInterface: QueryInterface) => {
          await queryInterface.removeIndex('workflows', 'idx_workflows_user_id');
          await queryInterface.removeIndex('workflows', 'idx_workflows_is_active');
          await queryInterface.removeIndex('workflows', 'idx_workflows_created_at');
          await queryInterface.removeIndex('workflows', 'idx_workflows_updated_at');
          await queryInterface.removeIndex('workflows', 'idx_workflows_user_is_active');
        },
      },
      {
        version: '003',
        name: 'add_execution_indexes',
        description: 'Add performance indexes to executions table',
        up: async (queryInterface: QueryInterface) => {
          const indexExists = async (tableName: string, indexName: string): Promise<boolean> => {
            try {
              const indexes = await queryInterface.showIndex(tableName);
              return indexes.some((index: any) => index.name === indexName);
            } catch (error: any) {
              return false;
            }
          };

          const indexesToCreate = [
            { fields: ['workflowId'], name: 'idx_executions_workflow_id' },
            { fields: ['status'], name: 'idx_executions_status' },
            { fields: ['startedAt'], name: 'idx_executions_started_at' },
            { fields: ['finishedAt'], name: 'idx_executions_finished_at' },
            { fields: ['workflowId', 'status'], name: 'idx_executions_workflow_status' },
            { fields: ['workflowId', 'startedAt'], name: 'idx_executions_workflow_started' },
          ];

          for (const index of indexesToCreate) {
            try {
              const exists = await indexExists('executions', index.name);
              if (!exists) {
                await queryInterface.addIndex('executions', index.fields, {
                  name: index.name,
                });
              }
            } catch (error: any) {
              if (!error.message.includes('Duplicate key name')) {
                throw error;
              }
            }
          }
        },
        down: async (queryInterface: QueryInterface) => {
          await queryInterface.removeIndex('executions', 'idx_executions_workflow_id');
          await queryInterface.removeIndex('executions', 'idx_executions_status');
          await queryInterface.removeIndex('executions', 'idx_executions_started_at');
          await queryInterface.removeIndex('executions', 'idx_executions_finished_at');
          await queryInterface.removeIndex('executions', 'idx_executions_workflow_status');
          await queryInterface.removeIndex('executions', 'idx_executions_workflow_started');
        },
      },
      {
        version: '004',
        name: 'add_webhook_indexes',
        description: 'Add performance indexes to webhooks table',
        up: async (queryInterface: QueryInterface) => {
          const indexExists = async (tableName: string, indexName: string): Promise<boolean> => {
            try {
              const indexes = await queryInterface.showIndex(tableName);
              return indexes.some((index: any) => index.name === indexName);
            } catch (error: any) {
              return false;
            }
          };

          const indexesToCreate = [
            { fields: ['workflowId'], name: 'idx_webhooks_workflow_id' },
            { fields: ['path'], name: 'idx_webhooks_path' },
            { fields: ['method'], name: 'idx_webhooks_method' },
            { fields: ['method', 'path'], name: 'idx_webhooks_method_path' },
          ];

          for (const index of indexesToCreate) {
            try {
              const exists = await indexExists('webhooks', index.name);
              if (!exists) {
                const indexOptions: any = { name: index.name };
                if (index.unique) {
                  indexOptions.unique = true;
                }
                await queryInterface.addIndex('webhooks', index.fields, indexOptions);
              }
            } catch (error: any) {
              if (!error.message.includes('Duplicate key name')) {
                throw error;
              }
            }
          }
        },
        down: async (queryInterface: QueryInterface) => {
          await queryInterface.removeIndex('webhooks', 'idx_webhooks_workflow_id');
          await queryInterface.removeIndex('webhooks', 'idx_webhooks_path');
          await queryInterface.removeIndex('webhooks', 'idx_webhooks_method');
          await queryInterface.removeIndex('webhooks', 'idx_webhooks_method_path');
        },
      },
      {
        version: '005',
        name: 'add_audit_tables',
        description: 'Create audit tables for tracking data changes',
        up: async (queryInterface: QueryInterface) => {
          // Workflow audit table
          await queryInterface.createTable('workflow_audit', {
            id: {
              type: DataTypes.UUID,
              primaryKey: true,
              defaultValue: DataTypes.UUIDV4,
            },
            workflowId: {
              type: DataTypes.INTEGER,
              allowNull: false,
              references: {
                model: 'workflows',
                key: 'id',
              },
              onDelete: 'CASCADE',
            },
            action: {
              type: DataTypes.ENUM('CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE'),
              allowNull: false,
            },
            changes: {
              type: DataTypes.JSON,
              allowNull: true,
            },
            userId: {
              type: DataTypes.STRING(255),
              allowNull: true,
            },
            timestamp: {
              type: DataTypes.DATE,
              allowNull: false,
              defaultValue: DataTypes.NOW,
            },
            ipAddress: {
              type: DataTypes.STRING(45),
              allowNull: true,
            },
            userAgent: {
              type: DataTypes.TEXT,
              allowNull: true,
            },
          });

          // Execution audit table
          await queryInterface.createTable('execution_audit', {
            id: {
              type: DataTypes.UUID,
              primaryKey: true,
              defaultValue: DataTypes.UUIDV4,
            },
            executionId: {
              type: DataTypes.INTEGER,
              allowNull: false,
              references: {
                model: 'executions',
                key: 'id',
              },
              onDelete: 'CASCADE',
            },
            action: {
              type: DataTypes.ENUM('START', 'PAUSE', 'RESUME', 'CANCEL', 'COMPLETE', 'FAIL'),
              allowNull: false,
            },
            details: {
              type: DataTypes.JSON,
              allowNull: true,
            },
            userId: {
              type: DataTypes.STRING(255),
              allowNull: true,
            },
            timestamp: {
              type: DataTypes.DATE,
              allowNull: false,
              defaultValue: DataTypes.NOW,
            },
          });

          // Add indexes
          await queryInterface.addIndex('workflow_audit', ['workflowId']);
          await queryInterface.addIndex('workflow_audit', ['timestamp']);
          await queryInterface.addIndex('workflow_audit', ['action']);
          await queryInterface.addIndex('execution_audit', ['executionId']);
          await queryInterface.addIndex('execution_audit', ['timestamp']);
          await queryInterface.addIndex('execution_audit', ['action']);
        },
        down: async (queryInterface: QueryInterface) => {
          await queryInterface.dropTable('execution_audit');
          await queryInterface.dropTable('workflow_audit');
        },
      },
    ];
  }

  public async runMigrations(): Promise<void> {
    logger.info('Starting database migrations...');

    try {
      const queryInterface = db.getQueryInterface();
      
      // Check if schema_versions table exists
      const hasSchemaTable = await this.checkTableExists('schema_versions');
      
      if (!hasSchemaTable) {
        // First time setup - run the schema version migration first
        await this.migrations[0].up(queryInterface);
        await this.recordMigration(this.migrations[0]);
        logger.info(`Applied migration: ${this.migrations[0].name}`);
      }

      // Get applied migrations
      const appliedVersions = await this.getAppliedMigrations();
      
      // Run pending migrations
      for (const migration of this.migrations) {
        if (!appliedVersions.includes(migration.version)) {
          logger.info(`Applying migration: ${migration.name} (v${migration.version})`);
          
          try {
            await migration.up(queryInterface);
            await this.recordMigration(migration);
            logger.info(`✅ Migration applied: ${migration.name}`);
          } catch (error: any) {
            logger.error(`❌ Migration failed: ${migration.name}`, error);
            throw error;
          }
        }
      }

      logger.info('All migrations completed successfully');
    } catch (error: any) {
      logger.error('Migration failed:', error);
      throw error;
    }
  }

  public async rollbackMigration(version: string): Promise<void> {
    logger.info(`Rolling back migration version: ${version}`);

    const migration = this.migrations.find(m => m.version === version);
    if (!migration) {
      throw new Error(`Migration version ${version} not found`);
    }

    const queryInterface = db.getQueryInterface();
    
    try {
      await migration.down(queryInterface);
      await this.removeMigrationRecord(version);
      logger.info(`✅ Rolled back migration: ${migration.name}`);
    } catch (error: any) {
      logger.error(`❌ Rollback failed: ${migration.name}`, error);
      throw error;
    }
  }

  private async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const queryInterface = db.getQueryInterface();
      const tables = await queryInterface.showAllTables();
      return tables.includes(tableName);
    } catch (error: any) {
      return false;
    }
  }

  private async getAppliedMigrations(): Promise<string[]> {
    try {
      const hasTable = await this.checkTableExists('schema_versions');
      if (!hasTable) {
        return [];
      }

      const [results] = await db.sequelize.query(
        'SELECT version FROM schema_versions ORDER BY version ASC'
      );
      
      return (results as any[]).map(row => row.version);
    } catch (error: any) {
      logger.error('Error getting applied migrations:', error);
      return [];
    }
  }

  private async recordMigration(migration: IMigration): Promise<void> {
    await db.sequelize.query(
      'INSERT INTO schema_versions (version, name, description, appliedAt) VALUES (?, ?, ?, ?)',
      {
        replacements: [migration.version, migration.name, migration.description, new Date()],
      }
    );
  }

  private async removeMigrationRecord(version: string): Promise<void> {
    await db.sequelize.query(
      'DELETE FROM schema_versions WHERE version = ?',
      {
        replacements: [version],
      }
    );
  }

  public async getMigrationStatus(): Promise<Array<{
    version: string;
    name: string;
    description: string;
    applied: boolean;
    appliedAt?: Date;
  }>> {
    const appliedVersions = await this.getAppliedMigrations();
    
    // Get applied migration details
    const appliedDetails = await this.getAppliedMigrationDetails();
    
    return this.migrations.map(migration => {
      const appliedDetail = appliedDetails.find(d => d.version === migration.version);
      
      return {
        version: migration.version,
        name: migration.name,
        description: migration.description,
        applied: appliedVersions.includes(migration.version),
        appliedAt: appliedDetail?.appliedAt,
      };
    });
  }

  private async getAppliedMigrationDetails(): Promise<Array<{
    version: string;
    appliedAt: Date;
  }>> {
    try {
      const hasTable = await this.checkTableExists('schema_versions');
      if (!hasTable) {
        return [];
      }

      const [results] = await db.sequelize.query(
        'SELECT version, "appliedAt" FROM schema_versions ORDER BY version ASC'
      );
      
      return results as Array<{ version: string; appliedAt: Date }>;
    } catch (error: any) {
      logger.error('Error getting migration details:', error);
      return [];
    }
  }

  public async createMigrationFile(name: string, description: string): Promise<string> {
    const nextVersion = this.getNextVersion();
    const filename = `${nextVersion}_${name.toLowerCase().replace(/\s+/g, '_')}.ts`;
    const filePath = path.join(this.migrationsDir, filename);

    const template = `import { QueryInterface, DataTypes } from 'sequelize';

export const migration = {
  version: '${nextVersion}',
  name: '${name}',
  description: '${description}',
  up: async (queryInterface: QueryInterface) => {
    // TODO: Implement migration up logic
    
  },
  down: async (queryInterface: QueryInterface) => {
    // TODO: Implement migration down logic
    
  },
};
`;

    await fs.writeFile(filePath, template);
    logger.info(`Created migration file: ${filename}`);
    
    return filePath;
  }

  private getNextVersion(): string {
    const lastVersion = this.migrations.reduce((max, migration) => {
      return migration.version > max ? migration.version : max;
    }, '000');
    
    const nextNum = parseInt(lastVersion) + 1;
    return nextNum.toString().padStart(3, '0');
  }

  public async validateDatabaseIntegrity(): Promise<{
    valid: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      // Check foreign key constraints
      const fkIssues = await this.checkForeignKeyIntegrity();
      issues.push(...fkIssues);

      // Check index performance
      const indexIssues = await this.checkIndexPerformance();
      suggestions.push(...indexIssues);

      // Check data consistency
      const dataIssues = await this.checkDataConsistency();
      issues.push(...dataIssues);

      return {
        valid: issues.length === 0,
        issues,
        suggestions,
      };
    } catch (error: any) {
      logger.error('Error validating database integrity:', error);
      return {
        valid: false,
        issues: [`Database validation error: ${error.message}`],
        suggestions: [],
      };
    }
  }

  private async checkForeignKeyIntegrity(): Promise<string[]> {
    const issues: string[] = [];

    try {
      // Check orphaned executions
      const [orphanedExecutions] = await db.sequelize.query(`
        SELECT COUNT(*) as count 
        FROM executions e 
        LEFT JOIN workflows w ON e."workflowId" = w.id 
        WHERE w.id IS NULL
      `);

      if ((orphanedExecutions as any)[0]?.count > 0) {
        issues.push(`Found ${(orphanedExecutions as any)[0].count} orphaned executions`);
      }

      // Check orphaned webhooks
      const [orphanedWebhooks] = await db.sequelize.query(`
        SELECT COUNT(*) as count 
        FROM webhooks wh 
        LEFT JOIN workflows w ON wh."workflowId" = w.id 
        WHERE w.id IS NULL
      `);

      if ((orphanedWebhooks as any)[0]?.count > 0) {
        issues.push(`Found ${(orphanedWebhooks as any)[0].count} orphaned webhooks`);
      }
    } catch (error: any) {
      issues.push(`Error checking foreign key integrity: ${error.message}`);
    }

    return issues;
  }

  private async checkIndexPerformance(): Promise<string[]> {
    const suggestions: string[] = [];

    try {
      // Check for missing indexes on commonly queried columns
      const [slowQueries] = await db.sequelize.query(`
        SELECT schemaname, tablename, attname, n_distinct, correlation
        FROM pg_stats 
        WHERE schemaname = 'public' 
        AND tablename IN ('workflows', 'executions', 'webhooks')
        AND n_distinct > 100
        ORDER BY n_distinct DESC
      `);

      if ((slowQueries as any[]).length > 0) {
        suggestions.push('Consider adding indexes for high-cardinality columns');
      }
    } catch (error: any) {
      // PostgreSQL-specific query, might not work with other databases
      logger.debug('Could not check index performance:', error.message);
    }

    return suggestions;
  }

  private async checkDataConsistency(): Promise<string[]> {
    const issues: string[] = [];

    try {
      // Check for workflows without nodes
      const [emptyWorkflows] = await db.sequelize.query(`
        SELECT COUNT(*) as count 
        FROM workflows 
        WHERE nodes IS NULL OR JSONB_ARRAY_LENGTH(nodes) = 0
      `);

      if ((emptyWorkflows as any)[0]?.count > 0) {
        issues.push(`Found ${(emptyWorkflows as any)[0].count} workflows without nodes`);
      }

      // Check for active workflows without triggers
      const [activeWithoutTriggers] = await db.sequelize.query(`
        SELECT COUNT(*) as count 
        FROM workflows 
        WHERE active = true 
        AND (nodes IS NULL OR NOT EXISTS (
          SELECT 1 FROM JSONB_ARRAY_ELEMENTS(nodes) AS node 
          WHERE node->>'type' IN ('webhook', 'trigger', 'schedule')
        ))
      `);

      if ((activeWithoutTriggers as any)[0]?.count > 0) {
        issues.push(`Found ${(activeWithoutTriggers as any)[0].count} active workflows without triggers`);
      }
    } catch (error: any) {
      issues.push(`Error checking data consistency: ${error.message}`);
    }

    return issues;
  }
}

export const dataMigrationService = DataMigrationService.getInstance();