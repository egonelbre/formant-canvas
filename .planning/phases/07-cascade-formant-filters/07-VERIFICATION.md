---
phase: 07-cascade-formant-filters
verified: 2026-04-13T12:10:00Z
status: passed
score: 3/3 must-haves verified (2 overridden)
overrides_applied: 2
overrides:
  - must_have: "User can switch between parallel and cascade formant filter topologies and hear the difference in vowel quality"
    reason: "Cascade audio deferred — BiquadFilterNode unsuitable for series formant filtering. Types, math, and visualization infrastructure in place for future custom IIR implementation."
    accepted_by: "user"
    accepted_at: "2026-04-13T12:15:00Z"
  - must_have: "In cascade mode, changing F1 frequency automatically affects the relative amplitudes of higher formants (Klatt 1980 behavior) without user adjustment"
    reason: "Same root cause — cascade audio requires custom IIR or worklet-side implementation. cascadeEnvelope math verified correct by tests."
    accepted_by: "user"
    accepted_at: "2026-04-13T12:15:00Z"
gaps:
  - truth: "User can switch between parallel and cascade formant filter topologies and hear the difference in vowel quality"
    status: failed
    reason: "Cascade audio topology intentionally removed after BiquadFilterNode proved unsuitable for series formant filtering (bandpass kills signal, peaking distorts). UI topology toggle removed. Types, math, and visualization infrastructure are in place but the user-facing feature does not exist."
    artifacts:
      - path: "src/lib/audio/bridge.ts"
        issue: "No switchTopology() method, no buildCascadeChain() method — only parallel wiring exists"
      - path: "src/App.svelte"
        issue: "No Parallel/Cascade toggle in UI"
    missing:
      - "Cascade audio implementation using custom IIR coefficients or worklet-side processing"
      - "Topology toggle UI in App.svelte"
  - truth: "In cascade mode, changing F1 frequency automatically affects the relative amplitudes of higher formants (Klatt 1980 behavior) without user adjustment"
    status: failed
    reason: "Same root cause as SC-1: no cascade audio path exists. The cascadeEnvelope math correctly computes the product-of-magnitudes for visualization, but the audio graph is parallel-only."
    artifacts:
      - path: "src/lib/audio/bridge.ts"
        issue: "No cascade wiring — formants always in parallel fan-out topology"
    missing:
      - "Series-wired formant filter chain in AudioBridge"
human_verification:
  - test: "Toggle 4th-order checkbox and verify audible difference"
    expected: "Sharper formant peaks, more selective resonances, visible in FormantCurves"
    why_human: "Perceptual audio quality — cannot verify audible sharpness programmatically"
  - test: "Toggle 4th-order with mute-crossfade — verify no clicks or pops"
    expected: "Smooth 50ms silence during rewire, no audible glitches"
    why_human: "Audio glitch detection requires human listening"
---

# Phase 7: Cascade Formant Filters Verification Report

**Phase Goal:** Users get more realistic vowel sounds through a cascade filter topology where formant amplitudes are automatically coupled
**Verified:** 2026-04-13T12:10:00Z
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can switch between parallel and cascade topologies and hear the difference | FAILED | No switchTopology() in bridge.ts, no topology toggle in App.svelte. Cascade audio removed after BiquadFilterNode proved unsuitable for series filtering. |
| 2 | In cascade mode, F1 changes auto-affect higher formant amplitudes (Klatt 1980) | FAILED | Same root cause: no cascade audio path. Math (cascadeEnvelope) is correct but audio graph is parallel-only. |
| 3 | User can enable 4th-order resonances for sharper formant peaks | VERIFIED | 4th-order checkbox in App.svelte (line 205-207), toggleFilterOrder() with mute-crossfade in bridge.ts, dual biquad pools (A+B), BW compensation via FOURTH_ORDER_BW_FACTOR, visualizations use topologyAwareEnvelope with filterOrder. All 202 tests pass. |

**Score:** 1/3 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/types.ts` | FilterTopology and FilterOrder types | VERIFIED | Lines 18-19: `FilterTopology = 'parallel' \| 'cascade'`, `FilterOrder = 2 \| 4` |
| `src/lib/audio/state.svelte.ts` | filterTopology and filterOrder state fields | VERIFIED | Lines 44-45 with defaults ('parallel', 2), included in snapshot getter (line 76) |
| `src/lib/audio/dsp/formant-response.ts` | cascadeEnvelope, topologyAwareEnvelope functions | VERIFIED | Both exported, correct implementations (product vs sum, 4th-order squaring, BW compensation) |
| `src/lib/audio/dsp/formant-response.test.ts` | Tests for cascade and topology-aware envelope | VERIFIED | 9 new tests in cascadeEnvelope and topologyAwareEnvelope describe blocks, all passing |
| `src/lib/audio/bridge.ts` | Cascade wiring, switchTopology(), toggleFilterOrder() | PARTIAL | toggleFilterOrder() present with mute-crossfade. Dual biquad pools (A+B) created. But no switchTopology(), no buildCascadeChain() -- cascade audio removed. |
| `src/App.svelte` | Topology toggle, filter order toggle | PARTIAL | 4th-order checkbox present and wired. Topology toggle (Parallel/Cascade) removed. |
| `src/lib/components/FormantCurves.svelte` | Topology-aware curve rendering | VERIFIED | Uses topologyAwareEnvelope, shows combined cascade curve or individual parallel curves based on topology, handles 4th-order BW compensation |
| `src/lib/components/HarmonicBars.svelte` | Topology-aware harmonic amplitude | VERIFIED | Uses topologyAwareEnvelope with voiceParams.filterTopology and filterOrder for bar heights |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| formant-response.ts | types.ts | import FilterTopology, FilterOrder | WIRED | Line 1: `import type { FormantParams, FilterTopology, FilterOrder }` |
| HarmonicBars.svelte | formant-response.ts | topologyAwareEnvelope import | WIRED | Line 3: `import { topologyAwareEnvelope }` |
| FormantCurves.svelte | formant-response.ts | topologyAwareEnvelope import | WIRED | Line 4: `import { ... topologyAwareEnvelope, FOURTH_ORDER_BW_FACTOR }` |
| App.svelte | bridge.ts | audioBridge.toggleFilterOrder() | WIRED | Line 207: `audioBridge.toggleFilterOrder(...)` |
| App.svelte | bridge.ts | audioBridge.switchTopology() | NOT_WIRED | No switchTopology call -- cascade toggle removed from UI |
| bridge.ts | state.svelte.ts | voiceParams.filterTopology | PARTIAL | bridge.ts reads filterOrder but does not use filterTopology for audio routing |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| HarmonicBars.svelte | harmonicBars | voiceParams.f0/formants/filterTopology/filterOrder -> topologyAwareEnvelope | Yes (reactive derivation) | FLOWING |
| FormantCurves.svelte | curveData | voiceParams.formants/filterTopology/filterOrder -> topologyAwareEnvelope | Yes (reactive derivation) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All tests pass | npx vitest run | 202/202 passed | PASS |
| cascadeEnvelope tests | npx vitest run formant-response | 18/18 passed (9 new cascade/topology tests) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| FILT-01 | 07-01, 07-02 | User can select between parallel and cascade formant filter topologies | BLOCKED | Types and math exist, but no UI toggle and no cascade audio path |
| FILT-02 | 07-01, 07-02 | Cascade topology produces correct relative formant amplitudes automatically (Klatt 1980) | BLOCKED | cascadeEnvelope math is correct (verified by tests), but no cascade audio implementation |
| FILT-03 | 07-01, 07-02 | Higher-order resonances (4th-order, two biquads per formant) for sharper peaks | SATISFIED | 4th-order checkbox, dual biquad pools, toggleFilterOrder with mute-crossfade, BW compensation, topology-aware visualization |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none found) | - | - | - | - |

No TODOs, FIXMEs, placeholders, empty implementations, or stubs detected in any modified files.

### Human Verification Required

### 1. 4th-Order Audio Quality

**Test:** Run `npm run dev`, enable Expert mode, click Play, toggle the "4th-order" checkbox on and off
**Expected:** Audible difference -- sharper formant peaks with 4th-order, smoother with 2nd-order. Formant curves visually narrow.
**Why human:** Perceptual audio quality cannot be verified programmatically

### 2. 4th-Order Mute-Crossfade

**Test:** While audio is playing, toggle 4th-order on and off rapidly
**Expected:** Smooth 50ms silence during rewire, no clicks or pops
**Why human:** Audio glitch detection requires human listening

### Gaps Summary

Two of three roadmap success criteria are unmet due to cascade audio topology being intentionally removed during implementation. The team discovered that Web Audio `BiquadFilterNode` is unsuitable for series formant filtering: `bandpass` type kills signal in series, `peaking` type causes distortion. A proper cascade implementation requires custom IIR coefficients or worklet-side processing.

**What was delivered:**
- All cascade math infrastructure (cascadeEnvelope, topologyAwareEnvelope) -- tested and correct
- FilterTopology and FilterOrder types
- VoiceParams state fields (filterTopology, filterOrder)
- Visualization components are topology-aware and ready for cascade
- 4th-order formant filter toggle -- fully working with dual biquad pools and mute-crossfade

**What is missing:**
- Cascade audio implementation (needs custom IIR or worklet-side approach)
- Topology toggle UI (removed pending cascade audio)

No later milestone phase explicitly addresses the cascade audio implementation gap. Phases 8-10 cover extended filter chain, vocal tract visualization, and vowel-dependent bandwidths respectively.

**This deviation looks intentional.** The codebase retains all cascade infrastructure (types, math, visualization) for future use, and the removal was documented in the 07-02-SUMMARY.md with clear technical rationale. To accept this deviation and pass the phase, add overrides to this VERIFICATION.md frontmatter:

```yaml
overrides:
  - must_have: "User can switch between parallel and cascade formant filter topologies and hear the difference in vowel quality"
    reason: "Cascade audio deferred — BiquadFilterNode unsuitable for series formant filtering. Types, math, and visualization infrastructure in place for future custom IIR implementation."
    accepted_by: "{your name}"
    accepted_at: "2026-04-13T12:10:00Z"
  - must_have: "In cascade mode, changing F1 frequency automatically affects the relative amplitudes of higher formants (Klatt 1980 behavior) without user adjustment"
    reason: "Same root cause — cascade audio requires custom IIR or worklet-side implementation. cascadeEnvelope math verified correct by tests."
    accepted_by: "{your name}"
    accepted_at: "2026-04-13T12:10:00Z"
```

---

_Verified: 2026-04-13T12:10:00Z_
_Verifier: Claude (gsd-verifier)_
