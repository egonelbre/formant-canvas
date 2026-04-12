---
phase: 03-linked-visualizations-piano-f1-f2
plan: 02
subsystem: visualization, interaction
tags: [vowel-chart, f1-f2, hillenbrand, drag-to-tune, d3-scale, svg]

# Dependency graph
requires:
  - phase: 03-linked-visualizations-piano-f1-f2
    plan: 01
    provides: HILLENBRAND_VOWELS dataset, getActiveVowelRegion, SpeakerGroup type
provides:
  - "VowelChart.svelte: complete F1/F2 chart with axes, ellipses, drag handle, presets, overlays"
  - "VowelChartOverlay.svelte: per-voice-type formant range convex hull polygon"
affects: [03-04-integration]

# Tech tracking
tech-stack:
  added: [d3-scale@4.0.2, "@types/d3-scale@4.0.9"]
  patterns: [pointer-capture drag on SVG, d3-scale log scales for Hz-to-pixel mapping]

key-files:
  created:
    - src/lib/components/VowelChart.svelte
    - src/lib/components/VowelChartOverlay.svelte
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Installed d3-scale as cherry-picked dependency for log scale Hz-to-pixel mapping"
  - "Used pointer-capture drag pattern consistent with existing PianoKeyboard (not svelte-gestures)"
  - "VowelChartOverlay uses Graham scan convex hull for 12 points (no library needed)"

patterns-established:
  - "d3-scale log scale for scientific axes with .invert() for pointer-to-value conversion"
  - "SVG chart with margins pattern: viewBox + transform translate for plot area"

requirements-completed: [VOWEL-01, VOWEL-02, VOWEL-03, VOWEL-04, VOWEL-05, RANGE-01, RANGE-02, RANGE-03]

# Metrics
duration: 2min
completed: 2026-04-12
---

# Phase 3 Plan 02: F1/F2 Vowel Chart Summary

**F1/F2 vowel chart with log-scale axes, 12 Hillenbrand ellipses, pointer-capture drag handle, clickable IPA presets, voice-type convex hull overlays, and active region highlighting using d3-scale**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-12T12:19:42Z
- **Completed:** 2026-04-12T12:21:34Z
- **Tasks:** 2
- **Files created:** 2
- **Files modified:** 2

## Accomplishments
- VowelChart.svelte (292 lines): complete F1/F2 diagram with Cartesian orientation (F1 up, F2 right), log-scale axes via d3-scale, grid lines, axis labels and titles
- 12 Hillenbrand ellipses rendered at speaker-group centroids with IPA labels and invisible click targets for vowel preset selection
- Pointer-capture drag handle at current voiceParams.f1Freq/f2Freq position, writes directly to voiceParams on drag
- Active vowel region detection and highlighting via getActiveVowelRegion
- VowelChartOverlay.svelte (81 lines): convex hull polygon of all 12 vowel centroids for a given speaker group, with group-specific colors and dashed stroke
- Voice-type overlay selector using ChipGroup (None/Male/Female/Child)
- Citation "Data: Hillenbrand et al. (1995)" positioned below the chart
- Accessibility: role="img", role="slider" on drag handle, role="button" on vowel click targets

## Task Commits

Each task was committed atomically:

1. **Task 1: VowelChart SVG with axes, Hillenbrand ellipses, and citation** - `104f227` (feat)
2. **Task 2: VowelChartOverlay component** - included in `104f227` (VowelChart imports VowelChartOverlay; both created together to pass svelte-check)

## Files Created/Modified
- `src/lib/components/VowelChart.svelte` - Full F1/F2 chart: axes, ellipses, drag handle, presets, overlays, citation
- `src/lib/components/VowelChartOverlay.svelte` - Convex hull polygon for per-voice-type formant ranges
- `package.json` - Added d3-scale dependency
- `package-lock.json` - Updated lockfile

## Decisions Made
- Installed d3-scale (4.0.2) and @types/d3-scale (4.0.9) as the only new dependencies for this plan
- Used pointer-capture drag pattern from existing PianoKeyboard rather than adding svelte-gestures
- Implemented Graham scan convex hull inline (12 points is trivial, no library needed)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Tasks 1 and 2 merged into single commit**
- **Found during:** Task 1
- **Issue:** VowelChart.svelte imports VowelChartOverlay.svelte; svelte-check would fail without both files present
- **Fix:** Created both components in Task 1 commit
- **Files modified:** VowelChart.svelte, VowelChartOverlay.svelte
- **Commit:** 104f227

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness
- VowelChart.svelte ready for integration in Plan 04 layout
- All reactive wiring via voiceParams -- drag updates will automatically trigger audio and piano visualization updates when integrated

## Self-Check: PASSED

- [x] src/lib/components/VowelChart.svelte exists (292 lines, >150 min)
- [x] src/lib/components/VowelChartOverlay.svelte exists (81 lines, >20 min)
- [x] Task commit 104f227 found in git log
- [x] svelte-check: 0 errors
- [x] vitest: 116/116 tests passing

---
*Phase: 03-linked-visualizations-piano-f1-f2*
*Completed: 2026-04-12*
