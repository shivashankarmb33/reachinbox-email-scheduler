import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { ExpressAdapter } from '@bull-board/express';
import { emailQueue } from '../queues/email.queue.js';
import { indexingQueue } from '../queues/indexing.queue.js';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue) as any,
    new BullMQAdapter(indexingQueue) as any,
  ],
  serverAdapter,
});

export const bullBoardRouter = serverAdapter.getRouter();

