# Phase 4: Vocal Strategies - Research

**Researched:** 2026-04-12
**Domain:** Vocal strategy engine (formant-harmonic tracking rules), overlay/locked mode UI, F5 formant addition
**Confidence:** HIGH

## Summary

Phase 4 adds a strategy engine that computes target formant frequencies as pure functions of (strategy, f0, voice type), with two display modes: overlay (visual-only targets) and locked (formants auto-track f0). The domain is well-defined by Sundberg's vocal science literature, and the existing codebase provides all needed integration points: VoiceParams as single source of truth, SVG-based visualizations with established freqToX/f1Scale/f2Scale coordinate systems, and setTargetAtTime for smooth audio parameter changes.

The main technical challenges are: (1) computing correct target frequencies for each strategy including applicable-range boundaries, (2) adding F5 to the audio graph for singer's formant cluster, (3) implementing the temporary drag override ("rubber band") behavior where dragging a locked formant works but snaps back on release, and (4) the auto-strategy heuristic that selects appropriate strategies based on voice/pitch/vowel context.

**Primary recommendation:** Build the strategy engine as a pure-function module (`src/lib/strategies/`) with zero UI or audio dependencies, then wire it into VoiceParams via a `$effect` that runs the engine on f0 changes in locked mode. Overlay components read engine output directly without writing to VoiceParams.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Sidebar panel for strategy selection -- dedicated panel alongside visualizations, always visible
- D-02: Notation + short phrase labels -- e.g., "R1:f0 -- First formant tracks pitch"
- D-03: "Speech (untuned)" is the default strategy -- app always has an active strategy
- D-04: Global mode toggle: Overlay / Locked / Off -- one switch for whichever strategy is selected
- D-05: Combined preset matrix for R1/R2 strategy selection -- curated grid of known-good combinations
- D-06: "Auto strategy" option in the selector
- D-07: Vertical target lines on the piano view
- D-08: Target marker with connecting line on the F1/F2 chart
- D-09: Real-time overlay tracking -- targets move continuously as f0 changes
- D-10: Single overlay color for all strategies
- D-11: Smooth interpolation for formant tracking (~50-100ms using setTargetAtTime)
- D-12: Clamp with visual warning at range boundaries -- formant stops, overlay turns red
- D-13: Singer's formant cluster affects F3+F4+F5 -- requires adding F5 to VoiceParams
- D-14: Drag overrides strategy temporarily -- strategy re-locks on release
- D-15: Pulsing or dashed connecting line during temporary override

### Claude's Discretion
- Exact overlay color choice (within single-color constraint)
- Target line thickness, opacity, and label positioning on piano
- Connecting line dash pattern and animation timing
- Auto-strategy heuristic: which combinations of voice/pitch/vowel map to which strategies
- Preset matrix layout: exact grid dimensions and which R1/R2 combinations to include
- F5 default frequency and bandwidth values
- Sidebar panel internal layout and section ordering
- Warning icon/animation style for out-of-range indication
- Smooth interpolation time constant (within ~50-100ms range)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STRAT-01 | App supports at least: speech (untuned), R1:f0, R1:2f0, R1:3f0, R2:2f0, R2:3f0, and singer's-formant cluster | Strategy engine with pure-function computations per strategy; singer's formant requires F5 addition |
| STRAT-02 | Strategies displayed as overlay -- target lines/points on piano and F1/F2 chart | SVG overlay elements in PianoHarmonics and VowelChart reading strategy engine output |
| STRAT-03 | Strategies can be locked -- app auto-tunes formants as f0 changes | $effect in App.svelte writes strategy targets to voiceParams; setTargetAtTime provides smooth interpolation |
| STRAT-04 | Drag conflict resolved predictably -- drag overrides temporarily, re-locks on release | Pointer capture already established; onPointerUp triggers re-lock to strategy target |
| STRAT-05 | Strategy selector is one-click preset list with plain-language descriptions | Sidebar panel component with ChipGroup-style layout, notation + description labels |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Tech stack: Svelte 5 + TypeScript, plain Svelte + Vite (NOT SvelteKit)
- SVG for interactive visualizations (piano, F1/F2 chart); Canvas only for pixel-pushing (spectrum/waveform)
- `d3-scale` for Hz/semitone/pixel mapping -- cherry-picked, not full d3
- `BiquadFilterNode` in parallel topology for formants
- `setTargetAtTime` for all smooth parameter changes
- Single source of truth: `VoiceParams` class with `$state` runes
- `$effect` in App.svelte triggers `bridge.syncParams()` on any voiceParams change
- Vitest for unit tests; DSP as pure functions tested in Node

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Svelte 5 | 5.55.x | UI framework with $state/$derived/$effect runes | Already in use; reactive runes are ideal for strategy state |
| d3-scale | 4.x | Log/linear scales for Hz-to-pixel mapping | Already in VowelChart and PianoHarmonics |
| Web Audio BiquadFilterNode | browser-native | Formant resonators including new F5 | Parallel topology established in AudioBridge |

### New Dependencies
None required. All strategy computation is pure math (no library needed). F5 is one more BiquadFilterNode in the existing parallel chain.

## Architecture Patterns

### Recommended Project Structure
```
src/lib/
  strategies/
    types.ts              # Strategy types, StrategyId, StrategyMode, StrategyResult
    engine.ts             # Pure function: computeTargets(strategy, f0, voiceType) => StrategyResult
    definitions.ts        # Strategy catalog: applicable ranges, ratio rules, descriptions
    auto-strategy.ts      # Heuristic: pickStrategy(f0, voiceType, vowel) => StrategyId
  audio/
    state.svelte.ts       # Extended: F5 fields, strategy state fields
    bridge.ts             # Extended: F5 BiquadFilterNode in parallel chain
  components/
    StrategyPanel.svelte  # Sidebar: preset matrix + mode toggle + auto option
    StrategyOverlayPiano.svelte   # SVG target lines on piano (child of PianoHarmonics)
    StrategyOverlayVowel.svelte   # SVG target marker + connecting line on F1/F2 chart
```

### Pattern 1: Pure Strategy Engine
**What:** All strategy math lives in pure functions with zero side effects. Takes (strategyId, f0, voiceType) and returns target formant frequencies + applicable-range status.
**When to use:** Every strategy computation.
**Example:**
```typescript
// src/lib/strategies/engine.ts
export interface StrategyResult {
  /** Target formant frequencies (null = not controlled by this strategy) */
  f1Target: number | null;
  f2Target: number | null;
  f3Target: number | null;
  f4Target: number | null;
  f5Target: number | null;
  /** Whether the current f0 is within the strategy's applicable range */
  inRange: boolean;
  /** Clamped targets (at range boundary) when out of range */
  clamped: boolean;
}

export function computeTargets(
  strategyId: StrategyId,
  f0: number,
  voiceType: string
): StrategyResult { ... }
```

### Pattern 2: Strategy State in VoiceParams
**What:** Strategy selection and mode live in VoiceParams alongside audio parameters. This keeps the single-source-of-truth pattern intact.
**When to use:** For all strategy state.
**Example:**
```typescript
// Extensions to VoiceParams
strategyId = $state<StrategyId>('speech');
strategyMode = $state<StrategyMode>('off');  // 'off' | 'overlay' | 'locked'
strategyOverriding = $state(false);  // true during temporary drag override

// F5 formant (D-13: singer's formant cluster)
f5Freq = $state(4500);  f5BW = $state(400);  f5Gain = $state(0.08);
```

### Pattern 3: Effect-Driven Locked Mode
**What:** A `$effect` watches f0 changes and, when strategy is locked, writes computed targets to voiceParams formant fields. The existing syncParams effect then forwards to audio.
**When to use:** Locked mode only. Overlay mode reads targets without writing.
**Example:**
```typescript
// In App.svelte or a dedicated strategy controller
$effect(() => {
  if (voiceParams.strategyMode !== 'locked' || voiceParams.strategyOverriding) return;
  const targets = computeTargets(voiceParams.strategyId, voiceParams.f0, voiceParams.voicePreset ?? 'baritone');
  if (targets.f1Target !== null) voiceParams.f1Freq = targets.f1Target;
  if (targets.f2Target !== null) voiceParams.f2Freq = targets.f2Target;
  // ... etc for f3, f4, f5
});
```

### Pattern 4: Temporary Drag Override (D-14)
**What:** When user drags a locked formant, set `strategyOverriding = true` to pause the locked-mode effect. On pointer release, set `strategyOverriding = false` to let the effect snap the formant back to its strategy target.
**When to use:** VowelChart and PianoHarmonics drag handlers when strategy is locked.
**Example:**
```typescript
function onPointerDown(e: PointerEvent) {
  if (voiceParams.strategyMode === 'locked') {
    voiceParams.strategyOverriding = true;
  }
  // ... existing drag logic
}

function onPointerUp(e: PointerEvent) {
  voiceParams.strategyOverriding = false;
  // ... existing cleanup
}
```

### Anti-Patterns to Avoid
- **Separate state store for strategy targets:** Do NOT create a parallel reactive store for target values. Use $derived computations that read from voiceParams. The strategy engine output should be computed values, not stored state (except what's written in locked mode).
- **Circular effect loops:** In locked mode, writing to voiceParams.f1Freq triggers syncParams AND triggers the strategy effect again. Guard against this by checking whether the write would change the value, or by using the `strategyOverriding` flag.
- **Coupling strategy UI to audio bridge:** Strategy panel should only write to voiceParams (strategyId, strategyMode). The audio bridge reads from voiceParams as always -- it doesn't know strategies exist.

## Vocal Strategy Domain Knowledge

### Strategy Definitions and Applicable Ranges [CITED: voicescience.org/lexicon/formant-tuning/]

| Strategy | Rule | Voice Types | Applicable f0 Range | Notes |
|----------|------|-------------|---------------------|-------|
| Speech (untuned) | No tracking | All | All | Formants free, current behavior |
| R1:f0 | F1 = f0 | Soprano, high tenor | ~C4 (262 Hz) to ~C6 (1047 Hz) | Sopranos track R1=f0 up to ~1 kHz for unrounded vowels |
| R1:2f0 | F1 = 2*f0 | Tenor, baritone, belt | ~G3 (196 Hz) to ~E5 (659 Hz) | Belt ceiling ~C5 for female; thick-fold limit |
| R1:3f0 | F1 = 3*f0 | Baritone, bass | ~C2 (65 Hz) to ~C4 (262 Hz) | Lower pitches where 3*f0 falls near speech R1 |
| R2:2f0 | F2 = 2*f0 | Soprano (simultaneous with R1:f0) | ~C4 (262 Hz) to ~G5 (784 Hz) | Often paired with R1:f0 in sopranos |
| R2:3f0 | F2 = 3*f0 | Tenor, alto | ~A3 (220 Hz) to ~E5 (659 Hz) | Used when 3*f0 falls near speech R2 |
| Singer's formant cluster | F3+F4+F5 cluster near 2.5-3.5 kHz | Tenor, baritone, bass (NOT soprano above ~E5) | Below ~E5 (659 Hz) | Center frequency varies by voice type |

### Singer's Formant Cluster Center Frequencies [CITED: voicescience.org/lexicon/singers-formant/]

| Voice Type | Center (Hz) | SD (Hz) |
|------------|-------------|---------|
| Bass | 2384 | 164 |
| Baritone | 2454 | 206 |
| Tenor | 2705 | 221 |
| Soprano | 3092 | 284 |

### F5 Default Values [ASSUMED]

For the new F5 formant needed by singer's formant cluster:

| Voice Type | F5 Freq (Hz) | F5 BW (Hz) | F5 Gain |
|------------|--------------|------------|---------|
| Bass | 4100 | 400 | 0.08 |
| Baritone | 4200 | 400 | 0.08 |
| Tenor | 4500 | 420 | 0.10 |
| Soprano | 4950 | 450 | 0.06 |
| Child | 5200 | 500 | 0.05 |

These are reasonable estimates based on the typical F5 being ~1.25x F4. The exact values are Claude's discretion per CONTEXT.md.

### Strategy Range Boundaries: Implementation [ASSUMED]

When f0 puts the target formant outside its physically reasonable range, clamp the formant at the boundary:

| Formant | Min (Hz) | Max (Hz) | Source |
|---------|----------|----------|--------|
| F1 | 200 | 1000 | Hillenbrand data range, already in VowelChart |
| F2 | 600 | 3000 | Hillenbrand data range, already in VowelChart |
| F3 | 1500 | 3500 | Existing FORMANT_RANGES in PianoHarmonics |
| F4 | 2500 | 5000 | Existing FORMANT_RANGES in PianoHarmonics |
| F5 | 3500 | 6000 | Estimate for singer's formant cluster upper bound |

### Auto-Strategy Heuristic [ASSUMED]

A reasonable mapping for the auto-strategy mode:

```typescript
function pickStrategy(f0: number, voiceType: string): StrategyId {
  const isSoprano = voiceType === 'soprano' || voiceType === 'mezzo';
  const isHighVoice = isSoprano || voiceType === 'alto' || voiceType === 'child';
  
  if (isSoprano && f0 >= 300) return 'r1-f0';       // Soprano R1 tracking
  if (isHighVoice && f0 >= 250) return 'r1-2f0';    // Alto/mezzo belt
  if (f0 >= 150) return 'r1-2f0';                    // Mid-range default
  return 'r1-3f0';                                    // Low-range default
}
```

This is deliberately simple and can be refined later. The auto-strategy should feel like a "smart default" that picks something reasonable, not a definitive answer.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hz-to-pixel mapping | Custom scale functions | Existing `freqToX` (piano) and `f1Scale`/`f2Scale` (vowel chart) | Already calibrated and tested |
| Smooth audio transitions | Manual ramp code | `setTargetAtTime` with time constant 0.05-0.1 | Browser-optimized, sample-accurate |
| SVG overlay coordinate space | New coordinate system | Existing SVG viewBox + margin system in each component | Consistency with existing overlays |
| Formant response visualization | New rendering code | Existing `FormantCurves.svelte` pattern | Just add F5 to the formants array |

## Common Pitfalls

### Pitfall 1: Circular Reactive Updates in Locked Mode
**What goes wrong:** Strategy effect writes to voiceParams.f1Freq, which triggers the snapshot getter, which triggers syncParams, which is fine -- but it also triggers the strategy effect AGAIN because f1Freq changed.
**Why it happens:** Svelte 5 $effect tracks all read dependencies. If the effect reads f0 AND writes f1Freq, and another effect reads all of voiceParams, you get a cascade.
**How to avoid:** The strategy effect should ONLY read f0, strategyId, strategyMode, and voicePreset. It should NOT read the formant frequencies it writes to. Use a guard: only write if the computed target differs from the current value by more than 0.1 Hz.
**Warning signs:** Audio glitches, frozen UI, or console warnings about "effect cycles."

### Pitfall 2: Drag Override Race Condition
**What goes wrong:** User drags a formant, releases, but the strategy effect hasn't fired yet to snap back. Or the strategy effect fires mid-drag.
**Why it happens:** Svelte effects are batched microtasks; pointer events are synchronous.
**How to avoid:** The `strategyOverriding` flag is synchronously set on pointerdown and cleared on pointerup. The effect checks this flag. Since the flag is $state, the effect will re-run when it changes -- which is exactly what we want (snap back happens naturally when flag clears).
**Warning signs:** Formant "jumps" during or after drag.

### Pitfall 3: F5 Not in Snapshot Getter
**What goes wrong:** Adding F5 fields to VoiceParams but forgetting to add them to the `snapshot` getter and `formants` array. Audio never receives F5 updates.
**Why it happens:** The snapshot is manually maintained.
**How to avoid:** Add f5Freq, f5BW, f5Gain to snapshot. Add F5 to the formants getter. Update AudioBridge to create 5 filters instead of 4.
**Warning signs:** Singer's formant cluster has no audible effect.

### Pitfall 4: Singer's Formant Cluster Overwrites User-Set F3/F4
**What goes wrong:** When singer's formant cluster is locked, it overwrites F3 and F4 to cluster values, losing the user's manually-set vowel formants.
**Why it happens:** The cluster strategy needs to move F3/F4/F5 together.
**How to avoid:** This is expected behavior in locked mode -- the cluster IS supposed to move F3/F4/F5. The temporary drag override (D-14) handles the case where the user wants to explore. In overlay mode, F3/F4 are not modified.
**Warning signs:** None -- this is correct behavior, but document it clearly in the UI.

### Pitfall 5: Overlay Performance on Piano View
**What goes wrong:** Drawing target lines on the piano SVG causes layout thrash if they trigger reflow.
**Why it happens:** SVG elements inside a horizontally-scrollable container can cause measurement cascades.
**How to avoid:** Use `pointer-events: none` on all overlay elements. Use `$derived` for target line positions so they only recompute when f0 changes.
**Warning signs:** Janky scrolling or dropped frames when f0 changes.

## Code Examples

### Strategy Engine Core
```typescript
// src/lib/strategies/types.ts
export type StrategyId = 'speech' | 'r1-f0' | 'r1-2f0' | 'r1-3f0' | 'r2-2f0' | 'r2-3f0' | 'singer-formant';
export type StrategyMode = 'off' | 'overlay' | 'locked';

export interface StrategyDefinition {
  id: StrategyId;
  notation: string;       // "R1:f0"
  description: string;    // "First formant tracks pitch"
  /** Which formants this strategy controls */
  controls: ('f1' | 'f2' | 'f3' | 'f4' | 'f5')[];
  /** Applicable f0 range in Hz */
  f0Range: { min: number; max: number };
  /** Voice types this strategy is most relevant for */
  voiceTypes: string[];
}

export interface StrategyResult {
  targets: {
    f1: number | null;
    f2: number | null;
    f3: number | null;
    f4: number | null;
    f5: number | null;
  };
  inRange: boolean;
  clamped: boolean;
}
```

### R1:2f0 Implementation Example
```typescript
// Inside engine.ts
function computeR1_2f0(f0: number): StrategyResult {
  const target = 2 * f0;
  const F1_MIN = 200;
  const F1_MAX = 1000;
  const inRange = target >= F1_MIN && target <= F1_MAX;
  const clamped = !inRange;
  const f1 = Math.max(F1_MIN, Math.min(F1_MAX, target));
  
  return {
    targets: { f1, f2: null, f3: null, f4: null, f5: null },
    inRange,
    clamped,
  };
}
```

### Singer's Formant Cluster Implementation
```typescript
// Inside engine.ts
function computeSingerFormant(f0: number, voiceType: string): StrategyResult {
  // Center frequency varies by voice type
  const centers: Record<string, number> = {
    bass: 2384, baritone: 2454, tenor: 2705,
    alto: 2800, mezzo: 2900, soprano: 3092, child: 3200,
  };
  const center = centers[voiceType] ?? 2600;
  
  // Cluster F3, F4, F5 around the center
  // Typical clustering: F3 slightly below, F4 at center, F5 slightly above
  const f3 = center - 200;
  const f4 = center;
  const f5 = center + 300;
  
  return {
    targets: { f1: null, f2: null, f3, f4, f5 },
    inRange: f0 < 660, // Not effective above E5
    clamped: f0 >= 660,
  };
}
```

### Overlay on VowelChart (SVG elements)
```typescript
// Inside VowelChart.svelte or StrategyOverlayVowel.svelte
// Reads strategy targets without writing to voiceParams

let strategyTargets = $derived.by(() => {
  if (voiceParams.strategyMode === 'off') return null;
  return computeTargets(voiceParams.strategyId, voiceParams.f0, voiceParams.voicePreset ?? 'baritone');
});

let targetX = $derived(strategyTargets?.targets.f2 ? f2Scale(strategyTargets.targets.f2) : null);
let targetY = $derived(strategyTargets?.targets.f1 ? f1Scale(strategyTargets.targets.f1) : null);
```

```svelte
<!-- Target marker (open circle) -->
{#if targetX !== null && targetY !== null && voiceParams.strategyMode !== 'off'}
  <circle
    cx={targetX} cy={targetY} r="8"
    fill="none" stroke="#f59e0b" stroke-width="2"
    opacity={strategyTargets?.clamped ? 0.4 : 0.8}
    pointer-events="none"
  />
  <!-- Connecting line from current to target -->
  <line
    x1={handleX} y1={handleY}
    x2={targetX} y2={targetY}
    stroke="#f59e0b" stroke-width="1.5"
    stroke-dasharray={voiceParams.strategyOverriding ? '4 4' : 'none'}
    opacity="0.6"
    pointer-events="none"
  />
{/if}
```

### AudioBridge F5 Extension
```typescript
// In buildFormantChain(), change loop from 4 to 5
// In syncParams(), add F5 to the formantData array
const formantData = [
  { freq: voiceParams.f1Freq, bw: voiceParams.f1BW, gain: voiceParams.f1Gain },
  { freq: voiceParams.f2Freq, bw: voiceParams.f2BW, gain: voiceParams.f2Gain },
  { freq: voiceParams.f3Freq, bw: voiceParams.f3BW, gain: voiceParams.f3Gain },
  { freq: voiceParams.f4Freq, bw: voiceParams.f4BW, gain: voiceParams.f4Gain },
  { freq: voiceParams.f5Freq, bw: voiceParams.f5BW, gain: voiceParams.f5Gain },  // NEW
];
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static formant charts only | Interactive linked formant-harmonic visualization | This project | Core innovation of Formant Canvas |
| Manual formant tuning by ear | Rule-based auto-tuning with overlay guidance | This phase | Pedagogical: shows students what trained singers do |
| Madde (native-only, closed source) | Web-based open-source equivalent | This project | Accessibility: runs in any browser |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | F5 default frequencies (4100-5200 Hz by voice type) | F5 Default Values | Low -- values are Claude's discretion per CONTEXT.md and easily tuned |
| A2 | Strategy applicable f0 ranges (specific Hz boundaries) | Strategy Definitions | Medium -- ranges are approximate from literature; exact boundaries need pedagogical judgment |
| A3 | Auto-strategy heuristic mapping | Auto-Strategy Heuristic | Low -- deliberately simple, meant as smart default; user can override |
| A4 | Singer's formant cluster F3/F4/F5 offsets (-200, 0, +300 Hz from center) | Singer's Formant Cluster Implementation | Medium -- clustering shape affects sound quality; may need tuning by ear |
| A5 | F5 formant range boundary 3500-6000 Hz | Strategy Range Boundaries | Low -- conservative range, unlikely to need adjustment |

## Open Questions

1. **Preset matrix: which R1/R2 combinations to show?**
   - What we know: D-05 specifies a combined preset matrix showing known-good R1/R2 combinations
   - What's unclear: Exactly which combinations (e.g., R1:2f0 alone, R1:f0+R2:2f0, etc.) and how many cells
   - Recommendation: Start with 7-8 presets covering the STRAT-01 list plus 2-3 common pairings (R1:f0+R2:2f0, R1:2f0+singer's formant). Iterate based on pedagogical feedback.

2. **Singer's formant cluster: how to handle gain boost?**
   - What we know: The cluster creates a spectral peak by narrowing F3-F5 spacing and potentially boosting their gains
   - What's unclear: Should locked mode also adjust F3/F4/F5 gains, or only frequencies?
   - Recommendation: Adjust both frequency and gain. Set gains to ~0.25/0.25/0.15 when cluster is active (higher than default F3/F4/F5 gains) to create the audible peak.

3. **Effect ordering: strategy effect vs syncParams effect**
   - What we know: Both run as $effect in App.svelte. Strategy writes to voiceParams, syncParams reads from voiceParams.
   - What's unclear: Whether Svelte 5 guarantees the order effects fire
   - Recommendation: Svelte 5 effects fire in declaration order and dependencies are tracked. Place the strategy effect BEFORE the syncParams effect in App.svelte to ensure targets are written before audio sync.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STRAT-01 | Strategy engine computes correct targets for all 7 strategies | unit | `npx vitest run src/lib/strategies/engine.test.ts -t "computes"` | Wave 0 |
| STRAT-01 | Singer's formant cluster adjusts F3+F4+F5 | unit | `npx vitest run src/lib/strategies/engine.test.ts -t "singer"` | Wave 0 |
| STRAT-02 | Overlay targets computed correctly (visual-only, no state mutation) | unit | `npx vitest run src/lib/strategies/engine.test.ts -t "overlay"` | Wave 0 |
| STRAT-03 | Locked mode: targets update when f0 changes | unit | `npx vitest run src/lib/strategies/engine.test.ts -t "locked"` | Wave 0 |
| STRAT-03 | Range clamping at boundaries | unit | `npx vitest run src/lib/strategies/engine.test.ts -t "clamp"` | Wave 0 |
| STRAT-04 | Drag override flag prevents strategy writes | unit | `npx vitest run src/lib/strategies/engine.test.ts -t "override"` | Wave 0 |
| STRAT-05 | Strategy definitions have notation + description | unit | `npx vitest run src/lib/strategies/definitions.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/strategies/engine.test.ts` -- covers STRAT-01, STRAT-02, STRAT-03, STRAT-04
- [ ] `src/lib/strategies/definitions.test.ts` -- covers STRAT-05
- [ ] `src/lib/strategies/auto-strategy.test.ts` -- covers auto-strategy heuristic

## Security Domain

Not applicable for this phase. All computation is client-side pure math with no user input beyond slider values already bounded by existing formant ranges. No network requests, no authentication, no data persistence.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/lib/audio/state.svelte.ts`, `src/lib/audio/bridge.ts`, `src/lib/components/PianoHarmonics.svelte`, `src/lib/components/VowelChart.svelte`, `src/lib/components/FormantCurves.svelte` -- verified current code patterns
- CONTEXT.md decisions D-01 through D-15 -- locked user decisions

### Secondary (MEDIUM confidence)
- [voicescience.org/lexicon/formant-tuning/](https://www.voicescience.org/lexicon/formant-tuning/) -- R1:f0, R1:2f0, R1:3f0 strategy definitions and applicable voice types
- [voicescience.org/lexicon/singers-formant/](https://www.voicescience.org/lexicon/singers-formant/) -- Singer's formant cluster center frequencies by voice type (2384-3092 Hz)
- Joliveau, Smith, and Wolfe (2004) -- soprano R1:f0 tracking up to ~1 kHz, cited in voicescience.org
- Henrich et al. (2011) -- tenor/baritone multiple harmonic tuning strategies, cited in voicescience.org

### Tertiary (LOW confidence)
- F5 default frequency estimates -- based on general vocal acoustics knowledge, not verified against specific measurements
- Auto-strategy heuristic boundaries -- simplified model, needs pedagogical validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, extending existing patterns
- Architecture: HIGH -- pure-function strategy engine is well-defined; integration points verified in codebase
- Domain knowledge (strategy rules): MEDIUM -- based on published vocal science but exact boundaries are approximate
- Pitfalls: HIGH -- identified from direct codebase analysis of reactive patterns

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable domain; codebase may evolve)
