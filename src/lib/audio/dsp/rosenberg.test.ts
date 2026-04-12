import { describe, it, expect } from 'vitest';
import { rosenbergSample } from './rosenberg.ts';

describe('rosenbergSample', () => {
  it('returns 0 at phase=0 (start of open phase)', () => {
    expect(rosenbergSample(0.0, 0.6)).toBe(0);
  });

  it('returns value near 0.5 at half of rising phase (phase=0.12)', () => {
    // phase=0.12, Tp=0.24, so this is exactly halfway through rising phase
    // 0.5 * (1 - cos(pi * 0.12/0.24)) = 0.5 * (1 - cos(pi/2)) = 0.5
    const value = rosenbergSample(0.12, 0.6);
    expect(value).toBeCloseTo(0.5, 5);
  });

  it('returns 1.0 at peak (phase=Tp=0.24)', () => {
    // Tp = 0.4 * 0.6 = 0.24
    expect(rosenbergSample(0.24, 0.6)).toBeCloseTo(1.0, 5);
  });

  it('returns value in closing phase between 0 and 1 (phase=0.5)', () => {
    // phase=0.5 is in closing phase (Tp=0.24, Tn=0.6)
    // closingPhase = (0.5 - 0.24) / (0.6 - 0.24) = 0.722...
    // cos(pi/2 * 0.722) = ~0.423
    const value = rosenbergSample(0.5, 0.6);
    expect(value).toBeGreaterThan(0.0);
    expect(value).toBeLessThan(1.0);
    expect(value).toBeCloseTo(0.4226, 3);
  });

  it('returns 0 in closed phase (phase=0.7, past Tn=0.6)', () => {
    expect(rosenbergSample(0.7, 0.6)).toBe(0);
  });

  it('returns 0 in closed phase (phase=0.99)', () => {
    expect(rosenbergSample(0.99, 0.6)).toBe(0);
  });

  it('generates 128 samples with no NaN or Infinity', () => {
    for (let i = 0; i < 128; i++) {
      const phase = i / 128;
      const sample = rosenbergSample(phase, 0.6);
      expect(Number.isFinite(sample)).toBe(true);
      expect(Number.isNaN(sample)).toBe(false);
    }
  });

  it('returns 0 for negative phase', () => {
    expect(rosenbergSample(-0.1, 0.6)).toBe(0);
  });

  it('returns 0 for phase >= 1', () => {
    expect(rosenbergSample(1.0, 0.6)).toBe(0);
    expect(rosenbergSample(1.5, 0.6)).toBe(0);
  });

  it('changes open phase duration with different openQuotient', () => {
    // With OQ=0.4, Tn=0.4, so phase=0.5 should be in closed phase
    expect(rosenbergSample(0.5, 0.4)).toBe(0);
    // With OQ=0.8, Tn=0.8, so phase=0.5 should still be in open/closing phase
    expect(rosenbergSample(0.5, 0.8)).toBeGreaterThan(0);
  });
});
