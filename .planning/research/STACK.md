# Technology Stack: v0.2 Additions

**Project:** Formant Canvas v0.2 — Voice Model Depth
**Researched:** 2026-04-13
**Scope:** Stack additions/changes for LF glottal model, cascade formant filters, and vocal tract visualization. Does NOT re-cover the validated v0.1 stack (Svelte 5, TS 6, Vite 8, Web Audio, d3-scale, svelte-gestures).

---

## New Stack Requirements Summary

v0.2 adds three capabilities. Each has distinct stack implications:

| Feature | Stack Impact | New Dependencies |
|---------|-------------|-----------------|
| LF glottal model | Worklet code change only | **None** — implement from DSP literature |
| Cascade formant filters | AudioBridge topology change | **None** — uses existing `BiquadFilterNode` |
| Vocal tract visualization | New SVG component | **`d3-shape` 3.x** (optional, for area paths) |

**The critical finding: v0.2 requires zero new runtime dependencies.** All three features are implemented with existing Web Audio primitives and SVG. The work is algorithmic, not library-integration.

---

## Feature 1: LF (Liljencrants-Fant) Glottal Model

### What to Build

A per-sample LF pulse generator that runs inside the existing `glottal-processor.ts` AudioWorklet, selectable as an alternative to the current Rosenberg model.

### Recommended Approach: Rd-Parameterized Transformed LF Model

Use Fant's (1995) single-parameter Rd approach rather than exposing raw LF parameters (Tp, Te, Ta, Ee). The Rd parameter captures natural covariation between glottal parameters and maps directly to perceived voice quality:

| Rd Value | Voice Quality | Phonation |
|----------|---------------|-----------|
| 0.3-0.5 | Pressed/tense | Strong adduction |
| 0.5-1.0 | Modal | Normal speech/singing |
| 1.0-2.0 | Relaxed/breathy | Reduced adduction |
| 2.0-2.7 | Very breathy | Weak source |

**Why Rd, not raw LF parameters:** The raw LF model has four coupled parameters (Tp, Te, Ta, alpha/epsilon) where changing one requires recomputing others via implicit equations. The Rd parameterization reduces this to one slider that the user can intuit ("tense to breathy"). For a pedagogy tool, this is the right abstraction. Advanced users can still see the derived R-parameters (Ra, Rk, Rg) as read-only displays.

### Implementation: No Library, Inline Math

The LF derivative waveform is defined piecewise:
- **Open phase (0 to Te):** `E0 * exp(alpha*t) * sin(omega_g * t)`
- **Return phase (Te to Tc):** `(-Ee / (epsilon * Ta)) * (exp(-epsilon*(t-Te)) - exp(-epsilon*(Tc-Te)))`

From Rd, derive the R-parameters via Fant's regression:
- `Ra = (-1 + 4.8*Rd) / 100`  (return phase ratio)
- `Rk = (22.4 + 11.8*Rd) / 100`  (asymmetry coefficient)
- `Rg = (Rk/4) * (0.5 + 1.2*Rk) / (0.11*Rd - Ra*(0.5+1.2*Rk))` (glottis frequency ratio)

Then convert to LF time-domain parameters:
- `Tp = 1 / (2*Rg*f0)`
- `Te = Tp * (1 + Rk)`
- `Ta = Ra / (2*pi*f0)`

The implicit equation for alpha is solved per-cycle via Newton-Raphson iteration (converges in 3-5 steps).

**Confidence: HIGH** on the math (Fant 1995 and Gobl 2017 are the canonical sources). **MEDIUM** on performance — Newton-Raphson per-cycle at 48kHz/120Hz = ~400 iterations/sec, which is trivial, but the exp/sin calls per-sample need profiling.

### Stack Impact

| Component | Change |
|-----------|--------|
| `src/lib/audio/dsp/lf-model.ts` | **New file.** Pure function: `(phase, Rd, f0, sampleRate) => sample`. Testable in Vitest. |
| `src/lib/audio/worklet/glottal-processor.ts` | Add LF sample generator alongside Rosenberg. Switch via `postMessage` param `glottalModel: 'rosenberg' | 'lf'`. |
| `src/lib/audio/state.svelte.ts` | Add `glottalModel` and `lfRd` to `VoiceParams`. |
| `src/lib/audio/bridge.ts` | Forward new params via `postMessage`. |

**No new dependencies.** All math is inline (~80 lines of TS for the core LF implementation, ~30 lines for Rd-to-parameter regression).

### Reference Code to Study

| Source | What to Learn | Confidence |
|--------|---------------|------------|
| `klatt-syn` (chdh, TS) — [github.com/chdh/klatt-syn](https://github.com/chdh/klatt-syn) | Klatt's original glottal source types, how cascade/parallel filters are structured in TS. The "natural" voicing source is related to LF. Study the resonator implementation. | HIGH |
| TGSpeechBox (C++) — [github.com/tgeczy/TGSpeechBox](https://github.com/tgeczy/TGSpeechBox) | LF-inspired glottal model with Rd-style voice quality control. Study the C++ pulse generation loop. | MEDIUM |
| Gobl (2017) "Reshaping the Transformed LF Model" — [Interspeech proceedings](https://www.isca-archive.org/interspeech_2017/gobl17_interspeech.html) | Canonical paper for Rd parameterization. Contains the regression formulas and waveshape tables. | HIGH |
| Fant (1995) "The LF-model revisited" | Original Rd derivation. If Gobl 2017 is available, prefer it — it corrects edge cases. | HIGH |

### Performance Optimization Path

If per-sample `Math.exp` + `Math.sin` proves too expensive inside the worklet:
1. **Wavetable approach:** Pre-compute one period of the LF waveform for a grid of Rd values (e.g., 16 values from 0.3 to 2.7) at worklet construction. Interpolate between adjacent wavetables at runtime. This is the approach used in differentiable LPC singing voice synthesis (arxiv 2306.17252). Cost: ~2KB of tables, near-zero per-sample cost.
2. **Per-cycle recompute:** Only solve Newton-Raphson and recompute the waveform table once per glottal cycle (every ~200 samples at 120Hz/48kHz). Within a cycle, index into the precomputed period.

Recommended: Start with per-sample computation. Profile. Switch to wavetable only if profiling shows problems on low-end hardware.

---

## Feature 2: Cascade Formant Filter Topology

### What to Build

A series (cascade) connection of BiquadFilterNodes as an alternative to the current parallel topology. In cascade mode, the signal passes through F1, then F2, then F3, etc. in series.

### Why Cascade Matters

The current parallel topology requires per-formant gain parameters to produce correct relative amplitudes. In cascade (series) mode, the formant peak amplitudes emerge naturally from the filter chain — only center frequency and bandwidth are needed, plus one overall gain. This is:
- More physically accurate (models the vocal tract as a single resonant tube)
- Easier for users (fewer parameters to manage)
- Better for vowel-to-vowel transitions (no gain discontinuities)

### Implementation: Rewire Existing BiquadFilterNodes

The current bridge already creates 5 `BiquadFilterNode` instances. Cascade mode simply rewires them:

**Current (parallel):**
```
Worklet --+--> F1 --> G1 --+
           +--> F2 --> G2 --+--> Sum --> Master
           +--> F3 --> G3 --+
           +--> F4 --> G4 --+
           +--> F5 --> G5 --+
```

**New (cascade):**
```
Worklet --> F1 --> F2 --> F3 --> F4 --> F5 --> Master
```

### Stack Impact

| Component | Change |
|-----------|--------|
| `src/lib/audio/bridge.ts` | Add `buildCascadeChain()` method. Support topology switching via `formantTopology: 'parallel' | 'cascade'`. In cascade mode, per-formant GainNodes are not needed — remove from signal path (keep for parallel). |
| `src/lib/audio/state.svelte.ts` | Add `formantTopology` param. In cascade mode, per-formant gain controls become read-only or hidden in UI. |
| `src/lib/audio/dsp/formant-utils.ts` | No change — `bandwidthToQ` works the same regardless of topology. |

**No new dependencies.** `BiquadFilterNode` supports both topologies natively. The only difference is how `.connect()` calls are wired.

### Cascade Filter Type Choice

Use `bandpass` type for cascade, same as parallel. The Klatt cascade synthesizer uses second-order resonators (equivalent to `bandpass` biquads) in series. For higher-order resonances (4th-order formants), cascade two biquads for the same formant:

```
F1a --> F1b --> F2a --> F2b --> ...
```

Each pair of biquads creates a 4th-order resonance with steeper skirts. This is standard Klatt practice for F4/F5 which need narrower peaks.

**Confidence: HIGH.** This is well-understood DSP. The Web Audio spec guarantees `BiquadFilterNode` in series works correctly with `setTargetAtTime` for parameter automation on each node independently.

### Caveats

| Issue | Mitigation |
|-------|------------|
| Cascade filters amplify quantization noise through the chain | Not a problem at 32-bit float (Web Audio uses Float32 throughout) |
| Switching topology at runtime causes audio glitch | Mute during switch, rebuild graph, unmute. Use the existing `masterGain` ramp-to-zero pattern from `stop()`. |
| Per-formant gain UI becomes meaningless in cascade mode | Hide per-formant gain sliders when cascade is active. Show only master gain + overall spectral tilt. |

---

## Feature 3: Anatomical Vocal Tract Side-View Visualization

### What to Build

An SVG midsagittal (side-view) cross-section of the vocal tract that deforms in real-time as formant values change, showing tongue position, jaw opening, lip rounding, and pharynx shape.

### Recommended Approach: Simplified Tube-to-Sagittal Mapping

This is NOT a physical model of the vocal tract (that would be Pink Trombone territory). Instead, it is a pedagogical visualization that shows an approximate vocal tract shape corresponding to the current formant values. The mapping is:

1. **F1 <-> jaw opening / tongue height** (inverse: high F1 = open jaw = low tongue)
2. **F2 <-> tongue frontness** (high F2 = front tongue position)
3. **F3 <-> lip rounding + pharynx width** (low F3 with low F2 = rounded)
4. **F4/F5 <-> minor adjustments** (subtle, mostly decorative)

These relationships are well-established in acoustic phonetics (Fant 1960, Ladefoged & Johnson). The visualization does not need to be acoustically invertible — it needs to be directionally correct and pedagogically useful.

### Implementation: SVG Path Deformation

Build the vocal tract outline as a set of SVG control points that are interpolated based on formant values:

| Anatomical Region | Controlled By | SVG Technique |
|-------------------|---------------|---------------|
| Jaw / mouth opening | F1 | Translate lower lip/jaw anchor points vertically |
| Tongue body position | F1, F2 | Move tongue body control points (front-back from F2, high-low from F1) |
| Tongue tip | F2, F3 | Slight adjustment for front vowels |
| Lip aperture | F3 (+ rounding flag) | Scale lip opening horizontally and vertically |
| Pharynx width | F1 | Widen pharynx with low tongue (high F1) |
| Velum | fixed (open/closed for nasal) | Static for v0.2 |
| Larynx / glottis | decorative | Static outline, pulsing indicator synced to f0 |

### Stack Impact

| Component | Change |
|-----------|--------|
| `src/lib/components/VocalTractView.svelte` | **New file.** SVG component with reactive control points derived from `voiceParams.f1Freq`, `f2Freq`, etc. |
| `src/lib/data/vocal-tract-geometry.ts` | **New file.** Base SVG path data for the midsagittal outline + per-region deformation functions mapping Hz to control point offsets. |
| `src/lib/data/vowel-tract-targets.ts` | **New file.** Known vocal tract shapes for reference vowels (from published articulatory data). Used to validate the deformation mapping looks right. |

### Optional Dependency: `d3-shape`

| Decision | Recommendation |
|----------|----------------|
| Use `d3-shape` for area paths? | **Maybe.** If the tongue surface needs smooth cubic interpolation through multiple control points, `d3.area()` with `curve(curveBasis)` is cleaner than hand-rolling SVG cubic bezier strings. But if 4-6 manual bezier control points suffice, skip it. |
| Bundle impact | `d3-shape` 3.x is ~4 KB gzipped, ESM, tree-shakable. Already listed as optional in v0.1 stack. Low cost. |
| Install | `npm install d3-shape@3` + `npm install -D @types/d3-shape` |

**Recommendation: Start without `d3-shape`.** Use manual SVG `<path>` with cubic beziers for the tongue and palate curves. If the path math gets unwieldy (more than ~8 control points per curve), add `d3-shape` then.

### SVG vs Canvas for Vocal Tract

**Use SVG.** Rationale:
- The vocal tract is ~20-30 path elements, not pixel-pushing
- Svelte's reactive `$derived` fits perfectly for deforming control points
- SVG paths can be inspected, styled, and animated with CSS transitions
- Hit-testing (for future drag-to-deform) is free with SVG
- Consistent with existing visualization approach (VowelChart, PianoKeyboard)

Canvas would only be needed if you're rendering a spectrogram or waveform (per v0.1 stack decision), neither of which applies here.

### Reference Implementations to Study

| Source | What to Learn |
|--------|---------------|
| [Interactive Sagittal Section (Sammy)](https://incl.pl/sammy/) | How to render a midsagittal view in a web browser with moveable articulators. Study the SVG structure and how tongue/jaw/lip positions are parameterized. |
| [Vowel Demonstrator (SENS)](https://www.sens.com/products/vowel-demonstrator/) | Commercial tool linking formant frequencies to vocal tract visualization. Study the UX: what anatomical features are shown, how deformation is presented to learners. |
| [Pink Trombone](https://dood.al/pinktrombone/) | Canvas-based vocal tract visualization with real-time audio. Study the rendering of the tract outline, not the physical model underneath. |
| [tuben](https://github.com/jbeskow/tuben) (Python) | Tube-to-formant calculation from Liljencrantz & Fant 1975. Study the area function parameterization. |
| Fant (1960) four-tube model — [tube_models](https://www.phon.ox.ac.uk/jcoleman/tube_models.htm) | Pedagogical tube models showing how constriction position and area map to formant frequencies. Use as the basis for the F1/F2-to-shape mapping. |

**Confidence: MEDIUM.** The formant-to-shape mapping is inherently approximate (the inverse problem is ill-posed — multiple tract shapes produce the same formants). For pedagogy, "directionally correct" is sufficient. The risk is that the visualization looks wrong for some vowel combinations. Mitigation: validate against published articulatory data for the standard vowels (/a/, /i/, /u/, /e/, /o/) and tune the mapping functions.

---

## What NOT to Add for v0.2

| Avoid | Why | What to Do Instead |
|-------|-----|-------------------|
| **VocalTractLab** or any physical-model library | Wrong abstraction — we're doing formant-to-shape visualization, not articulatory synthesis. Massive complexity for no payoff. | Hand-coded SVG deformation based on formant values. |
| **WebGL / Three.js for 3D vocal tract** | 2D midsagittal is the standard pedagogical view. 3D adds complexity with no pedagogical benefit for this app. | SVG 2D midsagittal cross-section. |
| **IIRFilterNode for cascade formants** | `BiquadFilterNode` gives you parameter automation via `setTargetAtTime`. `IIRFilterNode` has fixed coefficients — you'd need to swap nodes to change formant frequency, causing clicks. | `BiquadFilterNode` in series. |
| **SharedArrayBuffer for LF parameters** | Still requires COOP/COEP headers (same GitHub Pages issue as v0.1). `postMessage` is fast enough for Rd changes at UI rate. | `postMessage` with structured clone. |
| **WASM for LF computation** | Per-sample LF is ~10 ops (exp + sin + multiply). JavaScript handles this at 48kHz easily. WASM adds toolchain complexity with no measurable benefit. | Inline TypeScript in the worklet. |
| **d3-interpolate for vocal tract animation** | SVG CSS transitions or Svelte tweened stores handle the deformation smoothly. No need for another d3 module. | CSS `transition` on SVG paths, or Svelte `tweened` store for control points. |
| **Full `d3` bundle** | Same as v0.1: cherry-pick only what you need. | `d3-scale` (already installed) + optionally `d3-shape`. |

---

## Updated Installation

No new runtime dependencies are required. Optionally:

```bash
# Only if SVG path math for vocal tract becomes complex:
npm install d3-shape@3
npm install -D @types/d3-shape
```

---

## State Changes Summary

New fields needed in `VoiceParams`:

```typescript
// Glottal model selection
glottalModel = $state<'rosenberg' | 'lf'>('rosenberg');
lfRd = $state(1.0);  // Rd parameter: 0.3 (pressed) to 2.7 (breathy)

// Formant topology
formantTopology = $state<'parallel' | 'cascade'>('parallel');
```

The `snapshot` getter and worklet `postMessage` must be extended to include these.

---

## Alternatives Considered

| Decision | Chosen | Alternative | Why Not |
|----------|--------|-------------|---------|
| LF parameterization | Rd (single param) | Raw Tp/Te/Ta/Ee (4 params) | Coupled parameters require solving implicit equations on every change. Rd captures the perceptual axis (tense-breathy) that matters for pedagogy. Advanced users see derived R-params as read-only. |
| LF implementation | Inline TS in worklet | `klatt-syn` at runtime | klatt-syn is designed for offline buffer rendering, not sample-accurate real-time. Its LF variant (if present) isn't structured for AudioWorklet. Study the source, don't import it. |
| Cascade filters | Native `BiquadFilterNode` in series | Custom IIR in a single worklet | Native biquads are hardware-optimized, get free `setTargetAtTime` automation, and don't fight the Web Audio threading model. Custom IIR only if biquad can't produce the needed filter shape (it can for standard formant resonances). |
| Higher-order formants | Two cascaded biquads per formant | Single higher-order IIRFilterNode | Two biquads = 4th order, standard Klatt practice. IIRFilterNode can't automate coefficients. |
| Vocal tract rendering | SVG with Svelte reactivity | Canvas 2D | ~20 elements, need hit-testing for future drag, consistent with existing viz stack. Canvas is for pixel-pushing (spectrograms). |
| Vocal tract model | Formant-to-shape heuristic mapping | Physical articulatory model | Physical models (Kelly-Lochbaum, Pink Trombone) solve a different problem (shape-to-sound). We need sound-to-shape, which is an ill-posed inverse problem. A tuned heuristic is honest about this and works well pedagogically. |

---

## Sources

**LF model and Rd parameterization (HIGH confidence):**
- Fant, G. (1995). "The LF-model revisited. Transformations and frequency domain analysis." STL-QPSR, 36(2-3), 119-156.
- [Gobl (2017) "Reshaping the Transformed LF Model" — Interspeech](https://www.isca-archive.org/interspeech_2017/gobl17_interspeech.html)
- [Semantic Scholar: Reshaping the Transformed LF Model](https://www.semanticscholar.org/paper/Reshaping-the-Transformed-LF-Model:-Generating-the-Gobl/1418a18b9c353de44b0c087419d08abae4d0e733)

**Cascade vs parallel formant filters (HIGH confidence):**
- [Klatt (1980) "Software for a cascade/parallel formant synthesizer"](https://www.fon.hum.uva.nl/david/ma_ssp/doc/Klatt-1980-JAS000971.pdf)
- [CCRMA Formant Filtering Example](https://ccrma.stanford.edu/~jos/filters/Formant_Filtering_Example.html)
- [DSP Related: Series and Parallel Filter Sections](https://www.dsprelated.com/freebooks/filters/Series_Parallel_Filter_Sections.html)
- [EarLevel: Cascading Filters](https://www.earlevel.com/main/2016/09/29/cascading-filters/)

**Reference implementations (HIGH confidence — source verified):**
- [klatt-syn (chdh, TypeScript)](https://github.com/chdh/klatt-syn) — Klatt cascade-parallel synthesizer
- [TGSpeechBox (C++)](https://github.com/tgeczy/TGSpeechBox) — LF glottal model with voice quality control

**Vocal tract visualization (MEDIUM confidence):**
- [Interactive Sagittal Section (Sammy)](https://incl.pl/sammy/)
- [Pink Trombone](https://dood.al/pinktrombone/)
- [tuben tube model (Python)](https://github.com/jbeskow/tuben)
- [Fant tube models — Oxford Phonetics](https://www.phon.ox.ac.uk/jcoleman/tube_models.htm)
- [Vocal tract area function from midsagittal profiles (Badin & Beautemps)](https://www.sciencedirect.com/science/article/abs/pii/016763939400045C)

**Web Audio API (HIGH confidence):**
- [BiquadFilterNode — MDN](https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode)
