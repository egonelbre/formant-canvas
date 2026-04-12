# Phase 1: Audio Closed Loop - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 01-audio-closed-loop
**Areas discussed:** Initial sound character, Slider & control mapping, Start audio interaction, Formant topology

---

## Initial Sound Character

| Option | Description | Selected |
|--------|-------------|----------|
| Male modal /a/ | ~120 Hz f0, open vowel — most recognizable as 'a voice', classic demo sound. Formants: F1~730, F2~1090, F3~2440, F4~3300 Hz | ✓ |
| Neutral schwa /ə/ | ~150 Hz f0, mid-central vowel — least biased starting point, but sounds less 'alive' | |
| Female modal /a/ | ~220 Hz f0, open vowel — brighter, more harmonics in audible range | |

**User's choice:** Male modal /a/
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Pure voiced only | Simpler — just the glottal pulse through formants. Aspiration added in Phase 2 | |
| Light aspiration mixed in | Adds a small noise component for a more natural breathy quality from day one | ✓ |

**User's choice:** Light aspiration mixed in
**Notes:** User wants natural quality from the start rather than deferring to Phase 2

---

## Slider & Control Mapping

| Option | Description | Selected |
|--------|-------------|----------|
| F1 frequency | Sweeps first formant ~200-1200 Hz — most dramatic timbral change, directly proves store→bridge→BiquadFilter path | |
| f0 (pitch) | Changes fundamental frequency ~80-400 Hz — proves worklet parameter path, but timbral change less dramatic | |
| Combined F1+F2 (vowel axis) | Single slider interpolating between two vowel targets (e.g., /a/ to /i/) — more impressive demo but more complex mapping | ✓ |

**User's choice:** Combined F1+F2 vowel axis
**Notes:** Interpolates /a/ to /i/ — maximum F1+F2 contrast

| Option | Description | Selected |
|--------|-------------|----------|
| Include volume slider | Standard expectation — users want to control loudness. Trivial to implement (GainNode.gain) | ✓ |
| Just the one slider | Keep Phase 1 absolutely minimal — one slider, one button | |

**User's choice:** Include volume slider
**Notes:** None

---

## Start Audio Interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle button | Single button that reads 'Start'/'Stop'. Minimal, clear state | |
| Play/Pause style | Play/pause toggle like a media player — familiar but implies 'pause' semantics | ✓ |
| Persistent tone, mute toggle | Audio context starts on gesture, mute/unmute controls audibility | |

**User's choice:** Play/Pause style
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Centered card | Everything centered in a single card/panel | |
| Top toolbar + content area | Start/volume in a top bar, vowel slider in main area | |
| You decide | Claude picks layout | ✓ |

**User's choice:** You decide (Claude's discretion)
**Notes:** None

---

## Formant Topology

| Option | Description | Selected |
|--------|-------------|----------|
| All four F1-F4 | Full chain from day one — F3/F4 add head resonance quality | ✓ |
| F1+F2 only | Minimum for vowel identity, but hollow/synthetic without F3/F4 | |
| F1-F4 plus nasal zero | Full chain plus anti-resonance — more realistic but added complexity | |

**User's choice:** All four F1-F4
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Parallel | Each formant independent BiquadFilterNode, outputs summed. Matches Klatt parallel branch | ✓ |
| Cascade (series) | Source → F1 → F2 → F3 → F4. Natural spectral tilt but individual gain control harder | |
| You decide | Claude picks based on what works best | |

**User's choice:** Parallel
**Notes:** Matches CLAUDE.md recommendation

---

## Claude's Discretion

- Phase 1 minimal UI layout
- Bandwidth defaults for F1-F4
- Aspiration noise level and implementation
- Vowel interpolation curve
- Smoothing time constants

## Deferred Ideas

None — discussion stayed within phase scope
