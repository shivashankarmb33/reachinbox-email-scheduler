import { z } from 'zod';

export const scheduleEmailSchema = z.object({
  senderId: z.string().uuid('Valid senderId required'),
  subject: z.string().min(1, 'Subject is required').max(500),
  body: z.string().min(1, 'Body is required'),
  recipients: z
    .array(z.string().email('Invalid email address format'))
    .min(1, 'At least one recipient is required'),
  startTime: z
    .string()
    .datetime({ message: 'startTime must be a valid ISO 8601 date string' })
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date string' }),
  delayBetweenEmails: z.coerce.number().nonnegative().default(2000),
  hourlyLimit: z.coerce.number().positive().default(50),
});

export type ScheduleEmailInput = z.infer<typeof scheduleEmailSchema>;

