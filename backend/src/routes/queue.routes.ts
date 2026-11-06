import { Router, Request, Response } from 'express';
import { emailQueue } from '../queues/email.queue.js';
import { requireAuth } from '../modules/auth/auth.middleware.js';

const router = Router();

router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  const [waiting, active, delayed, completed, failed, paused] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getDelayedCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    emailQueue.isPaused(),
  ]);

  res.status(200).json({
    success: true,
    stats: {
      waiting,
      active,
      delayed,
      completed,
      failed,
      isPaused: paused,
      total: waiting + active + delayed + completed + failed,
    },
  });
});

export default router;

