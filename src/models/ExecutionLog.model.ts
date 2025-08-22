import { Model, DataTypes, Sequelize } from 'sequelize';

export interface IExecutionLog {
  id: number;
  executionId: number;
  nodeId: string;
  nodeName?: string;
  status: 'running' | 'success' | 'error' | 'skipped';
  startedAt: Date;
  finishedAt?: Date;
  input?: any;
  output?: any;
  error?: string;
}

export class ExecutionLogModel extends Model<IExecutionLog> implements IExecutionLog {
  public id!: number;
  public executionId!: number;
  public nodeId!: string;
  public nodeName?: string;
  public status!: 'running' | 'success' | 'error' | 'skipped';
  public startedAt!: Date;
  public finishedAt?: Date;
  public input?: any;
  public output?: any;
  public error?: string;
}

export const initExecutionLogModel = (sequelize: Sequelize) => {
  ExecutionLogModel.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      executionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      nodeId: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      nodeName: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('running', 'success', 'error', 'skipped'),
        allowNull: false,
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      finishedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      input: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      output: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      error: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'ExecutionLog',
      tableName: 'execution_logs',
      timestamps: false,
    }
  );

  return ExecutionLogModel;
};