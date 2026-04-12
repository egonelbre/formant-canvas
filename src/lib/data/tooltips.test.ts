import { describe, it, expect } from 'vitest';
import { TOOLTIPS } from './tooltips.ts';

describe('TOOLTIPS', () => {
  const PRIMARY_KEYS = ['playStop', 'volume', 'pitch', 'voicePreset', 'phonation', 'vowelChart', 'strategy'];

  it('has exactly 7 primary control entries', () => {
    expect(Object.keys(TOOLTIPS)).toHaveLength(7);
  });

  it('has entries for all 7 primary controls', () => {
    for (const key of PRIMARY_KEYS) {
      expect(TOOLTIPS).toHaveProperty(key);
    }
  });

  it('every entry has a non-empty text string', () => {
    for (const key of PRIMARY_KEYS) {
      expect(typeof TOOLTIPS[key].text).toBe('string');
      expect(TOOLTIPS[key].text.length).toBeGreaterThan(0);
    }
  });

  const EXPERT_KEYS = ['pitch', 'volume', 'voicePreset', 'phonation', 'vowelChart', 'strategy'];

  it('pitch, volume, voicePreset, phonation, vowelChart, strategy each have a non-empty expert string', () => {
    for (const key of EXPERT_KEYS) {
      expect(TOOLTIPS[key].expert, `${key} should have expert`).toBeDefined();
      expect(typeof TOOLTIPS[key].expert).toBe('string');
      expect(TOOLTIPS[key].expert!.length, `${key} expert should be non-empty`).toBeGreaterThan(0);
    }
  });

  it('no tooltip text contains forbidden jargon outside pedagogical examples', () => {
    const FORBIDDEN = ['Rd', 'OQ', 'spectral tilt'];
    for (const key of PRIMARY_KEYS) {
      for (const term of FORBIDDEN) {
        expect(TOOLTIPS[key].text, `${key} text should not contain "${term}"`).not.toContain(term);
      }
    }
  });

  it('Hz in text appears only in pedagogical examples (e.g. "120 Hz")', () => {
    for (const key of PRIMARY_KEYS) {
      const text = TOOLTIPS[key].text;
      // Find all Hz occurrences - they should be preceded by a number
      const hzMatches = [...text.matchAll(/Hz/g)];
      for (const match of hzMatches) {
        const idx = match.index!;
        const before = text.slice(Math.max(0, idx - 5), idx).trim();
        expect(before, `Hz in ${key} should be preceded by a number`).toMatch(/\d+$/);
      }
    }
  });
});
