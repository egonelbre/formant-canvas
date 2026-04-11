# Formant Canvas

## What This Is

A web-based voice synthesis and visualization app that lets singers, teachers, learners, and researchers hear and see how the human voice works — glottal source, formant filters, vibrato/jitter — with tightly linked visualizations of harmonics on a piano, formant ranges, vocal strategies (R1:2f, R1:f, R2:2f, etc.), and the F1/F2 vowel diagram. Inspired by Madde, but with a friendlier, modern UI built around direct manipulation and guided presets.

## Core Value

Linked exploration — audio and visuals are tightly coupled, so changing a parameter is simultaneously heard and seen across every view. If everything else fails, this must work: move a formant and the sound, the vowel chart, and the harmonics-on-piano update together in real time.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] Glottal pulse synthesis with smoothly interpolating parameters
- [ ] Formant filter chain (at least F1–F4, tunable frequency/bandwidth/gain)
- [ ] Voice parameters: vibrato (rate + depth) and jitter
- [ ] Fundamental + overtones displayed on a piano keyboard
- [ ] Visualization of the ranges formants can occupy (per vowel / per voice type)
- [ ] Vocal strategies (R1:2f, R1:f, R2:2f, …) with both auto-tune and overlay modes
- [ ] F1/F2 vowel diagram with direct manipulation (drag to tune)
- [ ] Modern, pedagogically friendly UI: clean aesthetic, preset vowels/voices/strategies, inline explanations, direct manipulation of formants/harmonics
- [ ] Real-time linked updates across all views when any parameter changes
- [ ] Runs in the browser with no install (Web Audio API)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Recording/analysis of real human voice input — this is a *synthesis* visualizer, not an analyzer; would double the scope and introduce a different problem domain
- Mobile-first design — desktop web first; multitouch on tablet is a nice-to-have but not a v1 target
- Backend / user accounts / cloud-stored presets — keep it client-side; URL sharing is sufficient for v1
- Offline installable app (PWA) — not required for the pedagogy use case; may be reconsidered later
- Full MIDI/DAW integration — out of scope for exploration tool; could be v2+

## Context

- **Inspiration:** Madde synthesizer (KTH Speech, Music and Hearing) — the reference point for what the audio engine does. The goal is Madde's substance with a modern, approachable interface.
- **Audience:** Pedagogy-first (singers, teachers, self-learners) but also usable by voice researchers. Aesthetics and explanations matter; rigor in the underlying acoustics also matters.
- **Direct manipulation philosophy:** Sliders are fine for fine-grained tweaks, but the primary interaction metaphor is dragging on the visualizations themselves — drag a formant on the F1/F2 chart, drag a harmonic on the piano — and hearing/seeing the result everywhere else.
- **Vocal strategies:** R1:X/R2:X notation refers to tuning formants to harmonic/pitch ratios, a singer's resonance strategy. App must support both experimenting freely with overlays and locking into a strategy that auto-tunes as the fundamental changes.
- **Formant data source:** Published tables (Peterson-Barney, Hillenbrand, etc.) as the baseline for vowel targets and realistic formant ranges.

## Constraints

- **Tech stack**: Svelte + TypeScript for the UI — reactive runtime fits live-updating readouts; smaller surface than React for a single-developer project
- **Audio engine**: Web Audio API (AudioWorklet for custom DSP like glottal pulse generation); no native install
- **Platform**: Desktop web browsers (Chromium, Firefox, Safari); tablet/multitouch supported via Pointer Events where feasible but not a v1 acceptance criterion
- **Deployment**: Static site — no backend required for v1
- **Accuracy**: Voice model should be recognizable and pedagogically correct (formant frequencies in the right ballpark for standard vowels), but not a research-grade voice model

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Svelte + TypeScript for UI | Reactive model fits live-updating visualizations; lighter runtime than React; single-dev friendly | — Pending |
| Web Audio API (not WASM DSP) | Good enough for glottal pulse + biquad formant filters via AudioWorklet; no toolchain overhead | — Pending |
| Both strategy modes (auto-tune + overlay) | Overlay teaches the concept; auto-tune lets users *feel* the strategy as pitch changes | — Pending |
| Published formant tables as default data | Peterson-Barney / Hillenbrand are canonical; gives researchers and teachers a trusted baseline | — Pending |
| Linked audio+visuals as the Core Value | Distinguishes this from pure synths (Madde) and pure visualizers; the coupling *is* the pedagogy | — Pending |
| Client-side only, no backend | Keeps scope tight; URL-encoded presets are enough for sharing | — Pending |

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
*Last updated: 2026-04-11 after initialization*
