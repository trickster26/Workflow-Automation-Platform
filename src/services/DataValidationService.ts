import { createLogger } from '../utils/logger';
import { db } from '../config/database';
import { IWorkflow, IExecution, INode, NodeType, ExecutionStatus } from '../types/workflow.types';
import { Op } from 'sequelize';

const logger = createLogger('DataValidationService');

export interface IValidationRule {
  id: string;
  name: string;
  description: string;
  category: 'structure' | 'business' | 'performance' | 'security';
  severity: 'error' | 'warning' | 'info';
  validate: () => Promise<IValidationResult[]>;
}

export interface IValidationResult {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  details?: any;
  affectedRecords?: Array<{
    table: string;
    id: string;
    [key: string]: any;
  }>;
  suggestedAction?: string;
}

export interface IValidationReport {
  timestamp: Date;
  duration: number;
  totalRules: number;
  results: IValidationResult[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
  };
  affectedTables: string[];
  recommendations: string[];
}

export class DataValidationService {
  private static instance: DataValidationService;
  private validationRules: IValidationRule[] = [];

  private constructor() {
    this.initializeValidationRules();
  }

  public static getInstance(): DataValidationService {
    if (!DataValidationService.instance) {
      DataValidationService.instance = new DataValidationService();
    }
    return DataValidationService.instance;
  }

  private initializeValidationRules(): void {
    this.validationRules = [
      // Structural Validation Rules
      {
        id: 'workflow-nodes-exist',
        name: 'Workflows must have nodes',
        description: 'All workflows should contain at least one node',
        category: 'structure',
        severity: 'error',
        validate: this.validateWorkflowNodes.bind(this),
      },
      {
        id: 'workflow-connections-valid',
        name: 'Workflow connections must be valid',
        description: 'All connections must reference existing nodes',
        category: 'structure',
        severity: 'error',
        validate: this.validateWorkflowConnections.bind(this),
      },
      {
        id: 'node-parameters-valid',
        name: 'Node parameters must be valid',
        description: 'All nodes must have valid parameters for their type',
        category: 'structure',
        severity: 'error',
        validate: this.validateNodeParameters.bind(this),
      },
      {
        id: 'orphaned-executions',
        name: 'No orphaned executions',
        description: 'All executions must reference existing workflows',
        category: 'structure',
        severity: 'error',
        validate: this.validateOrphanedExecutions.bind(this),
      },
      {
        id: 'orphaned-webhooks',
        name: 'No orphaned webhooks',
        description: 'All webhooks must reference existing workflows',
        category: 'structure',
        severity: 'error',
        validate: this.validateOrphanedWebhooks.bind(this),
      },

      // Business Logic Validation Rules
      {
        id: 'active-workflow-triggers',
        name: 'Active workflows must have triggers',
        description: 'Active workflows should have at least one trigger node',
        category: 'business',
        severity: 'warning',
        validate: this.validateActiveWorkflowTriggers.bind(this),
      },
      {
        id: 'workflow-start-nodes',
        name: 'Workflows must have start nodes',
        description: 'All workflows should have a defined entry point',
        category: 'business',
        severity: 'warning',
        validate: this.validateWorkflowStartNodes.bind(this),
      },
      {
        id: 'credential-references',
        name: 'Credential references must be valid',
        description: 'All credential references in nodes must exist',
        category: 'business',
        severity: 'error',
        validate: this.validateCredentialReferences.bind(this),
      },
      {
        id: 'webhook-path-uniqueness',
        name: 'Webhook paths must be unique',
        description: 'No two webhooks should have the same method and path',
        category: 'business',
        severity: 'error',
        validate: this.validateWebhookPathUniqueness.bind(this),
      },

      // Performance Validation Rules
      {
        id: 'large-workflow-nodes',
        name: 'Workflows with excessive nodes',
        description: 'Workflows with too many nodes may have performance issues',
        category: 'performance',
        severity: 'warning',
        validate: this.validateLargeWorkflowNodes.bind(this),
      },
      {
        id: 'long-running-executions',
        name: 'Long-running executions',
        description: 'Identify executions that have been running for too long',
        category: 'performance',
        severity: 'warning',
        validate: this.validateLongRunningExecutions.bind(this),
      },
      {
        id: 'frequent-execution-failures',
        name: 'Frequent execution failures',
        description: 'Workflows with high failure rates need attention',
        category: 'performance',
        severity: 'warning',
        validate: this.validateFrequentExecutionFailures.bind(this),
      },

      // Security Validation Rules
      {
        id: 'exposed-credentials',
        name: 'No exposed credentials',
        description: 'Ensure credentials are not stored in plain text parameters',
        category: 'security',
        severity: 'error',
        validate: this.validateExposedCredentials.bind(this),
      },
      {
        id: 'insecure-webhooks',
        name: 'Insecure webhook configurations',
        description: 'Identify webhooks without proper authentication',
        category: 'security',
        severity: 'warning',
        validate: this.validateInsecureWebhooks.bind(this),
      },
      {
        id: 'workflow-permissions',
        name: 'Workflow access permissions',
        description: 'Ensure proper workflow access controls',
        category: 'security',
        severity: 'info',
        validate: this.validateWorkflowPermissions.bind(this),
      },
    ];
  }

  public async runValidation(ruleIds?: string[]): Promise<IValidationReport> {
    const startTime = Date.now();
    logger.info('Starting data validation', { ruleIds: ruleIds || 'all' });

    try {
      // Filter rules if specific IDs provided
      const rulesToRun = ruleIds 
        ? this.validationRules.filter(rule => ruleIds.includes(rule.id))
        : this.validationRules;

      const results: IValidationResult[] = [];

      // Run all validation rules
      for (const rule of rulesToRun) {
        try {
          logger.debug(`Running validation rule: ${rule.name}`);
          const ruleResults = await rule.validate();
          results.push(...ruleResults);
        } catch (error: any) {
          logger.error(`Validation rule failed: ${rule.name}`, error);
          results.push({
            ruleId: rule.id,
            severity: 'error',
            message: `Validation rule execution failed: ${error.message}`,
            details: { error: error.stack },
            suggestedAction: 'Check logs for detailed error information',
          });
        }
      }

      // Generate summary
      const summary = {
        errors: results.filter(r => r.severity === 'error').length,
        warnings: results.filter(r => r.severity === 'warning').length,
        infos: results.filter(r => r.severity === 'info').length,
      };

      // Extract affected tables
      const affectedTables = [...new Set(
        results
          .flatMap(r => r.affectedRecords || [])
          .map(record => record.table)
      )];

      // Generate recommendations
      const recommendations = this.generateRecommendations(results);

      const duration = Date.now() - startTime;

      const report: IValidationReport = {
        timestamp: new Date(),
        duration,
        totalRules: rulesToRun.length,
        results,
        summary,
        affectedTables,
        recommendations,
      };

      logger.info('Data validation completed', {
        duration: `${duration}ms`,
        errors: summary.errors,
        warnings: summary.warnings,
        infos: summary.infos,
        affectedTables: affectedTables.length,
      });

      return report;
    } catch (error: any) {
      logger.error('Data validation failed:', error);
      throw error;
    }
  }

  // Structural validation methods
  private async validateWorkflowNodes(): Promise<IValidationResult[]> {
    const [workflows] = await db.sequelize.query(`
      SELECT id, name, nodes 
      FROM workflows 
      WHERE nodes IS NULL 
         OR JSONB_ARRAY_LENGTH(nodes) = 0 
         OR nodes = '[]'
    `);

    return (workflows as any[]).map(workflow => ({
      ruleId: 'workflow-nodes-exist',
      severity: 'error' as const,
      message: `Workflow "${workflow.name}" has no nodes`,
      affectedRecords: [{ table: 'workflows', id: workflow.id, name: workflow.name }],
      suggestedAction: 'Add nodes to the workflow or delete if no longer needed',
    }));
  }

  private async validateWorkflowConnections(): Promise<IValidationResult[]> {
    const results: IValidationResult[] = [];

    const [workflows] = await db.sequelize.query(`
      SELECT id, name, nodes, connections 
      FROM workflows 
      WHERE connections IS NOT NULL AND JSONB_ARRAY_LENGTH(connections) > 0
    `);

    for (const workflow of workflows as any[]) {
      const nodes = workflow.nodes || [];
      const connections = workflow.connections || [];
      const nodeIds = nodes.map((node: INode) => node.id);

      for (const connection of connections) {
        if (!nodeIds.includes(connection.source)) {
          results.push({
            ruleId: 'workflow-connections-valid',
            severity: 'error',
            message: `Invalid connection in workflow "${workflow.name}": source node "${connection.source}" does not exist`,
            affectedRecords: [{ table: 'workflows', id: workflow.id, name: workflow.name }],
            suggestedAction: 'Remove invalid connection or add missing node',
          });
        }

        if (!nodeIds.includes(connection.target)) {
          results.push({
            ruleId: 'workflow-connections-valid',
            severity: 'error',
            message: `Invalid connection in workflow "${workflow.name}": target node "${connection.target}" does not exist`,
            affectedRecords: [{ table: 'workflows', id: workflow.id, name: workflow.name }],
            suggestedAction: 'Remove invalid connection or add missing node',
          });
        }
      }
    }

    return results;
  }

  private async validateNodeParameters(): Promise<IValidationResult[]> {
    const results: IValidationResult[] = [];

    const [workflows] = await db.sequelize.query(`
      SELECT id, name, nodes 
      FROM workflows 
      WHERE nodes IS NOT NULL AND JSONB_ARRAY_LENGTH(nodes) > 0
    `);

    for (const workflow of workflows as any[]) {
      const nodes = workflow.nodes || [];

      for (const node of nodes) {
        const validationResult = this.validateSingleNodeParameters(node, workflow);
        if (validationResult) {
          results.push(validationResult);
        }
      }
    }

    return results;
  }

  private validateSingleNodeParameters(node: INode, workflow: any): IValidationResult | null {
    const requiredParams = this.getRequiredParametersForNodeType(node.type);

    for (const param of requiredParams) {
      if (!node.parameters || !node.parameters[param]) {
        return {
          ruleId: 'node-parameters-valid',
          severity: 'error',
          message: `Node "${node.name}" in workflow "${workflow.name}" is missing required parameter: ${param}`,
          affectedRecords: [{ table: 'workflows', id: workflow.id, nodeId: node.id }],
          suggestedAction: `Add required parameter "${param}" to the node configuration`,
        };
      }
    }

    return null;
  }

  private getRequiredParametersForNodeType(nodeType: string): string[] {
    const requirements: Record<string, string[]> = {
      [NodeType.HTTP_REQUEST]: ['url', 'method'],
      [NodeType.EMAIL]: ['to', 'subject'],
      [NodeType.DATABASE]: ['query'],
      [NodeType.WEBHOOK]: ['path'],
      [NodeType.SCHEDULE]: ['interval'],
    };

    return requirements[nodeType] || [];
  }

  private async validateOrphanedExecutions(): Promise<IValidationResult[]> {
    const [executions] = await db.sequelize.query(`
      SELECT e.id, e."workflowId" 
      FROM executions e 
      LEFT JOIN workflows w ON e."workflowId" = w.id 
      WHERE w.id IS NULL
    `);

    return (executions as any[]).map(execution => ({
      ruleId: 'orphaned-executions',
      severity: 'error',
      message: `Execution ${execution.id} references non-existent workflow ${execution.workflowId}`,
      affectedRecords: [{ table: 'executions', id: execution.id, workflowId: execution.workflowId }],
      suggestedAction: 'Delete orphaned execution or restore missing workflow',
    }));
  }

  private async validateOrphanedWebhooks(): Promise<IValidationResult[]> {
    const [webhooks] = await db.sequelize.query(`
      SELECT wh.id, wh."webhookId", wh."workflowId" 
      FROM webhooks wh 
      LEFT JOIN workflows w ON wh."workflowId" = w.id 
      WHERE w.id IS NULL
    `);

    return (webhooks as any[]).map(webhook => ({
      ruleId: 'orphaned-webhooks',
      severity: 'error',
      message: `Webhook ${webhook.webhookId} references non-existent workflow ${webhook.workflowId}`,
      affectedRecords: [{ table: 'webhooks', id: webhook.id, webhookId: webhook.webhookId }],
      suggestedAction: 'Delete orphaned webhook or restore missing workflow',
    }));
  }

  // Business logic validation methods
  private async validateActiveWorkflowTriggers(): Promise<IValidationResult[]> {
    const [workflows] = await db.sequelize.query(`
      SELECT id, name, nodes 
      FROM workflows 
      WHERE active = true 
      AND (
        nodes IS NULL 
        OR NOT EXISTS (
          SELECT 1 
          FROM JSONB_ARRAY_ELEMENTS(nodes) AS node 
          WHERE node->>'type' IN ('webhook', 'schedule', 'trigger')
        )
      )
    `);

    return (workflows as any[]).map(workflow => ({
      ruleId: 'active-workflow-triggers',
      severity: 'warning',
      message: `Active workflow "${workflow.name}" has no trigger nodes`,
      affectedRecords: [{ table: 'workflows', id: workflow.id, name: workflow.name }],
      suggestedAction: 'Add a trigger node (webhook, schedule, or event) or deactivate the workflow',
    }));
  }

  private async validateWorkflowStartNodes(): Promise<IValidationResult[]> {
    const [workflows] = await db.sequelize.query(`
      SELECT id, name, nodes 
      FROM workflows 
      WHERE nodes IS NOT NULL 
      AND JSONB_ARRAY_LENGTH(nodes) > 0
      AND NOT EXISTS (
        SELECT 1 
        FROM JSONB_ARRAY_ELEMENTS(nodes) AS node 
        WHERE node->>'type' IN ('start', 'webhook', 'schedule', 'trigger')
      )
    `);

    return (workflows as any[]).map(workflow => ({
      ruleId: 'workflow-start-nodes',
      severity: 'warning',
      message: `Workflow "${workflow.name}" has no clear entry point`,
      affectedRecords: [{ table: 'workflows', id: workflow.id, name: workflow.name }],
      suggestedAction: 'Add a start node or trigger node to define the workflow entry point',
    }));
  }

  private async validateCredentialReferences(): Promise<IValidationResult[]> {
    const results: IValidationResult[] = [];
    
    // This would require checking credential IDs in node parameters
    // Implementation depends on credential storage structure
    
    return results;
  }

  private async validateWebhookPathUniqueness(): Promise<IValidationResult[]> {
    const [duplicates] = await db.sequelize.query(`
      SELECT method, path, COUNT(*) as count, ARRAY_AGG("webhookId") as webhook_ids
      FROM webhooks 
      GROUP BY method, path 
      HAVING COUNT(*) > 1
    `);

    return (duplicates as any[]).map(duplicate => ({
      ruleId: 'webhook-path-uniqueness',
      severity: 'error',
      message: `Duplicate webhook path: ${duplicate.method} ${duplicate.path}`,
      details: { webhookIds: duplicate.webhook_ids, count: duplicate.count },
      suggestedAction: 'Change one of the webhook paths to make them unique',
    }));
  }

  // Performance validation methods
  private async validateLargeWorkflowNodes(): Promise<IValidationResult[]> {
    const [workflows] = await db.sequelize.query(`
      SELECT id, name, JSONB_ARRAY_LENGTH(nodes) as node_count 
      FROM workflows 
      WHERE JSONB_ARRAY_LENGTH(nodes) > 50
    `);

    return (workflows as any[]).map(workflow => ({
      ruleId: 'large-workflow-nodes',
      severity: 'warning',
      message: `Workflow "${workflow.name}" has ${workflow.node_count} nodes, which may cause performance issues`,
      affectedRecords: [{ table: 'workflows', id: workflow.id, name: workflow.name, nodeCount: workflow.node_count }],
      suggestedAction: 'Consider breaking this workflow into smaller, more manageable workflows',
    }));
  }

  private async validateLongRunningExecutions(): Promise<IValidationResult[]> {
    const [executions] = await db.sequelize.query(`
      SELECT e.id, w.name as workflow_name, e."startedAt"
      FROM executions e
      JOIN workflows w ON e."workflowId" = w.id
      WHERE e.status = 'running' 
      AND e."startedAt" < NOW() - INTERVAL '1 hour'
    `);

    return (executions as any[]).map(execution => ({
      ruleId: 'long-running-executions',
      severity: 'warning',
      message: `Execution ${execution.id} has been running for over 1 hour`,
      affectedRecords: [{ table: 'executions', id: execution.id, workflowName: execution.workflow_name }],
      suggestedAction: 'Check if the execution is stuck and consider cancelling it',
    }));
  }

  private async validateFrequentExecutionFailures(): Promise<IValidationResult[]> {
    const [workflows] = await db.sequelize.query(`
      SELECT 
        w.id, 
        w.name,
        COUNT(e.id) as total_executions,
        SUM(CASE WHEN e.status = 'error' THEN 1 ELSE 0 END) as failed_executions,
        ROUND(
          (SUM(CASE WHEN e.status = 'error' THEN 1 ELSE 0 END)::numeric / COUNT(e.id)) * 100, 
          2
        ) as failure_rate
      FROM workflows w
      JOIN executions e ON w.id = e."workflowId"
      WHERE e."startedAt" > NOW() - INTERVAL '7 days'
      GROUP BY w.id, w.name
      HAVING COUNT(e.id) >= 10
      AND (SUM(CASE WHEN e.status = 'error' THEN 1 ELSE 0 END)::numeric / COUNT(e.id)) > 0.3
      ORDER BY failure_rate DESC
    `);

    return (workflows as any[]).map(workflow => ({
      ruleId: 'frequent-execution-failures',
      severity: 'warning',
      message: `Workflow "${workflow.name}" has a ${workflow.failure_rate}% failure rate (${workflow.failed_executions}/${workflow.total_executions})`,
      affectedRecords: [{ 
        table: 'workflows', 
        id: workflow.id, 
        name: workflow.name,
        failureRate: workflow.failure_rate,
        totalExecutions: workflow.total_executions,
      }],
      suggestedAction: 'Review workflow logic and error handling to reduce failure rate',
    }));
  }

  // Security validation methods
  private async validateExposedCredentials(): Promise<IValidationResult[]> {
    const results: IValidationResult[] = [];
    
    // Check for potential credential exposure in node parameters
    const [workflows] = await db.sequelize.query(`
      SELECT id, name, nodes 
      FROM workflows 
      WHERE nodes IS NOT NULL
    `);

    const suspiciousPatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /apikey/i,
      /api[_-]?key/i,
    ];

    for (const workflow of workflows as any[]) {
      const nodes = workflow.nodes || [];

      for (const node of nodes) {
        if (node.parameters) {
          for (const [key, value] of Object.entries(node.parameters)) {
            if (typeof value === 'string' && suspiciousPatterns.some(pattern => pattern.test(key))) {
              // Check if it looks like an actual credential (not a reference)
              if (value.length > 8 && !value.startsWith('{{') && !value.includes('credential:')) {
                results.push({
                  ruleId: 'exposed-credentials',
                  severity: 'error',
                  message: `Potential exposed credential in workflow "${workflow.name}", node "${node.name}", parameter "${key}"`,
                  affectedRecords: [{ table: 'workflows', id: workflow.id, nodeId: node.id }],
                  suggestedAction: 'Use credential references instead of storing sensitive data directly',
                });
              }
            }
          }
        }
      }
    }

    return results;
  }

  private async validateInsecureWebhooks(): Promise<IValidationResult[]> {
    const [webhooks] = await db.sequelize.query(`
      SELECT id, "webhookId", path, method, "authRequired"
      FROM webhooks 
      WHERE "authRequired" = false OR "authRequired" IS NULL
    `);

    return (webhooks as any[]).map(webhook => ({
      ruleId: 'insecure-webhooks',
      severity: 'warning',
      message: `Webhook ${webhook.method} ${webhook.path} does not require authentication`,
      affectedRecords: [{ table: 'webhooks', id: webhook.id, webhookId: webhook.webhookId }],
      suggestedAction: 'Enable authentication for webhooks processing sensitive data',
    }));
  }

  private async validateWorkflowPermissions(): Promise<IValidationResult[]> {
    const [publicWorkflows] = await db.sequelize.query(`
      SELECT id, name, "userId"
      FROM workflows 
      WHERE "userId" IS NULL OR "userId" = ''
    `);

    return (publicWorkflows as any[]).map(workflow => ({
      ruleId: 'workflow-permissions',
      severity: 'info',
      message: `Workflow "${workflow.name}" has no owner assigned`,
      affectedRecords: [{ table: 'workflows', id: workflow.id, name: workflow.name }],
      suggestedAction: 'Assign an owner to control access to this workflow',
    }));
  }

  private generateRecommendations(results: IValidationResult[]): string[] {
    const recommendations: string[] = [];
    const errorCount = results.filter(r => r.severity === 'error').length;
    const warningCount = results.filter(r => r.severity === 'warning').length;

    if (errorCount > 0) {
      recommendations.push(`Address ${errorCount} critical errors immediately`);
    }

    if (warningCount > 0) {
      recommendations.push(`Review ${warningCount} warnings for potential improvements`);
    }

    // Specific recommendations based on common issues
    const orphanedRecords = results.filter(r => r.ruleId.includes('orphaned'));
    if (orphanedRecords.length > 0) {
      recommendations.push('Clean up orphaned records to improve database performance');
    }

    const securityIssues = results.filter(r => r.ruleId.includes('security') || r.ruleId.includes('credential'));
    if (securityIssues.length > 0) {
      recommendations.push('Review security issues to prevent data breaches');
    }

    const performanceIssues = results.filter(r => r.ruleId.includes('performance') || r.ruleId.includes('large'));
    if (performanceIssues.length > 0) {
      recommendations.push('Optimize workflows and executions for better performance');
    }

    if (recommendations.length === 0) {
      recommendations.push('No critical issues found. Consider running validation regularly.');
    }

    return recommendations;
  }

  public getValidationRules(): IValidationRule[] {
    return this.validationRules.map(rule => ({
      ...rule,
      validate: undefined as any, // Don't expose the function
    }));
  }

  public async fixIssue(ruleId: string, affectedRecordId: string): Promise<void> {
    // Implementation for automated issue fixing would go here
    // This is a placeholder for future enhancement
    logger.info(`Auto-fix requested for rule ${ruleId}, record ${affectedRecordId}`);
    throw new Error('Auto-fix not implemented yet');
  }
}

export const dataValidationService = DataValidationService.getInstance();