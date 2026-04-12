/**
 * Compute one-pole low-pass filter coefficients for spectral tilt.
 *
 * Based on Klatt's LpFilter1 pattern. The filter attenuates high frequencies
 * to model different phonation types (breathy vs pressed voice).
 *
 * Reference frequency is 3000 Hz (Klatt standard).
 * Formula: y[n] = a * x[n] + b * y[n-1]
 *
 * @param tiltDb - Attenuation at 3 kHz in dB (clamped to [0, 24])
 * @param sampleRate - Audio sample rate in Hz
 * @returns Filter coefficients { a, b } for the one-pole filter
 */
export function computeTiltCoefficients(
  tiltDb: number,
  sampleRate: number
): { a: number; b: number } {
  // Clamp to valid range (T-02-02 threat mitigation)
  const clampedTilt = Math.max(0, Math.min(24, tiltDb));

  // Passthrough: no tilt
  if (clampedTilt === 0) {
    return { a: 1, b: 0 };
  }

  // Target gain at reference frequency
  const g = Math.pow(10, -clampedTilt / 20);
  const w = (2 * Math.PI * 3000) / sampleRate;
  const gSq = g * g;
  const q = (1 - gSq * Math.cos(w)) / (1 - gSq);
  const b = q - Math.sqrt(q * q - 1);
  const a = 1 - b;

  return { a, b };
}

/**
 * Apply the one-pole spectral tilt filter to a single sample.
 *
 * @param input - Current input sample
 * @param prevOutput - Previous filter output sample
 * @param a - Feed-forward coefficient
 * @param b - Feedback coefficient
 * @returns Filtered output sample
 */
export function applyTiltSample(
  input: number,
  prevOutput: number,
  a: number,
  b: number
): number {
  return a * input + b * prevOutput;
}
