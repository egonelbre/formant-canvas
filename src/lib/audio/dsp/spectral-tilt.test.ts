import { describe, it, expect } from 'vitest';
import { computeTiltCoefficients, applyTiltSample } from './spectral-tilt.ts';

describe('computeTiltCoefficients', () => {
  it('returns a=1, b=0 for tiltDb=0 (passthrough)', () => {
    const { a, b } = computeTiltCoefficients(0, 48000);
    expect(a).toBe(1);
    expect(b).toBe(0);
  });

  it('returns valid coefficients for tiltDb=6 at 48000 sampleRate', () => {
    const { a, b } = computeTiltCoefficients(6, 48000);
    // a and b should be finite numbers
    expect(Number.isFinite(a)).toBe(true);
    expect(Number.isFinite(b)).toBe(true);
    // b should be positive (feedback coefficient)
    expect(b).toBeGreaterThan(0);
    expect(b).toBeLessThan(1);
    // a should be positive and less than 1
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThanOrEqual(1);
  });

  it('produces stronger filtering for higher tiltDb', () => {
    const coeff6 = computeTiltCoefficients(6, 48000);
    const coeff12 = computeTiltCoefficients(12, 48000);
    // Higher tilt = more low-pass = higher b (more feedback)
    expect(coeff12.b).toBeGreaterThan(coeff6.b);
  });

  it('clamps tiltDb to [0, 24] range', () => {
    // Negative tiltDb should be clamped to 0
    const negResult = computeTiltCoefficients(-5, 48000);
    expect(negResult.a).toBe(1);
    expect(negResult.b).toBe(0);

    // Excessive tiltDb should be clamped to 24
    const highResult = computeTiltCoefficients(50, 48000);
    const maxResult = computeTiltCoefficients(24, 48000);
    expect(highResult.a).toBeCloseTo(maxResult.a, 10);
    expect(highResult.b).toBeCloseTo(maxResult.b, 10);
  });

  it('produces no NaN for various valid inputs', () => {
    const sampleRates = [22050, 44100, 48000, 96000];
    const tiltValues = [0, 3, 6, 12, 18, 24];
    for (const sr of sampleRates) {
      for (const tilt of tiltValues) {
        const { a, b } = computeTiltCoefficients(tilt, sr);
        expect(Number.isNaN(a)).toBe(false);
        expect(Number.isNaN(b)).toBe(false);
      }
    }
  });
});

describe('applyTiltSample', () => {
  it('returns input when a=1, b=0 (passthrough)', () => {
    expect(applyTiltSample(0.5, 0, 1, 0)).toBe(0.5);
    expect(applyTiltSample(-0.3, 0, 1, 0)).toBe(-0.3);
    expect(applyTiltSample(1.0, 0.5, 1, 0)).toBe(1.0);
  });

  it('computes a * input + b * prevOutput correctly', () => {
    // a=0.6, b=0.4, input=1.0, prevOutput=0.5
    const result = applyTiltSample(1.0, 0.5, 0.6, 0.4);
    expect(result).toBeCloseTo(0.6 * 1.0 + 0.4 * 0.5, 10);
  });

  it('produces zero output for zero input and zero prevOutput', () => {
    expect(applyTiltSample(0, 0, 0.8, 0.2)).toBe(0);
  });
});
