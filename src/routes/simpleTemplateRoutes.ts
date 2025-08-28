import { Router, Request, Response } from 'express';
import { AuthMiddleware } from '../middleware/auth';
import { createLogger } from '../utils/logger';
import { Workflow as WorkflowModel } from '../models';

const router = Router();
const logger = createLogger('TemplateRoutes');

// Sample template data
const sampleNodeTemplates = [
  // TRIGGER NODES
  {
    templateId: 'manual-basic',
    name: 'Manual Trigger - Basic',
    description: 'Simple manual trigger to start workflow execution',
    category: 'trigger',
    subcategory: 'manual',
    difficulty: 'beginner',
    useCase: ['testing', 'development', 'on-demand'],
    nodeType: 'manual',
    configuration: { name: 'Manual Trigger' },
    sampleData: {},
    expectedOutput: { json: {} },
    tags: ['trigger', 'manual', 'basic'],
    icon: '▶️',
    color: '#28a745'
  },
  {
    templateId: 'webhook-api',
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
    templateId: 'schedule-daily',
    name: 'Schedule - Daily Reports',
    description: 'Trigger workflows on a daily schedule for automated reports',
    category: 'trigger',
    subcategory: 'schedule',
    difficulty: 'beginner',
    useCase: ['automation', 'reporting', 'maintenance'],
    nodeType: 'schedule',
    configuration: {
      name: 'Daily Report Schedule',
      interval: 'daily',
      time: '09:00',
      timezone: 'UTC'
    },
    sampleData: {},
    expectedOutput: { json: { timestamp: '2024-01-01T09:00:00Z', trigger: 'schedule' } },
    tags: ['schedule', 'daily', 'automation', 'reports'],
    icon: '⏰',
    color: '#17a2b8'
  },

  // HTTP/API NODES
  {
    templateId: 'http-api-call',
    name: 'HTTP Request - REST API',
    description: 'Make REST API calls to external services with authentication',
    category: 'integration',
    subcategory: 'http',
    difficulty: 'intermediate',
    useCase: ['api-integration', 'data-fetching', 'third-party-services'],
    nodeType: 'http',
    configuration: {
      name: 'REST API Call',
      method: 'GET',
      url: 'https://api.example.com/users',
      authentication: 'headerAuth',
      headerParameters: {
        'Authorization': 'Bearer {{token}}',
        'Content-Type': 'application/json'
      },
      sendHeaders: true
    },
    sampleData: { token: 'abc123' },
    expectedOutput: { json: { users: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }] } },
    tags: ['http', 'api', 'rest', 'external'],
    icon: '🌐',
    color: '#007bff'
  },
  {
    templateId: 'http-post-data',
    name: 'HTTP Request - Post Data',
    description: 'Send data to external APIs via POST requests',
    category: 'integration',
    subcategory: 'http',
    difficulty: 'intermediate',
    useCase: ['data-submission', 'webhook-forwarding', 'api-integration'],
    nodeType: 'http',
    configuration: {
      name: 'Post Data',
      method: 'POST',
      url: 'https://api.service.com/data',
      sendBody: true,
      bodyContentType: 'json',
      sendHeaders: true,
      headerParameters: {
        'Content-Type': 'application/json'
      }
    },
    sampleData: { userId: 123, action: 'create', data: { name: 'John Doe' } },
    expectedOutput: { json: { success: true, id: 456 } },
    tags: ['http', 'post', 'api', 'data-submission'],
    icon: '📤',
    color: '#28a745'
  },

  // EMAIL/COMMUNICATION NODES
  {
    templateId: 'email-notification',
    name: 'Email - Notification',
    description: 'Send email notifications with dynamic content',
    category: 'communication',
    subcategory: 'email',
    difficulty: 'beginner',
    useCase: ['notifications', 'alerts', 'communication'],
    nodeType: 'email',
    configuration: {
      name: 'Email Notification',
      to: '{{recipient}}',
      subject: 'Workflow Notification: {{subject}}',
      body: 'Hello {{name}},\\n\\nYour workflow has completed successfully.\\n\\nBest regards',
      bodyFormat: 'text'
    },
    sampleData: { recipient: 'user@example.com', subject: 'Daily Report', name: 'John' },
    expectedOutput: { json: { sent: true, messageId: 'email-123', recipient: 'user@example.com' } },
    tags: ['email', 'notification', 'communication'],
    icon: '📧',
    color: '#dc3545'
  },
  {
    templateId: 'slack-message',
    name: 'Slack - Team Notification',
    description: 'Send messages to Slack channels for team communication',
    category: 'communication',
    subcategory: 'slack',
    difficulty: 'intermediate',
    useCase: ['team-communication', 'alerts', 'notifications'],
    nodeType: 'slack',
    configuration: {
      name: 'Slack Alert',
      operation: 'sendMessage',
      channel: '#general',
      message: '🚨 Alert: {{alertType}}\\nDetails: {{message}}\\nTime: {{timestamp}}'
    },
    sampleData: { alertType: 'System Error', message: 'Database connection failed', timestamp: '2024-01-01T10:00:00Z' },
    expectedOutput: { json: { sent: true, channel: '#general', ts: '1640995200.000100' } },
    tags: ['slack', 'communication', 'alerts', 'team'],
    icon: '💬',
    color: '#4a154b'
  },

  // DATA TRANSFORMATION NODES
  {
    templateId: 'transform-basic',
    name: 'Transform - Basic Field Mapping',
    description: 'Map and transform basic fields with expressions',
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
    templateId: 'filter-condition',
    name: 'Filter - Conditional Processing',
    description: 'Filter data based on conditions and criteria',
    category: 'transform',
    subcategory: 'filtering',
    difficulty: 'intermediate',
    useCase: ['data-filtering', 'conditional-logic', 'quality-control'],
    nodeType: 'filter',
    configuration: {
      name: 'Data Filter',
      conditions: [
        { field: 'age', operator: 'gte', value: 18 },
        { field: 'status', operator: 'equals', value: 'active' }
      ],
      combineOperation: 'and'
    },
    sampleData: [
      { name: 'John', age: 25, status: 'active' },
      { name: 'Jane', age: 16, status: 'inactive' }
    ],
    expectedOutput: { json: [{ name: 'John', age: 25, status: 'active' }] },
    tags: ['filter', 'conditions', 'data-quality', 'logic'],
    icon: '🔍',
    color: '#fd7e14'
  },

  // DATABASE NODES
  {
    templateId: 'database-query',
    name: 'Database - Query Data',
    description: 'Execute SQL queries to retrieve data from databases',
    category: 'database',
    subcategory: 'query',
    difficulty: 'intermediate',
    useCase: ['data-retrieval', 'reporting', 'analytics'],
    nodeType: 'database',
    configuration: {
      name: 'Database Query',
      operation: 'select',
      table: 'users',
      query: 'SELECT * FROM users WHERE created_at >= ?',
      parameters: ['{{startDate}}']
    },
    sampleData: { startDate: '2024-01-01' },
    expectedOutput: { json: [{ id: 1, name: 'John', email: 'john@example.com' }] },
    tags: ['database', 'sql', 'query', 'data-retrieval'],
    icon: '🗃️',
    color: '#6f42c1'
  },
  {
    templateId: 'database-insert',
    name: 'Database - Insert Records',
    description: 'Insert new records into database tables',
    category: 'database',
    subcategory: 'insert',
    difficulty: 'beginner',
    useCase: ['data-storage', 'record-creation', 'logging'],
    nodeType: 'database',
    configuration: {
      name: 'Insert Record',
      operation: 'insert',
      table: 'activity_log',
      fields: {
        user_id: '{{userId}}',
        action: '{{action}}',
        details: '{{details}}',
        timestamp: '{{$now}}'
      }
    },
    sampleData: { userId: 123, action: 'login', details: 'User logged in successfully' },
    expectedOutput: { json: { insertId: 456, affectedRows: 1 } },
    tags: ['database', 'insert', 'logging', 'storage'],
    icon: '💾',
    color: '#20c997'
  },

  // FILE PROCESSING NODES
  {
    templateId: 'file-csv-read',
    name: 'File - CSV Reader',
    description: 'Read and parse CSV files for data processing',
    category: 'files',
    subcategory: 'csv',
    difficulty: 'intermediate',
    useCase: ['data-import', 'file-processing', 'bulk-operations'],
    nodeType: 'csvRead',
    configuration: {
      name: 'CSV Reader',
      filePath: '{{filePath}}',
      delimiter: ',',
      hasHeaders: true,
      encoding: 'utf8'
    },
    sampleData: { filePath: '/uploads/users.csv' },
    expectedOutput: { json: [{ name: 'John', email: 'john@example.com', age: 25 }] },
    tags: ['file', 'csv', 'import', 'data-processing'],
    icon: '📄',
    color: '#17a2b8'
  },

  // ANALYTICS/AI NODES
  {
    templateId: 'ai-text-analysis',
    name: 'AI - Text Sentiment Analysis',
    description: 'Analyze text sentiment using AI/ML services',
    category: 'ai',
    subcategory: 'text-analysis',
    difficulty: 'advanced',
    useCase: ['sentiment-analysis', 'content-moderation', 'customer-feedback'],
    nodeType: 'aiTextAnalysis',
    configuration: {
      name: 'Sentiment Analysis',
      operation: 'sentiment',
      text: '{{inputText}}',
      provider: 'openai'
    },
    sampleData: { inputText: 'This product is amazing! I love it.' },
    expectedOutput: { json: { sentiment: 'positive', confidence: 0.95, score: 0.8 } },
    tags: ['ai', 'sentiment', 'text-analysis', 'ml'],
    icon: '🤖',
    color: '#e83e8c'
  }
];

const sampleWorkflowTemplates = [
  {
    templateId: 'api-data-sync',
    name: 'API Data Synchronization',
    description: 'Fetch data from external API, transform it, and store in database',
    category: 'integration',
    difficulty: 'intermediate',
    useCase: ['data-sync', 'api-integration', 'automation'],
    nodes: [
      {
        id: 'schedule-trigger',
        type: 'schedule',
        name: 'Daily Sync',
        position: { x: 100, y: 200 },
        configuration: {
          interval: 'daily',
          time: '02:00'
        }
      },
      {
        id: 'api-fetch',
        type: 'http',
        name: 'Fetch User Data',
        position: { x: 300, y: 200 },
        configuration: {
          method: 'GET',
          url: 'https://api.example.com/users',
          authentication: 'headerAuth'
        }
      },
      {
        id: 'transform-data',
        type: 'transform',
        name: 'Clean Data',
        position: { x: 500, y: 200 },
        configuration: {
          fields: [
            { name: 'user_id', value: '{{id}}' },
            { name: 'full_name', value: '{{firstName}} {{lastName}}' },
            { name: 'email_address', value: '{{email}}' },
            { name: 'sync_date', value: '{{$now}}' }
          ]
        }
      },
      {
        id: 'save-db',
        type: 'database',
        name: 'Save to DB',
        position: { x: 700, y: 200 },
        configuration: {
          operation: 'insert',
          table: 'users',
          upsert: true
        }
      },
      {
        id: 'notify-slack',
        type: 'slack',
        name: 'Success Alert',
        position: { x: 900, y: 200 },
        configuration: {
          channel: '#data-sync',
          message: '✅ Daily user sync completed: {{$json.length}} records processed'
        }
      }
    ],
    connections: [
      { from: 'schedule-trigger', to: 'api-fetch' },
      { from: 'api-fetch', to: 'transform-data' },
      { from: 'transform-data', to: 'save-db' },
      { from: 'save-db', to: 'notify-slack' }
    ],
    tags: ['api', 'sync', 'automation', 'database'],
    estimatedExecutionTime: '1-3 minutes',
    complexity: 'medium'
  },
  {
    templateId: 'webhook-to-slack-alert',
    name: 'Webhook Alert System',
    description: 'Receive webhook alerts and send formatted notifications to team',
    category: 'alerting',
    difficulty: 'beginner',
    useCase: ['monitoring', 'alerts', 'team-communication'],
    nodes: [
      {
        id: 'webhook-trigger',
        type: 'webhook',
        name: 'Alert Webhook',
        position: { x: 100, y: 200 },
        configuration: {
          path: 'alerts/webhook',
          method: 'POST'
        }
      },
      {
        id: 'filter-critical',
        type: 'filter',
        name: 'Filter Critical',
        position: { x: 300, y: 200 },
        configuration: {
          conditions: [
            { field: 'severity', operator: 'equals', value: 'critical' }
          ]
        }
      },
      {
        id: 'format-message',
        type: 'transform',
        name: 'Format Alert',
        position: { x: 500, y: 200 },
        configuration: {
          fields: [
            { name: 'alertMessage', value: '🚨 CRITICAL ALERT\\n*Service:* {{service}}\\n*Error:* {{message}}\\n*Time:* {{timestamp}}\\n*Severity:* {{severity}}' }
          ]
        }
      },
      {
        id: 'notify-slack',
        type: 'slack',
        name: 'Alert Team',
        position: { x: 700, y: 200 },
        configuration: {
          channel: '#alerts',
          message: '{{alertMessage}}'
        }
      },
      {
        id: 'log-alert',
        type: 'database',
        name: 'Log Alert',
        position: { x: 500, y: 350 },
        configuration: {
          operation: 'insert',
          table: 'alert_log',
          fields: {
            service: '{{service}}',
            message: '{{message}}',
            severity: '{{severity}}',
            timestamp: '{{$now}}'
          }
        }
      }
    ],
    connections: [
      { from: 'webhook-trigger', to: 'filter-critical' },
      { from: 'filter-critical', to: 'format-message' },
      { from: 'format-message', to: 'notify-slack' },
      { from: 'webhook-trigger', to: 'log-alert' }
    ],
    tags: ['webhook', 'alerts', 'monitoring', 'slack'],
    estimatedExecutionTime: '< 10 seconds',
    complexity: 'low'
  },
  {
    templateId: 'user-onboarding-flow',
    name: 'User Onboarding Automation',
    description: 'Automated user onboarding with welcome email and account setup',
    category: 'automation',
    difficulty: 'intermediate',
    useCase: ['user-management', 'onboarding', 'email-automation'],
    nodes: [
      {
        id: 'user-webhook',
        type: 'webhook',
        name: 'New User Registered',
        position: { x: 100, y: 200 },
        configuration: {
          path: 'users/registered',
          method: 'POST'
        }
      },
      {
        id: 'validate-user',
        type: 'filter',
        name: 'Validate User Data',
        position: { x: 300, y: 200 },
        configuration: {
          conditions: [
            { field: 'email', operator: 'contains', value: '@' },
            { field: 'name', operator: 'isNotEmpty' }
          ]
        }
      },
      {
        id: 'create-profile',
        type: 'database',
        name: 'Create Profile',
        position: { x: 500, y: 150 },
        configuration: {
          operation: 'insert',
          table: 'user_profiles',
          fields: {
            user_id: '{{userId}}',
            display_name: '{{name}}',
            email: '{{email}}',
            created_at: '{{$now}}',
            status: 'active'
          }
        }
      },
      {
        id: 'welcome-email',
        type: 'email',
        name: 'Welcome Email',
        position: { x: 500, y: 250 },
        configuration: {
          to: '{{email}}',
          subject: 'Welcome to Our Platform, {{name}}!',
          body: 'Hi {{name}},\\n\\nWelcome to our platform! Your account has been successfully created.\\n\\nGet started: https://app.example.com/onboarding\\n\\nBest regards,\\nThe Team'
        }
      },
      {
        id: 'notify-admin',
        type: 'slack',
        name: 'Notify Admin',
        position: { x: 700, y: 200 },
        configuration: {
          channel: '#new-users',
          message: '👋 New user registered: *{{name}}* ({{email}})'
        }
      }
    ],
    connections: [
      { from: 'user-webhook', to: 'validate-user' },
      { from: 'validate-user', to: 'create-profile' },
      { from: 'validate-user', to: 'welcome-email' },
      { from: 'create-profile', to: 'notify-admin' }
    ],
    tags: ['onboarding', 'email', 'automation', 'users'],
    estimatedExecutionTime: '30 seconds',
    complexity: 'medium'
  },
  {
    templateId: 'csv-data-processing',
    name: 'CSV Data Import Pipeline',
    description: 'Process CSV uploads with validation and batch database operations',
    category: 'data-processing',
    difficulty: 'intermediate',
    useCase: ['data-import', 'batch-processing', 'validation'],
    nodes: [
      {
        id: 'manual-start',
        type: 'manual',
        name: 'Start Import',
        position: { x: 100, y: 200 }
      },
      {
        id: 'read-csv',
        type: 'csvRead',
        name: 'Read CSV File',
        position: { x: 300, y: 200 },
        configuration: {
          filePath: '{{filePath}}',
          delimiter: ',',
          hasHeaders: true
        }
      },
      {
        id: 'validate-rows',
        type: 'filter',
        name: 'Validate Rows',
        position: { x: 500, y: 200 },
        configuration: {
          conditions: [
            { field: 'email', operator: 'contains', value: '@' },
            { field: 'name', operator: 'isNotEmpty' }
          ]
        }
      },
      {
        id: 'transform-data',
        type: 'transform',
        name: 'Standardize Data',
        position: { x: 700, y: 200 },
        configuration: {
          fields: [
            { name: 'full_name', value: '{{name.trim()}}' },
            { name: 'email_address', value: '{{email.toLowerCase()}}' },
            { name: 'import_date', value: '{{$now}}' },
            { name: 'source', value: 'csv_import' }
          ]
        }
      },
      {
        id: 'batch-insert',
        type: 'database',
        name: 'Bulk Insert',
        position: { x: 900, y: 200 },
        configuration: {
          operation: 'insertMany',
          table: 'contacts',
          batchSize: 100
        }
      },
      {
        id: 'completion-email',
        type: 'email',
        name: 'Import Complete',
        position: { x: 700, y: 350 },
        configuration: {
          to: '{{adminEmail}}',
          subject: 'CSV Import Completed',
          body: 'Import completed successfully:\\n\\nTotal records: {{$json.length}}\\nValid records: {{validCount}}\\nSkipped records: {{skipCount}}'
        }
      }
    ],
    connections: [
      { from: 'manual-start', to: 'read-csv' },
      { from: 'read-csv', to: 'validate-rows' },
      { from: 'validate-rows', to: 'transform-data' },
      { from: 'transform-data', to: 'batch-insert' },
      { from: 'batch-insert', to: 'completion-email' }
    ],
    tags: ['csv', 'import', 'validation', 'bulk-processing'],
    estimatedExecutionTime: '2-10 minutes',
    complexity: 'medium'
  }
];

const sampleScenarioTemplates = [
  {
    templateId: 'ecommerce-order-processing',
    name: 'E-commerce Order Processing Pipeline',
    description: 'Complete automated order processing from payment verification to inventory management',
    industry: 'E-commerce',
    category: 'Order Management',
    difficulty: 'advanced',
    estimatedTime: '2-5 minutes per order',
    estimatedSavings: '40+ hours per week',
    useCase: ['order-processing', 'inventory-management', 'customer-service'],
    prerequisites: ['Payment gateway webhook', 'Inventory database', 'Email service'],
    workflow: {
      nodes: sampleWorkflowTemplates[0].nodes,
      connections: sampleWorkflowTemplates[0].connections
    },
    documentation: {
      overview: 'Complete e-commerce order processing workflow',
      setup: ['Configure webhook endpoint', 'Set up payment gateway'],
      configuration: ['Update webhook path', 'Configure credentials'],
      troubleshooting: ['Check webhook format', 'Verify API credentials']
    },
    tags: ['ecommerce', 'orders', 'payments', 'inventory']
  }
];

// Apply optional authentication
router.use(AuthMiddleware.optionalAuth);

// NODE TEMPLATES
router.get('/nodes', async (req: Request, res: Response) => {
  try {
    const { category, difficulty, search } = req.query;
    let templates = [...sampleNodeTemplates];
    
    if (category) {
      templates = templates.filter(t => t.category === category);
    }
    
    if (difficulty) {
      templates = templates.filter(t => t.difficulty === difficulty);
    }
    
    if (search) {
      const searchStr = (search as string).toLowerCase();
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(searchStr) ||
        t.description.toLowerCase().includes(searchStr) ||
        t.tags.some(tag => tag.includes(searchStr))
      );
    }
    
    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error: any) {
    logger.error('Error fetching node templates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/nodes/:templateId', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const template = sampleNodeTemplates.find(t => t.templateId === templateId);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Node template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error: any) {
    logger.error('Error fetching node template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// WORKFLOW TEMPLATES
router.get('/workflows', async (req: Request, res: Response) => {
  try {
    const { category, difficulty, search } = req.query;
    let templates = [...sampleWorkflowTemplates];
    
    if (category) {
      templates = templates.filter(t => t.category === category);
    }
    
    if (difficulty) {
      templates = templates.filter(t => t.difficulty === difficulty);
    }
    
    if (search) {
      const searchStr = (search as string).toLowerCase();
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(searchStr) ||
        t.description.toLowerCase().includes(searchStr)
      );
    }
    
    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error: any) {
    logger.error('Error fetching workflow templates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/workflows/:templateId', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const template = sampleWorkflowTemplates.find(t => t.templateId === templateId);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Workflow template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error: any) {
    logger.error('Error fetching workflow template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// SCENARIO TEMPLATES
router.get('/scenarios', async (req: Request, res: Response) => {
  try {
    const { industry, category, difficulty, search } = req.query;
    let templates = [...sampleScenarioTemplates];
    
    if (industry) {
      templates = templates.filter(t => t.industry === industry);
    }
    
    if (category) {
      templates = templates.filter(t => t.category === category);
    }
    
    if (difficulty) {
      templates = templates.filter(t => t.difficulty === difficulty);
    }
    
    if (search) {
      const searchStr = (search as string).toLowerCase();
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(searchStr) ||
        t.description.toLowerCase().includes(searchStr) ||
        t.industry.toLowerCase().includes(searchStr)
      );
    }
    
    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error: any) {
    logger.error('Error fetching scenario templates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// CATEGORIES
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = [
      {
        name: 'trigger',
        displayName: 'Triggers',
        description: 'Nodes that start workflow execution',
        icon: '🚀',
        color: '#28a745',
        sortOrder: 1
      },
      {
        name: 'transform',
        displayName: 'Transform',
        description: 'Data transformation and manipulation nodes',
        icon: '🔄',
        color: '#007bff',
        sortOrder: 2
      },
      {
        name: 'integration',
        displayName: 'Integrations',
        description: 'Third-party service integrations',
        icon: '🔌',
        color: '#6f42c1',
        sortOrder: 3
      },
      {
        name: 'data-processing',
        displayName: 'Data Processing',
        description: 'Data processing and analytics workflows',
        icon: '📊',
        color: '#fd7e14',
        sortOrder: 4
      },
      {
        name: 'alerting',
        displayName: 'Alerting',
        description: 'Monitoring and alerting workflows',
        icon: '🚨',
        color: '#dc3545',
        sortOrder: 5
      }
    ];
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error: any) {
    logger.error('Error fetching template categories:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// SEARCH ALL TEMPLATES
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const searchStr = query.toLowerCase();
    
    const nodes = sampleNodeTemplates.filter(t => 
      t.name.toLowerCase().includes(searchStr) ||
      t.description.toLowerCase().includes(searchStr) ||
      t.tags.some(tag => tag.includes(searchStr))
    );
    
    const workflows = sampleWorkflowTemplates.filter(t => 
      t.name.toLowerCase().includes(searchStr) ||
      t.description.toLowerCase().includes(searchStr) ||
      t.tags.some(tag => tag.includes(searchStr))
    );
    
    const scenarios = sampleScenarioTemplates.filter(t => 
      t.name.toLowerCase().includes(searchStr) ||
      t.description.toLowerCase().includes(searchStr) ||
      t.industry.toLowerCase().includes(searchStr)
    );
    
    const results = {
      nodes,
      workflows,
      scenarios
    };
    
    res.json({
      success: true,
      data: results,
      total: results.nodes.length + results.workflows.length + results.scenarios.length
    });
  } catch (error: any) {
    logger.error('Error searching templates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// STATISTICS
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = {
      totalNodes: sampleNodeTemplates.length,
      totalWorkflows: sampleWorkflowTemplates.length,
      totalScenarios: sampleScenarioTemplates.length,
      byCategory: {
        trigger: 2,
        transform: 1,
        integration: 2,
        'data-processing': 1,
        alerting: 1
      },
      byDifficulty: {
        beginner: 3,
        intermediate: 4,
        advanced: 1
      },
      byIndustry: {
        'E-commerce': 1
      },
      popular: [
        { ...sampleNodeTemplates[0], type: 'node' },
        { ...sampleWorkflowTemplates[0], type: 'workflow' }
      ]
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    logger.error('Error fetching template statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// RECOMMENDATIONS
router.get('/recommendations', async (req: Request, res: Response) => {
  try {
    const recommendations = {
      nodes: sampleNodeTemplates.slice(0, 3),
      workflows: sampleWorkflowTemplates.slice(0, 2),
      scenarios: sampleScenarioTemplates.slice(0, 1)
    };
    
    res.json({
      success: true,
      data: recommendations
    });
  } catch (error: any) {
    logger.error('Error fetching template recommendations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// FORK/USE TEMPLATE (Universal endpoint for any template)
router.post('/:templateId/fork', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const { customizations } = req.body;
    const userId = (req as any).user?.id || 'anonymous';

    // Try to find template in any category
    let template = sampleNodeTemplates.find(t => t.templateId === templateId);
    let templateType = 'node';

    if (!template) {
      template = sampleWorkflowTemplates.find(t => t.templateId === templateId);
      templateType = 'workflow';
    }

    if (!template) {
      template = sampleScenarioTemplates.find(t => t.templateId === templateId);
      templateType = 'scenario';
    }

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Create workflow based on template type
    let workflow;
    
    if (templateType === 'node') {
      // Create a simple workflow with just this node
      workflow = {
        id: `workflow-${Date.now()}`,
        name: customizations?.name || `${template.name} Workflow`,
        description: customizations?.description || `Workflow using ${template.name}`,
        nodes: [
          {
            id: 'node-1',
            type: template.nodeType,
            name: template.name,
            position: { x: 300, y: 200 },
            configuration: template.configuration
          }
        ],
        connections: [],
        createdBy: userId,
        fromTemplate: templateId,
        templateType: 'node',
        tags: [...(template.tags || []), ...(customizations?.tags || [])],
        createdAt: new Date().toISOString()
      };
    } else if (templateType === 'workflow') {
      workflow = {
        id: `workflow-${Date.now()}`,
        name: customizations?.name || `${template.name} - Copy`,
        description: customizations?.description || template.description,
        nodes: template.nodes,
        connections: template.connections,
        createdBy: userId,
        fromTemplate: templateId,
        templateType: 'workflow',
        tags: [...(template.tags || []), ...(customizations?.tags || [])],
        createdAt: new Date().toISOString()
      };
    } else {
      // Scenario template
      workflow = {
        id: `workflow-${Date.now()}`,
        name: customizations?.name || template.name,
        description: customizations?.description || template.description,
        nodes: template.workflow.nodes,
        connections: template.workflow.connections,
        createdBy: userId,
        fromTemplate: templateId,
        templateType: 'scenario',
        industry: template.industry,
        estimatedSavings: template.estimatedSavings,
        tags: [...(template.tags || []), ...(customizations?.tags || [])],
        createdAt: new Date().toISOString()
      };
    }

    // Create the workflow in the database
    // For anonymous users, we'll use userId = 1 (default system user)
    const finalUserId = userId === 'anonymous' ? 1 : parseInt(userId) || 1;
    const workflowData = {
      name: workflow.name,
      description: workflow.description,
      nodes: workflow.nodes,
      connections: workflow.connections,
      tags: workflow.tags,
      userId: finalUserId,
      isActive: false, // Use isActive instead of active to match the model
      version: 1,
      fromTemplate: templateId,
      templateType,
      ...(workflow.industry && { industry: workflow.industry }),
      ...(workflow.estimatedSavings && { estimatedSavings: workflow.estimatedSavings })
    };

    const createdWorkflow = await WorkflowModel.create(workflowData);
    const workflowJson = createdWorkflow.toJSON();

    res.status(201).json({
      success: true,
      data: workflowJson,
      workflowId: workflowJson.id,
      message: `Workflow created successfully from ${templateType} template`
    });
  } catch (error: any) {
    logger.error('Error forking template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// CREATE CUSTOM TEMPLATE (Node or Workflow)
router.post('/custom', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || 'anonymous';
    const templateData = {
      ...req.body,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      isCustom: true
    };

    // Determine if this is a workflow template (has multiple nodes) or single node template
    if (templateData.nodes && templateData.nodes.length > 1) {
      // This is a workflow template
      const workflowTemplate = {
        templateId: templateData.templateId,
        name: templateData.name,
        description: templateData.description,
        category: templateData.category || 'integration',
        difficulty: templateData.difficulty || 'intermediate',
        useCase: templateData.useCase || [],
        nodes: templateData.nodes,
        connections: templateData.connections || [],
        tags: templateData.tags || [],
        estimatedExecutionTime: templateData.estimatedExecutionTime || '1-2 minutes',
        complexity: templateData.complexity || 'medium',
        isCustom: true,
        createdBy: userId,
        createdAt: templateData.createdAt
      };
      
      sampleWorkflowTemplates.push(workflowTemplate);
      
      res.status(201).json({
        success: true,
        data: workflowTemplate,
        message: 'Custom workflow template created successfully',
        type: 'workflow'
      });
    } else {
      // This is a single node template
      const nodeTemplate = {
        templateId: templateData.templateId,
        name: templateData.name,
        description: templateData.description,
        category: templateData.category || 'integration',
        subcategory: templateData.subcategory || 'custom',
        difficulty: templateData.difficulty || 'beginner',
        useCase: templateData.useCase || [],
        nodeType: templateData.nodes?.[0]?.type || 'custom',
        configuration: templateData.nodes?.[0]?.configuration || {},
        sampleData: templateData.sampleData || {},
        expectedOutput: { json: {} },
        tags: templateData.tags || [],
        icon: templateData.icon || '⚙️',
        color: templateData.color || '#6c757d',
        isCustom: true,
        createdBy: userId,
        createdAt: templateData.createdAt
      };
      
      sampleNodeTemplates.push(nodeTemplate);
      
      res.status(201).json({
        success: true,
        data: nodeTemplate,
        message: 'Custom node template created successfully',
        type: 'node'
      });
    }
  } catch (error: any) {
    logger.error('Error creating custom template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// CREATE WORKFLOW FROM TEMPLATE (Legacy endpoint)
router.post('/workflows/:templateId/create', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const { customizations } = req.body;
    const userId = (req as any).user?.id || 'anonymous';

    const template = sampleWorkflowTemplates.find(t => t.templateId === templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    const workflow = {
      id: `workflow-${Date.now()}`,
      name: customizations?.name || `${template.name} - Copy`,
      description: customizations?.description || template.description,
      nodes: template.nodes,
      connections: template.connections,
      createdBy: userId,
      fromTemplate: templateId,
      tags: [...(template.tags || []), ...(customizations?.tags || [])],
      createdAt: new Date().toISOString()
    };

    res.status(201).json({
      success: true,
      data: workflow,
      message: 'Workflow created successfully from template'
    });
  } catch (error: any) {
    logger.error('Error creating workflow from template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DEFAULT ROUTE
router.get('/', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      message: 'Template API is working',
      endpoints: {
        nodes: '/api/templates/nodes',
        workflows: '/api/templates/workflows',
        scenarios: '/api/templates/scenarios',
        categories: '/api/templates/categories',
        search: '/api/templates/search?q=query',
        stats: '/api/templates/stats',
        recommendations: '/api/templates/recommendations',
        fork: 'POST /api/templates/{templateId}/fork',
        createWorkflow: 'POST /api/templates/workflows/{templateId}/create'
      },
      data: {
        totalTemplates: sampleNodeTemplates.length + sampleWorkflowTemplates.length + sampleScenarioTemplates.length,
        categories: ['trigger', 'transform', 'integration', 'data-processing', 'alerting'],
        difficulties: ['beginner', 'intermediate', 'advanced']
      }
    });
  } catch (error: any) {
    logger.error('Error in template API root:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;