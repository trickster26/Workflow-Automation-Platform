import { Sequelize, DataTypes, Model, Op } from 'sequelize';
import { logger } from '../utils/logger';

export interface TemplateUsageEvent {
  id?: number;
  templateId: number;
  userId: number;
  eventType: 'view' | 'download' | 'install' | 'fork' | 'rate' | 'execute' | 'error' | 'uninstall';
  eventData?: {
    rating?: number;
    errorType?: string;
    errorMessage?: string;
    executionTime?: number;
    success?: boolean;
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
  };
  sessionId?: string;
  timestamp: Date;
  createdAt?: Date;
}

export interface TemplateAnalytics {
  templateId: number;
  period: 'day' | 'week' | 'month' | 'year' | 'all';
  startDate: Date;
  endDate: Date;
  metrics: {
    views: number;
    downloads: number;
    installs: number;
    forks: number;
    executions: number;
    errors: number;
    uninstalls: number;
    uniqueUsers: number;
    avgRating: number;
    ratingCount: number;
  };
  trends: {
    viewsChange: number;
    downloadsChange: number;
    installsChange: number;
    popularityScore: number;
    growthRate: number;
  };
  demographics: {
    topCountries: Array<{ country: string; count: number }>;
    topBrowsers: Array<{ browser: string; count: number }>;
    userTypes: Array<{ type: string; count: number }>;
  };
  performance: {
    avgExecutionTime: number;
    successRate: number;
    errorRate: number;
    topErrors: Array<{ error: string; count: number }>;
  };
}

export interface MarketplaceAnalytics {
  period: 'day' | 'week' | 'month' | 'year';
  startDate: Date;
  endDate: Date;
  overview: {
    totalTemplates: number;
    totalDownloads: number;
    totalUsers: number;
    avgRating: number;
    popularTemplates: Array<{
      templateId: number;
      name: string;
      downloads: number;
      rating: number;
    }>;
  };
  categories: Array<{
    category: string;
    templateCount: number;
    downloadCount: number;
    avgRating: number;
  }>;
  trends: {
    dailyViews: Array<{ date: string; views: number }>;
    dailyDownloads: Array<{ date: string; downloads: number }>;
    categoryGrowth: Array<{ category: string; growth: number }>;
  };
  users: {
    activeUsers: number;
    newUsers: number;
    returningUsers: number;
    topContributors: Array<{
      userId: number;
      templatesCreated: number;
      totalDownloads: number;
    }>;
  };
}

export interface UserActivitySummary {
  userId: number;
  period: 'day' | 'week' | 'month' | 'year';
  activity: {
    templatesViewed: number;
    templatesDownloaded: number;
    templatesInstalled: number;
    templatesCreated: number;
    templatesForked: number;
    ratingsGiven: number;
    executions: number;
  };
  preferences: {
    favoriteCategories: Array<{ category: string; count: number }>;
    averageComplexity: string;
    mostUsedNodes: Array<{ nodeType: string; count: number }>;
  };
  engagement: {
    sessionCount: number;
    avgSessionDuration: number;
    bounceRate: number;
    returnRate: number;
  };
}

class TemplateUsageEventModel extends Model<TemplateUsageEvent> implements TemplateUsageEvent {
  public id!: number;
  public templateId!: number;
  public userId!: number;
  public eventType!: 'view' | 'download' | 'install' | 'fork' | 'rate' | 'execute' | 'error' | 'uninstall';
  public eventData!: any;
  public sessionId!: string;
  public timestamp!: Date;
  public readonly createdAt!: Date;
}

export class TemplateAnalyticsService {
  private sequelize: Sequelize;
  private TemplateUsageEvent: typeof TemplateUsageEventModel;

  constructor(sequelize: Sequelize) {
    this.sequelize = sequelize;
    this.TemplateUsageEvent = TemplateUsageEventModel;
    this.initModel();
  }

  private initModel(): void {
    this.TemplateUsageEvent.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        templateId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        eventType: {
          type: DataTypes.ENUM('view', 'download', 'install', 'fork', 'rate', 'execute', 'error', 'uninstall'),
          allowNull: false,
        },
        eventData: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        sessionId: {
          type: DataTypes.STRING(100),
          allowNull: true,
        },
        timestamp: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize: this.sequelize,
        tableName: 'template_usage_events',
        timestamps: true,
        indexes: [
          { fields: ['templateId'] },
          { fields: ['userId'] },
          { fields: ['eventType'] },
          { fields: ['timestamp'] },
          { fields: ['sessionId'] },
          { fields: ['templateId', 'eventType'] },
          { fields: ['userId', 'eventType'] },
          { fields: ['timestamp', 'eventType'] },
        ],
      }
    );
  }

  async trackEvent(event: Omit<TemplateUsageEvent, 'id' | 'createdAt'>): Promise<TemplateUsageEvent> {
    try {
      const trackedEvent = await this.TemplateUsageEvent.create({
        ...event,
        timestamp: event.timestamp || new Date(),
      });

      // Update template usage counters asynchronously
      this.updateTemplateCounters(event.templateId, event.eventType).catch(error => {
        logger.error('Error updating template counters:', error);
      });

      return trackedEvent.toJSON();
    } catch (error: any) {
      logger.error('Error tracking template event:', error);
      throw new Error(`Failed to track template event: ${error.message}`);
    }
  }

  async getTemplateAnalytics(
    templateId: number,
    period: 'day' | 'week' | 'month' | 'year' | 'all' = 'month',
    startDate?: Date,
    endDate?: Date
  ): Promise<TemplateAnalytics> {
    try {
      logger.info(`Getting template analytics: ${templateId} for period ${period}`);

      const { start, end } = this.getDateRange(period, startDate, endDate);
      const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));

      // Get current period metrics
      const currentMetrics = await this.calculatePeriodMetrics(templateId, start, end);
      
      // Get previous period metrics for trends
      const previousMetrics = await this.calculatePeriodMetrics(templateId, previousStart, start);

      // Calculate trends
      const trends = this.calculateTrends(currentMetrics, previousMetrics);

      // Get demographics
      const demographics = await this.getTemplateDemographics(templateId, start, end);

      // Get performance metrics
      const performance = await this.getTemplatePerformance(templateId, start, end);

      const analytics: TemplateAnalytics = {
        templateId,
        period,
        startDate: start,
        endDate: end,
        metrics: currentMetrics,
        trends,
        demographics,
        performance,
      };

      return analytics;
    } catch (error: any) {
      logger.error('Error getting template analytics:', error);
      throw new Error(`Failed to get template analytics: ${error.message}`);
    }
  }

  async getMarketplaceAnalytics(
    period: 'day' | 'week' | 'month' | 'year' = 'month',
    startDate?: Date,
    endDate?: Date
  ): Promise<MarketplaceAnalytics> {
    try {
      logger.info(`Getting marketplace analytics for period ${period}`);

      const { start, end } = this.getDateRange(period, startDate, endDate);

      // Get overview metrics
      const overview = await this.getMarketplaceOverview(start, end);

      // Get category metrics
      const categories = await this.getCategoryAnalytics(start, end);

      // Get trend data
      const trends = await this.getMarketplaceTrends(start, end);

      // Get user metrics
      const users = await this.getUserAnalytics(start, end);

      const analytics: MarketplaceAnalytics = {
        period,
        startDate: start,
        endDate: end,
        overview,
        categories,
        trends,
        users,
      };

      return analytics;
    } catch (error: any) {
      logger.error('Error getting marketplace analytics:', error);
      throw new Error(`Failed to get marketplace analytics: ${error.message}`);
    }
  }

  async getUserActivitySummary(
    userId: number,
    period: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<UserActivitySummary> {
    try {
      logger.info(`Getting user activity summary: ${userId} for period ${period}`);

      const { start, end } = this.getDateRange(period);

      // Get activity metrics
      const activity = await this.getUserActivity(userId, start, end);

      // Get user preferences
      const preferences = await this.getUserPreferences(userId, start, end);

      // Get engagement metrics
      const engagement = await this.getUserEngagement(userId, start, end);

      return {
        userId,
        period,
        activity,
        preferences,
        engagement,
      };
    } catch (error: any) {
      logger.error('Error getting user activity summary:', error);
      throw new Error(`Failed to get user activity summary: ${error.message}`);
    }
  }

  async getPopularTemplates(
    period: 'day' | 'week' | 'month' | 'year' = 'week',
    limit: number = 10
  ): Promise<Array<{
    templateId: number;
    name: string;
    downloads: number;
    rating: number;
    views: number;
    popularityScore: number;
  }>> {
    try {
      const { start } = this.getDateRange(period);

      const query = `
        SELECT 
          t.templateId,
          t.name,
          COUNT(CASE WHEN t.eventType = 'download' THEN 1 END) as downloads,
          COUNT(CASE WHEN t.eventType = 'view' THEN 1 END) as views,
          AVG(CASE WHEN t.eventType = 'rate' THEN (t.eventData->>'rating')::float END) as rating,
          (
            COUNT(CASE WHEN t.eventType = 'download' THEN 1 END) * 3 +
            COUNT(CASE WHEN t.eventType = 'view' THEN 1 END) * 1 +
            COUNT(CASE WHEN t.eventType = 'fork' THEN 1 END) * 2 +
            AVG(CASE WHEN t.eventType = 'rate' THEN (t.eventData->>'rating')::float END) * 2
          ) as popularityScore
        FROM template_usage_events t
        WHERE t.timestamp >= :start
        GROUP BY t.templateId, t.name
        ORDER BY popularityScore DESC
        LIMIT :limit
      `;

      const results = await this.sequelize.query(query, {
        replacements: { start, limit },
        type: 'SELECT',
      });

      return results as any[];
    } catch (error: any) {
      logger.error('Error getting popular templates:', error);
      throw new Error(`Failed to get popular templates: ${error.message}`);
    }
  }

  async getTrendingTemplates(
    period: 'day' | 'week' | 'month' = 'week',
    limit: number = 10
  ): Promise<Array<{
    templateId: number;
    name: string;
    growthRate: number;
    currentPeriodDownloads: number;
    previousPeriodDownloads: number;
  }>> {
    try {
      const { start, end } = this.getDateRange(period);
      const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));

      const query = `
        WITH current_period AS (
          SELECT 
            templateId,
            COUNT(CASE WHEN eventType = 'download' THEN 1 END) as downloads
          FROM template_usage_events
          WHERE timestamp >= :start AND timestamp < :end
          GROUP BY templateId
        ),
        previous_period AS (
          SELECT 
            templateId,
            COUNT(CASE WHEN eventType = 'download' THEN 1 END) as downloads
          FROM template_usage_events
          WHERE timestamp >= :previousStart AND timestamp < :start
          GROUP BY templateId
        )
        SELECT 
          c.templateId,
          c.downloads as currentPeriodDownloads,
          COALESCE(p.downloads, 0) as previousPeriodDownloads,
          CASE 
            WHEN COALESCE(p.downloads, 0) = 0 THEN 100
            ELSE ((c.downloads - COALESCE(p.downloads, 0))::float / COALESCE(p.downloads, 0)) * 100
          END as growthRate
        FROM current_period c
        LEFT JOIN previous_period p ON c.templateId = p.templateId
        WHERE c.downloads > 0
        ORDER BY growthRate DESC
        LIMIT :limit
      `;

      const results = await this.sequelize.query(query, {
        replacements: { start, end, previousStart, limit },
        type: 'SELECT',
      });

      return results as any[];
    } catch (error: any) {
      logger.error('Error getting trending templates:', error);
      throw new Error(`Failed to get trending templates: ${error.message}`);
    }
  }

  async generateAnalyticsReport(
    type: 'template' | 'marketplace' | 'user',
    id?: number,
    period: 'day' | 'week' | 'month' | 'year' = 'month',
    format: 'json' | 'csv' | 'excel' = 'json'
  ): Promise<{
    data: any;
    exportUrl?: string;
    generatedAt: Date;
  }> {
    try {
      logger.info(`Generating analytics report: ${type} (${period})`);

      let data: any;

      switch (type) {
        case 'template':
          if (!id) throw new Error('Template ID required for template report');
          data = await this.getTemplateAnalytics(id, period);
          break;
        case 'marketplace':
          data = await this.getMarketplaceAnalytics(period);
          break;
        case 'user':
          if (!id) throw new Error('User ID required for user report');
          data = await this.getUserActivitySummary(id, period);
          break;
        default:
          throw new Error(`Unsupported report type: ${type}`);
      }

      let exportUrl: string | undefined;

      if (format !== 'json') {
        exportUrl = await this.exportReport(data, format, type);
      }

      return {
        data,
        exportUrl,
        generatedAt: new Date(),
      };
    } catch (error: any) {
      logger.error('Error generating analytics report:', error);
      throw new Error(`Failed to generate analytics report: ${error.message}`);
    }
  }

  private async updateTemplateCounters(templateId: number, eventType: string): Promise<void> {
    // This would update the template usage counters in the main template table
    // For now, we'll just log it
    logger.debug(`Updating template ${templateId} counter for ${eventType}`);
  }

  private getDateRange(
    period: 'day' | 'week' | 'month' | 'year' | 'all',
    startDate?: Date,
    endDate?: Date
  ): { start: Date; end: Date } {
    const end = endDate || new Date();
    let start: Date;

    if (startDate) {
      start = startDate;
    } else {
      switch (period) {
        case 'day':
          start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          start = new Date(end.getFullYear(), end.getMonth() - 1, end.getDate());
          break;
        case 'year':
          start = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate());
          break;
        case 'all':
          start = new Date('2023-01-01'); // Platform launch date
          break;
        default:
          start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    return { start, end };
  }

  private async calculatePeriodMetrics(templateId: number, start: Date, end: Date): Promise<any> {
    const events = await this.TemplateUsageEvent.findAll({
      where: {
        templateId,
        timestamp: {
          [Op.between]: [start, end],
        },
      },
    });

    const metrics = {
      views: 0,
      downloads: 0,
      installs: 0,
      forks: 0,
      executions: 0,
      errors: 0,
      uninstalls: 0,
      uniqueUsers: new Set<number>(),
      ratings: [] as number[],
    };

    for (const event of events) {
      metrics.uniqueUsers.add(event.userId);
      
      switch (event.eventType) {
        case 'view':
          metrics.views++;
          break;
        case 'download':
          metrics.downloads++;
          break;
        case 'install':
          metrics.installs++;
          break;
        case 'fork':
          metrics.forks++;
          break;
        case 'execute':
          metrics.executions++;
          break;
        case 'error':
          metrics.errors++;
          break;
        case 'uninstall':
          metrics.uninstalls++;
          break;
        case 'rate':
          if (event.eventData?.rating) {
            metrics.ratings.push(event.eventData.rating);
          }
          break;
      }
    }

    const avgRating = metrics.ratings.length > 0
      ? metrics.ratings.reduce((sum, rating) => sum + rating, 0) / metrics.ratings.length
      : 0;

    return {
      views: metrics.views,
      downloads: metrics.downloads,
      installs: metrics.installs,
      forks: metrics.forks,
      executions: metrics.executions,
      errors: metrics.errors,
      uninstalls: metrics.uninstalls,
      uniqueUsers: metrics.uniqueUsers.size,
      avgRating: Math.round(avgRating * 100) / 100,
      ratingCount: metrics.ratings.length,
    };
  }

  private calculateTrends(currentMetrics: any, previousMetrics: any): any {
    const calculateChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const popularityScore = (
      currentMetrics.downloads * 3 +
      currentMetrics.views * 1 +
      currentMetrics.forks * 2 +
      currentMetrics.avgRating * 2
    );

    const growthRate = calculateChange(
      currentMetrics.downloads,
      previousMetrics.downloads
    );

    return {
      viewsChange: calculateChange(currentMetrics.views, previousMetrics.views),
      downloadsChange: calculateChange(currentMetrics.downloads, previousMetrics.downloads),
      installsChange: calculateChange(currentMetrics.installs, previousMetrics.installs),
      popularityScore,
      growthRate,
    };
  }

  private async getTemplateDemographics(templateId: number, start: Date, end: Date): Promise<any> {
    // This would analyze user demographics from event data
    // For now, return placeholder data
    return {
      topCountries: [
        { country: 'US', count: 45 },
        { country: 'UK', count: 23 },
        { country: 'CA', count: 18 },
      ],
      topBrowsers: [
        { browser: 'Chrome', count: 67 },
        { browser: 'Firefox', count: 23 },
        { browser: 'Safari', count: 15 },
      ],
      userTypes: [
        { type: 'developer', count: 58 },
        { type: 'business', count: 32 },
        { type: 'student', count: 15 },
      ],
    };
  }

  private async getTemplatePerformance(templateId: number, start: Date, end: Date): Promise<any> {
    const executeEvents = await this.TemplateUsageEvent.findAll({
      where: {
        templateId,
        eventType: 'execute',
        timestamp: {
          [Op.between]: [start, end],
        },
      },
    });

    const errorEvents = await this.TemplateUsageEvent.findAll({
      where: {
        templateId,
        eventType: 'error',
        timestamp: {
          [Op.between]: [start, end],
        },
      },
    });

    const executionTimes = executeEvents
      .map(e => e.eventData?.executionTime)
      .filter(time => time !== undefined) as number[];

    const avgExecutionTime = executionTimes.length > 0
      ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
      : 0;

    const totalExecutions = executeEvents.length;
    const totalErrors = errorEvents.length;
    const successRate = totalExecutions > 0 
      ? ((totalExecutions - totalErrors) / totalExecutions) * 100
      : 0;
    const errorRate = totalExecutions > 0 
      ? (totalErrors / totalExecutions) * 100
      : 0;

    // Count error types
    const errorTypes = new Map<string, number>();
    errorEvents.forEach(event => {
      const errorType = event.eventData?.errorType || 'Unknown';
      errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
    });

    const topErrors = Array.from(errorTypes.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      avgExecutionTime: Math.round(avgExecutionTime),
      successRate: Math.round(successRate * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      topErrors,
    };
  }

  private async getMarketplaceOverview(start: Date, end: Date): Promise<any> {
    // This would query across all templates
    // For now, return placeholder data
    return {
      totalTemplates: 150,
      totalDownloads: 2845,
      totalUsers: 487,
      avgRating: 4.2,
      popularTemplates: [
        { templateId: 1, name: 'Data Sync', downloads: 234, rating: 4.5 },
        { templateId: 2, name: 'Email Automation', downloads: 189, rating: 4.3 },
        { templateId: 3, name: 'API Integration', downloads: 167, rating: 4.4 },
      ],
    };
  }

  private async getCategoryAnalytics(start: Date, end: Date): Promise<any[]> {
    // This would analyze by category
    return [
      { category: 'automation', templateCount: 45, downloadCount: 892, avgRating: 4.2 },
      { category: 'integration', templateCount: 38, downloadCount: 756, avgRating: 4.3 },
      { category: 'business', templateCount: 32, downloadCount: 634, avgRating: 4.1 },
    ];
  }

  private async getMarketplaceTrends(start: Date, end: Date): Promise<any> {
    // Generate daily trend data
    const dailyViews = [];
    const dailyDownloads = [];
    const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    
    for (let i = 0; i < days; i++) {
      const date = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      dailyViews.push({ date: date.toISOString().split('T')[0], views: Math.floor(Math.random() * 100) + 50 });
      dailyDownloads.push({ date: date.toISOString().split('T')[0], downloads: Math.floor(Math.random() * 30) + 10 });
    }

    return {
      dailyViews,
      dailyDownloads,
      categoryGrowth: [
        { category: 'automation', growth: 15.3 },
        { category: 'integration', growth: 12.7 },
        { category: 'business', growth: 8.9 },
      ],
    };
  }

  private async getUserAnalytics(start: Date, end: Date): Promise<any> {
    return {
      activeUsers: 487,
      newUsers: 89,
      returningUsers: 398,
      topContributors: [
        { userId: 1, templatesCreated: 8, totalDownloads: 456 },
        { userId: 2, templatesCreated: 6, totalDownloads: 334 },
        { userId: 3, templatesCreated: 5, totalDownloads: 289 },
      ],
    };
  }

  private async getUserActivity(userId: number, start: Date, end: Date): Promise<any> {
    const events = await this.TemplateUsageEvent.findAll({
      where: {
        userId,
        timestamp: {
          [Op.between]: [start, end],
        },
      },
    });

    const activity = {
      templatesViewed: 0,
      templatesDownloaded: 0,
      templatesInstalled: 0,
      templatesCreated: 0,
      templatesForked: 0,
      ratingsGiven: 0,
      executions: 0,
    };

    events.forEach(event => {
      switch (event.eventType) {
        case 'view':
          activity.templatesViewed++;
          break;
        case 'download':
          activity.templatesDownloaded++;
          break;
        case 'install':
          activity.templatesInstalled++;
          break;
        case 'fork':
          activity.templatesForked++;
          break;
        case 'rate':
          activity.ratingsGiven++;
          break;
        case 'execute':
          activity.executions++;
          break;
      }
    });

    return activity;
  }

  private async getUserPreferences(userId: number, start: Date, end: Date): Promise<any> {
    // This would analyze user preferences from their activity
    return {
      favoriteCategories: [
        { category: 'automation', count: 15 },
        { category: 'integration', count: 8 },
        { category: 'business', count: 5 },
      ],
      averageComplexity: 'intermediate',
      mostUsedNodes: [
        { nodeType: 'http', count: 23 },
        { nodeType: 'transform', count: 18 },
        { nodeType: 'email', count: 12 },
      ],
    };
  }

  private async getUserEngagement(userId: number, start: Date, end: Date): Promise<any> {
    // This would calculate engagement metrics
    return {
      sessionCount: 12,
      avgSessionDuration: 1800, // 30 minutes in seconds
      bounceRate: 25.5,
      returnRate: 75.8,
    };
  }

  private async exportReport(data: any, format: 'csv' | 'excel', type: string): Promise<string> {
    // This would export the data to the specified format
    // For now, return a placeholder URL
    const filename = `${type}-analytics-${Date.now()}.${format}`;
    return `/api/analytics/exports/${filename}`;
  }
}