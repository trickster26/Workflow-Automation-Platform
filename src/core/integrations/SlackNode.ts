import { INodeType, INodeExecuteFunctions } from '../NodeRegistry';
import { WebClient } from '@slack/web-api';
import { createLogger } from '../../utils/logger';

export const SlackNode: INodeType = {
  description: {
    displayName: 'Slack',
    name: 'slack',
    group: ['communication'],
    version: 1,
    description: 'Interact with Slack - send messages, manage channels, users, and files',
    defaults: {
      name: 'Slack',
      color: '#4A154B',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'slackApi',
        required: true,
      },
    ],
    properties: [
      {
        name: 'operation',
        displayName: 'Operation',
        type: 'options',
        options: [
          {
            name: 'Send Message',
            value: 'sendMessage',
            description: 'Send a message to a channel or user',
          },
          {
            name: 'Update Message',
            value: 'updateMessage',
            description: 'Update an existing message',
          },
          {
            name: 'Delete Message',
            value: 'deleteMessage',
            description: 'Delete a message',
          },
          {
            name: 'Get Channel Info',
            value: 'getChannelInfo',
            description: 'Get information about a channel',
          },
          {
            name: 'List Channels',
            value: 'listChannels',
            description: 'List all channels',
          },
          {
            name: 'Create Channel',
            value: 'createChannel',
            description: 'Create a new channel',
          },
          {
            name: 'Archive Channel',
            value: 'archiveChannel',
            description: 'Archive a channel',
          },
          {
            name: 'Get User Info',
            value: 'getUserInfo',
            description: 'Get information about a user',
          },
          {
            name: 'List Users',
            value: 'listUsers',
            description: 'List all users',
          },
          {
            name: 'Upload File',
            value: 'uploadFile',
            description: 'Upload a file to Slack',
          },
          {
            name: 'Get Message History',
            value: 'getHistory',
            description: 'Get message history from a channel',
          },
          {
            name: 'Add Reaction',
            value: 'addReaction',
            description: 'Add a reaction to a message',
          },
          {
            name: 'Remove Reaction',
            value: 'removeReaction',
            description: 'Remove a reaction from a message',
          },
        ],
        default: 'sendMessage',
        description: 'The operation to perform',
      },
      // Send Message options
      {
        name: 'channel',
        displayName: 'Channel',
        type: 'string',
        default: '',
        required: true,
        description: 'Channel ID or name (e.g., #general, @user, C1234567890)',
        displayOptions: {
          show: {
            operation: ['sendMessage', 'updateMessage', 'deleteMessage', 'getHistory', 'addReaction', 'removeReaction'],
          },
        },
      },
      {
        name: 'text',
        displayName: 'Message Text',
        type: 'string',
        typeOptions: {
          rows: 4,
        },
        default: '',
        description: 'Message text (supports Slack formatting)',
        displayOptions: {
          show: {
            operation: ['sendMessage', 'updateMessage'],
          },
        },
      },
      {
        name: 'username',
        displayName: 'Username',
        type: 'string',
        default: '',
        description: 'Custom username for the message',
        displayOptions: {
          show: {
            operation: ['sendMessage'],
          },
        },
      },
      {
        name: 'iconEmoji',
        displayName: 'Icon Emoji',
        type: 'string',
        default: '',
        description: 'Custom emoji icon (e.g., :robot_face:)',
        displayOptions: {
          show: {
            operation: ['sendMessage'],
          },
        },
      },
      {
        name: 'iconUrl',
        displayName: 'Icon URL',
        type: 'string',
        default: '',
        description: 'Custom icon image URL',
        displayOptions: {
          show: {
            operation: ['sendMessage'],
          },
        },
      },
      {
        name: 'attachments',
        displayName: 'Attachments',
        type: 'string',
        typeOptions: {
          rows: 6,
        },
        default: '',
        description: 'JSON array of message attachments',
        displayOptions: {
          show: {
            operation: ['sendMessage'],
          },
        },
      },
      {
        name: 'blocks',
        displayName: 'Blocks',
        type: 'string',
        typeOptions: {
          rows: 8,
        },
        default: '',
        description: 'JSON array of Block Kit blocks',
        displayOptions: {
          show: {
            operation: ['sendMessage', 'updateMessage'],
          },
        },
      },
      {
        name: 'threadTs',
        displayName: 'Thread Timestamp',
        type: 'string',
        default: '',
        description: 'Timestamp of parent message to reply in thread',
        displayOptions: {
          show: {
            operation: ['sendMessage'],
          },
        },
      },
      // Update/Delete Message options
      {
        name: 'messageTs',
        displayName: 'Message Timestamp',
        type: 'string',
        default: '',
        required: true,
        description: 'Timestamp of the message to update/delete',
        displayOptions: {
          show: {
            operation: ['updateMessage', 'deleteMessage', 'addReaction', 'removeReaction'],
          },
        },
      },
      // Channel operations
      {
        name: 'channelId',
        displayName: 'Channel ID',
        type: 'string',
        default: '',
        required: true,
        description: 'Channel ID',
        displayOptions: {
          show: {
            operation: ['getChannelInfo', 'archiveChannel'],
          },
        },
      },
      {
        name: 'channelName',
        displayName: 'Channel Name',
        type: 'string',
        default: '',
        required: true,
        description: 'Name of the channel to create',
        displayOptions: {
          show: {
            operation: ['createChannel'],
          },
        },
      },
      {
        name: 'isPrivate',
        displayName: 'Private Channel',
        type: 'boolean',
        default: false,
        description: 'Create as private channel',
        displayOptions: {
          show: {
            operation: ['createChannel'],
          },
        },
      },
      {
        name: 'purpose',
        displayName: 'Channel Purpose',
        type: 'string',
        default: '',
        description: 'Purpose/description of the channel',
        displayOptions: {
          show: {
            operation: ['createChannel'],
          },
        },
      },
      // User operations
      {
        name: 'userId',
        displayName: 'User ID',
        type: 'string',
        default: '',
        required: true,
        description: 'User ID to get information about',
        displayOptions: {
          show: {
            operation: ['getUserInfo'],
          },
        },
      },
      // File operations
      {
        name: 'filePath',
        displayName: 'File Path',
        type: 'string',
        default: '',
        required: true,
        description: 'Path to the file to upload',
        displayOptions: {
          show: {
            operation: ['uploadFile'],
          },
        },
      },
      {
        name: 'fileName',
        displayName: 'File Name',
        type: 'string',
        default: '',
        description: 'Custom filename for the upload',
        displayOptions: {
          show: {
            operation: ['uploadFile'],
          },
        },
      },
      {
        name: 'fileComment',
        displayName: 'File Comment',
        type: 'string',
        default: '',
        description: 'Comment to add with the file',
        displayOptions: {
          show: {
            operation: ['uploadFile'],
          },
        },
      },
      {
        name: 'fileChannels',
        displayName: 'Share in Channels',
        type: 'string',
        default: '',
        description: 'Comma-separated channel IDs to share the file in',
        displayOptions: {
          show: {
            operation: ['uploadFile'],
          },
        },
      },
      // History options
      {
        name: 'oldest',
        displayName: 'Oldest',
        type: 'string',
        default: '',
        description: 'Start of time range (timestamp)',
        displayOptions: {
          show: {
            operation: ['getHistory'],
          },
        },
      },
      {
        name: 'latest',
        displayName: 'Latest',
        type: 'string',
        default: '',
        description: 'End of time range (timestamp)',
        displayOptions: {
          show: {
            operation: ['getHistory'],
          },
        },
      },
      {
        name: 'limit',
        displayName: 'Limit',
        type: 'number',
        default: 100,
        description: 'Maximum number of messages to return',
        displayOptions: {
          show: {
            operation: ['getHistory', 'listChannels', 'listUsers'],
          },
        },
      },
      // Reaction options
      {
        name: 'reactionName',
        displayName: 'Reaction',
        type: 'string',
        default: 'thumbsup',
        required: true,
        description: 'Name of emoji reaction (without colons)',
        displayOptions: {
          show: {
            operation: ['addReaction', 'removeReaction'],
          },
        },
      },
      // Advanced options
      {
        name: 'asUser',
        displayName: 'Post as User',
        type: 'boolean',
        default: false,
        description: 'Post the message as the authenticated user',
        displayOptions: {
          show: {
            operation: ['sendMessage'],
          },
        },
      },
      {
        name: 'linkNames',
        displayName: 'Link Names',
        type: 'boolean',
        default: true,
        description: 'Find and link user groups and channel names',
        displayOptions: {
          show: {
            operation: ['sendMessage'],
          },
        },
      },
      {
        name: 'unfurlLinks',
        displayName: 'Unfurl Links',
        type: 'boolean',
        default: true,
        description: 'Enable unfurling of primarily text-based links',
        displayOptions: {
          show: {
            operation: ['sendMessage'],
          },
        },
      },
      {
        name: 'unfurlMedia',
        displayName: 'Unfurl Media',
        type: 'boolean',
        default: true,
        description: 'Enable unfurling of media content',
        displayOptions: {
          show: {
            operation: ['sendMessage'],
          },
        },
      },
    ],
  },

  async execute(this: INodeExecuteFunctions): Promise<any[]> {
    const items = this.getInputData();
    const operation = this.getNodeParameter('operation', 0) as string;
    const logger = createLogger('SlackNode');
    const returnData = [];

    // Get credentials
    const credentials = await this.getCredentials('slackApi');
    if (!credentials || !credentials.token) {
      throw new Error('Slack API token is required');
    }

    const slack = new WebClient(credentials.token as string);

    for (let i = 0; i < items.length; i++) {
      try {
        let result: any;

        switch (operation) {
          case 'sendMessage':
            result = await this.sendMessage(slack, i);
            break;
          case 'updateMessage':
            result = await this.updateMessage(slack, i);
            break;
          case 'deleteMessage':
            result = await this.deleteMessage(slack, i);
            break;
          case 'getChannelInfo':
            result = await this.getChannelInfo(slack, i);
            break;
          case 'listChannels':
            result = await this.listChannels(slack, i);
            break;
          case 'createChannel':
            result = await this.createChannel(slack, i);
            break;
          case 'archiveChannel':
            result = await this.archiveChannel(slack, i);
            break;
          case 'getUserInfo':
            result = await this.getUserInfo(slack, i);
            break;
          case 'listUsers':
            result = await this.listUsers(slack, i);
            break;
          case 'uploadFile':
            result = await this.uploadFile(slack, i);
            break;
          case 'getHistory':
            result = await this.getHistory(slack, i);
            break;
          case 'addReaction':
            result = await this.addReaction(slack, i);
            break;
          case 'removeReaction':
            result = await this.removeReaction(slack, i);
            break;
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }

        returnData.push({
          json: result,
          pairedItem: { item: i },
        });

      } catch (error) {
        logger.error(`Slack operation ${operation} failed:`, error);
        
        if (this.continueOnFail?.()) {
          returnData.push({
            json: {
              error: error instanceof Error ? error.message : 'Unknown Slack error',
              operation,
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

  async sendMessage(this: INodeExecuteFunctions, slack: WebClient, itemIndex: number): Promise<any> {
    const channel = this.getNodeParameter('channel', itemIndex) as string;
    const text = this.getNodeParameter('text', itemIndex) as string;
    const username = this.getNodeParameter('username', itemIndex, '') as string;
    const iconEmoji = this.getNodeParameter('iconEmoji', itemIndex, '') as string;
    const iconUrl = this.getNodeParameter('iconUrl', itemIndex, '') as string;
    const attachments = this.getNodeParameter('attachments', itemIndex, '') as string;
    const blocks = this.getNodeParameter('blocks', itemIndex, '') as string;
    const threadTs = this.getNodeParameter('threadTs', itemIndex, '') as string;
    const asUser = this.getNodeParameter('asUser', itemIndex, false) as boolean;
    const linkNames = this.getNodeParameter('linkNames', itemIndex, true) as boolean;
    const unfurlLinks = this.getNodeParameter('unfurlLinks', itemIndex, true) as boolean;
    const unfurlMedia = this.getNodeParameter('unfurlMedia', itemIndex, true) as boolean;

    const messageOptions: any = {
      channel,
      text,
      as_user: asUser,
      link_names: linkNames,
      unfurl_links: unfurlLinks,
      unfurl_media: unfurlMedia,
    };

    if (username) messageOptions.username = username;
    if (iconEmoji) messageOptions.icon_emoji = iconEmoji;
    if (iconUrl) messageOptions.icon_url = iconUrl;
    if (threadTs) messageOptions.thread_ts = threadTs;

    if (attachments) {
      try {
        messageOptions.attachments = JSON.parse(attachments);
      } catch (error) {
        throw new Error('Invalid JSON in attachments parameter');
      }
    }

    if (blocks) {
      try {
        messageOptions.blocks = JSON.parse(blocks);
      } catch (error) {
        throw new Error('Invalid JSON in blocks parameter');
      }
    }

    const response = await slack.chat.postMessage(messageOptions);
    return response;
  },

  async updateMessage(this: INodeExecuteFunctions, slack: WebClient, itemIndex: number): Promise<any> {
    const channel = this.getNodeParameter('channel', itemIndex) as string;
    const messageTs = this.getNodeParameter('messageTs', itemIndex) as string;
    const text = this.getNodeParameter('text', itemIndex) as string;
    const blocks = this.getNodeParameter('blocks', itemIndex, '') as string;

    const updateOptions: any = {
      channel,
      ts: messageTs,
      text,
    };

    if (blocks) {
      try {
        updateOptions.blocks = JSON.parse(blocks);
      } catch (error) {
        throw new Error('Invalid JSON in blocks parameter');
      }
    }

    const response = await slack.chat.update(updateOptions);
    return response;
  },

  async deleteMessage(this: INodeExecuteFunctions, slack: WebClient, itemIndex: number): Promise<any> {
    const channel = this.getNodeParameter('channel', itemIndex) as string;
    const messageTs = this.getNodeParameter('messageTs', itemIndex) as string;

    const response = await slack.chat.delete({
      channel,
      ts: messageTs,
    });
    return response;
  },

  async getChannelInfo(this: INodeExecuteFunctions, slack: WebClient, itemIndex: number): Promise<any> {
    const channelId = this.getNodeParameter('channelId', itemIndex) as string;

    const response = await slack.conversations.info({
      channel: channelId,
    });
    return response;
  },

  async listChannels(this: INodeExecuteFunctions, slack: WebClient, itemIndex: number): Promise<any> {
    const limit = this.getNodeParameter('limit', itemIndex, 100) as number;

    const response = await slack.conversations.list({
      limit,
      exclude_archived: false,
      types: 'public_channel,private_channel',
    });
    return response;
  },

  async createChannel(this: INodeExecuteFunctions, slack: WebClient, itemIndex: number): Promise<any> {
    const channelName = this.getNodeParameter('channelName', itemIndex) as string;
    const isPrivate = this.getNodeParameter('isPrivate', itemIndex, false) as boolean;
    const purpose = this.getNodeParameter('purpose', itemIndex, '') as string;

    const response = await slack.conversations.create({
      name: channelName,
      is_private: isPrivate,
    });

    // Set purpose if provided
    if (purpose && response.channel?.id) {
      await slack.conversations.setPurpose({
        channel: response.channel.id,
        purpose,
      });
    }

    return response;
  },

  async archiveChannel(this: INodeExecuteFunctions, slack: WebClient, itemIndex: number): Promise<any> {
    const channelId = this.getNodeParameter('channelId', itemIndex) as string;

    const response = await slack.conversations.archive({
      channel: channelId,
    });
    return response;
  },

  async getUserInfo(this: INodeExecuteFunctions, slack: WebClient, itemIndex: number): Promise<any> {
    const userId = this.getNodeParameter('userId', itemIndex) as string;

    const response = await slack.users.info({
      user: userId,
    });
    return response;
  },

  async listUsers(this: INodeExecuteFunctions, slack: WebClient, itemIndex: number): Promise<any> {
    const limit = this.getNodeParameter('limit', itemIndex, 100) as number;

    const response = await slack.users.list({
      limit,
    });
    return response;
  },

  async uploadFile(this: INodeExecuteFunctions, slack: WebClient, itemIndex: number): Promise<any> {
    const filePath = this.getNodeParameter('filePath', itemIndex) as string;
    const fileName = this.getNodeParameter('fileName', itemIndex, '') as string;
    const fileComment = this.getNodeParameter('fileComment', itemIndex, '') as string;
    const channelsStr = this.getNodeParameter('fileChannels', itemIndex, '') as string;

    const fs = require('fs');
    const path = require('path');

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const uploadOptions: any = {
      file: fs.createReadStream(filePath),
      filename: fileName || path.basename(filePath),
    };

    if (fileComment) uploadOptions.initial_comment = fileComment;
    if (channelsStr) {
      uploadOptions.channels = channelsStr.split(',').map(c => c.trim());
    }

    const response = await slack.files.uploadV2(uploadOptions);
    return response;
  },

  async getHistory(this: INodeExecuteFunctions, slack: WebClient, itemIndex: number): Promise<any> {
    const channel = this.getNodeParameter('channel', itemIndex) as string;
    const oldest = this.getNodeParameter('oldest', itemIndex, '') as string;
    const latest = this.getNodeParameter('latest', itemIndex, '') as string;
    const limit = this.getNodeParameter('limit', itemIndex, 100) as number;

    const historyOptions: any = {
      channel,
      limit,
    };

    if (oldest) historyOptions.oldest = oldest;
    if (latest) historyOptions.latest = latest;

    const response = await slack.conversations.history(historyOptions);
    return response;
  },

  async addReaction(this: INodeExecuteFunctions, slack: WebClient, itemIndex: number): Promise<any> {
    const channel = this.getNodeParameter('channel', itemIndex) as string;
    const messageTs = this.getNodeParameter('messageTs', itemIndex) as string;
    const reactionName = this.getNodeParameter('reactionName', itemIndex) as string;

    const response = await slack.reactions.add({
      channel,
      timestamp: messageTs,
      name: reactionName,
    });
    return response;
  },

  async removeReaction(this: INodeExecuteFunctions, slack: WebClient, itemIndex: number): Promise<any> {
    const channel = this.getNodeParameter('channel', itemIndex) as string;
    const messageTs = this.getNodeParameter('messageTs', itemIndex) as string;
    const reactionName = this.getNodeParameter('reactionName', itemIndex) as string;

    const response = await slack.reactions.remove({
      channel,
      timestamp: messageTs,
      name: reactionName,
    });
    return response;
  },
};