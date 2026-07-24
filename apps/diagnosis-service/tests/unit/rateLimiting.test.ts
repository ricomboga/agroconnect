const store = new Map<string, { count: number; expiresAt: number | null }>();

jest.mock('../../src/lib/redis', () => ({
  redis: {
    incr: jest.fn(async (key: string) => {
      const entry = store.get(key) ?? { count: 0, expiresAt: null };
      entry.count += 1;
      store.set(key, entry);
      return entry.count;
    }),
    expire: jest.fn(async (key: string, seconds: number) => {
      const entry = store.get(key);
      if (entry) entry.expiresAt = Date.now() + seconds * 1000;
    }),
  },
}));

import { checkDiagnosisRateLimit } from '../../src/lib/rateLimit';

describe('checkDiagnosisRateLimit', () => {
  beforeEach(() => {
    store.clear();
    jest.clearAllMocks();
  });

  it('allows requests under the daily limit', async () => {
    for (let i = 1; i <= 20; i++) {
      const result = await checkDiagnosisRateLimit('farmer-1');
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(i);
    }
  });

  it('blocks the request exactly at the boundary (max + 1)', async () => {
    for (let i = 0; i < 20; i++) {
      await checkDiagnosisRateLimit('farmer-2');
    }
    const result = await checkDiagnosisRateLimit('farmer-2');
    expect(result.allowed).toBe(false);
    expect(result.count).toBe(21);
    expect(result.max).toBe(20);
  });

  it('tracks farmers independently', async () => {
    for (let i = 0; i < 20; i++) {
      await checkDiagnosisRateLimit('farmer-3');
    }
    const other = await checkDiagnosisRateLimit('farmer-4');
    expect(other.allowed).toBe(true);
    expect(other.count).toBe(1);
  });

  it('sets an expiry only on the first increment', async () => {
    const { redis } = jest.requireMock('../../src/lib/redis') as { redis: { expire: jest.Mock } };
    await checkDiagnosisRateLimit('farmer-5');
    await checkDiagnosisRateLimit('farmer-5');
    await checkDiagnosisRateLimit('farmer-5');
    expect(redis.expire).toHaveBeenCalledTimes(1);
  });
});
