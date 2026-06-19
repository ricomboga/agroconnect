import { redis } from '../../src/lib/redis';
import { sendOtp, verifyOtp } from '../../src/services/otpService';

jest.mock('../../src/lib/redis', () => ({
  redis: {
    incr: jest.fn(),
    expire: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  },
}));

jest.mock('../../src/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockRedis = jest.mocked(redis);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('sendOtp', () => {
  it('stores OTP in Redis and returns when bypass is active', async () => {
    // OTP_TEST_BYPASS='999000' — set in tests/setup.ts
    mockRedis.incr.mockResolvedValue(1 as never);
    mockRedis.expire.mockResolvedValue(1 as never);
    mockRedis.set.mockResolvedValue('OK' as never);

    await expect(sendOtp('+254712345678')).resolves.toBeUndefined();

    expect(mockRedis.incr).toHaveBeenCalledWith('otp:rl:send:+254712345678');
    expect(mockRedis.expire).toHaveBeenCalledWith('otp:rl:send:+254712345678', 600);
    expect(mockRedis.set).toHaveBeenCalledWith('otp:+254712345678', '999000', 'EX', 300);
  });

  it('does not re-set expiry on subsequent send attempts within the window', async () => {
    mockRedis.incr.mockResolvedValue(2 as never); // already incremented before
    mockRedis.expire.mockResolvedValue(0 as never);
    mockRedis.set.mockResolvedValue('OK' as never);

    await sendOtp('+254712345678');

    // expire should NOT be called when incr returns > 1
    expect(mockRedis.expire).not.toHaveBeenCalled();
  });

  it('throws 429 OTP_RATE_LIMIT when send count exceeds the limit', async () => {
    mockRedis.incr.mockResolvedValue(4 as never); // limit is 3

    await expect(sendOtp('+254712345678')).rejects.toMatchObject({
      statusCode: 429,
      errorCode: 'OTP_RATE_LIMIT',
    });

    expect(mockRedis.set).not.toHaveBeenCalled();
  });
});

describe('verifyOtp', () => {
  it('returns true and cleans up Redis when code matches', async () => {
    mockRedis.incr.mockResolvedValue(1 as never);
    mockRedis.expire.mockResolvedValue(1 as never);
    mockRedis.get.mockResolvedValue('999000');
    mockRedis.del.mockResolvedValue(2 as never);

    const result = await verifyOtp('+254712345678', '999000');

    expect(result).toBe(true);
    expect(mockRedis.del).toHaveBeenCalledWith('otp:+254712345678');
    expect(mockRedis.del).toHaveBeenCalledWith('otp:rl:verify:+254712345678');
  });

  it('returns false when stored OTP does not match', async () => {
    mockRedis.incr.mockResolvedValue(1 as never);
    mockRedis.expire.mockResolvedValue(1 as never);
    mockRedis.get.mockResolvedValue('111111');

    const result = await verifyOtp('+254712345678', '999000');
    expect(result).toBe(false);
    expect(mockRedis.del).not.toHaveBeenCalled();
  });

  it('returns false when OTP key has expired (null from Redis)', async () => {
    mockRedis.incr.mockResolvedValue(1 as never);
    mockRedis.expire.mockResolvedValue(1 as never);
    mockRedis.get.mockResolvedValue(null);

    const result = await verifyOtp('+254712345678', '999000');
    expect(result).toBe(false);
  });

  it('throws 429 OTP_RATE_LIMIT when verify attempts exceed the limit', async () => {
    mockRedis.incr.mockResolvedValue(6 as never); // limit is 5

    await expect(verifyOtp('+254712345678', '999000')).rejects.toMatchObject({
      statusCode: 429,
      errorCode: 'OTP_RATE_LIMIT',
    });

    expect(mockRedis.get).not.toHaveBeenCalled();
  });
});

