import {
  computeScoreFromData,
  scoreAvgYield,
  scoreInputManagement,
  scoreActivityCompliance,
  scorePlatformEngagement,
  scoreToBand,
  BAND_MAX_LOAN_KES,
  type HarvestData,
  type InputData,
  type ActivityData,
} from '../../src/scoring/computeScore';

// ── helpers ─────────────────────────────────────────────────────────────────

function makeHarvest(
  overrides: Partial<HarvestData> & { year?: number } = {},
): HarvestData {
  const year = overrides.year ?? 2024;
  return {
    quantityKg: overrides.quantityKg ?? 500,
    soldQuantityKg: overrides.soldQuantityKg ?? 450,
    qualityGrade: overrides.qualityGrade ?? 'A',
    harvestDate: overrides.harvestDate ?? `${year}-06-15`,
  };
}

function makeInput(type = 'seed'): InputData {
  return { type };
}

function makeActivity(status: 'completed' | 'pending' | 'skipped' = 'completed'): ActivityData {
  return { status };
}

// ── Band-A farmer (3 seasons, high yield) ────────────────────────────────────

describe('computeScoreFromData — band A farmer', () => {
  // 5 harvests across 3 calendar years, all grade A, 90% sold
  const harvests: HarvestData[] = [
    makeHarvest({ year: 2022, qualityGrade: 'A', quantityKg: 1000, soldQuantityKg: 900 }),
    makeHarvest({ year: 2022, qualityGrade: 'A', quantityKg: 800, soldQuantityKg: 720 }),
    makeHarvest({ year: 2023, qualityGrade: 'A', quantityKg: 1200, soldQuantityKg: 1080 }),
    makeHarvest({ year: 2023, qualityGrade: 'A', quantityKg: 600, soldQuantityKg: 540 }),
    makeHarvest({ year: 2024, qualityGrade: 'A', quantityKg: 900, soldQuantityKg: 810 }),
  ];
  // 4 different input types, 15 records
  const inputs: InputData[] = [
    ...Array(4).fill(null).map(() => makeInput('seed')),
    ...Array(4).fill(null).map(() => makeInput('fertiliser')),
    ...Array(4).fill(null).map(() => makeInput('pesticide')),
    ...Array(3).fill(null).map(() => makeInput('herbicide')),
  ];
  // 20 activities, 18 completed
  const activities: ActivityData[] = [
    ...Array(18).fill(null).map(() => makeActivity('completed')),
    makeActivity('pending'),
    makeActivity('skipped'),
  ];

  it('yields band A (score ≥ 80)', () => {
    const result = computeScoreFromData(harvests, inputs, activities);
    expect(result.band).toBe('A');
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it('each component is within 0–25', () => {
    const result = computeScoreFromData(harvests, inputs, activities);
    expect(result.avgYieldScore).toBeGreaterThanOrEqual(0);
    expect(result.avgYieldScore).toBeLessThanOrEqual(25);
    expect(result.inputManagementScore).toBeGreaterThanOrEqual(0);
    expect(result.inputManagementScore).toBeLessThanOrEqual(25);
    expect(result.activityComplianceScore).toBeGreaterThanOrEqual(0);
    expect(result.activityComplianceScore).toBeLessThanOrEqual(25);
    expect(result.platformEngagementScore).toBeGreaterThanOrEqual(0);
    expect(result.platformEngagementScore).toBeLessThanOrEqual(25);
  });

  it('total score is 0–100', () => {
    const result = computeScoreFromData(harvests, inputs, activities);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('maxLoanKes matches band A (500 000)', () => {
    const result = computeScoreFromData(harvests, inputs, activities);
    expect(result.maxLoanKes).toBe(500_000);
  });

  it('seasonsOfData is 3', () => {
    const result = computeScoreFromData(harvests, inputs, activities);
    expect(result.seasonsOfData).toBe(3);
  });
});

// ── Band D farmer (1 season, low yield) ─────────────────────────────────────

describe('computeScoreFromData — band D farmer (1 season, low yield)', () => {
  const harvests: HarvestData[] = [
    makeHarvest({ year: 2024, qualityGrade: 'C', quantityKg: 200, soldQuantityKg: 60 }),
  ];
  const inputs: InputData[] = [makeInput('seed'), makeInput('seed')];
  const activities: ActivityData[] = [
    makeActivity('completed'),
    makeActivity('completed'),
    makeActivity('pending'),
    makeActivity('pending'),
    makeActivity('skipped'),
  ];

  it('yields band C or D (score < 60)', () => {
    const result = computeScoreFromData(harvests, inputs, activities);
    expect(['C', 'D']).toContain(result.band);
    expect(result.score).toBeLessThan(60);
  });

  it('each component is within 0–25', () => {
    const result = computeScoreFromData(harvests, inputs, activities);
    expect(result.avgYieldScore).toBeGreaterThanOrEqual(0);
    expect(result.avgYieldScore).toBeLessThanOrEqual(25);
    expect(result.inputManagementScore).toBeGreaterThanOrEqual(0);
    expect(result.inputManagementScore).toBeLessThanOrEqual(25);
    expect(result.activityComplianceScore).toBeGreaterThanOrEqual(0);
    expect(result.activityComplianceScore).toBeLessThanOrEqual(25);
    expect(result.platformEngagementScore).toBeGreaterThanOrEqual(0);
    expect(result.platformEngagementScore).toBeLessThanOrEqual(25);
  });

  it('total score is 0–100', () => {
    const result = computeScoreFromData(harvests, inputs, activities);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

// ── Edge case: no data at all ────────────────────────────────────────────────

describe('computeScoreFromData — no data', () => {
  it('returns score 0 and band ineligible', () => {
    const result = computeScoreFromData([], [], []);
    expect(result.score).toBe(0);
    expect(result.band).toBe('ineligible');
    expect(result.maxLoanKes).toBe(0);
  });

  it('all components are 0', () => {
    const result = computeScoreFromData([], [], []);
    expect(result.avgYieldScore).toBe(0);
    expect(result.inputManagementScore).toBe(0);
    expect(result.activityComplianceScore).toBe(0);
    expect(result.platformEngagementScore).toBe(0);
  });
});

// ── Component invariant: each scorer caps at 25 ─────────────────────────────

describe('score component caps', () => {
  it('scoreAvgYield never exceeds 25 regardless of data', () => {
    // Perfect data: A grade, 100% sold, many harvests
    const harvests = Array(50).fill(null).map(() =>
      makeHarvest({ qualityGrade: 'A', quantityKg: 1000, soldQuantityKg: 1000 }),
    );
    expect(scoreAvgYield(harvests)).toBeLessThanOrEqual(25);
  });

  it('scoreInputManagement never exceeds 25 regardless of data', () => {
    const inputs = Array(200).fill(null).flatMap((_, i) =>
      [makeInput(['seed', 'fertiliser', 'pesticide', 'herbicide', 'fuel', 'equipment', 'other'][i % 7])],
    );
    expect(scoreInputManagement(inputs)).toBeLessThanOrEqual(25);
  });

  it('scoreActivityCompliance never exceeds 25 regardless of data', () => {
    const activities = Array(200).fill(null).map(() => makeActivity('completed'));
    expect(scoreActivityCompliance(activities)).toBeLessThanOrEqual(25);
  });

  it('scorePlatformEngagement never exceeds 25 regardless of data', () => {
    const harvests = Array(10).fill(null).map((_, i) =>
      makeHarvest({ year: 2020 + i }),
    );
    const inputs = Array(200).fill(null).map(() => makeInput('seed'));
    const activities = Array(200).fill(null).map(() => makeActivity('completed'));
    const { score } = scorePlatformEngagement(harvests, inputs, activities);
    expect(score).toBeLessThanOrEqual(25);
  });
});

// ── scoreToBand mapping ──────────────────────────────────────────────────────

describe('scoreToBand', () => {
  it.each([
    [100, 'A'],
    [80, 'A'],
    [79.99, 'B'],
    [60, 'B'],
    [59.99, 'C'],
    [40, 'C'],
    [39.99, 'D'],
    [20, 'D'],
    [19.99, 'ineligible'],
    [0, 'ineligible'],
  ] as const)('score %d → band %s', (score, expectedBand) => {
    expect(scoreToBand(score)).toBe(expectedBand);
  });
});

// ── BAND_MAX_LOAN_KES mapping ─────────────────────────────────────────────────

describe('BAND_MAX_LOAN_KES', () => {
  it.each([
    ['A', 500_000],
    ['B', 200_000],
    ['C', 75_000],
    ['D', 25_000],
    ['ineligible', 0],
  ] as const)('band %s → maxLoan %d', (band, expected) => {
    expect(BAND_MAX_LOAN_KES[band]).toBe(expected);
  });
});
