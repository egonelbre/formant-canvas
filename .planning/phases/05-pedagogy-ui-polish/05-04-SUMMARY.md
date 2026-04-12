---
phase: 05-pedagogy-ui-polish
plan: 04
subsystem: ui
tags: [svelte, multi-touch, pointer-events, touch-targets, piano-keyboard, layout, theme]

requires:
  - phase: 05-pedagogy-ui-polish
    plan: 03
    provides: Full CSS grid layout with expert mode and tooltips
provides:
  - Multi-touch piano keyboard with Map<pointerId, midi> tracking
  - Black & white projection-optimized theme
  - Responsive grid layout with panels/charts/piano
  - Per-region floating help buttons
  - Logarithmic strategy chart scales
  - Subscript f₀ notation throughout
affects: []

tech-stack:
  added: []
  patterns: [multi-touch-pointer-tracking, responsive-svg-charts, region-help]

key-files:
  created:
    - src/lib/components/RegionHelp.svelte
  modified:
    - src/App.svelte
    - src/app.css
    - src/lib/components/PianoKeyboard.svelte
    - src/lib/components/PianoHarmonics.svelte
    - src/lib/components/VowelChart.svelte
    - src/lib/components/TransportBar.svelte
    - src/lib/components/PitchSection.svelte
    - src/lib/components/PhonationMode.svelte
    - src/lib/components/VoicePresets.svelte
    - src/lib/components/StrategyPanel.svelte
    - src/lib/components/ChipGroup.svelte
    - src/lib/components/HarmonicBars.svelte
    - src/lib/components/FormantCurves.svelte
    - src/lib/charts/R1StrategyChart.svelte
    - src/lib/charts/R2StrategyChart.svelte
    - src/lib/charts/strategy-chart-math.ts
    - src/lib/strategies/definitions.ts
    - src/lib/audio/state.svelte.ts

key-decisions:
  - "Black & white theme for projector readability"
  - "Grid layout: panels left, vowel+R2+R1 stacked right, piano full-width bottom"
  - "Single floating ? per region replaces per-control tooltips"
  - "Logarithmic scales on strategy charts for intuitive musical spacing"
  - "Auto strategy mode behaves as locked with auto-picked R1/R2"
  - "Default voice preset: mezzo at 220 Hz"
  - "R1/R2 labels used consistently instead of F1/F2"

patterns-established:
  - "RegionHelp: viewport-aware floating help with JS positioning"
  - "Responsive SVG charts: bind:clientWidth/Height for container measurement"

requirements-completed: [UI-01, UI-02, UI-03, UI-04, UI-05, UI-06]

duration: 45min
completed: 2026-04-12
---

# Phase 05 Plan 04: Multi-touch, Layout, Theme & Human Verification

**Multi-touch piano, B&W projection theme, responsive grid layout, floating help, log-scale charts, and human-verified UI**

## Status

COMPLETE — Human verification passed after iterative UI feedback.

## Performance

- **Duration:** ~45 min (including iterative human feedback)
- **Tasks:** 2/2 complete
- **Files modified:** 19

## Accomplishments

### Multi-touch & Touch Targets
- Multi-touch piano keyboard with Map<pointerId, midiNote> tracking, 10-pointer cap
- 44px min-height touch targets on ChipGroup chips

### Theme & Layout (from human verification feedback)
- Black & white theme optimized for classroom projection
- Grid layout: header | panels+piano left | vowel+R2+R1 right
- Piano keys compact (48px), harmonics region enlarged (140px)
- Controls in horizontal panel strip: pitch/vibrato, phonation, strategy
- Strategy/R1/R2 merged into single panel column

### Charts & Diagrams
- R1/R2 strategy charts: responsive (measure container), logarithmic scales
- Vowel chart: fills container, inside axis labels, no overlay, combined corner label
- R1 at bottom, R2 in middle, heights proportional to octave span
- Diagonal labels at 75% along line, 13px bold for readability
- Subscript f₀ notation throughout all labels

### Help & UX
- RegionHelp component: floating ? per region with viewport-aware JS positioning
- Help buttons on: pitch, formants, phonation, strategy, vowel chart, R1, R2
- Formant BW sliders moved to pitch panel (expert mode)
- Default voice preset: mezzo at 220 Hz

## Task Commits

1. **Task 1: Multi-touch piano + touch targets** — `621ad2f`
2. **Task 2: Human verification** — multiple iterative commits addressing feedback

## Self-Check: PASSED
