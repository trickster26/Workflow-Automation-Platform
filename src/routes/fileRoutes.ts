import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { FileStorageService } from '../services/FileStorageService';
import { createLogger } from '../utils/logger';

const logger = createLogger('FileRoutes');
const router = Router();
const fileStorageService = FileStorageService.getInstance();

// Configure multer
const upload = multer(fileStorageService.getMulterConfig());

// Simple auth middleware 
const authenticate = async (req: any, res: Response, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
};

// Upload single file
router.post('/upload', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    const result = await fileStorageService.uploadFile(req.file);
    
    if (result.success) {
      res.json({
        success: true,
        file: {
          fileName: result.fileName,
          originalName: result.originalName,
          size: result.size,
          downloadUrl: result.downloadUrl
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error: any) {
    logger.error('File upload failed', {
      module: 'FileRoutes',
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'File upload failed'
    });
  }
});

// Upload multiple files
router.post('/upload-multiple', authenticate, upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files provided'
      });
    }

    const results = [];
    
    for (const file of files) {
      const result = await fileStorageService.uploadFile(file);
      results.push({
        fileName: result.fileName,
        originalName: result.originalName,
        size: result.size,
        downloadUrl: result.downloadUrl,
        success: result.success,
        error: result.error
      });
    }

    res.json({
      success: true,
      files: results
    });

  } catch (error: any) {
    logger.error('Multiple file upload failed', {
      module: 'FileRoutes',
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'File upload failed'
    });
  }
});

// Download file
router.get('/download/:filename', authenticate, async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const result = await fileStorageService.downloadFile(filename);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error || 'File not found'
      });
    }

    const filePath = result.filePath!;
    const stats = fs.statSync(filePath);
    const fileExtension = path.extname(filename).toLowerCase();

    // Set appropriate content type
    let contentType = 'application/octet-stream';
    const contentTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.csv': 'text/csv',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
      '.zip': 'application/zip',
    };

    if (contentTypes[fileExtension]) {
      contentType = contentTypes[fileExtension];
    }

    // Set headers for download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stats.size);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    logger.info('File downloaded', {
      module: 'FileRoutes',
      filename,
      fileSize: stats.size
    });

  } catch (error: any) {
    logger.error('File download failed', {
      module: 'FileRoutes',
      filename: req.params.filename,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to download file'
    });
  }
});

// List files
router.get('/list', authenticate, async (req: Request, res: Response) => {
  try {
    const files = fileStorageService.listFiles();
    const uploadPath = fileStorageService.getUploadPath();
    
    const fileDetails = files.map(filename => {
      const filePath = path.join(uploadPath, filename);
      const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
      
      return {
        filename,
        size: stats ? stats.size : 0,
        createdAt: stats ? stats.birthtime : null,
        modifiedAt: stats ? stats.mtime : null,
        downloadUrl: `/api/files/download/${filename}`
      };
    });

    res.json({
      success: true,
      files: fileDetails
    });

  } catch (error: any) {
    logger.error('Failed to list files', {
      module: 'FileRoutes',
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to list files'
    });
  }
});

// Delete file
router.delete('/:filename', authenticate, async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const success = await fileStorageService.deleteFile(filename);

    if (success) {
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

  } catch (error: any) {
    logger.error('Failed to delete file', {
      module: 'FileRoutes',
      filename: req.params.filename,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to delete file'
    });
  }
});

// Get file info
router.get('/info/:filename', authenticate, async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const uploadPath = fileStorageService.getUploadPath();
    const filePath = path.join(uploadPath, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    const stats = fs.statSync(filePath);
    
    res.json({
      success: true,
      file: {
        filename,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        downloadUrl: `/api/files/download/${filename}`,
        mimeType: path.extname(filename)
      }
    });

  } catch (error: any) {
    logger.error('Failed to get file info', {
      module: 'FileRoutes',
      filename: req.params.filename,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get file info'
    });
  }
});

export default router;