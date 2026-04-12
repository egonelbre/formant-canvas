---
plan: "02-06"
phase: "02-voice-controls-expression"
status: complete
started: 2026-04-12
completed: 2026-04-12
duration: "~15 min (human testing)"
---

## Summary

Human verification of the complete Phase 2 Voice Controls and Expression interface. All 7 verification areas passed after iterative fixes.

## Tasks

| # | Task | Status |
|---|------|--------|
| 1 | Human verification of Phase 2 controls | ✓ Complete |

## Issues Found and Fixed During Verification

1. **QWERTY keyboard mapping** — Fixed diatonic layout: ZXCVBNM = white keys (C D E F G A B), SDGHJ = sharps
2. **Piano drag** — Added pointer event drag support with preventDefault to avoid text selection
3. **Pitch slider overlay** — Removed unnecessary vertical slider from PitchSection
4. **Voice preset behavior** — Changed to only update formants, preserving current pitch and phonation mode
5. **Pitch transitions** — Added ~50ms one-pole f0 smoothing in worklet for glide between notes

## Self-Check: PASSED

- [x] All verification areas approved by human
- [x] Fixes committed and tests passing
- [x] Build succeeds

## Key Files

### key-files.modified
- `src/lib/data/qwerty-map.ts` — Corrected piano-style QWERTY layout
- `src/lib/components/PianoKeyboard.svelte` — Added pointer drag, removed per-key onclick
- `src/lib/components/PitchSection.svelte` — Removed pitch slider overlay
- `src/lib/components/VoicePresets.svelte` — Formants-only preset loading
- `src/lib/audio/worklet/glottal-processor.ts` — f0 smoothing

## Deviations

| Planned | Actual | Reason |
|---------|--------|--------|
| Voice presets reset f0 and phonation | Presets only change formants | User preference: preserve current pitch and phonation mode when switching voice type |
| Pitch slider overlaid on piano | No pitch slider | User preference: slider was unnecessary clutter |
| Digit4 mapped to F4 | KeyR mapped to F4 | Standard piano QWERTY layout: letter keys = white notes |
