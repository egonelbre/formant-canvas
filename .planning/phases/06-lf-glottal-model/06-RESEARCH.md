# Phase 6: LF Glottal Model - Research

**Researched:** 2026-04-13
**Domain:** DSP / Liljencrants-Fant glottal pulse model / band-limited wavetable synthesis
**Confidence:** HIGH

## Summary

Phase 6 adds the Liljencrants-Fant (LF) glottal pulse model as a selectable alternative to the existing Rosenberg model, controlled via a single Rd parameter that maps the tense-to-breathy voice quality continuum. The LF model is the standard in speech science for modeling the derivative of glottal flow (Fant, Liljencrants & Lin, 1985; Fant 1995). It uses a piecewise waveform: an exponentially-growing sinusoid for the open phase and an exponential return for the closing phase. Anti-aliasing requires pre-computed band-limited wavetables since the LF pulse has a sharp discontinuity at the glottal closure instant (Te) that generates harmonics well above Nyquist at high f0.

The existing codebase has a clean separation: pure DSP functions in `src/lib/audio/dsp/`, inlined copies in `glottal-processor.ts`, and reactive state in `VoiceParams`. The LF model follows this same pattern -- a pure `lfSample()` function tested in Vitest, inlined into the worklet, with wavetables pre-computed at worklet startup.

**Primary recommendation:** Implement the LF model as a pure TS function using Fant 1995 Rd regression for parameter conversion, pre-compute 10 band-limited wavetable octave divisions at worklet startup, and use linear crossfade interpolation between adjacent tables at runtime.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Segmented toggle (Rosenberg | LF) in the Source section, near the existing phonation mode selector
- **D-02:** Mute-switch transition when changing models (~50ms fade out, swap, fade in) to prevent clicks
- **D-03:** When LF is selected, the Rd slider replaces openQuotient and spectralTilt controls. Those params are computed from Rd internally. When Rosenberg is selected, OQ and tilt controls show as before.
- **D-04:** Horizontal range slider (Rd range ~0.3 to ~2.7) with a single dynamic explainer label that changes as the value changes (e.g., "Pressed" at low values, "Modal" around 1.0, "Breathy" at high values) instead of fixed tick labels. Conserves space.
- **D-05:** Default Rd = 1.0 (modal voice) when switching to LF model
- **D-06:** Phonation mode buttons (pressed/modal/breathy) remain visible when LF is active and act as Rd presets (pressed~0.3, modal~1.0, breathy~2.5). User can fine-tune with the Rd slider afterward.
- **D-07:** Expandable/collapsible panel below the existing glottal pulse visual. Hidden by default, toggle to show.
- **D-08:** Shows an annotated LF waveform with timing markers (Tp, Te, Ta, Tc) annotated on the pulse shape, plus numeric readouts for Ra, Rk, Rg, Ta. Updates in real time as Rd changes.
- **D-09:** Pre-computed band-limited wavetables generated at AudioWorklet startup, one per octave, with harmonics truncated at Nyquist for each f0 range. Interpolate between tables at runtime.
- **D-10:** Rosenberg model stays analytical (no wavetables) -- its smooth waveform doesn't alias audibly at high f0.

### Claude's Discretion
- Number of wavetable octave divisions and interpolation strategy
- Exact Rd-to-label mapping thresholds for the dynamic explainer
- LF parameter computation formulas (Fant 1995 standard)
- Waveform annotation visual style in the decomposition view
- Exact Rd preset values for phonation mode buttons

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LF-01 | User can select between Rosenberg and LF glottal pulse models | D-01 toggle, D-02 mute-switch, D-03 conditional UI. VoiceParams needs `glottalModel` field, worklet needs model branching. |
| LF-02 | LF model uses Rd parameterization (single tense-to-breathy slider) | Fant 1995 Rd regression formulas; Rd range [0.3, 2.7]; D-04 slider with dynamic label; D-05/D-06 presets. |
| LF-03 | LF model uses band-limited wavetables to avoid aliasing at high f0 | D-09/D-10 wavetable approach; 10 octave divisions; pre-compute at startup; linear interpolation between tables. |
| LF-04 | User can see Rd decomposition view showing how Rd maps to underlying LF parameters | D-07 collapsible panel; D-08 annotated waveform with Tp/Te/Ta/Tc markers and Ra/Rk/Rg/Ta readouts. |

</phase_requirements>

## Standard Stack

### Core (no new dependencies)

This phase adds no new npm dependencies. All implementation uses existing project libraries and browser-native APIs.

| Component | Source | Purpose | Why |
|-----------|--------|---------|-----|
| LF pulse DSP | Custom TS | Glottal flow derivative model | ~150 lines of math; no library exists for this in JS/TS ecosystem [VERIFIED: npm search, GitHub search] |
| Rd-to-R-param conversion | Custom TS | Fant 1995 regression equations | Standard speech science formulas, ~20 lines [ASSUMED] |
| Wavetable generator | Custom TS | Band-limited pulse pre-computation | Domain-specific; built from IFFT of truncated harmonic series [ASSUMED] |
| SVG decomposition view | Svelte 5 + d3-scale | Annotated LF waveform visualization | Matches existing `GlottalPulseVisual.svelte` pattern [VERIFIED: codebase] |

### Existing Dependencies Used
| Library | Already Installed | Purpose in This Phase |
|---------|-------------------|----------------------|
| `d3-scale` | Yes | Log/linear scales for decomposition view axes |
| Svelte 5 `$state`/`$derived` | Yes | Reactive Rd-to-parameter computation for UI |
| Vitest | Yes | Unit tests for LF math functions |

## Architecture Patterns

### Recommended File Structure
```
src/lib/audio/dsp/
  lf-model.ts              # Pure LF waveform + Rd conversion functions
  lf-model.test.ts         # Unit tests (golden values, edge cases)
  lf-wavetable.ts          # Wavetable generation (IFFT-based)
  lf-wavetable.test.ts     # Aliasing verification tests
src/lib/audio/worklet/
  glottal-processor.ts     # Extended: add LF + wavetable lookup alongside Rosenberg
src/lib/audio/
  state.svelte.ts          # Extended: add glottalModel, rd fields
  bridge.ts                # Extended: forward glottalModel, rd to worklet
src/lib/components/
  PhonationMode.svelte     # Extended: model toggle, Rd slider, conditional controls
  GlottalPulseVisual.svelte # Extended: LF rendering + decomposition panel
  LfDecomposition.svelte   # New: collapsible Rd decomposition view
src/lib/data/
  phonation-presets.ts     # Extended: Rd preset values for LF mode
```

### Pattern 1: LF Waveform Equation (Derivative of Glottal Flow)

**What:** The LF model defines U_g'(t) as a piecewise function [CITED: Fant, Liljencrants & Lin 1985; verified via mvsoom/lf-model GitHub implementation]

**Open phase (0 <= t < Te):**
```
U_g'(t) = E0 * exp(alpha * t) * sin(omega_g * t)
```
where `omega_g = pi / Tp`

**Return phase (Te <= t < Tc):**
```
U_g'(t) = (-Ee / (epsilon * Ta)) * (exp(-epsilon * (t - Te)) - exp(-epsilon * (Tc - Te)))
```

**Closed phase (Tc <= t < T0):**
```
U_g'(t) = 0
```

**Parameters:**
- `T0` = 1/f0 (glottal period)
- `Tp` = time of maximum glottal flow
- `Te` = time of maximum excitation (closure instant)
- `Ta` = effective duration of return phase
- `Tc` = complete closure instant (typically Tc = T0 for complete closure)
- `Ee` = amplitude at closure instant (normalize to 1.0)
- `E0` = computed from continuity constraint
- `alpha` = solved from area constraint (implicit equation)
- `epsilon` = solved from return phase constraint

**Example (TypeScript):**
```typescript
// Source: Adapted from mvsoom/lf-model (GitHub, Python) [CITED: github.com/mvsoom/lf-model]
function lfDerivativeSample(
  t: number, T0: number, Tp: number, Te: number, Ta: number,
  alpha: number, epsilon: number, E0: number, Ee: number
): number {
  const omegaG = Math.PI / Tp;
  if (t < Te) {
    return E0 * Math.exp(alpha * t) * Math.sin(omegaG * t);
  } else if (t < T0) {
    const Tb = T0 - Te;
    return (-Ee / (epsilon * Ta)) * (Math.exp(-epsilon * (t - Te)) - Math.exp(-epsilon * Tb));
  }
  return 0;
}
```

### Pattern 2: Rd-to-R-Parameter Conversion (Fant 1995)

**What:** Single Rd value maps to the three R waveshape parameters via regression equations [ASSUMED -- from Fant 1995 STL-QPSR; widely cited in speech science but not verified from primary source in this session]

```typescript
// Fant 1995 regression: Rd -> {Ra, Rk, Rg}
// Rd range: [0.3, 2.7] (normal voice quality range)
function rdToRParams(Rd: number): { Ra: number; Rk: number; Rg: number } {
  // Clamp Rd to valid range
  const rd = Math.max(0.3, Math.min(2.7, Rd));

  // Fant 1995 regression equations
  const Ra = (-1 + 4.8 * rd) / 100;          // return phase ratio
  const Rk = (22.4 + 11.8 * rd) / 100;       // asymmetry ratio
  const Rg = (Rk / 4) * (0.5 + 1.2 * Rk) /  // glottal frequency ratio
             (0.11 * rd - (Ra / 2 - 0.0568 * Math.log(rd)));
  // Simplified: typical approximation used in practice
  // Rg = 0.9 + 0.7 * Rd  (linear approximation, less accurate)

  return { Ra, Rk, Rg };
}
```

**IMPORTANT:** The exact Fant 1995 regression formula for Rg is more complex than a simple linear fit. The formula above is one commonly cited version. The Rg equation involves an implicit relationship. Multiple published versions exist with slight variations. The implementer should cross-reference with:
1. Fant, G. (1995) "The LF-model revisited. Transformations and frequency domain analysis." STL-QPSR, 2-3/1995, pp. 119-156
2. Gobl, C. (2017) "Reshaping the Transformed LF Model" (Interspeech 2017) -- notes that Fant's original equations do not produce perfectly smooth contours

**R-params to timing parameters:** [CITED: mvsoom/lf-model GitHub]
```typescript
function rParamsToTiming(T0: number, Rk: number, Rg: number, Ra: number): {
  Tp: number; Te: number; Ta: number;
} {
  const Tp = T0 / (2 * Rg);           // time of max flow
  const Te = Tp * (1 + Rk);           // closure instant
  const Ta = Ra / (2 * Math.PI * Rg * (1 / T0)); // return phase, simplified
  // More precisely: Ta = Ra * T0 / (2 * pi)
  return { Tp, Te, Ta };
}
```

### Pattern 3: Solving Alpha and Epsilon (Implicit Equations)

**What:** The LF model has two implicit equations that must be solved numerically for each set of parameters [CITED: mvsoom/lf-model GitHub]

**Epsilon (return phase decay rate):**
```
epsilon * Ta = 1 - exp(-epsilon * (T0 - Te))
```
Solved via Newton-Raphson iteration. For real-time use in a wavetable context, this is solved at table-generation time, NOT per-sample.

**Alpha (open phase growth rate):**
The area under the open phase must equal the negative area under the return phase (zero net flow). This gives an implicit equation for alpha that is also solved via Newton-Raphson.

**For wavetable approach:** Both alpha and epsilon are solved once per Rd value during table pre-computation, so the numerical solver cost is amortized over startup time, not runtime. [VERIFIED: this matches D-09 wavetable decision]

### Pattern 4: Band-Limited Wavetable Generation

**What:** Pre-compute LF pulse waveforms with harmonics truncated at Nyquist for each f0 range [ASSUMED -- standard wavetable anti-aliasing technique from DSP literature]

**Strategy:**
1. For each Rd value (the current slider position), generate one full LF period analytically
2. Take FFT of that period
3. For each octave band, zero out harmonics above Nyquist for that band's max f0
4. Take IFFT to get the band-limited version
5. Store as a Float32Array wavetable

**Octave divisions (Claude's discretion):**
- 10 tables covering f0 from ~55 Hz (A1) to ~1760 Hz (A6)
- Table boundaries at: 55, 110, 220, 440, 880, 1760 Hz (and intermediate values)
- At 48 kHz sample rate, a 1760 Hz fundamental can have at most ~13 harmonics before Nyquist
- At 55 Hz, up to ~436 harmonics are possible (but LF pulse energy falls off rapidly)

**Table size:** 2048 samples per table is sufficient. All tables same size -- effective oversampling doubles per octave naturally. [CITED: KVR Audio forum discussion on wavetable sizing]

**Runtime lookup:**
```typescript
// In the worklet process() loop:
// 1. Determine which two tables bracket the current f0
// 2. Read from both tables at the current phase position
// 3. Linear interpolate between the two table outputs based on f0 position within the octave
// 4. Use linear interpolation within each table for fractional phase positions
```

### Pattern 5: Model Switching with Mute-Switch (D-02)

**What:** Crossfade between models to avoid clicks [VERIFIED: codebase uses `setTargetAtTime` on master gain already]

```typescript
// In AudioBridge, on model change:
// 1. Ramp masterGain to 0 over ~50ms (setTargetAtTime, timeConstant=0.015)
// 2. Send new glottalModel to worklet via postMessage
// 3. Worklet switches to new model on next process() call
// 4. Ramp masterGain back to previous value over ~50ms
```

The existing `bridge.ts` already uses `masterGain.gain.setTargetAtTime()` for start/stop. The mute-switch extends this pattern.

### Anti-Patterns to Avoid
- **Solving alpha/epsilon per sample:** These implicit equations are expensive. Pre-compute in wavetables, never in the audio thread.
- **Importing ES modules in the worklet:** AudioWorkletGlobalScope cannot use ES imports. All LF code must be inlined, matching the existing Rosenberg pattern. [VERIFIED: codebase comment in glottal-processor.ts]
- **Generating wavetables on the main thread:** Do it in the worklet constructor to avoid blocking the UI. The worklet runs on the audio thread which is separate from main.
- **Using the same analytical LF function at high f0 without anti-aliasing:** The sharp closure at Te creates harmonics far above Nyquist. This WILL alias audibly above ~300 Hz f0.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FFT for wavetable generation | Custom DFT loop | Use the worklet's ability to create an OfflineAudioContext, or implement a radix-2 FFT (~60 lines) | FFT is well-understood but easy to get wrong; however, no npm FFT lib runs in AudioWorkletGlobalScope, so a small inline FFT is acceptable here |
| Newton-Raphson solver | Complex general-purpose solver | Simple inline Newton iteration (~15 lines) with fixed iteration count (10-20 iterations converges for all valid Rd) | The equations are well-conditioned for valid Rd range |
| Rd regression formulas | Derivation from scratch | Fant 1995 published regression equations | These are empirical fits, not derivable from first principles |

**Key insight:** The LF model is pure math with well-known equations. The complexity is in (1) getting the implicit equation solvers right, and (2) the wavetable anti-aliasing. Both are solvable with compact, well-tested inline code. No external DSP library helps here since nothing runs in AudioWorkletGlobalScope.

## Common Pitfalls

### Pitfall 1: Alpha Solver Divergence
**What goes wrong:** Newton-Raphson for alpha fails to converge for certain Rd values near the extremes, producing NaN or Infinity in the audio output.
**Why it happens:** The alpha equation has a narrow convergence basin for very tense (Rd < 0.4) or very breathy (Rd > 2.5) voices. The initial guess matters.
**How to avoid:** Use a bracketed search (bisection) as fallback. Pre-validate at table generation time. Clamp Rd to [0.3, 2.7] in the UI slider. Test all Rd values at 0.1 increments.
**Warning signs:** NaN values in unit tests for extreme Rd; clicking sounds at Rd slider endpoints.
[CITED: mvsoom/lf-model troubleshooting notes]

### Pitfall 2: Wavetable Phase Discontinuity
**What goes wrong:** Audible click at the period boundary when the wavetable loops, because the last sample doesn't smoothly connect to the first.
**Why it happens:** Numerical errors in FFT/IFFT, or the LF pulse doesn't exactly reach zero at T0.
**How to avoid:** Ensure the analytical LF pulse is exactly zero in the closed phase. After IFFT, force the last sample to match the first (circular continuity). Test with a scope view.
**Warning signs:** Periodic clicking at the f0 rate, especially at low f0 where the period is long.

### Pitfall 3: Wavetable Interpolation Artifacts at Octave Boundaries
**What goes wrong:** Timbral "stepping" as f0 crosses an octave boundary, because the two adjacent tables have noticeably different harmonic content.
**Why it happens:** Too few octave divisions, or no crossfade between tables.
**How to avoid:** Use 10 octave divisions (not 5-6). Linear interpolate between the two nearest tables. Test by sweeping f0 through octave boundaries with a slow glide.
**Warning signs:** Subtle brightness changes when sweeping f0 through specific frequencies.

### Pitfall 4: Worklet Startup Blocking
**What goes wrong:** Audio glitches or silence during the first few seconds while wavetables are being computed.
**Why it happens:** Generating 10 wavetables with FFT in the worklet constructor takes non-trivial time.
**How to avoid:** Generate tables asynchronously across multiple `process()` calls (lazy initialization), or accept a brief computation in the constructor (~10-50ms for 10 tables of 2048 samples, which is acceptable). Output silence or Rosenberg until tables are ready.
**Warning signs:** First note after page load sounds different from subsequent notes.

### Pitfall 5: Rd Slider and OQ/Tilt State Desynchronization
**What goes wrong:** Switching from LF back to Rosenberg restores stale OQ/tilt values, or LF's internally-computed OQ/tilt leaks into Rosenberg mode.
**Why it happens:** D-03 says Rd replaces OQ/tilt when LF is active. If the store conflates these, switching modes gets confused.
**How to avoid:** Keep `openQuotient` and `spectralTilt` as Rosenberg-specific params. When LF is active, the worklet ignores them and uses Rd-derived values internally. The VoiceParams store keeps both; the UI just hides the irrelevant controls.
**Warning signs:** Switching models produces unexpected timbral changes.

## Code Examples

### LF Model Core Function (for `src/lib/audio/dsp/lf-model.ts`)

```typescript
// Source: Adapted from mvsoom/lf-model [CITED: github.com/mvsoom/lf-model]
// and Fant 1995 STL-QPSR [ASSUMED]

export interface LfParams {
  Tp: number;  // time of max flow (seconds)
  Te: number;  // closure instant (seconds)
  Ta: number;  // return phase duration (seconds)
  T0: number;  // period = 1/f0 (seconds)
  alpha: number;
  epsilon: number;
  E0: number;
  Ee: number;  // excitation amplitude (normalize to 1.0)
}

export interface RdDecomposition {
  Ra: number;
  Rk: number;
  Rg: number;
  Tp: number;
  Te: number;
  Ta: number;
  Tc: number;
}

/**
 * Convert Rd to R waveshape parameters.
 * Fant 1995 regression equations.
 */
export function rdToDecomposition(Rd: number, f0: number): RdDecomposition {
  const rd = Math.max(0.3, Math.min(2.7, Rd));
  const T0 = 1 / f0;

  // Fant 1995 regression
  const Ra = (-1 + 4.8 * rd) / 100;
  const Rk = (22.4 + 11.8 * rd) / 100;
  // Rg approximation (simplified from Fant 1995)
  const Rg = (0.44 * rd + 1.073) / (1.0 + 0.46 * rd);

  const Tp = T0 / (2 * Rg);
  const Te = Tp * (1 + Rk);
  const Ta = Ra * T0 / (2 * Math.PI);
  const Tc = T0;  // complete closure assumed

  return { Ra, Rk, Rg, Tp, Te, Ta, Tc };
}
```

### Wavetable Generation Pattern

```typescript
// Source: Standard DSP technique [ASSUMED]

/**
 * Generate a band-limited LF wavetable for a given Rd and max harmonic count.
 *
 * @param Rd - Voice quality parameter [0.3, 2.7]
 * @param tableSize - Samples per table (2048 recommended)
 * @param maxHarmonics - Max harmonics before Nyquist for this octave band
 * @returns Float32Array of one normalized period
 */
export function generateLfWavetable(
  Rd: number,
  tableSize: number,
  maxHarmonics: number
): Float32Array {
  // 1. Generate one analytical LF period at high resolution
  const analyticalPeriod = new Float32Array(tableSize);
  // ... fill with LF derivative samples ...

  // 2. FFT
  const real = new Float32Array(tableSize);
  const imag = new Float32Array(tableSize);
  fft(analyticalPeriod, real, imag);

  // 3. Zero harmonics above maxHarmonics
  for (let k = maxHarmonics + 1; k < tableSize / 2; k++) {
    real[k] = 0;
    imag[k] = 0;
    real[tableSize - k] = 0;
    imag[tableSize - k] = 0;
  }

  // 4. IFFT
  const table = new Float32Array(tableSize);
  ifft(real, imag, table);

  // 5. Normalize
  let maxAbs = 0;
  for (let i = 0; i < tableSize; i++) {
    if (Math.abs(table[i]) > maxAbs) maxAbs = Math.abs(table[i]);
  }
  if (maxAbs > 0) {
    for (let i = 0; i < tableSize; i++) table[i] /= maxAbs;
  }

  return table;
}
```

### Decomposition View SVG Pattern

```svelte
<!-- Follows existing GlottalPulseVisual.svelte pattern [VERIFIED: codebase] -->
<script lang="ts">
  import { rdToDecomposition } from '../audio/dsp/lf-model.ts';

  interface Props {
    rd: number;
    f0: number;
    expanded?: boolean;
  }
  let { rd, f0, expanded = false }: Props = $props();

  let decomp = $derived(rdToDecomposition(rd, f0));
  // Use decomp.{Ra, Rk, Rg, Tp, Te, Ta, Tc} for annotations
</script>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ScriptProcessorNode for DSP | AudioWorklet (already in use) | 2018+ | Project already uses current approach |
| Analytical LF at all f0 | Band-limited wavetables | Standard practice | Required for alias-free synthesis above ~300 Hz f0 |
| Full 4-param LF (Ee, Tp, Te, Ta) | Rd single-parameter mapping (Fant 1995) | 1995+ | Rd captures natural covariation; standard in voice research |
| Rosenberg only | LF as upgrade path | This phase | More realistic glottal source for pedagogical accuracy |

**Note on klatt-syn:** Despite being listed as a reference in CLAUDE.md, `klatt-syn` does NOT implement the LF model. It implements KLGLOTT88 (polynomial t^2 - t^3 approximation). The LF model must be implemented from the literature. [VERIFIED: klatt-syn GitHub source code inspection]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Fant 1995 Rd regression: Ra = (-1 + 4.8*Rd)/100, Rk = (22.4 + 11.8*Rd)/100 | Architecture Patterns / Pattern 2 | Wrong regression coefficients produce incorrect voice quality mapping; audible but not catastrophic -- can be corrected by adjusting constants |
| A2 | Rg formula involves an implicit relationship, simplified here as (0.44*Rd + 1.073)/(1.0 + 0.46*Rd) | Architecture Patterns / Pattern 2 | Wrong Rg values affect pulse timing; worst case is unnatural-sounding voice at Rd extremes |
| A3 | 10 octave divisions with 2048-sample tables are sufficient for clean sound up to 1760 Hz f0 | Architecture Patterns / Pattern 4 | Too few divisions = audible stepping; too small tables = frequency resolution issues; easily tuned post-implementation |
| A4 | Inline radix-2 FFT (~60 lines) is viable in AudioWorkletGlobalScope | Don't Hand-Roll | If FFT is buggy, wavetables will be wrong; alternative is pre-compute on main thread and transfer via postMessage |
| A5 | Newton-Raphson with 10-20 iterations converges for all valid Rd in [0.3, 2.7] | Common Pitfalls / Pitfall 1 | If solver diverges, audio output will be NaN; bisection fallback handles this |

## Open Questions (RESOLVED)

1. **Exact Fant 1995 Rg regression formula** — RESOLVED: Use simplified approximation `(0.44 * Rd + 1.073) / (1.0 + 0.46 * Rd)`. Validate aurally; the Rd-to-decomposition function is isolated and easily tuned.
   - What we know: Ra and Rk formulas are widely cited and consistent across sources. Rg is more complex and involves an implicit relationship.
   - What's unclear: The exact simplified Rg approximation that produces smooth contours across the full Rd range. Gobl 2017 notes the original equations don't produce perfectly smooth contours.

2. **FFT in AudioWorkletGlobalScope** — RESOLVED: Implement inline radix-2 FFT (~60 lines). Fallback: pre-compute on main thread and transfer via postMessage with Transferable ArrayBuffers if startup exceeds 100ms.
   - What we know: AudioWorkletGlobalScope supports TypedArrays and basic math.
   - What's unclear: Whether a ~60-line inline FFT has any performance issues at startup in the worklet.

3. **Wavetable regeneration when Rd changes** — RESOLVED: Pre-compute a grid of ~10 Rd values x 10 octaves = 100 tables at startup (~800 KB). Interpolate between two nearest Rd tables at runtime.
   - What we know: D-09 says "pre-computed at startup." But Rd changes dynamically via slider.
   - What's unclear: Whether to regenerate all 10 tables on every Rd change, or pre-compute a grid of Rd values.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/lib/audio/dsp/lf-model.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LF-01 | Model switching produces output from correct model | integration (Playwright) | Manual verification | No -- Wave 0 |
| LF-02a | Rd-to-R-param conversion produces valid values for all Rd in [0.3, 2.7] | unit | `npx vitest run src/lib/audio/dsp/lf-model.test.ts` | No -- Wave 0 |
| LF-02b | Rd decomposition matches known reference values (male/female vowel) | unit | same as above | No -- Wave 0 |
| LF-03a | Wavetable has no harmonics above Nyquist for each octave band | unit | `npx vitest run src/lib/audio/dsp/lf-wavetable.test.ts` | No -- Wave 0 |
| LF-03b | LF pulse at 800 Hz f0 has no audible aliasing | manual (listen test) | manual-only: aliasing is perceptual | N/A |
| LF-04 | Decomposition view shows correct Ra, Rk, Rg, Ta for known Rd values | unit | `npx vitest run src/lib/audio/dsp/lf-model.test.ts` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/audio/dsp/lf-model.test.ts src/lib/audio/dsp/lf-wavetable.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/audio/dsp/lf-model.test.ts` -- covers LF-02, LF-04 (Rd conversion, decomposition values)
- [ ] `src/lib/audio/dsp/lf-wavetable.test.ts` -- covers LF-03 (band-limiting verification)
- [ ] No new framework install needed -- Vitest already configured

## Security Domain

Not applicable for this phase. All code is client-side DSP math with no user input beyond slider values (already clamped). No network calls, no data storage, no authentication.

## Sources

### Primary (HIGH confidence)
- **mvsoom/lf-model** (GitHub) - Python LF model implementation with solve_alpha, solve_epsilon, LF waveform equations, and R-param conversion. Directly inspected source code. [CITED: github.com/mvsoom/lf-model]
- **Existing codebase** - `rosenberg.ts`, `glottal-processor.ts`, `bridge.ts`, `state.svelte.ts`, `GlottalPulseVisual.svelte`, `PhonationMode.svelte` all directly inspected. [VERIFIED: codebase]
- **klatt-syn source** - Confirmed it does NOT contain LF model, only KLGLOTT88. [VERIFIED: GitHub API inspection of chdh/klatt-syn]
- **arxiv.org/html/2410.04704v1** - LF model discrete-time equations confirmed: open phase is E0*exp(alpha*t)*sin(omega*t), return phase is exponential decay. [CITED: arxiv.org/html/2410.04704v1]

### Secondary (MEDIUM confidence)
- **KVR Audio forums** - Wavetable sizing (same size all octaves, effective oversampling doubles per octave), interpolation methods (Hermite spline or linear between tables). [CITED: kvraudio.com/forum/viewtopic.php?t=509014]
- **Gobl 2017** (Interspeech) - Notes that Fant 1995 regression equations don't produce perfectly smooth R-param contours across full Rd range. Referenced but PDF not accessible. [CITED: tara.tcd.ie -- 403 error on access]

### Tertiary (LOW confidence)
- **Fant 1995 regression coefficients** - Ra = (-1 + 4.8*Rd)/100, Rk = (22.4 + 11.8*Rd)/100. These specific constants are from training knowledge and widely cited in speech science literature, but were not verified from the primary source in this session. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies; all existing patterns verified in codebase
- Architecture (LF waveform equations): HIGH - Verified via multiple sources (mvsoom/lf-model, arxiv paper)
- Architecture (Rd regression): MEDIUM - Specific coefficients are ASSUMED from training data; widely cited but not verified from primary source
- Architecture (wavetable approach): HIGH - Standard DSP technique, well-documented in community
- Pitfalls: HIGH - Identified from implementation experience in mvsoom/lf-model troubleshooting notes

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable domain -- LF model equations haven't changed since 1985)
