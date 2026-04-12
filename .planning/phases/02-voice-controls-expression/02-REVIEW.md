---
phase: 02-voice-controls-expression
reviewed: 2026-04-12T00:00:00Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - src/app.css
  - src/App.svelte
  - src/lib/audio/bridge.ts
  - src/lib/audio/dsp/jitter.ts
  - src/lib/audio/dsp/pitch-utils.ts
  - src/lib/audio/dsp/spectral-tilt.ts
  - src/lib/audio/dsp/vibrato.ts
  - src/lib/audio/state.svelte.ts
  - src/lib/audio/worklet/glottal-processor.ts
  - src/lib/components/ChipGroup.svelte
  - src/lib/components/ExpressionControls.svelte
  - src/lib/components/LabeledSlider.svelte
  - src/lib/components/PhonationMode.svelte
  - src/lib/components/PianoKeyboard.svelte
  - src/lib/components/PitchSection.svelte
  - src/lib/components/TransportBar.svelte
  - src/lib/components/VoicePresets.svelte
  - src/lib/data/phonation-presets.ts
  - src/lib/data/qwerty-map.ts
  - src/lib/data/voice-presets.ts
  - src/lib/types.ts
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-12
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

The phase 02 implementation covers voice synthesis controls, expression parameters, phonation presets, QWERTY keyboard input, and the AudioBridge connecting UI state to Web Audio. The DSP helper functions (vibrato, jitter, spectral tilt, pitch utils) are clean, well-documented, and mathematically correct. The Svelte components follow consistent patterns and use Svelte 5 runes idiomatically. The main concerns are in the AudioBridge class: unsafe array/null access in `syncParams`, missing error handling in the play/pause flow, and a fragile manual dependency-tracking pattern in App.svelte's `$effect`.

## Critical Issues

### CR-01: Unsafe array and non-null access in syncParams can throw at runtime

**File:** `src/lib/audio/bridge.ts:133-142`
**Issue:** `syncParams()` accesses `this.formants[i]` and `this.formantGains[i]` in a loop without verifying the arrays are populated. The early return on line 121 checks `this.ctx` and `this.workletNode` but not the formant arrays. If `buildFormantChain()` returned early (line 59: `if (!this.ctx || !this.workletNode) return`), the arrays remain empty. Additionally, line 142 uses the non-null assertion `this.masterGain!` without a guard -- if `masterGain` is null, this throws.

The `$effect` in App.svelte (line 34) calls `bridge.syncParams()` reactively, so this path is exercised on every parameter change.

**Fix:**
```typescript
syncParams(): void {
  if (!this.ctx || !this.workletNode || this.formants.length === 0 || !this.masterGain) return;

  const now = this.ctx.currentTime;
  // ... rest unchanged
```

## Warnings

### WR-01: Play/pause handler has no error handling -- UI state desyncs on failure

**File:** `src/App.svelte:38-49`
**Issue:** `handlePlayPause()` calls `bridge.init()` and `bridge.start()`, both of which can throw (e.g., user denies microphone/audio permission, AudioContext creation fails, worklet module fails to load). If `bridge.init()` throws, `bridgeInitialized` stays false, which is correct. But if `bridge.start()` throws after init succeeds, the function exits without setting `voiceParams.playing = true`, yet the AudioContext may be in a partially started state. More critically, there is no user-visible error feedback.

**Fix:**
```typescript
async function handlePlayPause() {
  try {
    if (!bridgeInitialized) {
      await bridge.init();
      bridgeInitialized = true;
    }
    if (voiceParams.playing) {
      bridge.stop();
      voiceParams.playing = false;
    } else {
      await bridge.start();
      voiceParams.playing = true;
    }
  } catch (err) {
    console.error('Audio initialization failed:', err);
    // Consider showing user-facing error state
  }
}
```

### WR-02: Worklet module loading swallows the original error

**File:** `src/lib/audio/bridge.ts:32-39`
**Issue:** The try/catch for loading the `.ts` worklet URL silently discards the error before attempting the `.js` fallback. If both fail, only the fallback error is thrown, losing context about why the primary path failed. This makes debugging deployment issues harder.

**Fix:**
```typescript
try {
  const workletUrl = new URL('./worklet/glottal-processor.ts', import.meta.url);
  await this.ctx.audioWorklet.addModule(workletUrl);
} catch (primaryErr) {
  try {
    const fallbackUrl = new URL('./worklet/glottal-processor.js', import.meta.url);
    await this.ctx.audioWorklet.addModule(fallbackUrl);
  } catch (fallbackErr) {
    console.error('Primary worklet load failed:', primaryErr);
    throw fallbackErr;
  }
}
```

### WR-03: Manual reactive dependency list in $effect is fragile

**File:** `src/App.svelte:19-35`
**Issue:** The `$effect` block manually reads every `voiceParams` field with `void voiceParams.f0; void voiceParams.f1Freq;` etc. to establish Svelte dependency tracking. If a new parameter is added to `VoiceParams` (which is likely as the project grows), the developer must remember to add the corresponding `void` read here. Omitting it means the parameter change will not trigger `syncParams()`, leading to silent audio desync -- a class of bug that is hard to diagnose.

**Fix:** Consider creating a method on VoiceParams that returns a snapshot object (or a version counter that increments on any change), so the $effect depends on a single derived value:
```typescript
// In VoiceParams class:
get snapshot() {
  return {
    f0: this.f0, f1Freq: this.f1Freq, f1BW: this.f1BW, f1Gain: this.f1Gain,
    f2Freq: this.f2Freq, f2BW: this.f2BW, f2Gain: this.f2Gain,
    f3Freq: this.f3Freq, f3BW: this.f3BW, f3Gain: this.f3Gain,
    f4Freq: this.f4Freq, f4BW: this.f4BW, f4Gain: this.f4Gain,
    masterGain: this.masterGain, aspirationLevel: this.aspirationLevel,
    openQuotient: this.openQuotient, vibratoRate: this.vibratoRate,
    vibratoExtent: this.vibratoExtent, jitterAmount: this.jitterAmount,
    spectralTilt: this.spectralTilt, muted: this.muted,
  };
}

// In App.svelte $effect:
$effect(() => {
  void voiceParams.snapshot;
  bridge.syncParams();
});
```
This consolidates the dependency list to one place, co-located with the state definition.

## Info

### IN-01: Unused import in PianoKeyboard

**File:** `src/lib/components/PianoKeyboard.svelte:2`
**Issue:** `midiToHz` is imported from `pitch-utils.ts` but never used in this component. The pitch conversion happens in `PitchSection.svelte` and `App.svelte` instead.
**Fix:** Remove the unused import:
```typescript
// Delete this line:
import { midiToHz } from '../audio/dsp/pitch-utils.ts';
```

### IN-02: VoicePresets does not update f0 when loading a preset

**File:** `src/lib/components/VoicePresets.svelte:8-17`
**Issue:** Each voice preset defines an `f0Default` value (e.g., Soprano: 260 Hz, Bass: 98 Hz), but `loadPreset()` only sets formant frequencies and bandwidths -- it does not set `voiceParams.f0 = preset.f0Default`. This means selecting "Soprano" leaves the pitch at whatever the user last set (default 120 Hz, which is out of range for a soprano). This may be intentional ("preserve current pitch"), but it seems like a missed opportunity since the preset data includes a default f0.
**Fix:** Consider optionally setting f0:
```typescript
voiceParams.f0 = preset.f0Default;
```

---

_Reviewed: 2026-04-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
