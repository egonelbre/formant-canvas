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

/**
 * Inlined vibrato modulation (from src/lib/audio/dsp/vibrato.ts).
 * Returns a frequency ratio to multiply with f0 (1.0 = no modulation).
 */
function vibratoModulation(vibratoPhase: number, extentCents: number): number {
  if (extentCents === 0) return 1.0;
  return Math.pow(2, (extentCents * Math.sin(2 * Math.PI * vibratoPhase)) / 1200);
}

/**
 * Inlined spectral tilt coefficient computation (from src/lib/audio/dsp/spectral-tilt.ts).
 * One-pole low-pass filter coefficients for Klatt-style spectral tilt.
 * Reference frequency is 3000 Hz.
 */
function computeTiltCoeffs(tiltDb: number, sr: number): { a: number; b: number } {
  const clampedTilt = Math.max(0, Math.min(24, tiltDb));
  if (clampedTilt === 0) {
    return { a: 1, b: 0 };
  }
  const g = Math.pow(10, -clampedTilt / 20);
  const w = (2 * Math.PI * 3000) / sr;
  const gSq = g * g;
  const q = (1 - gSq * Math.cos(w)) / (1 - gSq);
  const b = q - Math.sqrt(q * q - 1);
  const a = 1 - b;
  return { a, b };
}

/**
 * Inlined one-pole spectral tilt filter (from src/lib/audio/dsp/spectral-tilt.ts).
 * y[n] = a * x[n] + b * y[n-1]
 */
function applyTiltSample(input: number, prevOutput: number, a: number, b: number): number {
  return a * input + b * prevOutput;
}

class GlottalProcessor extends AudioWorkletProcessor {
  /** Normalized phase within the glottal period [0, 1) */
  private phase: number = 0;

  /** Fundamental frequency in Hz (smoothed toward f0Target) */
  private f0: number = 120;
  /** Target f0 — set by postMessage, smoothed per-sample */
  private f0Target: number = 120;
  /** One-pole smoothing coefficient for f0 (recomputed from sampleRate) */
  private f0Smooth: number = 0;

  /** Aspiration noise mix level (0-1) */
  private aspirationLevel: number = 0.03;

  /** Rosenberg open quotient (0.4-0.7 typical) */
  private openQuotient: number = 0.6;

  // Vibrato LFO state (D-06)
  private vibratoRate: number = 5;        // Hz
  private vibratoExtent: number = 10;     // cents
  private vibratoPhase: number = 0;       // [0, 1)

  // Jitter state (D-08)
  private jitterAmount: number = 0;       // 0-1
  private jitterOffset: number = 0;       // Hz, current cycle's offset

  // Spectral tilt state (D-10)
  private spectralTilt: number = 6;       // dB at 3 kHz
  private tiltA: number = 1;              // filter coefficient a
  private tiltB: number = 0;              // filter coefficient b
  private tiltPrevOutput: number = 0;     // y[n-1] filter memory
  private tiltCoeffsNeedUpdate: boolean = true;

  constructor() {
    super();
    this.port.onmessage = (event: MessageEvent) => {
      const data = event.data;
      if (data.type === 'params') {
        if (data.f0 !== undefined) this.f0Target = data.f0;
        if (data.aspirationLevel !== undefined) this.aspirationLevel = data.aspirationLevel;
        if (data.openQuotient !== undefined) this.openQuotient = data.openQuotient;
        if (data.vibratoRate !== undefined) this.vibratoRate = data.vibratoRate;
        if (data.vibratoExtent !== undefined) this.vibratoExtent = data.vibratoExtent;
        if (data.jitterAmount !== undefined) this.jitterAmount = data.jitterAmount;
        if (data.spectralTilt !== undefined) {
          this.spectralTilt = data.spectralTilt;
          this.tiltCoeffsNeedUpdate = true;
        }
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

    // Compute f0 smoothing coefficient (~50ms time constant)
    if (this.f0Smooth === 0) {
      this.f0Smooth = 1 - Math.exp(-1 / (0.05 * sr));
    }

    // Recompute tilt coefficients only when spectralTilt changes
    if (this.tiltCoeffsNeedUpdate) {
      const coeffs = computeTiltCoeffs(this.spectralTilt, sr);
      this.tiltA = coeffs.a;
      this.tiltB = coeffs.b;
      this.tiltCoeffsNeedUpdate = false;
    }

    for (let i = 0; i < channel.length; i++) {
      // Smooth f0 toward target (~50ms transition)
      this.f0 += this.f0Smooth * (this.f0Target - this.f0);

      // Vibrato modulation (D-06): audio-rate sine LFO
      const vibratoRatio = vibratoModulation(this.vibratoPhase, this.vibratoExtent);
      const f0Mod = (this.f0 + this.jitterOffset) * vibratoRatio;

      // Clamp f0 to prevent 0 or negative phase increment (T-02-04 threat mitigation)
      const f0Clamped = Math.max(20, Math.min(2000, f0Mod));
      const phaseIncrement = f0Clamped / sr;

      // Advance vibrato LFO phase
      this.vibratoPhase += this.vibratoRate / sr;
      if (this.vibratoPhase >= 1.0) this.vibratoPhase -= 1.0;

      // Generate Rosenberg glottal pulse sample
      const glottal = rosenbergSample(this.phase, this.openQuotient);

      // Apply spectral tilt filter to glottal pulse only (not aspiration)
      const tiltedGlottal = applyTiltSample(glottal, this.tiltPrevOutput, this.tiltA, this.tiltB);
      this.tiltPrevOutput = tiltedGlottal;

      // Mix aspiration noise (per D-02)
      const noise = (Math.random() * 2 - 1) * this.aspirationLevel;
      channel[i] = tiltedGlottal + noise;

      // Advance phase
      this.phase += phaseIncrement;
      if (this.phase >= 1.0) {
        this.phase -= 1.0;
        // Per-cycle jitter (D-08): new random offset each glottal cycle
        this.jitterOffset = (Math.random() * 2 - 1) * this.jitterAmount * this.f0 * 0.03;
      }
    }

    // ALWAYS return true — continuous source (per Pitfall 5)
    return true;
  }
}

registerProcessor('glottal-processor', GlottalProcessor);
