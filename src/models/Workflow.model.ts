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
  public id!: number;
  public userId!: number;
  public name!: string;
  public description?: string;
  public nodes!: any[];
  public connections!: any[];
  public settings?: any;
  public isActive!: boolean;
  public version!: number;
  public tags?: string[];
  public createdAt!: Date;
  public updatedAt!: Date;
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