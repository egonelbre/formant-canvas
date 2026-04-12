# Feature Research: v0.2 Voice Model Depth

**Domain:** Voice synthesis engine upgrades + anatomical visualization for singing pedagogy
**Researched:** 2026-04-13
**Confidence:** HIGH (LF model, cascade filters well-documented in literature); MEDIUM (vocal tract visualization -- inverse formant-to-shape mapping is an active research area with no turnkey solution)

## Existing Baseline (Already Built in v0.1)

- Rosenberg C glottal pulse with OQ, spectral tilt, aspiration noise
- Parallel BiquadFilterNode formants F1-F5 (freq/bw/gain each)
- Vibrato LFO, jitter, phonation mode presets (breathy/modal/flow/pressed)
- GlottalPulseVisual SVG component showing waveform shape
- FormantCurves SVG component showing individual response curves on piano
- F1/F2 vowel chart with direct manipulation drag
- VoiceParams single-source-of-truth Svelte 5 $state store
- AudioBridge connecting store to Web Audio graph via postMessage + setTargetAtTime

---

## Feature Landscape

### Table Stakes (Users Expect These)

For v0.2 "Voice Model Depth," these are features that anyone upgrading from Rosenberg/parallel to a more realistic model would expect to work correctly.

| Feature | Why Expected | Complexity | Dependencies on Existing |
|---------|--------------|------------|--------------------------|
| **LF glottal pulse model (Rd parameterization)** | The LF model (Fant et al. 1985) is THE standard glottal source in voice science. Users upgrading from Rosenberg expect it. The Rd single-parameter variant (Fant 1995) collapses Ra/Rk/Rg into one perceptually meaningful knob. | HIGH | Replaces `rosenbergSample()` in glottal-processor.ts. Must coexist -- user selects Rosenberg or LF. Worklet needs new per-sample function + Newton/bisection solver for epsilon parameter at each new period. |
| **Rosenberg/LF model selector** | Users need to switch between models to hear the difference. A/B comparison is the core pedagogy value. | LOW | Adds a `glottalModel` field to VoiceParams. Worklet switches sample function based on message. |
| **Cascade formant filter topology** | Cascade (series) is the standard for voiced speech in Klatt synthesis. Produces correct relative formant amplitudes automatically without per-formant gain tuning. Users expect "cascade mode" if the app claims higher-order resonances. | HIGH | Major AudioBridge refactor: instead of parallel BiquadFilterNodes, chain them in series. Gains become unnecessary for cascade mode (amplitude ratios emerge from topology). Must keep parallel mode available. |
| **Smooth transition between glottal models** | Switching from Rosenberg to LF mid-playback must not click or pop. | MEDIUM | Parameter smoothing in worklet. Map Rosenberg OQ to nearest LF Rd value for crossfade. |
| **Updated GlottalPulseVisual for LF waveform** | The existing SVG pulse visualization shows Rosenberg shape. Must render the LF derivative waveform too, reflecting Rd/Ra/Rk changes in real time. | MEDIUM | GlottalPulseVisual.svelte needs a second path generator for LF shape. Same reactive pattern ($derived). |

### Differentiators (Competitive Advantage)

Features that go beyond basic LF/cascade implementation and leverage Formant Canvas's linked-visualization philosophy.

| Feature | Value Proposition | Complexity | Dependencies on Existing |
|---------|-------------------|------------|--------------------------|
| **Vocal tract sagittal cross-section visualization** | No web-based formant synth shows an anatomical side view that deforms in real time as you drag formants. Pink Trombone does this for physical modeling, but not for formant synthesis. This bridges the gap between "abstract Hz numbers" and "what my throat is doing." | HIGH | New SVG component. Needs formant-to-articulator mapping (see details below). Links to existing F1/F2 vowel chart -- moving the dot on the vowel chart should deform the tract, and vice versa. |
| **Cascade/parallel topology toggle with visual feedback** | Let users hear AND see the difference between cascade and parallel filtering. Show the signal flow diagram in the UI, highlighting which path is active. Unique to Formant Canvas -- no other web synth does this. | MEDIUM | New component showing the audio graph topology. Toggles AudioBridge between two wiring modes. |
| **Higher-order formants (F5-F8) in cascade** | Klatt's original supports up to F8. Higher formants shape the "brightness" and "ring" of the voice. Most web synths stop at F4 or F5. | MEDIUM | Extends the cascade chain. Already have F5 in parallel; cascade makes F6-F8 cheap (no extra gain params needed). |
| **Nasal pole-zero pair** | Cascade topology naturally supports adding a nasal zero (anti-resonance) and nasal pole. Essential for modeling nasalized vowels. Not possible in pure parallel topology. | MEDIUM | Requires IIRFilterNode or custom biquad for the anti-resonance (zero). Adds nasality slider to UI. |
| **LF parameter decomposition view** | Show the Rd knob but also expose Ra, Rk, Rg as linked readouts. When user drags Rd, the sub-parameters animate. Advanced users can decouple and set independently. | LOW-MEDIUM | UI-only feature on top of the LF implementation. Links back to the pulse visual. |
| **Vocal tract area function display** | Alongside the sagittal view, show the tube cross-sectional area as a 1D function. This is how acousticians think about the tract. | MEDIUM | Derived from the same formant-to-shape mapping. Simple bar/area chart SVG. |

### Anti-Features (Explicitly NOT Building)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Full physical-modeling vocal tract (Kelly-Lochbaum waveguide)** | "Like Pink Trombone but better" | Entirely different synthesis engine. Would mean rewriting the audio from scratch. Physical modeling and formant synthesis are fundamentally different approaches. Scope explosion. | Keep formant synthesis. Use the sagittal view as a VISUALIZATION only -- it shows approximate articulator positions derived from formants, it does not drive a physical model. |
| **Real-time inverse filtering / voice analysis** | "Analyze my voice and show the LF parameters" | Doubles the scope. Requires microphone input, pitch tracking, inverse filtering, LF fitting. Different problem domain (analysis vs. synthesis). | Defer to v3+. The synthesis tool teaches what the parameters sound like; analysis is a separate product. |
| **LF model solved with full Newton-Raphson at audio rate** | "Most accurate LF implementation" | Solving the implicit equation for epsilon at every glottal period is expensive. At 48kHz with f0=400Hz, that is 400 solves/second -- feasible but fragile in an AudioWorklet. | Use the Rd-to-timing-parameter regression (Fant 1995) to precompute Ra/Rk/Rg, then use the sndkit/glottis approach: compute waveform coefficients once per period, evaluate the closed-form per sample. Or precompute a wavetable grid indexed by Rd. |
| **WASM-compiled LF model** | "Performance" | Adds a WASM build toolchain (emscripten/Rust) for a per-sample function that can be written in ~50 lines of TS. The sndkit implementation is ~200 lines of C. Not worth the toolchain overhead at this stage. | Inline the LF math in the AudioWorklet processor, same pattern as current Rosenberg inlining. |
| **3D vocal tract rendering** | "More realistic than 2D" | WebGL/Three.js dependency, 3D interaction complexity, no pedagogical benefit over a clean 2D sagittal section for showing tongue/lip/velum position. | 2D SVG sagittal cross-section. This is what phonetics textbooks use. It is the standard visualization. |
| **Tracheal coupling / subglottal resonances** | "Complete Klatt model" | Adds complexity with minimal perceptual impact for singing pedagogy. Subglottal resonances matter for analysis, not for teaching formant tuning. | Omit. Can be added later as an advanced option if demand emerges. |

---

## Feature Details

### LF Glottal Model Implementation

**What it is:** The Liljencrants-Fant (LF) model describes the derivative of glottal airflow as a piecewise function with two segments:
1. Opening/closing phase: `E0 * exp(alpha * t) * sin(omega_g * t)` for `0 <= t < Te`
2. Return phase: `(-Ee / (epsilon * Ta)) * (exp(-epsilon * (t - Te)) - exp(-epsilon * (Tc - Te)))` for `Te <= t < Tc`

**The Rd approach (Fant 1995):** Instead of exposing Ra, Rk, Rg directly, use the single waveshape parameter Rd (range 0.3-2.7):
- Rd ~ 0.3-0.5: pressed voice (short open phase, strong excitation)
- Rd ~ 0.7-1.0: modal voice
- Rd ~ 1.5-2.0: flow phonation
- Rd ~ 2.0-2.7: breathy voice

From Rd, derive: `Ra = (-1 + 4.8 * Rd) / 100`, `Rk = (22.4 + 11.8 * Rd) / 100`, `Rg = (Rk/4) * (0.5 + 1.2 * Rk) / (0.11 * Rd - Ra * (0.5 + 1.2 * Rk))` (simplified from Fant's regression). Then compute timing: `Tp = T0 / (2 * Rg)`, `Te = Tp * (1 + Rk)`, `Ta = Ra * T0`.

**Implementation strategy:** Follow the sndkit/glottis pattern -- compute waveform coefficients (alpha, E0, epsilon, omega) once when a new glottal period begins, then evaluate the closed-form expressions per sample. This avoids any iterative solver at audio rate. The epsilon parameter requires solving a transcendental equation once per period; use 3-4 iterations of Newton's method (converges quickly for typical voice parameters).

**UI mapping:**
- Primary knob: "Voice Quality" slider mapped to Rd (0.3-2.7), with labels "Pressed | Modal | Flow | Breathy"
- Existing phonation presets map to specific Rd values
- Advanced panel: Ra, Rk, Rg as read-only linked displays (or unlockable for manual control)

**Confidence:** HIGH -- the LF model is thoroughly documented. The sndkit implementation (Paul Batchelor) provides a working C reference. klatt-syn (chdh) provides a TS reference for the overall synthesis architecture.

### Cascade Formant Filter Topology

**What it is:** In cascade (series) topology, formant resonators are chained:
```
Source --> F1 --> F2 --> F3 --> F4 --> F5 --> [F6-F8] --> Output
```

vs. current parallel topology:
```
Source --+--> F1 --+
         +--> F2 --+--> Sum --> Output
         +--> F3 --+
         +--> F4 --+
         +--> F5 --+
```

**Why cascade matters:**
1. Correct relative amplitudes emerge automatically from the series connection -- no per-formant gain knobs needed for voiced vowels
2. Natural spectral envelope: the transfer function is an all-pole model matching the acoustic tube theory
3. Prerequisite for nasal anti-resonances (zeros), which require cascade topology
4. Higher formants (F6-F8) are trivially added by appending more resonators

**Why keep parallel too:**
1. Parallel is better for fricatives and plosives (if consonant synthesis is added later)
2. Parallel gives independent amplitude control per formant -- useful for the strategy modes where you want to boost a specific formant
3. The existing system works well in parallel; don't break it

**Implementation approach:**
- AudioBridge gets a `topology: 'cascade' | 'parallel'` switch
- Cascade mode: chain BiquadFilterNodes in series. Remove per-formant GainNodes (amplitudes are automatic). Keep only master gain.
- Parallel mode: keep current architecture unchanged
- Switching topology mid-playback: disconnect and reconnect nodes. Brief (~5ms) mute during reconnection is acceptable.
- For cascade, use `type: 'bandpass'` BiquadFilterNodes same as now, but wired in series

**Higher-order formants (F6-F8):**
- In cascade, adding F6/F7/F8 is just 3 more BiquadFilterNodes in the chain
- Default frequencies: F6 ~4500Hz, F7 ~5200Hz, F8 ~6000Hz (typical male adult)
- Bandwidths increase with frequency: ~500-700Hz for F6-F8
- These shape the "brightness" and help model the singer's formant cluster (F3-F5 clustering)

**Confidence:** HIGH -- Klatt 1980 paper is the definitive reference. klatt-syn provides a working TS implementation. BiquadFilterNode chaining is straightforward Web Audio.

### Vocal Tract Sagittal Visualization

**What it is:** A 2D side-view (midsagittal section) of the human vocal tract showing: lips, teeth, hard palate, soft palate (velum), tongue body/tip/root, pharynx wall, epiglottis, and larynx. The shape deforms in real time as formant values change.

**The mapping problem:** Going from formant frequencies (F1, F2, F3) to articulator positions is an ill-posed inverse problem -- multiple vocal tract shapes can produce the same formants. For a pedagogical tool, we need a simplified, approximate mapping that is "right enough" to be educational.

**Practical approach -- lookup interpolation:**
1. Define a set of canonical vowel articulations (10-15 vowels from IPA chart) with known tongue/lip/jaw positions from phonetics literature (Ladefoged, Fant)
2. Store each as an SVG path template with parameterized control points for: tongue body height, tongue body frontness, lip rounding, jaw opening, velum position
3. Map F1 to jaw opening / tongue height (inverse relationship: high F1 = open jaw = low tongue)
4. Map F2 to tongue frontness (high F2 = front tongue)
5. Map lip rounding from F2/F3 ratio or explicit control
6. Interpolate between canonical shapes using the current F1/F2 position

**Key articulatory-acoustic relationships (well established):**
- F1 inversely correlates with tongue height / jaw opening (higher tongue = lower F1)
- F2 correlates with tongue frontness (front tongue = higher F2)
- F3 correlates with lip rounding and tongue tip position
- Lip rounding lowers all formants, especially F2 and F3

**SVG implementation:**
- Fixed anatomy: hard palate, teeth, nose, pharynx wall as static SVG paths
- Deformable parts: tongue (cubic Bezier with 3-4 control points), lips (2 control points), velum (1 hinge point), jaw (rotation)
- Control points driven by `$derived` from voiceParams F1/F2/F3
- Smooth animation via Svelte transitions or CSS transition on SVG attributes

**Reference implementations:**
- SAMMY (Interactive Sagittal Section, incl.pl/sammy) -- JavaScript, user-controlled articulators, shows IPA. But goes articulatory-to-acoustic, not acoustic-to-articulatory.
- Pink Trombone -- Canvas-based, physical model driven. Wrong synthesis approach but excellent UX reference for the visual deformation.
- VTDemo (UCL) -- Windows desktop app, real-time formant-to-shape display. Closest to what we want, but not web-based.

**Confidence:** MEDIUM -- The forward mapping (shape to formants) is well understood. The inverse mapping (formants to shape) is approximate and requires design choices about which canonical shapes to interpolate between. The visualization itself is straightforward SVG engineering. The tricky part is making it look "right" for edge cases (extreme formant values, non-vowel configurations).

---

## Feature Dependencies

```
[LF Glottal Model]
    requires--> [Worklet refactor: pluggable sample generator]
    enhances--> [GlottalPulseVisual update]
    enhances--> [Phonation presets: map to Rd values]

[Cascade Formant Filters]
    requires--> [AudioBridge topology switching]
    enhances--> [Higher-order formants F6-F8]
    enables---> [Nasal pole-zero pair]
    conflicts--> [Per-formant gain controls (not needed in cascade)]

[Vocal Tract Sagittal View]
    requires--> [Canonical vowel shape data]
    requires--> [F1/F2/F3 to articulator mapping function]
    enhances--> [Existing F1/F2 vowel chart (linked updates)]
    independent-of--> [LF model and cascade filters -- pure visualization]

[Higher-order formants F6-F8]
    requires--> [Cascade topology (to be practical)]
    enhances--> [Singer's formant cluster visualization]

[Nasal pole-zero]
    requires--> [Cascade topology]
    requires--> [IIRFilterNode or custom biquad for anti-resonance]
```

### Dependency Notes

- **LF Model is independent of Cascade Filters:** They address different parts of the signal chain (source vs. filter). Can be built in any order or in parallel.
- **Vocal Tract View is independent of both:** It reads formant values from the store. Does not care whether those formants come from parallel or cascade filters.
- **Cascade is prerequisite for Nasal and practical F6-F8:** In parallel, each additional formant needs a gain parameter. In cascade, it is free.
- **Per-formant gain controls conflict with cascade:** Cascade's whole point is that gains are automatic. UI must hide/disable individual gain sliders when cascade is active.

---

## MVP Definition

### Launch With (v0.2 Core)

- [x] **LF glottal model with Rd parameter** -- the single most impactful audio upgrade. Users hear the difference between Rosenberg and LF immediately. Rd slider replaces the OQ knob as the primary voice quality control.
- [x] **Rosenberg/LF model selector** -- A/B comparison is essential for pedagogy ("hear why LF matters").
- [x] **Updated GlottalPulseVisual** -- must visualize the LF derivative waveform, not just Rosenberg.
- [x] **Cascade formant filter topology** -- with toggle to switch between cascade and parallel. At minimum F1-F5 in cascade.
- [x] **Vocal tract sagittal cross-section** -- simplified but anatomically recognizable. Deforms based on F1/F2. Linked to vowel chart.

### Add After Validation (v0.2.x)

- [ ] **Higher-order formants F6-F8** -- add once cascade is stable and someone asks for "more brightness control"
- [ ] **Nasal pole-zero pair** -- add once cascade is stable; enables nasalized vowel demos
- [ ] **LF parameter decomposition view** -- Ra/Rk/Rg readouts, unlockable for manual control
- [ ] **Vocal tract area function display** -- 1D tube cross-section chart alongside sagittal view
- [ ] **Cascade/parallel visual signal flow diagram** -- shows which topology is active with animated signal path

### Future Consideration (v0.3+)

- [ ] **Tracheal coupling** -- subglottal resonances for completeness
- [ ] **Consonant support via parallel branch** -- fricatives, plosives need parallel topology
- [ ] **Full articulatory control** -- drive synthesis from tongue/lip positions rather than formant frequencies (requires physical model, out of scope)
- [ ] **Voice analysis / inverse filtering** -- analyze real voice input to extract LF parameters

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Phase |
|---------|------------|---------------------|----------|-------|
| LF model with Rd | HIGH | HIGH | P1 | v0.2 core |
| Model selector (Rosenberg/LF) | HIGH | LOW | P1 | v0.2 core |
| Updated pulse visualization | HIGH | MEDIUM | P1 | v0.2 core |
| Cascade formant topology | HIGH | HIGH | P1 | v0.2 core |
| Cascade/parallel toggle | HIGH | MEDIUM | P1 | v0.2 core |
| Vocal tract sagittal view | HIGH | HIGH | P1 | v0.2 core |
| F6-F8 higher formants | MEDIUM | LOW (in cascade) | P2 | v0.2.x |
| Nasal pole-zero | MEDIUM | MEDIUM | P2 | v0.2.x |
| Rd decomposition view | LOW | LOW | P3 | v0.2.x |
| Area function display | LOW | MEDIUM | P3 | v0.2.x |
| Signal flow diagram | MEDIUM | LOW | P2 | v0.2.x |

**Priority key:**
- P1: Must have for v0.2 launch
- P2: Should have, add when core is stable
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Madde (KTH) | Pink Trombone | klatt-syn (chdh) | Our Approach (Formant Canvas) |
|---------|-------------|---------------|-------------------|-------------------------------|
| Glottal source model | LF model, full parameter set | Physical cord model | LF + Rosenberg | LF with Rd single-knob + Rosenberg A/B toggle |
| Formant topology | Cascade (Klatt-style) | Physical waveguide (not formant-based) | Cascade + parallel hybrid | Switchable cascade/parallel with visual feedback |
| Formant count | 6 programmable | N/A (continuous tube) | Up to F8 cascade | F1-F5 default, F6-F8 optional in cascade |
| Vocal tract view | None (parameter-only) | Canvas-drawn tract with direct manipulation | None | SVG sagittal section, deforming from formants, linked to vowel chart |
| Nasalization | Yes (pole-zero) | Velum control | Yes | v0.2.x (requires cascade) |
| Linked visualizations | Harmonics display | Shape + sound linked | Spectrum only | Full linkage: pulse shape + formant curves + piano + vowel chart + tract view |
| Direct manipulation | Slider-based | Drag on tract | Slider-based | Drag on vowel chart deforms tract; drag on tract updates formants |

---

## Sources

**LF Model:**
- Fant, G. et al. (1985). "A four-parameter model of glottal flow." STL-QPSR. [Original LF paper]
- Fant, G. (1995). "The LF-model revisited. Transformations and frequency domain analysis." STL-QPSR. [Rd parameter]
- Gobl, C. (2017). ["Reshaping the Transformed LF Model: Generating the Glottal Source from the Waveshape Parameter Rd"](https://www.isca-archive.org/interspeech_2017/gobl17_interspeech.html) -- Interspeech 2017
- Paul Batchelor, [sndkit/glottis](https://paulbatchelor.github.io/sndkit/glottis/) -- Working C implementation with Rd parameterization (HIGH confidence)
- chdh, [klatt-syn](https://github.com/chdh/klatt-syn) -- TypeScript Klatt synthesizer reference (HIGH confidence)

**Cascade/Parallel Formant Filters:**
- Klatt, D. (1980). ["Software for a cascade/parallel formant synthesizer"](https://www.fon.hum.uva.nl/david/ma_ssp/doc/Klatt-1980-JAS000971.pdf) -- JASA (HIGH confidence)
- Stanford CCRMA, [Formant Synthesis Models](https://ccrma.stanford.edu/~jos/pasp/Formant_Synthesis_Models.html) (HIGH confidence)
- Berkeley Phonlab, [Klatt Synthesizer Parameters](https://linguistics.berkeley.edu/plab/guestwiki/index.php?title=Klatt_Synthesizer_Parameters) (HIGH confidence)

**Vocal Tract Visualization:**
- SAMMY Interactive Sagittal Section, [incl.pl/sammy](https://incl.pl/sammy/) -- JavaScript reference for sagittal UI (MEDIUM confidence -- articulatory-to-acoustic direction, we need inverse)
- Pink Trombone, [Modular version](https://github.com/yonatanrozin/Modular-Pink-Trombone) -- Canvas tract visualization reference (HIGH confidence on viz approach)
- VTDemo, [UCL Phonetics](https://www.phon.ucl.ac.uk/resource/vtdemo/) -- Desktop vocal tract demonstrator (MEDIUM confidence -- Windows only, not inspectable)
- Maeda, S. (1990). "Compensatory articulation during speech" -- Area function model reference

---
*Feature research for: Formant Canvas v0.2 Voice Model Depth*
*Researched: 2026-04-13*
