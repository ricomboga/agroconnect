import { confidenceTier } from '../../src/utils/confidenceTier';

// tests/setup.ts sets MIN_CONFIDENCE=0.60, CONFIDENCE_HIGH_THRESHOLD=0.80
describe('confidenceTier', () => {
  it('returns "high" at and above the high threshold', () => {
    expect(confidenceTier(0.8)).toBe('high');
    expect(confidenceTier(1)).toBe('high');
  });

  it('returns "medium" just below the high threshold', () => {
    expect(confidenceTier(0.79999)).toBe('medium');
  });

  it('returns "medium" at the min-confidence boundary', () => {
    expect(confidenceTier(0.6)).toBe('medium');
  });

  it('returns "low" just below the min-confidence boundary', () => {
    expect(confidenceTier(0.599)).toBe('low');
  });

  it('returns "low" at the extreme (0)', () => {
    expect(confidenceTier(0)).toBe('low');
  });
});
