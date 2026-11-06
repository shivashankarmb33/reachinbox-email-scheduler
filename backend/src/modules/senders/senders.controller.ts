import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { emailService } from '../email/email.service.js';

const createSenderSchema = z.object({
  email: z.string().email('Valid sender email required'),
  smtpHost: z.string().default('smtp.ethereal.email'),
  smtpPort: z.coerce.number().default(587),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  hourlyLimit: z.coerce.number().positive().default(50),
  minimumDelay: z.coerce.number().nonnegative().default(2000),
  autoGenerateEthereal: z.boolean().optional(),
});

export const getSenders = async (req: Request, res: Response) => {
  const user = req.user as any;
  const senders = await prisma.sender.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({
    success: true,
    senders: senders.map((s) => ({
      id: s.id,
      email: s.email,
      smtpHost: s.smtpHost,
      smtpPort: s.smtpPort,
      hourlyLimit: s.hourlyLimit,
      minimumDelay: s.minimumDelay,
      createdAt: s.createdAt,
    })),
  });
};

export const createSender = async (req: Request, res: Response) => {
  const user = req.user as any;
  const data = createSenderSchema.parse(req.body);

  let { smtpHost, smtpPort, smtpUser = '', smtpPass = '' } = data;

  // Auto-generate test Ethereal credentials if requested or if missing
  if (data.autoGenerateEthereal || (!smtpUser && !smtpPass)) {
    const ethereal = await emailService.createEtherealAccount();
    smtpHost = ethereal.host;
    smtpPort = ethereal.port;
    smtpUser = ethereal.user;
    smtpPass = ethereal.pass;
  }

  const sender = await prisma.sender.create({
    data: {
      userId: user.id,
      email: data.email,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      hourlyLimit: data.hourlyLimit,
      minimumDelay: data.minimumDelay,
    },
  });

  res.status(201).json({
    success: true,
    sender: {
      id: sender.id,
      email: sender.email,
      smtpHost: sender.smtpHost,
      smtpPort: sender.smtpPort,
      hourlyLimit: sender.hourlyLimit,
      minimumDelay: sender.minimumDelay,
      createdAt: sender.createdAt,
    },
  });
};

export const deleteSender = async (req: Request, res: Response) => {
  const user = req.user as any;
  const { id } = req.params;

  const sender = await prisma.sender.findFirst({
    where: { id, userId: user.id },
  });

  if (!sender) {
    return res.status(404).json({ success: false, error: 'Sender not found' });
  }

  await prisma.sender.delete({ where: { id } });

  res.status(200).json({ success: true, message: 'Sender deleted' });
};

