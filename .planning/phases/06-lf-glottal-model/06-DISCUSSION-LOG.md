# Phase 6: LF Glottal Model - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 06-LF Glottal Model
**Areas discussed:** Model switching UX, Rd slider behavior, Decomposition view, Anti-aliasing approach

---

## Model Switching UX

| Option | Description | Selected |
|--------|-------------|----------|
| Segmented toggle | Two-segment button (Rosenberg \| LF) in Source section, near phonation mode selector | ✓ |
| Dropdown selector | Dropdown menu, more extensible for future models but heavier for two options | |
| You decide | Claude picks based on existing UI patterns | |

**User's choice:** Segmented toggle
**Notes:** None

### Transition behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Mute-switch | ~50ms fade out, swap model, fade in. Prevents clicks. | ✓ |
| Instant switch | Just swap the pulse generator. May click. | |
| You decide | Claude picks safest approach | |

**User's choice:** Mute-switch
**Notes:** None

### Control visibility when LF active

| Option | Description | Selected |
|--------|-------------|----------|
| Replace with Rd | Rd slider replaces OQ and spectral tilt. Cleaner UI. | ✓ |
| Keep all visible | Show Rd as primary, OQ and tilt as read-only derived values | |
| Show both, editable | Full manual override of individual LF params | |

**User's choice:** Replace with Rd
**Notes:** None

---

## Rd Slider Behavior

### Display style

| Option | Description | Selected |
|--------|-------------|----------|
| Labeled range slider | Horizontal slider with labeled ticks | |
| Vertical voice quality strip | Vertical strip with color-coded zones | |
| You decide | Claude picks based on UI patterns | |

**User's choice:** Other — Labeled range slider but with a dynamic explainer label that changes when the value changes, instead of fixed tick labels. Conserves space.
**Notes:** User prefers a single label that updates contextually (e.g., "Pressed", "Modal", "Breathy") over static tick marks.

### Default value

| Option | Description | Selected |
|--------|-------------|----------|
| Rd = 1.0 (modal) | Standard modal phonation, closest to current Rosenberg OQ=0.6 default | ✓ |
| Match current phonation | Auto-map current phonation mode to Rd value | |
| You decide | Claude picks from literature | |

**User's choice:** Rd = 1.0 (modal voice)
**Notes:** None

### Phonation mode integration

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, as Rd presets | Phonation buttons set Rd to preset values, user can fine-tune | ✓ |
| Hide phonation modes | Phonation selector disappears when LF active | |
| You decide | Claude picks | |

**User's choice:** Yes, as Rd presets
**Notes:** None

---

## Decomposition View

### Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Expandable panel below pulse | Collapsible section below glottal pulse visual | ✓ |
| Dialog/modal | Dedicated dialog opened via button | |
| Always visible sidebar | Persistent panel | |

**User's choice:** Expandable panel below pulse
**Notes:** None

### Content

| Option | Description | Selected |
|--------|-------------|----------|
| Annotated waveform + values | LF waveform with Tp/Te/Ta/Tc markers + Ra/Rk/Rg/Ta readouts | ✓ |
| Numeric values only | Compact table of derived values | |
| You decide | Claude picks detail level | |

**User's choice:** Annotated waveform + values
**Notes:** None

---

## Anti-aliasing Approach

### Wavetable strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-computed at init | Generate wavetables at worklet startup, one per octave, interpolate at runtime | ✓ |
| Computed on Rd change | Recompute only when Rd changes | |
| You decide | Claude picks | |

**User's choice:** Pre-computed at init
**Notes:** None

### Rosenberg anti-aliasing

| Option | Description | Selected |
|--------|-------------|----------|
| Keep analytical | Rosenberg stays as-is, smooth waveform doesn't alias audibly | ✓ |
| Add wavetables to both | Uniform treatment across models | |
| You decide | Claude picks based on audibility | |

**User's choice:** Keep Rosenberg analytical
**Notes:** None

---

## Claude's Discretion

- Number of wavetable octave divisions and interpolation strategy
- Exact Rd-to-label mapping thresholds
- LF parameter computation formulas
- Waveform annotation visual style
- Exact Rd preset values for phonation mode buttons
