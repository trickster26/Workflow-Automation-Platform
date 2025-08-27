import { INodeType, INodeExecuteFunctions } from '../NodeRegistry';

export const FilterNode: INodeType = {
  description: {
    displayName: 'Filter',
    name: 'filter',
    group: ['transform'],
    version: 1,
    description: 'Filter data based on conditions, expressions, or custom logic with advanced filtering capabilities',
    defaults: {
      name: 'Filter',
      color: '#4CAF50',
    },
    inputs: ['main'],
    outputs: ['main', 'main'],
    outputNames: ['Pass', 'Filtered Out'],
    properties: [
      {
        name: 'filterMode',
        displayName: 'Filter Mode',
        type: 'options',
        options: [
          { name: 'Simple Conditions', value: 'simple' },
          { name: 'Advanced Expression', value: 'expression' },
          { name: 'Multiple Rules', value: 'rules' },
          { name: 'Custom JavaScript', value: 'custom' },
          { name: 'Field-based Filter', value: 'field' },
          { name: 'Array Filter', value: 'array' },
        ],
        default: 'simple',
        description: 'Type of filtering to apply',
      },
      
      // Simple conditions
      {
        name: 'conditions',
        displayName: 'Conditions',
        type: 'collection',
        placeholder: 'Add Condition',
        default: [],
        typeOptions: {
          multipleValues: true,
          multipleValueButtonText: 'Add Condition',
        },
        description: 'List of conditions to evaluate',
        displayOptions: {
          show: {
            filterMode: ['simple', 'rules'],
          },
        },
        options: [
          {
            name: 'field',
            displayName: 'Field Path',
            type: 'string',
            default: '',
            placeholder: 'user.name',
            description: 'Path to the field to check (e.g., user.email, items[0].status)',
          },
          {
            name: 'operator',
            displayName: 'Operator',
            type: 'options',
            options: [
              { name: 'Equals', value: 'equals' },
              { name: 'Not Equals', value: 'notEquals' },
              { name: 'Contains', value: 'contains' },
              { name: 'Not Contains', value: 'notContains' },
              { name: 'Starts With', value: 'startsWith' },
              { name: 'Ends With', value: 'endsWith' },
              { name: 'Greater Than', value: 'greaterThan' },
              { name: 'Less Than', value: 'lessThan' },
              { name: 'Greater or Equal', value: 'greaterThanOrEqual' },
              { name: 'Less or Equal', value: 'lessThanOrEqual' },
              { name: 'Is Empty', value: 'isEmpty' },
              { name: 'Is Not Empty', value: 'isNotEmpty' },
              { name: 'Is Null', value: 'isNull' },
              { name: 'Is Not Null', value: 'isNotNull' },
              { name: 'Matches Regex', value: 'regex' },
              { name: 'In Array', value: 'in' },
              { name: 'Not In Array', value: 'notIn' },
              { name: 'Between', value: 'between' },
              { name: 'Type Is', value: 'typeIs' },
            ],
            default: 'equals',
            description: 'Comparison operator',
          },
          {
            name: 'value',
            displayName: 'Value',
            type: 'string',
            default: '',
            description: 'Value to compare against',
            displayOptions: {
              hide: {
                operator: ['isEmpty', 'isNotEmpty', 'isNull', 'isNotNull'],
              },
            },
          },
          {
            name: 'value2',
            displayName: 'Second Value',
            type: 'string',
            default: '',
            description: 'Second value for between operator',
            displayOptions: {
              show: {
                operator: ['between'],
              },
            },
          },
          {
            name: 'arrayValues',
            displayName: 'Array Values',
            type: 'string',
            default: '[]',
            description: 'JSON array of values to check against',
            displayOptions: {
              show: {
                operator: ['in', 'notIn'],
              },
            },
          },
          {
            name: 'regexFlags',
            displayName: 'Regex Flags',
            type: 'string',
            default: 'i',
            description: 'Regular expression flags (i, g, m, etc.)',
            displayOptions: {
              show: {
                operator: ['regex'],
              },
            },
          },
          {
            name: 'caseSensitive',
            displayName: 'Case Sensitive',
            type: 'boolean',
            default: false,
            description: 'Whether string comparisons should be case sensitive',
            displayOptions: {
              show: {
                operator: ['equals', 'notEquals', 'contains', 'notContains', 'startsWith', 'endsWith'],
              },
            },
          },
          {
            name: 'dataType',
            displayName: 'Data Type',
            type: 'options',
            options: [
              { name: 'Auto-detect', value: 'auto' },
              { name: 'String', value: 'string' },
              { name: 'Number', value: 'number' },
              { name: 'Boolean', value: 'boolean' },
              { name: 'Date', value: 'date' },
            ],
            default: 'auto',
            description: 'How to interpret the field value',
          },
        ],
      },

      // Logic operator for multiple conditions
      {
        name: 'logicOperator',
        displayName: 'Logic Operator',
        type: 'options',
        options: [
          { name: 'AND (All conditions must match)', value: 'and' },
          { name: 'OR (Any condition must match)', value: 'or' },
        ],
        default: 'and',
        description: 'How to combine multiple conditions',
        displayOptions: {
          show: {
            filterMode: ['simple', 'rules'],
          },
        },
      },

      // Advanced expression
      {
        name: 'expression',
        displayName: 'Filter Expression',
        type: 'string',
        typeOptions: {
          rows: 3,
        },
        default: '',
        placeholder: '$.user.age > 18 && $.status === "active"',
        description: 'JavaScript expression to evaluate (use $ for input data)',
        displayOptions: {
          show: {
            filterMode: ['expression'],
          },
        },
      },

      // Custom JavaScript
      {
        name: 'customCode',
        displayName: 'Filter Function',
        type: 'string',
        typeOptions: {
          rows: 6,
        },
        default: 'return item.status === "active";',
        description: 'JavaScript function body that returns true to keep the item',
        displayOptions: {
          show: {
            filterMode: ['custom'],
          },
        },
      },
      {
        name: 'customContext',
        displayName: 'Context Variables',
        type: 'string',
        default: '{}',
        description: 'JSON object with additional context variables',
        displayOptions: {
          show: {
            filterMode: ['custom'],
          },
        },
      },

      // Field-based filter
      {
        name: 'fieldsToInclude',
        displayName: 'Fields to Include',
        type: 'string',
        default: '',
        placeholder: 'name,email,status',
        description: 'Comma-separated list of fields to include in output (empty = all fields)',
        displayOptions: {
          show: {
            filterMode: ['field'],
          },
        },
      },
      {
        name: 'fieldsToExclude',
        displayName: 'Fields to Exclude',
        type: 'string',
        default: '',
        placeholder: 'password,secret',
        description: 'Comma-separated list of fields to exclude from output',
        displayOptions: {
          show: {
            filterMode: ['field'],
          },
        },
      },

      // Array filter
      {
        name: 'arrayField',
        displayName: 'Array Field Path',
        type: 'string',
        default: 'items',
        placeholder: 'data.items',
        description: 'Path to array field to filter',
        displayOptions: {
          show: {
            filterMode: ['array'],
          },
        },
      },
      {
        name: 'arrayFilterExpression',
        displayName: 'Array Filter Expression',
        type: 'string',
        default: '',
        placeholder: 'item.active === true',
        description: 'JavaScript expression to filter array items (use "item" for current array item)',
        displayOptions: {
          show: {
            filterMode: ['array'],
          },
        },
      },

      // Output options
      {
        name: 'outputMode',
        displayName: 'Output Mode',
        type: 'options',
        options: [
          { name: 'Split Pass/Fail', value: 'split' },
          { name: 'Pass Only', value: 'passOnly' },
          { name: 'Fail Only', value: 'failOnly' },
          { name: 'Count Results', value: 'count' },
          { name: 'Add Filter Results', value: 'annotate' },
        ],
        default: 'split',
        description: 'How to output filtered results',
      },

      {
        name: 'keepOriginalStructure',
        displayName: 'Keep Original Structure',
        type: 'boolean',
        default: true,
        description: 'Preserve the original data structure',
        displayOptions: {
          hide: {
            filterMode: ['field'],
          },
        },
      },

      {
        name: 'addFilterMetadata',
        displayName: 'Add Filter Metadata',
        type: 'boolean',
        default: false,
        description: 'Add metadata about the filtering operation to results',
      },

      {
        name: 'limit',
        displayName: 'Limit Results',
        type: 'number',
        default: 0,
        description: 'Maximum number of items to return (0 = no limit)',
      },

      {
        name: 'offset',
        displayName: 'Skip Items',
        type: 'number',
        default: 0,
        description: 'Number of items to skip from the beginning',
      },
    ],
  },

  async execute(this: INodeExecuteFunctions): Promise<any[]> {
    const items = this.getInputData();
    const filterMode = this.getNodeParameter('filterMode', 0) as string;
    const outputMode = this.getNodeParameter('outputMode', 0) as string;
    const keepOriginalStructure = this.getNodeParameter('keepOriginalStructure', 0, true) as boolean;
    const addFilterMetadata = this.getNodeParameter('addFilterMetadata', 0, false) as boolean;
    const limit = this.getNodeParameter('limit', 0, 0) as number;
    const offset = this.getNodeParameter('offset', 0, 0) as number;

    const passedItems = [];
    const filteredOutItems = [];
    let processedCount = 0;
    let matchedCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      try {
        // Skip items if offset is specified
        if (processedCount < offset) {
          processedCount++;
          continue;
        }

        // Stop if limit is reached
        if (limit > 0 && matchedCount >= limit) {
          break;
        }

        let passed = false;

        switch (filterMode) {
          case 'simple':
          case 'rules':
            passed = await this.evaluateConditions(item.json, i);
            break;
          case 'expression':
            passed = await this.evaluateExpression(item.json, i);
            break;
          case 'custom':
            passed = await this.evaluateCustomCode(item.json, i);
            break;
          case 'field':
            const filteredData = this.filterFields(item.json, i);
            passedItems.push({
              json: filteredData,
              pairedItem: { item: i },
            });
            continue;
          case 'array':
            const arrayResult = this.filterArray(item.json, i);
            passedItems.push({
              json: arrayResult,
              pairedItem: { item: i },
            });
            continue;
          default:
            throw new Error(`Unknown filter mode: ${filterMode}`);
        }

        processedCount++;

        const resultData = keepOriginalStructure ? item.json : { ...item.json };
        
        if (addFilterMetadata) {
          resultData._filterMetadata = {
            mode: filterMode,
            passed,
            processedAt: new Date().toISOString(),
            itemIndex: i,
          };
        }

        const resultItem = {
          json: resultData,
          pairedItem: { item: i },
        };

        if (passed) {
          passedItems.push(resultItem);
          matchedCount++;
        } else {
          filteredOutItems.push(resultItem);
        }

      } catch (error) {
        if (this.continueOnFail?.()) {
          const errorResult = {
            json: {
              error: error instanceof Error ? error.message : 'Filter evaluation error',
              originalData: item.json,
            },
            pairedItem: { item: i },
          };
          filteredOutItems.push(errorResult);
        } else {
          throw error;
        }
      }
    }

    // Return results based on output mode
    switch (outputMode) {
      case 'split':
        return [passedItems, filteredOutItems];
      case 'passOnly':
        return [passedItems];
      case 'failOnly':
        return [filteredOutItems];
      case 'count':
        return [{
          json: {
            totalItems: items.length,
            processedItems: processedCount,
            passedItems: passedItems.length,
            filteredOutItems: filteredOutItems.length,
            matchRate: processedCount > 0 ? (passedItems.length / processedCount) * 100 : 0,
          },
        }];
      case 'annotate':
        return [
          ...passedItems.map(item => ({
            ...item,
            json: { ...item.json, _filterResult: 'passed' },
          })),
          ...filteredOutItems.map(item => ({
            ...item,
            json: { ...item.json, _filterResult: 'filtered' },
          })),
        ];
      default:
        return [passedItems];
    }
  },

  async evaluateConditions(this: INodeExecuteFunctions, data: any, itemIndex: number): Promise<boolean> {
    const conditions = this.getNodeParameter('conditions', itemIndex, []) as any[];
    const logicOperator = this.getNodeParameter('logicOperator', itemIndex, 'and') as string;

    if (conditions.length === 0) {
      return true; // No conditions means pass all
    }

    const results = conditions.map(condition => {
      const fieldValue = this.getNestedValue(data, condition.field);
      return this.evaluateCondition(fieldValue, condition);
    });

    return logicOperator === 'and' 
      ? results.every(result => result)
      : results.some(result => result);
  },

  evaluateCondition(fieldValue: any, condition: any): boolean {
    const { operator, value, value2, arrayValues, caseSensitive, dataType, regexFlags } = condition;
    
    // Convert field value based on data type
    const convertedFieldValue = this.convertValue(fieldValue, dataType);
    const convertedValue = this.convertValue(value, dataType);

    switch (operator) {
      case 'equals':
        return caseSensitive 
          ? convertedFieldValue === convertedValue
          : String(convertedFieldValue).toLowerCase() === String(convertedValue).toLowerCase();
      
      case 'notEquals':
        return caseSensitive 
          ? convertedFieldValue !== convertedValue
          : String(convertedFieldValue).toLowerCase() !== String(convertedValue).toLowerCase();
      
      case 'contains':
        const fieldStr = String(convertedFieldValue);
        const valueStr = String(convertedValue);
        return caseSensitive 
          ? fieldStr.includes(valueStr)
          : fieldStr.toLowerCase().includes(valueStr.toLowerCase());
      
      case 'notContains':
        const fieldStr2 = String(convertedFieldValue);
        const valueStr2 = String(convertedValue);
        return caseSensitive 
          ? !fieldStr2.includes(valueStr2)
          : !fieldStr2.toLowerCase().includes(valueStr2.toLowerCase());
      
      case 'startsWith':
        const fieldStr3 = String(convertedFieldValue);
        const valueStr3 = String(convertedValue);
        return caseSensitive 
          ? fieldStr3.startsWith(valueStr3)
          : fieldStr3.toLowerCase().startsWith(valueStr3.toLowerCase());
      
      case 'endsWith':
        const fieldStr4 = String(convertedFieldValue);
        const valueStr4 = String(convertedValue);
        return caseSensitive 
          ? fieldStr4.endsWith(valueStr4)
          : fieldStr4.toLowerCase().endsWith(valueStr4.toLowerCase());
      
      case 'greaterThan':
        return Number(convertedFieldValue) > Number(convertedValue);
      
      case 'lessThan':
        return Number(convertedFieldValue) < Number(convertedValue);
      
      case 'greaterThanOrEqual':
        return Number(convertedFieldValue) >= Number(convertedValue);
      
      case 'lessThanOrEqual':
        return Number(convertedFieldValue) <= Number(convertedValue);
      
      case 'isEmpty':
        return convertedFieldValue === '' || convertedFieldValue == null || 
               (Array.isArray(convertedFieldValue) && convertedFieldValue.length === 0);
      
      case 'isNotEmpty':
        return convertedFieldValue !== '' && convertedFieldValue != null && 
               !(Array.isArray(convertedFieldValue) && convertedFieldValue.length === 0);
      
      case 'isNull':
        return convertedFieldValue === null || convertedFieldValue === undefined;
      
      case 'isNotNull':
        return convertedFieldValue !== null && convertedFieldValue !== undefined;
      
      case 'regex':
        try {
          const regex = new RegExp(String(convertedValue), regexFlags || 'i');
          return regex.test(String(convertedFieldValue));
        } catch {
          return false;
        }
      
      case 'in':
        try {
          const array = JSON.parse(arrayValues);
          return Array.isArray(array) && array.includes(convertedFieldValue);
        } catch {
          return false;
        }
      
      case 'notIn':
        try {
          const array = JSON.parse(arrayValues);
          return Array.isArray(array) && !array.includes(convertedFieldValue);
        } catch {
          return false;
        }
      
      case 'between':
        const numValue = Number(convertedFieldValue);
        const numValue1 = Number(convertedValue);
        const numValue2 = Number(value2);
        return numValue >= Math.min(numValue1, numValue2) && numValue <= Math.max(numValue1, numValue2);
      
      case 'typeIs':
        return typeof convertedFieldValue === convertedValue;
      
      default:
        return false;
    }
  },

  async evaluateExpression(this: INodeExecuteFunctions, data: any, itemIndex: number): Promise<boolean> {
    const expression = this.getNodeParameter('expression', itemIndex) as string;
    
    if (!expression) {
      return true;
    }

    try {
      // Replace $ with the actual data
      const processedExpression = expression.replace(/\$/g, 'data');
      const func = new Function('data', `return (${processedExpression})`);
      return Boolean(func(data));
    } catch (error) {
      if (this.continueOnFail?.()) {
        return false;
      }
      throw new Error(`Expression evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async evaluateCustomCode(this: INodeExecuteFunctions, data: any, itemIndex: number): Promise<boolean> {
    const customCode = this.getNodeParameter('customCode', itemIndex) as string;
    const contextStr = this.getNodeParameter('customContext', itemIndex, '{}') as string;
    
    if (!customCode) {
      return true;
    }

    try {
      const context = JSON.parse(contextStr);
      const func = new Function('item', 'context', 'index', customCode);
      return Boolean(func(data, context, itemIndex));
    } catch (error) {
      if (this.continueOnFail?.()) {
        return false;
      }
      throw new Error(`Custom code evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  filterFields(this: INodeExecuteFunctions, data: any, itemIndex: number): any {
    const fieldsToInclude = this.getNodeParameter('fieldsToInclude', itemIndex, '') as string;
    const fieldsToExclude = this.getNodeParameter('fieldsToExclude', itemIndex, '') as string;

    let result = { ...data };

    if (fieldsToExclude) {
      const excludeFields = fieldsToExclude.split(',').map(f => f.trim());
      excludeFields.forEach(field => {
        this.deleteNestedValue(result, field);
      });
    }

    if (fieldsToInclude) {
      const includeFields = fieldsToInclude.split(',').map(f => f.trim());
      const filtered: any = {};
      
      includeFields.forEach(field => {
        const value = this.getNestedValue(data, field);
        if (value !== undefined) {
          this.setNestedValue(filtered, field, value);
        }
      });
      
      result = filtered;
    }

    return result;
  },

  filterArray(this: INodeExecuteFunctions, data: any, itemIndex: number): any {
    const arrayField = this.getNodeParameter('arrayField', itemIndex, '') as string;
    const arrayFilterExpression = this.getNodeParameter('arrayFilterExpression', itemIndex, '') as string;

    const arrayData = this.getNestedValue(data, arrayField);
    
    if (!Array.isArray(arrayData)) {
      return data;
    }

    if (!arrayFilterExpression) {
      return data;
    }

    try {
      const filteredArray = arrayData.filter((item, index) => {
        const func = new Function('item', 'index', `return (${arrayFilterExpression})`);
        return Boolean(func(item, index));
      });

      const result = { ...data };
      this.setNestedValue(result, arrayField, filteredArray);
      return result;
    } catch (error) {
      if (this.continueOnFail?.()) {
        return data;
      }
      throw new Error(`Array filter error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  convertValue(value: any, dataType: string): any {
    if (dataType === 'auto' || !dataType) {
      return value;
    }

    switch (dataType) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      case 'date':
        return new Date(value);
      default:
        return value;
    }
  },

  getNestedValue(obj: any, path: string): any {
    if (!path) return obj;
    return path.split('.').reduce((current, key) => {
      // Handle array notation like items[0]
      if (key.includes('[') && key.includes(']')) {
        const [arrayKey, indexStr] = key.split('[');
        const index = parseInt(indexStr.replace(']', ''));
        return current && current[arrayKey] && current[arrayKey][index];
      }
      return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
  },

  setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  },

  deleteNestedValue(obj: any, path: string): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        return; // Path doesn't exist
      }
      current = current[key];
    }
    
    delete current[keys[keys.length - 1]];
  },
};