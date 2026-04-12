# Phase 2: Voice Controls & Expression - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

The engine gains the full expressive palette — pitch control, vibrato, jitter, phonation, transport, and voice/phonation presets — all driven from the single VoiceParams store. The app becomes audibly "a voice" rather than a tone generator, even though the visualizations do not yet exist.

</domain>

<decisions>
## Implementation Decisions

### Pitch Control & Keyboard
- **D-01:** Primary f0 control is a vertical slider overlaid on a piano keyboard visual, log-scale so semitones feel even
- **D-02:** f0 range is 55-1100 Hz (A1-C6), covering extreme bass through coloratura soprano
- **D-03:** QWERTY piano mapping uses the standard DAW layout (Z=C, S=C#, X=D, D=D#, C=E... bottom two rows), mapping ~2 octaves
- **D-04:** QWERTY key letters shown on the piano keys in the visual, toggleable
- **D-05:** Pitch readout shows all three formats inline: "220 Hz · A3 · +0c" (Hz, note name with octave, cents deviation)

### Vibrato & Jitter
- **D-06:** Vibrato LFO runs inside the GlottalProcessor worklet at audio rate for sample-accurate f0 modulation. Parameters (rate Hz, extent cents) sent via postMessage
- **D-07:** Default vibrato: rate 5 Hz, extent 10 cents (subtle, not classical singing vibrato)
- **D-08:** Jitter uses per-cycle random f0 offset (once per glottal period, not per sample), controlled by a single "amount" parameter (0-1)

### Phonation Modes
- **D-09:** Four phonation modes: Breathy, Modal, Flow, Pressed — using standard voice science terminology as labels
- **D-10:** Each mode sets three parameters: openQuotient, aspirationLevel, and a new spectralTilt parameter
- **D-11:** Phase 2 exposes only the 4 named presets. Individual OQ/aspiration/tilt sliders are deferred to Phase 6 expert mode (UI-03)

### Voice Presets
- **D-12:** Voice-type presets displayed as a horizontal button group / chips: Soprano, Mezzo, Alto, Tenor, Baritone, Bass, Child
- **D-13:** Loading a voice preset sets f0 to the voice type's comfortable default, loads typical formant values, and resets phonation to modal — a complete "voice reset"

### Transport & Volume
- **D-14:** Separate mute toggle button next to the volume slider (standard media player pattern — instant mute without losing volume position)
- **D-15:** Play/stop, master volume, and mute respond instantly from any UI state (AUDIO-07)

### UI Layout
- **D-16:** Controls grouped into labeled sections: Pitch (slider + piano + readout + keyboard), Voice (preset buttons), Expression (vibrato rate/extent, jitter amount), Phonation (mode buttons), Transport (play/stop/mute/volume)

### Claude's Discretion
- Exact voice preset data (f0 defaults, formant values per voice type) — use published pedagogical ranges
- Spectral tilt implementation in the Rosenberg worklet
- Exact phonation preset parameter values for each mode
- Piano visual design (number of visible keys, key sizing, styling)
- QWERTY key label toggle mechanism (button, checkbox, or auto-hide)
- Section layout proportions and spacing

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — AUDIO-02, AUDIO-04, AUDIO-05, AUDIO-07, VOICE-01, VOICE-02, VOICE-03, VOICE-04, VOICE-05 define the acceptance criteria for this phase

### Technology Stack
- `CLAUDE.md` §Technology Stack — AudioWorklet gotchas, version compatibility, DSP math helpers, glottal pulse model notes

### Prior Phase Context
- `.planning/phases/01-audio-closed-loop/01-CONTEXT.md` — Phase 1 decisions on store shape, parallel formant topology, AudioBridge architecture

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/audio/state.svelte.ts` — VoiceParams class with $state runes. Needs new fields: vibratoRate, vibratoExtent, jitterAmount, spectralTilt, phonation mode, muted flag
- `src/lib/audio/bridge.ts` — AudioBridge with postMessage forwarding. Needs to forward new vibrato/jitter/tilt params to worklet
- `src/lib/audio/worklet/glottal-processor.ts` — GlottalProcessor with Rosenberg pulse. Needs vibrato LFO, per-cycle jitter, and spectral tilt added to the process() loop
- `src/lib/audio/dsp/rosenberg.ts` — Pure Rosenberg sample function, testable in isolation
- `src/lib/types.ts` — FormantParams and VowelTarget interfaces

### Established Patterns
- Svelte 5 `$state` rune class as single source of truth (VoiceParams singleton)
- `$effect` in App.svelte watches all reactive fields and calls bridge.syncParams()
- postMessage for worklet-bound params (f0, aspirationLevel, openQuotient)
- `setTargetAtTime` for BiquadFilterNode and GainNode params (zipper-free)

### Integration Points
- VoiceParams store: add new fields for vibrato, jitter, spectral tilt, phonation mode, mute
- AudioBridge.syncParams(): extend postMessage payload with new params
- GlottalProcessor.process(): add vibrato LFO and jitter to f0 modulation, add spectral tilt filtering
- App.svelte: replace minimal Phase 1 UI with grouped sections layout

</code_context>

<specifics>
## Specific Ideas

- The pitch slider overlaid on a piano keyboard should feel like a combined visual+control — the piano gives spatial context for the frequency while the slider provides fine control
- Vibrato defaults are deliberately subtle (10 cents) rather than operatic — the user can dial it up
- Voice preset loading is a complete "voice reset" including phonation back to modal — starting fresh with each voice type

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-voice-controls-expression*
*Context gathered: 2026-04-12*
