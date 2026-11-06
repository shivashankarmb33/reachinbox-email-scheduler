import { redisClient } from '../../config/redis.js';
import { logger } from '../../utils/logger.js';

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  hourlyLimit: number;
  retryAfterMs?: number;
  reason?: 'HOURLY_LIMIT_EXCEEDED' | 'MIN_DELAY_REQUIRED';
}

class RateLimiter {
  /**
   * Get formatted hourly window string (e.g., "2026110510")
   */
  private getHourlyWindow(date = new Date()): string {
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    const hh = String(date.getUTCHours()).padStart(2, '0');
    return `${yyyy}${mm}${dd}${hh}`;
  }

  /**
   * Calculate milliseconds remaining until the beginning of the next UTC hour
   */
  calculateMsUntilNextHour(now = new Date()): number {
    const nextHour = new Date(now);
    nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 0, 0);
    return Math.max(1000, nextHour.getTime() - now.getTime());
  }

  /**
   * Atomic reservation of an email send slot for a specific sender:
   * 1. Checks and enforces per-sender hourly limit.
   * 2. Checks and enforces per-sender minimum delay between consecutive sends.
   */
  async reserveSendingSlot(
    senderId: string,
    hourlyLimit: number,
    minDelayMs: number
  ): Promise<RateLimitCheckResult> {
    const now = Date.now();
    const window = this.getHourlyWindow(new Date(now));
    const hourlyKey = `ratelimit:sender:${senderId}:hour:${window}`;
    const delayKey = `ratelimit:sender:${senderId}:last_sent_ts`;

    // 1. Atomic Hourly Limit Check and Increment via Lua Script
    const hourlyScript = `
      local key = KEYS[1]
      local limit = tonumber(ARGV[1])
      local current = redis.call('GET', key)
      if current and tonumber(current) >= limit then
        return tonumber(current)
      end
      local count = redis.call('INCR', key)
      if count == 1 then
        redis.call('EXPIRE', key, 7200)
      end
      return count
    `;

    const currentCount = (await redisClient.eval(
      hourlyScript,
      1,
      hourlyKey,
      hourlyLimit.toString()
    )) as number;

    if (currentCount > hourlyLimit) {
      const msUntilNextHour = this.calculateMsUntilNextHour(new Date(now));
      logger.warn({
        msg: 'Hourly rate limit reached for sender',
        senderId,
        hourlyLimit,
        currentCount,
        msUntilNextHour,
      });

      return {
        allowed: false,
        currentCount,
        hourlyLimit,
        retryAfterMs: msUntilNextHour,
        reason: 'HOURLY_LIMIT_EXCEEDED',
      };
    }

    // 2. Minimum Delay Check
    // Check timestamp of the last email sent by this sender
    const lastSentTsStr = await redisClient.get(delayKey);
    if (lastSentTsStr) {
      const lastSentTs = parseInt(lastSentTsStr, 10);
      const elapsed = now - lastSentTs;
      if (elapsed < minDelayMs) {
        const waitMs = minDelayMs - elapsed;
        // Refund the hourly slot because this dispatch will be delayed
        await this.refundHourlySlot(senderId);

        logger.debug({
          msg: 'Minimum delay required between emails for sender',
          senderId,
          minDelayMs,
          elapsed,
          waitMs,
        });

        return {
          allowed: false,
          currentCount: currentCount - 1,
          hourlyLimit,
          retryAfterMs: waitMs,
          reason: 'MIN_DELAY_REQUIRED',
        };
      }
    }

    // Update last sent timestamp for minimum delay tracking
    await redisClient.set(delayKey, now.toString(), 'EX', 3600);

    return {
      allowed: true,
      currentCount,
      hourlyLimit,
    };
  }

  /**
   * Refund / Decrement hourly counter if SMTP delivery fails transiently
   */
  async refundHourlySlot(senderId: string): Promise<void> {
    try {
      const window = this.getHourlyWindow();
      const hourlyKey = `ratelimit:sender:${senderId}:hour:${window}`;
      const count = await redisClient.decr(hourlyKey);
      if (count < 0) {
        await redisClient.set(hourlyKey, 0);
      }
    } catch (err) {
      logger.error({ msg: 'Failed to refund hourly rate limit slot', senderId, err });
    }
  }

  /**
   * Check if a Slack rate limit alert has already been dispatched for this sender in this hour
   */
  async shouldSendSlackAlert(senderId: string): Promise<boolean> {
    const window = this.getHourlyWindow();
    const alertKey = `slack:ratelimit:alert:${senderId}:${window}`;
    // Set NX with 1 hour expiration
    const result = await redisClient.set(alertKey, '1', 'EX', 3600, 'NX');
    return result === 'OK';
  }
}

export const rateLimiter = new RateLimiter();

