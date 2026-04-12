import { describe, it, expect } from 'vitest';
import { vibratoModulation, advanceVibratoPhase } from './vibrato.ts';

describe('vibratoModulation', () => {
  it('returns 1.0 at phase=0 (no modulation)', () => {
    expect(vibratoModulation(0, 100)).toBe(1.0);
  });

  it('returns 1.0 when extentCents=0 regardless of phase', () => {
    expect(vibratoModulation(0, 0)).toBe(1.0);
    expect(vibratoModulation(0.25, 0)).toBe(1.0);
    expect(vibratoModulation(0.5, 0)).toBe(1.0);
    expect(vibratoModulation(0.75, 0)).toBe(1.0);
  });

  it('returns 2^(extentCents/1200) at phase=0.25 (peak of sine)', () => {
    const result = vibratoModulation(0.25, 100);
    const expected = Math.pow(2, 100 / 1200);
    expect(result).toBeCloseTo(expected, 10);
  });

  it('returns 2^(-extentCents/1200) at phase=0.75 (trough of sine)', () => {
    const result = vibratoModulation(0.75, 100);
    const expected = Math.pow(2, -100 / 1200);
    expect(result).toBeCloseTo(expected, 10);
  });

  it('returns approximately 1.05946 at peak with extentCents=100 (one semitone)', () => {
    const result = vibratoModulation(0.25, 100);
    expect(result).toBeCloseTo(1.05946, 4);
  });

  it('returns 1.0 at phase=0.5 (zero crossing of sine)', () => {
    const result = vibratoModulation(0.5, 100);
    expect(result).toBeCloseTo(1.0, 10);
  });

  it('produces symmetric modulation (peak * trough = 1.0)', () => {
    const peak = vibratoModulation(0.25, 50);
    const trough = vibratoModulation(0.75, 50);
    expect(peak * trough).toBeCloseTo(1.0, 10);
  });

  it('generates 128 samples with no NaN or Infinity', () => {
    for (let i = 0; i < 128; i++) {
      const phase = i / 128;
      const sample = vibratoModulation(phase, 100);
      expect(Number.isFinite(sample)).toBe(true);
      expect(sample).toBeGreaterThan(0);
    }
  });
});

describe('advanceVibratoPhase', () => {
  it('advances phase by rate/sampleRate per sample', () => {
    // At 5 Hz rate, 48000 sampleRate, advance = 5/48000
    const result = advanceVibratoPhase(0, 5, 48000);
    expect(result).toBeCloseTo(5 / 48000, 10);
  });

  it('wraps phase at 1.0', () => {
    const result = advanceVibratoPhase(0.9999, 5, 48000);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(1);
  });

  it('wraps correctly when phase exceeds 1.0', () => {
    // Start just below 1.0, advance should wrap
    const result = advanceVibratoPhase(0.999, 100, 48000);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(1);
  });

  it('returns 0 when rate is 0', () => {
    const result = advanceVibratoPhase(0, 0, 48000);
    expect(result).toBe(0);
  });
});
