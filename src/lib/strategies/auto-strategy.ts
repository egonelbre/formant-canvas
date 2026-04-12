import type { R1Strategy, R2Strategy, AutoStrategyRecommendation } from './types';

/**
 * Heuristic to pick reasonable R1/R2 strategies and singer's formant for a given f0 and voice type.
 * Returns independent recommendations — user can always override each.
 */
export function pickStrategy(f0: number, voiceType: string): AutoStrategyRecommendation {
  const isSoprano = voiceType === 'soprano' || voiceType === 'mezzo';
  const isHighVoice = isSoprano || voiceType === 'alto' || voiceType === 'child';
  const isLowVoice = voiceType === 'bass' || voiceType === 'baritone';

  // R1 recommendation
  let r1: R1Strategy | null = null;
  if (isSoprano && f0 >= 300) {
    r1 = 'r1-f0';
  } else if (isHighVoice && f0 >= 250) {
    r1 = 'r1-2f0';
  } else if (f0 >= 150) {
    r1 = 'r1-2f0';
  } else {
    r1 = 'r1-3f0';
  }

  // R2 recommendation
  let r2: R2Strategy | null = null;
  if (isSoprano && f0 >= 300) {
    r2 = 'r2-2f0';
  } else if (isHighVoice && f0 >= 250) {
    r2 = 'r2-3f0';
  }

  // Singer's formant for lower voices
  const singerFormant = isLowVoice && f0 <= 400;

  return { r1, r2, singerFormant };
}
