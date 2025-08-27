import { Response } from 'express';
import { User as UserModel } from '../models';
import { AuthenticatedRequest } from '../middleware/auth';
import { createLogger } from '../utils/logger';
import { Op } from 'sequelize';

const logger = createLogger('UserController');

export class UserController {
  /**
   * Get all users (admin only)
   */
  public static async getAllUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Admin access required',
          message: 'Only administrators can view all users',
        });
      }

      const {
        page = '1',
        limit = '20',
        status,
        role,
        search,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = req.query as Record<string, string>;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where: any = {};

      // Apply filters
      if (status) {
        where.status = status;
      }

      if (role) {
        where.role = role;
      }

      if (search) {
        where[Op.or] = [
          { email: { [Op.iLike]: `%${search}%` } },
          { username: { [Op.iLike]: `%${search}%` } },
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const { rows: users, count } = await UserModel.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [[sortBy, sortOrder.toUpperCase()]],
        attributes: { exclude: ['password', 'twoFactorSecret', 'emailVerificationToken', 'passwordResetToken'] },
      });

      res.json({
        success: true,
        users: users.map(user => user.toJSON()),
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / parseInt(limit)),
        },
      });
    } catch (error: any) {
      logger.error('Get all users failed:', error);
      res.status(500).json({
        error: 'Failed to retrieve users',
        message: error.message,
      });
    }
  }

  /**
   * Get specific user by ID (admin only)
   */
  public static async getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Admin access required',
          message: 'Only administrators can view user details',
        });
      }

      const { userId } = req.params;

      const user = await UserModel.findByPk(userId, {
        attributes: { exclude: ['password', 'twoFactorSecret', 'emailVerificationToken', 'passwordResetToken'] },
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'The specified user does not exist',
        });
      }

      res.json({
        success: true,
        user: user.toJSON(),
      });
    } catch (error: any) {
      logger.error('Get user by ID failed:', error);
      res.status(500).json({
        error: 'Failed to retrieve user',
        message: error.message,
      });
    }
  }

  /**
   * Create new user (admin only)
   */
  public static async createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Admin access required',
          message: 'Only administrators can create users',
        });
      }

      const {
        email,
        username,
        password,
        firstName,
        lastName,
        role = 'user',
        status = 'active',
      } = req.body;

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

      // Check if user already exists
      const existingUser = await UserModel.findOne({
        where: {
          [Op.or]: [
            { email: email.toLowerCase() },
            { username: username.toLowerCase() },
          ],
        },
      });

      if (existingUser) {
        return res.status(409).json({
          error: 'User already exists',
          message: 'A user with this email or username already exists',
        });
      }

      // Create user
      const user = await UserModel.create({
        email: email.toLowerCase().trim(),
        username: username.trim(),
        password,
        firstName: firstName?.trim(),
        lastName: lastName?.trim(),
        role,
        status,
        emailVerified: status === 'active', // Auto-verify admin-created users
      });

      logger.info('User created by admin', {
        createdUserId: user.id,
        createdByUserId: req.user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        user: user.toSafeJSON(),
      });
    } catch (error: any) {
      logger.error('Create user failed:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Validation error',
          message: error.errors.map((e: any) => e.message).join(', '),
        });
      }

      res.status(500).json({
        error: 'Failed to create user',
        message: error.message,
      });
    }
  }

  /**
   * Update user (admin only)
   */
  public static async updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Admin access required',
          message: 'Only administrators can update users',
        });
      }

      const { userId } = req.params;
      const {
        email,
        username,
        firstName,
        lastName,
        role,
        status,
        preferences,
      } = req.body;

      const user = await UserModel.findByPk(userId);

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'The specified user does not exist',
        });
      }

      // Prevent admin from changing their own role (unless they're the only admin)
      if (user.id === req.user.id && role && role !== user.role) {
        const adminCount = await UserModel.count({ where: { role: 'admin' } });
        if (adminCount <= 1) {
          return res.status(400).json({
            error: 'Cannot change role',
            message: 'Cannot change your own role when you are the only administrator',
          });
        }
      }

      const updates: any = {};

      if (email !== undefined) {
        // Check if email is already taken by another user
        if (email !== user.email) {
          const existingUser = await UserModel.findOne({
            where: { email: email.toLowerCase(), id: { [Op.ne]: userId } },
          });
          if (existingUser) {
            return res.status(409).json({
              error: 'Email already taken',
              message: 'Another user is already using this email address',
            });
          }
          updates.email = email.toLowerCase().trim();
        }
      }

      if (username !== undefined) {
        // Check if username is already taken by another user
        if (username !== user.username) {
          const existingUser = await UserModel.findOne({
            where: { username: username.toLowerCase(), id: { [Op.ne]: userId } },
          });
          if (existingUser) {
            return res.status(409).json({
              error: 'Username already taken',
              message: 'Another user is already using this username',
            });
          }
          updates.username = username.trim();
        }
      }

      if (firstName !== undefined) {
        updates.firstName = firstName?.trim() || null;
      }

      if (lastName !== undefined) {
        updates.lastName = lastName?.trim() || null;
      }

      if (role !== undefined && ['admin', 'user', 'viewer', 'api'].includes(role)) {
        updates.role = role;
      }

      if (status !== undefined && ['active', 'inactive', 'suspended', 'pending'].includes(status)) {
        updates.status = status;
      }

      if (preferences !== undefined) {
        updates.preferences = {
          ...user.preferences,
          ...preferences,
        };
      }

      await user.update(updates);

      logger.info('User updated by admin', {
        updatedUserId: user.id,
        updatedByUserId: req.user.id,
        changes: Object.keys(updates),
      });

      res.json({
        success: true,
        message: 'User updated successfully',
        user: user.toSafeJSON(),
      });
    } catch (error: any) {
      logger.error('Update user failed:', error);
      
      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          error: 'Validation error',
          message: error.errors.map((e: any) => e.message).join(', '),
        });
      }

      res.status(500).json({
        error: 'Failed to update user',
        message: error.message,
      });
    }
  }

  /**
   * Delete user (admin only)
   */
  public static async deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Admin access required',
          message: 'Only administrators can delete users',
        });
      }

      const { userId } = req.params;

      const user = await UserModel.findByPk(userId);

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'The specified user does not exist',
        });
      }

      // Prevent admin from deleting themselves
      if (user.id === req.user.id) {
        return res.status(400).json({
          error: 'Cannot delete yourself',
          message: 'You cannot delete your own account',
        });
      }

      // Check if this is the last admin
      if (user.role === 'admin') {
        const adminCount = await UserModel.count({ where: { role: 'admin' } });
        if (adminCount <= 1) {
          return res.status(400).json({
            error: 'Cannot delete last admin',
            message: 'Cannot delete the last administrator account',
          });
        }
      }

      // TODO: Handle user data cleanup (workflows, executions, etc.)
      // For now, we'll just delete the user record

      await user.destroy();

      logger.info('User deleted by admin', {
        deletedUserId: userId,
        deletedByUserId: req.user.id,
        deletedUserEmail: user.email,
      });

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error: any) {
      logger.error('Delete user failed:', error);
      res.status(500).json({
        error: 'Failed to delete user',
        message: error.message,
      });
    }
  }

  /**
   * Reset user password (admin only)
   */
  public static async resetUserPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Admin access required',
          message: 'Only administrators can reset user passwords',
        });
      }

      const { userId } = req.params;
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          error: 'Password required',
          message: 'Please provide a new password',
        });
      }

      const user = await UserModel.findByPk(userId);

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'The specified user does not exist',
        });
      }

      // Update password
      await user.setPassword(password);
      await user.save();

      // TODO: Invalidate all user sessions
      // await authService.revokeAllSessions(user.id);

      logger.info('User password reset by admin', {
        userId: user.id,
        resetByUserId: req.user.id,
      });

      res.json({
        success: true,
        message: 'User password has been reset successfully',
      });
    } catch (error: any) {
      logger.error('Reset user password failed:', error);
      
      if (error.message.includes('Password must')) {
        return res.status(400).json({
          error: 'Invalid password',
          message: error.message,
        });
      }

      res.status(500).json({
        error: 'Failed to reset password',
        message: error.message,
      });
    }
  }

  /**
   * Toggle user status (admin only)
   */
  public static async toggleUserStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Admin access required',
          message: 'Only administrators can change user status',
        });
      }

      const { userId } = req.params;

      const user = await UserModel.findByPk(userId);

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'The specified user does not exist',
        });
      }

      // Prevent admin from suspending themselves
      if (user.id === req.user.id) {
        return res.status(400).json({
          error: 'Cannot change your own status',
          message: 'You cannot change your own account status',
        });
      }

      // Toggle between active and suspended
      const newStatus = user.status === 'active' ? 'suspended' : 'active';
      await user.update({ status: newStatus });

      logger.info('User status toggled by admin', {
        userId: user.id,
        changedByUserId: req.user.id,
        oldStatus: user.status,
        newStatus,
      });

      res.json({
        success: true,
        message: `User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`,
        user: user.toSafeJSON(),
      });
    } catch (error: any) {
      logger.error('Toggle user status failed:', error);
      res.status(500).json({
        error: 'Failed to change user status',
        message: error.message,
      });
    }
  }

  /**
   * Get user statistics (admin only)
   */
  public static async getUserStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Admin access required',
          message: 'Only administrators can view user statistics',
        });
      }

      const totalUsers = await UserModel.count();
      
      const statusStats = await UserModel.findAll({
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

      const recentUsers = await UserModel.count({
        where: {
          createdAt: {
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      });

      const verifiedUsers = await UserModel.count({
        where: { emailVerified: true },
      });

      const twoFactorUsers = await UserModel.count({
        where: { twoFactorEnabled: true },
      });

      res.json({
        success: true,
        statistics: {
          totalUsers,
          recentUsers,
          verifiedUsers,
          twoFactorUsers,
          byStatus: statusStats,
          byRole: roleStats,
        },
      });
    } catch (error: any) {
      logger.error('Get user stats failed:', error);
      res.status(500).json({
        error: 'Failed to retrieve user statistics',
        message: error.message,
      });
    }
  }

  /**
   * Bulk user operations (admin only)
   */
  public static async bulkUserOperation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          error: 'Admin access required',
          message: 'Only administrators can perform bulk operations',
        });
      }

      const { userIds, operation, value } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          error: 'User IDs required',
          message: 'Please provide an array of user IDs',
        });
      }

      if (!operation) {
        return res.status(400).json({
          error: 'Operation required',
          message: 'Please specify the operation to perform',
        });
      }

      // Prevent admin from performing operations on themselves
      if (userIds.includes(req.user.id)) {
        return res.status(400).json({
          error: 'Cannot perform operation on yourself',
          message: 'You cannot perform bulk operations on your own account',
        });
      }

      let updateData: any = {};
      let successMessage = '';

      switch (operation) {
        case 'activate':
          updateData = { status: 'active' };
          successMessage = 'Users activated successfully';
          break;
        case 'suspend':
          updateData = { status: 'suspended' };
          successMessage = 'Users suspended successfully';
          break;
        case 'deactivate':
          updateData = { status: 'inactive' };
          successMessage = 'Users deactivated successfully';
          break;
        case 'changeRole':
          if (!value || !['admin', 'user', 'viewer', 'api'].includes(value)) {
            return res.status(400).json({
              error: 'Invalid role',
              message: 'Please provide a valid role',
            });
          }
          updateData = { role: value };
          successMessage = `Users role changed to ${value} successfully`;
          break;
        default:
          return res.status(400).json({
            error: 'Invalid operation',
            message: 'Supported operations: activate, suspend, deactivate, changeRole',
          });
      }

      const [affectedRows] = await UserModel.update(updateData, {
        where: {
          id: { [Op.in]: userIds },
        },
      });

      logger.info('Bulk user operation performed', {
        performedByUserId: req.user.id,
        operation,
        userIds,
        affectedRows,
      });

      res.json({
        success: true,
        message: successMessage,
        affectedUsers: affectedRows,
      });
    } catch (error: any) {
      logger.error('Bulk user operation failed:', error);
      res.status(500).json({
        error: 'Bulk operation failed',
        message: error.message,
      });
    }
  }
}