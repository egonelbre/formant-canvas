import type { PhonationMode, PhonationPreset } from '../types.ts';

/**
 * Phonation mode presets with voice-science-based parameter values.
 * Each mode sets openQuotient, aspirationLevel, and spectralTilt.
 *
 * Sources:
 * - Garellek, "Phonetics of Voice" (breathy/pressed tilt relationships)
 * - Esposito & Khan 2020 (modal OQ ~0.5-0.6)
 * - Klatt 1980 (spectral tilt range 0-24 dB at 3 kHz)
 */
export const PHONATION_PRESETS: Record<PhonationMode, PhonationPreset> = {
  breathy: { label: 'Breathy', openQuotient: 0.7,  aspirationLevel: 0.15, spectralTilt: 18 },
  modal:   { label: 'Modal',   openQuotient: 0.6,  aspirationLevel: 0.03, spectralTilt: 6  },
  flow:    { label: 'Flow',    openQuotient: 0.55, aspirationLevel: 0.02, spectralTilt: 3  },
  pressed: { label: 'Pressed', openQuotient: 0.4,  aspirationLevel: 0.01, spectralTilt: 0  },
};
