/**
 * Liljencrants-Fant (LF) glottal pulse model.
 *
 * Implements the derivative of glottal flow U_g'(t) as a piecewise function:
 * - Open phase (0 <= t < Te): E0 * exp(alpha * t) * sin(pi * t / Tp)
 * - Return phase (Te <= t < T0): exponential decay back to zero
 * - Closed phase: 0
 *
 * The single Rd parameter (Fant 1995) controls voice quality from
 * pressed (0.3) through modal (1.0) to breathy (2.7).
 *
 * All functions are pure — no side effects, no AudioWorklet dependency.
 *
 * Sources:
 *   Fant, Liljencrants & Lin (1985) — LF waveform equations
 *   Fant (1995) — Rd parameterization regression
 *   mvsoom/lf-model (GitHub) — reference Python implementation
 */

/** R-parameter decomposition from Rd, plus derived timing values. */
export interface RdDecomposition {
  /** Return phase ratio */
  Ra: number;
  /** Asymmetry ratio (open phase skew) */
  Rk: number;
  /** Glottal frequency ratio */
  Rg: number;
  /** Time of maximum glottal flow (seconds) */
  Tp: number;
  /** Closure instant — time of maximum excitation (seconds) */
  Te: number;
  /** Effective return phase duration (seconds) */
  Ta: number;
  /** Complete closure time (seconds), typically equals T0 */
  Tc: number;
}

/** Full LF model parameters needed to evaluate the waveform. */
export interface LfParams {
  /** Time of maximum glottal flow (seconds) */
  Tp: number;
  /** Closure instant (seconds) */
  Te: number;
  /** Return phase effective duration (seconds) */
  Ta: number;
  /** Glottal period = 1/f0 (seconds) */
  T0: number;
  /** Open phase exponential growth rate */
  alpha: number;
  /** Return phase exponential decay rate */
  epsilon: number;
  /** Open phase amplitude factor (from continuity constraint) */
  E0: number;
  /** Excitation amplitude at closure instant (normalized to 1.0) */
  Ee: number;
}

/**
 * Convert Rd voice quality parameter to R waveshape parameters
 * and derived timing values.
 *
 * Fant 1995 regression equations. Rd is clamped to [0.3, 2.7].
 *
 * @param Rd - Voice quality parameter (0.3 = pressed, 1.0 = modal, 2.7 = breathy)
 * @param f0 - Fundamental frequency in Hz
 */
export function rdToDecomposition(Rd: number, f0: number): RdDecomposition {
  const rd = Math.max(0.3, Math.min(2.7, Rd));
  const T0 = 1 / f0;

  // Fant 1995 regression equations
  const Ra = (-1 + 4.8 * rd) / 100;
  const Rk = (22.4 + 11.8 * rd) / 100;
  // Simplified Fant 1995 approximation for Rg
  const Rg = (0.44 * rd + 1.073) / (1.0 + 0.46 * rd);

  const Tp = T0 / (2 * Rg);
  const Te = Tp * (1 + Rk);
  const Ta = Ra * T0;
  const Tc = T0;

  return { Ra, Rk, Rg, Tp, Te, Ta, Tc };
}

/**
 * Solve for epsilon (return phase decay rate) via Newton-Raphson.
 *
 * Solves: epsilon * Ta = 1 - exp(-epsilon * Tb)
 * where Tb = T0 - Te (duration from closure to end of period).
 *
 * Falls back to bisection if Newton-Raphson diverges.
 *
 * @param Ta - Effective return phase duration (seconds)
 * @param Tb - Time from Te to T0 (seconds)
 * @returns epsilon > 0
 */
export function solveEpsilon(Ta: number, Tb: number): number {
  // Edge case: very small Ta (pressed voice)
  if (Ta < 1e-15) {
    return 1 / (Tb + 1e-15);
  }

  // f(eps) = eps * Ta - 1 + exp(-eps * Tb) = 0
  // f'(eps) = Ta - Tb * exp(-eps * Tb)
  const f = (eps: number): number => eps * Ta - 1 + Math.exp(-eps * Tb);
  const df = (eps: number): number => Ta - Tb * Math.exp(-eps * Tb);

  // Initial guess
  let eps = 1 / Ta;
  const TOL = 1e-10;
  const MAX_ITER = 20;

  // Newton-Raphson
  for (let i = 0; i < MAX_ITER; i++) {
    const fv = f(eps);
    if (Math.abs(fv) < TOL) return eps;
    const dfv = df(eps);
    if (Math.abs(dfv) < 1e-30) break; // derivative too small, switch to bisection
    const epsNext = eps - fv / dfv;
    if (epsNext <= 0 || !Number.isFinite(epsNext)) break; // diverged
    eps = epsNext;
  }

  // Bisection fallback
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

/**
 * Solve for alpha (open phase growth rate) via Newton-Raphson.
 *
 * The zero-net-flow constraint requires that the integral of the
 * LF derivative over one complete period equals zero:
 *   integral(open phase) + integral(return phase) = 0
 *
 * Open phase integral (0..Te):
 *   E0 * integral(exp(alpha*t) * sin(omega_g*t), 0, Te)
 *
 * Return phase integral (Te..T0):
 *   Known once epsilon is solved.
 *
 * We solve for alpha such that the waveform has zero net flow.
 *
 * Falls back to bisection if Newton-Raphson diverges.
 *
 * @param Tp - Time of peak flow
 * @param Te - Closure instant
 * @param epsilon - Return phase decay rate
 * @param Ta - Effective return phase duration
 * @param T0 - Period
 * @returns alpha
 */
export function solveAlpha(
  Tp: number,
  Te: number,
  epsilon: number,
  Ta: number,
  T0: number,
): number {
  const omegaG = Math.PI / Tp;
  const Tb = T0 - Te;

  // Return phase integral (fixed, independent of alpha):
  // integral of (-Ee / (eps * Ta)) * (exp(-eps*(t-Te)) - exp(-eps*Tb)) dt from Te to T0
  // = (-1 / (eps * Ta)) * [-1/eps * (exp(-eps*Tb) - 1) - Tb * exp(-eps*Tb)]
  // = (-1 / (eps * Ta)) * [(1 - exp(-eps*Tb))/eps - Tb * exp(-eps*Tb)]
  const expMinusEpsTb = Math.exp(-epsilon * Tb);
  const returnIntegral =
    (-1 / (epsilon * Ta)) *
    ((1 - expMinusEpsTb) / epsilon - Tb * expMinusEpsTb);

  // Open phase integral as a function of alpha:
  // integral of E0 * exp(alpha*t) * sin(omega_g*t) dt from 0 to Te
  // = E0 * [exp(alpha*t)*(alpha*sin(omega_g*t) - omega_g*cos(omega_g*t))] / (alpha^2 + omega_g^2) from 0 to Te
  // Dividing by E0, we need this to equal -returnIntegral / E0
  // But E0 itself depends on alpha (continuity at Te): E0 = -Ee / (exp(alpha*Te) * sin(omega_g*Te))
  // So the condition becomes:
  //   (-1/(exp(alpha*Te)*sin(omega_g*Te))) * openPhasePrimitive(alpha) + returnIntegral = 0

  const sinTe = Math.sin(omegaG * Te);
  const cosTe = Math.cos(omegaG * Te);

  // openPhasePrimitive(alpha) = integral of exp(alpha*t)*sin(omega_g*t) from 0 to Te
  // = [exp(alpha*Te)*(alpha*sin(omega_g*Te) - omega_g*cos(omega_g*Te)) - (0 - omega_g)] / (alpha^2 + omega_g^2)
  // = [exp(alpha*Te)*(alpha*sinTe - omega_g*cosTe) + omega_g] / (alpha^2 + omega_g^2)

  // f(alpha) = E0(alpha) * openPhasePrimitive(alpha) + returnIntegral = 0
  // where E0(alpha) = -1 / (exp(alpha*Te) * sinTe)  (with Ee=1)

  // Substituting:
  // f(alpha) = (-1 / (exp(alpha*Te)*sinTe)) * [exp(alpha*Te)*(alpha*sinTe - omega_g*cosTe) + omega_g] / (alpha^2 + omega_g^2) + returnIntegral
  // = [-(alpha*sinTe - omega_g*cosTe) / sinTe - omega_g / (exp(alpha*Te)*sinTe)] / (alpha^2 + omega_g^2) + returnIntegral
  // = [-(alpha - omega_g*cosTe/sinTe) - omega_g/(exp(alpha*Te)*sinTe)] / (alpha^2 + omega_g^2) + returnIntegral

  const fAlpha = (a: number): number => {
    const expATe = Math.exp(a * Te);
    const denom = a * a + omegaG * omegaG;
    const openPrim =
      (expATe * (a * sinTe - omegaG * cosTe) + omegaG) / denom;
    const e0 = -1 / (expATe * sinTe);
    return e0 * openPrim + returnIntegral;
  };

  // Numerical derivative
  const dfAlpha = (a: number): number => {
    const h = Math.abs(a) * 1e-6 + 1e-10;
    return (fAlpha(a + h) - fAlpha(a - h)) / (2 * h);
  };

  // Initial guess
  let alpha = 1 / Tp;
  const TOL = 1e-10;
  const MAX_ITER = 20;

  // Newton-Raphson
  for (let i = 0; i < MAX_ITER; i++) {
    const fv = fAlpha(alpha);
    if (Math.abs(fv) < TOL) return alpha;
    const dfv = dfAlpha(alpha);
    if (Math.abs(dfv) < 1e-30) break;
    const alphaNext = alpha - fv / dfv;
    if (!Number.isFinite(alphaNext)) break;
    alpha = alphaNext;
  }

  // If Newton converged enough, return
  if (Number.isFinite(alpha) && Math.abs(fAlpha(alpha)) < 1e-6) {
    return alpha;
  }

  // Bisection fallback: search a wide range
  let lo = -10 / Tp;
  let hi = 10 / Tp;

  // Make sure we bracket the root
  const fLo = fAlpha(lo);
  const fHi = fAlpha(hi);
  if (fLo * fHi > 0) {
    // Try wider range
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

/**
 * Compute full LF model parameters from Rd and f0.
 *
 * @param Rd - Voice quality parameter [0.3, 2.7]
 * @param f0 - Fundamental frequency in Hz
 * @returns Complete LfParams ready for waveform evaluation
 */
export function computeLfParams(Rd: number, f0: number): LfParams {
  const decomp = rdToDecomposition(Rd, f0);
  const T0 = 1 / f0;
  const Tb = T0 - decomp.Te;

  const epsilon = solveEpsilon(decomp.Ta, Tb);
  const alpha = solveAlpha(decomp.Tp, decomp.Te, epsilon, decomp.Ta, T0);

  // E0 from continuity at Te: the open phase value at Te must equal -Ee
  // E0 * exp(alpha * Te) * sin(omega_g * Te) = -Ee at the closure
  // Actually, at t=Te the derivative should be -Ee (the maximum negative excitation)
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

/**
 * Evaluate one sample of the LF derivative waveform at time t.
 *
 * The LF model defines U_g'(t) as a piecewise function:
 * - Open phase (0 <= t < Te): E0 * exp(alpha * t) * sin(pi * t / Tp)
 * - Return phase (Te <= t < T0): exponential decay
 * - Closed phase / out of range: 0
 *
 * @param t - Time in seconds within one glottal period [0, T0)
 * @param params - LF parameters from computeLfParams
 * @returns Derivative of glottal flow at time t
 */
export function lfDerivativeSample(t: number, params: LfParams): number {
  const { Tp, Te, Ta, T0, alpha, epsilon, E0, Ee } = params;

  if (t < 0 || t >= T0) return 0;

  const omegaG = Math.PI / Tp;

  if (t < Te) {
    // Open phase: exponentially growing sinusoid
    return E0 * Math.exp(alpha * t) * Math.sin(omegaG * t);
  } else {
    // Return phase: exponential decay back to zero
    const Tb = T0 - Te;
    const expDecay = Math.exp(-epsilon * (t - Te));
    const expTail = Math.exp(-epsilon * Tb);
    return (-Ee / (epsilon * Ta)) * (expDecay - expTail);
  }
}
