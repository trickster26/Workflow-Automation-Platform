import { WorkflowTemplate, WorkflowTemplateService } from './WorkflowTemplateService';
import { TemplateDocumentationService } from './TemplateDocumentationService';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface TemplateBuilder {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  subcategory?: string;
  tags: string[];
  nodes: TemplateNode[];
  connections: TemplateConnection[];
  variables: TemplateVariable[];
  settings: TemplateSettings;
  validation: TemplateValidation;
  documentation: TemplateDocumentation;
  metadata: TemplateBuilderMetadata;
}

export interface TemplateNode {
  id: string;
  type: string;
  name: string;
  displayName: string;
  description?: string;
  position: { x: number; y: number };
  parameters: { [key: string]: any };
  credentials?: string[];
  required: boolean;
  configurable: boolean;
  customization: {
    allowParameterOverride: boolean;
    allowCredentialChange: boolean;
    allowPositionChange: boolean;
    requiredParameters: string[];
    optionalParameters: string[];
  };
}

export interface TemplateConnection {
  id: string;
  source: string;
  target: string;
  sourceOutput: string;
  targetInput: string;
  label?: string;
  condition?: string;
  required: boolean;
  configurable: boolean;
}

export interface TemplateVariable {
  id: string;
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date';
  description: string;
  defaultValue?: any;
  required: boolean;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    options?: string[];
    customValidator?: string;
  };
  scope: 'global' | 'node' | 'connection';
  category?: string;
}

export interface TemplateSettings {
  errorHandling: {
    continueOnFail: boolean;
    retryAttempts: number;
    retryDelay: number;
  };
  execution: {
    timeout: number;
    concurrent: boolean;
    maxConcurrency?: number;
  };
  logging: {
    level: 'minimal' | 'standard' | 'detailed';
    includeData: boolean;
    includeTiming: boolean;
  };
  security: {
    encryptData: boolean;
    auditExecution: boolean;
    allowDataExport: boolean;
  };
}

export interface TemplateValidation {
  rules: ValidationRule[];
  warnings: ValidationWarning[];
  quality: {
    score: number;
    factors: QualityFactor[];
  };
}

export interface ValidationRule {
  id: string;
  type: 'structural' | 'semantic' | 'performance' | 'security';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
  fixable: boolean;
  autoFix?: boolean;
}

export interface ValidationWarning {
  id: string;
  type: 'compatibility' | 'performance' | 'best-practice';
  message: string;
  impact: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface QualityFactor {
  name: string;
  score: number;
  weight: number;
  description: string;
}

export interface TemplateDocumentation {
  overview: string;
  setup: string[];
  configuration: string[];
  examples: DocumentationExample[];
  troubleshooting: TroubleshootingItem[];
  faq: FAQItem[];
}

export interface DocumentationExample {
  title: string;
  description: string;
  input?: any;
  output?: any;
  steps: string[];
}

export interface TroubleshootingItem {
  problem: string;
  cause: string;
  solution: string;
  category: string;
}

export interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export interface TemplateBuilderMetadata {
  version: string;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'testing' | 'ready' | 'published';
  complexity: 'simple' | 'intermediate' | 'advanced';
  estimatedBuildTime: number;
  requiredSkills: string[];
  buildSteps: BuildStep[];
}

export interface BuildStep {
  id: string;
  title: string;
  description: string;
  type: 'setup' | 'configure' | 'connect' | 'validate' | 'document';
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  required: boolean;
  estimatedTime: number;
  dependencies: string[];
  instructions: string[];
  validation?: {
    rules: string[];
    autoCheck: boolean;
  };
}

export interface TemplateWizard {
  id: string;
  name: string;
  steps: WizardStep[];
  currentStep: number;
  data: { [key: string]: any };
  validation: { [stepId: string]: boolean };
}

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  type: 'form' | 'selection' | 'configuration' | 'preview' | 'validation';
  fields: WizardField[];
  validation: {
    required: string[];
    rules: { [fieldId: string]: any };
  };
  nextStep?: string;
  previousStep?: string;
  skippable: boolean;
}

export interface WizardField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'number' | 'date' | 'file' | 'json';
  description?: string;
  placeholder?: string;
  required: boolean;
  options?: { value: any; label: string; description?: string }[];
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    customValidator?: string;
  };
  defaultValue?: any;
  conditional?: {
    field: string;
    value: any;
    operator: 'equals' | 'not-equals' | 'contains' | 'greater' | 'less';
  };
}

export class TemplateBuilderService {
  constructor(
    private templateService: WorkflowTemplateService,
    private documentationService: TemplateDocumentationService
  ) {}

  async createBuilder(
    name: string,
    userId: number,
    options: {
      category?: string;
      template?: 'blank' | 'basic' | 'integration' | 'automation';
      wizard?: boolean;
    } = {}
  ): Promise<TemplateBuilder> {
    try {
      logger.info(`Creating template builder: ${name} by user ${userId}`);

      const builder: TemplateBuilder = {
        id: uuidv4(),
        name: this.sanitizeName(name),
        displayName: name,
        description: '',
        category: options.category || 'automation',
        tags: [],
        nodes: [],
        connections: [],
        variables: [],
        settings: this.getDefaultSettings(),
        validation: {
          rules: [],
          warnings: [],
          quality: { score: 0, factors: [] },
        },
        documentation: {
          overview: '',
          setup: [],
          configuration: [],
          examples: [],
          troubleshooting: [],
          faq: [],
        },
        metadata: {
          version: '0.1.0',
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'draft',
          complexity: 'simple',
          estimatedBuildTime: 30,
          requiredSkills: [],
          buildSteps: this.generateBuildSteps(),
        },
      };

      // Apply template if specified
      if (options.template && options.template !== 'blank') {
        await this.applyTemplate(builder, options.template);
      }

      logger.info(`Template builder created: ${builder.id}`);
      return builder;
    } catch (error: any) {
      logger.error('Error creating template builder:', error);
      throw new Error(`Failed to create template builder: ${error.message}`);
    }
  }

  async addNode(
    builderId: string,
    nodeConfig: {
      type: string;
      name?: string;
      position?: { x: number; y: number };
      parameters?: { [key: string]: any };
      credentials?: string[];
    }
  ): Promise<TemplateNode> {
    try {
      logger.info(`Adding node to builder ${builderId}: ${nodeConfig.type}`);

      const node: TemplateNode = {
        id: uuidv4(),
        type: nodeConfig.type,
        name: nodeConfig.name || nodeConfig.type,
        displayName: nodeConfig.name || this.getNodeDisplayName(nodeConfig.type),
        position: nodeConfig.position || { x: 0, y: 0 },
        parameters: nodeConfig.parameters || {},
        credentials: nodeConfig.credentials || [],
        required: true,
        configurable: true,
        customization: {
          allowParameterOverride: true,
          allowCredentialChange: true,
          allowPositionChange: true,
          requiredParameters: [],
          optionalParameters: [],
        },
      };

      // Set node-specific configurations
      await this.configureNode(node);

      logger.info(`Node added to builder: ${node.id}`);
      return node;
    } catch (error: any) {
      logger.error('Error adding node to builder:', error);
      throw new Error(`Failed to add node to builder: ${error.message}`);
    }
  }

  async connectNodes(
    builderId: string,
    sourceNodeId: string,
    targetNodeId: string,
    options: {
      sourceOutput?: string;
      targetInput?: string;
      label?: string;
      condition?: string;
    } = {}
  ): Promise<TemplateConnection> {
    try {
      logger.info(`Connecting nodes in builder ${builderId}: ${sourceNodeId} -> ${targetNodeId}`);

      const connection: TemplateConnection = {
        id: uuidv4(),
        source: sourceNodeId,
        target: targetNodeId,
        sourceOutput: options.sourceOutput || 'main',
        targetInput: options.targetInput || 'main',
        label: options.label,
        condition: options.condition,
        required: true,
        configurable: false,
      };

      logger.info(`Nodes connected: ${connection.id}`);
      return connection;
    } catch (error: any) {
      logger.error('Error connecting nodes:', error);
      throw new Error(`Failed to connect nodes: ${error.message}`);
    }
  }

  async addVariable(
    builderId: string,
    variableConfig: {
      name: string;
      type: TemplateVariable['type'];
      description: string;
      defaultValue?: any;
      required?: boolean;
      validation?: TemplateVariable['validation'];
    }
  ): Promise<TemplateVariable> {
    try {
      logger.info(`Adding variable to builder ${builderId}: ${variableConfig.name}`);

      const variable: TemplateVariable = {
        id: uuidv4(),
        name: variableConfig.name,
        displayName: this.capitalizeWords(variableConfig.name),
        type: variableConfig.type,
        description: variableConfig.description,
        defaultValue: variableConfig.defaultValue,
        required: variableConfig.required || false,
        validation: variableConfig.validation,
        scope: 'global',
      };

      logger.info(`Variable added to builder: ${variable.id}`);
      return variable;
    } catch (error: any) {
      logger.error('Error adding variable to builder:', error);
      throw new Error(`Failed to add variable to builder: ${error.message}`);
    }
  }

  async validateBuilder(builder: TemplateBuilder): Promise<TemplateValidation> {
    try {
      logger.info(`Validating template builder: ${builder.id}`);

      const rules: ValidationRule[] = [];
      const warnings: ValidationWarning[] = [];

      // Structural validation
      await this.validateStructure(builder, rules, warnings);

      // Semantic validation
      await this.validateSemantics(builder, rules, warnings);

      // Performance validation
      await this.validatePerformance(builder, rules, warnings);

      // Security validation
      await this.validateSecurity(builder, rules, warnings);

      // Calculate quality score
      const quality = this.calculateQualityScore(builder, rules, warnings);

      const validation: TemplateValidation = {
        rules,
        warnings,
        quality,
      };

      logger.info(`Template builder validated: ${builder.id} (Score: ${quality.score})`);
      return validation;
    } catch (error: any) {
      logger.error('Error validating template builder:', error);
      throw new Error(`Failed to validate template builder: ${error.message}`);
    }
  }

  async generateDocumentation(builder: TemplateBuilder): Promise<TemplateDocumentation> {
    try {
      logger.info(`Generating documentation for builder: ${builder.id}`);

      const documentation: TemplateDocumentation = {
        overview: this.generateOverview(builder),
        setup: this.generateSetupInstructions(builder),
        configuration: this.generateConfigurationInstructions(builder),
        examples: this.generateExamples(builder),
        troubleshooting: this.generateTroubleshooting(builder),
        faq: this.generateFAQ(builder),
      };

      logger.info(`Documentation generated for builder: ${builder.id}`);
      return documentation;
    } catch (error: any) {
      logger.error('Error generating documentation:', error);
      throw new Error(`Failed to generate documentation: ${error.message}`);
    }
  }

  async buildTemplate(builder: TemplateBuilder, userId: number): Promise<WorkflowTemplate> {
    try {
      logger.info(`Building template from builder: ${builder.id}`);

      // Validate builder before building
      const validation = await this.validateBuilder(builder);
      const hasErrors = validation.rules.some(rule => rule.severity === 'error');
      
      if (hasErrors) {
        throw new Error('Template builder has validation errors that must be fixed before building');
      }

      // Generate documentation
      const documentation = await this.generateDocumentation(builder);

      // Convert builder to template format
      const templateData = {
        nodes: builder.nodes.map(node => this.nodeToTemplateNode(node)),
        connections: builder.connections.map(conn => this.connectionToTemplateConnection(conn)),
        settings: builder.settings,
        variables: builder.variables,
      };

      // Create template
      const template = await this.templateService.createTemplate({
        name: builder.name,
        displayName: builder.displayName,
        description: builder.description,
        category: builder.category,
        subcategory: builder.subcategory,
        tags: builder.tags,
        version: builder.metadata.version,
        author: {
          id: userId,
          name: 'User', // This would come from user service
        },
        templateData,
        metadata: {
          nodeCount: builder.nodes.length,
          complexity: builder.metadata.complexity,
          requiredCredentials: this.extractRequiredCredentials(builder),
          requiredIntegrations: this.extractRequiredIntegrations(builder),
          useCases: [],
          keywords: builder.tags,
        },
        documentation: {
          overview: documentation.overview,
          setup: documentation.setup,
          configuration: documentation.configuration,
          examples: documentation.examples,
          troubleshooting: documentation.troubleshooting.map(t => t.solution),
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

      logger.info(`Template built successfully: ${template.id}`);
      return template;
    } catch (error: any) {
      logger.error('Error building template:', error);
      throw new Error(`Failed to build template: ${error.message}`);
    }
  }

  async createWizard(
    templateType: 'integration' | 'automation' | 'data-processing' | 'notification',
    userId: number
  ): Promise<TemplateWizard> {
    try {
      logger.info(`Creating template wizard: ${templateType} for user ${userId}`);

      const wizard: TemplateWizard = {
        id: uuidv4(),
        name: `${this.capitalizeWords(templateType)} Template Wizard`,
        steps: this.getWizardSteps(templateType),
        currentStep: 0,
        data: {},
        validation: {},
      };

      logger.info(`Template wizard created: ${wizard.id}`);
      return wizard;
    } catch (error: any) {
      logger.error('Error creating template wizard:', error);
      throw new Error(`Failed to create template wizard: ${error.message}`);
    }
  }

  async processWizardStep(
    wizardId: string,
    stepId: string,
    data: { [key: string]: any }
  ): Promise<{
    success: boolean;
    errors: string[];
    nextStep?: string;
    completed?: boolean;
  }> {
    try {
      logger.info(`Processing wizard step: ${wizardId}/${stepId}`);

      // Validate step data
      const errors = await this.validateWizardStep(stepId, data);
      
      if (errors.length > 0) {
        return { success: false, errors };
      }

      // Process step logic
      const result = await this.executeWizardStep(stepId, data);

      return {
        success: true,
        errors: [],
        nextStep: result.nextStep,
        completed: result.completed,
      };
    } catch (error: any) {
      logger.error('Error processing wizard step:', error);
      return {
        success: false,
        errors: [error.message],
      };
    }
  }

  private async applyTemplate(builder: TemplateBuilder, templateType: string): Promise<void> {
    const templates = {
      basic: {
        nodes: [
          { type: 'manual', name: 'Start' },
          { type: 'transform', name: 'Process Data' },
          { type: 'export', name: 'Export Results' },
        ],
        connections: [
          { source: 0, target: 1 },
          { source: 1, target: 2 },
        ],
      },
      integration: {
        nodes: [
          { type: 'webhook', name: 'Webhook Trigger' },
          { type: 'http', name: 'API Call' },
          { type: 'transform', name: 'Process Response' },
          { type: 'notification', name: 'Send Notification' },
        ],
        connections: [
          { source: 0, target: 1 },
          { source: 1, target: 2 },
          { source: 2, target: 3 },
        ],
      },
      automation: {
        nodes: [
          { type: 'schedule', name: 'Schedule Trigger' },
          { type: 'database', name: 'Query Database' },
          { type: 'condition', name: 'Check Conditions' },
          { type: 'email', name: 'Send Email' },
        ],
        connections: [
          { source: 0, target: 1 },
          { source: 1, target: 2 },
          { source: 2, target: 3 },
        ],
      },
    };

    const template = templates[templateType as keyof typeof templates];
    if (template) {
      // Add template nodes and connections
      for (let i = 0; i < template.nodes.length; i++) {
        const nodeConfig = template.nodes[i];
        const node = await this.addNode(builder.id, {
          type: nodeConfig.type,
          name: nodeConfig.name,
          position: { x: i * 200, y: 100 },
        });
        builder.nodes.push(node);
      }

      for (const connConfig of template.connections) {
        const connection = await this.connectNodes(
          builder.id,
          builder.nodes[connConfig.source].id,
          builder.nodes[connConfig.target].id
        );
        builder.connections.push(connection);
      }
    }
  }

  private async configureNode(node: TemplateNode): Promise<void> {
    // Set node-specific configurations based on type
    const nodeConfigs: { [key: string]: Partial<TemplateNode> } = {
      'webhook': {
        customization: {
          allowParameterOverride: true,
          allowCredentialChange: false,
          allowPositionChange: true,
          requiredParameters: ['path', 'method'],
          optionalParameters: ['responseMode'],
        },
      },
      'http': {
        customization: {
          allowParameterOverride: true,
          allowCredentialChange: true,
          allowPositionChange: true,
          requiredParameters: ['url', 'method'],
          optionalParameters: ['headers', 'body'],
        },
        credentials: ['httpAuth'],
      },
      'database': {
        customization: {
          allowParameterOverride: true,
          allowCredentialChange: true,
          allowPositionChange: true,
          requiredParameters: ['query'],
          optionalParameters: ['database'],
        },
        credentials: ['database'],
      },
    };

    const config = nodeConfigs[node.type];
    if (config) {
      Object.assign(node, config);
    }
  }

  private getDefaultSettings(): TemplateSettings {
    return {
      errorHandling: {
        continueOnFail: false,
        retryAttempts: 3,
        retryDelay: 1000,
      },
      execution: {
        timeout: 300000, // 5 minutes
        concurrent: false,
      },
      logging: {
        level: 'standard',
        includeData: false,
        includeTiming: true,
      },
      security: {
        encryptData: true,
        auditExecution: true,
        allowDataExport: false,
      },
    };
  }

  private generateBuildSteps(): BuildStep[] {
    return [
      {
        id: 'setup',
        title: 'Setup Template',
        description: 'Define basic template information',
        type: 'setup',
        status: 'pending',
        required: true,
        estimatedTime: 5,
        dependencies: [],
        instructions: [
          'Enter template name and description',
          'Select category and tags',
          'Choose template type',
        ],
      },
      {
        id: 'nodes',
        title: 'Add Nodes',
        description: 'Add and configure workflow nodes',
        type: 'configure',
        status: 'pending',
        required: true,
        estimatedTime: 15,
        dependencies: ['setup'],
        instructions: [
          'Add trigger nodes',
          'Add processing nodes',
          'Configure node parameters',
        ],
      },
      {
        id: 'connections',
        title: 'Connect Nodes',
        description: 'Create connections between nodes',
        type: 'connect',
        status: 'pending',
        required: true,
        estimatedTime: 10,
        dependencies: ['nodes'],
        instructions: [
          'Connect nodes in logical order',
          'Add conditional connections if needed',
          'Validate flow logic',
        ],
      },
      {
        id: 'variables',
        title: 'Configure Variables',
        description: 'Add template variables and settings',
        type: 'configure',
        status: 'pending',
        required: false,
        estimatedTime: 10,
        dependencies: ['connections'],
        instructions: [
          'Add template variables',
          'Configure default values',
          'Set validation rules',
        ],
      },
      {
        id: 'documentation',
        title: 'Add Documentation',
        description: 'Document template usage and configuration',
        type: 'document',
        status: 'pending',
        required: false,
        estimatedTime: 20,
        dependencies: ['variables'],
        instructions: [
          'Write overview and description',
          'Add usage examples',
          'Include troubleshooting tips',
        ],
      },
      {
        id: 'validation',
        title: 'Validate Template',
        description: 'Run validation and quality checks',
        type: 'validate',
        status: 'pending',
        required: true,
        estimatedTime: 5,
        dependencies: ['documentation'],
        instructions: [
          'Run structural validation',
          'Check for best practices',
          'Fix any issues found',
        ],
        validation: {
          rules: ['no-orphaned-nodes', 'all-connections-valid', 'required-parameters-set'],
          autoCheck: true,
        },
      },
    ];
  }

  private async validateStructure(
    builder: TemplateBuilder,
    rules: ValidationRule[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Check for orphaned nodes
    const connectedNodeIds = new Set([
      ...builder.connections.map(c => c.source),
      ...builder.connections.map(c => c.target),
    ]);
    
    const orphanedNodes = builder.nodes.filter(node => !connectedNodeIds.has(node.id));
    
    if (orphanedNodes.length > 0) {
      rules.push({
        id: 'orphaned-nodes',
        type: 'structural',
        severity: 'warning',
        message: `Found ${orphanedNodes.length} orphaned node(s)`,
        suggestion: 'Connect all nodes or remove unused ones',
        fixable: true,
      });
    }

    // Check for trigger nodes
    const triggerNodes = builder.nodes.filter(node => 
      node.type.includes('trigger') || node.type === 'manual' || node.type === 'webhook' || node.type === 'schedule'
    );
    
    if (triggerNodes.length === 0) {
      rules.push({
        id: 'no-trigger',
        type: 'structural',
        severity: 'error',
        message: 'Template must have at least one trigger node',
        suggestion: 'Add a manual, webhook, or schedule trigger',
        fixable: false,
      });
    }
  }

  private async validateSemantics(
    builder: TemplateBuilder,
    rules: ValidationRule[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Check for required parameters
    for (const node of builder.nodes) {
      const requiredParams = node.customization.requiredParameters || [];
      const missingParams = requiredParams.filter(param => !node.parameters[param]);
      
      if (missingParams.length > 0) {
        rules.push({
          id: `missing-params-${node.id}`,
          type: 'semantic',
          severity: 'error',
          message: `Node "${node.displayName}" is missing required parameters: ${missingParams.join(', ')}`,
          suggestion: `Configure the missing parameters for ${node.displayName}`,
          fixable: false,
        });
      }
    }
  }

  private async validatePerformance(
    builder: TemplateBuilder,
    rules: ValidationRule[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Check for excessive nodes
    if (builder.nodes.length > 20) {
      warnings.push({
        id: 'excessive-nodes',
        type: 'performance',
        message: 'Template has many nodes which may impact performance',
        impact: 'medium',
        recommendation: 'Consider breaking into smaller templates or optimizing the flow',
      });
    }

    // Check for deep nesting
    const maxDepth = this.calculateFlowDepth(builder);
    if (maxDepth > 10) {
      warnings.push({
        id: 'deep-nesting',
        type: 'performance',
        message: 'Template has deep nesting which may cause stack overflow',
        impact: 'high',
        recommendation: 'Reduce nesting depth or add intermediate nodes',
      });
    }
  }

  private async validateSecurity(
    builder: TemplateBuilder,
    rules: ValidationRule[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Check for hardcoded credentials
    for (const node of builder.nodes) {
      const paramString = JSON.stringify(node.parameters);
      if (paramString.includes('password') || paramString.includes('token') || paramString.includes('secret')) {
        rules.push({
          id: `hardcoded-credentials-${node.id}`,
          type: 'security',
          severity: 'error',
          message: `Node "${node.displayName}" may contain hardcoded credentials`,
          suggestion: 'Use credential references instead of hardcoded values',
          fixable: false,
        });
      }
    }
  }

  private calculateQualityScore(
    builder: TemplateBuilder,
    rules: ValidationRule[],
    warnings: ValidationWarning[]
  ): { score: number; factors: QualityFactor[] } {
    const factors: QualityFactor[] = [];

    // Documentation quality
    const docScore = Math.min(100, (
      (builder.documentation.overview ? 20 : 0) +
      (builder.documentation.setup.length * 10) +
      (builder.documentation.examples.length * 15)
    ));
    factors.push({
      name: 'Documentation',
      score: docScore,
      weight: 0.3,
      description: 'Quality and completeness of documentation',
    });

    // Structure quality
    const errorCount = rules.filter(r => r.severity === 'error').length;
    const structureScore = Math.max(0, 100 - (errorCount * 25));
    factors.push({
      name: 'Structure',
      score: structureScore,
      weight: 0.4,
      description: 'Structural correctness and validation',
    });

    // Best practices
    const warningCount = warnings.length;
    const practicesScore = Math.max(0, 100 - (warningCount * 10));
    factors.push({
      name: 'Best Practices',
      score: practicesScore,
      weight: 0.2,
      description: 'Adherence to best practices and conventions',
    });

    // Complexity appropriateness
    const complexityScore = this.assessComplexity(builder);
    factors.push({
      name: 'Complexity',
      score: complexityScore,
      weight: 0.1,
      description: 'Appropriate complexity for the use case',
    });

    // Calculate weighted average
    const totalScore = factors.reduce((sum, factor) => sum + (factor.score * factor.weight), 0);

    return {
      score: Math.round(totalScore),
      factors,
    };
  }

  private assessComplexity(builder: TemplateBuilder): number {
    const nodeCount = builder.nodes.length;
    const connectionCount = builder.connections.length;
    const variableCount = builder.variables.length;
    
    const complexity = nodeCount + (connectionCount * 0.5) + (variableCount * 0.3);
    
    // Score based on appropriateness of complexity
    if (complexity < 5) return 85; // Simple is good
    if (complexity < 15) return 100; // Moderate is ideal
    if (complexity < 25) return 75; // Getting complex
    return 50; // Very complex, may need simplification
  }

  private calculateFlowDepth(builder: TemplateBuilder): number {
    // Simple depth calculation - in reality would need graph traversal
    return Math.max(1, Math.ceil(builder.nodes.length / 3));
  }

  private generateOverview(builder: TemplateBuilder): string {
    return `${builder.description}\n\nThis template consists of ${builder.nodes.length} nodes and ${builder.connections.length} connections, providing ${builder.metadata.complexity} workflow automation.`;
  }

  private generateSetupInstructions(builder: TemplateBuilder): string[] {
    const instructions = [
      'Import the template into your workflow automation platform',
      'Review the template configuration and requirements',
    ];

    const requiredCredentials = this.extractRequiredCredentials(builder);
    if (requiredCredentials.length > 0) {
      instructions.push(`Configure required credentials: ${requiredCredentials.join(', ')}`);
    }

    if (builder.variables.length > 0) {
      instructions.push('Set up template variables according to your requirements');
    }

    instructions.push('Test the template configuration before activation');

    return instructions;
  }

  private generateConfigurationInstructions(builder: TemplateBuilder): string[] {
    const instructions: string[] = [];

    for (const node of builder.nodes) {
      if (node.configurable && node.customization.requiredParameters.length > 0) {
        instructions.push(`Configure ${node.displayName}: ${node.customization.requiredParameters.join(', ')}`);
      }
    }

    return instructions;
  }

  private generateExamples(builder: TemplateBuilder): DocumentationExample[] {
    return [
      {
        title: 'Basic Usage',
        description: 'Standard execution of the template',
        steps: [
          'Activate the template',
          'Provide required input data',
          'Monitor execution progress',
          'Review output results',
        ],
        input: { example: 'input data' },
        output: { result: 'processed data' },
      },
    ];
  }

  private generateTroubleshooting(builder: TemplateBuilder): TroubleshootingItem[] {
    return [
      {
        problem: 'Template execution fails with authentication error',
        cause: 'Missing or incorrect credentials',
        solution: 'Verify and update credential configuration',
        category: 'authentication',
      },
      {
        problem: 'Workflow gets stuck or times out',
        cause: 'Network issues or external service unavailability',
        solution: 'Check network connectivity and external service status',
        category: 'connectivity',
      },
    ];
  }

  private generateFAQ(builder: TemplateBuilder): FAQItem[] {
    return [
      {
        question: 'How do I customize this template for my use case?',
        answer: 'You can modify node parameters, add variables, and adjust connections to fit your specific requirements.',
        category: 'customization',
      },
      {
        question: 'What credentials are required for this template?',
        answer: `This template requires: ${this.extractRequiredCredentials(builder).join(', ')}`,
        category: 'setup',
      },
    ];
  }

  private getWizardSteps(templateType: string): WizardStep[] {
    const commonSteps: WizardStep[] = [
      {
        id: 'basic-info',
        title: 'Basic Information',
        description: 'Enter basic template information',
        type: 'form',
        fields: [
          {
            id: 'name',
            name: 'name',
            label: 'Template Name',
            type: 'text',
            required: true,
          },
          {
            id: 'description',
            name: 'description',
            label: 'Description',
            type: 'textarea',
            required: true,
          },
          {
            id: 'category',
            name: 'category',
            label: 'Category',
            type: 'select',
            required: true,
            options: [
              { value: 'automation', label: 'Automation' },
              { value: 'integration', label: 'Integration' },
              { value: 'business', label: 'Business' },
              { value: 'development', label: 'Development' },
            ],
          },
        ],
        validation: {
          required: ['name', 'description', 'category'],
          rules: {},
        },
        skippable: false,
      },
      {
        id: 'trigger-setup',
        title: 'Trigger Configuration',
        description: 'Configure how the workflow is triggered',
        type: 'selection',
        fields: [
          {
            id: 'trigger-type',
            name: 'triggerType',
            label: 'Trigger Type',
            type: 'radio',
            required: true,
            options: [
              { value: 'manual', label: 'Manual', description: 'Trigger manually' },
              { value: 'webhook', label: 'Webhook', description: 'HTTP webhook trigger' },
              { value: 'schedule', label: 'Schedule', description: 'Time-based trigger' },
            ],
          },
        ],
        validation: {
          required: ['triggerType'],
          rules: {},
        },
        skippable: false,
      },
    ];

    return commonSteps;
  }

  private async validateWizardStep(stepId: string, data: { [key: string]: any }): Promise<string[]> {
    const errors: string[] = [];

    // Implement step-specific validation
    switch (stepId) {
      case 'basic-info':
        if (!data.name || data.name.trim().length === 0) {
          errors.push('Template name is required');
        }
        if (!data.description || data.description.trim().length === 0) {
          errors.push('Description is required');
        }
        break;
    }

    return errors;
  }

  private async executeWizardStep(stepId: string, data: { [key: string]: any }): Promise<{
    nextStep?: string;
    completed: boolean;
  }> {
    // Implement step-specific logic
    return { completed: false };
  }

  private nodeToTemplateNode(node: TemplateNode): any {
    return {
      id: node.id,
      type: node.type,
      name: node.name,
      displayName: node.displayName,
      position: node.position,
      parameters: node.parameters,
      credentials: node.credentials,
    };
  }

  private connectionToTemplateConnection(connection: TemplateConnection): any {
    return {
      id: connection.id,
      source: connection.source,
      target: connection.target,
      sourceOutput: connection.sourceOutput,
      targetInput: connection.targetInput,
      label: connection.label,
    };
  }

  private extractRequiredCredentials(builder: TemplateBuilder): string[] {
    const credentials = new Set<string>();
    
    for (const node of builder.nodes) {
      if (node.credentials) {
        node.credentials.forEach(cred => credentials.add(cred));
      }
    }

    return Array.from(credentials);
  }

  private extractRequiredIntegrations(builder: TemplateBuilder): string[] {
    const integrations = new Set<string>();
    
    const integrationNodeTypes = ['slack', 'github', 'aws', 'stripe', 'twilio', 'office365'];
    
    for (const node of builder.nodes) {
      if (integrationNodeTypes.includes(node.type)) {
        integrations.add(node.type);
      }
    }

    return Array.from(integrations);
  }

  private getNodeDisplayName(nodeType: string): string {
    const displayNames: { [key: string]: string } = {
      'manual': 'Manual Trigger',
      'webhook': 'Webhook',
      'schedule': 'Schedule',
      'http': 'HTTP Request',
      'transform': 'Transform Data',
      'condition': 'Condition',
      'email': 'Send Email',
      'database': 'Database Query',
      'export': 'Export Data',
      'notification': 'Send Notification',
    };
    return displayNames[nodeType] || this.capitalizeWords(nodeType);
  }

  private sanitizeName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').trim();
  }

  private capitalizeWords(str: string): string {
    return str.split(/[-_\s]+/).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }
}