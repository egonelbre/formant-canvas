---
phase: 05-pedagogy-ui-polish
plan: 01
subsystem: ui
tags: [svelte, tooltip, d3-scale, strategy-chart, vibrato, svg]

requires:
  - phase: 04-vocal-strategies
    provides: Strategy definitions (R1/R2) and singer formant centers
provides:
  - TOOLTIPS data record with plain-language text for 7 primary controls
  - Reusable Tooltip component with ? icon, click/hover toggle, expert mode
  - VibratoVisual SVG waveform preview component
  - Strategy chart math utilities (scales, diagonal lines, note names)
affects: [05-03-layout-integration]

tech-stack:
  added: []
  patterns: [tooltip-data-module, pure-chart-math-utilities]

key-files:
  created:
    - src/lib/data/tooltips.ts
    - src/lib/data/tooltips.test.ts
    - src/lib/charts/strategy-chart-math.ts
    - src/lib/charts/strategy-chart-math.test.ts
    - src/lib/components/Tooltip.svelte
    - src/lib/components/VibratoVisual.svelte
  modified: []

key-decisions:
  - "Tooltip uses click toggle + hover convenience, with document-level coordination for only-one-open"
  - "Strategy chart math uses d3 scaleLinear (not scaleLog) per Sundberg reference chart conventions"
  - "pitchToNoteName reuses same 12-TET formula as pitch-utils.ts but in a standalone function for chart context"

patterns-established:
  - "Tooltip data module: static Record<string, {text, expert?}> for all control help text"
  - "Chart math pattern: pure functions returning d3 scales and coordinate geometry, tested separately from SVG rendering"

requirements-completed: [UI-02, UI-04]

duration: 3min
completed: 2026-04-12
---

# Phase 05 Plan 01: Building Blocks Summary

**Tooltip data module, Tooltip/VibratoVisual components, and strategy chart math utilities with 16 new tests**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-12T15:43:12Z
- **Completed:** 2026-04-12T15:45:43Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- TOOLTIPS record with plain-language text for all 7 primary controls plus expert extensions for 6 of them
- Strategy chart math: computeDiagonalLine, createPitchScale, createFreqScale, pitchToNoteName, generateAxisTicks
- Tooltip component with ? icon trigger, 44px touch target, click/hover toggle, click-outside dismiss, only-one-open coordination
- VibratoVisual component rendering sine waveform SVG with rate/extent labels

## Task Commits

Each task was committed atomically:

1. **Task 1: Tooltip data module + strategy chart math with tests** - `d5d2fa4` (feat)
2. **Task 2: Tooltip component + VibratoVisual component** - `c756792` (feat)

## Files Created/Modified
- `src/lib/data/tooltips.ts` - Static tooltip text for all 7 primary controls with optional expert strings
- `src/lib/data/tooltips.test.ts` - 6 tests verifying tooltip entries, jargon-free text, expert presence
- `src/lib/charts/strategy-chart-math.ts` - Pure functions for Sundberg-style R1/R2 chart computation
- `src/lib/charts/strategy-chart-math.test.ts` - 10 tests covering diagonal lines, note names, scales
- `src/lib/components/Tooltip.svelte` - Reusable ? icon tooltip with click toggle, hover, expert mode
- `src/lib/components/VibratoVisual.svelte` - Inline SVG sine waveform with rate/extent labels

## Decisions Made
- Used d3 scaleLinear (not scaleLog) for strategy chart axes per Sundberg reference conventions
- Tooltip uses document-level CustomEvent coordination for only-one-open behavior
- VibratoVisual uses 32-point polyline for smooth sine approximation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All building blocks ready for Plan 03 (layout integration) to wire into App.svelte
- Tooltip component ready to be placed next to any control with TOOLTIPS[key].text as prop
- Strategy chart math ready for SVG chart rendering in the strategy panel

---
*Phase: 05-pedagogy-ui-polish*
*Completed: 2026-04-12*
