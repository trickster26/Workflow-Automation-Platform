import { INodeType, INodeExecuteFunctions } from '../NodeRegistry';
import { google, sheets_v4 } from 'googleapis';
import { createLogger } from '../../utils/logger';

export const GoogleSheetsNode: INodeType = {
  description: {
    displayName: 'Google Sheets',
    name: 'googleSheets',
    group: ['productivity'],
    version: 1,
    description: 'Read and write data from Google Sheets',
    defaults: {
      name: 'Google Sheets',
      color: '#0F9D58',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'googleSheetsApi',
        required: true,
      },
    ],
    properties: [
      {
        name: 'operation',
        displayName: 'Operation',
        type: 'options',
        options: [
          {
            name: 'Read',
            value: 'read',
            description: 'Read data from sheet',
          },
          {
            name: 'Append',
            value: 'append',
            description: 'Append data to sheet',
          },
          {
            name: 'Update',
            value: 'update',
            description: 'Update existing data in sheet',
          },
          {
            name: 'Clear',
            value: 'clear',
            description: 'Clear data from sheet',
          },
          {
            name: 'Create Sheet',
            value: 'createSheet',
            description: 'Create a new sheet in the spreadsheet',
          },
          {
            name: 'Delete Sheet',
            value: 'deleteSheet',
            description: 'Delete a sheet from the spreadsheet',
          },
          {
            name: 'Get Sheet Properties',
            value: 'getSheetProperties',
            description: 'Get properties of sheets in the spreadsheet',
          },
          {
            name: 'Batch Update',
            value: 'batchUpdate',
            description: 'Perform multiple operations in one request',
          },
        ],
        default: 'read',
        description: 'The operation to perform',
      },
      {
        name: 'spreadsheetId',
        displayName: 'Spreadsheet ID',
        type: 'string',
        default: '',
        required: true,
        description: 'The ID of the Google Spreadsheet',
      },
      {
        name: 'sheetName',
        displayName: 'Sheet Name',
        type: 'string',
        default: 'Sheet1',
        description: 'The name of the sheet to work with',
        displayOptions: {
          show: {
            operation: ['read', 'append', 'update', 'clear', 'deleteSheet'],
          },
        },
      },
      {
        name: 'range',
        displayName: 'Range',
        type: 'string',
        default: 'A:Z',
        description: 'The range to read/write (e.g., A1:C10, A:C)',
        displayOptions: {
          show: {
            operation: ['read', 'update', 'clear'],
          },
        },
      },
      // Read options
      {
        name: 'headerRow',
        displayName: 'Header Row',
        type: 'boolean',
        default: true,
        description: 'First row contains headers',
        displayOptions: {
          show: {
            operation: ['read'],
          },
        },
      },
      {
        name: 'valueRenderOption',
        displayName: 'Value Render Option',
        type: 'options',
        options: [
          {
            name: 'Formatted Value',
            value: 'FORMATTED_VALUE',
            description: 'Values will be formatted according to the cell\'s formatting',
          },
          {
            name: 'Unformatted Value',
            value: 'UNFORMATTED_VALUE',
            description: 'Values will be unformatted',
          },
          {
            name: 'Formula',
            value: 'FORMULA',
            description: 'Values will not be calculated, formulas will be returned instead',
          },
        ],
        default: 'FORMATTED_VALUE',
        description: 'How values should be rendered in the output',
        displayOptions: {
          show: {
            operation: ['read'],
          },
        },
      },
      {
        name: 'dateTimeRenderOption',
        displayName: 'Date Time Render Option',
        type: 'options',
        options: [
          {
            name: 'Serial Number',
            value: 'SERIAL_NUMBER',
            description: 'Dates, times, and datetimes will be represented as doubles',
          },
          {
            name: 'Formatted String',
            value: 'FORMATTED_STRING',
            description: 'Dates, times, and datetimes will be represented as strings',
          },
        ],
        default: 'FORMATTED_STRING',
        description: 'How dates, times, and datetimes should be rendered',
        displayOptions: {
          show: {
            operation: ['read'],
          },
        },
      },
      // Write options
      {
        name: 'dataStartRow',
        displayName: 'Data Start Row',
        type: 'number',
        default: 2,
        description: 'Row to start writing data (1-indexed)',
        displayOptions: {
          show: {
            operation: ['append'],
          },
        },
      },
      {
        name: 'valueInputOption',
        displayName: 'Value Input Option',
        type: 'options',
        options: [
          {
            name: 'Raw',
            value: 'RAW',
            description: 'Values will not be parsed and will be stored as-is',
          },
          {
            name: 'User Entered',
            value: 'USER_ENTERED',
            description: 'Values will be parsed as if typed by user (formulas evaluated)',
          },
        ],
        default: 'USER_ENTERED',
        description: 'How input data should be interpreted',
        displayOptions: {
          show: {
            operation: ['append', 'update'],
          },
        },
      },
      {
        name: 'insertDataOption',
        displayName: 'Insert Data Option',
        type: 'options',
        options: [
          {
            name: 'Overwrite',
            value: 'OVERWRITE',
            description: 'New rows will be inserted after the last existing row',
          },
          {
            name: 'Insert Rows',
            value: 'INSERT_ROWS',
            description: 'New rows will be inserted, pushing existing rows down',
          },
        ],
        default: 'INSERT_ROWS',
        description: 'How new data should be inserted',
        displayOptions: {
          show: {
            operation: ['append'],
          },
        },
      },
      // Create sheet options
      {
        name: 'newSheetName',
        displayName: 'New Sheet Name',
        type: 'string',
        default: '',
        required: true,
        description: 'Name for the new sheet',
        displayOptions: {
          show: {
            operation: ['createSheet'],
          },
        },
      },
      {
        name: 'sheetRows',
        displayName: 'Number of Rows',
        type: 'number',
        default: 1000,
        description: 'Number of rows in the new sheet',
        displayOptions: {
          show: {
            operation: ['createSheet'],
          },
        },
      },
      {
        name: 'sheetColumns',
        displayName: 'Number of Columns',
        type: 'number',
        default: 26,
        description: 'Number of columns in the new sheet',
        displayOptions: {
          show: {
            operation: ['createSheet'],
          },
        },
      },
      // Batch update options
      {
        name: 'batchRequests',
        displayName: 'Batch Requests',
        type: 'string',
        typeOptions: {
          rows: 8,
        },
        default: '',
        description: 'JSON array of batch request objects',
        displayOptions: {
          show: {
            operation: ['batchUpdate'],
          },
        },
      },
      // Data handling options
      {
        name: 'dataMode',
        displayName: 'Data Mode',
        type: 'options',
        options: [
          {
            name: 'Auto-map',
            value: 'autoMap',
            description: 'Automatically map data from input',
          },
          {
            name: 'Define Manually',
            value: 'manual',
            description: 'Manually define the data to write',
          },
        ],
        default: 'autoMap',
        description: 'How to handle the data',
        displayOptions: {
          show: {
            operation: ['append', 'update'],
          },
        },
      },
      {
        name: 'dataFields',
        displayName: 'Data Fields',
        type: 'string',
        typeOptions: {
          rows: 4,
        },
        default: '',
        description: 'JSON array of field mappings or manual data',
        displayOptions: {
          show: {
            operation: ['append', 'update'],
            dataMode: ['manual'],
          },
        },
      },
      {
        name: 'columnsToMatch',
        displayName: 'Columns to Match',
        type: 'string',
        default: '',
        description: 'Comma-separated column names to match for updates',
        displayOptions: {
          show: {
            operation: ['update'],
          },
        },
      },
    ],
  },

  async execute(this: INodeExecuteFunctions): Promise<any[]> {
    const items = this.getInputData();
    const operation = this.getNodeParameter('operation', 0) as string;
    const logger = createLogger('GoogleSheetsNode');
    const returnData = [];

    // Get credentials
    const credentials = await this.getCredentials('googleSheetsApi');
    if (!credentials) {
      throw new Error('Google Sheets API credentials are required');
    }

    // Set up Google Sheets API client
    const auth = new google.auth.GoogleAuth({
      credentials: credentials.serviceAccountKey ? JSON.parse(credentials.serviceAccountKey as string) : credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    for (let i = 0; i < items.length; i++) {
      try {
        let result: any;

        switch (operation) {
          case 'read':
            result = await this.readSheet(sheets, i);
            break;
          case 'append':
            result = await this.appendToSheet(sheets, items[i], i);
            break;
          case 'update':
            result = await this.updateSheet(sheets, items[i], i);
            break;
          case 'clear':
            result = await this.clearSheet(sheets, i);
            break;
          case 'createSheet':
            result = await this.createSheet(sheets, i);
            break;
          case 'deleteSheet':
            result = await this.deleteSheet(sheets, i);
            break;
          case 'getSheetProperties':
            result = await this.getSheetProperties(sheets, i);
            break;
          case 'batchUpdate':
            result = await this.batchUpdate(sheets, i);
            break;
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }

        if (operation === 'read' && Array.isArray(result)) {
          // For read operations, return multiple items
          result.forEach((item: any, index: number) => {
            returnData.push({
              json: item,
              pairedItem: { item: i },
            });
          });
        } else {
          returnData.push({
            json: result,
            pairedItem: { item: i },
          });
        }

      } catch (error) {
        logger.error(`Google Sheets operation ${operation} failed:`, error);
        
        if (this.continueOnFail?.()) {
          returnData.push({
            json: {
              error: error instanceof Error ? error.message : 'Unknown Google Sheets error',
              operation,
            },
            pairedItem: { item: i },
          });
        } else {
          throw error;
        }
      }
    }

    return returnData;
  },

  async readSheet(this: INodeExecuteFunctions, sheets: sheets_v4.Sheets, itemIndex: number): Promise<any[]> {
    const spreadsheetId = this.getNodeParameter('spreadsheetId', itemIndex) as string;
    const sheetName = this.getNodeParameter('sheetName', itemIndex) as string;
    const range = this.getNodeParameter('range', itemIndex) as string;
    const headerRow = this.getNodeParameter('headerRow', itemIndex, true) as boolean;
    const valueRenderOption = this.getNodeParameter('valueRenderOption', itemIndex) as string;
    const dateTimeRenderOption = this.getNodeParameter('dateTimeRenderOption', itemIndex) as string;

    const fullRange = `${sheetName}!${range}`;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: fullRange,
      valueRenderOption: valueRenderOption as 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA',
      dateTimeRenderOption: dateTimeRenderOption as 'SERIAL_NUMBER' | 'FORMATTED_STRING',
    });

    const values = response.data.values || [];
    if (values.length === 0) {
      return [];
    }

    let headers: string[] = [];
    let dataRows: any[][] = values;

    if (headerRow) {
      headers = values[0] as string[];
      dataRows = values.slice(1);
    } else {
      // Generate column headers (A, B, C, etc.)
      const maxColumns = Math.max(...values.map(row => row.length));
      headers = Array.from({ length: maxColumns }, (_, i) => this.columnIndexToLetter(i));
    }

    return dataRows.map((row: any[]) => {
      const item: any = {};
      headers.forEach((header: string, index: number) => {
        item[header] = row[index] || '';
      });
      return item;
    });
  },

  async appendToSheet(this: INodeExecuteFunctions, sheets: sheets_v4.Sheets, inputItem: any, itemIndex: number): Promise<any> {
    const spreadsheetId = this.getNodeParameter('spreadsheetId', itemIndex) as string;
    const sheetName = this.getNodeParameter('sheetName', itemIndex) as string;
    const valueInputOption = this.getNodeParameter('valueInputOption', itemIndex) as string;
    const insertDataOption = this.getNodeParameter('insertDataOption', itemIndex) as string;
    const dataMode = this.getNodeParameter('dataMode', itemIndex) as string;

    let values: any[][];

    if (dataMode === 'manual') {
      const dataFields = this.getNodeParameter('dataFields', itemIndex, '') as string;
      if (dataFields) {
        values = JSON.parse(dataFields);
      } else {
        throw new Error('Data fields are required for manual mode');
      }
    } else {
      // Auto-map mode: convert input item to row
      const data = inputItem.json;
      if (Array.isArray(data)) {
        values = data.map(item => Object.values(item));
      } else {
        values = [Object.values(data)];
      }
    }

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:A`,
      valueInputOption: valueInputOption as 'RAW' | 'USER_ENTERED',
      insertDataOption: insertDataOption as 'OVERWRITE' | 'INSERT_ROWS',
      requestBody: {
        values,
      },
    });

    return {
      spreadsheetId,
      updatedRange: response.data.updates?.updatedRange,
      updatedRows: response.data.updates?.updatedRows,
      updatedColumns: response.data.updates?.updatedColumns,
      updatedCells: response.data.updates?.updatedCells,
    };
  },

  async updateSheet(this: INodeExecuteFunctions, sheets: sheets_v4.Sheets, inputItem: any, itemIndex: number): Promise<any> {
    const spreadsheetId = this.getNodeParameter('spreadsheetId', itemIndex) as string;
    const sheetName = this.getNodeParameter('sheetName', itemIndex) as string;
    const range = this.getNodeParameter('range', itemIndex) as string;
    const valueInputOption = this.getNodeParameter('valueInputOption', itemIndex) as string;
    const dataMode = this.getNodeParameter('dataMode', itemIndex) as string;

    let values: any[][];

    if (dataMode === 'manual') {
      const dataFields = this.getNodeParameter('dataFields', itemIndex, '') as string;
      if (dataFields) {
        values = JSON.parse(dataFields);
      } else {
        throw new Error('Data fields are required for manual mode');
      }
    } else {
      // Auto-map mode: convert input item to row
      const data = inputItem.json;
      if (Array.isArray(data)) {
        values = data.map(item => Object.values(item));
      } else {
        values = [Object.values(data)];
      }
    }

    const fullRange = `${sheetName}!${range}`;

    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: fullRange,
      valueInputOption: valueInputOption as 'RAW' | 'USER_ENTERED',
      requestBody: {
        values,
      },
    });

    return {
      spreadsheetId,
      updatedRange: response.data.updatedRange,
      updatedRows: response.data.updatedRows,
      updatedColumns: response.data.updatedColumns,
      updatedCells: response.data.updatedCells,
    };
  },

  async clearSheet(this: INodeExecuteFunctions, sheets: sheets_v4.Sheets, itemIndex: number): Promise<any> {
    const spreadsheetId = this.getNodeParameter('spreadsheetId', itemIndex) as string;
    const sheetName = this.getNodeParameter('sheetName', itemIndex) as string;
    const range = this.getNodeParameter('range', itemIndex) as string;

    const fullRange = `${sheetName}!${range}`;

    const response = await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: fullRange,
    });

    return {
      spreadsheetId,
      clearedRange: response.data.clearedRange,
    };
  },

  async createSheet(this: INodeExecuteFunctions, sheets: sheets_v4.Sheets, itemIndex: number): Promise<any> {
    const spreadsheetId = this.getNodeParameter('spreadsheetId', itemIndex) as string;
    const newSheetName = this.getNodeParameter('newSheetName', itemIndex) as string;
    const sheetRows = this.getNodeParameter('sheetRows', itemIndex, 1000) as number;
    const sheetColumns = this.getNodeParameter('sheetColumns', itemIndex, 26) as number;

    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: newSheetName,
                gridProperties: {
                  rowCount: sheetRows,
                  columnCount: sheetColumns,
                },
              },
            },
          },
        ],
      },
    });

    return {
      spreadsheetId,
      addedSheet: response.data.replies?.[0]?.addSheet,
    };
  },

  async deleteSheet(this: INodeExecuteFunctions, sheets: sheets_v4.Sheets, itemIndex: number): Promise<any> {
    const spreadsheetId = this.getNodeParameter('spreadsheetId', itemIndex) as string;
    const sheetName = this.getNodeParameter('sheetName', itemIndex) as string;

    // First, get the sheet ID
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName);

    if (!sheet || !sheet.properties?.sheetId) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }

    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteSheet: {
              sheetId: sheet.properties.sheetId,
            },
          },
        ],
      },
    });

    return {
      spreadsheetId,
      deletedSheetId: sheet.properties.sheetId,
    };
  },

  async getSheetProperties(this: INodeExecuteFunctions, sheets: sheets_v4.Sheets, itemIndex: number): Promise<any> {
    const spreadsheetId = this.getNodeParameter('spreadsheetId', itemIndex) as string;

    const response = await sheets.spreadsheets.get({ spreadsheetId });

    return {
      spreadsheetId,
      title: response.data.properties?.title,
      locale: response.data.properties?.locale,
      timeZone: response.data.properties?.timeZone,
      sheets: response.data.sheets?.map(sheet => ({
        sheetId: sheet.properties?.sheetId,
        title: sheet.properties?.title,
        sheetType: sheet.properties?.sheetType,
        gridProperties: sheet.properties?.gridProperties,
      })),
    };
  },

  async batchUpdate(this: INodeExecuteFunctions, sheets: sheets_v4.Sheets, itemIndex: number): Promise<any> {
    const spreadsheetId = this.getNodeParameter('spreadsheetId', itemIndex) as string;
    const batchRequestsStr = this.getNodeParameter('batchRequests', itemIndex, '') as string;

    if (!batchRequestsStr) {
      throw new Error('Batch requests are required');
    }

    let batchRequests: any[];
    try {
      batchRequests = JSON.parse(batchRequestsStr);
    } catch (error) {
      throw new Error('Invalid JSON in batch requests parameter');
    }

    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: batchRequests,
      },
    });

    return {
      spreadsheetId,
      replies: response.data.replies,
      updatedSpreadsheet: response.data.updatedSpreadsheet,
    };
  },

  // Helper method to convert column index to letter (0 -> A, 1 -> B, etc.)
  columnIndexToLetter(index: number): string {
    let result = '';
    while (index >= 0) {
      result = String.fromCharCode(65 + (index % 26)) + result;
      index = Math.floor(index / 26) - 1;
    }
    return result;
  },
};