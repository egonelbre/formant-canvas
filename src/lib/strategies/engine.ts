import type { StrategyId, StrategyResult } from './types';
import { STRATEGY_DEFINITIONS } from './definitions';

/** Formant range boundaries for clamping (Hz) */
const FORMANT_BOUNDS = {
  f1: { min: 200, max: 1000 },
  f2: { min: 600, max: 3000 },
  f3: { min: 1500, max: 3500 },
  f4: { min: 2500, max: 5000 },
  f5: { min: 3500, max: 6000 },
} as const;

/** Singer's formant cluster center frequencies by voice type (Hz) */
const SINGER_FORMANT_CENTERS: Record<string, number> = {
  bass: 2384,
  baritone: 2454,
  tenor: 2705,
  alto: 2800,
  mezzo: 2900,
  soprano: 3092,
  child: 3200,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function nullTargets(): StrategyResult['targets'] {
  return { f1: null, f2: null, f3: null, f4: null, f5: null };
}

/**
 * Compute formant targets for a given strategy, f0, and voice type.
 * Pure function with no side effects.
 */
export function computeTargets(
  strategyId: StrategyId,
  f0: number,
  voiceType: string,
): StrategyResult {
  const def = STRATEGY_DEFINITIONS[strategyId];
  const inRange = f0 >= def.f0Range.min && f0 <= def.f0Range.max;

  switch (strategyId) {
    case 'speech':
      return { targets: nullTargets(), inRange: true, clamped: false };

    case 'r1-f0': {
      const raw = f0;
      const f1 = clamp(raw, FORMANT_BOUNDS.f1.min, FORMANT_BOUNDS.f1.max);
      const clamped = f1 !== raw;
      return { targets: { ...nullTargets(), f1 }, inRange, clamped };
    }

    case 'r1-2f0': {
      const raw = 2 * f0;
      const f1 = clamp(raw, FORMANT_BOUNDS.f1.min, FORMANT_BOUNDS.f1.max);
      const clamped = f1 !== raw;
      return { targets: { ...nullTargets(), f1 }, inRange, clamped };
    }

    case 'r1-3f0': {
      const raw = 3 * f0;
      const f1 = clamp(raw, FORMANT_BOUNDS.f1.min, FORMANT_BOUNDS.f1.max);
      const clamped = f1 !== raw;
      return { targets: { ...nullTargets(), f1 }, inRange, clamped };
    }

    case 'r2-2f0': {
      const raw = 2 * f0;
      const f2 = clamp(raw, FORMANT_BOUNDS.f2.min, FORMANT_BOUNDS.f2.max);
      const clamped = f2 !== raw;
      return { targets: { ...nullTargets(), f2 }, inRange, clamped };
    }

    case 'r2-3f0': {
      const raw = 3 * f0;
      const f2 = clamp(raw, FORMANT_BOUNDS.f2.min, FORMANT_BOUNDS.f2.max);
      const clamped = f2 !== raw;
      return { targets: { ...nullTargets(), f2 }, inRange, clamped };
    }

    case 'singer-formant': {
      const center = SINGER_FORMANT_CENTERS[voiceType] ?? 2600;
      // Cluster positions are voice-type-specific; no general formant clamping.
      // The cluster itself defines the valid F3/F4/F5 positions.
      const f3 = center - 200;
      const f4 = center;
      const f5 = center + 300;

      return {
        targets: { f1: null, f2: null, f3, f4, f5 },
        inRange,
        clamped: !inRange,
      };
    }
  }
}
