import { prisma } from '@agroconnect/db/auth';
import type { UserRole, KycStatus, Language } from './userRepository.js';

export interface AdminUserFilter {
  role?: UserRole;
  county?: string;
  kycStatus?: KycStatus;
  isActive?: boolean;
}

export interface AdminPagination {
  take: number;
  skip: number;
}

export async function adminListUsers(filter: AdminUserFilter, pagination: AdminPagination) {
  return prisma.user.findMany({
    where: {
      ...(filter.role !== undefined ? { role: filter.role } : {}),
      ...(filter.county !== undefined ? { county: filter.county } : {}),
      ...(filter.kycStatus !== undefined ? { kycStatus: filter.kycStatus } : {}),
      ...(filter.isActive !== undefined ? { isActive: filter.isActive } : {}),
    },
    select: {
      id: true,
      phone: true,
      email: true,
      fullName: true,
      role: true,
      county: true,
      language: true,
      isVerified: true,
      isActive: true,
      kycStatus: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: pagination.take,
    skip: pagination.skip,
  });
}

export async function adminCountUsers(filter: AdminUserFilter) {
  return prisma.user.count({
    where: {
      ...(filter.role !== undefined ? { role: filter.role } : {}),
      ...(filter.county !== undefined ? { county: filter.county } : {}),
      ...(filter.kycStatus !== undefined ? { kycStatus: filter.kycStatus } : {}),
      ...(filter.isActive !== undefined ? { isActive: filter.isActive } : {}),
    },
  });
}

export async function adminCountFarmers() {
  return prisma.user.count({ where: { role: 'farmer' } });
}

export async function adminSetUserActive(id: string, isActive: boolean) {
  return prisma.user.update({ where: { id }, data: { isActive } });
}

export async function adminVerifyUser(id: string) {
  return prisma.user.update({
    where: { id },
    data: { isVerified: true, kycStatus: 'verified' },
  });
}

export interface AdminCreateUserParams {
  phone: string;
  email?: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  county?: string;
  language?: Language;
}

export async function adminCreateUser(params: AdminCreateUserParams) {
  return prisma.user.create({
    data: {
      ...params,
      isVerified: true,
      isActive: true,
      kycStatus: 'verified',
    },
    select: {
      id: true, phone: true, email: true, fullName: true, role: true,
      county: true, language: true, isVerified: true, isActive: true,
      kycStatus: true, createdAt: true,
    },
  });
}

export async function adminDeleteUser(id: string) {
  await prisma.session.deleteMany({ where: { userId: id } });
  return prisma.user.delete({ where: { id } });
}
