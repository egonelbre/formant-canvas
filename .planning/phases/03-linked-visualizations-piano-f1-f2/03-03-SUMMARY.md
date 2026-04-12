---
phase: 03-linked-visualizations-piano-f1-f2
plan: 03
subsystem: visualization, piano
tags: [piano, harmonics, formant-curves, click-to-tune, SVG]

# Dependency graph
requires:
  - phase: 03-linked-visualizations-piano-f1-f2
    plan: 01
    provides: formantMagnitude, spectralEnvelope, FormantParams type
provides:
  - "PianoHarmonics 5-octave SVG piano with harmonic amplitude bars"
  - "FormantCurves F1-F4 response curves and center frequency markers"
  - "HarmonicBars harmonic amplitude visualization using spectralEnvelope"
  - "Click-to-tune interaction setting voiceParams.f0"
  - "freqToX frequency-to-pixel mapping for piano range"
affects: [03-04-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [freqToX via MIDI-float interpolation, pointer-capture click-to-tune on SVG piano]

key-files:
  created:
    - src/lib/components/PianoHarmonics.svelte
    - src/lib/components/HarmonicBars.svelte
    - src/lib/components/FormantCurves.svelte
  modified: []

key-decisions:
  - "PianoHarmonics is a standalone component (not reusing PianoKeyboard.svelte) because harmonic bars above keys require fundamentally different SVG layout"
  - "freqToX maps Hz to SVG x via MIDI-float linear interpolation between precomputed key center positions"
  - "Harmonic bars normalized per-frame against max amplitude for consistent visual scaling"

patterns-established:
  - "freqToX frequency-to-pixel mapping pattern for piano range visualization"
  - "Child SVG group components (HarmonicBars, FormantCurves) receiving freqToX as prop"

requirements-completed: [PIANO-01, PIANO-02, PIANO-03, PIANO-04, PIANO-05]

# Metrics
duration: 2min
completed: 2026-04-12
---

# Phase 3 Plan 03: Piano Harmonics Summary

**5-octave piano SVG (C2-B6) with live harmonic amplitude bars, F1-F4 formant response curves with center markers, and pointer-capture click-to-tune interaction**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-12T12:19:47Z
- **Completed:** 2026-04-12T12:21:52Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments
- PianoHarmonics.svelte: 5-octave piano (35 white + 25 black keys) with MIDI 36-83 range, f0 highlighting, C2-C5 labels, and freqToX mapping
- HarmonicBars.svelte: computes up to 24 harmonics (breaks at B6), normalizes amplitudes via spectralEnvelope, renders as 4px bars with fundamental in accent color
- FormantCurves.svelte: 200-sample continuous curves for F1-F4 in distinct colors (orange/green/blue/purple), dashed center frequency markers with labels
- Click-to-tune via pointer-capture drag pattern sets voiceParams.f0 on any piano key interaction

## Task Commits

Each task was committed atomically:

1. **Task 1: PianoHarmonics component with 5-octave keyboard and click-to-tune** - `48346b0` (feat)
2. **Task 2: HarmonicBars and FormantCurves child components** - `6254dbd` (feat)

## Files Created/Modified
- `src/lib/components/PianoHarmonics.svelte` - 254 lines: 5-octave SVG piano, freqToX mapping, pointer-capture click-to-tune, child component integration
- `src/lib/components/HarmonicBars.svelte` - 64 lines: harmonic amplitude bars with spectralEnvelope computation
- `src/lib/components/FormantCurves.svelte` - 131 lines: F1-F4 response curves, center frequency dashed markers with labels

## Decisions Made
- PianoHarmonics is standalone (does not extend PianoKeyboard.svelte) -- the harmonic bar region above keys requires a fundamentally different SVG structure
- freqToX maps via MIDI-float with linear interpolation between precomputed key center positions for accurate sub-semitone placement
- Harmonic bar heights are normalized per-render against the current maximum amplitude, ensuring consistent visual fill regardless of formant configuration

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness
- PianoHarmonics ready for integration in Plan 04 layout
- freqToX pattern available for any future frequency-domain overlays on piano

## Self-Check: PASSED

- All 3 created files exist on disk
- Both task commits (48346b0, 6254dbd) found in git log
- svelte-check: 0 errors, 0 warnings
- vitest: 116/116 tests passing

---
*Phase: 03-linked-visualizations-piano-f1-f2*
*Completed: 2026-04-12*
