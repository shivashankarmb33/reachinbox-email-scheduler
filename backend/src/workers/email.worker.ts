import { Worker, Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, emailQueue } from '../queues/email.queue.js';
import { redisOptions } from '../config/redis.js';
import { prisma } from '../config/prisma.js';
import { emailService } from '../modules/email/email.service.js';
import { rateLimiter } from '../modules/scheduler/rateLimiter.js';
import { slackService } from '../modules/slack/slack.service.js';
import { searchService } from '../modules/search/search.service.js';
import { env } from '../config/env.js';
import { EmailJobData } from '../types/index.js';
import { logger } from '../utils/logger.js';

export const createEmailWorker = () => {
  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailId } = job.data;
      logger.info(`[Worker] Processing email job ${job.id} for email ID: ${emailId}`);

      // 1. Fetch current email record from PostgreSQL
      const email = await prisma.email.findUnique({
        where: { id: emailId },
        include: { sender: true },
      });

      if (!email) {
        logger.warn(`[Worker] Email record not found for ID: ${emailId}, skipping`);
        return;
      }

      // 2. Idempotency Check: Skip already sent or failed emails
      if (email.status === 'SENT') {
        logger.info(`[Worker] Email ${emailId} already marked as SENT. Skipping duplicate execution.`);
        return;
      }

      // 3. Atomic Database State Transition: SCHEDULED -> PROCESSING
      // Prevents two concurrent workers or multiple instances from claiming the same email
      const claimResult = await prisma.email.updateMany({
        where: {
          id: emailId,
          status: 'SCHEDULED',
        },
        data: {
          status: 'PROCESSING',
        },
      });

      if (claimResult.count === 0) {
        logger.warn(`[Worker] Email ${emailId} could not be claimed (already PROCESSING or SENT)`);
        return;
      }

      const sender = email.sender;
      const hourlyLimit = sender.hourlyLimit || env.MAX_EMAILS_PER_HOUR_PER_SENDER;
      const minDelay = sender.minimumDelay || env.MIN_DELAY_BETWEEN_EMAILS;

      // 4. Rate Limiting: Atomic reservation for Hourly Limit and Minimum Delay
      const reservation = await rateLimiter.reserveSendingSlot(sender.id, hourlyLimit, minDelay);

      if (!reservation.allowed) {
        // Revert status back to SCHEDULED
        await prisma.email.update({
          where: { id: emailId },
          data: { status: 'SCHEDULED' },
        });

        const retryDelay = reservation.retryAfterMs || 5000;

        if (reservation.reason === 'HOURLY_LIMIT_EXCEEDED') {
          logger.warn(
            `[Worker] Hourly limit reached for sender ${sender.email}. Rescheduling email ${emailId} in ${retryDelay}ms`
          );

          // Check if we should trigger a Slack rate limit notification
          const shouldAlert = await rateLimiter.shouldSendSlackAlert(sender.id);
          if (shouldAlert) {
            const pendingCount = await prisma.email.count({
              where: { senderId: sender.id, status: 'SCHEDULED' },
            });

            await slackService.sendRateLimitAlert({
              userId: email.userId,
              senderEmail: sender.email,
              hourlyLimit,
              emailsSent: reservation.currentCount,
              pendingEmails: pendingCount,
            });
          }
        } else {
          logger.debug(
            `[Worker] Minimum delay required for sender ${sender.email}. Rescheduling email ${emailId} in ${retryDelay}ms`
          );
        }

        // Reschedule job into BullMQ for the calculated delay
        await emailQueue.add(
          'send-email',
          { emailId },
          {
            jobId: `${emailId}-rescheduled-${Date.now()}`,
            delay: retryDelay,
          }
        );
        return;
      }

      // 5. Send Email via Nodemailer (Ethereal SMTP)
      try {
        const result = await emailService.sendEmail({
          smtpConfig: {
            host: sender.smtpHost,
            port: sender.smtpPort,
            user: sender.smtpUser,
            pass: sender.smtpPass,
          },
          from: sender.email,
          to: email.recipient,
          subject: email.subject,
          body: email.body,
        });

        // 6. Mark as SENT in PostgreSQL
        const sentAt = new Date();
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'SENT',
            sentAt,
            providerMessageId: result.messageId,
            previewUrl: result.previewUrl ? String(result.previewUrl) : null,
          },
        });

        // 7. Update Elasticsearch document asynchronously
        searchService.updateEmailStatus(emailId, 'SENT', sentAt).catch(() => {});

        // 8. Send Slack real-time dispatch notification
        slackService.sendEmailSentAlert({
          userId: email.userId,
          senderEmail: sender.email,
          recipient: email.recipient,
          subject: email.subject,
          previewUrl: result.previewUrl ? String(result.previewUrl) : undefined,
        }).catch(() => {});

        logger.info(`[Worker] Successfully delivered email ${emailId} to ${email.recipient}`);
      } catch (error: any) {
        logger.error({
          msg: `[Worker] Failed sending email ${emailId} to ${email.recipient}`,
          error: error.message,
        });

        // Refund rate limit reservation counter because send failed
        await rateLimiter.refundHourlySlot(sender.id);

        // Check if error is permanent (e.g. invalid recipient domain, rejected 5xx)
        const isPermanent = error.responseCode && error.responseCode >= 500 && error.responseCode < 600;

        if (isPermanent || job.attemptsMade >= (job.opts.attempts || 3) - 1) {
          // Permanently mark as FAILED
          await prisma.email.update({
            where: { id: emailId },
            data: {
              status: 'FAILED',
              failureReason: error.message || 'SMTP delivery rejected',
            },
          });
          searchService.updateEmailStatus(emailId, 'FAILED').catch(() => {});

          // Send Slack failure notification
          slackService.sendEmailFailedAlert({
            userId: email.userId,
            senderEmail: sender.email,
            recipient: email.recipient,
            subject: email.subject,
            failureReason: error.message || 'SMTP delivery rejected',
          }).catch(() => {});
        } else {
          // Transient error: Reset status to SCHEDULED so BullMQ retry can claim it
          await prisma.email.update({
            where: { id: emailId },
            data: {
              status: 'SCHEDULED',
              failureReason: `Transient error: ${error.message}`,
            },
          });
          // Re-throw so BullMQ triggers exponential backoff
          throw error;
        }
      }
    },
    {
      connection: redisOptions,
      concurrency: env.WORKER_CONCURRENCY, // Configurable worker concurrency
    }
  );

  worker.on('active', (job) => {
    logger.debug(`[Worker] Job ${job.id} active on thread`);
  });

  worker.on('completed', (job) => {
    logger.info(`[Worker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`[Worker] Job ${job?.id} failed with error: ${err.message}`);
  });

  return worker;
};

// If run directly via node / tsx (e.g., npm run start:worker)
if (process.argv[1]?.includes('email.worker')) {
  const worker = createEmailWorker();
  logger.info(`🚀 BullMQ Email Worker started with concurrency: ${env.WORKER_CONCURRENCY}`);

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Gracefully stopping BullMQ Email Worker...`);
    await worker.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

