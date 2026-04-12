import type { StrategyId } from './types';

/**
 * Heuristic to pick a reasonable strategy for a given f0 and voice type.
 * Returns a "smart default" -- user can always override.
 */
export function pickStrategy(f0: number, voiceType: string): StrategyId {
  const isSoprano = voiceType === 'soprano' || voiceType === 'mezzo';
  const isHighVoice = isSoprano || voiceType === 'alto' || voiceType === 'child';

  if (isSoprano && f0 >= 300) return 'r1-f0';
  if (isHighVoice && f0 >= 250) return 'r1-2f0';
  if (f0 >= 150) return 'r1-2f0';
  return 'r1-3f0';
}
