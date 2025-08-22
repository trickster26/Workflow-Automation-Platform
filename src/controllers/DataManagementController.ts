import { Request, Response } from 'express';
import { dataMigrationService } from '../services/DataMigrationService';
import { dataBackupService } from '../services/DataBackupService';
import { dataValidationService } from '../services/DataValidationService';
import { dataArchivalService } from '../services/DataArchivalService';
import { createLogger } from '../utils/logger';

const logger = createLogger('DataManagementController');

export class DataManagementController {
  // Migration endpoints
  public static async runMigrations(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Starting database migrations via API');
      await dataMigrationService.runMigrations();
      
      res.json({
        success: true,
        message: 'Database migrations completed successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Migration failed via API:', error);
      res.status(500).json({
        error: 'Migration failed',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  public static async getMigrationStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await dataMigrationService.getMigrationStatus();
      
      res.json({
        success: true,
        migrations: status,
        summary: {
          total: status.length,
          applied: status.filter(m => m.applied).length,
          pending: status.filter(m => !m.applied).length,
        },
      });
    } catch (error: any) {
      logger.error('Error getting migration status:', error);
      res.status(500).json({
        error: 'Failed to get migration status',
        message: error.message,
      });
    }
  }

  public static async rollbackMigration(req: Request, res: Response): Promise<void> {
    try {
      const { version } = req.params;
      
      if (!version) {
        return res.status(400).json({
          error: 'Migration version is required',
        });
      }

      logger.info(`Rolling back migration via API: ${version}`);
      await dataMigrationService.rollbackMigration(version);
      
      res.json({
        success: true,
        message: `Migration ${version} rolled back successfully`,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Migration rollback failed:', error);
      res.status(500).json({
        error: 'Migration rollback failed',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  public static async validateDatabase(req: Request, res: Response): Promise<void> {
    try {
      const integrity = await dataMigrationService.validateDatabaseIntegrity();
      
      res.json({
        success: true,
        validation: integrity,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Database validation failed:', error);
      res.status(500).json({
        error: 'Database validation failed',
        message: error.message,
      });
    }
  }

  // Backup endpoints
  public static async createBackup(req: Request, res: Response): Promise<void> {
    try {
      const options = req.body;
      
      logger.info('Creating backup via API', options);
      const metadata = await dataBackupService.createBackup(options);
      
      res.status(201).json({
        success: true,
        backup: metadata,
        message: 'Backup created successfully',
      });
    } catch (error: any) {
      logger.error('Backup creation failed:', error);
      res.status(500).json({
        error: 'Backup creation failed',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  public static async restoreBackup(req: Request, res: Response): Promise<void> {
    try {
      const options = req.body;
      
      if (!options.backupId && !options.backupPath) {
        return res.status(400).json({
          error: 'Either backupId or backupPath must be provided',
        });
      }

      logger.info('Restoring backup via API', options);
      await dataBackupService.restoreBackup(options);
      
      res.json({
        success: true,
        message: 'Backup restored successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Backup restore failed:', error);
      res.status(500).json({
        error: 'Backup restore failed',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  public static async listBackups(req: Request, res: Response): Promise<void> {
    try {
      const backups = await dataBackupService.getBackupMetadata();
      const stats = await dataBackupService.getBackupStats();
      
      res.json({
        success: true,
        backups,
        stats,
      });
    } catch (error: any) {
      logger.error('Error listing backups:', error);
      res.status(500).json({
        error: 'Failed to list backups',
        message: error.message,
      });
    }
  }

  public static async deleteBackup(req: Request, res: Response): Promise<void> {
    try {
      const { backupId } = req.params;
      
      if (!backupId) {
        return res.status(400).json({
          error: 'Backup ID is required',
        });
      }

      await dataBackupService.deleteBackup(backupId);
      
      res.json({
        success: true,
        message: `Backup ${backupId} deleted successfully`,
      });
    } catch (error: any) {
      logger.error('Backup deletion failed:', error);
      res.status(500).json({
        error: 'Backup deletion failed',
        message: error.message,
      });
    }
  }

  public static async getBackupStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await dataBackupService.getBackupStats();
      
      res.json({
        success: true,
        stats,
      });
    } catch (error: any) {
      logger.error('Error getting backup stats:', error);
      res.status(500).json({
        error: 'Failed to get backup statistics',
        message: error.message,
      });
    }
  }

  // Validation endpoints
  public static async runDataValidation(req: Request, res: Response): Promise<void> {
    try {
      const { ruleIds } = req.body;
      
      logger.info('Running data validation via API', { ruleIds });
      const report = await dataValidationService.runValidation(ruleIds);
      
      res.json({
        success: true,
        report,
        message: 'Data validation completed',
      });
    } catch (error: any) {
      logger.error('Data validation failed:', error);
      res.status(500).json({
        error: 'Data validation failed',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  public static async getValidationRules(req: Request, res: Response): Promise<void> {
    try {
      const rules = dataValidationService.getValidationRules();
      
      res.json({
        success: true,
        rules,
        summary: {
          total: rules.length,
          byCategory: rules.reduce((acc, rule) => {
            acc[rule.category] = (acc[rule.category] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          bySeverity: rules.reduce((acc, rule) => {
            acc[rule.severity] = (acc[rule.severity] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        },
      });
    } catch (error: any) {
      logger.error('Error getting validation rules:', error);
      res.status(500).json({
        error: 'Failed to get validation rules',
        message: error.message,
      });
    }
  }

  public static async fixValidationIssue(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId, recordId } = req.params;
      
      if (!ruleId || !recordId) {
        return res.status(400).json({
          error: 'Rule ID and record ID are required',
        });
      }

      await dataValidationService.fixIssue(ruleId, recordId);
      
      res.json({
        success: true,
        message: 'Issue fixed successfully',
      });
    } catch (error: any) {
      logger.error('Error fixing validation issue:', error);
      res.status(501).json({
        error: 'Auto-fix not implemented',
        message: error.message,
      });
    }
  }

  // Archival endpoints
  public static async runArchival(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Running data archival via API');
      const jobs = await dataArchivalService.runArchivalJobs();
      
      res.json({
        success: true,
        jobs,
        summary: {
          total: jobs.length,
          successful: jobs.filter(j => j.status === 'completed').length,
          failed: jobs.filter(j => j.status === 'failed').length,
          recordsArchived: jobs.reduce((sum, j) => sum + j.recordsArchived, 0),
        },
        message: 'Data archival completed',
      });
    } catch (error: any) {
      logger.error('Data archival failed:', error);
      res.status(500).json({
        error: 'Data archival failed',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  public static async getArchivalPolicies(req: Request, res: Response): Promise<void> {
    try {
      const policies = dataArchivalService.getArchivalPolicies();
      const stats = await dataArchivalService.getArchivalStats();
      
      res.json({
        success: true,
        policies,
        stats,
      });
    } catch (error: any) {
      logger.error('Error getting archival policies:', error);
      res.status(500).json({
        error: 'Failed to get archival policies',
        message: error.message,
      });
    }
  }

  public static async createArchivalPolicy(req: Request, res: Response): Promise<void> {
    try {
      const policyData = req.body;
      
      const policy = await dataArchivalService.createArchivalPolicy(policyData);
      
      res.status(201).json({
        success: true,
        policy,
        message: 'Archival policy created successfully',
      });
    } catch (error: any) {
      logger.error('Error creating archival policy:', error);
      res.status(400).json({
        error: 'Failed to create archival policy',
        message: error.message,
      });
    }
  }

  public static async updateArchivalPolicy(req: Request, res: Response): Promise<void> {
    try {
      const { policyId } = req.params;
      const updates = req.body;
      
      if (!policyId) {
        return res.status(400).json({
          error: 'Policy ID is required',
        });
      }

      const policy = await dataArchivalService.updateArchivalPolicy(policyId, updates);
      
      if (!policy) {
        return res.status(404).json({
          error: 'Archival policy not found',
        });
      }

      res.json({
        success: true,
        policy,
        message: 'Archival policy updated successfully',
      });
    } catch (error: any) {
      logger.error('Error updating archival policy:', error);
      res.status(500).json({
        error: 'Failed to update archival policy',
        message: error.message,
      });
    }
  }

  public static async deleteArchivalPolicy(req: Request, res: Response): Promise<void> {
    try {
      const { policyId } = req.params;
      
      if (!policyId) {
        return res.status(400).json({
          error: 'Policy ID is required',
        });
      }

      const deleted = await dataArchivalService.deleteArchivalPolicy(policyId);
      
      if (!deleted) {
        return res.status(404).json({
          error: 'Archival policy not found',
        });
      }

      res.json({
        success: true,
        message: 'Archival policy deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting archival policy:', error);
      res.status(500).json({
        error: 'Failed to delete archival policy',
        message: error.message,
      });
    }
  }

  public static async estimateArchivalImpact(req: Request, res: Response): Promise<void> {
    try {
      const { policyId } = req.params;
      
      if (!policyId) {
        return res.status(400).json({
          error: 'Policy ID is required',
        });
      }

      const impact = await dataArchivalService.estimateArchivalImpact(policyId);
      
      res.json({
        success: true,
        impact: {
          ...impact,
          estimatedSizeMB: (impact.estimatedSize / 1024 / 1024).toFixed(2),
          storageFreedMB: (impact.storageFreed / 1024 / 1024).toFixed(2),
        },
      });
    } catch (error: any) {
      logger.error('Error estimating archival impact:', error);
      res.status(500).json({
        error: 'Failed to estimate archival impact',
        message: error.message,
      });
    }
  }

  // General data management endpoints
  public static async getDataOverview(req: Request, res: Response): Promise<void> {
    try {
      // Get overview of all data management aspects
      const [migrationStatus, backupStats, archivalStats] = await Promise.all([
        dataMigrationService.getMigrationStatus(),
        dataBackupService.getBackupStats(),
        dataArchivalService.getArchivalStats(),
      ]);

      // Get table sizes and record counts
      const tableStats = await DataManagementController.getTableStatistics();

      const overview = {
        migrations: {
          total: migrationStatus.length,
          applied: migrationStatus.filter(m => m.applied).length,
          pending: migrationStatus.filter(m => !m.applied).length,
        },
        backups: {
          total: backupStats.totalBackups,
          totalSizeMB: (backupStats.totalSize / 1024 / 1024).toFixed(2),
          newest: backupStats.newestBackup,
          oldest: backupStats.oldestBackup,
        },
        archival: {
          policies: archivalStats.totalPolicies,
          activePolicies: archivalStats.activePolicies,
          recordsArchived: archivalStats.recordsArchived,
        },
        database: {
          tables: tableStats,
          totalTables: tableStats.length,
          totalRecords: tableStats.reduce((sum, table) => sum + table.recordCount, 0),
        },
        health: {
          status: 'healthy',
          lastChecked: new Date().toISOString(),
        },
      };

      res.json({
        success: true,
        overview,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Error getting data overview:', error);
      res.status(500).json({
        error: 'Failed to get data overview',
        message: error.message,
      });
    }
  }

  private static async getTableStatistics(): Promise<Array<{
    tableName: string;
    recordCount: number;
    sizeMB: number;
  }>> {
    try {
      const [results] = await db.sequelize.query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins - n_tup_del as record_count,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size_pretty,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_stat_user_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `);

      return (results as any[]).map(row => ({
        tableName: row.tablename,
        recordCount: parseInt(row.record_count) || 0,
        sizeMB: parseFloat((row.size_bytes / 1024 / 1024).toFixed(2)) || 0,
      }));
    } catch (error: any) {
      // Fallback for non-PostgreSQL databases
      logger.debug('Could not get table statistics:', error.message);
      return [];
    }
  }

  public static async optimizeDatabase(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Starting database optimization');

      const operations = [];

      // Run VACUUM and ANALYZE on PostgreSQL
      try {
        await db.sequelize.query('VACUUM ANALYZE');
        operations.push('VACUUM ANALYZE completed');
      } catch (error: any) {
        logger.debug('VACUUM ANALYZE not supported:', error.message);
      }

      // Rebuild indexes if needed
      try {
        await db.sequelize.query('REINDEX DATABASE');
        operations.push('Database reindex completed');
      } catch (error: any) {
        logger.debug('Database reindex not supported:', error.message);
      }

      // Update table statistics
      try {
        await db.sequelize.query('ANALYZE');
        operations.push('Statistics updated');
      } catch (error: any) {
        logger.debug('ANALYZE not supported:', error.message);
      }

      res.json({
        success: true,
        operations,
        message: 'Database optimization completed',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Database optimization failed:', error);
      res.status(500).json({
        error: 'Database optimization failed',
        message: error.message,
      });
    }
  }
}

// Import db after class definition to avoid circular dependency issues
const { db } = require('../config/database');