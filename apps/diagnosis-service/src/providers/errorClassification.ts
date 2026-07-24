import Anthropic from '@anthropic-ai/sdk';
import { TimeoutError } from '../utils/withTimeout.js';

// Config/permanent problems (bad key, malformed request, unparseable model output):
// retrying won't help, and hammering a broken config wastes API cost.
const NON_RETRYABLE_STATUS_CODES = new Set([400, 401, 403, 404, 422]);

export function isRetryable(err: unknown): boolean {
  if (err instanceof TimeoutError) return true;
  if (err instanceof Anthropic.APIError) {
    if (err.status === undefined) return true; // connection-level failure
    return !NON_RETRYABLE_STATUS_CODES.has(err.status);
  }
  if (err instanceof TypeError) return true; // fetch() network failure (image download)
  return false;
}

export function errorCode(err: unknown): string {
  if (err instanceof TimeoutError) return 'AI_PROVIDER_TIMEOUT';
  if (err instanceof Anthropic.APIError) {
    switch (err.status) {
      case 401: return 'AI_PROVIDER_AUTH_ERROR';
      case 400: return 'AI_PROVIDER_BAD_REQUEST';
      case 422: return 'AI_PROVIDER_UNPROCESSABLE';
      case 429: return 'AI_PROVIDER_RATE_LIMITED';
      default:
        if (err.status === undefined) return 'AI_PROVIDER_CONNECTION_ERROR';
        if (err.status >= 500) return 'AI_PROVIDER_SERVER_ERROR';
        return 'AI_PROVIDER_ERROR';
    }
  }
  if (err instanceof TypeError) return 'IMAGE_FETCH_ERROR';
  if (err instanceof Error && err.message.includes('unparseable')) return 'AI_PROVIDER_BAD_RESPONSE';
  return 'UNKNOWN_ERROR';
}
