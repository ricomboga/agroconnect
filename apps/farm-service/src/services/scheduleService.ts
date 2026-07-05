// PHASE_3: replace with trained crop-specific ML model
import { prisma } from '@agroconnect/db/farm';
import { logger } from '../logger.js';

type ActivityTypeValue =
  | 'planting'
  | 'irrigation'
  | 'fertilising'
  | 'pesticide'
  | 'harvesting'
  | 'weeding'
  | 'other';

interface ScheduleEntry {
  type: ActivityTypeValue;
  title: string;
  offsetDays: number;
}

const ACTIVITY_EMOJI: Record<string, string> = {
  irrigation:  '💧',
  pesticide:   '🌿',
  fertilising: '🌾',
  weeding:     '✂️',
  planting:    '🌱',
  harvesting:  '🌽',
  vaccination: '💉',
  deworming:   '💊',
  feeding:     '🐾',
  other:       '📋',
};

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function buildMaizeSchedule(crop: string, plotName: string): ScheduleEntry[] {
  const entries: ScheduleEntry[] = [
    { type: 'planting', title: `Plant ${crop} — ${plotName}`, offsetDays: 0 },
    { type: 'harvesting', title: `Harvest ${crop} — ${plotName}`, offsetDays: 105 },
    { type: 'weeding', title: `Weed ${crop} — ${plotName}`, offsetDays: 35 },
    { type: 'weeding', title: `Weed ${crop} — ${plotName}`, offsetDays: 63 },
    { type: 'fertilising', title: `Apply CAN — ${plotName}`, offsetDays: 42 },
    { type: 'fertilising', title: `Second fertiliser — ${plotName}`, offsetDays: 70 },
  ];
  for (let day = 5; day <= 60; day += 3) {
    entries.push({ type: 'irrigation', title: `Water ${crop} — ${plotName}`, offsetDays: day });
  }
  for (let day = 14; day <= 84; day += 14) {
    entries.push({ type: 'pesticide', title: `Spray fungicide — ${plotName}`, offsetDays: day });
  }
  return entries;
}

function buildCabbageSchedule(crop: string, plotName: string): ScheduleEntry[] {
  const entries: ScheduleEntry[] = [
    { type: 'planting', title: `Transplant ${crop} — ${plotName}`, offsetDays: 0 },
    { type: 'harvesting', title: `Harvest ${crop} — ${plotName}`, offsetDays: 90 },
    { type: 'weeding', title: `Weed ${crop} — ${plotName}`, offsetDays: 21 },
    { type: 'fertilising', title: `First fertiliser — ${plotName}`, offsetDays: 28 },
    { type: 'fertilising', title: `Second fertiliser — ${plotName}`, offsetDays: 56 },
  ];
  for (let day = 2; day <= 60; day += 2) {
    entries.push({ type: 'irrigation', title: `Water ${crop} — ${plotName}`, offsetDays: day });
  }
  for (let day = 7; day <= 70; day += 10) {
    entries.push({ type: 'pesticide', title: `Spray — ${plotName}`, offsetDays: day });
  }
  return entries;
}

function buildBeansSchedule(crop: string, plotName: string): ScheduleEntry[] {
  const entries: ScheduleEntry[] = [
    { type: 'planting', title: `Plant ${crop} — ${plotName}`, offsetDays: 0 },
    { type: 'harvesting', title: `Harvest ${crop} — ${plotName}`, offsetDays: 75 },
    { type: 'weeding', title: `Weed ${crop} — ${plotName}`, offsetDays: 42 },
    { type: 'fertilising', title: `First fertiliser — ${plotName}`, offsetDays: 30 },
  ];
  for (let day = 4; day <= 50; day += 5) {
    entries.push({ type: 'irrigation', title: `Water ${crop} — ${plotName}`, offsetDays: day });
  }
  return entries;
}

function buildOtherSchedule(crop: string, plotName: string): ScheduleEntry[] {
  const entries: ScheduleEntry[] = [
    { type: 'planting', title: `Plant ${crop} — ${plotName}`, offsetDays: 0 },
    { type: 'harvesting', title: `Harvest ${crop} — ${plotName}`, offsetDays: 90 },
  ];
  for (let day = 4; day <= 86; day += 4) {
    entries.push({ type: 'irrigation', title: `Water ${crop} — ${plotName}`, offsetDays: day });
  }
  return entries;
}

function getCropSchedule(
  crop: string,
  plotName: string,
): ScheduleEntry[] {
  const key = crop.trim().toLowerCase();
  if (key === 'maize') return buildMaizeSchedule(crop, plotName);
  if (key === 'cabbage') return buildCabbageSchedule(crop, plotName);
  if (key === 'beans') return buildBeansSchedule(crop, plotName);
  return buildOtherSchedule(crop, plotName);
}

export async function generateCropSchedule(
  farmId: string,
  plotId: string,
  plotName: string,
  crop: string,
  variety: string | undefined,
  plantingDate: Date,
): Promise<number> {
  const entries = getCropSchedule(crop, plotName);

  const data = entries.map((e) => ({
    farmId,
    plotId,
    type: e.type,
    title: variety ? e.title.replace(crop, `${crop} (${variety})`) : e.title,
    scheduledDate: addDays(plantingDate, e.offsetDays),
    status: 'pending' as const,
    labourCostKes: 0,
  }));

  const result = await prisma.activity.createMany({ data });
  return result.count;
}

export async function deleteFuturePendingActivities(
  farmId: string,
  plotId: string,
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.activity.deleteMany({
    where: {
      farmId,
      plotId,
      status: 'pending',
      scheduledDate: { gte: today },
    },
  });
}

export interface ScheduleFilter {
  status?: 'pending' | 'completed' | 'skipped';
  from_date?: string;
  to_date?: string;
  plotId?: string;
}

export interface ScheduledActivityDto {
  id: string;
  title: string;
  activityType: string;
  activityEmoji: string;
  status: 'overdue' | 'today' | 'this_week' | 'upcoming' | 'completed' | 'skipped';
  scheduledDate: string;
  completedDate: string | null;
  plotName: string | null;
  cropName: string | null;
  animalName: string | null;
  aiReason: string | null;
  assignedToWorkerId: string | null;
  assignedToWorkerName: string | null;
  daysLate: number | null;
  daysUntil: number | null;
}

async function batchFetchWorkerNames(userIds: string[]): Promise<Record<string, { fullName: string; phone: string }>> {
  if (userIds.length === 0) return {};
  const authUrl = process.env['AUTH_SERVICE_URL'];
  const serviceSecret = process.env['INTERNAL_SERVICE_SECRET'];
  if (!authUrl || !serviceSecret) return {};
  try {
    const res = await fetch(
      `${authUrl}/internal/admin/users/batch?ids=${userIds.join(',')}`,
      { headers: { 'x-service-token': serviceSecret } },
    );
    if (!res.ok) return {};
    const body = await res.json() as { data: Record<string, { fullName: string; phone: string }> };
    return body.data ?? {};
  } catch (err) {
    logger.warn({ err, context: 'batchFetchWorkerNames' }, 'Failed to fetch worker names from auth-service');
    return {};
  }
}

function computeActivityStatus(
  dbStatus: string,
  scheduledDate: Date,
  today: Date,
): { status: ScheduledActivityDto['status']; daysLate: number | null; daysUntil: number | null } {
  if (dbStatus === 'completed') return { status: 'completed', daysLate: null, daysUntil: null };
  if (dbStatus === 'skipped') return { status: 'skipped', daysLate: null, daysUntil: null };

  const sched = new Date(scheduledDate);
  sched.setHours(0, 0, 0, 0);
  const diffMs = sched.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { status: 'overdue', daysLate: Math.abs(diffDays), daysUntil: null };
  if (diffDays === 0) return { status: 'today', daysLate: null, daysUntil: 0 };
  if (diffDays <= 7) return { status: 'this_week', daysLate: null, daysUntil: diffDays };
  return { status: 'upcoming', daysLate: null, daysUntil: diffDays };
}

export async function getFarmSchedule(farmId: string, filter: ScheduleFilter) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scheduledDateFilter =
    filter.from_date || filter.to_date
      ? {
          scheduledDate: {
            ...(filter.from_date ? { gte: new Date(filter.from_date) } : {}),
            ...(filter.to_date ? { lte: new Date(filter.to_date) } : {}),
          },
        }
      : {};

  const where = {
    farmId,
    ...(filter.plotId ? { plotId: filter.plotId } : {}),
    ...(filter.status ? { status: filter.status } : {}),
    ...scheduledDateFilter,
  };

  const activities = await prisma.activity.findMany({
    where,
    orderBy: { scheduledDate: 'asc' },
  });

  // Batch-fetch plots
  const plotIds = [...new Set(activities.map((a) => a.plotId).filter((id): id is string => id != null))];
  const plots = plotIds.length > 0
    ? await prisma.farmPlot.findMany({ where: { id: { in: plotIds } } })
    : [];
  const plotMap = new Map(plots.map((p) => [p.id, p]));

  // Batch-fetch worker names from auth-service
  const workerIds = [...new Set(activities.map((a) => a.assignedToWorkerId).filter((id): id is string => id != null))];
  const workerProfiles = await batchFetchWorkerNames(workerIds);

  // Transform activities to ScheduledActivityDto
  const transformed: ScheduledActivityDto[] = activities.map((a) => {
    const plot = a.plotId ? plotMap.get(a.plotId) : null;
    const { status, daysLate, daysUntil } = computeActivityStatus(a.status, a.scheduledDate, today);

    // For non-plot activities (e.g. livestock vaccination), derive animalName from description
    const animalName = !a.plotId && a.description
      ? a.description.split('.')[0]?.trim() ?? null
      : null;

    return {
      id: a.id,
      title: a.title,
      activityType: a.type,
      activityEmoji: ACTIVITY_EMOJI[a.type] ?? '📋',
      status,
      scheduledDate: a.scheduledDate.toISOString(),
      completedDate: a.completedDate ? a.completedDate.toISOString() : null,
      plotName: plot?.name ?? null,
      cropName: plot?.currentCrop ?? null,
      animalName,
      aiReason: a.description ?? null,
      assignedToWorkerId: a.assignedToWorkerId ?? null,
      assignedToWorkerName: a.assignedToWorkerId
        ? (workerProfiles[a.assignedToWorkerId]?.fullName ?? null)
        : null,
      daysLate,
      daysUntil,
    };
  });

  if (filter.status) {
    return { data: transformed, grouped: null };
  }

  const overdue = transformed.filter((a) => a.status === 'overdue');
  const todayItems = transformed.filter((a) => a.status === 'today');
  const upcoming = transformed.filter((a) => a.status === 'this_week' || a.status === 'upcoming');
  const done = transformed.filter((a) => a.status === 'completed' || a.status === 'skipped');

  return {
    data: transformed,
    grouped: { overdue, today: todayItems, upcoming, done },
  };
}
