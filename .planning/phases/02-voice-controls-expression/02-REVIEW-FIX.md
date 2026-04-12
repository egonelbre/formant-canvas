---
phase: 02-voice-controls-expression
fixed_at: 2026-04-12T00:00:00Z
review_path: .planning/phases/02-voice-controls-expression/02-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-04-12
**Source review:** .planning/phases/02-voice-controls-expression/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### CR-01: Unsafe array and non-null access in syncParams can throw at runtime

**Files modified:** `src/lib/audio/bridge.ts`
**Commit:** b8a7f8a
**Applied fix:** Added guards for `this.formants.length === 0` and `!this.masterGain` to the early-return check in `syncParams()`. Removed the non-null assertion (`!`) on `this.masterGain` since the guard now ensures it is non-null.

### WR-01: Play/pause handler has no error handling -- UI state desyncs on failure

**Files modified:** `src/App.svelte`
**Commit:** 504954a
**Applied fix:** Wrapped the entire `handlePlayPause()` body in a try/catch block that logs errors to console. If `bridge.init()` or `bridge.start()` throws, the error is caught and the UI state remains consistent (playing stays false, bridgeInitialized only set after successful init).

### WR-02: Worklet module loading swallows the original error

**Files modified:** `src/lib/audio/bridge.ts`
**Commit:** a47fe2c
**Applied fix:** Changed the catch block to capture `primaryErr`, nested the fallback attempt in its own try/catch, and logs the primary error via `console.error` before re-throwing the fallback error. Both error contexts are now preserved for debugging.

### WR-03: Manual reactive dependency list in $effect is fragile

**Files modified:** `src/lib/audio/state.svelte.ts`, `src/App.svelte`
**Commit:** b25ee9a
**Applied fix:** Added a `get snapshot()` getter to `VoiceParams` that reads all synth-relevant reactive fields and returns them as a plain object. Replaced the 18-line manual `void` dependency list in `App.svelte`'s `$effect` with a single `void voiceParams.snapshot`. New parameters now only need to be added in one place (the snapshot getter).

## Skipped Issues

None -- all in-scope findings were fixed.

---

_Fixed: 2026-04-12_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
