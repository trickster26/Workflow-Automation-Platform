import request from 'supertest';
import express from 'express';
import { simpleTemplateRoutes } from '../../routes/simpleTemplateRoutes';

const app = express();
app.use(express.json());
app.use('/api/templates', simpleTemplateRoutes);

describe('Template Routes', () => {
  describe('GET /api/templates', () => {
    it('should return all templates with correct structure', async () => {
      const response = await request(app)
        .get('/api/templates')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('nodeTemplates');
      expect(response.body.data).toHaveProperty('workflowTemplates');
      expect(response.body.data).toHaveProperty('scenarioTemplates');
      
      // Validate nodeTemplates structure
      expect(Array.isArray(response.body.data.nodeTemplates)).toBe(true);
      if (response.body.data.nodeTemplates.length > 0) {
        const template = response.body.data.nodeTemplates[0];
        expect(template).toHaveProperty('templateId');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('category');
        expect(template).toHaveProperty('type');
        expect(template).toHaveProperty('icon');
        expect(template).toHaveProperty('color');
      }
    });

    it('should return templates with search functionality', async () => {
      const response = await request(app)
        .get('/api/templates?search=http')
        .expect(200);

      expect(response.body.success).toBe(true);
      const nodeTemplates = response.body.data.nodeTemplates;
      
      // Should filter templates containing 'http' in name or description
      const httpTemplates = nodeTemplates.filter((t: any) => 
        t.name.toLowerCase().includes('http') || 
        t.description.toLowerCase().includes('http')
      );
      expect(httpTemplates.length).toBeGreaterThan(0);
    });

    it('should return templates filtered by category', async () => {
      const response = await request(app)
        .get('/api/templates?category=integration')
        .expect(200);

      expect(response.body.success).toBe(true);
      const templates = response.body.data.nodeTemplates;
      
      if (templates.length > 0) {
        templates.forEach((template: any) => {
          expect(template.category).toBe('integration');
        });
      }
    });

    it('should return templates filtered by difficulty', async () => {
      const response = await request(app)
        .get('/api/templates?difficulty=beginner')
        .expect(200);

      expect(response.body.success).toBe(true);
      const templates = response.body.data.nodeTemplates;
      
      if (templates.length > 0) {
        templates.forEach((template: any) => {
          expect(template.difficulty).toBe('beginner');
        });
      }
    });
  });

  describe('GET /api/templates/:id', () => {
    it('should return specific template by ID', async () => {
      const response = await request(app)
        .get('/api/templates/http-request')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('templateId', 'http-request');
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('type', 'http');
    });

    it('should return 404 for non-existent template', async () => {
      const response = await request(app)
        .get('/api/templates/non-existent-template')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Template not found');
    });
  });

  describe('POST /api/templates/fork/:id', () => {
    it('should fork a node template successfully', async () => {
      const forkData = {
        workflowName: 'Test HTTP Workflow',
        userId: 1
      };

      const response = await request(app)
        .post('/api/templates/fork/http-request')
        .send(forkData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('workflowId');
      expect(response.body.data).toHaveProperty('name', forkData.workflowName);
    });

    it('should fork a workflow template successfully', async () => {
      const forkData = {
        workflowName: 'Test E-commerce Workflow',
        userId: 1
      };

      const response = await request(app)
        .post('/api/templates/fork/ecommerce-order-processing')
        .send(forkData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('nodes');
      expect(response.body.data).toHaveProperty('connections');
      expect(Array.isArray(response.body.data.nodes)).toBe(true);
      expect(Array.isArray(response.body.data.connections)).toBe(true);
    });

    it('should return 404 for non-existent template fork', async () => {
      const forkData = {
        workflowName: 'Test Workflow',
        userId: 1
      };

      const response = await request(app)
        .post('/api/templates/fork/non-existent')
        .send(forkData)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Template not found');
    });

    it('should validate required fields for forking', async () => {
      const response = await request(app)
        .post('/api/templates/fork/http-request')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('workflowName');
    });
  });

  describe('POST /api/templates/custom', () => {
    it('should create a custom node template', async () => {
      const customTemplate = {
        name: 'Custom HTTP Node',
        description: 'A custom HTTP request node',
        category: 'integration',
        difficulty: 'intermediate',
        tags: ['http', 'api', 'custom'],
        useCase: ['api-integration', 'data-fetch'],
        nodes: [{
          id: 'node1',
          type: 'http',
          name: 'HTTP Request',
          position: { x: 100, y: 100 },
          configuration: {
            method: 'GET',
            url: 'https://api.example.com'
          }
        }],
        connections: []
      };

      const response = await request(app)
        .post('/api/templates/custom')
        .send(customTemplate)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('templateId');
      expect(response.body.data).toHaveProperty('name', customTemplate.name);
      expect(response.body.data).toHaveProperty('isCustom', true);
    });

    it('should create a custom workflow template', async () => {
      const customWorkflow = {
        name: 'Custom Data Pipeline',
        description: 'A custom data processing pipeline',
        category: 'data-processing',
        difficulty: 'advanced',
        tags: ['data', 'pipeline', 'transform'],
        useCase: ['data-processing', 'etl'],
        nodes: [
          {
            id: 'node1',
            type: 'http',
            name: 'Fetch Data',
            position: { x: 100, y: 100 },
            configuration: { method: 'GET', url: 'https://api.data.com' }
          },
          {
            id: 'node2',
            type: 'transformer',
            name: 'Transform Data',
            position: { x: 300, y: 100 },
            configuration: { transformType: 'map' }
          }
        ],
        connections: [
          { from: 'node1', to: 'node2' }
        ]
      };

      const response = await request(app)
        .post('/api/templates/custom')
        .send(customWorkflow)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('templateId');
      expect(response.body.data.nodes).toHaveLength(2);
      expect(response.body.data.connections).toHaveLength(1);
    });

    it('should validate required fields for custom template', async () => {
      const incompleteTemplate = {
        description: 'Missing name field'
      };

      const response = await request(app)
        .post('/api/templates/custom')
        .send(incompleteTemplate)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('name');
    });

    it('should validate nodes array for custom template', async () => {
      const templateWithoutNodes = {
        name: 'Template Without Nodes',
        description: 'This template has no nodes',
        category: 'test',
        difficulty: 'beginner',
        tags: [],
        useCase: [],
        nodes: [],
        connections: []
      };

      const response = await request(app)
        .post('/api/templates/custom')
        .send(templateWithoutNodes)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('at least one node');
    });
  });

  describe('GET /api/templates/categories', () => {
    it('should return available categories', async () => {
      const response = await request(app)
        .get('/api/templates/categories')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      const categories = response.body.data;
      expect(categories).toContain('trigger');
      expect(categories).toContain('integration');
      expect(categories).toContain('data-processing');
    });
  });

  describe('GET /api/templates/tags', () => {
    it('should return available tags', async () => {
      const response = await request(app)
        .get('/api/templates/tags')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      const tags = response.body.data;
      expect(tags.length).toBeGreaterThan(0);
      expect(tags).toContain('http');
      expect(tags).toContain('api');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/templates/custom')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle server errors gracefully', async () => {
      // Mock a server error scenario
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const response = await request(app)
        .get('/api/templates/invalid-route-that-causes-error')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      
      jest.restoreAllMocks();
    });
  });
});