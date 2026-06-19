import { farmCreatedHandler } from '../../../src/handlers/farmCreatedHandler';
import { farmActivityCompletedHandler } from '../../../src/handlers/farmActivityCompletedHandler';
import { farmHarvestRecordedHandler } from '../../../src/handlers/farmHarvestRecordedHandler';

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

beforeEach(() => {
  jest.clearAllMocks();
  mockSendPush.mockResolvedValue('sent');
  mockLogDelivery.mockResolvedValue(undefined);
});

describe('farmCreatedHandler', () => {
  const validPayload = {
    farmId: 'farm-1',
    ownerId: 'owner-1',
    county: 'Meru',
    occurredAt: '2026-06-14T08:00:00Z',
  };

  it('sends push when FCM token exists', async () => {
    mockGetToken.mockResolvedValue('fcm-token-farm');

    await farmCreatedHandler(validPayload);

    expect(mockGetToken).toHaveBeenCalledWith('owner-1');
    expect(mockSendPush).toHaveBeenCalledWith('fcm-token-farm', expect.any(String), expect.any(String));
    expect(mockLogDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'farm.created', channel: 'push' }),
    );
  });

  it('skips push when no FCM token', async () => {
    mockGetToken.mockResolvedValue(null);

    await farmCreatedHandler(validPayload);

    expect(mockSendPush).not.toHaveBeenCalled();
    expect(mockLogDelivery).not.toHaveBeenCalled();
  });

  it('does not throw for invalid payload', async () => {
    await expect(farmCreatedHandler({ invalid: true })).resolves.toBeUndefined();
    expect(mockGetToken).not.toHaveBeenCalled();
  });
});

describe('farmActivityCompletedHandler', () => {
  const validPayload = {
    activityId: 'act-1',
    farmId: 'farm-1',
    ownerId: 'owner-1',
    activityType: 'planting',
    occurredAt: '2026-06-14T08:00:00Z',
  };

  it('sends push when FCM token exists', async () => {
    mockGetToken.mockResolvedValue('fcm-token-act');

    await farmActivityCompletedHandler(validPayload);

    expect(mockSendPush).toHaveBeenCalled();
    expect(mockLogDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'farm.activity.completed', farmerId: 'owner-1' }),
    );
  });

  it('skips push when no FCM token', async () => {
    mockGetToken.mockResolvedValue(null);

    await farmActivityCompletedHandler(validPayload);

    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it('does not throw for invalid payload', async () => {
    await expect(farmActivityCompletedHandler(null)).resolves.toBeUndefined();
  });
});

describe('farmHarvestRecordedHandler', () => {
  const validPayload = {
    harvestId: 'harvest-1',
    farmId: 'farm-1',
    ownerId: 'owner-1',
    crop: 'maize',
    quantityKg: 500,
    occurredAt: '2026-06-14T08:00:00Z',
  };

  it('sends push when FCM token exists', async () => {
    mockGetToken.mockResolvedValue('fcm-token-harvest');

    await farmHarvestRecordedHandler(validPayload);

    expect(mockSendPush).toHaveBeenCalled();
    expect(mockLogDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'farm.harvest.recorded', farmerId: 'owner-1' }),
    );
  });

  it('skips push when no FCM token', async () => {
    mockGetToken.mockResolvedValue(null);

    await farmHarvestRecordedHandler(validPayload);

    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it('does not throw for invalid payload', async () => {
    await expect(farmHarvestRecordedHandler('bad')).resolves.toBeUndefined();
  });
});
