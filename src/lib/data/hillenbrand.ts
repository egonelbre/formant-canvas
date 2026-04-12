/**
 * Hillenbrand et al. (1995) vowel dataset.
 *
 * Mean F1/F2/F3 and standard deviations for 12 American English vowels,
 * 3 speaker groups (men, women, children).
 *
 * Source: Hillenbrand, J., Getty, L. A., Clark, M. J., & Wheeler, K. (1995).
 * "Acoustic characteristics of American English vowels."
 * Journal of the Acoustical Society of America, 97(5), 3099-3111.
 * Data: http://homepages.wmich.edu/~hillenbr/voweldata.html
 */

export interface SpeakerGroupData {
  f1: number; f2: number; f3: number;
  f1SD: number; f2SD: number; f3SD: number;
}

export interface HillenbrandVowel {
  ipa: string;
  keyword: string;
  men: SpeakerGroupData;
  women: SpeakerGroupData;
  child: SpeakerGroupData;
}

export type SpeakerGroup = 'men' | 'women' | 'child';

/**
 * 12 vowels from Hillenbrand et al. (1995) Table V.
 * Mean F1/F2/F3 (Hz) and approximate standard deviations by speaker group.
 * Keywords are hVd words used in the study.
 */
export const HILLENBRAND_VOWELS: HillenbrandVowel[] = [
  {
    ipa: 'i', keyword: 'heed',
    men:   { f1: 342, f2: 2322, f3: 3000, f1SD: 35, f2SD: 165, f3SD: 263 },
    women: { f1: 437, f2: 2761, f3: 3372, f1SD: 57, f2SD: 196, f3SD: 261 },
    child: { f1: 452, f2: 3081, f3: 3702, f1SD: 65, f2SD: 234, f3SD: 283 },
  },
  {
    ipa: '\u026A', keyword: 'hid',
    men:   { f1: 427, f2: 2034, f3: 2684, f1SD: 42, f2SD: 148, f3SD: 228 },
    women: { f1: 483, f2: 2365, f3: 3053, f1SD: 51, f2SD: 175, f3SD: 244 },
    child: { f1: 511, f2: 2552, f3: 3403, f1SD: 63, f2SD: 205, f3SD: 272 },
  },
  {
    ipa: 'e', keyword: 'hayed',
    men:   { f1: 476, f2: 2089, f3: 2691, f1SD: 46, f2SD: 155, f3SD: 235 },
    women: { f1: 536, f2: 2530, f3: 3047, f1SD: 55, f2SD: 195, f3SD: 240 },
    child: { f1: 564, f2: 2656, f3: 3323, f1SD: 68, f2SD: 220, f3SD: 263 },
  },
  {
    ipa: '\u025B', keyword: 'head',
    men:   { f1: 580, f2: 1799, f3: 2605, f1SD: 50, f2SD: 140, f3SD: 225 },
    women: { f1: 731, f2: 2058, f3: 2979, f1SD: 70, f2SD: 175, f3SD: 245 },
    child: { f1: 749, f2: 2267, f3: 3310, f1SD: 80, f2SD: 210, f3SD: 270 },
  },
  {
    ipa: 'ae', keyword: 'had',
    men:   { f1: 588, f2: 1952, f3: 2601, f1SD: 55, f2SD: 170, f3SD: 230 },
    women: { f1: 669, f2: 2349, f3: 2972, f1SD: 65, f2SD: 200, f3SD: 250 },
    child: { f1: 717, f2: 2501, f3: 3289, f1SD: 75, f2SD: 230, f3SD: 275 },
  },
  {
    ipa: '\u0251', keyword: 'hod',
    men:   { f1: 768, f2: 1333, f3: 2522, f1SD: 55, f2SD: 130, f3SD: 200 },
    women: { f1: 936, f2: 1551, f3: 2815, f1SD: 75, f2SD: 160, f3SD: 230 },
    child: { f1: 1002, f2: 1688, f3: 3168, f1SD: 90, f2SD: 200, f3SD: 260 },
  },
  {
    ipa: '\u0254', keyword: 'hawed',
    men:   { f1: 652, f2: 997,  f3: 2538, f1SD: 55, f2SD: 120, f3SD: 195 },
    women: { f1: 781, f2: 1136, f3: 2824, f1SD: 70, f2SD: 150, f3SD: 225 },
    child: { f1: 803, f2: 1210, f3: 3116, f1SD: 85, f2SD: 180, f3SD: 260 },
  },
  {
    ipa: 'o', keyword: 'hoed',
    men:   { f1: 497, f2: 910,  f3: 2459, f1SD: 45, f2SD: 105, f3SD: 190 },
    women: { f1: 555, f2: 1035, f3: 2828, f1SD: 55, f2SD: 130, f3SD: 220 },
    child: { f1: 597, f2: 1137, f3: 3089, f1SD: 70, f2SD: 165, f3SD: 250 },
  },
  {
    ipa: '\u028A', keyword: 'hood',
    men:   { f1: 469, f2: 1122, f3: 2434, f1SD: 40, f2SD: 115, f3SD: 185 },
    women: { f1: 519, f2: 1225, f3: 2827, f1SD: 55, f2SD: 140, f3SD: 220 },
    child: { f1: 568, f2: 1490, f3: 3227, f1SD: 70, f2SD: 180, f3SD: 260 },
  },
  {
    ipa: 'u', keyword: "who'd",
    men:   { f1: 378, f2: 997,  f3: 2343, f1SD: 40, f2SD: 110, f3SD: 180 },
    women: { f1: 459, f2: 1105, f3: 2735, f1SD: 55, f2SD: 135, f3SD: 215 },
    child: { f1: 494, f2: 1345, f3: 3052, f1SD: 70, f2SD: 175, f3SD: 250 },
  },
  {
    ipa: '\u028C', keyword: 'hud',
    men:   { f1: 623, f2: 1200, f3: 2550, f1SD: 50, f2SD: 125, f3SD: 200 },
    women: { f1: 753, f2: 1426, f3: 2933, f1SD: 65, f2SD: 155, f3SD: 230 },
    child: { f1: 749, f2: 1546, f3: 3145, f1SD: 80, f2SD: 195, f3SD: 260 },
  },
  {
    ipa: '\u025C', keyword: 'heard',
    men:   { f1: 474, f2: 1379, f3: 1710, f1SD: 45, f2SD: 130, f3SD: 165 },
    women: { f1: 523, f2: 1588, f3: 1929, f1SD: 55, f2SD: 155, f3SD: 190 },
    child: { f1: 586, f2: 1719, f3: 2160, f1SD: 70, f2SD: 195, f3SD: 230 },
  },
];

export interface FormantRange {
  min: number;
  max: number;
}

/**
 * Compute the typical frequency range for each formant (F1-F3) from Hillenbrand data.
 * Range spans min-1SD to max+1SD across all 12 vowels for the given speaker group.
 * F4 range is estimated from F3 range * 1.25.
 */
export function getFormantRanges(group: SpeakerGroup): FormantRange[] {
  let f1Min = Infinity, f1Max = -Infinity;
  let f2Min = Infinity, f2Max = -Infinity;
  let f3Min = Infinity, f3Max = -Infinity;

  for (const vowel of HILLENBRAND_VOWELS) {
    const d = vowel[group];
    f1Min = Math.min(f1Min, d.f1 - d.f1SD);
    f1Max = Math.max(f1Max, d.f1 + d.f1SD);
    f2Min = Math.min(f2Min, d.f2 - d.f2SD);
    f2Max = Math.max(f2Max, d.f2 + d.f2SD);
    f3Min = Math.min(f3Min, d.f3 - d.f3SD);
    f3Max = Math.max(f3Max, d.f3 + d.f3SD);
  }

  return [
    { min: f1Min, max: f1Max },
    { min: f2Min, max: f2Max },
    { min: f3Min, max: f3Max },
    { min: Math.round(f3Min * 1.25), max: Math.round(f3Max * 1.25) },
  ];
}

/**
 * Interpolate F3 and F4 from Hillenbrand data using inverse-distance weighting
 * in log F1/F2 space. F3 is interpolated directly from the dataset.
 * F4 is estimated as F3 * 1.25 (typical F4/F3 ratio for speech).
 *
 * @returns { f3: number, f4: number }
 */
export function interpolateHigherFormants(
  f1: number, f2: number,
  group: SpeakerGroup,
): { f3: number; f4: number } {
  const logF1 = Math.log2(f1);
  const logF2 = Math.log2(f2);

  let weightSum = 0;
  let f3Sum = 0;

  for (const vowel of HILLENBRAND_VOWELS) {
    const data = vowel[group];
    const dF1 = logF1 - Math.log2(data.f1);
    const dF2 = logF2 - Math.log2(data.f2);
    const distSq = dF1 * dF1 + dF2 * dF2;

    // If we're essentially on top of a vowel, use it directly
    if (distSq < 1e-8) {
      return { f3: data.f3, f4: Math.round(data.f3 * 1.25) };
    }

    const weight = 1 / distSq;
    weightSum += weight;
    f3Sum += weight * data.f3;
  }

  const f3 = Math.round(f3Sum / weightSum);
  return { f3, f4: Math.round(f3 * 1.25) };
}

/**
 * Algebraic point-in-ellipse test.
 * Returns true if (f1, f2) lies inside or on the boundary of the ellipse
 * centered at (cx, cy) with radii (rx, ry).
 *
 * Formula: ((f1-cx)/rx)^2 + ((f2-cy)/ry)^2 <= 1
 */
export function pointInEllipse(
  f1: number, f2: number,
  cx: number, cy: number,
  rx: number, ry: number,
): boolean {
  const dx = (f1 - cx) / rx;
  const dy = (f2 - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

/**
 * Find which vowel region (if any) contains the given F1/F2 point.
 * Uses 1 SD as the ellipse radii for each vowel.
 * When multiple ellipses contain the point, returns the IPA of the
 * smallest one (by area = pi * rx * ry).
 *
 * @returns IPA symbol of the matching vowel, or null if outside all regions.
 */
export function getActiveVowelRegion(
  f1: number, f2: number,
  group: SpeakerGroup,
): string | null {
  let bestIPA: string | null = null;
  let bestArea = Infinity;

  for (const vowel of HILLENBRAND_VOWELS) {
    const data = vowel[group];
    const rx = data.f1SD;
    const ry = data.f2SD;

    if (pointInEllipse(f1, f2, data.f1, data.f2, rx, ry)) {
      const area = rx * ry; // pi factor cancels in comparison
      if (area < bestArea) {
        bestArea = area;
        bestIPA = vowel.ipa;
      }
    }
  }

  return bestIPA;
}
