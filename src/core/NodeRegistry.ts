import { INodeTypeDescription, NodeType } from '../types/workflow.types';

export interface INodeExecuteFunctions {
  getInputData(): any[];
  getNodeParameter(parameterName: string, itemIndex: number, fallbackValue?: any): any;
  getCredentials(type: string): Promise<any>;
  continueOnFail?(): boolean;
  helpers: {
    request(options: any): Promise<any>;
    httpRequest(options: any): Promise<any>;
    prepareBinaryData(buffer: Buffer, fileName?: string, mimeType?: string): any;
  };
}

export interface INodeType {
  description: INodeTypeDescription;
  execute?(this: INodeExecuteFunctions): Promise<any[]>;
  trigger?(this: INodeExecuteFunctions): Promise<void>;
  webhook?(this: INodeExecuteFunctions): Promise<any>;
  poll?(this: INodeExecuteFunctions): Promise<any[]>;
}

export class NodeRegistry {
  private static instance: NodeRegistry;
  private nodeTypes: Map<string, INodeType> = new Map();
  private nodeCategories: Map<string, string[]> = new Map();

  private constructor() {
    this.registerBuiltInNodes();
  }

  public static getInstance(): NodeRegistry {
    if (!NodeRegistry.instance) {
      NodeRegistry.instance = new NodeRegistry();
    }
    return NodeRegistry.instance;
  }

  public registerNodeType(nodeType: INodeType): void {
    const name = nodeType.description.name;
    this.nodeTypes.set(name, nodeType);

    for (const group of nodeType.description.group) {
      if (!this.nodeCategories.has(group)) {
        this.nodeCategories.set(group, []);
      }
      this.nodeCategories.get(group)!.push(name);
    }
  }

  public getNodeType(name: string): INodeType | undefined {
    return this.nodeTypes.get(name);
  }

  public getAllNodeTypes(): INodeTypeDescription[] {
    return Array.from(this.nodeTypes.values()).map(nt => nt.description);
  }

  public getNodeTypesByCategory(category: string): INodeTypeDescription[] {
    const nodeNames = this.nodeCategories.get(category) || [];
    return nodeNames
      .map(name => this.nodeTypes.get(name))
      .filter(nt => nt !== undefined)
      .map(nt => nt!.description);
  }

  public getAllCategories(): string[] {
    return Array.from(this.nodeCategories.keys());
  }

  private registerBuiltInNodes(): void {
    // Import advanced node implementations
    const { HttpRequestNode } = require('./integrations/HttpRequestNode');
    const { EmailNode } = require('./integrations/EmailNode');
    const { DatabaseNode } = require('./integrations/DatabaseNode');
    const { ExportNode } = require('./integrations/ExportNode');
    const { FileUploadNode } = require('./integrations/FileUploadNode');
    const { FileDownloadNode } = require('./integrations/FileDownloadNode');
    const { PDFGeneratorNode } = require('./integrations/PDFGeneratorNode');
    const { PostgreSQLNode } = require('./integrations/PostgreSQLNode');
    const { MongoDBNode } = require('./integrations/MongoDBNode');
    const { RedisNode } = require('./integrations/RedisNode');
    const { NotificationNode } = require('./integrations/NotificationNode');
    const { AdvancedTransformNode } = require('./integrations/AdvancedTransformNode');
    const { DataValidationNode } = require('./integrations/DataValidationNode');
    const { DataCleansingNode } = require('./integrations/DataCleansingNode');
    const { FilterNode } = require('./integrations/FilterNode');
    const { MergeNode } = require('./integrations/MergeNode');
    const { AIMLNode } = require('./integrations/AIMLNode');
    const { AnalyticsNode } = require('./integrations/AnalyticsNode');
    
    // Import third-party integration nodes
    const { SlackNode } = require('./integrations/SlackNode');
    const { GoogleSheetsNode } = require('./integrations/GoogleSheetsNode');
    const { GitHubNode } = require('./integrations/GitHubNode');
    const { AWSNode } = require('./integrations/AWSNode');
    const { StripeNode } = require('./integrations/StripeNode');
    const { TwilioNode } = require('./integrations/TwilioNode');
    const { Office365Node } = require('./integrations/Office365Node');
    
    // Register advanced nodes
    this.registerNodeType(HttpRequestNode);
    this.registerNodeType(EmailNode);
    this.registerNodeType(DatabaseNode);
    this.registerNodeType(ExportNode);
    this.registerNodeType(FileUploadNode);
    this.registerNodeType(FileDownloadNode);
    this.registerNodeType(PDFGeneratorNode);
    this.registerNodeType(PostgreSQLNode);
    this.registerNodeType(MongoDBNode);
    this.registerNodeType(RedisNode);
    this.registerNodeType(new NotificationNode());
    this.registerNodeType(AdvancedTransformNode);
    this.registerNodeType(DataValidationNode);
    this.registerNodeType(DataCleansingNode);
    this.registerNodeType(FilterNode);
    this.registerNodeType(new MergeNode());
    this.registerNodeType(new AIMLNode());
    this.registerNodeType(new AnalyticsNode());
    
    // Register third-party integration nodes
    this.registerNodeType(SlackNode);
    this.registerNodeType(GoogleSheetsNode);
    this.registerNodeType(new GitHubNode());
    this.registerNodeType(new AWSNode());
    this.registerNodeType(new StripeNode());
    this.registerNodeType(new TwilioNode());
    this.registerNodeType(new Office365Node());
    
    // Register basic nodes
    this.registerManualTriggerNode();
    this.registerWebhookNode();
    this.registerScheduleNode();
    this.registerTransformNode();
    this.registerConditionNode();
    this.registerSwitchNode();
    this.registerLoopNode();
    this.registerCodeNode();
    this.registerDelayNode();
    this.registerSplitNode();
  }

  private registerManualTriggerNode(): void {
    const manualNode: INodeType = {
      description: {
        displayName: 'Manual Trigger',
        name: 'manual',
        group: ['trigger'],
        version: 1,
        description: 'Manually trigger workflow execution',
        defaults: {
          name: 'Manual Trigger',
        },
        inputs: [],
        outputs: ['main'],
        properties: [],
      },
      async execute(this: INodeExecuteFunctions): Promise<any[]> {
        // Manual trigger just passes through empty data to start the workflow
        return [{ json: {} }];
      },
    };

    this.registerNodeType(manualNode);
  }

  private registerWebhookNode(): void {
    const webhookNode: INodeType = {
      description: {
        displayName: 'Webhook',
        name: 'webhook',
        group: ['trigger'],
        version: 1,
        description: 'Triggers workflow on webhook call',
        defaults: {
          name: 'Webhook',
          color: '#ff6633',
        },
        inputs: [],
        outputs: ['main'],
        properties: [
          {
            name: 'path',
            displayName: 'Path',
            type: 'string',
            default: '',
            required: true,
            description: 'Webhook path',
          },
          {
            name: 'method',
            displayName: 'Method',
            type: 'options',
            options: [
              { name: 'GET', value: 'GET' },
              { name: 'POST', value: 'POST' },
              { name: 'PUT', value: 'PUT' },
              { name: 'DELETE', value: 'DELETE' },
            ],
            default: 'POST',
            description: 'HTTP method to listen for',
          },
          {
            name: 'responseMode',
            displayName: 'Response Mode',
            type: 'options',
            options: [
              { name: 'On Received', value: 'onReceived' },
              { name: 'Last Node', value: 'lastNode' },
            ],
            default: 'onReceived',
            description: 'When to send response',
          },
        ],
      },
      async webhook(this: INodeExecuteFunctions): Promise<any> {
        const webhookData = this.getInputData()[0];
        return {
          workflowData: [[{ json: webhookData }]],
        };
      },
    };

    this.registerNodeType(webhookNode);
  }

  private registerScheduleNode(): void {
    const scheduleNode: INodeType = {
      description: {
        displayName: 'Schedule',
        name: 'schedule',
        group: ['trigger'],
        version: 1,
        description: 'Triggers workflow on schedule',
        defaults: {
          name: 'Schedule',
          color: '#33ff99',
        },
        inputs: [],
        outputs: ['main'],
        properties: [
          {
            name: 'scheduleMode',
            displayName: 'Schedule Mode',
            type: 'options',
            options: [
              { name: 'Cron Expression', value: 'cron' },
              { name: 'Interval', value: 'interval' },
              { name: 'Time of Day', value: 'timeOfDay' },
            ],
            default: 'interval',
            description: 'How to configure the schedule',
          },
          {
            name: 'cronExpression',
            displayName: 'Cron Expression',
            type: 'string',
            default: '0 */1 * * *',
            placeholder: '0 */1 * * *',
            description: 'Cron expression for schedule',
            displayOptions: {
              show: {
                scheduleMode: ['cron'],
              },
            },
          },
          {
            name: 'interval',
            displayName: 'Interval',
            type: 'number',
            default: 60,
            description: 'Interval in minutes',
            displayOptions: {
              show: {
                scheduleMode: ['interval'],
              },
            },
          },
          {
            name: 'timeOfDay',
            displayName: 'Time',
            type: 'string',
            default: '09:00',
            placeholder: 'HH:mm',
            description: 'Time of day to trigger (24h format)',
            displayOptions: {
              show: {
                scheduleMode: ['timeOfDay'],
              },
            },
          },
          {
            name: 'timezone',
            displayName: 'Timezone',
            type: 'string',
            default: 'UTC',
            placeholder: 'America/New_York',
            description: 'Timezone for schedule',
          },
        ],
      },
      async poll(this: INodeExecuteFunctions): Promise<any[]> {
        // Schedule polling logic would be implemented here
        return [{ json: { timestamp: new Date().toISOString() } }];
      },
    };

    this.registerNodeType(scheduleNode);
  }

  private registerTransformNode(): void {
    const transformNode: INodeType = {
      description: {
        displayName: 'Transform',
        name: 'transform',
        group: ['transform'],
        version: 1,
        description: 'Transform data using JavaScript expressions',
        defaults: {
          name: 'Transform',
          color: '#33aaff',
        },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
          {
            name: 'fields',
            displayName: 'Fields',
            type: 'collection',
            placeholder: 'Add Field',
            default: [],
            description: 'Fields to set',
            options: [
              {
                name: 'name',
                displayName: 'Field Name',
                type: 'string',
                default: '',
                description: 'Name of the field to set',
              },
              {
                name: 'value',
                displayName: 'Value',
                type: 'string',
                default: '',
                description: 'Value to set (supports expressions)',
              },
              {
                name: 'type',
                displayName: 'Type',
                type: 'options',
                options: [
                  { name: 'String', value: 'string' },
                  { name: 'Number', value: 'number' },
                  { name: 'Boolean', value: 'boolean' },
                  { name: 'Date', value: 'date' },
                  { name: 'JSON', value: 'json' },
                ],
                default: 'string',
                description: 'Data type to convert to',
              },
            ],
          },
          {
            name: 'removeFields',
            displayName: 'Remove Fields',
            type: 'string',
            default: '',
            placeholder: 'field1, field2',
            description: 'Comma-separated list of fields to remove',
          },
          {
            name: 'keepOnlySetFields',
            displayName: 'Keep Only Set Fields',
            type: 'boolean',
            default: false,
            description: 'Remove all fields except those explicitly set',
          },
        ],
      },
      async execute(this: INodeExecuteFunctions): Promise<any[]> {
        const items = this.getInputData();
        const returnData = [];

        for (const [itemIndex, item] of items.entries()) {
          const fields = this.getNodeParameter('fields', itemIndex, []) as any[];
          const removeFields = this.getNodeParameter('removeFields', itemIndex, '') as string;
          const keepOnlySetFields = this.getNodeParameter('keepOnlySetFields', itemIndex, false) as boolean;

          let newItem = keepOnlySetFields ? {} : { ...item.json };

          // Set fields
          for (const field of fields) {
            const value = this.evaluateExpression(field.value, item.json);
            newItem[field.name] = this.convertType(value, field.type);
          }

          // Remove fields
          if (removeFields) {
            const fieldsToRemove = removeFields.split(',').map(f => f.trim());
            for (const field of fieldsToRemove) {
              delete newItem[field];
            }
          }

          returnData.push({ json: newItem });
        }

        return returnData;
      },

      evaluateExpression(expression: string, data: any): any {
        // Simple expression evaluation (in production, use a proper expression evaluator)
        if (expression.startsWith('{{') && expression.endsWith('}}')) {
          const path = expression.slice(2, -2).trim();
          return this.getNestedValue(data, path);
        }
        return expression;
      },

      convertType(value: any, type: string): any {
        switch (type) {
          case 'number':
            return Number(value);
          case 'boolean':
            return Boolean(value);
          case 'date':
            return new Date(value);
          case 'json':
            try {
              return JSON.parse(value);
            } catch {
              return value;
            }
          default:
            return String(value);
        }
      },

      getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => 
          current && typeof current === 'object' ? current[key] : undefined, obj
        );
      },
    };

    this.registerNodeType(transformNode);
  }

  private registerConditionNode(): void {
    const conditionNode: INodeType = {
      description: {
        displayName: 'Condition',
        name: 'condition',
        group: ['transform'],
        version: 1,
        description: 'Branch workflow based on conditions',
        defaults: {
          name: 'Condition',
          color: '#ff9900',
        },
        inputs: ['main'],
        outputs: ['main', 'main'],
        outputNames: ['True', 'False'],
        properties: [
          {
            name: 'conditions',
            displayName: 'Conditions',
            type: 'collection',
            placeholder: 'Add Condition',
            default: [],
            description: 'Conditions to evaluate',
            options: [
              {
                name: 'field',
                displayName: 'Field',
                type: 'string',
                default: '',
                description: 'Field to check',
              },
              {
                name: 'operator',
                displayName: 'Operator',
                type: 'options',
                options: [
                  { name: 'Equals', value: 'equals' },
                  { name: 'Not Equals', value: 'notEquals' },
                  { name: 'Contains', value: 'contains' },
                  { name: 'Greater Than', value: 'greaterThan' },
                  { name: 'Less Than', value: 'lessThan' },
                  { name: 'Is Empty', value: 'isEmpty' },
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
              },
            ],
          },
          {
            name: 'combineConditions',
            displayName: 'Combine Conditions',
            type: 'options',
            options: [
              { name: 'ALL', value: 'all' },
              { name: 'ANY', value: 'any' },
            ],
            default: 'all',
            description: 'How to combine multiple conditions',
          },
        ],
      },
      async execute(this: INodeExecuteFunctions): Promise<any[]> {
        const items = this.getInputData();
        const trueItems = [];
        const falseItems = [];

        for (const [itemIndex, item] of items.entries()) {
          const conditions = this.getNodeParameter('conditions', itemIndex, []) as any[];
          const combineConditions = this.getNodeParameter('combineConditions', itemIndex, 'all') as string;

          const results = conditions.map(condition => {
            const fieldValue = this.getNestedValue(item.json, condition.field);
            return this.evaluateCondition(fieldValue, condition.operator, condition.value);
          });

          const conditionMet = combineConditions === 'all' 
            ? results.every(r => r) 
            : results.some(r => r);

          if (conditionMet) {
            trueItems.push(item);
          } else {
            falseItems.push(item);
          }
        }

        return [trueItems, falseItems];
      },

      evaluateCondition(fieldValue: any, operator: string, compareValue: string): boolean {
        switch (operator) {
          case 'equals':
            return fieldValue == compareValue;
          case 'notEquals':
            return fieldValue != compareValue;
          case 'contains':
            return String(fieldValue).includes(compareValue);
          case 'greaterThan':
            return Number(fieldValue) > Number(compareValue);
          case 'lessThan':
            return Number(fieldValue) < Number(compareValue);
          case 'isEmpty':
            return !fieldValue || fieldValue === '';
          default:
            return false;
        }
      },

      getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => 
          current && typeof current === 'object' ? current[key] : undefined, obj
        );
      },
    };

    this.registerNodeType(conditionNode);
  }

  private registerSwitchNode(): void {
    const switchNode: INodeType = {
      description: {
        displayName: 'Switch',
        name: 'switch',
        group: ['transform'],
        version: 1,
        description: 'Route data based on multiple conditions',
        defaults: {
          name: 'Switch',
          color: '#ff5566',
        },
        inputs: ['main'],
        outputs: ['main', 'main', 'main', 'main'],
        outputNames: ['Output 0', 'Output 1', 'Output 2', 'Output 3'],
        properties: [
          {
            name: 'dataType',
            displayName: 'Data Type',
            type: 'options',
            options: [
              { name: 'String', value: 'string' },
              { name: 'Number', value: 'number' },
              { name: 'Boolean', value: 'boolean' },
            ],
            default: 'string',
            description: 'Data type to evaluate',
          },
          {
            name: 'value',
            displayName: 'Value',
            type: 'string',
            default: 'status',
            description: 'Field name or expression to evaluate',
          },
          {
            name: 'rules',
            displayName: 'Rules',
            type: 'collection',
            placeholder: 'Add Rule',
            default: [],
            description: 'Rules to match against',
            options: [
              {
                name: 'output',
                displayName: 'Output',
                type: 'number',
                default: 0,
                description: 'Output number (0-3)',
              },
              {
                name: 'operation',
                displayName: 'Operation',
                type: 'options',
                options: [
                  { name: 'Equals', value: 'equals' },
                  { name: 'Not Equals', value: 'notEquals' },
                  { name: 'Contains', value: 'contains' },
                  { name: 'Greater Than', value: 'greaterThan' },
                  { name: 'Less Than', value: 'lessThan' },
                  { name: 'Regex', value: 'regex' },
                ],
                default: 'equals',
                description: 'Comparison operation',
              },
              {
                name: 'value',
                displayName: 'Value',
                type: 'string',
                default: '',
                description: 'Value to compare against',
              },
            ],
          },
          {
            name: 'fallbackOutput',
            displayName: 'Fallback Output',
            type: 'number',
            default: 3,
            description: 'Output to use when no rules match (0-3)',
          },
        ],
      },
      async execute(this: INodeExecuteFunctions): Promise<any[]> {
        const items = this.getInputData();
        const outputs: any[][] = [[], [], [], []];

        for (const [itemIndex, item] of items.entries()) {
          const dataType = this.getNodeParameter('dataType', itemIndex) as string;
          const valuePath = this.getNodeParameter('value', itemIndex) as string;
          const rules = this.getNodeParameter('rules', itemIndex, []) as any[];
          const fallbackOutput = this.getNodeParameter('fallbackOutput', itemIndex, 3) as number;

          const value = this.getNestedValue(item.json, valuePath);
          let outputIndex = fallbackOutput;

          for (const rule of rules) {
            if (this.evaluateRule(value, rule.operation, rule.value, dataType)) {
              outputIndex = rule.output;
              break;
            }
          }

          if (outputIndex >= 0 && outputIndex < 4) {
            outputs[outputIndex].push(item);
          }
        }

        return outputs;
      },

      evaluateRule(value: any, operation: string, compareValue: string, dataType: string): boolean {
        const typedValue = this.convertType(value, dataType);
        const typedCompareValue = this.convertType(compareValue, dataType);

        switch (operation) {
          case 'equals':
            return typedValue === typedCompareValue;
          case 'notEquals':
            return typedValue !== typedCompareValue;
          case 'contains':
            return String(typedValue).includes(String(typedCompareValue));
          case 'greaterThan':
            return Number(typedValue) > Number(typedCompareValue);
          case 'lessThan':
            return Number(typedValue) < Number(typedCompareValue);
          case 'regex':
            try {
              const regex = new RegExp(String(typedCompareValue));
              return regex.test(String(typedValue));
            } catch {
              return false;
            }
          default:
            return false;
        }
      },

      convertType(value: any, type: string): any {
        switch (type) {
          case 'number':
            return Number(value);
          case 'boolean':
            return Boolean(value);
          default:
            return String(value);
        }
      },

      getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => 
          current && typeof current === 'object' ? current[key] : undefined, obj
        );
      },
    };

    this.registerNodeType(switchNode);
  }

  private registerLoopNode(): void {
    const loopNode: INodeType = {
      description: {
        displayName: 'Loop',
        name: 'loop',
        group: ['transform'],
        version: 1,
        description: 'Loop over items or execute repeatedly',
        defaults: {
          name: 'Loop',
          color: '#9966ff',
        },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
          {
            name: 'loopMode',
            displayName: 'Loop Mode',
            type: 'options',
            options: [
              { name: 'Fixed Times', value: 'fixed' },
              { name: 'For Each Item', value: 'forEach' },
              { name: 'While Condition', value: 'while' },
              { name: 'Range', value: 'range' },
            ],
            default: 'fixed',
            description: 'How to loop',
          },
          {
            name: 'iterations',
            displayName: 'Iterations',
            type: 'number',
            default: 5,
            description: 'Number of times to loop',
            displayOptions: {
              show: {
                loopMode: ['fixed'],
              },
            },
          },
          {
            name: 'arrayField',
            displayName: 'Array Field',
            type: 'string',
            default: 'items',
            description: 'Field containing array to loop over',
            displayOptions: {
              show: {
                loopMode: ['forEach'],
              },
            },
          },
          {
            name: 'condition',
            displayName: 'Condition',
            type: 'string',
            default: '$iteration < 10',
            description: 'Condition to continue looping',
            displayOptions: {
              show: {
                loopMode: ['while'],
              },
            },
          },
          {
            name: 'startValue',
            displayName: 'Start Value',
            type: 'number',
            default: 0,
            description: 'Starting value for range',
            displayOptions: {
              show: {
                loopMode: ['range'],
              },
            },
          },
          {
            name: 'endValue',
            displayName: 'End Value',
            type: 'number',
            default: 10,
            description: 'Ending value for range',
            displayOptions: {
              show: {
                loopMode: ['range'],
              },
            },
          },
          {
            name: 'stepValue',
            displayName: 'Step Value',
            type: 'number',
            default: 1,
            description: 'Step increment for range loop',
            displayOptions: {
              show: {
                loopMode: ['range'],
              },
            },
          },
          {
            name: 'maxIterations',
            displayName: 'Max Iterations',
            type: 'number',
            default: 1000,
            description: 'Maximum iterations to prevent infinite loops',
            displayOptions: {
              show: {
                loopMode: ['while'],
              },
            },
          },
          {
            name: 'addLoopData',
            displayName: 'Add Loop Data',
            type: 'boolean',
            default: true,
            description: 'Add loop metadata to output items',
          },
          {
            name: 'batchSize',
            displayName: 'Batch Size',
            type: 'number',
            default: 0,
            description: 'Process items in batches (0 = no batching)',
          },
        ],
      },
      async execute(this: INodeExecuteFunctions): Promise<any[]> {
        const items = this.getInputData();
        const loopMode = this.getNodeParameter('loopMode', 0) as string;
        const addLoopData = this.getNodeParameter('addLoopData', 0, true) as boolean;
        const batchSize = this.getNodeParameter('batchSize', 0, 0) as number;
        const returnData = [];

        for (const [itemIndex, item] of items.entries()) {
          let loopIterations: any[] = [];

          switch (loopMode) {
            case 'fixed':
              const iterations = this.getNodeParameter('iterations', 0, 1) as number;
              for (let i = 0; i < iterations; i++) {
                loopIterations.push({ index: i, value: i, item: null });
              }
              break;

            case 'forEach':
              const arrayField = this.getNodeParameter('arrayField', 0) as string;
              const arrayData = this.getNestedValue(item.json, arrayField);
              if (Array.isArray(arrayData)) {
                arrayData.forEach((arrayItem, index) => {
                  loopIterations.push({ index, value: index, item: arrayItem });
                });
              }
              break;

            case 'while':
              const condition = this.getNodeParameter('condition', 0) as string;
              const maxIterations = this.getNodeParameter('maxIterations', 0, 1000) as number;
              let whileIndex = 0;
              
              while (whileIndex < maxIterations) {
                try {
                  // Create evaluation context
                  const context = {
                    $iteration: whileIndex,
                    $data: item.json,
                    $item: item,
                    $index: itemIndex
                  };
                  
                  // Simple condition evaluation (basic implementation)
                  const shouldContinue = this.evaluateCondition(condition, context);
                  if (!shouldContinue) break;
                  
                  loopIterations.push({ index: whileIndex, value: whileIndex, item: null });
                  whileIndex++;
                } catch (error) {
                  // Break on evaluation error
                  break;
                }
              }
              break;

            case 'range':
              const startValue = this.getNodeParameter('startValue', 0, 0) as number;
              const endValue = this.getNodeParameter('endValue', 0, 10) as number;
              const stepValue = this.getNodeParameter('stepValue', 0, 1) as number;
              
              for (let i = startValue; stepValue > 0 ? i < endValue : i > endValue; i += stepValue) {
                loopIterations.push({ index: i - startValue, value: i, item: null });
              }
              break;
          }

          // Process loop iterations
          if (batchSize > 0 && loopIterations.length > batchSize) {
            // Process in batches
            const batches = this.createBatches(loopIterations, batchSize);
            for (const [batchIndex, batch] of batches.entries()) {
              const batchData = batch.map(iteration => {
                const outputData = { ...item.json };
                if (addLoopData) {
                  outputData._loop = {
                    mode: loopMode,
                    iteration: iteration.index,
                    value: iteration.value,
                    batch: batchIndex,
                    batchSize: batch.length,
                    totalIterations: loopIterations.length
                  };
                  if (iteration.item !== null) {
                    outputData._loopItem = iteration.item;
                  }
                }
                return outputData;
              });
              returnData.push({ json: { batch: batchData, batchIndex, totalBatches: batches.length } });
            }
          } else {
            // Process normally
            for (const iteration of loopIterations) {
              const outputData = { ...item.json };
              if (addLoopData) {
                outputData._loop = {
                  mode: loopMode,
                  iteration: iteration.index,
                  value: iteration.value,
                  totalIterations: loopIterations.length
                };
                if (iteration.item !== null) {
                  outputData._loopItem = iteration.item;
                }
              }
              returnData.push({ json: outputData });
            }
          }
        }

        return returnData;
      },

      evaluateCondition(condition: string, context: any): boolean {
        // Simple condition evaluation (basic implementation)
        // In production, use a proper expression evaluator
        try {
          const func = new Function('$iteration', '$data', '$item', '$index', `return ${condition}`);
          return Boolean(func(context.$iteration, context.$data, context.$item, context.$index));
        } catch {
          return false;
        }
      },

      getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => 
          current && typeof current === 'object' ? current[key] : undefined, obj
        );
      },

      createBatches(items: any[], batchSize: number): any[][] {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
          batches.push(items.slice(i, i + batchSize));
        }
        return batches;
      },
    };

    this.registerNodeType(loopNode);
  }

  private registerCodeNode(): void {
    const codeNode: INodeType = {
      description: {
        displayName: 'Code',
        name: 'code',
        group: ['transform'],
        version: 1,
        description: 'Execute custom JavaScript code',
        defaults: {
          name: 'Code',
          color: '#6666ff',
        },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
          {
            name: 'jsCode',
            displayName: 'JavaScript Code',
            type: 'string',
            typeOptions: {
              alwaysOpenEditWindow: true,
              rows: 10,
            },
            default: `// Available variables:
// items - input items
// $input - helper for accessing input data

const output = [];
for (const item of items) {
  // Process each item
  output.push({
    json: {
      ...item.json,
      processed: true,
      timestamp: new Date().toISOString()
    }
  });
}
return output;`,
            description: 'JavaScript code to execute',
          },
          {
            name: 'runOnce',
            displayName: 'Run Once for All Items',
            type: 'boolean',
            default: false,
            description: 'Execute code once for all items instead of once per item',
          },
        ],
      },
      async execute(this: INodeExecuteFunctions): Promise<any[]> {
        const items = this.getInputData();
        const jsCode = this.getNodeParameter('jsCode', 0) as string;
        const runOnce = this.getNodeParameter('runOnce', 0, false) as boolean;

        if (runOnce) {
          // Run once for all items
          try {
            const func = new Function('items', '$input', jsCode);
            const result = func(items, this.helpers);
            return Array.isArray(result) ? result : [result];
          } catch (error) {
            throw new Error(`Code execution error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        } else {
          // Run for each item
          const returnData = [];
          for (const [index, item] of items.entries()) {
            try {
              const func = new Function('item', '$input', 'index', jsCode);
              const result = func(item, this.helpers, index);
              returnData.push(result);
            } catch (error) {
              if (this.continueOnFail?.()) {
                returnData.push({
                  json: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    originalItem: item.json,
                  },
                });
              } else {
                throw new Error(`Code execution error at item ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            }
          }
          return returnData;
        }
      },
    };

    this.registerNodeType(codeNode);
  }

  private registerDelayNode(): void {
    const delayNode: INodeType = {
      description: {
        displayName: 'Delay',
        name: 'delay',
        group: ['transform'],
        version: 1,
        description: 'Delay workflow execution',
        defaults: {
          name: 'Delay',
          color: '#999999',
        },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
          {
            name: 'delayMode',
            displayName: 'Delay Mode',
            type: 'options',
            options: [
              { name: 'Fixed Duration', value: 'fixed' },
              { name: 'Random Duration', value: 'random' },
              { name: 'Until Date/Time', value: 'until' },
            ],
            default: 'fixed',
            description: 'Type of delay',
          },
          {
            name: 'duration',
            displayName: 'Duration',
            type: 'number',
            default: 1000,
            description: 'Delay duration in milliseconds',
            displayOptions: {
              show: {
                delayMode: ['fixed'],
              },
            },
          },
          {
            name: 'minDuration',
            displayName: 'Min Duration',
            type: 'number',
            default: 500,
            description: 'Minimum delay in milliseconds',
            displayOptions: {
              show: {
                delayMode: ['random'],
              },
            },
          },
          {
            name: 'maxDuration',
            displayName: 'Max Duration',
            type: 'number',
            default: 2000,
            description: 'Maximum delay in milliseconds',
            displayOptions: {
              show: {
                delayMode: ['random'],
              },
            },
          },
          {
            name: 'untilDateTime',
            displayName: 'Until Date/Time',
            type: 'string',
            default: '',
            placeholder: '2024-12-31T23:59:59',
            description: 'ISO date/time to wait until',
            displayOptions: {
              show: {
                delayMode: ['until'],
              },
            },
          },
          {
            name: 'unit',
            displayName: 'Time Unit',
            type: 'options',
            options: [
              { name: 'Milliseconds', value: 'ms' },
              { name: 'Seconds', value: 's' },
              { name: 'Minutes', value: 'm' },
              { name: 'Hours', value: 'h' },
            ],
            default: 'ms',
            description: 'Time unit for duration',
            displayOptions: {
              show: {
                delayMode: ['fixed', 'random'],
              },
            },
          },
        ],
      },
      async execute(this: INodeExecuteFunctions): Promise<any[]> {
        const items = this.getInputData();
        const delayMode = this.getNodeParameter('delayMode', 0) as string;
        const unit = this.getNodeParameter('unit', 0, 'ms') as string;

        let delayMs = 0;

        switch (delayMode) {
          case 'fixed':
            const duration = this.getNodeParameter('duration', 0) as number;
            delayMs = this.convertToMs(duration, unit);
            break;

          case 'random':
            const minDuration = this.getNodeParameter('minDuration', 0) as number;
            const maxDuration = this.getNodeParameter('maxDuration', 0) as number;
            const minMs = this.convertToMs(minDuration, unit);
            const maxMs = this.convertToMs(maxDuration, unit);
            delayMs = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
            break;

          case 'until':
            const untilDateTime = this.getNodeParameter('untilDateTime', 0) as string;
            const targetTime = new Date(untilDateTime).getTime();
            const now = Date.now();
            delayMs = Math.max(0, targetTime - now);
            break;
        }

        // Apply delay
        await new Promise(resolve => setTimeout(resolve, delayMs));

        // Return input items with delay metadata
        return items.map(item => ({
          json: {
            ...item.json,
            _delay: {
              mode: delayMode,
              duration: delayMs,
              executedAt: new Date().toISOString(),
            },
          },
        }));
      },

      convertToMs(value: number, unit: string): number {
        switch (unit) {
          case 's':
            return value * 1000;
          case 'm':
            return value * 60 * 1000;
          case 'h':
            return value * 60 * 60 * 1000;
          default:
            return value;
        }
      },
    };

    this.registerNodeType(delayNode);
  }


  private registerSplitNode(): void {
    const splitNode: INodeType = {
      description: {
        displayName: 'Split',
        name: 'split',
        group: ['transform'],
        version: 1,
        description: 'Split data into batches or individual items',
        defaults: {
          name: 'Split',
          color: '#cc6699',
        },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
          {
            name: 'splitMode',
            displayName: 'Split Mode',
            type: 'options',
            options: [
              { name: 'Into Batches', value: 'batches' },
              { name: 'Into Individual Items', value: 'items' },
              { name: 'By Field Value', value: 'byField' },
            ],
            default: 'batches',
            description: 'How to split the data',
          },
          {
            name: 'batchSize',
            displayName: 'Batch Size',
            type: 'number',
            default: 10,
            description: 'Number of items per batch',
            displayOptions: {
              show: {
                splitMode: ['batches'],
              },
            },
          },
          {
            name: 'arrayField',
            displayName: 'Array Field',
            type: 'string',
            default: '',
            placeholder: 'items',
            description: 'Field containing array to split',
            displayOptions: {
              show: {
                splitMode: ['items'],
              },
            },
          },
          {
            name: 'splitField',
            displayName: 'Split Field',
            type: 'string',
            default: '',
            placeholder: 'category',
            description: 'Field to split by',
            displayOptions: {
              show: {
                splitMode: ['byField'],
              },
            },
          },
        ],
      },
      async execute(this: INodeExecuteFunctions): Promise<any[]> {
        const items = this.getInputData();
        const splitMode = this.getNodeParameter('splitMode', 0) as string;
        const returnData = [];

        switch (splitMode) {
          case 'batches':
            const batchSize = this.getNodeParameter('batchSize', 0, 10) as number;
            const batches = this.createBatches(items, batchSize);
            for (const [index, batch] of batches.entries()) {
              returnData.push({
                json: {
                  batchIndex: index,
                  batchSize: batch.length,
                  totalBatches: batches.length,
                  items: batch.map(item => item.json),
                },
              });
            }
            break;

          case 'items':
            const arrayField = this.getNodeParameter('arrayField', 0, '') as string;
            for (const item of items) {
              if (arrayField) {
                const arrayData = this.getNestedValue(item.json, arrayField);
                if (Array.isArray(arrayData)) {
                  for (const arrayItem of arrayData) {
                    returnData.push({ json: arrayItem });
                  }
                }
              } else {
                // If no array field specified, split the item itself
                returnData.push(item);
              }
            }
            break;

          case 'byField':
            const splitField = this.getNodeParameter('splitField', 0) as string;
            const groups = new Map<any, any[]>();
            
            for (const item of items) {
              const fieldValue = this.getNestedValue(item.json, splitField);
              if (!groups.has(fieldValue)) {
                groups.set(fieldValue, []);
              }
              groups.get(fieldValue)!.push(item);
            }
            
            for (const [fieldValue, groupItems] of groups) {
              returnData.push({
                json: {
                  groupField: splitField,
                  groupValue: fieldValue,
                  itemCount: groupItems.length,
                  items: groupItems.map(item => item.json),
                },
              });
            }
            break;
        }

        return returnData;
      },

      getNestedValue(obj: any, path: string): any {
        if (!path) return obj;
        return path.split('.').reduce((current, key) => 
          current && typeof current === 'object' ? current[key] : undefined, obj
        );
      },

      createBatches(items: any[], batchSize: number): any[][] {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
          batches.push(items.slice(i, i + batchSize));
        }
        return batches;
      },
    };

    this.registerNodeType(splitNode);
  }

}

export const nodeRegistry = NodeRegistry.getInstance();