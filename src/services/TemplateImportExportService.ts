import { WorkflowTemplateService, WorkflowTemplate } from './WorkflowTemplateService';
import { createLogger } from '../utils/logger';

const logger = createLogger('TemplateImportExportService');
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface TemplateExportOptions {
  format: 'json' | 'yaml' | 'zip';
  includeCredentials: boolean;
  includeDependencies: boolean;
  includeDocumentation: boolean;
  includeMetadata: boolean;
  anonymize: boolean;
  version?: string;
}

export interface TemplateImportOptions {
  overwriteExisting: boolean;
  validateBeforeImport: boolean;
  updateCredentials: boolean;
  mappings?: {
    credentialMappings?: { [oldId: string]: string };
    variableMappings?: { [oldName: string]: string };
    nodeMappings?: { [oldType: string]: string };
  };
  customizations?: {
    name?: string;
    description?: string;
    category?: string;
    tags?: string[];
    visibility?: string;
  };
}

export interface TemplateBundle {
  version: string;
  exportedAt: string;
  exportedBy: {
    platform: string;
    version: string;
    userId?: number;
  };
  template: WorkflowTemplate;
  dependencies?: {
    integrations: string[];
    nodes: string[];
    credentials: string[];
    variables: string[];
  };
  manifest: {
    checksum: string;
    originalId?: number;
    exportOptions: TemplateExportOptions;
  };
}

export interface TemplateMigration {
  from: string;
  to: string;
  transformations: {
    nodes?: { [oldType: string]: string };
    properties?: { [nodeType: string]: { [oldProp: string]: string } };
    connections?: any[];
  };
}

export class TemplateImportExportService {
  constructor(
    private templateService: WorkflowTemplateService,
    private tempDirectory: string = './temp/templates'
  ) {
    this.ensureTempDirectory();
  }

  async exportTemplate(
    templateId: number,
    options: TemplateExportOptions
  ): Promise<{
    bundle: TemplateBundle;
    filePath?: string;
    downloadUrl?: string;
  }> {
    try {
      logger.info(`Exporting template ${templateId} in ${options.format} format`);

      const template = await this.templateService.getTemplate(templateId, false);
      if (!template) {
        throw new Error('Template not found');
      }

      // Create template bundle
      const bundle = await this.createTemplateBundle(template, options);

      // Generate file based on format
      let filePath: string | undefined;
      let downloadUrl: string | undefined;

      switch (options.format) {
        case 'json':
          filePath = await this.exportToJson(bundle, template.name);
          break;
        case 'yaml':
          filePath = await this.exportToYaml(bundle, template.name);
          break;
        case 'zip':
          filePath = await this.exportToZip(bundle, template);
          break;
      }

      if (filePath) {
        downloadUrl = `/api/templates/downloads/${path.basename(filePath)}`;
      }

      // Track export
      await this.templateService.incrementUsageMetric(templateId, 'downloads');

      logger.info(`Template exported successfully: ${filePath}`);
      return { bundle, filePath, downloadUrl };
    } catch (error: any) {
      logger.error('Error exporting template:', error);
      throw new Error(`Failed to export template: ${error.message}`);
    }
  }

  async importTemplate(
    bundleData: string | Buffer | TemplateBundle,
    userId: number,
    options: TemplateImportOptions
  ): Promise<WorkflowTemplate> {
    try {
      logger.info(`Importing template by user ${userId}`);

      // Parse bundle data
      let bundle: TemplateBundle;
      
      if (typeof bundleData === 'string') {
        try {
          bundle = JSON.parse(bundleData);
        } catch {
          bundle = yaml.parse(bundleData);
        }
      } else if (Buffer.isBuffer(bundleData)) {
        bundle = JSON.parse(bundleData.toString());
      } else {
        bundle = bundleData;
      }

      // Validate bundle format
      this.validateTemplateBundle(bundle);

      // Check for version compatibility
      await this.checkVersionCompatibility(bundle);

      // Apply migrations if needed
      bundle = await this.applyMigrations(bundle);

      // Validate template if requested
      if (options.validateBeforeImport) {
        const validation = await this.validateTemplateForImport(bundle.template);
        if (!validation.isValid) {
          throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Apply customizations and mappings
      const processedTemplate = await this.processTemplateForImport(
        bundle.template,
        userId,
        options
      );

      // Check for existing template
      if (options.overwriteExisting && bundle.manifest.originalId) {
        try {
          const existing = await this.templateService.getTemplate(bundle.manifest.originalId);
          if (existing) {
            const updatedTemplate = await this.templateService.updateTemplate(
              bundle.manifest.originalId,
              processedTemplate
            );
            logger.info(`Template imported (overwritten): ${updatedTemplate.id}`);
            return updatedTemplate;
          }
        } catch (error) {
          // Template doesn't exist, continue with creation
        }
      }

      // Create new template
      const importedTemplate = await this.templateService.createTemplate(processedTemplate);
      
      logger.info(`Template imported successfully: ${importedTemplate.id}`);
      return importedTemplate;
    } catch (error: any) {
      logger.error('Error importing template:', error);
      throw new Error(`Failed to import template: ${error.message}`);
    }
  }

  async exportMultipleTemplates(
    templateIds: number[],
    options: TemplateExportOptions
  ): Promise<{
    filePath: string;
    downloadUrl: string;
  }> {
    try {
      logger.info(`Exporting ${templateIds.length} templates as bundle`);

      const templates: WorkflowTemplate[] = [];
      const bundles: TemplateBundle[] = [];

      // Export each template
      for (const templateId of templateIds) {
        const template = await this.templateService.getTemplate(templateId, false);
        if (template) {
          templates.push(template);
          const bundle = await this.createTemplateBundle(template, options);
          bundles.push(bundle);
        }
      }

      // Create multi-template bundle
      const multiBundleData = {
        version: '1.0.0',
        bundleType: 'multi-template',
        exportedAt: new Date().toISOString(),
        exportedBy: {
          platform: 'workflow-automation-platform',
          version: '1.0.0',
        },
        templates: bundles,
        manifest: {
          templateCount: bundles.length,
          checksum: this.generateChecksum(JSON.stringify(bundles)),
          exportOptions: options,
        },
      };

      const filename = `template-bundle-${Date.now()}.zip`;
      const filePath = await this.createZipBundle(multiBundleData, filename);
      const downloadUrl = `/api/templates/downloads/${filename}`;

      // Track exports
      for (const templateId of templateIds) {
        await this.templateService.incrementUsageMetric(templateId, 'downloads');
      }

      logger.info(`Multi-template bundle exported: ${filePath}`);
      return { filePath, downloadUrl };
    } catch (error: any) {
      logger.error('Error exporting multiple templates:', error);
      throw new Error(`Failed to export multiple templates: ${error.message}`);
    }
  }

  async importFromUrl(
    url: string,
    userId: number,
    options: TemplateImportOptions
  ): Promise<WorkflowTemplate> {
    try {
      logger.info(`Importing template from URL: ${url}`);

      // Fetch template data from URL
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.statusText}`);
      }

      const bundleData = await response.text();
      return await this.importTemplate(bundleData, userId, options);
    } catch (error: any) {
      logger.error('Error importing template from URL:', error);
      throw new Error(`Failed to import template from URL: ${error.message}`);
    }
  }

  async createTemplateFromWorkflow(
    workflowId: number,
    userId: number,
    templateData: {
      name: string;
      displayName: string;
      description: string;
      category: string;
      tags: string[];
      documentation?: any;
    }
  ): Promise<WorkflowTemplate> {
    try {
      logger.info(`Creating template from workflow ${workflowId}`);

      // This would integrate with the workflow service to get workflow data
      // For now, we'll create a placeholder implementation
      const workflowData = {
        nodes: [],
        connections: [],
        settings: {},
        variables: [],
      };

      const template = await this.templateService.createTemplate({
        ...templateData,
        version: '1.0.0',
        author: {
          id: userId,
          name: 'User',
        },
        templateData: workflowData,
        metadata: {
          nodeCount: workflowData.nodes.length,
          complexity: this.calculateComplexity(workflowData),
          requiredCredentials: this.extractRequiredCredentials(workflowData),
          requiredIntegrations: this.extractRequiredIntegrations(workflowData),
          useCases: [],
          keywords: templateData.tags,
        },
        documentation: templateData.documentation || {
          overview: templateData.description,
          setup: [],
          configuration: [],
        },
        visibility: 'private',
        status: 'draft',
        isOfficial: false,
        isFeatured: false,
        rating: {
          average: 0,
          count: 0,
          breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        },
        usage: {
          downloads: 0,
          installs: 0,
          forks: 0,
          views: 0
        },
        sharing: {
          allowForks: true,
          allowModifications: true,
          licenseType: 'MIT',
        },
      });

      logger.info(`Template created from workflow: ${template.id}`);
      return template;
    } catch (error: any) {
      logger.error('Error creating template from workflow:', error);
      throw new Error(`Failed to create template from workflow: ${error.message}`);
    }
  }

  private async createTemplateBundle(
    template: WorkflowTemplate,
    options: TemplateExportOptions
  ): Promise<TemplateBundle> {
    const processedTemplate = { ...template };

    // Anonymize if requested
    if (options.anonymize) {
      processedTemplate.author = {
        id: 0,
        name: 'Anonymous',
      };
    }

    // Remove credentials if not included
    if (!options.includeCredentials && processedTemplate.templateData.credentials) {
      processedTemplate.templateData.credentials = [];
    }

    // Remove documentation if not included
    if (!options.includeDocumentation) {
      processedTemplate.documentation = {
        overview: processedTemplate.description,
        setup: [],
        configuration: [],
      };
    }

    // Remove metadata if not included
    if (!options.includeMetadata) {
      processedTemplate.metadata = {
        nodeCount: processedTemplate.templateData.nodes?.length || 0,
        complexity: 'simple' as const,
        requiredCredentials: [],
        requiredIntegrations: [],
        useCases: [],
        keywords: [],
      };
    }

    const bundle: TemplateBundle = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: {
        platform: 'workflow-automation-platform',
        version: '1.0.0',
      },
      template: processedTemplate,
      manifest: {
        checksum: this.generateChecksum(JSON.stringify(processedTemplate.templateData)),
        originalId: template.id,
        exportOptions: options,
      },
    };

    // Add dependencies if requested
    if (options.includeDependencies) {
      bundle.dependencies = {
        integrations: processedTemplate.metadata.requiredIntegrations || [],
        nodes: this.extractNodeTypes(processedTemplate.templateData),
        credentials: processedTemplate.metadata.requiredCredentials || [],
        variables: processedTemplate.templateData.variables?.map((v: any) => v.name) || [],
      };
    }

    return bundle;
  }

  private async exportToJson(bundle: TemplateBundle, templateName: string): Promise<string> {
    const filename = `${this.sanitizeFilename(templateName)}-${Date.now()}.json`;
    const filePath = path.join(this.tempDirectory, filename);
    
    await fs.promises.writeFile(filePath, JSON.stringify(bundle, null, 2));
    return filePath;
  }

  private async exportToYaml(bundle: TemplateBundle, templateName: string): Promise<string> {
    const filename = `${this.sanitizeFilename(templateName)}-${Date.now()}.yaml`;
    const filePath = path.join(this.tempDirectory, filename);
    
    await fs.promises.writeFile(filePath, yaml.stringify(bundle));
    return filePath;
  }

  private async exportToZip(bundle: TemplateBundle, template: WorkflowTemplate): Promise<string> {
    // This would use a zip library like 'node-stream-zip' or 'archiver'
    // For now, return JSON file path
    return await this.exportToJson(bundle, template.name);
  }

  private async createZipBundle(data: any, filename: string): Promise<string> {
    const filePath = path.join(this.tempDirectory, filename);
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    return filePath;
  }

  private validateTemplateBundle(bundle: TemplateBundle): void {
    if (!bundle.version) {
      throw new Error('Bundle version is required');
    }

    if (!bundle.template) {
      throw new Error('Bundle must contain a template');
    }

    if (!bundle.manifest) {
      throw new Error('Bundle must contain a manifest');
    }

    if (!bundle.manifest.checksum) {
      throw new Error('Bundle manifest must contain a checksum');
    }
  }

  private async checkVersionCompatibility(bundle: TemplateBundle): Promise<void> {
    // Check if bundle version is compatible with current platform
    const supportedVersions = ['1.0.0'];
    
    if (!supportedVersions.includes(bundle.version)) {
      logger.warn(`Template bundle version ${bundle.version} may not be fully compatible`);
    }
  }

  private async applyMigrations(bundle: TemplateBundle): Promise<TemplateBundle> {
    // Apply any necessary migrations based on bundle version
    // This would contain migration logic for different template versions
    return bundle;
  }

  private async validateTemplateForImport(template: WorkflowTemplate): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Validate required fields
    if (!template.name) errors.push('Template name is required');
    if (!template.displayName) errors.push('Template display name is required');
    if (!template.description) errors.push('Template description is required');
    if (!template.category) errors.push('Template category is required');
    if (!template.templateData) errors.push('Template data is required');

    // Validate template data structure
    if (template.templateData) {
      if (!template.templateData.nodes || !Array.isArray(template.templateData.nodes)) {
        errors.push('Template data must contain nodes array');
      }
      if (!template.templateData.connections || !Array.isArray(template.templateData.connections)) {
        errors.push('Template data must contain connections array');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private async processTemplateForImport(
    template: WorkflowTemplate,
    userId: number,
    options: TemplateImportOptions
  ): Promise<Omit<WorkflowTemplate, 'id'>> {
    const processed = { ...template };

    // Apply customizations
    if (options.customizations) {
      if (options.customizations.name) processed.name = options.customizations.name;
      if (options.customizations.description) processed.description = options.customizations.description;
      if (options.customizations.category) processed.category = options.customizations.category;
      if (options.customizations.tags) processed.tags = options.customizations.tags;
      if (options.customizations.visibility) processed.visibility = options.customizations.visibility as any;
    }

    // Set new author
    processed.author = {
      id: userId,
      name: 'User', // This would come from user service
    };

    // Apply mappings
    if (options.mappings) {
      processed.templateData = this.applyMappings(processed.templateData, options.mappings);
    }

    // Reset usage stats and ratings
    processed.rating = {
      average: 0,
      count: 0,
      breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };
    processed.usage = {
      downloads: 0,
      installs: 0,
      forks: 0,
      views: 0
    };

    // Set as draft initially
    processed.status = 'draft';

    // Remove ID to create new template
    delete (processed as any).id;
    delete (processed as any).createdAt;
    delete (processed as any).updatedAt;

    return processed;
  }

  private applyMappings(templateData: any, mappings: NonNullable<TemplateImportOptions['mappings']>): any {
    const processed = { ...templateData };

    // Apply node type mappings
    if (mappings.nodeMappings && processed.nodes) {
      processed.nodes = processed.nodes.map((node: any) => ({
        ...node,
        type: mappings.nodeMappings![node.type] || node.type,
      }));
    }

    // Apply credential mappings
    if (mappings.credentialMappings && processed.credentials) {
      processed.credentials = processed.credentials.map((credId: string) =>
        mappings.credentialMappings![credId] || credId
      );
    }

    // Apply variable mappings
    if (mappings.variableMappings && processed.variables) {
      processed.variables = processed.variables.map((variable: any) => ({
        ...variable,
        name: mappings.variableMappings![variable.name] || variable.name,
      }));
    }

    return processed;
  }

  private calculateComplexity(workflowData: any): 'simple' | 'intermediate' | 'advanced' {
    const nodeCount = workflowData.nodes?.length || 0;
    const connectionCount = workflowData.connections?.length || 0;
    const totalElements = nodeCount + connectionCount;

    if (totalElements <= 5) return 'simple';
    if (totalElements <= 15) return 'intermediate';
    return 'advanced';
  }

  private extractRequiredCredentials(workflowData: any): string[] {
    const credentials = new Set<string>();
    
    if (workflowData.nodes) {
      workflowData.nodes.forEach((node: any) => {
        if (node.credentials) {
          Object.keys(node.credentials).forEach(credType => {
            credentials.add(credType);
          });
        }
      });
    }

    return Array.from(credentials);
  }

  private extractRequiredIntegrations(workflowData: any): string[] {
    const integrations = new Set<string>();
    
    if (workflowData.nodes) {
      workflowData.nodes.forEach((node: any) => {
        // Map node types to integrations
        const nodeTypeMapping: { [key: string]: string } = {
          'slack': 'slack',
          'googleSheets': 'google_sheets',
          'github': 'github',
          'aws': 'aws',
          'stripe': 'stripe',
          'twilio': 'twilio',
          'office365': 'office365',
        };

        const integration = nodeTypeMapping[node.type];
        if (integration) {
          integrations.add(integration);
        }
      });
    }

    return Array.from(integrations);
  }

  private extractNodeTypes(templateData: any): string[] {
    if (!templateData.nodes) return [];
    
    return [...new Set(templateData.nodes.map((node: any) => node.type))];
  }

  private generateChecksum(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9-_]/g, '_');
  }

  private ensureTempDirectory(): void {
    try {
      if (!fs.existsSync(this.tempDirectory)) {
        fs.mkdirSync(this.tempDirectory, { recursive: true });
      }
    } catch (error: any) {
      logger.error('Error creating temp directory:', error);
    }
  }
}