# Requirements: Formant Canvas

**Defined:** 2026-04-11
**Core Value:** Linked exploration — audio and visuals update together in real time as any parameter changes.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Audio Engine

- [ ] **AUDIO-01**: Glottal pulse source generates continuous audio via AudioWorklet, starting from a Rosenberg-style model (LF deferred)
- [ ] **AUDIO-02**: User can control glottal parameters: open quotient / phonation type (breathy ↔ modal ↔ pressed) with plain-language labels
- [ ] **AUDIO-03**: Formant filter chain with F1–F4 tunable by center frequency and bandwidth (implementation uses native `BiquadFilterNode` in parallel/cascade; topology can be upgraded later)
- [ ] **AUDIO-04**: Vibrato with controllable rate (Hz) and extent (cents), applied to f₀
- [ ] **AUDIO-05**: Jitter (random pitch perturbation) with controllable amount
- [ ] **AUDIO-06**: All continuous parameters smooth over time so direct manipulation produces no zipper/click artifacts (`setTargetAtTime` for native nodes; audio-rate smoothing for worklet parameters)
- [ ] **AUDIO-07**: Play/stop transport, master volume, and mute respond instantly
- [ ] **AUDIO-08**: Audio engine works in current Chromium, Firefox, and Safari including correct `AudioContext` resume on first user gesture

### Voice Controls

- [ ] **VOICE-01**: User can set fundamental frequency (f₀) via a dedicated pitch control
- [ ] **VOICE-02**: User can drive f₀ from a QWERTY piano mapping (standard DAW key layout)
- [ ] **VOICE-03**: On-screen readout shows f₀ as Hz, note name with octave, and cents deviation
- [ ] **VOICE-04**: Voice presets set f₀ range + starting formants for at least male tenor/baritone/bass, female soprano/mezzo/alto, and child
- [ ] **VOICE-05**: Phonation presets (breathy / modal / flow / pressed) load matching glottal defaults

### Vowel Chart (F1/F2 Diagram)

- [ ] **VOWEL-01**: F1/F2 diagram renders with F1 on one axis and F2 on the other, in phonetics-standard orientation
- [ ] **VOWEL-02**: Hillenbrand (1995) vowel data is embedded and drawn as IPA-labelled regions/ellipses in the background
- [ ] **VOWEL-03**: A draggable handle represents the current vowel — dragging it updates F1/F2 in the audio engine in real time
- [ ] **VOWEL-04**: Vowel presets (cardinal /a e i o u/ plus the Hillenbrand 12) snap the handle to the target formants
- [ ] **VOWEL-05**: Data source (Hillenbrand 1995) is cited visibly on the chart

### Piano / Harmonics View

- [ ] **PIANO-01**: A piano keyboard displays at least three octaves with standard C-labelled keys
- [ ] **PIANO-02**: The current f₀ is highlighted on the piano; the overtone series (≥12 harmonics) is drawn as markers on the correct keys
- [ ] **PIANO-03**: Each harmonic marker shows its amplitude by analytically evaluating the formant filter response at that harmonic frequency
- [ ] **PIANO-04**: F1, F2, F3, F4 centers are drawn as overlay markers on the piano so the relationship between formants and harmonics is visible
- [ ] **PIANO-05**: Clicking or tapping a key sets f₀ to that note

### Formant Ranges

- [ ] **RANGE-01**: Formant occupancy is visualized — at minimum, draw Hillenbrand-derived ellipses per vowel on the F1/F2 chart
- [ ] **RANGE-02**: Per-voice-type formant ranges (male/female/child) are visible as overlays so users see how the ranges differ
- [ ] **RANGE-03**: The current F1/F2 position shows which vowel region(s) it falls inside

### Vocal Strategies

- [ ] **STRAT-01**: App supports at least: speech (untuned), R1:f₀, R1:2f₀, R1:3f₀, R2:2f₀, R2:3f₀, and the singer's-formant cluster
- [ ] **STRAT-02**: Strategies can be displayed as **overlay** — target lines/points drawn on the piano and F1/F2 chart while the user tunes manually
- [ ] **STRAT-03**: Strategies can be **locked** — the app auto-tunes the relevant formant(s) as f₀ changes so the ratio is maintained
- [ ] **STRAT-04**: When a strategy is locked and the user drags a locked formant directly, the interaction is resolved predictably (either drag is blocked with visible feedback, or strategy unlocks — behavior is consistent and documented in-app)
- [ ] **STRAT-05**: Strategy selector is a one-click preset list with plain-language descriptions next to the notation

### Linked Updates

- [ ] **LINK-01**: Any parameter change from any view updates the audio output AND the F1/F2 chart AND the piano harmonics AND all relevant readouts within one animation frame
- [ ] **LINK-02**: All views read from a single source-of-truth state store; no view maintains its own copy of formant/source/f₀ state
- [ ] **LINK-03**: Dragging a formant on the F1/F2 chart at 60fps does not cause audio glitches

### Sharing & History

- [ ] **SHARE-01**: Current state can be serialized to a URL that, when opened, restores the exact same state
- [ ] **SHARE-02**: Undo and redo are available via keyboard and UI controls for at least the last 32 state changes

### Pedagogy UI

- [ ] **UI-01**: Default view shows at most 7 primary controls; advanced parameters are behind a disclosure ("Advanced" / "Expert")
- [ ] **UI-02**: Every primary control has a hover/focus tooltip explaining in plain language what it does and why it matters
- [ ] **UI-03**: Expert mode exposes Rd / OQ / spectral tilt / individual formant bandwidths
- [ ] **UI-04**: Clean modern aesthetic with readable typography, proper spacing, and at minimum a dark theme
- [ ] **UI-05**: Layout is responsive enough to be usable on a desktop browser window down to 1024×700
- [ ] **UI-06**: All draggable visual elements use Pointer Events with `touch-action: none` so they are usable with touch / pen on tablets

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Audio Engine

- **AUDIO-V2-01**: LF glottal pulse model (state-of-the-art replacement for Rosenberg)
- **AUDIO-V2-02**: Custom Klatt-style 2-pole resonator cascade in AudioWorklet (replaces BiquadFilterNode if pedagogical fidelity demands it)
- **AUDIO-V2-03**: Shimmer (amplitude perturbation) as a separate micro-variation control
- **AUDIO-V2-04**: F5 and F6 formants (for singer's-formant detail)

### Visualizations

- **VIZ-V2-01**: Spectrogram (time-frequency) view
- **VIZ-V2-02**: Real-time spectrum display with log-frequency axis and dB magnitude
- **VIZ-V2-03**: Waveform / oscilloscope view of the output signal
- **VIZ-V2-04**: Trail/path display on F1/F2 chart showing recent vowel movement
- **VIZ-V2-05**: Vowel-data source toggle (Peterson-Barney / Hillenbrand / Fant)

### Features

- **FEAT-V2-01**: Side-by-side compare mode — two states with A/B crossfade
- **FEAT-V2-02**: Pitch-sweep / "play a scale" button to animate a strategy across a range
- **FEAT-V2-03**: Web MIDI keyboard input
- **FEAT-V2-04**: WAV / audio clip export via MediaRecorder
- **FEAT-V2-05**: Snap-to-vowel toggle while dragging on the F1/F2 chart
- **FEAT-V2-06**: IPA on-screen keyboard for vowel selection
- **FEAT-V2-07**: Additional strategies (R1:4f₀, R1:5f₀, combined lock strategies, twang, whistle, SOVT)
- **FEAT-V2-08**: Custom strategy editor (user-authored ratio rules)
- **FEAT-V2-09**: Guided lesson mode with scripted walkthroughs

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Microphone / real voice analysis | This is a synthesis visualizer, not an analyzer — different problem domain |
| Articulatory tract model (Pink Trombone-style) | Pink Trombone already does it; this project is formant-based on purpose |
| Cloud accounts / backend / shared preset library | Kept client-side for v1; URL sharing covers the real need |
| ADSR / LFO matrix / reverb / general synth features | Not a music synth; stay focused on voice pedagogy |
| AI / neural TTS / voice cloning | Opaque and non-pedagogical; undermines white-box goal |
| Score / lyrics / piano-roll sequencing | Different product category (Vocaloid / Synthesizer V) |
| Multi-user / realtime collaboration | Out of scope for v1; URL share link is enough |
| Native app / PWA install | Web-first; reconsider later |
| Mobile-first / phone layout | Desktop first; tablet supported where feasible, not a v1 gate |

## Traceability

Which phases cover which requirements. Filled by roadmapper.

| Requirement | Phase | Status |
|-------------|-------|--------|
| *(Populated during roadmap creation)* | | |

**Coverage:**
- v1 requirements: 43 total
- Mapped to phases: (pending roadmap)
- Unmapped: (pending roadmap)

---
*Requirements defined: 2026-04-11*
*Last updated: 2026-04-11 after initial definition*
