import fs from 'fs/promises';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '../utils/logger';
import { db } from '../config/database';
import config from '../config';

const execAsync = promisify(exec);
const logger = createLogger('DataBackupService');

export interface IBackupMetadata {
  id: string;
  name: string;
  description?: string;
  type: 'full' | 'incremental' | 'differential';
  createdAt: Date;
  size: number;
  duration: number;
  tables: string[];
  rowCounts: Record<string, number>;
  checksums: Record<string, string>;
  compressed: boolean;
  encrypted: boolean;
}

export interface IBackupOptions {
  name?: string;
  description?: string;
  type?: 'full' | 'incremental' | 'differential';
  compress?: boolean;
  encrypt?: boolean;
  encryptionKey?: string;
  includeFiles?: boolean;
  tables?: string[];
  excludeTables?: string[];
  maxRetention?: number; // days
}

export interface IRestoreOptions {
  backupId?: string;
  backupPath?: string;
  targetSchema?: string;
  dropExisting?: boolean;
  verifyIntegrity?: boolean;
  restoreFiles?: boolean;
  decryptionKey?: string;
}

export class DataBackupService {
  private static instance: DataBackupService;
  private backupsDir: string;
  private metadataFile: string;

  private constructor() {
    this.backupsDir = path.join(process.cwd(), 'backups');
    this.metadataFile = path.join(this.backupsDir, 'backup-metadata.json');
    this.ensureBackupsDirectory();
  }

  public static getInstance(): DataBackupService {
    if (!DataBackupService.instance) {
      DataBackupService.instance = new DataBackupService();
    }
    return DataBackupService.instance;
  }

  private async ensureBackupsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.backupsDir, { recursive: true });
    } catch (error: any) {
      logger.error('Error creating backups directory:', error);
    }
  }

  public async createBackup(options: IBackupOptions = {}): Promise<IBackupMetadata> {
    const startTime = Date.now();
    const backupId = this.generateBackupId();
    const backupName = options.name || `backup-${backupId}`;
    
    logger.info(`Starting backup: ${backupName}`, {
      backupId,
      type: options.type || 'full',
      compress: options.compress,
      encrypt: options.encrypt,
    });

    try {
      // Create backup directory
      const backupDir = path.join(this.backupsDir, backupId);
      await fs.mkdir(backupDir, { recursive: true });

      // Get table information
      const tables = await this.getTableList(options.tables, options.excludeTables);
      const rowCounts = await this.getRowCounts(tables);

      // Create database backup
      const dbBackupPath = await this.createDatabaseBackup(backupDir, tables, options);

      // Create file backup if requested
      if (options.includeFiles) {
        await this.createFileBackup(backupDir);
      }

      // Compress if requested
      let finalPath = dbBackupPath;
      if (options.compress) {
        finalPath = await this.compressBackup(dbBackupPath);
        await fs.unlink(dbBackupPath); // Remove uncompressed version
      }

      // Encrypt if requested
      if (options.encrypt && options.encryptionKey) {
        finalPath = await this.encryptBackup(finalPath, options.encryptionKey);
        await fs.unlink(finalPath.replace('.enc', '')); // Remove unencrypted version
      }

      // Calculate checksums and file size
      const checksums = await this.calculateChecksums(backupDir);
      const size = await this.getDirectorySize(backupDir);
      const duration = Date.now() - startTime;

      // Create metadata
      const metadata: IBackupMetadata = {
        id: backupId,
        name: backupName,
        description: options.description,
        type: options.type || 'full',
        createdAt: new Date(),
        size,
        duration,
        tables,
        rowCounts,
        checksums,
        compressed: options.compress || false,
        encrypted: options.encrypt || false,
      };

      // Save metadata
      await this.saveBackupMetadata(metadata);

      // Cleanup old backups if retention limit is set
      if (options.maxRetention) {
        await this.cleanupOldBackups(options.maxRetention);
      }

      logger.info(`✅ Backup completed: ${backupName}`, {
        backupId,
        duration: `${duration}ms`,
        size: `${(size / 1024 / 1024).toFixed(2)}MB`,
        tables: tables.length,
      });

      return metadata;
    } catch (error: any) {
      logger.error(`❌ Backup failed: ${backupName}`, error);
      
      // Cleanup failed backup
      try {
        const backupDir = path.join(this.backupsDir, backupId);
        await fs.rm(backupDir, { recursive: true, force: true });
      } catch (cleanupError: any) {
        logger.error('Error cleaning up failed backup:', cleanupError);
      }

      throw error;
    }
  }

  public async restoreBackup(options: IRestoreOptions): Promise<void> {
    logger.info('Starting backup restore', options);

    try {
      let backupPath: string;
      let metadata: IBackupMetadata | null = null;

      if (options.backupId) {
        const allMetadata = await this.getBackupMetadata();
        metadata = allMetadata.find(m => m.id === options.backupId) || null;
        
        if (!metadata) {
          throw new Error(`Backup not found: ${options.backupId}`);
        }

        backupPath = path.join(this.backupsDir, options.backupId);
      } else if (options.backupPath) {
        backupPath = options.backupPath;
      } else {
        throw new Error('Either backupId or backupPath must be provided');
      }

      // Verify backup exists
      const backupExists = await fs.access(backupPath).then(() => true).catch(() => false);
      if (!backupExists) {
        throw new Error(`Backup path does not exist: ${backupPath}`);
      }

      // Verify integrity if requested
      if (options.verifyIntegrity && metadata) {
        await this.verifyBackupIntegrity(backupPath, metadata);
      }

      // Prepare backup files
      let sqlFile = path.join(backupPath, 'database.sql');
      
      // Handle encrypted backup
      if (metadata?.encrypted && options.decryptionKey) {
        const encryptedFile = sqlFile + '.enc';
        sqlFile = await this.decryptBackup(encryptedFile, options.decryptionKey);
      }

      // Handle compressed backup
      if (metadata?.compressed) {
        const compressedFile = sqlFile + '.gz';
        sqlFile = await this.decompressBackup(compressedFile);
      }

      // Drop existing schema if requested
      if (options.dropExisting) {
        await this.dropExistingSchema(options.targetSchema);
      }

      // Restore database
      await this.restoreDatabase(sqlFile, options.targetSchema);

      // Restore files if requested
      if (options.restoreFiles) {
        const filesBackupPath = path.join(backupPath, 'files.tar.gz');
        const filesExists = await fs.access(filesBackupPath).then(() => true).catch(() => false);
        
        if (filesExists) {
          await this.restoreFiles(filesBackupPath);
        }
      }

      logger.info('✅ Backup restore completed successfully', {
        backupId: options.backupId,
        backupPath: options.backupPath,
      });
    } catch (error: any) {
      logger.error('❌ Backup restore failed:', error);
      throw error;
    }
  }

  private async createDatabaseBackup(
    backupDir: string,
    tables: string[],
    options: IBackupOptions
  ): Promise<string> {
    const backupFile = path.join(backupDir, 'database.sql');
    
    // Use pg_dump for PostgreSQL or mysqldump for MySQL
    const dbUrl = config.database.url;
    const dbType = this.detectDatabaseType(dbUrl);

    let dumpCommand: string;
    
    switch (dbType) {
      case 'postgresql':
        dumpCommand = this.buildPostgreSQLDumpCommand(dbUrl, tables, backupFile);
        break;
      case 'mysql':
        dumpCommand = this.buildMySQLDumpCommand(dbUrl, tables, backupFile);
        break;
      case 'sqlite':
        dumpCommand = this.buildSQLiteDumpCommand(dbUrl, backupFile);
        break;
      default:
        // Fallback to Sequelize-based backup
        return this.createSequelizeBackup(backupDir, tables);
    }

    logger.info(`Creating database backup: ${dumpCommand}`);
    
    try {
      const { stdout, stderr } = await execAsync(dumpCommand);
      
      if (stderr) {
        logger.warn('Backup command stderr:', stderr);
      }
      
      return backupFile;
    } catch (error: any) {
      logger.error('Database dump command failed:', error);
      
      // Fallback to Sequelize-based backup
      logger.info('Falling back to Sequelize-based backup');
      return this.createSequelizeBackup(backupDir, tables);
    }
  }

  private async createSequelizeBackup(backupDir: string, tables: string[]): Promise<string> {
    const backupFile = path.join(backupDir, 'database.sql');
    let sqlContent = '-- Sequelize-based database backup\n\n';

    for (const table of tables) {
      try {
        // Get table schema
        const [schemaRows] = await db.sequelize.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = '${table}'
          ORDER BY ordinal_position
        `);

        // Create CREATE TABLE statement
        sqlContent += `-- Table: ${table}\n`;
        sqlContent += `DROP TABLE IF EXISTS "${table}";\n`;
        sqlContent += `CREATE TABLE "${table}" (\n`;
        
        const columns = (schemaRows as any[]).map(col => {
          let def = `  "${col.column_name}" ${col.data_type}`;
          if (col.is_nullable === 'NO') def += ' NOT NULL';
          if (col.column_default) def += ` DEFAULT ${col.column_default}`;
          return def;
        });
        
        sqlContent += columns.join(',\n') + '\n);\n\n';

        // Get table data
        const [dataRows] = await db.sequelize.query(`SELECT * FROM "${table}"`);
        
        if ((dataRows as any[]).length > 0) {
          const columnNames = (schemaRows as any[]).map(col => `"${col.column_name}"`);
          sqlContent += `-- Data for table: ${table}\n`;
          
          for (const row of dataRows as any[]) {
            const values = columnNames.map(col => {
              const val = row[col.replace(/"/g, '')];
              if (val === null) return 'NULL';
              if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
              if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
              return val;
            });
            
            sqlContent += `INSERT INTO "${table}" (${columnNames.join(', ')}) VALUES (${values.join(', ')});\n`;
          }
          
          sqlContent += '\n';
        }
      } catch (error: any) {
        logger.error(`Error backing up table ${table}:`, error);
        sqlContent += `-- Error backing up table ${table}: ${error.message}\n\n`;
      }
    }

    await fs.writeFile(backupFile, sqlContent);
    return backupFile;
  }

  private detectDatabaseType(dbUrl: string): string {
    if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
      return 'postgresql';
    } else if (dbUrl.startsWith('mysql://')) {
      return 'mysql';
    } else if (dbUrl.includes('sqlite')) {
      return 'sqlite';
    }
    return 'unknown';
  }

  private buildPostgreSQLDumpCommand(dbUrl: string, tables: string[], backupFile: string): string {
    const url = new URL(dbUrl);
    const tableArgs = tables.map(t => `--table="${t}"`).join(' ');
    
    return `pg_dump "${dbUrl}" ${tableArgs} --no-owner --no-privileges --clean --if-exists > "${backupFile}"`;
  }

  private buildMySQLDumpCommand(dbUrl: string, tables: string[], backupFile: string): string {
    const url = new URL(dbUrl);
    const database = url.pathname.slice(1);
    const tableList = tables.join(' ');
    
    return `mysqldump -h ${url.hostname} -P ${url.port || 3306} -u ${url.username} -p${url.password} ${database} ${tableList} > "${backupFile}"`;
  }

  private buildSQLiteDumpCommand(dbUrl: string, backupFile: string): string {
    const dbPath = dbUrl.replace('sqlite:', '');
    return `sqlite3 "${dbPath}" .dump > "${backupFile}"`;
  }

  private async createFileBackup(backupDir: string): Promise<void> {
    // Backup important directories
    const filesToBackup = [
      'uploads',
      'logs',
      'config',
      'src/docs',
    ];

    const filesBackupPath = path.join(backupDir, 'files.tar.gz');
    
    const existingPaths = [];
    for (const filePath of filesToBackup) {
      try {
        await fs.access(filePath);
        existingPaths.push(filePath);
      } catch {
        // Path doesn't exist, skip
      }
    }

    if (existingPaths.length > 0) {
      const tarCommand = `tar -czf "${filesBackupPath}" ${existingPaths.join(' ')}`;
      
      try {
        await execAsync(tarCommand);
        logger.info('File backup created successfully');
      } catch (error: any) {
        logger.error('File backup failed:', error);
      }
    }
  }

  private async compressBackup(backupPath: string): Promise<string> {
    const compressedPath = backupPath + '.gz';
    
    await pipeline(
      createReadStream(backupPath),
      createGzip({ level: 9 }),
      createWriteStream(compressedPath)
    );

    logger.info('Backup compressed successfully');
    return compressedPath;
  }

  private async decompressBackup(compressedPath: string): Promise<string> {
    const decompressedPath = compressedPath.replace('.gz', '');
    
    await pipeline(
      createReadStream(compressedPath),
      createGunzip(),
      createWriteStream(decompressedPath)
    );

    return decompressedPath;
  }

  private async encryptBackup(backupPath: string, encryptionKey: string): Promise<string> {
    const encryptedPath = backupPath + '.enc';
    
    // Use openssl for encryption
    const encryptCommand = `openssl enc -aes-256-cbc -salt -in "${backupPath}" -out "${encryptedPath}" -pass pass:"${encryptionKey}"`;
    
    try {
      await execAsync(encryptCommand);
      logger.info('Backup encrypted successfully');
      return encryptedPath;
    } catch (error: any) {
      logger.error('Backup encryption failed:', error);
      throw error;
    }
  }

  private async decryptBackup(encryptedPath: string, decryptionKey: string): Promise<string> {
    const decryptedPath = encryptedPath.replace('.enc', '');
    
    const decryptCommand = `openssl enc -aes-256-cbc -d -in "${encryptedPath}" -out "${decryptedPath}" -pass pass:"${decryptionKey}"`;
    
    try {
      await execAsync(decryptCommand);
      return decryptedPath;
    } catch (error: any) {
      logger.error('Backup decryption failed:', error);
      throw error;
    }
  }

  private async getTableList(includeTables?: string[], excludeTables?: string[]): Promise<string[]> {
    const allTables = await db.sequelize.getQueryInterface().showAllTables();
    
    let tables = allTables.filter(table => 
      // Exclude system tables
      !table.startsWith('pg_') && 
      !table.startsWith('information_schema') &&
      table !== 'SequelizeMeta'
    );

    if (includeTables && includeTables.length > 0) {
      tables = tables.filter(table => includeTables.includes(table));
    }

    if (excludeTables && excludeTables.length > 0) {
      tables = tables.filter(table => !excludeTables.includes(table));
    }

    return tables;
  }

  private async getRowCounts(tables: string[]): Promise<Record<string, number>> {
    const rowCounts: Record<string, number> = {};

    for (const table of tables) {
      try {
        const [result] = await db.sequelize.query(`SELECT COUNT(*) as count FROM "${table}"`);
        rowCounts[table] = (result as any)[0].count;
      } catch (error: any) {
        logger.error(`Error getting row count for ${table}:`, error);
        rowCounts[table] = 0;
      }
    }

    return rowCounts;
  }

  private async calculateChecksums(backupDir: string): Promise<Record<string, string>> {
    const checksums: Record<string, string> = {};
    
    try {
      const files = await fs.readdir(backupDir);
      
      for (const file of files) {
        const filePath = path.join(backupDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          const checksumCommand = `sha256sum "${filePath}"`;
          try {
            const { stdout } = await execAsync(checksumCommand);
            checksums[file] = stdout.split(' ')[0];
          } catch (error: any) {
            logger.error(`Error calculating checksum for ${file}:`, error);
          }
        }
      }
    } catch (error: any) {
      logger.error('Error calculating checksums:', error);
    }

    return checksums;
  }

  private async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;
    
    try {
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          totalSize += stats.size;
        } else if (stats.isDirectory()) {
          totalSize += await this.getDirectorySize(filePath);
        }
      }
    } catch (error: any) {
      logger.error('Error calculating directory size:', error);
    }

    return totalSize;
  }

  private async saveBackupMetadata(metadata: IBackupMetadata): Promise<void> {
    try {
      const allMetadata = await this.getBackupMetadata();
      allMetadata.push(metadata);
      
      await fs.writeFile(this.metadataFile, JSON.stringify(allMetadata, null, 2));
    } catch (error: any) {
      logger.error('Error saving backup metadata:', error);
    }
  }

  public async getBackupMetadata(): Promise<IBackupMetadata[]> {
    try {
      const data = await fs.readFile(this.metadataFile, 'utf-8');
      return JSON.parse(data);
    } catch (error: any) {
      // File doesn't exist or is invalid
      return [];
    }
  }

  private async cleanupOldBackups(maxRetentionDays: number): Promise<void> {
    const allMetadata = await this.getBackupMetadata();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxRetentionDays);

    const toDelete = allMetadata.filter(metadata => 
      new Date(metadata.createdAt) < cutoffDate
    );

    for (const metadata of toDelete) {
      try {
        const backupDir = path.join(this.backupsDir, metadata.id);
        await fs.rm(backupDir, { recursive: true, force: true });
        
        logger.info(`Deleted old backup: ${metadata.name} (${metadata.id})`);
      } catch (error: any) {
        logger.error(`Error deleting backup ${metadata.id}:`, error);
      }
    }

    // Update metadata file
    const remaining = allMetadata.filter(metadata => 
      new Date(metadata.createdAt) >= cutoffDate
    );
    
    await fs.writeFile(this.metadataFile, JSON.stringify(remaining, null, 2));
  }

  private async verifyBackupIntegrity(backupPath: string, metadata: IBackupMetadata): Promise<void> {
    logger.info('Verifying backup integrity...');

    const currentChecksums = await this.calculateChecksums(backupPath);
    
    for (const [file, expectedChecksum] of Object.entries(metadata.checksums)) {
      const actualChecksum = currentChecksums[file];
      
      if (!actualChecksum) {
        throw new Error(`Missing file in backup: ${file}`);
      }
      
      if (actualChecksum !== expectedChecksum) {
        throw new Error(`Checksum mismatch for file ${file}`);
      }
    }

    logger.info('✅ Backup integrity verified');
  }

  private async restoreDatabase(sqlFile: string, targetSchema?: string): Promise<void> {
    const dbUrl = config.database.url;
    const dbType = this.detectDatabaseType(dbUrl);

    let restoreCommand: string;
    
    switch (dbType) {
      case 'postgresql':
        restoreCommand = `psql "${dbUrl}" < "${sqlFile}"`;
        break;
      case 'mysql':
        const url = new URL(dbUrl);
        const database = targetSchema || url.pathname.slice(1);
        restoreCommand = `mysql -h ${url.hostname} -P ${url.port || 3306} -u ${url.username} -p${url.password} ${database} < "${sqlFile}"`;
        break;
      case 'sqlite':
        const dbPath = dbUrl.replace('sqlite:', '');
        restoreCommand = `sqlite3 "${dbPath}" < "${sqlFile}"`;
        break;
      default:
        throw new Error('Database restore not supported for this database type');
    }

    logger.info('Restoring database...');
    
    try {
      const { stdout, stderr } = await execAsync(restoreCommand);
      
      if (stderr) {
        logger.warn('Restore command stderr:', stderr);
      }
      
      logger.info('✅ Database restored successfully');
    } catch (error: any) {
      logger.error('Database restore failed:', error);
      throw error;
    }
  }

  private async dropExistingSchema(schema?: string): Promise<void> {
    if (!schema) return;

    logger.info(`Dropping existing schema: ${schema}`);
    
    try {
      await db.sequelize.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await db.sequelize.query(`CREATE SCHEMA "${schema}"`);
    } catch (error: any) {
      logger.error('Error dropping schema:', error);
      throw error;
    }
  }

  private async restoreFiles(filesBackupPath: string): Promise<void> {
    logger.info('Restoring files...');
    
    const extractCommand = `tar -xzf "${filesBackupPath}" -C /`;
    
    try {
      await execAsync(extractCommand);
      logger.info('✅ Files restored successfully');
    } catch (error: any) {
      logger.error('File restore failed:', error);
      throw error;
    }
  }

  private generateBackupId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const randomId = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${randomId}`;
  }

  public async deleteBackup(backupId: string): Promise<void> {
    const allMetadata = await this.getBackupMetadata();
    const backup = allMetadata.find(m => m.id === backupId);
    
    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    // Delete backup directory
    const backupDir = path.join(this.backupsDir, backupId);
    await fs.rm(backupDir, { recursive: true, force: true });

    // Update metadata
    const updatedMetadata = allMetadata.filter(m => m.id !== backupId);
    await fs.writeFile(this.metadataFile, JSON.stringify(updatedMetadata, null, 2));

    logger.info(`Deleted backup: ${backup.name} (${backupId})`);
  }

  public async getBackupStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    oldestBackup?: Date;
    newestBackup?: Date;
    backupTypes: Record<string, number>;
  }> {
    const allMetadata = await this.getBackupMetadata();
    
    if (allMetadata.length === 0) {
      return {
        totalBackups: 0,
        totalSize: 0,
        backupTypes: {},
      };
    }

    const totalSize = allMetadata.reduce((sum, backup) => sum + backup.size, 0);
    const dates = allMetadata.map(backup => new Date(backup.createdAt));
    const backupTypes = allMetadata.reduce((types, backup) => {
      types[backup.type] = (types[backup.type] || 0) + 1;
      return types;
    }, {} as Record<string, number>);

    return {
      totalBackups: allMetadata.length,
      totalSize,
      oldestBackup: new Date(Math.min(...dates.map(d => d.getTime()))),
      newestBackup: new Date(Math.max(...dates.map(d => d.getTime()))),
      backupTypes,
    };
  }
}

export const dataBackupService = DataBackupService.getInstance();