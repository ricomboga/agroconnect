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
