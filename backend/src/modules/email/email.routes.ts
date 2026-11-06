import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import {
  scheduleEmails,
  getScheduledEmails,
  getSentEmails,
  getEmailById,
} from './email.controller.js';
import { searchEmails } from '../search/search.controller.js';

const router = Router();

router.post('/schedule', requireAuth, scheduleEmails);
router.get('/scheduled', requireAuth, getScheduledEmails);
router.get('/sent', requireAuth, getSentEmails);
router.get('/search', requireAuth, searchEmails);
router.get('/:id', requireAuth, getEmailById);

export default router;

