# Formant Canvas

## What This Is

A web-based voice synthesis and visualization app that lets singers, teachers, learners, and researchers hear and see how the human voice works — glottal source, formant filters, vibrato/jitter — with tightly linked visualizations of harmonics on a piano, formant ranges, vocal strategies (R1:2f, R1:f, R2:2f, etc.), and the F1/F2 vowel diagram. Inspired by Madde, but with a friendlier, modern UI built around direct manipulation and guided presets.

## Core Value

Linked exploration — audio and visuals are tightly coupled, so changing a parameter is simultaneously heard and seen across every view. If everything else fails, this must work: move a formant and the sound, the vowel chart, and the harmonics-on-piano update together in real time.

## Requirements

### Validated

- Glottal pulse synthesis (Rosenberg model) with smoothly interpolating parameters — v0.1
- Formant filter chain F1-F5 with tunable frequency, bandwidth, and gain — v0.1
- Vibrato (rate + depth), jitter, spectral tilt, phonation modes (breathy/modal/flow/pressed) — v0.1
- Pitch control via slider, QWERTY keyboard, and piano click-to-tune with Hz/note/cents readout — v0.1
- 7 voice presets (soprano through child) loading voice-type formant defaults — v0.1 (formants only, pitch preserved per user preference)
- F1/F2 vowel chart with Hillenbrand (1995) ellipses, drag-to-tune, IPA snap presets — v0.1
- 5-octave piano with live harmonic amplitude bars and F1-F4 formant response curves — v0.1
- Per-voice-type formant range overlays and active vowel region detection — v0.1
- 7 vocal strategies with overlay, locked, and auto modes including drag override snap-back — v0.1
- Sundberg-style R1/R2 strategy charts with diagonal harmonics and formant range shading — v0.1
- Progressive disclosure with expert mode, plain-language help, dark theme — v0.1
- Responsive layout at 1024x700, multi-touch piano, Pointer Events on all interactive surfaces — v0.1
- Real-time linked updates across all views within one animation frame — v0.1
- Single source-of-truth Svelte 5 $state store, no view owns audio parameter copies — v0.1
- Cross-browser AudioContext lifecycle (Chrome, Firefox, Safari) — v0.1

### Active

- [ ] URL-encoded state sharing (SHARE-01)
- [ ] Undo/redo for at least 32 state changes (SHARE-02)

### Out of Scope

- Recording/analysis of real human voice input — this is a *synthesis* visualizer, not an analyzer
- Mobile-first design — desktop web first; tablet touch supported but not primary target
- Backend / user accounts / cloud-stored presets — client-side only; URL sharing is sufficient
- Offline installable app (PWA) — not required for the pedagogy use case
- Full MIDI/DAW integration — out of scope for exploration tool
- AI / neural TTS / voice cloning — opaque and non-pedagogical
- LF glottal model — deferred to v2; Rosenberg sufficient for pedagogy

## Context

Shipped v0.1 with 6,137 LOC across 59 files (TypeScript + Svelte + CSS).
Tech stack: Svelte 5 + TypeScript 6 + Vite 8, Web Audio API (AudioWorklet + BiquadFilterNode).
14 test files, 155 unit tests passing.
Built in 2 days across 211 commits.

Voice presets intentionally load formants only (not pitch) — user preference for singers who know their own pitch.
"Speech" strategy is implicit via Clear button rather than named option — user-preferred UX.

## Constraints

- **Tech stack**: Svelte + TypeScript for the UI — reactive runtime fits live-updating readouts; smaller surface than React for a single-developer project
- **Audio engine**: Web Audio API (AudioWorklet for custom DSP like glottal pulse generation); no native install
- **Platform**: Desktop web browsers (Chromium, Firefox, Safari); tablet/multitouch supported via Pointer Events where feasible but not a v1 acceptance criterion
- **Deployment**: Static site — no backend required for v1
- **Accuracy**: Voice model should be recognizable and pedagogically correct (formant frequencies in the right ballpark for standard vowels), but not a research-grade voice model

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Svelte + TypeScript for UI | Reactive model fits live-updating visualizations; lighter runtime than React; single-dev friendly | Good — Svelte 5 runes worked perfectly for linked updates |
| Web Audio API (not WASM DSP) | Good enough for glottal pulse + biquad formant filters via AudioWorklet; no toolchain overhead | Good — native BiquadFilterNode with setTargetAtTime handles all smoothing |
| Both strategy modes (auto-tune + overlay) | Overlay teaches the concept; auto-tune lets users *feel* the strategy as pitch changes | Good — the combination is pedagogically powerful |
| Published formant tables as default data | Peterson-Barney / Hillenbrand are canonical; gives researchers and teachers a trusted baseline | Good — Hillenbrand (1995) works well |
| Linked audio+visuals as the Core Value | Distinguishes this from pure synths (Madde) and pure visualizers; the coupling *is* the pedagogy | Good — verified working end-to-end |
| Client-side only, no backend | Keeps scope tight; URL-encoded presets are enough for sharing | Good |
| Voice presets: formants only, no pitch | User preference — singers know their own pitch | Good — confirmed during human verification |
| Toggle strategy UI with Clear button | User preference over flat preset list with named "Speech" option | Good — cleaner UX for the toggle approach |
| Rosenberg glottal model (defer LF) | Simpler, sufficient for pedagogy; LF adds parameter coupling complexity | Good — recognizable voice quality achieved |
| Parallel formant topology | Native BiquadFilterNode per formant; each independently automatable | Good — smooth parameter changes, no custom IIR needed |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-12 after v0.1 milestone*
