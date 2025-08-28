export interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  industry: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  estimatedSavings: string;
  useCase: string[];
  prerequisites: string[];
  workflow: {
    nodes: any[];
    connections: any[];
    settings?: any;
  };
  documentation: {
    overview: string;
    setup: string[];
    configuration: string[];
    troubleshooting: string[];
  };
  tags: string[];
}

export const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    id: 'ecommerce-order-processing',
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
          position: { x: 100, y: 200 },
          parameters: {
            path: 'orders/webhook',
            method: 'POST',
            responseMode: 'onReceived'
          }
        },
        {
          id: 'payment-verify',
          type: 'httpRequest',
          name: 'Verify Payment',
          position: { x: 300, y: 200 },
          parameters: {
            url: 'https://api.stripe.com/v1/payment_intents/{{payment_intent_id}}',
            method: 'GET',
            headers: {
              'Authorization': 'Bearer {{stripeSecretKey}}'
            }
          }
        },
        {
          id: 'payment-check',
          type: 'condition',
          name: 'Payment Valid?',
          position: { x: 500, y: 200 },
          parameters: {
            conditions: [
              { field: 'status', operator: 'equals', value: 'succeeded' }
            ]
          }
        },
        {
          id: 'inventory-check',
          type: 'database',
          name: 'Check Inventory',
          position: { x: 700, y: 150 },
          parameters: {
            operation: 'select',
            table: 'inventory',
            where: { product_id: '{{product_id}}' }
          }
        },
        {
          id: 'stock-condition',
          type: 'condition',
          name: 'In Stock?',
          position: { x: 900, y: 150 },
          parameters: {
            conditions: [
              { field: 'quantity', operator: 'greaterThan', value: '{{order_quantity}}' }
            ]
          }
        },
        {
          id: 'create-order',
          type: 'database',
          name: 'Create Order Record',
          position: { x: 1100, y: 100 },
          parameters: {
            operation: 'insert',
            table: 'orders',
            fields: {
              customer_id: '{{customer.id}}',
              product_id: '{{product_id}}',
              quantity: '{{quantity}}',
              total: '{{total}}',
              status: 'processing',
              created_at: '{{new Date().toISOString()}}'
            }
          }
        },
        {
          id: 'update-inventory',
          type: 'database',
          name: 'Update Inventory',
          position: { x: 1300, y: 100 },
          parameters: {
            operation: 'update',
            table: 'inventory',
            set: { quantity: '{{current_quantity - order_quantity}}' },
            where: { product_id: '{{product_id}}' }
          }
        },
        {
          id: 'shipping-api',
          type: 'httpRequest',
          name: 'Create Shipping Label',
          position: { x: 1500, y: 100 },
          parameters: {
            url: 'https://api.shipping.com/labels',
            method: 'POST',
            body: {
              to_address: '{{shipping_address}}',
              weight: '{{product.weight}}',
              service_type: 'standard'
            }
          }
        },
        {
          id: 'confirmation-email',
          type: 'email',
          name: 'Order Confirmation',
          position: { x: 1700, y: 100 },
          parameters: {
            to: '{{customer.email}}',
            subject: 'Order Confirmation #{{order_id}}',
            template: 'order-confirmation',
            data: {
              customer_name: '{{customer.name}}',
              order_id: '{{order_id}}',
              items: '{{items}}',
              total: '{{total}}',
              tracking_number: '{{tracking_number}}'
            }
          }
        },
        {
          id: 'payment-failed',
          type: 'email',
          name: 'Payment Failed Notice',
          position: { x: 700, y: 300 },
          parameters: {
            to: '{{customer.email}}',
            subject: 'Payment Issue - Order #{{order_id}}',
            template: 'payment-failed',
            data: {
              customer_name: '{{customer.name}}',
              order_id: '{{order_id}}',
              retry_link: '{{payment_retry_url}}'
            }
          }
        },
        {
          id: 'out-of-stock',
          type: 'email',
          name: 'Out of Stock Notice',
          position: { x: 1100, y: 200 },
          parameters: {
            to: '{{customer.email}}',
            subject: 'Item Out of Stock - Order #{{order_id}}',
            template: 'out-of-stock',
            data: {
              customer_name: '{{customer.name}}',
              product_name: '{{product.name}}',
              estimated_restock: '{{product.restock_date}}'
            }
          }
        },
        {
          id: 'admin-alert',
          type: 'slack',
          name: 'Low Stock Alert',
          position: { x: 1300, y: 200 },
          parameters: {
            channel: '#operations',
            message: '⚠️ Low stock alert: {{product.name}} - Only {{remaining_quantity}} left'
          }
        }
      ],
      connections: [
        { from: 'order-webhook', to: 'payment-verify' },
        { from: 'payment-verify', to: 'payment-check' },
        { from: 'payment-check', to: 'inventory-check', output: 0 },
        { from: 'payment-check', to: 'payment-failed', output: 1 },
        { from: 'inventory-check', to: 'stock-condition' },
        { from: 'stock-condition', to: 'create-order', output: 0 },
        { from: 'stock-condition', to: 'out-of-stock', output: 1 },
        { from: 'create-order', to: 'update-inventory' },
        { from: 'update-inventory', to: 'shipping-api' },
        { from: 'shipping-api', to: 'confirmation-email' },
        { from: 'out-of-stock', to: 'admin-alert' }
      ]
    },
    documentation: {
      overview: 'This workflow handles complete e-commerce order processing including payment verification, inventory management, shipping label creation, and customer notifications.',
      setup: [
        'Configure webhook endpoint in your e-commerce platform',
        'Set up Stripe API credentials',
        'Configure database connections for orders and inventory',
        'Set up shipping provider API',
        'Configure email templates for notifications'
      ],
      configuration: [
        'Update webhook path to match your platform',
        'Configure payment gateway credentials',
        'Set up database table schemas',
        'Configure shipping provider settings',
        'Customize email templates'
      ],
      troubleshooting: [
        'Check webhook payload format matches expected structure',
        'Verify payment gateway API credentials',
        'Ensure database connectivity and permissions',
        'Test shipping API credentials and endpoint',
        'Verify email service configuration'
      ]
    },
    tags: ['ecommerce', 'orders', 'payments', 'inventory', 'shipping', 'notifications']
  },

  {
    id: 'lead-qualification-crm',
    name: 'Automated Lead Qualification & CRM Integration',
    description: 'Score and qualify leads automatically, then route to appropriate sales teams with CRM integration',
    industry: 'Sales & Marketing',
    category: 'Lead Management',
    difficulty: 'intermediate',
    estimatedTime: '30 seconds per lead',
    estimatedSavings: '25+ hours per week',
    useCase: ['lead-scoring', 'crm-integration', 'sales-automation', 'lead-routing'],
    prerequisites: ['CRM system API', 'Lead scoring model', 'Email service', 'Web form'],
    workflow: {
      nodes: [
        {
          id: 'lead-form',
          type: 'webhook',
          name: 'Lead Form Submission',
          position: { x: 100, y: 200 },
          parameters: {
            path: 'leads/form',
            method: 'POST'
          }
        },
        {
          id: 'data-cleansing',
          type: 'dataCleansingNode',
          name: 'Clean Lead Data',
          position: { x: 300, y: 200 },
          parameters: {
            operations: [
              { field: 'email', operation: 'lowercase' },
              { field: 'phone', operation: 'normalize_phone' },
              { field: 'company', operation: 'trim' }
            ]
          }
        },
        {
          id: 'lead-scoring',
          type: 'code',
          name: 'Calculate Lead Score',
          position: { x: 500, y: 200 },
          parameters: {
            jsCode: `
              let score = 0;
              const data = items[0].json;
              
              // Company size scoring
              if (data.company_size === 'Enterprise') score += 30;
              else if (data.company_size === 'Mid-market') score += 20;
              else if (data.company_size === 'Small') score += 10;
              
              // Budget scoring
              if (data.budget >= 100000) score += 25;
              else if (data.budget >= 50000) score += 15;
              else if (data.budget >= 10000) score += 10;
              
              // Role scoring
              if (data.role.includes('CEO') || data.role.includes('CTO')) score += 20;
              else if (data.role.includes('Manager') || data.role.includes('Director')) score += 15;
              else score += 5;
              
              // Urgency scoring
              if (data.timeline === 'Immediate') score += 20;
              else if (data.timeline === '1-3 months') score += 15;
              else if (data.timeline === '3-6 months') score += 10;
              
              return [{
                json: {
                  ...data,
                  lead_score: score,
                  priority: score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low'
                }
              }];
            `
          }
        },
        {
          id: 'crm-lookup',
          type: 'httpRequest',
          name: 'Check Existing Contact',
          position: { x: 700, y: 200 },
          parameters: {
            url: 'https://api.crm.com/contacts/search',
            method: 'GET',
            headers: { 'Authorization': 'Bearer {{crmToken}}' },
            queryString: 'email={{email}}'
          }
        },
        {
          id: 'existing-contact',
          type: 'condition',
          name: 'Existing Contact?',
          position: { x: 900, y: 200 },
          parameters: {
            conditions: [
              { field: 'contacts.length', operator: 'greaterThan', value: '0' }
            ]
          }
        },
        {
          id: 'create-contact',
          type: 'httpRequest',
          name: 'Create New Contact',
          position: { x: 1100, y: 150 },
          parameters: {
            url: 'https://api.crm.com/contacts',
            method: 'POST',
            headers: { 'Authorization': 'Bearer {{crmToken}}' },
            body: {
              firstName: '{{first_name}}',
              lastName: '{{last_name}}',
              email: '{{email}}',
              company: '{{company}}',
              phone: '{{phone}}',
              leadScore: '{{lead_score}}',
              source: 'Website Form'
            }
          }
        },
        {
          id: 'update-contact',
          type: 'httpRequest',
          name: 'Update Existing Contact',
          position: { x: 1100, y: 250 },
          parameters: {
            url: 'https://api.crm.com/contacts/{{contacts[0].id}}',
            method: 'PUT',
            headers: { 'Authorization': 'Bearer {{crmToken}}' },
            body: {
              leadScore: '{{lead_score}}',
              lastActivity: '{{new Date().toISOString()}}',
              notes: 'Updated from website form submission'
            }
          }
        },
        {
          id: 'priority-routing',
          type: 'switch',
          name: 'Route by Priority',
          position: { x: 1300, y: 200 },
          parameters: {
            dataType: 'string',
            value: 'priority',
            rules: [
              { output: 0, operation: 'equals', value: 'high' },
              { output: 1, operation: 'equals', value: 'medium' },
              { output: 2, operation: 'equals', value: 'low' }
            ],
            fallbackOutput: 2
          }
        },
        {
          id: 'high-priority-sales',
          type: 'slack',
          name: 'Alert Senior Sales',
          position: { x: 1500, y: 100 },
          parameters: {
            channel: '#sales-senior',
            message: '🔥 HIGH PRIORITY LEAD: {{first_name}} {{last_name}} from {{company}}\nScore: {{lead_score}}\nEmail: {{email}}\nBudget: ${{budget}}'
          }
        },
        {
          id: 'medium-priority-sales',
          type: 'email',
          name: 'Notify Sales Team',
          position: { x: 1500, y: 200 },
          parameters: {
            to: 'sales-team@company.com',
            subject: 'New Medium Priority Lead: {{company}}',
            body: 'Lead Details:\nName: {{first_name}} {{last_name}}\nCompany: {{company}}\nScore: {{lead_score}}\nTimeline: {{timeline}}'
          }
        },
        {
          id: 'low-priority-nurture',
          type: 'httpRequest',
          name: 'Add to Nurture Campaign',
          position: { x: 1500, y: 300 },
          parameters: {
            url: 'https://api.emailmarketing.com/campaigns/nurture/contacts',
            method: 'POST',
            body: {
              email: '{{email}}',
              firstName: '{{first_name}}',
              company: '{{company}}',
              campaignId: 'lead-nurture-2024'
            }
          }
        },
        {
          id: 'auto-response',
          type: 'email',
          name: 'Send Auto-Response',
          position: { x: 1700, y: 200 },
          parameters: {
            to: '{{email}}',
            subject: 'Thank you for your interest in our solutions',
            template: 'lead-thank-you',
            data: {
              firstName: '{{first_name}}',
              company: '{{company}}',
              priority: '{{priority}}'
            }
          }
        }
      ],
      connections: [
        { from: 'lead-form', to: 'data-cleansing' },
        { from: 'data-cleansing', to: 'lead-scoring' },
        { from: 'lead-scoring', to: 'crm-lookup' },
        { from: 'crm-lookup', to: 'existing-contact' },
        { from: 'existing-contact', to: 'create-contact', output: 1 },
        { from: 'existing-contact', to: 'update-contact', output: 0 },
        { from: 'create-contact', to: 'priority-routing' },
        { from: 'update-contact', to: 'priority-routing' },
        { from: 'priority-routing', to: 'high-priority-sales', output: 0 },
        { from: 'priority-routing', to: 'medium-priority-sales', output: 1 },
        { from: 'priority-routing', to: 'low-priority-nurture', output: 2 },
        { from: 'high-priority-sales', to: 'auto-response' },
        { from: 'medium-priority-sales', to: 'auto-response' },
        { from: 'low-priority-nurture', to: 'auto-response' }
      ]
    },
    documentation: {
      overview: 'Automatically qualifies and scores incoming leads, integrates with CRM systems, and routes leads to appropriate sales team members based on priority.',
      setup: [
        'Configure lead capture form webhook',
        'Set up CRM API credentials',
        'Define lead scoring criteria',
        'Configure sales team notification channels',
        'Set up email marketing automation'
      ],
      configuration: [
        'Customize lead scoring algorithm in Code node',
        'Update CRM API endpoints and authentication',
        'Configure priority routing rules',
        'Set up team notification preferences',
        'Customize email templates'
      ],
      troubleshooting: [
        'Verify webhook payload format matches form data',
        'Check CRM API credentials and permissions',
        'Test lead scoring logic with sample data',
        'Verify email service configuration',
        'Check Slack webhook integration'
      ]
    },
    tags: ['sales', 'leads', 'crm', 'scoring', 'automation', 'routing']
  },

  {
    id: 'hr-onboarding-automation',
    name: 'Employee Onboarding Automation',
    description: 'Complete employee onboarding workflow with document management, account creation, and task assignments',
    industry: 'Human Resources',
    category: 'Employee Management',
    difficulty: 'advanced',
    estimatedTime: '5-10 minutes setup per employee',
    estimatedSavings: '8+ hours per new hire',
    useCase: ['employee-onboarding', 'document-management', 'task-automation', 'account-provisioning'],
    prerequisites: ['HRIS system', 'Document storage', 'Identity provider', 'Task management system'],
    workflow: {
      nodes: [
        {
          id: 'hiring-webhook',
          type: 'webhook',
          name: 'New Hire Notification',
          position: { x: 100, y: 200 },
          parameters: {
            path: 'hr/new-hire',
            method: 'POST'
          }
        },
        {
          id: 'validate-data',
          type: 'dataValidation',
          name: 'Validate Employee Data',
          position: { x: 300, y: 200 },
          parameters: {
            validationRules: [
              { field: 'email', type: 'email', required: true },
              { field: 'firstName', type: 'string', required: true },
              { field: 'lastName', type: 'string', required: true },
              { field: 'department', type: 'string', required: true },
              { field: 'startDate', type: 'date', required: true },
              { field: 'managerId', type: 'string', required: true }
            ]
          }
        },
        {
          id: 'create-employee-record',
          type: 'httpRequest',
          name: 'Create HRIS Record',
          position: { x: 500, y: 200 },
          parameters: {
            url: 'https://api.hris.com/employees',
            method: 'POST',
            headers: { 'Authorization': 'Bearer {{hrisToken}}' },
            body: {
              firstName: '{{firstName}}',
              lastName: '{{lastName}}',
              email: '{{email}}',
              department: '{{department}}',
              position: '{{position}}',
              managerId: '{{managerId}}',
              startDate: '{{startDate}}',
              employeeId: '{{generateEmployeeId()}}'
            }
          }
        },
        {
          id: 'create-user-account',
          type: 'httpRequest',
          name: 'Create User Account',
          position: { x: 700, y: 150 },
          parameters: {
            url: 'https://api.identity.com/users',
            method: 'POST',
            headers: { 'Authorization': 'Bearer {{idpToken}}' },
            body: {
              username: '{{email}}',
              firstName: '{{firstName}}',
              lastName: '{{lastName}}',
              email: '{{email}}',
              groups: ['{{department}}-employees'],
              temporaryPassword: true,
              sendWelcomeEmail: false
            }
          }
        },
        {
          id: 'assign-equipment',
          type: 'httpRequest',
          name: 'Request Equipment',
          position: { x: 700, y: 250 },
          parameters: {
            url: 'https://api.equipment.com/requests',
            method: 'POST',
            body: {
              employeeId: '{{employeeId}}',
              department: '{{department}}',
              equipmentList: '{{getEquipmentByRole(position)}}',
              deliveryDate: '{{startDate}}',
              location: '{{office}}'
            }
          }
        },
        {
          id: 'generate-documents',
          type: 'pdfGenerator',
          name: 'Generate Welcome Package',
          position: { x: 900, y: 200 },
          parameters: {
            template: 'welcome-package',
            data: {
              employeeName: '{{firstName}} {{lastName}}',
              position: '{{position}}',
              department: '{{department}}',
              startDate: '{{startDate}}',
              managerId: '{{managerId}}',
              employeeId: '{{employeeId}}'
            },
            outputFormat: 'pdf'
          }
        },
        {
          id: 'create-onboarding-tasks',
          type: 'loop',
          name: 'Create Onboarding Tasks',
          position: { x: 1100, y: 200 },
          parameters: {
            loopMode: 'forEach',
            arrayField: 'onboardingTasks'
          }
        },
        {
          id: 'assign-task',
          type: 'httpRequest',
          name: 'Create Task',
          position: { x: 1300, y: 200 },
          parameters: {
            url: 'https://api.tasks.com/tasks',
            method: 'POST',
            body: {
              title: '{{_loopItem.title}}',
              description: '{{_loopItem.description}}',
              assigneeId: '{{_loopItem.assigneeId || managerId}}',
              dueDate: '{{addDays(startDate, _loopItem.dueDays)}}',
              priority: '{{_loopItem.priority}}',
              employeeId: '{{employeeId}}'
            }
          }
        },
        {
          id: 'welcome-email',
          type: 'email',
          name: 'Send Welcome Email',
          position: { x: 1500, y: 100 },
          parameters: {
            to: '{{email}}',
            subject: 'Welcome to {{company}} - Your First Day Information',
            template: 'employee-welcome',
            attachments: [
              { name: 'welcome-package.pdf', data: '{{welcomePackagePdf}}' }
            ],
            data: {
              firstName: '{{firstName}}',
              startDate: '{{startDate}}',
              manager: '{{managerName}}',
              department: '{{department}}',
              loginInstructions: '{{loginInstructions}}'
            }
          }
        },
        {
          id: 'manager-notification',
          type: 'email',
          name: 'Notify Manager',
          position: { x: 1500, y: 200 },
          parameters: {
            to: '{{managerEmail}}',
            subject: 'New Team Member: {{firstName}} {{lastName}}',
            template: 'manager-new-hire',
            data: {
              employeeName: '{{firstName}} {{lastName}}',
              position: '{{position}}',
              startDate: '{{startDate}}',
              onboardingTasksLink: '{{tasksUrl}}'
            }
          }
        },
        {
          id: 'hr-slack-notification',
          type: 'slack',
          name: 'HR Team Notification',
          position: { x: 1500, y: 300 },
          parameters: {
            channel: '#hr-team',
            message: '👋 New hire onboarding initiated for {{firstName}} {{lastName}}\n📅 Start Date: {{startDate}}\n🏢 Department: {{department}}\n👤 Manager: {{managerName}}'
          }
        },
        {
          id: 'schedule-check-in',
          type: 'delay',
          name: 'Wait for First Day',
          position: { x: 1700, y: 200 },
          parameters: {
            delayMode: 'until',
            untilDateTime: '{{startDate}}T09:00:00'
          }
        },
        {
          id: 'first-day-checkin',
          type: 'email',
          name: 'First Day Check-in',
          position: { x: 1900, y: 200 },
          parameters: {
            to: ['{{email}}', '{{managerEmail}}'],
            subject: 'First Day Check-in - {{firstName}} {{lastName}}',
            template: 'first-day-checkin',
            data: {
              employeeName: '{{firstName}} {{lastName}}',
              checkInFormUrl: '{{checkInUrl}}'
            }
          }
        }
      ],
      connections: [
        { from: 'hiring-webhook', to: 'validate-data' },
        { from: 'validate-data', to: 'create-employee-record' },
        { from: 'create-employee-record', to: 'create-user-account' },
        { from: 'create-employee-record', to: 'assign-equipment' },
        { from: 'create-user-account', to: 'generate-documents' },
        { from: 'assign-equipment', to: 'generate-documents' },
        { from: 'generate-documents', to: 'create-onboarding-tasks' },
        { from: 'create-onboarding-tasks', to: 'assign-task' },
        { from: 'assign-task', to: 'welcome-email' },
        { from: 'welcome-email', to: 'manager-notification' },
        { from: 'manager-notification', to: 'hr-slack-notification' },
        { from: 'hr-slack-notification', to: 'schedule-check-in' },
        { from: 'schedule-check-in', to: 'first-day-checkin' }
      ]
    },
    documentation: {
      overview: 'Comprehensive employee onboarding automation that handles account creation, document generation, task assignment, and communication coordination.',
      setup: [
        'Configure HRIS system integration',
        'Set up identity provider API access',
        'Configure equipment management system',
        'Set up document templates and storage',
        'Configure task management system'
      ],
      configuration: [
        'Customize onboarding task templates by role/department',
        'Configure department-specific equipment lists',
        'Set up email templates for different scenarios',
        'Configure approval workflows if needed',
        'Set up manager notification preferences'
      ],
      troubleshooting: [
        'Verify HRIS API connectivity and permissions',
        'Check identity provider configuration',
        'Test email template rendering with sample data',
        'Verify equipment system integration',
        'Check task assignment logic and due dates'
      ]
    },
    tags: ['hr', 'onboarding', 'automation', 'employee-management', 'documentation', 'task-management']
  },

  {
    id: 'financial-reporting-pipeline',
    name: 'Automated Financial Reporting Pipeline',
    description: 'Multi-source financial data aggregation with automated report generation and stakeholder distribution',
    industry: 'Finance',
    category: 'Financial Reporting',
    difficulty: 'advanced',
    estimatedTime: '15-30 minutes per report',
    estimatedSavings: '20+ hours per month',
    useCase: ['financial-reporting', 'data-aggregation', 'compliance', 'executive-reporting'],
    prerequisites: ['Financial systems APIs', 'Data warehouse', 'Reporting tools', 'Email/distribution system'],
    workflow: {
      nodes: [
        {
          id: 'schedule-monthly',
          type: 'schedule',
          name: 'Monthly Report Schedule',
          position: { x: 100, y: 300 },
          parameters: {
            scheduleMode: 'cron',
            cronExpression: '0 8 1 * *', // 8 AM on 1st of every month
            timezone: 'America/New_York'
          }
        },
        {
          id: 'fetch-accounting-data',
          type: 'httpRequest',
          name: 'Fetch Accounting Data',
          position: { x: 300, y: 200 },
          parameters: {
            url: 'https://api.accounting.com/reports/trial-balance',
            method: 'GET',
            headers: { 'Authorization': 'Bearer {{accountingToken}}' },
            queryString: 'start_date={{getMonthStart()}}&end_date={{getMonthEnd()}}'
          }
        },
        {
          id: 'fetch-crm-revenue',
          type: 'httpRequest',
          name: 'Fetch CRM Revenue',
          position: { x: 300, y: 300 },
          parameters: {
            url: 'https://api.crm.com/analytics/revenue',
            method: 'GET',
            headers: { 'Authorization': 'Bearer {{crmToken}}' },
            queryString: 'period=monthly&date={{getCurrentMonth()}}'
          }
        },
        {
          id: 'fetch-bank-data',
          type: 'httpRequest',
          name: 'Fetch Bank Transactions',
          position: { x: 300, y: 400 },
          parameters: {
            url: 'https://api.bank.com/transactions',
            method: 'GET',
            headers: { 'Authorization': 'Bearer {{bankToken}}' },
            queryString: 'from={{getMonthStart()}}&to={{getMonthEnd()}}&account_type=business'
          }
        },
        {
          id: 'data-validation',
          type: 'dataValidation',
          name: 'Validate Financial Data',
          position: { x: 500, y: 300 },
          parameters: {
            validationRules: [
              { field: 'total_revenue', type: 'number', required: true, min: 0 },
              { field: 'total_expenses', type: 'number', required: true, min: 0 },
              { field: 'cash_balance', type: 'number', required: true }
            ]
          }
        },
        {
          id: 'merge-data',
          type: 'merge',
          name: 'Merge All Financial Data',
          position: { x: 700, y: 300 },
          parameters: {
            mergeMode: 'combine',
            includeMetadata: true
          }
        },
        {
          id: 'calculate-kpis',
          type: 'code',
          name: 'Calculate KPIs',
          position: { x: 900, y: 300 },
          parameters: {
            jsCode: `
              const financialData = items[0].json;
              
              // Calculate key financial metrics
              const revenue = financialData.total_revenue || 0;
              const expenses = financialData.total_expenses || 0;
              const grossProfit = revenue - expenses;
              const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
              
              const cashFlow = financialData.cash_inflow - financialData.cash_outflow;
              const burnRate = expenses / 30; // Daily burn rate
              const runway = financialData.cash_balance / burnRate; // Days of runway
              
              // Previous month comparison
              const revenueGrowth = ((revenue - financialData.prev_revenue) / financialData.prev_revenue) * 100;
              
              return [{
                json: {
                  ...financialData,
                  kpis: {
                    revenue,
                    expenses,
                    gross_profit: grossProfit,
                    gross_margin: Math.round(grossMargin * 100) / 100,
                    cash_flow: cashFlow,
                    burn_rate: Math.round(burnRate * 100) / 100,
                    runway_days: Math.round(runway),
                    revenue_growth: Math.round(revenueGrowth * 100) / 100
                  },
                  report_date: new Date().toISOString(),
                  period: 'monthly'
                }
              }];
            `
          }
        },
        {
          id: 'generate-executive-summary',
          type: 'code',
          name: 'Generate Executive Summary',
          position: { x: 1100, y: 250 },
          parameters: {
            jsCode: `
              const data = items[0].json;
              const kpis = data.kpis;
              
              let summary = "Executive Summary - Monthly Financial Report\\n\\n";
              
              // Revenue section
              summary += "📊 REVENUE PERFORMANCE\\n";
              summary += \`• Total Revenue: $\${kpis.revenue.toLocaleString()}\\n\`;
              summary += \`• Growth vs Previous Month: \${kpis.revenue_growth}%\\n\\n\`;
              
              // Profitability section
              summary += "💰 PROFITABILITY\\n";
              summary += \`• Gross Profit: $\${kpis.gross_profit.toLocaleString()}\\n\`;
              summary += \`• Gross Margin: \${kpis.gross_margin}%\\n\\n\`;
              
              // Cash flow section
              summary += "💸 CASH FLOW\\n";
              summary += \`• Net Cash Flow: $\${kpis.cash_flow.toLocaleString()}\\n\`;
              summary += \`• Daily Burn Rate: $\${kpis.burn_rate.toLocaleString()}\\n\`;
              summary += \`• Runway: \${kpis.runway_days} days\\n\\n\`;
              
              // Alerts and recommendations
              let alerts = [];
              if (kpis.revenue_growth < -10) alerts.push("⚠️ Revenue decline > 10%");
              if (kpis.gross_margin < 20) alerts.push("⚠️ Low gross margin < 20%");
              if (kpis.runway_days < 90) alerts.push("🚨 Cash runway < 90 days");
              
              if (alerts.length > 0) {
                summary += "🚨 ALERTS:\\n" + alerts.join("\\n") + "\\n\\n";
              }
              
              return [{
                json: {
                  ...data,
                  executive_summary: summary
                }
              }];
            `
          }
        },
        {
          id: 'create-detailed-report',
          type: 'pdfGenerator',
          name: 'Generate PDF Report',
          position: { x: 1100, y: 350 },
          parameters: {
            template: 'monthly-financial-report',
            data: {
              report_date: '{{report_date}}',
              kpis: '{{kpis}}',
              detailed_data: '{{financialData}}',
              charts: true,
              executive_summary: '{{executive_summary}}'
            },
            outputFormat: 'pdf'
          }
        },
        {
          id: 'save-to-storage',
          type: 'fileUpload',
          name: 'Save Report to Storage',
          position: { x: 1300, y: 300 },
          parameters: {
            storageType: 's3',
            bucket: 'financial-reports',
            key: 'monthly-reports/{{getYearMonth()}}-financial-report.pdf',
            file: '{{reportPdf}}'
          }
        },
        {
          id: 'email-executives',
          type: 'email',
          name: 'Email to Executives',
          position: { x: 1500, y: 250 },
          parameters: {
            to: ['ceo@company.com', 'cfo@company.com', 'board@company.com'],
            subject: 'Monthly Financial Report - {{getMonthName()}} {{getYear()}}',
            body: '{{executive_summary}}',
            attachments: [
              { name: 'Monthly-Financial-Report.pdf', data: '{{reportPdf}}' }
            ]
          }
        },
        {
          id: 'slack-finance-team',
          type: 'slack',
          name: 'Notify Finance Team',
          position: { x: 1500, y: 350 },
          parameters: {
            channel: '#finance-team',
            message: '📈 Monthly financial report has been generated and distributed\\n\\nKey Metrics:\\n• Revenue: ${{kpis.revenue | number}}\\n• Gross Margin: {{kpis.gross_margin}}%\\n• Cash Flow: ${{kpis.cash_flow | number}}'
          }
        },
        {
          id: 'update-dashboard',
          type: 'httpRequest',
          name: 'Update Executive Dashboard',
          position: { x: 1700, y: 300 },
          parameters: {
            url: 'https://api.dashboard.com/metrics/financial',
            method: 'POST',
            headers: { 'Authorization': 'Bearer {{dashboardToken}}' },
            body: {
              period: 'monthly',
              date: '{{getCurrentMonth()}}',
              metrics: '{{kpis}}'
            }
          }
        }
      ],
      connections: [
        { from: 'schedule-monthly', to: 'fetch-accounting-data' },
        { from: 'schedule-monthly', to: 'fetch-crm-revenue' },
        { from: 'schedule-monthly', to: 'fetch-bank-data' },
        { from: 'fetch-accounting-data', to: 'data-validation' },
        { from: 'fetch-crm-revenue', to: 'merge-data' },
        { from: 'fetch-bank-data', to: 'merge-data' },
        { from: 'data-validation', to: 'merge-data' },
        { from: 'merge-data', to: 'calculate-kpis' },
        { from: 'calculate-kpis', to: 'generate-executive-summary' },
        { from: 'calculate-kpis', to: 'create-detailed-report' },
        { from: 'generate-executive-summary', to: 'save-to-storage' },
        { from: 'create-detailed-report', to: 'save-to-storage' },
        { from: 'save-to-storage', to: 'email-executives' },
        { from: 'save-to-storage', to: 'slack-finance-team' },
        { from: 'email-executives', to: 'update-dashboard' },
        { from: 'slack-finance-team', to: 'update-dashboard' }
      ]
    },
    documentation: {
      overview: 'Automated financial reporting system that aggregates data from multiple sources, calculates KPIs, generates comprehensive reports, and distributes to stakeholders.',
      setup: [
        'Configure accounting system API access',
        'Set up CRM revenue tracking integration',
        'Configure bank API connections',
        'Set up cloud storage for report archival',
        'Configure executive dashboard integration'
      ],
      configuration: [
        'Customize KPI calculations for your business',
        'Configure report templates and branding',
        'Set up stakeholder distribution lists',
        'Configure alert thresholds',
        'Set up backup and archival policies'
      ],
      troubleshooting: [
        'Verify all financial system API credentials',
        'Check data validation rules and formats',
        'Test report generation with sample data',
        'Verify email delivery and attachment sizes',
        'Check dashboard API integration'
      ]
    },
    tags: ['finance', 'reporting', 'kpis', 'automation', 'executive-reporting', 'data-aggregation']
  }
];