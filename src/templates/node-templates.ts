import { INodeTypeDescription } from '../types/workflow.types';

export interface NodeTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  useCase: string[];
  nodeType: string;
  configuration: any;
  sampleData?: any;
  expectedOutput?: any;
  tags: string[];
  icon?: string;
  color?: string;
}

export const NODE_TEMPLATES: NodeTemplate[] = [
  // TRIGGER NODES
  {
    id: 'manual-basic',
    name: 'Manual Trigger - Basic',
    description: 'Simple manual trigger to start workflow execution',
    category: 'trigger',
    subcategory: 'manual',
    difficulty: 'beginner',
    useCase: ['testing', 'development', 'on-demand'],
    nodeType: 'manual',
    configuration: {
      name: 'Manual Trigger',
    },
    sampleData: {},
    expectedOutput: { json: {} },
    tags: ['trigger', 'manual', 'basic'],
    icon: '▶️',
    color: '#28a745'
  },

  {
    id: 'webhook-api',
    name: 'Webhook - API Endpoint',
    description: 'Receive HTTP requests from external systems',
    category: 'trigger',
    subcategory: 'webhook',
    difficulty: 'intermediate',
    useCase: ['api-integration', 'real-time-data', 'external-systems'],
    nodeType: 'webhook',
    configuration: {
      name: 'API Webhook',
      path: 'api/webhook/external',
      method: 'POST',
      responseMode: 'onReceived'
    },
    sampleData: { 
      body: { id: 123, name: 'John Doe', email: 'john@example.com' },
      headers: { 'Content-Type': 'application/json' }
    },
    expectedOutput: { json: { id: 123, name: 'John Doe', email: 'john@example.com' } },
    tags: ['webhook', 'api', 'http', 'external'],
    icon: '🔗',
    color: '#ff6633'
  },

  {
    id: 'webhook-form-submission',
    name: 'Webhook - Form Submission',
    description: 'Handle form submissions from websites',
    category: 'trigger',
    subcategory: 'webhook',
    difficulty: 'beginner',
    useCase: ['form-processing', 'lead-capture', 'user-registration'],
    nodeType: 'webhook',
    configuration: {
      name: 'Form Webhook',
      path: 'form/contact',
      method: 'POST',
      responseMode: 'lastNode'
    },
    sampleData: {
      body: { name: 'Jane Smith', email: 'jane@example.com', message: 'Hello!' },
      query: {},
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    },
    expectedOutput: { json: { name: 'Jane Smith', email: 'jane@example.com', message: 'Hello!' } },
    tags: ['webhook', 'form', 'contact', 'web'],
    icon: '📝',
    color: '#ff6633'
  },

  {
    id: 'schedule-daily-report',
    name: 'Schedule - Daily Report',
    description: 'Generate daily reports at scheduled time',
    category: 'trigger',
    subcategory: 'schedule',
    difficulty: 'intermediate',
    useCase: ['reporting', 'daily-tasks', 'maintenance'],
    nodeType: 'schedule',
    configuration: {
      name: 'Daily Report Schedule',
      scheduleMode: 'timeOfDay',
      timeOfDay: '09:00',
      timezone: 'America/New_York'
    },
    sampleData: {},
    expectedOutput: { json: { timestamp: '2024-01-01T09:00:00.000Z' } },
    tags: ['schedule', 'daily', 'report', 'automation'],
    icon: '📅',
    color: '#33ff99'
  },

  {
    id: 'schedule-hourly-sync',
    name: 'Schedule - Hourly Data Sync',
    description: 'Synchronize data every hour',
    category: 'trigger',
    subcategory: 'schedule',
    difficulty: 'beginner',
    useCase: ['data-sync', 'monitoring', 'regular-tasks'],
    nodeType: 'schedule',
    configuration: {
      name: 'Hourly Sync',
      scheduleMode: 'cron',
      cronExpression: '0 * * * *',
      timezone: 'UTC'
    },
    sampleData: {},
    expectedOutput: { json: { timestamp: '2024-01-01T10:00:00.000Z' } },
    tags: ['schedule', 'hourly', 'sync', 'cron'],
    icon: '🔄',
    color: '#33ff99'
  },

  // TRANSFORM NODES
  {
    id: 'transform-basic',
    name: 'Transform - Basic Field Mapping',
    description: 'Map and transform basic fields',
    category: 'transform',
    subcategory: 'data-manipulation',
    difficulty: 'beginner',
    useCase: ['field-mapping', 'data-cleanup', 'format-conversion'],
    nodeType: 'transform',
    configuration: {
      name: 'Basic Transform',
      fields: [
        { name: 'fullName', value: '{{firstName}} {{lastName}}', type: 'string' },
        { name: 'age', value: '{{userAge}}', type: 'number' },
        { name: 'isActive', value: '{{status === "active"}}', type: 'boolean' }
      ],
      keepOnlySetFields: false
    },
    sampleData: { firstName: 'John', lastName: 'Doe', userAge: '30', status: 'active' },
    expectedOutput: { json: { firstName: 'John', lastName: 'Doe', userAge: '30', status: 'active', fullName: 'John Doe', age: 30, isActive: true } },
    tags: ['transform', 'mapping', 'basic', 'fields'],
    icon: '🔄',
    color: '#33aaff'
  },

  {
    id: 'condition-status-check',
    name: 'Condition - Status Check',
    description: 'Branch workflow based on status field',
    category: 'transform',
    subcategory: 'flow-control',
    difficulty: 'beginner',
    useCase: ['status-routing', 'conditional-processing', 'error-handling'],
    nodeType: 'condition',
    configuration: {
      name: 'Status Check',
      conditions: [
        { field: 'status', operator: 'equals', value: 'active' }
      ],
      combineConditions: 'all'
    },
    sampleData: { id: 1, status: 'active', name: 'User1' },
    expectedOutput: [
      [{ json: { id: 1, status: 'active', name: 'User1' } }], // True path
      [] // False path
    ],
    tags: ['condition', 'status', 'branching', 'control'],
    icon: '🔀',
    color: '#ff9900'
  },

  {
    id: 'loop-array-processing',
    name: 'Loop - Array Processing',
    description: 'Process each item in an array',
    category: 'transform',
    subcategory: 'iteration',
    difficulty: 'intermediate',
    useCase: ['batch-processing', 'array-iteration', 'data-processing'],
    nodeType: 'loop',
    configuration: {
      name: 'Array Loop',
      loopMode: 'forEach',
      arrayField: 'items',
      addLoopData: true,
      batchSize: 0
    },
    sampleData: { items: [{ name: 'Item1' }, { name: 'Item2' }, { name: 'Item3' }] },
    expectedOutput: [
      { json: { items: [{ name: 'Item1' }, { name: 'Item2' }, { name: 'Item3' }], _loop: { mode: 'forEach', iteration: 0, value: 0, totalIterations: 3 }, _loopItem: { name: 'Item1' } } },
      { json: { items: [{ name: 'Item1' }, { name: 'Item2' }, { name: 'Item3' }], _loop: { mode: 'forEach', iteration: 1, value: 1, totalIterations: 3 }, _loopItem: { name: 'Item2' } } },
      { json: { items: [{ name: 'Item1' }, { name: 'Item2' }, { name: 'Item3' }], _loop: { mode: 'forEach', iteration: 2, value: 2, totalIterations: 3 }, _loopItem: { name: 'Item3' } } }
    ],
    tags: ['loop', 'array', 'iteration', 'batch'],
    icon: '🔁',
    color: '#9966ff'
  },

  // HTTP REQUEST NODES
  {
    id: 'http-api-call',
    name: 'HTTP Request - API Call',
    description: 'Make REST API calls to external services',
    category: 'integration',
    subcategory: 'http',
    difficulty: 'intermediate',
    useCase: ['api-integration', 'data-fetching', 'third-party-services'],
    nodeType: 'httpRequest',
    configuration: {
      name: 'API Call',
      url: 'https://api.example.com/users',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer {{token}}'
      },
      timeout: 30000,
      followRedirects: true
    },
    sampleData: { token: 'abc123' },
    expectedOutput: { json: { users: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }] } },
    tags: ['http', 'api', 'rest', 'external'],
    icon: '🌐',
    color: '#007bff'
  },

  // EMAIL NODES
  {
    id: 'email-notification',
    name: 'Email - Notification',
    description: 'Send email notifications',
    category: 'integration',
    subcategory: 'communication',
    difficulty: 'beginner',
    useCase: ['notifications', 'alerts', 'communication'],
    nodeType: 'email',
    configuration: {
      name: 'Email Notification',
      to: '{{recipient}}',
      subject: 'Workflow Notification: {{subject}}',
      body: 'Hello {{name}},\n\nYour workflow has completed successfully.\n\nBest regards',
      bodyFormat: 'text'
    },
    sampleData: { recipient: 'user@example.com', subject: 'Daily Report', name: 'John' },
    expectedOutput: { json: { sent: true, messageId: 'email-123', recipient: 'user@example.com' } },
    tags: ['email', 'notification', 'communication'],
    icon: '📧',
    color: '#dc3545'
  },

  // DATABASE NODES
  {
    id: 'database-insert',
    name: 'Database - Insert Record',
    description: 'Insert new records into database',
    category: 'integration',
    subcategory: 'database',
    difficulty: 'intermediate',
    useCase: ['data-storage', 'record-creation', 'persistence'],
    nodeType: 'database',
    configuration: {
      name: 'Insert Record',
      operation: 'insert',
      table: 'users',
      fields: {
        name: '{{name}}',
        email: '{{email}}',
        created_at: '{{new Date().toISOString()}}'
      }
    },
    sampleData: { name: 'John Doe', email: 'john@example.com' },
    expectedOutput: { json: { insertedId: 123, affectedRows: 1 } },
    tags: ['database', 'insert', 'storage', 'sql'],
    icon: '🗄️',
    color: '#28a745'
  },

  // FILE PROCESSING NODES
  {
    id: 'file-upload-csv',
    name: 'File Upload - CSV Processing',
    description: 'Upload and process CSV files',
    category: 'integration',
    subcategory: 'file-processing',
    difficulty: 'intermediate',
    useCase: ['file-processing', 'data-import', 'csv-handling'],
    nodeType: 'fileUpload',
    configuration: {
      name: 'CSV Upload',
      uploadType: 'csv',
      parseOptions: {
        delimiter: ',',
        hasHeaders: true,
        encoding: 'utf8'
      },
      outputFormat: 'array'
    },
    sampleData: { file: 'name,email\nJohn,john@example.com\nJane,jane@example.com' },
    expectedOutput: { json: { data: [{ name: 'John', email: 'john@example.com' }, { name: 'Jane', email: 'jane@example.com' }], rowCount: 2 } },
    tags: ['file', 'upload', 'csv', 'parsing'],
    icon: '📁',
    color: '#ffc107'
  },

  // SLACK INTEGRATION
  {
    id: 'slack-message',
    name: 'Slack - Send Message',
    description: 'Send messages to Slack channels',
    category: 'integration',
    subcategory: 'communication',
    difficulty: 'beginner',
    useCase: ['team-communication', 'alerts', 'notifications'],
    nodeType: 'slack',
    configuration: {
      name: 'Slack Message',
      operation: 'sendMessage',
      channel: '#general',
      message: 'Workflow completed: {{workflowName}}\nStatus: {{status}}\nTime: {{timestamp}}',
      username: 'Workflow Bot',
      iconEmoji: ':robot_face:'
    },
    sampleData: { workflowName: 'Daily Report', status: 'Success', timestamp: '2024-01-01T10:00:00Z' },
    expectedOutput: { json: { sent: true, ts: '1640995200.123456', channel: '#general' } },
    tags: ['slack', 'message', 'communication', 'team'],
    icon: '💬',
    color: '#4a154b'
  }
];

export const WORKFLOW_TEMPLATES = [
  {
    id: 'data-processing-pipeline',
    name: 'Data Processing Pipeline',
    description: 'Complete pipeline for processing CSV data with validation and storage',
    category: 'data-processing',
    difficulty: 'intermediate',
    useCase: ['data-import', 'validation', 'storage', 'reporting'],
    nodes: [
      {
        id: 'trigger',
        type: 'manual',
        name: 'Start Processing',
        position: { x: 100, y: 100 }
      },
      {
        id: 'file-upload',
        type: 'fileUpload',
        name: 'Upload CSV',
        position: { x: 300, y: 100 },
        parameters: {
          uploadType: 'csv',
          parseOptions: { delimiter: ',', hasHeaders: true }
        }
      },
      {
        id: 'validate',
        type: 'dataValidation',
        name: 'Validate Data',
        position: { x: 500, y: 100 },
        parameters: {
          validationRules: [
            { field: 'email', type: 'email', required: true },
            { field: 'age', type: 'number', min: 0, max: 120 }
          ]
        }
      },
      {
        id: 'condition',
        type: 'condition',
        name: 'Check Valid',
        position: { x: 700, y: 100 },
        parameters: {
          conditions: [{ field: '_valid', operator: 'equals', value: 'true' }]
        }
      },
      {
        id: 'database',
        type: 'database',
        name: 'Store Valid Records',
        position: { x: 900, y: 50 },
        parameters: {
          operation: 'insert',
          table: 'users',
          fields: { name: '{{name}}', email: '{{email}}', age: '{{age}}' }
        }
      },
      {
        id: 'notification',
        type: 'email',
        name: 'Send Error Report',
        position: { x: 900, y: 150 },
        parameters: {
          to: 'admin@example.com',
          subject: 'Data Validation Errors',
          body: 'Invalid records found: {{errorCount}}'
        }
      }
    ],
    connections: [
      { from: 'trigger', to: 'file-upload' },
      { from: 'file-upload', to: 'validate' },
      { from: 'validate', to: 'condition' },
      { from: 'condition', to: 'database', output: 0 },
      { from: 'condition', to: 'notification', output: 1 }
    ],
    tags: ['data-processing', 'csv', 'validation', 'pipeline'],
    estimatedExecutionTime: '2-5 minutes',
    complexity: 'medium'
  },

  {
    id: 'webhook-to-slack-alert',
    name: 'Webhook to Slack Alert',
    description: 'Receive webhook data and send formatted alerts to Slack',
    category: 'alerting',
    difficulty: 'beginner',
    useCase: ['monitoring', 'alerts', 'team-communication'],
    nodes: [
      {
        id: 'webhook',
        type: 'webhook',
        name: 'Webhook Trigger',
        position: { x: 100, y: 100 },
        parameters: {
          path: 'alert/webhook',
          method: 'POST'
        }
      },
      {
        id: 'transform',
        type: 'transform',
        name: 'Format Message',
        position: { x: 300, y: 100 },
        parameters: {
          fields: [
            { name: 'alertMessage', value: '🚨 Alert: {{alert.title}}\nSeverity: {{alert.severity}}\nTime: {{alert.timestamp}}' }
          ]
        }
      },
      {
        id: 'slack',
        type: 'slack',
        name: 'Send to Slack',
        position: { x: 500, y: 100 },
        parameters: {
          operation: 'sendMessage',
          channel: '#alerts',
          message: '{{alertMessage}}'
        }
      }
    ],
    connections: [
      { from: 'webhook', to: 'transform' },
      { from: 'transform', to: 'slack' }
    ],
    tags: ['webhook', 'slack', 'alerts', 'monitoring'],
    estimatedExecutionTime: '< 30 seconds',
    complexity: 'low'
  },

  {
    id: 'scheduled-backup-sync',
    name: 'Scheduled Database Backup & Sync',
    description: 'Daily backup of database with cloud storage sync',
    category: 'maintenance',
    difficulty: 'advanced',
    useCase: ['backup', 'maintenance', 'data-protection'],
    nodes: [
      {
        id: 'schedule',
        type: 'schedule',
        name: 'Daily at 2 AM',
        position: { x: 100, y: 100 },
        parameters: {
          scheduleMode: 'timeOfDay',
          timeOfDay: '02:00',
          timezone: 'UTC'
        }
      },
      {
        id: 'database-backup',
        type: 'database',
        name: 'Create Backup',
        position: { x: 300, y: 100 },
        parameters: {
          operation: 'backup',
          tables: ['users', 'workflows', 'executions'],
          format: 'sql'
        }
      },
      {
        id: 'aws-s3',
        type: 'aws',
        name: 'Upload to S3',
        position: { x: 500, y: 100 },
        parameters: {
          service: 's3',
          operation: 'upload',
          bucket: 'backups-bucket',
          key: 'db-backup-{{timestamp}}.sql'
        }
      },
      {
        id: 'notification',
        type: 'slack',
        name: 'Backup Success',
        position: { x: 700, y: 50 },
        parameters: {
          channel: '#operations',
          message: '✅ Database backup completed successfully'
        }
      },
      {
        id: 'error-notification',
        type: 'email',
        name: 'Backup Failed',
        position: { x: 700, y: 150 },
        parameters: {
          to: 'ops@example.com',
          subject: '❌ Backup Failed',
          body: 'Database backup failed at {{timestamp}}'
        }
      }
    ],
    connections: [
      { from: 'schedule', to: 'database-backup' },
      { from: 'database-backup', to: 'aws-s3' },
      { from: 'aws-s3', to: 'notification' },
      // Error handling would be configured through error nodes
    ],
    tags: ['backup', 'schedule', 'aws', 'maintenance'],
    estimatedExecutionTime: '5-15 minutes',
    complexity: 'high'
  },

  {
    id: 'form-to-crm-integration',
    name: 'Form Submission to CRM Integration',
    description: 'Process form submissions and create leads in CRM system',
    category: 'integration',
    difficulty: 'intermediate',
    useCase: ['lead-generation', 'crm-integration', 'sales'],
    nodes: [
      {
        id: 'webhook',
        type: 'webhook',
        name: 'Form Webhook',
        position: { x: 100, y: 100 },
        parameters: {
          path: 'form/contact',
          method: 'POST'
        }
      },
      {
        id: 'validation',
        type: 'dataValidation',
        name: 'Validate Form Data',
        position: { x: 300, y: 100 },
        parameters: {
          validationRules: [
            { field: 'email', type: 'email', required: true },
            { field: 'name', type: 'string', required: true, minLength: 2 }
          ]
        }
      },
      {
        id: 'condition',
        type: 'condition',
        name: 'Valid Submission?',
        position: { x: 500, y: 100 },
        parameters: {
          conditions: [{ field: '_valid', operator: 'equals', value: 'true' }]
        }
      },
      {
        id: 'transform',
        type: 'transform',
        name: 'Format for CRM',
        position: { x: 700, y: 50 },
        parameters: {
          fields: [
            { name: 'firstName', value: '{{name.split(" ")[0]}}' },
            { name: 'lastName', value: '{{name.split(" ").slice(1).join(" ")}}' },
            { name: 'email', value: '{{email}}' },
            { name: 'source', value: 'Website Form' },
            { name: 'status', value: 'New' }
          ]
        }
      },
      {
        id: 'crm-api',
        type: 'httpRequest',
        name: 'Create CRM Lead',
        position: { x: 900, y: 50 },
        parameters: {
          url: 'https://api.crm.com/leads',
          method: 'POST',
          headers: { 'Authorization': 'Bearer {{crmToken}}' },
          body: '{{$json}}'
        }
      },
      {
        id: 'email-response',
        type: 'email',
        name: 'Send Thank You',
        position: { x: 1100, y: 50 },
        parameters: {
          to: '{{email}}',
          subject: 'Thank you for your inquiry',
          body: 'Hi {{firstName}},\n\nThank you for contacting us. We will get back to you soon!'
        }
      },
      {
        id: 'error-response',
        type: 'httpRequest',
        name: 'Return Error',
        position: { x: 700, y: 150 },
        parameters: {
          url: 'http://localhost:3000/response',
          method: 'POST',
          body: { error: 'Invalid form data', details: '{{_validationErrors}}' }
        }
      }
    ],
    connections: [
      { from: 'webhook', to: 'validation' },
      { from: 'validation', to: 'condition' },
      { from: 'condition', to: 'transform', output: 0 },
      { from: 'condition', to: 'error-response', output: 1 },
      { from: 'transform', to: 'crm-api' },
      { from: 'crm-api', to: 'email-response' }
    ],
    tags: ['form', 'crm', 'lead-generation', 'integration'],
    estimatedExecutionTime: '1-2 minutes',
    complexity: 'medium'
  },

  {
    id: 'api-data-aggregation',
    name: 'Multi-API Data Aggregation',
    description: 'Fetch data from multiple APIs and create consolidated report',
    category: 'data-aggregation',
    difficulty: 'advanced',
    useCase: ['reporting', 'data-consolidation', 'analytics'],
    nodes: [
      {
        id: 'schedule',
        type: 'schedule',
        name: 'Weekly Report',
        position: { x: 100, y: 200 },
        parameters: {
          scheduleMode: 'cron',
          cronExpression: '0 9 * * 1'
        }
      },
      {
        id: 'split',
        type: 'split',
        name: 'Split APIs',
        position: { x: 300, y: 200 },
        parameters: {
          splitMode: 'items',
          arrayField: 'apiEndpoints'
        }
      },
      {
        id: 'api-sales',
        type: 'httpRequest',
        name: 'Fetch Sales Data',
        position: { x: 500, y: 100 },
        parameters: {
          url: 'https://api.sales.com/data',
          method: 'GET'
        }
      },
      {
        id: 'api-marketing',
        type: 'httpRequest',
        name: 'Fetch Marketing Data',
        position: { x: 500, y: 200 },
        parameters: {
          url: 'https://api.marketing.com/campaigns',
          method: 'GET'
        }
      },
      {
        id: 'api-support',
        type: 'httpRequest',
        name: 'Fetch Support Data',
        position: { x: 500, y: 300 },
        parameters: {
          url: 'https://api.support.com/tickets',
          method: 'GET'
        }
      },
      {
        id: 'merge',
        type: 'merge',
        name: 'Merge All Data',
        position: { x: 700, y: 200 },
        parameters: {
          mergeMode: 'combine',
          includeMetadata: true
        }
      },
      {
        id: 'analytics',
        type: 'analytics',
        name: 'Generate Analytics',
        position: { x: 900, y: 200 },
        parameters: {
          metrics: ['sum', 'average', 'count'],
          groupBy: ['department', 'date'],
          calculations: [
            { name: 'totalRevenue', field: 'revenue', operation: 'sum' },
            { name: 'avgTicketTime', field: 'resolutionTime', operation: 'average' }
          ]
        }
      },
      {
        id: 'report',
        type: 'pdfGenerator',
        name: 'Generate PDF Report',
        position: { x: 1100, y: 200 },
        parameters: {
          template: 'weekly-report',
          title: 'Weekly Business Report',
          data: '{{$json}}'
        }
      },
      {
        id: 'email-report',
        type: 'email',
        name: 'Email Report',
        position: { x: 1300, y: 200 },
        parameters: {
          to: 'executives@company.com',
          subject: 'Weekly Business Report - {{date}}',
          attachments: [{ name: 'report.pdf', data: '{{pdf}}' }]
        }
      }
    ],
    connections: [
      { from: 'schedule', to: 'split' },
      { from: 'split', to: 'api-sales' },
      { from: 'split', to: 'api-marketing' },
      { from: 'split', to: 'api-support' },
      { from: 'api-sales', to: 'merge' },
      { from: 'api-marketing', to: 'merge' },
      { from: 'api-support', to: 'merge' },
      { from: 'merge', to: 'analytics' },
      { from: 'analytics', to: 'report' },
      { from: 'report', to: 'email-report' }
    ],
    tags: ['aggregation', 'analytics', 'reporting', 'multi-api'],
    estimatedExecutionTime: '3-10 minutes',
    complexity: 'high'
  },

  {
    id: 'user-onboarding-automation',
    name: 'User Onboarding Automation',
    description: 'Automated user onboarding with email sequences and account setup',
    category: 'automation',
    difficulty: 'intermediate',
    useCase: ['user-onboarding', 'email-automation', 'account-management'],
    nodes: [
      {
        id: 'webhook',
        type: 'webhook',
        name: 'User Registration',
        position: { x: 100, y: 200 }
      },
      {
        id: 'database',
        type: 'database',
        name: 'Create User Record',
        position: { x: 300, y: 200 }
      },
      {
        id: 'welcome-email',
        type: 'email',
        name: 'Send Welcome Email',
        position: { x: 500, y: 100 }
      },
      {
        id: 'setup-resources',
        type: 'httpRequest',
        name: 'Setup User Resources',
        position: { x: 500, y: 200 }
      },
      {
        id: 'slack-notification',
        type: 'slack',
        name: 'Notify Team',
        position: { x: 500, y: 300 }
      },
      {
        id: 'delay-1',
        type: 'delay',
        name: 'Wait 1 Day',
        position: { x: 700, y: 100 }
      },
      {
        id: 'follow-up-1',
        type: 'email',
        name: 'Day 1 Follow-up',
        position: { x: 900, y: 100 }
      },
      {
        id: 'delay-2',
        type: 'delay',
        name: 'Wait 3 Days',
        position: { x: 700, y: 300 }
      },
      {
        id: 'tutorial-email',
        type: 'email',
        name: 'Tutorial Email',
        position: { x: 900, y: 300 }
      }
    ],
    connections: [
      { from: 'webhook', to: 'database' },
      { from: 'database', to: 'welcome-email' },
      { from: 'database', to: 'setup-resources' },
      { from: 'database', to: 'slack-notification' },
      { from: 'welcome-email', to: 'delay-1' },
      { from: 'delay-1', to: 'follow-up-1' },
      { from: 'slack-notification', to: 'delay-2' },
      { from: 'delay-2', to: 'tutorial-email' }
    ],
    tags: ['onboarding', 'automation', 'email-sequence', 'user-management'],
    estimatedExecutionTime: 'Runs over multiple days',
    complexity: 'medium'
  }
];

export const REAL_WORLD_SCENARIOS = [
  {
    id: 'ecommerce-order-processing',
    name: 'E-commerce Order Processing',
    description: 'Complete order processing workflow from payment to fulfillment',
    industry: 'E-commerce',
    complexity: 'high',
    estimatedSavings: '40 hours/week',
    workflow: 'form-to-crm-integration' // Reference to workflow template
  },
  {
    id: 'hr-recruitment-pipeline',
    name: 'HR Recruitment Pipeline',
    description: 'Automated candidate screening and interview scheduling',
    industry: 'Human Resources',
    complexity: 'medium',
    estimatedSavings: '20 hours/week',
    workflow: 'user-onboarding-automation'
  },
  {
    id: 'financial-reporting',
    name: 'Financial Reporting & Analytics',
    description: 'Automated financial data collection and report generation',
    industry: 'Finance',
    complexity: 'high',
    estimatedSavings: '60 hours/month',
    workflow: 'api-data-aggregation'
  },
  {
    id: 'customer-support-automation',
    name: 'Customer Support Automation',
    description: 'Ticket routing and automated responses based on priority',
    industry: 'Customer Service',
    complexity: 'medium',
    estimatedSavings: '30 hours/week',
    workflow: 'webhook-to-slack-alert'
  },
  {
    id: 'content-publishing-pipeline',
    name: 'Content Publishing Pipeline',
    description: 'Automated content review, approval, and multi-platform publishing',
    industry: 'Marketing',
    complexity: 'high',
    estimatedSavings: '25 hours/week',
    workflow: 'data-processing-pipeline'
  }
];