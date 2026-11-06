export type EmailStatus = 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED';

export interface User {
  id: string;
  name: string;
  email: string;
  googleId: string;
  avatar?: string | null;
  createdAt: string;
}

export interface Sender {
  id: string;
  userId: string;
  email: string;
  smtpHost?: string;
  smtpPort?: number;
  hourlyLimit: number;
  minimumDelay: number;
  createdAt: string;
}

export interface ScheduledEmail {
  id: string;
  userId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: EmailStatus;
  providerMessageId?: string | null;
  previewUrl?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailStats {
  total: number;
  scheduled: number;
  sent: number;
  failed: number;
}

