/**
 * Google Vision AI provider stub.
 *
 * To activate:
 *   1. npm install @google-cloud/vision
 *   2. Set INFERENCE_PROVIDER=google-vision in .env
 *   3. Set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   4. Implement analyze() below using the Vision API label detection
 *      and map labels to DISEASE_TAXONOMY entries.
 *
 * The interface is identical to ClaudeVisionProvider — swap by env var only.
 */
import type { InferenceProvider, InferenceParams, InferenceResult } from './types.js';

export class GoogleVisionProvider implements InferenceProvider {
  readonly name = 'google-vision';

  async analyze(_params: InferenceParams): Promise<InferenceResult> {
    throw new Error(
      'GoogleVisionProvider is not yet implemented. ' +
      'Set INFERENCE_PROVIDER=claude to use the Claude Vision provider.',
    );
  }
}
