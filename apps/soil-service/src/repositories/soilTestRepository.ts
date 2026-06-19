import { prisma } from '@agroconnect/db/soil';
import { CreateSoilTestDto } from '../schemas/createSoilTest.schema.js';
import { PaginationParams } from '../types/index.js';

export async function createSoilTest(
  farmId: string,
  farmerId: string,
  dto: CreateSoilTestDto,
) {
  return prisma.soilTest.create({
    data: {
      farmId,
      farmerId,
      plotId: dto.plotId,
      testedAt: new Date(dto.testedAt),
      ph: dto.ph,
      nitrogenPpm: dto.nitrogenPpm,
      phosphorusPpm: dto.phosphorusPpm,
      potassiumPpm: dto.potassiumPpm,
      organicMatterPct: dto.organicMatterPct,
      labName: dto.labName,
      notes: dto.notes,
    },
  });
}

export async function findSoilTests(
  farmId: string,
  farmerId: string | undefined,
  pagination: PaginationParams,
) {
  return prisma.soilTest.findMany({
    where: {
      farmId,
      ...(farmerId !== undefined ? { farmerId } : {}),
    },
    take: pagination.take,
    skip: pagination.skip,
    orderBy: { testedAt: 'desc' },
  });
}

export async function countSoilTests(farmId: string, farmerId: string | undefined) {
  return prisma.soilTest.count({
    where: {
      farmId,
      ...(farmerId !== undefined ? { farmerId } : {}),
    },
  });
}

export async function findRecentSoilTests(
  farmId: string,
  farmerId: string | undefined,
  limit: number,
) {
  return prisma.soilTest.findMany({
    where: {
      farmId,
      ...(farmerId !== undefined ? { farmerId } : {}),
    },
    take: limit,
    orderBy: { testedAt: 'desc' },
  });
}

export async function findLatestSoilTest(farmId: string, farmerId: string | undefined) {
  return prisma.soilTest.findFirst({
    where: {
      farmId,
      ...(farmerId !== undefined ? { farmerId } : {}),
    },
    orderBy: { testedAt: 'desc' },
  });
}
