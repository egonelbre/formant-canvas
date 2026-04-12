---
phase: 05-pedagogy-ui-polish
fixed_at: 2026-04-12T10:45:00Z
review_path: .planning/phases/05-pedagogy-ui-polish/05-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 05: Code Review Fix Report

**Fixed at:** 2026-04-12T10:45:00Z
**Source review:** .planning/phases/05-pedagogy-ui-polish/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: Resize listener never removed in RegionHelp.svelte

**Files modified:** `src/lib/components/RegionHelp.svelte`
**Commit:** a327099
**Applied fix:** Extracted the inline arrow function `() => { open = false; }` passed to `window.addEventListener('resize', ...)` into a named `handleResize` function. Added `window.removeEventListener('resize', handleResize)` to the `$effect` cleanup return. This prevents resize listeners from accumulating across open/close cycles.

### WR-02: Type safety bypass with `as any` in HarmonicBars.svelte

**Files modified:** `src/lib/components/HarmonicBars.svelte`
**Commit:** 81f49e9
**Applied fix:** Added `showLabel: false` directly in the `.map()` return object, eliminating the `(bar as any).showLabel = true` cast and the `as (typeof bars[number] & { showLabel: boolean })[]` return type assertion. The labeling loop now sets `bar.showLabel = true` with full type safety. Removed the redundant `else` branch since `false` is the default.

### WR-03: VoicePresets does not load F5 frequency or bandwidth

**Files modified:** `src/lib/components/VoicePresets.svelte`
**Commit:** 04d0107
**Applied fix:** Added F5 derivation in `loadPreset`: `f5Freq = Math.round(preset.f4 * 1.2)` and `f5BW = Math.round(preset.f4BW * 1.1)`. The preset data does not include F5 fields, so values are derived from F4 using typical formant spacing ratios. This ensures F5 is updated consistently when switching presets rather than retaining stale values. Status: fixed: requires human verification (the F5 derivation multipliers are approximations that may need tuning).

### WR-04: VowelChart snapToVowel computes F4/F5 with magic multipliers instead of data

**Files modified:** `src/lib/components/VowelChart.svelte`
**Commit:** 7940bb4
**Applied fix:** Replaced the inline `f3 * 1.25` and `f3 * 1.6` magic multipliers with a call to `interpolateHigherFormants(data.f1, data.f2, currentGroup)`, making `snapToVowel` consistent with `updateFromPointer`. F5 is derived as `higher.f4 * 1.2` since the interpolation function does not return F5. Status: fixed: requires human verification (F5 derivation is an approximation).

---

_Fixed: 2026-04-12T10:45:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
