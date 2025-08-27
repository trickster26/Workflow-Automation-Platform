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
    // const { PDFGeneratorNode } = require('./integrations/PDFGeneratorNode'); // Commented out due to dependency issues
    const { PostgreSQLNode } = require('./integrations/PostgreSQLNode');
    const { MongoDBNode } = require('./integrations/MongoDBNode');
    const { RedisNode } = require('./integrations/RedisNode');
    const { NotificationNode } = require('./integrations/NotificationNode');
    const { AdvancedTransformNode } = require('./integrations/AdvancedTransformNode');
    const { DataValidationNode } = require('./integrations/DataValidationNode');
    const { DataCleansingNode } = require('./integrations/DataCleansingNode');
    
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
    // this.registerNodeType(PDFGeneratorNode); // Commented out due to dependency issues
    this.registerNodeType(PostgreSQLNode);
    this.registerNodeType(MongoDBNode);
    this.registerNodeType(RedisNode);
    this.registerNodeType(NotificationNode);
    this.registerNodeType(AdvancedTransformNode);
    this.registerNodeType(DataValidationNode);
    this.registerNodeType(DataCleansingNode);
    
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
    this.registerLoopNode();
    this.registerCodeNode();
    this.registerDelayNode();
    this.registerMergeNode();
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
            name: 'cronExpression',
            displayName: 'Cron Expression',
            type: 'string',
            default: '0 * * * *',
            description: 'Cron expression for schedule',
          },
          {
            name: 'timezone',
            displayName: 'Timezone',
            type: 'string',
            default: 'UTC',
            description: 'Timezone for schedule',
          },
        ],
      },
      async trigger(this: INodeExecuteFunctions): Promise<void> {
        return;
      },
    };

    this.registerNodeType(scheduleNode);
  }

  private registerTransformNode(): void {
    const transformNode: INodeType = {
      description: {
        displayName: 'Transform Data',
        name: 'transform',
        group: ['transform'],
        version: 1,
        description: 'Transform data structure',
        defaults: {
          name: 'Transform',
          color: '#9966ff',
        },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
          {
            name: 'operations',
            displayName: 'Operations',
            type: 'collection',
            default: [],
            description: 'Operations to perform',
          },
        ],
      },
      async execute(this: INodeExecuteFunctions): Promise<any[]> {
        const items = this.getInputData();
        const operations = this.getNodeParameter('operations', 0, []) as any[];
        const returnData = [];

        for (const item of items) {
          let transformedItem = { ...item.json };

          for (const operation of operations) {
            switch (operation.type) {
              case 'set':
                transformedItem[operation.field] = operation.value;
                break;
              case 'remove':
                delete transformedItem[operation.field];
                break;
              case 'rename':
                transformedItem[operation.newField] = transformedItem[operation.field];
                delete transformedItem[operation.field];
                break;
            }
          }

          returnData.push({ json: transformedItem });
        }

        return returnData;
      },
    };

    this.registerNodeType(transformNode);
  }

  private registerConditionNode(): void {
    const conditionNode: INodeType = {
      description: {
        displayName: 'IF',
        name: 'if',
        group: ['transform'],
        version: 1,
        description: 'Conditional branching',
        defaults: {
          name: 'IF',
          color: '#ff9900',
        },
        inputs: ['main'],
        outputs: ['main', 'main'],
        properties: [
          {
            name: 'conditions',
            displayName: 'Conditions',
            type: 'collection',
            default: {},
            description: 'Conditions to check',
          },
        ],
      },
      async execute(this: INodeExecuteFunctions): Promise<any[]> {
        const items = this.getInputData();
        const conditions = this.getNodeParameter('conditions', 0) as any;
        const trueItems = [];
        const falseItems = [];

        for (const item of items) {
          let conditionMet = true;

          if (conditionMet) {
            trueItems.push(item);
          } else {
            falseItems.push(item);
          }
        }

        return [trueItems, falseItems];
      },
    };

    this.registerNodeType(conditionNode);
  }

  private registerLoopNode(): void {
    const loopNode: INodeType = {
      description: {
        displayName: 'Loop',
        name: 'loop',
        group: ['transform'],
        version: 1,
        description: 'Loop over items',
        defaults: {
          name: 'Loop',
          color: '#66ff66',
        },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
          {
            name: 'iterations',
            displayName: 'Iterations',
            type: 'number',
            default: 1,
            description: 'Number of iterations',
          },
        ],
      },
      async execute(this: INodeExecuteFunctions): Promise<any[]> {
        const items = this.getInputData();
        const iterations = this.getNodeParameter('iterations', 0) as number;
        const returnData = [];

        for (const item of items) {
          for (let i = 0; i < iterations; i++) {
            returnData.push({
              json: {
                ...item.json,
                $iteration: i,
              },
            });
          }
        }

        return returnData;
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
        description: 'Execute custom code',
        defaults: {
          name: 'Code',
          color: '#333333',
        },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
          {
            name: 'language',
            displayName: 'Language',
            type: 'options',
            options: [
              { name: 'JavaScript', value: 'javascript' },
              { name: 'Python', value: 'python' },
            ],
            default: 'javascript',
            description: 'Programming language',
          },
          {
            name: 'code',
            displayName: 'Code',
            type: 'string',
            typeOptions: {
              multipleValues: false,
            },
            default: '',
            description: 'Code to execute',
          },
        ],
      },
      async execute(this: INodeExecuteFunctions): Promise<any[]> {
        const items = this.getInputData();
        const code = this.getNodeParameter('code', 0) as string;
        const returnData = [];

        for (const item of items) {
          const func = new Function('$input', '$item', `${code}; return $input;`);
          const result = func(item.json, item);
          returnData.push({ json: result });
        }

        return returnData;
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
        description: 'Delay execution',
        defaults: {
          name: 'Delay',
          color: '#999999',
        },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
          {
            name: 'delay',
            displayName: 'Delay (ms)',
            type: 'number',
            default: 1000,
            description: 'Delay in milliseconds',
          },
        ],
      },
      async execute(this: INodeExecuteFunctions): Promise<any[]> {
        const items = this.getInputData();
        const delay = this.getNodeParameter('delay', 0) as number;
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return items;
      },
    };

    this.registerNodeType(delayNode);
  }

  private registerMergeNode(): void {
    const mergeNode: INodeType = {
      description: {
        displayName: 'Merge',
        name: 'merge',
        group: ['transform'],
        version: 1,
        description: 'Merge multiple inputs',
        defaults: {
          name: 'Merge',
          color: '#cc66ff',
        },
        inputs: ['main', 'main'],
        outputs: ['main'],
        properties: [
          {
            name: 'mode',
            displayName: 'Mode',
            type: 'options',
            options: [
              { name: 'Append', value: 'append' },
              { name: 'Combine', value: 'combine' },
              { name: 'Multiplex', value: 'multiplex' },
            ],
            default: 'append',
            description: 'How to merge inputs',
          },
        ],
      },
      async execute(this: INodeExecuteFunctions): Promise<any[]> {
        return this.getInputData();
      },
    };

    this.registerNodeType(mergeNode);
  }

  private registerSplitNode(): void {
    const splitNode: INodeType = {
      description: {
        displayName: 'Split',
        name: 'split',
        group: ['transform'],
        version: 1,
        description: 'Split data into batches',
        defaults: {
          name: 'Split',
          color: '#ff66cc',
        },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
          {
            name: 'batchSize',
            displayName: 'Batch Size',
            type: 'number',
            default: 10,
            description: 'Size of each batch',
          },
        ],
      },
      async execute(this: INodeExecuteFunctions): Promise<any[]> {
        const items = this.getInputData();
        const batchSize = this.getNodeParameter('batchSize', 0) as number;
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