import { describe, it, expect } from 'vitest';
import { pickStrategy } from '../auto-strategy';
import type { StrategyId } from '../types';

const validIds: StrategyId[] = ['speech', 'r1-f0', 'r1-2f0', 'r1-3f0', 'r2-2f0', 'r2-3f0', 'singer-formant'];

describe('pickStrategy', () => {
  it('returns r1-f0 for soprano at 500 Hz', () => {
    expect(pickStrategy(500, 'soprano')).toBe('r1-f0');
  });

  it('returns a valid non-speech StrategyId for baritone at 200 Hz', () => {
    const result = pickStrategy(200, 'baritone');
    expect(validIds).toContain(result);
    expect(result).not.toBe('speech');
  });

  it('returns r1-3f0 for bass at 100 Hz', () => {
    expect(pickStrategy(100, 'bass')).toBe('r1-3f0');
  });

  it('returns a valid StrategyId for any voice type', () => {
    const voiceTypes = ['soprano', 'mezzo', 'alto', 'tenor', 'baritone', 'bass', 'child'];
    for (const vt of voiceTypes) {
      const result = pickStrategy(200, vt);
      expect(validIds, `Invalid strategy for ${vt}`).toContain(result);
    }
  });
});
