import { AuthService } from '../../services/AuthService';
import { User as UserModel } from '../../models';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../models');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

const mockUserModel = UserModel as jest.Mocked<typeof UserModel>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
  let authService: AuthService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    authService = AuthService.getInstance();
  });

  afterEach(() => {
    // Reset singleton instance
    (AuthService as any).instance = undefined;
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: '1',
        ...userData,
        password: 'hashedPassword',
        status: 'pending',
        isActive: true,
        emailVerified: false,
        save: jest.fn(),
      };

      mockUserModel.findOne.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('hashedPassword' as never);
      mockUserModel.create.mockResolvedValue(mockUser as any);

      const result = await authService.register(userData);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        where: {
          [expect.any(Symbol)]: [
            { email: userData.email },
            { username: userData.username },
          ],
        },
      });
      expect(mockBcrypt.hash).toHaveBeenCalledWith(userData.password, 12);
      expect(mockUserModel.create).toHaveBeenCalled();
      expect(result.user.email).toBe(userData.email);
      expect(result.emailVerificationToken).toBeDefined();
    });

    it('should throw error if user already exists', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      mockUserModel.findOne.mockResolvedValue({ id: '1' } as any);

      await expect(authService.register(userData)).rejects.toThrow('User already exists');
    });

    it('should throw error if password is too weak', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123',
      };

      await expect(authService.register(userData)).rejects.toThrow('Password does not meet requirements');
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: '1',
        email: loginData.email,
        password: 'hashedPassword',
        status: 'active',
        emailVerified: true,
        twoFactorEnabled: false,
        loginAttempts: 0,
        save: jest.fn(),
      };

      mockUserModel.findOne.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockJwt.sign.mockReturnValue('mockToken' as never);

      const result = await authService.login(loginData);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        where: { email: loginData.email },
      });
      expect(mockBcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
      expect(result.user.email).toBe(loginData.email);
      expect(result.tokens.accessToken).toBeDefined();
    });

    it('should fail login with invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockUserModel.findOne.mockResolvedValue({
        id: '1',
        email: loginData.email,
        password: 'hashedPassword',
        status: 'active',
        emailVerified: true,
        loginAttempts: 0,
        save: jest.fn(),
      } as any);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(authService.login(loginData)).rejects.toThrow('Invalid credentials');
    });

    it('should fail login for inactive user', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockUserModel.findOne.mockResolvedValue({
        id: '1',
        status: 'inactive',
      } as any);

      await expect(authService.login(loginData)).rejects.toThrow('Account is not active');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      const mockPayload = {
        userId: '1',
        email: 'test@example.com',
        sessionId: 'session123',
      };

      mockJwt.verify.mockReturnValue(mockPayload as never);
      
      // Mock active session
      authService['activeSessions'] = new Map([
        ['session123', {
          userId: '1',
          createdAt: new Date(),
          lastActive: new Date(),
        }],
      ]);

      const result = await authService.verifyToken('validToken');

      expect(mockJwt.verify).toHaveBeenCalledWith('validToken', expect.any(String));
      expect(result.userId).toBe('1');
    });

    it('should fail verification for invalid token', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.verifyToken('invalidToken')).rejects.toThrow('Invalid token');
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const sessionId = 'session123';
      
      authService['activeSessions'] = new Map([
        [sessionId, {
          userId: '1',
          createdAt: new Date(),
          lastActive: new Date(),
        }],
      ]);

      const result = await authService.logout(sessionId);

      expect(result.success).toBe(true);
      expect(authService['activeSessions'].has(sessionId)).toBe(false);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const userId = '1';
      const oldPassword = 'oldPassword123';
      const newPassword = 'newPassword123';

      const mockUser = {
        id: userId,
        password: 'hashedOldPassword',
        save: jest.fn(),
      };

      mockUserModel.findByPk.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockBcrypt.hash.mockResolvedValue('hashedNewPassword' as never);

      const result = await authService.changePassword(userId, oldPassword, newPassword);

      expect(mockBcrypt.compare).toHaveBeenCalledWith(oldPassword, mockUser.password);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(newPassword, 12);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should fail with incorrect old password', async () => {
      const userId = '1';
      const oldPassword = 'wrongPassword';
      const newPassword = 'newPassword123';

      const mockUser = {
        id: userId,
        password: 'hashedOldPassword',
      };

      mockUserModel.findByPk.mockResolvedValue(mockUser as any);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(authService.changePassword(userId, oldPassword, newPassword)).rejects.toThrow('Current password is incorrect');
    });
  });

  describe('validatePassword', () => {
    it('should validate strong password', () => {
      const strongPassword = 'StrongPass123!';
      
      expect(() => authService.validatePassword(strongPassword)).not.toThrow();
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        '123',
        'password',
        'PASSWORD',
        '12345678',
        'weakpass',
      ];

      weakPasswords.forEach(password => {
        expect(() => authService.validatePassword(password)).toThrow('Password does not meet requirements');
      });
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const payload = {
        userId: '1',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user',
        status: 'active',
        sessionId: 'session123',
      };

      mockJwt.sign
        .mockReturnValueOnce('accessToken' as never)
        .mockReturnValueOnce('refreshToken' as never);

      const result = authService.generateTokens(payload);

      expect(mockJwt.sign).toHaveBeenCalledTimes(2);
      expect(result.accessToken).toBe('accessToken');
      expect(result.refreshToken).toBe('refreshToken');
      expect(result.tokenType).toBe('Bearer');
    });
  });
});