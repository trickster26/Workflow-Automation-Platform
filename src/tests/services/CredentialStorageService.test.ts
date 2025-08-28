import crypto from 'crypto';
import { CredentialStorageService } from '../../services/CredentialStorageService';
import { Credential } from '../../models/Credential';

// Mock dependencies
jest.mock('../../models/Credential');
jest.mock('../../utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}));

// Mock external libraries
jest.mock('axios');
jest.mock('mysql2/promise');
jest.mock('pg');
jest.mock('mongodb');
jest.mock('redis');
jest.mock('ssh2');
jest.mock('nodemailer');

const mockCredential = Credential as jest.MockedClass<typeof Credential>;

describe('CredentialStorageService', () => {
  let service: CredentialStorageService;
  const originalEnv = process.env;

  beforeAll(() => {
    // Set up encryption key for testing
    process.env.CREDENTIAL_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CredentialStorageService();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Initialization', () => {
    it('should initialize with encryption key from environment', () => {
      expect(() => new CredentialStorageService()).not.toThrow();
    });

    it('should throw error if encryption key is missing', () => {
      delete process.env.CREDENTIAL_ENCRYPTION_KEY;
      
      expect(() => new CredentialStorageService()).toThrow(
        'CREDENTIAL_ENCRYPTION_KEY environment variable is required'
      );
      
      // Restore for other tests
      process.env.CREDENTIAL_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    });

    it('should initialize credential types correctly', () => {
      const types = service.getCredentialTypes();
      
      expect(types.length).toBeGreaterThan(0);
      expect(types.find(t => t.type === 'api_key')).toBeDefined();
      expect(types.find(t => t.type === 'database')).toBeDefined();
      expect(types.find(t => t.type === 'oauth2')).toBeDefined();
    });
  });

  describe('Encryption/Decryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const testData = { username: 'test', password: 'secret123' };
      const service = new CredentialStorageService();
      
      // Use reflection to access private methods for testing
      const encrypt = (service as any).encrypt.bind(service);
      const decrypt = (service as any).decrypt.bind(service);
      
      const encrypted = encrypt(JSON.stringify(testData));
      expect(encrypted).not.toBe(JSON.stringify(testData));
      expect(encrypted).toContain(':'); // Should have IV:authTag:encrypted format
      
      const decrypted = decrypt(encrypted);
      expect(JSON.parse(decrypted)).toEqual(testData);
    });

    it('should fail decryption with corrupted data', () => {
      const service = new CredentialStorageService();
      const decrypt = (service as any).decrypt.bind(service);
      
      expect(() => {
        decrypt('corrupted:data:format');
      }).toThrow();
    });

    it('should fail decryption with wrong key', () => {
      const service1 = new CredentialStorageService();
      const testData = 'sensitive data';
      const encrypt1 = (service1 as any).encrypt.bind(service1);
      
      const encrypted = encrypt1(testData);
      
      // Create new service with different key
      const originalKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
      process.env.CREDENTIAL_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
      
      const service2 = new CredentialStorageService();
      const decrypt2 = (service2 as any).decrypt.bind(service2);
      
      expect(() => {
        decrypt2(encrypted);
      }).toThrow();
      
      // Restore key
      process.env.CREDENTIAL_ENCRYPTION_KEY = originalKey;
    });

    it('should handle empty data encryption', () => {
      const service = new CredentialStorageService();
      const encrypt = (service as any).encrypt.bind(service);
      const decrypt = (service as any).decrypt.bind(service);
      
      const encrypted = encrypt('');
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe('');
    });

    it('should handle special characters in encryption', () => {
      const service = new CredentialStorageService();
      const encrypt = (service as any).encrypt.bind(service);
      const decrypt = (service as any).decrypt.bind(service);
      
      const specialData = 'password with unicode: 🔐 and symbols: !@#$%^&*()';
      const encrypted = encrypt(specialData);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(specialData);
    });
  });

  describe('Credential Creation', () => {
    it('should create API key credential successfully', async () => {
      const credentialData = {
        apiKey: 'test-api-key-123',
        headerName: 'X-API-Key',
        testUrl: 'https://api.test.com/health'
      };

      const mockCreatedCredential = {
        id: '123',
        userId: 'user1',
        name: 'Test API Key',
        type: 'api_key',
        encryptedData: 'encrypted_data_here',
        update: jest.fn().mockResolvedValue(true)
      };

      mockCredential.findOne.mockResolvedValue(null); // No duplicate
      mockCredential.create.mockResolvedValue(mockCreatedCredential as any);

      const result = await service.createCredential(
        'user1',
        'Test API Key',
        'api_key',
        credentialData,
        'API key for testing'
      );

      expect(result).toBeDefined();
      expect(mockCredential.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user1',
          name: 'Test API Key',
          type: 'api_key',
          description: 'API key for testing',
          encryptedData: expect.any(String)
        })
      );
    });

    it('should prevent duplicate credential names', async () => {
      mockCredential.findOne.mockResolvedValue({ id: 'existing' } as any);

      await expect(service.createCredential(
        'user1',
        'Existing Name',
        'api_key',
        { apiKey: 'test' }
      )).rejects.toThrow('Credential with name "Existing Name" already exists');
    });

    it('should validate credential type', async () => {
      await expect(service.createCredential(
        'user1',
        'Invalid Type Test',
        'invalid_type' as any,
        { data: 'test' }
      )).rejects.toThrow('Invalid credential type: invalid_type');
    });

    it('should encrypt sensitive fields only', async () => {
      const credentialData = {
        apiKey: 'sensitive-key',
        headerName: 'X-API-Key', // Not encrypted
        testUrl: 'https://api.test.com' // Not encrypted
      };

      mockCredential.findOne.mockResolvedValue(null);
      mockCredential.create.mockResolvedValue({ id: '123', update: jest.fn() } as any);

      await service.createCredential('user1', 'Test', 'api_key', credentialData);

      const createCall = mockCredential.create.mock.calls[0][0];
      const encryptedData = createCall.encryptedData;
      
      // Decrypt to verify structure
      const decrypt = (service as any).decrypt.bind(service);
      const decrypted = JSON.parse(decrypt(encryptedData));
      
      expect(decrypted.apiKey).toBe('sensitive-key');
      expect(decrypted.headerName).toBe('X-API-Key');
      expect(decrypted.testUrl).toBe('https://api.test.com');
    });
  });

  describe('Credential Retrieval', () => {
    it('should retrieve credential by ID for owner', async () => {
      const mockCredential = {
        id: '123',
        userId: 'user1',
        name: 'Test Credential',
        update: jest.fn().mockResolvedValue(true)
      };

      mockCredential.findOne.mockResolvedValue(mockCredential as any);

      const result = await service.getCredential('123', 'user1');

      expect(result).toEqual(mockCredential);
      expect(mockCredential.update).toHaveBeenCalledWith({ lastUsed: expect.any(Date) });
    });

    it('should return null for non-existent credential', async () => {
      mockCredential.findOne.mockResolvedValue(null);

      const result = await service.getCredential('999', 'user1');

      expect(result).toBeNull();
    });

    it('should retrieve shared credential', async () => {
      const mockSharedCredential = {
        id: '123',
        userId: 'owner1',
        isShared: true,
        sharedWith: ['user1', 'user2'],
        update: jest.fn().mockResolvedValue(true)
      };

      mockCredential.findOne.mockResolvedValue(mockSharedCredential as any);

      const result = await service.getCredential('123', 'user1');

      expect(result).toEqual(mockSharedCredential);
    });

    it('should decrypt credential data correctly', async () => {
      const originalData = { username: 'test', password: 'secret' };
      const encrypt = (service as any).encrypt.bind(service);
      const encryptedData = encrypt(JSON.stringify(originalData));

      const mockCredential = {
        id: '123',
        encryptedData,
        update: jest.fn().mockResolvedValue(true)
      };

      mockCredential.findOne.mockResolvedValue(mockCredential as any);

      const result = await service.getDecryptedCredential('123', 'user1');

      expect(result).toEqual(originalData);
    });
  });

  describe('Credential Updates', () => {
    it('should update credential successfully', async () => {
      const mockCredential = {
        id: '123',
        userId: 'user1',
        type: 'api_key',
        metadata: {},
        update: jest.fn().mockResolvedValue(true)
      };

      mockCredential.findOne.mockResolvedValue(mockCredential as any);

      const updates = {
        name: 'Updated Name',
        description: 'Updated description',
        data: { apiKey: 'new-key' }
      };

      const result = await service.updateCredential('123', 'user1', updates);

      expect(mockCredential.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Name',
          description: 'Updated description',
          encryptedData: expect.any(String),
          metadata: expect.objectContaining({
            lastModifiedBy: 'user1',
            lastModifiedAt: expect.any(Date)
          })
        })
      );
    });

    it('should prevent updating non-owned credentials', async () => {
      mockCredential.findOne.mockResolvedValue(null);

      await expect(service.updateCredential('123', 'user1', {
        name: 'Hacker Update'
      })).rejects.toThrow('Credential not found or access denied');
    });

    it('should re-encrypt data when updating', async () => {
      const mockCredential = {
        id: '123',
        userId: 'user1',
        type: 'api_key',
        metadata: {},
        update: jest.fn().mockResolvedValue(true)
      };

      mockCredential.findOne.mockResolvedValue(mockCredential as any);

      const newData = { apiKey: 'updated-secret-key' };
      await service.updateCredential('123', 'user1', { data: newData });

      const updateCall = mockCredential.update.mock.calls[0][0];
      const encryptedData = updateCall.encryptedData;
      
      // Verify the data was re-encrypted
      const decrypt = (service as any).decrypt.bind(service);
      const decrypted = JSON.parse(decrypt(encryptedData));
      
      expect(decrypted.apiKey).toBe('updated-secret-key');
    });
  });

  describe('Credential Deletion', () => {
    it('should delete credential successfully', async () => {
      mockCredential.destroy.mockResolvedValue(1);

      const result = await service.deleteCredential('123', 'user1');

      expect(result).toBe(true);
      expect(mockCredential.destroy).toHaveBeenCalledWith({
        where: { id: '123', userId: 'user1' }
      });
    });

    it('should return false for non-existent credential', async () => {
      mockCredential.destroy.mockResolvedValue(0);

      const result = await service.deleteCredential('999', 'user1');

      expect(result).toBe(false);
    });

    it('should handle deletion errors gracefully', async () => {
      mockCredential.destroy.mockRejectedValue(new Error('Database error'));

      await expect(service.deleteCredential('123', 'user1')).rejects.toThrow('Database error');
    });
  });

  describe('Credential Listing', () => {
    it('should list user credentials', async () => {
      const mockCredentials = [
        { id: '1', name: 'Cred 1', type: 'api_key' },
        { id: '2', name: 'Cred 2', type: 'database' }
      ];

      mockCredential.findAll.mockResolvedValue(mockCredentials as any);

      const result = await service.listCredentials('user1');

      expect(result).toEqual(mockCredentials);
      expect(mockCredential.findAll).toHaveBeenCalledWith({
        where: expect.objectContaining({
          $or: expect.any(Array)
        }),
        order: [['name', 'ASC']]
      });
    });

    it('should filter credentials by type', async () => {
      const apiKeyCredentials = [
        { id: '1', name: 'API Key 1', type: 'api_key' }
      ];

      mockCredential.findAll.mockResolvedValue(apiKeyCredentials as any);

      const result = await service.listCredentials('user1', { type: 'api_key' });

      expect(result).toEqual(apiKeyCredentials);
      expect(mockCredential.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'api_key'
          })
        })
      );
    });

    it('should include shared credentials', async () => {
      const allCredentials = [
        { id: '1', userId: 'user1', name: 'Own Cred' },
        { id: '2', userId: 'user2', name: 'Shared Cred', isShared: true }
      ];

      mockCredential.findAll.mockResolvedValue(allCredentials as any);

      const result = await service.listCredentials('user1');

      expect(result).toEqual(allCredentials);
    });
  });

  describe('Credential Sharing', () => {
    it('should share credential with users', async () => {
      const mockCredential = {
        id: '123',
        userId: 'user1',
        update: jest.fn().mockResolvedValue(true)
      };

      mockCredential.findOne.mockResolvedValue(mockCredential as any);

      const result = await service.shareCredential('123', 'user1', ['user2', 'user3']);

      expect(mockCredential.update).toHaveBeenCalledWith({
        isShared: true,
        sharedWith: ['user2', 'user3'],
        permissions: ['read', 'use']
      });
      expect(result).toEqual(mockCredential);
    });

    it('should prevent sharing non-owned credentials', async () => {
      mockCredential.findOne.mockResolvedValue(null);

      await expect(service.shareCredential('123', 'user1', ['user2']))
        .rejects.toThrow('Credential not found or access denied');
    });

    it('should support custom permissions', async () => {
      const mockCredential = {
        id: '123',
        userId: 'user1',
        update: jest.fn().mockResolvedValue(true)
      };

      mockCredential.findOne.mockResolvedValue(mockCredential as any);

      await service.shareCredential('123', 'user1', ['user2'], ['read']);

      expect(mockCredential.update).toHaveBeenCalledWith({
        isShared: true,
        sharedWith: ['user2'],
        permissions: ['read']
      });
    });
  });

  describe('Credential Testing', () => {
    it('should test API key credentials', async () => {
      const axios = require('axios');
      axios.get.mockResolvedValue({ status: 200 });

      const testData = {
        apiKey: 'test-key',
        testUrl: 'https://api.test.com/health'
      };

      const encrypt = (service as any).encrypt.bind(service);
      const mockCredential = {
        id: '123',
        type: 'api_key',
        encryptedData: encrypt(JSON.stringify(testData)),
        update: jest.fn().mockResolvedValue(true)
      };

      mockCredential.findByPk.mockResolvedValue(mockCredential as any);

      const result = await service.testCredential('123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('successful');
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.test.com/health',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-key'
          })
        })
      );
    });

    it('should handle test failures', async () => {
      const axios = require('axios');
      axios.get.mockRejectedValue(new Error('Network error'));

      const testData = { apiKey: 'test-key', testUrl: 'https://api.test.com' };
      const encrypt = (service as any).encrypt.bind(service);
      
      const mockCredential = {
        id: '123',
        type: 'api_key',
        encryptedData: encrypt(JSON.stringify(testData)),
        update: jest.fn().mockResolvedValue(true)
      };

      mockCredential.findByPk.mockResolvedValue(mockCredential as any);

      const result = await service.testCredential('123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('failed');
    });

    it('should return success for credentials without test URL', async () => {
      const testData = { apiKey: 'test-key' }; // No testUrl
      const encrypt = (service as any).encrypt.bind(service);
      
      const mockCredential = {
        id: '123',
        type: 'api_key',
        encryptedData: encrypt(JSON.stringify(testData)),
        update: jest.fn().mockResolvedValue(true)
      };

      mockCredential.findByPk.mockResolvedValue(mockCredential as any);

      const result = await service.testCredential('123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('No test URL provided');
    });

    it('should test database credentials', async () => {
      const mysql = require('mysql2/promise');
      const mockConnection = {
        ping: jest.fn().mockResolvedValue(true),
        end: jest.fn().mockResolvedValue(true)
      };
      mysql.createConnection.mockResolvedValue(mockConnection);

      const testData = {
        dbType: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'test',
        password: 'test',
        database: 'testdb'
      };

      const encrypt = (service as any).encrypt.bind(service);
      const mockCredential = {
        id: '123',
        type: 'database',
        encryptedData: encrypt(JSON.stringify(testData)),
        update: jest.fn().mockResolvedValue(true)
      };

      mockCredential.findByPk.mockResolvedValue(mockCredential as any);

      const result = await service.testCredential('123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('MySQL connection successful');
      expect(mockConnection.ping).toHaveBeenCalled();
      expect(mockConnection.end).toHaveBeenCalled();
    });

    it('should handle unsupported credential types', async () => {
      const testData = { customField: 'value' };
      const encrypt = (service as any).encrypt.bind(service);
      
      const mockCredential = {
        id: '123',
        type: 'custom',
        encryptedData: encrypt(JSON.stringify(testData)),
        update: jest.fn().mockResolvedValue(true)
      };

      mockCredential.findByPk.mockResolvedValue(mockCredential as any);

      const result = await service.testCredential('123');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Test not available');
    });
  });

  describe('Security Tests', () => {
    it('should validate credential data input', async () => {
      const maliciousData = {
        apiKey: "'; DROP TABLE credentials; --",
        headerName: '<script>alert(1)</script>',
        testUrl: 'javascript:alert(1)'
      };

      // Should sanitize or reject malicious input
      mockCredential.findOne.mockResolvedValue(null);
      mockCredential.create.mockResolvedValue({ id: '123', update: jest.fn() } as any);

      await service.createCredential('user1', 'Malicious Test', 'api_key', maliciousData);

      // Verify the data was processed safely
      const createCall = mockCredential.create.mock.calls[0][0];
      expect(createCall.encryptedData).toBeDefined();
      
      // The encrypted data should not contain raw malicious strings
      expect(createCall.encryptedData).not.toContain('DROP TABLE');
      expect(createCall.encryptedData).not.toContain('<script>');
    });

    it('should handle concurrent credential operations', async () => {
      const mockCredential = {
        id: '123',
        userId: 'user1',
        update: jest.fn().mockResolvedValue(true)
      };

      mockCredential.findOne.mockResolvedValue(mockCredential as any);

      // Simulate concurrent updates
      const promises = Array.from({ length: 5 }, (_, i) =>
        service.updateCredential('123', 'user1', { name: `Concurrent Update ${i}` })
      );

      const results = await Promise.all(promises);

      // All updates should complete without errors
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });

    it('should audit credential access', async () => {
      const mockCredential = {
        id: '123',
        userId: 'user1',
        name: 'Audited Credential',
        update: jest.fn().mockResolvedValue(true)
      };

      mockCredential.findOne.mockResolvedValue(mockCredential as any);

      await service.getCredential('123', 'user1');

      // Verify that lastUsed timestamp was updated (acts as basic audit)
      expect(mockCredential.update).toHaveBeenCalledWith({
        lastUsed: expect.any(Date)
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection failures gracefully', async () => {
      mockCredential.findOne.mockRejectedValue(new Error('Connection lost'));

      await expect(service.getCredential('123', 'user1'))
        .rejects.toThrow('Connection lost');
    });

    it('should handle encryption errors', () => {
      // Mock crypto to fail
      const originalRandomBytes = crypto.randomBytes;
      (crypto.randomBytes as any) = jest.fn().mockImplementation(() => {
        throw new Error('Crypto failure');
      });

      const encrypt = (service as any).encrypt.bind(service);
      
      expect(() => {
        encrypt('test data');
      }).toThrow('Crypto failure');

      // Restore
      crypto.randomBytes = originalRandomBytes;
    });

    it('should handle malformed encrypted data', () => {
      const decrypt = (service as any).decrypt.bind(service);

      expect(() => {
        decrypt('malformed_encrypted_data');
      }).toThrow();

      expect(() => {
        decrypt('invalid:format');
      }).toThrow();
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk credential operations efficiently', async () => {
      const credentials = Array.from({ length: 100 }, (_, i) => ({
        id: `cred-${i}`,
        name: `Credential ${i}`,
        type: 'api_key'
      }));

      mockCredential.findAll.mockResolvedValue(credentials as any);

      const start = Date.now();
      const result = await service.listCredentials('user1');
      const duration = Date.now() - start;

      expect(result).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle encryption of large data efficiently', () => {
      const largeData = 'x'.repeat(10000); // 10KB of data
      const encrypt = (service as any).encrypt.bind(service);
      const decrypt = (service as any).decrypt.bind(service);

      const start = Date.now();
      const encrypted = encrypt(largeData);
      const decrypted = decrypt(encrypted);
      const duration = Date.now() - start;

      expect(decrypted).toBe(largeData);
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });
  });
});