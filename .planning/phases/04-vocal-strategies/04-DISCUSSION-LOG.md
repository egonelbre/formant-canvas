# Phase 4: Vocal Strategies - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 04-vocal-strategies
**Areas discussed:** Strategy selector UI, Overlay visualization, Locked mode behavior, Drag conflict resolution

---

## Strategy Selector UI

| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar panel | Dedicated panel alongside visualizations, always visible | ✓ |
| Toolbar strip above piano | Compact horizontal strip, one-click chips | |
| Dropdown on F1/F2 chart | Small dropdown anchored to the chart | |
| You decide | Claude picks best placement | |

**User's choice:** Sidebar panel
**Notes:** Consistent with existing VoicePresets and PhonationMode panel placement.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Notation + short phrase | e.g., "R1:f0 -- First formant tracks pitch" | ✓ |
| Notation + full sentence | More pedagogical, needs more space | |
| You decide | Claude picks based on space | |

**User's choice:** Notation + short phrase

---

| Option | Description | Selected |
|--------|-------------|----------|
| Speech (untuned) default | App always has an active strategy | ✓ |
| No strategy selected | Strategy is opt-in layer | |

**User's choice:** Speech (untuned) default
**Notes:** Makes the selector feel like a mode switch rather than an optional feature.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Global toggle | One switch: Overlay / Locked / Off | ✓ |
| Per-strategy state | Each strategy remembers its mode | |
| You decide | Claude picks | |

**User's choice:** Global toggle

---

| Option | Description | Selected |
|--------|-------------|----------|
| Two independent lists | R1 strategy + R2 strategy side by side | |
| Combined preset matrix | Grid showing common R1/R2 combinations | ✓ |
| You decide | Claude picks | |

**User's choice:** Combined preset matrix
**Notes:** User also requested separate R1/R2 strategy control and an "Auto strategy" option that picks the best strategy for current voice/pitch/vowel.

---

## Overlay Visualization

| Option | Description | Selected |
|--------|-------------|----------|
| Vertical target lines | Thin lines at target frequencies over harmonic bars | ✓ |
| Highlighted key regions | Colored background tint on target keys | |
| Target markers with arrows | Arrows pointing to target with connecting line | |
| You decide | Claude picks | |

**User's choice:** Vertical target lines (piano view)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Target crosshair/dot | Distinct marker at target F1/F2 position | |
| Target with connecting line | Target marker + dashed line from current to target | ✓ |
| Shaded target region | Shaded zone around target | |
| You decide | Claude picks | |

**User's choice:** Target with connecting line (F1/F2 chart)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Real-time tracking | Targets move continuously as f0 changes | ✓ |
| Settle then update | Targets update after f0 stops (debounced) | |

**User's choice:** Real-time tracking

---

| Option | Description | Selected |
|--------|-------------|----------|
| Single overlay color | One consistent color for all strategy overlays | ✓ |
| Per-strategy colors | Each strategy gets its own color | |
| You decide | Claude picks | |

**User's choice:** Single overlay color

---

## Locked Mode Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Instant snap | Formant jumps immediately to target ratio | |
| Smooth interpolation | Formant glides over ~50-100ms | ✓ |
| You decide | Claude picks | |

**User's choice:** Smooth interpolation

---

| Option | Description | Selected |
|--------|-------------|----------|
| Clamp with visual warning | Formant stops at boundary, marker turns red | ✓ |
| Blend toward neutral | Smooth blend from target to vowel's natural value | |
| Let it go out of range | No clamping, ratio followed everywhere | |

**User's choice:** Clamp with visual warning

---

| Option | Description | Selected |
|--------|-------------|----------|
| F3+F4 clustered | Classic singer's formant | |
| F3+F4+F5 | More accurate, needs F5 | ✓ |
| You decide | Based on 4-formant constraint | |

**User's choice:** F3+F4+F5 -- add F5 to VoiceParams
**Notes:** User explicitly wants F5 added to the implementation for proper singer's formant cluster acoustics.

---

## Drag Conflict Resolution

| Option | Description | Selected |
|--------|-------------|----------|
| Unlock strategy on drag | Switches to overlay/off mode | |
| Block drag with feedback | Prevents drag, shows not-allowed cursor | |
| Drag overrides temporarily | Works during drag, re-locks on release | ✓ |
| You decide | Claude picks | |

**User's choice:** Drag overrides temporarily

---

| Option | Description | Selected |
|--------|-------------|----------|
| Pulsing or dashed line | Line between current and target pulses/dashes | ✓ |
| Handle color change | Drag handle changes color during override | |
| You decide | Claude picks | |

**User's choice:** Pulsing or dashed connecting line

---

## Claude's Discretion

- Exact overlay color choice
- Target line thickness, opacity, and label positioning
- Connecting line dash pattern and animation timing
- Auto-strategy heuristic details
- Preset matrix dimensions and included combinations
- F5 default values
- Sidebar layout internals
- Warning style for out-of-range
- Interpolation time constant (within ~50-100ms)

## Deferred Ideas

None -- discussion stayed within phase scope.
