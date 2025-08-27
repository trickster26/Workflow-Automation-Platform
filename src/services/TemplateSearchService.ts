import { Sequelize, DataTypes, Model, Op } from 'sequelize';
import { createLogger } from '../utils/logger';
import { WorkflowTemplate, WorkflowTemplateService } from './WorkflowTemplateService';
import { TemplateAnalyticsService } from './TemplateAnalyticsService';

const logger = createLogger('TemplateSearchService');

export interface SearchQuery {
  query?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  author?: string;
  visibility?: 'public' | 'private' | 'organization' | 'shared';
  status?: 'draft' | 'published' | 'deprecated' | 'archived';
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  minRating?: number;
  maxRating?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  sortBy?: 'relevance' | 'rating' | 'downloads' | 'created' | 'updated' | 'popularity' | 'name';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  includeDeprecated?: boolean;
  userId?: number;
}

export interface SearchResult {
  template: WorkflowTemplate;
  relevanceScore: number;
  matchedFields: string[];
  snippet?: string;
  highlights?: { [field: string]: string[] };
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  facets: SearchFacets;
  suggestions?: string[];
  relatedQueries?: string[];
  searchTime: number;
}

export interface SearchFacets {
  categories: { [category: string]: number };
  subcategories: { [subcategory: string]: number };
  tags: { [tag: string]: number };
  authors: { [author: string]: number };
  difficulty: { [difficulty: string]: number };
  ratings: { [rating: string]: number };
}

export interface SearchIndex {
  id?: number;
  templateId: number;
  content: string;
  title: string;
  description: string;
  tags: string;
  category: string;
  subcategory?: string;
  author: string;
  searchVector?: any; // For full-text search
  lastIndexed: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TrendingTemplate {
  template: WorkflowTemplate;
  trendScore: number;
  metrics: {
    downloads: number;
    views: number;
    ratings: number;
    avgRating: number;
    recentActivity: number;
  };
}

export interface Recommendation {
  template: WorkflowTemplate;
  recommendationScore: number;
  reason: 'similar_content' | 'popular_in_category' | 'user_behavior' | 'collaborative_filtering';
  explanation: string;
}

export class TemplateSearchService {
  private sequelize: Sequelize;
  private SearchIndex: any;
  private templateService: WorkflowTemplateService;
  private analyticsService: TemplateAnalyticsService;

  constructor(
    sequelize: Sequelize, 
    templateService: WorkflowTemplateService,
    analyticsService: TemplateAnalyticsService
  ) {
    this.sequelize = sequelize;
    this.templateService = templateService;
    this.analyticsService = analyticsService;
    this.initializeSearchIndex();
  }

  private initializeSearchIndex(): void {
    this.SearchIndex = this.sequelize.define('template_search_index', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      templateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'workflow_templates',
          key: 'id',
        },
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      tags: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '',
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      subcategory: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      author: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      searchVector: {
        type: DataTypes.TEXT, // Would use TSVECTOR in PostgreSQL
        allowNull: true,
      },
      lastIndexed: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    }, {
      indexes: [
        { fields: ['templateId'] },
        { fields: ['category'] },
        { fields: ['subcategory'] },
        { fields: ['author'] },
        { fields: ['lastIndexed'] },
        // Full-text search indexes would be database-specific
      ],
    });
  }

  async searchTemplates(query: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();
    logger.info('Starting template search:', { query });

    try {
      // Build base query
      const baseQuery = await this.buildSearchQuery(query);
      
      // Execute search with relevance scoring
      const searchResults = await this.executeSearch(baseQuery, query);
      
      // Calculate facets
      const facets = await this.calculateFacets(query);
      
      // Generate suggestions and related queries
      const suggestions = await this.generateSuggestions(query);
      const relatedQueries = await this.generateRelatedQueries(query);

      const searchTime = Date.now() - startTime;

      const response: SearchResponse = {
        results: searchResults.results,
        totalCount: searchResults.totalCount,
        facets,
        suggestions,
        relatedQueries,
        searchTime
      };

      logger.info(`Search completed in ${searchTime}ms, found ${searchResults.totalCount} results`);
      return response;

    } catch (error: any) {
      logger.error('Error searching templates:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  private async buildSearchQuery(query: SearchQuery): Promise<any> {
    const where: any = {};
    const include: any[] = [];

    // Text search
    if (query.query) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${query.query}%` } },
        { description: { [Op.iLike]: `%${query.query}%` } },
        { tags: { [Op.iLike]: `%${query.query}%` } },
        { content: { [Op.iLike]: `%${query.query}%` } },
      ];
    }

    // Category filters
    if (query.category) {
      where.category = query.category;
    }

    if (query.subcategory) {
      where.subcategory = query.subcategory;
    }

    // Author filter
    if (query.author) {
      where.author = { [Op.iLike]: `%${query.author}%` };
    }

    // Date filters
    if (query.createdAfter || query.createdBefore) {
      where.createdAt = {};
      if (query.createdAfter) {
        where.createdAt[Op.gte] = query.createdAfter;
      }
      if (query.createdBefore) {
        where.createdAt[Op.lte] = query.createdBefore;
      }
    }

    return { where, include };
  }

  private async executeSearch(baseQuery: any, query: SearchQuery): Promise<{
    results: SearchResult[];
    totalCount: number;
  }> {
    const limit = Math.min(query.limit || 20, 100);
    const offset = query.offset || 0;

    // Get search index results
    const indexResults = await this.SearchIndex.findAndCountAll({
      ...baseQuery,
      limit,
      offset,
      order: this.buildOrderClause(query.sortBy, query.sortOrder),
    });

    // Get full templates for results
    const templateIds = indexResults.rows.map((r: any) => r.templateId);
    const templates = await this.templateService.searchTemplates({
      templateIds,
      visibility: query.visibility,
      status: query.status,
      includeDeprecated: query.includeDeprecated,
      userId: query.userId
    });

    // Calculate relevance scores and build results
    const results: SearchResult[] = [];
    
    for (const indexResult of indexResults.rows) {
      const template = templates.results.find((t: any) => t.id === indexResult.templateId);
      if (template) {
        const relevanceScore = this.calculateRelevanceScore(indexResult, query);
        const matchedFields = this.getMatchedFields(indexResult, query);
        const snippet = this.generateSnippet(indexResult, query);
        const highlights = this.generateHighlights(indexResult, query);

        results.push({
          template,
          relevanceScore,
          matchedFields,
          snippet,
          highlights
        });
      }
    }

    // Sort by relevance if not specified
    if (query.sortBy === 'relevance' || !query.sortBy) {
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    return {
      results,
      totalCount: indexResults.count
    };
  }

  private calculateRelevanceScore(indexResult: any, query: SearchQuery): number {
    let score = 0;

    if (query.query) {
      const searchQuery = query.query.toLowerCase();
      
      // Title match (highest weight)
      if (indexResult.title.toLowerCase().includes(searchQuery)) {
        score += 10;
        if (indexResult.title.toLowerCase().startsWith(searchQuery)) {
          score += 5; // Bonus for prefix match
        }
      }

      // Description match
      if (indexResult.description.toLowerCase().includes(searchQuery)) {
        score += 5;
      }

      // Tags match
      if (indexResult.tags.toLowerCase().includes(searchQuery)) {
        score += 7;
      }

      // Content match
      if (indexResult.content.toLowerCase().includes(searchQuery)) {
        score += 3;
      }

      // Exact word matches get bonus points
      const words = searchQuery.split(' ');
      for (const word of words) {
        if (indexResult.title.toLowerCase().includes(` ${word} `)) score += 2;
        if (indexResult.tags.toLowerCase().includes(` ${word} `)) score += 1;
      }
    }

    // Category match bonus
    if (query.category && indexResult.category === query.category) {
      score += 2;
    }

    // Subcategory match bonus
    if (query.subcategory && indexResult.subcategory === query.subcategory) {
      score += 1;
    }

    return score;
  }

  private getMatchedFields(indexResult: any, query: SearchQuery): string[] {
    const matchedFields: string[] = [];

    if (query.query) {
      const searchQuery = query.query.toLowerCase();
      
      if (indexResult.title.toLowerCase().includes(searchQuery)) {
        matchedFields.push('title');
      }
      if (indexResult.description.toLowerCase().includes(searchQuery)) {
        matchedFields.push('description');
      }
      if (indexResult.tags.toLowerCase().includes(searchQuery)) {
        matchedFields.push('tags');
      }
      if (indexResult.content.toLowerCase().includes(searchQuery)) {
        matchedFields.push('content');
      }
    }

    return matchedFields;
  }

  private generateSnippet(indexResult: any, query: SearchQuery): string {
    if (!query.query) {
      return indexResult.description.substring(0, 150) + '...';
    }

    const searchQuery = query.query.toLowerCase();
    const description = indexResult.description.toLowerCase();
    const index = description.indexOf(searchQuery);

    if (index >= 0) {
      const start = Math.max(0, index - 50);
      const end = Math.min(description.length, index + searchQuery.length + 50);
      let snippet = indexResult.description.substring(start, end);
      
      if (start > 0) snippet = '...' + snippet;
      if (end < description.length) snippet = snippet + '...';
      
      return snippet;
    }

    return indexResult.description.substring(0, 150) + '...';
  }

  private generateHighlights(indexResult: any, query: SearchQuery): { [field: string]: string[] } {
    const highlights: { [field: string]: string[] } = {};

    if (!query.query) return highlights;

    const searchQuery = query.query.toLowerCase();
    const fields = ['title', 'description', 'tags'];

    for (const field of fields) {
      const fieldValue = indexResult[field] || '';
      const fieldLower = fieldValue.toLowerCase();
      
      if (fieldLower.includes(searchQuery)) {
        highlights[field] = this.highlightText(fieldValue, query.query);
      }
    }

    return highlights;
  }

  private highlightText(text: string, query: string): string[] {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.split(regex).map(part => 
      part.toLowerCase() === query.toLowerCase() ? `<mark>${part}</mark>` : part
    ).filter(part => part.length > 0);
  }

  private buildOrderClause(sortBy?: string, sortOrder?: string): any[] {
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    switch (sortBy) {
      case 'name':
      case 'title':
        return [['title', order]];
      case 'created':
        return [['createdAt', order]];
      case 'updated':
        return [['updatedAt', order]];
      case 'rating':
      case 'downloads':
      case 'popularity':
        // These would require joins with analytics data
        return [['lastIndexed', order]]; // Fallback
      case 'relevance':
      default:
        return [['lastIndexed', 'DESC']]; // Most recently indexed first
    }
  }

  private async calculateFacets(query: SearchQuery): Promise<SearchFacets> {
    // Build a query without the facet being calculated
    const baseFacetQuery = { ...query };

    try {
      // Get category facets
      const categories = await this.SearchIndex.findAll({
        attributes: [
          'category',
          [this.sequelize.fn('COUNT', this.sequelize.col('category')), 'count']
        ],
        group: ['category'],
        raw: true
      });

      // Get subcategory facets
      const subcategories = await this.SearchIndex.findAll({
        attributes: [
          'subcategory',
          [this.sequelize.fn('COUNT', this.sequelize.col('subcategory')), 'count']
        ],
        where: { subcategory: { [Op.not]: null } },
        group: ['subcategory'],
        raw: true
      });

      // Get tag facets (simplified - would need proper tag parsing)
      const tags = await this.SearchIndex.findAll({
        attributes: ['tags'],
        raw: true
      });

      const tagCounts: { [tag: string]: number } = {};
      for (const result of tags as any[]) {
        const templateTags = (result.tags || '').split(',').map((t: string) => t.trim());
        for (const tag of templateTags) {
          if (tag) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          }
        }
      }

      // Get author facets
      const authors = await this.SearchIndex.findAll({
        attributes: [
          'author',
          [this.sequelize.fn('COUNT', this.sequelize.col('author')), 'count']
        ],
        group: ['author'],
        raw: true
      });

      return {
        categories: categories.reduce((acc: any, cat: any) => {
          acc[cat.category] = parseInt(cat.count);
          return acc;
        }, {}),
        subcategories: subcategories.reduce((acc: any, sub: any) => {
          acc[sub.subcategory] = parseInt(sub.count);
          return acc;
        }, {}),
        tags: tagCounts,
        authors: authors.reduce((acc: any, auth: any) => {
          acc[auth.author] = parseInt(auth.count);
          return acc;
        }, {}),
        difficulty: {}, // Would need to be calculated based on template metadata
        ratings: {} // Would need to be calculated based on analytics data
      };

    } catch (error: any) {
      logger.error('Error calculating facets:', error);
      return {
        categories: {},
        subcategories: {},
        tags: {},
        authors: {},
        difficulty: {},
        ratings: {}
      };
    }
  }

  private async generateSuggestions(query: SearchQuery): Promise<string[]> {
    const suggestions: string[] = [];

    if (query.query && query.query.length > 2) {
      // Find similar queries (simplified implementation)
      const similarTerms = await this.SearchIndex.findAll({
        attributes: ['title'],
        where: {
          title: { [Op.iLike]: `%${query.query}%` }
        },
        limit: 5,
        raw: true
      });

      for (const term of similarTerms as any[]) {
        if (term.title.toLowerCase() !== query.query.toLowerCase()) {
          suggestions.push(term.title);
        }
      }
    }

    return suggestions.slice(0, 5);
  }

  private async generateRelatedQueries(query: SearchQuery): Promise<string[]> {
    const related: string[] = [];

    // Generate related queries based on category
    if (query.category) {
      const categoryTemplates = await this.SearchIndex.findAll({
        attributes: ['title'],
        where: { category: query.category },
        order: [['lastIndexed', 'DESC']],
        limit: 3,
        raw: true
      });

      related.push(...categoryTemplates.map((t: any) => t.title));
    }

    return related.slice(0, 5);
  }

  async getTrendingTemplates(limit: number = 10): Promise<TrendingTemplate[]> {
    try {
      // Get trending data from analytics
      const trending = await this.analyticsService.getTrendingTemplates(limit);
      
      const results: TrendingTemplate[] = [];
      
      for (const trend of trending) {
        const template = await this.templateService.getTemplate(trend.templateId);
        if (template) {
          results.push({
            template,
            trendScore: trend.trendScore,
            metrics: {
              downloads: trend.downloads,
              views: trend.views,
              ratings: trend.ratings,
              avgRating: trend.avgRating,
              recentActivity: trend.recentActivity
            }
          });
        }
      }

      return results;
    } catch (error: any) {
      logger.error('Error getting trending templates:', error);
      return [];
    }
  }

  async getRecommendations(userId: number, templateId?: number, limit: number = 5): Promise<Recommendation[]> {
    try {
      const recommendations: Recommendation[] = [];

      // Content-based recommendations
      if (templateId) {
        const baseTemplate = await this.templateService.getTemplate(templateId);
        if (baseTemplate) {
          const similar = await this.findSimilarTemplates(baseTemplate, limit);
          recommendations.push(...similar.map(t => ({
            template: t,
            recommendationScore: 0.8,
            reason: 'similar_content' as const,
            explanation: `Similar to "${baseTemplate.displayName}"`
          })));
        }
      }

      // Popular in category recommendations
      if (recommendations.length < limit) {
        const userHistory = await this.analyticsService.getUserTemplateHistory(userId);
        if (userHistory.length > 0) {
          const categories = [...new Set(userHistory.map(h => h.category))];
          const popularInCategories = await this.getPopularInCategories(categories, limit - recommendations.length);
          
          recommendations.push(...popularInCategories.map(t => ({
            template: t,
            recommendationScore: 0.6,
            reason: 'popular_in_category' as const,
            explanation: `Popular in ${t.category}`
          })));
        }
      }

      return recommendations.slice(0, limit);
    } catch (error: any) {
      logger.error('Error getting recommendations:', error);
      return [];
    }
  }

  private async findSimilarTemplates(baseTemplate: WorkflowTemplate, limit: number): Promise<WorkflowTemplate[]> {
    const similar = await this.SearchIndex.findAll({
      where: {
        [Op.and]: [
          { templateId: { [Op.ne]: baseTemplate.id } },
          {
            [Op.or]: [
              { category: baseTemplate.category },
              { tags: { [Op.overlap]: baseTemplate.tags || [] } }
            ]
          }
        ]
      },
      limit,
      order: [['lastIndexed', 'DESC']]
    });

    const templateIds = similar.map((s: any) => s.templateId);
    const templates = await this.templateService.searchTemplates({ templateIds });
    
    return templates.results || [];
  }

  private async getPopularInCategories(categories: string[], limit: number): Promise<WorkflowTemplate[]> {
    if (categories.length === 0) return [];

    const popular = await this.SearchIndex.findAll({
      where: {
        category: { [Op.in]: categories }
      },
      limit,
      order: [['lastIndexed', 'DESC']] // Would order by popularity metrics in real implementation
    });

    const templateIds = popular.map((p: any) => p.templateId);
    const templates = await this.templateService.searchTemplates({ templateIds });
    
    return templates.results || [];
  }

  async indexTemplate(template: WorkflowTemplate): Promise<void> {
    try {
      // Extract searchable content
      const content = this.extractSearchableContent(template);
      
      const indexData: Partial<SearchIndex> = {
        templateId: template.id!,
        content,
        title: template.displayName || template.name,
        description: template.description || '',
        tags: (template.tags || []).join(', '),
        category: template.category || 'general',
        subcategory: template.subcategory,
        author: template.createdBy?.toString() || 'unknown',
        lastIndexed: new Date()
      };

      // Upsert search index entry
      await this.SearchIndex.upsert(indexData);

      logger.info(`Indexed template: ${template.name} (ID: ${template.id})`);
    } catch (error: any) {
      logger.error(`Error indexing template ${template.id}:`, error);
      throw error;
    }
  }

  async removeFromIndex(templateId: number): Promise<void> {
    try {
      await this.SearchIndex.destroy({
        where: { templateId }
      });

      logger.info(`Removed template ${templateId} from search index`);
    } catch (error: any) {
      logger.error(`Error removing template ${templateId} from index:`, error);
      throw error;
    }
  }

  private extractSearchableContent(template: WorkflowTemplate): string {
    const contentParts: string[] = [];

    // Add basic template info
    contentParts.push(template.name);
    contentParts.push(template.displayName || '');
    contentParts.push(template.description || '');
    contentParts.push((template.tags || []).join(' '));

    // Extract node information
    const nodes = template.templateData?.nodes || [];
    for (const node of nodes) {
      if (node.name) contentParts.push(node.name);
      if (node.description) contentParts.push(node.description);
      if (node.type) contentParts.push(node.type);
    }

    // Add documentation content
    if (template.documentation) {
      if (template.documentation.description) {
        contentParts.push(template.documentation.description);
      }
      if (template.documentation.usage) {
        contentParts.push(template.documentation.usage);
      }
    }

    return contentParts.filter(part => part && part.trim()).join(' ');
  }

  async rebuildIndex(): Promise<{ indexed: number; errors: number }> {
    logger.info('Starting search index rebuild...');
    
    let indexed = 0;
    let errors = 0;

    try {
      // Clear existing index
      await this.SearchIndex.destroy({ where: {} });

      // Get all templates
      const templates = await this.templateService.searchTemplates({
        limit: 10000, // Large limit to get all templates
        includeDeprecated: true
      });

      // Index each template
      for (const template of templates.results || []) {
        try {
          await this.indexTemplate(template);
          indexed++;
        } catch (error: any) {
          logger.error(`Failed to index template ${template.id}:`, error);
          errors++;
        }
      }

      logger.info(`Search index rebuild completed: ${indexed} indexed, ${errors} errors`);
      return { indexed, errors };

    } catch (error: any) {
      logger.error('Error rebuilding search index:', error);
      throw error;
    }
  }
}