import { diagnosisCompletedHandler } from '../../../src/handlers/diagnosisCompletedHandler';

jest.mock('../../../src/services/tokenService', () => ({
  getToken: jest.fn(),
}));
jest.mock('../../../src/services/fcmService', () => ({
  sendPush: jest.fn(),
}));
jest.mock('../../../src/deliveryLogger', () => ({
  logDelivery: jest.fn(),
}));

import { getToken } from '../../../src/services/tokenService';
import { sendPush } from '../../../src/services/fcmService';
import { logDelivery } from '../../../src/deliveryLogger';

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
const mockSendPush = sendPush as jest.MockedFunction<typeof sendPush>;
const mockLogDelivery = logDelivery as jest.MockedFunction<typeof logDelivery>;

const validPayload = {
  diagnosisId: 'diag-1',
  farmerId: 'farmer-1',
  diseaseName: 'Grey Leaf Spot',
  occurredAt: '2026-06-13T10:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('diagnosisCompletedHandler', () => {
  it('sends push and logs delivery when FCM token exists', async () => {
    mockGetToken.mockResolvedValue('fcm-token-abc');
    mockSendPush.mockResolvedValue('sent');
    mockLogDelivery.mockResolvedValue(undefined);

    await diagnosisCompletedHandler(validPayload);

    expect(mockGetToken).toHaveBeenCalledWith('farmer-1');
    expect(mockSendPush).toHaveBeenCalledWith('fcm-token-abc', expect.any(String), expect.any(String));
    expect(mockLogDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'diagnosis.completed', farmerId: 'farmer-1', channel: 'push', status: 'sent' }),
    );
  });

  it('skips push and does not throw when FCM token is missing', async () => {
    mockGetToken.mockResolvedValue(null);

    await expect(diagnosisCompletedHandler(validPayload)).resolves.toBeUndefined();

    expect(mockSendPush).not.toHaveBeenCalled();
    expect(mockLogDelivery).not.toHaveBeenCalled();
  });

  it('skips send and does not throw when payload is malformed', async () => {
    await expect(diagnosisCompletedHandler({ bad: 'data' })).resolves.toBeUndefined();

    expect(mockGetToken).not.toHaveBeenCalled();
    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it('logs delivery as failed when FCM returns failed', async () => {
    mockGetToken.mockResolvedValue('fcm-token-abc');
    mockSendPush.mockResolvedValue('failed');
    mockLogDelivery.mockResolvedValue(undefined);

    await diagnosisCompletedHandler(validPayload);

    expect(mockLogDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' }),
    );
  });
});
