// Raw data shapes expected from farm-service responses

export interface HarvestData {
  quantityKg: string | number;
  soldQuantityKg: string | number;
  qualityGrade: string | null | undefined;
  harvestDate: string | Date;
}

export interface InputData {
  type: string;
}

export interface ActivityData {
  status: string;
}

export type CreditBand = 'A' | 'B' | 'C' | 'D' | 'ineligible';

export interface ScoreComponents {
  avgYieldScore: number;
  inputManagementScore: number;
  activityComplianceScore: number;
  platformEngagementScore: number;
}

export interface ScoreResult extends ScoreComponents {
  score: number;
  band: CreditBand;
  maxLoanKes: number;
  seasonsOfData: number;
}

// ----- Component scorers (each returns 0–25, invariant enforced by Math.min) -----

const GRADE_BASE: Record<string, number> = { A: 20, B: 15, C: 10, reject: 3 };
const MAX_INPUT_TYPES = 7;
const MAX_INPUT_RECORDS = 20;
const MAX_SEASONS = 3;
const MAX_RECORDS = 30;

export function scoreAvgYield(harvests: HarvestData[]): number {
  if (harvests.length === 0) return 0;

  const scores = harvests.map((h) => {
    const base = GRADE_BASE[h.qualityGrade ?? ''] ?? 8;
    const qty = Number(h.quantityKg);
    const sold = Number(h.soldQuantityKg);
    const sellThrough = qty > 0 ? Math.min(1, sold / qty) : 0;
    return base + sellThrough * 5;
  });

  const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
  return Math.min(25, avg);
}

export function scoreInputManagement(inputs: InputData[]): number {
  if (inputs.length === 0) return 0;

  const uniqueTypes = new Set(inputs.map((i) => i.type)).size;
  const diversity = (uniqueTypes / MAX_INPUT_TYPES) * 12;
  const volume = (Math.min(MAX_INPUT_RECORDS, inputs.length) / MAX_INPUT_RECORDS) * 13;
  return Math.min(25, diversity + volume);
}

export function scoreActivityCompliance(activities: ActivityData[]): number {
  if (activities.length === 0) return 0;

  const completed = activities.filter((a) => a.status === 'completed').length;
  return Math.min(25, (completed / activities.length) * 25);
}

export function scorePlatformEngagement(
  harvests: HarvestData[],
  inputs: InputData[],
  activities: ActivityData[],
): { score: number; seasonsOfData: number } {
  const years = new Set(
    harvests.map((h) => new Date(h.harvestDate).getFullYear()),
  );
  const seasonsOfData = years.size;

  const seasonsScore = (Math.min(MAX_SEASONS, seasonsOfData) / MAX_SEASONS) * 15;
  const totalRecords = harvests.length + inputs.length + activities.length;
  const recordScore = (Math.min(MAX_RECORDS, totalRecords) / MAX_RECORDS) * 10;

  return { score: Math.min(25, seasonsScore + recordScore), seasonsOfData };
}

// ----- Band + loan cap mapping -----

export function scoreToBand(score: number): CreditBand {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  if (score >= 20) return 'D';
  return 'ineligible';
}

export const BAND_MAX_LOAN_KES: Record<CreditBand, number> = {
  A: 500_000,
  B: 200_000,
  C: 75_000,
  D: 25_000,
  ineligible: 0,
};

// ----- Top-level pure function -----

export function computeScoreFromData(
  harvests: HarvestData[],
  inputs: InputData[],
  activities: ActivityData[],
): ScoreResult {
  const avgYieldScore = scoreAvgYield(harvests);
  const inputManagementScore = scoreInputManagement(inputs);
  const activityComplianceScore = scoreActivityCompliance(activities);
  const { score: platformEngagementScore, seasonsOfData } = scorePlatformEngagement(
    harvests,
    inputs,
    activities,
  );

  const score = Math.min(
    100,
    avgYieldScore + inputManagementScore + activityComplianceScore + platformEngagementScore,
  );

  const band = scoreToBand(score);
  const maxLoanKes = BAND_MAX_LOAN_KES[band];

  return {
    avgYieldScore,
    inputManagementScore,
    activityComplianceScore,
    platformEngagementScore,
    score,
    band,
    maxLoanKes,
    seasonsOfData,
  };
}
