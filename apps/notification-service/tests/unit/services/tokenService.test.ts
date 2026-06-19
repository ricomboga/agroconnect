import { getToken } from '../../../src/services/tokenService';

jest.mock('../../../src/repositories/fcmTokenRepository', () => ({
  findTokenByUserId: jest.fn(),
}));

import { findTokenByUserId } from '../../../src/repositories/fcmTokenRepository';

const mockFindTokenByUserId = findTokenByUserId as jest.MockedFunction<typeof findTokenByUserId>;

beforeEach(() => jest.clearAllMocks());

describe('tokenService.getToken', () => {
  it('returns FCM token when found for userId', async () => {
    mockFindTokenByUserId.mockResolvedValue('fcm-token-abc');

    const token = await getToken('user-1');

    expect(mockFindTokenByUserId).toHaveBeenCalledWith('user-1');
    expect(token).toBe('fcm-token-abc');
  });

  it('returns null when no token registered for userId', async () => {
    mockFindTokenByUserId.mockResolvedValue(null);

    const token = await getToken('user-no-token');

    expect(token).toBeNull();
  });
});
