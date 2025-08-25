import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import * as exifr from 'exifr';
import sizeOf from 'image-size';
import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../utils/logger';
import { fileStorageService } from './FileStorageService';

interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  colorSpace: string;
  channels: number;
  density: number;
  hasAlpha: boolean;
  fileSize: number;
  exif?: any;
  orientation?: number;
  quality?: number;
}

interface TransformOptions {
  resize?: {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    position?: string;
    background?: string;
    withoutEnlargement?: boolean;
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
  blur?: number;
  sharpen?: {
    sigma?: number;
    flat?: number;
    jagged?: number;
  };
  gamma?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  hue?: number;
  threshold?: number;
  negate?: boolean;
  grayscale?: boolean;
}

interface WatermarkOptions {
  type: 'text' | 'image';
  content?: string; // For text watermark
  imagePath?: string; // For image watermark
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity?: number;
  fontSize?: number;
  fontColor?: string;
  fontFamily?: string;
  margin?: { x: number; y: number };
  blend?: string;
}

interface ConversionOptions {
  format: 'jpeg' | 'png' | 'webp' | 'tiff' | 'avif' | 'heif' | 'gif';
  quality?: number;
  progressive?: boolean;
  lossless?: boolean;
  compression?: 'none' | 'lzw' | 'jpeg' | 'zip';
  effort?: number; // For WebP
}

interface OptimizationOptions {
  quality?: number;
  progressive?: boolean;
  mozjpeg?: boolean;
  strip?: boolean; // Remove metadata
  optimizeScans?: boolean;
}

interface OCROptions {
  language?: string;
  psm?: number; // Page segmentation mode
  whitelist?: string; // Character whitelist
  blacklist?: string; // Character blacklist
}

interface BatchProcessingOptions {
  operations: (TransformOptions | ConversionOptions | WatermarkOptions)[];
  outputFormat?: string;
  outputQuality?: number;
  parallel?: boolean;
  maxConcurrency?: number;
}

export class ImageProcessingService {
  private logger: Logger;
  private ocrWorker?: any;
  private tempDir: string;

  constructor() {
    this.logger = createLogger('ImageProcessingService');
    this.tempDir = path.join(process.cwd(), 'temp', 'images');
    this.ensureTempDir();
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create temp directory:', error);
    }
  }

  // Image Analysis
  async analyzeImage(imagePath: string): Promise<ImageMetadata> {
    try {
      this.logger.info(`Analyzing image: ${imagePath}`);

      // Get basic image info using Sharp
      const image = sharp(imagePath);
      const metadata = await image.metadata();
      
      // Get file size
      const stats = await fs.stat(imagePath);
      
      // Extract EXIF data
      let exifData;
      try {
        exifData = await exifr.parse(imagePath);
      } catch (error) {
        this.logger.debug('No EXIF data found or failed to parse');
      }

      const imageMetadata: ImageMetadata = {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        colorSpace: metadata.space || 'unknown',
        channels: metadata.channels || 0,
        density: metadata.density || 72,
        hasAlpha: metadata.hasAlpha || false,
        fileSize: stats.size,
        exif: exifData,
        orientation: metadata.orientation,
        quality: metadata.quality
      };

      this.logger.info('Image analysis completed');
      return imageMetadata;

    } catch (error) {
      this.logger.error('Image analysis failed:', error);
      throw new Error(`Failed to analyze image: ${error.message}`);
    }
  }

  // OCR (Optical Character Recognition)
  async extractText(imagePath: string, options: OCROptions = {}): Promise<string> {
    try {
      this.logger.info(`Extracting text from image: ${imagePath}`);

      if (!this.ocrWorker) {
        this.ocrWorker = await createWorker();
        await this.ocrWorker.loadLanguage(options.language || 'eng');
        await this.ocrWorker.initialize(options.language || 'eng');
      }

      // Configure OCR options
      if (options.psm) {
        await this.ocrWorker.setParameters({ tessedit_pageseg_mode: options.psm });
      }
      if (options.whitelist) {
        await this.ocrWorker.setParameters({ tessedit_char_whitelist: options.whitelist });
      }
      if (options.blacklist) {
        await this.ocrWorker.setParameters({ tessedit_char_blacklist: options.blacklist });
      }

      const { data: { text } } = await this.ocrWorker.recognize(imagePath);
      
      this.logger.info('Text extraction completed');
      return text.trim();

    } catch (error) {
      this.logger.error('Text extraction failed:', error);
      throw new Error(`Failed to extract text: ${error.message}`);
    }
  }

  // Image Transformations
  async transformImage(
    inputPath: string,
    outputPath: string,
    options: TransformOptions
  ): Promise<string> {
    try {
      this.logger.info(`Transforming image: ${inputPath} -> ${outputPath}`);

      let image = sharp(inputPath);

      // Apply resize
      if (options.resize) {
        image = image.resize({
          width: options.resize.width,
          height: options.resize.height,
          fit: options.resize.fit || 'cover',
          position: options.resize.position as any,
          background: options.resize.background || 'white',
          withoutEnlargement: options.resize.withoutEnlargement
        });
      }

      // Apply crop
      if (options.crop) {
        image = image.extract(options.crop);
      }

      // Apply rotation
      if (options.rotate) {
        image = image.rotate(options.rotate);
      }

      // Apply flip/flop
      if (options.flip) {
        image = image.flip();
      }
      if (options.flop) {
        image = image.flop();
      }

      // Apply blur
      if (options.blur) {
        image = image.blur(options.blur);
      }

      // Apply sharpen
      if (options.sharpen) {
        image = image.sharpen(
          options.sharpen.sigma,
          options.sharpen.flat,
          options.sharpen.jagged
        );
      }

      // Apply color adjustments
      if (options.gamma) {
        image = image.gamma(options.gamma);
      }
      if (options.brightness !== undefined) {
        image = image.modulate({ brightness: options.brightness });
      }
      if (options.contrast !== undefined) {
        // Sharp doesn't have direct contrast, use modulate with brightness
        image = image.modulate({ 
          brightness: options.brightness || 1,
          saturation: options.saturation || 1
        });
      }
      if (options.saturation !== undefined) {
        image = image.modulate({ saturation: options.saturation });
      }
      if (options.hue !== undefined) {
        image = image.modulate({ hue: options.hue });
      }

      // Apply threshold
      if (options.threshold !== undefined) {
        image = image.threshold(options.threshold);
      }

      // Apply negate
      if (options.negate) {
        image = image.negate();
      }

      // Apply grayscale
      if (options.grayscale) {
        image = image.grayscale();
      }

      // Save the processed image
      await image.toFile(outputPath);

      this.logger.info('Image transformation completed');
      return outputPath;

    } catch (error) {
      this.logger.error('Image transformation failed:', error);
      throw new Error(`Failed to transform image: ${error.message}`);
    }
  }

  // Format Conversion
  async convertFormat(
    inputPath: string,
    outputPath: string,
    options: ConversionOptions
  ): Promise<string> {
    try {
      this.logger.info(`Converting image format: ${inputPath} -> ${outputPath}`);

      let image = sharp(inputPath);

      // Apply format-specific options
      switch (options.format) {
        case 'jpeg':
          image = image.jpeg({
            quality: options.quality || 80,
            progressive: options.progressive || false,
            mozjpeg: true
          });
          break;

        case 'png':
          image = image.png({
            quality: options.quality || 80,
            progressive: options.progressive || false,
            compressionLevel: 6
          });
          break;

        case 'webp':
          image = image.webp({
            quality: options.quality || 80,
            lossless: options.lossless || false,
            effort: options.effort || 4
          });
          break;

        case 'tiff':
          image = image.tiff({
            quality: options.quality || 80,
            compression: options.compression as any || 'jpeg'
          });
          break;

        case 'avif':
          image = image.avif({
            quality: options.quality || 80,
            lossless: options.lossless || false,
            effort: options.effort || 4
          });
          break;

        case 'heif':
          image = image.heif({
            quality: options.quality || 80,
            lossless: options.lossless || false
          });
          break;

        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      await image.toFile(outputPath);

      this.logger.info('Format conversion completed');
      return outputPath;

    } catch (error) {
      this.logger.error('Format conversion failed:', error);
      throw new Error(`Failed to convert format: ${error.message}`);
    }
  }

  // Add Watermark
  async addWatermark(
    inputPath: string,
    outputPath: string,
    options: WatermarkOptions
  ): Promise<string> {
    try {
      this.logger.info(`Adding watermark: ${inputPath} -> ${outputPath}`);

      const image = sharp(inputPath);
      const { width, height } = await image.metadata();

      if (!width || !height) {
        throw new Error('Could not get image dimensions');
      }

      if (options.type === 'image' && options.imagePath) {
        // Image watermark
        const watermark = sharp(options.imagePath);
        const watermarkMeta = await watermark.metadata();
        
        // Calculate position
        const position = this.calculateWatermarkPosition(
          width,
          height,
          watermarkMeta.width || 0,
          watermarkMeta.height || 0,
          options.position,
          options.margin
        );

        // Apply opacity if specified
        let watermarkBuffer = await watermark.toBuffer();
        if (options.opacity && options.opacity < 1) {
          watermarkBuffer = await sharp(watermarkBuffer)
            .composite([{
              input: Buffer.from([255, 255, 255, Math.floor(255 * options.opacity)]),
              raw: { width: 1, height: 1, channels: 4 },
              tile: true,
              blend: 'dest-in'
            }])
            .toBuffer();
        }

        const result = await image
          .composite([{
            input: watermarkBuffer,
            top: position.top,
            left: position.left,
            blend: options.blend as any || 'over'
          }])
          .toFile(outputPath);

      } else if (options.type === 'text' && options.content) {
        // Text watermark - create SVG text
        const fontSize = options.fontSize || 24;
        const fontColor = options.fontColor || 'white';
        const fontFamily = options.fontFamily || 'Arial';

        const textSvg = `
          <svg width="${width}" height="${height}">
            <text 
              x="50%" 
              y="50%" 
              font-family="${fontFamily}" 
              font-size="${fontSize}" 
              fill="${fontColor}" 
              text-anchor="middle" 
              dominant-baseline="middle"
              opacity="${options.opacity || 0.5}">
              ${options.content}
            </text>
          </svg>
        `;

        const textBuffer = Buffer.from(textSvg);

        await image
          .composite([{
            input: textBuffer,
            blend: options.blend as any || 'over'
          }])
          .toFile(outputPath);

      } else {
        throw new Error('Invalid watermark options');
      }

      this.logger.info('Watermark added successfully');
      return outputPath;

    } catch (error) {
      this.logger.error('Watermark addition failed:', error);
      throw new Error(`Failed to add watermark: ${error.message}`);
    }
  }

  // Image Optimization
  async optimizeImage(
    inputPath: string,
    outputPath: string,
    options: OptimizationOptions = {}
  ): Promise<string> {
    try {
      this.logger.info(`Optimizing image: ${inputPath} -> ${outputPath}`);

      const image = sharp(inputPath);
      const metadata = await image.metadata();

      let optimizedImage = image;

      // Strip metadata if requested
      if (options.strip !== false) {
        optimizedImage = optimizedImage.withMetadata({});
      }

      // Apply format-specific optimization
      switch (metadata.format) {
        case 'jpeg':
          optimizedImage = optimizedImage.jpeg({
            quality: options.quality || 85,
            progressive: options.progressive !== false,
            mozjpeg: options.mozjpeg !== false,
            optimiseScans: options.optimizeScans !== false
          });
          break;

        case 'png':
          optimizedImage = optimizedImage.png({
            quality: options.quality || 85,
            progressive: options.progressive !== false,
            compressionLevel: 9
          });
          break;

        case 'webp':
          optimizedImage = optimizedImage.webp({
            quality: options.quality || 85,
            effort: 6
          });
          break;
      }

      await optimizedImage.toFile(outputPath);

      this.logger.info('Image optimization completed');
      return outputPath;

    } catch (error) {
      this.logger.error('Image optimization failed:', error);
      throw new Error(`Failed to optimize image: ${error.message}`);
    }
  }

  // Batch Processing
  async processBatch(
    inputPaths: string[],
    outputDir: string,
    options: BatchProcessingOptions
  ): Promise<string[]> {
    try {
      this.logger.info(`Processing batch of ${inputPaths.length} images`);

      const results: string[] = [];
      const maxConcurrency = options.maxConcurrency || 5;

      if (options.parallel && inputPaths.length > 1) {
        // Process in parallel with limited concurrency
        const chunks = this.chunkArray(inputPaths, maxConcurrency);
        
        for (const chunk of chunks) {
          const chunkPromises = chunk.map(async (inputPath, index) => {
            const outputPath = path.join(
              outputDir,
              `processed_${path.basename(inputPath)}`
            );
            
            await this.applyBatchOperations(inputPath, outputPath, options.operations);
            return outputPath;
          });
          
          const chunkResults = await Promise.all(chunkPromises);
          results.push(...chunkResults);
        }
      } else {
        // Process sequentially
        for (const inputPath of inputPaths) {
          const outputPath = path.join(
            outputDir,
            `processed_${path.basename(inputPath)}`
          );
          
          await this.applyBatchOperations(inputPath, outputPath, options.operations);
          results.push(outputPath);
        }
      }

      this.logger.info(`Batch processing completed: ${results.length} images processed`);
      return results;

    } catch (error) {
      this.logger.error('Batch processing failed:', error);
      throw new Error(`Failed to process batch: ${error.message}`);
    }
  }

  // Generate Thumbnail
  async generateThumbnail(
    inputPath: string,
    outputPath: string,
    width: number = 200,
    height: number = 200
  ): Promise<string> {
    try {
      await sharp(inputPath)
        .resize(width, height, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      throw new Error(`Failed to generate thumbnail: ${error.message}`);
    }
  }

  // Helper Methods
  private calculateWatermarkPosition(
    imageWidth: number,
    imageHeight: number,
    watermarkWidth: number,
    watermarkHeight: number,
    position: string,
    margin: { x: number; y: number } = { x: 10, y: 10 }
  ): { top: number; left: number } {
    switch (position) {
      case 'top-left':
        return { top: margin.y, left: margin.x };
      case 'top-right':
        return { top: margin.y, left: imageWidth - watermarkWidth - margin.x };
      case 'bottom-left':
        return { top: imageHeight - watermarkHeight - margin.y, left: margin.x };
      case 'bottom-right':
        return {
          top: imageHeight - watermarkHeight - margin.y,
          left: imageWidth - watermarkWidth - margin.x
        };
      case 'center':
        return {
          top: Math.floor((imageHeight - watermarkHeight) / 2),
          left: Math.floor((imageWidth - watermarkWidth) / 2)
        };
      default:
        return { top: margin.y, left: margin.x };
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private async applyBatchOperations(
    inputPath: string,
    outputPath: string,
    operations: any[]
  ): Promise<void> {
    let currentPath = inputPath;
    let tempPath = outputPath;

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      const isLastOperation = i === operations.length - 1;
      const nextPath = isLastOperation ? outputPath : 
        path.join(this.tempDir, `temp_${Date.now()}_${i}.jpg`);

      if (operation.resize || operation.crop || operation.rotate) {
        // Transform operation
        await this.transformImage(currentPath, nextPath, operation);
      } else if (operation.format) {
        // Conversion operation
        await this.convertFormat(currentPath, nextPath, operation);
      } else if (operation.type) {
        // Watermark operation
        await this.addWatermark(currentPath, nextPath, operation);
      }

      // Clean up temp file
      if (currentPath !== inputPath && currentPath !== outputPath) {
        try {
          await fs.unlink(currentPath);
        } catch (error) {
          this.logger.debug('Failed to clean up temp file:', error);
        }
      }

      currentPath = nextPath;
    }
  }

  // Cleanup
  async cleanup(): Promise<void> {
    if (this.ocrWorker) {
      await this.ocrWorker.terminate();
    }
  }
}

export const imageProcessingService = new ImageProcessingService();