import { createSoilTestSchema } from '../../src/schemas/createSoilTest.schema';
import { listSoilTestsQuerySchema } from '../../src/schemas/listSoilTests.query.schema';

describe('createSoilTestSchema', () => {
  const valid = {
    testedAt: '2025-03-15',
    ph: 6.5,
  };

  it('accepts a valid minimal payload', () => {
    expect(createSoilTestSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a full payload with all optional fields', () => {
    const result = createSoilTestSchema.safeParse({
      ...valid,
      plotId: '00000000-0000-0000-0000-000000000001',
      nitrogenPpm: 25,
      phosphorusPpm: 20,
      potassiumPpm: 150,
      organicMatterPct: 3.5,
      labName: 'Nairobi Soil Lab',
      notes: 'Sample from north plot',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when testedAt is not a valid date', () => {
    const result = createSoilTestSchema.safeParse({ ...valid, testedAt: 'not-a-date' });
    expect(result.success).toBe(false);
  });

  it('rejects when ph is below 0', () => {
    const result = createSoilTestSchema.safeParse({ ...valid, ph: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects when ph exceeds 14', () => {
    const result = createSoilTestSchema.safeParse({ ...valid, ph: 14.1 });
    expect(result.success).toBe(false);
  });

  it('rejects when ph is missing', () => {
    const { ph: _ph, ...rest } = valid;
    const result = createSoilTestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects when testedAt is missing', () => {
    const { testedAt: _t, ...rest } = valid;
    const result = createSoilTestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects a negative nitrogenPpm', () => {
    const result = createSoilTestSchema.safeParse({ ...valid, nitrogenPpm: -5 });
    expect(result.success).toBe(false);
  });

  it('rejects organicMatterPct above 100', () => {
    const result = createSoilTestSchema.safeParse({ ...valid, organicMatterPct: 101 });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid plotId UUID', () => {
    const result = createSoilTestSchema.safeParse({ ...valid, plotId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});

describe('listSoilTestsQuerySchema', () => {
  it('accepts empty query (uses defaults)', () => {
    const result = listSoilTestsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.page_size).toBe(20);
    }
  });

  it('coerces numeric strings for page and page_size', () => {
    const result = listSoilTestsQuerySchema.safeParse({ page: '2', page_size: '10' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.page_size).toBe(10);
    }
  });

  it('rejects page_size above 100', () => {
    const result = listSoilTestsQuerySchema.safeParse({ page_size: '101' });
    expect(result.success).toBe(false);
  });

  it('rejects non-numeric page', () => {
    const result = listSoilTestsQuerySchema.safeParse({ page: 'abc' });
    expect(result.success).toBe(false);
  });
});
