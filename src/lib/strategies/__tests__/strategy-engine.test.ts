import { describe, it, expect } from 'vitest';
import { computeTargets } from '../engine';
import { R1_STRATEGIES, R2_STRATEGIES, R1_LIST, R2_LIST } from '../definitions';

describe('computeTargets', () => {
  it('all null returns all targets null', () => {
    const result = computeTargets(null, null, false, 200, 'baritone');
    expect(result.targets.f1).toBeNull();
    expect(result.targets.f2).toBeNull();
    expect(result.targets.f3).toBeNull();
    expect(result.targets.f4).toBeNull();
    expect(result.targets.f5).toBeNull();
    expect(result.inRange).toBe(true);
    expect(result.clamped).toBe(false);
  });

  // R1 strategies
  it('r1-f0 at 440 Hz returns f1=440', () => {
    const result = computeTargets('r1-f0', null, false, 440, 'soprano');
    expect(result.targets.f1).toBe(440);
    expect(result.targets.f2).toBeNull();
    expect(result.inRange).toBe(true);
    expect(result.clamped).toBe(false);
  });

  it('r1-2f0 at 300 Hz returns f1=600', () => {
    const result = computeTargets('r1-2f0', null, false, 300, 'tenor');
    expect(result.targets.f1).toBe(600);
    expect(result.inRange).toBe(true);
    expect(result.clamped).toBe(false);
  });

  it('r1-3f0 at 100 Hz returns f1=300', () => {
    const result = computeTargets('r1-3f0', null, false, 100, 'bass');
    expect(result.targets.f1).toBe(300);
    expect(result.inRange).toBe(true);
    expect(result.clamped).toBe(false);
  });

  // R2 strategies
  it('r2-2f0 at 400 Hz returns f2=800', () => {
    const result = computeTargets(null, 'r2-2f0', false, 400, 'soprano');
    expect(result.targets.f2).toBe(800);
    expect(result.targets.f1).toBeNull();
    expect(result.inRange).toBe(true);
    expect(result.clamped).toBe(false);
  });

  it('r2-3f0 at 300 Hz returns f2=900', () => {
    const result = computeTargets(null, 'r2-3f0', false, 300, 'tenor');
    expect(result.targets.f2).toBe(900);
    expect(result.targets.f1).toBeNull();
    expect(result.inRange).toBe(true);
    expect(result.clamped).toBe(false);
  });

  // Combined R1 + R2
  it('r1-f0 + r2-2f0 at 400 Hz returns both f1=400 and f2=800', () => {
    const result = computeTargets('r1-f0', 'r2-2f0', false, 400, 'soprano');
    expect(result.targets.f1).toBe(400);
    expect(result.targets.f2).toBe(800);
    expect(result.inRange).toBe(true);
    expect(result.clamped).toBe(false);
  });

  // Singer's formant
  it('singer formant at 200 Hz bass returns f3/f4/f5 cluster', () => {
    const result = computeTargets(null, null, true, 200, 'bass');
    expect(result.targets.f3).toBe(2184);
    expect(result.targets.f4).toBe(2384);
    expect(result.targets.f5).toBe(2684);
    expect(result.targets.f1).toBeNull();
    expect(result.targets.f2).toBeNull();
    expect(result.inRange).toBe(true);
  });

  it('singer formant at 200 Hz tenor returns higher cluster', () => {
    const result = computeTargets(null, null, true, 200, 'tenor');
    expect(result.targets.f3).toBe(2505);
    expect(result.targets.f4).toBe(2705);
    expect(result.targets.f5).toBe(3005);
  });

  // Combined: R1 + singer's formant
  it('r1-2f0 + singer formant at 200 Hz bass returns f1 + cluster', () => {
    const result = computeTargets('r1-2f0', null, true, 200, 'bass');
    expect(result.targets.f1).toBe(400);
    expect(result.targets.f3).toBe(2184);
    expect(result.targets.f4).toBe(2384);
    expect(result.targets.f5).toBe(2684);
  });

  // Clamping tests
  it('r1-f0 at f0=1200 Hz returns clamped=true, f1=1000', () => {
    const result = computeTargets('r1-f0', null, false, 1200, 'soprano');
    expect(result.targets.f1).toBe(1000);
    expect(result.clamped).toBe(true);
  });

  it('r1-2f0 at f0=600 Hz returns f1=1000 (clamped)', () => {
    const result = computeTargets('r1-2f0', null, false, 600, 'tenor');
    expect(result.targets.f1).toBe(1000);
    expect(result.clamped).toBe(true);
  });

  it('singer formant at f0=700 Hz returns inRange=false', () => {
    const result = computeTargets(null, null, true, 700, 'bass');
    expect(result.inRange).toBe(false);
  });
});

describe('strategy definitions', () => {
  it('all R1 strategies have notation and description', () => {
    for (const id of R1_LIST) {
      const def = R1_STRATEGIES[id];
      expect(def.notation.length).toBeGreaterThan(0);
      expect(def.description.length).toBeGreaterThan(0);
    }
  });

  it('all R2 strategies have notation and description', () => {
    for (const id of R2_LIST) {
      const def = R2_STRATEGIES[id];
      expect(def.notation.length).toBeGreaterThan(0);
      expect(def.description.length).toBeGreaterThan(0);
    }
  });
});
