---
phase: 03-linked-visualizations-piano-f1-f2
fixed_at: 2026-04-12T12:55:00Z
review_path: .planning/phases/03-linked-visualizations-piano-f1-f2/03-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-04-12T12:55:00Z
**Source review:** .planning/phases/03-linked-visualizations-piano-f1-f2/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5
- Fixed: 5
- Skipped: 0

## Fixed Issues

### WR-01: Convex hull cross-product sign is inverted — overlay polygon winding is wrong

**Files modified:** `src/lib/components/VowelChartOverlay.svelte`
**Commit:** f269ef0
**Applied fix:** Changed the pivot sort from ascending y (`a.y - b.y`) to descending y (`b.y - a.y`) so the Graham scan picks the visually bottom-most point in SVG coordinates as the pivot, making the existing `cross <= 0` pop condition produce a correct convex hull.

### WR-02: Magic constant y=80 hardcoded in child components breaks layout contract

**Files modified:** `src/lib/components/HarmonicBars.svelte`, `src/lib/components/FormantCurves.svelte`, `src/lib/components/PianoHarmonics.svelte`
**Commit:** a5ef2d7
**Applied fix:** Added a `regionBottom: number` prop to both HarmonicBars and FormantCurves. Replaced all hardcoded `80` values (bar baseline, curve baseline, center-marker line endpoints) with the `regionBottom` prop. PianoHarmonics now passes `regionBottom={HARMONIC_REGION_HEIGHT}` to both children.

### WR-03: Piano black-key hit-test gap when START_MIDI is a black key

**Files modified:** `src/lib/components/PianoHarmonics.svelte`
**Commit:** 538e97e
**Applied fix:** Added a module-level assertion that throws an error if `START_MIDI` is a black key, documenting and enforcing the invariant that the piano range must start on a white key for black-key layout to work correctly.

### WR-04: currentGroup not synced with overlayGroup in VowelChart

**Files modified:** `src/lib/components/VowelChart.svelte`
**Commit:** 12edd64
**Applied fix:** Updated `onOverlaySelect` to also set `currentGroup` when a non-"none" overlay is selected, so ellipse positions, radii, and active-region detection use the same speaker group as the visible overlay polygon.

### WR-05: freqToX extrapolation formula incorrect

**Files modified:** `src/lib/components/PianoHarmonics.svelte`
**Commit:** 58651ac
**Applied fix:** Fixed `pxPerSemitone` calculation to account for the fact that `svgWidth` spans only white keys: changed from `svgWidth / (END_MIDI - START_MIDI)` to `svgWidth / (whiteKeys.length * (12 / 7))`, correctly converting white-key pixel width to semitone scale.

---

_Fixed: 2026-04-12T12:55:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
