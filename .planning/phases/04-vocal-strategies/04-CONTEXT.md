# Phase 4: Vocal Strategies - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Vocal strategies are layered on top of the existing linked substrate as a pure-function strategy engine with both overlay mode (visual targets only, no audio change) and locked/auto-tune mode (formants track f0 as a live rule), with applicable-range handling so strategies never drive formants to physically impossible values. Separate R1 and R2 strategy selection, plus an auto-strategy mode that picks the best strategy for the current voice/pitch/vowel context.

</domain>

<decisions>
## Implementation Decisions

### Strategy Selector UI
- **D-01:** Sidebar panel for strategy selection — dedicated panel alongside visualizations, always visible, with room for descriptions. Consistent with VoicePresets and PhonationMode placement
- **D-02:** Notation + short phrase labels — e.g., "R1:f0 -- First formant tracks pitch". Compact, fits the sidebar layout
- **D-03:** "Speech (untuned)" is the default strategy — app always has an active strategy. Speech = formants are free (current behavior). Makes the selector feel like a mode switch
- **D-04:** Global mode toggle: Overlay / Locked / Off — applies to whichever strategy is selected. One switch, simpler mental model
- **D-05:** Combined preset matrix for R1/R2 strategy selection — a grid showing known-good R1/R2 combinations (e.g., "R1:2f0 + R2:3f0"). Curated combinations rather than two independent lists
- **D-06:** "Auto strategy" option in the selector — automatically picks the most appropriate strategy based on current voice type, pitch, and vowel. Smart preset that selects from existing strategies

### Overlay Visualization
- **D-07:** Vertical target lines on the piano view — thin vertical lines at the frequency where each formant should be, drawn over the harmonic bars
- **D-08:** Target marker with connecting line on the F1/F2 chart — target marker (open circle or crosshair) at target F1/F2 position, plus a dashed line from current position to target showing direction and distance
- **D-09:** Real-time overlay tracking — target lines/dots move continuously as f0 changes, showing the relationship dynamically. Core Value: linked exploration
- **D-10:** Single overlay color for all strategies — one consistent color (e.g., orange or cyan), distinct from the existing formant curve colors

### Locked Mode Behavior
- **D-11:** Smooth interpolation for formant tracking — formant glides to the new target over ~50-100ms using setTargetAtTime. More natural, matches real singing
- **D-12:** Clamp with visual warning at range boundaries — formant stops at the physically reasonable range boundary. Overlay/target marker turns red or shows a warning icon. Strategy stays locked but ratio isn't maintained beyond the boundary
- **D-13:** Singer's-formant cluster affects F3+F4+F5 — requires adding F5 to VoiceParams (f5Freq, f5BW, f5Gain). F5 enables proper singer's formant cluster acoustics

### Drag Conflict Resolution
- **D-14:** Drag overrides strategy temporarily — dragging a locked formant works but the strategy re-locks on release. Lets users explore "what if I moved F1 here?" without permanently unlocking
- **D-15:** Pulsing or dashed connecting line during temporary override — the line between current and target position pulses or becomes dashed, showing the strategy is still active and will pull back on release

### Claude's Discretion
- Exact overlay color choice (within the single-color constraint)
- Target line thickness, opacity, and label positioning on piano
- Connecting line dash pattern and animation timing
- Auto-strategy heuristic: which combinations of voice/pitch/vowel map to which strategies
- Preset matrix layout: exact grid dimensions and which R1/R2 combinations to include
- F5 default frequency and bandwidth values
- Sidebar panel internal layout and section ordering
- Warning icon/animation style for out-of-range indication
- Smooth interpolation time constant (within ~50-100ms range)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` -- STRAT-01 through STRAT-05 define acceptance criteria for this phase

### Technology Stack
- `CLAUDE.md` §Technology Stack -- SVG for visualizations, d3-scale for Hz mapping, svelte-gestures for drag, BiquadFilterNode for formant filters

### Prior Phase Context
- `.planning/phases/01-audio-closed-loop/01-CONTEXT.md` -- D-07 all four formants active, D-08 parallel filter topology
- `.planning/phases/02-voice-controls-expression/02-CONTEXT.md` -- VoiceParams store structure, pitch control
- `.planning/phases/03-linked-visualizations-piano-f1-f2/03-CONTEXT.md` -- F1/F2 chart orientation (D-01 Cartesian), piano range (D-04 C2-B6), drag handle (D-12), formant curves on piano (D-07), Hillenbrand data (D-16)

### Source Code
- `src/lib/audio/state.svelte.ts` -- VoiceParams class, single source of truth. Must be extended with F5 and strategy state
- `src/lib/audio/bridge.ts` -- AudioBridge.syncParams() forwards all params to Web Audio nodes
- `src/lib/components/PianoHarmonics.svelte` -- Piano SVG with harmonic bars and formant curves. Strategy target lines overlay here
- `src/lib/components/VowelChart.svelte` -- F1/F2 chart with drag handle. Strategy target marker + connecting line overlay here
- `src/lib/components/VowelChartOverlay.svelte` -- Existing overlay component for Hillenbrand ellipses
- `src/lib/data/voice-presets.ts` -- Voice type formant data, needed for auto-strategy heuristics

### Vocal Strategy References
- Sundberg (1987) "The Science of the Singing Voice" -- canonical source for R1:f0, R1:2f0, singer's formant cluster definitions and applicable ranges
- Titze (2008) "Nonlinear source-filter coupling in phonation" -- formant-harmonic interaction theory

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `VoiceParams` class in `state.svelte.ts` -- needs F5 fields and strategy state fields added. Reactive `$state` runes pattern is established
- `PianoHarmonics.svelte` -- SVG piano with formant curves overlay. Strategy target lines are additional SVG elements in the same coordinate space
- `VowelChart.svelte` -- F1/F2 chart with drag handle. Strategy target + connecting line are additional SVG elements
- `VowelChartOverlay.svelte` -- existing overlay pattern to follow for new strategy overlays
- `ChipGroup.svelte` -- reusable component, could be used within the strategy sidebar panel
- `voice-presets.ts` -- voice type data for auto-strategy heuristics
- `formant-utils.ts` -- bandwidthToQ for computing filter response at target frequencies

### Established Patterns
- SVG for all interactive visualizations (piano + F1/F2 chart)
- `$derived` for computed values from voiceParams
- `$effect` in App.svelte triggers bridge.syncParams() on any voiceParams change -- strategy formant overrides flow through this same path
- Parallel BiquadFilterNode topology -- adding F5 means one more parallel filter node
- setTargetAtTime for smooth parameter changes -- already established, used for locked mode tracking

### Integration Points
- Strategy engine computes target formant frequencies as pure function of (strategy, f0, voice type) -- results write to voiceParams.f1Freq etc. in locked mode
- In overlay mode, strategy engine provides target positions but does NOT write to voiceParams -- overlay components read targets directly
- New F5 BiquadFilterNode added to the parallel filter chain in AudioBridge
- Strategy sidebar panel added to App.svelte layout alongside existing control panels

</code_context>

<specifics>
## Specific Ideas

- Combined preset matrix should show the most common singing strategies used in voice pedagogy: speech (untuned), R1:f0, R1:2f0, R1:3f0, R2:2f0, R2:3f0, and singer's-formant cluster
- Auto-strategy should feel like a "smart default" -- it picks a known-good strategy for the current context so beginners don't have to know which strategy to use
- The temporary drag override (D-14) should feel like "stretching a rubber band" -- you can pull the formant away but it snaps back when you let go

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 04-vocal-strategies*
*Context gathered: 2026-04-12*
