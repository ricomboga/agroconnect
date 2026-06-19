import Redis from 'ioredis';
import { logger } from '../logger.js';

export const redis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});

redis.on('error', (err: Error) => {
  logger.error({ err }, 'Redis connection error');
});
