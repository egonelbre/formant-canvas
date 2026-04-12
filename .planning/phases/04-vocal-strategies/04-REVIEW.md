---
phase: 04-vocal-strategies
reviewed: 2026-04-12T14:30:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - src/App.svelte
  - src/lib/audio/bridge.ts
  - src/lib/audio/state.svelte.ts
  - src/lib/components/FormantCurves.svelte
  - src/lib/components/PianoHarmonics.svelte
  - src/lib/components/StrategyOverlayPiano.svelte
  - src/lib/components/StrategyOverlayVowel.svelte
  - src/lib/components/StrategyPanel.svelte
  - src/lib/components/VowelChart.svelte
  - src/lib/strategies/__tests__/auto-strategy.test.ts
  - src/lib/strategies/__tests__/strategy-engine.test.ts
  - src/lib/strategies/auto-strategy.ts
  - src/lib/strategies/definitions.ts
  - src/lib/strategies/engine.ts
  - src/lib/strategies/types.ts
findings:
  critical: 0
  warning: 4
  info: 2
  total: 6
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-04-12T14:30:00Z
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

Phase 4 introduces vocal strategy selection (R1, R2, singer's formant), an auto-strategy heuristic, strategy-locked formant tracking, and overlay visualizations on both the piano and vowel chart. The implementation is well-structured with clean separation between strategy logic (engine, definitions, auto-strategy) and UI (StrategyPanel, overlay components). Test coverage for the core engine and auto-strategy is solid.

Four warnings were found: singer's formant targets bypass formant clamping, the clamped-warning indicator applies globally when only one target is clamped, `snapToVowel` does not set F5, and switch statements in the engine lack exhaustiveness assertions. Two informational items were noted.

## Warnings

### WR-01: Singer's formant targets not clamped to FORMANT_BOUNDS

**File:** `src/lib/strategies/engine.ts:66-73`
**Issue:** When computing singer's formant cluster targets, f3/f4/f5 are set as raw arithmetic offsets from the voice-type center without being clamped to `FORMANT_BOUNDS`. For extreme voice-type center values or if `SINGER_FORMANT_CENTERS` data changes, targets could fall outside the defined bounds (e.g., f5 for child voice = 3200+300 = 3500, which is at the lower edge of f5 bounds at 3500). The f1 and f2 strategies both clamp their results, creating an inconsistency.

**Fix:**
```typescript
if (singerFormant) {
  const center = SINGER_FORMANT_CENTERS[voiceType] ?? 2600;
  targets.f3 = clamp(center - 200, FORMANT_BOUNDS.f3.min, FORMANT_BOUNDS.f3.max);
  targets.f4 = clamp(center, FORMANT_BOUNDS.f4.min, FORMANT_BOUNDS.f4.max);
  targets.f5 = clamp(center + 300, FORMANT_BOUNDS.f5.min, FORMANT_BOUNDS.f5.max);
  if (f0 > 659) inRange = false;
}
```

### WR-02: Clamped warning indicator shown on all target lines, not just clamped ones

**File:** `src/lib/components/StrategyOverlayPiano.svelte:92-108`
**Issue:** The `clamped` boolean from `strategyTargets` is a single flag indicating *any* target was clamped. The warning indicator (red circle with "!") is rendered on every target line in the `{#each targetLines}` block, not just the one that was actually clamped. For example, if R1 is clamped at f0=1200 Hz but R2 is not, both target lines show warning dots.

**Fix:** Expose per-target clamped state from `computeTargets` in `engine.ts`, or track which formants were clamped and only render the warning on the relevant lines. A minimal approach:

```typescript
// In engine.ts, track clamped per-target:
export interface StrategyResult {
  targets: StrategyTargets;
  inRange: boolean;
  clamped: boolean;
  clampedTargets: { f1: boolean; f2: boolean; f3: boolean; f4: boolean; f5: boolean };
}
```

Then in the overlay, only show the warning circle when `strategyTargets.clampedTargets[line.key]` is true.

### WR-03: snapToVowel does not set F5

**File:** `src/lib/components/VowelChart.svelte:132-138`
**Issue:** `snapToVowel` sets f1, f2, f3, and estimates f4 from f3, but does not update `voiceParams.f5Freq`. This means clicking a vowel preset leaves F5 at whatever its previous value was, creating an inconsistent formant state. The Hillenbrand data likely does not include F5, but an estimate should still be provided for consistency with the 5-formant model.

**Fix:**
```typescript
function snapToVowel(vowel: HillenbrandVowel) {
  const data = vowel[currentGroup];
  voiceParams.f1Freq = data.f1;
  voiceParams.f2Freq = data.f2;
  voiceParams.f3Freq = data.f3;
  voiceParams.f4Freq = Math.round(data.f3 * 1.25);
  voiceParams.f5Freq = Math.round(data.f3 * 1.6); // rough estimate
}
```

### WR-04: Switch statements in engine.ts lack default/exhaustiveness assertion

**File:** `src/lib/strategies/engine.ts:39-43` and `src/lib/strategies/engine.ts:56-58`
**Issue:** The switch statements over `r1` and `r2` have no `default` case. While TypeScript's type narrowing currently covers all union members, if a new strategy variant is added to the `R1Strategy` or `R2Strategy` types without updating these switches, `raw` would be used before assignment at runtime. An explicit `default` with a compile-time exhaustiveness check catches this at build time.

**Fix:**
```typescript
switch (r1) {
  case 'r1-f0':  raw = f0; break;
  case 'r1-2f0': raw = 2 * f0; break;
  case 'r1-3f0': raw = 3 * f0; break;
  default: {
    const _exhaustive: never = r1;
    throw new Error(`Unknown R1 strategy: ${_exhaustive}`);
  }
}
```

Apply the same pattern to the R2 switch.

## Info

### IN-01: Duplicate computeTargets calls across overlay components

**File:** `src/lib/components/StrategyOverlayPiano.svelte:30-37` and `src/lib/components/StrategyOverlayVowel.svelte:23-29`
**Issue:** Both overlay components independently call `computeTargets` with the same inputs. This is not a bug (the function is pure and cheap), but it duplicates reactive derivation logic. If the strategy engine becomes more expensive, this could be consolidated into a shared derived store in `state.svelte.ts`.

**Fix:** Consider adding a shared `$derived` in `state.svelte.ts` or a dedicated reactive module that both components import, if this pattern proliferates.

### IN-02: Magic number 1.25 for F4 estimation in snapToVowel

**File:** `src/lib/components/VowelChart.svelte:137`
**Issue:** The expression `Math.round(data.f3 * 1.25)` uses an unexplained constant. A named constant with a comment explaining the acoustic rationale would improve readability.

**Fix:**
```typescript
/** Rough F4/F3 ratio for vowel presets (no Hillenbrand F4 data available) */
const F4_F3_RATIO = 1.25;
// ...
voiceParams.f4Freq = Math.round(data.f3 * F4_F3_RATIO);
```

---

_Reviewed: 2026-04-12T14:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
