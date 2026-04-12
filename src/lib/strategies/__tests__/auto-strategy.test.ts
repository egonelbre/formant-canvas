import { describe, it, expect } from 'vitest';
import { pickStrategy } from '../auto-strategy';

describe('pickStrategy', () => {
  it('soprano at 500 Hz returns r1-f0 and r2-2f0', () => {
    const rec = pickStrategy(500, 'soprano');
    expect(rec.r1).toBe('r1-f0');
    expect(rec.r2).toBe('r2-2f0');
    expect(rec.singerFormant).toBe(false);
  });

  it('bass at 100 Hz returns r1-3f0 and singer formant', () => {
    const rec = pickStrategy(100, 'bass');
    expect(rec.r1).toBe('r1-3f0');
    expect(rec.r2).toBeNull();
    expect(rec.singerFormant).toBe(true);
  });

  it('baritone at 200 Hz returns r1-2f0 and singer formant', () => {
    const rec = pickStrategy(200, 'baritone');
    expect(rec.r1).toBe('r1-2f0');
    expect(rec.r2).toBeNull();
    expect(rec.singerFormant).toBe(true);
  });

  it('alto at 300 Hz returns r1-2f0 and r2-3f0, no singer formant', () => {
    const rec = pickStrategy(300, 'alto');
    expect(rec.r1).toBe('r1-2f0');
    expect(rec.r2).toBe('r2-3f0');
    expect(rec.singerFormant).toBe(false);
  });

  it('bass at 500 Hz returns no singer formant (too high)', () => {
    const rec = pickStrategy(500, 'bass');
    expect(rec.singerFormant).toBe(false);
  });

  it('always returns valid strategy types for any input', () => {
    const voiceTypes = ['soprano', 'mezzo', 'alto', 'tenor', 'baritone', 'bass', 'child'];
    const frequencies = [80, 150, 250, 400, 600, 1000];
    const validR1 = ['r1-f0', 'r1-2f0', 'r1-3f0', null];
    const validR2 = ['r2-2f0', 'r2-3f0', null];
    for (const vt of voiceTypes) {
      for (const f0 of frequencies) {
        const rec = pickStrategy(f0, vt);
        expect(validR1).toContain(rec.r1);
        expect(validR2).toContain(rec.r2);
        expect(typeof rec.singerFormant).toBe('boolean');
      }
    }
  });
});
