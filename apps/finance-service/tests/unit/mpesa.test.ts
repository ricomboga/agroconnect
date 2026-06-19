import crypto from 'node:crypto';
import nock from 'nock';
import request from 'supertest';

// ── Mocks (hoisted before any imports that load these modules) ───────────────

jest.mock('../../src/repositories/loanRepository', () => ({
  findLoanById: jest.fn(),
  updateLoanDisbursed: jest.fn(),
  updateLoanFailed: jest.fn(),
}));

jest.mock('../../src/repositories/creditScoreRepository', () => ({
  upsertCreditScore: jest.fn(),
  findCreditScore: jest.fn(),
}));

jest.mock('../../src/events/producers/loanDisbursedProducer', () => ({
  publishLoanDisbursed: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/events/producers/paymentFailedProducer', () => ({
  publishPaymentFailed: jest.fn().mockResolvedValue(undefined),
}));

// ── Imports ──────────────────────────────────────────────────────────────────

import { app } from '../../src/index';
import * as loanRepo from '../../src/repositories/loanRepository';
import { publishLoanDisbursed } from '../../src/events/producers/loanDisbursedProducer';
import { publishPaymentFailed } from '../../src/events/producers/paymentFailedProducer';
import {
  initiateStkPush,
  validateCallback,
  _resetTokenCache,
} from '../../src/services/mpesaService';

const mockFindLoanById = jest.mocked(loanRepo.findLoanById);
const mockUpdateLoanDisbursed = jest.mocked(loanRepo.updateLoanDisbursed);
const mockUpdateLoanFailed = jest.mocked(loanRepo.updateLoanFailed);
const mockPublishLoanDisbursed = jest.mocked(publishLoanDisbursed);
const mockPublishPaymentFailed = jest.mocked(publishPaymentFailed);

const SANDBOX = 'https://sandbox.safaricom.co.ke';
const LOAN_ID = 'loan-abc-001';
const FARMER_ID = 'farmer-001';
const FARM_ID = 'farm-001';

// Minimal loan shape returned by the mock repo
const baseLoan = {
  id: LOAN_ID,
  farmerId: FARMER_ID,
  farmId: FARM_ID,
  amountRequestedKes: '50000.00',
  status: 'submitted',
  type: 'agricultural_working_capital',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSuccessCallback(overrides: Record<string, unknown> = {}) {
  return {
    Body: {
      stkCallback: {
        MerchantRequestID: LOAN_ID,
        CheckoutRequestID: 'ws_co_001',
        ResultCode: 0,
        ResultDesc: 'The service request is processed successfully.',
        CallbackMetadata: {
          Item: [
            { Name: 'Amount', Value: 50000 },
            { Name: 'MpesaReceiptNumber', Value: 'RHJ1AB2CDE' },
            { Name: 'TransactionDate', Value: 20240601120000 },
            { Name: 'PhoneNumber', Value: 254712345678 },
          ],
        },
        ...overrides,
      },
    },
  };
}

function makeFailureCallback(resultCode = 1032, resultDesc = 'Request cancelled by user') {
  return {
    Body: {
      stkCallback: {
        MerchantRequestID: LOAN_ID,
        CheckoutRequestID: 'ws_co_001',
        ResultCode: resultCode,
        ResultDesc: resultDesc,
      },
    },
  };
}

function hmacSign(body: unknown, secret: string): string {
  return crypto.createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex');
}

// ── mpesaService.initiateStkPush ─────────────────────────────────────────────

describe('mpesaService.initiateStkPush', () => {
  beforeEach(() => {
    _resetTokenCache();
    nock.cleanAll();
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.enableNetConnect();
    expect(nock.pendingMocks()).toHaveLength(0);
  });

  it('fetches an OAuth token then initiates STK Push', async () => {
    nock(SANDBOX)
      .get('/oauth/v1/generate')
      .query({ grant_type: 'client_credentials' })
      .basicAuth({ user: 'test-consumer-key', pass: 'test-consumer-secret' })
      .reply(200, { access_token: 'tok-xyz', expires_in: '3600' });

    nock(SANDBOX)
      .post('/mpesa/stkpush/v1/processrequest')
      .matchHeader('authorization', 'Bearer tok-xyz')
      .reply(200, {
        MerchantRequestID: LOAN_ID,
        CheckoutRequestID: 'ws_co_123',
        ResponseCode: '0',
        ResponseDescription: 'Success. Request accepted for processing',
        CustomerMessage: 'Success. Request accepted for processing',
      });

    const result = await initiateStkPush('+254712345678', 500, LOAN_ID, 'Loan disbursement');

    expect(result.merchantRequestId).toBe(LOAN_ID);
    expect(result.checkoutRequestId).toBe('ws_co_123');
    expect(result.responseCode).toBe('0');
  });

  it('reuses cached OAuth token on second call', async () => {
    // OAuth endpoint intercepted once only — second call must use the cache
    nock(SANDBOX)
      .get('/oauth/v1/generate')
      .query({ grant_type: 'client_credentials' })
      .once()
      .reply(200, { access_token: 'tok-cached', expires_in: '3600' });

    nock(SANDBOX)
      .post('/mpesa/stkpush/v1/processrequest')
      .twice()
      .reply(200, {
        MerchantRequestID: 'req-1',
        CheckoutRequestID: 'co-1',
        ResponseCode: '0',
        ResponseDescription: 'Success',
        CustomerMessage: 'Success',
      });

    await initiateStkPush('+254712345678', 100, 'ref-1', 'Test');
    await initiateStkPush('+254712345678', 200, 'ref-2', 'Test');
    // nock would throw if the OAuth endpoint was called twice
  });

  it('throws a descriptive error when Daraja returns 400', async () => {
    nock(SANDBOX)
      .get('/oauth/v1/generate')
      .query({ grant_type: 'client_credentials' })
      .reply(200, { access_token: 'tok-err', expires_in: '3600' });

    nock(SANDBOX)
      .post('/mpesa/stkpush/v1/processrequest')
      .reply(400, { errorCode: '400.002.02', errorMessage: 'Bad Request - Invalid AccessToken' });

    await expect(
      initiateStkPush('+254712345678', 500, 'bad-ref', 'Test'),
    ).rejects.toThrow(/STK Push failed/);
  });

  it('throws when OAuth credentials are missing', async () => {
    const origKey = process.env['MPESA_CONSUMER_KEY'];
    process.env['MPESA_CONSUMER_KEY'] = '';
    try {
      await expect(initiateStkPush('+254712345678', 100, 'ref', 'Test')).rejects.toThrow(
        /MPESA_CONSUMER_KEY/,
      );
    } finally {
      process.env['MPESA_CONSUMER_KEY'] = origKey;
    }
  });
});

// ── validateCallback (unit — no HTTP) ────────────────────────────────────────

describe('mpesaService.validateCallback', () => {
  const body = makeSuccessCallback();

  afterEach(() => {
    process.env['SAFARICOM_IP_ALLOWLIST'] = '';
    process.env['MPESA_CALLBACK_SECRET'] = '';
  });

  it('returns valid=true when both IP and HMAC checks are disabled (empty env vars)', () => {
    const result = validateCallback(body, {});
    expect(result.valid).toBe(true);
  });

  it('returns valid=true for IP in allowlist and correct HMAC', () => {
    const secret = 'supersecret';
    process.env['SAFARICOM_IP_ALLOWLIST'] = '196.201.214.0/24';
    process.env['MPESA_CALLBACK_SECRET'] = secret;

    const sig = hmacSign(body, secret);
    const result = validateCallback(body, {
      'x-forwarded-for': '196.201.214.55',
      'x-mpesa-signature': sig,
    });

    expect(result.valid).toBe(true);
  });

  it('returns valid=false with reason when IP is not in allowlist', () => {
    process.env['SAFARICOM_IP_ALLOWLIST'] = '196.201.214.0/24';
    const result = validateCallback(body, { 'x-forwarded-for': '1.2.3.4' });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/IP not in Safaricom allowlist/);
  });

  it('returns valid=false with reason when HMAC does not match', () => {
    process.env['MPESA_CALLBACK_SECRET'] = 'real-secret';
    const result = validateCallback(body, {
      'x-mpesa-signature': 'deadbeefdeadbeefdeadbeefdeadbeef',
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/HMAC/);
  });

  it('returns valid=false when HMAC header is absent but secret is configured', () => {
    process.env['MPESA_CALLBACK_SECRET'] = 'need-sig';
    const result = validateCallback(body, {});
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/Missing/);
  });
});

// ── POST /api/v1/finance/mpesa/callback (integration via supertest) ───────────

describe('POST /api/v1/finance/mpesa/callback', () => {
  const CALLBACK_ROUTE = '/api/v1/finance/mpesa/callback';
  const HMAC_SECRET = 'test-hmac-secret';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env['SAFARICOM_IP_ALLOWLIST'] = '';
    process.env['MPESA_CALLBACK_SECRET'] = '';
  });

  afterEach(() => {
    process.env['SAFARICOM_IP_ALLOWLIST'] = '';
    process.env['MPESA_CALLBACK_SECRET'] = '';
  });

  // ── Happy path: success callback ──────────────────────────────────────────

  it('success callback — updates loan to disbursed and publishes finance.loan.disbursed', async () => {
    mockFindLoanById.mockResolvedValue(baseLoan as never);
    mockUpdateLoanDisbursed.mockResolvedValue({ ...baseLoan, status: 'disbursed' } as never);

    const body = makeSuccessCallback();
    const res = await request(app).post(CALLBACK_ROUTE).send(body);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ResultCode: 0 });

    expect(mockUpdateLoanDisbursed).toHaveBeenCalledWith(LOAN_ID, 'RHJ1AB2CDE');
    expect(mockPublishLoanDisbursed).toHaveBeenCalledWith(
      LOAN_ID,
      FARMER_ID,
      FARM_ID,
      50000,
      'RHJ1AB2CDE',
    );
    expect(mockUpdateLoanFailed).not.toHaveBeenCalled();
    expect(mockPublishPaymentFailed).not.toHaveBeenCalled();
  });

  // ── Happy path: failure callback ──────────────────────────────────────────

  it('failure callback — updates loan to rejected and publishes finance.payment.failed', async () => {
    mockFindLoanById.mockResolvedValue(baseLoan as never);
    mockUpdateLoanFailed.mockResolvedValue({ ...baseLoan, status: 'rejected' } as never);

    const body = makeFailureCallback(1032, 'Request cancelled by user');
    const res = await request(app).post(CALLBACK_ROUTE).send(body);

    expect(res.status).toBe(200);
    expect(mockUpdateLoanFailed).toHaveBeenCalledWith(LOAN_ID, 'Request cancelled by user');
    expect(mockPublishPaymentFailed).toHaveBeenCalledWith(
      LOAN_ID,
      FARMER_ID,
      1032,
      'Request cancelled by user',
    );
    expect(mockUpdateLoanDisbursed).not.toHaveBeenCalled();
    expect(mockPublishLoanDisbursed).not.toHaveBeenCalled();
  });

  // ── Invalid HMAC ──────────────────────────────────────────────────────────

  it('invalid HMAC — audit-logged and returns 200 without touching the DB', async () => {
    process.env['MPESA_CALLBACK_SECRET'] = HMAC_SECRET;

    const body = makeSuccessCallback();
    const res = await request(app)
      .post(CALLBACK_ROUTE)
      .set('X-Mpesa-Signature', 'badhmacsignaturebadhmacsignatureba')
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ResultCode: 0 });

    expect(mockFindLoanById).not.toHaveBeenCalled();
    expect(mockUpdateLoanDisbursed).not.toHaveBeenCalled();
    expect(mockPublishLoanDisbursed).not.toHaveBeenCalled();
  });

  // ── Wrong IP ──────────────────────────────────────────────────────────────

  it('wrong IP — audit-logged and returns 200 without touching the DB', async () => {
    process.env['SAFARICOM_IP_ALLOWLIST'] = '196.201.214.0/24';

    const body = makeSuccessCallback();
    const res = await request(app)
      .post(CALLBACK_ROUTE)
      .set('X-Forwarded-For', '1.2.3.4')
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ResultCode: 0 });

    expect(mockFindLoanById).not.toHaveBeenCalled();
    expect(mockUpdateLoanDisbursed).not.toHaveBeenCalled();
  });

  // ── Idempotency: duplicate success callback ───────────────────────────────

  it('duplicate success callback — already disbursed — returns 200 without re-processing', async () => {
    mockFindLoanById.mockResolvedValue({
      ...baseLoan,
      status: 'disbursed',
      mpesaDisbursementRef: 'RHJ1AB2CDE',
    } as never);

    const body = makeSuccessCallback();
    const res = await request(app).post(CALLBACK_ROUTE).send(body);

    expect(res.status).toBe(200);
    expect(mockUpdateLoanDisbursed).not.toHaveBeenCalled();
    expect(mockPublishLoanDisbursed).not.toHaveBeenCalled();
  });

  // ── Idempotency: duplicate failure callback ───────────────────────────────

  it('duplicate failure callback — already rejected — returns 200 without re-processing', async () => {
    mockFindLoanById.mockResolvedValue({
      ...baseLoan,
      status: 'rejected',
    } as never);

    const body = makeFailureCallback();
    const res = await request(app).post(CALLBACK_ROUTE).send(body);

    expect(res.status).toBe(200);
    expect(mockUpdateLoanFailed).not.toHaveBeenCalled();
    expect(mockPublishPaymentFailed).not.toHaveBeenCalled();
  });

  // ── Unknown loan ──────────────────────────────────────────────────────────

  it('callback for unknown loan — returns 200 without crashing', async () => {
    mockFindLoanById.mockResolvedValue(null);

    const body = makeSuccessCallback();
    const res = await request(app).post(CALLBACK_ROUTE).send(body);

    expect(res.status).toBe(200);
    expect(mockUpdateLoanDisbursed).not.toHaveBeenCalled();
  });

  // ── Malformed body ────────────────────────────────────────────────────────

  it('malformed body — returns 200 without crashing', async () => {
    const res = await request(app)
      .post(CALLBACK_ROUTE)
      .send({ garbage: true });

    expect(res.status).toBe(200);
    expect(mockFindLoanById).not.toHaveBeenCalled();
  });

  // ── HMAC passes when IP and HMAC both valid ───────────────────────────────

  it('valid IP + valid HMAC — processes normally', async () => {
    process.env['SAFARICOM_IP_ALLOWLIST'] = '196.201.214.0/24';
    process.env['MPESA_CALLBACK_SECRET'] = HMAC_SECRET;

    mockFindLoanById.mockResolvedValue(baseLoan as never);
    mockUpdateLoanDisbursed.mockResolvedValue({ ...baseLoan, status: 'disbursed' } as never);

    const body = makeSuccessCallback();
    const sig = hmacSign(body, HMAC_SECRET);

    const res = await request(app)
      .post(CALLBACK_ROUTE)
      .set('X-Forwarded-For', '196.201.214.200')
      .set('X-Mpesa-Signature', sig)
      .send(body);

    expect(res.status).toBe(200);
    expect(mockUpdateLoanDisbursed).toHaveBeenCalledTimes(1);
    expect(mockPublishLoanDisbursed).toHaveBeenCalledTimes(1);
  });
});
