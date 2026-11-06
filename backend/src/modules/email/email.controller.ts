import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../../config/prisma.js';
import { scheduleEmailSchema } from './email.validation.js';
import { bulkEnqueueEmailJobs } from '../../queues/email.queue.js';
import { searchService } from '../search/search.service.js';
import { slackService } from '../slack/slack.service.js';
import { logger } from '../../utils/logger.js';

export const scheduleEmails = async (req: Request, res: Response) => {
  const user = req.user as any;
  const data = scheduleEmailSchema.parse(req.body);

  // 1. Verify that the sender belongs to the authenticated user
  const sender = await prisma.sender.findFirst({
    where: { id: data.senderId, userId: user.id },
  });

  if (!sender) {
    return res.status(403).json({
      success: false,
      error: 'Sender not found or does not belong to the authenticated user',
    });
  }

  // 2. Normalize and remove duplicate recipients (case-insensitive)
  const uniqueRecipients = Array.from(
    new Set(data.recipients.map((r) => r.trim().toLowerCase()))
  );

  const totalRecipients = uniqueRecipients.length;
  if (totalRecipients === 0) {
    return res.status(400).json({
      success: false,
      error: 'No valid unique recipients provided',
    });
  }

  const startTimestamp = new Date(data.startTime).getTime();
  const now = Date.now();
  const baseDelayMs = Math.max(0, startTimestamp - now);
  const intervalMs = data.delayBetweenEmails;

  // 3. Create EmailBatch record
  const batch = await prisma.emailBatch.create({
    data: {
      userId: user.id,
      senderId: data.senderId,
      subject: data.subject,
      body: data.body,
      totalRecipients,
    },
  });

  // 4. Prepare email records with pre-generated UUIDs and staggered scheduled times
  const emailRecords = uniqueRecipients.map((recipient, index) => {
    const id = crypto.randomUUID();
    const scheduledTime = new Date(startTimestamp + index * intervalMs);
    const jobDelayMs = baseDelayMs + index * intervalMs;

    return {
      id,
      userId: user.id,
      senderId: data.senderId,
      batchId: batch.id,
      recipient,
      subject: data.subject,
      body: data.body,
      scheduledAt: scheduledTime,
      status: 'SCHEDULED' as const,
      jobDelayMs,
    };
  });

  // 5. Bulk insert into PostgreSQL using chunks to handle 10,000+ jobs cleanly
  const DB_CHUNK_SIZE = 1000;
  for (let i = 0; i < emailRecords.length; i += DB_CHUNK_SIZE) {
    const chunk = emailRecords.slice(i, i + DB_CHUNK_SIZE).map((r) => ({
      id: r.id,
      userId: r.userId,
      senderId: r.senderId,
      batchId: r.batchId,
      recipient: r.recipient,
      subject: r.subject,
      body: r.body,
      scheduledAt: r.scheduledAt,
      status: r.status,
    }));

    await prisma.email.createMany({ data: chunk });
  }

  // 6. Record Outbox Event for transactional durability & restart recovery
  await prisma.outboxEvent.create({
    data: {
      eventType: 'EMAIL_SCHEDULED_BATCH',
      payload: {
        batchId: batch.id,
        emailIds: emailRecords.map((r) => r.id),
      },
      processedAt: new Date(),
    },
  });

  // 7. Enqueue BullMQ delayed jobs
  const queueJobs = emailRecords.map((r) => ({
    emailId: r.id,
    delayMs: r.jobDelayMs,
  }));
  await bulkEnqueueEmailJobs(queueJobs);

  // 8. Trigger immediate Slack notification for the scheduling event
  slackService
    .sendEmailScheduledAlert({
      batchId: batch.id,
      userId: user.id,
      senderEmail: sender.email,
      subject: data.subject,
      recipients: uniqueRecipients,
      totalRecipients,
      scheduledAt: data.startTime,
    })
    .catch((err) => {
      logger.warn({ msg: 'Slack scheduling notification failed', error: err.message });
    });

  // 9. Asynchronously index into Elasticsearch without delaying the API response
  Promise.allSettled(
    emailRecords.slice(0, 200).map((r) =>
      searchService.indexEmail({
        emailId: r.id,
        userId: r.userId,
        senderId: r.senderId,
        recipient: r.recipient,
        subject: r.subject,
        body: r.body,
        status: 'SCHEDULED',
        scheduledAt: r.scheduledAt.toISOString(),
        createdAt: new Date().toISOString(),
      })
    )
  ).catch((err) => {
    logger.warn({ msg: 'Background indexing encountered errors', err });
  });

  logger.info({
    msg: 'Successfully scheduled batch of emails',
    batchId: batch.id,
    acceptedRecipients: totalRecipients,
    startTime: data.startTime,
  });

  res.status(201).json({
    success: true,
    message: `Successfully scheduled ${totalRecipients} emails`,
    batchId: batch.id,
    acceptedRecipients: totalRecipients,
    startTime: data.startTime,
  });
};

export const getScheduledEmails = async (req: Request, res: Response) => {
  const user = req.user as any;
  const page = parseInt(String(req.query.page || '1'), 10);
  const limit = parseInt(String(req.query.limit || '20'), 10);
  const skip = (page - 1) * limit;

  const where = {
    userId: user.id,
    status: { in: ['SCHEDULED' as const, 'PROCESSING' as const] },
  };

  const [total, emails] = await Promise.all([
    prisma.email.count({ where }),
    prisma.email.findMany({
      where,
      skip,
      take: limit,
      orderBy: { scheduledAt: 'asc' },
      include: { sender: { select: { email: true } } },
    }),
  ]);

  res.status(200).json({
    success: true,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    emails: emails.map((e) => ({
      id: e.id,
      recipient: e.recipient,
      subject: e.subject,
      body: e.body,
      scheduledAt: e.scheduledAt,
      status: e.status,
      senderEmail: e.sender.email,
      createdAt: e.createdAt,
    })),
  });
};

export const getSentEmails = async (req: Request, res: Response) => {
  const user = req.user as any;
  const page = parseInt(String(req.query.page || '1'), 10);
  const limit = parseInt(String(req.query.limit || '20'), 10);
  const skip = (page - 1) * limit;

  const where = {
    userId: user.id,
    status: { in: ['SENT' as const, 'FAILED' as const] },
  };

  const [total, emails] = await Promise.all([
    prisma.email.count({ where }),
    prisma.email.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: { sender: { select: { email: true } } },
    }),
  ]);

  res.status(200).json({
    success: true,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    emails: emails.map((e) => ({
      id: e.id,
      recipient: e.recipient,
      subject: e.subject,
      body: e.body,
      scheduledAt: e.scheduledAt,
      sentAt: e.sentAt,
      status: e.status,
      providerMessageId: e.providerMessageId,
      previewUrl: e.previewUrl,
      failureReason: e.failureReason,
      senderEmail: e.sender.email,
      updatedAt: e.updatedAt,
    })),
  });
};

export const getEmailById = async (req: Request, res: Response) => {
  const user = req.user as any;
  const { id } = req.params;

  const email = await prisma.email.findFirst({
    where: { id, userId: user.id },
    include: { sender: { select: { email: true } } },
  });

  if (!email) {
    return res.status(404).json({ success: false, error: 'Email not found' });
  }

  res.status(200).json({ success: true, email });
};

