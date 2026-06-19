/**
 * Tests for the real AT SMS code path in otpService.
 * Kept in a separate file so jest.doMock inside isolateModules is the ONLY mock
 * registered for redis/logger — no top-level jest.mock() here that would shadow it.
 */

type OtpService = { sendOtp: (phone: string) => Promise<void> };

const redisMocks = {
  incr: jest.fn(),
  expire: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
};

let otpMod: OtpService;

beforeAll(() => {
  // setup.ts sets OTP_TEST_BYPASS='999000' — remove it so TEST_BYPASS is undefined
  // in the fresh module load below
  delete process.env['OTP_TEST_BYPASS'];

  jest.isolateModules(() => {
    jest.doMock('../../src/lib/redis', () => ({ redis: redisMocks }));
    jest.doMock('../../src/logger', () => ({
      logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
    }));
    otpMod = require('../../src/services/otpService') as OtpService;
  });

  // restore so other test files that run after this one still see the bypass value
  process.env['OTP_TEST_BYPASS'] = '999000';
});

beforeEach(() => {
  jest.clearAllMocks();
  // always start with a fresh first-send (count = 1, within rate limit)
  redisMocks.incr.mockResolvedValue(1);
  redisMocks.expire.mockResolvedValue(1);
  redisMocks.set.mockResolvedValue('OK');
});

describe('sendOtp — real AT SMS path', () => {
  it('calls the AT sandbox API with correct params when bypass is not set', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = mockFetch as unknown as typeof global.fetch;

    await otpMod.sendOtp('+254712345678');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/version1/messaging');
    expect((opts.headers as Record<string, string>)['apiKey']).toBe('test_key');
    expect((opts.headers as Record<string, string>)['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(opts.method).toBe('POST');
  });

  it('includes the phone number in the SMS request body', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    global.fetch = mockFetch as unknown as typeof global.fetch;

    await otpMod.sendOtp('+254712345678');

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(opts.body as string).toContain('to=%2B254712345678');
  });

  it('throws 502 SMS_FAILED when the AT API returns a non-ok status', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400 }) as unknown as typeof global.fetch;

    await expect(otpMod.sendOtp('+254712345678')).rejects.toMatchObject({
      statusCode: 502,
      errorCode: 'SMS_FAILED',
    });
  });

  it('sets the OTP in Redis before calling the AT API', async () => {
    const mockFetch = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = mockFetch as unknown as typeof global.fetch;

    await otpMod.sendOtp('+254712345678');

    // set must be called before fetch
    const setOrder = redisMocks.set.mock.invocationCallOrder[0];
    const fetchOrder = (mockFetch as jest.Mock).mock.invocationCallOrder[0];
    expect(setOrder).toBeLessThan(fetchOrder);
  });
});
