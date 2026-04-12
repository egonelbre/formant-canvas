---
phase: 02-voice-controls-expression
verified: 2026-04-12T13:30:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 1
overrides:
  - truth: "User can load voice-type presets and hear the f0 range and starting formants load together"
    decision: "User explicitly requested voice presets only change formants, preserving current pitch and phonation. f0Default retained in data for optional future use."
    approved_by: user
    date: 2026-04-12
gaps:
  - truth: "User can load voice-type presets and hear the f0 range and starting formants load together"
    status: overridden
    reason: "VoicePresets.svelte loadPreset() only sets formant frequencies/bandwidths. It does NOT set f0 (voiceParams.f0 = preset.f0Default is absent). The ROADMAP Success Criterion 4 requires 'f0 range and starting formants load together'. Documented in 02-06 SUMMARY as a user-preference deviation but this contradicts the roadmap contract."
    artifacts:
      - path: "src/lib/components/VoicePresets.svelte"
        issue: "loadPreset() sets f1-f4 freq/BW and voicePreset but does not assign voiceParams.f0 = preset.f0Default"
    missing:
      - "Add voiceParams.f0 = preset.f0Default to loadPreset() in VoicePresets.svelte, OR add an explicit override in this VERIFICATION.md frontmatter if the user prefers the formants-only behavior"
human_verification:
  - test: "Open app in browser, click Start Audio, then click soprano preset chip, verify pitch changes to ~260 Hz"
    expected: "If override is accepted, f0 should stay unchanged. If gap is fixed, f0 should jump to 260 Hz (soprano default)."
    why_human: "Subjective audio + visual confirmation needed for preset behavior decision"
  - test: "With audio playing, verify vibrato slider (rate 0-10 Hz) produces audible sine LFO on f0"
    expected: "Moving vibrato extent to ~50 cents at 5 Hz rate produces a clearly audible wobble"
    why_human: "Subjective audio quality cannot be verified programmatically"
  - test: "Switch phonation from Modal to Breathy, then to Pressed — verify audible difference"
    expected: "Breathy = airy breathiness; Pressed = tight, creaky texture"
    why_human: "Subjective audio quality (open quotient + aspiration effect) requires human ear"
  - test: "With audio playing, press Z, X, C keys and confirm piano keys highlight on screen"
    expected: "QWERTY keys produce pitch changes (C3, D3, E3) and highlight corresponding piano keys"
    why_human: "QWERTY-to-pitch integration and visual highlight require browser interaction"
  - test: "Verify mute button silences audio instantly without clicking/popping, unmute restores"
    expected: "No audible artifact on mute/unmute transition"
    why_human: "Audio quality (click/pop artifact) requires human ear"
---

# Phase 2: Voice Controls & Expression Verification Report

**Phase Goal:** Pitch, vibrato/jitter, phonation control, transport, and voice/phonation presets driving the engine
**Verified:** 2026-04-12T13:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can set f0 via pitch control and QWERTY keyboard piano mapping; readout shows Hz, note name, cents | VERIFIED | PitchSection.svelte wired to pitch-utils formatPitchReadout; QWERTY_MAP in App.svelte handleKeyDown sets voiceParams.f0 = midiToHz(midi) |
| 2 | User can hear vibrato (rate Hz, extent cents) and jitter (controllable amount) applied to f0, no zipper artifacts | VERIFIED | glottal-processor.ts has audio-rate vibratoModulation and per-cycle jitterOffset; bridge.syncParams() forwards all params; ExpressionControls.svelte renders 3 LabeledSliders wired to store |
| 3 | User can switch between breathy, modal, flow, pressed phonation with plain-language labels and hear glottal source change | VERIFIED | PhonationMode.svelte loadMode() sets OQ/aspiration/spectralTilt from PHONATION_PRESETS; worklet receives spectralTilt via postMessage and applies one-pole filter |
| 4 | User can load voice-type presets and hear f0 range and starting formants load together | FAILED | VoicePresets.svelte loadPreset() ONLY sets formant frequencies/bandwidths — does NOT set voiceParams.f0 = preset.f0Default. Human verification in 02-06 changed this to formants-only as a user preference, but this contradicts the ROADMAP contract. |
| 5 | Play, stop, master volume, and mute respond instantly from any UI state | VERIFIED | TransportBar.svelte wired via onplayclick callback to handlePlayPause; mute sets effectiveGain=0 via setTargetAtTime 5ms ramp in bridge.syncParams() |

**Score:** 4/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/audio/dsp/vibrato.ts` | vibratoModulation, advanceVibratoPhase exports | VERIFIED | Both functions present with correct 2^(cents*sin/1200) formula |
| `src/lib/audio/dsp/jitter.ts` | computeJitterOffset export | VERIFIED | Present, 3% max deviation at amount=1 |
| `src/lib/audio/dsp/spectral-tilt.ts` | computeTiltCoefficients, applyTiltSample exports | VERIFIED | Klatt one-pole filter, tiltDb clamped to [0,24] |
| `src/lib/audio/dsp/pitch-utils.ts` | hzToNote, midiToHz, sliderToHz, hzToSlider, formatPitchReadout exports | VERIFIED | All 5 functions present; D-05 format "Hz . Note . cents" |
| `src/lib/audio/state.svelte.ts` | VoiceParams with vibratoRate, vibratoExtent, jitterAmount, phonationMode, spectralTilt, muted, voicePreset | VERIFIED | All 7 new $state fields present with correct defaults |
| `src/lib/types.ts` | PhonationMode, PhonationPreset, VoicePreset | VERIFIED | All three types exported; existing FormantParams, VowelTarget preserved |
| `src/lib/data/voice-presets.ts` | VOICE_PRESETS with 7 entries | VERIFIED | 7 presets: soprano, mezzo, alto, tenor, baritone, bass, child |
| `src/lib/data/phonation-presets.ts` | PHONATION_PRESETS with 4 modes | VERIFIED | breathy/modal/flow/pressed with correct OQ/aspiration/tilt values |
| `src/lib/data/qwerty-map.ts` | QWERTY_MAP 24 keys, QWERTY_BASE_OCTAVE=3 | VERIFIED | 24 keys present; note: Digit4=F4 changed to KeyR=F4 per corrected diatonic layout (documented deviation) |
| `src/lib/audio/worklet/glottal-processor.ts` | vibratoPhase, jitterOffset, tiltA/tiltB fields; vibratoModulation and applyTiltSample inlined | VERIFIED | All fields present; no import statements; DSP inlined correctly |
| `src/lib/audio/bridge.ts` | syncParams() with mute and all 7 params postMessage | VERIFIED | effectiveGain mute pattern present; postMessage includes vibratoRate, vibratoExtent, jitterAmount, spectralTilt |
| `src/lib/components/LabeledSlider.svelte` | Reusable labeled range input, touch-action: none | VERIFIED | $props(), touch-action: none on volume input |
| `src/lib/components/ChipGroup.svelte` | Pill buttons with radio selection, border-radius 16px | VERIFIED | Present with --radius-pill |
| `src/lib/components/TransportBar.svelte` | Play/stop, volume, mute | VERIFIED | voiceParams.playing and voiceParams.muted wired; onplayclick callback |
| `src/lib/components/PitchSection.svelte` | Piano + pitch readout with formatPitchReadout | VERIFIED | formatPitchReadout, sliderToHz/hzToSlider present; note: vertical slider removed per human verification (acceptable) |
| `src/lib/components/VoicePresets.svelte` | 7 chips loading presets | PARTIAL | Exists and loads formants; does NOT load f0Default (gap) |
| `src/lib/components/PhonationMode.svelte` | 4 mode buttons loading OQ/aspiration/tilt | VERIFIED | loadMode() correctly sets all 3 params |
| `src/lib/components/ExpressionControls.svelte` | 3 sliders: vibrato rate, extent, jitter | VERIFIED | All 3 LabeledSlider instances wired to voiceParams fields |
| `src/lib/components/PianoKeyboard.svelte` | SVG piano, white/black keys, drag support | VERIFIED | viewBox, #d4d4d8 white keys, #27272a black keys; pointer drag implemented |
| `src/App.svelte` | 5 sections composed, QWERTY handler, $effect reads all params | VERIFIED | All 5 components imported; QWERTY_MAP[event.code] present; $effect reads voiceParams.vibratoRate and .muted |
| `src/app.css` | CSS custom properties design system | VERIFIED | --color-accent, --color-surface, --color-muted, --spacing-xl, --radius-pill all present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/audio/dsp/vibrato.ts` | `worklet/glottal-processor.ts` | vibratoModulation inlined | WIRED | vibratoModulation function present in worklet (inlined, not imported) |
| `src/lib/audio/dsp/pitch-utils.ts` | `PitchSection.svelte` | import hzToSlider, formatPitchReadout | WIRED | Both imported and used in component |
| `src/lib/data/voice-presets.ts` | `VoicePresets.svelte` | import VOICE_PRESETS | WIRED | VOICE_PRESETS imported, used to build options and in loadPreset() |
| `src/lib/data/phonation-presets.ts` | `PhonationMode.svelte` | import PHONATION_PRESETS | WIRED | Imported and used in loadMode() |
| `src/lib/audio/bridge.ts` | `worklet/glottal-processor.ts` | postMessage with vibratoRate, spectralTilt | WIRED | port.postMessage includes vibratoRate, vibratoExtent, jitterAmount, spectralTilt |
| `src/lib/audio/bridge.ts` | masterGain.gain.setTargetAtTime | muted flag determines effective gain | WIRED | `const effectiveGain = voiceParams.muted ? 0 : voiceParams.masterGain` present |
| `src/App.svelte` | `src/lib/audio/bridge.ts` | $effect calls bridge.syncParams() | WIRED | $effect reads 18 voiceParams fields then calls bridge.syncParams() |
| `src/App.svelte` | `src/lib/data/qwerty-map.ts` | keydown handler maps event.code | WIRED | QWERTY_MAP[event.code] in handleKeyDown |
| `src/lib/data/voice-presets.ts` | `src/lib/audio/state.svelte.ts` | loadPreset writes formant fields | PARTIAL | f1-f4 freq/BW written; f0Default NOT written (gap) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| ExpressionControls.svelte | voiceParams.vibratoRate | LabeledSlider onchange writes to store | Yes — store is reactive | FLOWING |
| PhonationMode.svelte | voiceParams.openQuotient | loadMode() writes PHONATION_PRESETS values | Yes — preset data is non-empty | FLOWING |
| PitchSection.svelte | voiceParams.f0 | QWERTY + piano click write to store | Yes — store is reactive | FLOWING |
| VoicePresets.svelte | voiceParams.f0 (on preset load) | NOT written in loadPreset() | No — f0Default never applied | DISCONNECTED (gap) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All DSP unit tests pass | `npx vitest run` | 89/89 tests passing, 9 test files | PASS |
| vibrato.ts exports vibratoModulation | grep "export function vibratoModulation" | Found at line 11 | PASS |
| bridge.ts includes mute pattern | grep "voiceParams.muted ? 0" | Found at line 141 | PASS |
| glottal-processor.ts has no imports | grep "^import" in worklet file | No imports found | PASS |
| VoicePresets.svelte missing f0 assignment | grep "f0Default" in VoicePresets.svelte | Not found | FAIL |
| App.svelte reads voiceParams.muted in $effect | grep "vibratoRate\|muted" in App.svelte | Both found at lines 29-33 | PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|---------|
| AUDIO-02 | 02-01, 02-02, 02-03, 02-04 | User can control glottal parameters: open quotient / phonation type | SATISFIED | PHONATION_PRESETS sets OQ/aspiration/spectralTilt via PhonationMode component; worklet receives and applies them |
| AUDIO-04 | 02-01, 02-03 | Vibrato with controllable rate (Hz) and extent (cents), applied to f0 | SATISFIED | vibratoModulation inlined in worklet; bridge sends vibratoRate/vibratoExtent; ExpressionControls UI |
| AUDIO-05 | 02-01, 02-03 | Jitter (random pitch perturbation) with controllable amount | SATISFIED | computeJitterOffset logic inlined in worklet at phase wrap; jitterAmount forwarded by bridge; Jitter slider in ExpressionControls |
| AUDIO-07 | 02-02, 02-03, 02-04, 02-05 | Play/stop transport, master volume, and mute respond instantly | SATISFIED | TransportBar play/stop via onplayclick; mute via 5ms ramp; volume slider writes masterGain |
| VOICE-01 | 02-01, 02-04, 02-05 | User can set f0 via a dedicated pitch control | SATISFIED | PitchSection piano click and drag sets voiceParams.f0 = midiToHz(midi); f0 in range 55-1100 Hz |
| VOICE-02 | 02-02, 02-05 | User can drive f0 from QWERTY piano mapping | SATISFIED | App.svelte handleKeyDown maps QWERTY_MAP[event.code] to midiToHz(midi); guards for repeat, text input, playing state |
| VOICE-03 | 02-01, 02-04 | On-screen readout shows f0 as Hz, note name with octave, and cents deviation | SATISFIED | formatPitchReadout produces "Hz . NoteName . cents"; split and accent-colored in PitchSection |
| VOICE-04 | 02-02, 02-04 | Voice presets set f0 range + starting formants for 7 voice types | BLOCKED (partial) | 7 presets exist with f0Default and formant values. VoicePresets.svelte loads formants correctly but does NOT apply f0Default. ROADMAP SC4 says "f0 range and starting formants load together" — partial only. |
| VOICE-05 | 02-02, 02-04 | Phonation presets (breathy/modal/flow/pressed) load matching glottal defaults | SATISFIED | PHONATION_PRESETS has 4 modes; PhonationMode.svelte loadMode() sets OQ, aspiration, spectralTilt |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|---------|--------|
| `src/lib/components/VoicePresets.svelte` | 8-17 | loadPreset() does not assign voiceParams.f0 = preset.f0Default | BLOCKER | ROADMAP SC4 requires f0 and formants together; only formants load |

No other stubs, TODOs, or placeholder patterns found across phase files. All DSP implementations are substantive and wired.

### Human Verification Required

**1. Voice Preset f0 Behavior Decision**

**Test:** Click "Soprano" preset, observe whether f0 changes to ~260 Hz
**Expected:** Per ROADMAP SC4: f0 should load to preset.f0Default. Per user preference (02-06): f0 should not change.
**Why human:** This is a design decision — the ROADMAP contract says load together, human verification accepted the deviation. A developer decision is needed to either fix the implementation or add a formal override to this VERIFICATION.md.

**2. Vibrato Audibility**

**Test:** Start audio, set Vibrato Rate to 5 Hz and Vibrato Extent to 50 cents; listen
**Expected:** Clearly audible 5 Hz pitch wobble, no zipper noise while dragging sliders
**Why human:** Audio quality requires listening

**3. Phonation Mode Audibility**

**Test:** Switch between Breathy and Pressed; listen for breathiness vs creakiness
**Expected:** Breathy = airy (OQ=0.7, aspiration=0.15, tilt=18 dB); Pressed = tight (OQ=0.4, aspiration=0.01, tilt=0)
**Why human:** Subjective timbral difference requires human ear

**4. QWERTY Keyboard**

**Test:** With audio playing, press Z (C3), X (D3), C (E3), Q (C4); press and hold does not retrigger
**Expected:** Pitch changes per corrected diatonic layout; held key does not spam pitch updates; released key note stays
**Why human:** Interactive keyboard behavior and visual piano key highlights require browser interaction

**5. Mute Click/Pop**

**Test:** Mute and unmute rapidly while audio is playing
**Expected:** No audible click or pop — 5ms ramp should prevent artifacts
**Why human:** Audio transient artifacts require human ear

### Gaps Summary

**1 gap blocking full goal achievement:**

**VOICE-04 / ROADMAP SC4 — Voice preset does not load f0**

The ROADMAP success criterion is explicit: "User can load voice-type presets and hear the f₀ range and starting formants load together." The human verification in Plan 06 changed this to formants-only as a user preference (the deviation is documented in 02-06 SUMMARY). However, this creates a contract violation against the phase's success criteria.

Two resolutions are available:

**Option A — Fix the implementation:** Add `voiceParams.f0 = preset.f0Default;` to `loadPreset()` in `src/lib/components/VoicePresets.svelte` (and optionally re-add the phonation reset per D-13).

**Option B — Accept the deviation formally:** Add an override to this VERIFICATION.md frontmatter:

```yaml
overrides:
  - must_have: "User can load voice-type presets and hear the f0 range and starting formants load together"
    reason: "User preference expressed during human verification (02-06): preserving current pitch and phonation mode when switching voice type provides better UX for singers who know their own pitch. Formants-only preset loading still achieves pedagogical goal of showing voice-type timbral differences."
    accepted_by: "developer-username"
    accepted_at: "2026-04-12T00:00:00Z"
```

The gap is flagged for developer decision. Structured in frontmatter above for `/gsd-plan-phase --gaps`.

---

_Verified: 2026-04-12T13:30:00Z_
_Verifier: Claude (gsd-verifier)_
