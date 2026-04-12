# Roadmap: Formant Canvas

## Overview

Formant Canvas is built outward from a single proof: move a control, hear the voice change. Phase 1 delivers that minimum closed loop end-to-end (Svelte 5 store → AudioWorklet → BiquadFilterNode formant chain → one slider) so the architecture is verified before any visualization code is written. Phases 2 and 3 then fill out the audio-side controls (pitch, vibrato, transport, presets) and the two signature visualizations (piano harmonics, F1/F2 vowel chart), at which point the Core Value — linked updates across audio and every view — becomes testable and is verified as a hard gate at the end of Phase 3. Phase 4 layers vocal strategies on top of that linked substrate (strategies require audio, piano, and F1/F2 all correct before bugs are isolatable). Phase 5 adds persistence (presets, URL sharing, undo/redo). Phase 6 is the pedagogy-UI phase: progressive disclosure, tooltips, expert mode, accessibility, cross-browser polish — not "polish" in the decorative sense but the layer that makes the tool usable by non-experts, budgeted accordingly. Every phase delivers something audibly or visually verifiable; no phase exists purely for plumbing.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Audio Closed Loop** - Svelte 5 store + AudioWorklet glottal source + BiquadFilterNode formant chain + one slider audibly changes the sound
- [ ] **Phase 2: Voice Controls & Expression** - Pitch, vibrato/jitter, phonation control, transport, and voice/phonation presets driving the engine
- [ ] **Phase 3: Linked Visualizations (Piano + F1/F2)** - Piano harmonics view, F1/F2 vowel chart with Hillenbrand background and drag-to-tune, formant range overlays; LINK-01/02/03 verified
- [ ] **Phase 4: Vocal Strategies** - R1:f0, R1:2f0, R1:3f0, R2:2f0, R2:3f0, singer's-formant cluster with overlay and auto-tune modes
- [ ] **Phase 5: Presets, Sharing, Undo/Redo** - URL-encoded state sharing, 32-step history, expanded preset system
- [ ] **Phase 6: Pedagogy UI & Polish** - Progressive disclosure, tooltips, expert mode, responsive layout, touch/pointer support, cross-browser hardening

## Phase Details

### Phase 1: Audio Closed Loop
**Goal**: A working voice synthesizer in the browser: move a slider, hear the sound change. The Svelte 5 `$state` single-source-of-truth store, AudioWorklet glottal source, BiquadFilterNode F1-F4 formant chain, and audio bridge are all stood up end-to-end so the architecture is proven before any visualization code exists.
**Depends on**: Nothing (first phase)
**Requirements**: AUDIO-01, AUDIO-03, AUDIO-06, AUDIO-08, LINK-02
**Success Criteria** (what must be TRUE):
  1. User opens the app in Chrome, Firefox, or Safari, clicks a visible "Start audio" affordance, and hears a continuous vowel-like tone
  2. User can move a single formant-frequency slider and the timbre audibly changes in real time with no clicks, zipper noise, or audible glitches
  3. User can refresh the page and the audio resumes cleanly on the next gesture (AudioContext lifecycle is correct)
  4. A single Svelte 5 `$state` store holds all audio parameters; the AudioBridge forwards changes via `setTargetAtTime` and no component owns its own copy of parameter state
**Plans:** 3 plans
Plans:
- [x] 01-01-PLAN.md — Scaffold project + VoiceParams store + DSP pure functions with tests
- [x] 01-02-PLAN.md — AudioWorklet glottal processor + AudioBridge with parallel formant chain
- [x] 01-03-PLAN.md — Minimal UI (play/pause, vowel slider, volume slider) + human verification
**UI hint**: no

### Phase 2: Voice Controls & Expression
**Goal**: The engine gains the full expressive palette — pitch control, vibrato, jitter, phonation, transport, and voice/phonation presets — all driven from the single store. The app becomes audibly "a voice" rather than a tone generator, even though the visualizations do not yet exist.
**Depends on**: Phase 1
**Requirements**: AUDIO-02, AUDIO-04, AUDIO-05, AUDIO-07, VOICE-01, VOICE-02, VOICE-03, VOICE-04, VOICE-05
**Success Criteria** (what must be TRUE):
  1. User can set f₀ via a pitch control and via a QWERTY keyboard piano mapping; an on-screen readout shows Hz, note name with octave, and cents deviation
  2. User can hear vibrato (controllable rate in Hz, extent in cents) and jitter (controllable amount) applied to f₀, with no zipper artifacts while dragging
  3. User can switch between breathy, modal, flow, and pressed phonation with plain-language labels and hear the glottal source change accordingly
  4. User can load voice-type presets (tenor, baritone, bass, soprano, mezzo, alto, child) and hear the f₀ range and starting formants load together
  5. Play, stop, master volume, and mute respond instantly from any UI state
**Plans:** 6 plans
Plans:
- [ ] 02-01-PLAN.md — TDD: DSP pure functions (vibrato, jitter, spectral tilt, pitch utils)
- [ ] 02-02-PLAN.md — VoiceParams store extension + data modules (voice presets, phonation presets, QWERTY map)
- [ ] 02-03-PLAN.md — Extend worklet (vibrato LFO, jitter, spectral tilt) + bridge (new params, mute)
- [ ] 02-04-PLAN.md — UI components (transport, pitch/piano, voice presets, phonation, expression)
- [ ] 02-05-PLAN.md — App.svelte rewrite + QWERTY keyboard handler + CSS design tokens
- [ ] 02-06-PLAN.md — Human verification of complete Phase 2 interface
**UI hint**: yes

### Phase 3: Linked Visualizations (Piano + F1/F2)
**Goal**: The two signature visualizations come online — piano keyboard with live harmonics and formant overlays, and the F1/F2 vowel chart with Hillenbrand background and direct drag-to-tune. This is the phase where Core Value is verified: changing any parameter updates audio, the F1/F2 chart, and the piano harmonics together within one animation frame, with no audio glitches while dragging at 60 fps.
**Depends on**: Phase 2
**Requirements**: VOWEL-01, VOWEL-02, VOWEL-03, VOWEL-04, VOWEL-05, PIANO-01, PIANO-02, PIANO-03, PIANO-04, PIANO-05, RANGE-01, RANGE-02, RANGE-03, LINK-01, LINK-03
**Success Criteria** (what must be TRUE):
  1. User can see at least three octaves of piano keyboard with the current f₀ highlighted, at least 12 overtone markers drawn on the correct keys with amplitudes from the analytic formant filter response, and F1-F4 centers overlaid on the piano
  2. User can click or tap a piano key to set f₀, and the click-to-tune loop completes within one animation frame across audio and all views
  3. User can see the F1/F2 vowel diagram in phonetics-standard orientation with Hillenbrand (1995) ellipses drawn as IPA-labelled regions in the background and the Hillenbrand source citation visible on the chart
  4. User can drag the current-vowel handle on the F1/F2 chart and hear the vowel change, see the piano harmonic amplitudes update, and see which vowel region they are inside — all within one animation frame, with no audio glitches while dragging at 60 fps
  5. User can load a vowel preset (cardinal /a e i o u/ plus the 12 Hillenbrand vowels) and see the handle snap, the harmonics update, and hear the vowel load
  6. User can switch voice type (male / female / child) and see the per-voice formant range overlays change on the F1/F2 chart
**Plans**: TBD
**UI hint**: yes

### Phase 4: Vocal Strategies
**Goal**: Vocal strategies are layered on top of the existing linked substrate as a pure-function strategy engine with both overlay mode (visual targets only, no audio change) and locked/auto-tune mode (formants track f₀ as a live rule), with applicable-range handling so strategies never drive formants to physically impossible values.
**Depends on**: Phase 3
**Requirements**: STRAT-01, STRAT-02, STRAT-03, STRAT-04, STRAT-05
**Success Criteria** (what must be TRUE):
  1. User can pick a strategy (speech, R1:f₀, R1:2f₀, R1:3f₀, R2:2f₀, R2:3f₀, singer's-formant cluster) from a one-click preset list with plain-language descriptions next to the notation
  2. In overlay mode, user can see target lines or points drawn on the piano and F1/F2 chart while tuning manually, with audio unchanged by the overlay itself
  3. In locked mode, user can move f₀ up and down and see and hear the relevant formant(s) auto-tune to maintain the ratio, including outside the strategy's applicable range where the app visibly indicates "out of range" or blends toward the neutral target
  4. When a strategy is locked and the user drags a locked formant directly on the F1/F2 chart, the app responds consistently and predictably (drag is blocked with visible feedback or the strategy unlocks) and the rule is documented in-app
**Plans**: TBD
**UI hint**: yes

### Phase 5: Presets, Sharing, Undo/Redo
**Goal**: The full state model — including strategies — becomes persistable and shareable. Users can capture any configuration as a URL, send it to someone else, reopen it exactly, and step backward and forward through at least 32 state changes.
**Depends on**: Phase 4
**Requirements**: SHARE-01, SHARE-02
**Success Criteria** (what must be TRUE):
  1. User can configure any combination of voice, vowel, phonation, vibrato, jitter, and strategy, click a share action, and receive a URL that when opened in a new tab restores the exact same state (audio + all views)
  2. User can undo and redo at least the last 32 state changes via both keyboard shortcuts and visible UI controls, and every undo/redo is reflected in audio and all views within one animation frame
**Plans**: TBD
**UI hint**: yes

### Phase 6: Pedagogy UI & Polish
**Goal**: The app becomes usable by a first-time voice student, not just by its developer. Progressive disclosure keeps the default view calm, tooltips explain every primary control in plain language, expert mode exposes research-grade parameters, the layout is responsive and touch-friendly, and cross-browser behavior is hardened. This is a full phase of work, not a decorative pass.
**Depends on**: Phase 5
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06
**Success Criteria** (what must be TRUE):
  1. User sees at most 7 primary controls in the default view; advanced parameters (Rd, OQ, spectral tilt, individual formant bandwidths) live behind an "Advanced" / "Expert" disclosure
  2. User sees a plain-language tooltip on hover or focus for every primary control, explaining what it does and why it matters, with no Madde-style jargon in the default view
  3. User sees a clean modern aesthetic with readable typography, proper spacing, and at minimum a working dark theme
  4. User can use the app in a 1024×700 desktop browser window without horizontal scrolling or obscured controls
  5. User can drag every visual handle (F1/F2 marker, piano keys, sliders) with touch or pen on a tablet, because all draggable elements use Pointer Events with `touch-action: none`
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Audio Closed Loop | 3/3 | Complete | 2026-04-12 |
| 2. Voice Controls & Expression | 0/6 | Planning complete | - |
| 3. Linked Visualizations | 0/TBD | Not started | - |
| 4. Vocal Strategies | 0/TBD | Not started | - |
| 5. Presets, Sharing, Undo/Redo | 0/TBD | Not started | - |
| 6. Pedagogy UI & Polish | 0/TBD | Not started | - |

---
*Roadmap created: 2026-04-11*
*Granularity: Standard (5-8 phases) → 6 phases derived from requirements*
*Coverage: 42/42 v1 requirements mapped*
