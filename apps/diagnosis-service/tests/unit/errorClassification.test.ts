import Anthropic from '@anthropic-ai/sdk';
import { isRetryable, errorCode } from '../../src/providers/errorClassification';
import { TimeoutError } from '../../src/utils/withTimeout';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function apiError(status: number, ErrorClass: any = Anthropic.APIError): InstanceType<typeof Anthropic.APIError> {
  return new ErrorClass(status, {}, 'boom', undefined);
}

function connectionError(): InstanceType<typeof Anthropic.APIConnectionError> {
  return new Anthropic.APIConnectionError({ message: 'connection failed' });
}

describe('errorClassification', () => {
  describe('isRetryable', () => {
    it('treats timeouts as retryable', () => {
      expect(isRetryable(new TimeoutError('inference', 45000))).toBe(true);
    });

    it('treats auth errors (401) as non-retryable', () => {
      expect(isRetryable(apiError(401, Anthropic.AuthenticationError))).toBe(false);
    });

    it('treats bad request (400) as non-retryable', () => {
      expect(isRetryable(apiError(400, Anthropic.BadRequestError))).toBe(false);
    });

    it('treats unprocessable entity (422) as non-retryable', () => {
      expect(isRetryable(apiError(422, Anthropic.UnprocessableEntityError))).toBe(false);
    });

    it('treats rate limit (429) as retryable', () => {
      expect(isRetryable(apiError(429, Anthropic.RateLimitError))).toBe(true);
    });

    it('treats 5xx server errors as retryable', () => {
      expect(isRetryable(apiError(500, Anthropic.InternalServerError))).toBe(true);
    });

    it('treats connection errors (no status) as retryable', () => {
      expect(isRetryable(connectionError())).toBe(true);
    });

    it('treats network TypeErrors (fetch failure) as retryable', () => {
      expect(isRetryable(new TypeError('fetch failed'))).toBe(true);
    });

    it('treats unrecognized errors as non-retryable by default', () => {
      expect(isRetryable(new Error('something weird'))).toBe(false);
    });
  });

  describe('errorCode', () => {
    it('maps timeout to AI_PROVIDER_TIMEOUT', () => {
      expect(errorCode(new TimeoutError('inference', 45000))).toBe('AI_PROVIDER_TIMEOUT');
    });

    it('maps 401 to AI_PROVIDER_AUTH_ERROR', () => {
      expect(errorCode(apiError(401, Anthropic.AuthenticationError))).toBe('AI_PROVIDER_AUTH_ERROR');
    });

    it('maps 429 to AI_PROVIDER_RATE_LIMITED', () => {
      expect(errorCode(apiError(429, Anthropic.RateLimitError))).toBe('AI_PROVIDER_RATE_LIMITED');
    });

    it('maps 5xx to AI_PROVIDER_SERVER_ERROR', () => {
      expect(errorCode(apiError(503, Anthropic.InternalServerError))).toBe('AI_PROVIDER_SERVER_ERROR');
    });

    it('maps undefined status to AI_PROVIDER_CONNECTION_ERROR', () => {
      expect(errorCode(connectionError())).toBe('AI_PROVIDER_CONNECTION_ERROR');
    });

    it('maps network TypeError to IMAGE_FETCH_ERROR', () => {
      expect(errorCode(new TypeError('fetch failed'))).toBe('IMAGE_FETCH_ERROR');
    });

    it('maps unparseable-response errors to AI_PROVIDER_BAD_RESPONSE', () => {
      expect(errorCode(new Error('AI provider returned an unparseable response'))).toBe('AI_PROVIDER_BAD_RESPONSE');
    });

    it('maps unrecognized errors to UNKNOWN_ERROR', () => {
      expect(errorCode(new Error('mystery'))).toBe('UNKNOWN_ERROR');
    });
  });
});
