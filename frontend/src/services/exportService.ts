import { api } from './api';

export interface ExportRequest {
  data: any[];
  format: 'xlsx' | 'csv' | 'json';
  fileName?: string;
  sheetName?: string;
  headers?: string[];
}

export interface ExportResponse {
  success: boolean;
  filePath?: string;
  downloadUrl?: string;
  error?: string;
}

export interface ExportFile {
  filename: string;
  size: number;
  createdAt: string | null;
  modifiedAt: string | null;
  downloadUrl: string;
}

export class ExportService {
  private static instance: ExportService;

  private constructor() {}

  public static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  /**
   * Create a new export
   */
  async createExport(request: ExportRequest): Promise<ExportResponse> {
    try {
      const response = await api.post('/exports/create', request);
      return response.data;
    } catch (error: any) {
      console.error('Export creation failed:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to create export'
      );
    }
  }

  /**
   * List all available exports
   */
  async listExports(): Promise<ExportFile[]> {
    try {
      const response = await api.get('/exports/list');
      return response.data.exports || [];
    } catch (error: any) {
      console.error('Failed to list exports:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to list exports'
      );
    }
  }

  /**
   * Download an export file
   */
  async downloadFile(filename: string): Promise<void> {
    try {
      const response = await api.get(`/exports/download/${filename}`, {
        responseType: 'blob',
      });

      // Create blob URL and trigger download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Download failed:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to download file'
      );
    }
  }

  /**
   * Delete an export file
   */
  async deleteExport(filename: string): Promise<void> {
    try {
      await api.delete(`/exports/${filename}`);
    } catch (error: any) {
      console.error('Failed to delete export:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to delete export'
      );
    }
  }

  /**
   * Export workflow execution results to Excel/CSV
   */
  async exportExecutionResults(
    executionId: string,
    format: 'xlsx' | 'csv' | 'json',
    options: {
      fileName?: string;
      sheetName?: string;
      headers?: string[];
      dataPath?: string;
    } = {}
  ): Promise<ExportResponse> {
    try {
      // First get the execution results
      const executionResponse = await api.get(`/executions/${executionId}/results`);
      const executionData = executionResponse.data;

      // Extract data for export
      let dataToExport: any[] = [];
      
      if (executionData.data && executionData.data.resultData) {
        const resultData = executionData.data.resultData;
        
        // Extract data from all nodes
        Object.values(resultData.runData || {}).forEach((nodeData: any) => {
          if (nodeData && Array.isArray(nodeData)) {
            nodeData.forEach((nodeRun: any) => {
              if (nodeRun.data && nodeRun.data.main && Array.isArray(nodeRun.data.main)) {
                nodeRun.data.main.forEach((item: any) => {
                  if (Array.isArray(item)) {
                    item.forEach((dataItem: any) => {
                      dataToExport.push(dataItem.json || dataItem);
                    });
                  } else {
                    dataToExport.push(item.json || item);
                  }
                });
              }
            });
          }
        });
      }

      if (dataToExport.length === 0) {
        throw new Error('No data found in execution results to export');
      }

      // Create export
      return await this.createExport({
        data: dataToExport,
        format,
        fileName: options.fileName || `execution_${executionId}_${Date.now()}.${format}`,
        sheetName: options.sheetName,
        headers: options.headers,
      });
    } catch (error: any) {
      console.error('Failed to export execution results:', error);
      throw error;
    }
  }

  /**
   * Auto-download file from export result
   */
  async autoDownload(exportResult: ExportResponse): Promise<void> {
    if (exportResult.success && exportResult.downloadUrl) {
      // Extract filename from download URL
      const urlParts = exportResult.downloadUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      await this.downloadFile(filename);
    }
  }
}