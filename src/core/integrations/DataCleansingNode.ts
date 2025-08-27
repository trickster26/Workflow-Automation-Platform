import { INodeType, INodeExecuteFunctions } from '../NodeRegistry';
import { dataCleansingService, CleansingRule } from '../../services/DataCleansingService';

export const DataCleansingNode: INodeType = {
  description: {
    displayName: 'Data Cleansing',
    name: 'dataCleansing',
    group: ['transform'],
    version: 1,
    description: 'Clean and standardize data by removing duplicates, normalizing values, and applying cleansing rules',
    defaults: {
      name: 'Data Cleansing',
      color: '#00aa88',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        name: 'cleansingRules',
        displayName: 'Cleansing Rules',
        type: 'collection',
        placeholder: 'Add Rule',
        default: [],
        typeOptions: {
          multipleValues: true,
          multipleValueButtonText: 'Add Rule',
        },
        description: 'List of cleansing rules to apply',
        options: [
          {
            name: 'ruleName',
            displayName: 'Rule Name',
            type: 'string',
            default: '',
            description: 'Name for this cleansing rule',
          },
          {
            name: 'ruleType',
            displayName: 'Rule Type',
            type: 'options',
            options: [
              { name: 'Remove Duplicates', value: 'deduplicate' },
              { name: 'Normalize Values', value: 'normalize' },
              { name: 'Standardize Format', value: 'standardize' },
              { name: 'Trim Whitespace', value: 'trim' },
              { name: 'Replace Values', value: 'replace' },
              { name: 'Remove Values', value: 'remove' },
              { name: 'Format Values', value: 'format' },
              { name: 'Validate & Clean', value: 'validate' },
            ],
            default: 'trim',
            description: 'Type of cleansing operation',
          },
          {
            name: 'field',
            displayName: 'Field Path',
            type: 'string',
            default: '',
            description: 'Path to field to clean (leave empty for entire object)',
          },
          {
            name: 'enabled',
            displayName: 'Enabled',
            type: 'boolean',
            default: true,
            description: 'Enable or disable this rule',
          },
          // Deduplication options
          {
            name: 'dedupeStrategy',
            displayName: 'Deduplication Strategy',
            type: 'options',
            options: [
              { name: 'Exact Match', value: 'exact' },
              { name: 'Fuzzy Match', value: 'fuzzy' },
              { name: 'Semantic Match', value: 'semantic' },
            ],
            default: 'exact',
            description: 'Strategy for detecting duplicates',
            displayOptions: {
              show: {
                ruleType: ['deduplicate'],
              },
            },
          },
          {
            name: 'dedupeFields',
            displayName: 'Fields to Compare',
            type: 'string',
            default: '',
            description: 'Comma-separated fields to compare (empty = entire object)',
            displayOptions: {
              show: {
                ruleType: ['deduplicate'],
              },
            },
          },
          {
            name: 'dedupeThreshold',
            displayName: 'Similarity Threshold',
            type: 'number',
            default: 0.85,
            description: 'Similarity threshold for fuzzy matching (0-1)',
            displayOptions: {
              show: {
                ruleType: ['deduplicate'],
                dedupeStrategy: ['fuzzy', 'semantic'],
              },
            },
          },
          {
            name: 'dedupeCaseSensitive',
            displayName: 'Case Sensitive',
            type: 'boolean',
            default: false,
            description: 'Perform case-sensitive comparison',
            displayOptions: {
              show: {
                ruleType: ['deduplicate'],
              },
            },
          },
          {
            name: 'dedupeTrimWhitespace',
            displayName: 'Trim Whitespace',
            type: 'boolean',
            default: true,
            description: 'Trim whitespace before comparison',
            displayOptions: {
              show: {
                ruleType: ['deduplicate'],
              },
            },
          },
          // Normalization options
          {
            name: 'normalizeType',
            displayName: 'Normalization Type',
            type: 'options',
            options: [
              { name: 'Case', value: 'case' },
              { name: 'Whitespace', value: 'whitespace' },
              { name: 'Encoding', value: 'encoding' },
              { name: 'Phone Number', value: 'phone' },
              { name: 'Email Address', value: 'email' },
              { name: 'Address', value: 'address' },
              { name: 'Name', value: 'name' },
            ],
            default: 'case',
            description: 'Type of normalization to apply',
            displayOptions: {
              show: {
                ruleType: ['normalize'],
              },
            },
          },
          {
            name: 'caseType',
            displayName: 'Case Type',
            type: 'options',
            options: [
              { name: 'Uppercase', value: 'upper' },
              { name: 'Lowercase', value: 'lower' },
              { name: 'Title Case', value: 'title' },
              { name: 'Sentence Case', value: 'sentence' },
            ],
            default: 'lower',
            description: 'Type of case normalization',
            displayOptions: {
              show: {
                ruleType: ['normalize'],
                normalizeType: ['case'],
              },
            },
          },
          {
            name: 'trimStrategy',
            displayName: 'Trim Strategy',
            type: 'options',
            options: [
              { name: 'All Whitespace', value: 'all' },
              { name: 'Leading Only', value: 'leading' },
              { name: 'Trailing Only', value: 'trailing' },
              { name: 'Multiple Spaces', value: 'multiple' },
            ],
            default: 'all',
            description: 'Whitespace trimming strategy',
            displayOptions: {
              show: {
                ruleType: ['normalize'],
                normalizeType: ['whitespace'],
              },
            },
          },
          // Standardization options
          {
            name: 'standardizeType',
            displayName: 'Standardization Type',
            type: 'options',
            options: [
              { name: 'Format Pattern', value: 'format' },
              { name: 'Enum Values', value: 'enum' },
              { name: 'Lookup Table', value: 'lookup' },
              { name: 'Pattern Validation', value: 'pattern' },
            ],
            default: 'format',
            description: 'Type of standardization to apply',
            displayOptions: {
              show: {
                ruleType: ['standardize'],
              },
            },
          },
          {
            name: 'formatPattern',
            displayName: 'Format Pattern',
            type: 'string',
            default: '',
            description: 'Format pattern to apply (e.g., {value} or regex pattern)',
            displayOptions: {
              show: {
                ruleType: ['standardize'],
                standardizeType: ['format', 'pattern'],
              },
            },
          },
          {
            name: 'enumValues',
            displayName: 'Valid Values',
            type: 'string',
            default: '[]',
            description: 'JSON array of valid enum values',
            displayOptions: {
              show: {
                ruleType: ['standardize'],
                standardizeType: ['enum'],
              },
            },
          },
          {
            name: 'lookupTable',
            displayName: 'Lookup Mappings',
            type: 'string',
            typeOptions: {
              rows: 4,
            },
            default: '{}',
            description: 'JSON object mapping old values to new values',
            displayOptions: {
              show: {
                ruleType: ['standardize'],
                standardizeType: ['lookup'],
              },
            },
          },
          {
            name: 'defaultValue',
            displayName: 'Default Value',
            type: 'string',
            default: '',
            description: 'Default value for invalid/unmapped values',
            displayOptions: {
              show: {
                ruleType: ['standardize'],
              },
            },
          },
          // Replace options
          {
            name: 'findValue',
            displayName: 'Find Value',
            type: 'string',
            default: '',
            description: 'Value or pattern to find',
            displayOptions: {
              show: {
                ruleType: ['replace'],
              },
            },
          },
          {
            name: 'replaceValue',
            displayName: 'Replace With',
            type: 'string',
            default: '',
            description: 'Replacement value',
            displayOptions: {
              show: {
                ruleType: ['replace'],
              },
            },
          },
          {
            name: 'useRegex',
            displayName: 'Use Regular Expression',
            type: 'boolean',
            default: false,
            description: 'Treat find value as regular expression',
            displayOptions: {
              show: {
                ruleType: ['replace'],
              },
            },
          },
          {
            name: 'caseSensitive',
            displayName: 'Case Sensitive',
            type: 'boolean',
            default: true,
            description: 'Perform case-sensitive replacement',
            displayOptions: {
              show: {
                ruleType: ['replace'],
              },
            },
          },
          // Remove options
          {
            name: 'removeCriteria',
            displayName: 'Removal Criteria',
            type: 'string',
            default: '{"null": true, "empty": true}',
            description: 'JSON object defining removal criteria',
            displayOptions: {
              show: {
                ruleType: ['remove'],
              },
            },
          },
          {
            name: 'removeStrategy',
            displayName: 'Remove Strategy',
            type: 'options',
            options: [
              { name: 'Set to Null', value: 'null' },
              { name: 'Delete Field', value: 'delete' },
              { name: 'Remove Record', value: 'record' },
            ],
            default: 'null',
            description: 'How to handle removed values',
            displayOptions: {
              show: {
                ruleType: ['remove'],
              },
            },
          },
          // Format options
          {
            name: 'formatType',
            displayName: 'Format Type',
            type: 'options',
            options: [
              { name: 'String', value: 'string' },
              { name: 'Number', value: 'number' },
              { name: 'Date', value: 'date' },
            ],
            default: 'string',
            description: 'Type of value to format',
            displayOptions: {
              show: {
                ruleType: ['format'],
              },
            },
          },
          {
            name: 'formatString',
            displayName: 'Format String',
            type: 'string',
            default: '',
            description: 'Format string (e.g., YYYY-MM-DD for dates, #,##0.00 for numbers)',
            displayOptions: {
              show: {
                ruleType: ['format'],
              },
            },
          },
          // Validation options
          {
            name: 'validationRules',
            displayName: 'Validation Rules',
            type: 'string',
            typeOptions: {
              rows: 4,
            },
            default: '[]',
            description: 'JSON array of validation rules',
            displayOptions: {
              show: {
                ruleType: ['validate'],
              },
            },
          },
          {
            name: 'validationAction',
            displayName: 'Validation Action',
            type: 'options',
            options: [
              { name: 'Remove Invalid', value: 'remove' },
              { name: 'Mark Invalid', value: 'mark' },
              { name: 'Fix Invalid', value: 'fix' },
            ],
            default: 'remove',
            description: 'Action to take for invalid data',
            displayOptions: {
              show: {
                ruleType: ['validate'],
              },
            },
          },
        ],
      },
      {
        name: 'processingMode',
        displayName: 'Processing Mode',
        type: 'options',
        options: [
          { name: 'Sequential', value: 'sequential' },
          { name: 'Parallel', value: 'parallel' },
        ],
        default: 'sequential',
        description: 'How to apply cleansing rules',
      },
      {
        name: 'continueOnError',
        displayName: 'Continue on Error',
        type: 'boolean',
        default: true,
        description: 'Continue processing if a rule fails',
      },
      {
        name: 'outputSummary',
        displayName: 'Include Summary',
        type: 'boolean',
        default: true,
        description: 'Include cleansing summary in output',
      },
      {
        name: 'preserveOriginal',
        displayName: 'Preserve Original',
        type: 'boolean',
        default: false,
        description: 'Keep original data in _original field',
      },
    ],
  },

  async execute(this: INodeExecuteFunctions): Promise<any[]> {
    const items = this.getInputData();
    const cleansingRulesConfig = this.getNodeParameter('cleansingRules', 0, []) as any[];
    const processingMode = this.getNodeParameter('processingMode', 0) as string;
    const continueOnError = this.getNodeParameter('continueOnError', 0, true) as boolean;
    const outputSummary = this.getNodeParameter('outputSummary', 0, true) as boolean;
    const preserveOriginal = this.getNodeParameter('preserveOriginal', 0, false) as boolean;

    const returnData = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        // Convert node parameters to CleansingRule format
        const cleansingRules: CleansingRule[] = cleansingRulesConfig.map((ruleConfig, index) => ({
          id: `rule_${index}`,
          name: ruleConfig.ruleName || `${ruleConfig.ruleType} rule`,
          type: ruleConfig.ruleType,
          field: ruleConfig.field || undefined,
          config: this.buildCleansingConfig(ruleConfig),
          enabled: ruleConfig.enabled !== false,
        }));

        // Apply cleansing rules
        const result = await dataCleansingService.cleanseData(item.json, cleansingRules);

        if (!result.success && !continueOnError) {
          throw new Error(`Data cleansing failed: ${result.summary.issues[0]?.issue || 'Unknown error'}`);
        }

        // Build output object
        let outputData: any = result.data;

        if (preserveOriginal) {
          outputData = {
            data: result.data,
            _original: item.json
          };
        }

        if (outputSummary) {
          outputData = {
            ...outputData,
            _cleansing: {
              success: result.success,
              originalCount: result.originalCount,
              cleanedCount: result.cleanedCount,
              duplicatesRemoved: result.duplicatesRemoved,
              invalidRecordsRemoved: result.invalidRecordsRemoved,
              modificationsCount: result.modificationsCount,
              appliedRules: result.summary.appliedRules,
              executionTime: result.summary.executionTime,
              issues: result.summary.issues,
            }
          };
        }

        returnData.push({
          json: outputData,
          pairedItem: { item: i },
        });

      } catch (error) {
        if (continueOnError || this.continueOnFail?.()) {
          returnData.push({
            json: {
              error: error instanceof Error ? error.message : 'Unknown cleansing error',
              originalData: item.json,
            },
            pairedItem: { item: i },
          });
        } else {
          throw error;
        }
      }
    }

    return returnData;
  },

  buildCleansingConfig(ruleConfig: any): any {
    const { ruleType } = ruleConfig;

    switch (ruleType) {
      case 'deduplicate':
        const fields = ruleConfig.dedupeFields ? 
          ruleConfig.dedupeFields.split(',').map((f: string) => f.trim()) : 
          undefined;
        return {
          fields,
          strategy: ruleConfig.dedupeStrategy,
          threshold: ruleConfig.dedupeThreshold,
          caseSensitive: ruleConfig.dedupeCaseSensitive,
          trimWhitespace: ruleConfig.dedupeTrimWhitespace,
        };

      case 'normalize':
        return {
          type: ruleConfig.normalizeType,
          caseType: ruleConfig.caseType,
          trimStrategy: ruleConfig.trimStrategy,
        };

      case 'standardize':
        const config: any = {
          type: ruleConfig.standardizeType,
          defaultValue: ruleConfig.defaultValue,
        };
        
        if (ruleConfig.standardizeType === 'format' || ruleConfig.standardizeType === 'pattern') {
          config.format = ruleConfig.formatPattern;
        }
        
        if (ruleConfig.standardizeType === 'enum') {
          config.enumValues = JSON.parse(ruleConfig.enumValues);
        }
        
        if (ruleConfig.standardizeType === 'lookup') {
          config.lookupTable = JSON.parse(ruleConfig.lookupTable);
        }
        
        return config;

      case 'trim':
        return {};

      case 'replace':
        return {
          find: ruleConfig.findValue,
          replace: ruleConfig.replaceValue,
          regex: ruleConfig.useRegex,
          caseSensitive: ruleConfig.caseSensitive,
        };

      case 'remove':
        return {
          criteria: JSON.parse(ruleConfig.removeCriteria),
          strategy: ruleConfig.removeStrategy,
        };

      case 'format':
        return {
          type: ruleConfig.formatType,
          format: ruleConfig.formatString,
        };

      case 'validate':
        return {
          validationRules: JSON.parse(ruleConfig.validationRules),
          action: ruleConfig.validationAction,
        };

      default:
        return {};
    }
  },
};