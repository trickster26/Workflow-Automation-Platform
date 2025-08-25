import { Sequelize, DataTypes, Model, Op } from 'sequelize';
import { createLogger } from '../utils/logger';

const logger = createLogger('WorkflowTemplateService');
import * as crypto from 'crypto';

export interface WorkflowTemplate {
  id?: number;
  name: string;
  displayName: string;
  description: string;
  category: string;
  subcategory?: string;
  tags: string[];
  version: string;
  author: {
    id: number;
    name: string;
    email?: string;
    organization?: string;
  };
  templateData: {
    nodes: any[];
    connections: any[];
    settings: any;
    variables?: any[];
    credentials?: string[];
    dependencies?: string[];
  };
  metadata: {
    nodeCount: number;
    complexity: 'simple' | 'intermediate' | 'advanced';
    estimatedRunTime?: string;
    requiredCredentials: string[];
    requiredIntegrations: string[];
    industries?: string[];
    useCases: string[];
    keywords: string[];
  };
  documentation: {
    overview: string;
    setup: string[];
    configuration: string[];
    examples?: any[];
    troubleshooting?: string[];
    changelog?: any[];
  };
  visibility: 'public' | 'private' | 'organization' | 'shared';
  status: 'draft' | 'published' | 'deprecated' | 'archived';
  isOfficial: boolean;
  isFeatured: boolean;
  rating: {
    average: number;
    count: number;
    breakdown: {
      5: number;
      4: number;
      3: number;
      2: number;
      1: number;
    };
  };
  usage: {
    downloads: number;
    installs: number;
    forks: number;
    views: number;
  };
  validation: {
    isValid: boolean;
    lastValidated?: Date;
    validationErrors?: string[];
    checksumHash: string;
  };
  sharing: {
    allowForks: boolean;
    allowModifications: boolean;
    licenseType: string;
    attribution?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
  publishedAt?: Date;
  lastUsedAt?: Date;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  subcategories: {
    id: string;
    name: string;
    description: string;
  }[];
  templateCount: number;
}

export interface TemplateReview {
  id?: number;
  templateId: number;
  userId: number;
  rating: number;
  title?: string;
  comment?: string;
  isHelpful?: boolean;
  createdAt?: Date;
}

class WorkflowTemplateModel extends Model<WorkflowTemplate> implements WorkflowTemplate {
  public id!: number;
  public name!: string;
  public displayName!: string;
  public description!: string;
  public category!: string;
  public subcategory!: string;
  public tags!: string[];
  public version!: string;
  public author!: any;
  public templateData!: any;
  public metadata!: any;
  public documentation!: any;
  public visibility!: 'public' | 'private' | 'organization' | 'shared';
  public status!: 'draft' | 'published' | 'deprecated' | 'archived';
  public isOfficial!: boolean;
  public isFeatured!: boolean;
  public rating!: any;
  public usage!: any;
  public validation!: any;
  public sharing!: any;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public publishedAt!: Date;
  public lastUsedAt!: Date;
}

class TemplateReviewModel extends Model<TemplateReview> implements TemplateReview {
  public id!: number;
  public templateId!: number;
  public userId!: number;
  public rating!: number;
  public title!: string;
  public comment!: string;
  public isHelpful!: boolean;
  public readonly createdAt!: Date;
}

export class WorkflowTemplateService {
  private sequelize: Sequelize;
  private WorkflowTemplate: typeof WorkflowTemplateModel;
  private TemplateReview: typeof TemplateReviewModel;

  constructor(sequelize: Sequelize) {
    this.sequelize = sequelize;
    this.WorkflowTemplate = WorkflowTemplateModel;
    this.TemplateReview = TemplateReviewModel;
    this.initModels();
  }

  private initModels(): void {
    this.WorkflowTemplate.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
        },
        displayName: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        category: {
          type: DataTypes.STRING(100),
          allowNull: false,
        },
        subcategory: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        tags: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: [],
        },
        version: {
          type: DataTypes.STRING(50),
          allowNull: false,
          defaultValue: '1.0.0',
        },
        author: {
          type: DataTypes.JSON,
          allowNull: false,
        },
        templateData: {
          type: DataTypes.JSON,
          allowNull: false,
        },
        metadata: {
          type: DataTypes.JSON,
          allowNull: false,
        },
        documentation: {
          type: DataTypes.JSON,
          allowNull: false,
        },
        visibility: {
          type: DataTypes.ENUM('public', 'private', 'organization', 'shared'),
          allowNull: false,
          defaultValue: 'private',
        },
        status: {
          type: DataTypes.ENUM('draft', 'published', 'deprecated', 'archived'),
          allowNull: false,
          defaultValue: 'draft',
        },
        isOfficial: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        isFeatured: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        rating: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: {
            average: 0,
            count: 0,
            breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
          },
        },
        usage: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: {
            downloads: 0,
            installs: 0,
            forks: 0,
            views: 0
          },
        },
        validation: {
          type: DataTypes.JSON,
          allowNull: false,
        },
        sharing: {
          type: DataTypes.JSON,
          allowNull: false,
          defaultValue: {
            allowForks: true,
            allowModifications: true,
            licenseType: 'MIT',
          },
        },
        publishedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        lastUsedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize: this.sequelize,
        tableName: 'workflow_templates',
        timestamps: true,
        indexes: [
          { fields: ['category'] },
          { fields: ['subcategory'] },
          { fields: ['status'] },
          { fields: ['visibility'] },
          { fields: ['isOfficial'] },
          { fields: ['isFeatured'] },
          { fields: ['publishedAt'] },
          { fields: ['lastUsedAt'] },
        ],
      }
    );

    this.TemplateReview.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        templateId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: this.WorkflowTemplate,
            key: 'id',
          },
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        rating: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            min: 1,
            max: 5,
          },
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: true,
        },
        comment: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        isHelpful: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      },
      {
        sequelize: this.sequelize,
        tableName: 'template_reviews',
        timestamps: true,
        indexes: [
          { fields: ['templateId'] },
          { fields: ['userId'] },
          { fields: ['rating'] },
          { fields: ['createdAt'] },
        ],
      }
    );

    // Associations
    this.WorkflowTemplate.hasMany(this.TemplateReview, { foreignKey: 'templateId', as: 'reviews' });
    this.TemplateReview.belongsTo(this.WorkflowTemplate, { foreignKey: 'templateId', as: 'template' });
  }

  async createTemplate(templateData: Omit<WorkflowTemplate, 'id'>): Promise<WorkflowTemplate> {
    try {
      logger.info(`Creating workflow template: ${templateData.name}`);

      // Generate validation checksum
      const checksumHash = this.generateTemplateChecksum(templateData.templateData);
      
      // Validate template data
      const validationResult = await this.validateTemplate(templateData.templateData);
      
      const template = await this.WorkflowTemplate.create({
        ...templateData,
        validation: {
          isValid: validationResult.isValid,
          validationErrors: validationResult.errors,
          checksumHash,
          lastValidated: new Date(),
        },
      });

      logger.info(`Workflow template created successfully: ${template.id}`);
      return template.toJSON();
    } catch (error: any) {
      logger.error('Error creating workflow template:', error);
      throw new Error(`Failed to create workflow template: ${error.message}`);
    }
  }

  async getTemplate(id: number, incrementViews: boolean = true): Promise<WorkflowTemplate | null> {
    try {
      const template = await this.WorkflowTemplate.findByPk(id, {
        include: [
          {
            model: this.TemplateReview,
            as: 'reviews',
            limit: 5,
            order: [['createdAt', 'DESC']],
          },
        ],
      });

      if (!template) {
        return null;
      }

      // Increment view count
      if (incrementViews) {
        await this.incrementUsageMetric(id, 'views');
      }

      return template.toJSON();
    } catch (error: any) {
      logger.error('Error getting workflow template:', error);
      throw new Error(`Failed to get workflow template: ${error.message}`);
    }
  }

  async updateTemplate(id: number, updates: Partial<WorkflowTemplate>): Promise<WorkflowTemplate> {
    try {
      logger.info(`Updating workflow template: ${id}`);

      const template = await this.WorkflowTemplate.findByPk(id);
      if (!template) {
        throw new Error('Template not found');
      }

      // If template data is being updated, revalidate
      if (updates.templateData) {
        const checksumHash = this.generateTemplateChecksum(updates.templateData);
        const validationResult = await this.validateTemplate(updates.templateData);
        
        updates.validation = {
          isValid: validationResult.isValid,
          validationErrors: validationResult.errors,
          checksumHash,
          lastValidated: new Date(),
        };
      }

      await template.update(updates);
      
      logger.info(`Workflow template updated successfully: ${id}`);
      return template.toJSON();
    } catch (error: any) {
      logger.error('Error updating workflow template:', error);
      throw new Error(`Failed to update workflow template: ${error.message}`);
    }
  }

  async deleteTemplate(id: number): Promise<void> {
    try {
      logger.info(`Deleting workflow template: ${id}`);

      const template = await this.WorkflowTemplate.findByPk(id);
      if (!template) {
        throw new Error('Template not found');
      }

      await template.destroy();
      logger.info(`Workflow template deleted successfully: ${id}`);
    } catch (error: any) {
      logger.error('Error deleting workflow template:', error);
      throw new Error(`Failed to delete workflow template: ${error.message}`);
    }
  }

  async searchTemplates(options: {
    query?: string;
    category?: string;
    subcategory?: string;
    tags?: string[];
    author?: number;
    visibility?: string[];
    status?: string[];
    complexity?: string[];
    requiredIntegrations?: string[];
    industries?: string[];
    sortBy?: 'name' | 'rating' | 'downloads' | 'created' | 'updated' | 'popularity';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
    includeFeatured?: boolean;
    includeOfficial?: boolean;
  } = {}): Promise<{
    templates: WorkflowTemplate[];
    total: number;
    categories: { [key: string]: number };
    tags: { [key: string]: number };
  }> {
    try {
      const where: any = {};
      const order: any[] = [];

      // Build query conditions
      if (options.query) {
        where[Op.or] = [
          { displayName: { [Op.like]: `%${options.query}%` } },
          { description: { [Op.like]: `%${options.query}%` } },
          { tags: { [Op.contains]: [options.query] } },
        ];
      }

      if (options.category) {
        where.category = options.category;
      }

      if (options.subcategory) {
        where.subcategory = options.subcategory;
      }

      if (options.tags && options.tags.length > 0) {
        where.tags = { [Op.overlap]: options.tags };
      }

      if (options.author) {
        where['author.id'] = options.author;
      }

      if (options.visibility && options.visibility.length > 0) {
        where.visibility = { [Op.in]: options.visibility };
      }

      if (options.status && options.status.length > 0) {
        where.status = { [Op.in]: options.status };
      }

      if (options.complexity && options.complexity.length > 0) {
        where['metadata.complexity'] = { [Op.in]: options.complexity };
      }

      if (options.requiredIntegrations && options.requiredIntegrations.length > 0) {
        where['metadata.requiredIntegrations'] = { [Op.overlap]: options.requiredIntegrations };
      }

      if (options.industries && options.industries.length > 0) {
        where['metadata.industries'] = { [Op.overlap]: options.industries };
      }

      if (options.includeFeatured) {
        where.isFeatured = true;
      }

      if (options.includeOfficial) {
        where.isOfficial = true;
      }

      // Build sort order
      switch (options.sortBy) {
        case 'rating':
          order.push([Sequelize.literal('"rating"->\'average\''), options.sortOrder || 'desc']);
          break;
        case 'downloads':
          order.push([Sequelize.literal('"usage"->\'downloads\''), options.sortOrder || 'desc']);
          break;
        case 'popularity':
          order.push([Sequelize.literal('("usage"->\'downloads\')::int + ("usage"->\'views\')::int'), options.sortOrder || 'desc']);
          break;
        case 'created':
          order.push(['createdAt', options.sortOrder || 'desc']);
          break;
        case 'updated':
          order.push(['updatedAt', options.sortOrder || 'desc']);
          break;
        default:
          order.push(['displayName', options.sortOrder || 'asc']);
      }

      const { rows: templates, count: total } = await this.WorkflowTemplate.findAndCountAll({
        where,
        order,
        limit: options.limit || 50,
        offset: options.offset || 0,
        include: [
          {
            model: this.TemplateReview,
            as: 'reviews',
            attributes: ['rating', 'createdAt'],
            limit: 3,
          },
        ],
      });

      // Get aggregated category and tag counts for filters
      const allTemplates = await this.WorkflowTemplate.findAll({
        attributes: ['category', 'tags'],
        where: { status: 'published', visibility: { [Op.in]: ['public', 'shared'] } },
      });

      const categories: { [key: string]: number } = {};
      const tags: { [key: string]: number } = {};

      allTemplates.forEach(template => {
        categories[template.category] = (categories[template.category] || 0) + 1;
        template.tags.forEach((tag: string) => {
          tags[tag] = (tags[tag] || 0) + 1;
        });
      });

      return {
        templates: templates.map(template => template.toJSON()),
        total,
        categories,
        tags,
      };
    } catch (error: any) {
      logger.error('Error searching workflow templates:', error);
      throw new Error(`Failed to search workflow templates: ${error.message}`);
    }
  }

  async publishTemplate(id: number): Promise<WorkflowTemplate> {
    try {
      logger.info(`Publishing workflow template: ${id}`);

      const template = await this.WorkflowTemplate.findByPk(id);
      if (!template) {
        throw new Error('Template not found');
      }

      // Validate template before publishing
      const validationResult = await this.validateTemplate(template.templateData);
      if (!validationResult.isValid) {
        throw new Error(`Template validation failed: ${validationResult.errors.join(', ')}`);
      }

      await template.update({
        status: 'published',
        publishedAt: new Date(),
      });

      logger.info(`Workflow template published successfully: ${id}`);
      return template.toJSON();
    } catch (error: any) {
      logger.error('Error publishing workflow template:', error);
      throw new Error(`Failed to publish workflow template: ${error.message}`);
    }
  }

  async forkTemplate(templateId: number, userId: number, customizations?: {
    name?: string;
    description?: string;
    visibility?: string;
  }): Promise<WorkflowTemplate> {
    try {
      logger.info(`Forking workflow template: ${templateId} by user ${userId}`);

      const originalTemplate = await this.WorkflowTemplate.findByPk(templateId);
      if (!originalTemplate) {
        throw new Error('Template not found');
      }

      if (!originalTemplate.sharing.allowForks) {
        throw new Error('Template does not allow forks');
      }

      // Increment fork count on original template
      await this.incrementUsageMetric(templateId, 'forks');

      // Create forked template
      const forkedTemplate = await this.createTemplate({
        name: customizations?.name || `${originalTemplate.name}-fork-${Date.now()}`,
        displayName: customizations?.name || `${originalTemplate.displayName} (Fork)`,
        description: customizations?.description || originalTemplate.description,
        category: originalTemplate.category,
        subcategory: originalTemplate.subcategory,
        tags: [...originalTemplate.tags, 'fork'],
        version: '1.0.0',
        author: {
          id: userId,
          name: 'User',
        },
        templateData: originalTemplate.templateData,
        metadata: {
          ...originalTemplate.metadata,
          originalTemplate: {
            id: templateId,
            name: originalTemplate.name,
            author: originalTemplate.author,
          },
        },
        documentation: originalTemplate.documentation,
        visibility: customizations?.visibility as any || 'private',
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
        validation: {
          isValid: false,
          checksumHash: this.generateChecksum(originalTemplate.templateData)
        },
        sharing: originalTemplate.sharing,
      });

      logger.info(`Workflow template forked successfully: ${forkedTemplate.id}`);
      return forkedTemplate;
    } catch (error: any) {
      logger.error('Error forking workflow template:', error);
      throw new Error(`Failed to fork workflow template: ${error.message}`);
    }
  }

  async addReview(templateId: number, userId: number, reviewData: {
    rating: number;
    title?: string;
    comment?: string;
  }): Promise<TemplateReview> {
    try {
      logger.info(`Adding review for template ${templateId} by user ${userId}`);

      // Check if user already reviewed this template
      const existingReview = await this.TemplateReview.findOne({
        where: { templateId, userId },
      });

      if (existingReview) {
        throw new Error('User has already reviewed this template');
      }

      const review = await this.TemplateReview.create({
        templateId,
        userId,
        ...reviewData,
      });

      // Update template rating
      await this.updateTemplateRating(templateId);

      logger.info(`Review added successfully: ${review.id}`);
      return review.toJSON();
    } catch (error: any) {
      logger.error('Error adding template review:', error);
      throw new Error(`Failed to add template review: ${error.message}`);
    }
  }

  async getCategories(): Promise<TemplateCategory[]> {
    try {
      // Get template counts by category
      const categoryStats = await this.WorkflowTemplate.findAll({
        attributes: [
          'category',
          'subcategory',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        ],
        where: { status: 'published', visibility: { [Op.in]: ['public', 'shared'] } },
        group: ['category', 'subcategory'],
        raw: true,
      });

      // Define standard categories
      const standardCategories: TemplateCategory[] = [
        {
          id: 'automation',
          name: 'Automation',
          description: 'General purpose automation workflows',
          icon: 'robot',
          color: '#3b82f6',
          subcategories: [
            { id: 'data-processing', name: 'Data Processing', description: 'Data transformation and processing workflows' },
            { id: 'file-management', name: 'File Management', description: 'File operations and management workflows' },
            { id: 'scheduling', name: 'Scheduling', description: 'Time-based and scheduled workflows' },
          ],
          templateCount: 0,
        },
        {
          id: 'integration',
          name: 'Integration',
          description: 'Third-party service integration workflows',
          icon: 'link',
          color: '#10b981',
          subcategories: [
            { id: 'social-media', name: 'Social Media', description: 'Social media platform integrations' },
            { id: 'productivity', name: 'Productivity', description: 'Productivity tool integrations' },
            { id: 'cloud-services', name: 'Cloud Services', description: 'Cloud platform integrations' },
          ],
          templateCount: 0,
        },
        {
          id: 'business',
          name: 'Business',
          description: 'Business process automation workflows',
          icon: 'briefcase',
          color: '#f59e0b',
          subcategories: [
            { id: 'crm', name: 'CRM', description: 'Customer relationship management workflows' },
            { id: 'accounting', name: 'Accounting', description: 'Financial and accounting workflows' },
            { id: 'hr', name: 'Human Resources', description: 'HR and employee management workflows' },
          ],
          templateCount: 0,
        },
        {
          id: 'development',
          name: 'Development',
          description: 'Developer tools and CI/CD workflows',
          icon: 'code',
          color: '#8b5cf6',
          subcategories: [
            { id: 'ci-cd', name: 'CI/CD', description: 'Continuous integration and deployment workflows' },
            { id: 'testing', name: 'Testing', description: 'Testing and quality assurance workflows' },
            { id: 'deployment', name: 'Deployment', description: 'Application deployment workflows' },
          ],
          templateCount: 0,
        },
        {
          id: 'marketing',
          name: 'Marketing',
          description: 'Marketing automation workflows',
          icon: 'megaphone',
          color: '#ef4444',
          subcategories: [
            { id: 'email-marketing', name: 'Email Marketing', description: 'Email campaign automation workflows' },
            { id: 'lead-generation', name: 'Lead Generation', description: 'Lead capture and nurturing workflows' },
            { id: 'analytics', name: 'Analytics', description: 'Marketing analytics and reporting workflows' },
          ],
          templateCount: 0,
        },
        {
          id: 'monitoring',
          name: 'Monitoring',
          description: 'System monitoring and alerting workflows',
          icon: 'eye',
          color: '#06b6d4',
          subcategories: [
            { id: 'alerts', name: 'Alerts', description: 'Alert and notification workflows' },
            { id: 'health-checks', name: 'Health Checks', description: 'System health monitoring workflows' },
            { id: 'reporting', name: 'Reporting', description: 'Automated reporting workflows' },
          ],
          templateCount: 0,
        },
      ];

      // Update template counts from database
      const categoryMap = new Map<string, TemplateCategory>();
      standardCategories.forEach(cat => categoryMap.set(cat.id, cat));

      (categoryStats as any[]).forEach((stat: any) => {
        const category = categoryMap.get(stat.category);
        if (category) {
          category.templateCount += parseInt(stat.count);
        }
      });

      return standardCategories;
    } catch (error: any) {
      logger.error('Error getting template categories:', error);
      throw new Error(`Failed to get template categories: ${error.message}`);
    }
  }

  async incrementUsageMetric(templateId: number, metric: 'downloads' | 'installs' | 'forks' | 'views'): Promise<void> {
    try {
      const template = await this.WorkflowTemplate.findByPk(templateId);
      if (template) {
        const usage = { ...template.usage };
        usage[metric] = (usage[metric] || 0) + 1;
        
        await template.update({ 
          usage,
          lastUsedAt: new Date(),
        });
      }
    } catch (error: any) {
      logger.error('Error incrementing usage metric:', error);
    }
  }

  private async updateTemplateRating(templateId: number): Promise<void> {
    try {
      const reviews = await this.TemplateReview.findAll({
        where: { templateId },
        attributes: ['rating'],
      });

      if (reviews.length === 0) return;

      const ratings = reviews.map(r => r.rating);
      const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      
      const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      ratings.forEach(rating => {
        breakdown[rating as keyof typeof breakdown]++;
      });

      await this.WorkflowTemplate.update(
        {
          rating: {
            average: Math.round(average * 100) / 100,
            count: ratings.length,
            breakdown,
          },
        },
        { where: { id: templateId } }
      );
    } catch (error: any) {
      logger.error('Error updating template rating:', error);
    }
  }

  private generateTemplateChecksum(templateData: any): string {
    const dataString = JSON.stringify(templateData, null, 0);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  private async validateTemplate(templateData: any): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Basic structure validation
      if (!templateData.nodes || !Array.isArray(templateData.nodes)) {
        errors.push('Template must contain a nodes array');
      }

      if (!templateData.connections || !Array.isArray(templateData.connections)) {
        errors.push('Template must contain a connections array');
      }

      // Node validation
      if (templateData.nodes) {
        templateData.nodes.forEach((node: any, index: number) => {
          if (!node.id) {
            errors.push(`Node ${index} is missing an ID`);
          }
          if (!node.type) {
            errors.push(`Node ${index} is missing a type`);
          }
        });
      }

      // Connection validation
      if (templateData.connections) {
        templateData.connections.forEach((conn: any, index: number) => {
          if (!conn.source) {
            errors.push(`Connection ${index} is missing source`);
          }
          if (!conn.target) {
            errors.push(`Connection ${index} is missing target`);
          }
        });
      }

    } catch (error: any) {
      errors.push(`Template validation error: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private generateChecksum(data: any): string {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }
}