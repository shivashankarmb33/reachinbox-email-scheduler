import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

interface SendEmailParams {
  smtpConfig?: SmtpConfig;
  from: string;
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | false;
  response: string;
}

class EmailService {
  private transporters: Map<string, Transporter> = new Map();

  /**
   * Automatically generate an ephemeral Ethereal test account if credentials are not configured.
   */
  async createEtherealAccount(): Promise<{ user: string; pass: string; host: string; port: number }> {
    logger.info('Creating a dynamic Ethereal test account via Nodemailer...');
    const testAccount = await nodemailer.createTestAccount();
    logger.info({
      msg: 'Generated Ethereal Test Account',
      user: testAccount.user,
      pass: testAccount.pass,
      webUrl: `https://ethereal.email/messages`,
    });
    return {
      host: 'smtp.ethereal.email',
      port: 587,
      user: testAccount.user,
      pass: testAccount.pass,
    };
  }

  /**
   * Get or create a cached SMTP transporter for a specific sender
   */
  private getTransporter(config: SmtpConfig): Transporter {
    const key = `${config.host}:${config.port}:${config.user}`;
    let transporter = this.transporters.get(key);

    if (!transporter) {
      transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: {
          user: config.user,
          pass: config.pass,
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
      });
      this.transporters.set(key, transporter);
    }

    return transporter;
  }

  /**
   * Send email using configured SMTP transporter
   * 
   * NOTE ON SMTP EXACTLY-ONCE LIMITATION:
   * Standard SMTP is inherently at-least-once or at-most-once across distributed process boundaries.
   * If a crash occurs after SMTP 250 OK acknowledgment but before PostgreSQL transaction commit,
   * retrying the job will send a duplicate email. To prevent double-sending, we record provider message IDs,
   * flag ambiguous delivery outcomes, and avoid blind retries on network timeouts after DATA command transmission.
   */
  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    let host = params.smtpConfig?.host || env.SMTP_HOST;
    let port = params.smtpConfig?.port || env.SMTP_PORT;
    let user = params.smtpConfig?.user || env.SMTP_USER;
    let pass = params.smtpConfig?.pass || env.SMTP_PASS;

    // Fallback: If no SMTP user provided, create an Ethereal account on the fly for development
    if (!user || !pass) {
      const ethereal = await this.createEtherealAccount();
      host = ethereal.host;
      port = ethereal.port;
      user = ethereal.user;
      pass = ethereal.pass;
    }

    const transporter = this.getTransporter({ host, port, user, pass });

    const mailOptions = {
      from: `"${params.from.split('@')[0]}" <${user || params.from}>`,
      to: params.to,
      subject: params.subject,
      text: params.body,
      html: `<div style="font-family: sans-serif; line-height: 1.6; color: #333;">${params.body.replace(/\n/g, '<br/>')}</div>`,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      const previewUrl = nodemailer.getTestMessageUrl(info);

      logger.info({
        msg: 'Email sent successfully via SMTP',
        messageId: info.messageId,
        recipient: params.to,
        previewUrl: previewUrl || 'N/A',
      });

      return {
        messageId: info.messageId,
        previewUrl,
        response: info.response,
      };
    } catch (error: any) {
      logger.error({
        msg: 'Failed to send email via SMTP',
        recipient: params.to,
        error: error.message,
        code: error.code,
      });
      throw error;
    }
  }

  /**
   * Verify SMTP credentials
   */
  async verifyConnection(config: SmtpConfig): Promise<boolean> {
    try {
      const transporter = this.getTransporter(config);
      await transporter.verify();
      return true;
    } catch (err) {
      logger.error({ msg: 'SMTP connection verification failed', err });
      return false;
    }
  }
}

export const emailService = new EmailService();

