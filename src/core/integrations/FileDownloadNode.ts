import { INodeType, INodeExecuteFunctions } from '../NodeRegistry';
import { FileStorageService } from '../../services/FileStorageService';
import { createLogger } from '../../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const logger = createLogger('FileDownloadNode');

export const FileDownloadNode: INodeType = {
  description: {
    displayName: 'File Download',
    name: 'fileDownload',
    group: ['files'],
    version: 1,
    description: 'Download files from URLs or retrieve stored files',
    defaults: {
      name: 'File Download',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Download Mode',
        name: 'downloadMode',
        type: 'options',
        options: [
          {
            name: 'From URL',
            value: 'url',
          },
          {
            name: 'From Storage',
            value: 'storage',
          },
          {
            name: 'From Input Data',
            value: 'input',
          },
        ],
        default: 'url',
        description: 'How to source the file for download',
      },
      {
        displayName: 'File URL',
        name: 'fileUrl',
        type: 'string',
        default: '',
        placeholder: 'https://example.com/file.pdf',
        description: 'URL of the file to download',
        displayOptions: {
          show: {
            downloadMode: ['url'],
          },
        },
      },
      {
        displayName: 'File Name',
        name: 'fileName',
        type: 'string',
        default: '',
        placeholder: 'document.pdf',
        description: 'Name of file in storage to download',
        displayOptions: {
          show: {
            downloadMode: ['storage'],
          },
        },
      },
      {
        displayName: 'URL Field',
        name: 'urlField',
        type: 'string',
        default: 'url',
        description: 'Field name in input data that contains the file URL',
        displayOptions: {
          show: {
            downloadMode: ['input'],
          },
        },
      },
      {
        displayName: 'Output Format',
        name: 'outputFormat',
        type: 'options',
        options: [
          {
            name: 'File Content (Base64)',
            value: 'base64',
          },
          {
            name: 'File Content (Buffer)',
            value: 'buffer',
          },
          {
            name: 'File Content (Text)',
            value: 'text',
          },
          {
            name: 'File Path Only',
            value: 'path',
          },
          {
            name: 'File Metadata',
            value: 'metadata',
          },
        ],
        default: 'base64',
        description: 'How to output the downloaded file data',
      },
      {
        displayName: 'Save to Storage',
        name: 'saveToStorage',
        type: 'boolean',
        default: false,
        description: 'Save downloaded file to server storage',
        displayOptions: {
          show: {
            downloadMode: ['url', 'input'],
          },
        },
      },
      {
        displayName: 'Custom File Name',
        name: 'customFileName',
        type: 'string',
        default: '',
        placeholder: 'custom_name.pdf',
        description: 'Custom name for saved file (optional)',
        displayOptions: {
          show: {
            saveToStorage: [true],
          },
        },
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
    const downloadMode = this.getNodeParameter('downloadMode', 0) as string;
    const fileUrl = this.getNodeParameter('fileUrl', 0) as string;
    const fileName = this.getNodeParameter('fileName', 0) as string;
    const urlField = this.getNodeParameter('urlField', 0, 'url') as string;
    const outputFormat = this.getNodeParameter('outputFormat', 0, 'base64') as string;
    const saveToStorage = this.getNodeParameter('saveToStorage', 0, false) as boolean;
    const customFileName = this.getNodeParameter('customFileName', 0) as string;

    logger.info('File download node parameters', {
      downloadMode,
      fileUrl,
      fileName,
      urlField,
      outputFormat,
      saveToStorage,
      customFileName
    });

    const results = [];

    for (const [index, item] of items.entries()) {
      try {
        let fileBuffer: Buffer;
        let originalFileName: string;
        let mimeType: string = 'application/octet-stream';
        let filePath: string = '';

        switch (downloadMode) {
          case 'url':
            if (!fileUrl) {
              throw new Error('File URL is required for URL download mode');
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

          case 'storage':
            if (!fileName) {
              throw new Error('File name is required for storage download mode');
            }
            
            const downloadResult = await fileStorageService.downloadFile(fileName);
            if (!downloadResult.success) {
              throw new Error(downloadResult.error || 'File not found in storage');
            }
            
            logger.info('Reading file from storage', { fileName });
            fileBuffer = fs.readFileSync(downloadResult.filePath!);
            originalFileName = fileName;
            filePath = downloadResult.filePath!;
            
            // Determine MIME type from extension
            const ext = path.extname(fileName).toLowerCase();
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
            const inputUrl = item.json[urlField];
            if (!inputUrl || typeof inputUrl !== 'string') {
              throw new Error(`URL field '${urlField}' not found or invalid in input data`);
            }
            
            logger.info('Downloading file from input URL', { inputUrl });
            const inputResponse = await axios.get(inputUrl, { 
              responseType: 'arraybuffer',
              timeout: 30000,
              maxContentLength: 50 * 1024 * 1024,
            });
            
            fileBuffer = Buffer.from(inputResponse.data);
            originalFileName = customFileName || path.basename(inputUrl) || 'downloaded_file';
            mimeType = inputResponse.headers['content-type'] || 'application/octet-stream';
            break;

          default:
            throw new Error(`Unknown download mode: ${downloadMode}`);
        }

        // Save to storage if requested
        let downloadUrl: string = '';
        let savedFileName: string = '';
        
        if (saveToStorage && downloadMode !== 'storage') {
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
          
          if (uploadResult.success) {
            downloadUrl = uploadResult.downloadUrl!;
            savedFileName = uploadResult.fileName!;
            filePath = uploadResult.filePath!;
          }
        }

        // Format output based on outputFormat parameter
        let outputData: any;
        
        switch (outputFormat) {
          case 'base64':
            outputData = {
              content: fileBuffer.toString('base64'),
              mimeType,
              encoding: 'base64',
            };
            break;
            
          case 'buffer':
            outputData = {
              content: Array.from(fileBuffer), // Convert to array for JSON serialization
              mimeType,
              encoding: 'buffer',
            };
            break;
            
          case 'text':
            outputData = {
              content: fileBuffer.toString('utf-8'),
              mimeType,
              encoding: 'text',
            };
            break;
            
          case 'path':
            outputData = {
              filePath: filePath || 'temporary',
              mimeType,
            };
            break;
            
          case 'metadata':
            outputData = {
              fileName: originalFileName,
              size: fileBuffer.length,
              mimeType,
              downloadUrl,
              savedFileName,
              filePath,
            };
            break;
            
          default:
            outputData = {
              content: fileBuffer.toString('base64'),
              mimeType,
              encoding: 'base64',
            };
        }

        logger.info('File downloaded successfully', {
          originalFileName,
          size: fileBuffer.length,
          outputFormat,
          saveToStorage,
          downloadUrl
        });

        results.push({
          json: {
            success: true,
            download: {
              fileName: originalFileName,
              size: fileBuffer.length,
              mimeType,
              downloadedAt: new Date().toISOString(),
              savedToStorage: saveToStorage && downloadMode !== 'storage',
              downloadUrl,
              savedFileName,
              ...outputData,
            },
            inputIndex: index,
          },
        });

      } catch (error) {
        logger.error('File download failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          downloadMode,
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