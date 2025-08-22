import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import { UserModel, IUser } from '../models/User.model';
import { createLogger } from '../utils/logger';
import config from '../config';

const logger = createLogger('AuthService');

export interface ITokenPayload {
  userId: string;
  email: string;
  username: string;
  role: string;
  status: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface ILoginResult {
  user: Partial<IUser>;
  tokens: IAuthTokens;
  requiresTwoFactor?: boolean;
  tempToken?: string;
}

export interface IRegistrationResult {
  user: Partial<IUser>;
  emailVerificationToken: string;
  message: string;
}

export class AuthService {
  private static instance: AuthService;
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private activeSessions: Map<string, {
    userId: string;
    createdAt: Date;
    lastActive: Date;
    ipAddress?: string;
    userAgent?: string;
  }> = new Map();

  private constructor() {
    this.jwtSecret = process.env.JWT_SECRET || config.jwtSecret || 'fallback-secret-key';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || config.jwtRefreshSecret || 'fallback-refresh-secret';
    
    if (this.jwtSecret === 'fallback-secret-key') {
      logger.warn('Using fallback JWT secret. Set JWT_SECRET environment variable for production.');
    }
    
    // Clean up expired sessions periodically
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60 * 60 * 1000); // Every hour
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public async register(userData: {
    email: string;
    username: string;
    password: string;
    firstName?: string;
    lastName?: string;
    role?: 'admin' | 'user' | 'viewer' | 'api';
  }): Promise<IRegistrationResult> {
    logger.info('Attempting user registration', {
      email: userData.email,
      username: userData.username,
    });

    try {
      // Check if user already exists
      const existingUser = await UserModel.findOne({
        where: {
          email: userData.email,
        },
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      const existingUsername = await UserModel.findOne({
        where: {
          username: userData.username,
        },
      });

      if (existingUsername) {
        throw new Error('Username already taken');
      }

      // Validate password strength
      this.validatePasswordStrength(userData.password);

      // Create user
      const user = await UserModel.create({
        ...userData,
        role: userData.role || 'user',
        status: 'pending', // Requires email verification
      });

      // Generate email verification token
      const verificationToken = user.generateEmailVerificationToken();
      await user.save();

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        username: user.username,
      });

      return {
        user: user.toSafeJSON(),
        emailVerificationToken: verificationToken,
        message: 'Registration successful. Please check your email to verify your account.',
      };
    } catch (error: any) {
      logger.error('Registration failed:', error);
      throw error;
    }
  }

  public async login(
    identifier: string, // email or username
    password: string,
    ipAddress?: string,
    userAgent?: string,
    twoFactorToken?: string
  ): Promise<ILoginResult> {
    logger.info('Login attempt', {
      identifier,
      ipAddress,
      userAgent: userAgent?.substring(0, 100),
    });

    try {
      // Find user by email or username
      const user = await UserModel.findOne({
        where: {
          $or: [
            { email: identifier },
            { username: identifier },
          ],
        } as any,
      });

      if (!user) {
        logger.warn('Login failed: user not found', { identifier });
        throw new Error('Invalid credentials');
      }

      // Check if account is locked
      if (user.isLocked()) {
        logger.warn('Login failed: account locked', { userId: user.id });
        throw new Error('Account is temporarily locked due to too many failed login attempts');
      }

      // Check if account is active
      if (user.status !== 'active') {
        logger.warn('Login failed: account not active', {
          userId: user.id,
          status: user.status,
        });
        
        if (user.status === 'pending') {
          throw new Error('Please verify your email address before logging in');
        } else if (user.status === 'suspended') {
          throw new Error('Your account has been suspended. Please contact support.');
        } else {
          throw new Error('Account is not active');
        }
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      
      if (!isValidPassword) {
        logger.warn('Login failed: invalid password', { userId: user.id });
        await user.incrementLoginAttempts();
        throw new Error('Invalid credentials');
      }

      // Check two-factor authentication
      if (user.twoFactorEnabled) {
        if (!twoFactorToken) {
          // Return temporary token for 2FA verification
          const tempToken = this.generateTempToken(user.id);
          return {
            user: user.toSafeJSON(),
            requiresTwoFactor: true,
            tempToken,
            tokens: {} as IAuthTokens,
          };
        }

        const isValidTwoFactor = this.verifyTwoFactorToken(user.twoFactorSecret!, twoFactorToken);
        if (!isValidTwoFactor) {
          logger.warn('Login failed: invalid 2FA token', { userId: user.id });
          throw new Error('Invalid two-factor authentication code');
        }
      }

      // Reset failed login attempts
      await user.resetLoginAttempts();

      // Update last login
      user.updateLastLogin(ipAddress);
      await user.save();

      // Generate session and tokens
      const sessionId = this.generateSessionId();
      const tokens = this.generateTokens(user, sessionId);

      // Store session
      this.activeSessions.set(sessionId, {
        userId: user.id,
        createdAt: new Date(),
        lastActive: new Date(),
        ipAddress,
        userAgent,
      });

      logger.info('Login successful', {
        userId: user.id,
        sessionId,
      });

      return {
        user: user.toSafeJSON(),
        tokens,
      };
    } catch (error: any) {
      logger.error('Login failed:', error);
      throw error;
    }
  }

  public async logout(sessionId: string): Promise<void> {
    logger.info('Logout request', { sessionId });

    try {
      // Remove session
      const session = this.activeSessions.get(sessionId);
      if (session) {
        this.activeSessions.delete(sessionId);
        logger.info('Logout successful', {
          userId: session.userId,
          sessionId,
        });
      }
    } catch (error: any) {
      logger.error('Logout error:', error);
    }
  }

  public async refreshToken(refreshToken: string): Promise<IAuthTokens> {
    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, this.jwtRefreshSecret) as ITokenPayload;
      
      // Check if session exists
      const session = this.activeSessions.get(payload.sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Get user
      const user = await UserModel.findByPk(payload.userId);
      if (!user || user.status !== 'active') {
        throw new Error('User not found or not active');
      }

      // Update session activity
      session.lastActive = new Date();

      // Generate new tokens
      const newTokens = this.generateTokens(user, payload.sessionId);

      logger.info('Token refreshed', {
        userId: user.id,
        sessionId: payload.sessionId,
      });

      return newTokens;
    } catch (error: any) {
      logger.error('Token refresh failed:', error);
      throw new Error('Invalid refresh token');
    }
  }

  public async verifyToken(token: string): Promise<ITokenPayload> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as ITokenPayload;
      
      // Check if session exists
      const session = this.activeSessions.get(payload.sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Update last active time
      session.lastActive = new Date();

      return payload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  public async verifyEmailAddress(token: string): Promise<void> {
    logger.info('Email verification attempt', { token: token.substring(0, 8) + '...' });

    try {
      const user = await UserModel.findOne({
        where: {
          emailVerificationToken: token,
        },
      });

      if (!user) {
        throw new Error('Invalid verification token');
      }

      if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
        throw new Error('Verification token has expired');
      }

      // Verify email
      user.emailVerified = true;
      user.status = 'active';
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      
      await user.save();

      logger.info('Email verified successfully', { userId: user.id });
    } catch (error: any) {
      logger.error('Email verification failed:', error);
      throw error;
    }
  }

  public async requestPasswordReset(email: string): Promise<string> {
    logger.info('Password reset requested', { email });

    try {
      const user = await UserModel.findOne({
        where: { email },
      });

      if (!user) {
        // Don't reveal if email exists or not
        logger.info('Password reset requested for non-existent email', { email });
        return 'If the email address exists, you will receive password reset instructions.';
      }

      // Generate password reset token
      const resetToken = user.generatePasswordResetToken();
      await user.save();

      logger.info('Password reset token generated', { userId: user.id });

      return resetToken;
    } catch (error: any) {
      logger.error('Password reset request failed:', error);
      throw error;
    }
  }

  public async resetPassword(token: string, newPassword: string): Promise<void> {
    logger.info('Password reset attempt', { token: token.substring(0, 8) + '...' });

    try {
      const user = await UserModel.findOne({
        where: {
          passwordResetToken: token,
        },
      });

      if (!user) {
        throw new Error('Invalid reset token');
      }

      if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
        throw new Error('Reset token has expired');
      }

      // Validate new password
      this.validatePasswordStrength(newPassword);

      // Update password
      await user.setPassword(newPassword);
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      
      await user.save();

      // Invalidate all sessions for this user
      this.invalidateUserSessions(user.id);

      logger.info('Password reset successful', { userId: user.id });
    } catch (error: any) {
      logger.error('Password reset failed:', error);
      throw error;
    }
  }

  public async enableTwoFactor(userId: string): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    logger.info('Enabling 2FA', { userId });

    try {
      const user = await UserModel.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `WorkflowPlatform (${user.email})`,
        issuer: 'Workflow Automation Platform',
      });

      // Generate QR code URL
      const qrCodeUrl = speakeasy.otpauthURL({
        secret: secret.base32,
        label: user.email,
        issuer: 'Workflow Automation Platform',
        encoding: 'base32',
      });

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Save secret (not yet enabled)
      user.twoFactorSecret = secret.base32;
      await user.save();

      logger.info('2FA setup initiated', { userId });

      return {
        secret: secret.base32,
        qrCodeUrl,
        backupCodes,
      };
    } catch (error: any) {
      logger.error('2FA setup failed:', error);
      throw error;
    }
  }

  public async confirmTwoFactor(userId: string, token: string): Promise<void> {
    logger.info('Confirming 2FA setup', { userId });

    try {
      const user = await UserModel.findByPk(userId);
      if (!user || !user.twoFactorSecret) {
        throw new Error('2FA setup not initiated');
      }

      const isValid = this.verifyTwoFactorToken(user.twoFactorSecret, token);
      if (!isValid) {
        throw new Error('Invalid 2FA token');
      }

      // Enable 2FA
      user.twoFactorEnabled = true;
      await user.save();

      logger.info('2FA enabled successfully', { userId });
    } catch (error: any) {
      logger.error('2FA confirmation failed:', error);
      throw error;
    }
  }

  public async disableTwoFactor(userId: string, password: string): Promise<void> {
    logger.info('Disabling 2FA', { userId });

    try {
      const user = await UserModel.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        throw new Error('Invalid password');
      }

      // Disable 2FA
      user.twoFactorEnabled = false;
      user.twoFactorSecret = undefined;
      await user.save();

      logger.info('2FA disabled successfully', { userId });
    } catch (error: any) {
      logger.error('2FA disable failed:', error);
      throw error;
    }
  }

  public async getUserSessions(userId: string): Promise<Array<{
    sessionId: string;
    createdAt: Date;
    lastActive: Date;
    ipAddress?: string;
    userAgent?: string;
    current: boolean;
  }>> {
    const userSessions = [];
    
    for (const [sessionId, session] of this.activeSessions) {
      if (session.userId === userId) {
        userSessions.push({
          sessionId,
          createdAt: session.createdAt,
          lastActive: session.lastActive,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          current: false, // This would need to be determined from current request
        });
      }
    }

    return userSessions.sort((a, b) => b.lastActive.getTime() - a.lastActive.getTime());
  }

  public async revokeSession(userId: string, sessionId: string): Promise<void> {
    logger.info('Revoking session', { userId, sessionId });

    const session = this.activeSessions.get(sessionId);
    if (session && session.userId === userId) {
      this.activeSessions.delete(sessionId);
      logger.info('Session revoked', { userId, sessionId });
    }
  }

  public async revokeAllSessions(userId: string, exceptSessionId?: string): Promise<void> {
    logger.info('Revoking all sessions', { userId, except: exceptSessionId });

    const sessionsToRevoke = [];
    for (const [sessionId, session] of this.activeSessions) {
      if (session.userId === userId && sessionId !== exceptSessionId) {
        sessionsToRevoke.push(sessionId);
      }
    }

    for (const sessionId of sessionsToRevoke) {
      this.activeSessions.delete(sessionId);
    }

    logger.info(`Revoked ${sessionsToRevoke.length} sessions`, { userId });
  }

  private generateTokens(user: UserModel, sessionId: string): IAuthTokens {
    const payload: Omit<ITokenPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      sessionId,
    };

    const accessTokenExpiry = '15m'; // 15 minutes
    const refreshTokenExpiry = '7d'; // 7 days

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: accessTokenExpiry,
    });

    const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: refreshTokenExpiry,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
      tokenType: 'Bearer',
    };
  }

  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateTempToken(userId: string): string {
    return jwt.sign(
      { userId, type: '2fa_temp' },
      this.jwtSecret,
      { expiresIn: '10m' }
    );
  }

  private verifyTwoFactorToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps before and after
    });
  }

  private generateBackupCodes(): string[] {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      throw new Error('Password must contain at least one number');
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      throw new Error('Password must contain at least one special character (@$!%*?&)');
    }
  }

  private invalidateUserSessions(userId: string): void {
    const sessionsToDelete = [];
    
    for (const [sessionId, session] of this.activeSessions) {
      if (session.userId === userId) {
        sessionsToDelete.push(sessionId);
      }
    }

    for (const sessionId of sessionsToDelete) {
      this.activeSessions.delete(sessionId);
    }

    logger.info(`Invalidated ${sessionsToDelete.length} sessions for user`, { userId });
  }

  private cleanupExpiredSessions(): void {
    const now = new Date();
    const sessionTimeout = 7 * 24 * 60 * 60 * 1000; // 7 days
    const expiredSessions = [];

    for (const [sessionId, session] of this.activeSessions) {
      if (now.getTime() - session.lastActive.getTime() > sessionTimeout) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.activeSessions.delete(sessionId);
    }

    if (expiredSessions.length > 0) {
      logger.info(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  public getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    userCount: number;
  } {
    const now = new Date();
    const activeThreshold = 30 * 60 * 1000; // 30 minutes
    
    let activeSessions = 0;
    const uniqueUsers = new Set<string>();

    for (const session of this.activeSessions.values()) {
      uniqueUsers.add(session.userId);
      
      if (now.getTime() - session.lastActive.getTime() < activeThreshold) {
        activeSessions++;
      }
    }

    return {
      totalSessions: this.activeSessions.size,
      activeSessions,
      userCount: uniqueUsers.size,
    };
  }
}

export const authService = AuthService.getInstance();