import jsonpath from 'jsonpath';
import _ from 'lodash';
import { evaluate as mathEvaluate } from 'mathjs';
import moment from 'moment';
import { createLogger } from '../utils/logger';

export interface TransformOperation {
  id: string;
  type: 'jsonpath' | 'lodash' | 'javascript' | 'math' | 'template' | 'mapping' | 'filter' | 'sort' | 'group' | 'aggregate';
  description: string;
  config: any;
  enabled: boolean;
}

export interface DataMapping {
  source: string; // JSONPath or lodash path
  target: string; // Target field path
  transform?: string; // Optional transformation function
  defaultValue?: any;
  required?: boolean;
}

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'exists';
  value?: any;
  pattern?: string; // For regex operator
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface GroupConfig {
  by: string | string[];
  aggregations?: {
    [key: string]: {
      field: string;
      operation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'first' | 'last';
    };
  };
}

export interface TransformResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    inputType: string;
    outputType: string;
    recordsProcessed: number;
    executionTime: number;
  };
}

export class AdvancedTransformService {
  private logger: Logger;

  constructor() {
    this.logger = createLogger('AdvancedTransformService');
  }

  async transformData(data: any, operations: TransformOperation[]): Promise<TransformResult> {
    const startTime = Date.now();
    let currentData = _.cloneDeep(data);
    const inputType = this.getDataType(data);
    let recordsProcessed = Array.isArray(data) ? data.length : 1;

    try {
      for (const operation of operations) {
        if (!operation.enabled) continue;

        this.logger.info(`Applying transformation: ${operation.type} - ${operation.description}`);
        
        switch (operation.type) {
          case 'jsonpath':
            currentData = await this.applyJsonPathOperation(currentData, operation.config);
            break;
          case 'lodash':
            currentData = await this.applyLodashOperation(currentData, operation.config);
            break;
          case 'javascript':
            currentData = await this.applyJavaScriptOperation(currentData, operation.config);
            break;
          case 'math':
            currentData = await this.applyMathOperation(currentData, operation.config);
            break;
          case 'template':
            currentData = await this.applyTemplateOperation(currentData, operation.config);
            break;
          case 'mapping':
            currentData = await this.applyMappingOperation(currentData, operation.config);
            break;
          case 'filter':
            currentData = await this.applyFilterOperation(currentData, operation.config);
            break;
          case 'sort':
            currentData = await this.applySortOperation(currentData, operation.config);
            break;
          case 'group':
            currentData = await this.applyGroupOperation(currentData, operation.config);
            break;
          case 'aggregate':
            currentData = await this.applyAggregateOperation(currentData, operation.config);
            break;
          default:
            throw new Error(`Unknown operation type: ${operation.type}`);
        }

        recordsProcessed = Array.isArray(currentData) ? currentData.length : 1;
      }

      const executionTime = Date.now() - startTime;
      const outputType = this.getDataType(currentData);

      return {
        success: true,
        data: currentData,
        metadata: {
          inputType,
          outputType,
          recordsProcessed,
          executionTime
        }
      };

    } catch (error) {
      this.logger.error('Data transformation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown transformation error'
      };
    }
  }

  private async applyJsonPathOperation(data: any, config: any): Promise<any> {
    const { query, mode = 'extract', target } = config;

    switch (mode) {
      case 'extract':
        return jsonpath.query(data, query);
      
      case 'filter':
        if (Array.isArray(data)) {
          return data.filter(item => {
            const result = jsonpath.query(item, query);
            return result.length > 0;
          });
        }
        throw new Error('Filter mode requires array input');
      
      case 'map':
        if (Array.isArray(data)) {
          return data.map(item => {
            const result = jsonpath.query(item, query);
            return result.length > 0 ? result[0] : null;
          });
        }
        throw new Error('Map mode requires array input');
      
      case 'set':
        if (!target) throw new Error('Set mode requires target path');
        const result = _.cloneDeep(data);
        jsonpath.apply(result, query, () => jsonpath.query(data, target)[0]);
        return result;
      
      default:
        throw new Error(`Unknown JSONPath mode: ${mode}`);
    }
  }

  private async applyLodashOperation(data: any, config: any): Promise<any> {
    const { method, args = [], path } = config;

    if (path) {
      // Apply lodash method to specific path
      const value = _.get(data, path);
      const result = _.cloneDeep(data);
      const transformedValue = ((_ as any)[method])(value, ...args);
      _.set(result, path, transformedValue);
      return result;
    } else {
      // Apply lodash method to entire data
      return ((_ as any)[method])(data, ...args);
    }
  }

  private async applyJavaScriptOperation(data: any, config: any): Promise<any> {
    const { code, context = {} } = config;

    try {
      // Create safe execution context
      const safeContext = {
        data,
        _: _, // lodash utilities
        moment, // date utilities
        JSON,
        Math,
        Date,
        Array,
        Object,
        String,
        Number,
        Boolean,
        RegExp,
        ...context
      };

      // Use Function constructor for execution
      const func = new Function(...Object.keys(safeContext), `
        try {
          ${code}
        } catch (error) {
          throw new Error('JavaScript execution failed: ' + error.message);
        }
      `);

      return func(...Object.values(safeContext));
    } catch (error) {
      throw new Error(`JavaScript operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async applyMathOperation(data: any, config: any): Promise<any> {
    const { expression, scope = {}, path } = config;

    try {
      if (path) {
        // Apply math to specific path
        const value = _.get(data, path);
        const result = _.cloneDeep(data);
        const mathResult = mathEvaluate(expression, { value, ...scope });
        _.set(result, path, mathResult);
        return result;
      } else {
        // Apply math to entire data (assuming data contains variables for expression)
        return mathEvaluate(expression, { ...data, ...scope });
      }
    } catch (error) {
      throw new Error(`Math operation failed: ${error instanceof Error ? error.message : 'Invalid expression'}`);
    }
  }

  private async applyTemplateOperation(data: any, config: any): Promise<any> {
    const { template, engine = 'handlebars' } = config;

    switch (engine) {
      case 'handlebars':
        // Simple handlebars-like template processing
        return template.replace(/\{\{([^}]+)\}\}/g, (match: string, key: string) => {
          const value = _.get(data, key.trim());
          return value !== undefined ? String(value) : match;
        });
      
      case 'lodash':
        return _.template(template)(data);
      
      default:
        throw new Error(`Unknown template engine: ${engine}`);
    }
  }

  private async applyMappingOperation(data: any, config: any): Promise<any> {
    const { mappings, mode = 'merge' } = config as { mappings: DataMapping[]; mode: 'merge' | 'replace' };
    
    let result = mode === 'replace' ? {} : _.cloneDeep(data);

    for (const mapping of mappings) {
      try {
        let sourceValue;
        
        // Extract source value
        if (mapping.source.startsWith('$')) {
          // JSONPath
          const extracted = jsonpath.query(data, mapping.source);
          sourceValue = extracted.length > 0 ? extracted[0] : mapping.defaultValue;
        } else {
          // Lodash path
          sourceValue = _.get(data, mapping.source, mapping.defaultValue);
        }

        // Apply transformation if specified
        if (mapping.transform && sourceValue !== undefined) {
          try {
            const func = new Function('value', `return ${mapping.transform}`);
            sourceValue = func(sourceValue);
          } catch (error) {
            this.logger.warn(`Transform function failed for mapping ${mapping.source} -> ${mapping.target}:`, error);
          }
        }

        // Check required field
        if (mapping.required && sourceValue === undefined) {
          throw new Error(`Required field mapping failed: ${mapping.source} -> ${mapping.target}`);
        }

        // Set target value
        if (sourceValue !== undefined) {
          _.set(result, mapping.target, sourceValue);
        }

      } catch (error) {
        this.logger.error(`Mapping failed: ${mapping.source} -> ${mapping.target}:`, error);
        if (mapping.required) throw error;
      }
    }

    return result;
  }

  private async applyFilterOperation(data: any, config: any): Promise<any> {
    const { conditions, logic = 'and' } = config as { conditions: FilterCondition[]; logic: 'and' | 'or' };

    if (!Array.isArray(data)) {
      throw new Error('Filter operation requires array input');
    }

    return data.filter(item => {
      const results = conditions.map(condition => this.evaluateFilterCondition(item, condition));
      
      return logic === 'and' 
        ? results.every(r => r)
        : results.some(r => r);
    });
  }

  private evaluateFilterCondition(item: any, condition: FilterCondition): boolean {
    const fieldValue = _.get(item, condition.field);

    switch (condition.operator) {
      case 'eq':
        return fieldValue === condition.value;
      case 'ne':
        return fieldValue !== condition.value;
      case 'gt':
        return Number(fieldValue) > Number(condition.value);
      case 'gte':
        return Number(fieldValue) >= Number(condition.value);
      case 'lt':
        return Number(fieldValue) < Number(condition.value);
      case 'lte':
        return Number(fieldValue) <= Number(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'nin':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'startsWith':
        return String(fieldValue).startsWith(String(condition.value));
      case 'endsWith':
        return String(fieldValue).endsWith(String(condition.value));
      case 'regex':
        return condition.pattern ? new RegExp(condition.pattern).test(String(fieldValue)) : false;
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      default:
        return false;
    }
  }

  private async applySortOperation(data: any, config: any): Promise<any> {
    const { sorts } = config as { sorts: SortConfig[] };

    if (!Array.isArray(data)) {
      throw new Error('Sort operation requires array input');
    }

    return _.orderBy(
      data,
      sorts.map(sort => sort.field),
      sorts.map(sort => sort.direction)
    );
  }

  private async applyGroupOperation(data: any, config: any): Promise<any> {
    const { by, aggregations = {} } = config as GroupConfig;

    if (!Array.isArray(data)) {
      throw new Error('Group operation requires array input');
    }

    const grouped = _.groupBy(data, by);
    const result: any = {};

    for (const [key, items] of Object.entries(grouped)) {
      result[key] = {
        count: items.length,
        items: items
      };

      // Apply aggregations
      for (const [aggName, aggConfig] of Object.entries(aggregations)) {
        const values = items.map(item => _.get(item, aggConfig.field)).filter(v => v !== undefined);
        
        switch (aggConfig.operation) {
          case 'sum':
            result[key][aggName] = _.sum(values);
            break;
          case 'avg':
            result[key][aggName] = values.length > 0 ? _.sum(values) / values.length : 0;
            break;
          case 'min':
            result[key][aggName] = _.min(values);
            break;
          case 'max':
            result[key][aggName] = _.max(values);
            break;
          case 'first':
            result[key][aggName] = values[0];
            break;
          case 'last':
            result[key][aggName] = values[values.length - 1];
            break;
          case 'count':
            result[key][aggName] = values.length;
            break;
        }
      }
    }

    return result;
  }

  private async applyAggregateOperation(data: any, config: any): Promise<any> {
    const { aggregations } = config;

    if (!Array.isArray(data)) {
      throw new Error('Aggregate operation requires array input');
    }

    const result: any = {};

    for (const [aggName, aggConfig] of Object.entries(aggregations)) {
      const { field, operation } = aggConfig as { field: string; operation: string };
      const values = data.map(item => _.get(item, field)).filter(v => v !== undefined);

      switch (operation) {
        case 'count':
          result[aggName] = data.length;
          break;
        case 'sum':
          result[aggName] = _.sum(values);
          break;
        case 'avg':
          result[aggName] = values.length > 0 ? _.sum(values) / values.length : 0;
          break;
        case 'min':
          result[aggName] = _.min(values);
          break;
        case 'max':
          result[aggName] = _.max(values);
          break;
        case 'first':
          result[aggName] = data.length > 0 ? _.get(data[0], field) : undefined;
          break;
        case 'last':
          result[aggName] = data.length > 0 ? _.get(data[data.length - 1], field) : undefined;
          break;
        case 'unique':
          result[aggName] = _.uniq(values);
          break;
        case 'uniqueCount':
          result[aggName] = _.uniq(values).length;
          break;
      }
    }

    return result;
  }

  // Utility methods
  private getDataType(data: any): string {
    if (data === null) return 'null';
    if (Array.isArray(data)) return 'array';
    return typeof data;
  }

  // Built-in transformation templates
  async getTransformationTemplates(): Promise<any[]> {
    return [
      {
        id: 'flatten-array',
        name: 'Flatten Nested Array',
        description: 'Flatten nested arrays into a single array',
        operations: [
          {
            id: '1',
            type: 'lodash',
            description: 'Flatten array',
            config: { method: 'flatten' },
            enabled: true
          }
        ]
      },
      {
        id: 'extract-fields',
        name: 'Extract Specific Fields',
        description: 'Extract only specified fields from objects',
        operations: [
          {
            id: '1',
            type: 'mapping',
            description: 'Map specific fields',
            config: {
              mode: 'replace',
              mappings: [
                { source: 'id', target: 'id', required: true },
                { source: 'name', target: 'name', required: true },
                { source: 'email', target: 'email', required: false }
              ]
            },
            enabled: true
          }
        ]
      },
      {
        id: 'calculate-totals',
        name: 'Calculate Totals and Averages',
        description: 'Calculate sum and average of numeric fields',
        operations: [
          {
            id: '1',
            type: 'aggregate',
            description: 'Calculate aggregations',
            config: {
              aggregations: {
                totalAmount: { field: 'amount', operation: 'sum' },
                averageAmount: { field: 'amount', operation: 'avg' },
                recordCount: { field: 'id', operation: 'count' }
              }
            },
            enabled: true
          }
        ]
      }
    ];
  }

  // Test transformation with sample data
  async testTransformation(operations: TransformOperation[], sampleData: any): Promise<TransformResult> {
    return this.transformData(sampleData, operations);
  }
}

export const advancedTransformService = new AdvancedTransformService();