import { describe, it, expect } from 'vitest';
import { emailService } from '../src/modules/email/email.service.js';

describe('Ethereal SMTP Integration', () => {
  it('creates an Ethereal test account and sends a test email successfully', async () => {
    // Generates real ephemeral credentials directly from Ethereal
    const result = await emailService.sendEmail({
      from: 'reachinbox-test@ethereal.email',
      to: 'recipient-test@ethereal.email',
      subject: 'ReachInbox Automated Test Email',
      body: 'Hello from ReachInbox Vitest test suite!',
    });

    expect(result).toHaveProperty('messageId');
    expect(result.messageId).toBeTruthy();
    expect(result).toHaveProperty('previewUrl');
    // Ethereal provides a real URL preview for every sent email
    expect(result.previewUrl).toMatch(/^https:\/\/ethereal\.email/);
  }, 25000); // 25s timeout for SMTP handshake
});

