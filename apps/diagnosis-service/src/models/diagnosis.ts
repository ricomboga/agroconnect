import type { ObjectId } from 'mongodb';
import type { Prescription, AlternativeDiagnosis } from '../providers/types.js';
import { confidenceTier } from '../utils/confidenceTier.js';

export type DiagnosisStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DiagnosisResult {
  diseaseCode: string;
  diseaseName: string;
  confidence: number;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  description: string;
  prescriptions: Prescription[];
  alternativeDiagnoses: AlternativeDiagnosis[];
  modelVersion: string;
  providerName: string;
}

export interface DiagnosisFeedback {
  rating: number;
  outcome: 'resolved' | 'improved' | 'no_change' | 'worsened';
  notes?: string;
  submittedAt: Date;
}

export interface DiagnosisDocument {
  _id: ObjectId;
  farmId: string;
  farmerId: string;
  subjectType: 'plant' | 'animal';
  subjectName: string;
  imageUrls: string[];
  symptoms?: string;
  durationDays?: number;
  status: DiagnosisStatus;
  result?: DiagnosisResult;
  feedback?: DiagnosisFeedback;
  error?: string;
  errorCode?: string;
  processingTimeMs?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Shape sent over REST to farm-service (snake_case to match existing contract)
export interface DiagnosisResponse {
  id: string;
  status: DiagnosisStatus;
  subject: { type: string; name: string };
  farm_id: string;
  farmer_id: string;
  diagnosis?: {
    disease_name: string;
    disease_code: string;
    confidence: number;
    confidence_tier: 'high' | 'medium' | 'low';
    severity: string;
    description: string;
  };
  alternative_diagnoses: AlternativeDiagnosis[];
  prescriptions: Prescription[];
  feedback?: {
    rating: number;
    outcome: 'resolved' | 'improved' | 'no_change' | 'worsened';
    submitted_at: string;
  };
  processing_time_ms?: number;
  created_at: string;
}

export function toResponse(doc: DiagnosisDocument): DiagnosisResponse {
  return {
    id: doc._id.toHexString(),
    status: doc.status,
    subject: { type: doc.subjectType, name: doc.subjectName },
    farm_id: doc.farmId,
    farmer_id: doc.farmerId,
    diagnosis: doc.result
      ? {
          disease_name: doc.result.diseaseName,
          disease_code: doc.result.diseaseCode,
          confidence: doc.result.confidence,
          confidence_tier: confidenceTier(doc.result.confidence),
          severity: doc.result.severity,
          description: doc.result.description,
        }
      : undefined,
    alternative_diagnoses: doc.result?.alternativeDiagnoses ?? [],
    prescriptions: doc.result?.prescriptions ?? [],
    feedback: doc.feedback
      ? {
          rating: doc.feedback.rating,
          outcome: doc.feedback.outcome,
          submitted_at: doc.feedback.submittedAt.toISOString(),
        }
      : undefined,
    processing_time_ms: doc.processingTimeMs,
    created_at: doc.createdAt.toISOString(),
  };
}
