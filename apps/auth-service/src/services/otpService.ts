import crypto from 'node:crypto';
import { redis } from '../lib/redis.js';
import { logger } from '../logger.js';

const OTP_TTL = parseInt(process.env['OTP_TTL_SECONDS'] ?? '300', 10);
const RATE_LIMIT_SEND_MAX = parseInt(process.env['OTP_RATE_LIMIT_MAX'] ?? '3', 10);
const RATE_LIMIT_VERIFY_MAX = 5;
const RATE_LIMIT_WINDOW = 600; // 10 minutes in seconds
const TEST_BYPASS = process.env['OTP_TEST_BYPASS'];

const AT_BASE_URL =
  process.env['AT_USERNAME'] === 'sandbox'
    ? 'https://api.sandbox.africastalking.com'
    : 'https://api.africastalking.com';

async function sendSms(phone: string, message: string): Promise<void> {
  const res = await fetch(`${AT_BASE_URL}/version1/messaging`, {
    method: 'POST',
    headers: {
      apiKey: process.env['AT_API_KEY'] ?? '',
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      username: process.env['AT_USERNAME'] ?? 'sandbox',
      to: phone,
      message,
    }).toString(),
  });
  if (!res.ok) {
    throw Object.assign(new Error('error.sms.failed'), { statusCode: 502, errorCode: 'SMS_FAILED' });
  }
}

export async function sendOtp(phone: string): Promise<void> {
  const sendRlKey = `otp:rl:send:${phone}`;
  const sends = await redis.incr(sendRlKey);
  if (sends === 1) await redis.expire(sendRlKey, RATE_LIMIT_WINDOW);
  if (sends > RATE_LIMIT_SEND_MAX) {
    throw Object.assign(new Error('error.otp.rate_limit'), { statusCode: 429, errorCode: 'OTP_RATE_LIMIT' });
  }

  const code = TEST_BYPASS ?? crypto.randomInt(100000, 999999).toString();
  await redis.set(`otp:${phone}`, code, 'EX', OTP_TTL);

  if (TEST_BYPASS) {
    logger.info({ phone }, 'OTP bypass active — skipping AT SMS');
    return;
  }

  await sendSms(phone, `AgroConnect: Nambari yako ya uthibitisho ni ${code}. Inatumika kwa dakika ${Math.floor(OTP_TTL / 60)}.`);
  logger.info({ phone }, 'OTP sent via Africa\'s Talking');
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const verifyRlKey = `otp:rl:verify:${phone}`;
  const attempts = await redis.incr(verifyRlKey);
  if (attempts === 1) await redis.expire(verifyRlKey, RATE_LIMIT_WINDOW);
  if (attempts > RATE_LIMIT_VERIFY_MAX) {
    throw Object.assign(new Error('error.otp.rate_limit'), { statusCode: 429, errorCode: 'OTP_RATE_LIMIT' });
  }

  const stored = await redis.get(`otp:${phone}`);
  if (!stored) return false;
  const storedBuf = Buffer.from(stored);
  const codeBuf = Buffer.from(code);
  if (storedBuf.length !== codeBuf.length || !crypto.timingSafeEqual(storedBuf, codeBuf)) return false;

  await redis.del(`otp:${phone}`);
  await redis.del(verifyRlKey);
  return true;
}
