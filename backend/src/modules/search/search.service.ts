import { esClient, ES_EMAILS_INDEX } from './elasticsearch.client.js';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';

export interface EmailDocument {
  emailId: string;
  userId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string;
  sentAt?: string | null;
  createdAt: string;
}

export interface SearchQueryParams {
  userId: string;
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
}

class SearchService {
  /**
   * Index or update an email document in Elasticsearch
   */
  async indexEmail(doc: EmailDocument): Promise<void> {
    try {
      await esClient.index({
        index: ES_EMAILS_INDEX,
        id: doc.emailId,
        document: doc,
      });
      logger.debug(`Indexed email ${doc.emailId} in Elasticsearch`);
    } catch (err: any) {
      logger.warn({ msg: 'Elasticsearch indexing failed (will not interrupt core flow)', emailId: doc.emailId, error: err.message });
    }
  }

  /**
   * Update email status in Elasticsearch
   */
  async updateEmailStatus(
    emailId: string,
    status: string,
    sentAt?: Date | null
  ): Promise<void> {
    try {
      await esClient.update({
        index: ES_EMAILS_INDEX,
        id: emailId,
        doc: {
          status,
          ...(sentAt ? { sentAt: sentAt.toISOString() } : {}),
        },
      });
      logger.debug(`Updated status for email ${emailId} in Elasticsearch to ${status}`);
    } catch (err: any) {
      logger.warn({ msg: 'Elasticsearch update failed', emailId, error: err.message });
    }
  }

  /**
   * Full-text search across recipient, subject, body, status scoped to authenticated user
   */
  async searchEmails(params: SearchQueryParams) {
    const { userId, q = '', status, page = 1, limit = 20 } = params;
    const from = (page - 1) * limit;

    try {
      const mustClauses: any[] = [{ term: { userId } }];

      if (status) {
        mustClauses.push({ term: { status } });
      }

      if (q && q.trim()) {
        mustClauses.push({
          multi_match: {
            query: q.trim(),
            fields: ['recipient^3', 'subject^2', 'body', 'status'],
            fuzziness: 'AUTO',
          },
        });
      }

      const response = await esClient.search<EmailDocument>({
        index: ES_EMAILS_INDEX,
        from,
        size: limit,
        sort: [{ scheduledAt: { order: 'desc' } }],
        query: {
          bool: {
            must: mustClauses,
          },
        },
      });

      const totalHits =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value || 0;

      const emails = response.hits.hits.map((hit) => ({
        id: hit._source?.emailId,
        recipient: hit._source?.recipient,
        subject: hit._source?.subject,
        body: hit._source?.body,
        status: hit._source?.status,
        scheduledAt: hit._source?.scheduledAt,
        sentAt: hit._source?.sentAt,
      }));

      return {
        source: 'elasticsearch',
        total: totalHits,
        page,
        limit,
        totalPages: Math.ceil(totalHits / limit),
        emails,
      };
    } catch (error: any) {
      logger.warn({
        msg: 'Elasticsearch search failed, falling back to PostgreSQL full-text/ilike search',
        error: error.message,
      });

      // Reliable DB fallback if Elasticsearch cluster is temporarily degraded
      return await this.fallbackDatabaseSearch(params);
    }
  }

  /**
   * Fallback database search if Elasticsearch is unreachable
   */
  private async fallbackDatabaseSearch(params: SearchQueryParams) {
    const { userId, q = '', status, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (status) {
      where.status = status;
    }
    if (q && q.trim()) {
      where.OR = [
        { recipient: { contains: q.trim(), mode: 'insensitive' } },
        { subject: { contains: q.trim(), mode: 'insensitive' } },
        { body: { contains: q.trim(), mode: 'insensitive' } },
      ];
    }

    const [total, emails] = await Promise.all([
      prisma.email.count({ where }),
      prisma.email.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'desc' },
      }),
    ]);

    return {
      source: 'database_fallback',
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      emails,
    };
  }
}

export const searchService = new SearchService();

