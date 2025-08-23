import { INodeType, INodeExecuteFunctions } from '../NodeRegistry';
import { DataExportService } from '../../services/DataExportService';
import { createLogger } from '../../utils/logger';
import * as JSONPath from 'jsonpath';

const logger = createLogger('ExportNode');

export const ExportNode: INodeType = {
  description: {
    displayName: 'Export Data',
    name: 'export',
    group: ['output'],
    version: 1,
    description: 'Export data to Excel, CSV, or JSON format',
    defaults: {
      name: 'Export Data',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Export Format',
        name: 'format',
        type: 'options',
        options: [
          {
            name: 'Excel (.xlsx)',
            value: 'xlsx',
          },
          {
            name: 'CSV (.csv)',
            value: 'csv',
          },
          {
            name: 'JSON (.json)',
            value: 'json',
          },
        ],
        default: 'xlsx',
        description: 'Format to export data to',
      },
      {
        displayName: 'File Name',
        name: 'fileName',
        type: 'string',
        default: '',
        placeholder: 'data_export.xlsx',
        description: 'Name of the export file (optional)',
      },
      {
        displayName: 'Sheet Name',
        name: 'sheetName',
        type: 'string',
        default: 'Sheet1',
        description: 'Name of the Excel sheet',
        displayOptions: {
          show: {
            format: ['xlsx'],
          },
        },
      },
      {
        displayName: 'Data Path',
        name: 'dataPath',
        type: 'string',
        default: '',
        placeholder: '$.products',
        description: 'JSONPath to extract data from input (optional)',
      },
      {
        displayName: 'Custom Headers',
        name: 'headers',
        type: 'string',
        default: '',
        placeholder: 'id,title,price,description',
        description: 'Comma-separated custom headers (optional)',
      },
      {
        displayName: 'Auto Download',
        name: 'autoDownload',
        type: 'boolean',
        default: false,
        description: 'Automatically download the file after export',
      },
    ],
  },

  async execute(this: INodeExecuteFunctions): Promise<any[]> {
    const items = this.getInputData();
    const dataExportService = DataExportService.getInstance();

    if (items.length === 0) {
      throw new Error('No input data to export');
    }

    // Get parameters with defaults
    const format = (this.getNodeParameter('format', 0, 'xlsx') as 'xlsx' | 'csv' | 'json') || 'xlsx';
    const fileName = this.getNodeParameter('fileName', 0) as string;
    const sheetName = this.getNodeParameter('sheetName', 0, 'Sheet1') as string;
    const dataPath = this.getNodeParameter('dataPath', 0) as string;
    const headersString = this.getNodeParameter('headers', 0) as string;
    const autoDownload = this.getNodeParameter('autoDownload', 0, false) as boolean;

    logger.info('Export node parameters', {
      format,
      formatType: typeof format,
      fileName,
      dataPath,
      headersString,
      autoDownload
    });

    try {
      // Extract data from input
      let dataToExport: any[] = [];
      
      for (const item of items) {
        logger.info('Processing export item', {
          itemStructure: typeof item.json,
          itemKeys: Object.keys(item.json || {}),
          dataPath,
          hasDataPath: !!dataPath,
          sampleInputData: JSON.stringify(item.json, null, 2).substring(0, 1000)
        });

        if (dataPath) {
          // Use JSONPath to extract data
          try {
            // First try the path as given
            let extractedData = JSONPath.query(item.json, dataPath);
            
            // If empty, try with body prefix
            if ((!extractedData || extractedData.length === 0) && item.json?.body) {
              const bodyPath = dataPath.startsWith('$.body.') ? dataPath : '$.body' + dataPath.substring(1);
              extractedData = JSONPath.query(item.json, bodyPath);
              
              if (extractedData && extractedData.length > 0) {
                logger.info('Found data using body-prefixed path', {
                  originalPath: dataPath,
                  bodyPath,
                  foundCount: extractedData.length
                });
              }
            }
            
            logger.info('JSONPath extraction result', {
              dataPath,
              extractedCount: extractedData?.length || 0,
              extractedType: Array.isArray(extractedData) ? 'array' : typeof extractedData,
              sampleData: extractedData?.slice(0, 2) // Show first 2 items for debugging
            });
            
            if (Array.isArray(extractedData) && extractedData.length > 0) {
              // First extraction worked, check if it's nested arrays
              if (extractedData.length === 1 && Array.isArray(extractedData[0])) {
                dataToExport.push(...extractedData[0]);
              } else {
                dataToExport.push(...extractedData);
              }
            } else {
              // Try alternative common paths for HTTP responses
              const alternativePaths = [
                '$.body.products',
                '$.products', 
                '$.data.products',
                '$.response.products',
                '$.body',
                '$.data',
                '$.body.data'
              ];
              
              let found = false;
              for (const altPath of alternativePaths) {
                if (altPath === dataPath) continue; // Skip the one we already tried
                try {
                  const altData = JSONPath.query(item.json, altPath);
                  if (Array.isArray(altData) && altData.length > 0) {
                    // Check if we got nested arrays
                    if (altData.length === 1 && Array.isArray(altData[0])) {
                      logger.info('Found data using alternative path (nested array)', {
                        originalPath: dataPath,
                        workingPath: altPath,
                        foundCount: altData[0].length
                      });
                      dataToExport.push(...altData[0]);
                    } else {
                      logger.info('Found data using alternative path', {
                        originalPath: dataPath,
                        workingPath: altPath,
                        foundCount: altData.length
                      });
                      dataToExport.push(...altData);
                    }
                    found = true;
                    break;
                  }
                } catch (err) {
                  // Continue trying other paths
                }
              }
              
              if (!found) {
                // Try to extract body.products directly if HTTP response
                if (item.json?.body && typeof item.json.body === 'object') {
                  // Try to extract products from body
                  const pathParts = dataPath.replace('$', '').split('.').filter(p => p);
                  const lastPart = pathParts[pathParts.length - 1] || 'products';
                  
                  logger.info('Attempting body extraction', {
                    dataPath,
                    pathParts,
                    lastPart,
                    bodyKeys: Object.keys(item.json.body || {})
                  });
                  
                  if (item.json.body[lastPart]) {
                    logger.info('Found data in body.' + lastPart, {
                      originalPath: dataPath,
                      foundCount: Array.isArray(item.json.body[lastPart]) ? item.json.body[lastPart].length : 1
                    });
                    if (Array.isArray(item.json.body[lastPart])) {
                      dataToExport.push(...item.json.body[lastPart]);
                    } else {
                      dataToExport.push(item.json.body[lastPart]);
                    }
                  } else if (item.json.body) {
                    // Use the entire body if no specific field found
                    logger.warn('Using entire body as fallback', {
                      dataPath,
                      bodyKeys: Object.keys(item.json.body).slice(0, 10)
                    });
                    if (Array.isArray(item.json.body)) {
                      dataToExport.push(...item.json.body);
                    } else {
                      dataToExport.push(item.json.body);
                    }
                  }
                } else {
                  logger.warn('No data found with JSONPath, using full data fallback', {
                    dataPath,
                    triedPaths: alternativePaths.filter(p => p !== dataPath)
                  });
                  dataToExport.push(item.json);
                }
              }
            }
          } catch (error) {
            logger.warn('JSONPath extraction failed, using full data', {
              dataPath,
              error: error instanceof Error ? error.message : 'Unknown error',
              inputStructure: JSON.stringify(item.json, null, 2).substring(0, 500)
            });
            dataToExport.push(item.json);
          }
        } else {
          // Use full input data
          if (Array.isArray(item.json)) {
            dataToExport.push(...item.json);
          } else {
            dataToExport.push(item.json);
          }
        }
      }

      if (dataToExport.length === 0) {
        throw new Error('No data found to export after processing');
      }

      // Parse custom headers
      const headers = headersString ? headersString.split(',').map(h => h.trim()) : undefined;

      // Generate filename if not provided
      const finalFileName = fileName || `export_${Date.now()}.${format}`;

      // Export data
      const result = await dataExportService.exportData(dataToExport, {
        format,
        fileName: finalFileName,
        sheetName: format === 'xlsx' ? sheetName : undefined,
        headers,
      });

      if (!result) {
        throw new Error('Export failed: no result returned from export service');
      }
      
      if (!result.success) {
        throw new Error(`Export failed: ${result.error || 'Unknown error'}`);
      }

      logger.info('Data export completed successfully', {
        format,
        fileName: finalFileName,
        recordCount: dataToExport.length,
        downloadUrl: result.downloadUrl,
      });

      // Return result information
      return [
        {
          json: {
            success: true,
            format,
            fileName: finalFileName,
            recordCount: dataToExport.length,
            filePath: result.filePath,
            downloadUrl: result.downloadUrl,
            autoDownload,
            exportedAt: new Date().toISOString(),
          },
        },
      ];

    } catch (error) {
      logger.error('Export node execution failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        format,
        fileName,
      });
      throw error;
    }
  },
};