import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

export class Database {
  private static instance: Database;
  private sequelize: Sequelize;

  private constructor() {
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      database: process.env.DB_NAME || 'workflow_automation',
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
    };

    this.sequelize = new Sequelize({
      ...dbConfig,
      dialect: 'mysql',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private async initializeModels(): Promise<void> {
    // Dynamic imports to avoid circular dependencies
    const { initWorkflowModel } = await import('../models/Workflow.model');
    const { initExecutionModel } = await import('../models/Execution.model');
    const { initUserModel } = await import('../models/User.model');
    const { initWebhookModel } = await import('../models/Webhook.model');
    const { initTriggerModel } = await import('../models/Trigger.model');
    const { initExecutionLogModel } = await import('../models/ExecutionLog.model');

    const Workflow = initWorkflowModel(this.sequelize);
    const Execution = initExecutionModel(this.sequelize);
    const User = initUserModel(this.sequelize);
    const Webhook = initWebhookModel(this.sequelize);
    const Trigger = initTriggerModel(this.sequelize);
    const ExecutionLog = initExecutionLogModel(this.sequelize);

    User.hasMany(Workflow, { foreignKey: 'userId', as: 'workflows' });
    Workflow.belongsTo(User, { foreignKey: 'userId', as: 'user' });

    Workflow.hasMany(Execution, { foreignKey: 'workflowId', as: 'executions' });
    Execution.belongsTo(Workflow, { foreignKey: 'workflowId', as: 'workflow' });

    Workflow.hasMany(Webhook, { foreignKey: 'workflowId', as: 'webhooks' });
    Webhook.belongsTo(Workflow, { foreignKey: 'workflowId', as: 'workflow' });

    Workflow.hasMany(Trigger, { foreignKey: 'workflowId', as: 'triggers' });
    Trigger.belongsTo(Workflow, { foreignKey: 'workflowId', as: 'workflow' });

    Execution.hasMany(ExecutionLog, { foreignKey: 'executionId', as: 'logs' });
    ExecutionLog.belongsTo(Execution, { foreignKey: 'executionId', as: 'execution' });
  }

  public async connect(): Promise<void> {
    try {
      await this.sequelize.authenticate();
      console.log('Database connection established successfully.');
      
      // Initialize models after connection is established
      await this.initializeModels();
      console.log('Database models initialized successfully.');
    } catch (error) {
      console.error('Unable to connect to the database:', error);
      throw error;
    }
  }

  public async sync(force: boolean = false): Promise<void> {
    try {
      await this.sequelize.sync({ force });
      console.log('Database synchronized successfully.');
    } catch (error) {
      console.error('Error synchronizing database:', error);
      throw error;
    }
  }

  public getSequelize(): Sequelize {
    return this.sequelize;
  }

  public getQueryInterface() {
    return this.sequelize.getQueryInterface();
  }

  public async close(): Promise<void> {
    await this.sequelize.close();
  }
}

export const db = Database.getInstance();