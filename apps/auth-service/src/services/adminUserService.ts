import bcrypt from 'bcryptjs';
import {
  adminListUsers,
  adminGetUserById,
  adminCountUsers,
  adminCountFarmers,
  adminCountUsersByKycStatus,
  adminSetUserActive,
  adminVerifyUser,
  adminCreateUser,
  adminDeleteUser,
  type AdminUserFilter,
} from '../repositories/adminUserRepository.js';
import { findUserByPhone, type UserRole } from '../repositories/userRepository.js';
import { findExpertsByCounty, upsertFarmerExpertAssignment } from '../repositories/expertRepository.js';
import { createError } from '../middleware/errorHandler.js';

// Suppliers and lenders/institutions represent real-world businesses and must pass
// a manual KYC review (see admin/kyc queue) before they're marked verified — unlike
// other roles created directly by an admin, which are trusted immediately.
const ROLES_REQUIRING_MANUAL_VERIFICATION: ReadonlyArray<UserRole> = ['supplier', 'lender'];

export interface ListUsersParams {
  role?: string;
  county?: string;
  kyc_status?: string;
  is_active?: boolean;
  page: number;
  page_size: number;
}

export async function listUsers(params: ListUsersParams) {
  const filter: AdminUserFilter = {
    role: params.role as AdminUserFilter['role'],
    county: params.county,
    kycStatus: params.kyc_status as AdminUserFilter['kycStatus'],
    isActive: params.is_active,
  };
  const pagination = {
    take: params.page_size,
    skip: (params.page - 1) * params.page_size,
  };
  const [rows, total] = await Promise.all([
    adminListUsers(filter, pagination),
    adminCountUsers(filter),
  ]);
  const total_pages = Math.ceil(total / params.page_size) || 1;
  const data = rows.map((u: (typeof rows)[number]) => ({
    id: u.id,
    full_name: u.fullName,
    phone: u.phone,
    email: u.email ?? null,
    role: u.role,
    county: u.county ?? '',
    kyc_status: u.kycStatus,
    is_active: u.isActive,
    is_verified: u.isVerified,
    is_super_admin: u.isSuperAdmin,
    staff_role: u.staffRole,
    partner_bank_id: u.partnerBankId ?? null,
    created_at: u.createdAt,
  }));
  return { data, meta: { total, total_pages, page: params.page, page_size: params.page_size } };
}

export async function getUser(id: string) {
  const u = await adminGetUserById(id);
  if (!u) throw createError('User not found', 404, 'USER_NOT_FOUND', 'error.user_not_found');
  return {
    id: u.id,
    full_name: u.fullName,
    phone: u.phone,
    email: u.email ?? null,
    role: u.role,
    county: u.county ?? '',
    kyc_status: u.kycStatus,
    is_active: u.isActive,
    is_verified: u.isVerified,
    is_super_admin: u.isSuperAdmin,
    staff_role: u.staffRole,
    partner_bank_id: u.partnerBankId ?? null,
    created_at: u.createdAt,
  };
}

export interface CreateUserParams {
  phone: string;
  email?: string;
  password: string;
  fullName: string;
  role: string;
  county?: string;
  language?: string;
  isSuperAdmin?: boolean;
  staffRole?: string;
}

export async function createUser(params: CreateUserParams) {
  const existing = await findUserByPhone(params.phone);
  if (existing) throw createError('Phone already registered', 409, 'PHONE_TAKEN', 'error.phone_taken');

  const rounds = parseInt(process.env['BCRYPT_ROUNDS'] ?? '10', 10);
  const passwordHash = await bcrypt.hash(params.password, rounds);

  const needsManualVerification = ROLES_REQUIRING_MANUAL_VERIFICATION.includes(params.role as UserRole);

  const u = await adminCreateUser({
    phone: params.phone,
    email: params.email,
    passwordHash,
    fullName: params.fullName,
    role: params.role as UserRole,
    county: params.county,
    language: params.language as 'sw' | 'en' | undefined,
    isSuperAdmin: params.isSuperAdmin,
    staffRole: params.staffRole as 'admin' | 'county_admin' | 'moderator' | undefined,
    isVerified: !needsManualVerification,
    kycStatus: needsManualVerification ? 'pending' : 'verified',
  });
  return {
    id: u.id,
    full_name: u.fullName,
    phone: u.phone,
    email: u.email ?? null,
    role: u.role,
    county: u.county ?? '',
    kyc_status: u.kycStatus,
    is_active: u.isActive,
    is_verified: u.isVerified,
    is_super_admin: u.isSuperAdmin,
    staff_role: u.staffRole,
    created_at: u.createdAt,
  };
}

export async function deleteUser(id: string) {
  try {
    await adminDeleteUser(id);
  } catch {
    throw createError('User not found', 404, 'USER_NOT_FOUND', 'error.user_not_found');
  }
}

export async function getStats() {
  const [total_farmers, pending_kyc] = await Promise.all([
    adminCountFarmers(),
    adminCountUsersByKycStatus('pending'),
  ]);
  return { total_farmers, pending_kyc };
}

export async function setUserStatus(id: string, isActive: boolean) {
  try {
    await adminSetUserActive(id, isActive);
  } catch {
    throw createError('User not found', 404, 'USER_NOT_FOUND', 'error.user_not_found');
  }
}

export async function verifyUser(id: string) {
  try {
    await adminVerifyUser(id);
  } catch {
    throw createError('User not found', 404, 'USER_NOT_FOUND', 'error.user_not_found');
  }
}

interface ExpertSummary {
  id: string;
  full_name: string;
  county: string;
  type: string;
  specialisations: string[];
  counties_served: string[];
  rating_avg: number;
  rating_count: number;
  current_farmers: number;
  max_farmers: number;
}

export async function listExperts(county?: string) {
  const experts = await findExpertsByCounty(county);
  return experts
    .map((e: (typeof experts)[number]): ExpertSummary => ({
      id: e.userId,
      full_name: e.user?.fullName ?? '',
      county: e.user?.county ?? '',
      type: e.type,
      specialisations: (e.specialisations as string[] | null) ?? [],
      counties_served: (e.countiesServed as string[] | null) ?? [],
      rating_avg: Number(e.ratingAvg),
      rating_count: e.ratingCount,
      current_farmers: e.currentFarmers,
      max_farmers: e.maxFarmers,
    }))
    .sort((a: ExpertSummary, b: ExpertSummary) => a.current_farmers / a.max_farmers - b.current_farmers / b.max_farmers);
}

export async function assignExpert(farmerId: string, expertId: string) {
  return upsertFarmerExpertAssignment(farmerId, expertId);
}
