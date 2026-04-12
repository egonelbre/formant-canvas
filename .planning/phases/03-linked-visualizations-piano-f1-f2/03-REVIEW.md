---
phase: 03-linked-visualizations-piano-f1-f2
reviewed: 2026-04-12T12:39:45Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - src/lib/data/hillenbrand.ts
  - src/lib/data/hillenbrand.test.ts
  - src/lib/audio/dsp/formant-response.ts
  - src/lib/audio/dsp/formant-response.test.ts
  - src/lib/components/VowelChart.svelte
  - src/lib/components/VowelChartOverlay.svelte
  - src/lib/components/PianoHarmonics.svelte
  - src/lib/components/HarmonicBars.svelte
  - src/lib/components/FormantCurves.svelte
  - src/lib/components/PitchSection.svelte
  - src/App.svelte
  - src/app.css
  - package.json
findings:
  critical: 0
  warning: 5
  info: 4
  total: 9
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-04-12T12:39:45Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Phase 3 adds linked visualizations: the F1/F2 vowel chart with Hillenbrand ellipses and a drag handle, a piano keyboard with harmonic bars and formant curves, and a pitch readout. The data layer (`hillenbrand.ts`, `formant-response.ts`) and their tests are clean and well-structured. The main issues are concentrated in the SVG visualization components: a hardcoded `y=80` magic constant that bleeds across component boundaries, an incorrect convex-hull cross-product sign that produces a clockwise (inside-out) polygon, a piano black-key hit-test gap where dragging past the rightmost white key after the last black key misidentifies the target, and a missing `currentGroup` synchronization that silently breaks the "smallest ellipse wins" disambiguation.

---

## Warnings

### WR-01: Convex hull cross-product sign is inverted — overlay polygon winding is wrong

**File:** `src/lib/components/VowelChartOverlay.svelte:39`

**Issue:** The Graham scan keeps a point when `cross > 0` (counter-clockwise turn) and pops when `cross <= 0`. However the cross-product formula used is:

```
cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)
```

In SVG coordinates the Y axis is flipped (positive Y goes down). With this sign convention a positive cross product is a *clockwise* turn, not counter-clockwise. The algorithm therefore builds a clockwise hull instead of the intended counter-clockwise one. In practice SVG `fill-rule="nonzero"` (the default) fills a clockwise polygon the same as a counter-clockwise one, so the visual result is often correct — but if a `fill-rule="evenodd"` is ever applied, or if the hull is consumed for geometric tests, the winding will be wrong. Additionally, the initial sort picks the point with the *lowest* `a.y` value (line 20: `a.y - b.y`), which in SVG terms is the topmost pixel, not the bottom-most as the comment states. The pivot selection and the sort together are inconsistent with a standard Graham scan.

**Fix:** Either flip the cross-product comparison to `cross >= 0` to match SVG coordinates, or sort by *highest* y first (`b.y - a.y`) to pick the visually bottom-most pivot and keep the `cross <= 0` pop condition:

```ts
// Sort by highest SVG y (visually bottom-most) first, then leftmost
const sorted = [...points].sort((a, b) => b.y - a.y || a.x - b.x);
// ...
// Keep the existing cross <= 0 pop condition — it now correctly removes
// clockwise turns in upward-positive (standard math) space projected into
// bottom-to-top sort order.
```

Or alternatively, keep the current ascending-y sort but flip the keep/pop condition:

```ts
// cross >= 0 means right-turn in SVG coords → remove (want convex CCW in SVG space)
if (cross >= 0) { hull.pop(); } else { break; }
```

Pick one approach and apply it consistently; the existing code mixes the two conventions.

---

### WR-02: Magic constant `y=80` hardcoded in child components breaks layout contract

**File:** `src/lib/components/HarmonicBars.svelte:39` and `src/lib/components/FormantCurves.svelte:52,112`

**Issue:** Both `HarmonicBars` and `FormantCurves` receive `barRegionHeight` / `curveRegionHeight` as props (correctly), but then hard-code `y = 80` as the baseline from which bars and curves grow:

- `HarmonicBars.svelte:39`: `const y = 80 - barHeight;`
- `FormantCurves.svelte:52`: `const y = 80 - (allAmplitudes[fi][i] / globalMax) * curveRegionHeight;`
- `FormantCurves.svelte:112`: `y1={8}` and `y2={80}` for center-marker lines

`80` is `HARMONIC_REGION_HEIGHT` defined in the *parent* `PianoHarmonics.svelte`. The children have no access to that constant — they infer it. If the parent's region height ever changes, all three files need manual updates and the relationship is invisible from the component interface.

**Fix:** Pass the region top offset as a prop alongside the height, or derive it from the existing props. For example, add a `regionBottom: number` prop (default `80`) to both components. In `PianoHarmonics.svelte` pass `regionBottom={HARMONIC_REGION_HEIGHT}`:

```svelte
<!-- PianoHarmonics.svelte -->
<HarmonicBars {freqToX} barRegionHeight={BAR_REGION_HEIGHT} regionBottom={HARMONIC_REGION_HEIGHT} />
<FormantCurves {freqToX} curveRegionHeight={BAR_REGION_HEIGHT} regionBottom={HARMONIC_REGION_HEIGHT} />
```

Then inside each child replace `80` with the `regionBottom` prop.

---

### WR-03: Piano black-key hit-test has a gap for black keys whose previous white key is out of range

**File:** `src/lib/components/PianoHarmonics.svelte:53-60`

**Issue:** Black key x positions are computed from `whiteKeyPositions.get(prevWhite)` where `prevWhite = midi - 1`. If `midi - 1 < START_MIDI` (i.e., the first MIDI note in the range is a black key), `prevWhite` will not be in the map and the black key is silently dropped from the `blackKeys` array. The current range starts at C2 (MIDI 36), which is a white key, so this does not trigger today. However, if `START_MIDI` is ever changed to a black-key note (e.g., 37 = C#2), that first black key will be invisible and unclickable with no error.

Additionally, during pointer-drag hit testing (lines 145-157), if the pointer is dragged beyond the rightmost rendered key, `midiFromPointer` returns `null` and silently discards the event. This is intentional but means a drag that starts on the last white key and moves right keeps the pitch locked to the last captured key. This is a minor UX issue but is expected behavior; no fix is strictly required here.

**Fix for the dropped-key issue:** Guard or document the invariant that `START_MIDI` must be a white key, and add a defensive fallback for the `prevWhite` lookup:

```ts
if (prevX !== undefined) {
  keys.push({ midi, x: prevX + WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2 });
} else {
  // prevWhite is below range — estimate position before first white key
  keys.push({ midi, x: -(BLACK_KEY_WIDTH / 2) });
}
```

Or assert at module level:

```ts
// Invariant: START_MIDI must be a white key for black-key layout to work correctly
if (isBlackKey(START_MIDI)) throw new Error(`START_MIDI ${START_MIDI} must be a white key`);
```

---

### WR-04: `getActiveVowelRegion` uses `currentGroup` from VowelChart but ellipse disambiguation uses the same group — silent mismatch if group changes between renders

**File:** `src/lib/components/VowelChart.svelte:35` and `src/lib/data/hillenbrand.ts:133`

**Issue:** `activeRegion` is derived as:

```ts
let activeRegion = $derived(getActiveVowelRegion(voiceParams.f1Freq, voiceParams.f2Freq, currentGroup));
```

The ellipses rendered on screen use `currentGroup` for their center positions (via `ellipseCx`, `ellipseCy`). However, the "active region" highlight uses the same group, so they agree. The issue is that `overlayGroup` (the separately displayed range overlay) and `currentGroup` are independent state variables with no synchronization — the chip selector updates `overlayGroup` but `currentGroup` is never updated (it starts at `'men'` and has no setter wired to the UI). The overlay selector changes what range polygon is shown, but the active-vowel detection always uses `'men'`.

Looking at the overlay options array: `'none' | 'men' | 'women' | 'child'`. The `currentGroup` state variable is declared at line 25 but the `onOverlaySelect` handler (line 112) only writes to `overlayGroup`, not `currentGroup`. The ellipse positions, radii, and active-region detection are all computed from `currentGroup` ('men'), while the visual overlay uses `overlayGroup`. A user who selects "Female Range" to see women's vowel regions will still see the ellipses positioned for men's data and active-region detection using men's SD radii.

**Fix:** Either remove `currentGroup` and derive it from `overlayGroup` (falling back to `'men'` when `overlayGroup` is null), or wire `onOverlaySelect` to update `currentGroup` as well:

```ts
function onOverlaySelect(key: string) {
  overlayGroup = key === 'none' ? null : key;
  if (key !== 'none') currentGroup = key as SpeakerGroup;
}
```

Or simplify to a single state variable:

```ts
let currentGroup: SpeakerGroup = $state('men');
// overlayGroup is always currentGroup (or null to hide the polygon)
let showOverlay = $state(false);
```

---

### WR-05: `freqToX` extrapolation formula uses `svgWidth` and `END_MIDI - START_MIDI` without accounting for the fact that not all MIDI notes in the range are white keys

**File:** `src/lib/components/PianoHarmonics.svelte:101-103`

**Issue:** The fallback extrapolation path in `freqToX` (reached when `midiFloat` is outside the key center map) computes:

```ts
const semitonePx = (svgWidth / (END_MIDI - START_MIDI));
return (midiFloat - START_MIDI) * semitonePx;
```

`svgWidth` is `whiteKeys.length * WHITE_KEY_WIDTH`, which covers only white keys. `END_MIDI - START_MIDI` is the total semitone span including black keys. The ratio therefore underestimates the pixels per semitone, placing out-of-range frequencies to the left of where they should be. For the harmonic bars, if a harmonic falls above B6 it is already filtered out at the `MAX_FREQ` check in `HarmonicBars.svelte:23`. For `FormantCurves.svelte`, `freqToX` is called for frequencies as low as 65 Hz (C2, MIDI 36 = `START_MIDI`), which is in range, so this extrapolation path is rarely triggered in practice. However, the formula is incorrect and will silently produce wrong x positions for any frequency truly outside the piano range.

**Fix:** Derive `semitonePx` from the actual key geometry:

```ts
// Total semitone span covered by white keys (7 per octave over 5 octaves = 35 white keys)
// Each white key is WHITE_KEY_WIDTH pixels.
// More precise: pixels per semitone ≈ svgWidth / (whiteKeys.length * (12/7))
const semitonePx = svgWidth / (whiteKeys.length * (12 / 7));
```

Or simply clamp `midiFloat` to `[START_MIDI, END_MIDI]` before extrapolating, since out-of-range harmonics are already filtered upstream.

---

## Info

### IN-01: `f2Scale` direction is non-standard for a vowel chart (F2 increases left-to-right)

**File:** `src/lib/components/VowelChart.svelte:18`

**Issue:** The scale is defined as `.domain([600, 3000]).range([0, PLOT_WIDTH])`, mapping low F2 (back vowels) to the left and high F2 (front vowels) to the right. The IPA vowel chart convention is the opposite: F2 decreases left-to-right (front vowels on the left). Linguistics researchers and trained singers expect the reversed axis. The current orientation is not wrong per se, but it departs from the universal convention and may confuse the target audience.

**Fix:** Reverse the range to match the IPA convention: `.domain([600, 3000]).range([PLOT_WIDTH, 0])`. This also reverses the tick direction, which is expected for this chart type.

---

### IN-02: `pointInEllipse` test boundary case relies on floating-point exact equality

**File:** `src/lib/data/hillenbrand.test.ts:79-81`

**Issue:** The test asserts that a point at exactly `(cx + rx, cy)` returns `true` because `dx*dx + dy*dy` should equal exactly `1.0`. This depends on IEEE 754 floating-point computing `((rx)/rx)^2 = 1.0` exactly. For integer inputs this holds, but if the function were ever called with non-integer SD values, the result could be `1.0000000000000002` due to rounding, and the `<= 1` check would return `false`. The test itself is fine for the current integer data, but the `pointInEllipse` implementation should use a small epsilon for boundary tolerance if it is intended to be inclusive:

```ts
return dx * dx + dy * dy <= 1 + Number.EPSILON;
```

This is low severity as the current data only uses integer Hz values.

---

### IN-03: `console.error` left in production audio path

**File:** `src/App.svelte:43`

**Issue:** `console.error('Audio initialization failed:', err)` is present in the `handlePlayPause` catch block. In a production build this will emit to the browser console on every audio init failure with no user-visible feedback. The error is silently swallowed from the UI's perspective (no toast, no error state).

**Fix:** Surface the error to the user (e.g., set an error state and show a message in the TransportBar), or at minimum store it in a reactive variable so the UI can reflect the failed state. The `console.error` alone is acceptable for development but should be paired with user-facing feedback.

---

### IN-04: `VowelChart` renders F2 axis label at a potentially clipped position

**File:** `src/lib/components/VowelChart.svelte:258-262`

**Issue:** The citation text "Data: Hillenbrand et al. (1995)" is placed at `y={PLOT_HEIGHT + 44}` (= 364), which is inside the SVG viewBox height of 400. The axis labels below the x-axis use `y={PLOT_HEIGHT + 18}` (= 338) and the axis title uses `y={PLOT_HEIGHT + 34}` (= 354). The citation at `y=364` is only 36px from the bottom of the 400px viewBox — this is tight but not clipped. However, the `MARGIN.bottom = 48` was presumably chosen to accommodate ticks (18px) + title (34px) = 34px of content below PLOT_HEIGHT, leaving 14px of padding. The citation adds another 10px beyond the title, consuming all remaining margin. If the SVG container is displayed at a narrow width and the aspect ratio is preserved, text may be clipped by the browser.

**Fix:** Either increase `MARGIN.bottom` to 64, or move the citation into the HTML below the SVG rather than inside it. Alternatively place it at the top-right corner of the plot area where it does not compete with axis labels.

---

_Reviewed: 2026-04-12T12:39:45Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
