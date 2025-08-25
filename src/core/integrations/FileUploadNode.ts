import { INodeType, INodeExecuteFunctions } from '../NodeRegistry';
import { FileStorageService } from '../../services/FileStorageService';
import { createLogger } from '../../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const logger = createLogger('FileUploadNode');

export const FileUploadNode: INodeType = {
  description: {
    displayName: 'File Upload',
    name: 'fileUpload',
    group: ['files'],
    version: 1,
    description: 'Upload files to the server storage',
    defaults: {
      name: 'File Upload',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Upload Mode',
        name: 'uploadMode',
        type: 'options',
        options: [
          {
            name: 'From URL',
            value: 'url',
          },
          {
            name: 'From File Path',
            value: 'filepath',
          },
          {
            name: 'From Input Data',
            value: 'input',
          },
        ],
        default: 'url',
        description: 'How to source the file for upload',
      },
      {
        displayName: 'File URL',
        name: 'fileUrl',
        type: 'string',
        default: '',
        placeholder: 'https://example.com/file.pdf',
        description: 'URL of the file to download and upload',
        displayOptions: {
          show: {
            uploadMode: ['url'],
          },
        },
      },
      {
        displayName: 'File Path',
        name: 'filePath',
        type: 'string',
        default: '',
        placeholder: 'C:\\path\\to\\file.pdf',
        description: 'Local file path to upload',
        displayOptions: {
          show: {
            uploadMode: ['filepath'],
          },
        },
      },
      {
        displayName: 'Input Data Field',
        name: 'inputField',
        type: 'string',
        default: 'fileData',
        description: 'Field name in input data that contains file content or path',
        displayOptions: {
          show: {
            uploadMode: ['input'],
          },
        },
      },
      {
        displayName: 'File Name',
        name: 'fileName',
        type: 'string',
        default: '',
        placeholder: 'document.pdf',
        description: 'Custom file name (optional, will use original if not provided)',
      },
      {
        displayName: 'Add to Downloads',
        name: 'addToDownloads',
        type: 'boolean',
        default: true,
        description: 'Make file available for download via API',
      },
    ],
  },

  async execute(this: INodeExecuteFunctions): Promise<any[]> {
    const items = this.getInputData();
    const fileStorageService = FileStorageService.getInstance();

    if (items.length === 0) {
      throw new Error('No input data provided');
    }

    // Get parameters
    const uploadMode = this.getNodeParameter('uploadMode', 0) as string;
    const fileUrl = this.getNodeParameter('fileUrl', 0) as string;
    const filePath = this.getNodeParameter('filePath', 0) as string;
    const inputField = this.getNodeParameter('inputField', 0, 'fileData') as string;
    const customFileName = this.getNodeParameter('fileName', 0) as string;
    const addToDownloads = this.getNodeParameter('addToDownloads', 0, true) as boolean;

    logger.info('File upload node parameters', {
      uploadMode,
      fileUrl,
      filePath,
      inputField,
      customFileName,
      addToDownloads
    });

    const results = [];

    for (const [index, item] of items.entries()) {
      try {
        let fileBuffer: Buffer;
        let originalFileName: string;
        let mimeType: string = 'application/octet-stream';

        switch (uploadMode) {
          case 'url':
            if (!fileUrl) {
              throw new Error('File URL is required for URL upload mode');
            }
            
            logger.info('Downloading file from URL', { fileUrl });
            const response = await axios.get(fileUrl, { 
              responseType: 'arraybuffer',
              timeout: 30000,
              maxContentLength: 50 * 1024 * 1024, // 50MB limit
            });
            
            fileBuffer = Buffer.from(response.data);
            originalFileName = customFileName || path.basename(fileUrl) || 'downloaded_file';
            mimeType = response.headers['content-type'] || 'application/octet-stream';
            break;

          case 'filepath':
            if (!filePath) {
              throw new Error('File path is required for filepath upload mode');
            }
            
            if (!fs.existsSync(filePath)) {
              throw new Error(`File not found: ${filePath}`);
            }
            
            logger.info('Reading file from path', { filePath });
            fileBuffer = fs.readFileSync(filePath);
            originalFileName = customFileName || path.basename(filePath);
            
            // Determine MIME type from extension
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes: Record<string, string> = {
              '.pdf': 'application/pdf',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.png': 'image/png',
              '.gif': 'image/gif',
              '.csv': 'text/csv',
              '.txt': 'text/plain',
              '.json': 'application/json',
              '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              '.zip': 'application/zip',
            };
            mimeType = mimeTypes[ext] || 'application/octet-stream';
            break;

          case 'input':
            const inputData = item.json[inputField];
            if (!inputData) {
              throw new Error(`Input field '${inputField}' not found in data`);
            }
            
            if (typeof inputData === 'string') {
              // Assume it's base64 or file path
              if (inputData.startsWith('data:')) {
                // Base64 data URL
                const matches = inputData.match(/^data:([^;]+);base64,(.+)$/);
                if (!matches) {
                  throw new Error('Invalid base64 data URL format');
                }
                mimeType = matches[1];
                fileBuffer = Buffer.from(matches[2], 'base64');
                originalFileName = customFileName || `file_${Date.now()}`;
              } else if (fs.existsSync(inputData)) {
                // File path
                fileBuffer = fs.readFileSync(inputData);
                originalFileName = customFileName || path.basename(inputData);
              } else {
                // Treat as text content
                fileBuffer = Buffer.from(inputData, 'utf-8');
                originalFileName = customFileName || `text_${Date.now()}.txt`;
                mimeType = 'text/plain';
              }
            } else if (Buffer.isBuffer(inputData)) {
              fileBuffer = inputData;
              originalFileName = customFileName || `buffer_${Date.now()}`;
            } else {
              // JSON or other data - convert to string
              fileBuffer = Buffer.from(JSON.stringify(inputData, null, 2), 'utf-8');
              originalFileName = customFileName || `data_${Date.now()}.json`;
              mimeType = 'application/json';
            }
            break;

          default:
            throw new Error(`Unknown upload mode: ${uploadMode}`);
        }

        // Create a mock Express.Multer.File object
        const mockFile: Express.Multer.File = {
          fieldname: 'file',
          originalname: originalFileName,
          encoding: '7bit',
          mimetype: mimeType,
          size: fileBuffer.length,
          destination: fileStorageService.getUploadPath(),
          filename: `${Date.now()}-${originalFileName}`,
          path: path.join(fileStorageService.getUploadPath(), `${Date.now()}-${originalFileName}`),
          buffer: fileBuffer,
          stream: {} as any,
        };

        // Write the file to disk
        fs.writeFileSync(mockFile.path, fileBuffer);

        // Upload using the file storage service
        const uploadResult = await fileStorageService.uploadFile(mockFile);

        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Upload failed');
        }

        logger.info('File uploaded successfully', {
          originalName: originalFileName,
          fileName: uploadResult.fileName,
          size: fileBuffer.length,
          downloadUrl: uploadResult.downloadUrl
        });

        results.push({
          json: {
            success: true,
            upload: {
              fileName: uploadResult.fileName,
              originalName: uploadResult.originalName,
              size: uploadResult.size,
              downloadUrl: uploadResult.downloadUrl,
              filePath: uploadResult.filePath,
              mimeType,
              uploadedAt: new Date().toISOString(),
            },
            inputIndex: index,
          },
        });

      } catch (error) {
        logger.error('File upload failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          uploadMode,
          index
        });

        results.push({
          json: {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            inputIndex: index,
          },
        });
      }
    }

    return results;
  },
};