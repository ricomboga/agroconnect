// PHASE_3: replace rules with trained recommendation model

import { logger } from '../logger.js';

export interface Recommendation {
  nutrient: string;
  status: string;
  recommendation: string;
  product_name: string | null;
  rate_kg_per_acre: number | null;
  supplier_product_id: string | null;
}

type NumericField = { toString(): string } | string | number | null | undefined;

export interface SoilTestData {
  ph: NumericField;
  nitrogenPpm: NumericField;
  phosphorusPpm: NumericField;
  potassiumPpm: NumericField;
  organicMatterPct: NumericField;
}

function toNum(val: NumericField): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function phRule(ph: number): Omit<Recommendation, 'supplier_product_id'> {
  if (ph < 5.5) {
    return {
      nutrient: 'pH',
      status: 'low',
      recommendation: 'Apply lime to raise pH to optimal range (6.0–7.5)',
      product_name: 'Agricultural Lime',
      rate_kg_per_acre: 2000,
    };
  }
  if (ph < 6.0) {
    return {
      nutrient: 'pH',
      status: 'slightly_low',
      recommendation: 'Apply dolomitic lime to nudge pH into optimal range',
      product_name: 'Dolomitic Lime',
      rate_kg_per_acre: 1000,
    };
  }
  if (ph <= 7.5) {
    return {
      nutrient: 'pH',
      status: 'optimal',
      recommendation: 'pH is within optimal range — no amendment needed',
      product_name: null,
      rate_kg_per_acre: null,
    };
  }
  return {
    nutrient: 'pH',
    status: 'high',
    recommendation: 'Apply agricultural sulfur to lower pH',
    product_name: 'Agricultural Sulfur',
    rate_kg_per_acre: 500,
  };
}

function nitrogenRule(n: number): Omit<Recommendation, 'supplier_product_id'> {
  if (n < 20) {
    return {
      nutrient: 'nitrogen',
      status: 'low',
      recommendation: 'Apply CAN fertiliser to boost available nitrogen',
      product_name: 'CAN Fertiliser 26%N',
      rate_kg_per_acre: 50,
    };
  }
  if (n <= 40) {
    return {
      nutrient: 'nitrogen',
      status: 'optimal',
      recommendation: 'Nitrogen levels are adequate',
      product_name: null,
      rate_kg_per_acre: null,
    };
  }
  return {
    nutrient: 'nitrogen',
    status: 'excess',
    recommendation: 'Reduce nitrogen application to avoid leaching',
    product_name: null,
    rate_kg_per_acre: null,
  };
}

function phosphorusRule(p: number): Omit<Recommendation, 'supplier_product_id'> {
  if (p < 15) {
    return {
      nutrient: 'phosphorus',
      status: 'low',
      recommendation: 'Apply TSP to improve phosphorus availability',
      product_name: 'Triple Super Phosphate',
      rate_kg_per_acre: 30,
    };
  }
  if (p <= 40) {
    return {
      nutrient: 'phosphorus',
      status: 'optimal',
      recommendation: 'Phosphorus levels are adequate',
      product_name: null,
      rate_kg_per_acre: null,
    };
  }
  return {
    nutrient: 'phosphorus',
    status: 'excess',
    recommendation: 'Reduce phosphorus application to prevent fixation',
    product_name: null,
    rate_kg_per_acre: null,
  };
}

function potassiumRule(k: number): Omit<Recommendation, 'supplier_product_id'> {
  if (k < 100) {
    return {
      nutrient: 'potassium',
      status: 'low',
      recommendation: 'Apply muriate of potash to raise potassium levels',
      product_name: 'Muriate of Potash MOP',
      rate_kg_per_acre: 50,
    };
  }
  if (k <= 200) {
    return {
      nutrient: 'potassium',
      status: 'optimal',
      recommendation: 'Potassium levels are adequate',
      product_name: null,
      rate_kg_per_acre: null,
    };
  }
  return {
    nutrient: 'potassium',
    status: 'excess',
    recommendation: 'Reduce potassium application',
    product_name: null,
    rate_kg_per_acre: null,
  };
}

function organicMatterRule(om: number): Omit<Recommendation, 'supplier_product_id'> {
  if (om < 2) {
    return {
      nutrient: 'organic_matter',
      status: 'low',
      recommendation: 'Incorporate farmyard manure to raise organic matter',
      product_name: 'Farmyard Manure',
      rate_kg_per_acre: 5000,
    };
  }
  if (om <= 5) {
    return {
      nutrient: 'organic_matter',
      status: 'optimal',
      recommendation: 'Organic matter is at a good level',
      product_name: null,
      rate_kg_per_acre: null,
    };
  }
  return {
    nutrient: 'organic_matter',
    status: 'excellent',
    recommendation: 'Excellent organic matter content — maintain current practices',
    product_name: null,
    rate_kg_per_acre: null,
  };
}

async function lookupSupplierProduct(productName: string): Promise<string | null> {
  const baseUrl = process.env['MARKET_SERVICE_URL'] ?? 'http://market-service:3003';
  try {
    const res = await fetch(
      `${baseUrl}/api/v1/market/products?search=${encodeURIComponent(productName)}&is_active=true`,
      { signal: AbortSignal.timeout(3000) },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: Array<{ id: string }> };
    return body.data?.[0]?.id ?? null;
  } catch (err) {
    logger.warn({ err, productName }, 'Market product lookup failed — supplier_product_id set to null');
    return null;
  }
}

export async function buildRecommendations(test: SoilTestData): Promise<Recommendation[]> {
  const raw: Array<Omit<Recommendation, 'supplier_product_id'>> = [];

  raw.push(phRule(Number(test.ph)));

  const n = toNum(test.nitrogenPpm);
  if (n !== null) raw.push(nitrogenRule(n));

  const p = toNum(test.phosphorusPpm);
  if (p !== null) raw.push(phosphorusRule(p));

  const k = toNum(test.potassiumPpm);
  if (k !== null) raw.push(potassiumRule(k));

  const om = toNum(test.organicMatterPct);
  if (om !== null) raw.push(organicMatterRule(om));

  const resolved = await Promise.all(
    raw.map(async (r) => ({
      ...r,
      supplier_product_id: r.product_name ? await lookupSupplierProduct(r.product_name) : null,
    })),
  );

  return resolved;
}
