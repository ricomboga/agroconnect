import { prisma } from '@agroconnect/db/farm';
import { logger } from '../logger.js';

export async function countActiveFarms() {
  return prisma.farm.count({ where: { status: { not: 'sold' } } });
}

export async function countDiagnosesThisMonth(): Promise<number> {
  // Diagnosis tracking is not yet persisted in farm_db.
  // Returns 0 until a DiagnosisRecord model and migration are added.
  logger.warn({ context: 'adminStatsRepository' }, 'diagnoses_this_month not yet tracked in farm_db — returning 0');
  return 0;
}

export async function countFarmsHealthBelowThreshold(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = await prisma.activity.groupBy({
    by: ['farmId'],
    where: { status: 'pending', scheduledDate: { lt: today } },
    _count: { id: true },
    having: { id: { _count: { gte: 4 } } },
  });
  return rows.length;
}

export interface CountyFarmerCount {
  county: string;
  farmerCount: number;
}

export async function countFarmersByCounty(): Promise<CountyFarmerCount[]> {
  const rows = await prisma.farm.groupBy({
    by: ['county', 'ownerId'],
    where: { deletedAt: null },
  });

  const byCounty = new Map<string, Set<string>>();
  for (const row of rows) {
    const owners = byCounty.get(row.county) ?? new Set<string>();
    owners.add(row.ownerId);
    byCounty.set(row.county, owners);
  }

  return [...byCounty.entries()].map(([county, owners]) => ({ county, farmerCount: owners.size }));
}

export interface CountyLivestockTotal {
  county: string;
  animalType: string;
  totalCount: number;
}

export async function sumLivestockByCounty(filters: {
  county?: string;
  animalType?: string;
}): Promise<CountyLivestockTotal[]> {
  const rows = await prisma.animalGroup.findMany({
    where: {
      ...(filters.animalType !== undefined ? { animalType: filters.animalType } : {}),
      farm: {
        deletedAt: null,
        ...(filters.county !== undefined ? { county: filters.county } : {}),
      },
    },
    select: { count: true, animalType: true, farm: { select: { county: true } } },
  });

  const byKey = new Map<string, CountyLivestockTotal>();
  for (const row of rows) {
    const key = `${row.farm.county}::${row.animalType}`;
    const entry = byKey.get(key) ?? { county: row.farm.county, animalType: row.animalType, totalCount: 0 };
    entry.totalCount += row.count;
    byKey.set(key, entry);
  }

  return [...byKey.values()];
}
