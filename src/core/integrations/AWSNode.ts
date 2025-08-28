import { INodeType, INodeExecuteFunctions } from '../NodeRegistry';
import { INodeTypeDescription } from '../../types/workflow.types';

// Define missing interfaces for now
interface IDataObject {
  [key: string]: any;
}

class NodeOperationError extends Error {
  constructor(node: any, message: string) {
    super(message);
    this.name = 'NodeOperationError';
  }
}
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, CreateBucketCommand, DeleteBucketCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { LambdaClient, InvokeCommand, ListFunctionsCommand, GetFunctionCommand } from '@aws-sdk/client-lambda';
import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand, CreateQueueCommand, ListQueuesCommand } from '@aws-sdk/client-sqs';
import { SNSClient, PublishCommand, CreateTopicCommand, SubscribeCommand, UnsubscribeCommand, ListTopicsCommand } from '@aws-sdk/client-sns';
import { SESClient, SendEmailCommand, GetSendQuotaCommand, GetSendStatisticsCommand, ListVerifiedEmailAddressesCommand } from '@aws-sdk/client-ses';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class AWSNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'AWS',
    name: 'aws',
    icon: 'file:aws.svg',
    group: ['integration'],
    version: 1,
    subtitle: '={{$parameter["service"] + ": " + $parameter["operation"]}}',
    description: 'Interact with Amazon Web Services (S3, Lambda, SQS, SNS, SES)',
    defaults: {
      name: 'AWS',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'aws',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Service',
        name: 'service',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'S3',
            value: 's3',
          },
          {
            name: 'Lambda',
            value: 'lambda',
          },
          {
            name: 'SQS',
            value: 'sqs',
          },
          {
            name: 'SNS',
            value: 'sns',
          },
          {
            name: 'SES',
            value: 'ses',
          },
        ],
        default: 's3',
      },

      // S3 Operations
      {
        displayName: 'Operation',
        name: 's3Operation',
        type: 'options',
        displayOptions: {
          show: {
            service: ['s3'],
          },
        },
        options: [
          {
            name: 'Upload Object',
            value: 'putObject',
            description: 'Upload an object to S3',
          },
          {
            name: 'Download Object',
            value: 'getObject',
            description: 'Download an object from S3',
          },
          {
            name: 'Delete Object',
            value: 'deleteObject',
            description: 'Delete an object from S3',
          },
          {
            name: 'List Objects',
            value: 'listObjects',
            description: 'List objects in a bucket',
          },
          {
            name: 'Create Bucket',
            value: 'createBucket',
            description: 'Create a new S3 bucket',
          },
          {
            name: 'Delete Bucket',
            value: 'deleteBucket',
            description: 'Delete an S3 bucket',
          },
          {
            name: 'Copy Object',
            value: 'copyObject',
            description: 'Copy an object within S3',
          },
          {
            name: 'Get Object URL',
            value: 'getSignedUrl',
            description: 'Get a signed URL for an object',
          },
        ],
        default: 'putObject',
      },

      // Lambda Operations
      {
        displayName: 'Operation',
        name: 'lambdaOperation',
        type: 'options',
        displayOptions: {
          show: {
            service: ['lambda'],
          },
        },
        options: [
          {
            name: 'Invoke Function',
            value: 'invoke',
            description: 'Invoke a Lambda function',
          },
          {
            name: 'List Functions',
            value: 'listFunctions',
            description: 'List Lambda functions',
          },
          {
            name: 'Get Function',
            value: 'getFunction',
            description: 'Get Lambda function configuration',
          },
          {
            name: 'Create Function',
            value: 'createFunction',
            description: 'Create a new Lambda function',
          },
          {
            name: 'Update Function Code',
            value: 'updateFunctionCode',
            description: 'Update Lambda function code',
          },
          {
            name: 'Delete Function',
            value: 'deleteFunction',
            description: 'Delete a Lambda function',
          },
        ],
        default: 'invoke',
      },

      // SQS Operations
      {
        displayName: 'Operation',
        name: 'sqsOperation',
        type: 'options',
        displayOptions: {
          show: {
            service: ['sqs'],
          },
        },
        options: [
          {
            name: 'Send Message',
            value: 'sendMessage',
            description: 'Send a message to SQS queue',
          },
          {
            name: 'Receive Messages',
            value: 'receiveMessage',
            description: 'Receive messages from SQS queue',
          },
          {
            name: 'Delete Message',
            value: 'deleteMessage',
            description: 'Delete a message from SQS queue',
          },
          {
            name: 'Create Queue',
            value: 'createQueue',
            description: 'Create a new SQS queue',
          },
          {
            name: 'Delete Queue',
            value: 'deleteQueue',
            description: 'Delete an SQS queue',
          },
          {
            name: 'Get Queue Attributes',
            value: 'getQueueAttributes',
            description: 'Get SQS queue attributes',
          },
          {
            name: 'List Queues',
            value: 'listQueues',
            description: 'List SQS queues',
          },
        ],
        default: 'sendMessage',
      },

      // SNS Operations
      {
        displayName: 'Operation',
        name: 'snsOperation',
        type: 'options',
        displayOptions: {
          show: {
            service: ['sns'],
          },
        },
        options: [
          {
            name: 'Publish Message',
            value: 'publish',
            description: 'Publish a message to SNS topic',
          },
          {
            name: 'Create Topic',
            value: 'createTopic',
            description: 'Create a new SNS topic',
          },
          {
            name: 'Delete Topic',
            value: 'deleteTopic',
            description: 'Delete an SNS topic',
          },
          {
            name: 'Subscribe',
            value: 'subscribe',
            description: 'Subscribe to an SNS topic',
          },
          {
            name: 'Unsubscribe',
            value: 'unsubscribe',
            description: 'Unsubscribe from an SNS topic',
          },
          {
            name: 'List Topics',
            value: 'listTopics',
            description: 'List SNS topics',
          },
          {
            name: 'List Subscriptions',
            value: 'listSubscriptions',
            description: 'List SNS subscriptions',
          },
        ],
        default: 'publish',
      },

      // SES Operations
      {
        displayName: 'Operation',
        name: 'sesOperation',
        type: 'options',
        displayOptions: {
          show: {
            service: ['ses'],
          },
        },
        options: [
          {
            name: 'Send Email',
            value: 'sendEmail',
            description: 'Send an email via SES',
          },
          {
            name: 'Send Raw Email',
            value: 'sendRawEmail',
            description: 'Send a raw email via SES',
          },
          {
            name: 'Verify Email Identity',
            value: 'verifyEmailIdentity',
            description: 'Verify an email identity',
          },
          {
            name: 'List Verified Emails',
            value: 'listVerifiedEmailAddresses',
            description: 'List verified email addresses',
          },
          {
            name: 'Get Send Quota',
            value: 'getSendQuota',
            description: 'Get SES sending quota',
          },
          {
            name: 'Get Send Statistics',
            value: 'getSendStatistics',
            description: 'Get SES sending statistics',
          },
        ],
        default: 'sendEmail',
      },

      // Common Parameters
      {
        displayName: 'Region',
        name: 'region',
        type: 'string',
        default: 'us-east-1',
        description: 'AWS region',
      },

      // S3 Parameters
      {
        displayName: 'Bucket Name',
        name: 'bucketName',
        type: 'string',
        displayOptions: {
          show: {
            service: ['s3'],
          },
        },
        default: '',
        description: 'S3 bucket name',
      },
      {
        displayName: 'Object Key',
        name: 'objectKey',
        type: 'string',
        displayOptions: {
          show: {
            service: ['s3'],
            s3Operation: ['putObject', 'getObject', 'deleteObject', 'copyObject', 'getSignedUrl'],
          },
        },
        default: '',
        description: 'S3 object key (file path)',
      },

      // Lambda Parameters
      {
        displayName: 'Function Name',
        name: 'functionName',
        type: 'string',
        displayOptions: {
          show: {
            service: ['lambda'],
          },
        },
        default: '',
        description: 'Lambda function name',
      },

      // SQS Parameters
      {
        displayName: 'Queue URL',
        name: 'queueUrl',
        type: 'string',
        displayOptions: {
          show: {
            service: ['sqs'],
            sqsOperation: ['sendMessage', 'receiveMessage', 'deleteMessage', 'deleteQueue', 'getQueueAttributes'],
          },
        },
        default: '',
        description: 'SQS queue URL',
      },
      {
        displayName: 'Queue Name',
        name: 'queueName',
        type: 'string',
        displayOptions: {
          show: {
            service: ['sqs'],
            sqsOperation: ['createQueue'],
          },
        },
        default: '',
        description: 'SQS queue name',
      },

      // SNS Parameters
      {
        displayName: 'Topic ARN',
        name: 'topicArn',
        type: 'string',
        displayOptions: {
          show: {
            service: ['sns'],
            snsOperation: ['publish', 'deleteTopic', 'subscribe'],
          },
        },
        default: '',
        description: 'SNS topic ARN',
      },
      {
        displayName: 'Topic Name',
        name: 'topicName',
        type: 'string',
        displayOptions: {
          show: {
            service: ['sns'],
            snsOperation: ['createTopic'],
          },
        },
        default: '',
        description: 'SNS topic name',
      },

      // Additional Fields
      {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        options: [
          // S3 Fields
          {
            displayName: 'Content Type',
            name: 'contentType',
            type: 'string',
            default: 'application/octet-stream',
            description: 'Content type for S3 object',
          },
          {
            displayName: 'Content',
            name: 'content',
            type: 'string',
            typeOptions: {
              rows: 4,
            },
            default: '',
            description: 'Content for S3 object or message body',
          },
          {
            displayName: 'Source Bucket',
            name: 'sourceBucket',
            type: 'string',
            default: '',
            description: 'Source bucket for copy operation',
          },
          {
            displayName: 'Source Key',
            name: 'sourceKey',
            type: 'string',
            default: '',
            description: 'Source key for copy operation',
          },
          {
            displayName: 'Expires',
            name: 'expires',
            type: 'number',
            default: 3600,
            description: 'URL expiration time in seconds',
          },
          
          // Lambda Fields
          {
            displayName: 'Payload',
            name: 'payload',
            type: 'json',
            default: '{}',
            description: 'Lambda function payload',
          },
          {
            displayName: 'Invocation Type',
            name: 'invocationType',
            type: 'options',
            options: [
              {
                name: 'RequestResponse',
                value: 'RequestResponse',
              },
              {
                name: 'Event',
                value: 'Event',
              },
              {
                name: 'DryRun',
                value: 'DryRun',
              },
            ],
            default: 'RequestResponse',
            description: 'Lambda invocation type',
          },
          
          // SQS Fields
          {
            displayName: 'Message Body',
            name: 'messageBody',
            type: 'string',
            typeOptions: {
              rows: 3,
            },
            default: '',
            description: 'SQS message body',
          },
          {
            displayName: 'Delay Seconds',
            name: 'delaySeconds',
            type: 'number',
            default: 0,
            description: 'Message delay in seconds',
          },
          {
            displayName: 'Max Number of Messages',
            name: 'maxNumberOfMessages',
            type: 'number',
            default: 1,
            description: 'Maximum number of messages to receive',
          },
          {
            displayName: 'Receipt Handle',
            name: 'receiptHandle',
            type: 'string',
            default: '',
            description: 'Message receipt handle for deletion',
          },
          
          // SNS Fields
          {
            displayName: 'Message',
            name: 'message',
            type: 'string',
            typeOptions: {
              rows: 3,
            },
            default: '',
            description: 'SNS message content',
          },
          {
            displayName: 'Subject',
            name: 'subject',
            type: 'string',
            default: '',
            description: 'SNS message subject',
          },
          {
            displayName: 'Protocol',
            name: 'protocol',
            type: 'options',
            options: [
              {
                name: 'HTTP',
                value: 'http',
              },
              {
                name: 'HTTPS',
                value: 'https',
              },
              {
                name: 'Email',
                value: 'email',
              },
              {
                name: 'SQS',
                value: 'sqs',
              },
              {
                name: 'SMS',
                value: 'sms',
              },
            ],
            default: 'email',
            description: 'Subscription protocol',
          },
          {
            displayName: 'Endpoint',
            name: 'endpoint',
            type: 'string',
            default: '',
            description: 'Subscription endpoint',
          },
          
          // SES Fields
          {
            displayName: 'To Addresses',
            name: 'toAddresses',
            type: 'string',
            default: '',
            description: 'Comma-separated list of recipient email addresses',
          },
          {
            displayName: 'From Address',
            name: 'source',
            type: 'string',
            default: '',
            description: 'Sender email address',
          },
          {
            displayName: 'CC Addresses',
            name: 'ccAddresses',
            type: 'string',
            default: '',
            description: 'Comma-separated list of CC email addresses',
          },
          {
            displayName: 'BCC Addresses',
            name: 'bccAddresses',
            type: 'string',
            default: '',
            description: 'Comma-separated list of BCC email addresses',
          },
          {
            displayName: 'HTML Body',
            name: 'htmlBody',
            type: 'string',
            typeOptions: {
              rows: 4,
            },
            default: '',
            description: 'HTML email body',
          },
          {
            displayName: 'Text Body',
            name: 'textBody',
            type: 'string',
            typeOptions: {
              rows: 4,
            },
            default: '',
            description: 'Plain text email body',
          },
        ],
      },
    ],
  };

  async execute(this: INodeExecuteFunctions): Promise<any> {
    const items = this.getInputData();
    let returnData: IDataObject[] = [];

    const credentials = await this.getCredentials('aws');
    if (!credentials) {
      throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
    }

    for (let i = 0; i < items.length; i++) {
      try {
        const service = this.getNodeParameter('service', i) as string;
        const region = this.getNodeParameter('region', i) as string;

        // Configure AWS
        const awsConfig = {
          accessKeyId: credentials.accessKeyId as string,
          secretAccessKey: credentials.secretAccessKey as string,
          region: region,
        };

        let responseData: any;

        switch (service) {
          case 's3':
            responseData = await this.handleS3Operation(awsConfig, i);
            break;
          case 'lambda':
            responseData = await this.handleLambdaOperation(awsConfig, i);
            break;
          case 'sqs':
            responseData = await this.handleSQSOperation(awsConfig, i);
            break;
          case 'sns':
            responseData = await this.handleSNSOperation(awsConfig, i);
            break;
          case 'ses':
            responseData = await this.handleSESOperation(awsConfig, i);
            break;
          default:
            throw new NodeOperationError(this.getNode(), `The service "${service}" is not known!`);
        }

        if (Array.isArray(responseData)) {
          returnData.push(...responseData);
        } else {
          returnData.push(responseData);
        }
      } catch (error: any) {
        if (this.continueOnFail()) {
          returnData.push({
            error: error.message,
            json: {},
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [this.helpers.returnJsonArray(returnData)];
  }

  async handleS3Operation(this: INodeExecuteFunctions, awsConfig: any, itemIndex: number): Promise<any> {
    const s3Client = new S3Client(awsConfig);
    const operation = this.getNodeParameter('s3Operation', itemIndex) as string;
    const bucketName = this.getNodeParameter('bucketName', itemIndex) as string;
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    switch (operation) {
      case 'putObject':
        const objectKey = this.getNodeParameter('objectKey', itemIndex) as string;
        const putCommand = new PutObjectCommand({
          Bucket: bucketName,
          Key: objectKey,
          Body: additionalFields.content as string,
          ContentType: additionalFields.contentType as string || 'application/octet-stream',
        });
        return await s3Client.send(putCommand);

      case 'getObject':
        const getObjectKey = this.getNodeParameter('objectKey', itemIndex) as string;
        const getCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: getObjectKey,
        });
        const result = await s3Client.send(getCommand);
        
        let bodyContent = '';
        if (result.Body) {
          bodyContent = await result.Body.transformToString();
        }
        
        return {
          ...result,
          Body: bodyContent,
        };

      case 'deleteObject':
        const deleteObjectKey = this.getNodeParameter('objectKey', itemIndex) as string;
        const deleteCommand = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: deleteObjectKey,
        });
        return await s3Client.send(deleteCommand);

      case 'listObjects':
        const listCommand = new ListObjectsV2Command({
          Bucket: bucketName,
        });
        return await s3Client.send(listCommand);

      case 'createBucket':
        const createCommand = new CreateBucketCommand({
          Bucket: bucketName,
        });
        return await s3Client.send(createCommand);

      case 'deleteBucket':
        const deleteBucketCommand = new DeleteBucketCommand({
          Bucket: bucketName,
        });
        return await s3Client.send(deleteBucketCommand);

      case 'copyObject':
        const copyObjectKey = this.getNodeParameter('objectKey', itemIndex) as string;
        const copyCommand = new CopyObjectCommand({
          Bucket: bucketName,
          Key: copyObjectKey,
          CopySource: `${additionalFields.sourceBucket}/${additionalFields.sourceKey}`,
        });
        return await s3Client.send(copyCommand);

      case 'getSignedUrl':
        const signedUrlObjectKey = this.getNodeParameter('objectKey', itemIndex) as string;
        const getObjectCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: signedUrlObjectKey,
        });
        const signedUrl = await getSignedUrl(s3Client, getObjectCommand, { 
          expiresIn: additionalFields.expires as number || 3600 
        });
        
        return { signedUrl };

      default:
        throw new NodeOperationError(this.getNode(), `The S3 operation "${operation}" is not known!`);
    }
  }

  async handleLambdaOperation(this: INodeExecuteFunctions, awsConfig: any, itemIndex: number): Promise<any> {
    const lambdaClient = new LambdaClient(awsConfig);
    const operation = this.getNodeParameter('lambdaOperation', itemIndex) as string;
    const functionName = this.getNodeParameter('functionName', itemIndex) as string;
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    switch (operation) {
      case 'invoke':
        const invokeCommand = new InvokeCommand({
          FunctionName: functionName,
          InvocationType: additionalFields.invocationType as string || 'RequestResponse',
          Payload: JSON.stringify(additionalFields.payload || {}),
        });
        const result = await lambdaClient.send(invokeCommand);
        
        return {
          ...result,
          Payload: result.Payload ? JSON.parse(new TextDecoder().decode(result.Payload)) : null,
        };

      case 'listFunctions':
        const listCommand = new ListFunctionsCommand({});
        return await lambdaClient.send(listCommand);

      case 'getFunction':
        const getCommand = new GetFunctionCommand({
          FunctionName: functionName,
        });
        return await lambdaClient.send(getCommand);

      default:
        throw new NodeOperationError(this.getNode(), `The Lambda operation "${operation}" is not known!`);
    }
  }

  async handleSQSOperation(this: INodeExecuteFunctions, awsConfig: any, itemIndex: number): Promise<any> {
    const sqsClient = new SQSClient(awsConfig);
    const operation = this.getNodeParameter('sqsOperation', itemIndex) as string;
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    switch (operation) {
      case 'sendMessage':
        const queueUrl = this.getNodeParameter('queueUrl', itemIndex) as string;
        const sendCommand = new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: additionalFields.messageBody as string,
          DelaySeconds: additionalFields.delaySeconds as number || 0,
        });
        return await sqsClient.send(sendCommand);

      case 'receiveMessage':
        const receiveQueueUrl = this.getNodeParameter('queueUrl', itemIndex) as string;
        const receiveCommand = new ReceiveMessageCommand({
          QueueUrl: receiveQueueUrl,
          MaxNumberOfMessages: additionalFields.maxNumberOfMessages as number || 1,
        });
        return await sqsClient.send(receiveCommand);

      case 'deleteMessage':
        const deleteQueueUrl = this.getNodeParameter('queueUrl', itemIndex) as string;
        const deleteCommand = new DeleteMessageCommand({
          QueueUrl: deleteQueueUrl,
          ReceiptHandle: additionalFields.receiptHandle as string,
        });
        return await sqsClient.send(deleteCommand);

      case 'createQueue':
        const queueName = this.getNodeParameter('queueName', itemIndex) as string;
        const createCommand = new CreateQueueCommand({
          QueueName: queueName,
        });
        return await sqsClient.send(createCommand);

      case 'listQueues':
        const listCommand = new ListQueuesCommand({});
        return await sqsClient.send(listCommand);

      default:
        throw new NodeOperationError(this.getNode(), `The SQS operation "${operation}" is not known!`);
    }
  }

  async handleSNSOperation(this: INodeExecuteFunctions, awsConfig: any, itemIndex: number): Promise<any> {
    const snsClient = new SNSClient(awsConfig);
    const operation = this.getNodeParameter('snsOperation', itemIndex) as string;
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    switch (operation) {
      case 'publish':
        const topicArn = this.getNodeParameter('topicArn', itemIndex) as string;
        const publishCommand = new PublishCommand({
          TopicArn: topicArn,
          Message: additionalFields.message as string,
          Subject: additionalFields.subject as string,
        });
        return await snsClient.send(publishCommand);

      case 'createTopic':
        const topicName = this.getNodeParameter('topicName', itemIndex) as string;
        const createCommand = new CreateTopicCommand({
          Name: topicName,
        });
        return await snsClient.send(createCommand);

      case 'subscribe':
        const subscribeTopicArn = this.getNodeParameter('topicArn', itemIndex) as string;
        const subscribeCommand = new SubscribeCommand({
          TopicArn: subscribeTopicArn,
          Protocol: additionalFields.protocol as string,
          Endpoint: additionalFields.endpoint as string,
        });
        return await snsClient.send(subscribeCommand);

      case 'listTopics':
        const listCommand = new ListTopicsCommand({});
        return await snsClient.send(listCommand);

      default:
        throw new NodeOperationError(this.getNode(), `The SNS operation "${operation}" is not known!`);
    }
  }

  async handleSESOperation(this: INodeExecuteFunctions, awsConfig: any, itemIndex: number): Promise<any> {
    const sesClient = new SESClient(awsConfig);
    const operation = this.getNodeParameter('sesOperation', itemIndex) as string;
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    switch (operation) {
      case 'sendEmail':
        const toAddresses = (additionalFields.toAddresses as string).split(',').map(e => e.trim());
        const ccAddresses = additionalFields.ccAddresses ? (additionalFields.ccAddresses as string).split(',').map(e => e.trim()) : undefined;
        const bccAddresses = additionalFields.bccAddresses ? (additionalFields.bccAddresses as string).split(',').map(e => e.trim()) : undefined;
        
        const sendEmailCommand = new SendEmailCommand({
          Source: additionalFields.source as string,
          Destination: {
            ToAddresses: toAddresses,
            CcAddresses: ccAddresses,
            BccAddresses: bccAddresses,
          },
          Message: {
            Subject: {
              Data: additionalFields.subject as string,
              Charset: 'UTF-8',
            },
            Body: {
              Html: additionalFields.htmlBody ? {
                Data: additionalFields.htmlBody as string,
                Charset: 'UTF-8',
              } : undefined,
              Text: additionalFields.textBody ? {
                Data: additionalFields.textBody as string,
                Charset: 'UTF-8',
              } : undefined,
            },
          },
        });
        return await sesClient.send(sendEmailCommand);

      case 'listVerifiedEmailAddresses':
        const listCommand = new ListVerifiedEmailAddressesCommand({});
        return await sesClient.send(listCommand);

      case 'getSendQuota':
        const quotaCommand = new GetSendQuotaCommand({});
        return await sesClient.send(quotaCommand);

      case 'getSendStatistics':
        const statsCommand = new GetSendStatisticsCommand({});
        return await sesClient.send(statsCommand);

      default:
        throw new NodeOperationError(this.getNode(), `The SES operation "${operation}" is not known!`);
    }
  }
}