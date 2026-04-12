---
phase: 02-voice-controls-expression
plan: 05
subsystem: ui
tags: [svelte, css-custom-properties, keyboard-input, component-composition]

# Dependency graph
requires:
  - phase: 02-voice-controls-expression/03
    provides: "AudioBridge with vibrato/jitter/spectralTilt sync"
  - phase: 02-voice-controls-expression/04
    provides: "TransportBar, PitchSection, VoicePresets, PhonationMode, ExpressionControls components"
provides:
  - "Complete Phase 2 app with all sections wired and QWERTY keyboard"
  - "CSS design system tokens for colors, spacing, radius"
  - "Reactive bridge pattern forwarding all voiceParams to audio"
affects: [03-linked-visualizations, 06-pedagogy-ui-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: ["CSS custom properties design system", "QWERTY keyboard event handler with input guard"]

key-files:
  created: []
  modified: ["src/app.css", "src/App.svelte", "src/lib/components/PitchSection.svelte"]

key-decisions:
  - "PitchSection accepts optional pressedKeys prop to forward QWERTY highlight state to PianoKeyboard"
  - "All voiceParams fields explicitly read in $effect for dependency tracking rather than using a snapshot"

patterns-established:
  - "Design system tokens: --color-*, --spacing-*, --radius-* in :root"
  - "QWERTY handler pattern: ignore repeats, ignore text inputs, only when playing"
  - "Component composition: App.svelte as thin integration layer, no business logic"

requirements-completed: [VOICE-01, VOICE-02, VOICE-03, AUDIO-07]

# Metrics
duration: 3min
completed: 2026-04-12
---

# Phase 2 Plan 05: App Integration & CSS Design System Summary

**App.svelte rewritten to compose all 5 section components with QWERTY keyboard handler and CSS design system tokens established**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-12T08:38:59Z
- **Completed:** 2026-04-12T08:42:04Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- CSS design system with 9 color tokens, 6 spacing tokens, and 2 radius tokens
- App.svelte composes TransportBar, PitchSection, VoicePresets, PhonationMode, ExpressionControls in correct UI-SPEC order
- QWERTY keyboard handler maps event.code to MIDI notes via midiToHz, with guards for input focus, repeat events, and playing state
- $effect reads all 18 voiceParams reactive fields including Phase 2 additions (vibratoRate, vibratoExtent, jitterAmount, spectralTilt, muted)
- Phase 1 placeholder UI (vowel slider, VOWEL_A/VOWEL_I) removed

## Task Commits

Each task was committed atomically:

1. **Task 1: Update app.css with design system tokens** - `3ed8df5` (feat)
2. **Task 2: Rewrite App.svelte with component composition and QWERTY keyboard** - `b06041e` (feat)

## Files Created/Modified
- `src/app.css` - CSS custom properties design system (colors, spacing, radius, section cards, button base styles)
- `src/App.svelte` - Full Phase 2 app composing all section components with QWERTY keyboard and reactive bridge
- `src/lib/components/PitchSection.svelte` - Added pressedKeys prop to forward QWERTY highlights to PianoKeyboard

## Decisions Made
- Added pressedKeys as optional prop to PitchSection (Rule 2: missing critical functionality - QWERTY visual feedback requires passing pressed state through to PianoKeyboard which already accepts it)
- Kept bridgeInitialized as local state passed to TransportBar (controls "Start Audio" vs play/stop label)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added pressedKeys prop to PitchSection**
- **Found during:** Task 2 (App.svelte rewrite)
- **Issue:** PitchSection did not accept pressedKeys prop, but PianoKeyboard already supports it for QWERTY visual highlight
- **Fix:** Added Props interface with optional pressedKeys: Set<string> and forwarded to PianoKeyboard
- **Files modified:** src/lib/components/PitchSection.svelte
- **Verification:** Code review confirms prop is passed through correctly
- **Committed in:** b06041e (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for QWERTY visual feedback. No scope creep.

## Issues Encountered
- Could not run vitest or vite build due to sandbox restrictions on test/build commands. CSS and component changes are structurally sound based on code review and matching existing patterns.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All Phase 2 UI components are wired and the integration layer is complete
- Ready for Phase 3 linked visualizations (F1/F2 chart, piano harmonics overlay)
- CSS design system tokens available for all future components

## Self-Check: PASSED

All files verified present. Both task commits verified in git log.

---
*Phase: 02-voice-controls-expression*
*Completed: 2026-04-12*
