import axios, { AxiosError } from 'axios';
import crypto from 'node:crypto';
import { logger } from '../logger.js';

// ----- Base URLs -----

const SANDBOX_BASE = 'https://sandbox.safaricom.co.ke';
const PRODUCTION_BASE = 'https://api.safaricom.co.ke';

function baseUrl(): string {
  return process.env['MPESA_ENV'] === 'production' ? PRODUCTION_BASE : SANDBOX_BASE;
}

// ----- In-memory token cache (single node, Phase 1) -----

interface CachedToken {
  value: string;
  expiresAt: number;
}

let _tokenCache: CachedToken | null = null;

/** Exported only for test teardown — do not call in production code. */
export function _resetTokenCache(): void {
  _tokenCache = null;
}

async function getAccessToken(): Promise<string> {
  if (_tokenCache !== null && Date.now() < _tokenCache.expiresAt - 30_000) {
    return _tokenCache.value;
  }

  const key = process.env['MPESA_CONSUMER_KEY'] ?? '';
  const secret = process.env['MPESA_CONSUMER_SECRET'] ?? '';

  if (!key || !secret) {
    throw new Error('MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET must be set');
  }

  const credentials = Buffer.from(`${key}:${secret}`).toString('base64');

  logger.debug(
    { consumerKey: `****${key.slice(-4)}` },
    'Requesting Daraja OAuth token',
  );

  try {
    const res = await axios.get<{ access_token: string; expires_in: string }>(
      `${baseUrl()}/oauth/v1/generate`,
      {
        params: { grant_type: 'client_credentials' },
        headers: { Authorization: `Basic ${credentials}` },
        timeout: 10_000,
      },
    );

    const token = res.data.access_token;
    const expiresIn = parseInt(res.data.expires_in, 10) || 3600;

    _tokenCache = { value: token, expiresAt: Date.now() + expiresIn * 1000 };
    return token;
  } catch (err) {
    if (err instanceof AxiosError) {
      logger.error(
        { status: err.response?.status, daraja: err.response?.data },
        'Failed to obtain Daraja OAuth token',
      );
    }
    throw new Error('Failed to obtain Daraja OAuth token');
  }
}

// ----- STK Push -----

export interface StkPushResult {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
}

function timestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[-T:.Z]/g, '')
    .slice(0, 14);
}

function stkPassword(shortcode: string, passkey: string, ts: string): string {
  return Buffer.from(`${shortcode}${passkey}${ts}`).toString('base64');
}

function normalisePhone(phone: string): string {
  // Accept +254XXXXXXXXX, 0XXXXXXXXX, 254XXXXXXXXX
  return phone.replace(/^\+/, '').replace(/^0/, '254');
}

export async function initiateStkPush(
  phone: string,
  amountKes: number,
  orderReference: string,
  description: string,
): Promise<StkPushResult> {
  const shortcode = process.env['MPESA_SHORTCODE'] ?? '';
  const passkey = process.env['MPESA_PASSKEY'] ?? '';
  const callbackUrl = process.env['MPESA_CALLBACK_URL'] ?? '';

  if (!shortcode || !passkey || !callbackUrl) {
    throw new Error('MPESA_SHORTCODE, MPESA_PASSKEY and MPESA_CALLBACK_URL must be set');
  }

  const token = await getAccessToken();
  const ts = timestamp();
  const pwd = stkPassword(shortcode, passkey, ts);

  const payload = {
    BusinessShortCode: shortcode,
    Password: pwd,
    Timestamp: ts,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.ceil(amountKes),
    PartyA: normalisePhone(phone),
    PartyB: shortcode,
    PhoneNumber: normalisePhone(phone),
    CallBackURL: callbackUrl,
    AccountReference: orderReference.slice(0, 12),
    TransactionDesc: description.slice(0, 13),
  };

  logger.info(
    { phone: `****${phone.slice(-4)}`, amountKes, orderReference },
    'Initiating M-Pesa STK Push',
  );

  try {
    const res = await axios.post<{
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResponseCode: string;
      ResponseDescription: string;
      CustomerMessage: string;
    }>(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, payload, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15_000,
    });

    return {
      merchantRequestId: res.data.MerchantRequestID,
      checkoutRequestId: res.data.CheckoutRequestID,
      responseCode: res.data.ResponseCode,
      responseDescription: res.data.ResponseDescription,
      customerMessage: res.data.CustomerMessage,
    };
  } catch (err) {
    if (err instanceof AxiosError) {
      logger.error(
        { status: err.response?.status, daraja: err.response?.data, orderReference },
        'STK Push request failed',
      );
      throw new Error(
        `STK Push failed: ${err.response?.data?.errorMessage ?? err.message}`,
      );
    }
    throw err;
  }
}

// ----- Callback validation -----

export interface CallbackValidation {
  valid: boolean;
  reason?: string;
}

function ipToLong(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
}

function isIpInCidr(ip: string, cidr: string): boolean {
  if (!cidr.includes('/')) return ip === cidr;
  const [network, bits] = cidr.split('/') as [string, string];
  const mask = ~((1 << (32 - parseInt(bits, 10))) - 1) >>> 0;
  return (ipToLong(ip) & mask) === (ipToLong(network) & mask);
}

/**
 * Validates an incoming M-Pesa callback.
 * Checks (in order): IP allowlist, then HMAC-SHA256 signature.
 * Both checks read from environment variables at call time so tests can
 * control them via process.env.
 */
export function validateCallback(
  body: unknown,
  headers: Record<string, string | string[] | undefined>,
): CallbackValidation {
  // --- IP check ---
  const rawAllowlist = process.env['SAFARICOM_IP_ALLOWLIST'] ?? '';
  const allowlist = rawAllowlist
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowlist.length > 0) {
    const forwarded = headers['x-forwarded-for'];
    const clientIp =
      (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ?? '';

    const allowed = allowlist.some((entry) => isIpInCidr(clientIp, entry));
    if (!allowed) {
      return { valid: false, reason: `IP not in Safaricom allowlist: ${clientIp}` };
    }
  }

  // --- HMAC-SHA256 check ---
  const secret = process.env['MPESA_CALLBACK_SECRET'] ?? '';
  const signatureHeader = headers['x-mpesa-signature'];
  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

  if (secret && signature !== undefined) {
    const rawBody = JSON.stringify(body);
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    try {
      const sigBuf = Buffer.from(signature, 'hex');
      const expBuf = Buffer.from(expected, 'hex');
      const match =
        sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
      if (!match) {
        return { valid: false, reason: 'HMAC signature mismatch' };
      }
    } catch {
      return { valid: false, reason: 'Malformed HMAC signature' };
    }
  } else if (secret && signature === undefined) {
    return { valid: false, reason: 'Missing X-Mpesa-Signature header' };
  }

  return { valid: true };
}
