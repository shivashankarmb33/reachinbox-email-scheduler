import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { redisClient } from './config/redis.js';
import { initializeElasticsearch } from './modules/search/elasticsearch.client.js';
import { reconciliationService } from './services/reconciliation.service.js';
import { createEmailWorker } from './workers/email.worker.js';
import { logger } from './utils/logger.js';

const startServer = async () => {
  try {
    logger.info('Initializing ReachInbox Application Services...');

    // 1. Check PostgreSQL Database Connection
    await prisma.$connect();
    logger.info('Connected to PostgreSQL database successfully');

    // 2. Check Redis Connection
    await redisClient.ping();
    logger.info('Redis connection verified via PING');

    // 3. Initialize Elasticsearch Index & Mappings
    await initializeElasticsearch();

    // 4. Run Startup Reconciliation (survives backend / worker crash)
    await reconciliationService.reconcilePendingJobs();

    // 5. Start Express API Server
    const app = createApp();
    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 ReachInbox API server started on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);
      logger.info(`📊 Bull Board Dashboard accessible at http://localhost:${env.PORT}/admin/queues`);
    });

    // 6. Start Email Worker in process (in addition to standalone worker script support)
    const worker = createEmailWorker();
    logger.info(`👷 BullMQ Email Worker active with concurrency = ${env.WORKER_CONCURRENCY}`);

    // Graceful Shutdown Handler
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Gracefully stopping server and worker...`);
      server.close(async () => {
        logger.info('HTTP server closed');
        try {
          await worker.close();
          logger.info('BullMQ worker stopped');
          await redisClient.quit();
          logger.info('Redis connection closed');
          await prisma.$disconnect();
          logger.info('Prisma disconnected');
          process.exit(0);
        } catch (err) {
          logger.error({ msg: 'Error during shutdown', err });
          process.exit(1);
        }
      });

      // Force exit after 10s
      setTimeout(() => {
        logger.error('Shutdown timeout exceeded. Forcing exit.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error: any) {
    logger.error({ msg: 'Failed to start ReachInbox server', error: error.message, stack: error.stack });
    process.exit(1);
  }
};

startServer();
