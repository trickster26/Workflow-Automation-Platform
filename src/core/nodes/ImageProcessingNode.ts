import { WorkflowNode, NodeExecution, NodeInput, NodeOutput } from '../../types/workflow.types';
import { createLogger } from '../../utils/logger';
import { imageProcessingService } from '../../services/ImageProcessingService';
import { fileStorageService } from '../../services/FileStorageService';
import path from 'path';
import fs from 'fs/promises';

interface ImageProcessingConfig {
  operation: 'analyze' | 'transform' | 'convert' | 'watermark' | 'optimize' | 'ocr' | 'batch' | 'thumbnail';
  
  // Input configuration
  inputSource: 'file' | 'url' | 'base64' | 'buffer';
  inputPath?: string;
  inputUrl?: string;
  inputData?: string; // Base64 or buffer data
  
  // Output configuration
  outputPath?: string;
  outputFormat?: 'jpeg' | 'png' | 'webp' | 'tiff' | 'avif' | 'heif';
  outputQuality?: number;
  
  // Transform options
  resize?: {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    position?: string;
    background?: string;
    maintainAspectRatio?: boolean;
  };
  crop?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  rotate?: number;
  flip?: boolean;
  flop?: boolean;
  
  // Filters and effects
  blur?: number;
  sharpen?: boolean;
  grayscale?: boolean;
  negate?: boolean;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  gamma?: number;
  threshold?: number;
  
  // Watermark options
  watermark?: {
    type: 'text' | 'image';
    content?: string;
    imagePath?: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity?: number;
    fontSize?: number;
    fontColor?: string;
    margin?: { x: number; y: number };
  };
  
  // OCR options
  ocr?: {
    language?: string;
    psm?: number;
    whitelist?: string;
    blacklist?: string;
  };
  
  // Batch processing
  batchInputs?: string[];
  batchOutputDir?: string;
  parallel?: boolean;
  maxConcurrency?: number;
  
  // Optimization
  stripMetadata?: boolean;
  progressive?: boolean;
  
  // Advanced options
  preserveOriginal?: boolean;
  generateThumbnail?: boolean;
  thumbnailSize?: { width: number; height: number };
}

export class ImageProcessingNode implements WorkflowNode {
  public readonly type = 'imageProcessing';
  public readonly name = 'Image Processing';
  public readonly category = 'Media';
  public readonly description = 'Process images with transformations, analysis, and format conversion';

  private logger: Logger;

  constructor() {
    this.logger = createLogger('ImageProcessingNode');
  }

  async execute(execution: NodeExecution): Promise<NodeOutput[]> {
    try {
      const config = execution.node.config as ImageProcessingConfig;
      const inputs = execution.inputs;

      // Validate configuration
      this.validateConfig(config);

      this.logger.info(`Image processing operation: ${config.operation}`);

      const startTime = Date.now();
      let result: any;

      // Get input image path
      const inputPath = await this.resolveInputPath(config, inputs);

      // Execute operation
      switch (config.operation) {
        case 'analyze':
          result = await this.analyzeImage(inputPath, config);
          break;
        case 'transform':
          result = await this.transformImage(inputPath, config);
          break;
        case 'convert':
          result = await this.convertImage(inputPath, config);
          break;
        case 'watermark':
          result = await this.addWatermark(inputPath, config);
          break;
        case 'optimize':
          result = await this.optimizeImage(inputPath, config);
          break;
        case 'ocr':
          result = await this.extractText(inputPath, config);
          break;
        case 'batch':
          result = await this.processBatch(config);
          break;
        case 'thumbnail':
          result = await this.generateThumbnail(inputPath, config);
          break;
        default:
          throw new Error(`Unsupported operation: ${config.operation}`);
      }

      const executionTime = Date.now() - startTime;

      this.logger.info(`Image processing completed in ${executionTime}ms`);

      return [{
        nodeId: execution.node.id,
        data: {
          success: true,
          operation: config.operation,
          result,
          processing: {
            executionTime,
            inputPath: path.basename(inputPath),
            timestamp: new Date().toISOString()
          }
        },
        metadata: { executionTime }
      }];

    } catch (error) {
      this.logger.error('Image processing failed:', error);
      return [{
        nodeId: execution.node.id,
        data: { 
          success: false,
          error: error.message,
          operation: execution.node.config?.operation
        },
        metadata: { executionTime: 0, failed: true }
      }];
    }
  }

  private validateConfig(config: ImageProcessingConfig): void {
    if (!config.operation) {
      throw new Error('Operation is required');
    }

    if (!config.inputSource) {
      throw new Error('Input source is required');
    }

    // Validate input source specific requirements
    switch (config.inputSource) {
      case 'file':
        if (!config.inputPath) {
          throw new Error('Input path is required for file input');
        }
        break;
      case 'url':
        if (!config.inputUrl) {
          throw new Error('Input URL is required for URL input');
        }
        break;
      case 'base64':
      case 'buffer':
        if (!config.inputData) {
          throw new Error('Input data is required for base64/buffer input');
        }
        break;
    }

    // Validate operation specific requirements
    switch (config.operation) {
      case 'watermark':
        if (!config.watermark) {
          throw new Error('Watermark configuration is required');
        }
        if (config.watermark.type === 'text' && !config.watermark.content) {
          throw new Error('Watermark content is required for text watermark');
        }
        if (config.watermark.type === 'image' && !config.watermark.imagePath) {
          throw new Error('Watermark image path is required for image watermark');
        }
        break;
      
      case 'batch':
        if (!config.batchInputs || config.batchInputs.length === 0) {
          throw new Error('Batch inputs are required for batch operation');
        }
        if (!config.batchOutputDir) {
          throw new Error('Batch output directory is required');
        }
        break;

      case 'convert':
        if (!config.outputFormat) {
          throw new Error('Output format is required for conversion');
        }
        break;
    }
  }

  private async resolveInputPath(config: ImageProcessingConfig, inputs: NodeInput[]): Promise<string> {
    switch (config.inputSource) {
      case 'file':
        return config.inputPath!;

      case 'url':
        // Download image from URL
        return await this.downloadImageFromUrl(config.inputUrl!);

      case 'base64':
        // Save base64 data to temp file
        return await this.saveBase64ToFile(config.inputData!);

      case 'buffer':
        // Handle buffer data from previous nodes
        const inputData = inputs.length > 0 ? inputs[0].data : null;
        if (inputData?.buffer) {
          return await this.saveBufferToFile(inputData.buffer);
        } else if (inputData?.filePath) {
          return inputData.filePath;
        } else {
          throw new Error('No buffer data found in input');
        }

      default:
        throw new Error(`Unsupported input source: ${config.inputSource}`);
    }
  }

  private async downloadImageFromUrl(url: string): Promise<string> {
    try {
      const axios = require('axios');
      const response = await axios({
        method: 'GET',
        url,
        responseType: 'stream'
      });

      const tempPath = path.join(process.cwd(), 'temp', `download_${Date.now()}.jpg`);
      const writer = require('fs').createWriteStream(tempPath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(tempPath));
        writer.on('error', reject);
      });
    } catch (error) {
      throw new Error(`Failed to download image: ${error.message}`);
    }
  }

  private async saveBase64ToFile(base64Data: string): Promise<string> {
    try {
      // Remove data URL prefix if present
      const base64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');
      
      const tempPath = path.join(process.cwd(), 'temp', `base64_${Date.now()}.jpg`);
      await fs.writeFile(tempPath, buffer);
      
      return tempPath;
    } catch (error) {
      throw new Error(`Failed to save base64 data: ${error.message}`);
    }
  }

  private async saveBufferToFile(buffer: Buffer): Promise<string> {
    try {
      const tempPath = path.join(process.cwd(), 'temp', `buffer_${Date.now()}.jpg`);
      await fs.writeFile(tempPath, buffer);
      return tempPath;
    } catch (error) {
      throw new Error(`Failed to save buffer data: ${error.message}`);
    }
  }

  private async analyzeImage(inputPath: string, config: ImageProcessingConfig): Promise<any> {
    const metadata = await imageProcessingService.analyzeImage(inputPath);
    
    return {
      metadata,
      analysis: {
        aspectRatio: metadata.width / metadata.height,
        megapixels: (metadata.width * metadata.height) / 1000000,
        fileSizeKB: Math.round(metadata.fileSize / 1024),
        isLandscape: metadata.width > metadata.height,
        isPortrait: metadata.height > metadata.width,
        isSquare: metadata.width === metadata.height
      }
    };
  }

  private async transformImage(inputPath: string, config: ImageProcessingConfig): Promise<any> {
    const outputPath = config.outputPath || this.generateOutputPath(inputPath, 'transformed');
    
    const transformOptions: any = {};
    
    if (config.resize) {
      transformOptions.resize = {
        width: config.resize.width,
        height: config.resize.height,
        fit: config.resize.fit || 'cover',
        position: config.resize.position,
        background: config.resize.background,
        withoutEnlargement: !config.resize.maintainAspectRatio
      };
    }
    
    if (config.crop) {
      transformOptions.crop = config.crop;
    }
    
    if (config.rotate) {
      transformOptions.rotate = config.rotate;
    }
    
    if (config.flip) {
      transformOptions.flip = config.flip;
    }
    
    if (config.flop) {
      transformOptions.flop = config.flop;
    }
    
    // Add filters
    if (config.blur) transformOptions.blur = config.blur;
    if (config.sharpen) transformOptions.sharpen = { sigma: 1, flat: 1, jagged: 2 };
    if (config.grayscale) transformOptions.grayscale = config.grayscale;
    if (config.negate) transformOptions.negate = config.negate;
    if (config.brightness) transformOptions.brightness = config.brightness;
    if (config.contrast) transformOptions.contrast = config.contrast;
    if (config.saturation) transformOptions.saturation = config.saturation;
    if (config.gamma) transformOptions.gamma = config.gamma;
    if (config.threshold !== undefined) transformOptions.threshold = config.threshold;

    const resultPath = await imageProcessingService.transformImage(inputPath, outputPath, transformOptions);
    
    // Generate thumbnail if requested
    let thumbnailPath;
    if (config.generateThumbnail) {
      const thumbSize = config.thumbnailSize || { width: 200, height: 200 };
      thumbnailPath = this.generateOutputPath(resultPath, 'thumbnail');
      await imageProcessingService.generateThumbnail(resultPath, thumbnailPath, thumbSize.width, thumbSize.height);
    }

    return {
      outputPath: resultPath,
      thumbnailPath,
      originalPath: config.preserveOriginal ? inputPath : undefined,
      transformations: transformOptions
    };
  }

  private async convertImage(inputPath: string, config: ImageProcessingConfig): Promise<any> {
    const outputPath = config.outputPath || this.generateOutputPath(inputPath, 'converted', config.outputFormat);
    
    const conversionOptions = {
      format: config.outputFormat!,
      quality: config.outputQuality || 80,
      progressive: config.progressive || false
    };

    const resultPath = await imageProcessingService.convertFormat(inputPath, outputPath, conversionOptions);
    
    return {
      outputPath: resultPath,
      originalPath: config.preserveOriginal ? inputPath : undefined,
      originalFormat: path.extname(inputPath).slice(1),
      newFormat: config.outputFormat,
      conversion: conversionOptions
    };
  }

  private async addWatermark(inputPath: string, config: ImageProcessingConfig): Promise<any> {
    const outputPath = config.outputPath || this.generateOutputPath(inputPath, 'watermarked');
    
    const watermarkOptions = {
      type: config.watermark!.type,
      content: config.watermark!.content,
      imagePath: config.watermark!.imagePath,
      position: config.watermark!.position,
      opacity: config.watermark!.opacity || 0.5,
      fontSize: config.watermark!.fontSize || 24,
      fontColor: config.watermark!.fontColor || 'white',
      margin: config.watermark!.margin || { x: 10, y: 10 }
    };

    const resultPath = await imageProcessingService.addWatermark(inputPath, outputPath, watermarkOptions);
    
    return {
      outputPath: resultPath,
      originalPath: config.preserveOriginal ? inputPath : undefined,
      watermark: watermarkOptions
    };
  }

  private async optimizeImage(inputPath: string, config: ImageProcessingConfig): Promise<any> {
    const outputPath = config.outputPath || this.generateOutputPath(inputPath, 'optimized');
    
    const optimizationOptions = {
      quality: config.outputQuality || 85,
      progressive: config.progressive !== false,
      strip: config.stripMetadata !== false
    };

    const resultPath = await imageProcessingService.optimizeImage(inputPath, outputPath, optimizationOptions);
    
    // Get file size comparison
    const originalStats = await fs.stat(inputPath);
    const optimizedStats = await fs.stat(resultPath);
    const compressionRatio = (originalStats.size - optimizedStats.size) / originalStats.size;
    
    return {
      outputPath: resultPath,
      originalPath: config.preserveOriginal ? inputPath : undefined,
      optimization: {
        originalSize: originalStats.size,
        optimizedSize: optimizedStats.size,
        compressionRatio: compressionRatio,
        spaceSaved: originalStats.size - optimizedStats.size,
        spaceSavedPercent: Math.round(compressionRatio * 100)
      }
    };
  }

  private async extractText(inputPath: string, config: ImageProcessingConfig): Promise<any> {
    const ocrOptions = config.ocr || {};
    const text = await imageProcessingService.extractText(inputPath, ocrOptions);
    
    return {
      text,
      wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
      characterCount: text.length,
      ocrOptions,
      confidence: 'Not available' // Tesseract.js confidence would need additional processing
    };
  }

  private async processBatch(config: ImageProcessingConfig): Promise<any> {
    const inputPaths = config.batchInputs!;
    const outputDir = config.batchOutputDir!;
    
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    // Create batch operations based on other config options
    const operations: any[] = [];
    
    if (config.resize || config.crop || config.rotate) {
      const transformOp: any = {};
      if (config.resize) transformOp.resize = config.resize;
      if (config.crop) transformOp.crop = config.crop;
      if (config.rotate) transformOp.rotate = config.rotate;
      operations.push(transformOp);
    }
    
    if (config.outputFormat) {
      operations.push({
        format: config.outputFormat,
        quality: config.outputQuality || 80
      });
    }
    
    if (config.watermark) {
      operations.push({
        type: config.watermark.type,
        content: config.watermark.content,
        imagePath: config.watermark.imagePath,
        position: config.watermark.position,
        opacity: config.watermark.opacity || 0.5
      });
    }

    const batchOptions = {
      operations,
      parallel: config.parallel !== false,
      maxConcurrency: config.maxConcurrency || 5
    };

    const resultPaths = await imageProcessingService.processBatch(inputPaths, outputDir, batchOptions);
    
    return {
      processedFiles: resultPaths,
      totalProcessed: resultPaths.length,
      inputCount: inputPaths.length,
      outputDirectory: outputDir,
      operations: operations.length,
      parallel: batchOptions.parallel
    };
  }

  private async generateThumbnail(inputPath: string, config: ImageProcessingConfig): Promise<any> {
    const thumbSize = config.thumbnailSize || { width: 200, height: 200 };
    const outputPath = config.outputPath || this.generateOutputPath(inputPath, 'thumbnail');
    
    const resultPath = await imageProcessingService.generateThumbnail(
      inputPath,
      outputPath,
      thumbSize.width,
      thumbSize.height
    );
    
    return {
      outputPath: resultPath,
      originalPath: config.preserveOriginal ? inputPath : undefined,
      thumbnailSize: thumbSize
    };
  }

  private generateOutputPath(inputPath: string, suffix: string, format?: string): string {
    const parsed = path.parse(inputPath);
    const ext = format ? `.${format}` : parsed.ext;
    return path.join(parsed.dir, `${parsed.name}_${suffix}${ext}`);
  }

  getNodeDefinition() {
    return {
      type: this.type,
      name: this.name,
      category: this.category,
      description: this.description,
      inputs: [
        {
          name: 'input',
          type: 'any',
          required: false,
          description: 'Input image data or file path'
        }
      ],
      outputs: [
        {
          name: 'output',
          type: 'any',
          description: 'Processed image result'
        }
      ],
      properties: [
        {
          name: 'operation',
          type: 'select',
          required: true,
          options: [
            { value: 'analyze', label: 'Analyze Image' },
            { value: 'transform', label: 'Transform Image' },
            { value: 'convert', label: 'Convert Format' },
            { value: 'watermark', label: 'Add Watermark' },
            { value: 'optimize', label: 'Optimize Image' },
            { value: 'ocr', label: 'Extract Text (OCR)' },
            { value: 'batch', label: 'Batch Process' },
            { value: 'thumbnail', label: 'Generate Thumbnail' }
          ],
          description: 'Image processing operation'
        },
        {
          name: 'inputSource',
          type: 'select',
          required: true,
          options: [
            { value: 'file', label: 'File Path' },
            { value: 'url', label: 'URL' },
            { value: 'base64', label: 'Base64 Data' },
            { value: 'buffer', label: 'Buffer from Previous Node' }
          ],
          description: 'Source of input image'
        },
        {
          name: 'inputPath',
          type: 'string',
          required: false,
          description: 'Path to input image file',
          displayCondition: { inputSource: 'file' }
        },
        {
          name: 'inputUrl',
          type: 'string',
          required: false,
          description: 'URL to download image from',
          displayCondition: { inputSource: 'url' }
        },
        {
          name: 'inputData',
          type: 'textarea',
          required: false,
          description: 'Base64 encoded image data',
          displayCondition: { inputSource: 'base64' }
        },
        {
          name: 'outputPath',
          type: 'string',
          required: false,
          description: 'Output file path (optional)'
        },
        {
          name: 'outputFormat',
          type: 'select',
          required: false,
          options: [
            { value: 'jpeg', label: 'JPEG' },
            { value: 'png', label: 'PNG' },
            { value: 'webp', label: 'WebP' },
            { value: 'tiff', label: 'TIFF' },
            { value: 'avif', label: 'AVIF' }
          ],
          description: 'Output image format'
        },
        {
          name: 'outputQuality',
          type: 'number',
          required: false,
          default: 80,
          min: 1,
          max: 100,
          description: 'Output image quality (1-100)'
        },
        // Resize options
        {
          name: 'resize.width',
          type: 'number',
          required: false,
          description: 'Resize width in pixels',
          displayCondition: { operation: 'transform' }
        },
        {
          name: 'resize.height',
          type: 'number',
          required: false,
          description: 'Resize height in pixels',
          displayCondition: { operation: 'transform' }
        },
        {
          name: 'resize.fit',
          type: 'select',
          required: false,
          default: 'cover',
          options: [
            { value: 'cover', label: 'Cover' },
            { value: 'contain', label: 'Contain' },
            { value: 'fill', label: 'Fill' },
            { value: 'inside', label: 'Inside' },
            { value: 'outside', label: 'Outside' }
          ],
          description: 'Resize fit strategy',
          displayCondition: { operation: 'transform' }
        },
        // Transform options
        {
          name: 'rotate',
          type: 'number',
          required: false,
          description: 'Rotation angle in degrees',
          displayCondition: { operation: 'transform' }
        },
        {
          name: 'flip',
          type: 'boolean',
          required: false,
          description: 'Flip image vertically',
          displayCondition: { operation: 'transform' }
        },
        {
          name: 'flop',
          type: 'boolean',
          required: false,
          description: 'Flip image horizontally',
          displayCondition: { operation: 'transform' }
        },
        {
          name: 'grayscale',
          type: 'boolean',
          required: false,
          description: 'Convert to grayscale',
          displayCondition: { operation: 'transform' }
        },
        {
          name: 'blur',
          type: 'number',
          required: false,
          min: 0.3,
          max: 1000,
          description: 'Blur amount (0.3-1000)',
          displayCondition: { operation: 'transform' }
        },
        // Watermark options
        {
          name: 'watermark.type',
          type: 'select',
          required: false,
          options: [
            { value: 'text', label: 'Text' },
            { value: 'image', label: 'Image' }
          ],
          description: 'Watermark type',
          displayCondition: { operation: 'watermark' }
        },
        {
          name: 'watermark.content',
          type: 'string',
          required: false,
          description: 'Watermark text content',
          displayCondition: { operation: 'watermark', 'watermark.type': 'text' }
        },
        {
          name: 'watermark.position',
          type: 'select',
          required: false,
          default: 'bottom-right',
          options: [
            { value: 'top-left', label: 'Top Left' },
            { value: 'top-right', label: 'Top Right' },
            { value: 'bottom-left', label: 'Bottom Left' },
            { value: 'bottom-right', label: 'Bottom Right' },
            { value: 'center', label: 'Center' }
          ],
          description: 'Watermark position',
          displayCondition: { operation: 'watermark' }
        },
        {
          name: 'watermark.opacity',
          type: 'number',
          required: false,
          default: 0.5,
          min: 0,
          max: 1,
          step: 0.1,
          description: 'Watermark opacity (0-1)',
          displayCondition: { operation: 'watermark' }
        },
        // OCR options
        {
          name: 'ocr.language',
          type: 'string',
          required: false,
          default: 'eng',
          description: 'OCR language code (e.g., eng, spa, fra)',
          displayCondition: { operation: 'ocr' }
        },
        // General options
        {
          name: 'preserveOriginal',
          type: 'boolean',
          required: false,
          default: false,
          description: 'Keep original file reference in output'
        },
        {
          name: 'generateThumbnail',
          type: 'boolean',
          required: false,
          default: false,
          description: 'Generate thumbnail alongside main output'
        },
        {
          name: 'thumbnailSize.width',
          type: 'number',
          required: false,
          default: 200,
          description: 'Thumbnail width',
          displayCondition: { generateThumbnail: true }
        },
        {
          name: 'thumbnailSize.height',
          type: 'number',
          required: false,
          default: 200,
          description: 'Thumbnail height',
          displayCondition: { generateThumbnail: true }
        }
      ]
    };
  }
}