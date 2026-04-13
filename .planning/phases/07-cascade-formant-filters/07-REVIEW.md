---
phase: 07-cascade-formant-filters
reviewed: 2026-04-13T12:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/App.svelte
  - src/lib/audio/bridge.ts
  - src/lib/audio/dsp/formant-response.test.ts
  - src/lib/audio/dsp/formant-response.ts
  - src/lib/audio/state.svelte.ts
  - src/lib/components/FormantCurves.svelte
  - src/lib/components/HarmonicBars.svelte
  - src/lib/types.ts
findings:
  critical: 1
  warning: 3
  info: 1
  total: 5
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-04-13T12:00:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Reviewed all files related to the cascade formant filter implementation (Phase 7). The DSP math (`formant-response.ts`) and its test suite are well-structured and correct. The visualization components (`FormantCurves.svelte`, `HarmonicBars.svelte`) properly dispatch on `filterTopology` and `filterOrder`. However, the audio bridge does not implement cascade topology -- the Web Audio graph is always wired in parallel regardless of `voiceParams.filterTopology`. This creates an audio-visual mismatch that violates the project's core value of linked exploration. There are also race-condition risks in the crossfade timeout callbacks within `bridge.ts`.

## Critical Issues

### CR-01: Audio-visual mismatch -- bridge ignores filterTopology

**File:** `src/lib/audio/bridge.ts` (entire file)
**Issue:** `voiceParams.filterTopology` is read by `FormantCurves.svelte` (line 25) and `HarmonicBars.svelte` (line 25) to render cascade vs parallel response curves, but `bridge.ts` has zero references to `filterTopology` or `cascade`. The audio graph is always wired via `buildParallelChain()`. If a user (or future UI) sets `filterTopology = 'cascade'`, the visualization will show cascade response while the audio remains parallel. This directly violates the project's core linked-exploration principle: "move a formant and the sound, the vowel chart, and the harmonics-on-piano update together in real time."

**Fix:** Implement a `buildCascadeChain()` method that wires worklet -> biquadA[0] -> biquadA[1] -> ... -> biquadA[4] -> masterGain (series topology). Add topology dispatch in `buildFormantChain()` and a `toggleFilterTopology()` method analogous to `toggleFilterOrder()`. Until cascade wiring is implemented, prevent the visualization from showing cascade mode, or document this as a known incomplete feature.

```typescript
private buildCascadeChain(): void {
  if (!this.ctx || !this.workletNode || !this.masterGain) return;
  this.disconnectFormantNodes();

  const fourthOrder = voiceParams.filterOrder === 4;
  // Chain: worklet -> biquadA[0] -> (biquadB[0]) -> biquadA[1] -> ... -> masterGain
  let prev: AudioNode = this.workletNode;
  for (let i = 0; i < 5; i++) {
    prev.connect(this.formantBiquadsA[i]);
    if (fourthOrder) {
      this.formantBiquadsA[i].connect(this.formantBiquadsB[i]);
      prev = this.formantBiquadsB[i];
    } else {
      prev = this.formantBiquadsA[i];
    }
  }
  prev.connect(this.masterGain);
}
```

## Warnings

### WR-01: Race condition in setTimeout crossfade callbacks

**File:** `src/lib/audio/bridge.ts:184-193` and `src/lib/audio/bridge.ts:298-306`
**Issue:** Both `toggleFilterOrder()` and `switchModel()` use `setTimeout(fn, 50)` to schedule work after a gain ramp. If `destroy()` is called during that 50ms window, the callback still executes. The null checks (`if (this.ctx && this.masterGain)`) guard the gain restore, but `voiceParams.filterOrder = newOrder` (line 185), `this.buildParallelChain()` (line 186), and `this.syncParams()` (line 187) execute unconditionally on a destroyed bridge. `buildParallelChain()` will silently bail due to its own null checks, but `syncParams()` will also bail -- the real issue is the state mutation (`voiceParams.filterOrder = newOrder`) happening after destruction.

**Fix:** Store the timeout ID and clear it in `destroy()`, or add an early return at the top of the callback:

```typescript
setTimeout(() => {
  if (!this.initialized) return; // Bridge was destroyed during crossfade
  voiceParams.filterOrder = newOrder;
  this.buildParallelChain();
  this.syncParams();
  // ...
}, 50);
```

### WR-02: Cascade envelope ignores per-formant gain

**File:** `src/lib/audio/dsp/formant-response.ts:58-59`
**Issue:** `cascadeEnvelope()` forces `gain: 1` for all formants (line 59: `{ freq: f.freq, bw: f.bw, gain: 1 }`), producing a shape-only response. This is documented as intentional ("shape-only, so the cascade product gives relative response"), but it means the `f1Gain`..`f5Gain` parameters in `VoiceParams` have no effect on the cascade visualization. In a real cascade filter chain, per-formant gain would still matter if implemented as gain stages between filters. If cascade mode is later implemented in the bridge with per-formant gains, the visualization will not match. This is a design decision worth revisiting when cascade audio is implemented.

**Fix:** Consider whether cascade visualization should incorporate per-formant gains. If not, add a comment in `topologyAwareEnvelope()` documenting the intentional asymmetry, and ensure the bridge cascade implementation matches this decision.

### WR-03: snapshot getter missing `playing` field

**File:** `src/lib/audio/state.svelte.ts:63-77`
**Issue:** The `snapshot` getter is used in `App.svelte` (line 68) to trigger `bridge.syncParams()` on any parameter change. It includes `muted` but not `playing`. Since `syncParams()` computes `effectiveGain` based on `voiceParams.playing` (bridge.ts line 240), changes to `playing` from external sources (not through `handlePlayPause`) would not trigger a sync. Currently `playing` is only set in `handlePlayPause` which calls `syncParams()` directly, so this is not a bug today, but it is a latent inconsistency that could cause issues if `playing` is ever set from another path.

**Fix:** Add `playing` to the snapshot getter for consistency:

```typescript
get snapshot() {
  return {
    // ...existing fields...
    muted: this.muted, playing: this.playing,
    // ...
  };
}
```

## Info

### IN-01: Unused FilterTopology type in types.ts without corresponding bridge implementation

**File:** `src/lib/types.ts:18`
**Issue:** `FilterTopology` type is exported and used in state and visualization, but has no corresponding implementation in the audio bridge. This is likely intentional work-in-progress for Phase 7, but the type definition suggests the feature is further along than it actually is.

**Fix:** No action needed if Phase 7 will implement cascade wiring. Consider adding a TODO comment in `bridge.ts` noting that cascade topology is not yet implemented.

---

_Reviewed: 2026-04-13T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
