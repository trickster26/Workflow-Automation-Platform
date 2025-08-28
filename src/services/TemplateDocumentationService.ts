import { WorkflowTemplate } from './WorkflowTemplateService';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

export interface DocumentationSection {
  title: string;
  content: string;
  order: number;
  type: 'markdown' | 'html' | 'plain';
}

export interface GeneratedDocumentation {
  template: WorkflowTemplate;
  sections: DocumentationSection[];
  metadata: {
    generatedAt: string;
    version: string;
    format: 'markdown' | 'html' | 'pdf';
    wordCount: number;
    readingTime: number;
  };
  assets: {
    diagrams: string[];
    screenshots: string[];
    examples: string[];
  };
}

export interface DocumentationOptions {
  format: 'markdown' | 'html' | 'pdf';
  includeDiagrams: boolean;
  includeExamples: boolean;
  includeScreenshots: boolean;
  includeMetadata: boolean;
  includeUsageInstructions: boolean;
  includeTroubleshooting: boolean;
  includeChangelog: boolean;
  theme?: 'default' | 'minimal' | 'professional';
  language?: 'en' | 'es' | 'fr' | 'de' | 'zh';
  customSections?: {
    title: string;
    content: string;
    order: number;
  }[];
}

export interface TemplateFlowDiagram {
  nodes: {
    id: string;
    label: string;
    type: string;
    position: { x: number; y: number };
    color?: string;
    icon?: string;
  }[];
  connections: {
    source: string;
    target: string;
    label?: string;
    type?: 'success' | 'error' | 'conditional';
  }[];
  layout: 'horizontal' | 'vertical' | 'auto';
  format: 'svg' | 'png' | 'mermaid';
}

export class TemplateDocumentationService {
  private templatesDir: string;
  private assetsDir: string;

  constructor(
    templatesDir: string = './templates/documentation',
    assetsDir: string = './assets/documentation'
  ) {
    this.templatesDir = templatesDir;
    this.assetsDir = assetsDir;
    this.initializeDirectories();
    this.registerHandlebarsHelpers();
  }

  async generateDocumentation(
    template: WorkflowTemplate,
    options: DocumentationOptions
  ): Promise<GeneratedDocumentation> {
    try {
      logger.info(`Generating documentation for template: ${template.id}`);

      const sections: DocumentationSection[] = [];

      // Generate sections based on options
      sections.push(await this.generateOverviewSection(template));
      sections.push(await this.generateRequirementsSection(template));
      
      if (options.includeUsageInstructions) {
        sections.push(await this.generateUsageSection(template));
        sections.push(await this.generateConfigurationSection(template));
      }

      if (options.includeDiagrams) {
        sections.push(await this.generateWorkflowDiagramSection(template));
      }

      if (options.includeExamples) {
        sections.push(await this.generateExamplesSection(template));
      }

      if (options.includeTroubleshooting) {
        sections.push(await this.generateTroubleshootingSection(template));
      }

      if (options.includeChangelog) {
        sections.push(await this.generateChangelogSection(template));
      }

      if (options.includeMetadata) {
        sections.push(await this.generateMetadataSection(template));
      }

      // Add custom sections
      if (options.customSections) {
        for (const customSection of options.customSections) {
          sections.push({
            title: customSection.title,
            content: customSection.content,
            order: customSection.order,
            type: 'markdown',
          });
        }
      }

      // Sort sections by order
      sections.sort((a, b) => a.order - b.order);

      // Generate assets
      const assets = await this.generateAssets(template, options);

      // Calculate metadata
      const totalContent = sections.map(s => s.content).join(' ');
      const wordCount = totalContent.split(/\s+/).length;
      const readingTime = Math.ceil(wordCount / 200); // Average reading speed

      const documentation: GeneratedDocumentation = {
        template,
        sections,
        metadata: {
          generatedAt: new Date().toISOString(),
          version: template.version,
          format: options.format,
          wordCount,
          readingTime,
        },
        assets,
      };

      logger.info(`Documentation generated successfully for template: ${template.id}`);
      return documentation;
    } catch (error: any) {
      logger.error('Error generating template documentation:', error);
      throw new Error(`Failed to generate template documentation: ${error.message}`);
    }
  }

  async exportDocumentation(
    documentation: GeneratedDocumentation,
    options: DocumentationOptions
  ): Promise<{
    filePath: string;
    downloadUrl: string;
    size: number;
  }> {
    try {
      const template = documentation.template;
      const filename = `${template.name}-documentation-${Date.now()}`;
      
      let filePath: string;
      let content: string;

      switch (options.format) {
        case 'markdown':
          content = await this.generateMarkdown(documentation, options);
          filePath = path.join(this.templatesDir, `${filename}.md`);
          break;
        case 'html':
          content = await this.generateHTML(documentation, options);
          filePath = path.join(this.templatesDir, `${filename}.html`);
          break;
        case 'pdf':
          // PDF generation would require a library like puppeteer or pdfkit
          content = await this.generateHTML(documentation, options);
          filePath = path.join(this.templatesDir, `${filename}.html`);
          break;
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      await fs.promises.writeFile(filePath, content, 'utf8');
      
      const stats = await fs.promises.stat(filePath);
      const downloadUrl = `/api/templates/documentation/${path.basename(filePath)}`;

      return {
        filePath,
        downloadUrl,
        size: stats.size,
      };
    } catch (error: any) {
      logger.error('Error exporting template documentation:', error);
      throw new Error(`Failed to export template documentation: ${error.message}`);
    }
  }

  async generateFlowDiagram(template: WorkflowTemplate): Promise<TemplateFlowDiagram> {
    try {
      logger.info(`Generating flow diagram for template: ${template.id}`);

      const nodes = (template.templateData.nodes || []).map((node: any, index: number) => ({
        id: node.id || `node-${index}`,
        label: node.displayName || node.name || node.type,
        type: node.type,
        position: node.position || { x: index * 150, y: 0 },
        color: this.getNodeColor(node.type),
        icon: this.getNodeIcon(node.type),
      }));

      const connections = (template.templateData.connections || []).map((conn: any) => ({
        source: conn.source,
        target: conn.target,
        label: conn.label,
        type: conn.type || 'success',
      }));

      return {
        nodes,
        connections,
        layout: 'auto',
        format: 'mermaid',
      };
    } catch (error: any) {
      logger.error('Error generating flow diagram:', error);
      throw new Error(`Failed to generate flow diagram: ${error.message}`);
    }
  }

  async generateMermaidDiagram(diagram: TemplateFlowDiagram): Promise<string> {
    try {
      let mermaidCode = 'graph TD\n';

      // Add nodes
      for (const node of diagram.nodes) {
        const nodeShape = this.getMermaidNodeShape(node.type);
        mermaidCode += `    ${node.id}${nodeShape.start}"${node.label}"${nodeShape.end}\n`;
        
        if (node.color) {
          mermaidCode += `    ${node.id}:::${node.type}Style\n`;
        }
      }

      // Add connections
      for (const conn of diagram.connections) {
        const arrow = this.getMermaidArrow(conn.type);
        const label = conn.label ? `|${conn.label}|` : '';
        mermaidCode += `    ${conn.source} ${arrow}${label} ${conn.target}\n`;
      }

      // Add styles
      mermaidCode += '\n';
      const nodeTypes = [...new Set(diagram.nodes.map(n => n.type))];
      for (const nodeType of nodeTypes) {
        const color = this.getNodeColor(nodeType);
        mermaidCode += `    classDef ${nodeType}Style fill:${color},stroke:#333,stroke-width:2px\n`;
      }

      return mermaidCode;
    } catch (error: any) {
      logger.error('Error generating Mermaid diagram:', error);
      throw new Error(`Failed to generate Mermaid diagram: ${error.message}`);
    }
  }

  private async generateOverviewSection(template: WorkflowTemplate): Promise<DocumentationSection> {
    const content = `
# ${template.displayName}

${template.description}

## Quick Facts

- **Category**: ${template.category}${template.subcategory ? ` > ${template.subcategory}` : ''}
- **Complexity**: ${template.metadata.complexity}
- **Node Count**: ${template.metadata.nodeCount}
- **Version**: ${template.version}
- **Author**: ${template.author.name}${template.author.organization ? ` (${template.author.organization})` : ''}

## Tags

${template.tags.map(tag => `\`${tag}\``).join(', ')}

## Use Cases

${template.metadata.useCases.map(useCase => `- ${useCase}`).join('\n') || 'No specific use cases documented.'}
    `;

    return {
      title: 'Overview',
      content: content.trim(),
      order: 1,
      type: 'markdown',
    };
  }

  private async generateRequirementsSection(template: WorkflowTemplate): Promise<DocumentationSection> {
    const content = `
## Requirements

### Required Integrations

${template.metadata.requiredIntegrations.length > 0 
  ? template.metadata.requiredIntegrations.map(integration => `- ${integration}`).join('\n')
  : 'No external integrations required.'}

### Required Credentials

${template.metadata.requiredCredentials.length > 0 
  ? template.metadata.requiredCredentials.map(cred => `- ${cred}`).join('\n')
  : 'No credentials required.'}

### Prerequisites

- Workflow Automation Platform v1.0.0 or higher
${template.templateData.dependencies ? template.templateData.dependencies.map((dep: string) => `- ${dep}`).join('\n') : ''}

### Estimated Resources

- **Execution Time**: ${template.metadata.estimatedRunTime || 'Variable'}
- **Memory Usage**: Low to Medium
- **API Calls**: Depends on integrations used
    `;

    return {
      title: 'Requirements',
      content: content.trim(),
      order: 2,
      type: 'markdown',
    };
  }

  private async generateUsageSection(template: WorkflowTemplate): Promise<DocumentationSection> {
    const content = `
## How to Use

### 1. Import the Template

You can import this template in several ways:

#### From Marketplace
1. Go to Templates > Marketplace
2. Search for "${template.displayName}"
3. Click "Install Template"

#### From File
1. Download the template file
2. Go to Templates > Import
3. Upload the template file

### 2. Configure Required Settings

After importing, you'll need to configure:

${template.metadata.requiredCredentials.map(cred => `- **${cred}**: Add your ${cred} credentials in the Credentials section`).join('\n') || 'No credentials required.'}

### 3. Customize Variables

${template.templateData.variables && template.templateData.variables.length > 0 
  ? `The following variables can be customized:\n\n${template.templateData.variables.map((v: any) => `- **${v.name}**: ${v.description || 'No description'} (Default: \`${v.defaultValue || 'Not set'}\`)`).join('\n')}`
  : 'No customizable variables available.'}

### 4. Test and Execute

1. Click "Test Workflow" to validate the configuration
2. Review the execution results
3. If successful, you can activate the workflow or run it manually
    `;

    return {
      title: 'Usage Instructions',
      content: content.trim(),
      order: 3,
      type: 'markdown',
    };
  }

  private async generateConfigurationSection(template: WorkflowTemplate): Promise<DocumentationSection> {
    const nodes = template.templateData.nodes || [];
    const configurableNodes = nodes.filter((node: any) => node.parameters && Object.keys(node.parameters).length > 0);

    let content = `## Configuration Details\n\n`;

    if (configurableNodes.length === 0) {
      content += 'This template uses default configurations and requires no additional setup.';
    } else {
      content += 'The following nodes require configuration:\n\n';
      
      for (const node of configurableNodes) {
        content += `### ${node.displayName || node.name || node.type}\n\n`;
        content += `**Type**: ${node.type}\n\n`;
        
        if (node.description) {
          content += `${node.description}\n\n`;
        }

        if (node.parameters) {
          content += '**Parameters**:\n\n';
          for (const [paramName, paramValue] of Object.entries(node.parameters)) {
            content += `- **${paramName}**: ${paramValue}\n`;
          }
          content += '\n';
        }
      }
    }

    return {
      title: 'Configuration',
      content: content.trim(),
      order: 4,
      type: 'markdown',
    };
  }

  private async generateWorkflowDiagramSection(template: WorkflowTemplate): Promise<DocumentationSection> {
    const diagram = await this.generateFlowDiagram(template);
    const mermaidCode = await this.generateMermaidDiagram(diagram);

    const content = `
## Workflow Diagram

\`\`\`mermaid
${mermaidCode}
\`\`\`

### Flow Description

${this.generateFlowDescription(template)}
    `;

    return {
      title: 'Workflow Diagram',
      content: content.trim(),
      order: 5,
      type: 'markdown',
    };
  }

  private async generateExamplesSection(template: WorkflowTemplate): Promise<DocumentationSection> {
    const content = `
## Examples

### Basic Usage

Here's a typical execution scenario for this workflow:

1. **Trigger**: ${this.describeTrigger(template)}
2. **Processing**: ${this.describeMainFlow(template)}
3. **Output**: ${this.describeOutput(template)}

### Sample Input Data

\`\`\`json
${JSON.stringify(this.generateSampleInput(template), null, 2)}
\`\`\`

### Expected Output

\`\`\`json
${JSON.stringify(this.generateSampleOutput(template), null, 2)}
\`\`\`

### Use Case Scenarios

${template.documentation.examples 
  ? template.documentation.examples.map((example: any, index: number) => `
#### Scenario ${index + 1}: ${example.title || 'Example Usage'}

${example.description || 'No description provided.'}

${example.input ? `**Input**:\n\`\`\`json\n${JSON.stringify(example.input, null, 2)}\n\`\`\`` : ''}

${example.output ? `**Output**:\n\`\`\`json\n${JSON.stringify(example.output, null, 2)}\n\`\`\`` : ''}
  `).join('\n')
  : 'No specific examples documented.'}
    `;

    return {
      title: 'Examples',
      content: content.trim(),
      order: 6,
      type: 'markdown',
    };
  }

  private async generateTroubleshootingSection(template: WorkflowTemplate): Promise<DocumentationSection> {
    const content = `
## Troubleshooting

### Common Issues

#### Authentication Errors
- **Problem**: Credentials not working
- **Solution**: Verify that your credentials are correctly configured and have the necessary permissions

#### Connection Timeouts
- **Problem**: External API calls timing out
- **Solution**: Check your network connection and the external service status

#### Data Format Errors
- **Problem**: Unexpected data format causing failures
- **Solution**: Verify input data matches expected format in the examples section

### Error Codes

${this.generateErrorCodeTable(template)}

### Debug Mode

To enable debug mode:
1. Open the workflow editor
2. Go to Settings > Execution
3. Enable "Debug Mode"
4. Run the workflow and check the execution logs

### Getting Help

- Check the [documentation](https://docs.example.com)
- Visit our [community forum](https://community.example.com)
- Contact support at support@example.com

${template.documentation.troubleshooting 
  ? `\n### Additional Troubleshooting Notes\n\n${template.documentation.troubleshooting.join('\n\n')}`
  : ''}
    `;

    return {
      title: 'Troubleshooting',
      content: content.trim(),
      order: 7,
      type: 'markdown',
    };
  }

  private async generateChangelogSection(template: WorkflowTemplate): Promise<DocumentationSection> {
    const content = `
## Changelog

### Version ${template.version}

${template.documentation.changelog 
  ? template.documentation.changelog.map((change: any) => `
#### ${change.version} - ${change.date}

${change.changes.map((c: any) => `- **${c.type}**: ${c.description}`).join('\n')}

${change.migrationNotes ? `**Migration Notes**: ${change.migrationNotes}\n` : ''}
  `).join('\n')
  : 'No changelog available for this template.'}

### Version History

- **${template.version}**: Current version
- See full version history in the template marketplace
    `;

    return {
      title: 'Changelog',
      content: content.trim(),
      order: 8,
      type: 'markdown',
    };
  }

  private async generateMetadataSection(template: WorkflowTemplate): Promise<DocumentationSection> {
    const content = `
## Technical Details

### Template Information
- **Template ID**: ${template.id}
- **Name**: ${template.name}
- **Version**: ${template.version}
- **Status**: ${template.status}
- **Created**: ${template.createdAt}
- **Updated**: ${template.updatedAt}
- **Published**: ${template.publishedAt}

### Complexity Metrics
- **Complexity Level**: ${template.metadata.complexity}
- **Total Nodes**: ${template.metadata.nodeCount}
- **Total Connections**: ${template.templateData.connections?.length || 0}
- **Variables**: ${template.templateData.variables?.length || 0}

### Performance Characteristics
- **Estimated Runtime**: ${template.metadata.estimatedRunTime || 'Variable'}
- **Resource Usage**: ${this.getResourceUsageDescription(template.metadata.complexity)}
- **Scalability**: ${this.getScalabilityDescription(template.metadata.nodeCount)}

### Compatibility
- **Platform Version**: 1.0.0+
- **Node Types**: ${this.getUniqueNodeTypes(template.templateData.nodes || []).join(', ')}
- **Required Features**: ${template.metadata.requiredIntegrations.join(', ') || 'None'}

### License and Attribution
- **License**: ${template.sharing.licenseType}
- **Allow Forks**: ${template.sharing.allowForks ? 'Yes' : 'No'}
- **Allow Modifications**: ${template.sharing.allowModifications ? 'Yes' : 'No'}
${template.sharing.attribution ? `- **Attribution**: ${template.sharing.attribution}` : ''}
    `;

    return {
      title: 'Technical Details',
      content: content.trim(),
      order: 9,
      type: 'markdown',
    };
  }

  private async generateAssets(template: WorkflowTemplate, options: DocumentationOptions): Promise<{
    diagrams: string[];
    screenshots: string[];
    examples: string[];
  }> {
    const assets = {
      diagrams: [],
      screenshots: [],
      examples: [],
    };

    if (options.includeDiagrams) {
      try {
        const diagram = await this.generateFlowDiagram(template);
        const mermaidCode = await this.generateMermaidDiagram(diagram);
        // In a real implementation, you would convert this to an image
        assets.diagrams.push('workflow-diagram.mermaid');
      } catch (error) {
        logger.warn('Failed to generate diagram asset:', error);
      }
    }

    return assets;
  }

  private async generateMarkdown(
    documentation: GeneratedDocumentation,
    options: DocumentationOptions
  ): Promise<string> {
    const sections = documentation.sections
      .filter(section => section.type === 'markdown')
      .map(section => section.content)
      .join('\n\n---\n\n');

    const frontMatter = `---
title: ${documentation.template.displayName}
version: ${documentation.template.version}
generated: ${documentation.metadata.generatedAt}
format: markdown
reading_time: ${documentation.metadata.readingTime} minutes
---

`;

    return frontMatter + sections;
  }

  private async generateHTML(
    documentation: GeneratedDocumentation,
    options: DocumentationOptions
  ): Promise<string> {
    try {
      const templatePath = path.join(__dirname, '../templates/documentation.hbs');
      const templateSource = await fs.promises.readFile(templatePath, 'utf8');
      const template = Handlebars.compile(templateSource);

      return template({
        documentation,
        options,
        theme: options.theme || 'default',
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      // Fallback to simple HTML generation
      const sections = documentation.sections
        .map(section => `<section><h2>${section.title}</h2><div>${this.markdownToHtml(section.content)}</div></section>`)
        .join('\n');

      return `
<!DOCTYPE html>
<html>
<head>
    <title>${documentation.template.displayName} - Documentation</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2, h3 { color: #333; }
        pre { background: #f5f5f5; padding: 15px; overflow-x: auto; }
        code { background: #f0f0f0; padding: 2px 4px; border-radius: 3px; }
        .metadata { background: #f8f9fa; padding: 10px; border-left: 4px solid #007bff; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="metadata">
        <strong>Generated:</strong> ${documentation.metadata.generatedAt}<br>
        <strong>Version:</strong> ${documentation.template.version}<br>
        <strong>Reading Time:</strong> ${documentation.metadata.readingTime} minutes
    </div>
    ${sections}
</body>
</html>
      `.trim();
    }
  }

  private markdownToHtml(markdown: string): string {
    // Simple markdown to HTML conversion
    return markdown
      .replace(/### (.*)/g, '<h3>$1</h3>')
      .replace(/## (.*)/g, '<h2>$1</h2>')
      .replace(/# (.*)/g, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      .replace(/^- (.*)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .replace(/\n/g, '<br>');
  }

  private initializeDirectories(): void {
    try {
      if (!fs.existsSync(this.templatesDir)) {
        fs.mkdirSync(this.templatesDir, { recursive: true });
      }
      if (!fs.existsSync(this.assetsDir)) {
        fs.mkdirSync(this.assetsDir, { recursive: true });
      }
    } catch (error) {
      logger.error('Error initializing documentation directories:', error);
    }
  }

  private registerHandlebarsHelpers(): void {
    Handlebars.registerHelper('formatDate', (date: string) => {
      return new Date(date).toLocaleDateString();
    });

    Handlebars.registerHelper('capitalize', (str: string) => {
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    Handlebars.registerHelper('join', (array: any[], separator: string) => {
      return array.join(separator);
    });
  }

  private getNodeColor(nodeType: string): string {
    const colorMap: { [key: string]: string } = {
      'trigger': '#28a745',
      'action': '#007bff',
      'condition': '#ffc107',
      'transform': '#6f42c1',
      'integration': '#20c997',
      'notification': '#fd7e14',
      'database': '#6610f2',
      'file': '#e83e8c',
      'http': '#17a2b8',
      'email': '#dc3545',
    };
    return colorMap[nodeType] || '#6c757d';
  }

  private getNodeIcon(nodeType: string): string {
    const iconMap: { [key: string]: string } = {
      'trigger': '⚡',
      'action': '⚙️',
      'condition': '🔀',
      'transform': '🔄',
      'integration': '🔗',
      'notification': '📢',
      'database': '💾',
      'file': '📁',
      'http': '🌐',
      'email': '📧',
    };
    return iconMap[nodeType] || '📦';
  }

  private getMermaidNodeShape(nodeType: string): { start: string; end: string } {
    const shapeMap: { [key: string]: { start: string; end: string } } = {
      'trigger': { start: '((', end: '))' },
      'condition': { start: '{', end: '}' },
      'action': { start: '[', end: ']' },
      'integration': { start: '[[', end: ']]' },
    };
    return shapeMap[nodeType] || { start: '[', end: ']' };
  }

  private getMermaidArrow(connectionType?: string): string {
    const arrowMap: { [key: string]: string } = {
      'success': '-->',
      'error': '-.->',
      'conditional': '-->',
    };
    return arrowMap[connectionType || 'success'] || '-->';
  }

  private generateFlowDescription(template: WorkflowTemplate): string {
    const nodes = template.templateData.nodes || [];
    const nodeCount = nodes.length;
    const connectionCount = template.templateData.connections?.length || 0;

    return `This workflow consists of ${nodeCount} nodes connected by ${connectionCount} connections. The flow starts with a trigger node and processes data through various transformation and action nodes before completing.`;
  }

  private describeTrigger(template: WorkflowTemplate): string {
    const triggerNodes = (template.templateData.nodes || []).filter((node: any) => 
      node.type.includes('trigger') || node.type === 'manual' || node.type === 'webhook' || node.type === 'schedule'
    );
    
    if (triggerNodes.length === 0) return 'Manual execution';
    
    const triggerTypes = triggerNodes.map((node: any) => node.type).join(', ');
    return `Triggered by ${triggerTypes}`;
  }

  private describeMainFlow(template: WorkflowTemplate): string {
    const actionNodes = (template.templateData.nodes || []).filter((node: any) => 
      !node.type.includes('trigger') && node.type !== 'manual'
    );
    
    if (actionNodes.length === 0) return 'No processing steps defined';
    
    return `Processes data through ${actionNodes.length} steps including data transformation, API calls, and conditional logic`;
  }

  private describeOutput(template: WorkflowTemplate): string {
    const outputNodes = (template.templateData.nodes || []).filter((node: any) => 
      node.type.includes('export') || node.type.includes('notification') || node.type.includes('email')
    );
    
    if (outputNodes.length === 0) return 'Internal processing only';
    
    const outputTypes = [...new Set(outputNodes.map((node: any) => node.type))];
    return `Generates output via ${outputTypes.join(', ')}`;
  }

  private generateSampleInput(template: WorkflowTemplate): any {
    return {
      data: "Sample input data",
      timestamp: new Date().toISOString(),
      source: "example-source"
    };
  }

  private generateSampleOutput(template: WorkflowTemplate): any {
    return {
      result: "Processed successfully",
      timestamp: new Date().toISOString(),
      processedBy: template.displayName
    };
  }

  private generateErrorCodeTable(template: WorkflowTemplate): string {
    return `
| Code | Description | Solution |
|------|-------------|----------|
| ERR_001 | Authentication failed | Check credentials |
| ERR_002 | Network timeout | Retry or check connectivity |
| ERR_003 | Invalid data format | Validate input data |
| ERR_004 | Resource not found | Check resource availability |
`;
  }

  private getResourceUsageDescription(complexity: string): string {
    const descriptions = {
      'simple': 'Low CPU and memory usage',
      'intermediate': 'Moderate CPU and memory usage',
      'advanced': 'High CPU and memory usage',
    };
    return descriptions[complexity as keyof typeof descriptions] || 'Variable usage';
  }

  private getScalabilityDescription(nodeCount: number): string {
    if (nodeCount <= 5) return 'Excellent scalability';
    if (nodeCount <= 15) return 'Good scalability';
    return 'Consider optimization for large-scale usage';
  }

  private getUniqueNodeTypes(nodes: any[]): string[] {
    return [...new Set(nodes.map(node => node.type))];
  }
}