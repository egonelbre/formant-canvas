# Project Research Summary

**Project:** Formant Canvas
**Domain:** Real-time browser-based voice synthesizer and pedagogical visualization tool
**Researched:** 2026-04-11
**Confidence:** HIGH (stack, architecture, pitfalls); MEDIUM (DSP library ecosystem, competitive feature landscape)

## Executive Summary

Formant Canvas is a single-page, static-hosted synthesis-and-visualization studio. The domain is well-understood: real-time formant synthesis for singing pedagogy has a clear lineage (Klatt 1980, Madde/KTH, Pink Trombone), a canonical dataset pair (Peterson-Barney 1952, Hillenbrand 1995), and a well-documented set of vocal strategies (Henrich/Smith/Wolfe 2011, Miller, Bozeman). The hard part is not the acoustics — it is keeping audio and visualization tightly coupled at 60 fps without zipper noise, audio-visual drift, or browser incompatibility. Every research document converges on the same root design decision: one Svelte `$state` store holds every parameter, audio and viz are both subscribers, and no data ever flows back from the audio thread to drive the UI.

The recommended approach is a plain Svelte 5 + Vite app (no SvelteKit), with a custom `AudioWorkletProcessor` implementing the glottal source and formant filter chain, and SVG/Canvas visualizations that read directly from the reactive store. Phase order should follow the architecture's "minimum viable closed loop" principle: get a slider connected to audible pitch change before building any visualization, then add visualizations, then the strategy engine, then presets and URL sharing. This order makes every integration bug easy to localize and keeps the core value proposition verifiable at every step.

The primary risk is the formant filter topology choice — a genuine technical disagreement between the research documents (see "Decisions Needed" below). The secondary risks are zipper noise during dragging (fatal to the direct-manipulation UX), Safari/iOS compatibility discovered late, and a UI that overwhelms first-time users before they have heard a single vowel. All three are solvable and well-documented; they only become crises if deferred.

---

## Key Findings

### Recommended Stack

The stack is well-defined and mostly pre-decided. Plain Svelte 5 + Vite is the clear choice over SvelteKit: this is a single-screen studio with no routes, no SSR, no server functions, and `ssr = false` everywhere would be a constant friction point. Svelte 5 runes (`$state`, `$derived`, `$effect`) are a near-perfect match for the linked-update requirement. The DSP-focused npm ecosystem for voice synthesis is sparse; the right move is to study reference implementations (`klatt-syn`, Pink Trombone worklet) and write a custom worklet rather than depending on any library at runtime.

**Core technologies:**
- **Svelte 5 + TypeScript 6** — reactive runes for UI and state; strict TS catches Float32Array vs number[] bugs that cause silent audio failures
- **Vite 8 (plain, no SvelteKit)** — fast HMR for DSP iteration; clean `?worker&url` imports for AudioWorklet
- **Web Audio API + AudioWorkletProcessor** — purpose-built for sample-accurate, off-main-thread DSP; AudioParams give free smooth automation
- **svelte-gestures 5.2** — Pointer Events-based drag/pinch (~3 KB); idiomatic Svelte action API for F1/F2 and piano drag interactions
- **d3-scale + d3-interpolate (cherry-picked)** — log/linear/semitone scale math; do not install all of `d3`
- **Hillenbrand 1995 + Peterson-Barney 1952 as embedded JSON** — no npm package exists; embed in `src/data/`; ~50 KB gzipped
- **Vitest 4 + Playwright (Browser Mode)** — unit-test pure DSP math in Node; integration-test real AudioContext in a real browser
- **GitHub Pages** — static hosting; avoid `SharedArrayBuffer` / COOP-COEP in v1 to keep deployment trivial

For the glottal pulse model: start with **Rosenberg** (simple, ~10 lines, pedagogically adequate), add the **LF model** as an upgrade in a later phase. Do not start with LF — its four coupled parameters add complexity before the UI is stable.

See `.planning/research/STACK.md` for full rationale and installation commands.

### Expected Features

The project has a rich and well-researched feature set. The core interactive loop — drag on the F1/F2 vowel chart, see the piano harmonics update, hear the vowel change — is the non-negotiable minimum. Everything else is staged around it.

**Must have (table stakes for v1):**
- Glottal pulse synthesis with smooth parameter interpolation (no click artifacts on drag)
- F1–F4 formant filter chain with per-formant frequency, bandwidth, and gain controls
- F1/F2 vowel chart with direct drag interaction and Hillenbrand background ellipses
- Piano keyboard with live harmonic bars and formant-frequency peak overlays
- Vibrato (rate, depth, onset) and jitter controls
- Core vocal strategies: speech baseline, R1:f0, R1:2f0, R1:3f0, R2:2f0, R2:3f0, singer's formant cluster — with both overlay mode (teach the concept) and auto-tune mode (live rule)
- Vowel presets (cardinal 5 + Hillenbrand 12), voice-type presets (male/female/child), phonation presets (breathy/modal/flow/pressed)
- Real-time spectrum display (log-frequency, dB)
- Waveform/oscilloscope view
- QWERTY keyboard pitch input
- URL-encoded state sharing
- Undo/redo
- Inline tooltips with plain-language explanations (not Madde-style jargon walls)
- Source citation (Hillenbrand 1995) visible in the UI
- Play/stop, master volume, mute, audio-state indicator

**Should have (differentiators vs Madde and Pink Trombone):**
- Drag harmonics on the piano to re-tune a formant (inverse gesture)
- Pitch-sweep / "play a scale" button to demonstrate strategies across a range
- IPA keyboard for vowel input
- Formant-occupancy range overlays for F3/F4
- Web MIDI keyboard input (Chrome/Edge only; degrade gracefully)
- Dataset switcher (Peterson-Barney / Hillenbrand / Fant)

**Defer to v1.x:**
- Spectrogram (scrolling time-frequency)
- Side-by-side compare mode (A/B two states with crossfade)
- F5/F6 formants (singer's formant cluster demo benefits from them but F1–F4 are enough for v1)
- Guided lesson mode / scripted walkthroughs
- WAV export via MediaRecorder

**Explicit anti-features (do not build):**
- Dense 40+ slider cockpit as default view (use progressive disclosure instead)
- Opaque jargon labels (Rd, OQ, EE) in the default view (use "breathiness", "phonation type")
- Voice input / microphone analysis (out of scope per PROJECT.md)
- Real articulatory model (Pink Trombone already does this)
- Cloud accounts, backend, DAW/MIDI sequencing

See `.planning/research/FEATURES.md` for the full vocal-strategy catalogue and feature-dependency graph.

### Architecture Approach

The architecture is clean and well-suited to a single-developer reactive app. The central principle is a single Svelte `$state` class instance (`voiceState`) that holds every audible and visible parameter. UI controls, the `AudioBridge`, the strategy engine, and all visualizations are subscribers to this store — none of them talk to each other. The audio thread never returns data to the UI; visualizations read the same parameter targets that audio is consuming. This makes audio/visual synchronization trivially correct by design.

**Major components:**
1. **voiceState** (`state/voiceState.svelte.ts`) — single source of truth; plain numbers + flags; all reactivity flows from here
2. **AudioBridge** (`audio/AudioBridge.ts`) — owns `AudioContext`, loads worklet, runs `$effect` forwarding state changes via `AudioParam.setTargetAtTime` (continuous) and `postMessage` (discrete events like preset load)
3. **VoiceProcessor** (`audio/worklets/voice-processor.ts`) — `AudioWorkletProcessor` implementing glottal pulse generator + formant filter chain; reads `AudioParam`s each block; no knowledge of UI, strategies, or presets
4. **Strategy Engine** (`domain/strategy.ts`) — pure function `(strategy, f0) → formantTargets`; a `$effect` writes back into `voiceState` when locked; 100% testable without audio or browser
5. **VowelChart + PianoHarmonics** (`ui/viz/`) — Canvas/SVG components reading `$derived` state on `requestAnimationFrame`; never pull data from the audio thread
6. **Preset System** (`domain/presets.ts`) — named snapshots; `load = Object.assign(voiceState, preset)`; URL serialization via compact versioned schema

Build order: state store → DSP lib functions → worklet + one slider (closed audio loop) → piano viz → F1/F2 chart viz → formant range overlay → strategy engine → presets + URL → polish and pedagogy UI. See `.planning/research/ARCHITECTURE.md` for the full data-flow diagrams.

### Critical Pitfalls

1. **AudioContext starts suspended silently** — create lazily on first user gesture; always call `ctx.resume()` on every interaction; gate the UI behind a visible "Start audio" affordance; show an audio-state indicator. Address in Phase 1 before any audio ships.

2. **Zipper noise on formant drag (fatal to core UX)** — never use `AudioParam.value = x` or `setValueAtTime` for drag events; always use `setTargetAtTime(value, now, 0.02)` for 20 ms exponential smoothing; if using a custom worklet resonator, smooth coefficients per-sample inside `process()`. Address before the F1/F2 chart interaction ships.

3. **Formant filter topology (see "Decisions Needed" below)** — the choice between native `BiquadFilterNode`s and a custom Klatt-style cascade resonator has significant correctness and sound-quality implications. Must be decided before the filter chain is implemented.

4. **Aliased glottal pulse** — use the glottal flow derivative (zero DC by construction); add 2–4x oversampling or BLIT-style anti-aliasing; test at f0 = 800 Hz. Skip this and the voice sounds like a fax machine at soprano pitches.

5. **Vocal strategies outside their applicable range** — R1:f0 at C3 (f0 = 131 Hz) tries to set F1 = 131 Hz, which is physically impossible; each strategy must declare an applicable pitch range and blend toward the neutral vowel target or show an "out of range" state outside those bounds.

6. **Safari/iOS compatibility discovered at the end** — test on Safari macOS and iOS Safari from Phase 1; AudioWorklet is ~2–3x more expensive on JavaScriptCore vs V8; `SharedArrayBuffer` requires COOP/COEP which GitHub Pages cannot set natively; ringer-switch silence on iOS has no error.

7. **Pedagogical UI overwhelming on first run** — progressive disclosure must be designed in from the start; the first screen must demonstrate the core value (drag marker → hear vowel → see piano update) with zero jargon; test with a non-developer voice teacher at every phase.

See `.planning/research/PITFALLS.md` for the full list of 12 pitfalls including audio/visual drift (7), postMessage misuse (8), and accessibility being retrofitted (11).

---

## Decisions Needed

These are genuine disagreements or ambiguities in the research. Do not silently pick a default — the choice has lasting consequences.

### Decision 1: Formant Filter Topology

**The disagreement:** STACK.md and PITFALLS.md contradict each other.

**STACK.md recommends** parallel `BiquadFilterNode`s (native Web Audio, `type: 'bandpass'`), citing DSP consensus that parallel biquads are numerically better for disjoint formant resonances and that `setTargetAtTime` gives adequate smoothing. Rated HIGH confidence.

**PITFALLS.md warns against `BiquadFilterNode`** (Pitfall 4, rated as a critical pitfall) and recommends a custom Klatt-style cascade of 2-pole all-pole resonators (`y[n] = x[n] - a1*y[n-1] - a2*y[n-2]`) inside an `AudioWorkletProcessor`. The PITFALLS reasoning:
- `BiquadFilterNode` parameterizes by Q, not bandwidth in Hz (published formant data is in Hz)
- Different browsers have had historical discrepancies in the biquad implementation, making sound browser-dependent
- Isolated bandpass biquads do not give the right vocal-tract spectrum shape; Klatt-style cascade uses resonators (all-pole, no zeros), a different topology with a different spectral character
- The rewrite cost if you start with BiquadFilterNode and later switch is explicitly called out as "painful"

**What this decision affects:**
- How much AudioWorklet DSP code is required in Phase 1 (BiquadFilterNode = almost none; custom resonator = ~50–100 lines up front)
- Whether formant sound is browser-dependent
- Whether you can independently solo a single formant (harder in cascade; easier in parallel)
- Accuracy of vowel reproduction
- Rewrite risk

**Resolution paths:**
- Start with BiquadFilterNode parallel for speed, accept pedagogical roughness, revisit later (STACK.md's implicit path)
- Start with custom Klatt cascade resonator from day one (PITFALLS.md's explicit recommendation; more upfront work, avoids rewrite)
- Start with BiquadFilterNode but factor DSP behind a clean interface so the swap is mechanical (compromise)

**Synthesis recommendation:** Given that acoustic correctness is central to the tool's credibility with voice teachers and researchers, and that PITFALLS.md explicitly identifies BiquadFilterNode as a rewrite-risk item, the Klatt-style AudioWorklet resonator is probably the right call from day one. This adds worklet complexity to Phase 1 and should be scoped accordingly. But the user must decide.

**Must be resolved before Phase 1 is locked.**

---

### Decision 2: "Wafel" voice synth reference

STACK.md searched for "Wafel" as an open-source voice synthesizer and found no public project under that name. If this refers to a specific tool you have in mind, please clarify — it may be proprietary, known by a different name, or a niche reference. This does not block any roadmap decision.

---

## Implications for Roadmap

Based on combined research, the architecture document's build-order phases map cleanly to product phases.

### Phase 1: Audio Foundation and Closed Loop

**Rationale:** Nothing downstream can be verified without audible output. Get a slider connected to a working synthesizer before drawing a single pixel of UI beyond a play button. The formant filter topology decision must be made before this phase begins.

**Delivers:** A working voice synthesizer in the browser — glottal pulse (Rosenberg model), F1–F4 filter chain, vibrato/jitter, smooth parameter changes with no zipper noise, working in Chrome and Safari.

**Addresses:** FEATURES §1.1 (glottal pulse), §1.2 (formant filters), §1.3 (vibrato/jitter)

**Avoids:** Pitfall 1 (AudioContext suspension), Pitfall 2 (zipper noise), Pitfall 3 (aliased pulse), Pitfall 8 (postMessage misuse), Pitfall 9 (Safari late discovery)

**Research flag:** Needs implementation spike on custom worklet resonator if the Klatt-style route is chosen (sparse Web Audio-specific documentation; study `klatt-syn` source and Klatt 1980 paper).

### Phase 2: Core Visualizations

**Rationale:** With audio working, add the two signature visualizations. Piano harmonics first (confirms rAF pattern), then the F1/F2 chart with direct drag (confirms the full linked-update loop end-to-end).

**Delivers:** The core linked-exploration experience — drag the F1/F2 marker, hear the vowel change, see the harmonic bars move on the piano.

**Addresses:** FEATURES §1.4 (piano harmonics), §1.7 (F1/F2 chart drag), §1.5 (formant range overlays)

**Implements:** VowelChart, PianoHarmonics, FormantRanges; Hillenbrand JSON embedded; analytic biquad magnitude evaluation at n·f0 (no FFT needed for piano harmonic heights)

**Avoids:** Pitfall 5 (hard-coded male formant table — ship male/female/child presets with source citation), Pitfall 7 (audio/visual drift — single store architecture), Pitfall 12 (looks right/sounds wrong — trained-listener acceptance test before shipping)

**Research flag:** Standard patterns apply for rAF + store and analytic magnitude evaluation.

### Phase 3: Vocal Strategies

**Rationale:** Strategies are the primary differentiator and the most complex reactive chain. They require audio, F1/F2 chart, and piano to all be correct before bugs are isolatable.

**Delivers:** Vocal strategy system with overlay mode (visual targets, no sound change) and auto-tune mode (formants track pitch as a live rule); applicable-range enforcement; pitch-sweep demo.

**Addresses:** FEATURES §1.6, strategy catalogue (R1:f0, R1:2f0, R1:3f0, R2:2f0, R2:3f0, singer's formant cluster)

**Implements:** `domain/strategy.ts` pure functions; strategy `$effect` write-back to store; overlay rendering on piano and F1/F2 chart; applicable-range metadata per strategy

**Avoids:** Pitfall 6 (unsingable nonsense outside applicable range — blend toward neutral or show "out of range"; clamp F1 floor to ~200 Hz)

**Research flag:** Strategy applicable ranges are from literature (Henrich/Smith/Wolfe 2011, Miller). Reactive write-back pattern is standard in Svelte 5.

### Phase 4: Presets, Sharing, and Pedagogy UI

**Rationale:** Presets require the full state model to be stable before snapshotting makes sense. URL sharing requires a versioned schema. Pedagogy UI (progressive disclosure, tooltips, guided tour) is the layer that makes the tool usable by non-experts — must be designed in, not retrofitted.

**Delivers:** Complete preset system (vowel, voice, phonation, strategy); URL-encoded state sharing; undo/redo; progressive-disclosure UI; inline explanations; first-run tour.

**Addresses:** FEATURES §4.1 (save/load, URL sharing, undo/redo, tooltips), §4.2 (differentiators: URL sharing, clean UI, IPA keyboard)

**Avoids:** Pitfall 10 (overwhelming UI — progressive disclosure from the start), Pitfall 11 (accessibility — keyboard + ARIA for every draggable from the start)

**Research flag:** URL encoding schema design (versioned, compact) is non-trivial. Consider a brief spike on compressed URL patterns before committing to a format.

### Phase 5: Spectrum Display, Polish, and v1.x Features

**Rationale:** Spectrum/oscilloscope, MIDI, and spectrogram are additive — they do not unlock any other feature. Ship after the core loop is validated.

**Delivers:** Real-time spectrum display (AnalyserNode FFT, log-frequency canvas), waveform oscilloscope, QWERTY + optional Web MIDI pitch input, accessibility audit, cross-browser polish.

**Addresses:** FEATURES §4.1 table stakes (spectrum, waveform, QWERTY keyboard, Web MIDI)

**Research flag:** Web MIDI is Chrome/Edge only. AnalyserNode spectrum display is well-documented standard pattern.

### Phase Ordering Rationale

- Phases 1 → 2 follow the hard dependency: you cannot test harmonic visualization correctness without audio.
- Phase 3 (strategies) comes after both visualizations because strategies touch audio, F1/F2 chart, and piano simultaneously — any of those being incomplete makes strategy bugs undiagnosable.
- Phase 4 (presets/UI) comes after strategies because a preset can capture a strategy state; the reverse is not true.
- Phase 5 is additive and can overlap with Phase 4 once the store is stable.

### Research Flags

**Needs deeper research during planning:**
- **Phase 1:** Custom Klatt-style AudioWorklet resonator (if chosen) — sparse Web Audio-specific documentation; requires studying `klatt-syn` source and Klatt 1980 paper directly
- **Phase 1:** Anti-aliasing glottal pulse at high f0 — BLIT/minBLEP is standard in other DSP contexts; Web Audio-specific implementation patterns are sparse; consider a prototype spike
- **Phase 4:** Compact URL encoding for complex state — evaluate base64url + MessagePack vs hand-rolled compact format

**Standard patterns (skip research-phase):**
- **Phase 2:** rAF + store pattern — fully documented in Svelte 5 docs
- **Phase 2:** Analytic biquad magnitude evaluation — RBJ cookbook + MDN BiquadFilterNode docs
- **Phase 3:** Pure-function strategy engine + reactive write-back — well-matched to Svelte 5 `$effect`
- **Phase 5:** AnalyserNode spectrum display — MDN docs are comprehensive

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Pre-decided framework; Vite/Svelte ecosystem well-documented; DSP library selection is MEDIUM (ecosystem is sparse — "build it yourself" is the correct answer) |
| Features | HIGH | Acoustics and vocal-strategy literature is rigorous and well-sourced; competitive feature landscape is MEDIUM (limited ability to audit all competitors) |
| Architecture | HIGH | Svelte 5 rune + AudioWorklet patterns verified against MDN, Chrome docs, and practitioner write-ups |
| Pitfalls | HIGH for Web Audio / DSP pitfalls; MEDIUM-HIGH for voice-science accuracy; MEDIUM for UX direct-manipulation pitfalls |

**Overall confidence:** HIGH on technical architecture and pitfall avoidance strategies. MEDIUM on DSP quality — anti-aliasing and resonator accuracy require implementation and listening validation, not just research.

### Gaps to Address

- **Formant filter topology (critical, blocks Phase 1)** — STACK vs PITFALLS disagreement; must be resolved by the user before roadmap is locked
- **Glottal pulse anti-aliasing** — approach is known; specific implementation for an AudioWorklet at soprano-range fidelity needs a prototype spike in Phase 1
- **Acoustic correctness acceptance test** — "sounds like a real vowel" is the Phase 2 hard gate; no automated test substitutes for a trained listener; plan for this explicitly
- **Safari AudioWorklet performance on iPad** — the 2–3x overhead claim is community-sourced; measure on actual hardware before committing to a complex worklet design
- **"Wafel" reference** — unresolved; see Decisions Needed

---

## Sources

### Primary (HIGH confidence)
- MDN Web Docs — AudioWorklet, AudioParam, BiquadFilterNode, AnalyserNode, Pointer Events
- Svelte 5 documentation — runes ($state, $derived, $effect), .svelte.ts modules
- Vite documentation — worker imports, ?worker&url pattern
- Peterson & Barney (1952) — canonical English vowel formant dataset
- Hillenbrand et al. (1995) — modern English vowel formant dataset (recommended default)
- Klatt (1980) "Software for a cascade/parallel formant synthesizer" — formant topology reference
- Henrich, Smith & Wolfe (2011), Miller (*Resonance in Singing*), Bozeman (*Practical Vocal Acoustics*) — vocal strategy literature
- Robert Bristow-Johnson Audio EQ Cookbook — biquad coefficient formulas

### Secondary (MEDIUM confidence)
- `klatt-syn` source (chdh, GitHub) — Klatt 1980 cascade/parallel TS implementation; studied for algorithms
- Pink Trombone / Modular Pink Trombone (zakaton/yonatanrozin, GitHub) — AudioWorklet port; studied for worklet structure
- WebAudio WG issue tracker — historical BiquadFilterNode cross-browser discrepancies
- Svelte community (vis4.net, datavisualizationwithsvelte.com) — "D3 for math, Svelte for DOM" consensus
- Loke.dev "Stop Allocating Inside the AudioWorkletProcessor" — allocation patterns in worklets

### Tertiary (LOW confidence)
- Competitive feature landscape (Sing & See, Estill Voiceprint, SpectrumView) — feature sets inferred, not hands-on audited
- "Wafel" voice synth — searched; not found as a public project; status unknown

---
*Research completed: 2026-04-11*
*Ready for roadmap: yes — pending resolution of Decision 1 (formant filter topology)*
