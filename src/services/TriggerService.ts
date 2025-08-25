import { EventEmitter } from 'events';
import * as cron from 'node-cron';
import Bull, { Queue } from 'bull';
import { TriggerModel } from '../models/Trigger.model';
import { WorkflowModel } from '../models/Workflow.model';
import { executionService } from './ExecutionService';
import { ITriggerData, TriggerType, IWorkflow, INode, NodeType } from '../types/workflow.types';
import config from '../config';
import { createLogger } from '../utils/logger';

const logger = createLogger('TriggerService');

export interface IScheduledTrigger {
  id: string;
  workflowId: string;
  nodeId: string;
  cronExpression: string;
  timezone?: string;
  active: boolean;
  task?: cron.ScheduledTask;
}

export interface IEventTrigger {
  id: string;
  workflowId: string;
  nodeId: string;
  eventType: string;
  active: boolean;
  filter?: Record<string, any>;
}

export class TriggerService extends EventEmitter {
  private static instance: TriggerService;
  private scheduledTriggers: Map<string, IScheduledTrigger> = new Map();
  private eventTriggers: Map<string, IEventTrigger> = new Map();
  private triggerQueue: Queue;
  private pollingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.triggerQueue = new Bull('workflow-triggers', {
      redis: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

    this.setupQueueHandlers();
  }

  public static getInstance(): TriggerService {
    if (!TriggerService.instance) {
      TriggerService.instance = new TriggerService();
    }
    return TriggerService.instance;
  }

  private setupQueueHandlers(): void {
    this.triggerQueue.process('execute-trigger', 10, async (job) => {
      const { triggerId, workflowId, nodeId, triggerData } = job.data;
      
      try {
        logger.info(`Processing trigger execution`, {
          triggerId,
          workflowId,
          nodeId,
        });

        await executionService.executeWorkflowTrigger(workflowId, triggerData, nodeId);
        
        await this.updateTriggerLastRun(triggerId);
        
        logger.info(`Trigger executed successfully`, {
          triggerId,
          workflowId,
        });

      } catch (error: any) {
        logger.error(`Trigger execution failed`, {
          triggerId,
          workflowId,
          error: error.message,
        });
        throw error;
      }
    });
  }

  public async initializeTriggers(): Promise<void> {
    try {
      logger.info('Initializing triggers...');

      const triggers = await TriggerModel.findAll({
        where: { isActive: true },
        include: [{
          model: WorkflowModel,
          as: 'workflow',
          where: { isActive: true },
        }],
      });

      for (const trigger of triggers) {
        await this.registerTrigger(trigger.toJSON() as ITriggerData);
      }

      this.startPolling();

      logger.info(`Initialized ${triggers.length} active triggers`);
    } catch (error: any) {
      // If the table doesn't exist yet, just log a warning and continue
      if (error.name === 'SequelizeDatabaseError' && error.parent?.code === 'ER_NO_SUCH_TABLE') {
        logger.warn('Triggers table does not exist yet. Skipping trigger initialization.');
        this.startPolling(); // Still start polling for future triggers
        return;
      }
      logger.error('Error initializing triggers:', error);
      throw error;
    }
  }

  public async registerTrigger(triggerData: ITriggerData): Promise<void> {
    try {
      switch (triggerData.type) {
        case TriggerType.SCHEDULE:
        case 'cron':  // Handle both 'schedule' and 'cron' types
          await this.registerScheduleTrigger(triggerData);
          break;
        case TriggerType.EVENT:
          await this.registerEventTrigger(triggerData);
          break;
        case TriggerType.WEBHOOK:
        case 'webhook':  // Handle lowercase version
          await this.registerWebhookTrigger(triggerData);
          break;
        case TriggerType.EMAIL:
          await this.registerEmailTrigger(triggerData);
          break;
        case TriggerType.FILE_WATCH:
          await this.registerFileWatchTrigger(triggerData);
          break;
        case TriggerType.MANUAL:
        case 'manual':  // Handle lowercase version
          // Manual triggers don't need registration
          logger.info(`Manual trigger registered`, {
            triggerId: triggerData.id,
            workflowId: triggerData.workflowId,
          });
          break;
        default:
          logger.warn(`Unknown trigger type: ${triggerData.type}`);
      }
    } catch (error: any) {
      logger.error(`Error registering trigger ${triggerData.id}:`, error);
      throw error;
    }
  }

  private async registerScheduleTrigger(triggerData: ITriggerData): Promise<void> {
    // Try to get schedule from multiple possible locations
    const schedule = triggerData.schedule || 
                    triggerData.config?.cronExpression || 
                    triggerData.config?.schedule ||
                    triggerData.metadata?.cronExpression;
                    
    if (!schedule) {
      throw new Error(`Schedule trigger ${triggerData.id} missing schedule`);
    }

    if (!cron.validate(schedule)) {
      throw new Error(`Invalid cron expression: ${schedule}`);
    }

    const scheduledTrigger: IScheduledTrigger = {
      id: triggerData.id,
      workflowId: triggerData.workflowId,
      nodeId: triggerData.nodeId,
      cronExpression: schedule,
      timezone: triggerData.metadata?.timezone || triggerData.config?.timezone || 'UTC',
      active: triggerData.active ?? triggerData.isActive ?? true,
    };

    const isActive = triggerData.active ?? triggerData.isActive ?? true;
    if (isActive) {
      const task = cron.schedule(schedule, async () => {
        try {
          await this.triggerQueue.add('execute-trigger', {
            triggerId: triggerData.id,
            workflowId: triggerData.workflowId,
            nodeId: triggerData.nodeId,
            triggerData: {
              triggerTime: new Date(),
              schedule,
            },
          });
        } catch (error: any) {
          logger.error(`Error queuing scheduled trigger ${triggerData.id}:`, error);
        }
      }, {
        scheduled: false,
        timezone: scheduledTrigger.timezone,
      });

      scheduledTrigger.task = task;
      task.start();
    }

    this.scheduledTriggers.set(triggerData.id, scheduledTrigger);
    
    logger.info(`Registered schedule trigger`, {
      triggerId: triggerData.id,
      workflowId: triggerData.workflowId,
      schedule,
      active: triggerData.active,
    });
  }

  private async registerEventTrigger(triggerData: ITriggerData): Promise<void> {
    const eventType = triggerData.event;
    if (!eventType) {
      throw new Error(`Event trigger ${triggerData.id} missing event type`);
    }

    const eventTrigger: IEventTrigger = {
      id: triggerData.id,
      workflowId: triggerData.workflowId,
      nodeId: triggerData.nodeId,
      eventType,
      active: triggerData.active,
      filter: triggerData.metadata?.filter,
    };

    this.eventTriggers.set(triggerData.id, eventTrigger);
    
    logger.info(`Registered event trigger`, {
      triggerId: triggerData.id,
      workflowId: triggerData.workflowId,
      eventType,
      active: triggerData.active,
    });
  }

  private async registerWebhookTrigger(triggerData: ITriggerData): Promise<void> {
    logger.info(`Registered webhook trigger`, {
      triggerId: triggerData.id,
      workflowId: triggerData.workflowId,
    });
  }

  private async registerEmailTrigger(triggerData: ITriggerData): Promise<void> {
    logger.info(`Registered email trigger`, {
      triggerId: triggerData.id,
      workflowId: triggerData.workflowId,
    });
  }

  private async registerFileWatchTrigger(triggerData: ITriggerData): Promise<void> {
    logger.info(`Registered file watch trigger`, {
      triggerId: triggerData.id,
      workflowId: triggerData.workflowId,
    });
  }

  public async unregisterTrigger(triggerId: string): Promise<void> {
    const scheduledTrigger = this.scheduledTriggers.get(triggerId);
    if (scheduledTrigger) {
      if (scheduledTrigger.task) {
        scheduledTrigger.task.stop();
      }
      this.scheduledTriggers.delete(triggerId);
      
      logger.info(`Unregistered schedule trigger ${triggerId}`);
    }

    const eventTrigger = this.eventTriggers.get(triggerId);
    if (eventTrigger) {
      this.eventTriggers.delete(triggerId);
      
      logger.info(`Unregistered event trigger ${triggerId}`);
    }
  }

  public async activateTrigger(triggerId: string): Promise<void> {
    await TriggerModel.update(
      { isActive: true },
      { where: { id: triggerId } }
    );

    const trigger = await TriggerModel.findByPk(triggerId);
    if (trigger) {
      await this.registerTrigger(trigger.toJSON() as ITriggerData);
    }
  }

  public async deactivateTrigger(triggerId: string): Promise<void> {
    await TriggerModel.update(
      { active: false },
      { where: { id: triggerId } }
    );

    await this.unregisterTrigger(triggerId);
  }

  public async emitEvent(eventType: string, eventData: any): Promise<void> {
    const matchingTriggers = Array.from(this.eventTriggers.values()).filter(
      trigger => trigger.active && trigger.eventType === eventType
    );

    for (const trigger of matchingTriggers) {
      try {
        if (this.matchesFilter(eventData, trigger.filter)) {
          await this.triggerQueue.add('execute-trigger', {
            triggerId: trigger.id,
            workflowId: trigger.workflowId,
            nodeId: trigger.nodeId,
            triggerData: {
              eventType,
              eventData,
              timestamp: new Date(),
            },
          });
        }
      } catch (error: any) {
        logger.error(`Error queuing event trigger ${trigger.id}:`, error);
      }
    }
  }

  private matchesFilter(data: any, filter?: Record<string, any>): boolean {
    if (!filter) return true;

    for (const [key, value] of Object.entries(filter)) {
      if (data[key] !== value) {
        return false;
      }
    }

    return true;
  }

  private startPolling(): void {
    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollTriggers();
      } catch (error: any) {
        logger.error('Error during trigger polling:', error);
      }
    }, 60000); // Poll every minute

    logger.info('Started trigger polling');
  }

  private async pollTriggers(): Promise<void> {
    const now = new Date();
    
    const pendingTriggers = await TriggerModel.findAll({
      where: {
        isActive: true,
        nextTrigger: {
          [require('sequelize').Op.lte]: now,
        },
      },
    });

    for (const trigger of pendingTriggers) {
      try {
        const triggerData = trigger.toJSON() as ITriggerData;
        
        await this.triggerQueue.add('execute-trigger', {
          triggerId: triggerData.id,
          workflowId: triggerData.workflowId,
          nodeId: triggerData.nodeId,
          triggerData: {
            triggerTime: now,
            type: triggerData.type,
          },
        });

        await this.calculateNextTrigger(triggerData);
        
      } catch (error: any) {
        logger.error(`Error processing pending trigger ${trigger.id}:`, error);
      }
    }
  }

  private async calculateNextTrigger(triggerData: ITriggerData): Promise<void> {
    let nextTrigger: Date | null = null;

    switch (triggerData.type) {
      case TriggerType.SCHEDULE:
        if (triggerData.schedule) {
          const interval = this.parseCronInterval(triggerData.schedule);
          if (interval) {
            nextTrigger = new Date(Date.now() + interval);
          }
        }
        break;
    }

    if (nextTrigger) {
      await TriggerModel.update(
        { nextTrigger },
        { where: { id: triggerData.id } }
      );
    }
  }

  private parseCronInterval(cronExpression: string): number | null {
    const parts = cronExpression.split(' ');
    if (parts.length < 5) return null;

    const minute = parts[0];
    const hour = parts[1];
    const day = parts[2];
    const month = parts[3];
    const dayOfWeek = parts[4];

    if (minute === '*' && hour === '*' && day === '*' && month === '*' && dayOfWeek === '*') {
      return 60 * 1000;
    }

    if (minute !== '*' && hour === '*' && day === '*' && month === '*' && dayOfWeek === '*') {
      return 60 * 60 * 1000;
    }

    return 24 * 60 * 60 * 1000;
  }

  private async updateTriggerLastRun(triggerId: string): Promise<void> {
    try {
      await TriggerModel.update(
        { lastTriggered: new Date() },
        { where: { id: triggerId } }
      );
    } catch (error: any) {
      logger.error(`Error updating trigger last run ${triggerId}:`, error);
    }
  }

  public async getTriggerStatistics(): Promise<any> {
    const totalTriggers = await TriggerModel.count();
    const activeTriggers = await TriggerModel.count({ where: { isActive: true } });
    const scheduledTriggersCount = this.scheduledTriggers.size;
    const eventTriggersCount = this.eventTriggers.size;

    const queueStats = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
    };

    try {
      const waiting = await this.triggerQueue.getWaiting();
      const active = await this.triggerQueue.getActive();
      const completed = await this.triggerQueue.getCompleted();
      const failed = await this.triggerQueue.getFailed();

      queueStats.waiting = waiting.length;
      queueStats.active = active.length;
      queueStats.completed = completed.length;
      queueStats.failed = failed.length;
    } catch (error: any) {
      logger.error('Error fetching queue statistics:', error);
    }

    return {
      totalTriggers,
      activeTriggers,
      registeredTriggers: {
        scheduled: scheduledTriggersCount,
        event: eventTriggersCount,
      },
      queue: queueStats,
    };
  }

  public async getActiveTriggers(): Promise<ITriggerData[]> {
    const triggers = await TriggerModel.findAll({
      where: { isActive: true },
      include: [{
        model: WorkflowModel,
        as: 'workflow',
        attributes: ['id', 'name'],
      }],
    });

    return triggers.map(t => t.toJSON() as ITriggerData);
  }

  public async createWorkflowTriggers(workflowId: string): Promise<void> {
    try {
      const workflow = await WorkflowModel.findByPk(workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      const workflowData = workflow.toJSON() as IWorkflow;
      const triggerNodes = workflowData.nodes.filter(node => 
        node.type === NodeType.TRIGGER ||
        node.type === NodeType.WEBHOOK ||
        node.type === NodeType.SCHEDULE
      );

      for (const node of triggerNodes) {
        await this.createTriggerFromNode(workflowId, node);
      }

      logger.info(`Created ${triggerNodes.length} triggers for workflow ${workflowId}`);
    } catch (error: any) {
      logger.error(`Error creating triggers for workflow ${workflowId}:`, error);
      throw error;
    }
  }

  private async createTriggerFromNode(workflowId: string, node: INode): Promise<void> {
    let triggerType: TriggerType;
    let schedule: string | undefined;
    let event: string | undefined;
    let metadata: Record<string, any> = {};
    let config: Record<string, any> = {};

    switch (node.type) {
      case NodeType.SCHEDULE:
        triggerType = 'cron' as any;  // Map SCHEDULE to 'cron' for database
        schedule = node.parameters?.cronExpression || '*/5 * * * *';  // Default: every 5 minutes
        metadata.timezone = node.parameters?.timezone || 'UTC';
        config = {
          cronExpression: schedule,
          timezone: metadata.timezone,
        };
        logger.info(`Creating schedule trigger with cron: ${schedule}`, {
          nodeId: node.id,
          workflowId,
          parameters: node.parameters
        });
        break;
      case NodeType.WEBHOOK:
        triggerType = 'webhook' as any;  // Use lowercase 'webhook' for database
        metadata.path = node.parameters.path;
        metadata.method = node.parameters.method || 'POST';
        config = {
          path: metadata.path,
          method: metadata.method,
        };
        break;
      case NodeType.TRIGGER:
        triggerType = 'manual' as any;  // Use lowercase 'manual' for database
        config = {
          type: 'manual',
        };
        break;
      default:
        return;
    }

    const triggerData: Partial<ITriggerData> = {
      workflowId,
      nodeId: node.id,
      type: triggerType,
      schedule,
      event,
      isActive: true,
      metadata,
      config,
    };

    const trigger = await TriggerModel.create(triggerData as any);
    await this.registerTrigger(trigger.toJSON() as ITriggerData);
  }

  public async removeWorkflowTriggers(workflowId: string): Promise<void> {
    try {
      const triggers = await TriggerModel.findAll({
        where: { workflowId },
      });

      for (const trigger of triggers) {
        await this.unregisterTrigger(trigger.id);
      }

      await TriggerModel.destroy({
        where: { workflowId },
      });

      logger.info(`Removed triggers for workflow ${workflowId}`);
    } catch (error: any) {
      logger.error(`Error removing triggers for workflow ${workflowId}:`, error);
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    logger.info('Shutting down trigger service...');

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    for (const [triggerId, trigger] of this.scheduledTriggers) {
      if (trigger.task) {
        trigger.task.stop();
      }
    }

    this.scheduledTriggers.clear();
    this.eventTriggers.clear();

    await this.triggerQueue.close();
    
    logger.info('Trigger service shutdown complete');
  }
}

export const triggerService = TriggerService.getInstance();