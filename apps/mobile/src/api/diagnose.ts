import { apiFetch } from './client';
import { useAuthStore } from '../stores/authStore';

const BASE_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';

export interface DiagnosisPrescription {
  step: number;
  action: string;
  product_name: string | null;
  dosage?: string;
  frequency?: string;
}

export interface DiagnosisResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  subject: { type: string; name: string };
  diagnosis?: {
    disease_name: string;
    disease_code: string;
    confidence: number;
    severity: 'mild' | 'moderate' | 'severe' | 'critical';
    description: string;
  };
  prescriptions?: DiagnosisPrescription[];
  processing_time_ms?: number;
}

export interface FeedbackDto {
  rating: number;
  outcome: 'resolved' | 'better' | 'same' | 'worse';
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
      const body = await res.json() as { error?: { message?: string } };
      throw new Error(body.error?.message ?? 'Submission failed');
    }
    return res.json() as Promise<{ id: string }>;
  },

  getResult: (diagnosisId: string) =>
    apiFetch<DiagnosisResult>(`/diagnose/${diagnosisId}`),

  listByFarm: (farmId: string) =>
    apiFetch<{ data: DiagnosisResult[] }>(`/diagnose/farm/${farmId}`),

  submitFeedback: (diagnosisId: string, dto: FeedbackDto) =>
    apiFetch<void>(`/diagnose/${diagnosisId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  diseases: {
    list: () => apiFetch<{ data: DiseaseEntry[] }>('/diagnose/diseases'),
    get: (code: string) => apiFetch<{ data: DiseaseEntry }>(`/diagnose/diseases/${code}`),
  },
};
