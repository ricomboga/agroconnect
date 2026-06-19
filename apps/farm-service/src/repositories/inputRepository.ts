import { prisma, Prisma } from '@agroconnect/db/farm';
import { CreateInputDto } from '../schemas/createInput.schema.js';
import { PaginationParams } from '../types/index.js';

export interface InputFilter {
  type?: Prisma.InputWhereInput['type'];
  appliedDateRange?: { gte: Date; lte: Date };
}

export async function createInput(farmId: string, dto: CreateInputDto) {
  return prisma.input.create({
    data: {
      farmId,
      activityId: dto.activityId,
      type: dto.type,
      productName: dto.productName,
      supplierId: dto.supplierId,
      quantity: dto.quantity,
      unit: dto.unit,
      unitCostKes: dto.unitCostKes,
      totalCostKes: dto.totalCostKes,
      appliedDate: new Date(dto.appliedDate),
      notes: dto.notes,
    },
  });
}

export async function findInputsByFarm(
  farmId: string,
  filter: InputFilter,
  pagination: PaginationParams,
) {
  return prisma.input.findMany({
    where: {
      farmId,
      ...(filter.type !== undefined ? { type: filter.type } : {}),
      ...(filter.appliedDateRange ? { appliedDate: filter.appliedDateRange } : {}),
    },
    take: pagination.take,
    skip: pagination.skip,
    orderBy: { appliedDate: 'desc' },
  });
}

export async function countInputsByFarm(farmId: string, filter: InputFilter) {
  return prisma.input.count({
    where: {
      farmId,
      ...(filter.type !== undefined ? { type: filter.type } : {}),
      ...(filter.appliedDateRange ? { appliedDate: filter.appliedDateRange } : {}),
    },
  });
}
