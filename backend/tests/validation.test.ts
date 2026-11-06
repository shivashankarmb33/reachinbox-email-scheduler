import { describe, it, expect } from 'vitest';
import { scheduleEmailSchema } from '../src/modules/email/email.validation.js';

describe('Email Scheduling Input Validation', () => {
  const validPayload = {
    senderId: '123e4567-e89b-12d3-a456-426614174000',
    subject: 'Internship Opportunity',
    body: 'Hello, we have an opportunity for you.',
    recipients: ['user1@gmail.com', 'user2@gmail.com'],
    startTime: '2026-11-05T10:00:00.000Z',
    delayBetweenEmails: 2000,
    hourlyLimit: 50,
  };

  it('accepts valid scheduling payload', () => {
    const result = scheduleEmailSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects invalid recipient email addresses', () => {
    const invalidPayload = {
      ...validPayload,
      recipients: ['valid@gmail.com', 'not-an-email'],
    };
    const result = scheduleEmailSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID senderId', () => {
    const invalidPayload = {
      ...validPayload,
      senderId: 'not-a-valid-uuid',
    };
    const result = scheduleEmailSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('rejects negative delay and zero hourly limit', () => {
    const invalidPayload = {
      ...validPayload,
      delayBetweenEmails: -500,
      hourlyLimit: 0,
    };
    const result = scheduleEmailSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });
});

