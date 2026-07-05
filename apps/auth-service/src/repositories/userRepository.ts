import { prisma } from '@agroconnect/db/auth';

export type UserRole =
  | 'farmer'
  | 'extension_officer'
  | 'vet_officer'
  | 'supplier'
  | 'buyer'
  | 'govt_officer'
  | 'admin'
  | 'lender'
  | 'farm_worker';

export type Language = 'sw' | 'en';

export type KycStatus = 'pending' | 'submitted' | 'verified' | 'rejected';

export interface CreateUserParams {
  phone: string;
  email?: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  county?: string;
  language?: Language;
}

export async function findUserByPhone(phone: string) {
  return prisma.user.findUnique({ where: { phone } });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function createUser(params: CreateUserParams) {
  return prisma.user.create({ data: params });
}

export async function updateUserLastLogin(id: string) {
  return prisma.user.update({
    where: { id },
    data: { lastLoginAt: new Date() },
  });
}

export async function updateKycStatus(id: string, status: KycStatus) {
  return prisma.user.update({ where: { id }, data: { kycStatus: status } });
}

export async function verifyUserPhone(id: string) {
  await prisma.user.update({ where: { id }, data: { isVerified: true } });
}

export interface UpdateProfileParams {
  fullName?: string;
  email?: string | null;
  county?: string;
  language?: Language;
}

export async function updateUserProfile(id: string, data: UpdateProfileParams) {
  return prisma.user.update({ where: { id }, data });
}

export async function updatePasswordHash(id: string, passwordHash: string) {
  return prisma.user.update({ where: { id }, data: { passwordHash } });
}

export async function findUsersByIds(ids: string[]) {
  return prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, fullName: true, phone: true },
  });
}
