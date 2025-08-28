import { Sequelize, DataTypes, Model } from 'sequelize';
import { createLogger } from '../utils/logger';
import { WorkflowTemplateService } from './WorkflowTemplateService';

const logger = createLogger('TemplateCollaborationService');

export interface TemplateCollaborator {
  id?: number;
  templateId: number;
  userId: number;
  email?: string;
  permission: 'view' | 'edit' | 'admin';
  invitedBy: number;
  invitedAt: Date;
  acceptedAt?: Date;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  inviteToken?: string;
  message?: string;
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TemplateComment {
  id?: number;
  templateId: number;
  userId: number;
  parentId?: number;
  content: string;
  type: 'general' | 'suggestion' | 'issue' | 'approval' | 'question';
  status: 'active' | 'resolved' | 'archived';
  metadata?: any;
  attachments?: string[];
  mentions?: number[];
  reactions?: TemplateReaction[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TemplateReaction {
  id?: number;
  commentId?: number;
  templateId?: number;
  userId: number;
  type: 'like' | 'dislike' | 'heart' | 'thumbs_up' | 'thumbs_down' | 'laugh' | 'confused' | 'hooray' | 'eyes';
  createdAt?: Date;
}

export interface TemplateChangeRequest {
  id?: number;
  templateId: number;
  requesterId: number;
  reviewerId?: number;
  title: string;
  description: string;
  changes: any;
  status: 'pending' | 'approved' | 'rejected' | 'merged' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  reviewNotes?: string;
  mergedAt?: Date;
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TemplateDiscussion {
  id?: number;
  templateId: number;
  creatorId: number;
  title: string;
  description: string;
  type: 'general' | 'feature_request' | 'bug_report' | 'improvement' | 'question';
  status: 'open' | 'closed' | 'resolved' | 'locked';
  priority: 'low' | 'medium' | 'high';
  tags?: string[];
  assigneeId?: number;
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CollaborationInvite {
  templateId: number;
  email?: string;
  userId?: number;
  permission: 'view' | 'edit' | 'admin';
  message?: string;
  expiresAt?: Date;
}

export interface CollaborationStats {
  totalCollaborators: number;
  activeCollaborators: number;
  pendingInvites: number;
  totalComments: number;
  totalDiscussions: number;
  totalChangeRequests: number;
  recentActivity: any[];
}

export class TemplateCollaborationService {
  private sequelize: Sequelize;
  private TemplateCollaborator: any;
  private TemplateComment: any;
  private TemplateReaction: any;
  private TemplateChangeRequest: any;
  private TemplateDiscussion: any;
  private templateService: WorkflowTemplateService;

  constructor(sequelize: Sequelize, templateService: WorkflowTemplateService) {
    this.sequelize = sequelize;
    this.templateService = templateService;
    this.initializeModels();
  }

  private initializeModels(): void {
    this.TemplateCollaborator = this.sequelize.define('template_collaborators', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      templateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'workflow_templates',
          key: 'id',
        },
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      permission: {
        type: DataTypes.ENUM('view', 'edit', 'admin'),
        allowNull: false,
        defaultValue: 'view',
      },
      invitedBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      invitedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      acceptedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('pending', 'accepted', 'declined', 'revoked'),
        allowNull: false,
        defaultValue: 'pending',
      },
      inviteToken: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
      },
    }, {
      indexes: [
        { fields: ['templateId'] },
        { fields: ['userId'] },
        { fields: ['email'] },
        { fields: ['status'] },
        { fields: ['inviteToken'] },
      ],
    });

    this.TemplateComment = this.sequelize.define('template_comments', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      templateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'workflow_templates',
          key: 'id',
        },
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      parentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'template_comments',
          key: 'id',
        },
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM('general', 'suggestion', 'issue', 'approval', 'question'),
        allowNull: false,
        defaultValue: 'general',
      },
      status: {
        type: DataTypes.ENUM('active', 'resolved', 'archived'),
        allowNull: false,
        defaultValue: 'active',
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
      },
      attachments: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      mentions: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
    }, {
      indexes: [
        { fields: ['templateId'] },
        { fields: ['userId'] },
        { fields: ['parentId'] },
        { fields: ['type'] },
        { fields: ['status'] },
      ],
    });

    this.TemplateReaction = this.sequelize.define('template_reactions', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      commentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'template_comments',
          key: 'id',
        },
      },
      templateId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'workflow_templates',
          key: 'id',
        },
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      type: {
        type: DataTypes.ENUM('like', 'dislike', 'heart', 'thumbs_up', 'thumbs_down', 'laugh', 'confused', 'hooray', 'eyes'),
        allowNull: false,
      },
    }, {
      indexes: [
        { fields: ['commentId'] },
        { fields: ['templateId'] },
        { fields: ['userId'] },
        { fields: ['type'] },
      ],
    });

    this.TemplateChangeRequest = this.sequelize.define('template_change_requests', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      templateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'workflow_templates',
          key: 'id',
        },
      },
      requesterId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      reviewerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      changes: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'merged', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'medium',
      },
      reviewNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      mergedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
      },
    }, {
      indexes: [
        { fields: ['templateId'] },
        { fields: ['requesterId'] },
        { fields: ['reviewerId'] },
        { fields: ['status'] },
        { fields: ['priority'] },
      ],
    });

    this.TemplateDiscussion = this.sequelize.define('template_discussions', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      templateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'workflow_templates',
          key: 'id',
        },
      },
      creatorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM('general', 'feature_request', 'bug_report', 'improvement', 'question'),
        allowNull: false,
        defaultValue: 'general',
      },
      status: {
        type: DataTypes.ENUM('open', 'closed', 'resolved', 'locked'),
        allowNull: false,
        defaultValue: 'open',
      },
      priority: {
        type: DataTypes.ENUM('low', 'medium', 'high'),
        allowNull: false,
        defaultValue: 'medium',
      },
      tags: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      assigneeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
      },
    }, {
      indexes: [
        { fields: ['templateId'] },
        { fields: ['creatorId'] },
        { fields: ['assigneeId'] },
        { fields: ['type'] },
        { fields: ['status'] },
        { fields: ['priority'] },
      ],
    });

    // Set up associations
    this.setupAssociations();
  }

  private setupAssociations(): void {
    // Collaborator associations
    this.TemplateComment.hasMany(this.TemplateReaction, { foreignKey: 'commentId', as: 'reactions' });
    this.TemplateReaction.belongsTo(this.TemplateComment, { foreignKey: 'commentId' });

    // Self-referential comment association for replies
    this.TemplateComment.hasMany(this.TemplateComment, { foreignKey: 'parentId', as: 'replies' });
    this.TemplateComment.belongsTo(this.TemplateComment, { foreignKey: 'parentId', as: 'parent' });

    // Discussion has many comments
    this.TemplateDiscussion.hasMany(this.TemplateComment, { foreignKey: 'templateId', as: 'comments' });
  }

  async inviteCollaborator(invite: CollaborationInvite, invitedBy: number): Promise<TemplateCollaborator> {
    try {
      const inviteToken = this.generateInviteToken();
      const expiresAt = invite.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const collaborator = await this.TemplateCollaborator.create({
        templateId: invite.templateId,
        userId: invite.userId,
        email: invite.email,
        permission: invite.permission,
        invitedBy,
        inviteToken,
        message: invite.message,
        metadata: {
          expiresAt,
          inviteType: invite.userId ? 'user' : 'email',
        },
      });

      // Send invitation email/notification
      await this.sendCollaborationInvite(collaborator);

      logger.info(`Collaboration invite sent for template ${invite.templateId}`);
      return collaborator.toJSON();
    } catch (error: any) {
      logger.error('Error inviting collaborator:', error);
      throw new Error(`Failed to invite collaborator: ${error.message}`);
    }
  }

  async acceptInvite(inviteToken: string, userId?: number): Promise<TemplateCollaborator> {
    try {
      const collaborator = await this.TemplateCollaborator.findOne({
        where: { inviteToken, status: 'pending' },
      });

      if (!collaborator) {
        throw new Error('Invalid or expired invitation');
      }

      // Check if invitation has expired
      const expiresAt = collaborator.metadata?.expiresAt;
      if (expiresAt && new Date() > new Date(expiresAt)) {
        throw new Error('Invitation has expired');
      }

      await collaborator.update({
        status: 'accepted',
        acceptedAt: new Date(),
        userId: userId || collaborator.userId,
        inviteToken: null, // Clear token after acceptance
      });

      logger.info(`Collaboration invite accepted for template ${collaborator.templateId}`);
      return collaborator.toJSON();
    } catch (error: any) {
      logger.error('Error accepting invite:', error);
      throw new Error(`Failed to accept invitation: ${error.message}`);
    }
  }

  async revokeCollaborator(templateId: number, collaboratorId: number, revokedBy: number): Promise<boolean> {
    try {
      const collaborator = await this.TemplateCollaborator.findOne({
        where: { id: collaboratorId, templateId },
      });

      if (!collaborator) {
        throw new Error('Collaborator not found');
      }

      // Check permissions - only admin or template owner can revoke
      const hasPermission = await this.checkCollaborationPermission(templateId, revokedBy, 'admin');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to revoke collaborator');
      }

      await collaborator.update({
        status: 'revoked',
        metadata: {
          ...collaborator.metadata,
          revokedBy,
          revokedAt: new Date(),
        },
      });

      logger.info(`Collaborator ${collaboratorId} revoked from template ${templateId}`);
      return true;
    } catch (error: any) {
      logger.error('Error revoking collaborator:', error);
      throw new Error(`Failed to revoke collaborator: ${error.message}`);
    }
  }

  async getCollaborators(templateId: number): Promise<TemplateCollaborator[]> {
    try {
      const collaborators = await this.TemplateCollaborator.findAll({
        where: { templateId, status: ['accepted', 'pending'] },
        order: [['createdAt', 'DESC']],
      });

      return collaborators.map((c: any) => c.toJSON());
    } catch (error: any) {
      logger.error('Error fetching collaborators:', error);
      throw new Error(`Failed to fetch collaborators: ${error.message}`);
    }
  }

  async addComment(comment: Omit<TemplateComment, 'id'>): Promise<TemplateComment> {
    try {
      // Check collaboration permission
      const hasPermission = await this.checkCollaborationPermission(comment.templateId, comment.userId, 'view');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to comment');
      }

      const newComment = await this.TemplateComment.create(comment);

      // Process mentions and send notifications
      if (comment.mentions && comment.mentions.length > 0) {
        await this.processMentions(newComment.id, comment.mentions);
      }

      logger.info(`Comment added to template ${comment.templateId}`);
      return newComment.toJSON();
    } catch (error: any) {
      logger.error('Error adding comment:', error);
      throw new Error(`Failed to add comment: ${error.message}`);
    }
  }

  async getComments(templateId: number, parentId?: number): Promise<TemplateComment[]> {
    try {
      const where: any = { templateId, status: 'active' };
      if (parentId !== undefined) {
        where.parentId = parentId;
      }

      const comments = await this.TemplateComment.findAll({
        where,
        include: [
          {
            model: this.TemplateReaction,
            as: 'reactions',
          },
          {
            model: this.TemplateComment,
            as: 'replies',
            include: [
              {
                model: this.TemplateReaction,
                as: 'reactions',
              },
            ],
          },
        ],
        order: [['createdAt', 'ASC']],
      });

      return comments.map((c: any) => c.toJSON());
    } catch (error: any) {
      logger.error('Error fetching comments:', error);
      throw new Error(`Failed to fetch comments: ${error.message}`);
    }
  }

  async addReaction(reaction: Omit<TemplateReaction, 'id'>): Promise<TemplateReaction> {
    try {
      // Check if user already reacted with same type
      const existingReaction = await this.TemplateReaction.findOne({
        where: {
          userId: reaction.userId,
          type: reaction.type,
          ...(reaction.commentId ? { commentId: reaction.commentId } : { templateId: reaction.templateId }),
        },
      });

      if (existingReaction) {
        // Remove existing reaction (toggle behavior)
        await existingReaction.destroy();
        logger.info(`Reaction removed`);
        return existingReaction.toJSON();
      } else {
        // Add new reaction
        const newReaction = await this.TemplateReaction.create(reaction);
        logger.info(`Reaction added`);
        return newReaction.toJSON();
      }
    } catch (error: any) {
      logger.error('Error managing reaction:', error);
      throw new Error(`Failed to manage reaction: ${error.message}`);
    }
  }

  async createChangeRequest(changeRequest: Omit<TemplateChangeRequest, 'id'>): Promise<TemplateChangeRequest> {
    try {
      // Check collaboration permission
      const hasPermission = await this.checkCollaborationPermission(changeRequest.templateId, changeRequest.requesterId, 'edit');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to create change request');
      }

      const newRequest = await this.TemplateChangeRequest.create(changeRequest);

      // Notify template admins
      await this.notifyTemplateAdmins(changeRequest.templateId, 'change_request', {
        requestId: newRequest.id,
        title: changeRequest.title,
        requester: changeRequest.requesterId,
      });

      logger.info(`Change request created for template ${changeRequest.templateId}`);
      return newRequest.toJSON();
    } catch (error: any) {
      logger.error('Error creating change request:', error);
      throw new Error(`Failed to create change request: ${error.message}`);
    }
  }

  async reviewChangeRequest(requestId: number, reviewerId: number, decision: 'approved' | 'rejected', notes?: string): Promise<TemplateChangeRequest> {
    try {
      const changeRequest = await this.TemplateChangeRequest.findByPk(requestId);
      if (!changeRequest) {
        throw new Error('Change request not found');
      }

      // Check admin permission
      const hasPermission = await this.checkCollaborationPermission(changeRequest.templateId, reviewerId, 'admin');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to review change request');
      }

      await changeRequest.update({
        status: decision,
        reviewerId,
        reviewNotes: notes,
      });

      // If approved, apply changes
      if (decision === 'approved') {
        await this.applyChangeRequest(changeRequest);
      }

      // Notify requester
      await this.notifyUser(changeRequest.requesterId, 'change_request_reviewed', {
        requestId,
        decision,
        templateId: changeRequest.templateId,
      });

      logger.info(`Change request ${requestId} ${decision}`);
      return changeRequest.toJSON();
    } catch (error: any) {
      logger.error('Error reviewing change request:', error);
      throw new Error(`Failed to review change request: ${error.message}`);
    }
  }

  async createDiscussion(discussion: Omit<TemplateDiscussion, 'id'>): Promise<TemplateDiscussion> {
    try {
      // Check collaboration permission
      const hasPermission = await this.checkCollaborationPermission(discussion.templateId, discussion.creatorId, 'view');
      if (!hasPermission) {
        throw new Error('Insufficient permissions to create discussion');
      }

      const newDiscussion = await this.TemplateDiscussion.create(discussion);

      logger.info(`Discussion created for template ${discussion.templateId}`);
      return newDiscussion.toJSON();
    } catch (error: any) {
      logger.error('Error creating discussion:', error);
      throw new Error(`Failed to create discussion: ${error.message}`);
    }
  }

  async getDiscussions(templateId: number): Promise<TemplateDiscussion[]> {
    try {
      const discussions = await this.TemplateDiscussion.findAll({
        where: { templateId },
        include: [
          {
            model: this.TemplateComment,
            as: 'comments',
            include: [
              {
                model: this.TemplateReaction,
                as: 'reactions',
              },
            ],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      return discussions.map((d: any) => d.toJSON());
    } catch (error: any) {
      logger.error('Error fetching discussions:', error);
      throw new Error(`Failed to fetch discussions: ${error.message}`);
    }
  }

  async getCollaborationStats(templateId: number): Promise<CollaborationStats> {
    try {
      const [
        totalCollaborators,
        activeCollaborators,
        pendingInvites,
        totalComments,
        totalDiscussions,
        totalChangeRequests,
      ] = await Promise.all([
        this.TemplateCollaborator.count({ where: { templateId } }),
        this.TemplateCollaborator.count({ where: { templateId, status: 'accepted' } }),
        this.TemplateCollaborator.count({ where: { templateId, status: 'pending' } }),
        this.TemplateComment.count({ where: { templateId, status: 'active' } }),
        this.TemplateDiscussion.count({ where: { templateId } }),
        this.TemplateChangeRequest.count({ where: { templateId } }),
      ]);

      // Get recent activity
      const recentActivity = await this.getRecentActivity(templateId, 10);

      return {
        totalCollaborators,
        activeCollaborators,
        pendingInvites,
        totalComments,
        totalDiscussions,
        totalChangeRequests,
        recentActivity,
      };
    } catch (error: any) {
      logger.error('Error fetching collaboration stats:', error);
      throw new Error(`Failed to fetch collaboration stats: ${error.message}`);
    }
  }

  private async checkCollaborationPermission(templateId: number, userId: number, requiredPermission: string): Promise<boolean> {
    try {
      // Check if user is template owner
      const template = await this.templateService.getTemplate(templateId);
      if (template && template.createdBy === userId) {
        return true;
      }

      // Check collaborator permissions
      const collaborator = await this.TemplateCollaborator.findOne({
        where: { templateId, userId, status: 'accepted' },
      });

      if (!collaborator) {
        return false;
      }

      const permissionLevels = { view: 1, edit: 2, admin: 3 };
      const userLevel = permissionLevels[collaborator.permission as keyof typeof permissionLevels] || 0;
      const requiredLevel = permissionLevels[requiredPermission as keyof typeof permissionLevels] || 0;

      return userLevel >= requiredLevel;
    } catch (error: any) {
      logger.error('Error checking collaboration permission:', error);
      return false;
    }
  }

  private generateInviteToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }

  private async sendCollaborationInvite(collaborator: any): Promise<void> {
    // Implementation would integrate with notification/email service
    logger.info(`Collaboration invite sent to ${collaborator.email || collaborator.userId}`);
  }

  private async processMentions(commentId: number, mentions: number[]): Promise<void> {
    // Send notifications to mentioned users
    for (const userId of mentions) {
      await this.notifyUser(userId, 'mentioned_in_comment', { commentId });
    }
  }

  private async notifyTemplateAdmins(templateId: number, eventType: string, data: any): Promise<void> {
    try {
      const admins = await this.TemplateCollaborator.findAll({
        where: { templateId, permission: 'admin', status: 'accepted' },
      });

      for (const admin of admins) {
        await this.notifyUser(admin.userId, eventType, data);
      }
    } catch (error: any) {
      logger.error('Error notifying template admins:', error);
    }
  }

  private async notifyUser(userId: number, eventType: string, data: any): Promise<void> {
    // Implementation would integrate with notification service
    logger.info(`Notification sent to user ${userId}: ${eventType}`);
  }

  private async applyChangeRequest(changeRequest: any): Promise<void> {
    try {
      // Apply the changes to the template
      const template = await this.templateService.getTemplate(changeRequest.templateId);
      if (template) {
        const updatedTemplate = {
          ...template,
          ...changeRequest.changes,
        };

        await this.templateService.updateTemplate(changeRequest.templateId, updatedTemplate, changeRequest.reviewerId);

        // Mark as merged
        await changeRequest.update({
          status: 'merged',
          mergedAt: new Date(),
        });

        logger.info(`Change request ${changeRequest.id} applied to template ${changeRequest.templateId}`);
      }
    } catch (error: any) {
      logger.error('Error applying change request:', error);
      throw error;
    }
  }

  private async getRecentActivity(templateId: number, limit: number = 10): Promise<any[]> {
    try {
      const activities = [];

      // Get recent comments
      const recentComments = await this.TemplateComment.findAll({
        where: { templateId, status: 'active' },
        order: [['createdAt', 'DESC']],
        limit: Math.floor(limit / 3),
      });

      // Get recent discussions
      const recentDiscussions = await this.TemplateDiscussion.findAll({
        where: { templateId },
        order: [['createdAt', 'DESC']],
        limit: Math.floor(limit / 3),
      });

      // Get recent change requests
      const recentChangeRequests = await this.TemplateChangeRequest.findAll({
        where: { templateId },
        order: [['createdAt', 'DESC']],
        limit: Math.floor(limit / 3),
      });

      // Combine and sort activities
      activities.push(
        ...recentComments.map((c: any) => ({ type: 'comment', data: c.toJSON() })),
        ...recentDiscussions.map((d: any) => ({ type: 'discussion', data: d.toJSON() })),
        ...recentChangeRequests.map((r: any) => ({ type: 'change_request', data: r.toJSON() }))
      );

      return activities
        .sort((a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime())
        .slice(0, limit);
    } catch (error: any) {
      logger.error('Error fetching recent activity:', error);
      return [];
    }
  }
}