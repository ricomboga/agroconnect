import * as adminUserRepo from '../../src/repositories/adminUserRepository';
import * as userRepo from '../../src/repositories/userRepository';
import * as adminUserService from '../../src/services/adminUserService';

jest.mock('../../src/repositories/adminUserRepository', () => ({
  adminGetUserById: jest.fn(),
  adminCreateUser: jest.fn(),
}));

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

const mockAdminGetUserById = jest.mocked(adminUserRepo.adminGetUserById);
const mockAdminCreateUser = jest.mocked(adminUserRepo.adminCreateUser);
const mockFindUserByPhone = jest.mocked(userRepo.findUserByPhone);

const fakeUser = {
  id: 'user-uuid-001',
  phone: '+254712345678',
  email: null,
  fullName: 'Jane Farmer',
  role: 'farmer' as const,
  county: 'Nakuru',
  language: 'sw' as const,
  isVerified: true,
  isActive: true,
  kycStatus: 'verified' as const,
  lastLoginAt: new Date('2026-06-01T00:00:00Z'),
  createdAt: new Date('2025-01-15T00:00:00Z'),
};

describe('adminUserService.getUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the mapped user when found', async () => {
    mockAdminGetUserById.mockResolvedValue(fakeUser);

    const result = await adminUserService.getUser('user-uuid-001');

    expect(mockAdminGetUserById).toHaveBeenCalledWith('user-uuid-001');
    expect(result).toEqual({
      id: 'user-uuid-001',
      full_name: 'Jane Farmer',
      phone: '+254712345678',
      email: null,
      role: 'farmer',
      county: 'Nakuru',
      kyc_status: 'verified',
      is_active: true,
      is_verified: true,
      partner_bank_id: null,
      created_at: fakeUser.createdAt,
    });
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

describe('adminUserService.createUser — verification defaults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindUserByPhone.mockResolvedValue(null);
    mockAdminCreateUser.mockResolvedValue(fakeUser);
  });

  it.each(['supplier', 'lender'] as const)(
    'creates %s accounts as unverified, pending manual KYC review',
    async (role) => {
      await adminUserService.createUser({
        phone: '+254712345678',
        password: 'Agro1234',
        fullName: 'Test Business',
        role,
      });

      expect(mockAdminCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({ isVerified: false, kycStatus: 'pending' }),
      );
    },
  );

  it.each(['farmer', 'vet_officer', 'govt_officer', 'buyer', 'farm_worker'] as const)(
    'creates %s accounts as verified immediately',
    async (role) => {
      await adminUserService.createUser({
        phone: '+254712345678',
        password: 'Agro1234',
        fullName: 'Test User',
        role,
      });

      expect(mockAdminCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({ isVerified: true, kycStatus: 'verified' }),
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
    });

    expect(mockAdminCreateUser).toHaveBeenCalledWith(expect.objectContaining({ staffRole: 'county_admin' }));
    expect(result.staff_role).toBe('county_admin');
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
