import request from 'supertest';
import express from 'express';
import { simpleTemplateRoutes } from '../../routes/simpleTemplateRoutes';
import { WorkflowModel } from '../../models/Workflow.model';

// Mock the database models
jest.mock('../../models/Workflow.model');
const mockWorkflowModel = WorkflowModel as jest.Mocked<typeof WorkflowModel>;

const app = express();
app.use(express.json());
app.use('/api/templates', simpleTemplateRoutes);

describe('Template End-to-End Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Template Workflow', () => {
    it('should complete a full user workflow: browse -> select -> customize -> fork -> use', async () => {
      // Step 1: User browses available templates
      console.log('\n🌟 Step 1: Browse Templates');
      const browseResponse = await request(app)
        .get('/api/templates')
        .expect(200);

      expect(browseResponse.body.success).toBe(true);
      expect(browseResponse.body.data.nodeTemplates.length).toBeGreaterThan(0);
      
      const availableTemplate = browseResponse.body.data.nodeTemplates[0];
      console.log(`   Found ${browseResponse.body.data.nodeTemplates.length} templates`);
      console.log(`   Selected template: ${availableTemplate.name}`);

      // Step 2: User views specific template details
      console.log('\n🔍 Step 2: View Template Details');
      const templateResponse = await request(app)
        .get(`/api/templates/${availableTemplate.templateId}`)
        .expect(200);

      expect(templateResponse.body.success).toBe(true);
      expect(templateResponse.body.data.templateId).toBe(availableTemplate.templateId);
      console.log(`   Template type: ${templateResponse.body.data.type}`);
      console.log(`   Template category: ${templateResponse.body.data.category}`);

      // Step 3: User creates a custom variation of the template
      console.log('\n🎨 Step 3: Create Custom Template Variation');
      const customTemplate = {
        name: `Custom ${availableTemplate.name}`,
        description: `Customized version of ${availableTemplate.name} template`,
        category: availableTemplate.category,
        difficulty: 'intermediate',
        tags: [...(availableTemplate.tags || []), 'custom', 'e2e-test'],
        useCase: ['e2e-testing', 'automation'],
        nodes: [
          {
            id: 'custom-node-1',
            type: availableTemplate.type,
            name: `Custom ${availableTemplate.name} Node`,
            position: { x: 200, y: 150 },
            configuration: {
              customParam: 'e2e-test-value',
              originalType: availableTemplate.type
            }
          }
        ],
        connections: []
      };

      const customResponse = await request(app)
        .post('/api/templates/custom')
        .send(customTemplate)
        .expect(200);

      expect(customResponse.body.success).toBe(true);
      expect(customResponse.body.data.isCustom).toBe(true);
      console.log(`   Created custom template: ${customResponse.body.data.name}`);
      console.log(`   Template ID: ${customResponse.body.data.templateId}`);

      // Step 4: User forks the original template to create a workflow
      console.log('\n🚀 Step 4: Fork Template to Create Workflow');
      
      // Mock successful workflow creation
      mockWorkflowModel.create.mockResolvedValue({
        id: 12345,
        name: 'E2E Test Workflow',
        description: 'Workflow created from E2E test',
        userId: 1,
        nodes: [],
        connections: [],
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        toJSON: () => ({
          id: 12345,
          name: 'E2E Test Workflow',
          nodes: [],
          connections: []
        })
      } as any);

      const forkResponse = await request(app)
        .post(`/api/templates/fork/${availableTemplate.templateId}`)
        .send({
          workflowName: 'E2E Test Workflow',
          userId: 1
        })
        .expect(200);

      expect(forkResponse.body.success).toBe(true);
      expect(forkResponse.body.data.workflowId).toBe(12345);
      expect(forkResponse.body.data.name).toBe('E2E Test Workflow');
      console.log(`   Created workflow: ${forkResponse.body.data.name}`);
      console.log(`   Workflow ID: ${forkResponse.body.data.workflowId}`);

      // Step 5: Verify the custom template is now available in listings
      console.log('\n✅ Step 5: Verify Custom Template in Listings');
      const updatedListResponse = await request(app)
        .get('/api/templates')
        .expect(200);

      const customTemplates = updatedListResponse.body.data.nodeTemplates.filter(
        (t: any) => t.isCustom
      );
      expect(customTemplates.length).toBeGreaterThan(0);
      
      const ourCustomTemplate = customTemplates.find(
        (t: any) => t.name === customTemplate.name
      );
      expect(ourCustomTemplate).toBeDefined();
      console.log(`   Custom template found in listings: ${ourCustomTemplate.name}`);

      // Step 6: Search for templates using various filters
      console.log('\n🔎 Step 6: Search and Filter Templates');
      const searchTests = [
        { query: { search: 'custom' }, expectedMin: 1 },
        { query: { category: availableTemplate.category }, expectedMin: 1 },
        { query: { difficulty: 'intermediate' }, expectedMin: 1 },
        { query: { search: 'e2e-test' }, expectedMin: 1 }
      ];

      for (const test of searchTests) {
        const searchResponse = await request(app)
          .get('/api/templates')
          .query(test.query)
          .expect(200);

        expect(searchResponse.body.success).toBe(true);
        expect(searchResponse.body.data.nodeTemplates.length).toBeGreaterThanOrEqual(test.expectedMin);
        console.log(`   Search "${JSON.stringify(test.query)}" found ${searchResponse.body.data.nodeTemplates.length} templates`);
      }

      console.log('\n🎉 End-to-End Template Workflow Completed Successfully!');
    });

    it('should handle complex multi-node template workflow', async () => {
      console.log('\n🏗️ Complex Multi-Node Template Workflow');

      // Create a complex multi-node template
      const complexTemplate = {
        name: 'Complex E2E Pipeline',
        description: 'A complex pipeline for end-to-end testing',
        category: 'data-processing',
        difficulty: 'advanced',
        tags: ['pipeline', 'complex', 'e2e', 'multi-node'],
        useCase: ['data-processing', 'automation', 'integration'],
        nodes: [
          {
            id: 'trigger-node',
            type: 'webhook',
            name: 'Webhook Trigger',
            position: { x: 100, y: 100 },
            configuration: {
              path: '/webhook/e2e-test',
              method: 'POST'
            }
          },
          {
            id: 'fetch-node',
            type: 'http',
            name: 'Fetch Data',
            position: { x: 300, y: 100 },
            configuration: {
              method: 'GET',
              url: 'https://api.example.com/data',
              headers: {
                'Authorization': 'Bearer ${token}'
              }
            }
          },
          {
            id: 'transform-node',
            type: 'transformer',
            name: 'Transform Data',
            position: { x: 500, y: 100 },
            configuration: {
              transformType: 'map',
              mapping: {
                'input.name': 'output.fullName',
                'input.email': 'output.emailAddress'
              }
            }
          },
          {
            id: 'condition-node',
            type: 'condition',
            name: 'Check Data Quality',
            position: { x: 700, y: 100 },
            configuration: {
              condition: '${data.length} > 0',
              type: 'javascript'
            }
          },
          {
            id: 'success-node',
            type: 'email',
            name: 'Success Notification',
            position: { x: 900, y: 50 },
            configuration: {
              to: 'admin@example.com',
              subject: 'Data Processing Success',
              template: 'success'
            }
          },
          {
            id: 'failure-node',
            type: 'email',
            name: 'Failure Notification',
            position: { x: 900, y: 150 },
            configuration: {
              to: 'admin@example.com',
              subject: 'Data Processing Failed',
              template: 'failure'
            }
          }
        ],
        connections: [
          { from: 'trigger-node', to: 'fetch-node' },
          { from: 'fetch-node', to: 'transform-node' },
          { from: 'transform-node', to: 'condition-node' },
          { from: 'condition-node', to: 'success-node' },
          { from: 'condition-node', to: 'failure-node' }
        ]
      };

      // Step 1: Create the complex template
      const createResponse = await request(app)
        .post('/api/templates/custom')
        .send(complexTemplate)
        .expect(200);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.nodes).toHaveLength(6);
      expect(createResponse.body.data.connections).toHaveLength(5);
      console.log(`   Created complex template with ${createResponse.body.data.nodes.length} nodes`);

      // Step 2: Fork the complex template
      mockWorkflowModel.create.mockResolvedValue({
        id: 67890,
        name: 'Complex E2E Workflow',
        description: 'Complex workflow from E2E template',
        userId: 1,
        nodes: complexTemplate.nodes,
        connections: complexTemplate.connections,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        toJSON: () => ({
          id: 67890,
          name: 'Complex E2E Workflow',
          nodes: complexTemplate.nodes,
          connections: complexTemplate.connections
        })
      } as any);

      const forkResponse = await request(app)
        .post(`/api/templates/fork/${createResponse.body.data.templateId}`)
        .send({
          workflowName: 'Complex E2E Workflow',
          userId: 1
        })
        .expect(200);

      expect(forkResponse.body.success).toBe(true);
      expect(forkResponse.body.data.nodes).toHaveLength(6);
      expect(forkResponse.body.data.connections).toHaveLength(5);
      console.log(`   Forked to workflow with ID: ${forkResponse.body.data.workflowId}`);

      // Step 3: Validate the workflow structure
      const workflow = forkResponse.body.data;
      
      // Check trigger node
      const triggerNode = workflow.nodes.find((n: any) => n.type === 'webhook');
      expect(triggerNode).toBeDefined();
      expect(triggerNode.configuration.path).toBe('/webhook/e2e-test');
      
      // Check connections form a proper flow
      const connections = workflow.connections;
      expect(connections.some((c: any) => c.from === 'trigger-node' && c.to === 'fetch-node')).toBe(true);
      expect(connections.some((c: any) => c.from === 'condition-node' && c.to === 'success-node')).toBe(true);
      
      console.log('   ✅ Workflow structure validated successfully');

      console.log('\n🎉 Complex Multi-Node Template Workflow Completed!');
    });

    it('should handle template analytics and statistics', async () => {
      console.log('\n📊 Template Analytics Workflow');

      // Step 1: Create multiple templates for analytics
      const templates = [
        {
          name: 'Analytics Template 1',
          category: 'integration',
          difficulty: 'beginner',
          tags: ['api', 'http'],
          nodes: [{ id: 'n1', type: 'http', name: 'HTTP', position: { x: 0, y: 0 }, configuration: {} }],
          connections: []
        },
        {
          name: 'Analytics Template 2',
          category: 'integration',
          difficulty: 'intermediate',
          tags: ['database', 'sql'],
          nodes: [{ id: 'n1', type: 'database', name: 'DB', position: { x: 0, y: 0 }, configuration: {} }],
          connections: []
        },
        {
          name: 'Analytics Template 3',
          category: 'communication',
          difficulty: 'beginner',
          tags: ['email', 'notification'],
          nodes: [{ id: 'n1', type: 'email', name: 'Email', position: { x: 0, y: 0 }, configuration: {} }],
          connections: []
        }
      ];

      for (const template of templates) {
        await request(app)
          .post('/api/templates/custom')
          .send(template)
          .expect(200);
      }

      console.log(`   Created ${templates.length} templates for analytics`);

      // Step 2: Get categories
      const categoriesResponse = await request(app)
        .get('/api/templates/categories')
        .expect(200);

      expect(categoriesResponse.body.success).toBe(true);
      const categories = categoriesResponse.body.data;
      expect(categories).toContain('integration');
      expect(categories).toContain('communication');
      console.log(`   Available categories: ${categories.join(', ')}`);

      // Step 3: Get tags
      const tagsResponse = await request(app)
        .get('/api/templates/tags')
        .expect(200);

      expect(tagsResponse.body.success).toBe(true);
      const tags = tagsResponse.body.data;
      expect(tags).toContain('api');
      expect(tags).toContain('database');
      expect(tags).toContain('email');
      console.log(`   Available tags: ${tags.join(', ')}`);

      // Step 4: Test category filtering
      const integrationResponse = await request(app)
        .get('/api/templates')
        .query({ category: 'integration' })
        .expect(200);

      const integrationTemplates = integrationResponse.body.data.nodeTemplates.filter(
        (t: any) => t.category === 'integration'
      );
      expect(integrationTemplates.length).toBeGreaterThanOrEqual(2);
      console.log(`   Integration templates found: ${integrationTemplates.length}`);

      // Step 5: Test difficulty filtering
      const beginnerResponse = await request(app)
        .get('/api/templates')
        .query({ difficulty: 'beginner' })
        .expect(200);

      const beginnerTemplates = beginnerResponse.body.data.nodeTemplates.filter(
        (t: any) => t.difficulty === 'beginner'
      );
      expect(beginnerTemplates.length).toBeGreaterThanOrEqual(2);
      console.log(`   Beginner templates found: ${beginnerTemplates.length}`);

      console.log('\n📈 Template Analytics Workflow Completed!');
    });
  });

  describe('Error Handling Workflows', () => {
    it('should handle template creation errors gracefully', async () => {
      console.log('\n🚨 Error Handling Workflow');

      // Test invalid template creation
      const invalidTemplate = {
        name: '', // Empty name
        description: 'Invalid template',
        nodes: [], // No nodes
        connections: []
      };

      const errorResponse = await request(app)
        .post('/api/templates/custom')
        .send(invalidTemplate)
        .expect(400);

      expect(errorResponse.body.success).toBe(false);
      expect(errorResponse.body.error).toContain('name');
      console.log(`   ✅ Handled empty name error: ${errorResponse.body.error}`);

      // Test template with no nodes
      const noNodesTemplate = {
        name: 'No Nodes Template',
        description: 'Template without nodes',
        nodes: [],
        connections: []
      };

      const noNodesResponse = await request(app)
        .post('/api/templates/custom')
        .send(noNodesTemplate)
        .expect(400);

      expect(noNodesResponse.body.success).toBe(false);
      expect(noNodesResponse.body.error).toContain('at least one node');
      console.log(`   ✅ Handled no nodes error: ${noNodesResponse.body.error}`);

      // Test forking non-existent template
      const forkErrorResponse = await request(app)
        .post('/api/templates/fork/non-existent-template')
        .send({
          workflowName: 'Test Workflow',
          userId: 1
        })
        .expect(404);

      expect(forkErrorResponse.body.success).toBe(false);
      expect(forkErrorResponse.body.error).toBe('Template not found');
      console.log(`   ✅ Handled non-existent template fork: ${forkErrorResponse.body.error}`);

      console.log('\n✅ Error Handling Workflow Completed!');
    });

    it('should recover from database errors', async () => {
      console.log('\n💾 Database Error Recovery Workflow');

      // Mock database failure
      mockWorkflowModel.create.mockRejectedValue(new Error('Database connection failed'));

      const forkResponse = await request(app)
        .post('/api/templates/fork/http-request')
        .send({
          workflowName: 'DB Error Test',
          userId: 1
        })
        .expect(500);

      expect(forkResponse.body.success).toBe(false);
      expect(forkResponse.body.error).toContain('Failed to create workflow');
      console.log(`   ✅ Handled database error gracefully: ${forkResponse.body.error}`);

      // Reset mock for successful operation
      mockWorkflowModel.create.mockResolvedValue({
        id: 999,
        name: 'Recovery Test',
        toJSON: () => ({ id: 999, name: 'Recovery Test' })
      } as any);

      const recoveryResponse = await request(app)
        .post('/api/templates/fork/http-request')
        .send({
          workflowName: 'DB Recovery Test',
          userId: 1
        })
        .expect(200);

      expect(recoveryResponse.body.success).toBe(true);
      console.log(`   ✅ Recovered from database error successfully`);

      console.log('\n🔧 Database Error Recovery Workflow Completed!');
    });
  });
});