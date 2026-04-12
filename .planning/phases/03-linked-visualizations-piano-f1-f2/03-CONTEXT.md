# Phase 3: Linked Visualizations (Piano + F1/F2) - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

The two signature visualizations come online — piano keyboard with live harmonics and formant overlays, and the F1/F2 vowel chart with Hillenbrand background and direct drag-to-tune. Core Value verification: changing any parameter updates audio, the F1/F2 chart, and the piano harmonics together within one animation frame, with no audio glitches while dragging at 60 fps.

</domain>

<decisions>
## Implementation Decisions

### F1/F2 Chart Orientation & Scale
- **D-01:** Cartesian (natural) orientation — F1 increasing upward (Y axis), F2 increasing rightward (X axis). Not the inverted phonetics convention.
- **D-02:** Axes labeled in Hz with log-scale spacing for perceptual evenness
- **D-03:** SVG-based chart (declarative, reactive, accessible). Not Canvas — element count is low (<200)

### Piano Harmonics Display
- **D-04:** 5-octave range: C2-B6 (~65 Hz to ~1976 Hz). Shows harmonics up to ~2 kHz with formant overlays partially visible
- **D-05:** Harmonic amplitudes shown as vertical bars rising above each key, height proportional to amplitude after analytic formant filter response evaluation
- **D-06:** At least 12 overtone markers drawn on the correct keys
- **D-07:** Formant filter response curves (F1-F4) drawn as continuous curves overlaid on the piano, so the spectral envelope shape is visible together with the harmonic bars. Each formant curve in a distinct color
- **D-08:** Current f0 highlighted on the piano key

### Vowel Preset Interaction
- **D-09:** IPA vowel symbols rendered directly on the F1/F2 chart at their Hillenbrand centroid positions. Click a symbol to snap the handle to that vowel's formants
- **D-10:** Cardinal vowels (/a e i o u/) plus the 12 Hillenbrand vowels as clickable preset positions
- **D-11:** No separate chip row — the chart itself serves as the preset selector

### Drag Behavior & Linked Update
- **D-12:** Simple accent-colored filled circle (~16px) as drag handle on the F1/F2 chart. No crosshair, no floating readout. Clean and minimal
- **D-13:** Dragging the handle updates voiceParams.f1Freq and voiceParams.f2Freq in real time. F3/F4 follow a fixed ratio or stay at current values
- **D-14:** All views (audio, F1/F2 chart, piano harmonics) update within one animation frame on any parameter change (LINK-01)
- **D-15:** No audio glitches while dragging at 60 fps (LINK-03). Formant changes use setTargetAtTime smoothing

### Hillenbrand Data & Citation
- **D-16:** Hillenbrand (1995) vowel data embedded as JSON. Drawn as IPA-labelled ellipses in the chart background
- **D-17:** Per-voice-type (male/female/child) formant range overlays selectable on the F1/F2 chart (RANGE-02)
- **D-18:** Source citation "Hillenbrand et al. (1995)" visible on the chart (VOWEL-05)
- **D-19:** Current F1/F2 position indicates which vowel region it falls inside (RANGE-03)

### Claude's Discretion
- Exact Hillenbrand ellipse rendering (fill opacity, stroke style, label positioning)
- Piano key sizing and visual proportions for 5 octaves at 600px width
- Harmonic bar width, color, and spacing
- F3/F4 tracking behavior when F1/F2 are dragged
- Vowel region hit-testing algorithm
- Formant curve rendering style (line thickness, opacity, whether curves extend beyond visible piano range)
- Whether voice-type overlay switch is a toggle, dropdown, or chip group

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — VOWEL-01 through VOWEL-05, PIANO-01 through PIANO-05, RANGE-01 through RANGE-03, LINK-01, LINK-03 define acceptance criteria

### Technology Stack
- `CLAUDE.md` §Technology Stack — SVG for F1/F2 chart and piano (both <200 elements), d3-scale for Hz/log mapping, svelte-gestures for drag

### Prior Phase Context
- `.planning/phases/01-audio-closed-loop/01-CONTEXT.md` — D-08 parallel formant topology, D-07 F1-F4 all active
- `.planning/phases/02-voice-controls-expression/02-CONTEXT.md` — D-01 pitch slider, VoiceParams store structure
- `src/lib/audio/state.svelte.ts` — VoiceParams class with all reactive fields
- `src/lib/audio/bridge.ts` — AudioBridge.syncParams() forwards all params
- `src/lib/audio/dsp/pitch-utils.ts` — hzToNote, midiToHz, formatPitchReadout utilities
- `src/lib/data/voice-presets.ts` — Voice type preset data (male/female/child formant ranges)

### Vowel Data Source
- Hillenbrand et al. (1995) dataset: http://homepages.wmich.edu/~hillenbr/voweldata.html — F1/F2/F3 centroids and standard deviations for 12 vowels, 3 speaker groups

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/audio/state.svelte.ts` — VoiceParams with f1Freq/f2Freq/f3Freq/f4Freq already reactive. F1/F2 chart writes directly to these
- `src/lib/audio/dsp/pitch-utils.ts` — midiToHz, hzToNote for piano harmonics positioning
- `src/lib/audio/dsp/formant-utils.ts` — bandwidthToQ for computing analytic formant filter response
- `src/lib/components/PianoKeyboard.svelte` — Existing 2-octave SVG piano from Phase 2. Needs extending to 5 octaves and adding harmonic bars
- `src/lib/data/voice-presets.ts` — Has formant data per voice type that can seed the per-voice range overlays
- `src/lib/components/ChipGroup.svelte` — Reusable if needed for voice-type overlay selector

### Established Patterns
- SVG for interactive elements (PianoKeyboard already uses SVG)
- `$derived` for computed values from voiceParams (used in PitchSection)
- `$effect` in App.svelte triggers bridge.syncParams() on any voiceParams change
- Pointer events with capture for drag (PianoKeyboard pattern)

### Integration Points
- F1/F2 chart drag writes to `voiceParams.f1Freq` and `voiceParams.f2Freq` — existing `$effect` in App.svelte automatically syncs to audio
- Piano harmonics are computed from `voiceParams.f0` and formant filter response — pure derived state
- Voice-type range overlays use data from `voice-presets.ts`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches within the decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-linked-visualizations-piano-f1-f2*
*Context gathered: 2026-04-12*
