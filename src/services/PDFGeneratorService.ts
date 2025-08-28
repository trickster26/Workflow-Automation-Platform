import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
// import * as puppeteer from 'puppeteer';
import PDFDocument from 'pdfkit';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface PDFGenerationOptions {
  template?: 'invoice' | 'report' | 'table' | 'custom' | 'simple';
  customTemplate?: string;
  data: any;
  fileName?: string;
  format?: 'A4' | 'A3' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  header?: string;
  footer?: string;
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
}

export interface PDFGenerationResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  downloadUrl?: string;
  size?: number;
  error?: string;
}

export class PDFGeneratorService {
  private static instance: PDFGeneratorService;
  private outputDir: string;
  private templatesDir: string;

  private constructor() {
    this.outputDir = path.join(process.cwd(), 'pdfs');
    this.templatesDir = path.join(process.cwd(), 'templates', 'pdf');
    this.ensureDirectories();
    this.registerHandlebarsHelpers();
  }

  public static getInstance(): PDFGeneratorService {
    if (!PDFGeneratorService.instance) {
      PDFGeneratorService.instance = new PDFGeneratorService();
    }
    return PDFGeneratorService.instance;
  }

  private ensureDirectories(): void {
    [this.outputDir, this.templatesDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  private registerHandlebarsHelpers(): void {
    // Helper for formatting dates
    Handlebars.registerHelper('formatDate', function(date, format = 'YYYY-MM-DD') {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString();
    });

    // Helper for formatting currency
    Handlebars.registerHelper('formatCurrency', function(amount, currency = 'USD') {
      if (!amount && amount !== 0) return '';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
      }).format(amount);
    });

    // Helper for formatting numbers
    Handlebars.registerHelper('formatNumber', function(number, decimals = 2) {
      if (!number && number !== 0) return '';
      return Number(number).toFixed(decimals);
    });

    // Helper for conditional rendering
    Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });

    // Helper for loops with index
    Handlebars.registerHelper('eachWithIndex', function(array, options) {
      let result = '';
      for (let i = 0; i < array.length; i++) {
        result += options.fn({ ...array[i], index: i });
      }
      return result;
    });
  }

  private getBuiltInTemplate(templateName: string): string {
    const templates = {
      invoice: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{title}}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007acc; padding-bottom: 20px; }
        .company-name { font-size: 24px; font-weight: bold; color: #007acc; }
        .invoice-title { font-size: 28px; margin: 20px 0; }
        .invoice-meta { display: flex; justify-content: space-between; margin: 20px 0; }
        .invoice-details, .client-details { width: 48%; }
        .invoice-details h3, .client-details h3 { color: #007acc; margin-bottom: 10px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .items-table th { background-color: #007acc; color: white; }
        .total-section { margin-top: 20px; text-align: right; }
        .total-row { display: flex; justify-content: flex-end; margin: 5px 0; }
        .total-label { width: 100px; font-weight: bold; }
        .final-total { font-size: 18px; font-weight: bold; color: #007acc; }
        .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">{{companyName}}</div>
        <div>{{companyAddress}}</div>
    </div>
    
    <h1 class="invoice-title">INVOICE</h1>
    
    <div class="invoice-meta">
        <div class="invoice-details">
            <h3>Invoice Details</h3>
            <p><strong>Invoice #:</strong> {{invoiceNumber}}</p>
            <p><strong>Date:</strong> {{formatDate invoiceDate}}</p>
            <p><strong>Due Date:</strong> {{formatDate dueDate}}</p>
        </div>
        <div class="client-details">
            <h3>Bill To</h3>
            <p><strong>{{clientName}}</strong></p>
            <p>{{clientAddress}}</p>
            <p>{{clientEmail}}</p>
        </div>
    </div>
    
    <table class="items-table">
        <thead>
            <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Rate</th>
                <th>Amount</th>
            </tr>
        </thead>
        <tbody>
            {{#each items}}
            <tr>
                <td>{{description}}</td>
                <td>{{quantity}}</td>
                <td>{{formatCurrency rate}}</td>
                <td>{{formatCurrency amount}}</td>
            </tr>
            {{/each}}
        </tbody>
    </table>
    
    <div class="total-section">
        <div class="total-row">
            <span class="total-label">Subtotal:</span>
            <span>{{formatCurrency subtotal}}</span>
        </div>
        {{#if tax}}
        <div class="total-row">
            <span class="total-label">Tax:</span>
            <span>{{formatCurrency tax}}</span>
        </div>
        {{/if}}
        <div class="total-row final-total">
            <span class="total-label">Total:</span>
            <span>{{formatCurrency total}}</span>
        </div>
    </div>
    
    <div class="footer">
        <p>{{footer}}</p>
    </div>
</body>
</html>`,

      report: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{title}}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 30px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #28a745; }
        .report-title { font-size: 32px; color: #28a745; margin: 0; }
        .report-subtitle { font-size: 16px; color: #666; margin: 10px 0; }
        .report-date { font-size: 14px; color: #666; }
        .section { margin: 30px 0; }
        .section-title { font-size: 20px; color: #28a745; margin-bottom: 15px; border-bottom: 1px solid #28a745; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #28a745; }
        .metric-value { font-size: 24px; font-weight: bold; color: #28a745; }
        .metric-label { font-size: 14px; color: #666; margin-top: 5px; }
        .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .data-table th, .data-table td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        .data-table th { background-color: #28a745; color: white; font-weight: 600; }
        .data-table tr:hover { background-color: #f8f9fa; }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="report-title">{{title}}</h1>
        <div class="report-subtitle">{{subtitle}}</div>
        <div class="report-date">Generated on {{formatDate reportDate}}</div>
    </div>
    
    {{#if metrics}}
    <div class="section">
        <h2 class="section-title">Key Metrics</h2>
        <div class="metric-grid">
            {{#each metrics}}
            <div class="metric-card">
                <div class="metric-value">{{value}}</div>
                <div class="metric-label">{{label}}</div>
            </div>
            {{/each}}
        </div>
    </div>
    {{/if}}
    
    {{#if data}}
    <div class="section">
        <h2 class="section-title">Data Summary</h2>
        <table class="data-table">
            <thead>
                <tr>
                    {{#each columns}}
                    <th>{{this}}</th>
                    {{/each}}
                </tr>
            </thead>
            <tbody>
                {{#each data}}
                <tr>
                    {{#each this}}
                    <td>{{this}}</td>
                    {{/each}}
                </tr>
                {{/each}}
            </tbody>
        </table>
    </div>
    {{/if}}
    
    {{#if summary}}
    <div class="section">
        <h2 class="section-title">Summary</h2>
        <p>{{summary}}</p>
    </div>
    {{/if}}
</body>
</html>`,

      table: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{title}}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 30px; }
        .header { text-align: center; margin-bottom: 30px; }
        .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .subtitle { font-size: 16px; color: #666; }
        .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .data-table th, .data-table td { padding: 10px; text-align: left; border: 1px solid #ddd; }
        .data-table th { background-color: #f2f2f2; font-weight: bold; }
        .data-table tr:nth-child(even) { background-color: #f9f9f9; }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="title">{{title}}</h1>
        {{#if subtitle}}
        <div class="subtitle">{{subtitle}}</div>
        {{/if}}
    </div>
    
    <table class="data-table">
        <thead>
            <tr>
                {{#each columns}}
                <th>{{this}}</th>
                {{/each}}
            </tr>
        </thead>
        <tbody>
            {{#each data}}
            <tr>
                {{#each this}}
                <td>{{this}}</td>
                {{/each}}
            </tr>
            {{/each}}
        </tbody>
    </table>
</body>
</html>`,

      simple: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{title}}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .content { margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{title}}</h1>
        {{#if subtitle}}
        <h2>{{subtitle}}</h2>
        {{/if}}
    </div>
    
    <div class="content">
        {{#if content}}
        {{{content}}}
        {{else}}
        <pre>{{json data null 2}}</pre>
        {{/if}}
    </div>
</body>
</html>`
    };

    return templates[templateName] || templates.simple;
  }

  public async generatePDF(options: PDFGenerationOptions): Promise<PDFGenerationResult> {
    try {
      const fileName = options.fileName || `pdf_${Date.now()}_${uuidv4().substring(0, 8)}.pdf`;
      const filePath = path.join(this.outputDir, fileName);

      // Get template
      let template: string;
      if (options.customTemplate) {
        template = options.customTemplate;
      } else if (options.template && options.template !== 'custom') {
        template = this.getBuiltInTemplate(options.template);
      } else {
        template = this.getBuiltInTemplate('simple');
      }

      // Compile template with data
      const compiledTemplate = Handlebars.compile(template);
      const html = compiledTemplate(options.data);

      // Generate PDF using pdfkit (simplified text-based approach)
      const doc = new PDFDocument({
        size: options.format || 'A4',
        layout: options.orientation === 'landscape' ? 'landscape' : 'portrait',
        margins: {
          top: options.margin?.top || 50,
          bottom: options.margin?.bottom || 50,
          left: options.margin?.left || 50,
          right: options.margin?.right || 50
        }
      });

      // Pipe PDF content to file
      doc.pipe(fs.createWriteStream(filePath));

      // Add title
      if (options.data.title) {
        doc.fontSize(20).text(options.data.title, { align: 'center' });
        doc.moveDown();
      }

      // For now, we'll convert the complex HTML template to simple text content
      // This is a simplified fallback until puppeteer can be installed properly
      if (options.template === 'invoice' && options.data) {
        this.generateInvoicePDF(doc, options.data);
      } else if (options.template === 'report' && options.data) {
        this.generateReportPDF(doc, options.data);
      } else if (options.template === 'table' && options.data) {
        this.generateTablePDF(doc, options.data);
      } else {
        // Simple content output
        doc.fontSize(12).text(JSON.stringify(options.data, null, 2));
      }

      // Add footer if specified
      if (options.footer) {
        doc.text(options.footer, 50, doc.page.height - 100, { align: 'center' });
      }

      doc.end();

      // Get file size
      const stats = fs.statSync(filePath);

      logger.info('PDF generated successfully', {
        module: 'PDFGeneratorService',
        fileName,
        template: options.template,
        size: stats.size
      });

      return {
        success: true,
        filePath,
        fileName,
        downloadUrl: `/api/pdfs/download/${fileName}`,
        size: stats.size
      };

    } catch (error: any) {
      logger.error('PDF generation failed', {
        module: 'PDFGeneratorService',
        error: error.message,
        template: options.template
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  public async generateSimplePDF(data: any, title: string = 'Document'): Promise<PDFGenerationResult> {
    return this.generatePDF({
      template: 'simple',
      data: { title, data },
      fileName: `${title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.pdf`
    });
  }

  public listPDFs(): string[] {
    try {
      return fs.readdirSync(this.outputDir).filter(file => file.endsWith('.pdf'));
    } catch (error) {
      logger.error('Failed to list PDFs', {
        module: 'PDFGeneratorService',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  public deletePDF(fileName: string): boolean {
    try {
      const filePath = path.join(this.outputDir, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info('PDF deleted successfully', {
          module: 'PDFGeneratorService',
          fileName
        });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to delete PDF', {
        module: 'PDFGeneratorService',
        fileName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  public getOutputPath(): string {
    return this.outputDir;
  }

  private generateInvoicePDF(doc: PDFDocument, data: any): void {
    // Invoice header
    doc.fontSize(16).text('INVOICE', { align: 'center' });
    doc.moveDown();

    // Invoice details
    if (data.invoiceNumber) {
      doc.fontSize(12).text(`Invoice #: ${data.invoiceNumber}`);
    }
    if (data.invoiceDate) {
      doc.text(`Date: ${new Date(data.invoiceDate).toLocaleDateString()}`);
    }
    if (data.dueDate) {
      doc.text(`Due Date: ${new Date(data.dueDate).toLocaleDateString()}`);
    }
    doc.moveDown();

    // Client details
    if (data.clientName) {
      doc.text(`Bill To: ${data.clientName}`);
    }
    if (data.clientAddress) {
      doc.text(data.clientAddress);
    }
    doc.moveDown();

    // Items
    if (data.items && data.items.length > 0) {
      doc.text('Items:', { underline: true });
      data.items.forEach((item: any) => {
        doc.text(`${item.description} - Qty: ${item.quantity} - Rate: ${item.rate} - Amount: ${item.amount}`);
      });
      doc.moveDown();
    }

    // Total
    if (data.total) {
      doc.fontSize(14).text(`Total: ${data.total}`, { align: 'right' });
    }
  }

  private generateReportPDF(doc: PDFDocument, data: any): void {
    // Report header
    if (data.title) {
      doc.fontSize(18).text(data.title, { align: 'center' });
    }
    if (data.subtitle) {
      doc.fontSize(14).text(data.subtitle, { align: 'center' });
    }
    doc.moveDown();

    // Metrics
    if (data.metrics && data.metrics.length > 0) {
      doc.fontSize(14).text('Key Metrics:', { underline: true });
      data.metrics.forEach((metric: any) => {
        doc.fontSize(12).text(`${metric.label}: ${metric.value}`);
      });
      doc.moveDown();
    }

    // Data summary
    if (data.data && data.data.length > 0) {
      doc.fontSize(14).text('Data Summary:', { underline: true });
      data.data.forEach((row: any) => {
        doc.fontSize(12).text(Object.values(row).join(' | '));
      });
      doc.moveDown();
    }

    // Summary
    if (data.summary) {
      doc.fontSize(14).text('Summary:', { underline: true });
      doc.fontSize(12).text(data.summary);
    }
  }

  private generateTablePDF(doc: PDFDocument, data: any): void {
    // Table header
    if (data.title) {
      doc.fontSize(16).text(data.title, { align: 'center' });
      doc.moveDown();
    }

    // Column headers
    if (data.columns && data.columns.length > 0) {
      doc.fontSize(12).text(data.columns.join(' | '), { underline: true });
    }

    // Table data
    if (data.data && data.data.length > 0) {
      data.data.forEach((row: any) => {
        doc.fontSize(10).text(Object.values(row).join(' | '));
      });
    }
  }
}