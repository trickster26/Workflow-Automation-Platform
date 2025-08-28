import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { imageProcessingService } from '../services/ImageProcessingService';
import { createLogger } from '../utils/logger';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const router = Router();
const logger = createLogger('ImageRoutes');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'images');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|bmp|tiff|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Upload image for processing
router.post('/upload', authenticate, upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No image file uploaded'
      });
    }

    const metadata = await imageProcessingService.analyzeImage(req.file.path);

    res.json({
      status: 'success',
      data: {
        fileId: req.file.filename,
        filePath: req.file.path,
        originalName: req.file.originalname,
        size: req.file.size,
        metadata
      }
    });
  } catch (error) {
    logger.error('Image upload failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload image'
    });
  }
});

// Analyze image
router.post('/analyze', authenticate, async (req: Request, res: Response) => {
  try {
    const { imagePath } = req.body;

    if (!imagePath) {
      return res.status(400).json({
        status: 'error',
        message: 'Image path is required'
      });
    }

    const metadata = await imageProcessingService.analyzeImage(imagePath);

    res.json({
      status: 'success',
      data: {
        metadata,
        analysis: {
          aspectRatio: metadata.width / metadata.height,
          megapixels: (metadata.width * metadata.height) / 1000000,
          fileSizeKB: Math.round(metadata.fileSize / 1024),
          isLandscape: metadata.width > metadata.height,
          isPortrait: metadata.height > metadata.width,
          isSquare: metadata.width === metadata.height
        }
      }
    });
  } catch (error) {
    logger.error('Image analysis failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to analyze image'
    });
  }
});

// Transform image
router.post('/transform', authenticate, async (req: Request, res: Response) => {
  try {
    const { inputPath, outputPath, options } = req.body;

    if (!inputPath) {
      return res.status(400).json({
        status: 'error',
        message: 'Input path is required'
      });
    }

    const generatedOutputPath = outputPath || path.join(
      path.dirname(inputPath),
      `transformed_${Date.now()}${path.extname(inputPath)}`
    );

    const resultPath = await imageProcessingService.transformImage(
      inputPath,
      generatedOutputPath,
      options || {}
    );

    res.json({
      status: 'success',
      data: {
        inputPath,
        outputPath: resultPath,
        transformations: options
      }
    });
  } catch (error) {
    logger.error('Image transformation failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to transform image'
    });
  }
});

// Convert image format
router.post('/convert', authenticate, async (req: Request, res: Response) => {
  try {
    const { inputPath, outputPath, format, quality } = req.body;

    if (!inputPath || !format) {
      return res.status(400).json({
        status: 'error',
        message: 'Input path and format are required'
      });
    }

    const generatedOutputPath = outputPath || path.join(
      path.dirname(inputPath),
      `${path.parse(inputPath).name}_converted.${format}`
    );

    const resultPath = await imageProcessingService.convertFormat(
      inputPath,
      generatedOutputPath,
      { format, quality: quality || 80 }
    );

    res.json({
      status: 'success',
      data: {
        inputPath,
        outputPath: resultPath,
        originalFormat: path.extname(inputPath).slice(1),
        newFormat: format,
        quality: quality || 80
      }
    });
  } catch (error) {
    logger.error('Image conversion failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to convert image'
    });
  }
});

// Add watermark
router.post('/watermark', authenticate, async (req: Request, res: Response) => {
  try {
    const { inputPath, outputPath, watermarkOptions } = req.body;

    if (!inputPath || !watermarkOptions) {
      return res.status(400).json({
        status: 'error',
        message: 'Input path and watermark options are required'
      });
    }

    const generatedOutputPath = outputPath || path.join(
      path.dirname(inputPath),
      `watermarked_${Date.now()}${path.extname(inputPath)}`
    );

    const resultPath = await imageProcessingService.addWatermark(
      inputPath,
      generatedOutputPath,
      watermarkOptions
    );

    res.json({
      status: 'success',
      data: {
        inputPath,
        outputPath: resultPath,
        watermark: watermarkOptions
      }
    });
  } catch (error) {
    logger.error('Watermark addition failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add watermark'
    });
  }
});

// Optimize image
router.post('/optimize', authenticate, async (req: Request, res: Response) => {
  try {
    const { inputPath, outputPath, options } = req.body;

    if (!inputPath) {
      return res.status(400).json({
        status: 'error',
        message: 'Input path is required'
      });
    }

    const generatedOutputPath = outputPath || path.join(
      path.dirname(inputPath),
      `optimized_${Date.now()}${path.extname(inputPath)}`
    );

    // Get original file size
    const originalStats = await fs.stat(inputPath);

    const resultPath = await imageProcessingService.optimizeImage(
      inputPath,
      generatedOutputPath,
      options || {}
    );

    // Get optimized file size
    const optimizedStats = await fs.stat(resultPath);
    const compressionRatio = (originalStats.size - optimizedStats.size) / originalStats.size;

    res.json({
      status: 'success',
      data: {
        inputPath,
        outputPath: resultPath,
        optimization: {
          originalSize: originalStats.size,
          optimizedSize: optimizedStats.size,
          compressionRatio,
          spaceSaved: originalStats.size - optimizedStats.size,
          spaceSavedPercent: Math.round(compressionRatio * 100)
        }
      }
    });
  } catch (error) {
    logger.error('Image optimization failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to optimize image'
    });
  }
});

// Extract text (OCR)
router.post('/ocr', authenticate, async (req: Request, res: Response) => {
  try {
    const { imagePath, options } = req.body;

    if (!imagePath) {
      return res.status(400).json({
        status: 'error',
        message: 'Image path is required'
      });
    }

    const text = await imageProcessingService.extractText(imagePath, options || {});

    res.json({
      status: 'success',
      data: {
        text,
        wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
        characterCount: text.length,
        imagePath,
        ocrOptions: options || {}
      }
    });
  } catch (error) {
    logger.error('OCR failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to extract text from image'
    });
  }
});

// Batch process images
router.post('/batch', authenticate, async (req: Request, res: Response) => {
  try {
    const { inputPaths, outputDir, operations, parallel, maxConcurrency } = req.body;

    if (!inputPaths || !Array.isArray(inputPaths) || inputPaths.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Input paths array is required'
      });
    }

    if (!outputDir) {
      return res.status(400).json({
        status: 'error',
        message: 'Output directory is required'
      });
    }

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    const batchOptions = {
      operations: operations || [],
      parallel: parallel !== false,
      maxConcurrency: maxConcurrency || 5
    };

    const resultPaths = await imageProcessingService.processBatch(
      inputPaths,
      outputDir,
      batchOptions
    );

    res.json({
      status: 'success',
      data: {
        processedFiles: resultPaths,
        totalProcessed: resultPaths.length,
        inputCount: inputPaths.length,
        outputDirectory: outputDir,
        operations: batchOptions.operations.length,
        parallel: batchOptions.parallel
      }
    });
  } catch (error) {
    logger.error('Batch processing failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process batch'
    });
  }
});

// Generate thumbnail
router.post('/thumbnail', authenticate, async (req: Request, res: Response) => {
  try {
    const { inputPath, outputPath, width, height } = req.body;

    if (!inputPath) {
      return res.status(400).json({
        status: 'error',
        message: 'Input path is required'
      });
    }

    const thumbWidth = width || 200;
    const thumbHeight = height || 200;

    const generatedOutputPath = outputPath || path.join(
      path.dirname(inputPath),
      `thumb_${thumbWidth}x${thumbHeight}_${Date.now()}${path.extname(inputPath)}`
    );

    const resultPath = await imageProcessingService.generateThumbnail(
      inputPath,
      generatedOutputPath,
      thumbWidth,
      thumbHeight
    );

    res.json({
      status: 'success',
      data: {
        inputPath,
        outputPath: resultPath,
        thumbnailSize: {
          width: thumbWidth,
          height: thumbHeight
        }
      }
    });
  } catch (error) {
    logger.error('Thumbnail generation failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate thumbnail'
    });
  }
});

// Get supported formats
router.get('/formats', authenticate, async (req: Request, res: Response) => {
  try {
    res.json({
      status: 'success',
      data: {
        inputFormats: [
          'jpeg', 'jpg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg'
        ],
        outputFormats: [
          'jpeg', 'png', 'webp', 'tiff', 'avif', 'heif'
        ],
        operations: [
          'analyze', 'transform', 'convert', 'watermark', 'optimize', 'ocr', 'batch', 'thumbnail'
        ],
        transformations: [
          'resize', 'crop', 'rotate', 'flip', 'flop', 'blur', 'sharpen', 
          'grayscale', 'brightness', 'contrast', 'saturation'
        ]
      }
    });
  } catch (error) {
    logger.error('Failed to get formats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve supported formats'
    });
  }
});

// Download processed image
router.get('/download/:filename', authenticate, async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'uploads', 'images', filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        status: 'error',
        message: 'File not found'
      });
    }

    res.download(filePath);
  } catch (error) {
    logger.error('File download failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to download file'
    });
  }
});

export default router;