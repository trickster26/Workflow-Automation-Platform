import { Model, DataTypes, Sequelize } from 'sequelize';

export interface IWebhook {
  id: number;
  workflowId: number;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  isActive: boolean;
  headers?: any;
  authentication?: any;
  createdAt: Date;
  updatedAt: Date;
}

export class WebhookModel extends Model<IWebhook> implements IWebhook {
  public id!: number;
  public workflowId!: number;
  public path!: string;
  public method!: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  public isActive!: boolean;
  public headers?: any;
  public authentication?: any;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export const initWebhookModel = (sequelize: Sequelize) => {
  WebhookModel.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      workflowId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      path: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      method: {
        type: DataTypes.ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
        defaultValue: 'POST',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      headers: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      authentication: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Webhook',
      tableName: 'webhooks',
      timestamps: true,
    }
  );

  return WebhookModel;
};