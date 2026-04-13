---
phase: 07-cascade-formant-filters
plan: 02
subsystem: audio, ui
tags: [formant, topology, 4th-order, biquad, visualization]

requires:
  - phase: 07-cascade-formant-filters/01
    provides: cascadeEnvelope, topologyAwareEnvelope, FilterTopology, FilterOrder types
provides:
  - 4th-order formant filter toggle (doubles biquads per formant)
  - toggleFilterOrder method on AudioBridge with mute-crossfade
  - Topology-aware FormantCurves visualization
  - Topology-aware HarmonicBars computation
  - Updated Formants help dialog with 4th-order explanation
affects: [visualizations, audio-graph]

tech-stack:
  added: []
  patterns: [dual-biquad-pool, mute-crossfade-for-graph-changes]

key-files:
  created: []
  modified:
    - src/lib/audio/bridge.ts
    - src/App.svelte
    - src/lib/components/FormantCurves.svelte
    - src/lib/components/HarmonicBars.svelte

key-decisions:
  - "Cascade audio topology disabled — Web Audio BiquadFilterNode bandpass kills signal in series, peaking causes distortion. Needs custom IIR or worklet-side implementation."
  - "Kept topology-aware math and visualization code for future cascade implementation"
  - "4th-order uses pre-created B biquad pool with mute-crossfade switching"

patterns-established:
  - "Dual biquad pool: A pool always active, B pool pre-created and synced but only connected in 4th-order mode"
  - "Mute-crossfade for graph topology changes: fade out 50ms, rewire, fade in"

requirements-completed: [FILT-01, FILT-02, FILT-03]

duration: 30min
completed: 2026-04-13
---

# Plan 07-02: Audio Graph Wiring and UI Summary

**4th-order formant filter toggle with dual biquad pools and topology-aware visualizations; cascade audio deferred**

## Performance

- **Duration:** 30 min
- **Started:** 2026-04-13T08:29:00Z
- **Completed:** 2026-04-13T08:55:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Added 4th-order formant filter checkbox to expert Formants section
- AudioBridge pre-creates dual biquad pools (A+B); toggleFilterOrder uses mute-crossfade to rewire
- FormantCurves renders topology-aware curves (cascade combined envelope or individual parallel curves)
- HarmonicBars uses topologyAwareEnvelope for bar height computation
- Updated Formants help dialog with 4th-order and bandwidth explanations

## Task Commits

1. **Task 1: AudioBridge cascade wiring** - `e090886` (feat)
2. **Task 2: UI controls and visualization updates** - `32c1aa8` (feat)
3. **Task 3: Verification and cascade removal** - `00ae51c` (fix)

## Files Created/Modified
- `src/lib/audio/bridge.ts` - Dual biquad pools, toggleFilterOrder with mute-crossfade, simplified parallel-only wiring
- `src/App.svelte` - 4th-order checkbox, updated help dialog
- `src/lib/components/FormantCurves.svelte` - Topology-aware curve rendering with 4th-order support
- `src/lib/components/HarmonicBars.svelte` - topologyAwareEnvelope for harmonic amplitudes

## Decisions Made
- Cascade audio topology disabled after verification showed Web Audio BiquadFilterNode is unsuitable for series formant filtering (bandpass kills signal, peaking distorts). A proper implementation needs custom IIR coefficients or worklet-side processing.
- Topology-aware math and visualization code kept in place for future cascade implementation.

## Deviations from Plan

### Auto-fixed Issues

**1. Cascade audio disabled**
- **Found during:** Task 3 (human verification)
- **Issue:** Cascade audio via BiquadFilterNode produces silence (bandpass) or heavy distortion (peaking) — neither is a realistic cascade formant synthesizer
- **Fix:** Removed cascade audio wiring and topology toggle from UI. Kept types, math, and visualization code.
- **Files modified:** src/lib/audio/bridge.ts, src/App.svelte
- **Verification:** User confirmed audio works correctly without cascade, 4th-order toggle functions properly
- **Committed in:** 00ae51c

---

**Total deviations:** 1 (cascade audio deferred)
**Impact on plan:** Cascade audio is a known gap requiring a different technical approach (custom IIR or worklet-side filtering). The types, math, and visualization infrastructure are in place.

## Issues Encountered
- Web Audio BiquadFilterNode `bandpass` type in series attenuates signal to silence (each filter rejects frequencies outside its narrow band)
- Web Audio BiquadFilterNode `peaking` type in series causes distortion from cumulative broadband boost

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 4th-order formant filters working with dual biquad pools
- Topology-aware visualization math ready for cascade when audio implementation is revisited
- Cascade audio implementation deferred — needs custom IIR coefficients or worklet-side processing

---
*Phase: 07-cascade-formant-filters*
*Completed: 2026-04-13*
