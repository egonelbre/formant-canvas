---
phase: 03-linked-visualizations-piano-f1-f2
verified: 2026-04-12T16:00:00Z
status: human_needed
score: 5/6 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Run `npm run dev`, open http://localhost:5173, click Start, drag the handle on the F1/F2 vowel chart for several seconds at moderate speed"
    expected: "Sound changes in real time during drag with no audible clicks, pops, or zipper artifacts. Piano harmonic bars shift as F1/F2 change. Active vowel region highlights when handle enters an ellipse. All updates happen together with no visible lag."
    why_human: "60fps performance and absence of audio glitches during drag cannot be measured programmatically; requires subjective real-time listening and visual observation"
  - test: "Click a piano key, observe all linked updates"
    expected: "Piano key highlight moves, harmonic bars shift positions (bars redistribute based on new f0), audio pitch changes — all within one visible frame. No observable lag between click and update."
    why_human: "One-animation-frame synchrony across audio + piano + vowel chart requires human observation at runtime"
  - test: "Click an IPA vowel symbol on the F1/F2 chart"
    expected: "Drag handle snaps to that vowel position, piano harmonic bars update amplitudes, and audio vowel quality changes audibly — all together"
    why_human: "Snap behavior and simultaneous harmonic update require runtime observation"
  - test: "Click 'Male Range', 'Female Range', 'Child Range' chips on the vowel chart"
    expected: "Corresponding convex hull overlay polygon appears and disappears correctly for each group. Male = blue, Female = orange, Child = green."
    why_human: "Visual rendering of SVG polygon overlays requires browser view"
---

# Phase 3: Linked Visualizations (Piano + F1/F2) Verification Report

**Phase Goal:** The two signature visualizations come online — piano keyboard with live harmonics and formant overlays, and the F1/F2 vowel chart with Hillenbrand background and direct drag-to-tune. Core Value verified: changing any parameter updates audio, the F1/F2 chart, and the piano harmonics together within one animation frame, with no audio glitches while dragging at 60 fps.
**Verified:** 2026-04-12T16:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can see at least three octaves of piano keyboard with f0 highlighted, at least 12 overtone markers with formant-response amplitudes, and F1-F4 centers overlaid | VERIFIED | PianoHarmonics.svelte covers MIDI 36-83 (5 octaves, C2-B6). HarmonicBars computes up to 24 harmonics via `spectralEnvelope`, breaks at B6 — typically 12+ at 120 Hz. FormantCurves renders F1-F4 dashed center markers with colored labels |
| 2 | User can click or tap a piano key to set f0, and the click-to-tune loop completes within one animation frame across audio and all views | VERIFIED (needs human for frame timing) | `voiceParams.f0 = midiToHz(midi)` written on pointerdown in PianoHarmonics. `voiceParams.snapshot` includes `f0`, so App.svelte `$effect` calls `bridge.syncParams()` synchronously. HarmonicBars `$derived.by()` recomputes on `f0` change. No async gaps in the chain. |
| 3 | User can see the F1/F2 vowel diagram with Hillenbrand ellipses, IPA labels, and citation | VERIFIED | VowelChart.svelte renders 12 HILLENBRAND_VOWELS as ellipses with IPA labels; citation "Data: Hillenbrand et al. (1995)" at PLOT_WIDTH, PLOT_HEIGHT+44 text-anchor="end"; F1 increasing upward (domain([200,1000]).range([PLOT_HEIGHT,0])), F2 increasing rightward |
| 4 | User can drag the vowel handle and hear vowel change, see piano harmonics update, see vowel region highlight — all within one animation frame, no glitches at 60fps | PARTIAL — code verified, runtime behavior needs human | VowelChart writes `voiceParams.f1Freq/f2Freq` synchronously on pointermove; `snapshot` includes both; `$effect` calls `bridge.syncParams()` using `setTargetAtTime` (already present from Phase 1). `getActiveVowelRegion` is `$derived`. 60fps glitch-free behavior cannot be confirmed programmatically. |
| 5 | User can load a vowel preset and see the handle snap, harmonics update, and hear the vowel load | VERIFIED | `snapToVowel()` in VowelChart writes `f1Freq`, `f2Freq`, `f3Freq` synchronously. Handle position is `$derived` from these values. HarmonicBars is `$derived.by` on `voiceParams.formants`. Chain is complete. |
| 6 | User can switch voice type and see per-voice formant range overlays change | VERIFIED | ChipGroup in VowelChart sets `overlayGroup` state; when non-null, renders `<VowelChartOverlay group={overlayGroup}>` inside the SVG. VowelChartOverlay accepts group prop and renders convex hull polygon with group-specific colors (men=#3b82f6, women=#f97316, child=#22c55e) |

**Score:** 5/6 truths verified (SC4 code verified; runtime 60fps behavior needs human)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/data/hillenbrand.ts` | 12 vowels, SpeakerGroupData, HillenbrandVowel, pointInEllipse, getActiveVowelRegion | VERIFIED | 156 lines. Exports all required types and functions. 12 entries in HILLENBRAND_VOWELS array (13th "ipa:" is the TypeScript interface field). All spot-check values match published data. |
| `src/lib/data/hillenbrand.test.ts` | Data integrity + hit-testing tests | VERIFIED | 27 tests, all passing. Covers all required behaviors from 03-01-PLAN. |
| `src/lib/audio/dsp/formant-response.ts` | formantMagnitude, spectralEnvelope | VERIFIED | 40 lines. Both functions exported. Imports FormantParams from `../../types.ts`. |
| `src/lib/audio/dsp/formant-response.test.ts` | Unit tests for formant response math | VERIFIED | 10 tests, all passing. Center response, -3dB point, gain scaling, multi-formant. |
| `src/lib/components/VowelChart.svelte` | Complete F1/F2 chart with axes, ellipses, drag handle, presets, overlays | VERIFIED | 292 lines (>150 min). Log-scale axes, drag, snap, overlays, citation. |
| `src/lib/components/VowelChartOverlay.svelte` | Per-voice-type formant range polygon | VERIFIED | 81 lines (>20 min). Convex hull via Graham scan, dashed polygon, group-specific colors. |
| `src/lib/components/PianoHarmonics.svelte` | 5-octave piano SVG with harmonic bars, formant curves, click-to-tune | VERIFIED | 254 lines (>100 min). C2-B6 range, 35 white keys, 25 black keys, f0 highlight, C2-C5 labels, pointer-capture click-to-tune. |
| `src/lib/components/HarmonicBars.svelte` | SVG group rendering harmonic amplitude bars | VERIFIED | 64 lines (>30 min). spectralEnvelope, voiceParams.f0, fundamental in #6366f1. |
| `src/lib/components/FormantCurves.svelte` | SVG group rendering F1-F4 response curves and center markers | VERIFIED | 131 lines (>40 min). formantMagnitude, 200-sample curves, dashed center markers with F1-F4 labels in distinct colors. |
| `src/App.svelte` | Full app with visualizations above controls | VERIFIED | PianoHarmonics and VowelChart imported and rendered above PitchSection/VoicePresets/PhonationMode/ExpressionControls. `bridge.syncParams()` in `$effect` unchanged. |
| `src/app.css` | Updated CSS with formant color tokens and 960px max-width | VERIFIED | `--color-f1` through `--color-f4` in `:root`. `max-width: 960px` on `main`. |
| `src/lib/components/PitchSection.svelte` | Pitch section without embedded PianoKeyboard | VERIFIED | 62 lines. No import or usage of PianoKeyboard. Contains only pitch readout with formatPitchReadout. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `VowelChart.svelte` | `voiceParams.f1Freq / f2Freq / f3Freq` | `updateFromPointer()` writes on drag; `snapToVowel()` writes on IPA click | WIRED | Lines 80-81 (drag) and 106-108 (snap). Both synchronous. |
| `VowelChart.svelte` | `hillenbrand.ts` | `import HILLENBRAND_VOWELS, getActiveVowelRegion` | WIRED | Line 3: both imported. Used for ellipses (line 208), active region detection (line 35), and snap (line 104). |
| `PianoHarmonics.svelte` | `voiceParams.f0` | `voiceParams.f0 = midiToHz(midi)` on pointerdown/pointermove | WIRED | Lines 166 and 173. setPointerCapture on line 164. |
| `HarmonicBars.svelte` | `formant-response.ts` | `import { spectralEnvelope }` | WIRED | Line 3. Used in `$derived.by()` at line 24. |
| `FormantCurves.svelte` | `formant-response.ts` | `import { formantMagnitude }` | WIRED | Line 3. Used in curve computation at line 39. |
| `App.svelte` | `PianoHarmonics.svelte` | import and render in template | WIRED | Lines 7 and 78. |
| `App.svelte` | `VowelChart.svelte` | import and render in template | WIRED | Lines 8 and 79. |
| `App.svelte $effect` | `bridge.syncParams()` | `void voiceParams.snapshot; bridge.syncParams()` | WIRED | Lines 22-25. snapshot getter reads f0, f1Freq, f2Freq, f3Freq — all written by Phase 3 components. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `HarmonicBars.svelte` | `harmonicBars` ($derived.by) | `voiceParams.f0` + `voiceParams.formants` — reactive $state fields | Yes — computed from live reactive state | FLOWING |
| `FormantCurves.svelte` | `curveData` ($derived.by) | `voiceParams.formants` — reactive getter from $state fields | Yes — computed from live reactive state | FLOWING |
| `VowelChart.svelte` | `handleX/handleY` ($derived) | `voiceParams.f1Freq`, `voiceParams.f2Freq` | Yes — reactive $state | FLOWING |
| `VowelChart.svelte` | `activeRegion` ($derived) | `getActiveVowelRegion(voiceParams.f1Freq, voiceParams.f2Freq, currentGroup)` | Yes — pure function on reactive $state | FLOWING |
| `PianoHarmonics.svelte` | `highlightMidi` ($derived) | `voiceParams.f0` | Yes — reactive $state | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All unit tests pass (116 total) | `npx vitest run` | 116 passed (11 test files) | PASS |
| Hillenbrand-specific tests (27) | `npx vitest run src/lib/data/hillenbrand.test.ts` | 27/27 passed | PASS |
| formant-response tests (10) | `npx vitest run src/lib/audio/dsp/formant-response.test.ts` | 10/10 passed | PASS |
| svelte-check clean | `npx svelte-check` | 0 errors, 0 warnings (103 files) | PASS |
| VowelChart has citation text | `grep "Hillenbrand et al. (1995)" VowelChart.svelte` | Found at line 263 | PASS |
| PianoHarmonics has no PianoKeyboard | `grep "PianoKeyboard" PitchSection.svelte` | Not found | PASS |
| App has both visualizations | `grep "PianoHarmonics\|VowelChart" App.svelte` | Both imported (lines 7-8) and rendered (lines 78-79) | PASS |
| Formant color tokens in CSS | `grep "color-f1\|color-f2" app.css` | All 4 formant tokens present (#f97316, #22c55e, #3b82f6, #a855f7) | PASS |
| 960px max-width | `grep "max-width" app.css` | `max-width: 960px` on `main` | PASS |
| MIDI range C2-B6 | `grep "START_MIDI\|END_MIDI" PianoHarmonics.svelte` | 36 to 83 | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| VOWEL-01 | 03-02 | F1/F2 diagram with F1 and F2 on axes, phonetics-standard orientation | SATISFIED | VowelChart: f1Scale domain [200,1000] range [PLOT_HEIGHT,0] (F1 upward), f2Scale domain [600,3000] range [0,PLOT_WIDTH] (F2 rightward) |
| VOWEL-02 | 03-01, 03-02 | Hillenbrand (1995) data embedded as IPA-labelled ellipses | SATISFIED | hillenbrand.ts: 12 vowels, all spot-check values within 10 Hz. VowelChart renders ellipses with IPA labels. |
| VOWEL-03 | 03-02 | Draggable handle updates F1/F2 in audio engine in real time | SATISFIED | setPointerCapture drag in VowelChart writes voiceParams.f1Freq/f2Freq synchronously; App.svelte $effect fires bridge.syncParams() |
| VOWEL-04 | 03-02 | Vowel presets snap handle to target formants | SATISFIED | 12 Hillenbrand vowels are clickable (role="button" circles at each IPA position). Cardinals /i/, /e/, /ɑ/, /o/, /u/ are included in the Hillenbrand 12 (ipa: 'i', 'e', '\u0251', 'o', 'u'). snapToVowel() writes f1/f2/f3Freq synchronously. |
| VOWEL-05 | 03-02 | Hillenbrand (1995) citation visible on chart | SATISFIED | "Data: Hillenbrand et al. (1995)" text at PLOT_WIDTH, PLOT_HEIGHT+44, text-anchor="end" |
| PIANO-01 | 03-03 | Piano keyboard displays at least 3 octaves with C-labelled keys | SATISFIED | PianoHarmonics: 5 octaves (C2-B6). C2, C3, C4, C5 labels at MIDI 36, 48, 60, 72. |
| PIANO-02 | 03-03 | Current f0 highlighted; overtone series (≥12) drawn at correct keys | SATISFIED | `highlightMidi` $derived from voiceParams.f0; key fill #6366f1 when matched. HarmonicBars loops n=1-24 harmonic bars. |
| PIANO-03 | 03-01, 03-03 | Harmonic markers show amplitude from analytic formant filter response | SATISFIED | HarmonicBars uses `spectralEnvelope(freq, voiceParams.formants)` from formant-response.ts for each harmonic frequency. |
| PIANO-04 | 03-03 | F1-F4 centers drawn as overlay markers on piano | SATISFIED | FormantCurves renders dashed vertical lines + labels (F1-F4) at each formant center frequency when in range. |
| PIANO-05 | 03-03 | Clicking/tapping a key sets f0 | SATISFIED | PianoHarmonics: onPointerDown + onPointerMove write `voiceParams.f0 = midiToHz(midi)`. Black keys checked first. |
| RANGE-01 | 03-02 | Formant occupancy visualized as Hillenbrand ellipses on F1/F2 chart | SATISFIED | VowelChart renders 12 ellipses using 1 SD as rx/ry, derived from HILLENBRAND_VOWELS per currentGroup |
| RANGE-02 | 03-02 | Per-voice-type ranges (male/female/child) as selectable overlays | SATISFIED | ChipGroup with None/Male Range/Female Range/Child Range options; triggers VowelChartOverlay with convex hull polygon |
| RANGE-03 | 03-02 | Current F1/F2 position shows which vowel region it falls inside | SATISFIED | `activeRegion = $derived(getActiveVowelRegion(...))` changes ellipse fill to rgba(99,102,241,0.15) for active vowel |
| LINK-01 | 03-04 | Any parameter change updates audio + F1/F2 chart + piano harmonics + readouts within one animation frame | VERIFIED programmatically / NEEDS HUMAN for timing | All writes to voiceParams.$state fields trigger Svelte 5 batched reactive updates. $effect calls bridge.syncParams(). No async boundaries between drag → state → derived → render. |
| LINK-03 | 03-04 | Dragging F1/F2 chart at 60fps causes no audio glitches | NEEDS HUMAN | setTargetAtTime (20ms time constant) already present in bridge.ts from Phase 1. No new issues introduced. Runtime behavior must be verified by listening. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|---------|--------|
| None found | — | — | — | No TODOs, FIXMEs, return null, or placeholder patterns found in any Phase 3 file |

### Human Verification Required

#### 1. 60fps Drag Without Audio Glitches (LINK-03, SC4)

**Test:** Run `npm run dev`, click Start, then drag the vowel handle on the F1/F2 chart continuously for 3-5 seconds at moderate speed.
**Expected:** Sound changes smoothly in real time. No audible clicks, pops, or zipper noise. Piano harmonic bars update continuously. Active vowel region highlighting responds. All views update together with no perceptible lag between drag and visual/audio response.
**Why human:** 60fps real-time audio performance and absence of glitch artifacts require subjective listening at runtime. Cannot be measured by static analysis or unit tests.

#### 2. Click-to-Tune Linked Update (SC2)

**Test:** With audio playing, click various piano keys across the range.
**Expected:** Piano key highlight moves to clicked key, harmonic bar positions shift (bars redistribute to new harmonic series of new f0), and pitch audibly changes — all within one visible frame.
**Why human:** One-animation-frame synchrony across three systems (audio, piano, vowel chart readout) requires human observation of the running app.

#### 3. Vowel Preset Snap and Linked Update (SC5)

**Test:** Click the /i/ IPA symbol on the vowel chart, then /ɑ/, then /u/.
**Expected:** Drag handle snaps to IPA position, piano harmonic bars update amplitudes (F1 position changes affect which harmonics are boosted), and vowel quality changes audibly.
**Why human:** Requires visual confirmation of snap plus audio quality change.

#### 4. Voice-Type Overlay Rendering (SC6)

**Test:** Click "Male Range" chip — verify blue dashed polygon appears. Click "Female Range" — verify orange polygon replaces blue. Click "Child Range" — verify green polygon. Click "None" — verify polygon disappears.
**Expected:** Correct colors (blue/orange/green) and dashed stroke for each voice type; convex hull encloses the 12 vowel centroids for that group.
**Why human:** SVG polygon rendering and color correctness require visual inspection.

### Gaps Summary

No structural gaps found. All 15 requirement IDs claimed by Phase 3 plans are satisfied by substantive, wired, and data-flowing implementations. The 116 unit tests all pass; svelte-check reports 0 errors across 103 files.

The `human_needed` status reflects four items that cannot be verified programmatically:
- 60fps drag with no audio glitches (LINK-03) — requires real-time listening
- One-frame synchrony across all three systems on click-to-tune (LINK-01) — requires runtime observation
- Vowel preset snap with linked audio change — requires runtime observation
- Voice-type overlay visual correctness — requires visual inspection

The code structure for all these behaviors is correct and fully wired. The reactive chain from user interaction → voiceParams → bridge.syncParams() has no async gaps. The human verification items are behavioral confirmations, not structural issues.

---

_Verified: 2026-04-12T16:00:00Z_
_Verifier: Claude (gsd-verifier)_
