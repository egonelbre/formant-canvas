/**
 * AudioWorklet processor for glottal pulse generation.
 *
 * Generates a Rosenberg-style glottal pulse with aspiration noise mixing.
 * Receives parameter updates via postMessage from the main thread.
 *
 * IMPORTANT: This file runs in AudioWorkletGlobalScope.
 * It CANNOT use ES module imports — all logic is inlined.
 */

/**
 * Inlined Rosenberg C glottal pulse sample generator.
 * Matches the logic in src/lib/audio/dsp/rosenberg.ts.
 *
 * @param phase - Normalized phase within the glottal period [0, 1)
 * @param openQuotient - Fraction of period that glottis is open
 * @returns Glottal volume velocity sample, range [0, 1]
 */
function rosenbergSample(phase: number, openQuotient: number): number {
  const Tn = openQuotient;
  const Tp = 0.4 * Tn;

  if (phase < Tp) {
    // Rising phase: half sinusoid from 0 to 1
    return 0.5 * (1 - Math.cos(Math.PI * phase / Tp));
  } else if (phase < Tn) {
    // Closing phase: cosine fall from 1 to 0
    return Math.cos(Math.PI * 0.5 * ((phase - Tp) / (Tn - Tp)));
  } else {
    // Closed phase
    return 0;
  }
}

class GlottalProcessor extends AudioWorkletProcessor {
  /** Normalized phase within the glottal period [0, 1) */
  private phase: number = 0;

  /** Fundamental frequency in Hz */
  private f0: number = 120;

  /** Aspiration noise mix level (0-1) */
  private aspirationLevel: number = 0.03;

  /** Rosenberg open quotient (0.4-0.7 typical) */
  private openQuotient: number = 0.6;

  constructor() {
    super();
    this.port.onmessage = (event: MessageEvent) => {
      const data = event.data;
      if (data.type === 'params') {
        if (data.f0 !== undefined) this.f0 = data.f0;
        if (data.aspirationLevel !== undefined) this.aspirationLevel = data.aspirationLevel;
        if (data.openQuotient !== undefined) this.openQuotient = data.openQuotient;
      }
    };
  }

  process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>
  ): boolean {
    const output = outputs[0];
    if (!output || !output[0]) return true;

    const channel = output[0];
    const sr = sampleRate;
    const phaseIncrement = this.f0 / sr;

    for (let i = 0; i < channel.length; i++) {
      // Generate Rosenberg glottal pulse sample
      const glottal = rosenbergSample(this.phase, this.openQuotient);

      // Mix aspiration noise (per D-02)
      const noise = (Math.random() * 2 - 1) * this.aspirationLevel;
      channel[i] = glottal + noise;

      // Advance phase
      this.phase += phaseIncrement;
      if (this.phase >= 1.0) this.phase -= 1.0;
    }

    // ALWAYS return true — continuous source (per Pitfall 5)
    return true;
  }
}

registerProcessor('glottal-processor', GlottalProcessor);
