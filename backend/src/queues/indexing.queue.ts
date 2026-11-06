import { Queue } from 'bullmq';
import { redisOptions } from '../config/redis.js';

export const INDEXING_QUEUE_NAME = 'reachinbox-indexing-queue';

export interface IndexingJobData {
  action: 'index' | 'update';
  emailId: string;
}

export const indexingQueue = new Queue<IndexingJobData>(INDEXING_QUEUE_NAME, {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: true,
  },
});

