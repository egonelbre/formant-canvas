import { describe, it, expect } from 'vitest';
import {
  rdToDecomposition,
  computeLfParams,
  lfDerivativeSample,
  solveEpsilon,
  solveAlpha,
  type LfParams,
  type RdDecomposition,
} from './lf-model.ts';

describe('rdToDecomposition', () => {
  it('produces valid values for Rd=1.0 (modal voice) at f0=120', () => {
    const d = rdToDecomposition(1.0, 120);
    const T0 = 1 / 120;

    // Ra = (-1 + 4.8 * 1.0) / 100 = 0.038
    expect(d.Ra).toBeCloseTo(0.038, 4);
    // Rk = (22.4 + 11.8 * 1.0) / 100 = 0.342
    expect(d.Rk).toBeCloseTo(0.342, 4);
    // Rg should be in reasonable range [0.8, 1.5]
    expect(d.Rg).toBeGreaterThan(0.8);
    expect(d.Rg).toBeLessThan(1.5);

    // Timing values should be positive and within T0
    expect(d.Tp).toBeGreaterThan(0);
    expect(d.Te).toBeGreaterThan(d.Tp);
    expect(d.Te).toBeLessThan(T0);
    expect(d.Ta).toBeGreaterThan(0);
    expect(d.Tc).toBeCloseTo(T0, 10);
  });

  it('produces pressed voice values for Rd=0.3', () => {
    const d = rdToDecomposition(0.3, 120);
    // Ra = (-1 + 4.8 * 0.3) / 100 = 0.0044
    expect(d.Ra).toBeLessThan(0.01);
    expect(d.Ra).toBeGreaterThan(0);
  });

  it('produces breathy voice values for Rd=2.7', () => {
    const d = rdToDecomposition(2.7, 120);
    // Ra = (-1 + 4.8 * 2.7) / 100 = 0.1196
    expect(d.Ra).toBeGreaterThan(0.1);
  });

  it('Ra increases monotonically as Rd increases from 0.3 to 2.7', () => {
    let prevRa = -Infinity;
    for (let rd = 0.3; rd <= 2.7; rd += 0.1) {
      const d = rdToDecomposition(rd, 120);
      expect(d.Ra).toBeGreaterThan(prevRa);
      prevRa = d.Ra;
    }
  });

  it('Rk increases monotonically as Rd increases from 0.3 to 2.7', () => {
    let prevRk = -Infinity;
    for (let rd = 0.3; rd <= 2.7; rd += 0.1) {
      const d = rdToDecomposition(rd, 120);
      expect(d.Rk).toBeGreaterThan(prevRk);
      prevRk = d.Rk;
    }
  });

  it('clamps Rd below 0.3', () => {
    const d = rdToDecomposition(0.1, 120);
    const dClamped = rdToDecomposition(0.3, 120);
    expect(d.Ra).toBeCloseTo(dClamped.Ra, 10);
  });

  it('clamps Rd above 2.7', () => {
    const d = rdToDecomposition(5.0, 120);
    const dClamped = rdToDecomposition(2.7, 120);
    expect(d.Ra).toBeCloseTo(dClamped.Ra, 10);
  });
});

describe('solveEpsilon', () => {
  it('returns a positive finite value for typical parameters', () => {
    const T0 = 1 / 120;
    const d = rdToDecomposition(1.0, 120);
    const Tb = T0 - d.Te;
    const eps = solveEpsilon(d.Ta, Tb);
    expect(eps).toBeGreaterThan(0);
    expect(Number.isFinite(eps)).toBe(true);
  });

  it('satisfies the epsilon equation: epsilon*Ta = 1 - exp(-epsilon*Tb)', () => {
    const T0 = 1 / 120;
    const d = rdToDecomposition(1.0, 120);
    const Tb = T0 - d.Te;
    const eps = solveEpsilon(d.Ta, Tb);
    const lhs = eps * d.Ta;
    const rhs = 1 - Math.exp(-eps * Tb);
    expect(lhs).toBeCloseTo(rhs, 6);
  });
});

describe('solveAlpha', () => {
  it('returns a finite value for typical parameters', () => {
    const d = rdToDecomposition(1.0, 120);
    const T0 = 1 / 120;
    const Tb = T0 - d.Te;
    const eps = solveEpsilon(d.Ta, Tb);
    const alpha = solveAlpha(d.Tp, d.Te, eps, d.Ta, T0);
    expect(Number.isFinite(alpha)).toBe(true);
  });
});

describe('computeLfParams', () => {
  it('produces valid params for Rd=1.0 at f0=120', () => {
    const p = computeLfParams(1.0, 120);
    expect(Number.isFinite(p.alpha)).toBe(true);
    expect(Number.isFinite(p.epsilon)).toBe(true);
    expect(Number.isFinite(p.E0)).toBe(true);
    expect(p.Ee).toBe(1.0);
    expect(p.Tp).toBeGreaterThan(0);
    expect(p.Te).toBeGreaterThan(p.Tp);
    expect(p.T0).toBeCloseTo(1 / 120, 10);
  });

  it('produces no NaN or Infinity for all Rd in [0.3, 2.7] at 0.1 steps', () => {
    for (let rd = 0.3; rd <= 2.7; rd += 0.1) {
      const p = computeLfParams(rd, 120);
      expect(Number.isFinite(p.alpha)).toBe(true);
      expect(Number.isFinite(p.epsilon)).toBe(true);
      expect(Number.isFinite(p.E0)).toBe(true);
      expect(Number.isNaN(p.alpha)).toBe(false);
      expect(Number.isNaN(p.epsilon)).toBe(false);
      expect(Number.isNaN(p.E0)).toBe(false);
    }
  });

  it('produces valid params at different f0 values', () => {
    for (const f0 of [80, 120, 200, 440]) {
      const p = computeLfParams(1.0, f0);
      expect(Number.isFinite(p.alpha)).toBe(true);
      expect(Number.isFinite(p.epsilon)).toBe(true);
      expect(Number.isFinite(p.E0)).toBe(true);
    }
  });
});

describe('lfDerivativeSample', () => {
  it('returns 0 at t=0', () => {
    const p = computeLfParams(1.0, 120);
    expect(lfDerivativeSample(0, p)).toBeCloseTo(0, 6);
  });

  it('returns positive values in open phase (0 < t < Te)', () => {
    const p = computeLfParams(1.0, 120);
    // Sample at middle of open phase
    const tMid = p.Tp / 2;
    expect(lfDerivativeSample(tMid, p)).toBeGreaterThan(0);
  });

  it('returns negative values at and just after Te (return phase)', () => {
    const p = computeLfParams(1.0, 120);
    const tReturn = p.Te + p.Ta / 2;
    if (tReturn < p.T0) {
      expect(lfDerivativeSample(tReturn, p)).toBeLessThanOrEqual(0);
    }
  });

  it('returns 0 in closed phase', () => {
    const p = computeLfParams(1.0, 120);
    // Well past Te + return phase
    const tClosed = p.T0 * 0.99;
    // For Rd=1.0, closed phase might be very short, so only check if t > Te significantly
    if (tClosed > p.Te + 3 * p.Ta) {
      expect(Math.abs(lfDerivativeSample(tClosed, p))).toBeLessThan(0.01);
    }
  });

  it('satisfies zero-net-flow constraint (integral over one period ~= 0)', () => {
    const p = computeLfParams(1.0, 120);
    const N = 4096;
    const dt = p.T0 / N;
    let sum = 0;
    let peakAbs = 0;
    for (let i = 0; i < N; i++) {
      const t = i * dt;
      const s = lfDerivativeSample(t, p);
      sum += s * dt;
      if (Math.abs(s) > peakAbs) peakAbs = Math.abs(s);
    }
    // The integral should be near zero; tolerance 1% of peak * T0
    expect(Math.abs(sum)).toBeLessThan(0.01 * peakAbs * p.T0);
  });

  it('waveform has correct piecewise shape across one period', () => {
    const p = computeLfParams(1.0, 120);
    const N = 1024;
    let hasPositive = false;
    let hasNegative = false;

    for (let i = 0; i < N; i++) {
      const t = (i / N) * p.T0;
      const s = lfDerivativeSample(t, p);
      expect(Number.isFinite(s)).toBe(true);
      if (s > 0.001) hasPositive = true;
      if (s < -0.001) hasNegative = true;
    }
    // LF derivative should have both positive and negative portions
    expect(hasPositive).toBe(true);
    expect(hasNegative).toBe(true);
  });

  it('generates no NaN across full Rd range', () => {
    for (let rd = 0.3; rd <= 2.7; rd += 0.3) {
      const p = computeLfParams(rd, 120);
      for (let i = 0; i < 128; i++) {
        const t = (i / 128) * p.T0;
        const s = lfDerivativeSample(t, p);
        expect(Number.isNaN(s)).toBe(false);
        expect(Number.isFinite(s)).toBe(true);
      }
    }
  });
});
