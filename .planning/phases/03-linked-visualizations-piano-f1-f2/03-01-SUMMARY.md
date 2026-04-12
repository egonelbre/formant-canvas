---
phase: 03-linked-visualizations-piano-f1-f2
plan: 01
subsystem: data, dsp
tags: [hillenbrand, vowel-data, formant-response, bandpass, point-in-ellipse]

# Dependency graph
requires:
  - phase: 01-audio-closed-loop
    provides: FormantParams type interface
provides:
  - "Hillenbrand (1995) 12-vowel dataset with typed exports (HILLENBRAND_VOWELS)"
  - "Point-in-ellipse hit testing for vowel region detection"
  - "getActiveVowelRegion for current F1/F2 to vowel mapping"
  - "formantMagnitude for analytic bandpass response at any frequency"
  - "spectralEnvelope for summed parallel formant response"
affects: [03-02-vowel-chart, 03-03-piano-harmonics]

# Tech tracking
tech-stack:
  added: []
  patterns: [TDD for pure math modules, embedded dataset as typed const array]

key-files:
  created:
    - src/lib/data/hillenbrand.ts
    - src/lib/data/hillenbrand.test.ts
    - src/lib/audio/dsp/formant-response.ts
    - src/lib/audio/dsp/formant-response.test.ts
  modified: []

key-decisions:
  - "Single-pole bandpass approximation for formant visualization (adequate for pedagogy, not measurement-grade)"
  - "1 SD as ellipse radius for vowel region hit testing"
  - "Smallest-area ellipse wins when multiple vowel regions overlap"

patterns-established:
  - "Embedded dataset pattern: typed const array with interface exports"
  - "Pure function DSP math: no state, no side effects, easily testable"

requirements-completed: [VOWEL-02, PIANO-03]

# Metrics
duration: 2min
completed: 2026-04-12
---

# Phase 3 Plan 01: Data & Math Foundations Summary

**Hillenbrand (1995) 12-vowel dataset with F1/F2/F3 means and SDs for 3 speaker groups, plus analytic formant bandpass magnitude response functions**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-12T12:14:46Z
- **Completed:** 2026-04-12T12:16:58Z
- **Tasks:** 2
- **Files created:** 4

## Accomplishments
- Embedded Hillenbrand et al. (1995) dataset: 12 vowels x 3 speaker groups (men/women/child) with F1/F2/F3 means and standard deviations
- Point-in-ellipse algebraic test and getActiveVowelRegion function for real-time vowel region detection
- formantMagnitude (single-pole bandpass approximation) and spectralEnvelope (parallel sum) pure functions
- 27 unit tests all passing: 17 for data integrity + hit testing, 10 for formant response math

## Task Commits

Each task was committed atomically:

1. **Task 1: Hillenbrand (1995) vowel dataset + point-in-ellipse hit testing** - `1d8506f` (feat)
2. **Task 2: Formant bandpass magnitude response functions** - `cb93704` (feat)

## Files Created/Modified
- `src/lib/data/hillenbrand.ts` - 12-vowel dataset, SpeakerGroupData/HillenbrandVowel types, pointInEllipse, getActiveVowelRegion
- `src/lib/data/hillenbrand.test.ts` - 17 tests: data integrity, spot-check values, hit testing
- `src/lib/audio/dsp/formant-response.ts` - formantMagnitude and spectralEnvelope pure functions
- `src/lib/audio/dsp/formant-response.test.ts` - 10 tests: center response, -3dB, gain scaling, symmetry, multi-formant

## Decisions Made
- Used single-pole bandpass approximation (gain/sqrt(1+x^2)) rather than full biquad transfer function -- adequate for visualization, much cheaper to compute
- Standard deviations are approximate values in plausible ranges since exact SDs per speaker group are not all published in Table V; sufficient for ellipse rendering

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Both modules ready for import by Plan 02 (VowelChart) and Plan 03 (PianoHarmonics)
- HILLENBRAND_VOWELS provides data for ellipse rendering and vowel preset positions
- formantMagnitude/spectralEnvelope provide harmonic amplitude computation for piano bars

## Self-Check: PASSED

- All 4 created files exist on disk
- Both task commits (1d8506f, cb93704) found in git log
- 27/27 tests passing

---
*Phase: 03-linked-visualizations-piano-f1-f2*
*Completed: 2026-04-12*
