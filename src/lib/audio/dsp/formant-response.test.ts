import { describe, it, expect } from 'vitest';
import { formantMagnitude, spectralEnvelope, cascadeEnvelope, topologyAwareEnvelope, FOURTH_ORDER_BW_FACTOR } from './formant-response.ts';
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

describe('cascadeEnvelope', () => {
  const f1: FormantParams = { freq: 500, bw: 100, gain: 1.0 };
  const f2: FormantParams = { freq: 1500, bw: 120, gain: 0.7 };

  it('returns 1.0 for single formant at center freq (shape-only, gain=1)', () => {
    expect(cascadeEnvelope(500, [f1])).toBeCloseTo(1.0, 6);
  });

  it('returns product of shape magnitudes for two formants', () => {
    const result = cascadeEnvelope(500, [f1, f2]);
    const expectedF2Mag = 1 / Math.sqrt(1 + ((500 - 1500) / 60) ** 2);
    expect(result).toBeCloseTo(1.0 * expectedF2Mag, 4);
  });

  it('returns 1 for empty formants (multiplicative identity)', () => {
    expect(cascadeEnvelope(500, [])).toBe(1);
  });

  it('returns 1.0 for order=4 single formant at center', () => {
    expect(cascadeEnvelope(500, [f1], 4)).toBeCloseTo(1.0, 6);
  });

  it('squares magnitude for order=4 at half-bandwidth offset (compensated BW)', () => {
    // With BW compensation: effectiveBW = 100 * FOURTH_ORDER_BW_FACTOR
    // At 550 Hz (50 Hz from center): halfBW = effectiveBW/2, x = 50/halfBW
    // mag = 1/sqrt(1+x^2), result = mag^2
    const halfBW = (100 * FOURTH_ORDER_BW_FACTOR) / 2;
    const x = 50 / halfBW;
    const mag = 1 / Math.sqrt(1 + x * x);
    expect(cascadeEnvelope(550, [f1], 4)).toBeCloseTo(mag * mag, 4);
  });

  it('cascade product < parallel sum between formant centers', () => {
    const freq = 1000;
    const formants: FormantParams[] = [
      { freq: 500, bw: 100, gain: 1.0 },
      { freq: 1500, bw: 120, gain: 1.0 },
    ];
    const cascade = cascadeEnvelope(freq, formants);
    const parallel = spectralEnvelope(freq, formants);
    expect(cascade).toBeLessThan(parallel);
  });
});

describe('topologyAwareEnvelope', () => {
  const f1: FormantParams = { freq: 500, bw: 100, gain: 1.0 };
  const f2: FormantParams = { freq: 1500, bw: 120, gain: 0.7 };
  const formants = [f1, f2];

  it('parallel topology matches spectralEnvelope for same inputs', () => {
    const freq = 800;
    const topo = topologyAwareEnvelope(freq, formants, 'parallel');
    const ref = spectralEnvelope(freq, formants);
    expect(topo).toBeCloseTo(ref, 6);
  });

  it('cascade topology matches cascadeEnvelope for same inputs', () => {
    const freq = 800;
    const topo = topologyAwareEnvelope(freq, formants, 'cascade');
    const ref = cascadeEnvelope(freq, formants);
    expect(topo).toBeCloseTo(ref, 6);
  });

  it('parallel order=4 uses compensated BW and squares magnitudes', () => {
    // Same compensation as cascadeEnvelope order=4 test
    const halfBW = (100 * FOURTH_ORDER_BW_FACTOR) / 2;
    const x = 50 / halfBW;
    const mag = f1.gain / Math.sqrt(1 + x * x);
    const result = topologyAwareEnvelope(550, [f1], 'parallel', 4);
    expect(result).toBeCloseTo(mag * mag, 4);
  });
});
