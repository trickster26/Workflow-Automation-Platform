import { Request, Response } from 'express';
import { authService } from '../services/AuthService';
import { UserModel } from '../models/User.model';
import { AuthenticatedRequest } from '../middleware/auth';
import { createLogger } from '../utils/logger';

const logger = createLogger('AuthController');

export class AuthController {
  /**
   * User registration
   */
  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, username, password, firstName, lastName, role } = req.body;

      // Validate required fields
      if (!email || !username || !password) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Email, username, and password are required',
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Invalid email',
          message: 'Please provide a valid email address',
        });
      }

      // Validate username format
      const usernameRegex = /^[a-zA-Z0-9_-]+$/;
      if (!usernameRegex.test(username) || username.length < 3 || username.length > 50) {
        return res.status(400).json({
          error: 'Invalid username',
          message: 'Username must be 3-50 characters and contain only letters, numbers, underscores, and hyphens',
        });
      }

      const result = await authService.register({
        email: email.toLowerCase().trim(),
        username: username.trim(),
        password,
        firstName: firstName?.trim(),
        lastName: lastName?.trim(),
        role: role || 'user',
      });

      logger.info('User registration successful', {
        userId: result.user.id,
        email: result.user.email,
        username: result.user.username,
      });

      res.status(201).json({
        success: true,
        message: result.message,
        user: result.user,
        // In production, don't return the verification token
        // Send it via email instead
        ...(process.env.NODE_ENV === 'development' && {
          verificationToken: result.emailVerificationToken,
        }),
      });
    } catch (error: any) {
      logger.error('Registration failed:', error);
      
      if (error.message.includes('already exists') || error.message.includes('already taken')) {
        return res.status(409).json({
          error: 'Registration failed',
          message: error.message,
        });
      }

      if (error.message.includes('Password must')) {
        return res.status(400).json({
          error: 'Invalid password',
          message: error.message,
        });
      }

      res.status(400).json({
        error: 'Registration failed',
        message: error.message || 'An error occurred during registration',
      });
    }
  }

  /**
   * User login
   */
  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { identifier, password, twoFactorToken } = req.body;

      if (!identifier || !password) {
        return res.status(400).json({
          error: 'Missing credentials',
          message: 'Email/username and password are required',
        });
      }

      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      const result = await authService.login(
        identifier.toLowerCase().trim(),
        password,
        ipAddress,
        userAgent,
        twoFactorToken
      );

      if (result.requiresTwoFactor) {
        return res.status(200).json({
          success: true,
          requiresTwoFactor: true,
          tempToken: result.tempToken,
          message: 'Please enter your two-factor authentication code',
        });
      }

      logger.info('User login successful', {
        userId: result.user.id,
        sessionId: result.tokens ? 'present' : 'none',
      });

      res.json({
        success: true,
        message: 'Login successful',
        user: result.user,
        tokens: result.tokens,
      });
    } catch (error: any) {
      logger.error('Login failed:', error);

      // Don't reveal specific error details for security
      const genericMessage = 'Invalid credentials';
      
      if (error.message.includes('locked') || error.message.includes('suspended') || 
          error.message.includes('verify') || error.message.includes('not active')) {
        return res.status(401).json({
          error: 'Login failed',
          message: error.message,
        });
      }

      res.status(401).json({
        error: 'Login failed',
        message: genericMessage,
      });
    }
  }

  /**
   * User logout
   */
  public static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.sessionId) {
        await authService.logout(req.sessionId);
      }

      res.json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error: any) {
      logger.error('Logout error:', error);
      
      // Still return success even if logout fails
      res.json({
        success: true,
        message: 'Logout successful',
      });
    }
  }

  /**
   * Refresh access token
   */
  public static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: 'Refresh token required',
          message: 'Please provide a refresh token',
        });
      }

      const tokens = await authService.refreshToken(refreshToken);

      res.json({
        success: true,
        tokens,
        message: 'Token refreshed successfully',
      });
    } catch (error: any) {
      logger.error('Token refresh failed:', error);
      
      res.status(401).json({
        error: 'Token refresh failed',
        message: 'Invalid or expired refresh token',
      });
    }
  }

  /**
   * Verify email address
   */
  public static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          error: 'Verification token required',
          message: 'Please provide a verification token',
        });
      }

      await authService.verifyEmailAddress(token);

      res.json({
        success: true,
        message: 'Email verified successfully. You can now log in.',
      });
    } catch (error: any) {
      logger.error('Email verification failed:', error);
      
      res.status(400).json({
        error: 'Email verification failed',
        message: error.message || 'Invalid or expired verification token',
      });
    }
  }

  /**
   * Request password reset
   */
  public static async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'Email required',
          message: 'Please provide your email address',
        });
      }

      const resetToken = await authService.requestPasswordReset(email.toLowerCase().trim());

      res.json({
        success: true,
        message: 'If the email address exists, you will receive password reset instructions.',
        // In development, return the token for testing
        ...(process.env.NODE_ENV === 'development' && { resetToken }),
      });
    } catch (error: any) {
      logger.error('Password reset request failed:', error);
      
      // Always return success for security (don't reveal if email exists)
      res.json({
        success: true,
        message: 'If the email address exists, you will receive password reset instructions.',
      });
    }
  }

  /**
   * Reset password
   */
  public static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      const { password } = req.body;

      if (!token || !password) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Token and new password are required',
        });
      }

      await authService.resetPassword(token, password);

      res.json({
        success: true,
        message: 'Password reset successful. Please log in with your new password.',
      });
    } catch (error: any) {
      logger.error('Password reset failed:', error);
      
      if (error.message.includes('Password must')) {
        return res.status(400).json({
          error: 'Invalid password',
          message: error.message,
        });
      }

      res.status(400).json({
        error: 'Password reset failed',
        message: error.message || 'Invalid or expired reset token',
      });
    }
  }

  /**
   * Get current user profile
   */
  public static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Not authenticated',
          message: 'Please log in to access your profile',
        });
      }

      res.json({
        success: true,
        user: req.user.toSafeJSON(),
      });
    } catch (error: any) {
      logger.error('Get profile failed:', error);
      
      res.status(500).json({
        error: 'Profile retrieval failed',
        message: 'Unable to retrieve user profile',
      });
    }
  }

  /**
   * Update user profile
   */
  public static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Not authenticated',
          message: 'Please log in to update your profile',
        });
      }

      const { firstName, lastName, preferences } = req.body;
      const updates: any = {};

      if (firstName !== undefined) {
        updates.firstName = firstName?.trim() || null;
      }

      if (lastName !== undefined) {
        updates.lastName = lastName?.trim() || null;
      }

      if (preferences !== undefined) {
        // Merge with existing preferences
        updates.preferences = {
          ...req.user.preferences,
          ...preferences,
        };
      }

      await req.user.update(updates);

      logger.info('Profile updated', { userId: req.user.id });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: req.user.toSafeJSON(),
      });
    } catch (error: any) {
      logger.error('Profile update failed:', error);
      
      res.status(400).json({
        error: 'Profile update failed',
        message: error.message || 'Unable to update profile',
      });
    }
  }

  /**
   * Change password
   */
  public static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Not authenticated',
          message: 'Please log in to change your password',
        });
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Current password and new password are required',
        });
      }

      // Verify current password
      const isValidPassword = await req.user.comparePassword(currentPassword);
      if (!isValidPassword) {
        return res.status(400).json({
          error: 'Invalid password',
          message: 'Current password is incorrect',
        });
      }

      // Update password
      await req.user.setPassword(newPassword);
      await req.user.save();

      // Invalidate all sessions except current one
      await authService.revokeAllSessions(req.user.id, req.sessionId);

      logger.info('Password changed', { userId: req.user.id });

      res.json({
        success: true,
        message: 'Password changed successfully. Other sessions have been logged out.',
      });
    } catch (error: any) {
      logger.error('Password change failed:', error);
      
      if (error.message.includes('Password must')) {
        return res.status(400).json({
          error: 'Invalid password',
          message: error.message,
        });
      }

      res.status(400).json({
        error: 'Password change failed',
        message: error.message || 'Unable to change password',
      });
    }
  }

  /**
   * Enable two-factor authentication
   */
  public static async enableTwoFactor(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Not authenticated',
          message: 'Please log in to enable two-factor authentication',
        });
      }

      const result = await authService.enableTwoFactor(req.user.id);

      res.json({
        success: true,
        message: 'Scan the QR code with your authenticator app and verify to enable 2FA',
        secret: result.secret,
        qrCodeUrl: result.qrCodeUrl,
        backupCodes: result.backupCodes,
      });
    } catch (error: any) {
      logger.error('Enable 2FA failed:', error);
      
      res.status(500).json({
        error: '2FA setup failed',
        message: error.message || 'Unable to setup two-factor authentication',
      });
    }
  }

  /**
   * Confirm two-factor authentication setup
   */
  public static async confirmTwoFactor(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Not authenticated',
          message: 'Please log in to confirm two-factor authentication',
        });
      }

      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          error: 'Token required',
          message: 'Please provide the 6-digit code from your authenticator app',
        });
      }

      await authService.confirmTwoFactor(req.user.id, token);

      res.json({
        success: true,
        message: 'Two-factor authentication has been enabled successfully',
      });
    } catch (error: any) {
      logger.error('Confirm 2FA failed:', error);
      
      res.status(400).json({
        error: '2FA confirmation failed',
        message: error.message || 'Invalid verification code',
      });
    }
  }

  /**
   * Disable two-factor authentication
   */
  public static async disableTwoFactor(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Not authenticated',
          message: 'Please log in to disable two-factor authentication',
        });
      }

      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          error: 'Password required',
          message: 'Please provide your password to disable 2FA',
        });
      }

      await authService.disableTwoFactor(req.user.id, password);

      res.json({
        success: true,
        message: 'Two-factor authentication has been disabled',
      });
    } catch (error: any) {
      logger.error('Disable 2FA failed:', error);
      
      res.status(400).json({
        error: '2FA disable failed',
        message: error.message || 'Unable to disable two-factor authentication',
      });
    }
  }

  /**
   * Get user sessions
   */
  public static async getSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Not authenticated',
          message: 'Please log in to view your sessions',
        });
      }

      const sessions = await authService.getUserSessions(req.user.id);

      // Mark current session
      const sessionsWithCurrent = sessions.map(session => ({
        ...session,
        current: session.sessionId === req.sessionId,
      }));

      res.json({
        success: true,
        sessions: sessionsWithCurrent,
      });
    } catch (error: any) {
      logger.error('Get sessions failed:', error);
      
      res.status(500).json({
        error: 'Sessions retrieval failed',
        message: 'Unable to retrieve user sessions',
      });
    }
  }

  /**
   * Revoke specific session
   */
  public static async revokeSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Not authenticated',
          message: 'Please log in to revoke sessions',
        });
      }

      const { sessionId } = req.params;

      if (!sessionId) {
        return res.status(400).json({
          error: 'Session ID required',
          message: 'Please provide a session ID to revoke',
        });
      }

      await authService.revokeSession(req.user.id, sessionId);

      res.json({
        success: true,
        message: 'Session revoked successfully',
      });
    } catch (error: any) {
      logger.error('Revoke session failed:', error);
      
      res.status(500).json({
        error: 'Session revocation failed',
        message: 'Unable to revoke session',
      });
    }
  }

  /**
   * Revoke all sessions except current
   */
  public static async revokeAllSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Not authenticated',
          message: 'Please log in to revoke sessions',
        });
      }

      await authService.revokeAllSessions(req.user.id, req.sessionId);

      res.json({
        success: true,
        message: 'All other sessions have been revoked',
      });
    } catch (error: any) {
      logger.error('Revoke all sessions failed:', error);
      
      res.status(500).json({
        error: 'Session revocation failed',
        message: 'Unable to revoke sessions',
      });
    }
  }

  /**
   * Get authentication statistics (admin only)
   */
  public static async getAuthStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Admin access required',
          message: 'Only administrators can view authentication statistics',
        });
      }

      const sessionStats = authService.getSessionStats();
      
      // Get user statistics from database
      const userStats = await UserModel.findAll({
        attributes: [
          'status',
          [UserModel.sequelize!.fn('COUNT', '*'), 'count'],
        ],
        group: ['status'],
        raw: true,
      });

      const roleStats = await UserModel.findAll({
        attributes: [
          'role',
          [UserModel.sequelize!.fn('COUNT', '*'), 'count'],
        ],
        group: ['role'],
        raw: true,
      });

      res.json({
        success: true,
        statistics: {
          sessions: sessionStats,
          users: {
            byStatus: userStats,
            byRole: roleStats,
          },
        },
      });
    } catch (error: any) {
      logger.error('Get auth stats failed:', error);
      
      res.status(500).json({
        error: 'Statistics retrieval failed',
        message: 'Unable to retrieve authentication statistics',
      });
    }
  }
}