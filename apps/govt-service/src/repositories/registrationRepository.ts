import { prisma } from '@agroconnect/db/govt';
import { CreateRegistrationDto } from '../schemas/createRegistration.schema.js';
import { UpdateRegistrationStatusDto } from '../schemas/updateRegistrationStatus.schema.js';
import { PaginationParams } from '../types/index.js';

export async function createRegistration(
  farmerId: string,
  dto: CreateRegistrationDto,
  registrationRef: string,
) {
  return prisma.farmRegistration.create({
    data: { ...dto, farmerId, registrationRef, status: 'submitted' },
  });
}

export async function findRegistrationsByFarmer(
  farmerId: string,
  pagination: PaginationParams,
) {
  return prisma.farmRegistration.findMany({
    where: { farmerId },
    orderBy: { submittedAt: 'desc' },
    take: pagination.take,
    skip: pagination.skip,
  });
}

export async function countRegistrationsByFarmer(farmerId: string) {
  return prisma.farmRegistration.count({ where: { farmerId } });
}

export async function findRegistrationById(id: string) {
  return prisma.farmRegistration.findUnique({
    where: { id },
    include: { documents: true },
  });
}

export async function updateRegistrationStatus(
  id: string,
  officerId: string,
  dto: UpdateRegistrationStatusDto,
) {
  return prisma.farmRegistration.update({
    where: { id },
    data: { status: dto.status, notes: dto.notes, officerId },
  });
}
