# Phase 6: LF Glottal Model - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Add the Liljencrants-Fant (LF) glottal pulse model as a user-selectable alternative to Rosenberg, with Rd parameterization for a single tense-to-breathy voice quality dimension, band-limited wavetables for clean sound at high f0, and a decomposition view showing how Rd maps to underlying LF parameters.

</domain>

<decisions>
## Implementation Decisions

### Model Switching UX
- **D-01:** Segmented toggle (Rosenberg | LF) in the Source section, near the existing phonation mode selector
- **D-02:** Mute-switch transition when changing models (~50ms fade out, swap, fade in) to prevent clicks
- **D-03:** When LF is selected, the Rd slider replaces openQuotient and spectralTilt controls. Those params are computed from Rd internally. When Rosenberg is selected, OQ and tilt controls show as before.

### Rd Slider Behavior
- **D-04:** Horizontal range slider (Rd range ~0.3 to ~2.7) with a single dynamic explainer label that changes as the value changes (e.g., "Pressed" at low values, "Modal" around 1.0, "Breathy" at high values) instead of fixed tick labels. Conserves space.
- **D-05:** Default Rd = 1.0 (modal voice) when switching to LF model
- **D-06:** Phonation mode buttons (pressed/modal/breathy) remain visible when LF is active and act as Rd presets (pressed~0.3, modal~1.0, breathy~2.5). User can fine-tune with the Rd slider afterward.

### Decomposition View
- **D-07:** Expandable/collapsible panel below the existing glottal pulse visual. Hidden by default, toggle to show.
- **D-08:** Shows an annotated LF waveform with timing markers (Tp, Te, Ta, Tc) annotated on the pulse shape, plus numeric readouts for Ra, Rk, Rg, Ta. Updates in real time as Rd changes.

### Anti-aliasing
- **D-09:** Pre-computed band-limited wavetables generated at AudioWorklet startup, one per octave, with harmonics truncated at Nyquist for each f0 range. Interpolate between tables at runtime.
- **D-10:** Rosenberg model stays analytical (no wavetables) — its smooth waveform doesn't alias audibly at high f0.

### Claude's Discretion
- Number of wavetable octave divisions and interpolation strategy
- Exact Rd-to-label mapping thresholds for the dynamic explainer
- LF parameter computation formulas (Fant 1995 standard)
- Waveform annotation visual style in the decomposition view
- Exact Rd preset values for phonation mode buttons

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing audio engine
- `src/lib/audio/worklet/glottal-processor.ts` — Current Rosenberg worklet processor; LF model will be added here
- `src/lib/audio/dsp/rosenberg.ts` — Rosenberg pulse function (reference for the pattern)
- `src/lib/audio/bridge.ts` — AudioBridge connecting VoiceParams to Web Audio graph; needs model-switching support
- `src/lib/audio/state.svelte.ts` — VoiceParams singleton; needs new params (glottalModel, rd)

### Existing UI
- `src/lib/components/GlottalPulseVisual.svelte` — Current pulse waveform visual; needs LF rendering + decomposition panel
- `src/lib/components/PhonationMode.svelte` — Phonation mode selector; needs to act as Rd presets when LF active

### LF model theory
- `klatt-syn` npm package source — Reference Klatt cascade-parallel formant synthesizer with LF model implementation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GlottalPulseVisual.svelte`: SVG waveform rendering — extend for LF pulse shape and decomposition annotations
- `PhonationMode.svelte`: Phonation selector buttons — reuse as Rd preset triggers
- `rosenberg.ts` / inlined worklet copy: Pattern for pure function pulse generation that gets inlined into the worklet
- `AudioBridge.syncParams()`: Parameter forwarding pattern via `postMessage` — extend with glottalModel and rd params

### Established Patterns
- All DSP logic is inlined in the worklet (can't use ES module imports in AudioWorkletGlobalScope)
- Parameter smoothing via one-pole filter in worklet (`f0Smooth` pattern)
- Parameter changes sent via `postMessage` with `{ type: 'params', ... }` structure
- `$state` runes in `VoiceParams` for reactive UI binding
- SVG-based visualization components with `$derived` for reactive rendering

### Integration Points
- `VoiceParams` class: Add `glottalModel` ('rosenberg' | 'lf') and `rd` fields
- `glottal-processor.ts`: Add LF sample generation alongside Rosenberg, switch based on model param
- `AudioBridge.syncParams()`: Forward new `glottalModel` and `rd` params to worklet
- `GlottalPulseVisual.svelte`: Branch rendering based on active model; add decomposition panel
- Master gain ramp for mute-switch on model change (existing `setTargetAtTime` pattern)

</code_context>

<specifics>
## Specific Ideas

- Rd slider uses a dynamic explainer label that changes text as the value changes, instead of fixed tick labels — saves space while being more informative
- Phonation mode buttons serve double duty: normal OQ/tilt presets for Rosenberg, Rd presets for LF
- Decomposition view is educational — annotated waveform shows the actual LF timing parameters on the pulse shape

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-lf-glottal-model*
*Context gathered: 2026-04-13*
