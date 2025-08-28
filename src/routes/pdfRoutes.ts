import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { PDFGeneratorService, PDFGenerationOptions } from '../services/PDFGeneratorService';
import { createLogger } from '../utils/logger';

const logger = createLogger('PDFRoutes');
const router = Router();
const pdfGeneratorService = PDFGeneratorService.getInstance();

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

// Generate PDF from data
router.post('/generate', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      template = 'simple',
      data,
      title = 'Document',
      fileName,
      format = 'A4',
      orientation = 'portrait',
      customTemplate,
      margin,
      header,
      footer,
    } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'Data is required for PDF generation'
      });
    }

    const options: PDFGenerationOptions = {
      template,
      customTemplate,
      data: { title, ...data },
      fileName,
      format,
      orientation,
      margin,
      header,
      footer,
      title,
    };

    const result = await pdfGeneratorService.generatePDF(options);

    if (result.success) {
      res.json({
        success: true,
        pdf: {
          fileName: result.fileName,
          downloadUrl: result.downloadUrl,
          size: result.size
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error: any) {
    logger.error('PDF generation failed', {
      module: 'PDFRoutes',
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'PDF generation failed'
    });
  }
});

// Generate simple PDF from JSON data
router.post('/generate-simple', authenticate, async (req: Request, res: Response) => {
  try {
    const { data, title = 'Document' } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'Data is required for PDF generation'
      });
    }

    const result = await pdfGeneratorService.generateSimplePDF(data, title);

    if (result.success) {
      res.json({
        success: true,
        pdf: {
          fileName: result.fileName,
          downloadUrl: result.downloadUrl,
          size: result.size
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      });
    }

  } catch (error: any) {
    logger.error('Simple PDF generation failed', {
      module: 'PDFRoutes',
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'PDF generation failed'
    });
  }
});

// Download PDF
router.get('/download/:filename', authenticate, async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const outputPath = pdfGeneratorService.getOutputPath();
    const filePath = path.join(outputPath, filename);

    // Security check - ensure file is within PDF directory
    const normalizedPath = path.normalize(filePath);
    const normalizedOutputPath = path.normalize(outputPath);
    
    if (!normalizedPath.startsWith(normalizedOutputPath)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found'
      });
    }

    const stats = fs.statSync(filePath);

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stats.size);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    logger.info('PDF downloaded', {
      module: 'PDFRoutes',
      filename,
      fileSize: stats.size
    });

  } catch (error: any) {
    logger.error('PDF download failed', {
      module: 'PDFRoutes',
      filename: req.params.filename,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to download PDF'
    });
  }
});

// View PDF in browser (inline)
router.get('/view/:filename', authenticate, async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const outputPath = pdfGeneratorService.getOutputPath();
    const filePath = path.join(outputPath, filename);

    // Security check - ensure file is within PDF directory
    const normalizedPath = path.normalize(filePath);
    const normalizedOutputPath = path.normalize(outputPath);
    
    if (!normalizedPath.startsWith(normalizedOutputPath)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found'
      });
    }

    const stats = fs.statSync(filePath);

    // Set headers for inline PDF viewing
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', stats.size);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    logger.info('PDF viewed', {
      module: 'PDFRoutes',
      filename,
      fileSize: stats.size
    });

  } catch (error: any) {
    logger.error('PDF view failed', {
      module: 'PDFRoutes',
      filename: req.params.filename,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to view PDF'
    });
  }
});

// List PDFs
router.get('/list', authenticate, async (req: Request, res: Response) => {
  try {
    const pdfs = pdfGeneratorService.listPDFs();
    const outputPath = pdfGeneratorService.getOutputPath();
    
    const pdfDetails = pdfs.map(filename => {
      const filePath = path.join(outputPath, filename);
      const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
      
      return {
        filename,
        size: stats ? stats.size : 0,
        createdAt: stats ? stats.birthtime : null,
        modifiedAt: stats ? stats.mtime : null,
        downloadUrl: `/api/pdfs/download/${filename}`,
        viewUrl: `/api/pdfs/view/${filename}`
      };
    });

    res.json({
      success: true,
      pdfs: pdfDetails
    });

  } catch (error: any) {
    logger.error('Failed to list PDFs', {
      module: 'PDFRoutes',
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to list PDFs'
    });
  }
});

// Delete PDF
router.delete('/:filename', authenticate, async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const success = await pdfGeneratorService.deletePDF(filename);

    if (success) {
      res.json({
        success: true,
        message: 'PDF deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'PDF not found'
      });
    }

  } catch (error: any) {
    logger.error('Failed to delete PDF', {
      module: 'PDFRoutes',
      filename: req.params.filename,
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to delete PDF'
    });
  }
});

// Get available templates
router.get('/templates', authenticate, async (req: Request, res: Response) => {
  try {
    const templates = [
      {
        name: 'invoice',
        displayName: 'Invoice',
        description: 'Professional invoice template with company details, line items, and totals',
        fields: ['companyName', 'companyAddress', 'invoiceNumber', 'invoiceDate', 'dueDate', 'clientName', 'clientAddress', 'items', 'subtotal', 'tax', 'total']
      },
      {
        name: 'report',
        displayName: 'Report',
        description: 'Business report template with metrics, data tables, and summary sections',
        fields: ['title', 'subtitle', 'reportDate', 'metrics', 'data', 'columns', 'summary']
      },
      {
        name: 'table',
        displayName: 'Data Table',
        description: 'Simple table template for displaying tabular data',
        fields: ['title', 'subtitle', 'columns', 'data']
      },
      {
        name: 'simple',
        displayName: 'Simple Document',
        description: 'Basic document template for general content',
        fields: ['title', 'subtitle', 'content', 'data']
      }
    ];

    res.json({
      success: true,
      templates
    });

  } catch (error: any) {
    logger.error('Failed to get templates', {
      module: 'PDFRoutes',
      error: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get templates'
    });
  }
});

export default router;