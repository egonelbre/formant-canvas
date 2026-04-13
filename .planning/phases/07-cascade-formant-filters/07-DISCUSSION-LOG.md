# Phase 7: Cascade Formant Filters - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 07-cascade-formant-filters
**Areas discussed:** Filter topology switching UX, Cascade implementation approach, Higher-order resonances, Visualization impact

---

## Filter Topology Switching UX

| Option | Description | Selected |
|--------|-------------|----------|
| Segmented toggle | Same pattern as Phase 6's Rosenberg/LF toggle — Parallel\|Cascade segmented control | :heavy_check_mark: |
| Dropdown selector | Compact dropdown with Parallel/Cascade options | |
| You decide | Claude picks based on existing UI patterns | |

**User's choice:** Segmented toggle
**Notes:** Consistent with established Phase 6 pattern

---

### Gain Slider Behavior in Cascade Mode

| Option | Description | Selected |
|--------|-------------|----------|
| Hide gain sliders | Hide per-formant gain controls entirely in cascade mode | :heavy_check_mark: |
| Show as read-only | Display auto-computed values grayed out | |
| Keep editable as overrides | Manual overrides on top of Klatt coupling | |

**User's choice:** Hide gain sliders
**Notes:** None

---

### Topology Switch Transition

| Option | Description | Selected |
|--------|-------------|----------|
| Same crossfade | Reuse 50ms mute-switch pattern from AudioBridge.switchModel() | :heavy_check_mark: |
| Instant swap | Rewire graph immediately without fade | |
| You decide | Claude picks based on testing | |

**User's choice:** Same crossfade
**Notes:** None

---

## Cascade Implementation Approach

### Filter Location

| Option | Description | Selected |
|--------|-------------|----------|
| Native BiquadFilterNodes in series | Reuse BiquadFilterNode approach, wire in series | :heavy_check_mark: |
| Custom IIR inside worklet | Inlined biquad math in glottal-processor | |
| You decide | Claude picks based on constraints | |

**User's choice:** Native BiquadFilterNodes rewired in series
**Notes:** None

---

### Amplitude Coupling

| Option | Description | Selected |
|--------|-------------|----------|
| Main thread via setTargetAtTime | Compute Klatt amplitudes, apply to GainNodes | |
| Skip gain nodes in cascade | Series connection inherently produces correct amplitudes | :heavy_check_mark: |
| You decide | Claude determines based on Klatt reference | |

**User's choice:** Skip gain nodes in cascade
**Notes:** True cascade transfer function handles amplitude relationships inherently

---

## Higher-Order Resonances

### Exposure

| Option | Description | Selected |
|--------|-------------|----------|
| Global toggle | Single checkbox for 4th-order across all formants | :heavy_check_mark: |
| Per-formant toggle | Each formant has its own 2nd/4th order toggle | |
| Always 4th-order in cascade | Cascade implies 4th-order, no extra toggle | |

**User's choice:** Global toggle
**Notes:** None

---

### Availability

| Option | Description | Selected |
|--------|-------------|----------|
| Both modes | 4th-order works in parallel and cascade | :heavy_check_mark: |
| Cascade only | 4th-order only available in cascade mode | |
| You decide | Claude picks based on complexity | |

**User's choice:** Both modes
**Notes:** None

---

## Visualization Impact

### Spectral Envelope

| Option | Description | Selected |
|--------|-------------|----------|
| Compute cascade response mathematically | Add cascadeEnvelope() that multiplies transfer functions | :heavy_check_mark: |
| Use AnalyserNode for live response | Feed test signals through actual chain | |
| You decide | Claude picks for accuracy vs performance | |

**User's choice:** Compute cascade response mathematically
**Notes:** None

---

### Overlays and Vowel Chart

| Option | Description | Selected |
|--------|-------------|----------|
| Same overlays, same behavior | Everything works identically regardless of topology | :heavy_check_mark: |
| Annotate with topology indicator | Small badge on spectral envelope view | |
| You decide | Claude picks | |

**User's choice:** Same overlays, same behavior
**Notes:** None

---

## Claude's Discretion

- BiquadFilterNode wiring logic for cascade mode
- 4th-order toggle graph management (pre-create vs create/destroy)
- filterTopology field placement (VoiceParams vs separate UI state)
- Spectral envelope styling differences
- Filter type for cascade biquads (bandpass vs peaking)

## Deferred Ideas

None
