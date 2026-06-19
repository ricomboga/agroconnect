import * as authClient from '../../src/clients/authServiceClient';
import * as userService from '../../src/services/userService';

jest.mock('../../src/clients/authServiceClient', () => ({
  listUsers: jest.fn(),
  setUserStatus: jest.fn(),
  verifyUser: jest.fn(),
  getStats: jest.fn(),
}));

const mockListUsers = jest.mocked(authClient.listUsers);
const mockSetUserStatus = jest.mocked(authClient.setUserStatus);
const mockVerifyUser = jest.mocked(authClient.verifyUser);

const fakePage = {
  data: [
    {
      id: 'user-001',
      phone: '+254712345678',
      email: null,
      fullName: 'Jane Farmer',
      role: 'farmer',
      county: 'Nakuru',
      language: 'sw',
      isVerified: false,
      isActive: true,
      kycStatus: 'pending',
      lastLoginAt: null,
      createdAt: '2024-01-01T00:00:00Z',
    },
  ],
  meta: { total: 1, page: 1, page_size: 20 },
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('userService.listUsers', () => {
  it('delegates to authClient and returns result', async () => {
    mockListUsers.mockResolvedValue(fakePage);

    const result = await userService.listUsers({ page: 1, page_size: 20 });

    expect(mockListUsers).toHaveBeenCalledWith({ page: 1, page_size: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('passes filters to authClient', async () => {
    mockListUsers.mockResolvedValue({ ...fakePage, data: [] });

    await userService.listUsers({ role: 'farmer', county: 'Nakuru', page: 1, page_size: 20 });

    expect(mockListUsers).toHaveBeenCalledWith({
      role: 'farmer',
      county: 'Nakuru',
      page: 1,
      page_size: 20,
    });
  });
});

describe('userService.setUserStatus', () => {
  it('calls authClient.setUserStatus with correct args', async () => {
    mockSetUserStatus.mockResolvedValue(undefined);

    await userService.setUserStatus('user-001', false);

    expect(mockSetUserStatus).toHaveBeenCalledWith('user-001', false);
  });

  it('propagates errors from authClient', async () => {
    mockSetUserStatus.mockRejectedValue(new Error('auth-service down'));

    await expect(userService.setUserStatus('user-001', true)).rejects.toThrow('auth-service down');
  });
});

describe('userService.verifyUser', () => {
  it('calls authClient.verifyUser with the user id', async () => {
    mockVerifyUser.mockResolvedValue(undefined);

    await userService.verifyUser('user-001');

    expect(mockVerifyUser).toHaveBeenCalledWith('user-001');
  });

  it('propagates 404 errors', async () => {
    const err = new Error('not found') as Error & { statusCode: number };
    err.statusCode = 404;
    mockVerifyUser.mockRejectedValue(err);

    await expect(userService.verifyUser('nonexistent')).rejects.toMatchObject({ statusCode: 404 });
  });
});
