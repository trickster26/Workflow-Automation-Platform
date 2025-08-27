import { QueueManager } from '../../services/QueueManager';
import Bull from 'bull';

// Mock dependencies
jest.mock('bull');
jest.mock('../../utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

const mockBull = Bull as jest.MockedClass<typeof Bull>;

describe('QueueManager', () => {
  let queueManager: QueueManager;
  let mockQueue: jest.Mocked<Bull.Queue>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockQueue = {
      add: jest.fn(),
      process: jest.fn(),
      on: jest.fn(),
      getJob: jest.fn(),
      getWaiting: jest.fn().mockResolvedValue([]),
      getActive: jest.fn().mockResolvedValue([]),
      getCompleted: jest.fn().mockResolvedValue([]),
      getFailed: jest.fn().mockResolvedValue([]),
      getDelayed: jest.fn().mockResolvedValue([]),
      isPaused: jest.fn().mockReturnValue(false),
      pause: jest.fn(),
      resume: jest.fn(),
      clean: jest.fn().mockResolvedValue(5),
      drain: jest.fn(),
      obliterate: jest.fn(),
      close: jest.fn(),
      name: 'test-queue',
    } as any;
    
    mockBull.mockReturnValue(mockQueue);
    queueManager = QueueManager.getInstance();
  });

  afterEach(() => {
    // Reset singleton instance
    (QueueManager as any).instance = undefined;
  });

  describe('createQueue', () => {
    it('should create a new queue successfully', () => {
      const queueConfig = {
        name: 'test-queue',
        concurrency: 2,
        processor: jest.fn(),
      };

      const result = queueManager.createQueue(queueConfig);

      expect(mockBull).toHaveBeenCalledWith('test-queue', expect.objectContaining({
        redis: expect.any(Object),
        defaultJobOptions: expect.any(Object),
      }));
      expect(mockQueue.process).toHaveBeenCalledWith(2, queueConfig.processor);
      expect(result).toBe(mockQueue);
    });

    it('should return existing queue if already exists', () => {
      const queueConfig = {
        name: 'existing-queue',
        processor: jest.fn(),
      };

      // Create queue first time
      const firstResult = queueManager.createQueue(queueConfig);
      
      // Create queue second time
      const secondResult = queueManager.createQueue(queueConfig);

      expect(firstResult).toBe(secondResult);
      expect(mockBull).toHaveBeenCalledTimes(1); // Should only be called once
    });

    it('should setup event handlers when provided', () => {
      const events = {
        completed: jest.fn(),
        failed: jest.fn(),
        stalled: jest.fn(),
        progress: jest.fn(),
      };

      const queueConfig = {
        name: 'event-queue',
        events,
      };

      queueManager.createQueue(queueConfig);

      expect(mockQueue.on).toHaveBeenCalledWith('completed', events.completed);
      expect(mockQueue.on).toHaveBeenCalledWith('failed', events.failed);
      expect(mockQueue.on).toHaveBeenCalledWith('stalled', events.stalled);
      expect(mockQueue.on).toHaveBeenCalledWith('progress', events.progress);
      expect(mockQueue.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('addJob', () => {
    it('should add job to existing queue', async () => {
      const queueName = 'test-queue';
      const jobName = 'test-job';
      const data = { test: 'data' };
      const options = { delay: 1000 };

      // Create queue first
      queueManager.createQueue({ name: queueName });

      const mockJob = { id: 'job-123' };
      mockQueue.add.mockResolvedValue(mockJob as any);

      const result = await queueManager.addJob(queueName, jobName, data, options);

      expect(mockQueue.add).toHaveBeenCalledWith(jobName, data, options);
      expect(result).toBe(mockJob);
    });

    it('should throw error for non-existent queue', async () => {
      await expect(queueManager.addJob('non-existent', 'job', {})).rejects.toThrow('Queue non-existent not found');
    });
  });

  describe('getJob', () => {
    it('should get job from queue', async () => {
      const queueName = 'test-queue';
      const jobId = 'job-123';

      queueManager.createQueue({ name: queueName });

      const mockJob = { id: jobId, data: { test: 'data' } };
      mockQueue.getJob.mockResolvedValue(mockJob as any);

      const result = await queueManager.getJob(queueName, jobId);

      expect(mockQueue.getJob).toHaveBeenCalledWith(jobId);
      expect(result).toBe(mockJob);
    });

    it('should throw error for non-existent queue', async () => {
      await expect(queueManager.getJob('non-existent', 'job-123')).rejects.toThrow('Queue non-existent not found');
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const queueName = 'test-queue';
      queueManager.createQueue({ name: queueName });

      const mockWaiting = [{ id: '1', name: 'job1', data: {}, timestamp: Date.now() }];
      const mockActive = [{ id: '2', name: 'job2', data: {}, timestamp: Date.now(), progress: () => 50 }];
      const mockCompleted = [{ id: '3', name: 'job3', data: {}, timestamp: Date.now() }];
      const mockFailed = [{ id: '4', name: 'job4', data: {}, timestamp: Date.now(), failedReason: 'Error' }];
      const mockDelayed = [{ id: '5', name: 'job5', data: {}, timestamp: Date.now() }];

      mockQueue.getWaiting.mockResolvedValue(mockWaiting as any);
      mockQueue.getActive.mockResolvedValue(mockActive as any);
      mockQueue.getCompleted.mockResolvedValue(mockCompleted as any);
      mockQueue.getFailed.mockResolvedValue(mockFailed as any);
      mockQueue.getDelayed.mockResolvedValue(mockDelayed as any);
      mockQueue.isPaused.mockReturnValue(true);

      const result = await queueManager.getQueueStats(queueName);

      expect(result.name).toBe(queueName);
      expect(result.counts.waiting).toBe(1);
      expect(result.counts.active).toBe(1);
      expect(result.counts.completed).toBe(1);
      expect(result.counts.failed).toBe(1);
      expect(result.counts.delayed).toBe(1);
      expect(result.counts.paused).toBe(1);
      expect(result.jobs.waiting).toHaveLength(1);
      expect(result.jobs.active).toHaveLength(1);
      expect(result.jobs.failed).toHaveLength(1);
    });

    it('should throw error for non-existent queue', async () => {
      await expect(queueManager.getQueueStats('non-existent')).rejects.toThrow('Queue non-existent not found');
    });
  });

  describe('pauseQueue', () => {
    it('should pause queue successfully', async () => {
      const queueName = 'test-queue';
      queueManager.createQueue({ name: queueName });

      await queueManager.pauseQueue(queueName);

      expect(mockQueue.pause).toHaveBeenCalled();
    });

    it('should throw error for non-existent queue', async () => {
      await expect(queueManager.pauseQueue('non-existent')).rejects.toThrow('Queue non-existent not found');
    });
  });

  describe('resumeQueue', () => {
    it('should resume queue successfully', async () => {
      const queueName = 'test-queue';
      queueManager.createQueue({ name: queueName });

      await queueManager.resumeQueue(queueName);

      expect(mockQueue.resume).toHaveBeenCalled();
    });

    it('should throw error for non-existent queue', async () => {
      await expect(queueManager.resumeQueue('non-existent')).rejects.toThrow('Queue non-existent not found');
    });
  });

  describe('cleanQueue', () => {
    it('should clean queue successfully', async () => {
      const queueName = 'test-queue';
      queueManager.createQueue({ name: queueName });

      const grace = 60000;
      const status = 'completed';
      mockQueue.clean.mockResolvedValue(10);

      const result = await queueManager.cleanQueue(queueName, grace, status);

      expect(mockQueue.clean).toHaveBeenCalledWith(grace, status);
      expect(result).toBe(10);
    });

    it('should throw error for non-existent queue', async () => {
      await expect(queueManager.cleanQueue('non-existent', 60000, 'completed')).rejects.toThrow('Queue non-existent not found');
    });
  });

  describe('retryFailedJobs', () => {
    it('should retry failed jobs successfully', async () => {
      const queueName = 'test-queue';
      queueManager.createQueue({ name: queueName });

      const mockFailedJobs = [
        { id: '1', retry: jest.fn() },
        { id: '2', retry: jest.fn() },
      ];

      mockQueue.getFailed.mockResolvedValue(mockFailedJobs as any);

      const result = await queueManager.retryFailedJobs(queueName, 5);

      expect(mockFailedJobs[0].retry).toHaveBeenCalled();
      expect(mockFailedJobs[1].retry).toHaveBeenCalled();
      expect(result).toBe(2);
    });

    it('should handle retry failures gracefully', async () => {
      const queueName = 'test-queue';
      queueManager.createQueue({ name: queueName });

      const mockFailedJobs = [
        { id: '1', retry: jest.fn().mockRejectedValue(new Error('Retry failed')) },
        { id: '2', retry: jest.fn() },
      ];

      mockQueue.getFailed.mockResolvedValue(mockFailedJobs as any);

      const result = await queueManager.retryFailedJobs(queueName);

      expect(result).toBe(1); // Only one successful retry
    });
  });

  describe('setupMaintenanceJob', () => {
    it('should setup maintenance job successfully', async () => {
      await queueManager.setupMaintenanceJob();

      expect(mockBull).toHaveBeenCalledWith('maintenance', expect.any(Object));
      expect(mockQueue.add).toHaveBeenCalledWith('daily-cleanup', {}, {
        repeat: { cron: '0 2 * * *' },
      });
    });

    it('should handle maintenance job processing', async () => {
      // Setup some queues first
      queueManager.createQueue({ name: 'queue1' });
      queueManager.createQueue({ name: 'queue2' });

      await queueManager.setupMaintenanceJob();

      // Get the processor function that was passed to the maintenance queue
      const processorCall = mockQueue.process.mock.calls.find(call => call[0] === 1);
      const processor = processorCall[1];

      const mockJob = {
        name: 'daily-cleanup',
      };

      mockQueue.clean
        .mockResolvedValueOnce(5) // completed cleanup
        .mockResolvedValueOnce(3) // failed cleanup
        .mockResolvedValueOnce(2) // completed cleanup for second queue
        .mockResolvedValueOnce(1); // failed cleanup for second queue

      const result = await processor(mockJob);

      expect(result.results).toHaveLength(2);
      expect(result.results[0].queue).toBe('queue1');
      expect(result.results[0].completedCleaned).toBe(5);
      expect(result.results[0].failedCleaned).toBe(3);
    });
  });

  describe('shutdown', () => {
    it('should shutdown all queues', async () => {
      queueManager.createQueue({ name: 'queue1' });
      queueManager.createQueue({ name: 'queue2' });

      await queueManager.shutdown();

      expect(mockQueue.close).toHaveBeenCalledTimes(2);
      expect(queueManager.getQueueNames()).toHaveLength(0);
    });

    it('should handle queue close errors gracefully', async () => {
      queueManager.createQueue({ name: 'queue1' });
      
      mockQueue.close.mockRejectedValue(new Error('Close failed'));

      await expect(queueManager.shutdown()).resolves.not.toThrow();
    });
  });
});