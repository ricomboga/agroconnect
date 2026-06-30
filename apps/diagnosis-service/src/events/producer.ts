import type { Producer } from '@agroconnect/kafka';
import type { InferenceResult } from '../providers/types.js';
import { logger } from '../logger.js';

const TOPIC = 'diagnosis.completed';

export interface DiagnosisCompletedPayload {
  diagnosis_id: string;
  farm_id: string;
  farmer_id: string;
  subject_type: string;
  subject_name: string;
  disease_code: string;
  disease_name: string;
  confidence: number;
  severity: string;
  status: 'completed';
  occurred_at: string;
}

export async function publishCompleted(
  producer: Producer,
  params: {
    diagnosisId: string;
    farmId: string;
    farmerId: string;
    subjectType: string;
    subjectName: string;
    result: InferenceResult;
  },
): Promise<void> {
  const payload: DiagnosisCompletedPayload = {
    diagnosis_id: params.diagnosisId,
    farm_id: params.farmId,
    farmer_id: params.farmerId,
    subject_type: params.subjectType,
    subject_name: params.subjectName,
    disease_code: params.result.diseaseCode,
    disease_name: params.result.diseaseName,
    confidence: params.result.confidence,
    severity: params.result.severity,
    status: 'completed',
    occurred_at: new Date().toISOString(),
  };

  await producer.send({
    topic: TOPIC,
    messages: [{ key: params.diagnosisId, value: JSON.stringify(payload) }],
  });

  logger.info({ diagnosisId: params.diagnosisId, topic: TOPIC }, 'diagnosis.completed published');
}
