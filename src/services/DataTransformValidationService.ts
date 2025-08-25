import Joi from 'joi';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import _ from 'lodash';
import { createLogger } from '../utils/logger';

export interface ValidationRule {
  id: string;
  name: string;
  type: 'joi' | 'ajv' | 'custom' | 'regex' | 'range' | 'length' | 'required' | 'unique' | 'reference';
  field?: string; // Field to validate (if not specified, validates entire object)
  config: any;
  errorMessage?: string;
  severity: 'error' | 'warning' | 'info';
  enabled: boolean;
}

export interface DataQualityCheck {
  id: string;
  name: string;
  description: string;
  rules: ValidationRule[];
  enabled: boolean;
}

export interface ValidationError {
  rule: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  value?: any;
  path?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
  summary: {
    totalRules: number;
    passedRules: number;
    failedRules: number;
    warningRules: number;
    infoRules: number;
    validationTime: number;
  };
  data?: any; // Original or cleaned data
}

export interface SchemaValidationConfig {
  type: 'joi' | 'jsonschema';
  schema: any;
  options?: any;
}

export interface DataQualityReport {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  warningRecords: number;
  completeness: number; // Percentage of non-null/non-empty values
  uniqueness: number;   // Percentage of unique values
  consistency: number;  // Percentage of consistent format values
  accuracy: number;     // Overall accuracy score
  fieldStats: {
    [field: string]: {
      nullCount: number;
      emptyCount: number;
      uniqueCount: number;
      dataTypes: { [type: string]: number };
      patterns: { [pattern: string]: number };
    };
  };
}

export class DataTransformValidationService {
  private logger: Logger;
  private ajv: Ajv;
  private validationRules: Map<string, ValidationRule> = new Map();
  private qualityChecks: Map<string, DataQualityCheck> = new Map();

  constructor() {
    this.logger = createLogger('DataTransformValidationService');
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
    this.initializeBuiltInRules();
  }

  private initializeBuiltInRules(): void {
    const builtInRules: ValidationRule[] = [
      {
        id: 'required-field',
        name: 'Required Field',
        type: 'required',
        config: {},
        errorMessage: 'Field is required',
        severity: 'error',
        enabled: true
      },
      {
        id: 'email-format',
        name: 'Email Format',
        type: 'regex',
        config: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
        errorMessage: 'Invalid email format',
        severity: 'error',
        enabled: true
      },
      {
        id: 'phone-format',
        name: 'Phone Format',
        type: 'regex',
        config: { pattern: '^\\+?[1-9]\\d{1,14}$' },
        errorMessage: 'Invalid phone format',
        severity: 'warning',
        enabled: true
      },
      {
        id: 'numeric-range',
        name: 'Numeric Range',
        type: 'range',
        config: { min: 0, max: 100 },
        errorMessage: 'Value must be between {min} and {max}',
        severity: 'error',
        enabled: true
      },
      {
        id: 'string-length',
        name: 'String Length',
        type: 'length',
        config: { min: 1, max: 255 },
        errorMessage: 'String length must be between {min} and {max}',
        severity: 'warning',
        enabled: true
      }
    ];

    builtInRules.forEach(rule => this.validationRules.set(rule.id, rule));
  }

  async validateData(data: any, rules: ValidationRule[]): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const info: ValidationError[] = [];

    let passedRules = 0;
    let failedRules = 0;
    let warningRules = 0;
    let infoRules = 0;

    for (const rule of rules) {
      if (!rule.enabled) continue;

      try {
        const ruleResult = await this.validateRule(data, rule);
        
        if (ruleResult.length === 0) {
          passedRules++;
        } else {
          ruleResult.forEach(error => {
            switch (error.severity) {
              case 'error':
                errors.push(error);
                failedRules++;
                break;
              case 'warning':
                warnings.push(error);
                warningRules++;
                break;
              case 'info':
                info.push(error);
                infoRules++;
                break;
            }
          });
        }
      } catch (error) {
        this.logger.error(`Rule validation failed for ${rule.id}:`, error);
        errors.push({
          rule: rule.id,
          message: `Rule execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error'
        });
        failedRules++;
      }
    }

    const validationTime = Date.now() - startTime;
    const valid = errors.length === 0;

    return {
      valid,
      errors,
      warnings,
      info,
      summary: {
        totalRules: rules.filter(r => r.enabled).length,
        passedRules,
        failedRules,
        warningRules,
        infoRules,
        validationTime
      },
      data
    };
  }

  private async validateRule(data: any, rule: ValidationRule): Promise<ValidationError[]> {
    const targetData = rule.field ? _.get(data, rule.field) : data;

    switch (rule.type) {
      case 'joi':
        return this.validateWithJoi(targetData, rule);
      
      case 'ajv':
        return this.validateWithAjv(targetData, rule);
      
      case 'custom':
        return this.validateWithCustom(targetData, rule, data);
      
      case 'regex':
        return this.validateWithRegex(targetData, rule);
      
      case 'range':
        return this.validateRange(targetData, rule);
      
      case 'length':
        return this.validateLength(targetData, rule);
      
      case 'required':
        return this.validateRequired(targetData, rule);
      
      case 'unique':
        return this.validateUnique(data, rule);
      
      case 'reference':
        return this.validateReference(targetData, rule, data);
      
      default:
        throw new Error(`Unknown validation rule type: ${rule.type}`);
    }
  }

  private validateWithJoi(data: any, rule: ValidationRule): ValidationError[] {
    const schema = rule.config.schema;
    const options = rule.config.options || {};

    try {
      const joiSchema = typeof schema === 'string' ? this.parseJoiSchema(schema) : schema;
      const { error } = joiSchema.validate(data, options);
      
      if (error) {
        return error.details.map(detail => ({
          rule: rule.id,
          field: rule.field,
          message: rule.errorMessage || detail.message,
          severity: rule.severity,
          value: data,
          path: detail.path.join('.')
        }));
      }
      return [];
    } catch (error) {
      throw new Error(`Joi validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private validateWithAjv(data: any, rule: ValidationRule): ValidationError[] {
    const schema = rule.config.schema;

    try {
      const validate = this.ajv.compile(schema);
      const valid = validate(data);
      
      if (!valid && validate.errors) {
        return validate.errors.map(error => ({
          rule: rule.id,
          field: rule.field,
          message: rule.errorMessage || `${error.instancePath} ${error.message}`,
          severity: rule.severity,
          value: data,
          path: error.instancePath
        }));
      }
      return [];
    } catch (error) {
      throw new Error(`AJV validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private validateWithCustom(data: any, rule: ValidationRule, fullData: any): ValidationError[] {
    const { code, context = {} } = rule.config;

    try {
      const safeContext = {
        value: data,
        data: fullData,
        _: _,
        rule: rule,
        ...context
      };

      const func = new Function(...Object.keys(safeContext), `
        try {
          return ${code};
        } catch (error) {
          return { valid: false, message: error.message };
        }
      `);

      const result = func(...Object.values(safeContext));
      
      if (typeof result === 'boolean') {
        return result ? [] : [{
          rule: rule.id,
          field: rule.field,
          message: rule.errorMessage || 'Custom validation failed',
          severity: rule.severity,
          value: data
        }];
      } else if (typeof result === 'object' && 'valid' in result) {
        return result.valid ? [] : [{
          rule: rule.id,
          field: rule.field,
          message: rule.errorMessage || result.message || 'Custom validation failed',
          severity: rule.severity,
          value: data
        }];
      }

      return [];
    } catch (error) {
      throw new Error(`Custom validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private validateWithRegex(data: any, rule: ValidationRule): ValidationError[] {
    const { pattern, flags } = rule.config;
    
    if (data === null || data === undefined) {
      return [];
    }

    try {
      const regex = new RegExp(pattern, flags);
      const valid = regex.test(String(data));
      
      return valid ? [] : [{
        rule: rule.id,
        field: rule.field,
        message: rule.errorMessage || 'Value does not match required pattern',
        severity: rule.severity,
        value: data
      }];
    } catch (error) {
      throw new Error(`Regex validation failed: ${error instanceof Error ? error.message : 'Invalid pattern'}`);
    }
  }

  private validateRange(data: any, rule: ValidationRule): ValidationError[] {
    const { min, max, inclusive = true } = rule.config;
    
    if (data === null || data === undefined) {
      return [];
    }

    const numValue = Number(data);
    if (isNaN(numValue)) {
      return [{
        rule: rule.id,
        field: rule.field,
        message: 'Value must be a number',
        severity: rule.severity,
        value: data
      }];
    }

    let valid = true;
    if (min !== undefined) {
      valid = valid && (inclusive ? numValue >= min : numValue > min);
    }
    if (max !== undefined) {
      valid = valid && (inclusive ? numValue <= max : numValue < max);
    }

    return valid ? [] : [{
      rule: rule.id,
      field: rule.field,
      message: rule.errorMessage?.replace('{min}', min)?.replace('{max}', max) || 
               `Value must be between ${min} and ${max}`,
      severity: rule.severity,
      value: data
    }];
  }

  private validateLength(data: any, rule: ValidationRule): ValidationError[] {
    const { min, max } = rule.config;
    
    if (data === null || data === undefined) {
      return [];
    }

    const length = typeof data === 'string' ? data.length : 
                   Array.isArray(data) ? data.length :
                   typeof data === 'object' ? Object.keys(data).length : 0;

    let valid = true;
    if (min !== undefined) {
      valid = valid && length >= min;
    }
    if (max !== undefined) {
      valid = valid && length <= max;
    }

    return valid ? [] : [{
      rule: rule.id,
      field: rule.field,
      message: rule.errorMessage?.replace('{min}', min)?.replace('{max}', max) || 
               `Length must be between ${min} and ${max}`,
      severity: rule.severity,
      value: data
    }];
  }

  private validateRequired(data: any, rule: ValidationRule): ValidationError[] {
    const { allowEmpty = false } = rule.config;
    
    const isEmpty = data === null || data === undefined || 
                   (typeof data === 'string' && data.trim() === '') ||
                   (Array.isArray(data) && data.length === 0) ||
                   (typeof data === 'object' && Object.keys(data).length === 0);

    const isValid = !isEmpty || allowEmpty;

    return isValid ? [] : [{
      rule: rule.id,
      field: rule.field,
      message: rule.errorMessage || 'Field is required',
      severity: rule.severity,
      value: data
    }];
  }

  private validateUnique(data: any, rule: ValidationRule): ValidationError[] {
    const { field } = rule;
    
    if (!Array.isArray(data)) {
      throw new Error('Unique validation requires array input');
    }

    const values = field ? data.map(item => _.get(item, field)) : data;
    const uniqueValues = _.uniq(values);
    
    const isUnique = values.length === uniqueValues.length;

    return isUnique ? [] : [{
      rule: rule.id,
      field: rule.field,
      message: rule.errorMessage || 'Duplicate values found',
      severity: rule.severity
    }];
  }

  private validateReference(data: any, rule: ValidationRule, fullData: any): ValidationError[] {
    const { referenceField, referenceData } = rule.config;
    
    if (!referenceData) {
      throw new Error('Reference validation requires referenceData');
    }

    const referenceValues = Array.isArray(referenceData) 
      ? referenceData.map(item => _.get(item, referenceField))
      : [referenceData];

    const isValid = referenceValues.includes(data);

    return isValid ? [] : [{
      rule: rule.id,
      field: rule.field,
      message: rule.errorMessage || 'Value not found in reference data',
      severity: rule.severity,
      value: data
    }];
  }

  // Schema validation methods
  async validateWithSchema(data: any, config: SchemaValidationConfig): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      if (config.type === 'joi') {
        const schema = typeof config.schema === 'string' ? this.parseJoiSchema(config.schema) : config.schema;
        const { error, value } = schema.validate(data, config.options || {});
        
        const errors: ValidationError[] = error ? error.details.map(detail => ({
          rule: 'schema',
          message: detail.message,
          severity: 'error' as const,
          path: detail.path.join('.'),
          value: _.get(data, detail.path)
        })) : [];

        return {
          valid: !error,
          errors,
          warnings: [],
          info: [],
          summary: {
            totalRules: 1,
            passedRules: error ? 0 : 1,
            failedRules: error ? 1 : 0,
            warningRules: 0,
            infoRules: 0,
            validationTime: Date.now() - startTime
          },
          data: value
        };
      } else if (config.type === 'jsonschema') {
        const validate = this.ajv.compile(config.schema);
        const valid = validate(data);
        
        const errors: ValidationError[] = validate.errors ? validate.errors.map(error => ({
          rule: 'schema',
          message: `${error.instancePath} ${error.message}`,
          severity: 'error' as const,
          path: error.instancePath,
          value: _.get(data, error.instancePath)
        })) : [];

        return {
          valid,
          errors,
          warnings: [],
          info: [],
          summary: {
            totalRules: 1,
            passedRules: valid ? 1 : 0,
            failedRules: valid ? 0 : 1,
            warningRules: 0,
            infoRules: 0,
            validationTime: Date.now() - startTime
          },
          data
        };
      } else {
        throw new Error(`Unknown schema type: ${config.type}`);
      }
    } catch (error) {
      throw new Error(`Schema validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Data quality analysis
  async analyzeDataQuality(data: any[], fields?: string[]): Promise<DataQualityReport> {
    if (!Array.isArray(data)) {
      throw new Error('Data quality analysis requires array input');
    }

    const totalRecords = data.length;
    const fieldsToAnalyze = fields || this.extractFields(data);
    
    let validRecords = 0;
    let invalidRecords = 0;
    let warningRecords = 0;
    
    const fieldStats: { [field: string]: any } = {};

    // Initialize field stats
    fieldsToAnalyze.forEach(field => {
      fieldStats[field] = {
        nullCount: 0,
        emptyCount: 0,
        uniqueCount: 0,
        dataTypes: {},
        patterns: {}
      };
    });

    // Analyze each record
    for (const record of data) {
      let recordValid = true;
      let recordWarning = false;

      fieldsToAnalyze.forEach(field => {
        const value = _.get(record, field);
        const stats = fieldStats[field];

        // Count nulls and empties
        if (value === null || value === undefined) {
          stats.nullCount++;
          recordValid = false;
        } else if (typeof value === 'string' && value.trim() === '') {
          stats.emptyCount++;
          recordWarning = true;
        }

        // Track data types
        const dataType = this.getDataType(value);
        stats.dataTypes[dataType] = (stats.dataTypes[dataType] || 0) + 1;

        // Track patterns for strings
        if (typeof value === 'string' && value.length > 0) {
          const pattern = this.getStringPattern(value);
          stats.patterns[pattern] = (stats.patterns[pattern] || 0) + 1;
        }
      });

      if (recordValid) {
        validRecords++;
      } else if (recordWarning) {
        warningRecords++;
      } else {
        invalidRecords++;
      }
    }

    // Calculate unique counts
    fieldsToAnalyze.forEach(field => {
      const values = data.map(record => _.get(record, field)).filter(v => v !== null && v !== undefined);
      fieldStats[field].uniqueCount = _.uniq(values).length;
    });

    // Calculate quality metrics
    const completeness = this.calculateCompleteness(fieldStats, totalRecords);
    const uniqueness = this.calculateUniqueness(fieldStats, totalRecords);
    const consistency = this.calculateConsistency(fieldStats);
    const accuracy = (completeness + uniqueness + consistency) / 3;

    return {
      totalRecords,
      validRecords,
      invalidRecords,
      warningRecords,
      completeness,
      uniqueness,
      consistency,
      accuracy,
      fieldStats
    };
  }

  private extractFields(data: any[]): string[] {
    const fields = new Set<string>();
    data.forEach(record => {
      if (typeof record === 'object' && record !== null) {
        Object.keys(record).forEach(key => fields.add(key));
      }
    });
    return Array.from(fields);
  }

  private getDataType(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  private getStringPattern(value: string): string {
    if (/^\d+$/.test(value)) return 'numeric';
    if (/^[a-zA-Z]+$/.test(value)) return 'alphabetic';
    if (/^[a-zA-Z0-9]+$/.test(value)) return 'alphanumeric';
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email';
    if (/^\+?[1-9]\d{1,14}$/.test(value)) return 'phone';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date';
    return 'mixed';
  }

  private calculateCompleteness(fieldStats: any, totalRecords: number): number {
    const fields = Object.keys(fieldStats);
    const totalCompleteness = fields.reduce((sum, field) => {
      const nonNullCount = totalRecords - fieldStats[field].nullCount - fieldStats[field].emptyCount;
      return sum + (nonNullCount / totalRecords);
    }, 0);
    return fields.length > 0 ? (totalCompleteness / fields.length) * 100 : 100;
  }

  private calculateUniqueness(fieldStats: any, totalRecords: number): number {
    const fields = Object.keys(fieldStats);
    const totalUniqueness = fields.reduce((sum, field) => {
      const uniqueRatio = fieldStats[field].uniqueCount / totalRecords;
      return sum + Math.min(uniqueRatio, 1); // Cap at 1 for 100% uniqueness
    }, 0);
    return fields.length > 0 ? (totalUniqueness / fields.length) * 100 : 100;
  }

  private calculateConsistency(fieldStats: any): number {
    const fields = Object.keys(fieldStats);
    const totalConsistency = fields.reduce((sum, field) => {
      const dataTypes = Object.values(fieldStats[field].dataTypes) as number[];
      const patterns = Object.values(fieldStats[field].patterns) as number[];
      
      // Consistency is higher when there are fewer data types and patterns
      const typeConsistency = dataTypes.length > 0 ? Math.max(...dataTypes) / dataTypes.reduce((a, b) => a + b, 0) : 1;
      const patternConsistency = patterns.length > 0 ? Math.max(...patterns) / patterns.reduce((a, b) => a + b, 0) : 1;
      
      return sum + (typeConsistency + patternConsistency) / 2;
    }, 0);
    return fields.length > 0 ? (totalConsistency / fields.length) * 100 : 100;
  }

  private parseJoiSchema(schemaString: string): any {
    // Simple Joi schema parser for common patterns
    try {
      return new Function('Joi', `return ${schemaString}`)(Joi);
    } catch (error) {
      throw new Error(`Invalid Joi schema: ${error instanceof Error ? error.message : 'Parse error'}`);
    }
  }

  // Rule and check management
  async createValidationRule(rule: Omit<ValidationRule, 'id'>): Promise<string> {
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newRule = { ...rule, id: ruleId };
    this.validationRules.set(ruleId, newRule);
    return ruleId;
  }

  async getValidationRule(ruleId: string): Promise<ValidationRule | null> {
    return this.validationRules.get(ruleId) || null;
  }

  async listValidationRules(): Promise<ValidationRule[]> {
    return Array.from(this.validationRules.values());
  }

  async createQualityCheck(check: Omit<DataQualityCheck, 'id'>): Promise<string> {
    const checkId = `check_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newCheck = { ...check, id: checkId };
    this.qualityChecks.set(checkId, newCheck);
    return checkId;
  }

  async getQualityCheck(checkId: string): Promise<DataQualityCheck | null> {
    return this.qualityChecks.get(checkId) || null;
  }

  async listQualityChecks(): Promise<DataQualityCheck[]> {
    return Array.from(this.qualityChecks.values());
  }
}

export const dataTransformValidationService = new DataTransformValidationService();