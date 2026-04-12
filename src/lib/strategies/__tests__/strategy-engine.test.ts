import { describe, it, expect } from 'vitest';
import { computeTargets } from '../engine';
import { STRATEGY_DEFINITIONS, STRATEGY_PRESETS } from '../definitions';
import type { StrategyId } from '../types';

describe('computeTargets', () => {
  it('speech strategy returns all targets null and inRange=true', () => {
    const result = computeTargets('speech', 200, 'baritone');
    expect(result.targets.f1).toBeNull();
    expect(result.targets.f2).toBeNull();
    expect(result.targets.f3).toBeNull();
    expect(result.targets.f4).toBeNull();
    expect(result.targets.f5).toBeNull();
    expect(result.inRange).toBe(true);
    expect(result.clamped).toBe(false);
  });

  it('r1-f0 at 440 Hz soprano returns f1=440, inRange=true', () => {
    const result = computeTargets('r1-f0', 440, 'soprano');
    expect(result.targets.f1).toBe(440);
    expect(result.targets.f2).toBeNull();
    expect(result.inRange).toBe(true);
    expect(result.clamped).toBe(false);
  });

  it('r1-2f0 at 300 Hz tenor returns f1=600, inRange=true', () => {
    const result = computeTargets('r1-2f0', 300, 'tenor');
    expect(result.targets.f1).toBe(600);
    expect(result.inRange).toBe(true);
    expect(result.clamped).toBe(false);
  });

  it('r1-3f0 at 100 Hz bass returns f1=300, inRange=true', () => {
    const result = computeTargets('r1-3f0', 100, 'bass');
    expect(result.targets.f1).toBe(300);
    expect(result.inRange).toBe(true);
    expect(result.clamped).toBe(false);
  });

  it('r2-2f0 at 400 Hz soprano returns f2=800, inRange=true', () => {
    const result = computeTargets('r2-2f0', 400, 'soprano');
    expect(result.targets.f2).toBe(800);
    expect(result.targets.f1).toBeNull();
    expect(result.inRange).toBe(true);
    expect(result.clamped).toBe(false);
  });

  it('r2-3f0 at 300 Hz tenor returns f2=900, inRange=true', () => {
    const result = computeTargets('r2-3f0', 300, 'tenor');
    expect(result.targets.f2).toBe(900);
    expect(result.targets.f1).toBeNull();
    expect(result.inRange).toBe(true);
    expect(result.clamped).toBe(false);
  });

  it('singer-formant at 200 Hz bass returns f3~2184, f4~2384, f5~2684', () => {
    const result = computeTargets('singer-formant', 200, 'bass');
    expect(result.targets.f3).toBe(2184);
    expect(result.targets.f4).toBe(2384);
    expect(result.targets.f5).toBe(2684);
    expect(result.targets.f1).toBeNull();
    expect(result.targets.f2).toBeNull();
    expect(result.inRange).toBe(true);
    expect(result.clamped).toBe(false);
  });

  it('singer-formant at 200 Hz tenor returns f3~2505, f4~2705, f5~3005', () => {
    const result = computeTargets('singer-formant', 200, 'tenor');
    expect(result.targets.f3).toBe(2505);
    expect(result.targets.f4).toBe(2705);
    expect(result.targets.f5).toBe(3005);
  });

  // Clamping tests
  it('r1-f0 at f0=1200 Hz returns clamped=true, f1=1000 (F1_MAX)', () => {
    const result = computeTargets('r1-f0', 1200, 'soprano');
    expect(result.targets.f1).toBe(1000);
    expect(result.clamped).toBe(true);
  });

  it('r1-2f0 at f0=600 Hz returns f1=1000 (clamped at F1_MAX)', () => {
    const result = computeTargets('r1-2f0', 600, 'tenor');
    expect(result.targets.f1).toBe(1000);
    expect(result.clamped).toBe(true);
  });

  it('r1-3f0 at f0=400 Hz returns f1=1000 (clamped at F1_MAX)', () => {
    const result = computeTargets('r1-3f0', 400, 'bass');
    expect(result.targets.f1).toBe(1000);
    expect(result.clamped).toBe(true);
  });

  it('singer-formant at f0=700 Hz returns inRange=false, clamped=true', () => {
    const result = computeTargets('singer-formant', 700, 'bass');
    expect(result.inRange).toBe(false);
    expect(result.clamped).toBe(true);
  });
});

describe('STRATEGY_DEFINITIONS', () => {
  it('every StrategyId has non-empty notation and description', () => {
    const ids: StrategyId[] = ['speech', 'r1-f0', 'r1-2f0', 'r1-3f0', 'r2-2f0', 'r2-3f0', 'singer-formant'];
    for (const id of ids) {
      const def = STRATEGY_DEFINITIONS[id];
      expect(def, `Missing definition for ${id}`).toBeDefined();
      expect(def.notation.length, `Empty notation for ${id}`).toBeGreaterThan(0);
      expect(def.description.length, `Empty description for ${id}`).toBeGreaterThan(0);
    }
  });
});

describe('STRATEGY_PRESETS', () => {
  it('has at least 7 entries', () => {
    expect(STRATEGY_PRESETS.length).toBeGreaterThanOrEqual(7);
  });

  it('each entry has an id that matches a valid StrategyId', () => {
    const validIds: StrategyId[] = ['speech', 'r1-f0', 'r1-2f0', 'r1-3f0', 'r2-2f0', 'r2-3f0', 'singer-formant'];
    for (const preset of STRATEGY_PRESETS) {
      expect(validIds).toContain(preset.id);
    }
  });
});
