import request from 'supertest';
import express from 'express';
import { simpleTemplateRoutes } from '../../routes/simpleTemplateRoutes';

const app = express();
app.use(express.json());
app.use('/api/templates', simpleTemplateRoutes);

describe('Additional Template Routes', () => {
  describe('GET /api/templates/nodes', () => {
    it('should return node templates specifically', async () => {
      const response = await request(app)
        .get('/api/templates/nodes')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const nodeTemplate = response.body.data[0];
        expect(nodeTemplate).toHaveProperty('templateId');
        expect(nodeTemplate).toHaveProperty('nodeType');
        expect(nodeTemplate).toHaveProperty('category');
        expect(nodeTemplate).toHaveProperty('configuration');
      }
    });

    it('should filter node templates by category', async () => {
      const response = await request(app)
        .get('/api/templates/nodes')
        .query({ category: 'trigger' })
        .expect(200);

      expect(response.body.success).toBe(true);
      const templates = response.body.data;
      
      if (templates.length > 0) {
        templates.forEach((template: any) => {
          expect(template.category).toBe('trigger');
        });
      }
    });

    it('should filter node templates by difficulty', async () => {
      const response = await request(app)
        .get('/api/templates/nodes')
        .query({ difficulty: 'beginner' })
        .expect(200);

      expect(response.body.success).toBe(true);
      const templates = response.body.data;
      
      if (templates.length > 0) {
        templates.forEach((template: any) => {
          expect(template.difficulty).toBe('beginner');
        });
      }
    });
  });

  describe('GET /api/templates/nodes/:templateId', () => {
    it('should return specific node template', async () => {
      // First get available templates to get a valid ID
      const listResponse = await request(app)
        .get('/api/templates/nodes')
        .expect(200);

      expect(listResponse.body.data.length).toBeGreaterThan(0);
      const templateId = listResponse.body.data[0].templateId;

      const response = await request(app)
        .get(`/api/templates/nodes/${templateId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('templateId', templateId);
      expect(response.body.data).toHaveProperty('nodeType');
      expect(response.body.data).toHaveProperty('configuration');
    });

    it('should return 404 for non-existent node template', async () => {
      const response = await request(app)
        .get('/api/templates/nodes/non-existent-template')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Node template not found');
    });
  });

  describe('GET /api/templates/workflows', () => {
    it('should return workflow templates', async () => {
      const response = await request(app)
        .get('/api/templates/workflows')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const workflowTemplate = response.body.data[0];
        expect(workflowTemplate).toHaveProperty('templateId');
        expect(workflowTemplate).toHaveProperty('nodes');
        expect(workflowTemplate).toHaveProperty('connections');
        expect(Array.isArray(workflowTemplate.nodes)).toBe(true);
        expect(Array.isArray(workflowTemplate.connections)).toBe(true);
      }
    });

    it('should filter workflow templates by category', async () => {
      const response = await request(app)
        .get('/api/templates/workflows')
        .query({ category: 'ecommerce' })
        .expect(200);

      expect(response.body.success).toBe(true);
      const templates = response.body.data;
      
      if (templates.length > 0) {
        templates.forEach((template: any) => {
          expect(template.category).toBe('ecommerce');
        });
      }
    });
  });

  describe('GET /api/templates/workflows/:templateId', () => {
    it('should return specific workflow template', async () => {
      // First get available workflow templates
      const listResponse = await request(app)
        .get('/api/templates/workflows')
        .expect(200);

      if (listResponse.body.data.length === 0) {
        // Skip test if no workflow templates available
        console.log('No workflow templates available for testing');
        return;
      }

      const templateId = listResponse.body.data[0].templateId;

      const response = await request(app)
        .get(`/api/templates/workflows/${templateId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('templateId', templateId);
      expect(response.body.data).toHaveProperty('nodes');
      expect(response.body.data).toHaveProperty('connections');
    });

    it('should return 404 for non-existent workflow template', async () => {
      const response = await request(app)
        .get('/api/templates/workflows/non-existent-workflow')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Workflow template not found');
    });
  });

  describe('GET /api/templates/scenarios', () => {
    it('should return scenario templates', async () => {
      const response = await request(app)
        .get('/api/templates/scenarios')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const scenarioTemplate = response.body.data[0];
        expect(scenarioTemplate).toHaveProperty('templateId');
        expect(scenarioTemplate).toHaveProperty('industry');
        expect(scenarioTemplate).toHaveProperty('scenario');
        expect(scenarioTemplate).toHaveProperty('workflow');
      }
    });

    it('should filter scenario templates by industry', async () => {
      const response = await request(app)
        .get('/api/templates/scenarios')
        .query({ industry: 'ecommerce' })
        .expect(200);

      expect(response.body.success).toBe(true);
      const templates = response.body.data;
      
      if (templates.length > 0) {
        templates.forEach((template: any) => {
          expect(template.industry).toBe('ecommerce');
        });
      }
    });
  });

  describe('GET /api/templates/search', () => {
    it('should search across all template types', async () => {
      const response = await request(app)
        .get('/api/templates/search')
        .query({ q: 'http' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('nodes');
      expect(response.body.data).toHaveProperty('workflows');
      expect(response.body.data).toHaveProperty('scenarios');
      
      // Verify search results contain the query term
      const allResults = [
        ...response.body.data.nodes,
        ...response.body.data.workflows,
        ...response.body.data.scenarios
      ];
      
      if (allResults.length > 0) {
        const containsSearchTerm = allResults.some((item: any) =>
          item.name.toLowerCase().includes('http') ||
          item.description.toLowerCase().includes('http') ||
          (item.tags && item.tags.some((tag: string) => tag.toLowerCase().includes('http')))
        );
        expect(containsSearchTerm).toBe(true);
      }
    });

    it('should support advanced search filters', async () => {
      const response = await request(app)
        .get('/api/templates/search')
        .query({
          q: 'api',
          category: 'integration',
          difficulty: 'beginner'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify filters are applied
      const allResults = [
        ...response.body.data.nodes,
        ...response.body.data.workflows,
        ...response.body.data.scenarios
      ];
      
      allResults.forEach((item: any) => {
        if (item.category) {
          expect(item.category).toBe('integration');
        }
        if (item.difficulty) {
          expect(item.difficulty).toBe('beginner');
        }
      });
    });

    it('should return empty results for non-matching search', async () => {
      const response = await request(app)
        .get('/api/templates/search')
        .query({ q: 'nonexistentquerythatmatchesnothing' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.nodes).toHaveLength(0);
      expect(response.body.data.workflows).toHaveLength(0);
      expect(response.body.data.scenarios).toHaveLength(0);
    });
  });

  describe('GET /api/templates/stats', () => {
    it('should return template statistics', async () => {
      const response = await request(app)
        .get('/api/templates/stats')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('totalNodes');
      expect(response.body.data).toHaveProperty('totalWorkflows');
      expect(response.body.data).toHaveProperty('totalScenarios');
      expect(response.body.data).toHaveProperty('byCategory');
      expect(response.body.data).toHaveProperty('byDifficulty');
      
      expect(typeof response.body.data.totalNodes).toBe('number');
      expect(typeof response.body.data.totalWorkflows).toBe('number');
      expect(typeof response.body.data.totalScenarios).toBe('number');
      expect(typeof response.body.data.byCategory).toBe('object');
      expect(typeof response.body.data.byDifficulty).toBe('object');
    });

    it('should include popular templates in stats', async () => {
      const response = await request(app)
        .get('/api/templates/stats')
        .expect(200);

      expect(response.body.data).toHaveProperty('popular');
      expect(Array.isArray(response.body.data.popular)).toBe(true);
      
      if (response.body.data.popular.length > 0) {
        const popularTemplate = response.body.data.popular[0];
        expect(popularTemplate).toHaveProperty('templateId');
        expect(popularTemplate).toHaveProperty('name');
        expect(popularTemplate).toHaveProperty('type');
      }
    });
  });

  describe('GET /api/templates/recommendations', () => {
    it('should return recommended templates', async () => {
      const response = await request(app)
        .get('/api/templates/recommendations')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('nodes');
      expect(response.body.data).toHaveProperty('workflows');
      expect(response.body.data).toHaveProperty('scenarios');
      
      expect(Array.isArray(response.body.data.nodes)).toBe(true);
      expect(Array.isArray(response.body.data.workflows)).toBe(true);
      expect(Array.isArray(response.body.data.scenarios)).toBe(true);
    });

    it('should filter recommendations by user preferences', async () => {
      const response = await request(app)
        .get('/api/templates/recommendations')
        .query({
          experience: 'beginner',
          industry: 'ecommerce',
          interests: 'api,integration'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify recommendations match preferences
      const allRecommendations = [
        ...response.body.data.nodes,
        ...response.body.data.workflows,
        ...response.body.data.scenarios
      ];
      
      if (allRecommendations.length > 0) {
        // Most should be beginner level
        const beginnerTemplates = allRecommendations.filter(
          (t: any) => t.difficulty === 'beginner'
        );
        expect(beginnerTemplates.length).toBeGreaterThan(0);
      }
    });

    it('should limit recommendation results', async () => {
      const response = await request(app)
        .get('/api/templates/recommendations')
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Recommendations should be limited to reasonable numbers
      expect(response.body.data.nodes.length).toBeLessThanOrEqual(10);
      expect(response.body.data.workflows.length).toBeLessThanOrEqual(5);
      expect(response.body.data.scenarios.length).toBeLessThanOrEqual(5);
    });
  });

  describe('POST /api/templates/workflows/:templateId/create', () => {
    it('should create workflow from template', async () => {
      // First get a workflow template
      const listResponse = await request(app)
        .get('/api/templates/workflows')
        .expect(200);

      if (listResponse.body.data.length === 0) {
        console.log('No workflow templates available for testing');
        return;
      }

      const templateId = listResponse.body.data[0].templateId;

      const response = await request(app)
        .post(`/api/templates/workflows/${templateId}/create`)
        .send({
          name: 'My Custom Workflow',
          userId: 'user123',
          customizations: {
            description: 'A customized workflow from template'
          }
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('name', 'My Custom Workflow');
      expect(response.body.data).toHaveProperty('nodes');
      expect(response.body.data).toHaveProperty('connections');
      expect(response.body.data).toHaveProperty('fromTemplate', templateId);
    });

    it('should apply customizations when creating workflow', async () => {
      const listResponse = await request(app)
        .get('/api/templates/workflows')
        .expect(200);

      if (listResponse.body.data.length === 0) {
        console.log('No workflow templates available for testing');
        return;
      }

      const templateId = listResponse.body.data[0].templateId;
      const template = listResponse.body.data[0];

      const customizations = {
        name: 'Customized Workflow',
        description: 'Custom description',
        nodeCustomizations: {},
        settings: {
          timeout: 30000
        },
        tags: ['custom', 'test']
      };

      // Add node customization if template has nodes
      if (template.nodes && template.nodes.length > 0) {
        const firstNodeId = template.nodes[0].id;
        customizations.nodeCustomizations = {
          [firstNodeId]: {
            name: 'Customized Node',
            parameters: {
              customParam: 'customValue'
            }
          }
        };
      }

      const response = await request(app)
        .post(`/api/templates/workflows/${templateId}/create`)
        .send({
          userId: 'user123',
          customizations
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(customizations.name);
      expect(response.body.data.description).toBe(customizations.description);
      expect(response.body.data.tags).toEqual(
        expect.arrayContaining(['custom', 'test'])
      );
    });

    it('should return 404 for non-existent template', async () => {
      const response = await request(app)
        .post('/api/templates/workflows/non-existent-template/create')
        .send({
          name: 'Test Workflow',
          userId: 'user123'
        })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Template not found');
    });

    it('should validate required fields', async () => {
      const listResponse = await request(app)
        .get('/api/templates/workflows')
        .expect(200);

      if (listResponse.body.data.length === 0) {
        console.log('No workflow templates available for testing');
        return;
      }

      const templateId = listResponse.body.data[0].templateId;

      const response = await request(app)
        .post(`/api/templates/workflows/${templateId}/create`)
        .send({}) // Missing required fields
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('userId');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed query parameters gracefully', async () => {
      const response = await request(app)
        .get('/api/templates/nodes')
        .query({ 
          category: ['invalid', 'array'],
          difficulty: { invalid: 'object' }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should ignore malformed parameters and return all results
    });

    it('should handle extremely long search queries', async () => {
      const longQuery = 'a'.repeat(1000);
      
      const response = await request(app)
        .get('/api/templates/search')
        .query({ q: longQuery })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should handle gracefully without crashing
    });

    it('should handle special characters in search', async () => {
      const specialQuery = "!@#$%^&*()_+{}|:<>?[];',./";
      
      const response = await request(app)
        .get('/api/templates/search')
        .query({ q: specialQuery })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should not crash on special characters
    });
  });
});