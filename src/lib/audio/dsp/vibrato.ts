/**
 * Compute a vibrato frequency modulation ratio.
 *
 * Returns a multiplier for f0 based on a sine-wave LFO.
 * Formula: 2^(extentCents * sin(2 * PI * vibratoPhase) / 1200)
 *
 * @param vibratoPhase - Current LFO phase [0, 1)
 * @param extentCents - Vibrato depth in cents (e.g. 100 = one semitone)
 * @returns Frequency ratio to multiply with f0 (1.0 = no modulation)
 */
export function vibratoModulation(
  vibratoPhase: number,
  extentCents: number
): number {
  if (extentCents === 0) return 1.0;
  return Math.pow(
    2,
    (extentCents * Math.sin(2 * Math.PI * vibratoPhase)) / 1200
  );
}

/**
 * Advance the vibrato LFO phase by one sample.
 *
 * @param currentPhase - Current phase [0, 1)
 * @param rate - Vibrato rate in Hz
 * @param sampleRate - Audio sample rate in Hz
 * @returns New phase, wrapped to [0, 1)
 */
export function advanceVibratoPhase(
  currentPhase: number,
  rate: number,
  sampleRate: number
): number {
  const nextPhase = currentPhase + rate / sampleRate;
  return nextPhase % 1;
}
