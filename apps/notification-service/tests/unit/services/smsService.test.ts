const mockSend = jest.fn();

jest.mock('africastalking', () =>
  jest.fn(() => ({
    SMS: { send: mockSend },
  })),
);

import { sendSms } from '../../../src/services/smsService';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('sendSms', () => {
  it('returns "sent" when Africa\'s Talking responds successfully', async () => {
    mockSend.mockResolvedValue({ SMSMessageData: { Recipients: [{ status: 'Success' }] } });

    const result = await sendSms('+254712345678', 'Test message');

    expect(result).toBe('sent');
    expect(mockSend).toHaveBeenCalledWith({ to: ['+254712345678'], message: 'Test message' });
  });

  it('returns "failed" when Africa\'s Talking throws', async () => {
    mockSend.mockRejectedValue(new Error('AT error'));

    const result = await sendSms('+254712345678', 'Test message');

    expect(result).toBe('failed');
  });

  it('does not throw even on fatal AT errors', async () => {
    mockSend.mockRejectedValue(new Error('network timeout'));

    await expect(sendSms('+254700000000', 'Msg')).resolves.toBe('failed');
  });
});
