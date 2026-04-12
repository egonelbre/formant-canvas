import type { R1Strategy, R2Strategy, AutoStrategyRecommendation } from './types';

/**
 * Auto-strategy heuristic based on Henrich et al. (2011):
 * "Vocal tract resonances in singing: Strategies used by sopranos,
 *  altos, tenors, and baritones" — J. Acoust. Soc. Am. 129(2), 1024–1035.
 *
 * Key findings:
 * - Sopranos: R1:f0 when f0 >= ~500 Hz (approaching R1 speech value),
 *   often R2:2f0 simultaneously; R1:2f0 in lower octave.
 * - Altos: R1:f0 in upper range, switch to R1:2f0 in lower range;
 *   R2:2f0 or R2:3f0 in upper range.
 * - Tenors: R1:2f0 main strategy, R1:3f0 at lower pitches;
 *   R1:f0 only sparingly at very top. R2 tuning occasional.
 * - Baritones: R1:2f0 in upper range, R1:3f0 below;
 *   R2:5f0→R2:4f0→R2:3f0 sequential as pitch rises.
 *
 * The transitions happen when nf0 approaches the speech value of R1
 * (roughly 300–800 Hz depending on vowel and voice type).
 */
export function pickStrategy(f0: number, voiceType: string): AutoStrategyRecommendation {
  switch (voiceType) {
    case 'soprano':
    case 'mezzo':
      return pickSoprano(f0);
    case 'alto':
      return pickAlto(f0);
    case 'tenor':
      return pickTenor(f0);
    case 'baritone':
      return pickBaritone(f0);
    case 'bass':
      return pickBass(f0);
    case 'child':
      return pickAlto(f0); // similar range to alto
    default:
      return pickTenor(f0);
  }
}

function pickSoprano(f0: number): AutoStrategyRecommendation {
  // Soprano range ~261–1046 Hz (C4–C6)
  // Upper range (f0 >= 500): R1:f0 + R2:2f0 simultaneously
  // Lower range (f0 < 500): R1:2f0
  if (f0 >= 500) {
    return { r1: 'r1-f0', r2: 'r2-2f0', singerFormant: false };
  }
  if (f0 >= 350) {
    // Transition zone — R1:f0 starting to be useful, R2:2f0 possible
    return { r1: 'r1-f0', r2: null, singerFormant: false };
  }
  // Lower soprano / below passaggio
  return { r1: 'r1-2f0', r2: null, singerFormant: false };
}

function pickAlto(f0: number): AutoStrategyRecommendation {
  // Alto range ~196–784 Hz (G3–G5)
  // Upper range: R1:f0; R2:2f0 or R2:3f0 possible
  // Lower range: switch to R1:2f0
  if (f0 >= 400) {
    return { r1: 'r1-f0', r2: 'r2-2f0', singerFormant: false };
  }
  if (f0 >= 300) {
    // Mid range — R1:2f0, R2:3f0 possible
    return { r1: 'r1-2f0', r2: 'r2-3f0', singerFormant: false };
  }
  // Lower range
  return { r1: 'r1-2f0', r2: null, singerFormant: false };
}

function pickTenor(f0: number): AutoStrategyRecommendation {
  // Tenor range ~131–523 Hz (C3–C5)
  // Henrich: R1:2f0 main strategy, R1:3f0 at lower pitches
  // R1:f0 only sparingly at very top
  // Singer's formant in lower-mid range
  if (f0 >= 400) {
    // Top of tenor range — R1:2f0, approaching R1:f0 territory
    return { r1: 'r1-2f0', r2: null, singerFormant: false };
  }
  if (f0 >= 250) {
    // Mid range — R1:2f0 (2f0 = 500–800 Hz, near R1 speech values)
    return { r1: 'r1-2f0', r2: null, singerFormant: true };
  }
  if (f0 >= 175) {
    // Lower-mid — transition R1:3f0 → R1:2f0
    // 3f0 = 525–750 Hz, approaching R1 speech values
    return { r1: 'r1-3f0', r2: null, singerFormant: true };
  }
  // Low range — R1:3f0
  return { r1: 'r1-3f0', r2: null, singerFormant: true };
}

function pickBaritone(f0: number): AutoStrategyRecommendation {
  // Baritone range ~110–392 Hz (A2–G4)
  // Henrich: R1:2f0 upper range, R1:3f0 below
  // R2 tunings: R2:5f0→R2:4f0→R2:3f0 as pitch rises
  if (f0 >= 250) {
    // Upper baritone — R1:2f0, R2:3f0
    return { r1: 'r1-2f0', r2: 'r2-3f0', singerFormant: true };
  }
  if (f0 >= 175) {
    // Mid range — R1:2f0 (2f0 = 350–500 Hz)
    return { r1: 'r1-2f0', r2: null, singerFormant: true };
  }
  // Low range — R1:3f0 (3f0 still approaches R1 range)
  return { r1: 'r1-3f0', r2: null, singerFormant: true };
}

function pickBass(f0: number): AutoStrategyRecommendation {
  // Bass range ~65–330 Hz (C2–E4)
  // Henrich: at very low f0, harmonics are closely spaced so tuning
  // offers little advantage. At higher bass range, R1:2f0 and R1:3f0.
  if (f0 >= 200) {
    // Upper bass — R1:2f0
    return { r1: 'r1-2f0', r2: null, singerFormant: true };
  }
  if (f0 >= 130) {
    // Mid bass — R1:3f0 (3f0 = 390–600 Hz)
    return { r1: 'r1-3f0', r2: null, singerFormant: true };
  }
  // Very low — harmonics closely spaced, tuning less critical
  return { r1: 'r1-3f0', r2: null, singerFormant: true };
}
