---
phase: 04-vocal-strategies
verified: 2026-04-12T17:45:00Z
status: gaps_found
score: 3/4
overrides_applied: 0
gaps:
  - truth: "User can pick a strategy (speech, R1:f0, R1:2f0, R1:3f0, R2:2f0, R2:3f0, singer's-formant cluster) from a one-click preset list with plain-language descriptions next to the notation"
    status: partial
    reason: "The redesigned UI replaces the single preset list with independently toggleable R1/R2/singer's-formant buttons. 'Speech (untuned)' is no longer a selectable preset — it is the implicit state when all toggles are off. The notation + description labels are present for each toggleable item. The architectural change is intentional (confirmed in 04-04 SUMMARY) and arguably more capable, but the ROADMAP SC explicitly lists 'speech' as a named option users can pick, and no 'Speech' item appears in the UI."
    artifacts:
      - path: "src/lib/components/StrategyPanel.svelte"
        issue: "No 'Speech' or 'Speech (untuned)' preset button — the off state is implicit, not selectable"
      - path: "src/lib/strategies/definitions.ts"
        issue: "No speech entry in R1_STRATEGIES or R2_STRATEGIES; STRATEGY_DEFINITIONS/STRATEGY_PRESETS no longer exist"
    missing:
      - "Add a 'Speech (untuned)' button or label to StrategyPanel that represents all-off state explicitly, OR update ROADMAP SC1 via override to accept the redesigned toggle UI as equivalent"
  - truth: "When a strategy is locked and the user drags a locked formant directly on the F1/F2 chart, the app responds consistently and predictably (drag is blocked with visible feedback or the strategy unlocks) and the rule is documented in-app"
    status: partial
    reason: "Drag override behavior is implemented correctly — strategyOverriding=true on pointerdown, snap-back on pointerup, with dashed-line visual feedback on both piano and vowel overlays. However, the ROADMAP SC explicitly requires 'the rule is documented in-app'. There is no user-visible tooltip, label, or status text explaining what happens during drag (e.g., 'Dragging temporarily overrides — releases when you let go'). The documentation exists only in code comments."
    artifacts:
      - path: "src/lib/components/StrategyPanel.svelte"
        issue: "No in-app text explaining the drag override / snap-back rule for locked mode"
      - path: "src/lib/components/VowelChart.svelte"
        issue: "No tooltip or status text on drag handle explaining snap-back behavior"
    missing:
      - "Add a user-visible explanation of the drag-override rule — e.g., a subtitle under the 'Locked' mode button, a tooltip on the vowel chart handle when locked, or a small status indicator that says 'Drag overrides temporarily — snaps back on release'"
human_verification:
  - test: "STRAT-02: Overlay mode visual — audio unchanged"
    expected: "In overlay mode, amber target lines appear on the piano view and an amber target marker with connecting line appears on the F1/F2 chart. Changing f0 moves targets in real time. Audio does NOT change when switching to overlay mode."
    why_human: "Cannot verify audio-only vs. visual-only behavior programmatically; requires listening while toggling modes"
  - test: "STRAT-03: Locked mode — formants auto-tune audibly as f0 changes"
    expected: "With R1:2f0 locked, playing different pitches causes F1 to smoothly track 2*f0. The vowel sound shifts audibly. No clicks or zipper noise. The F1/F2 chart handle moves automatically."
    why_human: "Audio correctness (smooth transitions, no glitches) requires listening; reactive effect correctness in browser requires interaction"
  - test: "STRAT-03: Out-of-range visual warning"
    expected: "When 2*f0 > 1000 Hz (F1 max), the overlay shows a red warning indicator and the formant stays clamped at 1000 Hz"
    why_human: "Requires interactive testing at specific pitch values"
  - test: "STRAT-04: Drag override visual feedback"
    expected: "With R1:2f0 locked, dragging the vowel handle makes the connecting line dashed. Releasing allows the formant to snap back to the strategy target."
    why_human: "Requires interactive drag testing; snap-back timing involves Svelte reactive scheduling"
  - test: "Singer's formant cluster — audible ring"
    expected: "With singer's formant active on bass/baritone, F3/F4/F5 cluster near the voice-type-specific center (e.g., bass: F3=2184, F4=2384, F5=2684 Hz). A perceptible spectral ring is audible."
    why_human: "Perceptual quality of the ring requires listening; cluster positions require visual inspection of the piano overlay"
---

# Phase 4: Vocal Strategies — Verification Report

**Phase Goal:** Vocal strategies are layered on top of the existing linked substrate as a pure-function strategy engine with both overlay mode (visual targets only, no audio change) and locked/auto-tune mode (formants track f0 as a live rule), with applicable-range handling so strategies never drive formants to physically impossible values.
**Verified:** 2026-04-12T17:45:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Architecture Note

The implementation made significant intentional design changes during human verification (Plan 04-04). The original plan specified a `StrategyId` union type with a single `computeTargets(strategyId, f0, voiceType)` function and a flat `STRATEGY_PRESETS` list. The executed implementation redesigned this to:

- Separate `R1Strategy` / `R2Strategy` types (independently toggleable)
- `computeTargets(r1, r2, singerFormant, f0, voiceType)` signature
- `R1_STRATEGIES` / `R2_STRATEGIES` dictionaries instead of `STRATEGY_DEFINITIONS`
- StrategyPanel with three independent sections (R1 / R2 / Singer's Formant) instead of a flat preset list
- Auto-strategy as a persistent reactive toggle instead of a one-shot button

These changes are architecturally sound and more expressive than the original design. All must-haves that reference the old interface names (StrategyId, STRATEGY_DEFINITIONS, STRATEGY_PRESETS, computeTargets with single strategyId) are evaluated against the actual implementation intent, not the original naming.

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can pick a strategy (speech, R1:f0, R1:2f0, R1:3f0, R2:2f0, R2:3f0, singer's-formant cluster) from a one-click preset list with plain-language descriptions next to the notation | PARTIAL | R1:f0/2f0/3f0, R2:2f0/3f0, and singer's formant all present as clickable buttons with notation + description. "Speech" is not a selectable preset — it's the implicit all-off state. |
| 2 | In overlay mode, user can see target lines or points drawn on the piano and F1/F2 chart while tuning manually, with audio unchanged by the overlay itself | ? NEEDS HUMAN | StrategyOverlayPiano and StrategyOverlayVowel are fully wired, computeTargets called in overlay mode. Audio-only behavior (no change when overlay-only) requires human verification. |
| 3 | In locked mode, user can move f0 up and down and see and hear the relevant formant(s) auto-tune to maintain the ratio, including outside the strategy's applicable range where the app visibly indicates out of range | ? NEEDS HUMAN | Locked-mode $effect in App.svelte verified to write formant targets. Clamping logic verified in tests. Out-of-range visual (red circle + warning) present in StrategyOverlayPiano. Audible correctness requires human test. |
| 4 | When a strategy is locked and the user drags a locked formant directly on the F1/F2 chart, the app responds consistently and predictably, and the rule is documented in-app | PARTIAL | Drag override implemented: strategyOverriding set on pointerdown, cleared on pointerup, dashed-line visual feedback on both overlays. Rule is NOT documented in any user-visible text — only in code comments. |

**Score:** 2/4 truths fully verified (SC2 and SC3 need human verification; SC1 and SC4 are partial)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/strategies/types.ts` | R1Strategy, R2Strategy, StrategyMode, StrategyResult types | VERIFIED | Exports R1Strategy, R2Strategy, StrategyMode, StrategyDefinition, StrategyResult, AutoStrategyRecommendation |
| `src/lib/strategies/definitions.ts` | Strategy definitions catalog with notation + description | VERIFIED | R1_STRATEGIES (3 entries), R2_STRATEGIES (2 entries), SINGER_FORMANT_CENTERS — all with notation + description |
| `src/lib/strategies/engine.ts` | computeTargets pure function | VERIFIED | Exports computeTargets(r1, r2, singerFormant, f0, voiceType): StrategyResult |
| `src/lib/strategies/auto-strategy.ts` | pickStrategy heuristic | VERIFIED | Exports pickStrategy returning AutoStrategyRecommendation with r1/r2/singerFormant per voice type per Henrich et al. 2011 |
| `src/lib/components/StrategyPanel.svelte` | Strategy selector with preset list and mode toggle | VERIFIED | Three-section panel: R1 (3 options), R2 (2 options), Singer's Formant toggle; Off/Overlay/Locked mode chips; Auto toggle |
| `src/lib/components/StrategyOverlayPiano.svelte` | SVG target lines on piano with override feedback | VERIFIED | Contains computeTargets, strategyOverriding check, dashArray changes, amber color, warning indicator |
| `src/lib/components/StrategyOverlayVowel.svelte` | SVG target marker and connecting line on F1/F2 chart | VERIFIED | Contains computeTargets, stroke-dasharray on override, #ef4444 for clamped |
| `src/lib/audio/state.svelte.ts` | Extended VoiceParams with F5 + strategy state | VERIFIED | f5Freq=4200, f5BW=400, f5Gain=0.08, r1Strategy, r2Strategy, singerFormant, strategyMode, strategyOverriding, autoStrategy |
| `src/lib/audio/bridge.ts` | 5-filter parallel formant chain | VERIFIED | buildFormantChain: `for (let i = 0; i < 5; i++)`, syncParams: 5-entry formantData array |
| `src/App.svelte` | Strategy locked-mode $effect + StrategyPanel + auto-strategy effect | VERIFIED | computeTargets imported, locked-mode $effect before syncParams, auto-strategy reactive $effect, `<StrategyPanel />` in template |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `src/App.svelte` | `src/lib/strategies/engine.ts` | computeTargets in locked-mode $effect | WIRED | `import { computeTargets }` found; used in $effect guarded by `mode !== 'locked'` |
| `src/App.svelte` | `src/lib/strategies/auto-strategy.ts` | pickStrategy in auto-strategy $effect | WIRED | `import { pickStrategy }` found; used in reactive $effect when autoStrategy=true |
| `src/lib/components/StrategyOverlayPiano.svelte` | `src/lib/strategies/engine.ts` | $derived computeTargets | WIRED | computeTargets called in $derived.by() that reads voiceParams.r1Strategy/r2Strategy/singerFormant/f0 |
| `src/lib/components/StrategyOverlayVowel.svelte` | `src/lib/strategies/engine.ts` | $derived computeTargets | WIRED | Same pattern as piano overlay |
| `src/lib/components/VowelChart.svelte` | `src/lib/audio/state.svelte.ts` | strategyOverriding on pointer events | WIRED | voiceParams.strategyOverriding = true in onPointerDown, = false in onPointerUp |
| `src/lib/components/PianoHarmonics.svelte` | `src/lib/audio/state.svelte.ts` | strategyOverriding on pointer events | WIRED | Same pattern as VowelChart |
| `src/lib/audio/bridge.ts` | `src/lib/audio/state.svelte.ts` | voiceParams.f5Freq in syncParams | WIRED | formantData array contains voiceParams.f5Freq; loop runs to i < 5 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `StrategyOverlayPiano.svelte` | strategyTargets | computeTargets(r1, r2, sf, f0, voiceType) | Yes — pure function with real math | FLOWING |
| `StrategyOverlayVowel.svelte` | strategyTargets | computeTargets(r1, r2, sf, f0, voiceType) | Yes — same | FLOWING |
| `App.svelte` (locked $effect) | result.targets | computeTargets(...) written to voiceParams.f1Freq etc. | Yes — writes to reactive state, forwarded to audio via syncParams | FLOWING |
| `App.svelte` (auto $effect) | rec | pickStrategy(f0, voiceType) written to voiceParams.r1Strategy etc. | Yes — pure heuristic function | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 29 strategy module tests pass | `npx vitest run src/lib/strategies --reporter=verbose` | 29 passed (2 test files) | PASS |
| Full test suite passes | `npx vitest run --reporter=verbose` | 145 passed (13 test files) | PASS |
| computeTargets('r1-2f0', null, false, 300, 'tenor') returns f1=600 | Verified in test suite | test: "r1-2f0 at 300 Hz returns f1=600" passes | PASS |
| computeTargets clamping: r1-f0 at 1200 Hz gives f1=1000, clamped=true | Verified in test suite | test: "r1-f0 at f0=1200 Hz returns clamped=true, f1=1000" passes | PASS |
| Singer's formant bass: f3=2184, f4=2384, f5=2684 | Verified in test suite | test: "singer formant at 200 Hz bass" passes | PASS |
| pickStrategy returns valid types for all voice/pitch combos | Verified in test suite | 14 auto-strategy tests pass | PASS |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| STRAT-01 | 04-01, 04-02 | App supports at least: speech, R1:f0, R1:2f0, R1:3f0, R2:2f0, R2:3f0, and singer's-formant cluster | PARTIAL | All 6 tracking strategies present (R1:f0/2f0/3f0, R2:2f0/3f0, singer's formant). "Speech" is represented as all-off rather than a named preset, which is a semantic deviation. |
| STRAT-02 | 04-03 | Strategies can be displayed as overlay — target lines/points drawn on piano and F1/F2 chart while user tunes manually | HUMAN | Components exist and are wired; audio-unchanged behavior requires human verification |
| STRAT-03 | 04-02, 04-03 | Strategies can be locked — app auto-tunes relevant formant(s) as f0 changes so ratio is maintained | HUMAN | Locked-mode $effect verified in code; audible correctness requires human test |
| STRAT-04 | 04-03 | When strategy is locked and user drags a locked formant, interaction is resolved predictably; rule documented in-app | PARTIAL | Drag override with snap-back implemented with visual feedback. In-app documentation of the rule is missing. |
| STRAT-05 | 04-01, 04-03 | Strategy selector is a one-click preset list with plain-language descriptions next to the notation | PARTIAL | Descriptions present for each strategy. UI redesigned from flat preset list to three independent toggle groups. "Speech" not a selectable item. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/components/StrategyPanel.svelte` | 54 | `'Auto ✓'` emoji in button text | INFO | Minor: violates project convention of no emojis unless requested |

No blocker anti-patterns found. No TODO/FIXME/placeholder patterns in strategy files. All strategy state fields produce real computed values.

### Human Verification Required

#### 1. Overlay mode — audio unchanged

**Test:** Select R1:2f0, set mode to Overlay, start audio, play a note. Observe amber target lines on piano and amber target marker on F1/F2 chart. Change f0 via QWERTY keys.
**Expected:** Target lines/marker move in real time as f0 changes. Audio does NOT change when overlay is on — the overlay is visual-only.
**Why human:** Audio-only vs. visual-only behavior cannot be verified programmatically; requires listening while toggling modes.

#### 2. Locked mode — audible formant auto-tuning

**Test:** Select R1:2f0, set mode to Locked, start audio. Play different notes across the range.
**Expected:** F1 audibly tracks 2*f0 (vowel sound shifts as pitch changes). Transitions are smooth with no clicks or zipper noise. The F1/F2 chart handle moves automatically.
**Why human:** Audio correctness and smooth transitions require listening. Svelte reactive effect timing in browser is not testable in Node environment.

#### 3. Out-of-range visual warning

**Test:** With R1:2f0 locked, push f0 high enough that 2*f0 > 1000 Hz.
**Expected:** Red warning indicator (red circle with "!") appears on the piano overlay. Formant stays clamped at 1000 Hz, does not exceed it.
**Why human:** Requires interactive testing at specific pitch threshold.

#### 4. Drag override snap-back

**Test:** With R1:2f0 locked, drag the vowel handle on the F1/F2 chart while watching the connecting line. Release.
**Expected:** Connecting line becomes dashed during drag. Formant can be moved freely. On release, formant snaps back to strategy target position.
**Why human:** Requires interactive drag testing; snap-back timing involves Svelte reactive scheduling that cannot be simulated in Node.

#### 5. Singer's formant cluster — audible ring

**Test:** Select singer's formant toggle (with baritone voice preset), set mode to Locked, start audio.
**Expected:** F3/F4/F5 cluster near baritone center (F3=2254, F4=2454, F5=2754 Hz). A perceptible spectral ring ("twang") is audible. Switch to soprano — cluster center shifts higher.
**Why human:** Perceptual quality of the ring requires listening; numeric cluster position requires visual inspection of piano overlay labels.

### Gaps Summary

Two gaps block a clean pass on the ROADMAP Success Criteria:

**Gap 1 — SC1/STRAT-01/STRAT-05: "Speech" strategy not selectable.**
The implementation redesigned the strategy UI from a flat preset list (which would have included "Speech (untuned)") to three independent toggle groups. When all toggles are off, the app behaves in speech/untuned mode, but there is no visible "Speech" button for users to click. The ROADMAP SC1 explicitly names "speech" as a selectable option. This is an intentional architectural deviation (confirmed in 04-04 SUMMARY) that achieves the same functional outcome but does not literally satisfy the SC.

Options to resolve:
- Add a "Speech (untuned)" entry to the StrategyPanel that clears all toggles when clicked, OR
- Add an override to VERIFICATION.md accepting the redesigned toggle UI as equivalent

**Gap 2 — SC4/STRAT-04: Drag override rule not documented in-app.**
The ROADMAP SC4 requires "the rule is documented in-app." The snap-back behavior is implemented and visually indicated (dashed lines), but no user-visible text explains the rule. A user encountering the dashed line would not know why it changed or that releasing will restore the locked position.

Options to resolve:
- Add a subtitle or hint under the "Locked" mode button (e.g., "Drag temporarily overrides — snaps back on release")
- Add a `title` attribute tooltip on the VowelChart drag handle when locked
- Add a small status chip that appears when strategyOverriding is true

Both gaps are small, targeted, and do not require architectural changes. SC2 and SC3 require human verification but the code evidence is strong.

---

_Verified: 2026-04-12T17:45:00Z_
_Verifier: Claude (gsd-verifier)_
