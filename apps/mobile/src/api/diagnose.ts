import { apiFetch } from './client';
import { useAuthStore } from '../stores/authStore';

const BASE_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';

export interface DiagnosisPrescription {
  step: number;
  action: string;
  product_name: string | null;
  product_type: string | null;
  dosage: string | null;
  frequency: string | null;
}

export interface SupplierProduct {
  id: string;
  supplier_id: string;
  name: string;
  category: string;
  brand: string | null;
  unit: string;
  price_kes: number;
  stock_quantity: number;
  county_availability: string[];
}

export interface DiagnosisResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  subject: { type: string; name: string };
  diagnosis?: {
    disease_name: string;
    disease_code: string;
    confidence: number;
    confidence_tier: 'high' | 'medium' | 'low';
    severity: 'mild' | 'moderate' | 'severe' | 'critical';
    description: string;
  };
  alternative_diagnoses?: Array<{ disease_name: string; confidence: number; description: string }>;
  prescriptions?: DiagnosisPrescription[];
  suppliers?: SupplierProduct[];
  processing_time_ms?: number;
  created_at: string;
}

// Matches backend: Literal["resolved", "improved", "no_change", "worsened"]
export type FeedbackOutcome = 'resolved' | 'improved' | 'no_change' | 'worsened';

export interface FeedbackDto {
  rating: number;
  outcome: FeedbackOutcome;
  notes?: string;
}

export interface DiseaseEntry {
  code: string;
  name: string;
  subject_type: 'plant' | 'animal';
  subject_name: string;
  pathogen_type: string;
  severity_range: string;
}

export const diagnoseApi = {
  submit: async (formData: FormData): Promise<{ id: string }> => {
    const token = useAuthStore.getState().token;
    const res = await fetch(`${BASE_URL}/diagnose`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json() as { error?: { message?: string }; error_code?: string };
      throw new Error(body.error?.message ?? body.error_code ?? 'Submission failed');
    }
    const json = await res.json() as { data: { id: string } };
    return json.data;
  },

  getResult: (diagnosisId: string) =>
    apiFetch<{ data: DiagnosisResult }>(`/diagnose/${diagnosisId}`).then((r) => r.data),

  listByFarm: (farmId: string) =>
    apiFetch<{ data: DiagnosisResult[]; total: number }>(`/diagnose/farm/${farmId}`),

  submitFeedback: (diagnosisId: string, dto: FeedbackDto) =>
    apiFetch<void>(`/diagnose/${diagnosisId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  diseases: {
    list: () => apiFetch<{ data: DiseaseEntry[]; total: number }>('/diagnose/diseases'),
    get: (code: string) => apiFetch<DiseaseEntry>(`/diagnose/diseases/${code}`),
  },
};
