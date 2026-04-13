# Phase 7: Cascade Formant Filters - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Add cascade (series) formant filter topology as a user-selectable alternative to the existing parallel topology. Cascade mode auto-couples formant amplitudes per Klatt 1980. Also add optional 4th-order resonances (two biquads per formant) for sharper formant peaks. Both topologies remain available.

</domain>

<decisions>
## Implementation Decisions

### Filter Topology Switching UX
- **D-01:** Segmented toggle (Parallel | Cascade) in the Formants section, same pattern as Phase 6's Rosenberg/LF toggle
- **D-02:** Mute-crossfade transition when switching topologies (50ms fade out, rewire, fade in) — reuse AudioBridge.switchModel() pattern
- **D-03:** In cascade mode, per-formant gain sliders (f1Gain-f5Gain) are hidden entirely. Only frequency and bandwidth remain user-adjustable. Gains are inherent in the cascade transfer function.

### Cascade Implementation
- **D-04:** Use native BiquadFilterNodes rewired in series (worklet -> F1 -> F2 -> F3 -> F4 -> F5 -> master) rather than custom IIR inside the worklet. Browser-optimized, de-zippered params via setTargetAtTime.
- **D-05:** In cascade mode, no per-formant GainNodes between filters. The series connection inherently produces correct relative amplitudes (Klatt 1980 cascade behavior). Topology swap = disconnect and reconnect nodes in the AudioBridge.

### Higher-Order Resonances
- **D-06:** Global toggle for 4th-order resonances — a single checkbox/toggle in the Formants section. When enabled, each formant uses two cascaded biquads instead of one.
- **D-07:** 4th-order toggle is available in both parallel and cascade modes. In parallel: each formant branch gets two biquads in series before its gain node. In cascade: the full chain doubles (10 biquads total instead of 5).

### Visualization
- **D-08:** Add a `cascadeEnvelope()` function that multiplies (rather than sums) formant transfer functions in series. The spectral envelope visualization uses the correct computation for the active topology.
- **D-09:** Formant range overlays, vowel chart, and piano harmonics behave identically regardless of topology. Topology only changes the sound and spectral envelope shape — formant frequencies are still F1/F2/etc.

### Claude's Discretion
- Exact BiquadFilterNode wiring logic for cascade mode in AudioBridge
- How to handle the 4th-order toggle's interaction with the filter graph (pre-create all nodes or create/destroy on toggle)
- Whether to add a `filterTopology` field to VoiceParams or keep it in a separate UI state
- Spectral envelope visualization styling differences between parallel and cascade curves
- Filter type choice for cascade biquads (bandpass vs peaking) based on Klatt 1980 reference

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing audio engine
- `src/lib/audio/bridge.ts` — AudioBridge with parallel formant chain; needs cascade rewiring and topology switch method
- `src/lib/audio/state.svelte.ts` — VoiceParams singleton; needs filterTopology and filterOrder fields
- `src/lib/audio/worklet/glottal-processor.ts` — Glottal source worklet; no changes needed (filtering stays external)
- `src/lib/audio/dsp/formant-utils.ts` — bandwidthToQ utility; reusable for cascade biquads
- `src/lib/audio/dsp/formant-response.ts` — spectralEnvelope() assumes parallel summation; needs cascade multiplication variant

### Existing UI
- `src/lib/components/PhonationMode.svelte` — Reference for segmented toggle pattern (Rosenberg/LF)

### Klatt cascade reference
- `klatt-syn` npm package source — Reference Klatt 1980 cascade-parallel formant synthesizer implementation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AudioBridge.buildFormantChain()`: Parallel topology builder — adapt for cascade by rewiring BiquadFilterNodes in series
- `AudioBridge.switchModel()`: Mute-crossfade pattern (50ms fade) — reuse for topology switching
- `bandwidthToQ()`: Converts formant bandwidth to BiquadFilterNode Q value — works for both topologies
- `formantMagnitude()`: Single formant response function — reusable as building block for cascade envelope

### Established Patterns
- All formant filtering uses native BiquadFilterNodes on the main audio thread (not inside worklet)
- Parameter smoothing via `setTargetAtTime()` with time constants (formantTC = 0.06)
- Per-formant data organized as arrays in syncParams() — extend with topology awareness
- Segmented toggle UI pattern (Rosenberg | LF) established in Phase 6
- `$state` runes for reactive parameter binding in VoiceParams

### Integration Points
- `VoiceParams`: Add `filterTopology` ('parallel' | 'cascade') and `filterOrder` (2 | 4) fields
- `AudioBridge.buildFormantChain()`: Branch on topology to build parallel or cascade graph
- `AudioBridge.syncParams()`: Skip per-formant gain updates when cascade is active
- `formant-response.ts`: Add `cascadeEnvelope()` alongside existing `spectralEnvelope()`
- Spectral envelope visualization components: Use topology-aware envelope function

</code_context>

<specifics>
## Specific Ideas

- Cascade mode hides gain sliders rather than showing them as read-only — cleaner UI
- No per-formant gain nodes in cascade — the series transfer function is the whole point
- 4th-order available in both modes for maximum flexibility
- Spectral envelope computed mathematically (multiply transfer functions) rather than measured via AnalyserNode

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-cascade-formant-filters*
*Context gathered: 2026-04-13*
