import { createLogger } from '../utils/logger';
import { db } from '../config/database';
import { Op } from 'sequelize';
import fs from 'fs/promises';
import path from 'path';

const logger = createLogger('DataArchivalService');

export interface IArchivalPolicy {
  id: string;
  name: string;
  description: string;
  table: string;
  enabled: boolean;
  retentionPeriod: number; // days
  archiveAfter: number; // days
  conditions?: Record<string, any>;
  archiveFormat: 'json' | 'csv' | 'sql';
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  deleteAfterArchive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IArchivalJob {
  id: string;
  policyId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  recordsProcessed: number;
  recordsArchived: number;
  archiveSize: number;
  archiveLocation: string;
  error?: string;
  duration?: number;
}

export interface IArchivalStats {
  totalPolicies: number;
  activePolicies: number;
  totalJobs: number;
  recordsArchived: number;
  storageFreed: number;
  lastArchivedAt?: Date;
  pendingArchival: Array<{
    table: string;
    recordCount: number;
    estimatedSize: number;
  }>;
}

export class DataArchivalService {
  private static instance: DataArchivalService;
  private archivalPolicies: IArchivalPolicy[] = [];
  private archiveDirectory: string;
  private isRunning: boolean = false;

  private constructor() {
    this.archiveDirectory = path.join(process.cwd(), 'archives');
    this.initializeArchiveDirectory();
    this.initializeDefaultPolicies();
  }

  public static getInstance(): DataArchivalService {
    if (!DataArchivalService.instance) {
      DataArchivalService.instance = new DataArchivalService();
    }
    return DataArchivalService.instance;
  }

  private async initializeArchiveDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.archiveDirectory, { recursive: true });
    } catch (error: any) {
      logger.error('Error creating archive directory:', error);
    }
  }

  private initializeDefaultPolicies(): void {
    this.archivalPolicies = [
      {
        id: 'execution-history',
        name: 'Execution History Archival',
        description: 'Archive completed workflow executions older than 90 days',
        table: 'executions',
        enabled: true,
        retentionPeriod: 90,
        archiveAfter: 90,
        conditions: {
          status: ['completed', 'error', 'cancelled'],
          finished: true,
        },
        archiveFormat: 'json',
        compressionEnabled: true,
        encryptionEnabled: false,
        deleteAfterArchive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'webhook-logs',
        name: 'Webhook Request Logs',
        description: 'Archive webhook request logs older than 30 days',
        table: 'webhook_logs',
        enabled: true,
        retentionPeriod: 30,
        archiveAfter: 30,
        archiveFormat: 'csv',
        compressionEnabled: true,
        encryptionEnabled: false,
        deleteAfterArchive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'audit-logs',
        name: 'Audit Log Archival',
        description: 'Archive audit logs older than 365 days',
        table: 'workflow_audit',
        enabled: true,
        retentionPeriod: 365,
        archiveAfter: 365,
        archiveFormat: 'json',
        compressionEnabled: true,
        encryptionEnabled: true,
        deleteAfterArchive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'inactive-workflows',
        name: 'Inactive Workflow Archival',
        description: 'Archive inactive workflows not updated in 180 days',
        table: 'workflows',
        enabled: false,
        retentionPeriod: 180,
        archiveAfter: 180,
        conditions: {
          active: false,
        },
        archiveFormat: 'json',
        compressionEnabled: true,
        encryptionEnabled: false,
        deleteAfterArchive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  public async runArchivalJobs(): Promise<IArchivalJob[]> {
    if (this.isRunning) {
      throw new Error('Archival process is already running');
    }

    this.isRunning = true;
    logger.info('Starting data archival process');

    try {
      const jobs: IArchivalJob[] = [];
      const enabledPolicies = this.archivalPolicies.filter(p => p.enabled);

      for (const policy of enabledPolicies) {
        try {
          const job = await this.executeArchivalPolicy(policy);
          if (job) {
            jobs.push(job);
          }
        } catch (error: any) {
          logger.error(`Archival policy failed: ${policy.name}`, error);
          
          jobs.push({
            id: this.generateJobId(),
            policyId: policy.id,
            status: 'failed',
            startedAt: new Date(),
            recordsProcessed: 0,
            recordsArchived: 0,
            archiveSize: 0,
            archiveLocation: '',
            error: error.message,
          });
        }
      }

      logger.info(`Data archival completed. ${jobs.length} jobs executed.`);
      return jobs;
    } finally {
      this.isRunning = false;
    }
  }

  private async executeArchivalPolicy(policy: IArchivalPolicy): Promise<IArchivalJob | null> {
    const jobId = this.generateJobId();
    const job: IArchivalJob = {
      id: jobId,
      policyId: policy.id,
      status: 'running',
      startedAt: new Date(),
      recordsProcessed: 0,
      recordsArchived: 0,
      archiveSize: 0,
      archiveLocation: '',
    };

    logger.info(`Executing archival policy: ${policy.name}`, { policyId: policy.id, jobId });

    try {
      // Find records to archive
      const recordsToArchive = await this.findRecordsToArchive(policy);

      if (recordsToArchive.length === 0) {
        logger.info(`No records to archive for policy: ${policy.name}`);
        return null;
      }

      job.recordsProcessed = recordsToArchive.length;

      // Create archive file
      const archiveFileName = `${policy.table}_${new Date().toISOString().split('T')[0]}_${jobId}.${policy.archiveFormat}`;
      const archiveFilePath = path.join(this.archiveDirectory, archiveFileName);

      // Export data to archive
      await this.exportDataToArchive(recordsToArchive, archiveFilePath, policy.archiveFormat);

      // Compress if enabled
      let finalArchivePath = archiveFilePath;
      if (policy.compressionEnabled) {
        finalArchivePath = await this.compressArchive(archiveFilePath);
        await fs.unlink(archiveFilePath); // Remove uncompressed version
      }

      // Encrypt if enabled
      if (policy.encryptionEnabled) {
        finalArchivePath = await this.encryptArchive(finalArchivePath);
        await fs.unlink(finalArchivePath.replace('.enc', '')); // Remove unencrypted version
      }

      // Calculate archive size
      const archiveStats = await fs.stat(finalArchivePath);
      job.archiveSize = archiveStats.size;
      job.archiveLocation = finalArchivePath;

      // Delete original records if policy allows
      if (policy.deleteAfterArchive) {
        await this.deleteArchivedRecords(policy.table, recordsToArchive);
      }

      job.recordsArchived = recordsToArchive.length;
      job.status = 'completed';
      job.completedAt = new Date();
      job.duration = job.completedAt.getTime() - job.startedAt.getTime();

      logger.info(`Archival policy completed: ${policy.name}`, {
        recordsArchived: job.recordsArchived,
        archiveSize: `${(job.archiveSize / 1024 / 1024).toFixed(2)}MB`,
        duration: `${job.duration}ms`,
      });

      // Record job history
      await this.recordArchivalJob(job);

      return job;
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();
      
      logger.error(`Archival policy failed: ${policy.name}`, error);
      
      // Still record the failed job
      await this.recordArchivalJob(job);
      
      throw error;
    }
  }

  private async findRecordsToArchive(policy: IArchivalPolicy): Promise<any[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.archiveAfter);

    let whereClause: any = {};

    // Add time-based condition
    if (policy.table === 'executions') {
      whereClause['stoppedAt'] = { [Op.lt]: cutoffDate };
    } else if (policy.table === 'workflow_audit') {
      whereClause['timestamp'] = { [Op.lt]: cutoffDate };
    } else {
      whereClause['updatedAt'] = { [Op.lt]: cutoffDate };
    }

    // Add policy-specific conditions
    if (policy.conditions) {
      whereClause = { ...whereClause, ...policy.conditions };
    }

    // Build query based on table
    const query = `
      SELECT * FROM "${policy.table}" 
      WHERE ${this.buildWhereClause(whereClause)}
      LIMIT 1000
    `;

    try {
      const [results] = await db.sequelize.query(query);
      return results as any[];
    } catch (error: any) {
      logger.error(`Error finding records to archive for table ${policy.table}:`, error);
      return [];
    }
  }

  private buildWhereClause(whereClause: any): string {
    const conditions = [];

    for (const [key, value] of Object.entries(whereClause)) {
      if (typeof value === 'object' && value !== null) {
        if (value[Op.lt]) {
          conditions.push(`"${key}" < '${value[Op.lt].toISOString()}'`);
        } else if (Array.isArray(value)) {
          const values = value.map(v => `'${v}'`).join(', ');
          conditions.push(`"${key}" IN (${values})`);
        }
      } else {
        if (typeof value === 'boolean') {
          conditions.push(`"${key}" = ${value}`);
        } else {
          conditions.push(`"${key}" = '${value}'`);
        }
      }
    }

    return conditions.join(' AND ');
  }

  private async exportDataToArchive(
    records: any[], 
    archiveFilePath: string, 
    format: 'json' | 'csv' | 'sql'
  ): Promise<void> {
    switch (format) {
      case 'json':
        await this.exportToJSON(records, archiveFilePath);
        break;
      case 'csv':
        await this.exportToCSV(records, archiveFilePath);
        break;
      case 'sql':
        await this.exportToSQL(records, archiveFilePath);
        break;
      default:
        throw new Error(`Unsupported archive format: ${format}`);
    }
  }

  private async exportToJSON(records: any[], filePath: string): Promise<void> {
    const jsonData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        recordCount: records.length,
        format: 'json',
      },
      records,
    };

    await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2));
  }

  private async exportToCSV(records: any[], filePath: string): Promise<void> {
    if (records.length === 0) {
      await fs.writeFile(filePath, '');
      return;
    }

    // Get headers from first record
    const headers = Object.keys(records[0]);
    let csvContent = headers.join(',') + '\n';

    // Add rows
    for (const record of records) {
      const row = headers.map(header => {
        const value = record[header];
        if (value === null || value === undefined) {
          return '';
        }
        // Escape commas and quotes in CSV
        const stringValue = String(value).replace(/"/g, '""');
        return stringValue.includes(',') || stringValue.includes('"') 
          ? `"${stringValue}"` 
          : stringValue;
      }).join(',');
      
      csvContent += row + '\n';
    }

    await fs.writeFile(filePath, csvContent);
  }

  private async exportToSQL(records: any[], filePath: string): Promise<void> {
    if (records.length === 0) {
      await fs.writeFile(filePath, '-- No records to archive\n');
      return;
    }

    // This is a simplified SQL export - would need enhancement for production
    const tableName = 'archived_data';
    let sqlContent = `-- Archive exported on ${new Date().toISOString()}\n\n`;
    
    const headers = Object.keys(records[0]);
    
    for (const record of records) {
      const values = headers.map(header => {
        const value = record[header];
        if (value === null || value === undefined) {
          return 'NULL';
        }
        if (typeof value === 'string') {
          return `'${value.replace(/'/g, "''")}'`;
        }
        if (typeof value === 'object') {
          return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        }
        return value;
      });

      sqlContent += `INSERT INTO ${tableName} (${headers.map(h => `"${h}"`).join(', ')}) VALUES (${values.join(', ')});\n`;
    }

    await fs.writeFile(filePath, sqlContent);
  }

  private async compressArchive(archiveFilePath: string): Promise<string> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const compressedPath = archiveFilePath + '.gz';
    const command = `gzip -c "${archiveFilePath}" > "${compressedPath}"`;

    try {
      await execAsync(command);
      return compressedPath;
    } catch (error: any) {
      logger.error('Archive compression failed:', error);
      throw error;
    }
  }

  private async encryptArchive(archiveFilePath: string): Promise<string> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const encryptedPath = archiveFilePath + '.enc';
    const encryptionKey = process.env.ARCHIVE_ENCRYPTION_KEY || 'default-key';
    const command = `openssl enc -aes-256-cbc -salt -in "${archiveFilePath}" -out "${encryptedPath}" -pass pass:"${encryptionKey}"`;

    try {
      await execAsync(command);
      return encryptedPath;
    } catch (error: any) {
      logger.error('Archive encryption failed:', error);
      throw error;
    }
  }

  private async deleteArchivedRecords(table: string, records: any[]): Promise<void> {
    if (records.length === 0) return;

    // Get primary key column name
    const primaryKeyCol = 'id'; // Assuming all tables use 'id' as primary key
    const ids = records.map(record => record[primaryKeyCol]);

    const deleteQuery = `
      DELETE FROM "${table}" 
      WHERE "${primaryKeyCol}" IN (${ids.map(id => `'${id}'`).join(', ')})
    `;

    try {
      await db.sequelize.query(deleteQuery);
      logger.info(`Deleted ${records.length} archived records from ${table}`);
    } catch (error: any) {
      logger.error(`Error deleting archived records from ${table}:`, error);
      throw error;
    }
  }

  private async recordArchivalJob(job: IArchivalJob): Promise<void> {
    // This would typically save to an archival_jobs table
    // For now, just log the job information
    logger.info('Archival job completed', {
      jobId: job.id,
      policyId: job.policyId,
      status: job.status,
      recordsArchived: job.recordsArchived,
      duration: job.duration,
    });
  }

  public async getArchivalStats(): Promise<IArchivalStats> {
    // This would calculate stats from actual archival job records
    // For now, return mock data structure
    return {
      totalPolicies: this.archivalPolicies.length,
      activePolicies: this.archivalPolicies.filter(p => p.enabled).length,
      totalJobs: 0,
      recordsArchived: 0,
      storageFreed: 0,
      pendingArchival: [],
    };
  }

  public async createArchivalPolicy(policy: Omit<IArchivalPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<IArchivalPolicy> {
    const newPolicy: IArchivalPolicy = {
      ...policy,
      id: this.generatePolicyId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.archivalPolicies.push(newPolicy);
    logger.info(`Created archival policy: ${newPolicy.name}`, { policyId: newPolicy.id });

    return newPolicy;
  }

  public async updateArchivalPolicy(policyId: string, updates: Partial<IArchivalPolicy>): Promise<IArchivalPolicy | null> {
    const policyIndex = this.archivalPolicies.findIndex(p => p.id === policyId);
    
    if (policyIndex === -1) {
      return null;
    }

    this.archivalPolicies[policyIndex] = {
      ...this.archivalPolicies[policyIndex],
      ...updates,
      updatedAt: new Date(),
    };

    logger.info(`Updated archival policy: ${policyId}`);
    return this.archivalPolicies[policyIndex];
  }

  public async deleteArchivalPolicy(policyId: string): Promise<boolean> {
    const policyIndex = this.archivalPolicies.findIndex(p => p.id === policyId);
    
    if (policyIndex === -1) {
      return false;
    }

    const policy = this.archivalPolicies[policyIndex];
    this.archivalPolicies.splice(policyIndex, 1);
    
    logger.info(`Deleted archival policy: ${policy.name}`, { policyId });
    return true;
  }

  public getArchivalPolicies(): IArchivalPolicy[] {
    return [...this.archivalPolicies];
  }

  public async estimateArchivalImpact(policyId: string): Promise<{
    recordsToArchive: number;
    estimatedSize: number;
    storageFreed: number;
  }> {
    const policy = this.archivalPolicies.find(p => p.id === policyId);
    
    if (!policy) {
      throw new Error(`Archival policy not found: ${policyId}`);
    }

    const recordsToArchive = await this.findRecordsToArchive(policy);
    
    // Rough estimation - actual size would depend on data content
    const avgRecordSize = 1024; // 1KB average per record
    const estimatedSize = recordsToArchive.length * avgRecordSize;
    const storageFreed = policy.deleteAfterArchive ? estimatedSize : 0;

    return {
      recordsToArchive: recordsToArchive.length,
      estimatedSize,
      storageFreed,
    };
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private generatePolicyId(): string {
    return `policy_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  public async scheduleAutomaticArchival(): Promise<void> {
    // This would set up a cron job or similar scheduling mechanism
    // For now, just log the intent
    logger.info('Automatic archival scheduling would be set up here');
  }
}

export const dataArchivalService = DataArchivalService.getInstance();