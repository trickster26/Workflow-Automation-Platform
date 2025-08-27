import { INodeType, INodeExecuteFunctions } from '../NodeRegistry';
import { INodeTypeDescription } from '../../types/workflow.types';

export class AnalyticsNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Analytics',
    name: 'analytics',
    group: ['analytics', 'transform'],
    version: 1,
    description: 'Perform data analysis, statistics, visualization, and insights generation',
    defaults: {
      name: 'Analytics',
      color: '#1f77b4',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        name: 'analysisType',
        displayName: 'Analysis Type',
        type: 'options',
        options: [
          { name: 'Descriptive Statistics', value: 'descriptive' },
          { name: 'Statistical Analysis', value: 'statistical' },
          { name: 'Data Visualization', value: 'visualization' },
          { name: 'Aggregation', value: 'aggregation' },
          { name: 'Data Filtering', value: 'filtering' },
          { name: 'Correlation Analysis', value: 'correlation' },
          { name: 'Forecasting', value: 'forecasting' },
          { name: 'Clustering', value: 'clustering' },
        ],
        default: 'descriptive',
        description: 'Type of analytics operation to perform',
      },
      {
        name: 'dataField',
        displayName: 'Data Field',
        type: 'string',
        default: 'data',
        required: true,
        description: 'Field containing the data to analyze',
      },
      {
        name: 'outputField',
        displayName: 'Output Field',
        type: 'string',
        default: 'analyticsResult',
        description: 'Field to store the analysis result',
      },
      {
        name: 'columns',
        displayName: 'Columns to Analyze',
        type: 'string',
        default: '',
        description: 'Comma-separated list of columns (leave empty for all)',
      },
      {
        name: 'groupBy',
        displayName: 'Group By',
        type: 'string',
        default: '',
        description: 'Column to group data by (for aggregation)',
      },
      {
        name: 'aggregateFunction',
        displayName: 'Aggregate Function',
        type: 'options',
        options: [
          { name: 'Sum', value: 'sum' },
          { name: 'Average', value: 'avg' },
          { name: 'Count', value: 'count' },
          { name: 'Min', value: 'min' },
          { name: 'Max', value: 'max' },
          { name: 'Median', value: 'median' },
          { name: 'Standard Deviation', value: 'stddev' },
        ],
        default: 'sum',
        description: 'Function to use for aggregation',
      },
      {
        name: 'filterCondition',
        displayName: 'Filter Condition',
        type: 'string',
        default: '',
        description: 'JavaScript expression to filter data (e.g., "value > 100")',
      },
      {
        name: 'chartType',
        displayName: 'Chart Type',
        type: 'options',
        options: [
          { name: 'Bar Chart', value: 'bar' },
          { name: 'Line Chart', value: 'line' },
          { name: 'Pie Chart', value: 'pie' },
          { name: 'Scatter Plot', value: 'scatter' },
          { name: 'Histogram', value: 'histogram' },
          { name: 'Heatmap', value: 'heatmap' },
        ],
        default: 'bar',
        description: 'Type of chart to generate',
      },
      {
        name: 'forecastPeriods',
        displayName: 'Forecast Periods',
        type: 'number',
        default: 12,
        description: 'Number of periods to forecast',
      },
      {
        name: 'clusterCount',
        displayName: 'Number of Clusters',
        type: 'number',
        default: 3,
        description: 'Number of clusters for clustering analysis',
      },
      {
        name: 'exportFormat',
        displayName: 'Export Format',
        type: 'options',
        options: [
          { name: 'JSON', value: 'json' },
          { name: 'CSV', value: 'csv' },
          { name: 'Excel', value: 'xlsx' },
          { name: 'PDF Report', value: 'pdf' },
        ],
        default: 'json',
        description: 'Format for exporting results',
      },
      {
        name: 'includeVisualization',
        displayName: 'Include Visualization',
        type: 'boolean',
        default: true,
        description: 'Generate charts and visual representations',
      },
      {
        name: 'includeInsights',
        displayName: 'Generate Insights',
        type: 'boolean',
        default: true,
        description: 'Generate automated insights and recommendations',
      },
    ],
  };

  async execute(this: INodeExecuteFunctions): Promise<any[]> {
    const items = this.getInputData();
    const returnData = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      try {
        const analysisType = this.getNodeParameter('analysisType', i) as string;
        const dataField = this.getNodeParameter('dataField', i) as string;
        const outputField = this.getNodeParameter('outputField', i) as string;
        const columns = this.getNodeParameter('columns', i) as string;
        const groupBy = this.getNodeParameter('groupBy', i) as string;
        const aggregateFunction = this.getNodeParameter('aggregateFunction', i) as string;
        const filterCondition = this.getNodeParameter('filterCondition', i) as string;
        const chartType = this.getNodeParameter('chartType', i) as string;
        const forecastPeriods = this.getNodeParameter('forecastPeriods', i) as number;
        const clusterCount = this.getNodeParameter('clusterCount', i) as number;
        const exportFormat = this.getNodeParameter('exportFormat', i) as string;
        const includeVisualization = this.getNodeParameter('includeVisualization', i) as boolean;
        const includeInsights = this.getNodeParameter('includeInsights', i) as boolean;

        const data = item.json[dataField];
        if (!data) {
          throw new Error(`Data field "${dataField}" not found in item`);
        }

        let processedData = Array.isArray(data) ? data : [data];

        // Apply filter if specified
        if (filterCondition && filterCondition.trim()) {
          processedData = this.filterData(processedData, filterCondition);
        }

        // Select specific columns if specified
        if (columns && columns.trim()) {
          const columnList = columns.split(',').map(col => col.trim());
          processedData = this.selectColumns(processedData, columnList);
        }

        let result: any = {};
        let visualization: any = null;
        let insights: string[] = [];

        switch (analysisType) {
          case 'descriptive':
            result = this.calculateDescriptiveStats(processedData);
            if (includeInsights) {
              insights = this.generateDescriptiveInsights(result);
            }
            break;

          case 'statistical':
            result = this.performStatisticalAnalysis(processedData);
            if (includeInsights) {
              insights = this.generateStatisticalInsights(result);
            }
            break;

          case 'visualization':
            result = this.prepareVisualizationData(processedData, chartType);
            if (includeVisualization) {
              visualization = this.generateVisualization(result, chartType);
            }
            break;

          case 'aggregation':
            result = this.performAggregation(processedData, groupBy, aggregateFunction);
            if (includeInsights) {
              insights = this.generateAggregationInsights(result, groupBy, aggregateFunction);
            }
            break;

          case 'filtering':
            result = {
              originalCount: data.length,
              filteredCount: processedData.length,
              filteredData: processedData,
              condition: filterCondition
            };
            break;

          case 'correlation':
            result = this.calculateCorrelations(processedData);
            if (includeInsights) {
              insights = this.generateCorrelationInsights(result);
            }
            break;

          case 'forecasting':
            result = this.performForecasting(processedData, forecastPeriods);
            if (includeVisualization) {
              visualization = this.generateForecastVisualization(result);
            }
            break;

          case 'clustering':
            result = this.performClustering(processedData, clusterCount);
            if (includeVisualization) {
              visualization = this.generateClusterVisualization(result);
            }
            break;

          default:
            throw new Error(`Unsupported analysis type: ${analysisType}`);
        }

        const analyticsResult: any = {
          analysisType,
          timestamp: new Date().toISOString(),
          dataPoints: processedData.length,
          result,
          ...(visualization && { visualization }),
          ...(insights.length > 0 && { insights }),
          exportFormat,
        };

        returnData.push({
          json: {
            ...item.json,
            [outputField]: analyticsResult
          }
        });

      } catch (error) {
        if (this.continueOnFail && this.continueOnFail()) {
          returnData.push({
            json: {
              ...item.json,
              analyticsResult: {
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
                analysisType: this.getNodeParameter('analysisType', i),
              }
            }
          });
        } else {
          throw error;
        }
      }
    }

    return returnData;
  }

  private filterData(data: any[], condition: string): any[] {
    try {
      return data.filter(item => {
        try {
          const func = new Function('item', `return ${condition}`);
          return Boolean(func(item));
        } catch {
          return false;
        }
      });
    } catch {
      return data;
    }
  }

  private selectColumns(data: any[], columns: string[]): any[] {
    return data.map(item => {
      const filtered: any = {};
      columns.forEach(col => {
        if (item.hasOwnProperty(col)) {
          filtered[col] = item[col];
        }
      });
      return filtered;
    });
  }

  private calculateDescriptiveStats(data: any[]): any {
    if (data.length === 0) return {};

    const numericColumns = this.getNumericColumns(data);
    const stats: any = {};

    numericColumns.forEach(column => {
      const values = data.map(item => Number(item[column])).filter(val => !isNaN(val));
      if (values.length > 0) {
        stats[column] = {
          count: values.length,
          sum: values.reduce((a, b) => a + b, 0),
          mean: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          median: this.calculateMedian(values),
          stddev: this.calculateStdDev(values),
        };
      }
    });

    return stats;
  }

  private performStatisticalAnalysis(data: any[]): any {
    const stats = this.calculateDescriptiveStats(data);
    const numericColumns = Object.keys(stats);
    
    return {
      descriptiveStats: stats,
      correlations: numericColumns.length > 1 ? this.calculateCorrelations(data) : null,
      distribution: this.analyzeDistribution(data),
      outliers: this.detectOutliers(data),
    };
  }

  private prepareVisualizationData(data: any[], chartType: string): any {
    return {
      data,
      chartType,
      summary: {
        totalRecords: data.length,
        columns: Object.keys(data[0] || {}),
        numericColumns: this.getNumericColumns(data),
      }
    };
  }

  private generateVisualization(data: any, chartType: string): any {
    return {
      type: chartType,
      config: {
        title: `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`,
        data: data.data,
        timestamp: new Date().toISOString(),
      }
    };
  }

  private performAggregation(data: any[], groupBy: string, aggregateFunction: string): any {
    if (!groupBy) {
      return this.applyAggregateFunction(data, aggregateFunction);
    }

    const grouped = data.reduce((groups, item) => {
      const key = item[groupBy];
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {} as any);

    const result: any = {};
    Object.keys(grouped).forEach(key => {
      result[key] = this.applyAggregateFunction(grouped[key], aggregateFunction);
    });

    return result;
  }

  private calculateCorrelations(data: any[]): any {
    const numericColumns = this.getNumericColumns(data);
    const correlations: any = {};

    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = i + 1; j < numericColumns.length; j++) {
        const col1 = numericColumns[i];
        const col2 = numericColumns[j];
        const correlation = this.pearsonCorrelation(data, col1, col2);
        correlations[`${col1}_${col2}`] = correlation;
      }
    }

    return correlations;
  }

  private performForecasting(data: any[], periods: number): any {
    // Simple moving average forecast
    const numericColumns = this.getNumericColumns(data);
    const forecasts: any = {};

    numericColumns.forEach(column => {
      const values = data.map(item => Number(item[column])).filter(val => !isNaN(val));
      if (values.length >= 3) {
        const windowSize = Math.min(5, Math.floor(values.length / 2));
        const forecast = [];
        
        for (let i = 0; i < periods; i++) {
          const recent = values.slice(-windowSize);
          const predicted = recent.reduce((a, b) => a + b, 0) / recent.length;
          forecast.push(predicted);
          values.push(predicted);
        }
        
        forecasts[column] = forecast;
      }
    });

    return {
      method: 'moving_average',
      periods,
      forecasts,
      timestamp: new Date().toISOString(),
    };
  }

  private performClustering(data: any[], clusterCount: number): any {
    // Simple k-means clustering implementation
    const numericColumns = this.getNumericColumns(data);
    if (numericColumns.length === 0) {
      throw new Error('No numeric columns found for clustering');
    }

    const points = data.map(item => 
      numericColumns.map(col => Number(item[col]) || 0)
    );

    // Initialize centroids randomly
    const centroids = Array.from({ length: clusterCount }, () =>
      Array.from({ length: numericColumns.length }, () => Math.random())
    );

    // Simple k-means iterations (simplified)
    const assignments = points.map(() => 0);
    
    for (let iter = 0; iter < 10; iter++) {
      // Assign points to nearest centroid
      points.forEach((point, i) => {
        let minDist = Infinity;
        let bestCluster = 0;
        
        centroids.forEach((centroid, j) => {
          const dist = this.euclideanDistance(point, centroid);
          if (dist < minDist) {
            minDist = dist;
            bestCluster = j;
          }
        });
        
        assignments[i] = bestCluster;
      });
    }

    return {
      method: 'k_means',
      clusterCount,
      assignments,
      centroids,
      clusters: this.groupByClusters(data, assignments, clusterCount),
    };
  }

  private getNumericColumns(data: any[]): string[] {
    if (data.length === 0) return [];
    
    const sample = data[0];
    return Object.keys(sample).filter(key => 
      typeof sample[key] === 'number' || 
      (typeof sample[key] === 'string' && !isNaN(Number(sample[key])))
    );
  }

  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  private calculateStdDev(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private applyAggregateFunction(data: any[], func: string): any {
    const numericColumns = this.getNumericColumns(data);
    const result: any = {};

    numericColumns.forEach(column => {
      const values = data.map(item => Number(item[column])).filter(val => !isNaN(val));
      
      switch (func) {
        case 'sum':
          result[column] = values.reduce((a, b) => a + b, 0);
          break;
        case 'avg':
          result[column] = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'count':
          result[column] = values.length;
          break;
        case 'min':
          result[column] = Math.min(...values);
          break;
        case 'max':
          result[column] = Math.max(...values);
          break;
        case 'median':
          result[column] = this.calculateMedian(values);
          break;
        case 'stddev':
          result[column] = this.calculateStdDev(values);
          break;
      }
    });

    return result;
  }

  private pearsonCorrelation(data: any[], col1: string, col2: string): number {
    const pairs = data.map(item => [Number(item[col1]), Number(item[col2])])
                     .filter(([a, b]) => !isNaN(a) && !isNaN(b));
    
    if (pairs.length < 2) return 0;

    const n = pairs.length;
    const sum1 = pairs.reduce((sum, [a]) => sum + a, 0);
    const sum2 = pairs.reduce((sum, [, b]) => sum + b, 0);
    const sum1Sq = pairs.reduce((sum, [a]) => sum + a * a, 0);
    const sum2Sq = pairs.reduce((sum, [, b]) => sum + b * b, 0);
    const pSum = pairs.reduce((sum, [a, b]) => sum + a * b, 0);

    const num = pSum - (sum1 * sum2 / n);
    const den = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));

    return den === 0 ? 0 : num / den;
  }

  private euclideanDistance(point1: number[], point2: number[]): number {
    return Math.sqrt(
      point1.reduce((sum, val, i) => sum + Math.pow(val - point2[i], 2), 0)
    );
  }

  private groupByClusters(data: any[], assignments: number[], clusterCount: number): any {
    const clusters: any = {};
    
    for (let i = 0; i < clusterCount; i++) {
      clusters[i] = [];
    }
    
    data.forEach((item, index) => {
      clusters[assignments[index]].push(item);
    });
    
    return clusters;
  }

  private analyzeDistribution(data: any[]): any {
    const numericColumns = this.getNumericColumns(data);
    const distributions: any = {};

    numericColumns.forEach(column => {
      const values = data.map(item => Number(item[column])).filter(val => !isNaN(val));
      const sorted = [...values].sort((a, b) => a - b);
      
      distributions[column] = {
        skewness: this.calculateSkewness(values),
        kurtosis: this.calculateKurtosis(values),
        quartiles: {
          q1: this.calculatePercentile(sorted, 25),
          q2: this.calculatePercentile(sorted, 50),
          q3: this.calculatePercentile(sorted, 75),
        }
      };
    });

    return distributions;
  }

  private detectOutliers(data: any[]): any {
    const numericColumns = this.getNumericColumns(data);
    const outliers: any = {};

    numericColumns.forEach(column => {
      const values = data.map(item => Number(item[column])).filter(val => !isNaN(val));
      const sorted = [...values].sort((a, b) => a - b);
      
      const q1 = this.calculatePercentile(sorted, 25);
      const q3 = this.calculatePercentile(sorted, 75);
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      outliers[column] = values.filter(val => val < lowerBound || val > upperBound);
    });

    return outliers;
  }

  private calculateSkewness(values: number[]): number {
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const stdDev = this.calculateStdDev(values);
    
    const sum = values.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 3), 0);
    return (n / ((n - 1) * (n - 2))) * sum;
  }

  private calculateKurtosis(values: number[]): number {
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const stdDev = this.calculateStdDev(values);
    
    const sum = values.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 4), 0);
    return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  private generateDescriptiveInsights(stats: any): string[] {
    const insights: string[] = [];
    
    Object.keys(stats).forEach(column => {
      const stat = stats[column];
      insights.push(`Column "${column}" has a mean of ${stat.mean.toFixed(2)} with standard deviation of ${stat.stddev.toFixed(2)}`);
      
      if (stat.stddev / stat.mean > 0.5) {
        insights.push(`Column "${column}" shows high variability`);
      }
    });

    return insights;
  }

  private generateStatisticalInsights(analysis: any): string[] {
    const insights: string[] = [];
    
    if (analysis.correlations) {
      Object.keys(analysis.correlations).forEach(pair => {
        const correlation = analysis.correlations[pair];
        if (Math.abs(correlation) > 0.7) {
          insights.push(`Strong correlation detected between ${pair.replace('_', ' and ')}: ${correlation.toFixed(3)}`);
        }
      });
    }

    if (analysis.outliers) {
      Object.keys(analysis.outliers).forEach(column => {
        const outlierCount = analysis.outliers[column].length;
        if (outlierCount > 0) {
          insights.push(`${outlierCount} outliers detected in column "${column}"`);
        }
      });
    }

    return insights;
  }

  private generateAggregationInsights(result: any, groupBy: string, func: string): string[] {
    const insights: string[] = [];
    
    if (groupBy) {
      const groups = Object.keys(result);
      insights.push(`Data aggregated into ${groups.length} groups by "${groupBy}" using ${func} function`);
      
      // Find top performing group
      const values = Object.values(result);
      if (values.length > 0 && typeof values[0] === 'object') {
        const firstColumn = Object.keys(values[0] as any)[0];
        if (firstColumn) {
          const topGroup = groups.reduce((top, group) => 
            (result[group][firstColumn] > result[top][firstColumn]) ? group : top
          );
          insights.push(`Highest ${func} value found in group: "${topGroup}"`);
        }
      }
    }

    return insights;
  }

  private generateCorrelationInsights(correlations: any): string[] {
    const insights: string[] = [];
    
    const strongCorrelations = Object.keys(correlations).filter(pair => 
      Math.abs(correlations[pair]) > 0.7
    );

    if (strongCorrelations.length > 0) {
      insights.push(`Found ${strongCorrelations.length} strong correlations in the data`);
      strongCorrelations.forEach(pair => {
        const correlation = correlations[pair];
        const strength = correlation > 0 ? 'positive' : 'negative';
        insights.push(`${strength.charAt(0).toUpperCase() + strength.slice(1)} correlation: ${pair.replace('_', ' and ')} (${correlation.toFixed(3)})`);
      });
    } else {
      insights.push('No strong correlations detected between variables');
    }

    return insights;
  }

  private generateForecastVisualization(forecast: any): any {
    return {
      type: 'line',
      config: {
        title: 'Forecast Results',
        data: forecast,
        timestamp: new Date().toISOString(),
      }
    };
  }

  private generateClusterVisualization(clusters: any): any {
    return {
      type: 'scatter',
      config: {
        title: 'Cluster Analysis',
        data: clusters,
        timestamp: new Date().toISOString(),
      }
    };
  }
}