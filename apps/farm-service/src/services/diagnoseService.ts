import { logger } from '../logger.js';

const DIAGNOSIS_URL = process.env['DIAGNOSIS_SERVICE_URL'] ?? 'http://localhost:8000';
const MARKET_URL = process.env['MARKET_SERVICE_URL'] ?? 'http://localhost:3004';
const MEDIA_URL = process.env['MEDIA_SERVICE_URL'] ?? 'http://localhost:3009';

export interface DiagnosisSubmitPayload {
  farm_id: string;
  farmer_id: string;
  subject_type: 'plant' | 'animal';
  subject_name: string;
  image_urls: string[];
  symptoms?: string;
  duration_days?: number;
}

export interface SupplierProduct {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  unit: string;
  price_kes: number;
  stock_quantity: number;
  county_availability: string[];
  supplier_id: string;
  supplier_name: string | null;
  supplier_phone: string | null;
  supplier_type: string | null;
}

export interface DiagnosisResultFull {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  subject: { type: string; name: string };
  farm_id: string;
  farmer_id: string;
  diagnosis?: {
    disease_name: string;
    disease_code: string;
    confidence: number;
    confidence_tier: 'high' | 'medium' | 'low';
    severity: 'mild' | 'moderate' | 'severe' | 'critical';
    description: string;
    affected_area?: string;
  };
  alternative_diagnoses: Array<{ disease_name: string; confidence: number; description: string }>;
  prescriptions: Array<{
    step: number;
    action: string;
    product_name: string | null;
    product_type: string | null;
    dosage: string | null;
    frequency: string | null;
  }>;
  suppliers: SupplierProduct[];
  feedback?: {
    rating: number;
    outcome: 'resolved' | 'improved' | 'no_change' | 'worsened';
    submitted_at: string;
  };
  processing_time_ms?: number;
  created_at: string;
}

async function diagnosisRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${DIAGNOSIS_URL}/api/v1${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`diagnosis-service ${options?.method ?? 'GET'} ${path} → ${res.status}`), {
      statusCode: res.status,
      body: text,
    });
  }
  return res.json() as Promise<T>;
}

// Internal routes (diagnosis-service's createInternalRouter) are mounted at
// `/internal`, not under `/api/v1` — they use a separate prefix from the public API.
async function diagnosisInternalRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${DIAGNOSIS_URL}/internal${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`diagnosis-service ${options?.method ?? 'GET'} ${path} → ${res.status}`), {
      statusCode: res.status,
      body: text,
    });
  }
  return res.json() as Promise<T>;
}

async function marketRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${MARKET_URL}${path}`, options);
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`market-service GET ${path} → ${res.status}`), {
      statusCode: res.status,
      body: text,
    });
  }
  return res.json() as Promise<T>;
}

export async function uploadImageToMedia(
  fileBuffer: Buffer,
  originalName: string,
  mimetype: string,
  diagnosisId: string,
  authToken: string,
): Promise<string> {
  const form = new FormData();
  form.append('file', new Blob([fileBuffer], { type: mimetype }), originalName);
  form.append('category', 'diagnosis-images');
  form.append('entity_id', diagnosisId);

  const res = await fetch(`${MEDIA_URL}/api/v1/media/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`media-service upload → ${res.status}`), { body: text });
  }

  const json = await res.json() as { data: { url: string } };
  return json.data.url;
}

export async function submitDiagnosis(payload: DiagnosisSubmitPayload): Promise<{ id: string; status: string }> {
  return diagnosisInternalRequest<{ id: string; status: string }>('/diagnoses/submit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getDiagnosisResult(diagnosisId: string): Promise<DiagnosisResultFull> {
  const raw = await diagnosisRequest<DiagnosisResultFull>(`/${diagnosisId}`);

  // Enrich with supplier availability for any prescription that names a product
  const productNames = (raw.prescriptions ?? [])
    .map((p) => p.product_name)
    .filter((n): n is string => Boolean(n));

  const suppliers = productNames.length > 0
    ? await getSuppliersByProductNames(productNames)
    : [];

  return { ...raw, suppliers };
}

export async function listDiagnosesByFarm(
  farmId: string,
  skip: number,
  limit: number,
): Promise<{ data: DiagnosisResultFull[]; total: number }> {
  return diagnosisRequest<{ data: DiagnosisResultFull[]; total: number }>(
    `/farm/${farmId}?skip=${skip}&limit=${limit}`,
  );
}

export async function submitFeedback(
  diagnosisId: string,
  body: { rating: number; outcome: string; notes?: string },
): Promise<void> {
  await diagnosisRequest<void>(`/${diagnosisId}/feedback`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getSuppliersByProductNames(
  names: string[],
  county?: string,
): Promise<SupplierProduct[]> {
  try {
    const params = new URLSearchParams();
    names.forEach((n) => params.append('names', n));
    if (county) params.set('county', county);
    const result = await marketRequest<{ data: SupplierProduct[] }>(
      `/internal/products/search?${params.toString()}`,
    );
    return result.data;
  } catch (err) {
    logger.warn({ err, names }, 'Could not fetch suppliers — returning empty list');
    return [];
  }
}

export async function listDiseases(): Promise<{ data: unknown[]; total: number }> {
  return diagnosisRequest<{ data: unknown[]; total: number }>('/diseases');
}

export async function getDisease(diseaseCode: string): Promise<unknown> {
  return diagnosisRequest<unknown>(`/diseases/${diseaseCode}`);
}
