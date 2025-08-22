import nodemailer from 'nodemailer';
import { INodeType, INodeExecuteFunctions } from '../NodeRegistry';

export const EmailNode: INodeType = {
  description: {
    displayName: 'Email',
    name: 'email',
    group: ['communication'],
    version: 1,
    description: 'Sends emails via SMTP',
    defaults: {
      name: 'Email',
      color: '#ff3366',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'smtp',
        required: true,
      },
    ],
    properties: [
      {
        name: 'operation',
        displayName: 'Operation',
        type: 'options',
        options: [
          { name: 'Send', value: 'send' },
        ],
        default: 'send',
        description: 'Operation to perform',
      },
      {
        name: 'to',
        displayName: 'To',
        type: 'string',
        required: true,
        default: '',
        description: 'Email addresses to send to (comma separated)',
      },
      {
        name: 'cc',
        displayName: 'CC',
        type: 'string',
        default: '',
        description: 'CC email addresses (comma separated)',
      },
      {
        name: 'bcc',
        displayName: 'BCC',
        type: 'string',
        default: '',
        description: 'BCC email addresses (comma separated)',
      },
      {
        name: 'subject',
        displayName: 'Subject',
        type: 'string',
        required: true,
        default: '',
        description: 'Subject of the email',
      },
      {
        name: 'message',
        displayName: 'Message',
        type: 'string',
        required: true,
        default: '',
        description: 'Plain text message',
      },
      {
        name: 'html',
        displayName: 'HTML',
        type: 'string',
        default: '',
        description: 'HTML version of the message',
      },
      {
        name: 'attachments',
        displayName: 'Attachments',
        type: 'string',
        default: '',
        description: 'Comma separated list of attachment file paths',
      },
      {
        name: 'options',
        displayName: 'Options',
        type: 'collection',
        default: {},
        description: 'Additional options',
      },
    ],
  },

  async execute(this: INodeExecuteFunctions): Promise<any[]> {
    const items = this.getInputData();
    const returnData = [];
    const operation = this.getNodeParameter('operation', 0) as string;

    if (operation === 'send') {
      const credentials = await this.getCredentials('smtp');

      // Create SMTP transporter
      const transporter = nodemailer.createTransporter({
        host: credentials.host,
        port: credentials.port,
        secure: credentials.secure || false,
        auth: {
          user: credentials.username,
          pass: credentials.password,
        },
      });

      // Verify connection
      try {
        await transporter.verify();
      } catch (error: any) {
        throw new Error(`SMTP connection failed: ${error.message}`);
      }

      for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
        try {
          const to = this.getNodeParameter('to', itemIndex) as string;
          const subject = this.getNodeParameter('subject', itemIndex) as string;
          const message = this.getNodeParameter('message', itemIndex) as string;

          if (!to || !subject || !message) {
            throw new Error('To, Subject, and Message are required');
          }

          // Build email options
          const mailOptions: any = {
            from: credentials.username,
            to: to.split(',').map(email => email.trim()),
            subject,
            text: message,
          };

          // Add optional fields
          const cc = this.getNodeParameter('cc', itemIndex, '') as string;
          if (cc) {
            mailOptions.cc = cc.split(',').map(email => email.trim());
          }

          const bcc = this.getNodeParameter('bcc', itemIndex, '') as string;
          if (bcc) {
            mailOptions.bcc = bcc.split(',').map(email => email.trim());
          }

          const html = this.getNodeParameter('html', itemIndex, '') as string;
          if (html) {
            mailOptions.html = html;
          }

          const attachments = this.getNodeParameter('attachments', itemIndex, '') as string;
          if (attachments) {
            mailOptions.attachments = attachments.split(',').map(path => ({
              filename: path.split('/').pop(),
              path: path.trim(),
            }));
          }

          // Send email
          const result = await transporter.sendMail(mailOptions);

          returnData.push({
            json: {
              messageId: result.messageId,
              accepted: result.accepted,
              rejected: result.rejected,
              response: result.response,
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

      // Close transporter
      transporter.close();
    }

    return returnData;
  },
};