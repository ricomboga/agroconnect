import { DISEASE_TAXONOMY } from '../taxonomy/diseases.js';
import type { InferenceProvider, InferenceParams, InferenceResult } from './types.js';

export class MockProvider implements InferenceProvider {
  readonly name = 'mock';

  async analyze(params: InferenceParams): Promise<InferenceResult> {
    const candidates = DISEASE_TAXONOMY.filter((d) => d.subjectType === params.subjectType);
    const disease = candidates[Math.floor(Math.random() * candidates.length)] ?? DISEASE_TAXONOMY[0]!;
    const severities = disease.severityRange.split('-') as Array<'mild' | 'moderate' | 'severe' | 'critical'>;
    const severity = severities[Math.floor(Math.random() * severities.length)] ?? 'moderate';

    return {
      diseaseCode: disease.code,
      diseaseName: disease.name,
      confidence: Math.round((0.75 + Math.random() * 0.22) * 100) / 100,
      severity,
      description: `[MOCK] ${disease.name} detected on ${params.subjectName}. This is a simulated result for development only.`,
      prescriptions: [
        { step: 1, action: 'Isolate affected specimen immediately', productName: null, productType: null, dosage: null, frequency: null },
        { step: 2, action: 'Apply appropriate treatment based on pathogen type', productName: 'Mancozeb 80WP', productType: 'fungicide', dosage: '2.5 g/L', frequency: 'Every 7 days' },
      ],
      alternativeDiagnoses: [],
      modelVersion: 'mock-v1',
      providerName: 'mock',
    };
  }
}
