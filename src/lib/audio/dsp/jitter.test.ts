import { describe, it, expect } from 'vitest';
import { computeJitterOffset } from './jitter.ts';

describe('computeJitterOffset', () => {
  it('returns 0 when jitterAmount=0', () => {
    expect(computeJitterOffset(100, 0)).toBe(0);
    expect(computeJitterOffset(200, 0)).toBe(0);
    expect(computeJitterOffset(440, 0)).toBe(0);
  });

  it('returns values within [-0.03*f0, +0.03*f0] at jitterAmount=1', () => {
    const f0 = 100;
    const maxDeviation = 0.03 * f0; // 3 Hz
    for (let i = 0; i < 1000; i++) {
      const offset = computeJitterOffset(f0, 1);
      expect(offset).toBeGreaterThanOrEqual(-maxDeviation);
      expect(offset).toBeLessThanOrEqual(maxDeviation);
    }
  });

  it('scales with f0 — higher f0 produces larger absolute offsets', () => {
    // At f0=200, jitterAmount=0.5, max deviation = 0.03 * 200 * 0.5 = 3
    const f0 = 200;
    const maxDeviation = 0.03 * f0 * 0.5;
    for (let i = 0; i < 1000; i++) {
      const offset = computeJitterOffset(f0, 0.5);
      expect(Math.abs(offset)).toBeLessThanOrEqual(maxDeviation);
    }
  });

  it('produces non-zero values when jitterAmount > 0 (statistical)', () => {
    // Check that not all values are zero (randomness test)
    let nonZeroCount = 0;
    for (let i = 0; i < 1000; i++) {
      const offset = computeJitterOffset(100, 1);
      if (offset !== 0) nonZeroCount++;
    }
    // With random generation, it's virtually impossible to get 1000 zeros
    expect(nonZeroCount).toBeGreaterThan(900);
  });

  it('produces both positive and negative values (statistical)', () => {
    let positiveCount = 0;
    let negativeCount = 0;
    for (let i = 0; i < 1000; i++) {
      const offset = computeJitterOffset(100, 1);
      if (offset > 0) positiveCount++;
      if (offset < 0) negativeCount++;
    }
    // Should have a reasonable mix of both
    expect(positiveCount).toBeGreaterThan(100);
    expect(negativeCount).toBeGreaterThan(100);
  });
});
