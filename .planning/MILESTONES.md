# Milestones

## v0.1 Initial Release (Shipped: 2026-04-12)

**Phases completed:** 5 phases, 21 plans, 39 tasks

**Key accomplishments:**

- Svelte 5 + Vite 8 project with VoiceParams $state store (male /a/ defaults) and Rosenberg glottal pulse + formant utils passing 14 unit tests
- AudioWorklet glottal processor with Rosenberg pulse and AudioBridge wiring parallel formant BiquadFilterNode chain via setTargetAtTime
- Play/pause toggle, vowel-axis slider (/a/ to /i/), and volume slider wired to AudioBridge — end-to-end audio verified by human
- Vibrato LFO, jitter, spectral tilt filter, and pitch conversion utilities -- all TDD with 44 new tests passing
- Extended VoiceParams with 7 new reactive fields, created 3 data modules (voice presets, phonation presets, QWERTY map) with 30 passing unit tests
- Audio-rate vibrato LFO, per-cycle jitter, and one-pole spectral tilt filter added to glottal processor with bridge forwarding all 7 params and mute support
- Eight Svelte 5 UI components covering transport, pitch (SVG piano), voice presets, phonation modes, and expression sliders with CSS custom property theming
- App.svelte rewritten to compose all 5 section components with QWERTY keyboard handler and CSS design system tokens established
- Hillenbrand (1995) 12-vowel dataset with F1/F2/F3 means and SDs for 3 speaker groups, plus analytic formant bandpass magnitude response functions
- F1/F2 vowel chart with log-scale axes, 12 Hillenbrand ellipses, pointer-capture drag handle, clickable IPA presets, voice-type convex hull overlays, and active region highlighting using d3-scale
- 5-octave piano SVG (C2-B6) with live harmonic amplitude bars, F1-F4 formant response curves with center markers, and pointer-capture click-to-tune interaction
- Wired PianoHarmonics and VowelChart into 960px App layout with formant color tokens, delivering linked exploration where any parameter change updates audio + both visualizations within one frame
- Pure-function strategy engine computing formant targets for 7 vocal strategies (speech, R1:f0/2f0/3f0, R2:2f0/3f0, singer's formant cluster) with range clamping and auto-strategy heuristic
- Extended VoiceParams with F5 formant fields and strategy state, plus 5-filter parallel chain in AudioBridge
- Strategy panel with preset selector and mode toggle, overlay visualizations on piano and vowel chart, locked-mode auto-tuning with drag override
- Tooltip data module, Tooltip/VibratoVisual components, and strategy chart math utilities with 16 new tests
- Two Sundberg-style SVG strategy chart components showing resonance frequency vs pitch with diagonal harmonic lines, formant range shading, and f0 cursor
- Full-screen CSS grid layout with expert mode toggle, progressive disclosure of OQ/tilt/aspiration/bandwidth sliders, and tooltips on all primary controls
- Multi-touch piano, B&W projection theme, responsive grid layout, floating help, log-scale charts, and human-verified UI

---
