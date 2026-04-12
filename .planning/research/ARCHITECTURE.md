# Architecture Research

**Domain:** v0.2 Voice Model Depth -- LF glottal model, cascade formant filters, vocal tract visualization
**Researched:** 2026-04-13
**Confidence:** HIGH (existing codebase patterns are clear; LF model and cascade topology are well-documented in speech synthesis literature)

## TL;DR: Integration Strategy

The three v0.2 features integrate at different layers of the existing architecture:

1. **LF glottal model** -- replaces `rosenbergSample()` inside the existing `GlottalProcessor` worklet. The worklet already handles postMessage parameter updates; add `glottalModel: 'rosenberg' | 'lf'` to the message protocol and an `lfSample()` function alongside the existing one. Use Fant's Rd meta-parameter (single slider) to control all four underlying LF parameters.

2. **Cascade formant filters** -- moves formant filtering from the main-thread Web Audio graph (parallel `BiquadFilterNode`s in `AudioBridge`) into the worklet's `process()` loop as inline biquad computations in series. This is the largest architectural change because it replaces the current `buildFormantChain()` entirely.

3. **Vocal tract visualization** -- a new SVG Svelte component that reads from the existing `voiceParams` store (F1/F2/F3 frequencies) and derives midsagittal cross-section geometry. Pure visualization, no audio changes. Follows the same pattern as `VowelChart.svelte` and `FormantCurves.svelte`.

**Build order: LF model first, then cascade filters, then vocal tract viz.** LF is self-contained in the worklet. Cascade requires rearchitecting the audio graph. Vocal tract viz is independent of both.

## Existing Architecture (What We Have)

```
voiceParams ($state singleton)
    |
    +---> $effect in App.svelte calls bridge.syncParams()
    |         |
    |         +---> postMessage to worklet (f0, OQ, aspiration, vibrato, jitter, tilt)
    |         +---> setTargetAtTime on BiquadFilterNode.frequency/Q (formants F1-F5)
    |         +---> setTargetAtTime on GainNode (per-formant gains, master)
    |
    +---> $derived in Svelte components (VowelChart, PianoHarmonics, FormantCurves, etc.)
```

**Audio graph (current):**
```
GlottalProcessor (worklet)
    |
    +---> BiquadF1 --> GainF1 --+
    +---> BiquadF2 --> GainF2 --+--> SumGain --> MasterGain --> destination
    +---> BiquadF3 --> GainF3 --+
    +---> BiquadF4 --> GainF4 --+
    +---> BiquadF5 --> GainF5 --+
```

Key facts about existing code:
- `GlottalProcessor` (worklet) inlines `rosenbergSample()`, vibrato, jitter, spectral tilt
- `AudioBridge` builds parallel formant chain with native `BiquadFilterNode`s
- `VoiceParams` class uses Svelte 5 `$state` runes; singleton `voiceParams` export
- `formant-response.ts` computes parallel spectral envelope for visualization
- All visualization components read directly from `voiceParams`

## Feature 1: LF Glottal Model

### What Changes

| Component | Change Type | Details |
|-----------|------------|---------|
| `glottal-processor.ts` | **MODIFY** | Add `lfSample()` function alongside `rosenbergSample()`. Switch based on `glottalModel` param. |
| `state.svelte.ts` | **MODIFY** | Add `glottalModel: 'rosenberg' | 'lf'` and `rd: number` (0.3-2.7) to `VoiceParams`. Add to `snapshot`. |
| `bridge.ts` | **MODIFY** | Forward `glottalModel` and `rd` in `syncParams()` postMessage. |
| `GlottalPulseVisual.svelte` | **MODIFY** | Render LF pulse shape when model is 'lf'. |
| `src/lib/audio/dsp/lf.ts` | **NEW** | Pure function `lfSample(phase, Rd)` for unit testing outside worklet. |
| `PhonationMode.svelte` | **MODIFY** | Add model selector (Rosenberg / LF) and Rd slider. |

### LF Model Implementation

The LF model describes the *derivative* of glottal flow (not flow itself, unlike Rosenberg). Four underlying parameters (Tp, Te, Ta, Ee) are coupled. Fant (1995) showed they can be collapsed into a single "waveshape" parameter **Rd**:

- **Rd = 0.3-0.5**: Pressed voice (short open phase, abrupt closure, strong high harmonics)
- **Rd = 0.8-1.2**: Modal voice (normal phonation)
- **Rd = 1.5-2.7**: Breathy/relaxed voice (long open phase, gradual closure)

**Implementation approach -- Rd-parameterized lookup:**

```typescript
// In glottal-processor.ts (inlined, no imports)
function lfDerivativeSample(phase: number, Rd: number): number {
  // Derive Tp, Te, Ta from Rd using Fant 1995 regression equations:
  // Tp/T0 = (1/(2*Rd)) * (1.0 + Rd)  (approximate)
  // Te/T0 = Tp/T0 + 0.5*(1 - Tp/T0)   (approximate)
  // Ta = Rd * 0.01 (simplified)
  //
  // Open phase: E0 * exp(alpha*t) * sin(omega_g * t)
  // Return phase: -Ee/Ta * (exp(-epsilon*(t-Te)) - exp(-epsilon*(T0-Te)))
  //
  // For real-time: pre-compute alpha, omega_g, epsilon per-cycle (when Rd changes)
  // NOT per-sample. Cache in processor state.
}

// Integrate to get flow (Rosenberg outputs flow; LF native output is flow derivative)
// Option A: integrate in worklet, output flow -- then existing formant filters work unchanged
// Option B: output derivative, adjust formant filter gains to compensate
// RECOMMENDATION: Option A. Numerically integrate with simple trapezoidal rule.
```

**Key insight:** The worklet currently outputs glottal *flow* (Rosenberg). The LF model natively produces flow *derivative*. To keep the rest of the audio chain unchanged, integrate the LF derivative inside the worklet to produce flow. This is a simple running sum with DC-leak.

### Parameter Mapping to Existing Phonation Modes

| PhonationMode | Rosenberg (current) | LF (new) |
|---------------|--------------------|----|
| breathy | OQ=0.7, tilt=12, asp=0.08 | Rd=2.0 |
| modal | OQ=0.6, tilt=6, asp=0.03 | Rd=1.0 |
| flow | OQ=0.55, tilt=3, asp=0.02 | Rd=0.8 |
| pressed | OQ=0.4, tilt=0, asp=0.01 | Rd=0.4 |

When `glottalModel === 'lf'`, the phonation preset buttons set Rd instead of OQ/tilt/aspiration. The spectral tilt filter in the worklet can be bypassed for LF since tilt is inherent in the model shape.

### Data Flow (LF)

```
User clicks "LF" model selector
    |
    v
voiceParams.glottalModel = 'lf'
voiceParams.rd = 1.0 (default modal)
    |
    v (via $effect -> syncParams)
bridge.syncParams() sends postMessage({ type: 'params', glottalModel: 'lf', rd: 1.0 })
    |
    v (worklet thread)
GlottalProcessor switches to lfSample() in process() loop
    |
    v (same audio graph, same formant filters)
Sound changes. No visualization changes needed except GlottalPulseVisual.
```

## Feature 2: Cascade Formant Filters

### Why Move Filters Into the Worklet

The current parallel topology uses native `BiquadFilterNode`s on the main audio thread. Cascade topology requires **serial chaining** where each filter's output feeds the next. Two options:

**Option A: Keep native BiquadFilterNodes, rewire in series.**
- Wire: worklet --> BiquadF1 --> BiquadF2 --> BiquadF3 --> BiquadF4 --> BiquadF5 --> MasterGain
- Pros: Zero DSP code changes. Just reconnect nodes.
- Cons: BiquadFilterNode type `bandpass` rolls off at -12dB/oct outside passband, which in cascade creates excessive roll-off in valleys between formants. Need `peaking` type instead -- but peaking on a cascade of 5 creates feedback-like peaks that are hard to tune. Per-formant gain control becomes meaningless (cascade sets relative amplitudes automatically).

**Option B: Implement cascade resonators inside the worklet (RECOMMENDED).**
- Move the biquad math into the worklet's `process()` loop as inline second-order sections.
- Pros: Full control over filter topology. Can switch between cascade/parallel per-voice. Identical behavior to Klatt 1980. No node-reconnection overhead. Filter coefficients can be smoothed per-sample.
- Cons: More DSP code in the worklet. Lose native BiquadFilterNode optimizations. Must inline biquad coefficient computation (Audio EQ Cookbook formulas, ~30 lines).

**Recommendation: Option B.** The cascade topology in Klatt is specifically designed with resonators whose amplitude coupling produces natural vowel spectra *without* per-formant gain controls. This only works with direct coefficient manipulation, not through the limited BiquadFilterNode API.

### What Changes

| Component | Change Type | Details |
|-----------|------------|---------|
| `glottal-processor.ts` | **HEAVY MODIFY** | Add inline biquad state (x1, x2, y1, y2 per filter), coefficient computation, cascade/parallel process loops. Rename to `voice-processor.ts`. |
| `bridge.ts` | **HEAVY MODIFY** | Remove `buildFormantChain()`. Formant params now go via postMessage instead of `setTargetAtTime`. Simpler graph: worklet --> MasterGain --> destination. |
| `state.svelte.ts` | **MODIFY** | Add `filterTopology: 'parallel' | 'cascade'` to VoiceParams. |
| `formant-response.ts` | **MODIFY** | Add `cascadeSpectralEnvelope()` that multiplies (instead of sums) individual formant responses. |
| `FormantCurves.svelte` | **MODIFY** | Switch between additive (parallel) and multiplicative (cascade) envelope rendering. |
| `src/lib/audio/dsp/biquad.ts` | **NEW** | Pure biquad coefficient functions for unit testing. |
| `formant-utils.ts` | **MODIFY** | May need `bandwidthToCoeffs()` returning {b0,b1,b2,a1,a2} instead of Q value. |

### Audio Graph (After Cascade)

```
VoiceProcessor (worklet) -- does EVERYTHING:
  1. Generate glottal pulse (Rosenberg or LF)
  2. Apply spectral tilt
  3. Apply formant filters (cascade or parallel, inline biquad)
  4. Mix aspiration noise
  |
  v
MasterGain --> destination
```

The audio graph becomes trivially simple: one worklet node, one gain node, one destination. All DSP complexity lives inside the worklet.

### Cascade Filter Implementation

```typescript
// Inline in voice-processor.ts
interface BiquadState {
  x1: number; x2: number;  // input history
  y1: number; y2: number;  // output history
  b0: number; b1: number; b2: number;  // feedforward
  a1: number; a2: number;  // feedback (negated convention)
}

function processBiquad(state: BiquadState, input: number): number {
  const out = state.b0 * input + state.b1 * state.x1 + state.b2 * state.x2
             - state.a1 * state.y1 - state.a2 * state.y2;
  state.x2 = state.x1; state.x1 = input;
  state.y2 = state.y1; state.y1 = out;
  return out;
}

// In process() loop, cascade mode:
// sample = glottalPulse(phase);
// sample = processBiquad(f1State, sample);  // F1 resonator
// sample = processBiquad(f2State, sample);  // F2 resonator
// sample = processBiquad(f3State, sample);  // F3 resonator
// sample = processBiquad(f4State, sample);  // F4 resonator
// sample = processBiquad(f5State, sample);  // F5 resonator

// In process() loop, parallel mode (preserves current behavior):
// let sum = 0;
// for each formant: sum += processBiquad(fNState, glottalPulse) * fNGain;
// sample = sum;
```

### Coefficient Update Strategy

Biquad coefficients depend on (frequency, bandwidth, sampleRate). Recompute only when parameters change (detected via postMessage), not every sample. Use one-pole smoothing on the coefficients themselves to avoid clicks during transitions.

**Important:** Cascade resonators in Klatt use **resonance** type (poles only), not bandpass. The transfer function is:
```
H(z) = 1 / (1 - 2*r*cos(theta)*z^-1 + r^2*z^-2)
```
where r = exp(-pi * bandwidth / sampleRate), theta = 2*pi * frequency / sampleRate.

This is simpler than the full biquad (b0=1, b1=0, b2=0, a1=-2r*cos(theta), a2=r^2). No feedforward coefficients needed for cascade resonators.

### Data Flow (Cascade)

```
User toggles "Cascade" topology
    |
    v
voiceParams.filterTopology = 'cascade'
    |
    v ($effect -> syncParams)
bridge.syncParams() sends postMessage({
  type: 'params',
  filterTopology: 'cascade',
  f1Freq, f1BW, f2Freq, f2BW, ... (all formant params)
})
    |
    v (worklet)
VoiceProcessor recomputes resonator coefficients,
switches process() to cascade loop
    |
    v
formant-response.ts switches to multiplicative envelope
FormantCurves.svelte re-renders cascade response shape
```

### Migration Path

Because this is the biggest change, do it incrementally:

1. **Step 1:** Add inline biquad processing in worklet alongside existing native nodes. Gate behind `filterTopology` flag. Keep native BiquadFilterNodes for `parallel`.
2. **Step 2:** Verify cascade sounds correct by comparing output against klatt-syn reference.
3. **Step 3:** Update visualization math in `formant-response.ts`.
4. **Step 4:** Remove per-formant GainNodes from bridge (cascade doesn't use them).
5. **Step 5:** Clean up -- simplify audio graph to worklet --> master --> dest.

## Feature 3: Vocal Tract Visualization

### What Changes

| Component | Change Type | Details |
|-----------|------------|---------|
| `VocalTractView.svelte` | **NEW** | SVG midsagittal cross-section component |
| `src/lib/data/vocal-tract-geometry.ts` | **NEW** | Baseline cross-section coordinates, deformation functions |
| `App.svelte` | **MODIFY** | Add VocalTractView to the layout grid |

### Architecture Approach

The vocal tract visualization maps formant frequencies to articulatory positions using **acoustic-to-articulatory inversion** -- a simplified version. This is NOT a physical model; it is a pedagogical visualization that deforms a stylized midsagittal cross-section based on F1/F2.

**Key mapping (well-established in phonetics):**
- **F1 ~ jaw openness:** Higher F1 = more open jaw = larger oral cavity
- **F2 ~ tongue frontness:** Higher F2 = tongue forward; Lower F2 = tongue back
- **F3 ~ lip rounding (secondary):** Lower F3 = more rounded lips

The component:
1. Defines a baseline midsagittal outline (hard palate, soft palate, tongue body, tongue tip, lips, pharynx wall) as SVG path data
2. Applies smooth deformations to the tongue body and jaw based on F1/F2 values
3. Adjusts lip aperture based on F1 and optionally F3
4. Uses `$derived` to recompute path data reactively from `voiceParams`

### Geometry Model

```typescript
// vocal-tract-geometry.ts

interface TractShape {
  palate: Point[];        // fixed, doesn't deform
  pharynxWall: Point[];   // fixed posterior wall
  tongueBody: Point[];    // deforms based on F1/F2
  tongueTip: Point[];     // derived from tongue body position
  jaw: Point[];           // opens/closes with F1
  lips: Point[];          // aperture varies with F1, rounding with F3
  velum: Point[];         // fixed for oral vowels
}

// Deformation: interpolate between reference shapes for cardinal vowels
// /i/ (high front): tongue up+front, small jaw opening
// /a/ (low central): tongue down, large jaw opening
// /u/ (high back): tongue up+back, rounded lips, small jaw opening

function deformTract(f1: number, f2: number, f3: number): TractShape {
  // Normalize f1/f2 to [0,1] within typical ranges:
  // F1: 200-900 Hz, F2: 600-2500 Hz
  const jawOpen = normalize(f1, 200, 900);     // 0=closed, 1=open
  const tongueFront = normalize(f2, 600, 2500); // 0=back, 1=front
  // Interpolate tongue body position between reference shapes
  // Interpolate jaw angle
  // Interpolate lip aperture
}
```

### SVG Structure

```svelte
<svg viewBox="0 0 300 400">
  <!-- Fixed anatomy -->
  <path d={palate} fill="none" stroke="var(--color-text)" />
  <path d={pharynxWall} fill="none" stroke="var(--color-text)" />

  <!-- Deformable parts -->
  <path d={tongueBody} fill="var(--color-accent)" opacity="0.3" stroke="var(--color-accent)" />
  <path d={jaw} fill="none" stroke="var(--color-text)" />
  <path d={lips} fill="none" stroke="var(--color-text)" stroke-width="2" />

  <!-- Airway highlight -->
  <path d={airway} fill="var(--color-surface)" opacity="0.5" />

  <!-- Labels -->
  <text>lips</text>
  <text>tongue</text>
  <text>palate</text>
  <text>pharynx</text>
</svg>
```

### Data Flow (Vocal Tract Viz)

```
voiceParams.f1Freq / f2Freq / f3Freq change (any source: slider, vowel chart drag, preset)
    |
    v ($derived)
VocalTractView recomputes tongue/jaw/lip positions
    |
    v (Svelte reactivity)
SVG paths update, user sees vocal tract deform in real time
```

No audio changes. No new state. Purely derived from existing `voiceParams`. This is the simplest of the three features architecturally.

### Reference Sources for Geometry

The "Interactive Sagittal Section" (SAMMY) at incl.pl/sammy provides a reference for the visualization style. The goal is NOT physical accuracy -- it is pedagogical clarity. A stylized, simplified cross-section that clearly shows "tongue moves forward for /i/, jaw drops for /a/" is better than an anatomically precise but visually noisy rendering.

## Component Boundary Map

### New vs Modified

```
src/lib/
  audio/
    worklet/
      glottal-processor.ts  --> RENAME to voice-processor.ts (HEAVY MODIFY)
    bridge.ts               --> HEAVY MODIFY (simplify graph)
    state.svelte.ts         --> MODIFY (add glottalModel, rd, filterTopology)
    dsp/
      rosenberg.ts          --> UNCHANGED
      lf.ts                 --> NEW (pure LF sample function for testing)
      biquad.ts             --> NEW (pure biquad coefficient functions for testing)
      formant-response.ts   --> MODIFY (add cascade envelope math)
      formant-utils.ts      --> MODIFY (add coefficient computation)
  components/
    GlottalPulseVisual.svelte   --> MODIFY (render LF shape)
    FormantCurves.svelte        --> MODIFY (cascade/parallel rendering)
    PhonationMode.svelte        --> MODIFY (model selector, Rd slider)
    VocalTractView.svelte       --> NEW
  data/
    vocal-tract-geometry.ts     --> NEW
    phonation-presets.ts        --> MODIFY (add LF presets with Rd values)
  types.ts                      --> MODIFY (add GlottalModel, FilterTopology types)
```

### Unchanged Components

These components need zero changes for v0.2:
- `VowelChart.svelte`, `VowelChartOverlay.svelte` -- reads F1/F2, unaffected
- `PianoHarmonics.svelte`, `PianoKeyboard.svelte`, `HarmonicBars.svelte` -- reads f0/formants, unaffected
- `R1StrategyChart.svelte`, `R2StrategyChart.svelte` -- reads f0/formants, unaffected
- `StrategyPanel.svelte`, `StrategyOverlay*.svelte` -- strategy logic unchanged
- `PitchSection.svelte`, `ExpressionControls.svelte` -- f0/vibrato/jitter unchanged
- `TransportBar.svelte` -- play/stop unchanged
- Strategy engine (`engine.ts`, `auto-strategy.ts`) -- operates on formant targets, topology-agnostic
- All data files except `phonation-presets.ts`

## Recommended Build Order

### Phase 1: LF Glottal Model

**Dependencies:** None. Self-contained in worklet + state.
**Effort:** Medium.

1. Write `lf.ts` with pure `lfDerivativeSample(phase, Rd)` + integration function
2. Unit test against known LF waveform shapes for Rd = 0.5, 1.0, 2.0
3. Add `glottalModel` and `rd` to `VoiceParams`, `snapshot`, and bridge postMessage
4. Inline `lfSample()` in `voice-processor.ts` (was `glottal-processor.ts`)
5. Add model selector to `PhonationMode.svelte`
6. Update `GlottalPulseVisual.svelte` to render LF shape
7. Update `phonation-presets.ts` with Rd values for each mode
8. When LF is selected, bypass the spectral tilt filter (tilt is baked into LF shape via Rd)

### Phase 2: Cascade Formant Filters

**Dependencies:** None strictly, but easier after LF because the worklet is already being modified.
**Effort:** High. This is the biggest change.

1. Write `biquad.ts` with pure resonator coefficient computation + `processBiquad()`
2. Unit test: compute coefficients for known (freq, bw, sr), verify frequency response
3. Add `filterTopology` to `VoiceParams` and bridge postMessage
4. Add inline biquad state and processing to `voice-processor.ts`
5. Implement cascade loop: signal flows through F1 -> F2 -> F3 -> F4 -> F5
6. Implement parallel loop (replacing native nodes): signal splits to F1..F5, sums
7. Update `AudioBridge`: when topology is worklet-internal, skip `buildFormantChain()`, send formant params via postMessage, simplify graph to worklet -> master -> dest
8. Update `formant-response.ts`: add `cascadeSpectralEnvelope()` (product of magnitudes)
9. Update `FormantCurves.svelte` to switch between additive and multiplicative rendering
10. Add topology selector to UI (expert mode only)

### Phase 3: Vocal Tract Visualization

**Dependencies:** None. Can be built in parallel with Phase 1 or 2.
**Effort:** Medium. Mostly geometry and SVG work.

1. Define `TractShape` interface and baseline geometry in `vocal-tract-geometry.ts`
2. Implement deformation functions mapping F1/F2/F3 to articulatory positions
3. Build `VocalTractView.svelte` reading from `voiceParams`
4. Add to `App.svelte` layout
5. Test with vowel extremes (/i/, /a/, /u/) to verify deformations look pedagogically correct

## Anti-Patterns to Avoid

### Anti-Pattern 1: Pulling Audio Data Back to Main Thread for Viz

**What people do:** Use `AnalyserNode.getFloatFrequencyData()` or worklet->main postMessage to feed visualization.
**Why it's wrong:** Adds latency, scheduling complexity, and breaks the "store is truth" principle. The current architecture works because viz reads from the *same* store that drives audio.
**Do this instead:** Continue reading from `voiceParams` for all visualization. The vocal tract viz reads F1/F2/F3 from the store, not from audio analysis.

### Anti-Pattern 2: Recomputing Biquad Coefficients Every Sample

**What people do:** Call the coefficient computation function inside the per-sample loop.
**Why it's wrong:** Coefficient computation involves trig functions (sin, cos, exp). At 48kHz that is 48,000 trig calls per second per filter. With 5 filters, 240k trig calls/sec.
**Do this instead:** Recompute coefficients only when parameters change (on postMessage receipt). For smooth transitions, interpolate coefficients linearly over 64-128 samples.

### Anti-Pattern 3: Physical Vocal Tract Simulation

**What people do:** Implement a full Kelly-Lochbaum waveguide or area-function model for the vocal tract view.
**Why it's wrong:** Massively overscoped. The visualization is pedagogical, not a simulation. A physical model would need its own DSP engine, wouldn't match the formant-based synthesis, and would confuse users when the two disagree.
**Do this instead:** Simple geometric interpolation between reference articulatory shapes based on formant frequencies. The visualization *illustrates* what the formants mean, not what a physical tract would do.

### Anti-Pattern 4: Separate State for New Features

**What people do:** Create a new store for LF params, another for cascade state, another for vocal tract geometry.
**Why it's wrong:** Breaks the single-source-of-truth pattern that makes linked exploration work. Every new store is a sync bug waiting to happen.
**Do this instead:** Add all new parameters to the existing `VoiceParams` class. `glottalModel`, `rd`, `filterTopology` -- all live next to `f0`, `openQuotient`, etc.

## Scaling Considerations

| Concern | Current (v0.1) | After v0.2 |
|---------|----------------|------------|
| Worklet CPU | Rosenberg pulse only (~trivial) | LF pulse + 5 inline biquads = still <5% of one core at 48kHz |
| postMessage frequency | ~60 Hz (every rAF from $effect) | Same. More params per message but message rate unchanged. |
| SVG complexity | ~200 elements total | +50-100 elements for vocal tract. Still under 400. Fine for 60fps. |
| Bundle size | Minimal | +~2KB for LF/biquad math. Vocal tract geometry +~5KB. Negligible. |

The worklet doing all DSP internally is actually more efficient than the current native-node approach because it avoids the overhead of connecting 5 BiquadFilterNodes + 5 GainNodes + 1 SumGain.

## Sources

- Klatt, D.H. (1980). "Software for a cascade/parallel formant synthesizer." *JASA* 67(3). [Klatt 1980 PDF](https://www.fon.hum.uva.nl/david/ma_ssp/doc/Klatt-1980-JAS000971.pdf) -- CASCADE vs PARALLEL topology reference
- Fant, G., Liljencrants, J., Lin, Q. (1985). "A four-parameter model of glottal flow." *STL-QPSR* 26(4). -- Original LF model
- Fant, G. (1995). "The LF-model revisited. Transformations and frequency domain analysis." *STL-QPSR* 36(2-3). -- Rd meta-parameter
- Gobl, C. (2017). "Reshaping the Transformed LF Model: Generating the Glottal Source from Rd." [ResearchGate](https://www.researchgate.net/publication/319185090) -- Rd implementation details
- Audio EQ Cookbook (Robert Bristow-Johnson) -- Biquad coefficient formulas
- `klatt-syn` (chdh, GitHub) -- Reference TS implementation of Klatt cascade/parallel
- Interactive Sagittal Section (SAMMY) at [incl.pl/sammy](https://incl.pl/sammy/) -- Reference for vocal tract visualization style

---
*Architecture research for: Formant Canvas v0.2 Voice Model Depth*
*Researched: 2026-04-13*
