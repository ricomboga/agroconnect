import { prisma } from '@agroconnect/db/govt';
import { CreateOfficerProfileDto } from '../schemas/createOfficerProfile.schema.js';
import { UpdateOfficerProfileDto } from '../schemas/updateOfficerProfile.schema.js';

export async function createOfficerProfile(dto: CreateOfficerProfileDto) {
  return prisma.govtOfficerProfile.create({ data: dto });
}

export async function findOfficerProfileById(id: string) {
  return prisma.govtOfficerProfile.findUnique({ where: { id } });
}

export async function findOfficerProfileByUserId(userId: string) {
  return prisma.govtOfficerProfile.findUnique({ where: { userId } });
}

export async function updateOfficerProfile(id: string, dto: UpdateOfficerProfileDto) {
  return prisma.govtOfficerProfile.update({ where: { id }, data: dto });
}

export async function findOfficerProfiles() {
  return prisma.govtOfficerProfile.findMany({ orderBy: { createdAt: 'desc' } });
}
