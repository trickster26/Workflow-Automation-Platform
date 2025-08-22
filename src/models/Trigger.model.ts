import { Model, DataTypes, Sequelize } from 'sequelize';

export interface ITrigger {
  id: number;
  workflowId: number;
  type: 'cron' | 'interval' | 'webhook' | 'manual';
  config: any;
  isActive: boolean;
  lastTriggered?: Date;
  nextTrigger?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class TriggerModel extends Model<ITrigger> implements ITrigger {
  public id!: number;
  public workflowId!: number;
  public type!: 'cron' | 'interval' | 'webhook' | 'manual';
  public config!: any;
  public isActive!: boolean;
  public lastTriggered?: Date;
  public nextTrigger?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export const initTriggerModel = (sequelize: Sequelize) => {
  TriggerModel.init(
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
      type: {
        type: DataTypes.ENUM('cron', 'interval', 'webhook', 'manual'),
        allowNull: false,
      },
      config: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      lastTriggered: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      nextTrigger: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Trigger',
      tableName: 'triggers',
      timestamps: true,
    }
  );

  return TriggerModel;
};