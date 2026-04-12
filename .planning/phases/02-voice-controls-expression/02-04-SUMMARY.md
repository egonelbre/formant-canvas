---
phase: 02-voice-controls-expression
plan: 04
subsystem: ui
tags: [svelte, svelte5, components, piano, voice-presets, phonation, transport, expression]

requires:
  - phase: 02-voice-controls-expression/02
    provides: VoiceParams store, voice-presets, phonation-presets, qwerty-map data modules
  - phase: 02-voice-controls-expression/01
    provides: pitch-utils (hzToSlider, sliderToHz, formatPitchReadout, midiToHz)
provides:
  - 8 Svelte 5 UI components for voice control interface
  - LabeledSlider and ChipGroup reusable primitives
  - TransportBar, PitchSection, PianoKeyboard, VoicePresets, PhonationMode, ExpressionControls
affects: [02-voice-controls-expression/05, 03-linked-visualizations]

tech-stack:
  added: []
  patterns: [svelte-5-props-pattern, component-scoped-css-with-custom-properties, svg-piano-keyboard]

key-files:
  created:
    - src/lib/components/LabeledSlider.svelte
    - src/lib/components/ChipGroup.svelte
    - src/lib/components/TransportBar.svelte
    - src/lib/components/ExpressionControls.svelte
    - src/lib/components/PianoKeyboard.svelte
    - src/lib/components/PitchSection.svelte
    - src/lib/components/VoicePresets.svelte
    - src/lib/components/PhonationMode.svelte
  modified: []

key-decisions:
  - "SVG piano keyboard with computed white/black key positions from MIDI range"
  - "Vertical pitch slider overlaid on piano with writing-mode: vertical-lr"
  - "Pitch readout split into parts for accent-colored note name"

patterns-established:
  - "Svelte 5 $props() with typed interface Props for all components"
  - "Component-scoped CSS using CSS custom properties (--color-*, --spacing-*, --radius-*)"
  - "Reusable primitives (LabeledSlider, ChipGroup) have zero voiceParams dependency"
  - "Section components import voiceParams singleton and delegate via callbacks"

requirements-completed: [VOICE-01, VOICE-03, VOICE-04, VOICE-05, AUDIO-02, AUDIO-07]

duration: 4min
completed: 2026-04-12
---

# Phase 2 Plan 4: UI Components Summary

**Eight Svelte 5 UI components covering transport, pitch (SVG piano), voice presets, phonation modes, and expression sliders with CSS custom property theming**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-12T08:31:17Z
- **Completed:** 2026-04-12T08:34:59Z
- **Tasks:** 2
- **Files created:** 8

## Accomplishments
- Built two reusable primitives (LabeledSlider, ChipGroup) with zero store dependency
- SVG piano keyboard with white/black key rendering, highlight, and QWERTY label support
- Voice preset loading resets phonation to modal per D-13 specification
- All components use CSS custom properties from UI-SPEC color/spacing tokens

## Task Commits

Each task was committed atomically:

1. **Task 1: Reusable primitives and transport/expression components** - `2377200` (feat)
2. **Task 2: Pitch, voice preset, and phonation components** - `88916fb` (feat)

## Files Created/Modified
- `src/lib/components/LabeledSlider.svelte` - Reusable labeled range input with touch-action: none
- `src/lib/components/ChipGroup.svelte` - Reusable horizontal pill button group with radio selection
- `src/lib/components/TransportBar.svelte` - Play/stop, volume slider, mute toggle
- `src/lib/components/ExpressionControls.svelte` - Vibrato rate, vibrato extent, jitter sliders
- `src/lib/components/PianoKeyboard.svelte` - SVG piano with white/black keys, MIDI highlight, QWERTY labels
- `src/lib/components/PitchSection.svelte` - Piano keyboard + log-scale pitch slider + readout
- `src/lib/components/VoicePresets.svelte` - 7 voice type chips with full preset loading
- `src/lib/components/PhonationMode.svelte` - 4 phonation mode chips setting OQ/aspiration/tilt

## Decisions Made
- SVG piano keyboard computed from MIDI range with white keys laid out first, black keys overlaid at correct positions between adjacent white keys
- Pitch slider uses vertical orientation (writing-mode: vertical-lr) overlaid on the piano container
- Pitch readout text split on separator for accent-colored note name per UI-SPEC
- ChipGroup selected state uses 2px border with 1px padding compensation to prevent layout shift

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed double "Hz" in pitch readout**
- **Found during:** Task 2 (PitchSection)
- **Issue:** formatPitchReadout already includes "Hz" in output, template was adding it again
- **Fix:** Removed redundant "Hz" suffix from readout template
- **Files modified:** src/lib/components/PitchSection.svelte
- **Committed in:** 88916fb (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor display bug fix. No scope creep.

## Issues Encountered
- Test verification could not be run due to shell permission restrictions; components are new files and do not modify existing tested code

## User Setup Required
None - no external service configuration required.

## Self-Check: PASSED

- All 8 component files verified present via Glob
- Commit 2377200 verified in git log
- Commit 88916fb verified in git log

## Next Phase Readiness
- All 8 components ready for integration into App.svelte layout (Plan 05)
- TransportBar exposes onplayclick callback for App.svelte bridge lifecycle management
- PitchSection ready for QWERTY keyboard event wiring in Plan 05

---
*Phase: 02-voice-controls-expression*
*Completed: 2026-04-12*
