# Phase 2: Voice Controls & Expression - Research

**Researched:** 2026-04-12
**Domain:** Voice synthesis controls (pitch, vibrato, jitter, phonation, transport, voice presets), Svelte 5 UI components
**Confidence:** HIGH

## Summary

Phase 2 extends the Phase 1 audio engine with expressive voice parameters (vibrato, jitter, phonation modes, spectral tilt) and builds the full control UI. The core DSP work happens inside the existing `GlottalProcessor` AudioWorklet -- adding an audio-rate vibrato LFO, per-cycle jitter, and a one-pole spectral tilt filter. On the UI side, this phase creates ~8 new Svelte components organized into five labeled sections (Transport, Pitch, Voice, Phonation, Expression).

The key technical challenge is implementing the vibrato LFO at audio rate inside the worklet (not via `OscillatorNode.connect()` to a `detune` param, since we generate our own glottal pulse). Spectral tilt uses the classic Klatt one-pole low-pass filter approach. Voice presets are straightforward data tables from published vocal pedagogy literature.

**Primary recommendation:** Implement DSP additions (vibrato LFO, jitter, spectral tilt filter) as pure testable functions in `src/lib/audio/dsp/`, inline them into the worklet processor, and test them with Vitest in Node. Build UI components bottom-up starting with reusable primitives (`LabeledSlider`, `ChipGroup`) then compose into section components.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Primary f0 control is a vertical slider overlaid on a piano keyboard visual, log-scale so semitones feel even
- **D-02:** f0 range is 55-1100 Hz (A1-C6), covering extreme bass through coloratura soprano
- **D-03:** QWERTY piano mapping uses the standard DAW layout (Z=C, S=C#, X=D, D=D#, C=E... bottom two rows), mapping ~2 octaves
- **D-04:** QWERTY key letters shown on the piano keys in the visual, toggleable
- **D-05:** Pitch readout shows all three formats inline: "220 Hz . A3 . +0c" (Hz, note name with octave, cents deviation)
- **D-06:** Vibrato LFO runs inside the GlottalProcessor worklet at audio rate for sample-accurate f0 modulation. Parameters (rate Hz, extent cents) sent via postMessage
- **D-07:** Default vibrato: rate 5 Hz, extent 10 cents (subtle, not classical singing vibrato)
- **D-08:** Jitter uses per-cycle random f0 offset (once per glottal period, not per sample), controlled by a single "amount" parameter (0-1)
- **D-09:** Four phonation modes: Breathy, Modal, Flow, Pressed -- using standard voice science terminology as labels
- **D-10:** Each mode sets three parameters: openQuotient, aspirationLevel, and a new spectralTilt parameter
- **D-11:** Phase 2 exposes only the 4 named presets. Individual OQ/aspiration/tilt sliders are deferred to Phase 6 expert mode (UI-03)
- **D-12:** Voice-type presets displayed as a horizontal button group / chips: Soprano, Mezzo, Alto, Tenor, Baritone, Bass, Child
- **D-13:** Loading a voice preset sets f0 to the voice type's comfortable default, loads typical formant values, and resets phonation to modal -- a complete "voice reset"
- **D-14:** Separate mute toggle button next to the volume slider (standard media player pattern -- instant mute without losing volume position)
- **D-15:** Play/stop, master volume, and mute respond instantly from any UI state (AUDIO-07)
- **D-16:** Controls grouped into labeled sections: Pitch (slider + piano + readout + keyboard), Voice (preset buttons), Expression (vibrato rate/extent, jitter amount), Phonation (mode buttons), Transport (play/stop/mute/volume)

### Claude's Discretion
- Exact voice preset data (f0 defaults, formant values per voice type) -- use published pedagogical ranges
- Spectral tilt implementation in the Rosenberg worklet
- Exact phonation preset parameter values for each mode
- Piano visual design (number of visible keys, key sizing, styling)
- QWERTY key label toggle mechanism (button, checkbox, or auto-hide)
- Section layout proportions and spacing

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUDIO-02 | Glottal parameters: open quotient / phonation type with plain-language labels | Phonation mode presets (D-09/D-10), spectral tilt filter, OQ values from voice science literature |
| AUDIO-04 | Vibrato with controllable rate (Hz) and extent (cents) applied to f0 | Audio-rate sine LFO inside worklet, cents-to-frequency-ratio math |
| AUDIO-05 | Jitter (random pitch perturbation) with controllable amount | Per-cycle random offset at glottal period boundaries |
| AUDIO-07 | Play/stop transport, master volume, and mute respond instantly | Muted flag in VoiceParams, GainNode.setTargetAtTime for instant mute |
| VOICE-01 | User can set f0 via a dedicated pitch control | Log-scale slider 55-1100 Hz, piano keyboard overlay |
| VOICE-02 | User can drive f0 from a QWERTY piano mapping | Standard DAW 2-octave layout, keydown/keyup handlers |
| VOICE-03 | On-screen readout shows f0 as Hz, note name with octave, and cents deviation | Hz-to-note conversion math (A4=440 reference) |
| VOICE-04 | Voice presets set f0 range + starting formants for voice types | Published formant data per voice type, preset data structure |
| VOICE-05 | Phonation presets load matching glottal defaults | Four modes with OQ, aspiration, spectral tilt parameter sets |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tech stack**: Svelte 5 + TypeScript + Vite (plain Svelte, NOT SvelteKit)
- **Audio engine**: Web Audio API + AudioWorklet for custom DSP
- **Testing**: Vitest for unit tests, Playwright for E2E; DSP logic as pure functions tested in Node
- **No libraries**: No Tone.js, no Chart.js, no full d3 -- cherry-pick `d3-scale` only
- **Formant topology**: Parallel BiquadFilterNode (established in Phase 1)
- **Parameter smoothing**: `setTargetAtTime` for native nodes, audio-rate smoothing in worklet
- **Worklet gotcha**: Cannot use ES module imports in AudioWorkletGlobalScope -- all logic inlined
- **AudioContext**: Must resume on user gesture (AUDIO-08, already handled in Phase 1)

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Svelte | 5.55.x | UI framework with $state runes | Installed [VERIFIED: package.json] |
| TypeScript | 6.0.x | Type safety | Installed [VERIFIED: package.json] |
| Vite | 8.0.x | Dev server + bundler | Installed [VERIFIED: package.json] |
| Vitest | 4.1.x | Unit tests | Installed [VERIFIED: package.json] |

### No New Dependencies Required

Phase 2 requires zero new npm packages. All functionality is built with:
- Native Web Audio API nodes (already used)
- Svelte 5 components with `$state` runes (already used)
- Pure TypeScript math functions (Hz/note conversion, LFO, filter coefficients)
- `d3-scale` is NOT needed yet (log-scale slider can use `Math.log`/`Math.exp` directly for the 55-1100 Hz range) [ASSUMED]

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    audio/
      bridge.ts              # Extended: new params in syncParams()
      state.svelte.ts        # Extended: vibrato, jitter, phonation, mute fields
      dsp/
        rosenberg.ts          # Existing
        noise.ts              # Existing
        formant-utils.ts      # Existing
        vibrato.ts            # NEW: pure LFO sample function
        spectral-tilt.ts      # NEW: one-pole tilt filter, pure function
        pitch-utils.ts        # NEW: Hz<->note, cents, log-scale mapping
        jitter.ts             # NEW: per-cycle jitter generation
      worklet/
        glottal-processor.ts  # Extended: vibrato LFO, jitter, spectral tilt
    data/
      voice-presets.ts        # NEW: preset data for 7 voice types
      phonation-presets.ts    # NEW: preset data for 4 phonation modes
      qwerty-map.ts           # NEW: key-to-note mapping
    components/
      TransportBar.svelte     # NEW
      PitchSection.svelte     # NEW
      PianoKeyboard.svelte    # NEW
      VoicePresets.svelte     # NEW
      PhonationMode.svelte    # NEW
      ExpressionControls.svelte  # NEW
      LabeledSlider.svelte    # NEW (reusable)
      ChipGroup.svelte        # NEW (reusable)
    types.ts                  # Extended: new type definitions
  App.svelte                  # Rewritten: section-based layout
```

### Pattern 1: Audio-Rate Vibrato LFO in Worklet

**What:** Sine-wave LFO computed sample-by-sample inside the worklet's `process()` loop, modulating f0 before the glottal phase increment calculation.

**When to use:** Always -- D-06 locks this as the approach.

**Implementation approach:**
```typescript
// Inside GlottalProcessor.process():
// vibratoPhase advances at vibratoRate/sampleRate per sample
// f0Mod = f0 * 2^(vibratoExtentCents * sin(2*PI*vibratoPhase) / 1200)
// phaseIncrement = f0Mod / sampleRate
```

The key math: cents deviation maps to a frequency ratio via `2^(cents/1200)`. A vibrato extent of 10 cents means the frequency oscillates between `f0 * 2^(-10/1200)` and `f0 * 2^(10/1200)`, roughly +/- 0.58%. [VERIFIED: standard music theory cents definition]

### Pattern 2: Per-Cycle Jitter

**What:** Random f0 offset applied once per glottal period (when phase wraps from 1.0 back to 0), not per sample.

**When to use:** D-08 locks this approach.

**Implementation approach:**
```typescript
// When phase wraps (phase >= 1.0):
//   jitterOffset = (Math.random() * 2 - 1) * jitterAmount * f0 * 0.03
//   f0Effective = f0 + jitterOffset
// jitterAmount 0-1 maps to 0-3% max f0 deviation
```

The 3% maximum deviation at amount=1.0 produces audible breathiness/roughness without destabilizing the pitch. This is a standard approach in voice synthesis. [ASSUMED -- exact max percentage is Claude's discretion]

### Pattern 3: Spectral Tilt as One-Pole Low-Pass Filter

**What:** A first-order IIR low-pass filter applied to the glottal source signal inside the worklet, before output. The filter attenuates high frequencies to model different phonation types.

**When to use:** D-10 requires spectralTilt as a parameter affecting glottal source character.

**Implementation (from klatt-syn reference):**
```typescript
// One-pole low-pass: y[n] = a * x[n] + b * y[n-1]
// Where coefficients are computed from:
//   target gain g at frequency f (e.g., 3000 Hz)
//   w = 2 * PI * f / sampleRate
//   q = (1 - g^2 * cos(w)) / (1 - g^2)
//   b = q - sqrt(q^2 - 1)
//   a = (1 - b) * extraGain
```
[VERIFIED: klatt-syn source code on GitHub, `LpFilter1.set()` method]

The `tiltDb` parameter (0 = no tilt, up to ~24 dB at 3 kHz) maps to gain `g = dbToLin(-tiltDb)`. This is computationally trivial -- one multiply, one add per sample.

### Pattern 4: Log-Scale Pitch Slider (55-1100 Hz)

**What:** Slider position [0, 1] maps logarithmically to [55, 1100] Hz so each semitone occupies equal visual distance.

**Implementation:**
```typescript
// Position to Hz (log scale):
function sliderToHz(position: number): number {
  const minLog = Math.log(55);
  const maxLog = Math.log(1100);
  return Math.exp(minLog + position * (maxLog - minLog));
}

// Hz to position:
function hzToSlider(hz: number): number {
  const minLog = Math.log(55);
  const maxLog = Math.log(1100);
  return (Math.log(hz) - minLog) / (maxLog - minLog);
}
```
[VERIFIED: standard logarithmic mapping formula]

### Pattern 5: Hz to Note Name Conversion

**What:** Convert any frequency to its nearest note name, octave, and cents deviation from that note.

**Implementation:**
```typescript
// A4 = 440 Hz, MIDI note 69
// MIDI note number (fractional) = 69 + 12 * log2(hz / 440)
// Nearest integer note = round(midiNote)
// Cents deviation = (midiNote - nearestNote) * 100
// Note name from: ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][note % 12]
// Octave from: floor(note / 12) - 1
```
[VERIFIED: standard MIDI-to-frequency formula, A4=440 Hz reference]

### Pattern 6: QWERTY Piano Key Mapping

**What:** Standard DAW-style 2-octave mapping using bottom two keyboard rows + top row.

**Implementation (per D-03 and UI-SPEC):**
```typescript
// Lower octave (e.g., starting at C3):
// Z=C, S=C#, X=D, D=D#, C=E, F=F, V=F#, G=G, B=G#, N=A, J=A#, M=B

// Upper octave (e.g., starting at C4):
// Q=C, 2=C#, W=D, 3=D#, E=E, 4=F, R=F#, 5=G, T=G#, 6=A, Y=A#, 7=B

// Note to frequency: 440 * 2^((midiNote - 69) / 12)
```
Use `event.code` (e.g., `KeyZ`, `KeyS`) not `event.key` for layout independence. Filter out `event.repeat === true`. [CITED: UI-SPEC interaction contract]

### Anti-Patterns to Avoid
- **Using OscillatorNode for vibrato LFO:** Cannot connect to a custom worklet's internal f0 -- the LFO must run inside the worklet. OscillatorNode.connect() only works with AudioParam targets on other native nodes.
- **Per-sample jitter:** Applying random noise every sample creates white-noise FM, not natural vocal jitter. Real jitter is per-glottal-cycle.
- **Storing UI-derived state separately from VoiceParams:** All audio-affecting parameters MUST live in the VoiceParams singleton (LINK-02). UI components read/write directly to it.
- **Debouncing slider input:** Don't debounce. Write directly to the store; the audio bridge's `setTargetAtTime` handles smoothing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Log-scale mapping | Complex interpolation library | `Math.log`/`Math.exp` with min/max bounds | 4 lines of code, exact math |
| Hz-to-note conversion | Lookup tables | Standard MIDI formula: `69 + 12*log2(hz/440)` | Exact, no edge cases |
| One-pole filter coefficients | General IIR filter library | Klatt-syn's `LpFilter1` formula (inline) | 5 lines, well-documented in literature |
| Cents-to-ratio conversion | Music theory library | `2^(cents/1200)` | One line |
| QWERTY key mapping | Keyboard library (AudioKeys) | Static lookup object (~30 entries) | Zero dependencies, trivial |

**Key insight:** All the math in this phase is simple closed-form formulas. No libraries are needed beyond what's already installed.

## Common Pitfalls

### Pitfall 1: Vibrato LFO Phase Discontinuity on Rate Change
**What goes wrong:** If you reset the LFO phase when the user changes vibrato rate, you hear a click/pop in the pitch.
**Why it happens:** Abrupt phase change causes a step in the frequency modulation signal.
**How to avoid:** Keep the LFO phase continuous. When rate changes, just change the phase increment -- don't reset phase to 0. Apply smoothing to the rate parameter itself.
**Warning signs:** Audible click when dragging the vibrato rate slider.

### Pitfall 2: Spectral Tilt Filter State When Switching Phonation
**What goes wrong:** Filter state (the `y[n-1]` memory) from the previous phonation mode causes a transient pop when coefficients change abruptly.
**Why it happens:** The one-pole filter's internal state was appropriate for old coefficients but produces a discontinuity with new ones.
**How to avoid:** Smooth the tilt parameter over ~10ms (use exponential smoothing in the worklet, similar to how f0 is smoothed). Do NOT reset filter state -- let it converge naturally.
**Warning signs:** Pop/click when clicking phonation mode buttons while audio is playing.

### Pitfall 3: QWERTY Event Conflicts
**What goes wrong:** Keyboard events trigger piano notes while the user is typing in a hypothetical text field, or browser shortcuts fire.
**Why it happens:** Global `keydown` listener with no focus context check.
**How to avoid:** Only process QWERTY piano events when no text input/textarea is focused. Check `document.activeElement` tag name. Also call `event.preventDefault()` only for mapped keys to avoid blocking browser shortcuts for unmapped keys.
**Warning signs:** Notes trigger while typing, or Ctrl+Z stops working.

### Pitfall 4: Mute/Volume Interaction Bug
**What goes wrong:** Unmuting restores volume to 0 because the mute implementation set `masterGain` to 0 directly.
**Why it happens:** Mute wrote to the same field as volume.
**How to avoid:** Use a separate `muted` boolean flag. When muted, the bridge applies gain 0 via `setTargetAtTime`. When unmuted, restore from `voiceParams.masterGain`. The volume slider position is preserved because it never changed.
**Warning signs:** After mute/unmute cycle, volume slider and actual volume disagree.

### Pitfall 5: Voice Preset Loads Causing Audio Glitch
**What goes wrong:** Loading a voice preset changes f0, all formants, and phonation simultaneously, causing multiple `postMessage` calls in one tick and a momentary weird sound.
**Why it happens:** Each `$state` write triggers separate sync, and the worklet processes them at different times.
**How to avoid:** Batch all preset changes into a single store update, and ensure `syncParams()` sends all params in one `postMessage`. The existing `$effect` in App.svelte already batches because Svelte 5 batches synchronous state changes within the same microtask.
**Warning signs:** Brief squawk when clicking voice presets.

### Pitfall 6: event.key vs event.code for QWERTY Mapping
**What goes wrong:** On non-QWERTY keyboard layouts (AZERTY, Dvorak), `event.key` returns different characters, breaking the mapping.
**Why it happens:** `event.key` reflects the character produced, not the physical key position.
**How to avoid:** Use `event.code` (e.g., `KeyZ`, `KeyS`, `Digit2`) which always reflects the physical key position regardless of layout.
**Warning signs:** Keys don't match expected notes on non-US keyboard layouts.

## Code Examples

### VoiceParams Store Extension
```typescript
// New fields to add to VoiceParams class in state.svelte.ts
// Source: D-06, D-07, D-08, D-09, D-10, D-14

// Vibrato (D-06, D-07)
vibratoRate = $state(5);        // Hz, LFO frequency
vibratoExtent = $state(10);     // cents, LFO depth

// Jitter (D-08)
jitterAmount = $state(0);       // 0-1

// Phonation (D-09, D-10)
phonationMode = $state<'breathy' | 'modal' | 'flow' | 'pressed'>('modal');
spectralTilt = $state(0);       // dB attenuation at 3 kHz (0-24 range)

// Transport (D-14)
muted = $state(false);

// Voice preset tracking (D-12)
voicePreset = $state<string | null>(null);  // null = custom
```

### Phonation Preset Data
```typescript
// Source: Voice science literature on phonation types
// [ASSUMED -- exact values are Claude's discretion per CONTEXT.md]

export interface PhonationPreset {
  label: string;
  openQuotient: number;    // 0.3-0.8
  aspirationLevel: number; // 0-1
  spectralTilt: number;    // dB at 3 kHz, 0-24
}

export const PHONATION_PRESETS: Record<string, PhonationPreset> = {
  breathy:  { label: 'Breathy',  openQuotient: 0.7,  aspirationLevel: 0.15, spectralTilt: 18 },
  modal:    { label: 'Modal',    openQuotient: 0.6,  aspirationLevel: 0.03, spectralTilt: 6  },
  flow:     { label: 'Flow',     openQuotient: 0.55, aspirationLevel: 0.02, spectralTilt: 3  },
  pressed:  { label: 'Pressed',  openQuotient: 0.4,  aspirationLevel: 0.01, spectralTilt: 0  },
};
```

Rationale for values:
- **Breathy**: High OQ (~0.7) = glottis open longer, high aspiration = audible air, steep tilt = weak high harmonics. [CITED: Garellek, "Phonetics of Voice", UCSD -- breathy voice has steepest tilt, high OQ]
- **Modal**: Standard values, moderate tilt. OQ ~0.5-0.6 is textbook modal. [CITED: Esposito & Khan 2020 -- modal OQ ~0.5]
- **Flow**: Similar to modal but slightly less tilt and lower aspiration -- the "efficient" phonation favored in classical singing pedagogy. [ASSUMED]
- **Pressed**: Low OQ (~0.4) = shorter open phase, minimal aspiration, no tilt = strong high harmonics. [CITED: Garellek -- pressed/tense voice has shallowest tilt]

### Voice Type Preset Data
```typescript
// Source: Published vocal ranges + Hillenbrand-derived formant centroids
// [ASSUMED -- exact formant values are Claude's discretion]

export interface VoicePreset {
  label: string;
  f0Default: number;     // Hz, comfortable speaking/singing pitch
  f1: number; f2: number; f3: number; f4: number;  // Formant Hz for neutral /a/
  f1BW: number; f2BW: number; f3BW: number; f4BW: number;  // Bandwidths
}

export const VOICE_PRESETS: Record<string, VoicePreset> = {
  soprano:  { label: 'Soprano',  f0Default: 260, f1: 850, f2: 1220, f3: 2810, f4: 3600, f1BW: 100, f2BW: 120, f3BW: 180, f4BW: 350 },
  mezzo:    { label: 'Mezzo',    f0Default: 220, f1: 820, f2: 1180, f3: 2750, f4: 3500, f1BW: 100, f2BW: 120, f3BW: 180, f4BW: 350 },
  alto:     { label: 'Alto',     f0Default: 196, f1: 800, f2: 1150, f3: 2700, f4: 3400, f1BW: 95,  f2BW: 115, f3BW: 175, f4BW: 340 },
  tenor:    { label: 'Tenor',    f0Default: 165, f1: 750, f2: 1100, f3: 2550, f4: 3300, f1BW: 90,  f2BW: 110, f3BW: 170, f4BW: 320 },
  baritone: { label: 'Baritone', f0Default: 130, f1: 730, f2: 1090, f3: 2440, f4: 3200, f1BW: 90,  f2BW: 110, f3BW: 170, f4BW: 320 },
  bass:     { label: 'Bass',     f0Default: 98,  f1: 710, f2: 1060, f3: 2350, f4: 3100, f1BW: 85,  f2BW: 105, f3BW: 165, f4BW: 300 },
  child:    { label: 'Child',    f0Default: 260, f1: 1000, f2: 1400, f3: 3300, f4: 4200, f1BW: 110, f2BW: 130, f3BW: 200, f4BW: 400 },
};
```

Rationale: F0 defaults from standard vocal ranges. Formant values scale with vocal tract length -- children have the shortest tracts (highest formants), adult males the longest (lowest). Values are approximate centroids for /a/ vowel. [CITED: Hillenbrand et al. 1995 for general male/female/child scaling; specific values are ASSUMED approximations]

### Extended postMessage Payload
```typescript
// In bridge.ts syncParams():
this.workletNode.port.postMessage({
  type: 'params',
  f0: voiceParams.f0,
  aspirationLevel: voiceParams.aspirationLevel,
  openQuotient: voiceParams.openQuotient,
  vibratoRate: voiceParams.vibratoRate,
  vibratoExtent: voiceParams.vibratoExtent,
  jitterAmount: voiceParams.jitterAmount,
  spectralTilt: voiceParams.spectralTilt,
});
```

### Mute Implementation in Bridge
```typescript
// In bridge.ts syncParams():
const effectiveGain = voiceParams.muted ? 0 : voiceParams.masterGain;
this.masterGain!.gain.setTargetAtTime(effectiveGain, now, 0.005);
// Fast time constant (5ms) for instant mute response
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ScriptProcessorNode for DSP | AudioWorklet | 2018+ | Already using AudioWorklet (Phase 1) |
| event.keyCode for keyboard | event.code | 2020+ | Use event.code for layout-independent key mapping |
| Svelte 4 stores | Svelte 5 $state runes | 2024 | Already using runes (Phase 1) |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | d3-scale not needed for log slider (Math.log/exp sufficient) | Standard Stack | LOW -- could always add d3-scale later if needed |
| A2 | Jitter max deviation of 3% at amount=1.0 is appropriate | Architecture Patterns | LOW -- easily tuned, purely aesthetic |
| A3 | Flow phonation preset values (OQ=0.55, tilt=3) | Code Examples | LOW -- subjective sound quality, easily adjusted |
| A4 | Voice preset formant values are approximate centroids | Code Examples | MEDIUM -- may need tuning by ear, but starting values are reasonable |
| A5 | Spectral tilt range 0-24 dB is sufficient | Code Examples | LOW -- Klatt uses this range, well-established |

## Open Questions

1. **Spectral tilt filter: apply before or after aspiration noise mixing?**
   - What we know: In Klatt 1980, the tilt filter is applied to the voicing source, separate from aspiration. The aspiration noise path has its own gain.
   - What's unclear: Whether applying tilt to the combined signal (Rosenberg + aspiration) would sound better for this simplified model.
   - Recommendation: Apply tilt to the Rosenberg pulse only, before mixing aspiration noise. This matches the Klatt architecture and gives the most predictable control.

2. **Voice preset formant accuracy**
   - What we know: Approximate values based on published literature scaling patterns.
   - What's unclear: Whether these values sound "right" for each voice type without ear-testing.
   - Recommendation: Ship with literature-derived values, tune by ear during implementation. The values are trivially changeable in a data file.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUDIO-02 | Phonation mode sets OQ/aspiration/tilt correctly | unit | `npx vitest run src/lib/data/phonation-presets.test.ts -x` | Wave 0 |
| AUDIO-04 | Vibrato LFO produces correct frequency modulation | unit | `npx vitest run src/lib/audio/dsp/vibrato.test.ts -x` | Wave 0 |
| AUDIO-05 | Jitter applies per-cycle random offset | unit | `npx vitest run src/lib/audio/dsp/jitter.test.ts -x` | Wave 0 |
| AUDIO-07 | Transport/mute affects effective gain correctly | unit | `npx vitest run src/lib/audio/bridge.test.ts -x` | Wave 0 |
| VOICE-01 | Log-scale slider maps 55-1100 Hz correctly | unit | `npx vitest run src/lib/audio/dsp/pitch-utils.test.ts -x` | Wave 0 |
| VOICE-02 | QWERTY map returns correct MIDI notes | unit | `npx vitest run src/lib/data/qwerty-map.test.ts -x` | Wave 0 |
| VOICE-03 | Hz-to-note conversion returns correct name/octave/cents | unit | `npx vitest run src/lib/audio/dsp/pitch-utils.test.ts -x` | Wave 0 |
| VOICE-04 | Voice presets contain valid f0/formant data | unit | `npx vitest run src/lib/data/voice-presets.test.ts -x` | Wave 0 |
| VOICE-05 | Phonation presets have 4 modes with valid params | unit | `npx vitest run src/lib/data/phonation-presets.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/audio/dsp/vibrato.test.ts` -- covers AUDIO-04
- [ ] `src/lib/audio/dsp/jitter.test.ts` -- covers AUDIO-05
- [ ] `src/lib/audio/dsp/pitch-utils.test.ts` -- covers VOICE-01, VOICE-03
- [ ] `src/lib/data/qwerty-map.test.ts` -- covers VOICE-02
- [ ] `src/lib/data/voice-presets.test.ts` -- covers VOICE-04
- [ ] `src/lib/data/phonation-presets.test.ts` -- covers AUDIO-02, VOICE-05

Existing test infrastructure (vitest.config.ts, rosenberg.test.ts, formant-utils.test.ts) covers framework setup.

## Security Domain

Security is minimally applicable to this phase. This is a client-side-only audio application with no backend, no user data, no authentication.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A |
| V3 Session Management | No | N/A |
| V4 Access Control | No | N/A |
| V5 Input Validation | Minimal | Clamp slider values to defined ranges in store setters |
| V6 Cryptography | No | N/A |

The only security-relevant concern is input validation on slider ranges (e.g., f0 clamped to 55-1100 Hz, volume to 0-1) to prevent NaN or Infinity propagating to the audio graph, which could cause browser audio glitches.

## Sources

### Primary (HIGH confidence)
- Phase 1 codebase: `src/lib/audio/` -- examined all existing source files for integration points
- [klatt-syn GitHub repo](https://github.com/chdh/klatt-syn) -- spectral tilt filter implementation (`LpFilter1.set()` method) [VERIFIED: source fetched via GitHub API]
- [Klatt Synthesizer Parameters - Berkeley Phonlab](https://linguistics.berkeley.edu/plab/guestwiki/index.php?title=Klatt_Synthesizer_Parameters) -- TL parameter: one-pole low-pass, tilt in dB at 3 kHz [VERIFIED: WebFetch]

### Secondary (MEDIUM confidence)
- [Garellek, "Phonetics of Voice"](https://idiom.ucsd.edu/~mgarellek/files/Garellek_Phonetics_of_Voice_Handbook_final.pdf) -- phonation type OQ and spectral tilt relationships [CITED]
- [Esposito & Khan 2020](https://www.reed.edu/linguistics/khan/assets/Esposito%20Khan%202020%20The%20cross-linguistic%20patterns%20of%20phonation%20types.pdf) -- modal OQ ~0.5, cross-linguistic phonation patterns [CITED]
- [Voice Classification - voicescience.org](https://www.voicescience.org/lexicon/voice-classification/) -- fundamental frequency ranges by voice type [CITED]
- [DPA Microphones - Singing voices](https://www.dpamicrophones.com/dict/singing-voices-and-frequencies/) -- voice type frequency ranges [CITED]

### Tertiary (LOW confidence)
- Voice preset formant values are approximate extrapolations from Hillenbrand 1995 scaling patterns [ASSUMED]
- Flow phonation parameter values lack a specific published reference [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, extends existing Phase 1 code
- Architecture: HIGH -- vibrato LFO, spectral tilt, jitter are all well-understood DSP patterns with published implementations
- Pitfalls: HIGH -- based on real Web Audio development experience and established patterns
- Voice/phonation preset data: MEDIUM -- values are literature-informed but will need ear-testing

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable domain, no fast-moving dependencies)
