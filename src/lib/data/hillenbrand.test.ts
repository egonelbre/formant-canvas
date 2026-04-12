import { describe, it, expect } from 'vitest';
import {
  HILLENBRAND_VOWELS,
  pointInEllipse,
  getActiveVowelRegion,
  type HillenbrandVowel,
  type SpeakerGroup,
} from './hillenbrand.ts';

describe('HILLENBRAND_VOWELS', () => {
  it('has exactly 12 entries', () => {
    expect(HILLENBRAND_VOWELS).toHaveLength(12);
  });

  const expectedIPA = ['i', '\u026A', 'e', '\u025B', 'ae', '\u0251', '\u0254', 'o', '\u028A', 'u', '\u028C', '\u025C'];

  it('contains all 12 IPA symbols', () => {
    const ipas = HILLENBRAND_VOWELS.map((v) => v.ipa);
    for (const ipa of expectedIPA) {
      expect(ipas, `missing IPA symbol "${ipa}"`).toContain(ipa);
    }
  });

  it('each entry has non-empty ipa and keyword', () => {
    for (const v of HILLENBRAND_VOWELS) {
      expect(v.ipa).toBeTruthy();
      expect(v.keyword).toBeTruthy();
    }
  });

  it('all fields are positive numbers for each speaker group', () => {
    const groups: SpeakerGroup[] = ['men', 'women', 'child'];
    const fields = ['f1', 'f2', 'f3', 'f1SD', 'f2SD', 'f3SD'] as const;
    for (const v of HILLENBRAND_VOWELS) {
      for (const g of groups) {
        for (const f of fields) {
          expect(v[g][f], `${v.ipa} ${g}.${f}`).toBeGreaterThan(0);
        }
      }
    }
  });

  // Spot-check values from Hillenbrand et al. (1995)
  it('men /i/ has f1 near 342, f2 near 2322', () => {
    const vowel = HILLENBRAND_VOWELS.find((v) => v.ipa === 'i')!;
    expect(vowel.men.f1).toBeCloseTo(342, -1);
    expect(vowel.men.f2).toBeCloseTo(2322, -1);
  });

  it('men /\u0251/ has f1 near 768, f2 near 1333', () => {
    const vowel = HILLENBRAND_VOWELS.find((v) => v.ipa === '\u0251')!;
    expect(vowel.men.f1).toBeCloseTo(768, -1);
    expect(vowel.men.f2).toBeCloseTo(1333, -1);
  });

  it('women /i/ has f1 near 437, f2 near 2761', () => {
    const vowel = HILLENBRAND_VOWELS.find((v) => v.ipa === 'i')!;
    expect(vowel.women.f1).toBeCloseTo(437, -1);
    expect(vowel.women.f2).toBeCloseTo(2761, -1);
  });

  it('child /i/ has f1 near 452, f2 near 3081', () => {
    const vowel = HILLENBRAND_VOWELS.find((v) => v.ipa === 'i')!;
    expect(vowel.child.f1).toBeCloseTo(452, -1);
    expect(vowel.child.f2).toBeCloseTo(3081, -1);
  });
});

describe('pointInEllipse', () => {
  it('returns true for a point at the center of an ellipse', () => {
    expect(pointInEllipse(768, 1333, 768, 1333, 100, 200)).toBe(true);
  });

  it('returns false for a point far outside an ellipse', () => {
    expect(pointInEllipse(0, 0, 768, 1333, 100, 200)).toBe(false);
  });

  it('returns true for a point at exactly 1 SD from center (boundary)', () => {
    // Point at (cx + rx, cy) should be exactly on boundary: ((rx)/rx)^2 + 0 = 1 <= 1
    expect(pointInEllipse(868, 1333, 768, 1333, 100, 200)).toBe(true);
  });

  it('returns false for a point just outside boundary', () => {
    // Point at (cx + rx + 1, cy): slightly outside
    expect(pointInEllipse(869, 1333, 768, 1333, 100, 200)).toBe(false);
  });
});

describe('getActiveVowelRegion', () => {
  it('returns IPA symbol when point is at /\u0251/ center for men', () => {
    expect(getActiveVowelRegion(768, 1333, 'men')).toBe('\u0251');
  });

  it('returns null when point is far outside all regions', () => {
    expect(getActiveVowelRegion(100, 100, 'men')).toBeNull();
  });

  it('returns the smallest containing ellipse when overlapping', () => {
    // A point at a vowel center should return that vowel (it's the smallest ellipse containing it)
    const vowelI = HILLENBRAND_VOWELS.find((v) => v.ipa === 'i')!;
    expect(getActiveVowelRegion(vowelI.men.f1, vowelI.men.f2, 'men')).toBe('i');
  });

  it('works for women speaker group', () => {
    const vowelI = HILLENBRAND_VOWELS.find((v) => v.ipa === 'i')!;
    expect(getActiveVowelRegion(vowelI.women.f1, vowelI.women.f2, 'women')).toBe('i');
  });

  it('works for child speaker group', () => {
    const vowelI = HILLENBRAND_VOWELS.find((v) => v.ipa === 'i')!;
    expect(getActiveVowelRegion(vowelI.child.f1, vowelI.child.f2, 'child')).toBe('i');
  });
});
