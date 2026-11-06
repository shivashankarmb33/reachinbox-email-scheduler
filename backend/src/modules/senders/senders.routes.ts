import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import {
  getSenders,
  createSender,
  deleteSender,
} from './senders.controller.js';

const router = Router();

router.get('/', requireAuth, getSenders);
router.post('/', requireAuth, createSender);
router.delete('/:id', requireAuth, deleteSender);

export default router;

