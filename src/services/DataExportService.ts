import * as XLSX from 'xlsx';
import * as csv from 'csv-writer';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

export interface ExportOptions {
  format: 'xlsx' | 'csv' | 'json';
  fileName?: string;
  sheetName?: string;
  headers?: string[];
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  downloadUrl?: string;
  error?: string;
}

export class DataExportService {
  private static instance: DataExportService;
  private exportDir: string;

  private constructor() {
    this.exportDir = path.join(process.cwd(), 'exports');
    this.ensureExportDirectory();
  }

  public static getInstance(): DataExportService {
    if (!DataExportService.instance) {
      DataExportService.instance = new DataExportService();
    }
    return DataExportService.instance;
  }

  private ensureExportDirectory(): void {
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  public async exportToExcel(data: any[], options: ExportOptions): Promise<ExportResult> {
    try {
      // Validate input data
      if (!data || !Array.isArray(data)) {
        throw new Error('Invalid data: expected an array');
      }
      
      if (data.length === 0) {
        throw new Error('No data to export: array is empty');
      }
      
      const fileName = options.fileName || `export_${Date.now()}.xlsx`;
      const filePath = path.join(this.exportDir, fileName);
      const sheetName = options.sheetName || 'Sheet1';

      // Convert data to worksheet format
      const worksheet = XLSX.utils.json_to_sheet(data);
      
      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      // Add custom headers if provided
      if (options.headers && options.headers.length > 0) {
        const headerRow = options.headers.reduce((acc, header, index) => {
          acc[XLSX.utils.encode_col(index) + '1'] = { v: header, t: 's' };
          return acc;
        }, {} as any);
        Object.assign(worksheet, headerRow);
      }

      // Write file
      XLSX.writeFile(workbook, filePath);

      logger.info('Excel export completed', {
        module: 'DataExportService',
        fileName,
        recordCount: data.length
      });

      return {
        success: true,
        filePath,
        downloadUrl: `/api/exports/download/${fileName}`
      };
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      logger.error('Excel export failed', {
        module: 'DataExportService',
        error: errorMessage,
        errorType: typeof error,
        errorStack: error?.stack
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  public async exportToCSV(data: any[], options: ExportOptions): Promise<ExportResult> {
    try {
      const fileName = options.fileName || `export_${Date.now()}.csv`;
      const filePath = path.join(this.exportDir, fileName);

      // Get headers from options or from first data record
      const headers = options.headers || (data.length > 0 ? Object.keys(data[0]) : []);
      
      // Create CSV writer
      const csvWriter = csv.createObjectCsvWriter({
        path: filePath,
        header: headers.map(h => ({ id: h, title: h }))
      });

      // Write data
      await csvWriter.writeRecords(data);

      logger.info('CSV export completed', {
        module: 'DataExportService',
        fileName,
        recordCount: data.length
      });

      return {
        success: true,
        filePath,
        downloadUrl: `/api/exports/download/${fileName}`
      };
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      logger.error('CSV export failed', {
        module: 'DataExportService',
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  public async exportToJSON(data: any[], options: ExportOptions): Promise<ExportResult> {
    try {
      const fileName = options.fileName || `export_${Date.now()}.json`;
      const filePath = path.join(this.exportDir, fileName);

      // Write JSON file
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

      logger.info('JSON export completed', {
        module: 'DataExportService',
        fileName,
        recordCount: data.length
      });

      return {
        success: true,
        filePath,
        downloadUrl: `/api/exports/download/${fileName}`
      };
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      logger.error('JSON export failed', {
        module: 'DataExportService',
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  public async exportData(data: any[], options: ExportOptions): Promise<ExportResult> {
    switch (options.format) {
      case 'xlsx':
        return this.exportToExcel(data, options);
      case 'csv':
        return this.exportToCSV(data, options);
      case 'json':
        return this.exportToJSON(data, options);
      default:
        return {
          success: false,
          error: 'Unsupported export format'
        };
    }
  }

  public getExportPath(): string {
    return this.exportDir;
  }

  public listExports(): string[] {
    try {
      return fs.readdirSync(this.exportDir);
    } catch (error) {
      logger.error('Failed to list exports', {
        module: 'DataExportService',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  public deleteExport(fileName: string): boolean {
    try {
      const filePath = path.join(this.exportDir, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info('Export file deleted', {
          module: 'DataExportService',
          fileName
        });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to delete export', {
        module: 'DataExportService',
        fileName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}