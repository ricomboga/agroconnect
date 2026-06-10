import { prisma } from '@agroconnect/db/farm';
import { CreateActivityDto } from '../schemas/createActivity.schema.js';
import { UpdateActivityDto } from '../schemas/updateActivity.schema.js';
import { PaginationParams } from '../types/index.js';

export interface ActivityFilter {
  from_date?: string;
  to_date?: string;
  status?: 'pending' | 'completed' | 'skipped';
}

export async function createActivity(farmId: string, dto: CreateActivityDto) {
  return prisma.activity.create({
    data: {
      farmId,
      plotId: dto.plotId,
      type: dto.type,
      title: dto.title,
      description: dto.description,
      scheduledDate: new Date(dto.scheduledDate),
      labourCostKes: dto.labourCostKes,
      notes: dto.notes,
    },
  });
}

export async function findActivitiesByFarm(
  farmId: string,
  filter: ActivityFilter,
  pagination: PaginationParams,
) {
  return prisma.activity.findMany({
    where: {
      farmId,
      ...(filter.status && { status: filter.status }),
      ...(filter.from_date && { scheduledDate: { gte: new Date(filter.from_date) } }),
      ...(filter.to_date && { scheduledDate: { lte: new Date(filter.to_date) } }),
    },
    take: pagination.take,
    skip: pagination.skip,
    orderBy: { scheduledDate: 'asc' },
  });
}

export async function countActivitiesByFarm(farmId: string, filter: ActivityFilter) {
  return prisma.activity.count({
    where: {
      farmId,
      ...(filter.status && { status: filter.status }),
      ...(filter.from_date && { scheduledDate: { gte: new Date(filter.from_date) } }),
      ...(filter.to_date && { scheduledDate: { lte: new Date(filter.to_date) } }),
    },
  });
}

export async function findActivityById(activityId: string, farmId: string) {
  return prisma.activity.findFirst({ where: { id: activityId, farmId } });
}

export async function updateActivity(activityId: string, farmId: string, dto: UpdateActivityDto) {
  return prisma.activity.updateMany({
    where: { id: activityId, farmId },
    data: {
      ...dto,
      ...(dto.scheduledDate && { scheduledDate: new Date(dto.scheduledDate) }),
      ...(dto.completedDate && { completedDate: new Date(dto.completedDate) }),
    },
  });
}
