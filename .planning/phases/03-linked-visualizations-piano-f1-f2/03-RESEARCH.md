# Phase 3: Linked Visualizations (Piano + F1/F2) - Research

**Researched:** 2026-04-12
**Domain:** SVG visualization, formant acoustics math, drag interaction, d3-scale
**Confidence:** HIGH

## Summary

Phase 3 adds two SVG-based visualizations — a 5-octave piano with harmonic amplitude bars and formant response curves, and an F1/F2 vowel chart with Hillenbrand (1995) ellipses and direct drag-to-tune. The core challenge is not performance (SVG element counts are well under 200 per component) but correct reactive wiring: every parameter change must flow through the single `voiceParams` store and trigger synchronous re-renders in all views plus audio updates within one animation frame.

The existing codebase provides strong foundations: `VoiceParams` class with `$state` runes, `AudioBridge.syncParams()` called from `$effect` on `voiceParams.snapshot`, pitch utilities (`midiToHz`, `hzToNote`), and a working `PianoKeyboard` component with pointer-capture drag. The main new work is: (1) the `formant-response.ts` pure math module, (2) the `hillenbrand.ts` embedded dataset, (3) `d3-scale` log scales for F1/F2 axes, (4) new SVG components, and (5) extending the layout from 600px to 960px.

**Primary recommendation:** Install `d3-scale` and `@types/d3-scale` as the only new dependencies. Build all visualizations as SVG with `$derived` computations from `voiceParams`. Use the existing pointer-capture pattern (not `svelte-gestures`) for the F1/F2 drag handle, consistent with the Phase 2 PianoKeyboard implementation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Cartesian (natural) orientation -- F1 increasing upward (Y axis), F2 increasing rightward (X axis). Not the inverted phonetics convention.
- **D-02:** Axes labeled in Hz with log-scale spacing for perceptual evenness
- **D-03:** SVG-based chart (declarative, reactive, accessible). Not Canvas -- element count is low (<200)
- **D-04:** 5-octave range: C2-B6 (~65 Hz to ~1976 Hz)
- **D-05:** Harmonic amplitudes shown as vertical bars rising above each key
- **D-06:** At least 12 overtone markers drawn on the correct keys
- **D-07:** Formant filter response curves (F1-F4) drawn as continuous curves overlaid on the piano
- **D-08:** Current f0 highlighted on the piano key
- **D-09:** IPA vowel symbols rendered directly on the F1/F2 chart at their Hillenbrand centroid positions. Click a symbol to snap the handle
- **D-10:** Cardinal vowels (/a e i o u/) plus the 12 Hillenbrand vowels as clickable preset positions
- **D-11:** No separate chip row -- the chart itself serves as the preset selector
- **D-12:** Simple accent-colored filled circle (~16px) as drag handle. No crosshair, no floating readout
- **D-13:** Dragging the handle updates voiceParams.f1Freq and voiceParams.f2Freq in real time. F3/F4 stay at current values
- **D-14:** All views update within one animation frame on any parameter change (LINK-01)
- **D-15:** No audio glitches while dragging at 60 fps. Formant changes use setTargetAtTime smoothing
- **D-16:** Hillenbrand (1995) vowel data embedded as JSON. Drawn as IPA-labelled ellipses
- **D-17:** Per-voice-type (male/female/child) formant range overlays selectable on the F1/F2 chart
- **D-18:** Source citation "Hillenbrand et al. (1995)" visible on the chart
- **D-19:** Current F1/F2 position indicates which vowel region it falls inside

### Claude's Discretion
- Exact Hillenbrand ellipse rendering (fill opacity, stroke style, label positioning)
- Piano key sizing and visual proportions for 5 octaves at 600px width
- Harmonic bar width, color, and spacing
- F3/F4 tracking behavior when F1/F2 are dragged
- Vowel region hit-testing algorithm
- Formant curve rendering style (line thickness, opacity, whether curves extend beyond visible piano range)
- Whether voice-type overlay switch is a toggle, dropdown, or chip group

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VOWEL-01 | F1/F2 diagram with phonetics-standard orientation | D-01 specifies Cartesian (F1 up, F2 right). Use `d3-scale` `scaleLog()` for both axes. |
| VOWEL-02 | Hillenbrand (1995) data as IPA-labelled ellipses | Embed dataset as `hillenbrand.ts`. Ellipses from mean +/- 1 SD in F1/F2 dimensions. |
| VOWEL-03 | Draggable handle updates F1/F2 in real time | Pointer-capture drag pattern (existing in PianoKeyboard). Write to `voiceParams.f1Freq`/`f2Freq`. |
| VOWEL-04 | Vowel presets snap handle to formants | Click IPA symbols on chart. Set f1Freq/f2Freq/f3Freq/f4Freq from Hillenbrand means. |
| VOWEL-05 | Citation visible on chart | Static text element: "Data: Hillenbrand et al. (1995)" |
| PIANO-01 | Piano keyboard with at least 3 octaves + C-labels | 5-octave C2-B6 (D-04). 35 white keys + 25 black keys in SVG. |
| PIANO-02 | f0 highlighted, 12+ harmonics as markers | Harmonics = `f0 * n` for n=1..N. Map each to piano position via `hzToNote`/`midiToHz`. |
| PIANO-03 | Harmonic amplitude from analytic formant filter response | New `formant-response.ts` evaluates bandpass magnitude at each harmonic frequency. |
| PIANO-04 | F1-F4 centers as overlay markers on piano | Vertical dashed lines at each formant center frequency, positioned on piano x-axis. |
| PIANO-05 | Click/tap key sets f0 | Existing pointer-capture pattern from PianoKeyboard. Write to `voiceParams.f0`. |
| RANGE-01 | Hillenbrand-derived ellipses per vowel on F1/F2 | Same as VOWEL-02 -- ellipses are the range visualization. |
| RANGE-02 | Per-voice-type formant ranges visible as overlays | Convex hull of Hillenbrand means per speaker group (male/female/child). |
| RANGE-03 | Current F1/F2 shows which vowel region it falls inside | Point-in-ellipse test: `((x-cx)/rx)^2 + ((y-cy)/ry)^2 <= 1` |
| LINK-01 | Any param change updates audio + all views within one frame | Svelte 5 `$derived` + `$effect` on `voiceParams.snapshot` -- synchronous reactive graph. |
| LINK-03 | Dragging at 60fps causes no audio glitches | AudioBridge uses `setTargetAtTime` with 20ms time constant -- already implemented. |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Svelte | 5.55.x | UI framework | Already installed. `$state`, `$derived`, `$effect` drive all reactive updates. [VERIFIED: package.json] |
| TypeScript | 6.0.x | Type safety | Already installed. [VERIFIED: package.json] |
| Vite | 8.0.x | Dev server + bundler | Already installed. [VERIFIED: package.json] |

### New Dependencies
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `d3-scale` | 4.0.2 | Log scales for F1/F2 axes (Hz to pixel mapping) | Cherry-picked math utility, ESM-only. Canonical choice per CLAUDE.md. [VERIFIED: npm registry] |
| `@types/d3-scale` | 4.0.9 | TypeScript types for d3-scale | `d3-scale` does not ship its own types. [VERIFIED: npm registry] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `d3-scale` | Manual log math (`Math.log`, `Math.exp`) | d3-scale handles edge cases (clamping, ticks, nice domain rounding). 12 KB gzipped is worth it for correctness. |
| `svelte-gestures` for drag | Native pointer events with capture | Existing PianoKeyboard already uses pointer-capture pattern. Adding svelte-gestures for one drag handle adds a dependency for no gain. Stick with the established pattern. |
| `d3-shape` for ellipses | SVG `<ellipse>` elements | SVG has native ellipse rendering. d3-shape is only useful for complex paths (area charts, lines). Not needed here. |

**Installation:**
```bash
npm install d3-scale
npm install -D @types/d3-scale
```

**Version verification:** `d3-scale@4.0.2` is current stable (ESM-only since v4). `@types/d3-scale@4.0.9` is current. [VERIFIED: npm registry 2026-04-12]

## Architecture Patterns

### Recommended Project Structure (new files)
```
src/lib/
  data/
    hillenbrand.ts          # Embedded Hillenbrand (1995) vowel data
  audio/dsp/
    formant-response.ts     # Pure function: formant filter amplitude at frequency
  components/
    PianoHarmonics.svelte   # 5-octave piano + harmonic bars + formant curves
    HarmonicBars.svelte     # SVG group: harmonic amplitude bars (child)
    FormantCurves.svelte    # SVG group: F1-F4 response curves (child)
    VowelChart.svelte       # F1/F2 chart with axes, ellipses, drag handle
    VowelChartOverlay.svelte # Per-voice-type formant range polygon (child)
```

### Pattern 1: Derived Visualization State
**What:** All visualization data is `$derived` from `voiceParams` -- never stored separately.
**When to use:** Every computed value displayed in PianoHarmonics or VowelChart.
**Example:**
```typescript
// In PianoHarmonics.svelte
let harmonics = $derived.by(() => {
  const result: { freq: number; midi: number; amplitude: number }[] = [];
  for (let n = 1; n <= 24; n++) {
    const freq = voiceParams.f0 * n;
    if (freq > 1976) break; // B6 upper limit
    const amplitude = formantResponse(freq, voiceParams.formants);
    const midi = Math.round(69 + 12 * Math.log2(freq / 440));
    result.push({ freq, midi, amplitude });
  }
  return result;
});
```
[VERIFIED: pattern consistent with existing `$derived` usage in PitchSection.svelte]

### Pattern 2: Pointer-Capture Drag (established)
**What:** `pointerdown` sets capture, `pointermove` updates state, `pointerup` releases. SVG element has `touch-action: none`.
**When to use:** F1/F2 drag handle and piano click-to-tune.
**Example:**
```typescript
// Pattern from existing PianoKeyboard.svelte (lines 152-170)
function onPointerDown(e: PointerEvent) {
  e.preventDefault();
  dragging = true;
  svgEl?.setPointerCapture(e.pointerId);
  updateFromPointer(e);
}
```
[VERIFIED: existing PianoKeyboard.svelte uses this exact pattern]

### Pattern 3: Log-Scale Coordinate Mapping
**What:** Use `d3-scale` `scaleLog()` for bidirectional Hz-to-pixel mapping on F1/F2 chart.
**When to use:** Rendering axis ticks, positioning ellipses, converting pointer coordinates to Hz.
**Example:**
```typescript
import { scaleLog } from 'd3-scale';

// F1 axis: 200-1000 Hz mapped to plotHeight..0 (SVG y=0 is top, F1 increases upward per D-01)
const f1Scale = scaleLog().domain([200, 1000]).range([plotHeight, 0]);
// F2 axis: 600-3000 Hz mapped to 0..plotWidth (increasing rightward)
const f2Scale = scaleLog().domain([600, 3000]).range([0, plotWidth]);

// Position a point
const x = f2Scale(voiceParams.f2Freq);
const y = f1Scale(voiceParams.f1Freq);

// Inverse (pointer to Hz)
const f1Hz = f1Scale.invert(pointerY);
const f2Hz = f2Scale.invert(pointerX);
```
[CITED: d3js.org/d3-scale/log]

### Anti-Patterns to Avoid
- **Storing visualization state separately from voiceParams:** All viz reads from `voiceParams` via `$derived`. No component-local copies of F1/F2/f0 state.
- **Using requestAnimationFrame loops:** Svelte 5 reactivity handles updates synchronously within the microtask. No rAF polling needed for parameter-driven views.
- **Debouncing drag events:** Direct store writes at pointer event rate. AudioBridge's `setTargetAtTime` with 20ms time constant handles smoothing. Debouncing would add latency and violate LINK-01.
- **Computing formant response from Web Audio AnalyserNode:** The harmonic amplitudes should be computed analytically (pure math), not by reading from the audio graph. This avoids latency and thread-crossing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Log-scale Hz-to-pixel mapping | Manual `Math.log` with edge-case handling | `d3-scale` `scaleLog()` | Handles domain clamping, `.invert()`, `.ticks()`, `.nice()`. Axis tick generation is surprisingly tricky for log scales. |
| SVG ellipse rendering | Custom path math | Native SVG `<ellipse>` element | SVG has built-in ellipse. Use `cx`, `cy`, `rx`, `ry` attributes directly. |
| Point-in-ellipse hit testing | Spatial index / quadtree | Algebraic test: `((x-cx)/rx)^2 + ((y-cy)/ry)^2 <= 1` | 12 ellipses is trivial to test exhaustively. No spatial index needed. |
| Formant bandpass magnitude response | FFT or AnalyserNode | Analytic formula: `gain / sqrt(1 + ((f - fc) / (bw/2))^2)` | Pure math, zero latency, works in `$derived`. Single-pole approximation is sufficient for visualization. |

**Key insight:** The visualization math (harmonic positions, formant response, ellipse hit-testing) is all cheap pure functions. The "don't hand-roll" items are about coordinate transforms and axis generation, not the DSP math itself.

## Common Pitfalls

### Pitfall 1: SVG Y-Axis Inversion
**What goes wrong:** SVG coordinate system has y=0 at top, increasing downward. F1/F2 chart needs F1 increasing upward (D-01).
**Why it happens:** Developers forget to invert the range in the d3 scale.
**How to avoid:** Set `f1Scale.range([plotHeight, 0])` (not `[0, plotHeight]`). This makes `f1Scale(200) = plotHeight` (bottom) and `f1Scale(1000) = 0` (top).
**Warning signs:** Vowel /i/ (low F1, high F2) appears at the bottom of the chart instead of the top-right.

### Pitfall 2: Log Scale Domain Cannot Include Zero
**What goes wrong:** `d3.scaleLog().domain([0, 1000])` throws or produces NaN.
**Why it happens:** Log of zero is undefined.
**How to avoid:** Domain starts at a positive value. F1: [200, 1000], F2: [600, 3000]. Clamp drag output to these minimums.
**Warning signs:** NaN pixel coordinates, elements placed at x=0 y=0.

### Pitfall 3: Harmonic Frequency Exceeds Piano Range
**What goes wrong:** Trying to position a harmonic marker at a frequency above B6 (~1976 Hz) or below C2 (~65 Hz).
**Why it happens:** f0 * n can exceed the visible range, especially for high-numbered harmonics.
**How to avoid:** Filter harmonics to only those within the C2-B6 range before rendering. The loop should `break` when `freq > 1976`.
**Warning signs:** Bars rendered outside the SVG viewBox or at incorrect positions.

### Pitfall 4: Pointer Coordinate Conversion in Scaled SVG
**What goes wrong:** Pointer events give CSS pixels, but SVG uses viewBox coordinates. With `preserveAspectRatio`, the mapping is not a simple ratio.
**Why it happens:** The SVG may be scaled non-uniformly or centered within its container.
**How to avoid:** Use `svgEl.getBoundingClientRect()` to get the rendered SVG dimensions, then compute the ratio: `svgX = (clientX - rect.left) / rect.width * viewBoxWidth`. The existing PianoKeyboard does this correctly (line 129-133).
**Warning signs:** Drag handle jumps or drifts when the window is resized.

### Pitfall 5: Stale Derived Values During Batch Updates
**What goes wrong:** Setting `voiceParams.f1Freq` and `voiceParams.f2Freq` in sequence might trigger two renders.
**Why it happens:** Svelte 5 batches synchronous state changes within the same microtask, but if you use `await` between writes, you get separate batches.
**How to avoid:** Set both values synchronously in the same event handler. Never `await` between reactive state writes.
**Warning signs:** Visual flicker or intermediate states visible during vowel preset snap.

### Pitfall 6: Formant Response Curve Resolution
**What goes wrong:** Too few sample points make curves look jagged; too many waste CPU.
**Why it happens:** Linear frequency spacing with few points misses narrow peaks.
**How to avoid:** Use ~200 points across C2-B6 range. For narrow bandwidths (high Q), the peak is sharp but 200 points is sufficient for visual smoothness at any realistic width.
**Warning signs:** F1 curve looks triangular instead of smooth near the peak.

## Code Examples

### Formant Bandpass Magnitude Response
```typescript
// Source: Audio EQ Cookbook (Bristow-Johnson), simplified for visualization
// src/lib/audio/dsp/formant-response.ts

import type { FormantParams } from '../../types.ts';

/**
 * Evaluate the magnitude response of a single formant (bandpass resonator)
 * at a given frequency. Uses the standard second-order bandpass approximation.
 *
 * @param freq - Probe frequency in Hz
 * @param formant - Formant parameters (center freq, bandwidth, gain)
 * @returns Linear amplitude (0-1 range, before gain scaling)
 */
export function formantMagnitude(freq: number, formant: FormantParams): number {
  const { freq: fc, bw, gain } = formant;
  const halfBW = bw / 2;
  // Second-order bandpass magnitude: gain / sqrt(1 + ((f - fc) / halfBW)^2)
  // This is the single-pole approximation, adequate for visualization
  const x = (freq - fc) / halfBW;
  return gain / Math.sqrt(1 + x * x);
}

/**
 * Evaluate total spectral envelope at a frequency across all formants.
 * Uses sum of individual formant responses (parallel topology per D-08).
 */
export function spectralEnvelope(freq: number, formants: FormantParams[]): number {
  let sum = 0;
  for (const f of formants) {
    sum += formantMagnitude(freq, f);
  }
  return sum;
}
```
[ASSUMED: single-pole approximation. The actual BiquadFilterNode uses a true 2-pole response. For visualization purposes, this approximation is visually similar and much cheaper to compute. If exact match to audio is needed, use the full biquad transfer function.]

### Hillenbrand Data Structure
```typescript
// src/lib/data/hillenbrand.ts

export interface HillenbrandVowel {
  ipa: string;       // IPA symbol (Unicode)
  keyword: string;   // hVd word (e.g., "heed", "hid")
  men:   { f1: number; f2: number; f3: number; f1SD: number; f2SD: number; f3SD: number };
  women: { f1: number; f2: number; f3: number; f1SD: number; f2SD: number; f3SD: number };
  child: { f1: number; f2: number; f3: number; f1SD: number; f2SD: number; f3SD: number };
}

// 12 vowels from Hillenbrand et al. (1995)
// Mean F1/F2/F3 and standard deviations by speaker group
export const HILLENBRAND_VOWELS: HillenbrandVowel[] = [
  // Values from Table V of the original paper
  // Men (n=45), Women (n=48), Children (n=46)
  { ipa: 'i', keyword: 'heed',  men: { f1: 342, f2: 2322, f3: 3000, f1SD: 35, f2SD: 165, f3SD: 263 }, ... },
  // ... 12 total vowels
];
```
[ASSUMED: exact numeric values. The structure is well-documented in the literature. Actual values should be transcribed from the original paper Table V or the Hillenbrand website data files.]

### Log-Scale Axis with d3-scale
```typescript
// Inside VowelChart.svelte
import { scaleLog } from 'd3-scale';

const PLOT_WIDTH = 384;   // 480 - 48 left - 48 right margins
const PLOT_HEIGHT = 320;  // 400 - 32 top - 48 bottom margins

const f1Scale = scaleLog().domain([200, 1000]).range([PLOT_HEIGHT, 0]);
const f2Scale = scaleLog().domain([600, 3000]).range([0, PLOT_WIDTH]);

// Generate tick values for axes
const f1Ticks = [200, 300, 400, 500, 600, 700, 800, 1000];
const f2Ticks = [600, 800, 1000, 1500, 2000, 2500, 3000];
```
[CITED: d3js.org/d3-scale/log]

### Harmonic Position Mapping on Piano
```typescript
// Map a frequency to a horizontal position on the 5-octave piano SVG
// C2 = MIDI 36 (65.4 Hz), B6 = MIDI 83 (1976 Hz)
const PIANO_START_MIDI = 36; // C2
const PIANO_END_MIDI = 83;   // B6

function freqToPixelX(freq: number, svgWidth: number): number {
  // Convert to MIDI (continuous, not rounded)
  const midiFloat = 69 + 12 * Math.log2(freq / 440);
  // Map MIDI range to pixel range
  // Need to account for white key positions only
  // ... (use the white key position array from the piano layout)
}
```
[VERIFIED: `midiToHz` and `hzToNote` already exist in pitch-utils.ts]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `d3-scale` v3 (CommonJS) | `d3-scale` v4 (ESM-only) | 2022 | Must use ES import. No require(). Works natively with Vite. [VERIFIED: npm registry] |
| Svelte 4 actions (`use:drag`) | Svelte 5 attachments (newer API) | 2024 | Not relevant -- we use raw pointer events, not svelte-gestures. |
| ScriptProcessorNode for audio | AudioWorklet | 2018+ | Already using AudioWorklet. No impact on this phase. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Single-pole bandpass approximation is visually adequate for formant response curves | Code Examples (formantMagnitude) | Curves may not match audio output closely. Low risk -- visualization is pedagogical, not measurement-grade. Can upgrade to full biquad transfer function if needed. |
| A2 | Hillenbrand (1995) has 12 vowels with F1/F2/F3 means and SDs for men/women/children | Code Examples (hillenbrand.ts) | Data structure would need adjustment. Very low risk -- this is a well-known dataset. |
| A3 | 200 sample points are sufficient for smooth formant curves on a 490px-wide piano | Pitfall 6 | Curves may look jagged for very narrow bandwidths. Easy to increase at runtime. |
| A4 | `d3-scale` v4 `scaleLog().invert()` works correctly for pointer-to-Hz conversion | Architecture Patterns (Pattern 3) | Would need manual inverse calculation. Very low risk -- `invert()` is a core d3-scale feature. |

## Open Questions

1. **Exact Hillenbrand numeric values**
   - What we know: 12 vowels (i, I, e, E, ae, a, aw, o, U, u, V, er), 3+ speaker groups, F1/F2/F3 means and SDs
   - What's unclear: Exact numbers need to be transcribed from the original paper Table V or the Hillenbrand website data files
   - Recommendation: Transcribe from the paper. The implementer should use the data at http://homepages.wmich.edu/~hillenbr/voweldata.html or the published Table V. Values can be hard-coded in `hillenbrand.ts` as they are static reference data.

2. **F4 values in Hillenbrand data**
   - What we know: Hillenbrand dataset includes F1, F2, F3. F4 may not be available.
   - What's unclear: Whether F4 means are in the dataset
   - Recommendation: If F4 is not available, use a fixed F4 estimate (typically ~3500 Hz for men, ~4200 Hz for women/children, already present in `voice-presets.ts`). Keep F4 unchanged when clicking vowel presets if no data exists.

3. **Piano x-position mapping for continuous frequencies**
   - What we know: White keys are evenly spaced, black keys sit between them. Harmonics fall at arbitrary frequencies (not just on key centers).
   - What's unclear: Best approach for mapping a continuous frequency to an x-pixel on the piano
   - Recommendation: Use a linear scale from MIDI 36 to MIDI 83, mapped to SVG x-coordinates. Count only white keys for width computation (35 keys * keyWidth). Position each frequency at its fractional MIDI position interpolated between white key positions. This gives visually correct placement even between keys.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `d3-scale` | F1/F2 axes | Not installed | 4.0.2 (npm) | Manual log math (not recommended) |
| `@types/d3-scale` | TypeScript types | Not installed | 4.0.9 (npm) | Skip types (not recommended) |

**Missing dependencies with no fallback:**
- None -- both are simple `npm install` commands.

**Missing dependencies with fallback:**
- `d3-scale` could be replaced with manual math, but this is explicitly recommended against in CLAUDE.md.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VOWEL-01 | F1/F2 axes with log scale, correct orientation | unit | `npx vitest run src/lib/data/hillenbrand.test.ts -t "scale"` | No -- Wave 0 |
| VOWEL-02 | Hillenbrand ellipses rendered with correct IPA labels | unit | `npx vitest run src/lib/data/hillenbrand.test.ts` | No -- Wave 0 |
| VOWEL-03 | Drag handle updates F1/F2 | e2e (manual) | Manual: drag handle, verify audio changes | N/A |
| VOWEL-04 | Vowel preset click snaps formants | unit | `npx vitest run src/lib/data/hillenbrand.test.ts -t "preset"` | No -- Wave 0 |
| VOWEL-05 | Citation text present | e2e (manual) | Manual: verify text on chart | N/A |
| PIANO-01 | 5-octave piano C2-B6 | unit | Test key count and MIDI range | No -- Wave 0 |
| PIANO-02 | f0 highlight + 12 harmonics | unit | `npx vitest run src/lib/audio/dsp/formant-response.test.ts -t "harmonics"` | No -- Wave 0 |
| PIANO-03 | Harmonic amplitude from formant response | unit | `npx vitest run src/lib/audio/dsp/formant-response.test.ts` | No -- Wave 0 |
| PIANO-04 | F1-F4 center markers on piano | unit (manual visual) | Manual: verify markers at correct positions | N/A |
| PIANO-05 | Click key sets f0 | e2e (manual) | Manual: click key, verify f0 change | N/A |
| RANGE-01 | Hillenbrand ellipses per vowel | Same as VOWEL-02 | Same as VOWEL-02 | No -- Wave 0 |
| RANGE-02 | Per-voice-type overlays | unit | Test overlay data computation | No -- Wave 0 |
| RANGE-03 | Point-in-ellipse hit test | unit | `npx vitest run src/lib/data/hillenbrand.test.ts -t "hit-test"` | No -- Wave 0 |
| LINK-01 | All views update within one frame | e2e (manual) | Manual: change param, verify all views update | N/A |
| LINK-03 | No audio glitches while dragging | e2e (manual) | Manual: drag at 60fps, listen for glitches | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/audio/dsp/formant-response.test.ts` -- covers PIANO-03, unit tests for `formantMagnitude` and `spectralEnvelope`
- [ ] `src/lib/data/hillenbrand.test.ts` -- covers VOWEL-02, VOWEL-04, RANGE-03: data integrity, preset values, point-in-ellipse hit testing

## Security Domain

Security is not applicable for this phase. All work is client-side SVG rendering and pure math computation. No user input beyond pointer events, no network requests, no data storage. The Hillenbrand dataset is static embedded JSON with no user-modifiable content.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/lib/audio/state.svelte.ts`, `src/lib/audio/bridge.ts`, `src/lib/components/PianoKeyboard.svelte`, `src/lib/audio/dsp/pitch-utils.ts`, `src/lib/audio/dsp/formant-utils.ts`, `src/lib/data/voice-presets.ts`, `src/lib/types.ts`, `src/App.svelte`, `src/app.css` -- all read and verified
- UI-SPEC: `.planning/phases/03-linked-visualizations-piano-f1-f2/03-UI-SPEC.md` -- read and verified
- npm registry: `d3-scale@4.0.2`, `@types/d3-scale@4.0.9` -- verified 2026-04-12
- [d3-scale log scale documentation](https://d3js.org/d3-scale/log) -- API reference for `scaleLog()`

### Secondary (MEDIUM confidence)
- [Hillenbrand et al. (1995) data repository](http://homepages.wmich.edu/~hillenbr/voweldata.html) -- referenced in CONTEXT.md canonical refs
- [phonTools R package h95 dataset](https://search.r-project.org/CRAN/refmans/phonTools/html/h95.html) -- confirms 12 vowels, 4 speaker groups, 1668 observations
- Audio EQ Cookbook (Robert Bristow-Johnson) -- bandpass magnitude response formula

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- only one new dependency (d3-scale), well-understood and explicitly recommended in CLAUDE.md
- Architecture: HIGH -- builds on established patterns (pointer-capture drag, `$derived` from voiceParams, SVG components)
- Pitfalls: HIGH -- all pitfalls identified from direct codebase analysis and SVG/d3-scale fundamentals
- Data (Hillenbrand): MEDIUM -- structure is known but exact numeric values need transcription from the source

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable domain, no fast-moving dependencies)
