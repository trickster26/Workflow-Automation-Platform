import { Model, DataTypes, Sequelize } from 'sequelize';

export interface IWorkflow {
  id: number;
  userId: number;
  name: string;
  description?: string;
  nodes: any[];
  connections: any[];
  settings?: any;
  isActive: boolean;
  version: number;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class WorkflowModel extends Model<IWorkflow> implements IWorkflow {
  // Remove public class fields to avoid shadowing Sequelize's getters/setters
  declare id: number;
  declare userId: number;
  declare name: string;
  declare description?: string;
  declare nodes: any[];
  declare connections: any[];
  declare settings?: any;
  declare isActive: boolean;
  declare version: number;
  declare tags?: string[];
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

export const initWorkflowModel = (sequelize: Sequelize) => {
  WorkflowModel.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      nodes: {
        type: DataTypes.JSON,
        defaultValue: [],
        allowNull: false,
      },
      connections: {
        type: DataTypes.JSON,
        defaultValue: [],
        allowNull: false,
      },
      settings: {
        type: DataTypes.JSON,
        defaultValue: {},
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      version: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      tags: {
        type: DataTypes.JSON,
        defaultValue: [],
      },
    },
    {
      sequelize,
      modelName: 'Workflow',
      tableName: 'workflows',
      timestamps: true,
    }
  );

  return WorkflowModel;
};