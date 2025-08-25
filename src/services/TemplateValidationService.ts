import { createLogger } from '../utils/logger';
import { WorkflowTemplate } from './WorkflowTemplateService';

const logger = createLogger('TemplateValidationService');

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: 'structure' | 'security' | 'performance' | 'usability' | 'compliance';
  severity: 'error' | 'warning' | 'info';
  enabled: boolean;
  validator: (template: WorkflowTemplate) => Promise<ValidationResult>;
}

export interface ValidationResult {
  ruleId: string;
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
  location?: {
    nodeId?: string;
    field?: string;
    line?: number;
  };
  impact?: 'high' | 'medium' | 'low';
  category: 'structure' | 'security' | 'performance' | 'usability' | 'compliance';
}

export interface QualityScore {
  overall: number;
  structure: number;
  security: number;
  performance: number;
  usability: number;
  compliance: number;
  breakdown: {
    [category: string]: {
      score: number;
      maxScore: number;
      results: ValidationResult[];
    };
  };
}

export interface TemplateAnalysis {
  templateId: number;
  version?: string;
  validationResults: ValidationResult[];
  qualityScore: QualityScore;
  suggestions: string[];
  issues: {
    errors: ValidationResult[];
    warnings: ValidationResult[];
    info: ValidationResult[];
  };
  compliance: {
    passed: boolean;
    standards: string[];
    violations: ValidationResult[];
  };
  performance: {
    estimatedRuntime: number;
    complexity: 'low' | 'medium' | 'high' | 'very_high';
    resourceUsage: {
      memory: 'low' | 'medium' | 'high';
      cpu: 'low' | 'medium' | 'high';
      network: 'low' | 'medium' | 'high';
    };
  };
  security: {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    vulnerabilities: ValidationResult[];
    recommendations: string[];
  };
  metadata: {
    analyzedAt: Date;
    analyzer: string;
    version: string;
  };
}

export class TemplateValidationService {
  private rules: ValidationRule[] = [];

  constructor() {
    this.initializeRules();
  }

  private initializeRules(): void {
    // Structure validation rules
    this.addRule({
      id: 'has-start-node',
      name: 'Has Start Node',
      description: 'Template must have at least one start node',
      category: 'structure',
      severity: 'error',
      enabled: true,
      validator: async (template) => {
        const nodes = template.templateData?.nodes || [];
        const hasStartNode = nodes.some((node: any) => 
          node.type === 'trigger' || node.isStartNode || !node.inputs?.length
        );
        
        return {
          ruleId: 'has-start-node',
          passed: hasStartNode,
          message: hasStartNode ? 'Template has start node' : 'Template must have at least one start node',
          severity: 'error',
          suggestion: hasStartNode ? undefined : 'Add a trigger node or mark a node as the start node',
          category: 'structure'
        };
      }
    });

    this.addRule({
      id: 'connected-nodes',
      name: 'Connected Nodes',
      description: 'All nodes should be connected to the workflow',
      category: 'structure',
      severity: 'warning',
      enabled: true,
      validator: async (template) => {
        const nodes = template.templateData?.nodes || [];
        const connections = template.templateData?.connections || [];
        
        if (nodes.length <= 1) {
          return {
            ruleId: 'connected-nodes',
            passed: true,
            message: 'Single node workflow',
            severity: 'info',
            category: 'structure'
          };
        }

        const connectedNodes = new Set();
        connections.forEach((conn: any) => {
          connectedNodes.add(conn.source);
          connectedNodes.add(conn.target);
        });

        const disconnectedNodes = nodes.filter((node: any) => 
          !connectedNodes.has(node.id) && node.type !== 'trigger'
        );

        return {
          ruleId: 'connected-nodes',
          passed: disconnectedNodes.length === 0,
          message: disconnectedNodes.length === 0 
            ? 'All nodes are connected' 
            : `${disconnectedNodes.length} nodes are disconnected`,
          severity: 'warning',
          suggestion: disconnectedNodes.length > 0 
            ? `Connect or remove disconnected nodes: ${disconnectedNodes.map((n: any) => n.name).join(', ')}`
            : undefined,
          category: 'structure'
        };
      }
    });

    this.addRule({
      id: 'no-circular-dependencies',
      name: 'No Circular Dependencies',
      description: 'Workflow should not have circular dependencies',
      category: 'structure',
      severity: 'error',
      enabled: true,
      validator: async (template) => {
        const nodes = template.templateData?.nodes || [];
        const connections = template.templateData?.connections || [];
        
        const graph = this.buildGraph(nodes, connections);
        const cycles = this.findCycles(graph);

        return {
          ruleId: 'no-circular-dependencies',
          passed: cycles.length === 0,
          message: cycles.length === 0 
            ? 'No circular dependencies found' 
            : `Found ${cycles.length} circular dependencies`,
          severity: 'error',
          suggestion: cycles.length > 0 
            ? `Remove circular connections: ${cycles.map(c => c.join(' → ')).join(', ')}`
            : undefined,
          category: 'structure'
        };
      }
    });

    // Security validation rules
    this.addRule({
      id: 'no-hardcoded-secrets',
      name: 'No Hardcoded Secrets',
      description: 'Template should not contain hardcoded secrets or credentials',
      category: 'security',
      severity: 'error',
      enabled: true,
      validator: async (template) => {
        const templateStr = JSON.stringify(template.templateData);
        const secretPatterns = [
          /password\s*[:=]\s*["'](?!{{)[^"']*["']/gi,
          /api[_-]?key\s*[:=]\s*["'](?!{{)[^"']*["']/gi,
          /secret\s*[:=]\s*["'](?!{{)[^"']*["']/gi,
          /token\s*[:=]\s*["'](?!{{)[^"']*["']/gi,
          /pk_[a-zA-Z0-9_]{20,}/g,
          /sk_[a-zA-Z0-9_]{20,}/g,
        ];

        const violations = [];
        for (const pattern of secretPatterns) {
          const matches = templateStr.match(pattern);
          if (matches) {
            violations.push(...matches);
          }
        }

        return {
          ruleId: 'no-hardcoded-secrets',
          passed: violations.length === 0,
          message: violations.length === 0 
            ? 'No hardcoded secrets found' 
            : `Found ${violations.length} potential hardcoded secrets`,
          severity: 'error',
          suggestion: violations.length > 0 
            ? 'Use credential parameters or environment variables instead of hardcoded secrets'
            : undefined,
          category: 'security',
          impact: violations.length > 0 ? 'high' : undefined
        };
      }
    });

    this.addRule({
      id: 'secure-http-requests',
      name: 'Secure HTTP Requests',
      description: 'HTTP requests should use HTTPS when possible',
      category: 'security',
      severity: 'warning',
      enabled: true,
      validator: async (template) => {
        const nodes = template.templateData?.nodes || [];
        const httpNodes = nodes.filter((node: any) => 
          node.type === 'http' || node.type === 'webhook' || node.type === 'api'
        );

        const insecureUrls = [];
        for (const node of httpNodes) {
          const url = node.parameters?.url || node.config?.url;
          if (url && typeof url === 'string' && url.startsWith('http://')) {
            insecureUrls.push({ nodeId: node.id, url });
          }
        }

        return {
          ruleId: 'secure-http-requests',
          passed: insecureUrls.length === 0,
          message: insecureUrls.length === 0 
            ? 'All HTTP requests use HTTPS' 
            : `${insecureUrls.length} HTTP requests should use HTTPS`,
          severity: 'warning',
          suggestion: insecureUrls.length > 0 
            ? 'Change HTTP URLs to HTTPS for better security'
            : undefined,
          category: 'security'
        };
      }
    });

    // Performance validation rules
    this.addRule({
      id: 'reasonable-node-count',
      name: 'Reasonable Node Count',
      description: 'Template should have a reasonable number of nodes',
      category: 'performance',
      severity: 'info',
      enabled: true,
      validator: async (template) => {
        const nodes = template.templateData?.nodes || [];
        const nodeCount = nodes.length;
        
        let severity: 'info' | 'warning' | 'error' = 'info';
        let message = `Template has ${nodeCount} nodes`;
        let suggestion;

        if (nodeCount > 100) {
          severity = 'error';
          message = `Template has too many nodes (${nodeCount})`;
          suggestion = 'Consider breaking this into smaller templates or using subworkflows';
        } else if (nodeCount > 50) {
          severity = 'warning';
          message = `Template has many nodes (${nodeCount})`;
          suggestion = 'Consider organizing with subworkflows for better maintainability';
        }

        return {
          ruleId: 'reasonable-node-count',
          passed: nodeCount <= 50,
          message,
          severity,
          suggestion,
          category: 'performance'
        };
      }
    });

    this.addRule({
      id: 'no-infinite-loops',
      name: 'No Infinite Loops',
      description: 'Template should not have potential infinite loops',
      category: 'performance',
      severity: 'error',
      enabled: true,
      validator: async (template) => {
        const nodes = template.templateData?.nodes || [];
        const connections = template.templateData?.connections || [];
        
        // Check for loop nodes without proper termination conditions
        const loopNodes = nodes.filter((node: any) => 
          node.type === 'loop' || node.type === 'while' || node.type === 'forEach'
        );

        const riskyLoops = [];
        for (const loopNode of loopNodes) {
          const hasTerminationCondition = loopNode.parameters?.condition || 
                                        loopNode.parameters?.maxIterations ||
                                        loopNode.config?.timeout;
          
          if (!hasTerminationCondition) {
            riskyLoops.push(loopNode);
          }
        }

        return {
          ruleId: 'no-infinite-loops',
          passed: riskyLoops.length === 0,
          message: riskyLoops.length === 0 
            ? 'No infinite loop risks detected' 
            : `${riskyLoops.length} loops may run infinitely`,
          severity: 'error',
          suggestion: riskyLoops.length > 0 
            ? 'Add termination conditions, max iterations, or timeouts to loop nodes'
            : undefined,
          category: 'performance',
          impact: riskyLoops.length > 0 ? 'high' : undefined
        };
      }
    });

    // Usability validation rules
    this.addRule({
      id: 'has-description',
      name: 'Has Description',
      description: 'Template should have a meaningful description',
      category: 'usability',
      severity: 'warning',
      enabled: true,
      validator: async (template) => {
        const description = template.description || '';
        const hasGoodDescription = description.length >= 20 && 
                                  !description.toLowerCase().includes('todo') &&
                                  !description.toLowerCase().includes('placeholder');

        return {
          ruleId: 'has-description',
          passed: hasGoodDescription,
          message: hasGoodDescription 
            ? 'Template has good description' 
            : 'Template needs better description',
          severity: 'warning',
          suggestion: hasGoodDescription 
            ? undefined 
            : 'Add a detailed description explaining what the template does and how to use it',
          category: 'usability'
        };
      }
    });

    this.addRule({
      id: 'nodes-have-names',
      name: 'Nodes Have Names',
      description: 'All nodes should have meaningful names',
      category: 'usability',
      severity: 'info',
      enabled: true,
      validator: async (template) => {
        const nodes = template.templateData?.nodes || [];
        const unnamedNodes = nodes.filter((node: any) => 
          !node.name || node.name === node.type || node.name.toLowerCase().includes('untitled')
        );

        return {
          ruleId: 'nodes-have-names',
          passed: unnamedNodes.length === 0,
          message: unnamedNodes.length === 0 
            ? 'All nodes have meaningful names' 
            : `${unnamedNodes.length} nodes need better names`,
          severity: 'info',
          suggestion: unnamedNodes.length > 0 
            ? 'Give nodes descriptive names that explain their purpose'
            : undefined,
          category: 'usability'
        };
      }
    });

    // Compliance validation rules
    this.addRule({
      id: 'has-required-metadata',
      name: 'Has Required Metadata',
      description: 'Template should have required metadata fields',
      category: 'compliance',
      severity: 'warning',
      enabled: true,
      validator: async (template) => {
        const metadata = template.metadata || {};
        const requiredFields = ['version', 'author', 'category', 'tags'];
        const missingFields = requiredFields.filter(field => !metadata[field] && !template[field]);

        return {
          ruleId: 'has-required-metadata',
          passed: missingFields.length === 0,
          message: missingFields.length === 0 
            ? 'All required metadata present' 
            : `Missing required metadata: ${missingFields.join(', ')}`,
          severity: 'warning',
          suggestion: missingFields.length > 0 
            ? `Add missing metadata fields: ${missingFields.join(', ')}`
            : undefined,
          category: 'compliance'
        };
      }
    });
  }

  private addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  async validateTemplate(template: WorkflowTemplate): Promise<TemplateAnalysis> {
    logger.info(`Starting validation for template: ${template.name}`);

    const validationResults: ValidationResult[] = [];
    
    // Run all enabled validation rules
    for (const rule of this.rules) {
      if (rule.enabled) {
        try {
          const result = await rule.validator(template);
          validationResults.push(result);
        } catch (error: any) {
          logger.error(`Error running validation rule ${rule.id}:`, error);
          validationResults.push({
            ruleId: rule.id,
            passed: false,
            message: `Validation rule failed: ${error.message}`,
            severity: 'error',
            category: rule.category
          });
        }
      }
    }

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(validationResults);

    // Categorize issues
    const issues = {
      errors: validationResults.filter(r => r.severity === 'error' && !r.passed),
      warnings: validationResults.filter(r => r.severity === 'warning' && !r.passed),
      info: validationResults.filter(r => r.severity === 'info' && !r.passed)
    };

    // Analyze compliance
    const complianceResults = validationResults.filter(r => r.category === 'compliance');
    const compliance = {
      passed: complianceResults.every(r => r.passed),
      standards: ['workflow-standard-1.0', 'security-baseline'],
      violations: complianceResults.filter(r => !r.passed)
    };

    // Analyze performance
    const performance = this.analyzePerformance(template, validationResults);

    // Analyze security
    const security = this.analyzeSecurity(validationResults);

    // Generate suggestions
    const suggestions = this.generateSuggestions(validationResults);

    const analysis: TemplateAnalysis = {
      templateId: template.id!,
      version: template.version || '1.0.0',
      validationResults,
      qualityScore,
      suggestions,
      issues,
      compliance,
      performance,
      security,
      metadata: {
        analyzedAt: new Date(),
        analyzer: 'TemplateValidationService',
        version: '1.0.0'
      }
    };

    logger.info(`Template validation completed. Quality score: ${qualityScore.overall.toFixed(2)}`);
    return analysis;
  }

  private calculateQualityScore(results: ValidationResult[]): QualityScore {
    const categories = ['structure', 'security', 'performance', 'usability', 'compliance'];
    const weights = { error: 10, warning: 5, info: 1 };
    
    const breakdown: any = {};
    let totalScore = 0;
    let totalMaxScore = 0;

    for (const category of categories) {
      const categoryResults = results.filter(r => r.category === category);
      let categoryScore = 0;
      let categoryMaxScore = 0;

      for (const result of categoryResults) {
        const weight = weights[result.severity];
        categoryMaxScore += weight;
        if (result.passed) {
          categoryScore += weight;
        }
      }

      const score = categoryMaxScore > 0 ? (categoryScore / categoryMaxScore) * 100 : 100;
      
      breakdown[category] = {
        score,
        maxScore: categoryMaxScore,
        results: categoryResults
      };

      totalScore += categoryScore;
      totalMaxScore += categoryMaxScore;
    }

    const overall = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 100;

    return {
      overall: Math.round(overall * 100) / 100,
      structure: Math.round(breakdown.structure.score * 100) / 100,
      security: Math.round(breakdown.security.score * 100) / 100,
      performance: Math.round(breakdown.performance.score * 100) / 100,
      usability: Math.round(breakdown.usability.score * 100) / 100,
      compliance: Math.round(breakdown.compliance.score * 100) / 100,
      breakdown
    };
  }

  private analyzePerformance(template: WorkflowTemplate, results: ValidationResult[]): any {
    const nodes = template.templateData?.nodes || [];
    const nodeCount = nodes.length;
    const connections = template.templateData?.connections || [];
    
    // Estimate complexity based on node count and connections
    let complexity: 'low' | 'medium' | 'high' | 'very_high' = 'low';
    if (nodeCount > 50) complexity = 'very_high';
    else if (nodeCount > 20) complexity = 'high';
    else if (nodeCount > 10) complexity = 'medium';

    // Estimate runtime (very rough approximation)
    const avgNodeTime = 2; // seconds per node
    const estimatedRuntime = nodeCount * avgNodeTime;

    // Analyze resource usage based on node types
    const resourceIntensiveNodes = nodes.filter((node: any) => 
      ['database', 'file', 'image', 'pdf', 'loop'].includes(node.type)
    );

    const resourceUsage = {
      memory: resourceIntensiveNodes.length > 5 ? 'high' : 
              resourceIntensiveNodes.length > 2 ? 'medium' : 'low',
      cpu: nodeCount > 30 ? 'high' : nodeCount > 15 ? 'medium' : 'low',
      network: nodes.filter((n: any) => ['http', 'api', 'webhook'].includes(n.type)).length > 5 ? 'high' : 'medium'
    } as const;

    return {
      estimatedRuntime,
      complexity,
      resourceUsage
    };
  }

  private analyzeSecurity(results: ValidationResult[]): any {
    const securityResults = results.filter(r => r.category === 'security');
    const securityVulnerabilities = securityResults.filter(r => !r.passed);
    
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    const criticalIssues = securityVulnerabilities.filter(r => r.impact === 'high');
    if (criticalIssues.length > 0) {
      riskLevel = 'critical';
    } else if (securityVulnerabilities.some(r => r.severity === 'error')) {
      riskLevel = 'high';
    } else if (securityVulnerabilities.length > 0) {
      riskLevel = 'medium';
    }

    const recommendations = [
      'Use credential parameters instead of hardcoded secrets',
      'Implement proper error handling to avoid information disclosure',
      'Use HTTPS for all external communications',
      'Validate all inputs to prevent injection attacks',
      'Implement proper authentication and authorization'
    ];

    return {
      riskLevel,
      vulnerabilities: securityVulnerabilities,
      recommendations: recommendations.slice(0, 3) // Top 3 recommendations
    };
  }

  private generateSuggestions(results: ValidationResult[]): string[] {
    const suggestions: string[] = [];
    
    // Add specific suggestions from validation results
    results
      .filter(r => !r.passed && r.suggestion)
      .forEach(r => suggestions.push(r.suggestion!));

    // Add general improvement suggestions
    const errors = results.filter(r => r.severity === 'error' && !r.passed);
    const warnings = results.filter(r => r.severity === 'warning' && !r.passed);

    if (errors.length > 0) {
      suggestions.push('Fix all error-level issues before publishing');
    }

    if (warnings.length > 3) {
      suggestions.push('Address warning-level issues to improve template quality');
    }

    // Remove duplicates and limit suggestions
    return [...new Set(suggestions)].slice(0, 10);
  }

  private buildGraph(nodes: any[], connections: any[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    
    // Initialize nodes
    nodes.forEach(node => {
      graph.set(node.id, []);
    });

    // Add connections
    connections.forEach(conn => {
      const targets = graph.get(conn.source) || [];
      targets.push(conn.target);
      graph.set(conn.source, targets);
    });

    return graph;
  }

  private findCycles(graph: Map<string, string[]>): string[][] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (node: string, path: string[] = []): void => {
      if (recursionStack.has(node)) {
        // Found a cycle
        const cycleStart = path.indexOf(node);
        if (cycleStart >= 0) {
          cycles.push([...path.slice(cycleStart), node]);
        }
        return;
      }

      if (visited.has(node)) {
        return;
      }

      visited.add(node);
      recursionStack.add(node);
      const newPath = [...path, node];

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        dfs(neighbor, newPath);
      }

      recursionStack.delete(node);
    };

    for (const [node] of graph) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return cycles;
  }

  getValidationRules(): ValidationRule[] {
    return [...this.rules];
  }

  enableRule(ruleId: string): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = true;
      logger.info(`Enabled validation rule: ${ruleId}`);
    }
  }

  disableRule(ruleId: string): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = false;
      logger.info(`Disabled validation rule: ${ruleId}`);
    }
  }

  addCustomRule(rule: ValidationRule): void {
    // Prevent duplicate rule IDs
    const existingRule = this.rules.find(r => r.id === rule.id);
    if (existingRule) {
      throw new Error(`Validation rule with ID '${rule.id}' already exists`);
    }

    this.rules.push(rule);
    logger.info(`Added custom validation rule: ${rule.id}`);
  }

  removeCustomRule(ruleId: string): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index >= 0) {
      this.rules.splice(index, 1);
      logger.info(`Removed custom validation rule: ${ruleId}`);
      return true;
    }
    return false;
  }
}