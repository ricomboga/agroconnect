import { communityPostCreatedHandler } from '../../../src/handlers/communityPostCreatedHandler';
import { communityArticleCreatedHandler } from '../../../src/handlers/communityArticleCreatedHandler';
import { govtRegistrationSubmittedHandler } from '../../../src/handlers/govtRegistrationSubmittedHandler';
import { marketListingCreatedHandler } from '../../../src/handlers/marketListingCreatedHandler';
import { marketOrderPlacedHandler } from '../../../src/handlers/marketOrderPlacedHandler';
import { marketOrderUpdatedHandler } from '../../../src/handlers/marketOrderUpdatedHandler';
import { userRegisteredHandler } from '../../../src/handlers/userRegisteredHandler';
import { weatherAlertIssuedHandler } from '../../../src/handlers/weatherAlertIssuedHandler';
import { notificationSendHandler } from '../../../src/handlers/notificationSendHandler';

jest.mock('../../../src/services/tokenService', () => ({
  getToken: jest.fn(),
  getAllTokens: jest.fn(),
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

import { getToken, getAllTokens } from '../../../src/services/tokenService';
import { sendPush } from '../../../src/services/fcmService';
import { sendSms } from '../../../src/services/smsService';
import { logDelivery } from '../../../src/deliveryLogger';

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
const mockGetAllTokens = getAllTokens as jest.MockedFunction<typeof getAllTokens>;
const mockSendPush = sendPush as jest.MockedFunction<typeof sendPush>;
const mockSendSms = sendSms as jest.MockedFunction<typeof sendSms>;
const mockLogDelivery = logDelivery as jest.MockedFunction<typeof logDelivery>;

beforeEach(() => {
  jest.clearAllMocks();
  mockSendPush.mockResolvedValue('sent');
  mockSendSms.mockResolvedValue('sent');
  mockLogDelivery.mockResolvedValue(undefined);
});

describe('communityPostCreatedHandler', () => {
  const validPayload = {
    postId: 'post-1',
    authorId: 'author-1',
    category: 'plant_health',
    title: 'Brown spots on bean leaves',
    occurredAt: '2026-06-14T08:00:00Z',
  };

  it('sends push when FCM token exists', async () => {
    mockGetToken.mockResolvedValue('fcm-token-community');

    await communityPostCreatedHandler(validPayload);

    expect(mockSendPush).toHaveBeenCalled();
    expect(mockLogDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'community.post.created', farmerId: 'author-1' }),
    );
  });

  it('skips push when no FCM token', async () => {
    mockGetToken.mockResolvedValue(null);

    await communityPostCreatedHandler(validPayload);

    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it('does not throw for invalid payload', async () => {
    await expect(communityPostCreatedHandler(null)).resolves.toBeUndefined();
  });
});

describe('communityArticleCreatedHandler', () => {
  const validPayload = {
    articleId: 'article-1',
    slug: 'maize-planting-webinar',
    title: 'Maize Planting Webinar',
    type: 'webinar',
    occurredAt: '2026-06-14T08:00:00Z',
  };

  it('broadcasts push to every registered token', async () => {
    mockGetAllTokens.mockResolvedValue([
      { userId: 'user-1', token: 'fcm-token-1' },
      { userId: 'user-2', token: 'fcm-token-2' },
    ]);

    await communityArticleCreatedHandler(validPayload);

    expect(mockSendPush).toHaveBeenCalledTimes(2);
    expect(mockLogDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'community.article.created', farmerId: 'user-1' }),
    );
    expect(mockLogDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'community.article.created', farmerId: 'user-2' }),
    );
  });

  it('sends nothing when there are no registered tokens', async () => {
    mockGetAllTokens.mockResolvedValue([]);

    await communityArticleCreatedHandler(validPayload);

    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it('does not throw for invalid payload', async () => {
    await expect(communityArticleCreatedHandler(null)).resolves.toBeUndefined();
    expect(mockGetAllTokens).not.toHaveBeenCalled();
  });
});

describe('govtRegistrationSubmittedHandler', () => {
  const validPayload = {
    registrationId: 'reg-1',
    farmerId: 'farmer-1',
    farmName: 'Wanjiru Farm',
    occurredAt: '2026-06-14T08:00:00Z',
  };

  it('sends push when FCM token exists', async () => {
    mockGetToken.mockResolvedValue('fcm-token-govt');

    await govtRegistrationSubmittedHandler(validPayload);

    expect(mockSendPush).toHaveBeenCalled();
    expect(mockLogDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'govt.registration.submitted', farmerId: 'farmer-1' }),
    );
  });

  it('skips push when no FCM token', async () => {
    mockGetToken.mockResolvedValue(null);

    await govtRegistrationSubmittedHandler(validPayload);

    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it('does not throw for invalid payload', async () => {
    await expect(govtRegistrationSubmittedHandler('bad')).resolves.toBeUndefined();
  });
});

describe('marketListingCreatedHandler', () => {
  const validPayload = {
    listingId: 'list-1',
    sellerId: 'seller-1',
    cropType: 'maize',
    pricePerKg: 45,
    occurredAt: '2026-06-14T08:00:00Z',
  };

  it('sends push when FCM token exists', async () => {
    mockGetToken.mockResolvedValue('fcm-token-market');

    await marketListingCreatedHandler(validPayload);

    expect(mockSendPush).toHaveBeenCalled();
  });

  it('skips push when no FCM token', async () => {
    mockGetToken.mockResolvedValue(null);

    await marketListingCreatedHandler(validPayload);

    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it('does not throw for invalid payload', async () => {
    await expect(marketListingCreatedHandler({})).resolves.toBeUndefined();
  });
});

describe('marketOrderPlacedHandler', () => {
  const validPayload = {
    orderId: 'order-1',
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    cropType: 'beans',
    totalKes: 4500,
    occurredAt: '2026-06-14T08:00:00Z',
  };

  it('notifies both seller and buyer when both have FCM tokens', async () => {
    mockGetToken
      .mockResolvedValueOnce('fcm-seller-token')
      .mockResolvedValueOnce('fcm-buyer-token');

    await marketOrderPlacedHandler(validPayload);

    expect(mockGetToken).toHaveBeenCalledTimes(2);
    expect(mockSendPush).toHaveBeenCalledTimes(2);
    expect(mockLogDelivery).toHaveBeenCalledTimes(2);
  });

  it('notifies buyer only when seller has no FCM token', async () => {
    mockGetToken
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('fcm-buyer-token');

    await marketOrderPlacedHandler(validPayload);

    expect(mockSendPush).toHaveBeenCalledTimes(1);
  });

  it('does not throw for invalid payload', async () => {
    await expect(marketOrderPlacedHandler(undefined)).resolves.toBeUndefined();
  });
});

describe('marketOrderUpdatedHandler', () => {
  const validPayload = {
    orderId: 'order-1',
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    status: 'confirmed',
    occurredAt: '2026-06-14T08:00:00Z',
  };

  it('sends push to buyer when FCM token exists', async () => {
    mockGetToken.mockResolvedValue('fcm-buyer-token');

    await marketOrderUpdatedHandler(validPayload);

    expect(mockSendPush).toHaveBeenCalled();
    expect(mockLogDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'market.order.updated', farmerId: 'buyer-1' }),
    );
  });

  it('skips push when no FCM token', async () => {
    mockGetToken.mockResolvedValue(null);

    await marketOrderUpdatedHandler(validPayload);

    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it('does not throw for invalid payload', async () => {
    await expect(marketOrderUpdatedHandler(42)).resolves.toBeUndefined();
  });
});

describe('userRegisteredHandler', () => {
  const validPayload = {
    userId: 'user-1',
    phone: '+254700000001',
    fullName: 'Wanjiru Kamau',
    county: 'Meru',
    occurredAt: '2026-06-14T08:00:00Z',
  };

  it('sends push when FCM token exists', async () => {
    mockGetToken.mockResolvedValue('fcm-token-user');

    await userRegisteredHandler(validPayload);

    expect(mockSendPush).toHaveBeenCalled();
    expect(mockLogDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'user.registered', farmerId: 'user-1' }),
    );
  });

  it('skips push when no FCM token', async () => {
    mockGetToken.mockResolvedValue(null);

    await userRegisteredHandler(validPayload);

    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it('does not throw for invalid payload', async () => {
    await expect(userRegisteredHandler([])).resolves.toBeUndefined();
  });
});

describe('weatherAlertIssuedHandler', () => {
  const validPayload = {
    alertId: 'alert-1',
    county: 'Meru',
    severity: 'high',
    description: 'Flash floods expected in low-lying areas',
    occurredAt: '2026-06-14T08:00:00Z',
  };

  it('processes valid alert without sending push (broadcast — no per-user token)', async () => {
    await weatherAlertIssuedHandler(validPayload);

    expect(mockGetToken).not.toHaveBeenCalled();
    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it('does not throw for invalid payload', async () => {
    await expect(weatherAlertIssuedHandler(null)).resolves.toBeUndefined();
  });
});

describe('notificationSendHandler', () => {
  it('sends push when channel is push and FCM token available from getToken', async () => {
    mockGetToken.mockResolvedValue('fcm-token-direct');

    const payload = {
      userId: 'user-1',
      title: 'Test',
      body: 'Hello farmer',
      channel: 'push',
      occurredAt: '2026-06-14T08:00:00Z',
    };

    await notificationSendHandler(payload);

    expect(mockSendPush).toHaveBeenCalledWith('fcm-token-direct', 'Test', 'Hello farmer');
    expect(mockLogDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'notification.send', channel: 'push' }),
    );
  });

  it('uses provided fcmToken if given', async () => {
    const payload = {
      userId: 'user-1',
      title: 'Test',
      body: 'Hello',
      channel: 'push',
      fcmToken: 'inline-fcm-token',
    };

    await notificationSendHandler(payload);

    expect(mockGetToken).not.toHaveBeenCalled();
    expect(mockSendPush).toHaveBeenCalledWith('inline-fcm-token', 'Test', 'Hello');
  });

  it('sends SMS when channel is sms', async () => {
    const payload = {
      userId: 'user-1',
      title: 'Test',
      body: 'SMS message',
      channel: 'sms',
      phone: '+254700000001',
    };

    await notificationSendHandler(payload);

    expect(mockSendSms).toHaveBeenCalledWith('+254700000001', 'SMS message');
    expect(mockSendPush).not.toHaveBeenCalled();
    expect(mockLogDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'sms' }),
    );
  });

  it('skips SMS when channel is sms but no phone provided', async () => {
    const payload = {
      userId: 'user-1',
      title: 'Test',
      body: 'SMS message',
      channel: 'sms',
    };

    await notificationSendHandler(payload);

    expect(mockSendSms).not.toHaveBeenCalled();
  });

  it('skips push when no FCM token found', async () => {
    mockGetToken.mockResolvedValue(null);

    const payload = {
      userId: 'user-1',
      title: 'Test',
      body: 'Hello',
      channel: 'push',
    };

    await notificationSendHandler(payload);

    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it('does not throw for invalid payload', async () => {
    await expect(notificationSendHandler('bad-payload')).resolves.toBeUndefined();
  });
});
