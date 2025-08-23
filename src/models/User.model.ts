import { DataTypes, Model, Optional, Sequelize } from 'sequelize';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface IUser {
  id: number;
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'user';
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserCreationAttributes extends Optional<IUser, 
  'id' | 'firstName' | 'lastName' | 'role' | 'isActive' | 'lastLogin' | 'createdAt' | 'updatedAt'
> {}

export class UserModel extends Model<IUser, IUserCreationAttributes> implements IUser {
  // Remove public class fields to avoid shadowing Sequelize's getters/setters
  declare id: number;
  declare email: string;
  declare username: string;
  declare password: string;
  declare firstName?: string;
  declare lastName?: string;
  declare role: 'admin' | 'user';
  declare isActive: boolean;
  declare lastLogin?: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  // Instance methods
  public async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }

  public async setPassword(password: string): Promise<void> {
    const saltRounds = 10;
    this.password = await bcrypt.hash(password, saltRounds);
  }

  public updateLastLogin(): void {
    this.lastLogin = new Date();
  }

  public getDisplayName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    if (this.firstName) {
      return this.firstName;
    }
    return this.username;
  }

  public hasPermission(permission: string): boolean {
    const rolePermissions = {
      admin: ['*'],
      user: [
        'workflows:read', 'workflows:create', 'workflows:update', 'workflows:delete',
        'executions:read', 'executions:create', 'executions:cancel',
        'credentials:read', 'credentials:create', 'credentials:update', 'credentials:delete',
        'webhooks:read', 'webhooks:create',
        'profile:read', 'profile:update'
      ]
    };

    const permissions = rolePermissions[this.role] || [];
    
    // Admin has all permissions
    if (permissions.includes('*')) {
      return true;
    }

    return permissions.includes(permission);
  }

  public canAccessWorkflow(workflowUserId: number): boolean {
    // Admin can access all workflows
    if (this.role === 'admin') {
      return true;
    }
    
    // Users can only access their own workflows
    return this.id === workflowUserId;
  }

  public toSafeJSON(): Partial<IUser> {
    const user = this.toJSON();
    
    // Remove sensitive fields
    delete user.password;
    
    return user;
  }

  public toPublicJSON(): Partial<IUser> {
    return {
      id: this.id,
      username: this.username,
      firstName: this.firstName,
      lastName: this.lastName,
      role: this.role,
      isActive: this.isActive,
      lastLogin: this.lastLogin,
    };
  }

  public generateEmailVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  public generatePasswordResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

export function initUserModel(sequelize: Sequelize): typeof UserModel {
  UserModel.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      username: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      firstName: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      lastName: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      role: {
        type: DataTypes.ENUM('admin', 'user'),
        defaultValue: 'user',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true,
      hooks: {
        beforeCreate: async (user: UserModel) => {
          if (user.password && !user.password.startsWith('$2')) {
            await user.setPassword(user.password);
          }
        },
        beforeUpdate: async (user: UserModel) => {
          if (user.changed('password') && !user.password.startsWith('$2')) {
            await user.setPassword(user.password);
          }
        },
      },
    }
  );
  
  return UserModel;
}