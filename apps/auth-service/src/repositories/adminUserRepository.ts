import { prisma } from '@agroconnect/db/auth';
import type { UserRole, KycStatus, Language, UserStatus } from './userRepository.js';

export interface AdminUserFilter {
  role?: UserRole;
  county?: string;
  subCounty?: string;
  kycStatus?: KycStatus;
  status?: UserStatus;
}

const ADMIN_USER_SELECT = {
  id: true,
  phone: true,
  email: true,
  fullName: true,
  role: true,
  county: true,
  subCounty: true,
  language: true,
  status: true,
  isSuperAdmin: true,
  staffRole: true,
  partnerBankId: true,
  kycStatus: true,
  lastLoginAt: true,
  createdAt: true,
  createdByUserId: true,
  verifiedByUserId: true,
  verifiedAt: true,
  supervisorId: true,
} as const;

export interface AdminPagination {
  take: number;
  skip: number;
}

function whereFromFilter(filter: AdminUserFilter) {
  return {
    ...(filter.role !== undefined ? { role: filter.role } : {}),
    ...(filter.county !== undefined ? { county: filter.county } : {}),
    ...(filter.subCounty !== undefined ? { subCounty: filter.subCounty } : {}),
    ...(filter.kycStatus !== undefined ? { kycStatus: filter.kycStatus } : {}),
    ...(filter.status !== undefined ? { status: filter.status } : {}),
  };
}

export async function adminListUsers(filter: AdminUserFilter, pagination: AdminPagination) {
  return prisma.user.findMany({
    where: whereFromFilter(filter),
    select: ADMIN_USER_SELECT,
    orderBy: { createdAt: 'desc' },
    take: pagination.take,
    skip: pagination.skip,
  });
}

export async function adminGetUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: ADMIN_USER_SELECT,
  });
}

export async function adminCountUsers(filter: AdminUserFilter) {
  return prisma.user.count({ where: whereFromFilter(filter) });
}

export async function adminCountFarmers() {
  return prisma.user.count({ where: { role: 'farmer' } });
}

export async function adminCountUsersByKycStatus(kycStatus: KycStatus) {
  return prisma.user.count({ where: { kycStatus } });
}

export async function adminKycStatusBreakdown() {
  const rows = await prisma.user.groupBy({
    by: ['kycStatus'],
    where: { role: 'farmer' },
    _count: { _all: true },
  });
  return rows.map((r) => ({ kycStatus: r.kycStatus, count: r._count._all }));
}

export async function adminFarmerRegistrationsSince(sinceDate: Date) {
  return prisma.user.findMany({
    where: { role: 'farmer', createdAt: { gte: sinceDate } },
    select: { createdAt: true },
  });
}

export async function adminFarmersByCounty() {
  const rows = await prisma.user.groupBy({
    by: ['county'],
    where: { role: 'farmer' },
    _count: { _all: true },
  });
  return rows.map((r) => ({ county: r.county ?? 'Unknown', count: r._count._all }));
}

export async function adminSetUserStatus(id: string, status: UserStatus) {
  return prisma.user.update({ where: { id }, data: { status } });
}

export class SelfVerificationError extends Error {}
export class SupervisorApprovalRequiredError extends Error {}
export class InvalidVerificationStateError extends Error {}

/**
 * Maker-checker enforcement: the admin/staff user that created an account can never
 * be the one who verifies it. If the account was created by a field agent
 * (extension_officer/vet_officer), only that field agent's own supervisor may verify
 * it — any other checker (other than a super admin) is rejected.
 */
export async function adminVerifyUser(targetId: string, verifierId: string) {
  const [target, verifier] = await Promise.all([
    prisma.user.findUnique({ where: { id: targetId } }),
    prisma.user.findUnique({ where: { id: verifierId } }),
  ]);
  if (!target) throw new Error('USER_NOT_FOUND');
  if (!verifier) throw new Error('VERIFIER_NOT_FOUND');

  if (target.status !== 'pending_verification') {
    throw new InvalidVerificationStateError(target.status);
  }

  if (target.createdByUserId && target.createdByUserId === verifierId) {
    throw new SelfVerificationError();
  }

  if (!verifier.isSuperAdmin && target.createdByUserId) {
    const creator = await prisma.user.findUnique({ where: { id: target.createdByUserId } });
    const creatorIsFieldAgent = creator?.role === 'extension_officer' || creator?.role === 'vet_officer';
    if (creatorIsFieldAgent && creator?.supervisorId !== verifierId) {
      throw new SupervisorApprovalRequiredError();
    }
  }

  return prisma.user.update({
    where: { id: targetId },
    data: { status: 'verified', verifiedByUserId: verifierId, verifiedAt: new Date() },
    select: ADMIN_USER_SELECT,
  });
}

export interface AdminCreateUserParams {
  phone: string;
  email?: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  county?: string;
  subCounty?: string;
  language?: Language;
  isSuperAdmin?: boolean;
  staffRole?: 'admin' | 'county_admin' | 'moderator';
  partnerBankId?: string;
  createdByUserId?: string;
  supervisorId?: string;
}

// Every admin-created account starts pending_verification: a second, distinct
// admin/checker must call adminVerifyUser before the account can log in.
export async function adminCreateUser(params: AdminCreateUserParams) {
  return prisma.user.create({
    data: {
      ...params,
      status: 'pending_verification',
    },
    select: ADMIN_USER_SELECT,
  });
}

export interface AdminUpdateUserParams {
  fullName?: string;
  email?: string;
  county?: string;
  subCounty?: string;
  partnerBankId?: string;
  supervisorId?: string;
}

export async function adminUpdateUser(id: string, params: AdminUpdateUserParams) {
  return prisma.user.update({
    where: { id },
    data: params,
    select: ADMIN_USER_SELECT,
  });
}

export async function adminDeleteUser(id: string) {
  await prisma.session.deleteMany({ where: { userId: id } });
  return prisma.user.update({ where: { id }, data: { status: 'deleted' }, select: ADMIN_USER_SELECT });
}
