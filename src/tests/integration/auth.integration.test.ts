import request from 'supertest';
import { Express } from 'express';
import { sequelize } from '../../config/database';
import { User as UserModel } from '../../models';

// Mock the entire app module
const mockApp = {
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  listen: jest.fn(),
};

// Create a mock Express app for testing
const createTestApp = (): Express => {
  const express = require('express');
  const app = express();
  
  app.use(express.json());
  
  // Import actual routes
  const authRoutes = require('../../routes/auth');
  app.use('/api/auth', authRoutes);
  
  return app;
};

describe('Auth Integration Tests', () => {
  let app: Express;
  let testUser: any;

  beforeAll(async () => {
    app = createTestApp();
    
    // Setup test database
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    // Clean up database
    await UserModel.destroy({ where: {} });
    
    // Create test user
    testUser = await UserModel.create({
      email: 'test@example.com',
      username: 'testuser',
      password: '$2a$12$hashedpassword', // bcrypt hash for 'password123'
      firstName: 'Test',
      lastName: 'User',
      status: 'active',
      emailVerified: true,
      role: 'user',
      isActive: true,
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(userData.email.toLowerCase());
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.emailVerificationToken).toBeDefined();
      expect(response.body.user.password).toBeUndefined();
    });

    it('should return 400 for duplicate email', async () => {
      const userData = {
        email: testUser.email,
        username: 'differentuser',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('Registration failed');
      expect(response.body.message).toContain('already exists');
    });

    it('should return 400 for invalid email format', async () => {
      const userData = {
        email: 'invalid-email',
        username: 'testuser2',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('Invalid email');
    });

    it('should return 400 for weak password', async () => {
      const userData = {
        email: 'test2@example.com',
        username: 'testuser2',
        password: '123', // Too weak
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('Registration failed');
      expect(response.body.message).toContain('Password does not meet requirements');
    });

    it('should return 400 for missing required fields', async () => {
      const userData = {
        email: 'test@example.com',
        // Missing username and password
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully with valid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.tokens.accessToken).toBeDefined();
      expect(response.body.tokens.refreshToken).toBeDefined();
      expect(response.body.tokens.tokenType).toBe('Bearer');
      expect(response.body.user.password).toBeUndefined();
    });

    it('should return 401 for invalid password', async () => {
      const loginData = {
        email: testUser.email,
        password: 'wrongpassword',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Authentication failed');
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return 401 for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Authentication failed');
    });

    it('should return 401 for inactive user', async () => {
      // Update user to inactive
      await testUser.update({ status: 'inactive' });

      const loginData = {
        email: testUser.email,
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Authentication failed');
      expect(response.body.message).toContain('Account is not active');
    });

    it('should return 400 for missing credentials', async () => {
      const loginData = {
        email: testUser.email,
        // Missing password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.error).toBe('Missing credentials');
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    let validRefreshToken: string;

    beforeEach(async () => {
      // Get valid refresh token by logging in
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'password123',
        });

      validRefreshToken = loginResponse.body.tokens.refreshToken;
    });

    it('should refresh token successfully with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: validRefreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tokens.accessToken).toBeDefined();
      expect(response.body.tokens.refreshToken).toBeDefined();
      expect(response.body.tokens.tokenType).toBe('Bearer');
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid_refresh_token' })
        .expect(401);

      expect(response.body.error).toBe('Token refresh failed');
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Missing refresh token');
    });
  });

  describe('GET /api/auth/profile', () => {
    let validAccessToken: string;

    beforeEach(async () => {
      // Get valid access token by logging in
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'password123',
        });

      validAccessToken = loginResponse.body.tokens.accessToken;
    });

    it('should get user profile successfully with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe(testUser.id);
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.username).toBe(testUser.username);
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.user.twoFactorSecret).toBeUndefined();
    });

    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.error).toBe('Access denied');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('POST /api/auth/logout', () => {
    let validAccessToken: string;

    beforeEach(async () => {
      // Get valid access token by logging in
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'password123',
        });

      validAccessToken = loginResponse.body.tokens.accessToken;
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('successfully');
    });

    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('PUT /api/auth/change-password', () => {
    let validAccessToken: string;

    beforeEach(async () => {
      // Get valid access token by logging in
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'password123',
        });

      validAccessToken = loginResponse.body.tokens.accessToken;
    });

    it('should change password successfully with valid credentials', async () => {
      const passwordData = {
        oldPassword: 'password123',
        newPassword: 'newPassword123',
      };

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('successfully');

      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'newPassword123',
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should return 400 for incorrect old password', async () => {
      const passwordData = {
        oldPassword: 'wrongOldPassword',
        newPassword: 'newPassword123',
      };

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body.error).toBe('Password change failed');
      expect(response.body.message).toContain('incorrect');
    });

    it('should return 400 for missing fields', async () => {
      const passwordData = {
        oldPassword: 'password123',
        // Missing newPassword
      };

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
    });

    it('should return 400 for weak new password', async () => {
      const passwordData = {
        oldPassword: 'password123',
        newPassword: '123', // Too weak
      };

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .send(passwordData)
        .expect(400);

      expect(response.body.error).toBe('Password change failed');
      expect(response.body.message).toContain('Password does not meet requirements');
    });

    it('should return 401 for missing token', async () => {
      const passwordData = {
        oldPassword: 'password123',
        newPassword: 'newPassword123',
      };

      const response = await request(app)
        .put('/api/auth/change-password')
        .send(passwordData)
        .expect(401);

      expect(response.body.error).toBe('Access denied');
    });
  });
});