import * as authClient from '../../src/clients/authServiceClient';
import * as auditService from '../../src/services/auditService';
import * as userService from '../../src/services/userService';
import type { Requester } from '../../src/services/userService';

jest.mock('../../src/clients/authServiceClient', () => ({
  listUsers: jest.fn(),
  getUser: jest.fn(),
  createUser: jest.fn(),
  createSystemUser: jest.fn(),
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
const mockCreateSystemUser = jest.mocked(authClient.createSystemUser);
const mockSetUserStatus = jest.mocked(authClient.setUserStatus);
const mockVerifyUser = jest.mocked(authClient.verifyUser);
const mockAuditRecord = jest.mocked(auditService.record);

const requesterAdmin: Requester = { actor: 'admin-1', staffRole: 'admin' };
const requesterSuperAdmin: Requester = { actor: 'super-1', isSuperAdmin: true };
const requesterModerator: Requester = { actor: 'mod-1', staffRole: 'moderator' };
const requesterCountyAdmin: Requester = { actor: 'county-1', staffRole: 'county_admin', county: 'Kitui' };

function fakeUserRow(overrides: Partial<authClient.UserRow> = {}): authClient.UserRow {
  return {
    id: 'user-001',
    phone: '+254712345678',
    email: null,
    fullName: 'Jane Farmer',
    role: 'farmer',
    county: 'Nakuru',
    language: 'sw',
    status: 'active',
    isVerified: true,
    isActive: true,
    kycStatus: 'verified',
    lastLoginAt: null,
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

const fakePage = {
  data: [fakeUserRow({ status: 'pending_verification', isVerified: false, isActive: false, kycStatus: 'pending' })],
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

  it('requires super admin for admin-role accounts and records an audit entry on success', async () => {
    mockCreateUser.mockResolvedValue(
      fakeUserRow({ id: 'user-002', phone: dto.phone, fullName: dto.fullName, role: 'admin', county: null, status: 'pending_verification' }),
    );

    const result = await userService.createUser(dto, requesterSuperAdmin);

    expect(mockCreateUser).toHaveBeenCalledWith({ ...dto, createdByUserId: 'super-1' });
    expect(mockAuditRecord).toHaveBeenCalledWith(
      expect.objectContaining({ actor: 'super-1', action: 'create_user', category: 'user' }),
    );
    expect(result.id).toBe('user-002');
  });

  it('rejects a non-super-admin creating an admin account', async () => {
    await expect(userService.createUser(dto, requesterAdmin)).rejects.toMatchObject({ statusCode: 403 });
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('allows a non-super-admin (with manage_users capability) to create a non-admin account', async () => {
    const farmerDto = { phone: '+254700000001', password: 'Agro1234', fullName: 'New Farmer', role: 'farmer' as const };
    mockCreateUser.mockResolvedValue(fakeUserRow({ role: 'farmer', status: 'pending_verification' }));

    await userService.createUser(farmerDto, requesterAdmin);

    expect(mockCreateUser).toHaveBeenCalledWith({ ...farmerDto, createdByUserId: 'admin-1' });
  });
});

describe('userService.createSystemUser', () => {
  const dto = {
    phone: '+254700000002',
    password: 'Agro1234',
    fullName: 'New County Admin',
    role: 'admin' as const,
    staffRole: 'county_admin' as const,
  };

  it('requires super admin', async () => {
    await expect(userService.createSystemUser(dto, requesterAdmin)).rejects.toMatchObject({ statusCode: 403 });
    expect(mockCreateSystemUser).not.toHaveBeenCalled();
  });

  it('delegates to authClient.createSystemUser and records an audit entry', async () => {
    mockCreateSystemUser.mockResolvedValue(fakeUserRow({ role: 'admin', staff_role: 'county_admin', status: 'pending_verification' }));

    const result = await userService.createSystemUser(dto, requesterSuperAdmin);

    expect(mockCreateSystemUser).toHaveBeenCalledWith({ ...dto, createdByUserId: 'super-1' });
    expect(mockAuditRecord).toHaveBeenCalledWith(
      expect.objectContaining({ actor: 'super-1', action: 'create_system_user', category: 'user' }),
    );
    expect(result.role).toBe('admin');
  });
});

describe('userService.setUserStatus', () => {
  it('calls authClient.setUserStatus with correct args for a non-admin target', async () => {
    mockGetUser.mockResolvedValue(fakeUserRow());
    mockSetUserStatus.mockResolvedValue(undefined);

    await userService.setUserStatus('user-001', 'inactive', requesterAdmin);

    expect(mockSetUserStatus).toHaveBeenCalledWith('user-001', 'inactive');
  });

  it('requires super admin when the target is an admin account', async () => {
    mockGetUser.mockResolvedValue(fakeUserRow({ id: 'user-003', role: 'admin' }));

    await expect(userService.setUserStatus('user-003', 'inactive', requesterAdmin)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mockSetUserStatus).not.toHaveBeenCalled();
  });

  it('rejects a moderator outright (no manage_users capability)', async () => {
    await expect(userService.setUserStatus('user-001', 'inactive', requesterModerator)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('propagates errors from authClient', async () => {
    mockGetUser.mockResolvedValue(fakeUserRow());
    mockSetUserStatus.mockRejectedValue(new Error('auth-service down'));

    await expect(userService.setUserStatus('user-001', 'active', requesterAdmin)).rejects.toThrow('auth-service down');
  });
});

describe('userService.verifyUser', () => {
  it('calls authClient.verifyUser with the user id and requester as verifier', async () => {
    mockVerifyUser.mockResolvedValue(undefined);

    await userService.verifyUser('user-001', requesterAdmin);

    expect(mockVerifyUser).toHaveBeenCalledWith('user-001', 'admin-1');
  });

  it('rejects a moderator', async () => {
    await expect(userService.verifyUser('user-001', requesterModerator)).rejects.toMatchObject({ statusCode: 403 });
    expect(mockVerifyUser).not.toHaveBeenCalled();
  });

  it('propagates 403 self-verification errors', async () => {
    const err = new Error('self verification forbidden') as Error & { statusCode: number; errorCode: string };
    err.statusCode = 403;
    err.errorCode = 'SELF_VERIFICATION_FORBIDDEN';
    mockVerifyUser.mockRejectedValue(err);

    await expect(userService.verifyUser('user-001', requesterAdmin)).rejects.toMatchObject({
      statusCode: 403,
      errorCode: 'SELF_VERIFICATION_FORBIDDEN',
    });
  });

  it('propagates 404 errors', async () => {
    const err = new Error('not found') as Error & { statusCode: number };
    err.statusCode = 404;
    mockVerifyUser.mockRejectedValue(err);

    await expect(userService.verifyUser('nonexistent', requesterAdmin)).rejects.toMatchObject({ statusCode: 404 });
  });
});
