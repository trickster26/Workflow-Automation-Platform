import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface ICredential {
  id: string;
  userId: number;
  name: string;
  type: 'api_key' | 'oauth2' | 'basic_auth' | 'database' | 'ssh' | 'aws' | 'custom';
  description?: string;
  encryptedData: string;
  metadata?: any;
  isShared: boolean;
  sharedWith?: string[];
  permissions?: string[];
  lastUsed?: Date;
  validatedAt?: Date;
  isValid: boolean;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ICredentialCreationAttributes extends Optional<ICredential, 'id' | 'description' | 'metadata' | 'sharedWith' | 'permissions' | 'lastUsed' | 'validatedAt' | 'tags' | 'createdAt' | 'updatedAt'> {}

export class CredentialModel extends Model<ICredential, ICredentialCreationAttributes> implements ICredential {
  declare id: string;
  declare userId: number;
  declare name: string;
  declare type: 'api_key' | 'oauth2' | 'basic_auth' | 'database' | 'ssh' | 'aws' | 'custom';
  declare description?: string;
  declare encryptedData: string;
  declare metadata?: any;
  declare isShared: boolean;
  declare sharedWith?: string[];
  declare permissions?: string[];
  declare lastUsed?: Date;
  declare validatedAt?: Date;
  declare isValid: boolean;
  declare tags?: string[];
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export function initCredentialModel(sequelize: Sequelize): typeof CredentialModel {
  CredentialModel.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM('api_key', 'oauth2', 'basic_auth', 'database', 'ssh', 'aws', 'custom'),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      encryptedData: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
      },
      isShared: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      sharedWith: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      permissions: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: ['read', 'use'],
      },
      lastUsed: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      validatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      isValid: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      tags: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
    },
    {
      sequelize,
      modelName: 'Credential',
      tableName: 'credentials',
      timestamps: true,
      indexes: [
        {
          fields: ['userId'],
        },
        {
          fields: ['type'],
        },
        {
          fields: ['isShared'],
        },
        {
          fields: ['name', 'userId'],
          unique: true,
        },
      ],
    }
  );
  
  return CredentialModel;
}