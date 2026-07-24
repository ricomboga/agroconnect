import { config } from '../config.js';

export type ConfidenceTier = 'high' | 'medium' | 'low';

export function confidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= config.confidenceHighThreshold) return 'high';
  if (confidence >= config.minConfidence) return 'medium';
  return 'low';
}
