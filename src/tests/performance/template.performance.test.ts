import request from 'supertest';
import express from 'express';
import { performance } from 'perf_hooks';
import { simpleTemplateRoutes } from '../../routes/simpleTemplateRoutes';

const app = express();
app.use(express.json());
app.use('/api/templates', simpleTemplateRoutes);

describe('Template Performance Tests', () => {
  describe('Load Testing', () => {
    it('should handle concurrent template requests efficiently', async () => {
      const concurrentRequests = 50;
      const startTime = performance.now();

      const promises = Array.from({ length: concurrentRequests }, () =>
        request(app).get('/api/templates').expect(200)
      );

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
      });

      // Should complete within reasonable time (less than 5 seconds for 50 requests)
      expect(totalTime).toBeLessThan(5000);

      // Average response time should be reasonable (less than 100ms per request)
      const averageTime = totalTime / concurrentRequests;
      expect(averageTime).toBeLessThan(100);

      console.log(`\n🚀 Performance Metrics:`);
      console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`   Average time per request: ${averageTime.toFixed(2)}ms`);
      console.log(`   Requests per second: ${(concurrentRequests / (totalTime / 1000)).toFixed(2)}`);
    });

    it('should handle large template creation efficiently', async () => {
      const largeTemplate = {
        name: 'Performance Test Template',
        description: 'A large template for performance testing',
        category: 'data-processing',
        difficulty: 'advanced',
        tags: Array.from({ length: 50 }, (_, i) => `tag-${i}`),
        useCase: Array.from({ length: 20 }, (_, i) => `usecase-${i}`),
        nodes: Array.from({ length: 100 }, (_, i) => ({
          id: `node-${i}`,
          type: i % 2 === 0 ? 'transformer' : 'filter',
          name: `Node ${i}`,
          position: { x: (i % 10) * 150, y: Math.floor(i / 10) * 100 },
          configuration: {
            param1: `value-${i}`,
            param2: `config-${i}`,
            complexParam: {
              nested: {
                data: Array.from({ length: 10 }, (_, j) => `item-${j}`)
              }
            }
          }
        })),
        connections: Array.from({ length: 99 }, (_, i) => ({
          from: `node-${i}`,
          to: `node-${i + 1}`
        }))
      };

      const startTime = performance.now();
      
      const response = await request(app)
        .post('/api/templates/custom')
        .send(largeTemplate)
        .expect(200);
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(response.body.data.nodes).toHaveLength(100);
      expect(response.body.data.connections).toHaveLength(99);
      expect(response.body.data.tags).toHaveLength(50);

      // Should process large template within reasonable time (less than 2 seconds)
      expect(processingTime).toBeLessThan(2000);

      console.log(`\n📊 Large Template Processing:`);
      console.log(`   Nodes: 100, Connections: 99, Tags: 50`);
      console.log(`   Processing time: ${processingTime.toFixed(2)}ms`);
    });

    it('should handle rapid template forking requests', async () => {
      const forkRequests = 20;
      const templateId = 'http-request';
      const startTime = performance.now();

      const promises = Array.from({ length: forkRequests }, (_, i) =>
        request(app)
          .post(`/api/templates/fork/${templateId}`)
          .send({
            workflowName: `Fork Test ${i}`,
            userId: 1
          })
          .expect(200)
      );

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All forks should succeed
      responses.forEach((response, i) => {
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe(`Fork Test ${i}`);
      });

      // Should handle rapid forking efficiently
      expect(totalTime).toBeLessThan(3000);
      
      const averageTime = totalTime / forkRequests;
      expect(averageTime).toBeLessThan(150);

      console.log(`\n🔀 Template Forking Performance:`);
      console.log(`   Total forks: ${forkRequests}`);
      console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`   Average time per fork: ${averageTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage Tests', () => {
    it('should handle memory efficiently during large operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Create multiple large templates
      const templates = Array.from({ length: 10 }, (_, i) => ({
        name: `Memory Test Template ${i}`,
        description: `Template ${i} for memory testing`,
        category: 'data-processing',
        difficulty: 'intermediate',
        tags: Array.from({ length: 20 }, (_, j) => `tag-${i}-${j}`),
        useCase: Array.from({ length: 10 }, (_, j) => `use-${i}-${j}`),
        nodes: Array.from({ length: 20 }, (_, j) => ({
          id: `node-${i}-${j}`,
          type: 'transformer',
          name: `Node ${i}-${j}`,
          position: { x: j * 100, y: i * 100 },
          configuration: {
            data: new Array(100).fill(`data-${i}-${j}`)
          }
        })),
        connections: Array.from({ length: 19 }, (_, j) => ({
          from: `node-${i}-${j}`,
          to: `node-${i}-${j + 1}`
        }))
      }));

      // Send all template creation requests
      const promises = templates.map(template =>
        request(app)
          .post('/api/templates/custom')
          .send(template)
          .expect(200)
      );

      await Promise.all(promises);
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseKB = memoryIncrease / 1024;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncreaseKB).toBeLessThan(50 * 1024);

      console.log(`\n💾 Memory Usage:`);
      console.log(`   Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Increase: ${(memoryIncreaseKB / 1024).toFixed(2)}MB`);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    });
  });

  describe('Search Performance Tests', () => {
    it('should handle complex search queries efficiently', async () => {
      const searchQueries = [
        { search: 'http', category: 'integration' },
        { search: 'email', difficulty: 'beginner' },
        { search: 'data', category: 'data-processing', difficulty: 'advanced' },
        { search: 'api' },
        { category: 'communication' },
        { difficulty: 'intermediate' },
        { search: 'webhook' },
        { search: 'database', category: 'database' },
        { search: 'transform', difficulty: 'advanced' },
        { search: 'notification', category: 'communication' }
      ];

      const startTime = performance.now();

      const promises = searchQueries.map(query =>
        request(app)
          .get('/api/templates')
          .query(query)
          .expect(200)
      );

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All searches should succeed
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('nodeTemplates');
      });

      // Search performance should be good
      const averageTime = totalTime / searchQueries.length;
      expect(averageTime).toBeLessThan(50);

      console.log(`\n🔍 Search Performance:`);
      console.log(`   Total queries: ${searchQueries.length}`);
      console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`   Average time per query: ${averageTime.toFixed(2)}ms`);
    });
  });

  describe('Stress Tests', () => {
    it('should maintain performance under stress', async () => {
      const stressRequests = 100;
      const batchSize = 10;
      const batches = Math.ceil(stressRequests / batchSize);
      
      let totalTime = 0;
      let successfulRequests = 0;

      for (let batch = 0; batch < batches; batch++) {
        const batchStart = performance.now();
        
        const batchPromises = Array.from({ length: batchSize }, () =>
          request(app)
            .get('/api/templates')
            .then(response => {
              if (response.status === 200) {
                successfulRequests++;
              }
              return response;
            })
            .catch(error => {
              console.error(`Request failed in batch ${batch}:`, error.message);
              return null;
            })
        );

        await Promise.all(batchPromises);
        
        const batchEnd = performance.now();
        totalTime += (batchEnd - batchStart);

        // Small delay between batches to simulate real usage
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const averageTime = totalTime / batches;
      const successRate = (successfulRequests / stressRequests) * 100;

      // Should maintain high success rate (at least 95%)
      expect(successRate).toBeGreaterThan(95);
      
      // Average batch time should be reasonable
      expect(averageTime).toBeLessThan(1000);

      console.log(`\n🏋️ Stress Test Results:`);
      console.log(`   Total requests: ${stressRequests}`);
      console.log(`   Successful requests: ${successfulRequests}`);
      console.log(`   Success rate: ${successRate.toFixed(2)}%`);
      console.log(`   Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`   Average batch time: ${averageTime.toFixed(2)}ms`);
    });
  });
});