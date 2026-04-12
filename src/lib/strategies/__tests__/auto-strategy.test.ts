import { describe, it, expect } from 'vitest';
import { pickStrategy } from '../auto-strategy';
import type { StrategyId } from '../types';

const validIds: StrategyId[] = ['speech', 'r1-f0', 'r1-2f0', 'r1-3f0', 'r2-2f0', 'r2-3f0', 'singer-formant'];

describe('pickStrategy', () => {
  it('pickStrategy(500, soprano) returns r1-f0', () => {
    expect(pickStrategy(500, 'soprano')).toBe('r1-f0');
  });

  it('pickStrategy(200, baritone) returns a valid StrategyId that is not speech', () => {
    const result = pickStrategy(200, 'baritone');
    expect(validIds).toContain(result);
    expect(result).not.toBe('speech');
  });

  it('pickStrategy(100, bass) returns r1-3f0', () => {
    expect(pickStrategy(100, 'bass')).toBe('r1-3f0');
  });

  it('always returns a valid StrategyId for any voice type', () => {
    const voiceTypes = ['soprano', 'mezzo', 'alto', 'tenor', 'baritone', 'bass', 'child'];
    const frequencies = [80, 150, 250, 400, 600, 1000];
    for (const vt of voiceTypes) {
      for (const f0 of frequencies) {
        const result = pickStrategy(f0, vt);
        expect(validIds, `Invalid result for ${vt} at ${f0} Hz: ${result}`).toContain(result);
      }
    }
  });
});
