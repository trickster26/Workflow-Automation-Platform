import { Router, Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { DataExportService } from '../services/DataExportService';
import { createLogger } from '../utils/logger';

const logger = createLogger('ExportRoutes');

const router = Router();
const dataExportService = DataExportService.getInstance();

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

// Download exported file
router.get('/download/:filename', authenticate, async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const exportPath = dataExportService.getExportPath();
    const filePath = path.join(exportPath, filename);

    // Security check - ensure file is within export directory
    const normalizedPath = path.normalize(filePath);
    const normalizedExportPath = path.normalize(exportPath);
    
    if (!normalizedPath.startsWith(normalizedExportPath)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const fileExtension = path.extname(filename).toLowerCase();

    // Set appropriate content type
    let contentType = 'application/octet-stream';
    switch (fileExtension) {
      case '.xlsx':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case '.csv':
        contentType = 'text/csv';
        break;
      case '.json':
        contentType = 'application/json';
        break;
    }

    // Set headers for download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stats.size);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    logger.info('Export file downloaded', {
      module: 'ExportRoutes',
      filename,
      userId: (req as any).user?.id,
      fileSize: stats.size
    });

  } catch (error) {
    logger.error('Export download failed', {
      module: 'ExportRoutes',
      filename: req.params.filename,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      message: 'Failed to download file'
    });
  }
});

// List available exports
router.get('/list', authenticate, async (req: Request, res: Response) => {
  try {
    const exports = dataExportService.listExports();
    
    // Get file details
    const exportPath = dataExportService.getExportPath();
    const fileDetails = exports.map(filename => {
      const filePath = path.join(exportPath, filename);
      const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
      
      return {
        filename,
        size: stats ? stats.size : 0,
        createdAt: stats ? stats.birthtime : null,
        modifiedAt: stats ? stats.mtime : null,
        downloadUrl: `/api/exports/download/${filename}`
      };
    });

    res.json({
      success: true,
      exports: fileDetails
    });

  } catch (error) {
    logger.error('Failed to list exports', {
      module: 'ExportRoutes',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      message: 'Failed to list exports'
    });
  }
});

// Delete export file
router.delete('/:filename', authenticate, async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const success = dataExportService.deleteExport(filename);

    if (success) {
      res.json({
        success: true,
        message: 'Export deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Export file not found'
      });
    }

  } catch (error) {
    logger.error('Failed to delete export', {
      module: 'ExportRoutes',
      filename: req.params.filename,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      message: 'Failed to delete export'
    });
  }
});

// Export data from workflow execution
router.post('/create', authenticate, async (req: Request, res: Response) => {
  try {
    const { data, format, fileName, sheetName, headers } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format. Expected array of objects.'
      });
    }

    if (!['xlsx', 'csv', 'json'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Supported formats: xlsx, csv, json'
      });
    }

    const result = await dataExportService.exportData(data, {
      format,
      fileName,
      sheetName,
      headers
    });

    res.json(result);

  } catch (error) {
    logger.error('Export creation failed', {
      module: 'ExportRoutes',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      success: false,
      message: 'Failed to create export'
    });
  }
});

export default router;