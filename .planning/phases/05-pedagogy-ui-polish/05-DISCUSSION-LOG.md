# Phase 5: Pedagogy UI & Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 05-pedagogy-ui-polish
**Areas discussed:** Progressive disclosure, Layout & responsiveness, Tooltips & help text, Touch & pointer polish

---

## Progressive Disclosure

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle switch | Single 'Expert mode' toggle in transport bar. Advanced params appear inline within sections | ✓ |
| Expandable sections | Each section has its own collapsible 'Advanced' drawer | |
| Separate panel/tab | Expert controls in a dedicated panel, separate from main controls | |

**User's choice:** Toggle switch
**Notes:** None

### Primary Controls (Default View)

| Option | Description | Selected |
|--------|-------------|----------|
| Core interaction set (7) | Play/Stop, Volume, Pitch, Voice preset, Phonation preset, Vowel chart, Strategy selector | ✓ |
| Minimal starter set (5) | Play/Stop, Volume, Pitch, Voice preset, Vowel chart | |
| You decide | Claude picks | |

**User's choice:** Core interaction set (7 controls)
**Notes:** None

### Expert Mode Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Phonation + formant bandwidths | OQ/tilt/aspiration + F1-F4 bandwidth sliders | |
| Phonation + bandwidths + numeric readouts | Same plus Hz/dB readouts next to every parameter | ✓ |
| You decide | Claude picks | |

**User's choice:** Phonation + bandwidths + numeric readouts
**Notes:** Researcher-grade detail wanted

---

## Layout & Responsiveness

**User provided a hand-drawn layout sketch** instead of selecting from preset options. Key elements:

- Full-screen, no-scroll layout filling the viewport
- Piano keyboard at the bottom, full width
- Three panels stacked vertically on right: C (vowel chart, top), B (R2 strategy chart, middle), A (R1 strategy chart, bottom)
- Formant harmonics (PianoHarmonics) above keyboard on left
- Voice type selection along top border
- Vibrato controls below voice selection
- Phonation and Strategy as separate panels on left
- R1/R2 strategy charts: Sundberg-style resonance frequency vs pitch with harmonic diagonals

### Scope: R1/R2 Strategy Charts

| Option | Description | Selected |
|--------|-------------|----------|
| Include in Phase 5 | Central to pedagogy, layout depends on them | ✓ |
| Separate phase before Phase 5 | Build as Phase 4.1 insertion | |
| Defer to v2 | Do layout without A/B panels | |

**User's choice:** Include in Phase 5

### Layout Verification

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, that's right | A/B/C stacked vertically on right sharing frequency axis | ✓ |
| Close but needs adjustment | | |

**User's choice:** Layout reading confirmed correct

### Strategy Chart Axis Alignment

| Option | Description | Selected |
|--------|-------------|----------|
| Align with keyboard | A/B X-axes match piano keyboard pitch range | |
| Independent axes | A/B have their own pitch range (C2-C7) | ✓ |
| You decide | | |

**User's choice:** Independent axes
**Notes:** Strategy charts have their own pitch range, not necessarily matching the keyboard

---

## Tooltips & Help Text

### Tooltip Style

| Option | Description | Selected |
|--------|-------------|----------|
| Short plain-language text | 1-2 sentence, no jargon | |
| Rich tooltips with examples | Explanation + concrete pedagogical example | ✓ |
| Minimal -- label only | No tooltips, help page instead | |

**User's choice:** Rich tooltips with examples

### Tooltip Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Hover + focus | Mouse hover AND keyboard focus | |
| Hover only | Simpler implementation | |
| `?` icon button | Tap/click icon to show tooltip | ✓ (custom) |

**User's choice:** `?` icon button (user's own suggestion)
**Notes:** "Tablets don't work that well with hover states" -- user explicitly requested a `?` icon that can be pressed to display the tooltip. Desktop can also support hover as convenience.

---

## Touch & Pointer Polish

### Touch Target Size

| Option | Description | Selected |
|--------|-------------|----------|
| 44px minimum | Apple HIG standard | ✓ |
| 36px minimum | Material Design 3 compact | |
| You decide | | |

**User's choice:** 44px minimum

### Piano Multi-touch

| Option | Description | Selected |
|--------|-------------|----------|
| Single touch only | One note at a time | |
| Multi-touch, last-note priority | Multiple fingers, last touch sets f0, visual feedback on all | ✓ |
| You decide | | |

**User's choice:** Multi-touch with last-note priority
**Notes:** Visual feedback on all touched keys, but monophonic -- last touch wins for f0

---

## Claude's Discretion

- CSS grid/flexbox implementation details
- Strategy chart visual styling
- Tooltip component implementation
- Expert toggle placement and styling
- Dark theme refinements
- Responsive breakpoint behavior

## Deferred Ideas

None -- discussion stayed within phase scope.
