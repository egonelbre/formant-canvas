---
phase: 04-vocal-strategies
plan: 01
subsystem: dsp
tags: [strategy-engine, formant-tracking, pure-functions, vitest]

# Dependency graph
requires:
  - phase: 01-audio-closed-loop
    provides: VoiceParams with formant fields, AudioBridge
provides:
  - "StrategyId, StrategyMode, StrategyDefinition, StrategyResult types"
  - "STRATEGY_DEFINITIONS catalog (7 strategies with notation, description, ranges)"
  - "STRATEGY_PRESETS array (8 preset combinations)"
  - "computeTargets pure function for all 7 strategies with range clamping"
  - "pickStrategy auto-strategy heuristic"
affects: [04-vocal-strategies]

# Tech tracking
tech-stack:
  added: []
  patterns: [pure-function strategy engine, formant range clamping, voice-type-specific singer's formant centers]

key-files:
  created:
    - src/lib/strategies/types.ts
    - src/lib/strategies/definitions.ts
    - src/lib/strategies/engine.ts
    - src/lib/strategies/auto-strategy.ts
    - src/lib/strategies/__tests__/strategy-engine.test.ts
    - src/lib/strategies/__tests__/auto-strategy.test.ts
  modified: []

key-decisions:
  - "Singer's formant cluster bypasses general formant clamping bounds -- cluster positions are voice-type-specific and inherently correct"
  - "Auto-strategy heuristic uses soprano/high-voice detection with f0 thresholds at 300/250/150 Hz"

patterns-established:
  - "Pure-function strategy engine: (strategyId, f0, voiceType) => StrategyResult with zero side effects"
  - "Formant range clamping for R1/R2 strategies: F1 [200-1000], F2 [600-3000]"
  - "Singer's formant cluster: center - 200 (F3), center (F4), center + 300 (F5) by voice type"

requirements-completed: [STRAT-01, STRAT-05]

# Metrics
duration: 3min
completed: 2026-04-12
---

# Phase 4 Plan 1: Strategy Engine Summary

**Pure-function strategy engine computing formant targets for 7 vocal strategies (speech, R1:f0/2f0/3f0, R2:2f0/3f0, singer's formant cluster) with range clamping and auto-strategy heuristic**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-12T13:51:57Z
- **Completed:** 2026-04-12T13:55:13Z
- **Tasks:** 1 (TDD feature with RED/GREEN phases)
- **Files created:** 6

## Accomplishments
- All 7 strategy types compute correct formant targets as pure functions
- Range clamping stops R1/R2 formants at physical boundaries (F1: 200-1000 Hz, F2: 600-3000 Hz)
- Singer's formant cluster uses voice-type-specific center frequencies (bass 2384 Hz to soprano 3092 Hz)
- Auto-strategy picks reasonable defaults for any voice-type/f0 combination
- 19 tests covering all strategies, boundary conditions, and the auto-strategy heuristic

## Task Commits

Each task was committed atomically:

1. **RED: Failing tests** - `78e1455` (test)
2. **GREEN: Strategy engine implementation** - `124bc42` (feat)

## Files Created/Modified
- `src/lib/strategies/types.ts` - StrategyId, StrategyMode, StrategyDefinition, StrategyResult types
- `src/lib/strategies/definitions.ts` - STRATEGY_DEFINITIONS catalog (7 entries) and STRATEGY_PRESETS (8 preset combos)
- `src/lib/strategies/engine.ts` - computeTargets pure function with formant range clamping
- `src/lib/strategies/auto-strategy.ts` - pickStrategy heuristic for auto-strategy mode
- `src/lib/strategies/__tests__/strategy-engine.test.ts` - 15 tests for engine, definitions, presets
- `src/lib/strategies/__tests__/auto-strategy.test.ts` - 4 tests for auto-strategy heuristic

## Decisions Made
- Singer's formant cluster bypasses general F3/F4/F5 clamping bounds because the cluster positions are voice-type-specific and inherently correct (bass F4 = 2384 Hz is below the general F4 minimum of 2500 Hz)
- Auto-strategy uses a simple threshold cascade: soprano/mezzo >= 300 Hz -> R1:f0, high voices >= 250 Hz -> R1:2f0, mid-range >= 150 Hz -> R1:2f0, low range -> R1:3f0

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Singer's formant cluster clamping produced incorrect values**
- **Found during:** GREEN phase (test failures)
- **Issue:** General formant clamping bounds (F4 min 2500, F5 min 3500) were too restrictive for singer's formant cluster, which intentionally places formants at lower voice-type-specific positions (e.g., bass F4 = 2384 Hz)
- **Fix:** Removed general formant clamping from singer's formant case; cluster positions are inherently correct per voice type
- **Files modified:** src/lib/strategies/engine.ts
- **Verification:** All 19 tests pass including bass f4=2384 and tenor f5=3005
- **Committed in:** 124bc42 (GREEN phase commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Fix necessary for correctness of singer's formant cluster computation. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Strategy engine module complete with full test coverage
- Ready for plan 04-02 (VoiceParams integration, F5 addition, locked mode effect)
- All exports properly typed: StrategyId, StrategyMode, StrategyDefinition, StrategyResult, computeTargets, pickStrategy, STRATEGY_DEFINITIONS, STRATEGY_PRESETS

---
*Phase: 04-vocal-strategies*
*Completed: 2026-04-12*
