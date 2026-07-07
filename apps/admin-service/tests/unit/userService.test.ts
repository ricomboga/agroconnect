import * as authClient from '../../src/clients/authServiceClient';
import * as auditService from '../../src/services/auditService';
import * as userService from '../../src/services/userService';
import type { Requester } from '../../src/services/userService';

jest.mock('../../src/clients/authServiceClient', () => ({
  listUsers: jest.fn(),
  getUser: jest.fn(),
  createUser: jest.fn(),
  setUserStatus: jest.fn(),
  verifyUser: jest.fn(),
  getStats: jest.fn(),
}));

jest.mock('../../src/services/auditService', () => ({
  record: jest.fn(),
}));

const mockListUsers = jest.mocked(authClient.listUsers);
const mockGetUser = jest.mocked(authClient.getUser);
const mockCreateUser = jest.mocked(authClient.createUser);
const mockSetUserStatus = jest.mocked(authClient.setUserStatus);
const mockVerifyUser = jest.mocked(authClient.verifyUser);
const mockAuditRecord = jest.mocked(auditService.record);

const requesterAdmin: Requester = { actor: 'admin-1', staffRole: 'admin' };
const requesterSuperAdmin: Requester = { actor: 'super-1', isSuperAdmin: true };
const requesterModerator: Requester = { actor: 'mod-1', staffRole: 'moderator' };
const requesterCountyAdmin: Requester = { actor: 'county-1', staffRole: 'county_admin', county: 'Kitui' };

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

    const result = await userService.listUsers({ page: 1, page_size: 20 }, requesterAdmin);

    expect(mockListUsers).toHaveBeenCalledWith({ page: 1, page_size: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('passes filters to authClient', async () => {
    mockListUsers.mockResolvedValue({ ...fakePage, data: [] });

    await userService.listUsers({ role: 'farmer', county: 'Nakuru', page: 1, page_size: 20 }, requesterAdmin);

    expect(mockListUsers).toHaveBeenCalledWith({
      role: 'farmer',
      county: 'Nakuru',
      page: 1,
      page_size: 20,
    });
  });

  it('rejects a moderator', async () => {
    await expect(userService.listUsers({ page: 1, page_size: 20 }, requesterModerator)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mockListUsers).not.toHaveBeenCalled();
  });

  it('forces the county filter to the county admin own county, ignoring any client-supplied value', async () => {
    mockListUsers.mockResolvedValue({ ...fakePage, data: [] });

    await userService.listUsers({ county: 'Nairobi', page: 1, page_size: 20 }, requesterCountyAdmin);

    expect(mockListUsers).toHaveBeenCalledWith(
      expect.objectContaining({ county: 'Kitui' }),
    );
  });

  it('does not force county for a super admin with staffRole county_admin', async () => {
    mockListUsers.mockResolvedValue({ ...fakePage, data: [] });

    await userService.listUsers(
      { county: 'Nairobi', page: 1, page_size: 20 },
      { ...requesterCountyAdmin, isSuperAdmin: true },
    );

    expect(mockListUsers).toHaveBeenCalledWith(expect.objectContaining({ county: 'Nairobi' }));
  });
});

describe('userService.createUser', () => {
  const dto = { phone: '+254700000000', password: 'Agro1234', fullName: 'New Admin', role: 'admin' as const };

  it('requires super admin and records an audit entry on success', async () => {
    mockCreateUser.mockResolvedValue({
      id: 'user-002',
      phone: dto.phone,
      email: null,
      fullName: dto.fullName,
      role: 'admin',
      county: null,
      language: 'sw',
      isVerified: true,
      isActive: true,
      kycStatus: 'verified',
      lastLoginAt: null,
      createdAt: '2026-01-01T00:00:00Z',
    });

    const result = await userService.createUser(dto, requesterSuperAdmin);

    expect(mockCreateUser).toHaveBeenCalledWith(dto);
    expect(mockAuditRecord).toHaveBeenCalledWith(
      expect.objectContaining({ actor: 'super-1', action: 'create_staff_user', category: 'user' }),
    );
    expect(result.id).toBe('user-002');
  });

  it('rejects a non-super-admin', async () => {
    await expect(userService.createUser(dto, requesterAdmin)).rejects.toMatchObject({ statusCode: 403 });
    expect(mockCreateUser).not.toHaveBeenCalled();
  });
});

describe('userService.setUserStatus', () => {
  it('calls authClient.setUserStatus with correct args for a non-admin target', async () => {
    mockGetUser.mockResolvedValue({
      id: 'user-001', phone: '+254712345678', email: null, fullName: 'Jane Farmer', role: 'farmer',
      county: 'Nakuru', language: 'sw', isVerified: true, isActive: true, kycStatus: 'verified',
      lastLoginAt: null, createdAt: '2024-01-01T00:00:00Z',
    });
    mockSetUserStatus.mockResolvedValue(undefined);

    await userService.setUserStatus('user-001', false, requesterAdmin);

    expect(mockSetUserStatus).toHaveBeenCalledWith('user-001', false);
  });

  it('requires super admin when the target is an admin account', async () => {
    mockGetUser.mockResolvedValue({
      id: 'user-003', phone: '+254712345000', email: null, fullName: 'Other Admin', role: 'admin',
      county: null, language: 'sw', isVerified: true, isActive: true, kycStatus: 'verified',
      lastLoginAt: null, createdAt: '2024-01-01T00:00:00Z',
    });

    await expect(userService.setUserStatus('user-003', false, requesterAdmin)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mockSetUserStatus).not.toHaveBeenCalled();
  });

  it('rejects a moderator outright (no manage_users capability)', async () => {
    await expect(userService.setUserStatus('user-001', false, requesterModerator)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('propagates errors from authClient', async () => {
    mockGetUser.mockResolvedValue({
      id: 'user-001', phone: '+254712345678', email: null, fullName: 'Jane Farmer', role: 'farmer',
      county: 'Nakuru', language: 'sw', isVerified: true, isActive: true, kycStatus: 'verified',
      lastLoginAt: null, createdAt: '2024-01-01T00:00:00Z',
    });
    mockSetUserStatus.mockRejectedValue(new Error('auth-service down'));

    await expect(userService.setUserStatus('user-001', true, requesterAdmin)).rejects.toThrow('auth-service down');
  });
});

describe('userService.verifyUser', () => {
  it('calls authClient.verifyUser with the user id', async () => {
    mockVerifyUser.mockResolvedValue(undefined);

    await userService.verifyUser('user-001', requesterAdmin);

    expect(mockVerifyUser).toHaveBeenCalledWith('user-001');
  });

  it('rejects a moderator', async () => {
    await expect(userService.verifyUser('user-001', requesterModerator)).rejects.toMatchObject({ statusCode: 403 });
    expect(mockVerifyUser).not.toHaveBeenCalled();
  });

  it('propagates 404 errors', async () => {
    const err = new Error('not found') as Error & { statusCode: number };
    err.statusCode = 404;
    mockVerifyUser.mockRejectedValue(err);

    await expect(userService.verifyUser('nonexistent', requesterAdmin)).rejects.toMatchObject({ statusCode: 404 });
  });
});
