# Phase 2: Voice Controls & Expression - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 02-voice-controls-expression
**Areas discussed:** Pitch control & keyboard, Vibrato & jitter, Phonation modes, Voice presets & UI layout

---

## Pitch Control & Keyboard

| Option | Description | Selected |
|--------|-------------|----------|
| Vertical slider | Consistent with existing volume slider, maps naturally to pitch, log-scale | |
| Horizontal slider | More conventional for range controls | |
| Rotary knob | Compact, synth-style, requires custom SVG component | |

**User's choice:** Vertical slider overlaid on a piano keyboard visual
**Notes:** User specified the slider should be combined with a piano keyboard visual, not a standalone slider

| Option | Description | Selected |
|--------|-------------|----------|
| Standard DAW layout (Z=C, S=C#, X=D...) | Familiar to DAW users, maps ~2 octaves | ✓ |
| Custom layout | Different mapping optimized for this app | |

**User's choice:** Standard DAW layout

| Option | Description | Selected |
|--------|-------------|----------|
| All three inline ("220 Hz · A3 · +0c") | Compact, always visible | ✓ |
| Primary + expandable | Hz default, click/hover for note and cents | |

**User's choice:** All three inline

| Option | Description | Selected |
|--------|-------------|----------|
| 65–880 Hz (C2–A5) | Practical singing range for all voice types | |
| 55–1100 Hz (A1–C6) | Wider range including extremes | ✓ |
| You decide | Claude picks reasonable range | |

**User's choice:** 55–1100 Hz (A1–C6)

---

## Vibrato & Jitter

| Option | Description | Selected |
|--------|-------------|----------|
| Inside the worklet | Audio-rate LFO in GlottalProcessor, sample-accurate | ✓ |
| OscillatorNode → detune | Native LFO but f0 isn't an AudioParam | |
| You decide | Claude picks based on architecture | |

**User's choice:** Inside the worklet

| Option | Description | Selected |
|--------|-------------|----------|
| Rate 5.5 Hz, extent 50 cents | Classical singing vibrato | |
| Rate 5 Hz, extent 30 cents | Subtler vibrato | |
| Off by default | Vibrato starts at 0 | |

**User's choice:** Rate 5 Hz, extent 10 cents (custom — even subtler than offered options)

| Option | Description | Selected |
|--------|-------------|----------|
| Per-cycle random | Random f0 offset once per glottal period | ✓ |
| Per-sample noise | Continuous random noise at sample rate | |
| You decide | Claude picks based on voice science | |

**User's choice:** Per-cycle random

---

## Phonation Modes

| Option | Description | Selected |
|--------|-------------|----------|
| OQ + aspiration + tilt | Three parameters for four modes | ✓ |
| OQ + aspiration only | Two existing parameters, simpler | |
| You decide | Claude picks based on Rosenberg model | |

**User's choice:** OQ + aspiration + tilt

| Option | Description | Selected |
|--------|-------------|----------|
| Preset-only for now | 4 named presets, sliders deferred to Phase 6 | ✓ |
| Preset + sliders | Show presets AND underlying parameter sliders | |

**User's choice:** Preset-only for now

| Option | Description | Selected |
|--------|-------------|----------|
| Breathy / Modal / Flow / Pressed | Standard voice science terminology | ✓ |
| Airy / Normal / Bright / Tight | More intuitive for non-specialists | |
| You decide | Claude picks appropriate labels | |

**User's choice:** Breathy / Modal / Flow / Pressed

---

## Voice Presets & UI Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Button group / chips | Horizontal row of labeled buttons | ✓ |
| Dropdown menu | Compact select dropdown | |
| Card grid | Cards with name + f0 range | |

**User's choice:** Button group / chips

| Option | Description | Selected |
|--------|-------------|----------|
| f0 + formants + phonation | Complete voice reset | ✓ |
| f0 + formants only | Doesn't touch phonation | |
| You decide | Claude picks | |

**User's choice:** f0 + formants + phonation (complete voice reset)

| Option | Description | Selected |
|--------|-------------|----------|
| Grouped sections | Controls in labeled sections | ✓ |
| Single toolbar | Everything in one row | |
| You decide | Claude picks layout | |

**User's choice:** Grouped sections

| Option | Description | Selected |
|--------|-------------|----------|
| Mute button + volume slider | Separate mute toggle, standard media pattern | ✓ |
| Volume slider only | Drag to 0 = mute | |
| You decide | Claude picks | |

**User's choice:** Mute button + volume slider

| Option | Description | Selected |
|--------|-------------|----------|
| Key labels on piano visual | QWERTY letter on each piano key, toggleable | ✓ |
| No visual | Keyboard mapping undiscoverable | |
| Tooltip only | Small hint near pitch control | |

**User's choice:** Key labels on piano visual

---

## Claude's Discretion

- Voice preset data values (f0 defaults, formant values per voice type)
- Spectral tilt implementation details
- Phonation preset parameter values
- Piano visual design details
- Key label toggle mechanism
- Section layout proportions

## Deferred Ideas

None
