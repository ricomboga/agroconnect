import { prisma } from '@agroconnect/db/farm';
import { findFarmsByOwner } from '../repositories/farmRepository.js';

const ACTIVITY_WINDOW_DAYS = 90;
const MAX_RECENT_ACTIVITIES = 5;
const MAX_HARVEST_ROWS = 20;

interface ActivityRow {
  title: string;
  status: string;
  scheduledDate: Date;
  completedDate: Date | null;
  labourCostKes: unknown;
}

interface HarvestRow {
  crop: string;
  quantityKg: unknown;
  harvestDate: Date;
  totalRevenueKes: unknown;
}

interface InventoryItemRow {
  name: string;
  category: string;
  unit: string;
  purchasedQty: unknown;
  usedQty: unknown;
  createdAt: Date;
}

interface MachineryRow {
  name: string;
  type: string;
  condition: string;
  acquiredAt: Date;
  disposedAt: Date | null;
}

interface PlotRow {
  name: string;
  areaAcres: unknown;
  currentCrop: string | null;
  currentCropPlantedAt: Date | null;
}

function toNum(v: unknown): number {
  return v === null || v === undefined ? 0 : Number(v);
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function todayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Consecutive-day streak of completed activities, walking backward from today.
 * Bounded to the activity window so a farmer with no gaps can't loop forever.
 */
function computeStreakDays(completedDates: Set<string>): number {
  let streak = 0;
  const cursor = todayMidnight();
  for (let i = 0; i < ACTIVITY_WINDOW_DAYS; i++) {
    if (!completedDates.has(toDateStr(cursor))) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/**
 * Assembles a lender-facing farmer report from real farm-service records —
 * the farmer's most recently created farm (with plots), a 90-day activity
 * completion summary, recent harvests, inventory as-at a given date, and
 * machinery/equipment not yet disposed of as-at that date. Returns null farm
 * fields when the farmer has no farm yet, rather than fabricating one.
 */
export async function getFarmerFarmReport(farmerId: string, asOfDateStr: string) {
  const asOfDate = new Date(`${asOfDateStr}T23:59:59.999Z`);
  const farms = await findFarmsByOwner(farmerId, { take: 1, skip: 0 });
  const farm = farms[0] ?? null;
  const farmIds = farm ? [farm.id] : [];

  const windowStart = todayMidnight();
  windowStart.setDate(windowStart.getDate() - ACTIVITY_WINDOW_DAYS);

  const [activities, harvests, inventoryItems, machinery]: [
    ActivityRow[],
    HarvestRow[],
    InventoryItemRow[],
    MachineryRow[],
  ] = await Promise.all([
    farmIds.length
      ? prisma.activity.findMany({
          where: { farmId: { in: farmIds }, scheduledDate: { gte: windowStart } },
          orderBy: { scheduledDate: 'desc' },
        })
      : Promise.resolve([]),
    farmIds.length
      ? prisma.harvest.findMany({
          where: { farmId: { in: farmIds } },
          orderBy: { harvestDate: 'desc' },
          take: MAX_HARVEST_ROWS,
        })
      : Promise.resolve([]),
    farmIds.length
      ? prisma.inventoryItem.findMany({
          where: { farmId: { in: farmIds }, createdAt: { lte: asOfDate } },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
    farmIds.length
      ? prisma.machinery.findMany({
          where: { farmId: { in: farmIds }, acquiredAt: { lte: asOfDate } },
          orderBy: { acquiredAt: 'desc' },
        })
      : Promise.resolve([]),
  ]);

  const today = todayMidnight();
  const completed = activities.filter((a: ActivityRow) => a.status === 'completed');
  const completedOnTime = completed.filter(
    (a: ActivityRow) => a.completedDate && a.completedDate <= a.scheduledDate,
  ).length;
  const overdueAtQuery = activities.filter(
    (a: ActivityRow) => a.status === 'pending' && a.scheduledDate < today,
  ).length;
  const completionRatePct = activities.length > 0 ? Math.round((completed.length / activities.length) * 100) : 0;

  const completedDates = new Set(
    completed.filter((a: ActivityRow) => a.completedDate).map((a: ActivityRow) => toDateStr(a.completedDate as Date)),
  );

  const recentCompleted = completed
    .filter((a: ActivityRow) => a.completedDate)
    .sort((a: ActivityRow, b: ActivityRow) => (b.completedDate as Date).getTime() - (a.completedDate as Date).getTime())
    .slice(0, MAX_RECENT_ACTIVITIES)
    .map((a: ActivityRow) => ({
      date: toDateStr(a.completedDate as Date),
      title: a.title,
      costKes: toNum(a.labourCostKes),
    }));

  const overdueActivities = activities
    .filter((a: ActivityRow) => a.status === 'pending' && a.scheduledDate < today)
    .map((a: ActivityRow) => {
      const daysOverdue = Math.floor((today.getTime() - a.scheduledDate.getTime()) / (1000 * 60 * 60 * 24));
      return `${a.title} — ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue`;
    });

  return {
    farm: farm
      ? {
          name: farm.name,
          areaAcres: toNum(farm.areaAcres),
          county: farm.county,
          subCounty: farm.subCounty,
          soilType: farm.soilType,
          waterSource: farm.waterSource,
          farmType: farm.farmType,
          locationLat: toNum(farm.locationLat),
          locationLng: toNum(farm.locationLng),
          plots: (farm.plots as PlotRow[]).map((p: PlotRow) => ({
            name: p.name,
            areaAcres: toNum(p.areaAcres),
            currentCrop: p.currentCrop,
            plantedAt: p.currentCropPlantedAt ? toDateStr(p.currentCropPlantedAt) : null,
          })),
        }
      : null,
    activitySummary: {
      totalActivitiesLast90Days: activities.length,
      completedOnTime,
      overdueAtQuery,
      completionRatePct,
      streakDays: computeStreakDays(completedDates),
      recentCompleted,
    },
    overdueActivities,
    harvestHistory: harvests.map((h: HarvestRow) => ({
      crop: h.crop,
      quantityKg: toNum(h.quantityKg),
      harvestDate: toDateStr(h.harvestDate),
      revenueKes: h.totalRevenueKes !== null ? toNum(h.totalRevenueKes) : null,
    })),
    inventory: inventoryItems.map((i: InventoryItemRow) => ({
      name: i.name,
      category: i.category,
      unit: i.unit,
      purchasedQty: toNum(i.purchasedQty),
      remainingQty: toNum(i.purchasedQty) - toNum(i.usedQty),
      purchasedAt: toDateStr(i.createdAt),
    })),
    machinery: machinery
      .filter((m: MachineryRow) => !m.disposedAt || m.disposedAt > asOfDate)
      .map((m: MachineryRow) => ({
        name: m.name,
        type: m.type,
        condition: m.condition,
        acquiredAt: toDateStr(m.acquiredAt),
        disposedAt: m.disposedAt ? toDateStr(m.disposedAt) : null,
      })),
  };
}
