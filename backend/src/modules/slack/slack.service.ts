import { WebClient } from '@slack/web-api';
import axios from 'axios';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { redisClient } from '../../config/redis.js';
import { encrypt, decrypt } from '../../utils/crypto.js';
import { logger } from '../../utils/logger.js';

export interface SlackRateLimitAlertParams {
  userId: string;
  senderEmail: string;
  hourlyLimit: number;
  emailsSent: number;
  pendingEmails: number;
}

export interface EmailScheduledAlertParams {
  batchId: string;
  userId: string;
  senderEmail: string;
  subject: string;
  recipients: string[];
  totalRecipients: number;
  scheduledAt: string;
}

class SlackService {
  /**
   * Generate Slack OAuth 2.0 authorization URL
   */
  getOAuthUrl(userId: string): string {
    const scopes = ['chat:write', 'channels:read', 'groups:read'].join(',');
    const redirectUri = encodeURIComponent(env.SLACK_REDIRECT_URI);
    return `https://slack.com/oauth/v2/authorize?client_id=${env.SLACK_CLIENT_ID}&scope=${scopes}&redirect_uri=${redirectUri}&state=${userId}`;
  }

  /**
   * Handle Slack OAuth callback and securely store encrypted token
   */
  async handleOAuthCallback(code: string, stateUserId: string) {
    if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) {
      throw new Error('Slack OAuth credentials not configured in environment');
    }

    // Exchange temporary code for access token
    const response = await axios.post(
      'https://slack.com/api/oauth.v2.access',
      new URLSearchParams({
        client_id: env.SLACK_CLIENT_ID,
        client_secret: env.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: env.SLACK_REDIRECT_URI,
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const data = response.data;
    if (!data.ok) {
      logger.error({ msg: 'Slack OAuth exchange failed', error: data.error });
      throw new Error(`Slack OAuth error: ${data.error}`);
    }

    const { access_token, team, incoming_webhook } = data;
    const channelId = incoming_webhook?.channel_id || data.authed_user?.id || 'general';
    const channelName = incoming_webhook?.channel || 'general';

    // Encrypt access token before storing in database
    const encryptedAccessToken = encrypt(access_token);

    // Save or update SlackConnection for the user
    const connection = await prisma.slackConnection.upsert({
      where: { userId: stateUserId },
      update: {
        teamId: team.id,
        channelId,
        channelName,
        encryptedAccessToken,
        connected: true,
      },
      create: {
        userId: stateUserId,
        teamId: team.id,
        channelId,
        channelName,
        encryptedAccessToken,
        connected: true,
      },
    });

    logger.info({
      msg: 'Slack account connected successfully',
      userId: stateUserId,
      teamName: team.name,
      channel: channelName,
    });

    return connection;
  }

  /**
   * Disconnect Slack integration for a user
   */
  async disconnect(userId: string) {
    return await prisma.slackConnection.updateMany({
      where: { userId },
      data: { connected: false },
    });
  }

  /**
   * Get connection status for a user
   */
  async getStatus(userId: string) {
    const connection = await prisma.slackConnection.findFirst({
      where: {
        OR: [{ userId }, { connected: true }],
      },
    });
    const hasBotToken = !!process.env.SLACK_BOT_TOKEN;
    return {
      connected: (!!connection && connection.connected) || hasBotToken,
      channelName: connection?.channelName || (hasBotToken ? 'all-reachinbox-scheduler' : null),
      teamId: connection?.teamId || null,
      updatedAt: connection?.updatedAt || null,
    };
  }

  /**
   * Send real Slack rate limit notification via chat.postMessage
   */
  async sendRateLimitAlert(params: SlackRateLimitAlertParams): Promise<boolean> {
    try {
      const connection = await prisma.slackConnection.findUnique({
        where: { userId: params.userId },
      });

      if (!connection || !connection.connected) {
        logger.debug({
          msg: 'User has no active Slack connection, skipping notification',
          userId: params.userId,
        });
        return false;
      }

      // Decrypt stored access token
      const accessToken = decrypt(connection.encryptedAccessToken);
      const slackClient = new WebClient(accessToken);

      const messageText = `🚨 *ReachInbox Alert: Hourly email limit reached!*\n` +
        `• *Sender:* ${params.senderEmail}\n` +
        `• *Hourly limit:* ${params.hourlyLimit}\n` +
        `• *Emails sent this hour:* ${params.emailsSent}\n` +
        `• *Pending emails:* ${params.pendingEmails}\n` +
        `• _Remaining emails have been safely rescheduled for the next available hour._`;

      await slackClient.chat.postMessage({
        channel: connection.channelId,
        text: `ReachInbox Alert: Hourly limit reached for ${params.senderEmail}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🚨 ReachInbox Alert',
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Sender:*\n${params.senderEmail}` },
              { type: 'mrkdwn', text: `*Hourly Limit:*\n${params.hourlyLimit}` },
              { type: 'mrkdwn', text: `*Sent in Window:*\n${params.emailsSent}` },
              { type: 'mrkdwn', text: `*Pending Rescheduled:*\n${params.pendingEmails}` },
            ],
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: 'Remaining emails have been automatically rescheduled for the next available hour window.',
              },
            ],
          },
        ],
      });

      logger.info({
        msg: 'Slack rate limit alert posted successfully',
        userId: params.userId,
        sender: params.senderEmail,
      });

      return true;
    } catch (error: any) {
      logger.error({
        msg: 'Failed to post rate limit alert to Slack',
        userId: params.userId,
        error: error.message,
      });
      // Rate-limit processing must continue without crashing if Slack fails
      return false;
    }
  }

  /**
   * Helper to retrieve Slack WebClient and channelId for a user (or env bot token fallback)
   */
  private async getSlackClientAndChannel(userId: string): Promise<{ client: WebClient; channelId: string } | null> {
    const connection = await prisma.slackConnection.findFirst({
      where: {
        OR: [{ userId }, { connected: true }],
      },
    });

    if (connection && connection.connected) {
      const token = decrypt(connection.encryptedAccessToken);
      return { client: new WebClient(token), channelId: connection.channelId };
    }

    if (process.env.SLACK_BOT_TOKEN) {
      return { client: new WebClient(process.env.SLACK_BOT_TOKEN), channelId: 'C0CEUN0MF0X' };
    }

    return null;
  }

  /**
   * Send real-time Slack notification upon successful email dispatch
   */
  async sendEmailSentAlert(params: {
    userId: string;
    senderEmail: string;
    recipient: string;
    subject: string;
    previewUrl?: string;
  }): Promise<boolean> {
    try {
      const auth = await this.getSlackClientAndChannel(params.userId);
      if (!auth) return false;

      const previewText = params.previewUrl ? `\n• *Preview:* <${params.previewUrl}|View in Ethereal>` : '';

      await auth.client.chat.postMessage({
        channel: auth.channelId,
        text: `📧 ReachInbox: Email Sent to ${params.recipient}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ *Email Successfully Dispatched*\n• *To:* \`${params.recipient}\`\n• *Subject:* ${params.subject}\n• *Sender:* ${params.senderEmail}${previewText}`,
            },
          },
        ],
      });
      return true;
    } catch (err: any) {
      logger.warn({ msg: 'Failed to post sent email alert to Slack', error: err.message });
      return false;
    }
  }

  /**
   * Send real-time Slack notification upon failed email dispatch
   */
  async sendEmailFailedAlert(params: {
    userId: string;
    senderEmail: string;
    recipient: string;
    subject: string;
    failureReason: string;
  }): Promise<boolean> {
    try {
      const auth = await this.getSlackClientAndChannel(params.userId);
      if (!auth) return false;

      await auth.client.chat.postMessage({
        channel: auth.channelId,
        text: `⚠️ ReachInbox: Email Delivery Failed for ${params.recipient}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `❌ *Email Delivery Failed*\n• *To:* \`${params.recipient}\`\n• *Subject:* ${params.subject}\n• *Sender:* ${params.senderEmail}\n• *Reason:* _${params.failureReason}_`,
            },
          },
        ],
      });
      return true;
    } catch (err: any) {
      logger.warn({ msg: 'Failed to post failed email alert to Slack', error: err.message });
      return false;
    }
  }

  /**
   * Send real-time Slack notification immediately when emails are scheduled.
   * Includes sender, recipient(s), count, scheduled time, and prevents duplicate alerts on retry.
   */
  async sendEmailScheduledAlert(params: EmailScheduledAlertParams): Promise<boolean> {
    try {
      // 1. Deduplication check via Redis key (24-hour expiration)
      if (params.batchId) {
        const dedupKey = `slack:scheduled:dedup:${params.batchId}`;
        const isNew = await redisClient.set(dedupKey, '1', 'EX', 86400, 'NX');
        if (isNew !== 'OK') {
          logger.debug({ msg: 'Duplicate scheduling notification skipped', batchId: params.batchId });
          return false;
        }
      }

      // 2. Obtain client and channel
      const auth = await this.getSlackClientAndChannel(params.userId);
      if (!auth) {
        logger.debug({ msg: 'No active Slack connection found for user or bot token', userId: params.userId });
        return false;
      }

      const formattedDate = new Date(params.scheduledAt).toLocaleString();
      const countText = params.totalRecipients === 1 ? '1 email' : `${params.totalRecipients} emails`;

      const recipientDisplay =
        params.totalRecipients === 1
          ? `\`${params.recipients[0]}\``
          : `\`${params.recipients.slice(0, 3).join('`, `')}\`${
              params.totalRecipients > 3 ? ` *(+${params.totalRecipients - 3} more)*` : ''
            }`;

      await auth.client.chat.postMessage({
        channel: auth.channelId,
        text: `🗓️ ReachInbox: Scheduled ${countText} for delivery at ${formattedDate}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🗓️ Emails Scheduled',
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Sender:*\n${params.senderEmail}`,
              },
              {
                type: 'mrkdwn',
                text: `*Total Emails:*\n${countText}`,
              },
              {
                type: 'mrkdwn',
                text: `*Scheduled Time:*\n${formattedDate}`,
              },
              {
                type: 'mrkdwn',
                text: `*Subject:*\n${params.subject}`,
              },
            ],
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Recipients:*\n${recipientDisplay}`,
            },
          },
        ],
      });

      logger.info({
        msg: 'Slack email scheduled notification posted successfully',
        batchId: params.batchId,
        totalRecipients: params.totalRecipients,
      });

      return true;
    } catch (err: any) {
      logger.warn({ msg: 'Failed to post scheduled email alert to Slack', error: err.message });
      return false;
    }
  }
}

export const slackService = new SlackService();

