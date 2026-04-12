---
phase: 02-voice-controls-expression
plan: 02
subsystem: audio, data
tags: [svelte-5-runes, voice-presets, phonation, qwerty-midi, formant-synthesis]

requires:
  - phase: 01-audio-closed-loop
    provides: VoiceParams store with f0/formant/OQ/aspiration fields
provides:
  - Extended VoiceParams with vibrato/jitter/phonation/mute/voicePreset fields
  - Voice type preset data for 7 voice types (soprano through child)
  - Phonation mode preset data for 4 modes (breathy/modal/flow/pressed)
  - QWERTY keyboard to MIDI note mapping (24 keys, 2 octaves)
  - PhonationMode type, PhonationPreset and VoicePreset interfaces
affects: [02-03-audio-engine, 02-04-ui-components, 02-05-ui-components]

tech-stack:
  added: []
  patterns: [data-module-with-tests, typed-preset-records]

key-files:
  created:
    - src/lib/data/voice-presets.ts
    - src/lib/data/voice-presets.test.ts
    - src/lib/data/phonation-presets.ts
    - src/lib/data/phonation-presets.test.ts
    - src/lib/data/qwerty-map.ts
    - src/lib/data/qwerty-map.test.ts
  modified:
    - src/lib/types.ts
    - src/lib/audio/state.svelte.ts

key-decisions:
  - "Spectral tilt default 6 dB (modal phonation) matches Klatt literature values"
  - "Voice preset formant values derived from Hillenbrand 1995 scaling patterns for /a/ vowel"
  - "QWERTY map uses event.code for keyboard-layout independence"

patterns-established:
  - "Data modules as typed Record exports with corresponding test files"
  - "Preset interfaces in types.ts, data in src/lib/data/"

requirements-completed: [VOICE-04, VOICE-05, VOICE-02, AUDIO-02, AUDIO-07]

duration: 3min
completed: 2026-04-12
---

# Phase 02 Plan 02: Store & Data Modules Summary

**Extended VoiceParams with 7 new reactive fields, created 3 data modules (voice presets, phonation presets, QWERTY map) with 30 passing unit tests**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-12T08:20:36Z
- **Completed:** 2026-04-12T08:23:26Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Extended VoiceParams store with vibrato (rate/extent), jitter, phonation mode, spectral tilt, muted, and voicePreset fields
- Added PhonationMode union type, PhonationPreset and VoicePreset interfaces to shared types
- Created 7 voice type presets with literature-derived f0 and formant values
- Created 4 phonation mode presets with voice-science-based OQ/aspiration/tilt values
- Created 24-key QWERTY-to-MIDI mapping using event.code for layout independence
- All 44 tests pass (14 existing + 30 new)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend types and VoiceParams store** - `180842a` (feat)
2. **Task 2 RED: Failing tests for data modules** - `2607615` (test)
3. **Task 2 GREEN: Implement data modules** - `1f2364b` (feat)

## Files Created/Modified
- `src/lib/types.ts` - Added PhonationMode, PhonationPreset, VoicePreset types
- `src/lib/audio/state.svelte.ts` - Added 7 new $state fields for Phase 2 parameters
- `src/lib/data/voice-presets.ts` - 7 voice type presets with f0, formant, bandwidth data
- `src/lib/data/voice-presets.test.ts` - 8 tests covering all presets and value ranges
- `src/lib/data/phonation-presets.ts` - 4 phonation mode presets (breathy/modal/flow/pressed)
- `src/lib/data/phonation-presets.test.ts` - 9 tests with exact value verification
- `src/lib/data/qwerty-map.ts` - 24-key event.code to MIDI note mapping
- `src/lib/data/qwerty-map.test.ts` - 11 tests for key mapping and uniqueness

## Decisions Made
- Spectral tilt default set to 6 dB (modal phonation), matching Klatt literature
- Voice preset formant values from Hillenbrand 1995 scaling patterns for /a/ vowel
- QWERTY map uses event.code (not event.key) for keyboard-layout independence
- PHONATION_PRESETS typed as Record<PhonationMode, PhonationPreset> for exhaustiveness

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Store and data modules ready for consumption by audio engine (Plan 03) and UI components (Plan 04/05)
- All interfaces typed and exported for downstream use
- Test coverage provides regression safety for future changes

---
*Phase: 02-voice-controls-expression*
*Completed: 2026-04-12*
