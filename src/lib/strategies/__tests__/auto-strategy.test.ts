import { describe, it, expect } from 'vitest';
import { pickStrategy } from '../auto-strategy';

/**
 * Tests based on Henrich et al. (2011) findings.
 */
describe('pickStrategy', () => {
  // Soprano: R1:f0 + R2:2f0 in upper range, R1:2f0 in lower
  it('soprano at 600 Hz returns R1:f0 + R2:2f0', () => {
    const rec = pickStrategy(600, 'soprano');
    expect(rec.r1).toBe('r1-f0');
    expect(rec.r2).toBe('r2-2f0');
    expect(rec.singerFormant).toBe(false);
  });

  it('soprano at 300 Hz returns R1:2f0 (lower octave)', () => {
    const rec = pickStrategy(300, 'soprano');
    expect(rec.r1).toBe('r1-2f0');
    expect(rec.singerFormant).toBe(false);
  });

  // Alto: R1:f0 upper, R1:2f0 lower, R2:3f0 mid
  it('alto at 450 Hz returns R1:f0 + R2:2f0', () => {
    const rec = pickStrategy(450, 'alto');
    expect(rec.r1).toBe('r1-f0');
    expect(rec.r2).toBe('r2-2f0');
  });

  it('alto at 320 Hz returns R1:2f0 + R2:3f0', () => {
    const rec = pickStrategy(320, 'alto');
    expect(rec.r1).toBe('r1-2f0');
    expect(rec.r2).toBe('r2-3f0');
  });

  it('alto at 250 Hz returns R1:2f0, no R2', () => {
    const rec = pickStrategy(250, 'alto');
    expect(rec.r1).toBe('r1-2f0');
    expect(rec.r2).toBeNull();
  });

  // Tenor: R1:2f0 main, R1:3f0 at lower pitches, singer's formant
  it('tenor at 400 Hz returns R1:2f0, no singer formant (top range)', () => {
    const rec = pickStrategy(400, 'tenor');
    expect(rec.r1).toBe('r1-2f0');
    expect(rec.singerFormant).toBe(false);
  });

  it('tenor at 300 Hz returns R1:2f0 + singer formant', () => {
    const rec = pickStrategy(300, 'tenor');
    expect(rec.r1).toBe('r1-2f0');
    expect(rec.singerFormant).toBe(true);
  });

  it('tenor at 150 Hz returns R1:3f0 (lower pitch) + singer formant', () => {
    const rec = pickStrategy(150, 'tenor');
    expect(rec.r1).toBe('r1-3f0');
    expect(rec.singerFormant).toBe(true);
  });

  // Baritone: R1:2f0 upper, R1:3f0 lower, R2:3f0 at top
  it('baritone at 280 Hz returns R1:2f0 + R2:3f0 + singer formant', () => {
    const rec = pickStrategy(280, 'baritone');
    expect(rec.r1).toBe('r1-2f0');
    expect(rec.r2).toBe('r2-3f0');
    expect(rec.singerFormant).toBe(true);
  });

  it('baritone at 180 Hz returns R1:2f0 + singer formant', () => {
    const rec = pickStrategy(180, 'baritone');
    expect(rec.r1).toBe('r1-2f0');
    expect(rec.singerFormant).toBe(true);
  });

  it('baritone at 130 Hz returns R1:3f0 + singer formant', () => {
    const rec = pickStrategy(130, 'baritone');
    expect(rec.r1).toBe('r1-3f0');
    expect(rec.singerFormant).toBe(true);
  });

  // Bass: R1:2f0 upper, R1:3f0 lower, always singer's formant
  it('bass at 220 Hz returns R1:2f0 + singer formant', () => {
    const rec = pickStrategy(220, 'bass');
    expect(rec.r1).toBe('r1-2f0');
    expect(rec.singerFormant).toBe(true);
  });

  it('bass at 100 Hz returns R1:3f0 + singer formant', () => {
    const rec = pickStrategy(100, 'bass');
    expect(rec.r1).toBe('r1-3f0');
    expect(rec.singerFormant).toBe(true);
  });

  // Always returns valid types
  it('returns valid strategy types for all voice/pitch combos', () => {
    const voiceTypes = ['soprano', 'mezzo', 'alto', 'tenor', 'baritone', 'bass', 'child'];
    const frequencies = [80, 150, 250, 400, 600, 1000];
    const validR1 = ['r1-f0', 'r1-2f0', 'r1-3f0', null];
    const validR2 = ['r2-2f0', 'r2-3f0', null];
    for (const vt of voiceTypes) {
      for (const f0 of frequencies) {
        const rec = pickStrategy(f0, vt);
        expect(validR1, `Invalid R1 for ${vt}@${f0}`).toContain(rec.r1);
        expect(validR2, `Invalid R2 for ${vt}@${f0}`).toContain(rec.r2);
        expect(typeof rec.singerFormant).toBe('boolean');
      }
    }
  });
});
