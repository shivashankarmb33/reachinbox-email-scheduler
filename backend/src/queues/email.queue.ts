import { Queue, QueueEvents } from 'bullmq';
import { redisOptions } from '../config/redis.js';
import { EmailJobData } from '../types/index.js';
import { logger } from '../utils/logger.js';

export const EMAIL_QUEUE_NAME = 'reachinbox-email-queue';

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5s, 10s, 20s
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24h for monitoring/Bull Board
      count: 5000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

export const emailQueueEvents = new QueueEvents(EMAIL_QUEUE_NAME, {
  connection: redisOptions,
});

emailQueueEvents.on('completed', ({ jobId }) => {
  logger.debug(`BullMQ Job ${jobId} completed successfully`);
});

emailQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`BullMQ Job ${jobId} failed: ${failedReason}`);
});

/**
 * Enqueue a single email job with stable email ID as job identifier
 */
export const enqueueEmailJob = async (emailId: string, delayMs = 0) => {
  return await emailQueue.add(
    'send-email',
    { emailId },
    {
      jobId: emailId, // Stable job identifier for idempotency
      delay: Math.max(0, delayMs),
    }
  );
};

/**
 * Bulk enqueue email jobs efficiently for thousands of recipients
 */
export const bulkEnqueueEmailJobs = async (
  jobs: Array<{ emailId: string; delayMs: number }>
) => {
  const bulkJobs = jobs.map((j) => ({
    name: 'send-email',
    data: { emailId: j.emailId },
    opts: {
      jobId: j.emailId,
      delay: Math.max(0, j.delayMs),
    },
  }));

  // BullMQ addBulk in chunks of 500 to keep Redis payloads balanced
  const CHUNK_SIZE = 500;
  for (let i = 0; i < bulkJobs.length; i += CHUNK_SIZE) {
    const chunk = bulkJobs.slice(i, i + CHUNK_SIZE);
    await emailQueue.addBulk(chunk);
  }
};

