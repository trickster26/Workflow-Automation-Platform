import { Sequelize } from 'sequelize';
import { DatabaseNode } from '../../core/integrations/DatabaseNode';
import { CredentialService } from '../../services/CredentialService';
import { createLogger } from '../../utils/logger';

// Mock logger to avoid console spam in tests
jest.mock('../../utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}));

describe('Database Integration Tests', () => {
  let testDb: Sequelize;
  let databaseNode: DatabaseNode;
  let credentialService: CredentialService;

  beforeAll(async () => {
    // Setup test database
    testDb = new Sequelize('sqlite::memory:', {
      logging: false,
      dialect: 'sqlite'
    });

    // Test connection
    await testDb.authenticate();

    // Create test table
    await testDb.query(`
      CREATE TABLE test_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert test data
    await testDb.query(`
      INSERT INTO test_users (name, email) VALUES 
      ('John Doe', 'john@example.com'),
      ('Jane Smith', 'jane@example.com'),
      ('Bob Johnson', 'bob@example.com')
    `);

    credentialService = new CredentialService();
    databaseNode = new DatabaseNode();
  });

  afterAll(async () => {
    await testDb.close();
  });

  describe('Database Connection Tests', () => {
    it('should connect to database with valid credentials', async () => {
      const config = {
        operation: 'query',
        query: 'SELECT 1 as test',
        credentials: {
          type: 'sqlite',
          database: ':memory:',
          host: '',
          port: 0,
          username: '',
          password: ''
        }
      };

      const result = await databaseNode.execute(config, {});

      expect(result).toHaveProperty('success', true);
      expect(result.data).toEqual([{ test: 1 }]);
    });

    it('should fail with invalid credentials', async () => {
      const config = {
        operation: 'query',
        query: 'SELECT 1',
        credentials: {
          type: 'mysql',
          host: 'invalid-host',
          port: 3306,
          username: 'invalid',
          password: 'invalid',
          database: 'invalid'
        }
      };

      const result = await databaseNode.execute(config, {});

      expect(result).toHaveProperty('success', false);
      expect(result.error).toContain('Connection failed');
    });

    it('should handle connection timeouts', async () => {
      const config = {
        operation: 'query',
        query: 'SELECT 1',
        timeout: 1000, // 1 second timeout
        credentials: {
          type: 'mysql',
          host: '10.255.255.1', // Non-routable IP to force timeout
          port: 3306,
          username: 'test',
          password: 'test',
          database: 'test'
        }
      };

      const start = Date.now();
      const result = await databaseNode.execute(config, {});
      const duration = Date.now() - start;

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
      expect(duration).toBeLessThan(2000); // Should timeout within 2 seconds
    });
  });

  describe('Query Operations', () => {
    it('should execute SELECT queries correctly', async () => {
      const config = {
        operation: 'query',
        query: 'SELECT * FROM test_users WHERE name = ?',
        parameters: ['John Doe'],
        credentials: {
          type: 'sqlite',
          database: ':memory:'
        }
      };

      const result = await databaseNode.execute(config, {});

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        name: 'John Doe',
        email: 'john@example.com'
      });
    });

    it('should execute INSERT operations', async () => {
      const config = {
        operation: 'insert',
        table: 'test_users',
        data: {
          name: 'New User',
          email: 'new@example.com'
        },
        credentials: {
          type: 'sqlite',
          database: ':memory:'
        }
      };

      const result = await databaseNode.execute(config, {});

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('insertId');

      // Verify the record was inserted
      const verifyQuery = await testDb.query(
        'SELECT * FROM test_users WHERE email = "new@example.com"'
      );
      expect(verifyQuery[0]).toHaveLength(1);
    });

    it('should execute UPDATE operations', async () => {
      const config = {
        operation: 'update',
        table: 'test_users',
        data: {
          name: 'John Updated'
        },
        where: {
          email: 'john@example.com'
        },
        credentials: {
          type: 'sqlite',
          database: ':memory:'
        }
      };

      const result = await databaseNode.execute(config, {});

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('affectedRows');

      // Verify the record was updated
      const verifyQuery = await testDb.query(
        'SELECT name FROM test_users WHERE email = "john@example.com"'
      );
      expect(verifyQuery[0][0]).toMatchObject({ name: 'John Updated' });
    });

    it('should execute DELETE operations', async () => {
      const config = {
        operation: 'delete',
        table: 'test_users',
        where: {
          email: 'bob@example.com'
        },
        credentials: {
          type: 'sqlite',
          database: ':memory:'
        }
      };

      const result = await databaseNode.execute(config, {});

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('affectedRows');

      // Verify the record was deleted
      const verifyQuery = await testDb.query(
        'SELECT * FROM test_users WHERE email = "bob@example.com"'
      );
      expect(verifyQuery[0]).toHaveLength(0);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in parameters', async () => {
      const maliciousInput = "'; DROP TABLE test_users; --";

      const config = {
        operation: 'query',
        query: 'SELECT * FROM test_users WHERE name = ?',
        parameters: [maliciousInput],
        credentials: {
          type: 'sqlite',
          database: ':memory:'
        }
      };

      const result = await databaseNode.execute(config, {});

      // Query should execute safely and return no results
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);

      // Verify table still exists
      const verifyTable = await testDb.query('SELECT COUNT(*) as count FROM test_users');
      expect(verifyTable[0][0]).toHaveProperty('count');
    });

    it('should sanitize dynamic table names', async () => {
      const config = {
        operation: 'query',
        table: 'test_users; DROP TABLE test_users; --',
        query: 'SELECT * FROM {{table}}',
        credentials: {
          type: 'sqlite',
          database: ':memory:'
        }
      };

      const result = await databaseNode.execute(config, {});

      // Should fail due to invalid table name
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid table name');
    });

    it('should validate query permissions', async () => {
      const config = {
        operation: 'query',
        query: 'CREATE TABLE malicious_table (id INT)',
        readOnly: true,
        credentials: {
          type: 'sqlite',
          database: ':memory:'
        }
      };

      const result = await databaseNode.execute(config, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('DDL operations not allowed in read-only mode');
    });
  });

  describe('Transaction Management', () => {
    it('should support transaction operations', async () => {
      const config = {
        operation: 'transaction',
        queries: [
          {
            query: 'INSERT INTO test_users (name, email) VALUES (?, ?)',
            parameters: ['Transaction User 1', 'trans1@example.com']
          },
          {
            query: 'INSERT INTO test_users (name, email) VALUES (?, ?)',
            parameters: ['Transaction User 2', 'trans2@example.com']
          }
        ],
        credentials: {
          type: 'sqlite',
          database: ':memory:'
        }
      };

      const result = await databaseNode.execute(config, {});

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('transactionId');

      // Verify both records were inserted
      const verifyQuery = await testDb.query(
        'SELECT COUNT(*) as count FROM test_users WHERE email LIKE "trans%"'
      );
      expect(verifyQuery[0][0].count).toBe(2);
    });

    it('should rollback failed transactions', async () => {
      const config = {
        operation: 'transaction',
        queries: [
          {
            query: 'INSERT INTO test_users (name, email) VALUES (?, ?)',
            parameters: ['Rollback User', 'rollback@example.com']
          },
          {
            query: 'INSERT INTO test_users (name, email) VALUES (?, ?)',
            parameters: ['Duplicate Email', 'rollback@example.com'] // Duplicate email should fail
          }
        ],
        credentials: {
          type: 'sqlite',
          database: ':memory:'
        }
      };

      const result = await databaseNode.execute(config, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('UNIQUE constraint failed');

      // Verify no records were inserted due to rollback
      const verifyQuery = await testDb.query(
        'SELECT COUNT(*) as count FROM test_users WHERE email = "rollback@example.com"'
      );
      expect(verifyQuery[0][0].count).toBe(0);
    });
  });

  describe('Connection Pool Management', () => {
    it('should manage connection pools efficiently', async () => {
      const promises = [];

      // Execute multiple concurrent queries
      for (let i = 0; i < 10; i++) {
        const config = {
          operation: 'query',
          query: `SELECT ${i} as query_number`,
          credentials: {
            type: 'sqlite',
            database: ':memory:'
          }
        };

        promises.push(databaseNode.execute(config, {}));
      }

      const results = await Promise.all(promises);

      // All queries should succeed
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.data[0].query_number).toBe(index);
      });
    });

    it('should handle connection pool exhaustion', async () => {
      const config = {
        operation: 'query',
        query: 'SELECT 1',
        poolConfig: {
          max: 2, // Very small pool
          min: 1,
          acquire: 1000,
          idle: 100
        },
        credentials: {
          type: 'sqlite',
          database: ':memory:'
        }
      };

      // Try to exceed pool capacity
      const promises = Array.from({ length: 5 }, () => 
        databaseNode.execute(config, {})
      );

      const results = await Promise.all(promises);

      // Some should succeed, others might fail or be delayed
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      expect(successful.length).toBeGreaterThan(0);
      
      if (failed.length > 0) {
        failed.forEach(result => {
          expect(result.error).toContain('pool');
        });
      }
    });
  });

  describe('Data Type Handling', () => {
    it('should handle various data types correctly', async () => {
      // Create a test table with different data types
      await testDb.query(`
        CREATE TABLE test_datatypes (
          id INTEGER PRIMARY KEY,
          text_field TEXT,
          number_field NUMERIC,
          date_field DATETIME,
          boolean_field BOOLEAN,
          json_field JSON
        )
      `);

      const testData = {
        text_field: 'Test string',
        number_field: 123.45,
        date_field: new Date('2023-01-01'),
        boolean_field: true,
        json_field: JSON.stringify({ key: 'value' })
      };

      const config = {
        operation: 'insert',
        table: 'test_datatypes',
        data: testData,
        credentials: {
          type: 'sqlite',
          database: ':memory:'
        }
      };

      const result = await databaseNode.execute(config, {});

      expect(result.success).toBe(true);

      // Verify data was stored correctly
      const verifyQuery = await testDb.query('SELECT * FROM test_datatypes WHERE id = 1');
      const record = verifyQuery[0][0];

      expect(record.text_field).toBe(testData.text_field);
      expect(record.number_field).toBe(testData.number_field);
      expect(record.boolean_field).toBe(1); // SQLite stores boolean as 1/0
    });

    it('should handle NULL values properly', async () => {
      const config = {
        operation: 'insert',
        table: 'test_users',
        data: {
          name: null,
          email: 'null-test@example.com'
        },
        credentials: {
          type: 'sqlite',
          database: ':memory:'
        }
      };

      const result = await databaseNode.execute(config, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('NOT NULL constraint failed');
    });
  });

  describe('Query Result Limits', () => {
    it('should limit large result sets', async () => {
      // Insert many test records
      for (let i = 0; i < 100; i++) {
        await testDb.query(
          'INSERT INTO test_users (name, email) VALUES (?, ?)',
          [`User ${i}`, `user${i}@example.com`]
        );
      }

      const config = {
        operation: 'query',
        query: 'SELECT * FROM test_users',
        limit: 10,
        credentials: {
          type: 'sqlite',
          database: ':memory:'
        }
      };

      const result = await databaseNode.execute(config, {});

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(10);
      expect(result).toHaveProperty('hasMore', true);
    });

    it('should handle pagination correctly', async () => {
      const config = {
        operation: 'query',
        query: 'SELECT * FROM test_users ORDER BY id',
        limit: 5,
        offset: 5,
        credentials: {
          type: 'sqlite',
          database: ':memory:'
        }
      };

      const result = await databaseNode.execute(config, {});

      expect(result.success).toBe(true);
      expect(result.data.length).toBeLessThanOrEqual(5);
      expect(result.data[0].id).toBeGreaterThan(5);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database lock errors', async () => {
      // Simulate a locked database by starting a long transaction
      const connection1 = new Sequelize('sqlite::memory:', { logging: false });
      await connection1.authenticate();
      
      await connection1.query('CREATE TABLE lock_test (id INT)');
      
      // Start transaction but don't commit
      const transaction = await connection1.transaction();
      await connection1.query('INSERT INTO lock_test VALUES (1)', { transaction });

      // Try to access from another connection
      const config = {
        operation: 'query',
        query: 'SELECT * FROM lock_test',
        timeout: 1000,
        credentials: {
          type: 'sqlite',
          database: ':memory:'
        }
      };

      const result = await databaseNode.execute(config, {});

      // Should handle the lock gracefully
      expect(result.success).toBe(false);
      expect(result.error).toContain('database is locked');

      await transaction.rollback();
      await connection1.close();
    });

    it('should retry failed connections', async () => {
      const config = {
        operation: 'query',
        query: 'SELECT 1',
        retryConfig: {
          maxRetries: 3,
          retryDelay: 100
        },
        credentials: {
          type: 'mysql',
          host: 'temporary-failure-host',
          port: 3306,
          username: 'test',
          password: 'test',
          database: 'test'
        }
      };

      const start = Date.now();
      const result = await databaseNode.execute(config, {});
      const duration = Date.now() - start;

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection failed');
      expect(result).toHaveProperty('retryAttempts');
      expect(duration).toBeGreaterThan(300); // Should have tried multiple times
    });
  });
});