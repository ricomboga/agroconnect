import { config } from '../config.js';
import { ClaudeVisionProvider } from './claude.js';
import { GoogleVisionProvider } from './googleVision.js';
import { MockProvider } from './mock.js';
import type { InferenceProvider } from './types.js';

export function getProvider(): InferenceProvider {
  switch (config.inferenceProvider) {
    case 'claude':
      return new ClaudeVisionProvider();
    case 'google-vision':
      return new GoogleVisionProvider();
    case 'mock':
      return new MockProvider();
    default:
      throw new Error(`Unknown INFERENCE_PROVIDER: ${config.inferenceProvider as string}`);
  }
}

export type { InferenceProvider, InferenceParams, InferenceResult, Prescription, AlternativeDiagnosis } from './types.js';
