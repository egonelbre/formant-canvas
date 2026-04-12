---
phase: 01-audio-closed-loop
fixed_at: 2026-04-12T00:00:00Z
review_path: .planning/phases/01-audio-closed-loop/01-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 4
skipped: 1
status: partial
---

# Phase 1: Code Review Fix Report

**Fixed at:** 2026-04-12T00:00:00Z
**Source review:** .planning/phases/01-audio-closed-loop/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5
- Fixed: 4
- Skipped: 1

## Fixed Issues

### WR-02: syncParams() is called before the AudioBridge is initialized on first render

**Files modified:** `src/App.svelte`
**Commit:** 243510a
**Applied fix:** Added explicit `bridge.syncParams()` call immediately after `bridge.init()` completes in `handlePlayPause`, before setting `bridgeInitialized = true`. This ensures the current reactive state is pushed into the freshly built audio graph, preventing stale defaults if the user changed parameters before pressing Play.

### WR-03: stop() ramps master gain to 0 but start() does not restore it

**Files modified:** `src/lib/audio/bridge.ts`
**Commit:** 913952c
**Applied fix:** Added `this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime)` at the beginning of `start()`, before `syncParams()` restores the gain. This prevents a race condition where a stop ramp and start ramp fight each other if the user toggles play/stop quickly.

### WR-04: bandwidthToQ can return Infinity or NaN when bandwidthHz is 0 or negative

**Files modified:** `src/lib/audio/dsp/formant-utils.ts`
**Commit:** c9537b4
**Applied fix:** Added a guard at the top of `bandwidthToQ` that throws a `RangeError` if `bandwidthHz <= 0`. This prevents `Infinity` or `NaN` from being set on `BiquadFilterNode.Q`, which can cause silence or audio glitches in some browsers.

### WR-05: Glottal processor phase can drift with floating-point subtraction; rosenbergSample phase guard is inconsistent with worklet version

**Files modified:** `src/lib/audio/worklet/glottal-processor.ts`
**Commit:** 4ae38f3
**Applied fix:** Two changes: (1) Changed phase wrapping from `this.phase -= 1.0` to `this.phase -= Math.floor(this.phase)`, which correctly handles cases where `phaseIncrement > 1.0`. (2) Added `if (phase < 0 || phase >= 1) return 0` guard to the inlined `rosenbergSample` function, matching the canonical version in `rosenberg.ts`.

## Skipped Issues

### WR-01: bridge.start() is async but called without await in App.svelte

**File:** `src/App.svelte:49`
**Reason:** Code already has `await bridge.start()` on line 47 (now line 48). The fix described in the review is already present in the source code.
**Original issue:** bridge.start() is declared async but invoked without await in handlePlayPause.

---

_Fixed: 2026-04-12T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
