import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import {
  connectSlack,
  handleSlackCallback,
  getSlackStatus,
  disconnectSlack,
  testSlackNotification,
} from './slack.controller.js';

const router = Router();

router.get('/connect', requireAuth, connectSlack);
router.get('/callback', handleSlackCallback);
router.get('/status', requireAuth, getSlackStatus);
router.delete('/disconnect', requireAuth, disconnectSlack);
router.post('/test', requireAuth, testSlackNotification);

export default router;

