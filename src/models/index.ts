// Models index file - exports all model classes and interfaces
import { db } from '../config/database';

// Re-export the model initialization functions
export { initUserModel } from './User.model';
export { initWorkflowModel } from './Workflow.model';
export { initExecutionModel } from './Execution.model';
export { initExecutionLogModel } from './ExecutionLog.model';
export { initTriggerModel } from './Trigger.model';
export { initWebhookModel } from './Webhook.model';
export { initCredentialModel } from './Credential';

// For immediate use, initialize models with database instance
const sequelize = db.getSequelize();

// Import and initialize models
import { initUserModel } from './User.model';
import { initWorkflowModel } from './Workflow.model';
import { initExecutionModel } from './Execution.model';
import { initExecutionLogModel } from './ExecutionLog.model';
import { initTriggerModel } from './Trigger.model';
import { initWebhookModel } from './Webhook.model';
import { initCredentialModel } from './Credential';

export const User = initUserModel(sequelize);
export const Workflow = initWorkflowModel(sequelize);
export const WorkflowExecution = initExecutionModel(sequelize);
export const ExecutionLog = initExecutionLogModel(sequelize);
export const Trigger = initTriggerModel(sequelize);
export const Webhook = initWebhookModel(sequelize);
export const Credential = initCredentialModel(sequelize);

// Define WorkflowNode interface (if it doesn't exist in other models)
export interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  parameters: any;
  position: {
    x: number;
    y: number;
  };
}

