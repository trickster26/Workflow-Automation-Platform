import { Model, DataTypes, Sequelize } from 'sequelize';

export interface IExecution {
  id: number;
  workflowId: number;
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled';
  startedAt?: Date;
  finishedAt?: Date;
  data?: any;
  error?: string;
  executionTime?: number;
  mode: 'manual' | 'trigger' | 'test';
  createdAt: Date;
  updatedAt: Date;
}

export class ExecutionModel extends Model<IExecution> implements IExecution {
  public id!: number;
  public workflowId!: number;
  public status!: 'pending' | 'running' | 'success' | 'error' | 'cancelled';
  public startedAt?: Date;
  public finishedAt?: Date;
  public data?: any;
  public error?: string;
  public executionTime?: number;
  public mode!: 'manual' | 'trigger' | 'test';
  public createdAt!: Date;
  public updatedAt!: Date;
}

export const initExecutionModel = (sequelize: Sequelize) => {
  ExecutionModel.init(
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
      status: {
        type: DataTypes.ENUM('pending', 'running', 'success', 'error', 'cancelled'),
        defaultValue: 'pending',
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      finishedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      data: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      error: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      executionTime: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      mode: {
        type: DataTypes.ENUM('manual', 'trigger', 'test'),
        defaultValue: 'manual',
      },
    },
    {
      sequelize,
      modelName: 'Execution',
      tableName: 'executions',
      timestamps: true,
    }
  );

  return ExecutionModel;
};