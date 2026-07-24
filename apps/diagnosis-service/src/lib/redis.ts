import Redis from 'ioredis';
import { config } from '../config.js';

const globalForRedis = global as unknown as { redisClient: Redis };

export const redis =
  globalForRedis.redisClient ??
  new Redis(config.redisUrl, {
    lazyConnect: false,
    maxRetriesPerRequest: 3,
  });

if (config.nodeEnv !== 'production') globalForRedis.redisClient = redis;
