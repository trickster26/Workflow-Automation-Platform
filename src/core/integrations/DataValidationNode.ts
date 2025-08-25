import { INodeType, INodeExecuteFunctions } from '../NodeRegistry';
import { dataTransformValidationService, ValidationRule } from '../../services/DataTransformValidationService';

export const DataValidationNode: INodeType = {
  description: {
    displayName: 'Data Validation',
    name: 'dataValidation',
    group: ['transform'],
    version: 1,
    description: 'Validate data quality with custom rules, schema validation, and quality reports',
    defaults: {
      name: 'Data Validation',
      color: '#ff6600',
    },
    inputs: ['main'],
    outputs: ['main', 'main'],
    outputNames: ['Valid', 'Invalid'],
    properties: [
      {
        name: 'validationMode',
        displayName: 'Validation Mode',
        type: 'options',
        options: [
          { name: 'Rules-based', value: 'rules' },
          { name: 'Schema Validation', value: 'schema' },
          { name: 'Data Quality Analysis', value: 'quality' },
          { name: 'Combined', value: 'combined' },
        ],
        default: 'rules',
        description: 'Type of validation to perform',
      },
      {
        name: 'validationRules',
        displayName: 'Validation Rules',
        type: 'collection',
        placeholder: 'Add Rule',
        default: [],
        typeOptions: {
          multipleValues: true,
          multipleValueButtonText: 'Add Rule',
        },
        description: 'List of validation rules to apply',
        displayOptions: {
          show: {
            validationMode: ['rules', 'combined'],
          },
        },
        options: [
          {
            name: 'ruleName',
            displayName: 'Rule Name',
            type: 'string',
            default: '',
            description: 'Name for this validation rule',
          },
          {
            name: 'ruleType',
            displayName: 'Rule Type',
            type: 'options',
            options: [
              { name: 'Required Field', value: 'required' },
              { name: 'Regular Expression', value: 'regex' },
              { name: 'Numeric Range', value: 'range' },
              { name: 'String Length', value: 'length' },
              { name: 'Custom JavaScript', value: 'custom' },
              { name: 'Joi Schema', value: 'joi' },
              { name: 'AJV Schema', value: 'ajv' },
              { name: 'Unique Values', value: 'unique' },
              { name: 'Reference Check', value: 'reference' },
            ],
            default: 'required',
            description: 'Type of validation rule',
          },
          {
            name: 'field',
            displayName: 'Field Path',
            type: 'string',
            default: '',
            description: 'Path to field to validate (e.g., user.email). Leave empty for entire object.',
          },
          {
            name: 'severity',
            displayName: 'Severity',
            type: 'options',
            options: [
              { name: 'Error', value: 'error' },
              { name: 'Warning', value: 'warning' },
              { name: 'Info', value: 'info' },
            ],
            default: 'error',
            description: 'Severity level of validation failures',
          },
          {
            name: 'errorMessage',
            displayName: 'Error Message',
            type: 'string',
            default: '',
            description: 'Custom error message for validation failures',
          },
          {
            name: 'enabled',
            displayName: 'Enabled',
            type: 'boolean',
            default: true,
            description: 'Enable or disable this rule',
          },
          // Required field options
          {
            name: 'allowEmpty',
            displayName: 'Allow Empty',
            type: 'boolean',
            default: false,
            description: 'Allow empty strings for required fields',
            displayOptions: {
              show: {
                ruleType: ['required'],
              },
            },
          },
          // Regex options
          {
            name: 'regexPattern',
            displayName: 'Pattern',
            type: 'string',
            default: '',
            description: 'Regular expression pattern',
            displayOptions: {
              show: {
                ruleType: ['regex'],
              },
            },
          },
          {
            name: 'regexFlags',
            displayName: 'Flags',
            type: 'string',
            default: 'i',
            description: 'Regular expression flags (i, g, m, etc.)',
            displayOptions: {
              show: {
                ruleType: ['regex'],
              },
            },
          },
          // Range options
          {
            name: 'rangeMin',
            displayName: 'Minimum',
            type: 'number',
            default: 0,
            description: 'Minimum allowed value',
            displayOptions: {
              show: {
                ruleType: ['range'],
              },
            },
          },
          {
            name: 'rangeMax',
            displayName: 'Maximum',
            type: 'number',
            default: 100,
            description: 'Maximum allowed value',
            displayOptions: {
              show: {
                ruleType: ['range'],
              },
            },
          },
          {
            name: 'rangeInclusive',
            displayName: 'Inclusive',
            type: 'boolean',
            default: true,
            description: 'Include min/max values in valid range',
            displayOptions: {
              show: {
                ruleType: ['range'],
              },
            },
          },
          // Length options
          {
            name: 'lengthMin',
            displayName: 'Minimum Length',
            type: 'number',
            default: 0,
            description: 'Minimum allowed length',
            displayOptions: {
              show: {
                ruleType: ['length'],
              },
            },
          },
          {
            name: 'lengthMax',
            displayName: 'Maximum Length',
            type: 'number',
            default: 255,
            description: 'Maximum allowed length',
            displayOptions: {
              show: {
                ruleType: ['length'],
              },
            },
          },
          // Custom JavaScript options
          {
            name: 'customCode',
            displayName: 'Validation Code',
            type: 'string',
            typeOptions: {
              rows: 4,
            },
            default: 'return value !== null && value !== undefined;',
            description: 'JavaScript code that returns true for valid values',
            displayOptions: {
              show: {
                ruleType: ['custom'],
              },
            },
          },
          {
            name: 'customContext',
            displayName: 'Context',
            type: 'string',
            default: '{}',
            description: 'JSON object with additional context variables',
            displayOptions: {
              show: {
                ruleType: ['custom'],
              },
            },
          },
          // Schema options
          {
            name: 'schema',
            displayName: 'Schema',
            type: 'string',
            typeOptions: {
              rows: 6,
            },
            default: '',
            description: 'Joi or JSON schema definition',
            displayOptions: {
              show: {
                ruleType: ['joi', 'ajv'],
              },
            },
          },
          {
            name: 'schemaOptions',
            displayName: 'Schema Options',
            type: 'string',
            default: '{}',
            description: 'JSON object with schema validation options',
            displayOptions: {
              show: {
                ruleType: ['joi', 'ajv'],
              },
            },
          },
          // Reference options
          {
            name: 'referenceField',
            displayName: 'Reference Field',
            type: 'string',
            default: 'id',
            description: 'Field in reference data to match against',
            displayOptions: {
              show: {
                ruleType: ['reference'],
              },
            },
          },
          {
            name: 'referenceData',
            displayName: 'Reference Data',
            type: 'string',
            default: '[]',
            description: 'JSON array of reference data to validate against',
            displayOptions: {
              show: {
                ruleType: ['reference'],
              },
            },
          },
        ],
      },
      // Schema validation options
      {
        name: 'schemaType',
        displayName: 'Schema Type',
        type: 'options',
        options: [
          { name: 'Joi', value: 'joi' },
          { name: 'JSON Schema', value: 'jsonschema' },
        ],
        default: 'joi',
        description: 'Type of schema validation',
        displayOptions: {
          show: {
            validationMode: ['schema', 'combined'],
          },
        },
      },
      {
        name: 'schemaDefinition',
        displayName: 'Schema Definition',
        type: 'string',
        typeOptions: {
          rows: 8,
        },
        default: '',
        description: 'Schema definition (Joi or JSON Schema)',
        displayOptions: {
          show: {
            validationMode: ['schema', 'combined'],
          },
        },
      },
      {
        name: 'schemaValidationOptions',
        displayName: 'Validation Options',
        type: 'string',
        default: '{}',
        description: 'JSON object with schema validation options',
        displayOptions: {
          show: {
            validationMode: ['schema', 'combined'],
          },
        },
      },
      // Quality analysis options
      {
        name: 'qualityFields',
        displayName: 'Fields to Analyze',
        type: 'string',
        default: '',
        description: 'Comma-separated list of fields to analyze (empty = all fields)',
        displayOptions: {
          show: {
            validationMode: ['quality', 'combined'],
          },
        },
      },
      {
        name: 'qualityThresholds',
        displayName: 'Quality Thresholds',
        type: 'string',
        default: '{"completeness": 95, "consistency": 90, "accuracy": 85}',
        description: 'JSON object with quality thresholds (percentage)',
        displayOptions: {
          show: {
            validationMode: ['quality', 'combined'],
          },
        },
      },
      // Output options
      {
        name: 'outputMode',
        displayName: 'Output Mode',
        type: 'options',
        options: [
          { name: 'Split Valid/Invalid', value: 'split' },
          { name: 'Add Validation Results', value: 'annotate' },
          { name: 'Filter Valid Only', value: 'filter' },
          { name: 'Report Only', value: 'report' },
        ],
        default: 'split',
        description: 'How to handle validation results',
      },
      {
        name: 'stopOnError',
        displayName: 'Stop on Error',
        type: 'boolean',
        default: false,
        description: 'Stop processing on first validation error',
      },
      {
        name: 'includeMetadata',
        displayName: 'Include Metadata',
        type: 'boolean',
        default: true,
        description: 'Include validation metadata in results',
      },
    ],
  },

  async execute(this: INodeExecuteFunctions): Promise<any[]> {
    const items = this.getInputData();
    const validationMode = this.getNodeParameter('validationMode', 0) as string;
    const outputMode = this.getNodeParameter('outputMode', 0) as string;
    const stopOnError = this.getNodeParameter('stopOnError', 0, false) as boolean;
    const includeMetadata = this.getNodeParameter('includeMetadata', 0, true) as boolean;

    const validItems = [];
    const invalidItems = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        let validationResult: any;

        switch (validationMode) {
          case 'rules':
            validationResult = await this.validateWithRules(item.json, i);
            break;
          case 'schema':
            validationResult = await this.validateWithSchema(item.json, i);
            break;
          case 'quality':
            validationResult = await this.validateDataQuality([item.json], i);
            break;
          case 'combined':
            validationResult = await this.validateCombined(item.json, i);
            break;
          default:
            throw new Error(`Unknown validation mode: ${validationMode}`);
        }

        // Process results based on output mode
        const processedResult = this.processValidationResult(
          item, 
          validationResult, 
          outputMode, 
          includeMetadata,
          i
        );

        if (outputMode === 'split') {
          if (validationResult.valid) {
            validItems.push(processedResult);
          } else {
            invalidItems.push(processedResult);
          }
        } else {
          validItems.push(processedResult);
        }

        // Stop on error if configured
        if (stopOnError && !validationResult.valid) {
          throw new Error(`Validation failed: ${validationResult.errors[0]?.message || 'Unknown error'}`);
        }

      } catch (error) {
        if (this.continueOnFail?.()) {
          const errorResult = {
            json: {
              error: error instanceof Error ? error.message : 'Validation error',
              originalData: item.json,
              valid: false,
            },
            pairedItem: { item: i },
          };

          if (outputMode === 'split') {
            invalidItems.push(errorResult);
          } else {
            validItems.push(errorResult);
          }
        } else {
          throw error;
        }
      }
    }

    // Return results based on output mode
    if (outputMode === 'split') {
      return [validItems, invalidItems];
    } else {
      return [validItems];
    }
  },

  async validateWithRules(this: INodeExecuteFunctions, data: any, itemIndex: number): Promise<any> {
    const rulesConfig = this.getNodeParameter('validationRules', itemIndex, []) as any[];
    
    const rules: ValidationRule[] = rulesConfig.map((ruleConfig, index) => ({
      id: `rule_${index}`,
      name: ruleConfig.ruleName || `Rule ${index + 1}`,
      type: ruleConfig.ruleType,
      field: ruleConfig.field,
      config: this.buildRuleConfig(ruleConfig),
      errorMessage: ruleConfig.errorMessage,
      severity: ruleConfig.severity,
      enabled: ruleConfig.enabled !== false,
    }));

    return await dataTransformValidationService.validateData(data, rules);
  },

  async validateWithSchema(this: INodeExecuteFunctions, data: any, itemIndex: number): Promise<any> {
    const schemaType = this.getNodeParameter('schemaType', itemIndex) as string;
    const schemaDefinition = this.getNodeParameter('schemaDefinition', itemIndex) as string;
    const schemaOptions = this.getNodeParameter('schemaValidationOptions', itemIndex, '{}') as string;

    if (!schemaDefinition) {
      throw new Error('Schema definition is required for schema validation');
    }

    const schema = schemaType === 'joi' ? schemaDefinition : JSON.parse(schemaDefinition);
    const options = JSON.parse(schemaOptions);

    return await dataTransformValidationService.validateWithSchema(data, {
      type: schemaType as 'joi' | 'jsonschema',
      schema,
      options,
    });
  },

  async validateDataQuality(this: INodeExecuteFunctions, data: any[], itemIndex: number): Promise<any> {
    const qualityFieldsStr = this.getNodeParameter('qualityFields', itemIndex, '') as string;
    const qualityThresholdsStr = this.getNodeParameter('qualityThresholds', itemIndex, '{}') as string;

    const fields = qualityFieldsStr ? qualityFieldsStr.split(',').map(f => f.trim()) : undefined;
    const thresholds = JSON.parse(qualityThresholdsStr);

    const qualityReport = await dataTransformValidationService.analyzeDataQuality(data, fields);

    // Determine if data passes quality thresholds
    const valid = Object.entries(thresholds).every(([metric, threshold]) => {
      const actualValue = qualityReport[metric as keyof typeof qualityReport] as number;
      return actualValue >= (threshold as number);
    });

    const errors = valid ? [] : Object.entries(thresholds)
      .filter(([metric, threshold]) => {
        const actualValue = qualityReport[metric as keyof typeof qualityReport] as number;
        return actualValue < (threshold as number);
      })
      .map(([metric, threshold]) => ({
        rule: 'quality-threshold',
        message: `${metric} (${qualityReport[metric as keyof typeof qualityReport]}%) below threshold (${threshold}%)`,
        severity: 'warning' as const,
      }));

    return {
      valid,
      errors,
      warnings: [],
      info: [],
      summary: {
        totalRules: Object.keys(thresholds).length,
        passedRules: Object.keys(thresholds).length - errors.length,
        failedRules: errors.length,
        warningRules: errors.length,
        infoRules: 0,
        validationTime: 0,
      },
      qualityReport,
    };
  },

  async validateCombined(this: INodeExecuteFunctions, data: any, itemIndex: number): Promise<any> {
    const rulesResult = await this.validateWithRules(data, itemIndex);
    const schemaResult = await this.validateWithSchema(data, itemIndex);
    const qualityResult = await this.validateDataQuality([data], itemIndex);

    return {
      valid: rulesResult.valid && schemaResult.valid && qualityResult.valid,
      errors: [...rulesResult.errors, ...schemaResult.errors, ...qualityResult.errors],
      warnings: [...rulesResult.warnings, ...schemaResult.warnings, ...qualityResult.warnings],
      info: [...rulesResult.info, ...schemaResult.info, ...qualityResult.info],
      summary: {
        totalRules: rulesResult.summary.totalRules + schemaResult.summary.totalRules + qualityResult.summary.totalRules,
        passedRules: rulesResult.summary.passedRules + schemaResult.summary.passedRules + qualityResult.summary.passedRules,
        failedRules: rulesResult.summary.failedRules + schemaResult.summary.failedRules + qualityResult.summary.failedRules,
        warningRules: rulesResult.summary.warningRules + schemaResult.summary.warningRules + qualityResult.summary.warningRules,
        infoRules: rulesResult.summary.infoRules + schemaResult.summary.infoRules + qualityResult.summary.infoRules,
        validationTime: rulesResult.summary.validationTime + schemaResult.summary.validationTime + qualityResult.summary.validationTime,
      },
      rulesResult,
      schemaResult,
      qualityResult,
    };
  },

  buildRuleConfig(ruleConfig: any): any {
    const { ruleType } = ruleConfig;

    switch (ruleType) {
      case 'required':
        return {
          allowEmpty: ruleConfig.allowEmpty,
        };

      case 'regex':
        return {
          pattern: ruleConfig.regexPattern,
          flags: ruleConfig.regexFlags,
        };

      case 'range':
        return {
          min: ruleConfig.rangeMin,
          max: ruleConfig.rangeMax,
          inclusive: ruleConfig.rangeInclusive,
        };

      case 'length':
        return {
          min: ruleConfig.lengthMin,
          max: ruleConfig.lengthMax,
        };

      case 'custom':
        const context = ruleConfig.customContext ? JSON.parse(ruleConfig.customContext) : {};
        return {
          code: ruleConfig.customCode,
          context,
        };

      case 'joi':
      case 'ajv':
        const schema = ruleType === 'joi' ? ruleConfig.schema : JSON.parse(ruleConfig.schema);
        const options = ruleConfig.schemaOptions ? JSON.parse(ruleConfig.schemaOptions) : {};
        return {
          schema,
          options,
        };

      case 'reference':
        const referenceData = JSON.parse(ruleConfig.referenceData);
        return {
          referenceField: ruleConfig.referenceField,
          referenceData,
        };

      default:
        return {};
    }
  },

  processValidationResult(item: any, validationResult: any, outputMode: string, includeMetadata: boolean, itemIndex: number): any {
    const baseResult = {
      pairedItem: { item: itemIndex },
    };

    switch (outputMode) {
      case 'split':
        return {
          ...baseResult,
          json: includeMetadata ? {
            ...item.json,
            _validation: validationResult,
          } : item.json,
        };

      case 'annotate':
        return {
          ...baseResult,
          json: {
            ...item.json,
            _validation: {
              valid: validationResult.valid,
              errors: validationResult.errors,
              warnings: validationResult.warnings,
              summary: validationResult.summary,
            },
          },
        };

      case 'filter':
        return validationResult.valid ? {
          ...baseResult,
          json: item.json,
        } : null;

      case 'report':
        return {
          ...baseResult,
          json: {
            originalData: item.json,
            validationReport: validationResult,
          },
        };

      default:
        return {
          ...baseResult,
          json: item.json,
        };
    }
  },
};