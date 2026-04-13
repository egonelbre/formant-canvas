import type { FormantParams, FilterTopology, FilterOrder } from '../../types.ts';

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

/**
 * Evaluate cascade spectral envelope at a frequency across all formants.
 * In cascade topology, formants are chained in series, so the overall
 * transfer function is the product of individual transfer functions.
 * Uses gain=1 (shape-only) so the cascade product gives relative response.
 *
 * @param freq - Probe frequency in Hz
 * @param formants - Array of formant parameters
 * @param order - Filter order: 2 (default) or 4 (squares each magnitude)
 * @returns Product of shape magnitudes from all formants
 */
export function cascadeEnvelope(
  freq: number,
  formants: FormantParams[],
  order: FilterOrder = 2,
): number {
  let product = 1;
  for (const f of formants) {
    const mag = formantMagnitude(freq, { freq: f.freq, bw: f.bw, gain: 1 });
    if (order === 4) {
      product *= mag * mag;
    } else {
      product *= mag;
    }
  }
  return product;
}

/**
 * Evaluate spectral envelope using the specified filter topology.
 * Dispatches to either parallel (sum) or cascade (product) computation.
 *
 * @param freq - Probe frequency in Hz
 * @param formants - Array of formant parameters
 * @param topology - 'parallel' (sum) or 'cascade' (product)
 * @param order - Filter order: 2 (default) or 4 (squares each magnitude)
 * @returns Envelope amplitude at the given frequency
 */
export function topologyAwareEnvelope(
  freq: number,
  formants: FormantParams[],
  topology: FilterTopology,
  order: FilterOrder = 2,
): number {
  if (topology === 'cascade') {
    return cascadeEnvelope(freq, formants, order);
  }
  let sum = 0;
  for (const f of formants) {
    let mag = formantMagnitude(freq, f);
    if (order === 4) {
      mag = mag * mag;
    }
    sum += mag;
  }
  return sum;
}
