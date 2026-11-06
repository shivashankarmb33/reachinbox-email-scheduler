import { prisma } from '../config/prisma.js';
import { emailQueue } from '../queues/email.queue.js';
import { logger } from '../utils/logger.js';

export class ReconciliationService {
  /**
   * Reconciles pending PostgreSQL records with BullMQ jobs on startup.
   * Recovers any SCHEDULED or interrupted PROCESSING emails and enqueues missing BullMQ jobs.
   */
  async reconcilePendingJobs(): Promise<void> {
    try {
      logger.info('Starting startup reconciliation between PostgreSQL and BullMQ...');

      // 1. Reset any stale PROCESSING emails back to SCHEDULED (e.g. from an abrupt worker crash)
      const resetStaleResult = await prisma.email.updateMany({
        where: {
          status: 'PROCESSING',
        },
        data: {
          status: 'SCHEDULED',
        },
      });

      if (resetStaleResult.count > 0) {
        logger.info(`Reset ${resetStaleResult.count} unconfirmed PROCESSING emails back to SCHEDULED`);
      }

      // 2. Fetch all SCHEDULED emails from PostgreSQL
      const pendingEmails = await prisma.email.findMany({
        where: {
          status: 'SCHEDULED',
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5000,
      });

      if (pendingEmails.length === 0) {
        logger.info('No pending SCHEDULED emails found. System is in sync.');
        return;
      }

      logger.info(`Found ${pendingEmails.length} SCHEDULED emails. Checking BullMQ presence...`);

      let enqueuedCount = 0;
      const now = Date.now();

      for (const email of pendingEmails) {
        const existingJob = await emailQueue.getJob(email.id);

        if (!existingJob) {
          // Job is missing in Redis (e.g., API crashed before queue add or Redis cold restart)
          const delayMs = Math.max(0, new Date(email.scheduledAt).getTime() - now);
          await emailQueue.add(
            'send-email',
            { emailId: email.id },
            {
              jobId: email.id,
              delay: delayMs,
            }
          );
          enqueuedCount++;
        }
      }

      logger.info(
        `Reconciliation complete: verified ${pendingEmails.length} emails, restored ${enqueuedCount} missing jobs.`
      );
    } catch (err: any) {
      logger.error({ msg: 'Reconciliation service encountered an error', error: err.message });
    }
  }
}

export const reconciliationService = new ReconciliationService();

