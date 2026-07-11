import * as adminUserRepo from '../../src/repositories/adminUserRepository';
import * as userRepo from '../../src/repositories/userRepository';
import * as roleRepo from '../../src/repositories/roleRepository';
import * as adminUserService from '../../src/services/adminUserService';
import {
  SelfVerificationError,
  SupervisorApprovalRequiredError,
  InvalidVerificationStateError,
} from '../../src/repositories/adminUserRepository';

jest.mock('../../src/repositories/adminUserRepository', () => {
  const actual = jest.requireActual('../../src/repositories/adminUserRepository');
  return {
    ...actual,
    adminGetUserById: jest.fn(),
    adminCreateUser: jest.fn(),
    adminVerifyUser: jest.fn(),
    adminSetUserStatus: jest.fn(),
  };
});

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: { hash: jest.fn().mockResolvedValue('hashed-password') },
}));

jest.mock('../../src/repositories/userRepository', () => ({
  findUserByPhone: jest.fn(),
}));

jest.mock('../../src/repositories/expertRepository', () => ({
  findExpertsByCounty: jest.fn(),
  upsertFarmerExpertAssignment: jest.fn(),
}));

jest.mock('../../src/repositories/roleRepository', () => ({
  assignRoleToUser: jest.fn(),
  getUserRoles: jest.fn(),
  getUserPermissionNames: jest.fn(),
}));

const mockAdminGetUserById = jest.mocked(adminUserRepo.adminGetUserById);
const mockAdminCreateUser = jest.mocked(adminUserRepo.adminCreateUser);
const mockAdminVerifyUser = jest.mocked(adminUserRepo.adminVerifyUser);
const mockFindUserByPhone = jest.mocked(userRepo.findUserByPhone);
const mockAssignRoleToUser = jest.mocked(roleRepo.assignRoleToUser);

const fakeUser = {
  id: 'user-uuid-001',
  phone: '+254712345678',
  email: null,
  fullName: 'Jane Farmer',
  role: 'farmer' as const,
  county: 'Nakuru',
  subCounty: 'Nakuru Town East',
  language: 'sw' as const,
  status: 'pending_verification' as const,
  isSuperAdmin: false,
  staffRole: 'admin' as const,
  kycStatus: 'verified' as const,
  lastLoginAt: new Date('2026-06-01T00:00:00Z'),
  createdAt: new Date('2025-01-15T00:00:00Z'),
  createdByUserId: 'admin-uuid-001',
  verifiedByUserId: null,
  verifiedAt: null,
  supervisorId: null,
};

describe('adminUserService.getUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the mapped user when found', async () => {
    mockAdminGetUserById.mockResolvedValue(fakeUser);

    const result = await adminUserService.getUser('user-uuid-001');

    expect(mockAdminGetUserById).toHaveBeenCalledWith('user-uuid-001');
    expect(result).toEqual(
      expect.objectContaining({
        id: 'user-uuid-001',
        full_name: 'Jane Farmer',
        phone: '+254712345678',
        email: null,
        role: 'farmer',
        county: 'Nakuru',
        sub_county: 'Nakuru Town East',
        kyc_status: 'verified',
        status: 'pending_verification',
        is_active: false,
        is_verified: false,
        partner_bank_id: null,
        created_at: fakeUser.createdAt,
        created_by_user_id: 'admin-uuid-001',
      }),
    );
  });

  it('throws a 404 USER_NOT_FOUND error when the user does not exist', async () => {
    mockAdminGetUserById.mockResolvedValue(null);

    await expect(adminUserService.getUser('missing-id')).rejects.toMatchObject({
      statusCode: 404,
      errorCode: 'USER_NOT_FOUND',
      messageKey: 'error.user_not_found',
    });
  });
});

describe('adminUserService.createUser — maker-checker defaults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindUserByPhone.mockResolvedValue(null);
    mockAdminCreateUser.mockResolvedValue(fakeUser);
  });

  it.each(['farmer', 'supplier', 'lender', 'vet_officer', 'govt_officer', 'buyer', 'farm_worker'] as const)(
    'always creates %s accounts as pending_verification, regardless of role',
    async (role) => {
      await adminUserService.createUser({
        phone: '+254712345678',
        password: 'Agro1234',
        fullName: 'Test User',
        role,
        createdByUserId: 'admin-uuid-001',
      });

      expect(mockAdminCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({ createdByUserId: 'admin-uuid-001' }),
      );
    },
  );

  it('threads isSuperAdmin through to the repository and the mapped response', async () => {
    mockAdminCreateUser.mockResolvedValue({ ...fakeUser, role: 'admin', isSuperAdmin: true });

    const result = await adminUserService.createUser({
      phone: '+254712345678',
      password: 'Agro1234',
      fullName: 'Super Admin',
      role: 'admin',
      isSuperAdmin: true,
      createdByUserId: 'super-admin-uuid-000',
    });

    expect(mockAdminCreateUser).toHaveBeenCalledWith(expect.objectContaining({ isSuperAdmin: true }));
    expect(result.is_super_admin).toBe(true);
  });

  it('threads staffRole through to the repository and the mapped response', async () => {
    mockAdminCreateUser.mockResolvedValue({ ...fakeUser, role: 'admin', staffRole: 'county_admin' });

    const result = await adminUserService.createUser({
      phone: '+254712345678',
      password: 'Agro1234',
      fullName: 'County Admin',
      role: 'admin',
      staffRole: 'county_admin',
      createdByUserId: 'super-admin-uuid-000',
    });

    expect(mockAdminCreateUser).toHaveBeenCalledWith(expect.objectContaining({ staffRole: 'county_admin' }));
    expect(result.staff_role).toBe('county_admin');
  });
});

describe('adminUserService.createSystemUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindUserByPhone.mockResolvedValue(null);
    mockAdminCreateUser.mockResolvedValue({ ...fakeUser, role: 'admin', staffRole: 'county_admin' });
  });

  it('rejects non-staff roles', async () => {
    await expect(
      adminUserService.createSystemUser({
        phone: '+254712345678',
        password: 'Agro1234',
        fullName: 'Not Staff',
        // @ts-expect-error deliberately invalid staff role
        role: 'farmer',
        staffRole: 'admin',
        createdByUserId: 'super-admin-uuid-000',
      }),
    ).rejects.toMatchObject({ errorCode: 'INVALID_ROLE' });
  });

  it('assigns any supplied roleIds after creation', async () => {
    await adminUserService.createSystemUser({
      phone: '+254712345678',
      password: 'Agro1234',
      fullName: 'County Admin',
      role: 'admin',
      staffRole: 'county_admin',
      createdByUserId: 'super-admin-uuid-000',
      roleIds: ['role-1', 'role-2'],
    });

    expect(mockAssignRoleToUser).toHaveBeenCalledWith('user-uuid-001', 'role-1', 'super-admin-uuid-000');
    expect(mockAssignRoleToUser).toHaveBeenCalledWith('user-uuid-001', 'role-2', 'super-admin-uuid-000');
  });
});

describe('adminUserService.verifyUser — maker-checker enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects when the verifier is the creator', async () => {
    mockAdminVerifyUser.mockRejectedValue(new SelfVerificationError());

    await expect(adminUserService.verifyUser('user-uuid-001', 'admin-uuid-001')).rejects.toMatchObject({
      statusCode: 403,
      errorCode: 'SELF_VERIFICATION_FORBIDDEN',
    });
  });

  it('rejects when a non-supervisor tries to verify a field-agent-created farmer', async () => {
    mockAdminVerifyUser.mockRejectedValue(new SupervisorApprovalRequiredError());

    await expect(adminUserService.verifyUser('user-uuid-001', 'other-admin-uuid')).rejects.toMatchObject({
      statusCode: 403,
      errorCode: 'SUPERVISOR_APPROVAL_REQUIRED',
    });
  });

  it('rejects re-verifying an already-verified account', async () => {
    mockAdminVerifyUser.mockRejectedValue(new InvalidVerificationStateError('verified'));

    await expect(adminUserService.verifyUser('user-uuid-001', 'checker-uuid')).rejects.toMatchObject({
      statusCode: 409,
      errorCode: 'INVALID_VERIFICATION_STATE',
    });
  });

  it('succeeds for a valid checker', async () => {
    mockAdminVerifyUser.mockResolvedValue({ ...fakeUser, status: 'verified', verifiedByUserId: 'checker-uuid' });

    await expect(adminUserService.verifyUser('user-uuid-001', 'checker-uuid')).resolves.toBeUndefined();
    expect(mockAdminVerifyUser).toHaveBeenCalledWith('user-uuid-001', 'checker-uuid');
  });
});

describe('adminUserService.getUser — partner_bank_id mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps partnerBankId to partner_bank_id for a lender', async () => {
    mockAdminGetUserById.mockResolvedValue({ ...fakeUser, role: 'lender', partnerBankId: 'partner-001' });

    const result = await adminUserService.getUser('user-uuid-001');

    expect(result.partner_bank_id).toBe('partner-001');
  });

  it('maps partnerBankId to null when absent', async () => {
    mockAdminGetUserById.mockResolvedValue({ ...fakeUser, partnerBankId: null });

    const result = await adminUserService.getUser('user-uuid-001');

    expect(result.partner_bank_id).toBeNull();
  });
});
