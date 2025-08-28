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
import { Client } from '@microsoft/microsoft-graph-client';

export class Office365Node implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Microsoft Office 365',
    name: 'office365',
    icon: 'file:office365.svg',
    group: ['integration'],
    version: 1,
    subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
    description: 'Interact with Microsoft Office 365 services (Outlook, OneDrive, SharePoint)',
    defaults: {
      name: 'Office 365',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'microsoftGraph',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Email',
            value: 'email',
          },
          {
            name: 'Calendar',
            value: 'calendar',
          },
          {
            name: 'Contact',
            value: 'contact',
          },
          {
            name: 'Drive',
            value: 'drive',
          },
          {
            name: 'User',
            value: 'user',
          },
          {
            name: 'Team',
            value: 'team',
          },
        ],
        default: 'email',
      },

      // Email Operations
      {
        displayName: 'Operation',
        name: 'emailOperation',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['email'],
          },
        },
        options: [
          {
            name: 'Send',
            value: 'send',
            description: 'Send an email',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get an email',
          },
          {
            name: 'List',
            value: 'list',
            description: 'List emails',
          },
          {
            name: 'Delete',
            value: 'delete',
            description: 'Delete an email',
          },
          {
            name: 'Reply',
            value: 'reply',
            description: 'Reply to an email',
          },
          {
            name: 'Forward',
            value: 'forward',
            description: 'Forward an email',
          },
          {
            name: 'Mark as Read',
            value: 'markAsRead',
            description: 'Mark email as read',
          },
          {
            name: 'Mark as Unread',
            value: 'markAsUnread',
            description: 'Mark email as unread',
          },
        ],
        default: 'send',
      },

      // Calendar Operations
      {
        displayName: 'Operation',
        name: 'calendarOperation',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['calendar'],
          },
        },
        options: [
          {
            name: 'Create Event',
            value: 'createEvent',
            description: 'Create a calendar event',
          },
          {
            name: 'Get Event',
            value: 'getEvent',
            description: 'Get a calendar event',
          },
          {
            name: 'Update Event',
            value: 'updateEvent',
            description: 'Update a calendar event',
          },
          {
            name: 'Delete Event',
            value: 'deleteEvent',
            description: 'Delete a calendar event',
          },
          {
            name: 'List Events',
            value: 'listEvents',
            description: 'List calendar events',
          },
          {
            name: 'List Calendars',
            value: 'listCalendars',
            description: 'List calendars',
          },
        ],
        default: 'createEvent',
      },

      // Contact Operations
      {
        displayName: 'Operation',
        name: 'contactOperation',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['contact'],
          },
        },
        options: [
          {
            name: 'Create',
            value: 'create',
            description: 'Create a contact',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get a contact',
          },
          {
            name: 'Update',
            value: 'update',
            description: 'Update a contact',
          },
          {
            name: 'Delete',
            value: 'delete',
            description: 'Delete a contact',
          },
          {
            name: 'List',
            value: 'list',
            description: 'List contacts',
          },
        ],
        default: 'create',
      },

      // Drive Operations
      {
        displayName: 'Operation',
        name: 'driveOperation',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['drive'],
          },
        },
        options: [
          {
            name: 'Upload File',
            value: 'uploadFile',
            description: 'Upload a file to OneDrive',
          },
          {
            name: 'Download File',
            value: 'downloadFile',
            description: 'Download a file from OneDrive',
          },
          {
            name: 'Get File',
            value: 'getFile',
            description: 'Get file information',
          },
          {
            name: 'Delete File',
            value: 'deleteFile',
            description: 'Delete a file',
          },
          {
            name: 'List Files',
            value: 'listFiles',
            description: 'List files and folders',
          },
          {
            name: 'Create Folder',
            value: 'createFolder',
            description: 'Create a folder',
          },
          {
            name: 'Share File',
            value: 'shareFile',
            description: 'Share a file or folder',
          },
        ],
        default: 'uploadFile',
      },

      // User Operations
      {
        displayName: 'Operation',
        name: 'userOperation',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['user'],
          },
        },
        options: [
          {
            name: 'Get Profile',
            value: 'getProfile',
            description: 'Get user profile',
          },
          {
            name: 'Update Profile',
            value: 'updateProfile',
            description: 'Update user profile',
          },
          {
            name: 'List Users',
            value: 'listUsers',
            description: 'List users in organization',
          },
          {
            name: 'Get User',
            value: 'getUser',
            description: 'Get specific user',
          },
        ],
        default: 'getProfile',
      },

      // Team Operations
      {
        displayName: 'Operation',
        name: 'teamOperation',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['team'],
          },
        },
        options: [
          {
            name: 'List Teams',
            value: 'listTeams',
            description: 'List Teams',
          },
          {
            name: 'Get Team',
            value: 'getTeam',
            description: 'Get team information',
          },
          {
            name: 'Send Message',
            value: 'sendMessage',
            description: 'Send a message to channel',
          },
          {
            name: 'List Channels',
            value: 'listChannels',
            description: 'List team channels',
          },
        ],
        default: 'listTeams',
      },

      // Resource ID
      {
        displayName: 'ID',
        name: 'id',
        type: 'string',
        displayOptions: {
          hide: {
            emailOperation: ['send', 'list'],
            calendarOperation: ['createEvent', 'listEvents', 'listCalendars'],
            contactOperation: ['create', 'list'],
            driveOperation: ['uploadFile', 'listFiles', 'createFolder'],
            userOperation: ['getProfile', 'updateProfile', 'listUsers'],
            teamOperation: ['listTeams'],
          },
        },
        default: '',
        description: 'Resource ID',
      },

      // Email specific fields
      {
        displayName: 'To',
        name: 'to',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            resource: ['email'],
            emailOperation: ['send', 'reply', 'forward'],
          },
        },
        default: '',
        description: 'Recipient email addresses (comma-separated)',
      },
      {
        displayName: 'Subject',
        name: 'subject',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            resource: ['email'],
            emailOperation: ['send', 'reply', 'forward'],
          },
        },
        default: '',
        description: 'Email subject',
      },
      {
        displayName: 'Message',
        name: 'body',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            resource: ['email'],
            emailOperation: ['send', 'reply', 'forward'],
          },
        },
        typeOptions: {
          rows: 4,
        },
        default: '',
        description: 'Email message body',
      },

      // Calendar specific fields
      {
        displayName: 'Event Title',
        name: 'eventTitle',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            resource: ['calendar'],
            calendarOperation: ['createEvent', 'updateEvent'],
          },
        },
        default: '',
        description: 'Event title',
      },
      {
        displayName: 'Start Time',
        name: 'startTime',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            resource: ['calendar'],
            calendarOperation: ['createEvent', 'updateEvent'],
          },
        },
        default: '',
        description: 'Event start time (ISO 8601 format)',
      },
      {
        displayName: 'End Time',
        name: 'endTime',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            resource: ['calendar'],
            calendarOperation: ['createEvent', 'updateEvent'],
          },
        },
        default: '',
        description: 'Event end time (ISO 8601 format)',
      },

      // Drive specific fields
      {
        displayName: 'File Path',
        name: 'filePath',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            resource: ['drive'],
            driveOperation: ['uploadFile', 'downloadFile', 'getFile', 'deleteFile', 'shareFile'],
          },
        },
        default: '',
        description: 'File path in OneDrive',
      },

      // Additional Fields
      {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        options: [
          // Email fields
          {
            displayName: 'CC',
            name: 'cc',
            type: 'string',
            default: '',
            description: 'CC recipients (comma-separated)',
          },
          {
            displayName: 'BCC',
            name: 'bcc',
            type: 'string',
            default: '',
            description: 'BCC recipients (comma-separated)',
          },
          {
            displayName: 'Is HTML',
            name: 'isHtml',
            type: 'boolean',
            default: false,
            description: 'Whether the email body is HTML',
          },
          {
            displayName: 'Importance',
            name: 'importance',
            type: 'options',
            options: [
              {
                name: 'Low',
                value: 'low',
              },
              {
                name: 'Normal',
                value: 'normal',
              },
              {
                name: 'High',
                value: 'high',
              },
            ],
            default: 'normal',
            description: 'Email importance',
          },
          
          // Calendar fields
          {
            displayName: 'Description',
            name: 'description',
            type: 'string',
            typeOptions: {
              rows: 3,
            },
            default: '',
            description: 'Event description',
          },
          {
            displayName: 'Location',
            name: 'location',
            type: 'string',
            default: '',
            description: 'Event location',
          },
          {
            displayName: 'Attendees',
            name: 'attendees',
            type: 'string',
            default: '',
            description: 'Event attendees (comma-separated email addresses)',
          },
          {
            displayName: 'Is All Day',
            name: 'isAllDay',
            type: 'boolean',
            default: false,
            description: 'Whether the event is all day',
          },
          
          // Contact fields
          {
            displayName: 'Given Name',
            name: 'givenName',
            type: 'string',
            default: '',
            description: 'Contact first name',
          },
          {
            displayName: 'Surname',
            name: 'surname',
            type: 'string',
            default: '',
            description: 'Contact last name',
          },
          {
            displayName: 'Email Address',
            name: 'emailAddress',
            type: 'string',
            default: '',
            description: 'Contact email address',
          },
          {
            displayName: 'Phone Number',
            name: 'phoneNumber',
            type: 'string',
            default: '',
            description: 'Contact phone number',
          },
          {
            displayName: 'Company',
            name: 'company',
            type: 'string',
            default: '',
            description: 'Contact company',
          },
          
          // Drive fields
          {
            displayName: 'Content',
            name: 'content',
            type: 'string',
            typeOptions: {
              rows: 4,
            },
            default: '',
            description: 'File content (for text files)',
          },
          {
            displayName: 'Folder Name',
            name: 'folderName',
            type: 'string',
            default: '',
            description: 'Folder name to create',
          },
          {
            displayName: 'Share Type',
            name: 'shareType',
            type: 'options',
            options: [
              {
                name: 'View',
                value: 'view',
              },
              {
                name: 'Edit',
                value: 'edit',
              },
            ],
            default: 'view',
            description: 'Sharing permission type',
          },
          {
            displayName: 'Share Recipients',
            name: 'shareRecipients',
            type: 'string',
            default: '',
            description: 'Email addresses to share with (comma-separated)',
          },
          
          // Common fields
          {
            displayName: 'Limit',
            name: 'limit',
            type: 'number',
            default: 50,
            description: 'Maximum number of items to return',
          },
          {
            displayName: 'Filter',
            name: 'filter',
            type: 'string',
            default: '',
            description: 'OData filter expression',
          },
        ],
      },
    ],
  };

  async execute(this: INodeExecuteFunctions): Promise<any> {
    const items = this.getInputData();
    let returnData: IDataObject[] = [];

    const credentials = await this.getCredentials('microsoftGraph');
    if (!credentials) {
      throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
    }

    // Create Microsoft Graph client
    const graphClient = Client.init({
      authProvider: async (done) => {
        done(null, credentials.accessToken as string);
      },
    });

    for (let i = 0; i < items.length; i++) {
      try {
        const resource = this.getNodeParameter('resource', i) as string;

        let responseData: any;

        switch (resource) {
          case 'email':
            responseData = await this.handleEmailOperation(graphClient, i);
            break;
          case 'calendar':
            responseData = await this.handleCalendarOperation(graphClient, i);
            break;
          case 'contact':
            responseData = await this.handleContactOperation(graphClient, i);
            break;
          case 'drive':
            responseData = await this.handleDriveOperation(graphClient, i);
            break;
          case 'user':
            responseData = await this.handleUserOperation(graphClient, i);
            break;
          case 'team':
            responseData = await this.handleTeamOperation(graphClient, i);
            break;
          default:
            throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`);
        }

        if (Array.isArray(responseData?.value)) {
          returnData.push(...responseData.value);
        } else if (Array.isArray(responseData)) {
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

  async handleEmailOperation(this: INodeExecuteFunctions, graphClient: Client, itemIndex: number): Promise<any> {
    const operation = this.getNodeParameter('emailOperation', itemIndex) as string;
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    switch (operation) {
      case 'send':
        const to = this.getNodeParameter('to', itemIndex) as string;
        const subject = this.getNodeParameter('subject', itemIndex) as string;
        const body = this.getNodeParameter('body', itemIndex) as string;
        
        const toRecipients = to.split(',').map(email => ({ emailAddress: { address: email.trim() } }));
        const ccRecipients = additionalFields.cc ? 
          (additionalFields.cc as string).split(',').map(email => ({ emailAddress: { address: email.trim() } })) : [];
        const bccRecipients = additionalFields.bcc ? 
          (additionalFields.bcc as string).split(',').map(email => ({ emailAddress: { address: email.trim() } })) : [];

        const message = {
          subject,
          body: {
            contentType: additionalFields.isHtml ? 'html' : 'text',
            content: body,
          },
          toRecipients,
          ccRecipients,
          bccRecipients,
          importance: additionalFields.importance || 'normal',
        };

        return await graphClient.api('/me/sendMail').post({ message });

      case 'get':
        const messageId = this.getNodeParameter('id', itemIndex) as string;
        return await graphClient.api(`/me/messages/${messageId}`).get();

      case 'list':
        let listQuery = graphClient.api('/me/messages');
        
        if (additionalFields.filter) {
          listQuery = listQuery.filter(additionalFields.filter as string);
        }
        
        if (additionalFields.limit) {
          listQuery = listQuery.top(additionalFields.limit as number);
        }
        
        return await listQuery.get();

      case 'delete':
        const deleteMessageId = this.getNodeParameter('id', itemIndex) as string;
        return await graphClient.api(`/me/messages/${deleteMessageId}`).delete();

      case 'markAsRead':
        const readMessageId = this.getNodeParameter('id', itemIndex) as string;
        return await graphClient.api(`/me/messages/${readMessageId}`).patch({ isRead: true });

      case 'markAsUnread':
        const unreadMessageId = this.getNodeParameter('id', itemIndex) as string;
        return await graphClient.api(`/me/messages/${unreadMessageId}`).patch({ isRead: false });

      default:
        throw new NodeOperationError(this.getNode(), `The email operation "${operation}" is not known!`);
    }
  }

  async handleCalendarOperation(this: INodeExecuteFunctions, graphClient: Client, itemIndex: number): Promise<any> {
    const operation = this.getNodeParameter('calendarOperation', itemIndex) as string;
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    switch (operation) {
      case 'createEvent':
        const eventTitle = this.getNodeParameter('eventTitle', itemIndex) as string;
        const startTime = this.getNodeParameter('startTime', itemIndex) as string;
        const endTime = this.getNodeParameter('endTime', itemIndex) as string;
        
        const attendees = additionalFields.attendees ? 
          (additionalFields.attendees as string).split(',').map(email => ({ emailAddress: { address: email.trim() } })) : [];

        const event = {
          subject: eventTitle,
          start: {
            dateTime: startTime,
            timeZone: 'UTC',
          },
          end: {
            dateTime: endTime,
            timeZone: 'UTC',
          },
          body: {
            contentType: 'text',
            content: additionalFields.description || '',
          },
          location: {
            displayName: additionalFields.location || '',
          },
          attendees,
          isAllDay: additionalFields.isAllDay || false,
        };

        return await graphClient.api('/me/events').post(event);

      case 'getEvent':
        const eventId = this.getNodeParameter('id', itemIndex) as string;
        return await graphClient.api(`/me/events/${eventId}`).get();

      case 'listEvents':
        let eventsQuery = graphClient.api('/me/events');
        
        if (additionalFields.filter) {
          eventsQuery = eventsQuery.filter(additionalFields.filter as string);
        }
        
        if (additionalFields.limit) {
          eventsQuery = eventsQuery.top(additionalFields.limit as number);
        }
        
        return await eventsQuery.get();

      case 'deleteEvent':
        const deleteEventId = this.getNodeParameter('id', itemIndex) as string;
        return await graphClient.api(`/me/events/${deleteEventId}`).delete();

      case 'listCalendars':
        return await graphClient.api('/me/calendars').get();

      default:
        throw new NodeOperationError(this.getNode(), `The calendar operation "${operation}" is not known!`);
    }
  }

  async handleContactOperation(this: INodeExecuteFunctions, graphClient: Client, itemIndex: number): Promise<any> {
    const operation = this.getNodeParameter('contactOperation', itemIndex) as string;
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    switch (operation) {
      case 'create':
        const contact = {
          givenName: additionalFields.givenName || '',
          surname: additionalFields.surname || '',
          emailAddresses: additionalFields.emailAddress ? [{ address: additionalFields.emailAddress }] : [],
          businessPhones: additionalFields.phoneNumber ? [additionalFields.phoneNumber] : [],
          companyName: additionalFields.company || '',
        };

        return await graphClient.api('/me/contacts').post(contact);

      case 'get':
        const contactId = this.getNodeParameter('id', itemIndex) as string;
        return await graphClient.api(`/me/contacts/${contactId}`).get();

      case 'list':
        let contactsQuery = graphClient.api('/me/contacts');
        
        if (additionalFields.limit) {
          contactsQuery = contactsQuery.top(additionalFields.limit as number);
        }
        
        return await contactsQuery.get();

      case 'delete':
        const deleteContactId = this.getNodeParameter('id', itemIndex) as string;
        return await graphClient.api(`/me/contacts/${deleteContactId}`).delete();

      default:
        throw new NodeOperationError(this.getNode(), `The contact operation "${operation}" is not known!`);
    }
  }

  async handleDriveOperation(this: INodeExecuteFunctions, graphClient: Client, itemIndex: number): Promise<any> {
    const operation = this.getNodeParameter('driveOperation', itemIndex) as string;
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    switch (operation) {
      case 'uploadFile':
        const filePath = this.getNodeParameter('filePath', itemIndex) as string;
        const content = additionalFields.content as string || '';
        
        return await graphClient.api(`/me/drive/root:/${filePath}:/content`).put(content);

      case 'downloadFile':
        const downloadFilePath = this.getNodeParameter('filePath', itemIndex) as string;
        return await graphClient.api(`/me/drive/root:/${downloadFilePath}:/content`).get();

      case 'getFile':
        const getFilePath = this.getNodeParameter('filePath', itemIndex) as string;
        return await graphClient.api(`/me/drive/root:/${getFilePath}`).get();

      case 'deleteFile':
        const deleteFilePath = this.getNodeParameter('filePath', itemIndex) as string;
        return await graphClient.api(`/me/drive/root:/${deleteFilePath}`).delete();

      case 'listFiles':
        return await graphClient.api('/me/drive/root/children').get();

      case 'createFolder':
        const folderName = additionalFields.folderName as string;
        const folder = {
          name: folderName,
          folder: {},
        };
        
        return await graphClient.api('/me/drive/root/children').post(folder);

      default:
        throw new NodeOperationError(this.getNode(), `The drive operation "${operation}" is not known!`);
    }
  }

  async handleUserOperation(this: INodeExecuteFunctions, graphClient: Client, itemIndex: number): Promise<any> {
    const operation = this.getNodeParameter('userOperation', itemIndex) as string;
    const additionalFields = this.getNodeParameter('additionalFields', itemIndex) as IDataObject;

    switch (operation) {
      case 'getProfile':
        return await graphClient.api('/me').get();

      case 'listUsers':
        let usersQuery = graphClient.api('/users');
        
        if (additionalFields.limit) {
          usersQuery = usersQuery.top(additionalFields.limit as number);
        }
        
        return await usersQuery.get();

      case 'getUser':
        const userId = this.getNodeParameter('id', itemIndex) as string;
        return await graphClient.api(`/users/${userId}`).get();

      default:
        throw new NodeOperationError(this.getNode(), `The user operation "${operation}" is not known!`);
    }
  }

  async handleTeamOperation(this: INodeExecuteFunctions, graphClient: Client, itemIndex: number): Promise<any> {
    const operation = this.getNodeParameter('teamOperation', itemIndex) as string;

    switch (operation) {
      case 'listTeams':
        return await graphClient.api('/me/joinedTeams').get();

      case 'getTeam':
        const teamId = this.getNodeParameter('id', itemIndex) as string;
        return await graphClient.api(`/teams/${teamId}`).get();

      case 'listChannels':
        const channelsTeamId = this.getNodeParameter('id', itemIndex) as string;
        return await graphClient.api(`/teams/${channelsTeamId}/channels`).get();

      default:
        throw new NodeOperationError(this.getNode(), `The team operation "${operation}" is not known!`);
    }
  }
}