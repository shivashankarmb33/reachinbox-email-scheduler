export type EmailStatus = 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED';

export interface EmailJobData {
  emailId: string;
}

export interface UserSession {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
}

