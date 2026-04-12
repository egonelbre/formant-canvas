import type { FormantParams } from '../../types.ts';

/**
 * Evaluate the magnitude response of a single formant (bandpass resonator)
 * at a given frequency. Uses the standard second-order bandpass approximation.
 *
 * Formula: gain / sqrt(1 + ((f - fc) / (bw/2))^2)
 * This gives gain at center, gain/sqrt(2) at +/- bw/2 (the -3dB points).
 *
 * Source: Audio EQ Cookbook (Robert Bristow-Johnson), single-pole approximation.
 * Adequate for visualization; not an exact match to the BiquadFilterNode transfer function.
 *
 * @param freq - Probe frequency in Hz
 * @param formant - Formant parameters (center freq, bandwidth, gain)
 * @returns Linear amplitude (0 to gain range)
 */
export function formantMagnitude(freq: number, formant: FormantParams): number {
  const { freq: fc, bw, gain } = formant;
  if (gain === 0) return 0;
  const halfBW = bw / 2;
  const x = (freq - fc) / halfBW;
  return gain / Math.sqrt(1 + x * x);
}

/**
 * Evaluate total spectral envelope at a frequency across all formants.
 * Uses sum of individual formant responses (parallel topology).
 *
 * @param freq - Probe frequency in Hz
 * @param formants - Array of formant parameters
 * @returns Summed linear amplitude from all formants
 */
export function spectralEnvelope(freq: number, formants: FormantParams[]): number {
  let sum = 0;
  for (const f of formants) {
    sum += formantMagnitude(freq, f);
  }
  return sum;
}
