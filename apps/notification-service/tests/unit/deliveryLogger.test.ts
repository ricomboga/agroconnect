import { logDelivery } from '../../src/deliveryLogger';

jest.mock('../../src/repositories/deliveryLogRepository', () => ({
  insertDeliveryLog: jest.fn(),
}));

import { insertDeliveryLog } from '../../src/repositories/deliveryLogRepository';

const mockInsertDeliveryLog = insertDeliveryLog as jest.MockedFunction<typeof insertDeliveryLog>;

beforeEach(() => jest.clearAllMocks());

describe('logDelivery', () => {
  it('inserts a delivery log record', async () => {
    mockInsertDeliveryLog.mockResolvedValue(undefined);

    await logDelivery({
      eventType: 'farm.created',
      farmerId: 'farmer-1',
      channel: 'push',
      status: 'sent',
    });

    expect(mockInsertDeliveryLog).toHaveBeenCalledWith({
      eventType: 'farm.created',
      farmerId: 'farmer-1',
      channel: 'push',
      status: 'sent',
    });
  });

  it('logs error but does not throw when insert fails', async () => {
    mockInsertDeliveryLog.mockRejectedValue(new Error('DB connection failed'));

    await expect(
      logDelivery({
        eventType: 'farm.created',
        farmerId: 'farmer-1',
        channel: 'push',
        status: 'failed',
      }),
    ).resolves.toBeUndefined();
  });

  it('handles sms channel', async () => {
    mockInsertDeliveryLog.mockResolvedValue(undefined);

    await logDelivery({
      eventType: 'finance.loan.applied',
      farmerId: 'farmer-2',
      channel: 'sms',
      status: 'sent',
    });

    expect(mockInsertDeliveryLog).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'sms', status: 'sent' }),
    );
  });
});
