---
phase: 01-audio-closed-loop
reviewed: 2026-04-12T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - e2e/audio-smoke.test.ts
  - src/app.css
  - src/App.svelte
  - src/lib/audio/bridge.ts
  - src/lib/audio/dsp/formant-utils.ts
  - src/lib/audio/dsp/noise.ts
  - src/lib/audio/dsp/rosenberg.ts
  - src/lib/audio/state.svelte.ts
  - src/lib/audio/worklet/glottal-processor.ts
  - src/lib/types.ts
  - src/main.ts
  - vitest.config.ts
  - playwright.config.ts
  - package.json
  - .gitignore
findings:
  critical: 0
  warning: 5
  info: 4
  total: 9
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-04-12
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Phase 1 establishes the audio closed loop: a Svelte 5 reactive state store (`VoiceParams`), an `AudioBridge` that builds a parallel formant filter graph, a Rosenberg glottal pulse AudioWorklet, and a minimal UI. The architecture is sound and follows the stack conventions from CLAUDE.md well. No security vulnerabilities were found, and no hardcoded secrets are present.

Five warnings were found — all correctness or reliability issues that could cause silent audio misbehaviour or test brittleness. Four informational items were found covering code quality and gaps worth noting before the codebase grows.

---

## Warnings

### WR-01: `bridge.start()` is async but called without `await` in `App.svelte`

**File:** `src/App.svelte:49`

**Issue:** `bridge.start()` is declared `async` (it calls `this.resume()` internally) but is invoked without `await` in `handlePlayPause`. Any rejection from `AudioContext.resume()` inside `start()` is silently swallowed. If the browser refuses to resume (e.g., policy changed between init and play), the audio graph appears active but produces no sound, and `voiceParams.playing` is set to `true` with no audible output — the UI lies to the user.

**Fix:**
```typescript
// App.svelte line 49 — await bridge.start()
} else {
  await bridge.start();
  voiceParams.playing = true;
}
```

---

### WR-02: `syncParams()` is called before the AudioBridge is initialized on first render

**File:** `src/App.svelte:25-36` / `src/lib/audio/bridge.ts:120-121`

**Issue:** The `$effect` that calls `bridge.syncParams()` runs immediately on component mount, before `bridgeInitialized` is ever set. `syncParams()` guards with `if (!this.ctx || !this.workletNode) return;` so it silently no-ops. This is safe today, but the Svelte effect re-runs on every `voiceParams` change during the pre-init period — fine functionally, but the guard condition covers up a latent ordering assumption. The deeper issue: after the user clicks Play and init completes, `syncParams()` is not re-triggered, so the bridge starts with whatever state was snapshotted inside `buildFormantChain()` rather than the live reactive state. If the user moves the vowel slider before pressing Play, the audio graph starts with stale defaults.

**Fix:** After `bridge.init()` completes, explicitly call `bridge.syncParams()` to push the current reactive state into the newly built graph:

```typescript
async function handlePlayPause() {
  if (!bridgeInitialized) {
    await bridge.init();
    bridge.syncParams(); // push current state into freshly built graph
    bridgeInitialized = true;
  }
  await bridge.resume();
  // ...
}
```

---

### WR-03: `stop()` ramps master gain to 0 but `start()` does not restore it

**File:** `src/lib/audio/bridge.ts:165-170` / `src/lib/audio/bridge.ts:155-160`

**Issue:** `stop()` ramps `masterGain` to 0 via `setTargetAtTime`. `start()` calls `syncParams()`, which does restore the master gain — but `syncParams()` uses `voiceParams.masterGain` (the stored value, e.g. 0.5). The problem is timing: `setTargetAtTime` for the stop ramp uses a 5ms time constant and continues running into the start of the next play. If the user presses Stop then immediately presses Play within a few milliseconds, the ramp-to-zero scheduled event has not yet completed, and the subsequent `setTargetAtTime(0.5, now, 0.01)` in `syncParams()` fights the already-scheduled ramp, potentially leaving gain in an undefined intermediate state.

**Fix:** Cancel scheduled values before re-applying gain on start:

```typescript
start(): void {
  if (!this.ctx || !this.masterGain) return;
  this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
  this.masterGain.gain.setTargetAtTime(voiceParams.masterGain, this.ctx.currentTime, 0.01);
  this.syncParams();
}
```

---

### WR-04: `bandwidthToQ` can return `Infinity` or `NaN` when `bandwidthHz` is 0 or negative

**File:** `src/lib/audio/dsp/formant-utils.ts:13-15`

**Issue:** `bandwidthToQ(centerFreq, 0)` returns `Infinity`. Setting `BiquadFilterNode.Q` to `Infinity` causes the filter to behave as a pure impulse/resonator with undefined energy — in some browsers this produces silence or audio glitches for the entire graph, not just that formant. There is currently no validation in `VoiceParams` to enforce `bw > 0`, so a future UI that sets BW to 0 (or a preset with an invalid value) would silently break audio.

**Fix:**
```typescript
export function bandwidthToQ(centerFreq: number, bandwidthHz: number): number {
  if (bandwidthHz <= 0) throw new RangeError(`bandwidthHz must be > 0, got ${bandwidthHz}`);
  return centerFreq / bandwidthHz;
}
```

Or alternatively guard with a minimum: `Math.max(bandwidthHz, 1)`. Pair this with input validation on `VoiceParams` or the UI slider bounds.

---

### WR-05: Glottal processor phase can drift with floating-point subtraction; `rosenbergSample` phase guard is inconsistent with worklet version

**File:** `src/lib/audio/worklet/glottal-processor.ts:82` / `src/lib/audio/dsp/rosenberg.ts:19`

**Issue:** The canonical `rosenbergSample` in `rosenberg.ts` guards `if (phase < 0 || phase >= 1) return 0`, meaning it is well-defined for phase outside [0,1). The inlined worklet version at `glottal-processor.ts` omits this guard. This is fine today because `phase` is always maintained in [0,1) by the `if (this.phase >= 1.0) this.phase -= 1.0` wrap — but repeated floating-point subtraction rather than `phase % 1.0` can allow the phase to drift above 1.0 over very long runs when `f0` is high relative to `sampleRate` and `phaseIncrement` is large. For example if `phaseIncrement` is 0.9 and `phase` was 0.95, `phase` becomes 1.85, the subtraction yields 0.85 — which is fine. But if `phaseIncrement` > 1.0 (f0 > sampleRate, pathological but not guarded), the subtraction still leaves phase above 1.0 permanently, causing the pulse to always output in the closed phase (silence). More practically, the lack of the guard means that if phase ever reaches exactly 1.0 due to floating-point, `rosenbergSample` will return 0 but the worklet version would pass 1.0 to the closing-phase branch, computing `(1.0 - Tp)/(Tn - Tp)` which can exceed 1 — returning a negative cosine value and injecting a click artifact.

**Fix:** Use modulo wrapping and add the guard to the inlined copy, or validate `f0` stays below `sampleRate/2`:

```typescript
// In glottal-processor.ts process()
this.phase += phaseIncrement;
if (this.phase >= 1.0) this.phase -= Math.floor(this.phase); // handles phaseIncrement > 1

// Or simpler:
this.phase = (this.phase + phaseIncrement) % 1.0;
```

Also add an `f0` validation to the `onmessage` handler: `if (data.f0 > 0 && data.f0 < sampleRate / 2) this.f0 = data.f0;`

---

## Info

### IN-01: `VoiceParams.formants` getter creates a new array on every access — not used reactively

**File:** `src/lib/audio/state.svelte.ts:28-35`

**Issue:** The `get formants()` getter returns a new `FormantParams[]` array each call. It is not accessed anywhere in the current codebase (bridge.ts reads fields directly). If this getter is used inside a Svelte `$derived` or `$effect` in future code, each access would produce a new array reference, which could cause unnecessary reactivity re-triggers depending on how Svelte 5 tracks object identity. This is a latent quality issue, not a current bug.

**Suggestion:** Either remove the getter if unused, or convert it to a `$derived` field so Svelte memoizes it:
```typescript
formants = $derived([
  { freq: this.f1Freq, bw: this.f1BW, gain: this.f1Gain },
  // ...
]);
```

---

### IN-02: `Math.random()` in the AudioWorklet allocates no memory but is not seeded — white noise quality is implementation-defined

**File:** `src/lib/audio/worklet/glottal-processor.ts:77`

**Issue:** `Math.random()` in an AudioWorklet is fine for aspiration noise in a pedagogical tool. However, it is worth documenting that its distribution and quality are browser-implementation-defined (most use xorshift64 or similar). This is not a bug, but if higher-quality noise is ever desired (e.g., pink noise shaping for more natural aspiration), this is the callsite to replace. The standalone `noise.ts` helper (`whitenoise()`) is not imported by the worklet (by necessity, since worklets cannot use ES module imports). The duplication is expected and correctly commented.

**Suggestion:** Add a comment cross-referencing `src/lib/audio/dsp/noise.ts` to make the intentional duplication explicit:
```typescript
// Inline whitenoise() — cannot import from noise.ts in AudioWorkletGlobalScope.
// See src/lib/audio/dsp/noise.ts for the testable reference implementation.
const noise = (Math.random() * 2 - 1) * this.aspirationLevel;
```

---

### IN-03: `vitest.config.ts` does not cover worklet DSP functions — they are tested in `node` environment which lacks `AudioWorkletGlobalScope`

**File:** `vitest.config.ts:1-11`

**Issue:** The Vitest config runs tests in the `node` environment, which is correct for pure DSP math functions (`rosenbergSample`, `bandwidthToQ`, `whitenoise`). However, there are currently no test files (`src/**/*.test.ts` finds nothing). The CLAUDE.md architecture recommends wrapping worklet logic in pure functions and testing those in Node — this is partially done (`rosenberg.ts` is a pure extractable function) but no tests exist yet. This is a gap, not a bug, but worth flagging before the codebase grows.

**Suggestion:** Add at minimum a `src/lib/audio/dsp/rosenberg.test.ts` with golden-array assertions for a few (phase, openQuotient) pairs. This catches regressions in the pulse shape math before they become audible surprises.

---

### IN-04: `main.ts` uses non-null assertion on `getElementById('app')` without fallback

**File:** `src/main.ts:6`

**Issue:** `document.getElementById('app')!` will throw a runtime TypeError if the element is absent (e.g., if `index.html` is modified to remove the `id="app"` div). This is a standard Svelte scaffold pattern and low risk, but worth noting.

**Suggestion:** Add a guard if resilience is desired:
```typescript
const target = document.getElementById('app');
if (!target) throw new Error('Mount target #app not found in index.html');
const app = mount(App, { target });
```

---

_Reviewed: 2026-04-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
