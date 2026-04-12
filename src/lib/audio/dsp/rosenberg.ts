/**
 * Generate one sample of a Rosenberg-style glottal pulse.
 *
 * The Rosenberg C model generates a glottal volume velocity waveform:
 * - Open phase (0 <= phase < Tp): rising sinusoidal half-period
 * - Closing phase (Tp <= phase < Tn): falling cosine half-period
 * - Closed phase (phase >= Tn): zero output
 *
 * Source: Rosenberg (1971), Klatt (1980) KLGLOTT88 variant
 *
 * @param phase - Normalized phase within the glottal period [0, 1)
 * @param openQuotient - Fraction of period that glottis is open (0.4-0.7 typical)
 * @returns Glottal volume velocity sample, range [0, 1]
 */
export function rosenbergSample(
  phase: number,
  openQuotient: number = 0.6
): number {
  if (phase < 0 || phase >= 1) return 0;

  // Tp = peak of pulse (40% of open phase, speed quotient ~1.5)
  // Tn = total open phase duration
  const Tn = openQuotient;
  const Tp = 0.4 * Tn;

  if (phase < Tp) {
    // Rising phase: half sinusoid from 0 to 1
    return 0.5 * (1 - Math.cos(Math.PI * phase / Tp));
  } else if (phase < Tn) {
    // Closing phase: cosine fall from 1 to 0
    const closingPhase = (phase - Tp) / (Tn - Tp);
    return Math.cos(Math.PI * 0.5 * closingPhase);
  } else {
    // Closed phase
    return 0;
  }
}
