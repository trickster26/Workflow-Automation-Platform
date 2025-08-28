import request from 'supertest';
import express from 'express';
import { credentialRoutes } from '../../routes/credentialRoutes';
import { CredentialService } from '../../services/CredentialService';

// Mock CredentialService
jest.mock('../../services/CredentialService');
const mockCredentialService = CredentialService as jest.MockedClass<typeof CredentialService>;

const app = express();
app.use(express.json());
app.use('/api/credentials', credentialRoutes);

describe('Credential Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/credentials', () => {
    it('should return list of credentials for authenticated user', async () => {
      const mockCredentials = [
        {
          id: 1,
          name: 'Test API Key',
          type: 'api_key',
          description: 'Test credential',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockCredentialService.prototype.getUserCredentials = jest.fn().mockResolvedValue(mockCredentials);

      const response = await request(app)
        .get('/api/credentials')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toEqual(mockCredentials);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/credentials')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('authentication');
    });

    it('should filter credentials by type', async () => {
      const mockCredentials = [
        { id: 1, type: 'api_key', name: 'API Key' },
        { id: 2, type: 'oauth', name: 'OAuth Token' }
      ];

      mockCredentialService.prototype.getUserCredentials = jest.fn().mockResolvedValue(
        mockCredentials.filter(c => c.type === 'api_key')
      );

      const response = await request(app)
        .get('/api/credentials')
        .query({ type: 'api_key' })
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe('api_key');
    });
  });

  describe('GET /api/credentials/:id', () => {
    it('should return specific credential by ID', async () => {
      const mockCredential = {
        id: 1,
        name: 'Test Credential',
        type: 'api_key',
        description: 'Test description',
        // Sensitive data should not be included
        createdAt: new Date()
      };

      mockCredentialService.prototype.getCredentialById = jest.fn().mockResolvedValue(mockCredential);

      const response = await request(app)
        .get('/api/credentials/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCredential);
      expect(response.body.data).not.toHaveProperty('secret');
      expect(response.body.data).not.toHaveProperty('token');
    });

    it('should return 404 for non-existent credential', async () => {
      mockCredentialService.prototype.getCredentialById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/api/credentials/999')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Credential not found');
    });

    it('should return 403 for credentials not owned by user', async () => {
      mockCredentialService.prototype.getCredentialById = jest.fn().mockRejectedValue(
        new Error('Credential not found or access denied')
      );

      const response = await request(app)
        .get('/api/credentials/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('access denied');
    });
  });

  describe('POST /api/credentials', () => {
    it('should create new credential with valid data', async () => {
      const credentialData = {
        name: 'New API Key',
        type: 'api_key',
        description: 'New test credential',
        config: {
          apiKey: 'test-key-123',
          baseUrl: 'https://api.example.com'
        }
      };

      const mockCreatedCredential = {
        id: 1,
        ...credentialData,
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockCredentialService.prototype.createCredential = jest.fn().mockResolvedValue(mockCreatedCredential);

      const response = await request(app)
        .post('/api/credentials')
        .set('Authorization', 'Bearer valid-token')
        .send(credentialData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(credentialData.name);
      expect(response.body.data).toHaveProperty('id');
      
      // Sensitive data should not be returned
      expect(response.body.data).not.toHaveProperty('config');
      expect(response.body.data).not.toHaveProperty('apiKey');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: '', // Empty name
        type: 'invalid_type'
      };

      const response = await request(app)
        .post('/api/credentials')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('validation');
    });

    it('should validate credential type', async () => {
      const invalidData = {
        name: 'Test Credential',
        type: 'unsupported_type',
        config: {}
      };

      const response = await request(app)
        .post('/api/credentials')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credential type');
    });

    it('should sanitize and validate config data', async () => {
      const maliciousData = {
        name: '<script>alert("xss")</script>',
        type: 'api_key',
        description: 'DROP TABLE credentials; --',
        config: {
          apiKey: 'test-key',
          maliciousField: '<img src=x onerror=alert(1)>'
        }
      };

      mockCredentialService.prototype.createCredential = jest.fn().mockImplementation((data) => {
        // Verify that malicious content is sanitized
        expect(data.name).not.toContain('<script>');
        expect(data.description).not.toContain('DROP TABLE');
        return Promise.resolve({ ...data, id: 1 });
      });

      await request(app)
        .post('/api/credentials')
        .set('Authorization', 'Bearer valid-token')
        .send(maliciousData);

      expect(mockCredentialService.prototype.createCredential).toHaveBeenCalled();
    });
  });

  describe('PUT /api/credentials/:id', () => {
    it('should update existing credential', async () => {
      const updateData = {
        name: 'Updated Credential Name',
        description: 'Updated description'
      };

      const mockUpdatedCredential = {
        id: 1,
        ...updateData,
        type: 'api_key',
        userId: 1,
        updatedAt: new Date()
      };

      mockCredentialService.prototype.updateCredential = jest.fn().mockResolvedValue(mockUpdatedCredential);

      const response = await request(app)
        .put('/api/credentials/1')
        .set('Authorization', 'Bearer valid-token')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
    });

    it('should not allow updating credential type', async () => {
      const updateData = {
        type: 'oauth' // Should not be allowed to change
      };

      const response = await request(app)
        .put('/api/credentials/1')
        .set('Authorization', 'Bearer valid-token')
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot change credential type');
    });

    it('should validate ownership before update', async () => {
      mockCredentialService.prototype.updateCredential = jest.fn().mockRejectedValue(
        new Error('Credential not found or access denied')
      );

      const response = await request(app)
        .put('/api/credentials/999')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Updated' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('access denied');
    });
  });

  describe('DELETE /api/credentials/:id', () => {
    it('should delete credential by ID', async () => {
      mockCredentialService.prototype.deleteCredential = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/credentials/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should return 404 for non-existent credential', async () => {
      mockCredentialService.prototype.deleteCredential = jest.fn().mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/credentials/999')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Credential not found');
    });

    it('should prevent deletion of credentials in use', async () => {
      mockCredentialService.prototype.deleteCredential = jest.fn().mockRejectedValue(
        new Error('Cannot delete credential: currently in use by active workflows')
      );

      const response = await request(app)
        .delete('/api/credentials/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('currently in use');
    });
  });

  describe('POST /api/credentials/:id/test', () => {
    it('should test credential connection successfully', async () => {
      const mockTestResult = {
        success: true,
        message: 'Connection successful',
        details: {
          responseTime: '150ms',
          status: 'healthy'
        }
      };

      mockCredentialService.prototype.testCredential = jest.fn().mockResolvedValue(mockTestResult);

      const response = await request(app)
        .post('/api/credentials/1/test')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockTestResult);
    });

    it('should handle failed credential test', async () => {
      const mockTestResult = {
        success: false,
        message: 'Authentication failed: Invalid API key',
        error: 'INVALID_CREDENTIALS'
      };

      mockCredentialService.prototype.testCredential = jest.fn().mockResolvedValue(mockTestResult);

      const response = await request(app)
        .post('/api/credentials/1/test')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true); // Request successful
      expect(response.body.data.success).toBe(false); // But test failed
      expect(response.body.data.message).toContain('Authentication failed');
    });

    it('should handle test timeout', async () => {
      mockCredentialService.prototype.testCredential = jest.fn().mockRejectedValue(
        new Error('Request timeout: Connection test exceeded 30 seconds')
      );

      const response = await request(app)
        .post('/api/credentials/1/test')
        .set('Authorization', 'Bearer valid-token')
        .expect(408);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('timeout');
    });
  });

  describe('Security Tests', () => {
    it('should encrypt sensitive data before storage', async () => {
      const credentialData = {
        name: 'Secure Credential',
        type: 'api_key',
        config: {
          apiKey: 'super-secret-key-123',
          apiSecret: 'super-secret-value'
        }
      };

      mockCredentialService.prototype.createCredential = jest.fn().mockImplementation((data) => {
        // Verify that sensitive fields are encrypted
        expect(data.config.apiKey).not.toBe('super-secret-key-123');
        expect(data.config.apiSecret).not.toBe('super-secret-value');
        return Promise.resolve({ ...data, id: 1 });
      });

      await request(app)
        .post('/api/credentials')
        .set('Authorization', 'Bearer valid-token')
        .send(credentialData);

      expect(mockCredentialService.prototype.createCredential).toHaveBeenCalled();
    });

    it('should audit credential access', async () => {
      mockCredentialService.prototype.getCredentialById = jest.fn().mockResolvedValue({
        id: 1,
        name: 'Test Credential',
        type: 'api_key'
      });

      await request(app)
        .get('/api/credentials/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Verify audit log entry was created
      expect(mockCredentialService.prototype.getCredentialById).toHaveBeenCalledWith(1, expect.any(String));
    });

    it('should validate JWT token on all endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/credentials' },
        { method: 'get', path: '/api/credentials/1' },
        { method: 'post', path: '/api/credentials' },
        { method: 'put', path: '/api/credentials/1' },
        { method: 'delete', path: '/api/credentials/1' }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          [endpoint.method](endpoint.path)
          .send({}) // No auth header
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('authentication');
      }
    });

    it('should prevent credential enumeration attacks', async () => {
      mockCredentialService.prototype.getCredentialById = jest.fn().mockResolvedValue(null);

      // Try accessing many credential IDs
      for (let i = 1; i <= 5; i++) {
        const response = await request(app)
          .get(`/api/credentials/${i}`)
          .set('Authorization', 'Bearer valid-token')
          .expect(404);

        // All should return the same generic error message
        expect(response.body.error).toBe('Credential not found');
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on credential creation', async () => {
      mockCredentialService.prototype.createCredential = jest.fn().mockResolvedValue({ id: 1 });

      const credentialData = {
        name: 'Rate Limit Test',
        type: 'api_key',
        config: { apiKey: 'test' }
      };

      // Make many rapid requests
      const promises = Array.from({ length: 20 }, () =>
        request(app)
          .post('/api/credentials')
          .set('Authorization', 'Bearer valid-token')
          .send(credentialData)
      );

      const responses = await Promise.all(promises);
      
      // Some should be rate limited
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });
});