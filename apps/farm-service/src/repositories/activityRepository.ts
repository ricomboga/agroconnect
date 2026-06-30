import { prisma } from '@agroconnect/db/farm';
import { CreateActivityDto } from '../schemas/createActivity.schema.js';
import { UpdateActivityDto } from '../schemas/updateActivity.schema.js';
import { PaginationParams } from '../types/index.js';

export interface ActivityFilter {
  from_date?: string;
  to_date?: string;
  status?: 'pending' | 'completed' | 'skipped';
}

function buildDateRangeWhere(filter: ActivityFilter) {
  const dateRange =
    filter.from_date || filter.to_date
      ? {
          scheduledDate: {
            ...(filter.from_date ? { gte: new Date(filter.from_date) } : {}),
            ...(filter.to_date ? { lte: new Date(filter.to_date) } : {}),
          },
        }
      : {};
  return {
    ...(filter.status ? { status: filter.status } : {}),
    ...dateRange,
  };
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
      scheduledTime: dto.scheduledTime,
      labourCostKes: dto.labourCostKes,
      notes: dto.notes,
      assignedToWorkerId: dto.assignedToWorkerId,
    },
  });
}

export async function findActivitiesByFarm(
  farmId: string,
  filter: ActivityFilter,
  pagination: PaginationParams,
) {
  return prisma.activity.findMany({
    where: { farmId, ...buildDateRangeWhere(filter) },
    take: pagination.take,
    skip: pagination.skip,
    orderBy: { scheduledDate: 'asc' },
  });
}

export async function countActivitiesByFarm(farmId: string, filter: ActivityFilter) {
  return prisma.activity.count({
    where: { farmId, ...buildDateRangeWhere(filter) },
  });
}

export async function findActivityById(activityId: string, farmId: string) {
  return prisma.activity.findFirst({ where: { id: activityId, farmId } });
}

export async function findActivityByIdWithPlot(activityId: string, farmId: string) {
  const activity = await prisma.activity.findFirst({ where: { id: activityId, farmId } });
  if (!activity) return null;

  let plotName: string | null = null;
  let cropName: string | null = null;
  if (activity.plotId) {
    const plot = await prisma.farmPlot.findUnique({ where: { id: activity.plotId } });
    plotName = plot?.name ?? null;
    cropName = plot?.currentCrop ?? null;
  }
  return { ...activity, plotName, cropName };
}

export async function updateActivity(activityId: string, farmId: string, dto: UpdateActivityDto) {
  const { scheduledDate, completedDate, ...rest } = dto;
  return prisma.activity.updateMany({
    where: { id: activityId, farmId },
    data: {
      ...rest,
      ...(scheduledDate ? { scheduledDate: new Date(scheduledDate) } : {}),
      ...(completedDate ? { completedDate: new Date(completedDate) } : {}),
    },
  });
}
