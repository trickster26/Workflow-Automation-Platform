import { Sequelize, Op, QueryTypes } from 'sequelize';
import { db } from '../config/database';
import { createLogger } from '../utils/logger';
import { NODE_TEMPLATES, WORKFLOW_TEMPLATES } from '../templates/node-templates';
import { SCENARIO_TEMPLATES } from '../templates/scenario-templates';

const logger = createLogger('TemplateService');

export interface TemplateSearchOptions {
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  industry?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TemplateStats {
  totalNodes: number;
  totalWorkflows: number;
  totalScenarios: number;
  byCategory: Record<string, number>;
  byDifficulty: Record<string, number>;
  byIndustry: Record<string, number>;
  popular: any[];
}

export class TemplateService {
  private static instance: TemplateService;
  private sequelize: Sequelize;

  private constructor() {
    this.sequelize = db.sequelize;
  }

  public static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService();
    }
    return TemplateService.instance;
  }

  // NODE TEMPLATE METHODS
  public async getNodeTemplates(options: TemplateSearchOptions = {}): Promise<any[]> {
    try {
      const where: any = { isActive: true };
      
      if (options.category) {
        where.category = options.category;
      }
      
      if (options.difficulty) {
        where.difficulty = options.difficulty;
      }
      
      if (options.tags && options.tags.length > 0) {
        where.tags = {
          [Op.overlap]: options.tags
        };
      }
      
      if (options.search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${options.search}%` } },
          { description: { [Op.iLike]: `%${options.search}%` } },
          { tags: { [Op.overlap]: [options.search] } }
        ];
      }

      const templates = await this.sequelize.models.NodeTemplate.findAll({
        where,
        order: [['name', 'ASC']],
        limit: options.limit || 50,
        offset: options.offset || 0
      });

      return templates.map((template: any) => template.toJSON());
    } catch (error: any) {
      logger.error('Error fetching node templates:', error);
      throw new Error(`Failed to fetch node templates: ${error.message}`);
    }
  }

  public async getNodeTemplateById(templateId: string): Promise<any | null> {
    try {
      const template = await this.sequelize.models.NodeTemplate.findOne({
        where: { templateId, isActive: true }
      });

      return template ? template.toJSON() : null;
    } catch (error: any) {
      logger.error('Error fetching node template by ID:', error);
      throw new Error(`Failed to fetch node template: ${error.message}`);
    }
  }

  public async getNodeTemplatesByCategory(category: string): Promise<any[]> {
    return this.getNodeTemplates({ category });
  }

  public async getNodeTemplatesByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): Promise<any[]> {
    return this.getNodeTemplates({ difficulty });
  }

  // WORKFLOW TEMPLATE METHODS
  public async getWorkflowTemplates(options: TemplateSearchOptions = {}): Promise<any[]> {
    try {
      const where: any = { isActive: true };
      
      if (options.category) {
        where.category = options.category;
      }
      
      if (options.difficulty) {
        where.difficulty = options.difficulty;
      }
      
      if (options.tags && options.tags.length > 0) {
        where.tags = {
          [Op.overlap]: options.tags
        };
      }
      
      if (options.search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${options.search}%` } },
          { description: { [Op.iLike]: `%${options.search}%` } },
          { tags: { [Op.overlap]: [options.search] } }
        ];
      }

      const templates = await this.sequelize.models.WorkflowTemplate.findAll({
        where,
        order: [['name', 'ASC']],
        limit: options.limit || 20,
        offset: options.offset || 0
      });

      return templates.map((template: any) => template.toJSON());
    } catch (error: any) {
      logger.error('Error fetching workflow templates:', error);
      throw new Error(`Failed to fetch workflow templates: ${error.message}`);
    }
  }

  public async getWorkflowTemplateById(templateId: string): Promise<any | null> {
    try {
      const template = await this.sequelize.models.WorkflowTemplate.findOne({
        where: { templateId, isActive: true }
      });

      return template ? template.toJSON() : null;
    } catch (error: any) {
      logger.error('Error fetching workflow template by ID:', error);
      throw new Error(`Failed to fetch workflow template: ${error.message}`);
    }
  }

  // SCENARIO TEMPLATE METHODS
  public async getScenarioTemplates(options: TemplateSearchOptions = {}): Promise<any[]> {
    try {
      const where: any = { isActive: true };
      
      if (options.industry) {
        where.industry = options.industry;
      }
      
      if (options.category) {
        where.category = options.category;
      }
      
      if (options.difficulty) {
        where.difficulty = options.difficulty;
      }
      
      if (options.tags && options.tags.length > 0) {
        where.tags = {
          [Op.overlap]: options.tags
        };
      }
      
      if (options.search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${options.search}%` } },
          { description: { [Op.iLike]: `%${options.search}%` } },
          { industry: { [Op.iLike]: `%${options.search}%` } },
          { tags: { [Op.overlap]: [options.search] } }
        ];
      }

      const templates = await this.sequelize.models.ScenarioTemplate.findAll({
        where,
        order: [['name', 'ASC']],
        limit: options.limit || 20,
        offset: options.offset || 0
      });

      return templates.map((template: any) => template.toJSON());
    } catch (error: any) {
      logger.error('Error fetching scenario templates:', error);
      throw new Error(`Failed to fetch scenario templates: ${error.message}`);
    }
  }

  public async getScenarioTemplateById(templateId: string): Promise<any | null> {
    try {
      const template = await this.sequelize.models.ScenarioTemplate.findOne({
        where: { templateId, isActive: true }
      });

      return template ? template.toJSON() : null;
    } catch (error: any) {
      logger.error('Error fetching scenario template by ID:', error);
      throw new Error(`Failed to fetch scenario template: ${error.message}`);
    }
  }

  public async getScenarioTemplatesByIndustry(industry: string): Promise<any[]> {
    return this.getScenarioTemplates({ industry });
  }

  // CATEGORY METHODS
  public async getTemplateCategories(): Promise<any[]> {
    try {
      const categories = await this.sequelize.models.TemplateCategory.findAll({
        where: { isActive: true },
        order: [['sortOrder', 'ASC'], ['displayName', 'ASC']]
      });

      return categories.map((category: any) => category.toJSON());
    } catch (error: any) {
      logger.error('Error fetching template categories:', error);
      throw new Error(`Failed to fetch template categories: ${error.message}`);
    }
  }

  // SEARCH AND DISCOVERY METHODS
  public async searchAllTemplates(query: string, options: TemplateSearchOptions = {}): Promise<{
    nodes: any[];
    workflows: any[];
    scenarios: any[];
  }> {
    try {
      const searchOptions = { ...options, search: query };
      
      const [nodes, workflows, scenarios] = await Promise.all([
        this.getNodeTemplates(searchOptions),
        this.getWorkflowTemplates(searchOptions),
        this.getScenarioTemplates(searchOptions)
      ]);

      return { nodes, workflows, scenarios };
    } catch (error: any) {
      logger.error('Error searching templates:', error);
      throw new Error(`Failed to search templates: ${error.message}`);
    }
  }

  public async getRecommendedTemplates(userPreferences?: {
    industry?: string;
    experience?: 'beginner' | 'intermediate' | 'advanced';
    interests?: string[];
  }): Promise<{
    nodes: any[];
    workflows: any[];
    scenarios: any[];
  }> {
    try {
      const options: TemplateSearchOptions = {};
      
      if (userPreferences?.experience) {
        options.difficulty = userPreferences.experience;
      }
      
      if (userPreferences?.interests) {
        options.tags = userPreferences.interests;
      }
      
      if (userPreferences?.industry) {
        options.industry = userPreferences.industry;
      }

      const [nodes, workflows, scenarios] = await Promise.all([
        this.getNodeTemplates({ ...options, limit: 10 }),
        this.getWorkflowTemplates({ ...options, limit: 5 }),
        this.getScenarioTemplates({ ...options, limit: 5 })
      ]);

      return { nodes, workflows, scenarios };
    } catch (error: any) {
      logger.error('Error fetching recommended templates:', error);
      throw new Error(`Failed to fetch recommended templates: ${error.message}`);
    }
  }

  // STATISTICS AND ANALYTICS
  public async getTemplateStats(): Promise<TemplateStats> {
    try {
      const [
        nodeCount,
        workflowCount,
        scenarioCount,
        categoryStats,
        difficultyStats,
        industryStats
      ] = await Promise.all([
        this.sequelize.models.NodeTemplate.count({ where: { isActive: true } }),
        this.sequelize.models.WorkflowTemplate.count({ where: { isActive: true } }),
        this.sequelize.models.ScenarioTemplate.count({ where: { isActive: true } }),
        this.getStatsByField('NodeTemplate', 'category'),
        this.getStatsByField('NodeTemplate', 'difficulty'),
        this.getStatsByField('ScenarioTemplate', 'industry')
      ]);

      const popular = await this.getPopularTemplates();

      return {
        totalNodes: nodeCount,
        totalWorkflows: workflowCount,
        totalScenarios: scenarioCount,
        byCategory: categoryStats,
        byDifficulty: difficultyStats,
        byIndustry: industryStats,
        popular
      };
    } catch (error: any) {
      logger.error('Error fetching template statistics:', error);
      throw new Error(`Failed to fetch template statistics: ${error.message}`);
    }
  }

  private async getStatsByField(modelName: string, field: string): Promise<Record<string, number>> {
    try {
      const results = await this.sequelize.query(
        `SELECT ${field}, COUNT(*) as count FROM "${modelName}s" WHERE "isActive" = true GROUP BY ${field}`,
        { type: QueryTypes.SELECT }
      );

      return results.reduce((acc: any, row: any) => {
        acc[row[field]] = parseInt(row.count);
        return acc;
      }, {});
    } catch (error) {
      logger.error(`Error getting stats for ${field}:`, error);
      return {};
    }
  }

  private async getPopularTemplates(): Promise<any[]> {
    try {
      // This would typically be based on usage analytics
      // For now, return a mix of beginner-friendly templates
      const popular = await Promise.all([
        this.getNodeTemplates({ difficulty: 'beginner', limit: 5 }),
        this.getWorkflowTemplates({ difficulty: 'beginner', limit: 3 })
      ]);

      return [
        ...popular[0].map((t: any) => ({ ...t, type: 'node' })),
        ...popular[1].map((t: any) => ({ ...t, type: 'workflow' }))
      ].slice(0, 8);
    } catch (error) {
      logger.error('Error fetching popular templates:', error);
      return [];
    }
  }

  // WORKFLOW CREATION FROM TEMPLATES
  public async createWorkflowFromTemplate(templateId: string, userId: string, customizations?: any): Promise<any> {
    try {
      const template = await this.getWorkflowTemplateById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Create workflow definition from template
      const workflowData = {
        name: customizations?.name || `${template.name} - Copy`,
        description: customizations?.description || template.description,
        nodes: this.applyCustomizations(template.nodes, customizations?.nodeCustomizations),
        connections: template.connections,
        settings: {
          ...template.settings,
          ...customizations?.settings
        },
        createdBy: userId,
        fromTemplate: templateId,
        tags: [...(template.tags || []), ...(customizations?.tags || [])]
      };

      // Here you would typically create the workflow in your workflows table
      // For now, we'll return the workflow data
      logger.info(`Created workflow from template ${templateId} for user ${userId}`);
      
      return workflowData;
    } catch (error: any) {
      logger.error('Error creating workflow from template:', error);
      throw new Error(`Failed to create workflow from template: ${error.message}`);
    }
  }

  private applyCustomizations(nodes: any[], customizations?: Record<string, any>): any[] {
    if (!customizations) return nodes;

    return nodes.map(node => {
      const nodeCustomizations = customizations[node.id];
      if (!nodeCustomizations) return node;

      return {
        ...node,
        name: nodeCustomizations.name || node.name,
        parameters: {
          ...node.parameters,
          ...nodeCustomizations.parameters
        },
        position: nodeCustomizations.position || node.position
      };
    });
  }

  // TEMPLATE MANAGEMENT (Admin functions)
  public async updateTemplate(type: 'node' | 'workflow' | 'scenario', templateId: string, updates: any): Promise<boolean> {
    try {
      const modelName = this.getModelName(type);
      const [affectedRows] = await this.sequelize.models[modelName].update(
        updates,
        { where: { templateId } }
      );

      return affectedRows > 0;
    } catch (error: any) {
      logger.error('Error updating template:', error);
      throw new Error(`Failed to update template: ${error.message}`);
    }
  }

  public async deactivateTemplate(type: 'node' | 'workflow' | 'scenario', templateId: string): Promise<boolean> {
    return this.updateTemplate(type, templateId, { isActive: false });
  }

  public async activateTemplate(type: 'node' | 'workflow' | 'scenario', templateId: string): Promise<boolean> {
    return this.updateTemplate(type, templateId, { isActive: true });
  }

  private getModelName(type: 'node' | 'workflow' | 'scenario'): string {
    switch (type) {
      case 'node': return 'NodeTemplate';
      case 'workflow': return 'WorkflowTemplate';
      case 'scenario': return 'ScenarioTemplate';
      default: throw new Error(`Unknown template type: ${type}`);
    }
  }

  // BULK OPERATIONS
  public async bulkImportTemplates(templates: {
    nodes?: any[];
    workflows?: any[];
    scenarios?: any[];
  }): Promise<{
    imported: number;
    errors: any[];
  }> {
    let imported = 0;
    const errors: any[] = [];

    try {
      if (templates.nodes) {
        for (const template of templates.nodes) {
          try {
            await this.sequelize.models.NodeTemplate.upsert(template);
            imported++;
          } catch (error) {
            errors.push({ type: 'node', template: template.templateId, error });
          }
        }
      }

      if (templates.workflows) {
        for (const template of templates.workflows) {
          try {
            await this.sequelize.models.WorkflowTemplate.upsert(template);
            imported++;
          } catch (error) {
            errors.push({ type: 'workflow', template: template.templateId, error });
          }
        }
      }

      if (templates.scenarios) {
        for (const template of templates.scenarios) {
          try {
            await this.sequelize.models.ScenarioTemplate.upsert(template);
            imported++;
          } catch (error) {
            errors.push({ type: 'scenario', template: template.templateId, error });
          }
        }
      }

      logger.info(`Bulk import completed: ${imported} imported, ${errors.length} errors`);
      return { imported, errors };
    } catch (error: any) {
      logger.error('Error in bulk import:', error);
      throw new Error(`Bulk import failed: ${error.message}`);
    }
  }

  // VALIDATION
  public validateTemplateData(type: 'node' | 'workflow' | 'scenario', data: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Common validations
    if (!data.templateId) errors.push('Template ID is required');
    if (!data.name) errors.push('Name is required');
    if (!data.description) errors.push('Description is required');
    if (!data.difficulty || !['beginner', 'intermediate', 'advanced'].includes(data.difficulty)) {
      errors.push('Valid difficulty level is required');
    }

    // Type-specific validations
    switch (type) {
      case 'node':
        if (!data.nodeType) errors.push('Node type is required');
        if (!data.category) errors.push('Category is required');
        break;
      case 'workflow':
        if (!data.nodes || !Array.isArray(data.nodes)) errors.push('Nodes array is required');
        if (!data.connections || !Array.isArray(data.connections)) errors.push('Connections array is required');
        break;
      case 'scenario':
        if (!data.industry) errors.push('Industry is required');
        if (!data.workflow) errors.push('Workflow definition is required');
        if (!data.documentation) errors.push('Documentation is required');
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const templateService = TemplateService.getInstance();