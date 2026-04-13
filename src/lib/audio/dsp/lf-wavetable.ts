/**
 * Band-limited wavetable generation for the LF glottal model.
 *
 * Pre-computes LF pulse waveforms with harmonics truncated at Nyquist
 * for each f0 range. Uses an inline radix-2 FFT (no dependencies)
 * suitable for later inlining into AudioWorkletGlobalScope.
 *
 * Strategy:
 *   1. Generate one analytical LF period
 *   2. FFT
 *   3. Zero harmonics above Nyquist for the target f0 band
 *   4. IFFT to get band-limited version
 *   5. Normalize peak to 1.0
 */

import { computeLfParams, lfDerivativeSample } from './lf-model.ts';

/**
 * In-place radix-2 Cooley-Tukey FFT.
 *
 * Input arrays must be power-of-2 length and the same length.
 * After the call, real[k] and imag[k] contain the k-th DFT bin.
 */
export function fft(real: Float32Array, imag: Float32Array): void {
  const N = real.length;
  if (N <= 1) return;

  // Bit-reversal permutation
  let j = 0;
  for (let i = 0; i < N - 1; i++) {
    if (i < j) {
      let tmp = real[i];
      real[i] = real[j];
      real[j] = tmp;
      tmp = imag[i];
      imag[i] = imag[j];
      imag[j] = tmp;
    }
    let k = N >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  // Cooley-Tukey butterfly
  for (let size = 2; size <= N; size <<= 1) {
    const halfSize = size >> 1;
    const angleStep = (-2 * Math.PI) / size;
    for (let i = 0; i < N; i += size) {
      for (let k = 0; k < halfSize; k++) {
        const angle = angleStep * k;
        const wr = Math.cos(angle);
        const wi = Math.sin(angle);
        const idx1 = i + k;
        const idx2 = i + k + halfSize;
        const tr = wr * real[idx2] - wi * imag[idx2];
        const ti = wr * imag[idx2] + wi * real[idx2];
        real[idx2] = real[idx1] - tr;
        imag[idx2] = imag[idx1] - ti;
        real[idx1] = real[idx1] + tr;
        imag[idx1] = imag[idx1] + ti;
      }
    }
  }
}

/**
 * In-place inverse FFT via conjugate trick with 1/N normalization.
 */
export function ifft(real: Float32Array, imag: Float32Array): void {
  const N = real.length;

  // Conjugate
  for (let i = 0; i < N; i++) {
    imag[i] = -imag[i];
  }

  // Forward FFT
  fft(real, imag);

  // Conjugate and normalize
  const invN = 1 / N;
  for (let i = 0; i < N; i++) {
    real[i] *= invN;
    imag[i] = -imag[i] * invN;
  }
}

/**
 * F0 boundaries defining 10 octave bands for wavetable lookup.
 * 11 boundaries = 10 bands, covering voice range from ~55 Hz (A1)
 * to ~1760 Hz (A6). Band i covers [boundary[i], boundary[i+1]).
 */
export const OCTAVE_F0_BOUNDARIES: number[] = [
  55, 82.5, 110, 165, 220, 330, 440, 660, 880, 1320, 1760,
];

/**
 * Grid of 10 Rd values spanning the full voice quality range.
 * Used to pre-compute the complete wavetable bank.
 */
export const RD_GRID: number[] = [
  0.3, 0.57, 0.83, 1.1, 1.37, 1.63, 1.9, 2.17, 2.43, 2.7,
];

/**
 * Generate a band-limited LF wavetable for a given Rd value.
 *
 * Creates one analytical LF period, applies FFT, truncates harmonics
 * above maxHarmonics, applies IFFT, and normalizes peak to 1.0.
 *
 * @param Rd - Voice quality parameter [0.3, 2.7]
 * @param tableSize - Samples per table (must be power of 2, 2048 recommended)
 * @param maxHarmonics - Maximum harmonics to keep (determined by Nyquist for target f0 band)
 * @param sampleRate - Sample rate in Hz (default 48000, used only for reference f0 computation)
 * @returns Float32Array of one normalized band-limited period
 */
export function generateLfWavetable(
  Rd: number,
  tableSize: number,
  maxHarmonics: number,
  sampleRate: number = 48000,
): Float32Array {
  // Use a reference f0 so that one period = tableSize samples
  // f0 = sampleRate / tableSize
  const refF0 = sampleRate / tableSize;
  const params = computeLfParams(Rd, refF0);

  // Generate one analytical LF period
  const real = new Float32Array(tableSize);
  const imag = new Float32Array(tableSize);
  for (let i = 0; i < tableSize; i++) {
    const t = (i / tableSize) * params.T0;
    real[i] = lfDerivativeSample(t, params);
  }

  // Forward FFT
  fft(real, imag);

  // Zero harmonics above maxHarmonics (both positive and negative frequency)
  // Bin 0 = DC, bins 1..N/2-1 = positive freq, bin N/2 = Nyquist, bins N/2+1..N-1 = negative freq
  const limit = Math.min(maxHarmonics + 1, tableSize / 2);
  for (let k = limit; k <= tableSize / 2; k++) {
    real[k] = 0;
    imag[k] = 0;
    if (k > 0 && k < tableSize) {
      real[tableSize - k] = 0;
      imag[tableSize - k] = 0;
    }
  }

  // Inverse FFT
  ifft(real, imag);

  // Normalize peak to 1.0
  let maxAbs = 0;
  for (let i = 0; i < tableSize; i++) {
    const abs = Math.abs(real[i]);
    if (abs > maxAbs) maxAbs = abs;
  }

  const table = new Float32Array(tableSize);
  if (maxAbs > 0) {
    for (let i = 0; i < tableSize; i++) {
      table[i] = real[i] / maxAbs;
    }
  }

  return table;
}

/**
 * Generate a set of 10 band-limited wavetables for one Rd value,
 * one per octave band. Each table has harmonics truncated at Nyquist
 * for the band's maximum f0.
 *
 * @param Rd - Voice quality parameter [0.3, 2.7]
 * @param sampleRate - Audio sample rate in Hz
 * @returns Array of 10 Float32Array wavetables (one per octave band)
 */
export function generateLfWavetableSet(
  Rd: number,
  sampleRate: number,
): Float32Array[] {
  const tableSize = 2048;
  const tables: Float32Array[] = [];

  // 10 bands from OCTAVE_F0_BOUNDARIES (11 boundaries)
  for (let band = 0; band < 10; band++) {
    const bandMaxF0 = OCTAVE_F0_BOUNDARIES[band + 1];
    const maxHarmonics = Math.floor(sampleRate / 2 / bandMaxF0);
    tables.push(generateLfWavetable(Rd, tableSize, maxHarmonics, sampleRate));
  }

  return tables;
}

/**
 * Generate the complete wavetable bank: 10 Rd values x 10 octave bands.
 *
 * Returns a 2D array indexed as bank[rdIndex][octaveIndex].
 * Total: 100 tables x 2048 samples x 4 bytes = ~800 KB.
 *
 * @param sampleRate - Audio sample rate in Hz
 * @returns 2D array of Float32Array wavetables
 */
export function generateFullWavetableBank(
  sampleRate: number,
): Float32Array[][] {
  const bank: Float32Array[][] = [];
  for (const rd of RD_GRID) {
    bank.push(generateLfWavetableSet(rd, sampleRate));
  }
  return bank;
}
