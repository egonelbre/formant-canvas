# Phase 7: Cascade Formant Filters - Research

**Researched:** 2026-04-13
**Domain:** Web Audio filter topology, Klatt 1980 cascade synthesis, BiquadFilterNode chaining
**Confidence:** HIGH

## Summary

Phase 7 adds a cascade (series) formant filter topology as an alternative to the existing parallel topology, plus optional 4th-order resonances. The cascade topology is the standard Klatt 1980 approach for vowels where formant amplitudes emerge automatically from the series connection -- no per-formant gain controls needed. The existing codebase uses native `BiquadFilterNode`s in parallel; cascade mode rewires them in series. The `switchModel()` mute-crossfade pattern from Phase 6 is directly reusable for topology switching.

The key technical insight from studying the klatt-syn source is that cascade mode simply chains resonators in series (`v = F1.step(F2.step(F3.step(...)))`) with no per-formant amplitude parameters -- the transfer function is the product of individual resonator transfer functions. This maps cleanly to Web Audio: disconnect the parallel fan-out, reconnect BiquadFilterNodes in series. For 4th-order, double each biquad by adding a second identical BiquadFilterNode per formant in the chain.

**Primary recommendation:** Implement cascade as a rewiring of existing BiquadFilterNode instances (not custom IIR), with the `switchModel()` mute-crossfade pattern for topology transitions, and a `cascadeEnvelope()` function that multiplies (not sums) formant magnitudes for visualization.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Segmented toggle (Parallel | Cascade) in the Formants section, same pattern as Phase 6's Rosenberg/LF toggle
- **D-02:** Mute-crossfade transition when switching topologies (50ms fade out, rewire, fade in) -- reuse AudioBridge.switchModel() pattern
- **D-03:** In cascade mode, per-formant gain sliders (f1Gain-f5Gain) are hidden entirely. Only frequency and bandwidth remain user-adjustable.
- **D-04:** Use native BiquadFilterNodes rewired in series (worklet -> F1 -> F2 -> F3 -> F4 -> F5 -> master) rather than custom IIR inside the worklet.
- **D-05:** In cascade mode, no per-formant GainNodes between filters. The series connection inherently produces correct relative amplitudes.
- **D-06:** Global toggle for 4th-order resonances -- a single checkbox/toggle in the Formants section. When enabled, each formant uses two cascaded biquads instead of one.
- **D-07:** 4th-order toggle is available in both parallel and cascade modes. In parallel: each formant branch gets two biquads in series before its gain node. In cascade: the full chain doubles (10 biquads total instead of 5).
- **D-08:** Add a `cascadeEnvelope()` function that multiplies (rather than sums) formant transfer functions in series.
- **D-09:** Formant range overlays, vowel chart, and piano harmonics behave identically regardless of topology.

### Claude's Discretion
- Exact BiquadFilterNode wiring logic for cascade mode in AudioBridge
- How to handle the 4th-order toggle's interaction with the filter graph (pre-create all nodes or create/destroy on toggle)
- Whether to add a `filterTopology` field to VoiceParams or keep it in a separate UI state
- Spectral envelope visualization styling differences between parallel and cascade curves
- Filter type choice for cascade biquads (bandpass vs peaking) based on Klatt 1980 reference

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FILT-01 | User can select between parallel and cascade formant filter topologies | Segmented toggle (D-01), switchTopology() method in AudioBridge, filterTopology field in VoiceParams |
| FILT-02 | Cascade topology produces correct relative formant amplitudes automatically (Klatt 1980) | Series BiquadFilterNode chain with no per-formant gains; cascade envelope math for visualization |
| FILT-03 | Higher-order resonances (4th-order, two biquads per formant) for sharper peaks | Second biquad per formant with identical freq/Q params; works in both topologies |
</phase_requirements>

## Architecture Patterns

### Cascade vs Parallel Topology (from klatt-syn analysis)

**Parallel (existing):** Source fans out to N independent bandpass filters, each with its own gain, outputs summed. Transfer function = sum of individual formant responses. Requires manual amplitude tuning per formant. [VERIFIED: codebase `bridge.ts` lines 56-121]

**Cascade (new):** Source passes through resonators in series: `source -> F1 -> F2 -> F3 -> F4 -> F5 -> output`. Transfer function = product of individual formant responses. Amplitudes emerge automatically from the cascaded transfer function. No per-formant gain nodes. [VERIFIED: klatt-syn `computeCascadeBranch()` lines 335-349]

```
# Parallel (existing)
worklet --+--> BiquadF1 --> GainF1 --+
          +--> BiquadF2 --> GainF2 --+--> SumGain --> MasterGain
          +--> BiquadF3 --> GainF3 --+
          +--> BiquadF4 --> GainF4 --+
          +--> BiquadF5 --> GainF5 --+

# Cascade (new)
worklet --> BiquadF1 --> BiquadF2 --> BiquadF3 --> BiquadF4 --> BiquadF5 --> MasterGain

# 4th-order cascade
worklet --> F1a --> F1b --> F2a --> F2b --> F3a --> F3b --> F4a --> F4b --> F5a --> F5b --> MasterGain
```

### Recommended Approach: Filter Type for Cascade Biquads

**Use `bandpass` type** for cascade biquads, same as parallel. [VERIFIED: existing code uses `bandpass`, klatt-syn Resonator is a second-order bandpass]

The klatt-syn `Resonator` class implements a standard second-order resonator with coefficients:
```
r = exp(-PI * bw / sampleRate)
c = -(r^2)
b = 2 * r * cos(2*PI*f/sampleRate)
a = (1 - b - c) * dcGain
```

The Web Audio `BiquadFilterNode` with type `bandpass` implements the same second-order bandpass from the Audio EQ Cookbook. The Q parameter maps from bandwidth via `Q = centerFreq / bandwidth` (existing `bandwidthToQ()` utility). [VERIFIED: `formant-utils.ts`]

**Key difference from Klatt's resonator:** Klatt's cascade resonators use DC gain = 1, meaning at 0 Hz the resonator passes signal through. The Web Audio `bandpass` filter has unity gain at center frequency and attenuates at DC. For the cascade to produce natural-sounding vowels, this is actually fine because the series of bandpass filters will still shape the spectrum correctly -- the relative peaks emerge from the product of transfer functions. The absolute level will differ from Klatt's original but relative formant amplitudes (the whole point of cascade) will be correct. [ASSUMED]

### Recommended Approach: Pre-create All Nodes

**Pre-create all biquad nodes at init time** (both 2nd-order and 4th-order sets), toggle connections rather than creating/destroying nodes.

Rationale:
- Creating `BiquadFilterNode` during audio playback can cause glitches [ASSUMED]
- The cost is 10 extra biquad nodes (for 4th-order) sitting idle -- negligible
- Toggling 4th-order becomes: disconnect/reconnect the second biquad in each formant pair
- This mirrors the existing pattern where all 5 parallel formant filters + gains are created at init

```typescript
// Pre-create pools
private formantBiquadsA: BiquadFilterNode[] = [];  // Primary (always active)
private formantBiquadsB: BiquadFilterNode[] = [];  // Secondary (4th-order only)
```

### Recommended Approach: filterTopology in VoiceParams

**Add `filterTopology` and `filterOrder` to VoiceParams**, not separate UI state.

Rationale:
- These parameters affect the audio graph (audible output), same as `glottalModel`
- They should be part of `snapshot` for reactive `$effect` tracking
- They should persist with voice presets (if presets are extended later)
- Follows the established pattern: `glottalModel` is in VoiceParams, not separate UI state

```typescript
// In VoiceParams class
filterTopology = $state<'parallel' | 'cascade'>('parallel');
filterOrder = $state<2 | 4>(2);
```

### Recommended Approach: Topology Switching via switchTopology()

**Add `switchTopology()` method** to AudioBridge, modeled on `switchModel()`.

```typescript
async switchTopology(newTopology: 'parallel' | 'cascade'): Promise<void> {
  // 1. Fade master gain to 0 over ~50ms
  // 2. setTimeout 50ms:
  //    a. Disconnect all formant nodes
  //    b. Reconnect in new topology (parallel fan-out or cascade series)
  //    c. Set voiceParams.filterTopology = newTopology
  //    d. syncParams()
  //    e. Fade master gain back in
}
```

Similarly, **add `toggleFilterOrder()`** that disconnects/reconnects the B-set biquads.

### Project Structure Changes

```
src/lib/audio/
  bridge.ts              # Modified: add cascade wiring, switchTopology(), toggleFilterOrder()
  state.svelte.ts        # Modified: add filterTopology, filterOrder fields + snapshot
  dsp/
    formant-response.ts  # Modified: add cascadeEnvelope(), topologyAwareEnvelope()
    formant-response.test.ts  # Modified: add tests for cascadeEnvelope
    formant-utils.ts     # No changes needed
src/lib/components/
  FormantCurves.svelte   # Modified: use topology-aware envelope
  HarmonicBars.svelte    # Modified: use topology-aware envelope
  App.svelte             # Modified: add topology toggle, filter order toggle, hide gains in cascade
src/lib/types.ts         # Modified: add FilterTopology, FilterOrder types
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Formant resonator | Custom IIR in worklet | Native `BiquadFilterNode` (bandpass) | Browser-optimized, de-zippered, runs on audio thread natively |
| Parameter smoothing | Manual interpolation | `AudioParam.setTargetAtTime()` | Native exponential smoothing, sample-accurate, no zipper noise |
| Topology crossfade | Complex gain scheduling | Mute-crossfade (50ms silence) | Simple, proven in Phase 6's `switchModel()`, avoids phase-cancellation artifacts |

## Common Pitfalls

### Pitfall 1: Disconnecting Nodes While Audio is Playing
**What goes wrong:** Calling `node.disconnect()` and `node.connect()` during active audio causes clicks/pops.
**Why it happens:** The audio thread sees a sudden signal discontinuity.
**How to avoid:** Always mute first (fade master to 0), wait for fade, then rewire, then fade back in. This is exactly what D-02 specifies and `switchModel()` already implements.
**Warning signs:** Audible clicks when toggling topology.

### Pitfall 2: Forgetting to Update Both Biquads in 4th-Order Mode
**What goes wrong:** Only the primary biquad (A) gets parameter updates; the secondary (B) retains stale freq/Q values.
**Why it happens:** `syncParams()` iterates over `formantBiquadsA` but forgets `formantBiquadsB`.
**How to avoid:** In `syncParams()`, always update both A and B biquads with the same freq/Q values. Whether B is connected or not, keeping it in sync avoids glitches on toggle.
**Warning signs:** Sound changes when toggling 4th-order on/off even with the same formant settings.

### Pitfall 3: Cascade Gain Level Too Low or Too High
**What goes wrong:** Cascade output is much quieter or louder than parallel output, making topology switching jarring.
**Why it happens:** The cascade product of transfer functions has a different overall gain than the parallel sum. With bandpass filters (unity at center), cascading 5 bandpass filters multiplies the center-frequency response: frequencies that sit at a formant peak pass through at ~1, but everything between formants gets attenuated much more aggressively than in parallel mode.
**How to avoid:** Add a makeup gain after the cascade chain. Empirically tune it so that switching topology at default /a/ settings produces roughly equal perceived loudness. A factor of 2-5x makeup gain is typical. [ASSUMED]
**Warning signs:** Large volume jump when switching between parallel and cascade.

### Pitfall 4: Spectral Envelope Visualization Not Matching Audio
**What goes wrong:** The FormantCurves and HarmonicBars show parallel envelope shape even in cascade mode.
**Why it happens:** Both components currently call `spectralEnvelope()` which sums formant responses (parallel). Forgetting to switch to `cascadeEnvelope()` (which multiplies) makes the visual lie about the sound.
**How to avoid:** Create a `topologyAwareEnvelope(freq, formants, topology, order)` function that dispatches to the correct computation. Use this everywhere.
**Warning signs:** Harmonic bars don't match what you hear in cascade mode.

### Pitfall 5: BiquadFilterNode Q vs Bandwidth Mismatch in Cascade
**What goes wrong:** Cascade formants sound too narrow or too wide compared to expected Klatt behavior.
**Why it happens:** The `bandwidthToQ` formula `Q = fc / bw` is correct for the Web Audio bandpass definition (constant-Q), but Klatt uses a constant-bandwidth resonator. At low frequencies (F1 ~300-800 Hz) the difference is small. At higher formants (F4-F5 > 3500 Hz), the effective bandwidth may differ.
**How to avoid:** For this pedagogical app, the simple `Q = fc / bw` mapping is adequate and already used in parallel mode. Both topologies use the same mapping, so relative behavior is consistent. [VERIFIED: existing `bandwidthToQ()` in `formant-utils.ts`]
**Warning signs:** None expected for pedagogical accuracy.

## Code Examples

### Cascade Envelope Computation

```typescript
// Source: derived from klatt-syn computeCascadeBranch() + formant-response.ts patterns
// [VERIFIED: klatt-syn Klatt.js lines 335-349, formant-response.ts]

/**
 * Cascade envelope: product of individual formant magnitudes.
 * In cascade, the transfer function is the product (not sum) of resonators.
 * For 4th-order, each formant's magnitude is squared (two identical biquads in series).
 */
export function cascadeEnvelope(
  freq: number,
  formants: FormantParams[],
  order: 2 | 4 = 2,
): number {
  let product = 1;
  for (const f of formants) {
    // Normalize: formantMagnitude returns gain at center (= f.gain).
    // For cascade, we want the shape only (relative response), not the absolute gain.
    // Use gain=1 for shape, then the product gives the cascade transfer function shape.
    const mag = formantMagnitude(freq, { freq: f.freq, bw: f.bw, gain: 1 });
    if (order === 4) {
      product *= mag * mag; // Two identical biquads = magnitude squared
    } else {
      product *= mag;
    }
  }
  return product;
}
```

### Topology-Aware Envelope Dispatcher

```typescript
// [ASSUMED pattern based on D-08, D-09]

export function topologyAwareEnvelope(
  freq: number,
  formants: FormantParams[],
  topology: 'parallel' | 'cascade',
  order: 2 | 4 = 2,
): number {
  if (topology === 'cascade') {
    return cascadeEnvelope(freq, formants, order);
  }
  // Parallel: sum of individual responses (existing behavior)
  // For 4th-order parallel, each formant magnitude is squared before summing
  let sum = 0;
  for (const f of formants) {
    let mag = formantMagnitude(freq, f);
    if (order === 4) {
      mag = mag * mag;
    }
    sum += mag;
  }
  return sum;
}
```

### AudioBridge Cascade Wiring

```typescript
// [ASSUMED pattern based on D-04, D-05, existing buildFormantChain()]

private buildCascadeChain(): void {
  if (!this.ctx || !this.workletNode || !this.masterGain) return;

  // Disconnect all existing formant connections
  this.workletNode.disconnect();
  for (const f of this.formantBiquadsA) f.disconnect();
  for (const f of this.formantBiquadsB) f.disconnect();
  for (const g of this.formantGains) g.disconnect();

  const is4thOrder = voiceParams.filterOrder === 4;

  // Chain: worklet -> F1a [-> F1b] -> F2a [-> F2b] -> ... -> F5a [-> F5b] -> masterGain
  let prev: AudioNode = this.workletNode;
  for (let i = 0; i < 5; i++) {
    prev.connect(this.formantBiquadsA[i]);
    prev = this.formantBiquadsA[i];
    if (is4thOrder) {
      prev.connect(this.formantBiquadsB[i]);
      prev = this.formantBiquadsB[i];
    }
  }
  prev.connect(this.masterGain);
}
```

### Topology Switch Method

```typescript
// [ASSUMED pattern based on D-02, existing switchModel()]

async switchTopology(newTopology: 'parallel' | 'cascade'): Promise<void> {
  if (!this.ctx || !this.masterGain) {
    voiceParams.filterTopology = newTopology;
    return;
  }
  const now = this.ctx.currentTime;
  const prevGain = voiceParams.masterGain;

  // Fade out over ~50ms
  this.masterGain.gain.setTargetAtTime(0, now, 0.015);

  setTimeout(() => {
    voiceParams.filterTopology = newTopology;
    if (newTopology === 'cascade') {
      this.buildCascadeChain();
    } else {
      this.buildParallelChain();
    }
    this.syncParams();
    if (this.ctx && this.masterGain) {
      const t = this.ctx.currentTime;
      const effectiveGain = (!voiceParams.playing || voiceParams.muted) ? 0 : prevGain;
      this.masterGain.gain.setTargetAtTime(effectiveGain, t, 0.015);
    }
  }, 50);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Parallel-only formant filters | Parallel + Cascade selectable | Klatt 1980, standard in speech synthesis | Cascade gives automatic amplitude coupling; parallel needed for fricatives |
| 2nd-order resonators only | 4th-order (two cascaded 2nd-order) | Standard DSP technique | Sharper formant peaks, more selective resonances |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Web Audio bandpass in cascade produces correct relative formant amplitudes despite different DC gain from Klatt resonator | Architecture Patterns | Vowels may sound wrong in cascade mode; fix: adjust filter type or add DC gain normalization |
| A2 | Cascade output needs makeup gain (2-5x) to match parallel loudness | Pitfall 3 | Volume mismatch on toggle; fix: empirical tuning, easy to adjust |
| A3 | Creating BiquadFilterNode during playback can cause glitches | Architecture Patterns | If false, could create/destroy on toggle instead of pre-creating; low risk either way |
| A4 | 4th-order parallel should square each formant magnitude before summing for visualization | Code Examples | Visual might not match audio; fix: verify against actual BiquadFilterNode frequency response |

## Open Questions

1. **Cascade makeup gain value**
   - What we know: Cascade will be quieter than parallel at default settings because product < sum for off-peak frequencies
   - What's unclear: The exact multiplier needed for perceptual loudness matching
   - Recommendation: Start with a makeupGain of 3.0, tune empirically during implementation. Could also normalize to peak amplitude of /a/ vowel.

2. **Spectral envelope visualization: individual curves or combined?**
   - What we know: D-08 says add `cascadeEnvelope()`. FormantCurves currently draws individual per-formant curves.
   - What's unclear: In cascade mode, should we show individual formant curves (misleading since they're multiplicative) or only the combined cascade envelope?
   - Recommendation: Show the combined cascade envelope as a single curve in cascade mode, plus keep the individual formant center-frequency dashed lines for reference. Individual curves are meaningless in cascade since they interact multiplicatively.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FILT-01 | Topology switching between parallel/cascade | unit (state + envelope dispatch) | `npx vitest run src/lib/audio/dsp/formant-response.test.ts -t "topology"` | No -- Wave 0 |
| FILT-02 | Cascade envelope produces correct relative amplitudes | unit (math) | `npx vitest run src/lib/audio/dsp/formant-response.test.ts -t "cascadeEnvelope"` | No -- Wave 0 |
| FILT-03 | 4th-order resonances (magnitude squared) | unit (math) | `npx vitest run src/lib/audio/dsp/formant-response.test.ts -t "4th-order"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/audio/dsp/formant-response.test.ts` -- extend with cascadeEnvelope and topologyAwareEnvelope tests
- [ ] No new test files needed -- existing test file covers the formant-response module

## Security Domain

Not applicable -- this phase is purely client-side audio DSP with no network, auth, or data storage concerns. All changes are to local audio graph wiring and math functions.

## Sources

### Primary (HIGH confidence)
- klatt-syn npm package v1.0.8 source (`Klatt.js`) -- cascade branch implementation, Resonator class, parallel vs cascade topology [VERIFIED: extracted and read full source]
- Existing codebase: `bridge.ts`, `state.svelte.ts`, `formant-response.ts`, `formant-utils.ts` [VERIFIED: read all files]
- [BiquadFilterNode MDN](https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode) -- bandpass filter type, Q parameter semantics [CITED]

### Secondary (MEDIUM confidence)
- [Klatt 1980 paper](https://www.fon.hum.uva.nl/david/ma_ssp/doc/Klatt-1980-JAS000971.pdf) -- original cascade/parallel formant synthesizer design [CITED]
- [Berkeley Phonlab Klatt reference](https://linguistics.berkeley.edu/plab/guestwiki/index.php?title=Klatt_Synthesizer) -- cascade topology advantage (automatic amplitude coupling) [CITED]

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, uses existing BiquadFilterNode + codebase patterns
- Architecture: HIGH -- directly verified against klatt-syn source code and existing bridge.ts
- Pitfalls: MEDIUM -- makeup gain value and DC gain behavior are assumed, need empirical validation

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable domain, no moving targets)
