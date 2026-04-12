# Phase 5: Pedagogy UI & Polish - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

The app becomes usable by a first-time voice student, not just by its developer. Full-screen no-scroll layout with piano keyboard at the bottom, Sundberg-style R1/R2 strategy charts and vowel chart on the right, formant harmonics above the keyboard, and controls (voice, vibrato, phonation, strategy) on the left. Progressive disclosure via expert mode toggle, rich tooltips with pedagogical examples, 44px touch targets, and Pointer Events throughout. New R1/R2 strategy visualization charts are included as they are central to the pedagogy goal.

</domain>

<decisions>
## Implementation Decisions

### Layout Architecture
- **D-01:** Full-screen, no-scroll layout filling the viewport. Works on desktop and tablet. No vertical scrolling in normal use
- **D-02:** Piano keyboard spans the full width at the bottom of the screen — primary interaction surface
- **D-03:** Three panels stacked vertically on the right sharing a vertical frequency axis: C (vowel chart, top), B (R2 strategy chart, middle), A (R1 strategy chart, bottom)
- **D-04:** Formant harmonics graphic (existing PianoHarmonics) sits above the keyboard on the left side
- **D-05:** Voice type selection (Soprano, Mezzo, Alto, ..., Child) as a chip row along the top border
- **D-06:** Vibrato controls below voice selection, with a waveform visual
- **D-07:** Phonation panel (breathy/modal/flow/pressed) and Strategy panel (overlay/locked/auto, R1/R2 selector) as separate panels on the left, between vibrato and formant harmonics
- **D-08:** Main interaction surfaces (keyboard, panels A/B/C) are the largest and easiest to reach

### R1/R2 Strategy Charts (Panels A & B)
- **D-09:** New Sundberg-style visualizations: resonance frequency (Hz) on Y-axis vs pitch (musical notes) on X-axis, with diagonal lines showing harmonic relationships (R1:f0, R1:2f0, R1:3f0 for panel A; R2:f0, R2:2f0, R2:3f0 for panel B)
- **D-10:** Shaded regions show the R1/R2 frequency ranges for the selected voice type
- **D-11:** Voice range indicated on X-axis (like the Soprano range bracket in the reference image)
- **D-12:** Current f0 shown as a vertical cursor line on both charts
- **D-13:** Independent pitch axes on A/B — not necessarily aligned with the keyboard range below

### Progressive Disclosure
- **D-14:** Single "Expert mode" toggle switch in the transport bar / header area. OFF by default
- **D-15:** Default view shows 7 primary controls: Play/Stop, Volume, Pitch slider, Voice preset, Phonation preset, Vowel chart (drag), Strategy selector
- **D-16:** Expert mode reveals advanced parameters inline within their existing sections — OQ/spectral tilt/aspiration sliders appear inside Phonation section, individual F1-F4 bandwidth sliders near the vowel chart
- **D-17:** Expert mode also shows numeric Hz/dB readouts next to every slider and formant parameter — researcher-grade detail

### Tooltips & Help
- **D-18:** Rich tooltips with plain-language explanation plus concrete pedagogical examples (e.g., "Controls the fundamental frequency. Try 120 Hz for a male voice or 220 Hz for female.")
- **D-19:** Tooltips triggered via a `?` icon button next to each control — tap/click to show. Desktop also supports hover as convenience, but no reliance on hover-only states (tablets don't support hover well)
- **D-20:** No jargon in default view tooltips. Technical terms (Rd, OQ, spectral tilt) appear only in expert mode tooltips

### Touch & Pointer Support
- **D-21:** 44px minimum touch target for all interactive elements (buttons, sliders, drag handles, piano keys, chart controls) — Apple HIG standard
- **D-22:** All draggable elements use Pointer Events with `touch-action: none` (UI-06)
- **D-23:** Piano keyboard supports multi-touch with last-note priority — multiple fingers can land on keys with visual feedback on all touched keys, but the last-touched note sets f0 (monophonic architecture)

### Claude's Discretion
- Exact CSS grid/flexbox implementation for the full-screen layout
- Strategy chart visual style (line weights, colors, shading opacity)
- How the R1/R2 chart current-f0 cursor updates (live vs debounced)
- Tooltip component implementation (custom vs library)
- Tooltip positioning logic (above/below/auto)
- Vibrato waveform visual implementation
- Expert toggle exact placement and styling
- Formant bandwidth slider range and default values
- Numeric readout formatting (decimal places, units)
- Dark theme refinements and color adjustments for new components
- Responsive breakpoint behavior for smaller screens

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` -- UI-01 through UI-06 define acceptance criteria for this phase

### Technology Stack
- `CLAUDE.md` §Technology Stack -- SVG for visualizations, d3-scale for Hz/pitch mapping, svelte-gestures for drag, Pointer Events guidance

### Prior Phase Context
- `.planning/phases/01-audio-closed-loop/01-CONTEXT.md` -- D-07/D-08 parallel formant topology, VoiceParams store architecture
- `.planning/phases/02-voice-controls-expression/02-CONTEXT.md` -- D-11 individual OQ/tilt sliders deferred to expert mode, D-16 section grouping
- `.planning/phases/03-linked-visualizations-piano-f1-f2/03-CONTEXT.md` -- D-01 Cartesian F1/F2 orientation, D-04 C2-B6 piano range, D-12 drag handle style
- `.planning/phases/04-vocal-strategies/04-CONTEXT.md` -- D-01 sidebar strategy panel, D-04 global mode toggle, D-05 combined preset matrix, strategy engine architecture

### Source Code
- `src/App.svelte` -- Current layout (single-column stacked), all component wiring, $effect chains
- `src/app.css` -- Existing CSS design tokens (colors, spacing, radius), dark theme base
- `src/lib/components/PianoHarmonics.svelte` -- Formant harmonics graphic to be repositioned in new layout
- `src/lib/components/VowelChart.svelte` -- Vowel chart (panel C) to be repositioned
- `src/lib/components/StrategyPanel.svelte` -- Current strategy selector UI, will be reorganized
- `src/lib/strategies/engine.ts` -- computeTargets for strategy line data on new charts
- `src/lib/audio/state.svelte.ts` -- VoiceParams class, single source of truth

### Reference Material
- Sundberg (1987) "The Science of the Singing Voice" -- canonical source for R1/R2 strategy chart style (resonance frequency vs pitch with harmonic diagonal lines)
- User-provided layout sketch (format-canvas layout.png) -- definitive layout reference

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `VoiceParams` in `state.svelte.ts` -- all reactive fields needed for strategy charts (f0, formant freqs, strategy state, voice preset)
- `PianoHarmonics.svelte` -- existing SVG formant curves + harmonic bars, repositioned in new layout
- `VowelChart.svelte` -- existing F1/F2 chart with drag handle, becomes panel C
- `StrategyPanel.svelte` -- strategy selector UI, reorganized into its own panel area
- `strategies/engine.ts` -- `computeTargets()` provides strategy target frequencies for chart overlay data
- `strategies/definitions.ts` -- strategy ratio definitions for drawing diagonal lines on A/B charts
- `voice-presets.ts` -- voice type formant ranges for shaded regions on A/B charts
- `ChipGroup.svelte` -- reusable for voice type top bar
- `LabeledSlider.svelte` -- reusable for expert mode sliders
- `d3-scale` -- already a dependency, used for Hz/log/semitone scales
- CSS design tokens in `app.css` -- dark theme colors, spacing, radius already established

### Established Patterns
- SVG for all interactive visualizations
- `$derived` for computed values from voiceParams
- `$effect` in App.svelte triggers bridge.syncParams() on any change
- Pointer events with capture for drag interactions
- `setTargetAtTime` for smooth audio parameter changes
- ChipGroup pattern for preset selection

### Integration Points
- New R1/R2 strategy charts read from voiceParams (f0, strategy state, voice preset) as $derived
- Layout restructure rewrites App.svelte template from single-column to CSS grid
- Expert mode toggle adds a boolean to app state (could be in voiceParams or separate UI state)
- Tooltip component wraps existing controls with `?` icon + popover
- Touch target sizing requires reviewing all existing component dimensions

</code_context>

<specifics>
## Specific Ideas

- Layout follows user's hand-drawn sketch: keyboard at bottom, A/B/C panels stacked on right, controls on left, voice selection across top
- R1/R2 strategy charts should look like the Sundberg reference (Image #2): resonance frequency vs pitch with diagonal harmonic lines, shaded formant range regions, voice range brackets
- The three right panels (A, B, C) share a vertical frequency axis for visual coherence
- `?` icon for tooltips was specifically requested to solve the tablet hover problem
- Multi-touch piano with last-note priority: visual feedback on all touched keys but only last touch sounds (monophonic)

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 05-pedagogy-ui-polish*
*Context gathered: 2026-04-12*
