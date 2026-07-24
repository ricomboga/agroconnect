import { redis } from './redis.js';
import { config } from '../config.js';

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  max: number;
}

export async function checkDiagnosisRateLimit(farmerId: string): Promise<RateLimitResult> {
  const key = `diagnosis:rl:${farmerId}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, config.diagnosisRateLimitWindowSeconds);
  }
  return { allowed: count <= config.diagnosisRateLimitMax, count, max: config.diagnosisRateLimitMax };
}
