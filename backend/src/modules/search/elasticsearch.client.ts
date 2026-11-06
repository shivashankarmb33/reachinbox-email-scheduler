import { Client } from '@elastic/elasticsearch';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export const ES_EMAILS_INDEX = 'reachinbox_emails';

export const esClient = new Client({
  node: env.ELASTICSEARCH_URL,
  maxRetries: 3,
  requestTimeout: 10000,
});

/**
 * Ensure the Elasticsearch index and mapping exist
 */
export const initializeElasticsearch = async (): Promise<boolean> => {
  try {
    const health = await esClient.cluster.health({});
    logger.info(`Elasticsearch cluster connected. Health status: ${health.status}`);

    const indexExists = await esClient.indices.exists({ index: ES_EMAILS_INDEX });
    if (!indexExists) {
      await esClient.indices.create({
        index: ES_EMAILS_INDEX,
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                email_analyzer: {
                  type: 'custom',
                  tokenizer: 'uax_url_email',
                  filter: ['lowercase'],
                },
              },
            },
          },
          mappings: {
            properties: {
              emailId: { type: 'keyword' },
              userId: { type: 'keyword' },
              senderId: { type: 'keyword' },
              recipient: {
                type: 'text',
                analyzer: 'email_analyzer',
                fields: { keyword: { type: 'keyword' } },
              },
              subject: { type: 'text' },
              body: { type: 'text' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              createdAt: { type: 'date' },
            },
          },
        },
      });
      logger.info(`Elasticsearch index '${ES_EMAILS_INDEX}' created successfully`);
    }

    return true;
  } catch (error: any) {
    logger.warn({
      msg: 'Elasticsearch is currently unavailable or initializing. Search will fallback or retry.',
      error: error.message,
    });
    return false;
  }
};

