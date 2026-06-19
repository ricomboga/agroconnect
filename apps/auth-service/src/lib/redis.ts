import Redis from 'ioredis';

const globalForRedis = global as unknown as { redisClient: Redis };

export const redis =
  globalForRedis.redisClient ??
  new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
    lazyConnect: false,
    maxRetriesPerRequest: 3,
  });

if (process.env.NODE_ENV !== 'production') globalForRedis.redisClient = redis;
