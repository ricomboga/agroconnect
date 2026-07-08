import { prisma, Prisma } from '@agroconnect/db/farm';
import { CreateInputDto } from '../schemas/createInput.schema.js';
import { UpdateInputDto } from '../schemas/updateInput.schema.js';
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

export async function findInputById(inputId: string, farmId: string) {
  return prisma.input.findFirst({ where: { id: inputId, farmId } });
}

export async function updateInput(inputId: string, farmId: string, dto: UpdateInputDto) {
  const { appliedDate, ...rest } = dto;
  return prisma.input.updateMany({
    where: { id: inputId, farmId },
    data: {
      ...rest,
      ...(appliedDate ? { appliedDate: new Date(appliedDate) } : {}),
    },
  });
}

export async function deleteInput(inputId: string, farmId: string) {
  return prisma.input.deleteMany({ where: { id: inputId, farmId } });
}
