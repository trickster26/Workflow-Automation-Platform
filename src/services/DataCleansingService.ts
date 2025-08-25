import _ from 'lodash';
import { createLogger } from '../utils/logger';

export interface CleansingRule {
  id: string;
  name: string;
  type: 'deduplicate' | 'normalize' | 'standardize' | 'trim' | 'replace' | 'remove' | 'format' | 'validate';
  field?: string; // Field to clean (if not specified, applies to entire object)
  config: any;
  enabled: boolean;
}

export interface DuplicateDetectionConfig {
  fields?: string[]; // Fields to use for duplicate detection
  strategy: 'exact' | 'fuzzy' | 'semantic';
  threshold?: number; // For fuzzy matching (0-1)
  caseSensitive?: boolean;
  trimWhitespace?: boolean;
}

export interface NormalizationConfig {
  type: 'case' | 'whitespace' | 'encoding' | 'phone' | 'email' | 'address' | 'name';
  caseType?: 'upper' | 'lower' | 'title' | 'sentence';
  trimStrategy?: 'all' | 'leading' | 'trailing' | 'multiple';
}

export interface StandardizationConfig {
  type: 'format' | 'enum' | 'lookup' | 'pattern';
  format?: string; // Format string or pattern
  enumValues?: string[]; // Valid enum values
  lookupTable?: { [key: string]: string }; // Value mapping
  defaultValue?: any;
}

export interface CleansingResult {
  success: boolean;
  originalCount: number;
  cleanedCount: number;
  duplicatesRemoved: number;
  invalidRecordsRemoved: number;
  modificationsCount: number;
  data: any;
  summary: {
    appliedRules: string[];
    executionTime: number;
    issues: Array<{
      rule: string;
      field?: string;
      issue: string;
      count: number;
    }>;
  };
}

export interface DataEnrichmentConfig {
  type: 'lookup' | 'calculation' | 'geocoding' | 'validation' | 'categorization';
  sourceField?: string;
  targetField: string;
  enrichmentRules: any;
}

export class DataCleansingService {
  private logger: Logger;

  constructor() {
    this.logger = createLogger('DataCleansingService');
  }

  async cleanseData(data: any, rules: CleansingRule[]): Promise<CleansingResult> {
    const startTime = Date.now();
    let currentData = _.cloneDeep(data);
    const originalCount = Array.isArray(data) ? data.length : 1;
    let duplicatesRemoved = 0;
    let invalidRecordsRemoved = 0;
    let modificationsCount = 0;
    const appliedRules: string[] = [];
    const issues: Array<{ rule: string; field?: string; issue: string; count: number }> = [];

    try {
      for (const rule of rules) {
        if (!rule.enabled) continue;

        this.logger.info(`Applying cleansing rule: ${rule.name}`);
        
        const ruleResult = await this.applyCleansingRule(currentData, rule);
        currentData = ruleResult.data;
        
        if (ruleResult.duplicatesRemoved) {
          duplicatesRemoved += ruleResult.duplicatesRemoved;
        }
        if (ruleResult.invalidRecordsRemoved) {
          invalidRecordsRemoved += ruleResult.invalidRecordsRemoved;
        }
        if (ruleResult.modificationsCount) {
          modificationsCount += ruleResult.modificationsCount;
        }
        if (ruleResult.issues) {
          issues.push(...ruleResult.issues);
        }

        appliedRules.push(rule.name);
      }

      const cleanedCount = Array.isArray(currentData) ? currentData.length : 1;
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        originalCount,
        cleanedCount,
        duplicatesRemoved,
        invalidRecordsRemoved,
        modificationsCount,
        data: currentData,
        summary: {
          appliedRules,
          executionTime,
          issues
        }
      };

    } catch (error) {
      this.logger.error('Data cleansing failed:', error);
      return {
        success: false,
        originalCount,
        cleanedCount: 0,
        duplicatesRemoved,
        invalidRecordsRemoved,
        modificationsCount,
        data: currentData,
        summary: {
          appliedRules,
          executionTime: Date.now() - startTime,
          issues: [...issues, {
            rule: 'system',
            issue: `Cleansing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            count: 1
          }]
        }
      };
    }
  }

  private async applyCleansingRule(data: any, rule: CleansingRule): Promise<{
    data: any;
    duplicatesRemoved?: number;
    invalidRecordsRemoved?: number;
    modificationsCount?: number;
    issues?: Array<{ rule: string; field?: string; issue: string; count: number }>;
  }> {
    switch (rule.type) {
      case 'deduplicate':
        return this.deduplicate(data, rule);
      case 'normalize':
        return this.normalize(data, rule);
      case 'standardize':
        return this.standardize(data, rule);
      case 'trim':
        return this.trimData(data, rule);
      case 'replace':
        return this.replaceValues(data, rule);
      case 'remove':
        return this.removeValues(data, rule);
      case 'format':
        return this.formatValues(data, rule);
      case 'validate':
        return this.validateAndClean(data, rule);
      default:
        throw new Error(`Unknown cleansing rule type: ${rule.type}`);
    }
  }

  private async deduplicate(data: any, rule: CleansingRule): Promise<{
    data: any;
    duplicatesRemoved: number;
    issues: Array<{ rule: string; field?: string; issue: string; count: number }>;
  }> {
    if (!Array.isArray(data)) {
      return { data, duplicatesRemoved: 0, issues: [] };
    }

    const config = rule.config as DuplicateDetectionConfig;
    const originalCount = data.length;
    let cleanedData: any[] = [];
    const issues: Array<{ rule: string; field?: string; issue: string; count: number }> = [];

    switch (config.strategy) {
      case 'exact':
        cleanedData = this.exactDeduplicate(data, config);
        break;
      case 'fuzzy':
        cleanedData = this.fuzzyDeduplicate(data, config);
        break;
      case 'semantic':
        cleanedData = this.semanticDeduplicate(data, config);
        break;
    }

    const duplicatesRemoved = originalCount - cleanedData.length;
    
    if (duplicatesRemoved > 0) {
      issues.push({
        rule: rule.id,
        issue: `Found and removed ${duplicatesRemoved} duplicate records`,
        count: duplicatesRemoved
      });
    }

    return {
      data: cleanedData,
      duplicatesRemoved,
      issues
    };
  }

  private exactDeduplicate(data: any[], config: DuplicateDetectionConfig): any[] {
    if (config.fields && config.fields.length > 0) {
      // Deduplicate based on specific fields
      return _.uniqBy(data, item => {
        return config.fields!.map(field => {
          let value = _.get(item, field);
          if (typeof value === 'string') {
            if (!config.caseSensitive) value = value.toLowerCase();
            if (config.trimWhitespace) value = value.trim();
          }
          return value;
        }).join('|');
      });
    } else {
      // Deduplicate entire objects
      return _.uniqWith(data, (a, b) => {
        let objA = a;
        let objB = b;
        
        if (config.trimWhitespace || !config.caseSensitive) {
          objA = this.normalizeObjectForComparison(a, config);
          objB = this.normalizeObjectForComparison(b, config);
        }
        
        return _.isEqual(objA, objB);
      });
    }
  }

  private fuzzyDeduplicate(data: any[], config: DuplicateDetectionConfig): any[] {
    const threshold = config.threshold || 0.85;
    const result: any[] = [];
    const used = new Set<number>();

    for (let i = 0; i < data.length; i++) {
      if (used.has(i)) continue;
      
      result.push(data[i]);
      used.add(i);

      // Find similar items
      for (let j = i + 1; j < data.length; j++) {
        if (used.has(j)) continue;
        
        const similarity = this.calculateSimilarity(data[i], data[j], config);
        if (similarity >= threshold) {
          used.add(j);
        }
      }
    }

    return result;
  }

  private semanticDeduplicate(data: any[], config: DuplicateDetectionConfig): any[] {
    // Simplified semantic deduplication - in practice, this would use ML models
    return this.fuzzyDeduplicate(data, { ...config, threshold: config.threshold || 0.9 });
  }

  private calculateSimilarity(obj1: any, obj2: any, config: DuplicateDetectionConfig): number {
    const fields = config.fields || Object.keys(obj1);
    let totalSimilarity = 0;
    let fieldCount = 0;

    for (const field of fields) {
      const val1 = _.get(obj1, field);
      const val2 = _.get(obj2, field);
      
      if (val1 === null || val1 === undefined || val2 === null || val2 === undefined) {
        continue;
      }

      let similarity = 0;
      if (typeof val1 === 'string' && typeof val2 === 'string') {
        similarity = this.stringSimilarity(val1, val2, config);
      } else if (typeof val1 === typeof val2) {
        similarity = val1 === val2 ? 1 : 0;
      }

      totalSimilarity += similarity;
      fieldCount++;
    }

    return fieldCount > 0 ? totalSimilarity / fieldCount : 0;
  }

  private stringSimilarity(str1: string, str2: string, config: DuplicateDetectionConfig): number {
    let s1 = str1;
    let s2 = str2;
    
    if (!config.caseSensitive) {
      s1 = s1.toLowerCase();
      s2 = s2.toLowerCase();
    }
    
    if (config.trimWhitespace) {
      s1 = s1.trim();
      s2 = s2.trim();
    }

    // Levenshtein distance-based similarity
    const maxLength = Math.max(s1.length, s2.length);
    if (maxLength === 0) return 1;
    
    const distance = this.levenshteinDistance(s1, s2);
    return 1 - (distance / maxLength);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private normalize(data: any, rule: CleansingRule): Promise<{
    data: any;
    modificationsCount: number;
    issues: Array<{ rule: string; field?: string; issue: string; count: number }>;
  }> {
    const config = rule.config as NormalizationConfig;
    let modificationsCount = 0;
    const issues: Array<{ rule: string; field?: string; issue: string; count: number }> = [];
    
    const normalizeValue = (value: any): any => {
      if (typeof value !== 'string') return value;
      
      let normalized = value;
      const original = value;
      
      switch (config.type) {
        case 'case':
          switch (config.caseType) {
            case 'upper':
              normalized = value.toUpperCase();
              break;
            case 'lower':
              normalized = value.toLowerCase();
              break;
            case 'title':
              normalized = value.replace(/\w\S*/g, txt => 
                txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
              break;
            case 'sentence':
              normalized = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
              break;
          }
          break;
          
        case 'whitespace':
          switch (config.trimStrategy) {
            case 'all':
              normalized = value.replace(/\s+/g, ' ').trim();
              break;
            case 'leading':
              normalized = value.replace(/^\s+/, '');
              break;
            case 'trailing':
              normalized = value.replace(/\s+$/, '');
              break;
            case 'multiple':
              normalized = value.replace(/\s+/g, ' ');
              break;
            default:
              normalized = value.trim();
              break;
          }
          break;
          
        case 'phone':
          normalized = this.normalizePhoneNumber(value);
          break;
          
        case 'email':
          normalized = value.toLowerCase().trim();
          break;
          
        case 'name':
          normalized = this.normalizeName(value);
          break;
          
        case 'address':
          normalized = this.normalizeAddress(value);
          break;
      }
      
      if (normalized !== original) {
        modificationsCount++;
      }
      
      return normalized;
    };

    let result: any;
    
    if (rule.field) {
      // Apply to specific field
      if (Array.isArray(data)) {
        result = data.map(item => ({
          ...item,
          [rule.field!]: normalizeValue(_.get(item, rule.field!))
        }));
      } else {
        result = {
          ...data,
          [rule.field]: normalizeValue(_.get(data, rule.field))
        };
      }
    } else {
      // Apply to all string fields
      const processObject = (obj: any): any => {
        if (typeof obj === 'string') {
          return normalizeValue(obj);
        } else if (Array.isArray(obj)) {
          return obj.map(processObject);
        } else if (obj && typeof obj === 'object') {
          const result: any = {};
          for (const [key, value] of Object.entries(obj)) {
            result[key] = processObject(value);
          }
          return result;
        }
        return obj;
      };
      
      result = processObject(data);
    }

    if (modificationsCount > 0) {
      issues.push({
        rule: rule.id,
        field: rule.field,
        issue: `Normalized ${modificationsCount} values`,
        count: modificationsCount
      });
    }

    return Promise.resolve({
      data: result,
      modificationsCount,
      issues
    });
  }

  private standardize(data: any, rule: CleansingRule): Promise<{
    data: any;
    modificationsCount: number;
    issues: Array<{ rule: string; field?: string; issue: string; count: number }>;
  }> {
    const config = rule.config as StandardizationConfig;
    let modificationsCount = 0;
    const issues: Array<{ rule: string; field?: string; issue: string; count: number }> = [];

    const standardizeValue = (value: any): any => {
      if (value === null || value === undefined) return value;
      
      const original = value;
      let standardized = value;
      
      switch (config.type) {
        case 'format':
          if (typeof value === 'string' && config.format) {
            standardized = this.applyFormat(value, config.format);
          }
          break;
          
        case 'enum':
          if (config.enumValues && !config.enumValues.includes(value)) {
            standardized = config.defaultValue || null;
          }
          break;
          
        case 'lookup':
          if (config.lookupTable && config.lookupTable[value] !== undefined) {
            standardized = config.lookupTable[value];
          } else if (config.defaultValue !== undefined) {
            standardized = config.defaultValue;
          }
          break;
          
        case 'pattern':
          if (typeof value === 'string' && config.format) {
            const regex = new RegExp(config.format);
            if (!regex.test(value)) {
              standardized = config.defaultValue || null;
            }
          }
          break;
      }
      
      if (standardized !== original) {
        modificationsCount++;
      }
      
      return standardized;
    };

    let result: any;
    
    if (rule.field) {
      if (Array.isArray(data)) {
        result = data.map(item => ({
          ...item,
          [rule.field!]: standardizeValue(_.get(item, rule.field!))
        }));
      } else {
        result = {
          ...data,
          [rule.field]: standardizeValue(_.get(data, rule.field))
        };
      }
    } else {
      result = data; // Standardization typically applies to specific fields
    }

    if (modificationsCount > 0) {
      issues.push({
        rule: rule.id,
        field: rule.field,
        issue: `Standardized ${modificationsCount} values`,
        count: modificationsCount
      });
    }

    return Promise.resolve({
      data: result,
      modificationsCount,
      issues
    });
  }

  private trimData(data: any, rule: CleansingRule): Promise<{
    data: any;
    modificationsCount: number;
  }> {
    let modificationsCount = 0;
    
    const trimValue = (value: any): any => {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed !== value) modificationsCount++;
        return trimmed;
      }
      return value;
    };

    const processObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return trimValue(obj);
      } else if (Array.isArray(obj)) {
        return obj.map(processObject);
      } else if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = rule.field && rule.field === key ? trimValue(value) : 
                       rule.field ? value : processObject(value);
        }
        return result;
      }
      return obj;
    };

    const result = processObject(data);

    return Promise.resolve({
      data: result,
      modificationsCount
    });
  }

  private replaceValues(data: any, rule: CleansingRule): Promise<{
    data: any;
    modificationsCount: number;
  }> {
    const { find, replace, regex = false, caseSensitive = true } = rule.config;
    let modificationsCount = 0;

    const replaceValue = (value: any): any => {
      if (typeof value === 'string') {
        let result = value;
        if (regex) {
          const flags = caseSensitive ? 'g' : 'gi';
          const regExp = new RegExp(find, flags);
          result = value.replace(regExp, replace);
        } else {
          const searchValue = caseSensitive ? find : find.toLowerCase();
          const targetValue = caseSensitive ? value : value.toLowerCase();
          if (targetValue.includes(searchValue)) {
            result = caseSensitive ? 
              value.replace(new RegExp(_.escapeRegExp(find), 'g'), replace) :
              value.replace(new RegExp(_.escapeRegExp(find), 'gi'), replace);
          }
        }
        if (result !== value) modificationsCount++;
        return result;
      }
      return value;
    };

    const processObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return replaceValue(obj);
      } else if (Array.isArray(obj)) {
        return obj.map(processObject);
      } else if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = rule.field && rule.field === key ? replaceValue(value) : 
                       rule.field ? value : processObject(value);
        }
        return result;
      }
      return obj;
    };

    const result = processObject(data);

    return Promise.resolve({
      data: result,
      modificationsCount
    });
  }

  private removeValues(data: any, rule: CleansingRule): Promise<{
    data: any;
    invalidRecordsRemoved: number;
  }> {
    const { criteria, strategy = 'null' } = rule.config;
    let invalidRecordsRemoved = 0;

    if (Array.isArray(data)) {
      const filtered = data.filter(item => {
        const shouldRemove = this.evaluateRemovalCriteria(item, criteria, rule.field);
        if (shouldRemove) invalidRecordsRemoved++;
        return !shouldRemove;
      });
      
      return Promise.resolve({
        data: filtered,
        invalidRecordsRemoved
      });
    } else {
      // For single objects, remove fields or set to null
      const shouldRemove = this.evaluateRemovalCriteria(data, criteria, rule.field);
      if (shouldRemove) {
        if (rule.field) {
          const result = { ...data };
          if (strategy === 'null') {
            result[rule.field] = null;
          } else {
            delete result[rule.field];
          }
          return Promise.resolve({
            data: result,
            invalidRecordsRemoved: 0
          });
        }
      }
    }

    return Promise.resolve({
      data,
      invalidRecordsRemoved
    });
  }

  private formatValues(data: any, rule: CleansingRule): Promise<{
    data: any;
    modificationsCount: number;
  }> {
    const { format, type = 'string' } = rule.config;
    let modificationsCount = 0;

    const formatValue = (value: any): any => {
      if (value === null || value === undefined) return value;
      
      let formatted = value;
      const original = value;
      
      switch (type) {
        case 'date':
          if (value instanceof Date) {
            formatted = this.formatDate(value, format);
          } else if (typeof value === 'string') {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              formatted = this.formatDate(date, format);
            }
          }
          break;
          
        case 'number':
          const num = Number(value);
          if (!isNaN(num)) {
            formatted = this.formatNumber(num, format);
          }
          break;
          
        case 'string':
          if (typeof value === 'string') {
            formatted = this.applyFormat(value, format);
          }
          break;
      }
      
      if (formatted !== original) {
        modificationsCount++;
      }
      
      return formatted;
    };

    let result: any;
    
    if (rule.field) {
      if (Array.isArray(data)) {
        result = data.map(item => ({
          ...item,
          [rule.field!]: formatValue(_.get(item, rule.field!))
        }));
      } else {
        result = {
          ...data,
          [rule.field]: formatValue(_.get(data, rule.field))
        };
      }
    } else {
      result = data;
    }

    return Promise.resolve({
      data: result,
      modificationsCount
    });
  }

  private validateAndClean(data: any, rule: CleansingRule): Promise<{
    data: any;
    invalidRecordsRemoved: number;
    issues: Array<{ rule: string; field?: string; issue: string; count: number }>;
  }> {
    const { validationRules, action = 'remove' } = rule.config;
    let invalidRecordsRemoved = 0;
    const issues: Array<{ rule: string; field?: string; issue: string; count: number }> = [];

    if (Array.isArray(data)) {
      const validRecords = data.filter(item => {
        const isValid = this.validateRecord(item, validationRules, rule.field);
        if (!isValid) {
          invalidRecordsRemoved++;
          return action !== 'remove';
        }
        return true;
      });

      if (invalidRecordsRemoved > 0) {
        issues.push({
          rule: rule.id,
          field: rule.field,
          issue: `Removed ${invalidRecordsRemoved} invalid records`,
          count: invalidRecordsRemoved
        });
      }

      return Promise.resolve({
        data: validRecords,
        invalidRecordsRemoved,
        issues
      });
    }

    return Promise.resolve({
      data,
      invalidRecordsRemoved: 0,
      issues
    });
  }

  // Helper methods
  private normalizeObjectForComparison(obj: any, config: DuplicateDetectionConfig): any {
    if (typeof obj === 'string') {
      let normalized = obj;
      if (config.trimWhitespace) normalized = normalized.trim();
      if (!config.caseSensitive) normalized = normalized.toLowerCase();
      return normalized;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.normalizeObjectForComparison(item, config));
    }
    
    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.normalizeObjectForComparison(value, config);
      }
      return result;
    }
    
    return obj;
  }

  private normalizePhoneNumber(phone: string): string {
    return phone.replace(/\D/g, '').replace(/^1/, '');
  }

  private normalizeName(name: string): string {
    return name.trim()
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  private normalizeAddress(address: string): string {
    return address.trim()
      .replace(/\s+/g, ' ')
      .replace(/\bSt\.?\b/gi, 'Street')
      .replace(/\bAve\.?\b/gi, 'Avenue')
      .replace(/\bRd\.?\b/gi, 'Road')
      .replace(/\bBlvd\.?\b/gi, 'Boulevard');
  }

  private applyFormat(value: string, format: string): string {
    // Simple format application - in practice, this would be more sophisticated
    return format.replace(/\{value\}/g, value);
  }

  private formatDate(date: Date, format: string): string {
    // Simple date formatting - in practice, use moment.js or similar
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day);
  }

  private formatNumber(num: number, format: string): string {
    // Simple number formatting
    const parts = format.split('.');
    const integerFormat = parts[0] || '';
    const decimalFormat = parts[1] || '';
    
    let result = num.toFixed(decimalFormat.length);
    
    if (integerFormat.includes(',')) {
      const [integerPart, decimalPart] = result.split('.');
      const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      result = decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
    }
    
    return result;
  }

  private evaluateRemovalCriteria(item: any, criteria: any, field?: string): boolean {
    const value = field ? _.get(item, field) : item;
    
    if (criteria.null && (value === null || value === undefined)) return true;
    if (criteria.empty && value === '') return true;
    if (criteria.whitespace && typeof value === 'string' && value.trim() === '') return true;
    if (criteria.pattern && typeof value === 'string') {
      const regex = new RegExp(criteria.pattern);
      return regex.test(value);
    }
    
    return false;
  }

  private validateRecord(record: any, validationRules: any[], field?: string): boolean {
    const value = field ? _.get(record, field) : record;
    
    for (const rule of validationRules) {
      if (!this.validateValue(value, rule)) {
        return false;
      }
    }
    
    return true;
  }

  private validateValue(value: any, rule: any): boolean {
    switch (rule.type) {
      case 'required':
        return value !== null && value !== undefined && value !== '';
      case 'email':
        return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'phone':
        return typeof value === 'string' && /^\+?[1-9]\d{1,14}$/.test(value);
      case 'regex':
        return typeof value === 'string' && new RegExp(rule.pattern).test(value);
      default:
        return true;
    }
  }

  // Data enrichment methods
  async enrichData(data: any, enrichmentConfigs: DataEnrichmentConfig[]): Promise<any> {
    let enrichedData = _.cloneDeep(data);

    for (const config of enrichmentConfigs) {
      enrichedData = await this.applyEnrichment(enrichedData, config);
    }

    return enrichedData;
  }

  private async applyEnrichment(data: any, config: DataEnrichmentConfig): Promise<any> {
    if (!Array.isArray(data)) {
      return this.enrichSingleRecord(data, config);
    }

    return Promise.all(data.map(record => this.enrichSingleRecord(record, config)));
  }

  private async enrichSingleRecord(record: any, config: DataEnrichmentConfig): Promise<any> {
    const sourceValue = config.sourceField ? _.get(record, config.sourceField) : record;
    let enrichedValue: any;

    switch (config.type) {
      case 'lookup':
        enrichedValue = await this.performLookup(sourceValue, config.enrichmentRules);
        break;
      case 'calculation':
        enrichedValue = this.performCalculation(record, config.enrichmentRules);
        break;
      case 'geocoding':
        enrichedValue = await this.performGeocoding(sourceValue, config.enrichmentRules);
        break;
      case 'validation':
        enrichedValue = this.performValidation(sourceValue, config.enrichmentRules);
        break;
      case 'categorization':
        enrichedValue = this.performCategorization(sourceValue, config.enrichmentRules);
        break;
      default:
        enrichedValue = null;
    }

    return {
      ...record,
      [config.targetField]: enrichedValue
    };
  }

  private async performLookup(value: any, rules: any): Promise<any> {
    const { lookupTable } = rules;
    return lookupTable[value] || null;
  }

  private performCalculation(record: any, rules: any): any {
    const { expression, fields } = rules;
    
    try {
      // Simple expression evaluation
      let result = expression;
      for (const field of fields) {
        const value = _.get(record, field) || 0;
        result = result.replace(new RegExp(`\\b${field}\\b`, 'g'), value);
      }
      return eval(result);
    } catch (error) {
      return null;
    }
  }

  private async performGeocoding(address: string, rules: any): Promise<any> {
    // Placeholder for geocoding service integration
    return null;
  }

  private performValidation(value: any, rules: any): boolean {
    return this.validateValue(value, rules);
  }

  private performCategorization(value: any, rules: any): string | null {
    const { categories } = rules;
    
    for (const category of categories) {
      if (category.condition(value)) {
        return category.label;
      }
    }
    
    return null;
  }
}

export const dataCleansingService = new DataCleansingService();