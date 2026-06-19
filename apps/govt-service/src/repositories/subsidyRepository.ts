import { prisma } from '@agroconnect/db/govt';
import { ApplySubsidyDto } from '../schemas/applySubsidy.schema.js';
import { PaginationParams } from '../types/index.js';

export async function findAllActivePrograms(pagination: PaginationParams) {
  return prisma.subsidyProgram.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    take: pagination.take,
    skip: pagination.skip,
  });
}

export async function countActivePrograms() {
  return prisma.subsidyProgram.count({ where: { isActive: true } });
}

export async function findProgramById(programId: string) {
  return prisma.subsidyProgram.findUnique({ where: { id: programId } });
}

export async function createApplication(
  farmerId: string,
  programId: string,
  dto: ApplySubsidyDto,
) {
  return prisma.subsidyApplication.create({
    data: { farmerId, programId, farmId: dto.farmId, notes: dto.notes },
    include: { program: true },
  });
}

export async function findApplicationsByFarmer(
  farmerId: string,
  pagination: PaginationParams,
) {
  return prisma.subsidyApplication.findMany({
    where: { farmerId },
    include: { program: true },
    orderBy: { submittedAt: 'desc' },
    take: pagination.take,
    skip: pagination.skip,
  });
}

export async function countApplicationsByFarmer(farmerId: string) {
  return prisma.subsidyApplication.count({ where: { farmerId } });
}

export async function findExistingApplication(farmerId: string, programId: string) {
  return prisma.subsidyApplication.findUnique({
    where: { farmerId_programId: { farmerId, programId } },
  });
}
