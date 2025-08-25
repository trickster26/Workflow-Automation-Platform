import { INodeType, INodeExecuteFunctions } from '../NodeRegistry';
import { PDFGeneratorService, PDFGenerationOptions } from '../../services/PDFGeneratorService';
import { createLogger } from '../../utils/logger';

const logger = createLogger('PDFGeneratorNode');

export const PDFGeneratorNode: INodeType = {
  description: {
    displayName: 'PDF Generator',
    name: 'pdfGenerator',
    group: ['files', 'output'],
    version: 1,
    description: 'Generate PDF documents from data using templates',
    defaults: {
      name: 'PDF Generator',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Template Type',
        name: 'template',
        type: 'options',
        options: [
          {
            name: 'Invoice',
            value: 'invoice',
          },
          {
            name: 'Report',
            value: 'report',
          },
          {
            name: 'Data Table',
            value: 'table',
          },
          {
            name: 'Simple Document',
            value: 'simple',
          },
          {
            name: 'Custom HTML',
            value: 'custom',
          },
        ],
        default: 'simple',
        description: 'Choose a built-in template or use custom HTML',
      },
      {
        displayName: 'Custom HTML Template',
        name: 'customTemplate',
        type: 'string',
        typeOptions: {
          editor: 'code',
          editorLanguage: 'html',
        },
        default: '',
        placeholder: '<!DOCTYPE html><html><head><title>{{title}}</title></head><body>{{content}}</body></html>',
        description: 'Custom HTML template using Handlebars syntax',
        displayOptions: {
          show: {
            template: ['custom'],
          },
        },
      },
      {
        displayName: 'Document Title',
        name: 'title',
        type: 'string',
        default: 'Document',
        placeholder: 'My Document',
        description: 'Title of the PDF document',
      },
      {
        displayName: 'File Name',
        name: 'fileName',
        type: 'string',
        default: '',
        placeholder: 'report.pdf',
        description: 'Custom file name (optional, will auto-generate if empty)',
      },
      {
        displayName: 'Page Format',
        name: 'format',
        type: 'options',
        options: [
          {
            name: 'A4',
            value: 'A4',
          },
          {
            name: 'A3',
            value: 'A3',
          },
          {
            name: 'Letter',
            value: 'Letter',
          },
          {
            name: 'Legal',
            value: 'Legal',
          },
        ],
        default: 'A4',
        description: 'Page format for the PDF',
      },
      {
        displayName: 'Orientation',
        name: 'orientation',
        type: 'options',
        options: [
          {
            name: 'Portrait',
            value: 'portrait',
          },
          {
            name: 'Landscape',
            value: 'landscape',
          },
        ],
        default: 'portrait',
        description: 'Page orientation',
      },
      {
        displayName: 'Data Source',
        name: 'dataSource',
        type: 'options',
        options: [
          {
            name: 'Full Input Data',
            value: 'full',
          },
          {
            name: 'Specific Field',
            value: 'field',
          },
          {
            name: 'Custom Data Object',
            value: 'custom',
          },
        ],
        default: 'full',
        description: 'Source of data for PDF generation',
      },
      {
        displayName: 'Data Field',
        name: 'dataField',
        type: 'string',
        default: 'data',
        placeholder: 'reportData',
        description: 'Field name containing the data to use',
        displayOptions: {
          show: {
            dataSource: ['field'],
          },
        },
      },
      {
        displayName: 'Custom Data',
        name: 'customData',
        type: 'string',
        typeOptions: {
          editor: 'code',
          editorLanguage: 'json',
        },
        default: '{}',
        placeholder: '{"title": "My Report", "items": []}',
        description: 'Custom JSON data for the PDF template',
        displayOptions: {
          show: {
            dataSource: ['custom'],
          },
        },
      },
      // Invoice-specific fields
      {
        displayName: 'Company Name',
        name: 'companyName',
        type: 'string',
        default: '',
        placeholder: 'Your Company Name',
        description: 'Company name for invoice header',
        displayOptions: {
          show: {
            template: ['invoice'],
          },
        },
      },
      {
        displayName: 'Company Address',
        name: 'companyAddress',
        type: 'string',
        default: '',
        placeholder: '123 Main St, City, State 12345',
        description: 'Company address for invoice header',
        displayOptions: {
          show: {
            template: ['invoice'],
          },
        },
      },
      // Report-specific fields
      {
        displayName: 'Report Subtitle',
        name: 'subtitle',
        type: 'string',
        default: '',
        placeholder: 'Monthly Performance Report',
        description: 'Subtitle for report template',
        displayOptions: {
          show: {
            template: ['report'],
          },
        },
      },
      {
        displayName: 'Include Date',
        name: 'includeDate',
        type: 'boolean',
        default: true,
        description: 'Include current date in the document',
      },
      {
        displayName: 'Margin (pixels)',
        name: 'marginSize',
        type: 'number',
        default: 20,
        description: 'Page margins in pixels',
      },
    ],
  },

  async execute(this: INodeExecuteFunctions): Promise<any[]> {
    const items = this.getInputData();
    const pdfGeneratorService = PDFGeneratorService.getInstance();

    if (items.length === 0) {
      throw new Error('No input data provided');
    }

    // Get parameters
    const template = this.getNodeParameter('template', 0) as string;
    const customTemplate = this.getNodeParameter('customTemplate', 0) as string;
    const title = this.getNodeParameter('title', 0, 'Document') as string;
    const fileName = this.getNodeParameter('fileName', 0) as string;
    const format = this.getNodeParameter('format', 0, 'A4') as string;
    const orientation = this.getNodeParameter('orientation', 0, 'portrait') as string;
    const dataSource = this.getNodeParameter('dataSource', 0, 'full') as string;
    const dataField = this.getNodeParameter('dataField', 0, 'data') as string;
    const customDataString = this.getNodeParameter('customData', 0, '{}') as string;
    const companyName = this.getNodeParameter('companyName', 0) as string;
    const companyAddress = this.getNodeParameter('companyAddress', 0) as string;
    const subtitle = this.getNodeParameter('subtitle', 0) as string;
    const includeDate = this.getNodeParameter('includeDate', 0, true) as boolean;
    const marginSize = this.getNodeParameter('marginSize', 0, 20) as number;

    logger.info('PDF Generator node parameters', {
      template,
      title,
      fileName,
      format,
      orientation,
      dataSource,
      includeDate
    });

    const results = [];

    for (const [index, item] of items.entries()) {
      try {
        // Determine data source
        let pdfData: any;
        
        switch (dataSource) {
          case 'full':
            pdfData = item.json;
            break;
          case 'field':
            pdfData = item.json[dataField];
            if (!pdfData) {
              throw new Error(`Data field '${dataField}' not found in input`);
            }
            break;
          case 'custom':
            try {
              pdfData = JSON.parse(customDataString);
            } catch (error) {
              throw new Error('Invalid JSON in custom data field');
            }
            break;
          default:
            pdfData = item.json;
        }

        // Prepare template data
        const templateData = {
          title,
          subtitle,
          reportDate: includeDate ? new Date() : null,
          companyName,
          companyAddress,
          ...pdfData,
          // Add current date if not present
          date: pdfData.date || new Date(),
          // Add generated timestamp
          generatedAt: new Date().toISOString(),
        };

        // Prepare PDF generation options
        const pdfOptions: PDFGenerationOptions = {
          template: template as any,
          customTemplate: template === 'custom' ? customTemplate : undefined,
          data: templateData,
          fileName: fileName || `${title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}_${index}.pdf`,
          format: format as any,
          orientation: orientation as any,
          margin: {
            top: marginSize,
            right: marginSize,
            bottom: marginSize,
            left: marginSize,
          },
          title,
          author: 'Workflow Automation Platform',
          subject: subtitle || title,
        };

        // Generate PDF
        const result = await pdfGeneratorService.generatePDF(pdfOptions);

        if (!result.success) {
          throw new Error(result.error || 'PDF generation failed');
        }

        logger.info('PDF generated successfully', {
          fileName: result.fileName,
          size: result.size,
          template,
          downloadUrl: result.downloadUrl
        });

        results.push({
          json: {
            success: true,
            pdf: {
              fileName: result.fileName,
              filePath: result.filePath,
              downloadUrl: result.downloadUrl,
              size: result.size,
              template,
              title,
              generatedAt: new Date().toISOString(),
            },
            inputIndex: index,
          },
        });

      } catch (error) {
        logger.error('PDF generation failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          template,
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