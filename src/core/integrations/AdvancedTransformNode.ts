import { INodeType, INodeExecuteFunctions } from '../NodeRegistry';
import { advancedTransformService, TransformOperation } from '../../services/AdvancedTransformService';

export const AdvancedTransformNode: INodeType = {
  description: {
    displayName: 'Advanced Transform',
    name: 'advancedTransform',
    group: ['transform'],
    version: 1,
    description: 'Advanced data transformation with JSONPath, lodash, math, and custom operations',
    defaults: {
      name: 'Advanced Transform',
      color: '#9966ff',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        name: 'operations',
        displayName: 'Transform Operations',
        type: 'collection',
        placeholder: 'Add Operation',
        default: [],
        typeOptions: {
          multipleValues: true,
          multipleValueButtonText: 'Add Operation',
        },
        description: 'List of transformation operations to apply',
        options: [
          {
            name: 'operationType',
            displayName: 'Operation Type',
            type: 'options',
            options: [
              { name: 'JSONPath Query', value: 'jsonpath' },
              { name: 'Lodash Operation', value: 'lodash' },
              { name: 'JavaScript Code', value: 'javascript' },
              { name: 'Math Expression', value: 'math' },
              { name: 'Template', value: 'template' },
              { name: 'Field Mapping', value: 'mapping' },
              { name: 'Filter Data', value: 'filter' },
              { name: 'Sort Data', value: 'sort' },
              { name: 'Group Data', value: 'group' },
              { name: 'Aggregate Data', value: 'aggregate' },
            ],
            default: 'jsonpath',
            description: 'Type of transformation to perform',
          },
          {
            name: 'description',
            displayName: 'Description',
            type: 'string',
            default: '',
            description: 'Description of what this operation does',
          },
          {
            name: 'enabled',
            displayName: 'Enabled',
            type: 'boolean',
            default: true,
            description: 'Enable or disable this operation',
          },
          // JSONPath specific options
          {
            name: 'jsonpathQuery',
            displayName: 'JSONPath Query',
            type: 'string',
            default: '$.*',
            description: 'JSONPath query string (e.g., $.users[*].name)',
            displayOptions: {
              show: {
                operationType: ['jsonpath'],
              },
            },
          },
          {
            name: 'jsonpathMode',
            displayName: 'Mode',
            type: 'options',
            options: [
              { name: 'Extract', value: 'extract' },
              { name: 'Filter', value: 'filter' },
              { name: 'Map', value: 'map' },
              { name: 'Set', value: 'set' },
            ],
            default: 'extract',
            description: 'JSONPath operation mode',
            displayOptions: {
              show: {
                operationType: ['jsonpath'],
              },
            },
          },
          {
            name: 'targetPath',
            displayName: 'Target Path',
            type: 'string',
            default: '',
            description: 'Target path for set operations',
            displayOptions: {
              show: {
                operationType: ['jsonpath'],
                jsonpathMode: ['set'],
              },
            },
          },
          // Lodash specific options
          {
            name: 'lodashMethod',
            displayName: 'Lodash Method',
            type: 'string',
            default: 'map',
            description: 'Lodash method name (e.g., map, filter, groupBy)',
            displayOptions: {
              show: {
                operationType: ['lodash'],
              },
            },
          },
          {
            name: 'lodashPath',
            displayName: 'Path',
            type: 'string',
            default: '',
            description: 'Object path to apply lodash method to (optional)',
            displayOptions: {
              show: {
                operationType: ['lodash'],
              },
            },
          },
          {
            name: 'lodashArgs',
            displayName: 'Arguments',
            type: 'string',
            default: '',
            description: 'JSON array of arguments for the lodash method',
            displayOptions: {
              show: {
                operationType: ['lodash'],
              },
            },
          },
          // JavaScript specific options
          {
            name: 'javascriptCode',
            displayName: 'JavaScript Code',
            type: 'string',
            typeOptions: {
              rows: 5,
            },
            default: 'return data;',
            description: 'JavaScript code to transform data (return the result)',
            displayOptions: {
              show: {
                operationType: ['javascript'],
              },
            },
          },
          {
            name: 'javascriptContext',
            displayName: 'Context Variables',
            type: 'string',
            default: '{}',
            description: 'JSON object with additional context variables',
            displayOptions: {
              show: {
                operationType: ['javascript'],
              },
            },
          },
          // Math specific options
          {
            name: 'mathExpression',
            displayName: 'Math Expression',
            type: 'string',
            default: 'value * 2',
            description: 'Mathematical expression (e.g., value * 2, sqrt(x + y))',
            displayOptions: {
              show: {
                operationType: ['math'],
              },
            },
          },
          {
            name: 'mathPath',
            displayName: 'Field Path',
            type: 'string',
            default: '',
            description: 'Path to field for math operations (optional)',
            displayOptions: {
              show: {
                operationType: ['math'],
              },
            },
          },
          {
            name: 'mathScope',
            displayName: 'Scope Variables',
            type: 'string',
            default: '{}',
            description: 'JSON object with variables for math expression',
            displayOptions: {
              show: {
                operationType: ['math'],
              },
            },
          },
          // Template specific options
          {
            name: 'template',
            displayName: 'Template',
            type: 'string',
            default: 'Hello {{name}}!',
            description: 'Template string with {{variable}} placeholders',
            displayOptions: {
              show: {
                operationType: ['template'],
              },
            },
          },
          {
            name: 'templateEngine',
            displayName: 'Template Engine',
            type: 'options',
            options: [
              { name: 'Handlebars', value: 'handlebars' },
              { name: 'Lodash', value: 'lodash' },
            ],
            default: 'handlebars',
            description: 'Template engine to use',
            displayOptions: {
              show: {
                operationType: ['template'],
              },
            },
          },
          // Mapping specific options
          {
            name: 'fieldMappings',
            displayName: 'Field Mappings',
            type: 'string',
            typeOptions: {
              rows: 4,
            },
            default: '[]',
            description: 'JSON array of field mappings',
            displayOptions: {
              show: {
                operationType: ['mapping'],
              },
            },
          },
          {
            name: 'mappingMode',
            displayName: 'Mapping Mode',
            type: 'options',
            options: [
              { name: 'Merge', value: 'merge' },
              { name: 'Replace', value: 'replace' },
            ],
            default: 'merge',
            description: 'How to apply mappings',
            displayOptions: {
              show: {
                operationType: ['mapping'],
              },
            },
          },
          // Filter specific options
          {
            name: 'filterConditions',
            displayName: 'Filter Conditions',
            type: 'string',
            typeOptions: {
              rows: 4,
            },
            default: '[]',
            description: 'JSON array of filter conditions',
            displayOptions: {
              show: {
                operationType: ['filter'],
              },
            },
          },
          {
            name: 'filterLogic',
            displayName: 'Logic',
            type: 'options',
            options: [
              { name: 'AND', value: 'and' },
              { name: 'OR', value: 'or' },
            ],
            default: 'and',
            description: 'Logic to combine filter conditions',
            displayOptions: {
              show: {
                operationType: ['filter'],
              },
            },
          },
          // Sort specific options
          {
            name: 'sortFields',
            displayName: 'Sort Configuration',
            type: 'string',
            default: '[{"field": "name", "direction": "asc"}]',
            description: 'JSON array of sort configurations',
            displayOptions: {
              show: {
                operationType: ['sort'],
              },
            },
          },
          // Group specific options
          {
            name: 'groupBy',
            displayName: 'Group By',
            type: 'string',
            default: 'category',
            description: 'Field or fields to group by',
            displayOptions: {
              show: {
                operationType: ['group'],
              },
            },
          },
          {
            name: 'groupAggregations',
            displayName: 'Aggregations',
            type: 'string',
            default: '{}',
            description: 'JSON object with aggregation configurations',
            displayOptions: {
              show: {
                operationType: ['group'],
              },
            },
          },
          // Aggregate specific options
          {
            name: 'aggregateConfig',
            displayName: 'Aggregation Config',
            type: 'string',
            typeOptions: {
              rows: 4,
            },
            default: '{"total": {"field": "amount", "operation": "sum"}}',
            description: 'JSON object with aggregation definitions',
            displayOptions: {
              show: {
                operationType: ['aggregate'],
              },
            },
          },
        ],
      },
      {
        name: 'continueOnError',
        displayName: 'Continue on Error',
        type: 'boolean',
        default: false,
        description: 'Continue processing if an operation fails',
      },
      {
        name: 'outputMetadata',
        displayName: 'Include Metadata',
        type: 'boolean',
        default: false,
        description: 'Include transformation metadata in output',
      },
    ],
  },

  async execute(this: INodeExecuteFunctions): Promise<any[]> {
    const items = this.getInputData();
    const operations = this.getNodeParameter('operations', 0, []) as any[];
    const continueOnError = this.getNodeParameter('continueOnError', 0, false) as boolean;
    const outputMetadata = this.getNodeParameter('outputMetadata', 0, false) as boolean;
    const returnData = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        // Convert node parameters to TransformOperation format
        const transformOperations: TransformOperation[] = operations.map((op, index) => ({
          id: `op_${index}`,
          type: op.operationType,
          description: op.description || `${op.operationType} operation`,
          config: this.buildOperationConfig(op),
          enabled: op.enabled !== false,
        }));

        // Apply transformations
        const result = await advancedTransformService.transformData(item.json, transformOperations);

        if (!result.success) {
          throw new Error(`Transformation failed: ${result.error}`);
        }

        // Build output object
        let outputData = result.data;

        if (outputMetadata && result.metadata) {
          outputData = {
            data: result.data,
            metadata: result.metadata
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
              error: error instanceof Error ? error.message : 'Unknown transformation error',
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

  // Helper method to build operation configuration from node parameters
  buildOperationConfig(operation: any): any {
    const { operationType } = operation;

    switch (operationType) {
      case 'jsonpath':
        return {
          query: operation.jsonpathQuery,
          mode: operation.jsonpathMode,
          target: operation.targetPath,
        };

      case 'lodash':
        const args = operation.lodashArgs ? JSON.parse(operation.lodashArgs) : [];
        return {
          method: operation.lodashMethod,
          path: operation.lodashPath,
          args,
        };

      case 'javascript':
        const context = operation.javascriptContext ? JSON.parse(operation.javascriptContext) : {};
        return {
          code: operation.javascriptCode,
          context,
        };

      case 'math':
        const scope = operation.mathScope ? JSON.parse(operation.mathScope) : {};
        return {
          expression: operation.mathExpression,
          path: operation.mathPath,
          scope,
        };

      case 'template':
        return {
          template: operation.template,
          engine: operation.templateEngine,
        };

      case 'mapping':
        const mappings = operation.fieldMappings ? JSON.parse(operation.fieldMappings) : [];
        return {
          mappings,
          mode: operation.mappingMode,
        };

      case 'filter':
        const conditions = operation.filterConditions ? JSON.parse(operation.filterConditions) : [];
        return {
          conditions,
          logic: operation.filterLogic,
        };

      case 'sort':
        const sorts = operation.sortFields ? JSON.parse(operation.sortFields) : [];
        return {
          sorts,
        };

      case 'group':
        const aggregations = operation.groupAggregations ? JSON.parse(operation.groupAggregations) : {};
        return {
          by: operation.groupBy,
          aggregations,
        };

      case 'aggregate':
        const aggregateConfig = operation.aggregateConfig ? JSON.parse(operation.aggregateConfig) : {};
        return {
          aggregations: aggregateConfig,
        };

      default:
        return {};
    }
  },
};