/**
 * AudioWorklet processor for glottal pulse generation.
 *
 * Generates a Rosenberg-style or LF glottal pulse with aspiration noise mixing.
 * Receives parameter updates via postMessage from the main thread.
 *
 * IMPORTANT: This file runs in AudioWorkletGlobalScope.
 * It CANNOT use ES module imports — all logic is inlined.
 */

// ============================================================
// Inlined Rosenberg C glottal pulse sample generator
// (from src/lib/audio/dsp/rosenberg.ts)
// ============================================================

function rosenbergSample(phase: number, openQuotient: number): number {
  if (phase < 0 || phase >= 1) return 0;
  const Tn = openQuotient;
  const Tp = 0.4 * Tn;

  if (phase < Tp) {
    return 0.5 * (1 - Math.cos(Math.PI * phase / Tp));
  } else if (phase < Tn) {
    return Math.cos(Math.PI * 0.5 * ((phase - Tp) / (Tn - Tp)));
  } else {
    return 0;
  }
}

// ============================================================
// Inlined vibrato modulation (from src/lib/audio/dsp/vibrato.ts)
// ============================================================

function vibratoModulation(vibratoPhase: number, extentCents: number): number {
  if (extentCents === 0) return 1.0;
  return Math.pow(2, (extentCents * Math.sin(2 * Math.PI * vibratoPhase)) / 1200);
}

// ============================================================
// Inlined spectral tilt (from src/lib/audio/dsp/spectral-tilt.ts)
// ============================================================

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

function applyTiltSample(input: number, prevOutput: number, a: number, b: number): number {
  return a * input + b * prevOutput;
}

// ============================================================
// Inlined LF model (from src/lib/audio/dsp/lf-model.ts)
// ============================================================

interface LfParams {
  Tp: number;
  Te: number;
  Ta: number;
  T0: number;
  alpha: number;
  epsilon: number;
  E0: number;
  Ee: number;
}

interface RdDecomposition {
  Ra: number;
  Rk: number;
  Rg: number;
  Tp: number;
  Te: number;
  Ta: number;
  Tc: number;
}

function rdToDecomposition(Rd: number, f0: number): RdDecomposition {
  const rd = Math.max(0.3, Math.min(2.7, Rd));
  const T0 = 1 / f0;

  const Ra = (-1 + 4.8 * rd) / 100;
  const Rk = (22.4 + 11.8 * rd) / 100;
  const Rg = (0.44 * rd + 1.073) / (1.0 + 0.46 * rd);

  const Tp = T0 / (2 * Rg);
  const Te = Tp * (1 + Rk);
  const Ta = Ra * T0;
  const Tc = T0;

  return { Ra, Rk, Rg, Tp, Te, Ta, Tc };
}

function solveEpsilon(Ta: number, Tb: number): number {
  if (Ta < 1e-15) {
    return 1 / (Tb + 1e-15);
  }

  const f = (eps: number): number => eps * Ta - 1 + Math.exp(-eps * Tb);
  const df = (eps: number): number => Ta - Tb * Math.exp(-eps * Tb);

  let eps = 1 / Ta;
  const TOL = 1e-10;
  const MAX_ITER = 20;

  for (let i = 0; i < MAX_ITER; i++) {
    const fv = f(eps);
    if (Math.abs(fv) < TOL) return eps;
    const dfv = df(eps);
    if (Math.abs(dfv) < 1e-30) break;
    const epsNext = eps - fv / dfv;
    if (epsNext <= 0 || !Number.isFinite(epsNext)) break;
    eps = epsNext;
  }

  let lo = 1e-6;
  let hi = 10 / Ta;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < 0) {
      lo = mid;
    } else {
      hi = mid;
    }
    if (hi - lo < TOL * lo) break;
  }
  return (lo + hi) / 2;
}

function solveAlpha(
  Tp: number,
  Te: number,
  epsilon: number,
  Ta: number,
  T0: number,
): number {
  const omegaG = Math.PI / Tp;
  const Tb = T0 - Te;

  const expMinusEpsTb = Math.exp(-epsilon * Tb);
  const returnIntegral =
    (-1 / (epsilon * Ta)) *
    ((1 - expMinusEpsTb) / epsilon - Tb * expMinusEpsTb);

  const sinTe = Math.sin(omegaG * Te);
  const cosTe = Math.cos(omegaG * Te);

  const fAlpha = (a: number): number => {
    const expATe = Math.exp(a * Te);
    const denom = a * a + omegaG * omegaG;
    const openPrim =
      (expATe * (a * sinTe - omegaG * cosTe) + omegaG) / denom;
    const e0 = -1 / (expATe * sinTe);
    return e0 * openPrim + returnIntegral;
  };

  const dfAlpha = (a: number): number => {
    const h = Math.abs(a) * 1e-6 + 1e-10;
    return (fAlpha(a + h) - fAlpha(a - h)) / (2 * h);
  };

  let alpha = 1 / Tp;
  const TOL = 1e-10;
  const MAX_ITER = 20;

  for (let i = 0; i < MAX_ITER; i++) {
    const fv = fAlpha(alpha);
    if (Math.abs(fv) < TOL) return alpha;
    const dfv = dfAlpha(alpha);
    if (Math.abs(dfv) < 1e-30) break;
    const alphaNext = alpha - fv / dfv;
    if (!Number.isFinite(alphaNext)) break;
    alpha = alphaNext;
  }

  if (Number.isFinite(alpha) && Math.abs(fAlpha(alpha)) < 1e-6) {
    return alpha;
  }

  let lo = -10 / Tp;
  let hi = 10 / Tp;

  const fLo = fAlpha(lo);
  const fHi = fAlpha(hi);
  if (fLo * fHi > 0) {
    lo = -100 / Tp;
    hi = 100 / Tp;
  }

  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const fMid = fAlpha(mid);
    if (Math.abs(fMid) < TOL) return mid;
    if (fAlpha(lo) * fMid < 0) {
      hi = mid;
    } else {
      lo = mid;
    }
    if (Math.abs(hi - lo) < TOL * (Math.abs(lo) + 1)) break;
  }
  return (lo + hi) / 2;
}

function computeLfParams(Rd: number, f0: number): LfParams {
  const decomp = rdToDecomposition(Rd, f0);
  const T0 = 1 / f0;
  const Tb = T0 - decomp.Te;

  const epsilon = solveEpsilon(decomp.Ta, Tb);
  const alpha = solveAlpha(decomp.Tp, decomp.Te, epsilon, decomp.Ta, T0);

  const omegaG = Math.PI / decomp.Tp;
  const sinTe = Math.sin(omegaG * decomp.Te);
  const E0 = -1.0 / (Math.exp(alpha * decomp.Te) * sinTe);

  return {
    Tp: decomp.Tp,
    Te: decomp.Te,
    Ta: decomp.Ta,
    T0,
    alpha,
    epsilon,
    E0,
    Ee: 1.0,
  };
}

function lfDerivativeSample(t: number, params: LfParams): number {
  const { Tp, Te, Ta, T0, alpha, epsilon, E0, Ee } = params;

  if (t < 0 || t >= T0) return 0;

  const omegaG = Math.PI / Tp;

  if (t < Te) {
    return E0 * Math.exp(alpha * t) * Math.sin(omegaG * t);
  } else {
    const Tb = T0 - Te;
    const expDecay = Math.exp(-epsilon * (t - Te));
    const expTail = Math.exp(-epsilon * Tb);
    return (-Ee / (epsilon * Ta)) * (expDecay - expTail);
  }
}

// ============================================================
// Inlined wavetable generation (from src/lib/audio/dsp/lf-wavetable.ts)
// ============================================================

function fft(real: Float32Array, imag: Float32Array): void {
  const N = real.length;
  if (N <= 1) return;

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

function ifft(real: Float32Array, imag: Float32Array): void {
  const N = real.length;

  for (let i = 0; i < N; i++) {
    imag[i] = -imag[i];
  }

  fft(real, imag);

  const invN = 1 / N;
  for (let i = 0; i < N; i++) {
    real[i] *= invN;
    imag[i] = -imag[i] * invN;
  }
}

const OCTAVE_F0_BOUNDARIES: number[] = [
  55, 82.5, 110, 165, 220, 330, 440, 660, 880, 1320, 1760,
];

const RD_GRID: number[] = [
  0.3, 0.57, 0.83, 1.1, 1.37, 1.63, 1.9, 2.17, 2.43, 2.7,
];

function generateLfWavetable(
  Rd: number,
  tableSize: number,
  maxHarmonics: number,
  sRate: number = 48000,
): Float32Array {
  const refF0 = sRate / tableSize;
  const params = computeLfParams(Rd, refF0);

  const real = new Float32Array(tableSize);
  const imag = new Float32Array(tableSize);
  for (let i = 0; i < tableSize; i++) {
    const t = (i / tableSize) * params.T0;
    real[i] = lfDerivativeSample(t, params);
  }

  fft(real, imag);

  const limit = Math.min(maxHarmonics + 1, tableSize / 2);
  for (let k = limit; k <= tableSize / 2; k++) {
    real[k] = 0;
    imag[k] = 0;
    if (k > 0 && k < tableSize) {
      real[tableSize - k] = 0;
      imag[tableSize - k] = 0;
    }
  }

  ifft(real, imag);

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

function generateLfWavetableSet(
  Rd: number,
  sRate: number,
): Float32Array[] {
  const tableSize = 2048;
  const tables: Float32Array[] = [];

  for (let band = 0; band < 10; band++) {
    const bandMaxF0 = OCTAVE_F0_BOUNDARIES[band + 1];
    const maxHarmonics = Math.floor(sRate / 2 / bandMaxF0);
    tables.push(generateLfWavetable(Rd, tableSize, maxHarmonics, sRate));
  }

  return tables;
}

function generateFullWavetableBank(
  sRate: number,
): Float32Array[][] {
  const bank: Float32Array[][] = [];
  for (const rd of RD_GRID) {
    bank.push(generateLfWavetableSet(rd, sRate));
  }
  return bank;
}

// ============================================================
// Processor
// ============================================================

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

  // LF model state (Phase 6)
  private glottalModel: 'rosenberg' | 'lf' = 'rosenberg';
  private rd: number = 1.0;
  private rdTarget: number = 1.0;
  private rdSmooth: number = 0;           // one-pole coefficient, same pattern as f0Smooth
  private wavetableBank: Float32Array[][] | null = null;  // [rdIdx][octaveIdx]
  private tablesReady: boolean = false;

  constructor() {
    super();

    // Pre-compute wavetable bank (~10-50ms, acceptable for constructor)
    // T-06-03 mitigation: if generation fails, tablesReady stays false and Rosenberg is used
    try {
      this.wavetableBank = generateFullWavetableBank(sampleRate);
      this.tablesReady = true;
    } catch {
      this.wavetableBank = null;
      this.tablesReady = false;
    }

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
        if (data.glottalModel !== undefined) this.glottalModel = data.glottalModel;
        if (data.rd !== undefined) this.rdTarget = data.rd;
      }
    };
  }

  /**
   * Bilinear wavetable lookup: interpolates across Rd grid and octave bands.
   *
   * @param phase - Normalized phase [0, 1)
   * @param f0 - Current fundamental frequency in Hz
   * @param rd - Current Rd value
   * @returns Interpolated sample from the wavetable bank
   */
  private wavetableSample(phase: number, f0: number, rd: number): number {
    if (!this.wavetableBank) return 0;

    // Find two nearest Rd indices and interpolation factor
    const rdClamped = Math.max(0.3, Math.min(2.7, rd));
    let rdIdxLo = 0;
    for (let i = 0; i < RD_GRID.length - 1; i++) {
      if (rdClamped >= RD_GRID[i]) rdIdxLo = i;
    }
    let rdIdxHi = Math.min(rdIdxLo + 1, RD_GRID.length - 1);
    let rdFrac = 0;
    if (rdIdxHi !== rdIdxLo) {
      rdFrac = (rdClamped - RD_GRID[rdIdxLo]) / (RD_GRID[rdIdxHi] - RD_GRID[rdIdxLo]);
      rdFrac = Math.max(0, Math.min(1, rdFrac));
    }

    // Find two nearest octave band indices for current f0
    const f0Clamped = Math.max(OCTAVE_F0_BOUNDARIES[0], Math.min(OCTAVE_F0_BOUNDARIES[10], f0));
    let octIdxLo = 0;
    for (let i = 0; i < 10; i++) {
      if (f0Clamped >= OCTAVE_F0_BOUNDARIES[i]) octIdxLo = i;
    }
    // octIdxLo is the band index (0-9), clamp to valid range
    octIdxLo = Math.min(octIdxLo, 9);
    let octIdxHi = Math.min(octIdxLo + 1, 9);
    let octFrac = 0;
    if (octIdxHi !== octIdxLo) {
      octFrac = (f0Clamped - OCTAVE_F0_BOUNDARIES[octIdxLo]) /
        (OCTAVE_F0_BOUNDARIES[octIdxHi] - OCTAVE_F0_BOUNDARIES[octIdxLo]);
      octFrac = Math.max(0, Math.min(1, octFrac));
    }

    // Read samples from 4 tables using linear interpolation for fractional phase
    const tableSize = 2048;
    const posF = phase * tableSize;
    const posI = Math.floor(posF) % tableSize;
    const posFrac = posF - Math.floor(posF);
    const posNext = (posI + 1) % tableSize;

    const readTable = (rdI: number, octI: number): number => {
      const table = this.wavetableBank![rdI][octI];
      return table[posI] + posFrac * (table[posNext] - table[posI]);
    };

    // Bilinear interpolation: Rd dimension x octave dimension
    const s00 = readTable(rdIdxLo, octIdxLo);
    const s10 = readTable(rdIdxHi, octIdxLo);
    const s01 = readTable(rdIdxLo, octIdxHi);
    const s11 = readTable(rdIdxHi, octIdxHi);

    const sOctLo = s00 + rdFrac * (s10 - s00);
    const sOctHi = s01 + rdFrac * (s11 - s01);

    return sOctLo + octFrac * (sOctHi - sOctLo);
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

    // Compute Rd smoothing coefficient (~50ms time constant)
    if (this.rdSmooth === 0) {
      this.rdSmooth = 1 - Math.exp(-1 / (0.05 * sr));
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

      // Smooth Rd toward target (~50ms transition)
      this.rd += this.rdSmooth * (this.rdTarget - this.rd);

      // Vibrato modulation (D-06): audio-rate sine LFO
      const vibratoRatio = vibratoModulation(this.vibratoPhase, this.vibratoExtent);
      const f0Mod = (this.f0 + this.jitterOffset) * vibratoRatio;

      // Clamp f0 to prevent 0 or negative phase increment (T-02-04 threat mitigation)
      const f0Clamped = Math.max(20, Math.min(2000, f0Mod));
      const phaseIncrement = f0Clamped / sr;

      // Advance vibrato LFO phase
      this.vibratoPhase += this.vibratoRate / sr;
      if (this.vibratoPhase >= 1.0) this.vibratoPhase -= 1.0;

      // Generate glottal pulse sample — branch on model
      let glottal: number;
      if (this.glottalModel === 'lf' && this.tablesReady && this.wavetableBank) {
        glottal = this.wavetableSample(this.phase, f0Clamped, this.rd);
      } else {
        glottal = rosenbergSample(this.phase, this.openQuotient);
      }

      // Apply spectral tilt filter to glottal pulse only (not aspiration)
      const tiltedGlottal = applyTiltSample(glottal, this.tiltPrevOutput, this.tiltA, this.tiltB);
      this.tiltPrevOutput = tiltedGlottal;

      // Mix aspiration noise (per D-02)
      const noise = (Math.random() * 2 - 1) * this.aspirationLevel;
      channel[i] = tiltedGlottal + noise;

      // Advance phase — use Math.floor to handle phaseIncrement > 1 (WR-05)
      this.phase += phaseIncrement;
      if (this.phase >= 1.0) {
        this.phase -= Math.floor(this.phase);
        // Per-cycle jitter (D-08): new random offset each glottal cycle
        this.jitterOffset = (Math.random() * 2 - 1) * this.jitterAmount * this.f0 * 0.03;
      }
    }

    // ALWAYS return true — continuous source (per Pitfall 5)
    return true;
  }
}

registerProcessor('glottal-processor', GlottalProcessor);
