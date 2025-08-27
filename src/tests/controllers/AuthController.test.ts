import { Request, Response } from 'express';
import { AuthController } from '../../controllers/AuthController';
import { authService } from '../../services/AuthService';
import { User as UserModel } from '../../models';

// Mock dependencies
jest.mock('../../services/AuthService');
jest.mock('../../models');
jest.mock('../../utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockUserModel = UserModel as jest.Mocked<typeof UserModel>;

describe('AuthController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockSend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockJson = jest.fn();
    mockSend = jest.fn();
    mockStatus = jest.fn().mockReturnValue({
      json: mockJson,
      send: mockSend,
    });

    mockResponse = {
      status: mockStatus,
      json: mockJson,
      send: mockSend,
    };

    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: undefined,
    };
  });

  describe('register', () => {
    it('should register user successfully', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const mockResult = {
        user: {
          id: '1',
          email: 'test@example.com',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
        },
        emailVerificationToken: 'token123',
        message: 'Registration successful',
      };

      mockAuthService.register.mockResolvedValue(mockResult);

      await AuthController.register(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.register).toHaveBeenCalledWith({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
      });
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Registration successful',
        user: mockResult.user,
        emailVerificationToken: mockResult.emailVerificationToken,
      });
    });

    it('should return 400 for missing required fields', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        // Missing username and password
      };

      await AuthController.register(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Missing required fields',
        message: 'Email, username, and password are required',
      });
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid email format', async () => {
      mockRequest.body = {
        email: 'invalid-email',
        username: 'testuser',
        password: 'password123',
      };

      await AuthController.register(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid email',
        message: 'Please provide a valid email address',
      });
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid username', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        username: 'ab', // Too short
        password: 'password123',
      };

      await AuthController.register(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid username',
        message: 'Username must be 3-50 characters and contain only letters, numbers, underscores, and hyphens',
      });
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('should handle registration service errors', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      mockAuthService.register.mockRejectedValue(new Error('User already exists'));

      await AuthController.register(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Registration failed',
        message: 'User already exists',
      });
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockResult = {
        user: {
          id: '1',
          email: 'test@example.com',
          username: 'testuser',
        },
        tokens: {
          accessToken: 'access_token',
          refreshToken: 'refresh_token',
          expiresIn: 3600,
          tokenType: 'Bearer' as const,
        },
      };

      mockAuthService.login.mockResolvedValue(mockResult);

      await AuthController.login(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        user: mockResult.user,
        tokens: mockResult.tokens,
      });
    });

    it('should return 400 for missing credentials', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        // Missing password
      };

      await AuthController.login(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Missing credentials',
        message: 'Email and password are required',
      });
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should handle login service errors', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      await AuthController.login(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Authentication failed',
        message: 'Invalid credentials',
      });
    });

    it('should handle two-factor authentication requirement', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockResult = {
        user: {
          id: '1',
          email: 'test@example.com',
        },
        tokens: null as any,
        requiresTwoFactor: true,
        tempToken: 'temp_token_123',
      };

      mockAuthService.login.mockResolvedValue(mockResult);

      await AuthController.login(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Two-factor authentication required',
        requiresTwoFactor: true,
        tempToken: 'temp_token_123',
      });
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const mockAuthenticatedRequest = {
        ...mockRequest,
        user: {
          userId: '1',
          sessionId: 'session123',
        },
      };

      mockAuthService.logout.mockResolvedValue({
        success: true,
        message: 'Logged out successfully',
      });

      await AuthController.logout(mockAuthenticatedRequest as any, mockResponse as Response);

      expect(mockAuthService.logout).toHaveBeenCalledWith('session123');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully',
      });
    });

    it('should handle logout service errors', async () => {
      const mockAuthenticatedRequest = {
        ...mockRequest,
        user: {
          userId: '1',
          sessionId: 'session123',
        },
      };

      mockAuthService.logout.mockRejectedValue(new Error('Logout failed'));

      await AuthController.logout(mockAuthenticatedRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Logout failed',
        message: 'Logout failed',
      });
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      mockRequest.body = {
        refreshToken: 'valid_refresh_token',
      };

      const mockResult = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        expiresIn: 3600,
        tokenType: 'Bearer' as const,
      };

      mockAuthService.refreshToken.mockResolvedValue(mockResult);

      await AuthController.refreshToken(mockRequest as Request, mockResponse as Response);

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('valid_refresh_token');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        tokens: mockResult,
      });
    });

    it('should return 400 for missing refresh token', async () => {
      mockRequest.body = {};

      await AuthController.refreshToken(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Missing refresh token',
        message: 'Refresh token is required',
      });
      expect(mockAuthService.refreshToken).not.toHaveBeenCalled();
    });

    it('should handle refresh token service errors', async () => {
      mockRequest.body = {
        refreshToken: 'invalid_refresh_token',
      };

      mockAuthService.refreshToken.mockRejectedValue(new Error('Invalid refresh token'));

      await AuthController.refreshToken(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Token refresh failed',
        message: 'Invalid refresh token',
      });
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockAuthenticatedRequest = {
        ...mockRequest,
        body: {
          oldPassword: 'oldPassword123',
          newPassword: 'newPassword123',
        },
        user: {
          userId: '1',
        },
      };

      mockAuthService.changePassword.mockResolvedValue({
        success: true,
        message: 'Password changed successfully',
      });

      await AuthController.changePassword(mockAuthenticatedRequest as any, mockResponse as Response);

      expect(mockAuthService.changePassword).toHaveBeenCalledWith('1', 'oldPassword123', 'newPassword123');
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: 'Password changed successfully',
      });
    });

    it('should return 400 for missing passwords', async () => {
      const mockAuthenticatedRequest = {
        ...mockRequest,
        body: {
          oldPassword: 'oldPassword123',
          // Missing newPassword
        },
        user: {
          userId: '1',
        },
      };

      await AuthController.changePassword(mockAuthenticatedRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Missing required fields',
        message: 'Both old and new passwords are required',
      });
      expect(mockAuthService.changePassword).not.toHaveBeenCalled();
    });

    it('should handle change password service errors', async () => {
      const mockAuthenticatedRequest = {
        ...mockRequest,
        body: {
          oldPassword: 'wrongOldPassword',
          newPassword: 'newPassword123',
        },
        user: {
          userId: '1',
        },
      };

      mockAuthService.changePassword.mockRejectedValue(new Error('Current password is incorrect'));

      await AuthController.changePassword(mockAuthenticatedRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Password change failed',
        message: 'Current password is incorrect',
      });
    });
  });

  describe('getProfile', () => {
    it('should get user profile successfully', async () => {
      const mockAuthenticatedRequest = {
        ...mockRequest,
        user: {
          userId: '1',
        },
      };

      const mockUser = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        status: 'active',
        createdAt: new Date(),
        toJSON: jest.fn().mockReturnValue({
          id: '1',
          email: 'test@example.com',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          role: 'user',
          status: 'active',
        }),
      };

      mockUserModel.findByPk.mockResolvedValue(mockUser as any);

      await AuthController.getProfile(mockAuthenticatedRequest as any, mockResponse as Response);

      expect(mockUserModel.findByPk).toHaveBeenCalledWith('1', {
        attributes: { exclude: ['password', 'twoFactorSecret'] },
      });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        user: expect.objectContaining({
          id: '1',
          email: 'test@example.com',
          username: 'testuser',
        }),
      });
    });

    it('should return 404 for non-existent user', async () => {
      const mockAuthenticatedRequest = {
        ...mockRequest,
        user: {
          userId: '999',
        },
      };

      mockUserModel.findByPk.mockResolvedValue(null);

      await AuthController.getProfile(mockAuthenticatedRequest as any, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'User not found',
        message: 'User profile not found',
      });
    });
  });
});