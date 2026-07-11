import bcrypt from 'bcryptjs';
import {
  adminListUsers,
  adminGetUserById,
  adminCountUsers,
  adminCountFarmers,
  adminCountUsersByKycStatus,
  adminSetUserStatus,
  adminVerifyUser,
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
  SelfVerificationError,
  SupervisorApprovalRequiredError,
  InvalidVerificationStateError,
  type AdminUserFilter,
} from '../repositories/adminUserRepository.js';
import {
  createRole,
  createPermission,
  listRoles,
  listPermissions,
  attachPermissionToRole,
  detachPermissionFromRole,
  assignRoleToUser,
  revokeRoleFromUser,
  getUserRoles,
  getUserPermissionNames,
} from '../repositories/roleRepository.js';
import { findUserByPhone, type UserRole, type UserStatus } from '../repositories/userRepository.js';
import { findExpertsByCounty, upsertFarmerExpertAssignment } from '../repositories/expertRepository.js';
import { createError } from '../middleware/errorHandler.js';

const STAFF_ROLES: ReadonlyArray<UserRole> = ['admin', 'govt_officer'];

export interface ListUsersParams {
  role?: string;
  county?: string;
  kyc_status?: string;
  status?: string;
  page: number;
  page_size: number;
}

// The public API shape keeps the legacy is_active/is_verified booleans (derived from
// status) alongside the new `status` field so existing consumers don't break.
function toResponse(u: {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  role: string;
  county: string | null;
  subCounty: string | null;
  kycStatus: string;
  status: UserStatus;
  isSuperAdmin: boolean;
  staffRole: string;
  partnerBankId: string | null;
  createdAt: Date;
  createdByUserId?: string | null;
  verifiedByUserId?: string | null;
  verifiedAt?: Date | null;
  supervisorId?: string | null;
}) {
  const loginEligible = u.status === 'verified' || u.status === 'active';
  return {
    id: u.id,
    full_name: u.fullName,
    phone: u.phone,
    email: u.email ?? null,
    role: u.role,
    county: u.county ?? '',
    sub_county: u.subCounty ?? '',
    kyc_status: u.kycStatus,
    status: u.status,
    is_active: loginEligible,
    is_verified: loginEligible,
    is_super_admin: u.isSuperAdmin,
    staff_role: u.staffRole,
    partner_bank_id: u.partnerBankId ?? null,
    created_at: u.createdAt,
    created_by_user_id: u.createdByUserId ?? null,
    verified_by_user_id: u.verifiedByUserId ?? null,
    verified_at: u.verifiedAt ?? null,
    supervisor_id: u.supervisorId ?? null,
  };
}

export async function listUsers(params: ListUsersParams) {
  const filter: AdminUserFilter = {
    role: params.role as AdminUserFilter['role'],
    county: params.county,
    kycStatus: params.kyc_status as AdminUserFilter['kycStatus'],
    status: params.status as AdminUserFilter['status'],
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
  const data = rows.map(toResponse);
  return { data, meta: { total, total_pages, page: params.page, page_size: params.page_size } };
}

export async function getUser(id: string) {
  const u = await adminGetUserById(id);
  if (!u) throw createError('User not found', 404, 'USER_NOT_FOUND', 'error.user_not_found');
  return toResponse(u);
}

export interface CreateUserParams {
  phone: string;
  email?: string;
  password: string;
  fullName: string;
  role: string;
  county?: string;
  subCounty?: string;
  language?: string;
  isSuperAdmin?: boolean;
  staffRole?: string;
  partnerBankId?: string;
  supervisorId?: string;
  createdByUserId: string;
}

// Every user created through the admin path starts pending_verification. A different
// admin (never the creator) must call verifyUser() before the account can log in —
// see adminVerifyUser for the maker-checker + supervisor enforcement.
export async function createUser(params: CreateUserParams) {
  const existing = await findUserByPhone(params.phone);
  if (existing) throw createError('Phone already registered', 409, 'PHONE_TAKEN', 'error.phone_taken');

  const rounds = parseInt(process.env['BCRYPT_ROUNDS'] ?? '10', 10);
  const passwordHash = await bcrypt.hash(params.password, rounds);

  const u = await adminCreateUser({
    phone: params.phone,
    email: params.email,
    passwordHash,
    fullName: params.fullName,
    role: params.role as UserRole,
    county: params.county,
    subCounty: params.subCounty,
    language: params.language as 'sw' | 'en' | undefined,
    isSuperAdmin: params.isSuperAdmin,
    staffRole: params.staffRole as 'admin' | 'county_admin' | 'moderator' | undefined,
    partnerBankId: params.partnerBankId,
    supervisorId: params.supervisorId,
    createdByUserId: params.createdByUserId,
  });
  return toResponse(u);
}

export interface CreateSystemUserParams {
  phone: string;
  email?: string;
  password: string;
  fullName: string;
  role: 'admin' | 'govt_officer';
  staffRole: 'admin' | 'county_admin' | 'moderator';
  isSuperAdmin?: boolean;
  county?: string;
  language?: string;
  createdByUserId: string;
  roleIds?: string[];
}

// Dedicated entry point for provisioning admin/system (staff) accounts, as opposed to
// end-user accounts (farmers, buyers, etc). Also assigns any fine-grained roles passed in.
export async function createSystemUser(params: CreateSystemUserParams) {
  if (!STAFF_ROLES.includes(params.role)) {
    throw createError('role must be a staff role', 400, 'INVALID_ROLE', 'error.role.invalid');
  }
  const user = await createUser(params);
  for (const roleId of params.roleIds ?? []) {
    await assignRoleToUser(user.id, roleId, params.createdByUserId);
  }
  return user;
}

export interface UpdateUserParams {
  fullName?: string;
  email?: string;
  county?: string;
  subCounty?: string;
  partnerBankId?: string;
  supervisorId?: string;
}

export async function updateUser(id: string, params: UpdateUserParams) {
  try {
    const u = await adminUpdateUser(id, params);
    return toResponse(u);
  } catch {
    throw createError('User not found', 404, 'USER_NOT_FOUND', 'error.user_not_found');
  }
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

export async function setUserStatus(id: string, status: UserStatus) {
  try {
    await adminSetUserStatus(id, status);
  } catch {
    throw createError('User not found', 404, 'USER_NOT_FOUND', 'error.user_not_found');
  }
}

export async function verifyUser(id: string, verifierId: string) {
  try {
    await adminVerifyUser(id, verifierId);
  } catch (err) {
    if (err instanceof SelfVerificationError) {
      throw createError(
        'The admin who created this account cannot verify it — a different admin must approve it',
        403,
        'SELF_VERIFICATION_FORBIDDEN',
        'error.user.self_verification_forbidden',
      );
    }
    if (err instanceof SupervisorApprovalRequiredError) {
      throw createError(
        'Only the creating field agent\'s supervisor can verify this account',
        403,
        'SUPERVISOR_APPROVAL_REQUIRED',
        'error.user.supervisor_approval_required',
      );
    }
    if (err instanceof InvalidVerificationStateError) {
      throw createError(
        'User is not awaiting verification',
        409,
        'INVALID_VERIFICATION_STATE',
        'error.user.invalid_verification_state',
      );
    }
    throw createError('User not found', 404, 'USER_NOT_FOUND', 'error.user_not_found');
  }
}

// --- Roles & permissions -------------------------------------------------

export async function createRoleDef(name: string, description?: string) {
  return createRole(name, description);
}

export async function createPermissionDef(name: string, description?: string) {
  return createPermission(name, description);
}

export async function listRoleDefs() {
  return listRoles();
}

export async function listPermissionDefs() {
  return listPermissions();
}

export async function grantPermissionToRole(roleId: string, permissionId: string) {
  return attachPermissionToRole(roleId, permissionId);
}

export async function revokePermissionFromRole(roleId: string, permissionId: string) {
  return detachPermissionFromRole(roleId, permissionId);
}

export async function assignRole(userId: string, roleId: string, assignedByUserId: string) {
  return assignRoleToUser(userId, roleId, assignedByUserId);
}

export async function unassignRole(userId: string, roleId: string) {
  return revokeRoleFromUser(userId, roleId);
}

export async function getRolesForUser(userId: string) {
  const assignments = await getUserRoles(userId);
  return assignments.map((a: (typeof assignments)[number]) => ({
    role_id: a.roleId,
    role_name: a.role.name,
    permissions: a.role.permissions.map((rp: (typeof a.role.permissions)[number]) => rp.permission.name),
    assigned_at: a.assignedAt,
  }));
}

export async function getPermissionsForUser(userId: string) {
  return getUserPermissionNames(userId);
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
