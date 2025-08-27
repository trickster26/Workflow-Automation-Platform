import Bull, { Queue, QueueOptions, Job, JobOptions } from 'bull';
import { createLogger } from '../utils/logger';
import config from '../config';

const logger = createLogger('QueueManager');

export interface IQueueConfig {
  name: string;
  concurrency?: number;
  defaultJobOptions?: JobOptions;
  processor?: (job: Job) => Promise<any>;
  events?: {
    completed?: (job: Job, result: any) => void;
    failed?: (job: Job, error: Error) => void;
    stalled?: (job: Job) => void;
    progress?: (job: Job, progress: number) => void;
  };
}

export class QueueManager {
  private static instance: QueueManager;
  private queues: Map<string, Queue> = new Map();
  private redisConfig: any;

  private constructor() {
    this.redisConfig = {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    };
  }

  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  public createQueue(queueConfig: IQueueConfig): Queue {
    if (this.queues.has(queueConfig.name)) {
      logger.warn(`Queue ${queueConfig.name} already exists`);
      return this.queues.get(queueConfig.name)!;
    }

    const queueOptions: QueueOptions = {
      redis: this.redisConfig,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 100,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        ...queueConfig.defaultJobOptions,
      },
    };

    const queue = new Bull(queueConfig.name, queueOptions);

    if (queueConfig.processor) {
      queue.process(queueConfig.concurrency || 1, queueConfig.processor);
    }

    if (queueConfig.events) {
      const events = queueConfig.events;

      if (events.completed) {
        queue.on('completed', events.completed);
      }

      if (events.failed) {
        queue.on('failed', events.failed);
      }

      if (events.stalled) {
        queue.on('stalled', events.stalled);
      }

      if (events.progress) {
        queue.on('progress', events.progress);
      }
    }

    queue.on('error', (error: Error) => {
      logger.error(`Queue ${queueConfig.name} error:`, error);
    });

    this.queues.set(queueConfig.name, queue);

    logger.info(`Created queue: ${queueConfig.name}`, {
      concurrency: queueConfig.concurrency || 1,
    });

    return queue;
  }

  public getQueue(name: string): Queue | undefined {
    return this.queues.get(name);
  }

  public async addJob(
    queueName: string,
    jobName: string,
    data: any,
    options?: JobOptions
  ): Promise<Job> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.add(jobName, data, options);
    
    logger.debug(`Added job to queue`, {
      queueName,
      jobName,
      jobId: job.id,
    });

    return job;
  }

  public async getJob(queueName: string, jobId: string): Promise<Job | null> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return queue.getJob(jobId);
  }

  public async removeJob(queueName: string, jobId: string): Promise<boolean> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return false;
    }

    await job.remove();
    return true;
  }

  public async getQueueStats(queueName: string): Promise<any> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    return {
      name: queueName,
      counts: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        paused: queue.isPaused() ? 1 : 0,
      },
      jobs: {
        waiting: waiting.map(job => ({
          id: job.id,
          name: job.name,
          data: job.data,
          timestamp: job.timestamp,
        })),
        active: active.map(job => ({
          id: job.id,
          name: job.name,
          data: job.data,
          timestamp: job.timestamp,
          progress: job.progress(),
        })),
        failed: failed.slice(0, 10).map(job => ({
          id: job.id,
          name: job.name,
          data: job.data,
          timestamp: job.timestamp,
          failedReason: job.failedReason,
        })),
      },
    };
  }

  public async getAllQueueStats(): Promise<any[]> {
    const stats = [];

    for (const queueName of this.queues.keys()) {
      try {
        const queueStats = await this.getQueueStats(queueName);
        stats.push(queueStats);
      } catch (error: any) {
        logger.error(`Error getting stats for queue ${queueName}:`, error);
      }
    }

    return stats;
  }

  public async pauseQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.pause();
    logger.info(`Paused queue: ${queueName}`);
  }

  public async resumeQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.resume();
    logger.info(`Resumed queue: ${queueName}`);
  }

  public async cleanQueue(
    queueName: string,
    grace: number,
    status: 'completed' | 'failed' | 'active'
  ): Promise<number> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const cleanedCount = await queue.clean(grace, status);
    
    logger.info(`Cleaned ${cleanedCount} ${status} jobs from queue ${queueName}`, {
      grace,
      status,
    });

    return cleanedCount;
  }

  public async drainQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.drain();
    logger.info(`Drained queue: ${queueName}`);
  }

  public async obliterateQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.obliterate();
    logger.info(`Obliterated queue: ${queueName}`);
  }

  public getQueueNames(): string[] {
    return Array.from(this.queues.keys());
  }

  public async retryFailedJobs(queueName: string, limit?: number): Promise<number> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const failedJobs = await queue.getFailed();
    const jobsToRetry = limit ? failedJobs.slice(0, limit) : failedJobs;

    let retriedCount = 0;

    for (const job of jobsToRetry) {
      try {
        await job.retry();
        retriedCount++;
      } catch (error: any) {
        logger.error(`Failed to retry job ${job.id}:`, error);
      }
    }

    logger.info(`Retried ${retriedCount} failed jobs in queue ${queueName}`);
    return retriedCount;
  }

  public async promoteDelayedJobs(queueName: string, limit?: number): Promise<number> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const delayedJobs = await queue.getDelayed();
    const jobsToPromote = limit ? delayedJobs.slice(0, limit) : delayedJobs;

    let promotedCount = 0;

    for (const job of jobsToPromote) {
      try {
        await job.promote();
        promotedCount++;
      } catch (error: any) {
        logger.error(`Failed to promote job ${job.id}:`, error);
      }
    }

    logger.info(`Promoted ${promotedCount} delayed jobs in queue ${queueName}`);
    return promotedCount;
  }

  public async getJobDetails(queueName: string, jobId: string): Promise<any> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      opts: job.opts,
      progress: job.progress(),
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      attemptsMade: job.attemptsMade,
      delay: job.delay,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
    };
  }

  public async setupMaintenanceJob(): Promise<void> {
    const maintenanceQueue = this.createQueue({
      name: 'maintenance',
      concurrency: 1,
      defaultJobOptions: {
        repeat: { cron: '0 2 * * *' }, // Run daily at 2 AM
        removeOnComplete: 5,
        removeOnFail: 5,
      },
      processor: async (job: Job) => {
        if (job.name === 'daily-cleanup') {
          logger.info('Running queue maintenance...');

          const results = [];

          for (const queueName of this.queues.keys()) {
            try {
              if (queueName === 'maintenance') continue;

              const cleaned = await this.cleanQueue(queueName, 24 * 60 * 60 * 1000, 'completed');
              const failedCleaned = await this.cleanQueue(queueName, 7 * 24 * 60 * 60 * 1000, 'failed');

              results.push({
                queue: queueName,
                completedCleaned: cleaned,
                failedCleaned,
              });
            } catch (error: any) {
              logger.error(`Error during maintenance for queue ${queueName}:`, error);
            }
          }

          logger.info('Queue maintenance completed', { results });
          return { results };
        } else {
          throw new Error(`Unknown job type: ${job.name}`);
        }
      },
      events: {
        completed: (job: Job, result: any) => {
          logger.info('Queue maintenance job completed', result);
        },
        failed: (job: Job, error: Error) => {
          logger.error('Queue maintenance job failed:', error);
        },
      },
    });

    await maintenanceQueue.add('daily-cleanup', {}, {
      repeat: { cron: '0 2 * * *' },
    });

    logger.info('Queue maintenance job scheduled');
  }

  public async shutdown(): Promise<void> {
    logger.info('Shutting down queue manager...');

    const shutdownPromises = Array.from(this.queues.values()).map(async (queue) => {
      try {
        await queue.close();
      } catch (error: any) {
        logger.error(`Error closing queue ${queue.name}:`, error);
      }
    });

    await Promise.all(shutdownPromises);
    this.queues.clear();

    logger.info('Queue manager shutdown complete');
  }
}

export const queueManager = QueueManager.getInstance();