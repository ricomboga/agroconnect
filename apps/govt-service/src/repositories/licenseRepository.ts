import { prisma } from '@agroconnect/db/govt';
import { CreateLicenseDto } from '../schemas/createLicense.schema.js';
import { UpdateLicenseStatusDto } from '../schemas/updateLicenseStatus.schema.js';
import { PaginationParams } from '../types/index.js';

export async function createLicense(farmerId: string, dto: CreateLicenseDto) {
  return prisma.licenseApplication.create({
    data: { farmerId, farmId: dto.farmId, licenseType: dto.licenseType, description: dto.description },
  });
}

export async function findLicensesByFarmer(farmerId: string, pagination: PaginationParams) {
  return prisma.licenseApplication.findMany({
    where: { farmerId },
    orderBy: { submittedAt: 'desc' },
    take: pagination.take,
    skip: pagination.skip,
  });
}

export async function countLicensesByFarmer(farmerId: string) {
  return prisma.licenseApplication.count({ where: { farmerId } });
}

export async function findLicenseById(id: string) {
  return prisma.licenseApplication.findUnique({ where: { id } });
}

export async function updateLicenseStatus(
  id: string,
  officerId: string,
  dto: UpdateLicenseStatusDto,
) {
  return prisma.licenseApplication.update({
    where: { id },
    data: { status: dto.status, notes: dto.notes, officerId },
  });
}
