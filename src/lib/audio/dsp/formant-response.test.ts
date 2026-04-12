import { describe, it, expect } from 'vitest';
import { formantMagnitude, spectralEnvelope } from './formant-response.ts';
import type { FormantParams } from '../../types.ts';

describe('formantMagnitude', () => {
  const formant: FormantParams = { freq: 500, bw: 100, gain: 1.0 };

  it('returns gain at center frequency', () => {
    expect(formantMagnitude(500, formant)).toBe(1.0);
  });

  it('returns approximately 1/sqrt(2) at half-bandwidth offset (-3dB point)', () => {
    const result = formantMagnitude(550, formant);
    expect(result).toBeCloseTo(1 / Math.sqrt(2), 4);
  });

  it('returns near zero far from center', () => {
    const result = formantMagnitude(5000, formant);
    expect(result).toBeLessThan(0.02);
  });

  it('returns 0 when gain is 0', () => {
    expect(formantMagnitude(500, { freq: 500, bw: 100, gain: 0 })).toBe(0);
  });

  it('scales linearly with gain', () => {
    expect(formantMagnitude(500, { freq: 500, bw: 100, gain: 0.7 })).toBeCloseTo(0.7, 4);
  });

  it('is symmetric around center frequency', () => {
    const below = formantMagnitude(450, formant);
    const above = formantMagnitude(550, formant);
    expect(below).toBeCloseTo(above, 6);
  });
});

describe('spectralEnvelope', () => {
  const f1: FormantParams = { freq: 500, bw: 100, gain: 1.0 };
  const f2: FormantParams = { freq: 1500, bw: 120, gain: 0.7 };

  it('equals formantMagnitude for a single formant', () => {
    const envelope = spectralEnvelope(500, [f1]);
    const single = formantMagnitude(500, f1);
    expect(envelope).toBe(single);
  });

  it('sums contributions from multiple formants', () => {
    const envelope = spectralEnvelope(500, [f1, f2]);
    const singleF1 = formantMagnitude(500, f1);
    expect(envelope).toBeGreaterThan(singleF1);
  });

  it('returns 0 for empty formants array', () => {
    expect(spectralEnvelope(500, [])).toBe(0);
  });

  it('peaks near each formant center', () => {
    const atF1 = spectralEnvelope(500, [f1, f2]);
    const atF2 = spectralEnvelope(1500, [f1, f2]);
    const between = spectralEnvelope(1000, [f1, f2]);
    expect(atF1).toBeGreaterThan(between);
    expect(atF2).toBeGreaterThan(between);
  });
});
