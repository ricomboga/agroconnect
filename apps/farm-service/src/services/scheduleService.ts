// PHASE_3: replace with trained crop-specific ML model
import { prisma } from '@agroconnect/db/farm';

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

  if (filter.status) {
    return { data: activities, grouped: null };
  }

  const overdue: typeof activities = [];
  const todayItems: typeof activities = [];
  const upcoming: typeof activities = [];
  const done: typeof activities = [];

  for (const a of activities) {
    if (a.status === 'completed' || a.status === 'skipped') {
      done.push(a);
    } else {
      const scheduled = new Date(a.scheduledDate);
      scheduled.setHours(0, 0, 0, 0);
      const diff = scheduled.getTime() - today.getTime();
      if (diff < 0) overdue.push(a);
      else if (diff === 0) todayItems.push(a);
      else upcoming.push(a);
    }
  }

  return {
    data: activities,
    grouped: { overdue, today: todayItems, upcoming, done },
  };
}
