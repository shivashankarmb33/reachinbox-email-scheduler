import { Redis, RedisOptions } from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let host = env.REDIS_HOST;
let port = env.REDIS_PORT;
let username: string | undefined = undefined;
let password = env.REDIS_PASSWORD || undefined;
let tls: any = undefined;

if (env.REDIS_URL || process.env.REDIS_URL) {
  try {
    const redisUrl = env.REDIS_URL || process.env.REDIS_URL || '';
    const parsed = new URL(redisUrl);
    host = parsed.hostname;
    port = Number(parsed.port) || 6379;
    if (parsed.username) {
      username = decodeURIComponent(parsed.username);
    }
    if (parsed.password) {
      password = decodeURIComponent(parsed.password);
    }
    if (parsed.protocol === 'rediss:') {
      tls = { rejectUnauthorized: false };
    }
  } catch (err) {
    logger.warn({ msg: 'Failed to parse REDIS_URL, falling back to REDIS_HOST', err });
  }
}

// BullMQ connection options (BullMQ requires maxRetriesPerRequest: null)
export const redisOptions: RedisOptions = {
  host,
  port,
  username,
  password,
  tls,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    logger.warn(`Redis connection retry attempt ${times} in ${delay}ms`);
    return delay;
  },
};

// General application Redis client for sessions, rate limiting, and cache with fail-fast retry limit
export const redisClient = new Redis({
  ...redisOptions,
  maxRetriesPerRequest: 5,
  connectTimeout: 10000,
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis server');
});

redisClient.on('error', (err) => {
  logger.error({ msg: 'Redis Client Error', err });
});

export const createRedisClient = (): Redis => {
  return new Redis(redisOptions);
};

