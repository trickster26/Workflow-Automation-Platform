import { INodeType, INodeExecuteFunctions } from '../NodeRegistry';
import { NodeType } from '../../types/workflow.types';

export const HttpRequestNode: INodeType = {
  description: {
    displayName: 'HTTP Request',
    name: 'http',
    group: ['transform'],
    version: 1,
    description: 'Makes HTTP requests to any URL',
    defaults: {
      name: 'HTTP Request',
      color: '#0066ff',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        name: 'authentication',
        displayName: 'Authentication',
        type: 'options',
        options: [
          { name: 'None', value: 'none' },
          { name: 'Basic Auth', value: 'basicAuth' },
          { name: 'Header Auth', value: 'headerAuth' },
          { name: 'OAuth2', value: 'oauth2' },
        ],
        default: 'none',
        description: 'Authentication method to use',
      },
      {
        name: 'method',
        displayName: 'Method',
        type: 'options',
        options: [
          { name: 'DELETE', value: 'DELETE' },
          { name: 'GET', value: 'GET' },
          { name: 'HEAD', value: 'HEAD' },
          { name: 'PATCH', value: 'PATCH' },
          { name: 'POST', value: 'POST' },
          { name: 'PUT', value: 'PUT' },
        ],
        default: 'GET',
        description: 'The request method to use',
      },
      {
        name: 'url',
        displayName: 'URL',
        type: 'string',
        default: '',
        required: true,
        description: 'The URL to make the request to',
      },
      {
        name: 'sendQuery',
        displayName: 'Send Query Parameters',
        type: 'boolean',
        default: false,
        description: 'Whether to send query parameters',
      },
      {
        name: 'queryParameters',
        displayName: 'Query Parameters',
        type: 'collection',
        displayOptions: {
          show: {
            sendQuery: [true],
          },
        },
        default: {},
        description: 'Query parameters to send',
      },
      {
        name: 'sendHeaders',
        displayName: 'Send Headers',
        type: 'boolean',
        default: false,
        description: 'Whether to send headers',
      },
      {
        name: 'headerParameters',
        displayName: 'Headers',
        type: 'collection',
        displayOptions: {
          show: {
            sendHeaders: [true],
          },
        },
        default: {},
        description: 'Headers to send',
      },
      {
        name: 'sendBody',
        displayName: 'Send Body',
        type: 'boolean',
        default: false,
        displayOptions: {
          show: {
            method: ['POST', 'PUT', 'PATCH'],
          },
        },
        description: 'Whether to send body data',
      },
      {
        name: 'bodyContentType',
        displayName: 'Body Content Type',
        type: 'options',
        options: [
          { name: 'JSON', value: 'json' },
          { name: 'Form Data', value: 'form' },
          { name: 'Form URL Encoded', value: 'form-urlencoded' },
          { name: 'Raw', value: 'raw' },
        ],
        default: 'json',
        displayOptions: {
          show: {
            sendBody: [true],
          },
        },
        description: 'Content type of the body',
      },
      {
        name: 'jsonParameters',
        displayName: 'JSON Parameters',
        type: 'json',
        displayOptions: {
          show: {
            sendBody: [true],
            bodyContentType: ['json'],
          },
        },
        default: '{}',
        description: 'JSON body parameters',
      },
      {
        name: 'bodyParameters',
        displayName: 'Body Parameters',
        type: 'collection',
        displayOptions: {
          show: {
            sendBody: [true],
            bodyContentType: ['form', 'form-urlencoded'],
          },
        },
        default: {},
        description: 'Body parameters',
      },
      {
        name: 'rawBody',
        displayName: 'Raw Body',
        type: 'string',
        displayOptions: {
          show: {
            sendBody: [true],
            bodyContentType: ['raw'],
          },
        },
        default: '',
        description: 'Raw body content',
      },
      {
        name: 'options',
        displayName: 'Options',
        type: 'collection',
        default: {},
        description: 'Additional options',
      },
    ],
    credentials: [
      {
        name: 'httpBasicAuth',
      },
      {
        name: 'httpHeaderAuth',
      },
      {
        name: 'oauth2Api',
      },
    ],
  },

  async execute(this: INodeExecuteFunctions): Promise<any[]> {
    const items = this.getInputData();
    const returnData = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      try {
        const method = this.getNodeParameter('method', itemIndex) as string;
        const url = this.getNodeParameter('url', itemIndex) as string;
        const authentication = this.getNodeParameter('authentication', itemIndex) as string;

        if (!url) {
          throw new Error('URL is required');
        }

        // Build request options
        const requestOptions: any = {
          method,
          url,
          headers: {},
          validateStatus: () => true, // Don't throw on HTTP errors
        };

        // Add authentication
        if (authentication && authentication !== 'none') {
          const credentials = await this.getCredentials(authentication);
          this.addAuthentication(requestOptions, authentication, credentials);
        }

        // Add query parameters
        const sendQuery = this.getNodeParameter('sendQuery', itemIndex, false) as boolean;
        if (sendQuery) {
          const queryParameters = this.getNodeParameter('queryParameters', itemIndex, {}) as Record<string, any>;
          requestOptions.params = queryParameters;
        }

        // Add headers
        const sendHeaders = this.getNodeParameter('sendHeaders', itemIndex, false) as boolean;
        if (sendHeaders) {
          const headerParameters = this.getNodeParameter('headerParameters', itemIndex, {}) as Record<string, any>;
          Object.assign(requestOptions.headers, headerParameters);
        }

        // Add body for POST, PUT, PATCH
        const sendBody = this.getNodeParameter('sendBody', itemIndex, false) as boolean;
        if (sendBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
          const bodyContentType = this.getNodeParameter('bodyContentType', itemIndex, 'json') as string;
          
          switch (bodyContentType) {
            case 'json':
              const jsonParameters = this.getNodeParameter('jsonParameters', itemIndex, '{}') as string;
              requestOptions.data = typeof jsonParameters === 'string' ? JSON.parse(jsonParameters) : jsonParameters;
              requestOptions.headers['Content-Type'] = 'application/json';
              break;
            
            case 'form':
              const formParameters = this.getNodeParameter('bodyParameters', itemIndex, {}) as Record<string, any>;
              requestOptions.data = formParameters;
              requestOptions.headers['Content-Type'] = 'multipart/form-data';
              break;
            
            case 'form-urlencoded':
              const urlEncodedParameters = this.getNodeParameter('bodyParameters', itemIndex, {}) as Record<string, any>;
              const urlSearchParams = new URLSearchParams();
              Object.entries(urlEncodedParameters).forEach(([key, value]) => {
                urlSearchParams.append(key, String(value));
              });
              requestOptions.data = urlSearchParams.toString();
              requestOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
              break;
            
            case 'raw':
              const rawBody = this.getNodeParameter('rawBody', itemIndex, '') as string;
              requestOptions.data = rawBody;
              break;
          }
        }

        // Add options
        const options = this.getNodeParameter('options', itemIndex, {}) as Record<string, any>;
        if (options.timeout) {
          requestOptions.timeout = options.timeout;
        }
        if (options.followRedirects === false) {
          requestOptions.maxRedirects = 0;
        }

        // Make the request
        const response = await this.helpers.httpRequest(requestOptions);

        // Return response data
        returnData.push({
          json: {
            statusCode: response.statusCode,
            statusMessage: response.statusMessage,
            headers: response.headers,
            body: response.body,
          },
        });

      } catch (error: any) {
        if (this.continueOnFail?.()) {
          returnData.push({
            json: {
              error: error.message,
            },
            error,
          });
          continue;
        }
        throw error;
      }
    }

    return returnData;
  },

  addAuthentication(requestOptions: any, authenticationType: string, credentials: any): void {
    switch (authenticationType) {
      case 'basicAuth':
        if (credentials.username && credentials.password) {
          const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
          requestOptions.headers.Authorization = `Basic ${auth}`;
        }
        break;

      case 'headerAuth':
        if (credentials.name && credentials.value) {
          requestOptions.headers[credentials.name] = credentials.value;
        }
        break;

      case 'oauth2':
        if (credentials.accessToken) {
          requestOptions.headers.Authorization = `Bearer ${credentials.accessToken}`;
        }
        break;
    }
  },
};