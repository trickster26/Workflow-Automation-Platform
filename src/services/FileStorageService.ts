import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';

export interface FileUploadResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  originalName?: string;
  size?: number;
  downloadUrl?: string;
  error?: string;
}

export interface FileInfo {
  id: string;
  originalName: string;
  fileName: string;
  filePath: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  downloadUrl: string;
}

export class FileStorageService {
  private static instance: FileStorageService;
  private uploadDir: string;
  private maxFileSize: number = 50 * 1024 * 1024; // 50MB

  private constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDirectory();
  }

  public static getInstance(): FileStorageService {
    if (!FileStorageService.instance) {
      FileStorageService.instance = new FileStorageService();
    }
    return FileStorageService.instance;
  }

  private ensureUploadDirectory(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  public getMulterConfig(): multer.Options {
    return {
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          cb(null, this.uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}-${file.originalname}`;
          cb(null, uniqueName);
        }
      }),
      limits: {
        fileSize: this.maxFileSize,
      },
      fileFilter: (req, file, cb) => {
        // Allow common file types
        const allowedMimes = [
          'text/plain',
          'text/csv',
          'application/json',
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/zip',
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`File type ${file.mimetype} not allowed`));
        }
      }
    };
  }

  public async uploadFile(file: Express.Multer.File): Promise<FileUploadResult> {
    try {
      if (!file) {
        return {
          success: false,
          error: 'No file provided'
        };
      }

      const fileInfo: FileInfo = {
        id: uuidv4(),
        originalName: file.originalname,
        fileName: file.filename,
        filePath: file.path,
        size: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date(),
        downloadUrl: `/api/files/download/${file.filename}`
      };

      logger.info('File uploaded successfully', {
        module: 'FileStorageService',
        fileName: file.filename,
        originalName: file.originalname,
        size: file.size
      });

      return {
        success: true,
        filePath: file.path,
        fileName: file.filename,
        originalName: file.originalname,
        size: file.size,
        downloadUrl: fileInfo.downloadUrl
      };

    } catch (error: any) {
      logger.error('File upload failed', {
        module: 'FileStorageService',
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  public async downloadFile(fileName: string): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const filePath = path.join(this.uploadDir, fileName);
      
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: 'File not found'
        };
      }

      // Security check - ensure file is within upload directory
      const normalizedPath = path.normalize(filePath);
      const normalizedUploadDir = path.normalize(this.uploadDir);
      
      if (!normalizedPath.startsWith(normalizedUploadDir)) {
        return {
          success: false,
          error: 'Access denied'
        };
      }

      return {
        success: true,
        filePath: filePath
      };

    } catch (error: any) {
      logger.error('File download failed', {
        module: 'FileStorageService',
        fileName,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  public async deleteFile(fileName: string): Promise<boolean> {
    try {
      const filePath = path.join(this.uploadDir, fileName);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        
        logger.info('File deleted successfully', {
          module: 'FileStorageService',
          fileName
        });
        
        return true;
      }
      
      return false;
    } catch (error: any) {
      logger.error('File deletion failed', {
        module: 'FileStorageService',
        fileName,
        error: error.message
      });
      
      return false;
    }
  }

  public listFiles(): string[] {
    try {
      return fs.readdirSync(this.uploadDir);
    } catch (error) {
      logger.error('Failed to list files', {
        module: 'FileStorageService',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  public getUploadPath(): string {
    return this.uploadDir;
  }
}