import { financeLoanAppliedHandler } from '../../../src/handlers/financeLoanAppliedHandler';
import { financeLoanDisbursedHandler } from '../../../src/handlers/financeLoanDisbursedHandler';
import { financePaymentConfirmedHandler } from '../../../src/handlers/financePaymentConfirmedHandler';
import { financePaymentFailedHandler } from '../../../src/handlers/financePaymentFailedHandler';

jest.mock('../../../src/services/tokenService', () => ({
  getToken: jest.fn(),
}));
jest.mock('../../../src/services/fcmService', () => ({
  sendPush: jest.fn(),
}));
jest.mock('../../../src/services/smsService', () => ({
  sendSms: jest.fn(),
}));
jest.mock('../../../src/deliveryLogger', () => ({
  logDelivery: jest.fn(),
}));

import { getToken } from '../../../src/services/tokenService';
import { sendPush } from '../../../src/services/fcmService';
import { sendSms } from '../../../src/services/smsService';
import { logDelivery } from '../../../src/deliveryLogger';

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
const mockSendPush = sendPush as jest.MockedFunction<typeof sendPush>;
const mockSendSms = sendSms as jest.MockedFunction<typeof sendSms>;
const mockLogDelivery = logDelivery as jest.MockedFunction<typeof logDelivery>;

beforeEach(() => {
  jest.clearAllMocks();
  mockSendPush.mockResolvedValue('sent');
  mockSendSms.mockResolvedValue('sent');
  mockLogDelivery.mockResolvedValue(undefined);
});

describe('financeLoanAppliedHandler', () => {
  const validPayload = {
    loanId: 'loan-1',
    farmerId: 'farmer-1',
    amountKes: 30000,
    phone: '+254700000001',
    occurredAt: '2026-06-14T08:00:00Z',
  };

  it('sends push AND sms when FCM token exists', async () => {
    mockGetToken.mockResolvedValue('fcm-token-loan');

    await financeLoanAppliedHandler(validPayload);

    expect(mockSendPush).toHaveBeenCalledTimes(1);
    expect(mockSendSms).toHaveBeenCalledWith('+254700000001', expect.any(String));
    expect(mockLogDelivery).toHaveBeenCalledTimes(2);
  });

  it('skips push but still sends SMS when no FCM token', async () => {
    mockGetToken.mockResolvedValue(null);

    await financeLoanAppliedHandler(validPayload);

    expect(mockSendPush).not.toHaveBeenCalled();
    expect(mockSendSms).toHaveBeenCalled();
    expect(mockLogDelivery).toHaveBeenCalledTimes(1);
  });

  it('does not throw for invalid payload', async () => {
    await expect(financeLoanAppliedHandler({})).resolves.toBeUndefined();
  });
});

describe('financeLoanDisbursedHandler', () => {
  const validPayload = {
    loanId: 'loan-1',
    farmerId: 'farmer-1',
    amountKes: 30000,
    phone: '+254700000001',
    occurredAt: '2026-06-14T08:00:00Z',
  };

  it('sends push AND sms when FCM token exists', async () => {
    mockGetToken.mockResolvedValue('fcm-token-disbursed');

    await financeLoanDisbursedHandler(validPayload);

    expect(mockSendPush).toHaveBeenCalledTimes(1);
    expect(mockSendSms).toHaveBeenCalled();
    expect(mockLogDelivery).toHaveBeenCalledTimes(2);
  });

  it('skips push but still sends SMS when no FCM token', async () => {
    mockGetToken.mockResolvedValue(null);

    await financeLoanDisbursedHandler(validPayload);

    expect(mockSendPush).not.toHaveBeenCalled();
    expect(mockSendSms).toHaveBeenCalled();
  });

  it('does not throw for invalid payload', async () => {
    await expect(financeLoanDisbursedHandler(null)).resolves.toBeUndefined();
  });
});

describe('financePaymentConfirmedHandler', () => {
  const validPayload = {
    paymentId: 'pay-1',
    farmerId: 'farmer-1',
    amountKes: 5000,
    phone: '+254700000001',
    occurredAt: '2026-06-14T08:00:00Z',
  };

  it('sends push AND sms when FCM token exists', async () => {
    mockGetToken.mockResolvedValue('fcm-token-payment');

    await financePaymentConfirmedHandler(validPayload);

    expect(mockSendPush).toHaveBeenCalledTimes(1);
    expect(mockSendSms).toHaveBeenCalled();
  });

  it('skips push when no token, still sends SMS', async () => {
    mockGetToken.mockResolvedValue(null);

    await financePaymentConfirmedHandler(validPayload);

    expect(mockSendPush).not.toHaveBeenCalled();
    expect(mockSendSms).toHaveBeenCalled();
  });

  it('does not throw for invalid payload', async () => {
    await expect(financePaymentConfirmedHandler('bad')).resolves.toBeUndefined();
  });
});

describe('financePaymentFailedHandler', () => {
  const validPayload = {
    paymentId: 'pay-1',
    farmerId: 'farmer-1',
    amountKes: 5000,
    phone: '+254700000001',
    occurredAt: '2026-06-14T08:00:00Z',
  };

  it('sends push AND sms when FCM token exists', async () => {
    mockGetToken.mockResolvedValue('fcm-token-fail');

    await financePaymentFailedHandler(validPayload);

    expect(mockSendPush).toHaveBeenCalledTimes(1);
    expect(mockSendSms).toHaveBeenCalled();
  });

  it('skips push when no token, still sends SMS', async () => {
    mockGetToken.mockResolvedValue(null);

    await financePaymentFailedHandler(validPayload);

    expect(mockSendPush).not.toHaveBeenCalled();
    expect(mockSendSms).toHaveBeenCalled();
  });

  it('does not throw for invalid payload', async () => {
    await expect(financePaymentFailedHandler(undefined)).resolves.toBeUndefined();
  });
});
