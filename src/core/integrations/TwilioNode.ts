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
import { Twilio } from 'twilio';

export class TwilioNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Twilio',
    name: 'twilio',
    icon: 'file:twilio.svg',
    group: ['integration'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Send SMS and make calls using Twilio',
    defaults: {
      name: 'Twilio',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'twilio',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Send SMS',
            value: 'sendSMS',
            description: 'Send an SMS message',
          },
          {
            name: 'Make Call',
            value: 'makeCall',
            description: 'Make a phone call',
          },
          {
            name: 'Get Message',
            value: 'getMessage',
            description: 'Get SMS message details',
          },
          {
            name: 'List Messages',
            value: 'listMessages',
            description: 'List SMS messages',
          },
          {
            name: 'Get Call',
            value: 'getCall',
            description: 'Get call details',
          },
          {
            name: 'List Calls',
            value: 'listCalls',
            description: 'List phone calls',
          },
          {
            name: 'Get Phone Number',
            value: 'getPhoneNumber',
            description: 'Get phone number information',
          },
          {
            name: 'List Phone Numbers',
            value: 'listPhoneNumbers',
            description: 'List phone numbers',
          },
          {
            name: 'Buy Phone Number',
            value: 'buyPhoneNumber',
            description: 'Purchase a phone number',
          },
          {
            name: 'Release Phone Number',
            value: 'releasePhoneNumber',
            description: 'Release a phone number',
          },
          {
            name: 'Search Phone Numbers',
            value: 'searchPhoneNumbers',
            description: 'Search for available phone numbers',
          },
        ],
        default: 'sendSMS',
      },

      // To Phone Number
      {
        displayName: 'To',
        name: 'to',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            operation: ['sendSMS', 'makeCall'],
          },
        },
        default: '',
        description: 'Phone number to send message or call to (E.164 format, e.g., +1234567890)',
      },

      // From Phone Number
      {
        displayName: 'From',
        name: 'from',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            operation: ['sendSMS', 'makeCall'],
          },
        },
        default: '',
        description: 'Twilio phone number to send from (E.164 format, e.g., +1234567890)',
      },

      // Message Body
      {
        displayName: 'Message',
        name: 'body',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            operation: ['sendSMS'],
          },
        },
        typeOptions: {
          rows: 3,
        },
        default: '',
        description: 'SMS message content',
      },

      // Call URL
      {
        displayName: 'URL',
        name: 'url',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            operation: ['makeCall'],
          },
        },
        default: '',
        description: 'TwiML URL for call instructions',
      },

      // Resource SID
      {
        displayName: 'SID',
        name: 'sid',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            operation: ['getMessage', 'getCall', 'getPhoneNumber', 'releasePhoneNumber'],
          },
        },
        default: '',
        description: 'Resource SID',
      },

      // Phone Number for Purchase
      {
        displayName: 'Phone Number',
        name: 'phoneNumber',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            operation: ['buyPhoneNumber'],
          },
        },
        default: '',
        description: 'Phone number to purchase (E.164 format)',
      },

      // Additional Fields
      {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        options: [
          // SMS Fields
          {
            displayName: 'Media URL',
            name: 'mediaUrl',
            type: 'string',
            default: '',
            description: 'URL of media to send with MMS',
          },
          {
            displayName: 'Status Callback URL',
            name: 'statusCallback',
            type: 'string',
            default: '',
            description: 'URL to receive status callbacks',
          },
          {
            displayName: 'Messaging Service SID',
            name: 'messagingServiceSid',
            type: 'string',
            default: '',
            description: 'Messaging service SID to use instead of From number',
          },
          
          // Call Fields
          {
            displayName: 'Method',
            name: 'method',
            type: 'options',
            options: [
              {
                name: 'GET',
                value: 'GET',
              },
              {
                name: 'POST',
                value: 'POST',
              },
            ],
            default: 'POST',
            description: 'HTTP method for TwiML URL',
          },
          {
            displayName: 'Fallback URL',
            name: 'fallbackUrl',
            type: 'string',
            default: '',
            description: 'Fallback URL if primary URL fails',
          },
          {
            displayName: 'Status Callback Method',
            name: 'statusCallbackMethod',
            type: 'options',
            options: [
              {
                name: 'GET',
                value: 'GET',
              },
              {
                name: 'POST',
                value: 'POST',
              },
            ],
            default: 'POST',
            description: 'HTTP method for status callback',
          },
          {
            displayName: 'Record',
            name: 'record',
            type: 'boolean',
            default: false,
            description: 'Record the call',
          },
          {
            displayName: 'Timeout',
            name: 'timeout',
            type: 'number',
            default: 60,
            description: 'Time to wait for answer (seconds)',
          },
          
          // Search Fields
          {
            displayName: 'Country Code',
            name: 'countryCode',
            type: 'string',
            default: 'US',
            description: 'ISO country code for phone number search',
          },
          {
            displayName: 'Area Code',
            name: 'areaCode',
            type: 'string',
            default: '',
            description: 'Area code for phone number search',
          },
          {
            displayName: 'Contains',
            name: 'contains',
            type: 'string',
            default: '',
            description: 'Pattern that phone number should contain',
          },
          {
            displayName: 'SMS Enabled',
            name: 'smsEnabled',
            type: 'boolean',
            default: true,
            description: 'Filter for SMS-enabled numbers',
          },
          {
            displayName: 'Voice Enabled',
            name: 'voiceEnabled',
            type: 'boolean',
            default: true,
            description: 'Filter for voice-enabled numbers',
          },
          
          // List Fields
          {
            displayName: 'Date Sent After',
            name: 'dateSentAfter',
            type: 'string',
            default: '',
            description: 'Filter messages sent after this date (YYYY-MM-DD)',
          },
          {
            displayName: 'Date Sent Before',
            name: 'dateSentBefore',
            type: 'string',
            default: '',
            description: 'Filter messages sent before this date (YYYY-MM-DD)',
          },
          {
            displayName: 'Status',
            name: 'status',
            type: 'options',
            options: [
              {
                name: 'All',
                value: '',
              },
              {
                name: 'Queued',
                value: 'queued',
              },
              {
                name: 'Failed',
                value: 'failed',
              },
              {
                name: 'Sent',
                value: 'sent',
              },
              {
                name: 'Received',
                value: 'received',
              },
              {
                name: 'Delivered',
                value: 'delivered',
              },
              {
                name: 'Undelivered',
                value: 'undelivered',
              },
            ],
            default: '',
            description: 'Filter by message status',
          },
          {
            displayName: 'Limit',
            name: 'limit',
            type: 'number',
            default: 50,
            description: 'Maximum number of results to return',
          },
          
          // Phone Number Fields
          {
            displayName: 'Friendly Name',
            name: 'friendlyName',
            type: 'string',
            default: '',
            description: 'Human-readable name for the phone number',
          },
          {
            displayName: 'Voice URL',
            name: 'voiceUrl',
            type: 'string',
            default: '',
            description: 'URL for voice call handling',
          },
          {
            displayName: 'SMS URL',
            name: 'smsUrl',
            type: 'string',
            default: '',
            description: 'URL for SMS handling',
          },
        ],
      },
    ],
  };

  async execute(this: INodeExecuteFunctions): Promise<any> {
    const items = this.getInputData();
    let returnData: IDataObject[] = [];

    const credentials = await this.getCredentials('twilio');
    if (!credentials) {
      throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
    }

    const client = new Twilio(
      credentials.accountSid as string,
      credentials.authToken as string
    );

    for (let i = 0; i < items.length; i++) {
      try {
        const operation = this.getNodeParameter('operation', i) as string;
        const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

        let responseData: any;

        switch (operation) {
          case 'sendSMS':
            responseData = await this.sendSMS(client, i);
            break;
          case 'makeCall':
            responseData = await this.makeCall(client, i);
            break;
          case 'getMessage':
            responseData = await this.getMessage(client, i);
            break;
          case 'listMessages':
            responseData = await this.listMessages(client, i);
            break;
          case 'getCall':
            responseData = await this.getCall(client, i);
            break;
          case 'listCalls':
            responseData = await this.listCalls(client, i);
            break;
          case 'getPhoneNumber':
            responseData = await this.getPhoneNumber(client, i);
            break;
          case 'listPhoneNumbers':
            responseData = await this.listPhoneNumbers(client, i);
            break;
          case 'buyPhoneNumber':
            responseData = await this.buyPhoneNumber(client, i);
            break;
          case 'releasePhoneNumber':
            responseData = await this.releasePhoneNumber(client, i);
            break;
          case 'searchPhoneNumbers':
            responseData = await this.searchPhoneNumbers(client, i);
            break;
          default:
            throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`);
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

  async sendSMS(this: INodeExecuteFunctions, client: Twilio, itemIndex: number): Promise<any> {
    const to = this.getNodeParameter('to', itemIndex) as string;
    const from = this.getNodeParameter('from', itemIndex) as string;
    const body = this.getNodeParameter('body', itemIndex) as string;
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    const messageOptions: any = {
      to,
      body,
    };

    if (additionalFields.messagingServiceSid) {
      messageOptions.messagingServiceSid = additionalFields.messagingServiceSid;
    } else {
      messageOptions.from = from;
    }

    if (additionalFields.mediaUrl) {
      messageOptions.mediaUrl = [additionalFields.mediaUrl as string];
    }

    if (additionalFields.statusCallback) {
      messageOptions.statusCallback = additionalFields.statusCallback;
    }

    const message = await client.messages.create(messageOptions);
    return message.toJSON();
  }

  async makeCall(this: INodeExecuteFunctions, client: Twilio, itemIndex: number): Promise<any> {
    const to = this.getNodeParameter('to', itemIndex) as string;
    const from = this.getNodeParameter('from', itemIndex) as string;
    const url = this.getNodeParameter('url', itemIndex) as string;
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    const callOptions: any = {
      to,
      from,
      url,
    };

    if (additionalFields.method) {
      callOptions.method = additionalFields.method;
    }

    if (additionalFields.fallbackUrl) {
      callOptions.fallbackUrl = additionalFields.fallbackUrl;
    }

    if (additionalFields.statusCallback) {
      callOptions.statusCallback = additionalFields.statusCallback;
      callOptions.statusCallbackMethod = additionalFields.statusCallbackMethod || 'POST';
    }

    if (additionalFields.record !== undefined) {
      callOptions.record = additionalFields.record;
    }

    if (additionalFields.timeout) {
      callOptions.timeout = additionalFields.timeout;
    }

    const call = await client.calls.create(callOptions);
    return call.toJSON();
  }

  async getMessage(this: INodeExecuteFunctions, client: Twilio, itemIndex: number): Promise<any> {
    const sid = this.getNodeParameter('sid', itemIndex) as string;
    
    const message = await client.messages(sid).fetch();
    return message.toJSON();
  }

  async listMessages(this: INodeExecuteFunctions, client: Twilio, itemIndex: number): Promise<any> {
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    const listOptions: any = {};

    if (additionalFields.dateSentAfter) {
      listOptions.dateSentAfter = new Date(additionalFields.dateSentAfter as string);
    }

    if (additionalFields.dateSentBefore) {
      listOptions.dateSentBefore = new Date(additionalFields.dateSentBefore as string);
    }

    if (additionalFields.status) {
      listOptions.status = additionalFields.status;
    }

    if (additionalFields.limit) {
      listOptions.limit = additionalFields.limit;
    }

    const messages = await client.messages.list(listOptions);
    return messages.map(message => message.toJSON());
  }

  async getCall(this: INodeExecuteFunctions, client: Twilio, itemIndex: number): Promise<any> {
    const sid = this.getNodeParameter('sid', itemIndex) as string;
    
    const call = await client.calls(sid).fetch();
    return call.toJSON();
  }

  async listCalls(this: INodeExecuteFunctions, client: Twilio, itemIndex: number): Promise<any> {
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    const listOptions: any = {};

    if (additionalFields.status) {
      listOptions.status = additionalFields.status;
    }

    if (additionalFields.limit) {
      listOptions.limit = additionalFields.limit;
    }

    const calls = await client.calls.list(listOptions);
    return calls.map(call => call.toJSON());
  }

  async getPhoneNumber(this: INodeExecuteFunctions, client: Twilio, itemIndex: number): Promise<any> {
    const sid = this.getNodeParameter('sid', itemIndex) as string;
    
    const phoneNumber = await client.incomingPhoneNumbers(sid).fetch();
    return phoneNumber.toJSON();
  }

  async listPhoneNumbers(this: INodeExecuteFunctions, client: Twilio, itemIndex: number): Promise<any> {
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    const listOptions: any = {};

    if (additionalFields.limit) {
      listOptions.limit = additionalFields.limit;
    }

    const phoneNumbers = await client.incomingPhoneNumbers.list(listOptions);
    return phoneNumbers.map(phoneNumber => phoneNumber.toJSON());
  }

  async buyPhoneNumber(this: INodeExecuteFunctions, client: Twilio, itemIndex: number): Promise<any> {
    const phoneNumber = this.getNodeParameter('phoneNumber', itemIndex) as string;
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    const purchaseOptions: any = {
      phoneNumber,
    };

    if (additionalFields.friendlyName) {
      purchaseOptions.friendlyName = additionalFields.friendlyName;
    }

    if (additionalFields.voiceUrl) {
      purchaseOptions.voiceUrl = additionalFields.voiceUrl;
    }

    if (additionalFields.smsUrl) {
      purchaseOptions.smsUrl = additionalFields.smsUrl;
    }

    if (additionalFields.statusCallback) {
      purchaseOptions.statusCallback = additionalFields.statusCallback;
    }

    const purchasedNumber = await client.incomingPhoneNumbers.create(purchaseOptions);
    return purchasedNumber.toJSON();
  }

  async releasePhoneNumber(this: INodeExecuteFunctions, client: Twilio, itemIndex: number): Promise<any> {
    const sid = this.getNodeParameter('sid', itemIndex) as string;
    
    const result = await client.incomingPhoneNumbers(sid).remove();
    return { success: result, sid };
  }

  async searchPhoneNumbers(this: INodeExecuteFunctions, client: Twilio, itemIndex: number): Promise<any> {
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    const searchOptions: any = {};

    if (additionalFields.countryCode) {
      searchOptions.countryCode = additionalFields.countryCode;
    }

    if (additionalFields.areaCode) {
      searchOptions.areaCode = additionalFields.areaCode;
    }

    if (additionalFields.contains) {
      searchOptions.contains = additionalFields.contains;
    }

    if (additionalFields.smsEnabled !== undefined) {
      searchOptions.smsEnabled = additionalFields.smsEnabled;
    }

    if (additionalFields.voiceEnabled !== undefined) {
      searchOptions.voiceEnabled = additionalFields.voiceEnabled;
    }

    if (additionalFields.limit) {
      searchOptions.limit = additionalFields.limit;
    }

    const countryCode = searchOptions.countryCode || 'US';
    const availableNumbers = await client.availablePhoneNumbers(countryCode).local.list(searchOptions);
    
    return availableNumbers.map(number => number.toJSON());
  }
}