import { Request, Response } from 'express';
import { WorkflowModel } from '../models/Workflow.model';
import { webhookService } from '../services/WebhookService';
import { triggerService } from '../services/TriggerService';
import { IWorkflow, NodeType } from '../types/workflow.types';
import { createLogger } from '../utils/logger';

const logger = createLogger('WorkflowController');

export class WorkflowController {
  // Get all workflows
  public static async getAllWorkflows(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const whereClause = userId ? { userId } : {};

      const workflows = await WorkflowModel.findAll({
        where: whereClause,
        order: [['updatedAt', 'DESC']],
      });

      const workflowData = workflows.map(w => w.toJSON());
      res.json(workflowData);
    } catch (error: any) {
      logger.error('Error fetching workflows:', error);
      res.status(500).json({ error: 'Failed to fetch workflows' });
    }
  }

  // Get workflow by ID
  public static async getWorkflowById(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const userId = req.user?.id;

      const whereClause: any = { id: workflowId };
      if (userId) {
        whereClause.userId = userId;
      }

      const workflow = await WorkflowModel.findOne({
        where: whereClause,
      });

      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }

      res.json(workflow.toJSON());
    } catch (error: any) {
      logger.error('Error fetching workflow:', error);
      res.status(500).json({ error: 'Failed to fetch workflow' });
    }
  }

  // Create workflow
  public static async createWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'system'; // Fallback for development
      const workflowData = {
        ...req.body,
        userId,
        nodes: req.body.nodes || [],
        connections: req.body.connections || [],
        version: 1,
      };

      const workflow = await WorkflowModel.create(workflowData);
      const createdWorkflow = workflow.toJSON() as IWorkflow;

      // Create webhooks and triggers for the workflow
      await WorkflowController.setupWorkflowIntegrations(createdWorkflow);

      logger.info(`Created workflow: ${createdWorkflow.id}`, {
        workflowId: createdWorkflow.id,
        name: createdWorkflow.name,
        userId,
      });

      res.status(201).json(createdWorkflow);
    } catch (error: any) {
      logger.error('Error creating workflow:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Update workflow
  public static async updateWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const userId = req.user?.id;

      const whereClause: any = { id: workflowId };
      if (userId) {
        whereClause.userId = userId;
      }

      const workflow = await WorkflowModel.findOne({
        where: whereClause,
      });

      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }

      // Increment version on significant changes
      const updateData = {
        ...req.body,
        version: workflow.version + 1,
        updatedAt: new Date(),
      };

      await workflow.update(updateData);
      const updatedWorkflow = workflow.toJSON() as IWorkflow;

      // Update webhooks and triggers
      await WorkflowController.setupWorkflowIntegrations(updatedWorkflow);

      logger.info(`Updated workflow: ${workflowId}`, {
        workflowId,
        version: updatedWorkflow.version,
        userId,
      });

      res.json(updatedWorkflow);
    } catch (error: any) {
      logger.error('Error updating workflow:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Delete workflow
  public static async deleteWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const userId = req.user?.id;

      const whereClause: any = { id: workflowId };
      if (userId) {
        whereClause.userId = userId;
      }

      const workflow = await WorkflowModel.findOne({
        where: whereClause,
      });

      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }

      // Remove associated webhooks and triggers
      await webhookService.removeWebhooksForWorkflow(workflowId);
      await triggerService.removeWorkflowTriggers(workflowId);

      await workflow.destroy();

      logger.info(`Deleted workflow: ${workflowId}`, {
        workflowId,
        userId,
      });

      res.status(204).send();
    } catch (error: any) {
      logger.error('Error deleting workflow:', error);
      res.status(500).json({ error: 'Failed to delete workflow' });
    }
  }

  // Activate workflow
  public static async activateWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const userId = req.user?.id;

      const whereClause: any = { id: workflowId };
      if (userId) {
        whereClause.userId = userId;
      }

      const workflow = await WorkflowModel.findOne({
        where: whereClause,
      });

      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }

      await workflow.update({ active: true });
      const workflowData = workflow.toJSON() as IWorkflow;

      // Activate triggers
      await triggerService.createWorkflowTriggers(workflowId);

      logger.info(`Activated workflow: ${workflowId}`, {
        workflowId,
        userId,
      });

      res.json({ success: true, workflow: workflowData });
    } catch (error: any) {
      logger.error('Error activating workflow:', error);
      res.status(500).json({ error: 'Failed to activate workflow' });
    }
  }

  // Deactivate workflow
  public static async deactivateWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const userId = req.user?.id;

      const whereClause: any = { id: workflowId };
      if (userId) {
        whereClause.userId = userId;
      }

      const workflow = await WorkflowModel.findOne({
        where: whereClause,
      });

      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }

      await workflow.update({ active: false });
      const workflowData = workflow.toJSON() as IWorkflow;

      // Remove triggers
      await triggerService.removeWorkflowTriggers(workflowId);

      logger.info(`Deactivated workflow: ${workflowId}`, {
        workflowId,
        userId,
      });

      res.json({ success: true, workflow: workflowData });
    } catch (error: any) {
      logger.error('Error deactivating workflow:', error);
      res.status(500).json({ error: 'Failed to deactivate workflow' });
    }
  }

  // Get workflow webhooks
  public static async getWorkflowWebhooks(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const webhooks = await webhookService.getWorkflowWebhooks(workflowId);
      res.json(webhooks);
    } catch (error: any) {
      logger.error('Error fetching workflow webhooks:', error);
      res.status(500).json({ error: 'Failed to fetch webhooks' });
    }
  }

  // Test workflow
  public static async testWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const { startNode, inputData } = req.body;
      const userId = req.user?.id;

      const whereClause: any = { id: workflowId };
      if (userId) {
        whereClause.userId = userId;
      }

      const workflow = await WorkflowModel.findOne({
        where: whereClause,
      });

      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }

      // Execute workflow in test mode
      const { executionService } = await import('../services/ExecutionService');
      const jobId = await executionService.executeWorkflow({
        workflowId,
        userId,
        mode: 'manual',
        startNode,
        inputData,
      });

      logger.info(`Started test execution for workflow: ${workflowId}`, {
        workflowId,
        jobId,
        userId,
      });

      res.json({
        success: true,
        jobId,
        message: 'Test execution started',
      });
    } catch (error: any) {
      logger.error('Error testing workflow:', error);
      res.status(500).json({ error: 'Failed to test workflow' });
    }
  }

  // Duplicate workflow
  public static async duplicateWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const userId = req.user?.id;

      const whereClause: any = { id: workflowId };
      if (userId) {
        whereClause.userId = userId;
      }

      const originalWorkflow = await WorkflowModel.findOne({
        where: whereClause,
      });

      if (!originalWorkflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }

      const workflowData = originalWorkflow.toJSON();
      const duplicateData = {
        ...workflowData,
        id: undefined, // Let database generate new ID
        name: `${workflowData.name} (Copy)`,
        active: false, // Start as inactive
        version: 1,
        createdAt: undefined,
        updatedAt: undefined,
      };

      const duplicatedWorkflow = await WorkflowModel.create(duplicateData);
      const result = duplicatedWorkflow.toJSON() as IWorkflow;

      logger.info(`Duplicated workflow: ${workflowId} -> ${result.id}`, {
        originalId: workflowId,
        newId: result.id,
        userId,
      });

      res.status(201).json(result);
    } catch (error: any) {
      logger.error('Error duplicating workflow:', error);
      res.status(500).json({ error: 'Failed to duplicate workflow' });
    }
  }

  // Private helper method to setup webhooks and triggers
  private static async setupWorkflowIntegrations(workflow: IWorkflow): Promise<void> {
    try {
      // Remove existing webhooks and triggers
      await webhookService.removeWebhooksForWorkflow(workflow.id);
      await triggerService.removeWorkflowTriggers(workflow.id);

      // Create new webhooks for webhook nodes
      for (const node of workflow.nodes) {
        if (node.type === NodeType.WEBHOOK) {
          await webhookService.createWebhookForNode(workflow.id, node);
        }
      }

      // Create triggers if workflow is active
      if (workflow.active) {
        await triggerService.createWorkflowTriggers(workflow.id);
      }
    } catch (error: any) {
      logger.error(`Error setting up integrations for workflow ${workflow.id}:`, error);
    }
  }

  // Get workflow statistics
  public static async getWorkflowStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const whereClause = userId ? { userId } : {};

      const totalWorkflows = await WorkflowModel.count({ where: whereClause });
      const activeWorkflows = await WorkflowModel.count({ 
        where: { ...whereClause, active: true } 
      });

      const stats = {
        total: totalWorkflows,
        active: activeWorkflows,
        inactive: totalWorkflows - activeWorkflows,
      };

      res.json(stats);
    } catch (error: any) {
      logger.error('Error fetching workflow stats:', error);
      res.status(500).json({ error: 'Failed to fetch workflow statistics' });
    }
  }
}