import { Request, Response } from 'express';
import { slackService } from './slack.service.js';
import { env } from '../../config/env.js';

export const connectSlack = (req: Request, res: Response) => {
  const user = req.user as any;
  if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) {
    return res.status(503).json({
      success: false,
      error: 'Slack OAuth is not configured. Please set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET in .env',
    });
  }

  const authUrl = slackService.getOAuthUrl(user.id);
  res.redirect(authUrl);
};

export const handleSlackCallback = async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error&msg=${encodeURIComponent(String(error))}`);
  }

  if (!code || !state) {
    return res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error&msg=Missing_code_or_state`);
  }

  try {
    await slackService.handleOAuthCallback(String(code), String(state));
    res.redirect(`${env.FRONTEND_URL}/dashboard?slack=connected`);
  } catch (err: any) {
    res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error&msg=${encodeURIComponent(err.message)}`);
  }
};

export const getSlackStatus = async (req: Request, res: Response) => {
  const user = req.user as any;
  const status = await slackService.getStatus(user.id);
  res.status(200).json({ success: true, ...status });
};

export const disconnectSlack = async (req: Request, res: Response) => {
  const user = req.user as any;
  await slackService.disconnect(user.id);
  res.status(200).json({ success: true, message: 'Slack disconnected' });
};

export const testSlackNotification = async (req: Request, res: Response) => {
  const user = req.user as any;
  const sent = await slackService.sendEmailScheduledAlert({
    batchId: 'test-' + Date.now(),
    userId: user.id,
    senderEmail: 'scheduler@reachinbox.ai',
    subject: 'ReachInbox Slack Connection Test Alert',
    recipients: ['test-recipient@reachinbox.ai'],
    totalRecipients: 1,
    scheduledAt: new Date().toISOString(),
  });

  if (sent) {
    res.status(200).json({ success: true, message: 'Test notification sent to Slack successfully' });
  } else {
    res.status(400).json({ success: false, error: 'Failed to send test notification to Slack. Check channel membership and bot permissions.' });
  }
};


