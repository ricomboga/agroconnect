export interface InferenceParams {
  imageUrls: string[];
  subjectType: 'plant' | 'animal';
  subjectName: string;
  symptoms?: string;
}

export interface Prescription {
  step: number;
  action: string;
  productName: string | null;
  productType: string | null;
  dosage: string | null;
  frequency: string | null;
}

export interface AlternativeDiagnosis {
  diseaseCode: string;
  diseaseName: string;
  confidence: number;
  description: string;
}

export interface InferenceResult {
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

export interface InferenceProvider {
  readonly name: string;
  analyze(params: InferenceParams): Promise<InferenceResult>;
}
