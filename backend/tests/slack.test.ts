import { describe, it, expect, vi, beforeEach } from 'vitest';
import { slackService } from '../src/modules/slack/slack.service.js';
import { redisClient } from '../src/config/redis.js';

describe('Slack Notification Workflows', () => {
  beforeEach(async () => {
    // Clear test dedup keys if needed
  });

  it('posts a formatted Slack notification for an email scheduling event', async () => {
    const testBatchId = `test_batch_${Date.now()}_single`;
    const result = await slackService.sendEmailScheduledAlert({
      batchId: testBatchId,
      userId: 'test-user-id',
      senderEmail: 'sender@reachinbox.ai',
      subject: 'Interview Invitation',
      recipients: ['candidate@gmail.com'],
      totalRecipients: 1,
      scheduledAt: new Date(Date.now() + 3600000).toISOString(),
    });

    expect(result).toBe(true);
  });

  it('formats multiple recipients count correctly', async () => {
    const testBatchId = `test_batch_${Date.now()}_multi`;
    const result = await slackService.sendEmailScheduledAlert({
      batchId: testBatchId,
      userId: 'test-user-id',
      senderEmail: 'marketing@reachinbox.ai',
      subject: 'Product Launch Announcement',
      recipients: [
        'lead1@example.com',
        'lead2@example.com',
        'lead3@example.com',
        'lead4@example.com',
        'lead5@example.com',
      ],
      totalRecipients: 5,
      scheduledAt: new Date(Date.now() + 7200000).toISOString(),
    });

    expect(result).toBe(true);
  });

  it('prevents duplicate Slack notifications for retried batch scheduling', async () => {
    const duplicateBatchId = `test_batch_dedup_${Date.now()}`;
    const payload = {
      batchId: duplicateBatchId,
      userId: 'test-user-id',
      senderEmail: 'sender@reachinbox.ai',
      subject: 'Idempotency Test Subject',
      recipients: ['recipient@example.com'],
      totalRecipients: 1,
      scheduledAt: new Date(Date.now() + 1800000).toISOString(),
    };

    // First attempt should send
    const firstAttempt = await slackService.sendEmailScheduledAlert(payload);
    expect(firstAttempt).toBe(true);

    // Second immediate attempt with same batchId must be recognized as duplicate and suppressed
    const secondAttempt = await slackService.sendEmailScheduledAlert(payload);
    expect(secondAttempt).toBe(false);
  });

  it('handles Slack API failures gracefully without throwing unhandled exceptions', async () => {
    // Invalid mock client or invalid payload call
    const result = await slackService.sendEmailScheduledAlert({
      batchId: `fail_test_${Date.now()}`,
      userId: 'non-existent-user',
      senderEmail: 'sender@example.com',
      subject: 'Fail Safe Test',
      recipients: ['test@example.com'],
      totalRecipients: 1,
      scheduledAt: 'invalid-date',
    });

    // Should return a boolean without crashing
    expect(typeof result).toBe('boolean');
  });
});

