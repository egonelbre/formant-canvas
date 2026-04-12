import type { R1Strategy, R2Strategy, StrategyResult, StrategyTargets } from './types';
import { R1_STRATEGIES, R2_STRATEGIES, SINGER_FORMANT_CENTERS } from './definitions';

/** Formant range boundaries for clamping (Hz) */
const FORMANT_BOUNDS = {
  f1: { min: 200, max: 1000 },
  f2: { min: 600, max: 3000 },
  f3: { min: 1500, max: 3500 },
  f4: { min: 2500, max: 5000 },
  f5: { min: 3500, max: 6000 },
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Compute combined formant targets from independent R1, R2, and singer's formant selections.
 * Each selection is optional — null means "not active".
 */
export function computeTargets(
  r1: R1Strategy | null,
  r2: R2Strategy | null,
  singerFormant: boolean,
  f0: number,
  voiceType: string,
): StrategyResult {
  const targets: StrategyTargets = { f1: null, f2: null, f3: null, f4: null, f5: null };
  let inRange = true;
  let clamped = false;

  // R1 strategy
  if (r1) {
    const def = R1_STRATEGIES[r1];
    const r1InRange = f0 >= def.f0Range.min && f0 <= def.f0Range.max;
    if (!r1InRange) inRange = false;

    let raw: number;
    switch (r1) {
      case 'r1-f0':  raw = f0; break;
      case 'r1-2f0': raw = 2 * f0; break;
      case 'r1-3f0': raw = 3 * f0; break;
    }
    const f1 = clamp(raw, FORMANT_BOUNDS.f1.min, FORMANT_BOUNDS.f1.max);
    if (f1 !== raw) clamped = true;
    targets.f1 = f1;
  }

  // R2 strategy
  if (r2) {
    const def = R2_STRATEGIES[r2];
    const r2InRange = f0 >= def.f0Range.min && f0 <= def.f0Range.max;
    if (!r2InRange) inRange = false;

    let raw: number;
    switch (r2) {
      case 'r2-2f0': raw = 2 * f0; break;
      case 'r2-3f0': raw = 3 * f0; break;
    }
    const f2 = clamp(raw, FORMANT_BOUNDS.f2.min, FORMANT_BOUNDS.f2.max);
    if (f2 !== raw) clamped = true;
    targets.f2 = f2;
  }

  // Singer's formant cluster
  if (singerFormant) {
    const center = SINGER_FORMANT_CENTERS[voiceType] ?? 2600;
    targets.f3 = clamp(center - 200, FORMANT_BOUNDS.f3.min, FORMANT_BOUNDS.f3.max);
    targets.f4 = clamp(center, FORMANT_BOUNDS.f4.min, FORMANT_BOUNDS.f4.max);
    targets.f5 = clamp(center + 300, FORMANT_BOUNDS.f5.min, FORMANT_BOUNDS.f5.max);
    // Singer's formant is typically for lower voices at lower pitches
    if (f0 > 659) inRange = false;
  }

  return { targets, inRange, clamped };
}
