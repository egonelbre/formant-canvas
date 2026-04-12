---
phase: 04-vocal-strategies
fixed_at: 2026-04-12T17:47:00Z
review_path: .planning/phases/04-vocal-strategies/04-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 4: Code Review Fix Report

**Fixed at:** 2026-04-12T17:47:00Z
**Source review:** .planning/phases/04-vocal-strategies/04-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: Singer's formant targets not clamped to FORMANT_BOUNDS

**Files modified:** `src/lib/strategies/engine.ts`
**Commit:** 11b8efe
**Applied fix:** Wrapped the singer's formant f3/f4/f5 assignments with `clamp()` calls against `FORMANT_BOUNDS`, matching the pattern already used for R1 and R2 targets.

### WR-02: Clamped warning indicator shown on all target lines, not just clamped ones

**Files modified:** `src/lib/strategies/types.ts`, `src/lib/strategies/engine.ts`, `src/lib/components/StrategyOverlayPiano.svelte`, `src/lib/strategies/__tests__/strategy-engine.test.ts`
**Commit:** 5a9a822
**Applied fix:** Added `clampedTargets` field (per-formant boolean map) to `StrategyResult` interface and `computeTargets` return value. Updated `StrategyOverlayPiano.svelte` to render the warning indicator only on lines where `clampedTargets[line.key]` is true. Updated test expectations to reflect clamped singer's formant values (bass f4 2384->2500, f5 2684->3500; tenor f5 3005->3500).

### WR-03: snapToVowel does not set F5

**Files modified:** `src/lib/components/VowelChart.svelte`
**Commit:** f74dc3a
**Applied fix:** Added `voiceParams.f5Freq = Math.round(data.f3 * 1.6)` to `snapToVowel`, providing a rough F5 estimate consistent with the existing F4 estimation pattern.

### WR-04: Switch statements in engine.ts lack default/exhaustiveness assertion

**Files modified:** `src/lib/strategies/engine.ts`
**Commit:** cc89707
**Applied fix:** Added `default` cases with `never` type exhaustiveness checks to both the R1 and R2 switch statements. If a new strategy variant is added to the union types without updating these switches, TypeScript will produce a compile-time error.

---

_Fixed: 2026-04-12T17:47:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
