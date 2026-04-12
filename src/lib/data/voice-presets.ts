import type { VoicePreset } from '../types.ts';

/**
 * Voice type presets with comfortable default f0 and formant values for /a/ vowel.
 * Sources: Hillenbrand et al. (1995) scaling patterns, standard vocal ranges.
 */
export const VOICE_PRESETS: Record<string, VoicePreset> = {
  soprano:  { label: 'Soprano',  f0Default: 260, f1: 850,  f2: 1220, f3: 2810, f4: 3600, f1BW: 100, f2BW: 120, f3BW: 180, f4BW: 350 },
  mezzo:    { label: 'Mezzo',    f0Default: 220, f1: 820,  f2: 1180, f3: 2750, f4: 3500, f1BW: 100, f2BW: 120, f3BW: 180, f4BW: 350 },
  alto:     { label: 'Alto',     f0Default: 196, f1: 800,  f2: 1150, f3: 2700, f4: 3400, f1BW: 95,  f2BW: 115, f3BW: 175, f4BW: 340 },
  tenor:    { label: 'Tenor',    f0Default: 165, f1: 750,  f2: 1100, f3: 2550, f4: 3300, f1BW: 90,  f2BW: 110, f3BW: 170, f4BW: 320 },
  baritone: { label: 'Baritone', f0Default: 130, f1: 730,  f2: 1090, f3: 2440, f4: 3200, f1BW: 90,  f2BW: 110, f3BW: 170, f4BW: 320 },
  bass:     { label: 'Bass',     f0Default: 98,  f1: 710,  f2: 1060, f3: 2350, f4: 3100, f1BW: 85,  f2BW: 105, f3BW: 165, f4BW: 300 },
  child:    { label: 'Child',    f0Default: 260, f1: 1000, f2: 1400, f3: 3300, f4: 4200, f1BW: 110, f2BW: 130, f3BW: 200, f4BW: 400 },
};
