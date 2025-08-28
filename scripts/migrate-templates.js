const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs').promises;

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'workflow_automation',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  dialect: 'mysql',
  logging: console.log
};

// Initialize Sequelize
const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, dbConfig);

// Template Models
const NodeTemplate = sequelize.define('NodeTemplate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  templateId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  subcategory: {
    type: DataTypes.STRING
  },
  difficulty: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
    allowNull: false
  },
  useCase: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  nodeType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  configuration: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  sampleData: {
    type: DataTypes.JSONB
  },
  expectedOutput: {
    type: DataTypes.JSONB
  },
  tags: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  icon: {
    type: DataTypes.STRING
  },
  color: {
    type: DataTypes.STRING
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

const WorkflowTemplate = sequelize.define('WorkflowTemplate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  templateId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  difficulty: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
    allowNull: false
  },
  useCase: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  nodes: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  connections: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  tags: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  estimatedExecutionTime: {
    type: DataTypes.STRING
  },
  complexity: {
    type: DataTypes.STRING
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

const ScenarioTemplate = sequelize.define('ScenarioTemplate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  templateId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  industry: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  difficulty: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
    allowNull: false
  },
  estimatedTime: {
    type: DataTypes.STRING
  },
  estimatedSavings: {
    type: DataTypes.STRING
  },
  useCase: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  prerequisites: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  workflow: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  documentation: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  tags: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Template categories for organization
const TemplateCategory = sequelize.define('TemplateCategory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  displayName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  icon: {
    type: DataTypes.STRING
  },
  color: {
    type: DataTypes.STRING
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

// Helper function to load template data
async function loadTemplateData() {
  try {
    // Load node templates
    const nodeTemplatesPath = path.join(__dirname, '../src/templates/node-templates.ts');
    const nodeTemplatesContent = await fs.readFile(nodeTemplatesPath, 'utf8');
    
    // Load scenario templates
    const scenarioTemplatesPath = path.join(__dirname, '../src/templates/scenario-templates.ts');
    const scenarioTemplatesContent = await fs.readFile(scenarioTemplatesPath, 'utf8');

    // Extract template data using simple regex (in production, use proper TypeScript parser)
    const nodeTemplatesMatch = nodeTemplatesContent.match(/export const NODE_TEMPLATES.*?=\s*(\[[\s\S]*?\]);/);
    const workflowTemplatesMatch = nodeTemplatesContent.match(/export const WORKFLOW_TEMPLATES.*?=\s*(\[[\s\S]*?\]);/);
    const scenarioTemplatesMatch = scenarioTemplatesContent.match(/export const SCENARIO_TEMPLATES.*?=\s*(\[[\s\S]*?\]);/);

    if (!nodeTemplatesMatch || !workflowTemplatesMatch || !scenarioTemplatesMatch) {
      throw new Error('Could not parse template files');
    }

    // For development purposes, we'll create sample data
    // In production, you'd properly parse the TypeScript files
    return {
      nodeTemplates: getSampleNodeTemplates(),
      workflowTemplates: getSampleWorkflowTemplates(),
      scenarioTemplates: getSampleScenarioTemplates(),
      categories: getSampleCategories()
    };
  } catch (error) {
    console.error('Error loading template data:', error);
    throw error;
  }
}

function getSampleNodeTemplates() {
  return [
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
      templateId: 'transform-basic',
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
      templateId: 'http-api-call',
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
    {
      templateId: 'email-notification',
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
        body: 'Hello {{name}},\\n\\nYour workflow has completed successfully.\\n\\nBest regards',
        bodyFormat: 'text'
      },
      sampleData: { recipient: 'user@example.com', subject: 'Daily Report', name: 'John' },
      expectedOutput: { json: { sent: true, messageId: 'email-123', recipient: 'user@example.com' } },
      tags: ['email', 'notification', 'communication'],
      icon: '📧',
      color: '#dc3545'
    }
  ];
}

function getSampleWorkflowTemplates() {
  return [
    {
      templateId: 'data-processing-pipeline',
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
        }
      ],
      connections: [
        { from: 'trigger', to: 'file-upload' },
        { from: 'file-upload', to: 'validate' },
        { from: 'validate', to: 'condition' },
        { from: 'condition', to: 'database', output: 0 }
      ],
      tags: ['data-processing', 'csv', 'validation', 'pipeline'],
      estimatedExecutionTime: '2-5 minutes',
      complexity: 'medium'
    },
    {
      templateId: 'webhook-to-slack-alert',
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
              { name: 'alertMessage', value: '🚨 Alert: {{alert.title}}\\nSeverity: {{alert.severity}}\\nTime: {{alert.timestamp}}' }
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
    }
  ];
}

function getSampleScenarioTemplates() {
  return [
    {
      templateId: 'ecommerce-order-processing',
      name: 'E-commerce Order Processing Pipeline',
      description: 'Complete automated order processing from payment verification to inventory management and customer notifications',
      industry: 'E-commerce',
      category: 'Order Management',
      difficulty: 'advanced',
      estimatedTime: '2-5 minutes per order',
      estimatedSavings: '40+ hours per week',
      useCase: ['order-processing', 'inventory-management', 'customer-service', 'payment-verification'],
      prerequisites: ['Payment gateway webhook', 'Inventory database', 'Email service', 'Shipping API'],
      workflow: {
        nodes: [
          {
            id: 'order-webhook',
            type: 'webhook',
            name: 'Order Received',
            position: { x: 100, y: 200 }
          }
        ],
        connections: []
      },
      documentation: {
        overview: 'This workflow handles complete e-commerce order processing including payment verification, inventory management, shipping label creation, and customer notifications.',
        setup: [
          'Configure webhook endpoint in your e-commerce platform',
          'Set up Stripe API credentials',
          'Configure database connections for orders and inventory'
        ],
        configuration: [
          'Update webhook path to match your platform',
          'Configure payment gateway credentials',
          'Set up database table schemas'
        ],
        troubleshooting: [
          'Check webhook payload format matches expected structure',
          'Verify payment gateway API credentials',
          'Ensure database connectivity and permissions'
        ]
      },
      tags: ['ecommerce', 'orders', 'payments', 'inventory', 'shipping', 'notifications']
    }
  ];
}

function getSampleCategories() {
  return [
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
    },
    {
      name: 'automation',
      displayName: 'Automation',
      description: 'Business process automation workflows',
      icon: '⚙️',
      color: '#20c997',
      sortOrder: 6
    }
  ];
}

// Migration functions
async function migrateNodeTemplates(nodeTemplates) {
  console.log('Migrating node templates...');
  
  for (const template of nodeTemplates) {
    try {
      await NodeTemplate.upsert({
        templateId: template.templateId,
        name: template.name,
        description: template.description,
        category: template.category,
        subcategory: template.subcategory,
        difficulty: template.difficulty,
        useCase: template.useCase,
        nodeType: template.nodeType,
        configuration: template.configuration,
        sampleData: template.sampleData,
        expectedOutput: template.expectedOutput,
        tags: template.tags,
        icon: template.icon,
        color: template.color
      });
      
      console.log(`✓ Migrated node template: ${template.name}`);
    } catch (error) {
      console.error(`✗ Failed to migrate node template ${template.name}:`, error.message);
    }
  }
}

async function migrateWorkflowTemplates(workflowTemplates) {
  console.log('Migrating workflow templates...');
  
  for (const template of workflowTemplates) {
    try {
      await WorkflowTemplate.upsert({
        templateId: template.templateId,
        name: template.name,
        description: template.description,
        category: template.category,
        difficulty: template.difficulty,
        useCase: template.useCase,
        nodes: template.nodes,
        connections: template.connections,
        tags: template.tags,
        estimatedExecutionTime: template.estimatedExecutionTime,
        complexity: template.complexity
      });
      
      console.log(`✓ Migrated workflow template: ${template.name}`);
    } catch (error) {
      console.error(`✗ Failed to migrate workflow template ${template.name}:`, error.message);
    }
  }
}

async function migrateScenarioTemplates(scenarioTemplates) {
  console.log('Migrating scenario templates...');
  
  for (const template of scenarioTemplates) {
    try {
      await ScenarioTemplate.upsert({
        templateId: template.templateId,
        name: template.name,
        description: template.description,
        industry: template.industry,
        category: template.category,
        difficulty: template.difficulty,
        estimatedTime: template.estimatedTime,
        estimatedSavings: template.estimatedSavings,
        useCase: template.useCase,
        prerequisites: template.prerequisites,
        workflow: template.workflow,
        documentation: template.documentation,
        tags: template.tags
      });
      
      console.log(`✓ Migrated scenario template: ${template.name}`);
    } catch (error) {
      console.error(`✗ Failed to migrate scenario template ${template.name}:`, error.message);
    }
  }
}

async function migrateCategories(categories) {
  console.log('Migrating template categories...');
  
  for (const category of categories) {
    try {
      await TemplateCategory.upsert({
        name: category.name,
        displayName: category.displayName,
        description: category.description,
        icon: category.icon,
        color: category.color,
        sortOrder: category.sortOrder
      });
      
      console.log(`✓ Migrated category: ${category.displayName}`);
    } catch (error) {
      console.error(`✗ Failed to migrate category ${category.displayName}:`, error.message);
    }
  }
}

// Main migration function
async function runMigration() {
  try {
    console.log('🚀 Starting template migration...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✓ Database connection established');
    
    // Create tables
    await sequelize.sync({ alter: true });
    console.log('✓ Database tables synchronized');
    
    // Load template data
    const { nodeTemplates, workflowTemplates, scenarioTemplates, categories } = await loadTemplateData();
    
    // Run migrations
    await migrateCategories(categories);
    await migrateNodeTemplates(nodeTemplates);
    await migrateWorkflowTemplates(workflowTemplates);
    await migrateScenarioTemplates(scenarioTemplates);
    
    console.log('\\n✅ Template migration completed successfully!');
    console.log(`\\nMigration Summary:`);
    console.log(`• Categories: ${categories.length}`);
    console.log(`• Node Templates: ${nodeTemplates.length}`);
    console.log(`• Workflow Templates: ${workflowTemplates.length}`);
    console.log(`• Scenario Templates: ${scenarioTemplates.length}`);
    
    // Generate usage statistics
    const stats = await generateUsageStats();
    console.log('\\n📊 Template Statistics:');
    console.log(stats);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

async function generateUsageStats() {
  try {
    const [nodeCount, workflowCount, scenarioCount, categoryCount] = await Promise.all([
      NodeTemplate.count({ where: { isActive: true } }),
      WorkflowTemplate.count({ where: { isActive: true } }),
      ScenarioTemplate.count({ where: { isActive: true } }),
      TemplateCategory.count({ where: { isActive: true } })
    ]);
    
    const difficultyStats = await NodeTemplate.findAll({
      attributes: [
        'difficulty',
        [sequelize.fn('COUNT', sequelize.col('difficulty')), 'count']
      ],
      group: ['difficulty'],
      raw: true
    });
    
    const categoryStats = await NodeTemplate.findAll({
      attributes: [
        'category',
        [sequelize.fn('COUNT', sequelize.col('category')), 'count']
      ],
      group: ['category'],
      raw: true
    });
    
    return {
      totalTemplates: {
        nodes: nodeCount,
        workflows: workflowCount,
        scenarios: scenarioCount,
        categories: categoryCount
      },
      byDifficulty: difficultyStats.reduce((acc, item) => {
        acc[item.difficulty] = parseInt(item.count);
        return acc;
      }, {}),
      byCategory: categoryStats.reduce((acc, item) => {
        acc[item.category] = parseInt(item.count);
        return acc;
      }, {})
    };
  } catch (error) {
    return 'Error generating statistics: ' + error.message;
  }
}

// Export for programmatic usage
module.exports = {
  NodeTemplate,
  WorkflowTemplate, 
  ScenarioTemplate,
  TemplateCategory,
  runMigration,
  sequelize
};

// Run migration if called directly
if (require.main === module) {
  runMigration();
}