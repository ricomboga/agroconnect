import { buildRecommendations } from '../../../src/services/recommendationService';

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(global, 'fetch').mockResolvedValue({
    ok: false,
  } as Response);
});

afterEach(() => {
  jest.restoreAllMocks();
});

function makeTest(overrides: Record<string, unknown> = {}) {
  return {
    ph: '6.5',
    nitrogenPpm: null,
    phosphorusPpm: null,
    potassiumPpm: null,
    organicMatterPct: null,
    ...overrides,
  };
}

// ─── pH rules ────────────────────────────────────────────────────────────────

describe('pH rules', () => {
  it('returns low + Agricultural Lime when pH < 5.5', async () => {
    const recs = await buildRecommendations(makeTest({ ph: '4.9' }));
    const phRec = recs.find((r) => r.nutrient === 'pH');
    expect(phRec?.status).toBe('low');
    expect(phRec?.product_name).toBe('Agricultural Lime');
    expect(phRec?.rate_kg_per_acre).toBe(2000);
  });

  it('returns slightly_low + Dolomitic Lime when pH is 5.5–5.99', async () => {
    const recs = await buildRecommendations(makeTest({ ph: '5.7' }));
    const phRec = recs.find((r) => r.nutrient === 'pH');
    expect(phRec?.status).toBe('slightly_low');
    expect(phRec?.product_name).toBe('Dolomitic Lime');
    expect(phRec?.rate_kg_per_acre).toBe(1000);
  });

  it('returns optimal with no product when pH 6.0–7.5', async () => {
    const recs = await buildRecommendations(makeTest({ ph: '6.8' }));
    const phRec = recs.find((r) => r.nutrient === 'pH');
    expect(phRec?.status).toBe('optimal');
    expect(phRec?.product_name).toBeNull();
  });

  it('returns high + Agricultural Sulfur when pH > 7.5', async () => {
    const recs = await buildRecommendations(makeTest({ ph: '8.0' }));
    const phRec = recs.find((r) => r.nutrient === 'pH');
    expect(phRec?.status).toBe('high');
    expect(phRec?.product_name).toBe('Agricultural Sulfur');
    expect(phRec?.rate_kg_per_acre).toBe(500);
  });
});

// ─── Nitrogen rules ───────────────────────────────────────────────────────────

describe('nitrogen rules', () => {
  it('returns low + CAN Fertiliser when N < 20 ppm', async () => {
    const recs = await buildRecommendations(makeTest({ ph: '6.5', nitrogenPpm: '10' }));
    const rec = recs.find((r) => r.nutrient === 'nitrogen');
    expect(rec?.status).toBe('low');
    expect(rec?.product_name).toBe('CAN Fertiliser 26%N');
  });

  it('returns optimal when N is 20–40', async () => {
    const recs = await buildRecommendations(makeTest({ ph: '6.5', nitrogenPpm: '30' }));
    const rec = recs.find((r) => r.nutrient === 'nitrogen');
    expect(rec?.status).toBe('optimal');
    expect(rec?.product_name).toBeNull();
  });

  it('returns excess when N > 40', async () => {
    const recs = await buildRecommendations(makeTest({ ph: '6.5', nitrogenPpm: '55' }));
    const rec = recs.find((r) => r.nutrient === 'nitrogen');
    expect(rec?.status).toBe('excess');
  });

  it('omits nitrogen recommendation when nitrogenPpm is null', async () => {
    const recs = await buildRecommendations(makeTest({ ph: '6.5' }));
    expect(recs.find((r) => r.nutrient === 'nitrogen')).toBeUndefined();
  });
});

// ─── Phosphorus rules ─────────────────────────────────────────────────────────

describe('phosphorus rules', () => {
  it('returns low + TSP when P < 15 ppm', async () => {
    const recs = await buildRecommendations(makeTest({ ph: '6.5', phosphorusPpm: '10' }));
    const rec = recs.find((r) => r.nutrient === 'phosphorus');
    expect(rec?.status).toBe('low');
    expect(rec?.product_name).toBe('Triple Super Phosphate');
  });

  it('returns optimal when P is 15–40', async () => {
    const recs = await buildRecommendations(makeTest({ ph: '6.5', phosphorusPpm: '25' }));
    const rec = recs.find((r) => r.nutrient === 'phosphorus');
    expect(rec?.status).toBe('optimal');
  });

  it('returns excess when P > 40', async () => {
    const recs = await buildRecommendations(makeTest({ ph: '6.5', phosphorusPpm: '50' }));
    const rec = recs.find((r) => r.nutrient === 'phosphorus');
    expect(rec?.status).toBe('excess');
  });
});

// ─── Potassium rules ──────────────────────────────────────────────────────────

describe('potassium rules', () => {
  it('returns low + MOP when K < 100 ppm', async () => {
    const recs = await buildRecommendations(makeTest({ ph: '6.5', potassiumPpm: '80' }));
    const rec = recs.find((r) => r.nutrient === 'potassium');
    expect(rec?.status).toBe('low');
    expect(rec?.product_name).toBe('Muriate of Potash MOP');
  });

  it('returns optimal when K is 100–200', async () => {
    const recs = await buildRecommendations(makeTest({ ph: '6.5', potassiumPpm: '150' }));
    const rec = recs.find((r) => r.nutrient === 'potassium');
    expect(rec?.status).toBe('optimal');
  });

  it('returns excess when K > 200', async () => {
    const recs = await buildRecommendations(makeTest({ ph: '6.5', potassiumPpm: '250' }));
    const rec = recs.find((r) => r.nutrient === 'potassium');
    expect(rec?.status).toBe('excess');
  });
});

// ─── Organic matter rules ─────────────────────────────────────────────────────

describe('organic matter rules', () => {
  it('returns low + Farmyard Manure when OM < 2%', async () => {
    const recs = await buildRecommendations(makeTest({ ph: '6.5', organicMatterPct: '1.5' }));
    const rec = recs.find((r) => r.nutrient === 'organic_matter');
    expect(rec?.status).toBe('low');
    expect(rec?.product_name).toBe('Farmyard Manure');
    expect(rec?.rate_kg_per_acre).toBe(5000);
  });

  it('returns optimal when OM is 2–5%', async () => {
    const recs = await buildRecommendations(makeTest({ ph: '6.5', organicMatterPct: '3' }));
    const rec = recs.find((r) => r.nutrient === 'organic_matter');
    expect(rec?.status).toBe('optimal');
  });

  it('returns excellent when OM > 5%', async () => {
    const recs = await buildRecommendations(makeTest({ ph: '6.5', organicMatterPct: '6' }));
    const rec = recs.find((r) => r.nutrient === 'organic_matter');
    expect(rec?.status).toBe('excellent');
  });
});

// ─── Market lookup ────────────────────────────────────────────────────────────

describe('market lookup', () => {
  it('populates supplier_product_id when market returns a match', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'supplier-product-uuid' }] }),
    } as Response);

    const recs = await buildRecommendations(makeTest({ ph: '4.0' }));
    const phRec = recs.find((r) => r.nutrient === 'pH');
    expect(phRec?.supplier_product_id).toBe('supplier-product-uuid');
  });

  it('sets supplier_product_id to null when market returns no results', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);

    const recs = await buildRecommendations(makeTest({ ph: '4.0' }));
    const phRec = recs.find((r) => r.nutrient === 'pH');
    expect(phRec?.supplier_product_id).toBeNull();
  });

  it('sets supplier_product_id to null on network error', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

    const recs = await buildRecommendations(makeTest({ ph: '4.0' }));
    const phRec = recs.find((r) => r.nutrient === 'pH');
    expect(phRec?.supplier_product_id).toBeNull();
  });

  it('sets supplier_product_id to null when product_name is null (optimal)', async () => {
    const recs = await buildRecommendations(makeTest({ ph: '6.5' }));
    const phRec = recs.find((r) => r.nutrient === 'pH');
    expect(phRec?.supplier_product_id).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
