---
phase: 05-pedagogy-ui-polish
reviewed: 2026-04-12T10:30:00Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - src/app.css
  - src/App.svelte
  - src/lib/audio/state.svelte.ts
  - src/lib/charts/R1StrategyChart.svelte
  - src/lib/charts/R2StrategyChart.svelte
  - src/lib/charts/strategy-chart-math.ts
  - src/lib/components/ChipGroup.svelte
  - src/lib/components/ExpressionControls.svelte
  - src/lib/components/FormantCurves.svelte
  - src/lib/components/HarmonicBars.svelte
  - src/lib/components/PhonationMode.svelte
  - src/lib/components/PianoHarmonics.svelte
  - src/lib/components/PianoKeyboard.svelte
  - src/lib/components/PitchSection.svelte
  - src/lib/components/RegionHelp.svelte
  - src/lib/components/StrategyPanel.svelte
  - src/lib/components/Tooltip.svelte
  - src/lib/components/TransportBar.svelte
  - src/lib/components/VibratoVisual.svelte
  - src/lib/components/VoicePresets.svelte
  - src/lib/components/VowelChart.svelte
  - src/lib/data/tooltips.ts
  - src/lib/strategies/definitions.ts
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-04-12T10:30:00Z
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

The codebase is well-structured for a Svelte 5 audio synthesis app. Reactive state is cleanly centralized in `VoiceParams`, and components are reasonably decomposed. The main concerns are: a leaked event listener in `RegionHelp.svelte`, a type-safety issue in `HarmonicBars.svelte` using `as any` to mutate computed objects, unused imports in both strategy chart components, and a duplicated CSS rule block in `app.css`. No security issues were found -- the app is a client-side-only audio tool with no user input flowing to dangerous sinks.

## Warnings

### WR-01: Resize listener never removed in RegionHelp.svelte

**File:** `src/lib/components/RegionHelp.svelte:78`
**Issue:** The `window.addEventListener('resize', ...)` call uses an inline arrow function, so the cleanup function returned by `$effect` cannot remove it. Each time the popover is opened and closed, a new resize listener accumulates on `window`. Over many open/close cycles this leaks listeners.
**Fix:**
```svelte
$effect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) { ... }
    function handleOtherOpen(e: Event) { ... }
    function handleResize() { open = false; }

    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
    document.addEventListener('tooltipopen', handleOtherOpen);
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('tooltipopen', handleOtherOpen);
      window.removeEventListener('resize', handleResize);
    };
  });
```

### WR-02: Type safety bypass with `as any` in HarmonicBars.svelte

**File:** `src/lib/components/HarmonicBars.svelte:57-58`
**Issue:** The code uses `(bar as any).showLabel = true` to mutate objects returned by `.map()`, then casts the entire array with `as (typeof bars[number] & { showLabel: boolean })[]`. This bypasses TypeScript's type system. If the shape of `bars` changes, the cast will silently hide the mismatch.
**Fix:** Include `showLabel` in the mapped object type from the start:
```typescript
const bars = harmonics.map(h => {
  const x = freqToX(h.freq);
  const barHeight = (h.amplitude / maxAmplitude) * barRegionHeight;
  const y = regionBottom - barHeight;
  return {
    n: h.n,
    x: x - 2,
    centerX: x,
    y,
    height: barHeight,
    fill: h.n === 1 ? '#2563eb' : '#333333',
    opacity: h.n === 1 ? 1.0 : 0.8,
    showLabel: false, // default, set below
  };
});

// Determine which harmonics get labels
const MIN_LABEL_GAP = 20;
let lastLabelX = -Infinity;
for (const bar of bars) {
  if (bar.centerX - lastLabelX >= MIN_LABEL_GAP) {
    bar.showLabel = true;
    lastLabelX = bar.centerX;
  }
}

return bars;
```

### WR-03: VoicePresets does not load F5 frequency or bandwidth

**File:** `src/lib/components/VoicePresets.svelte:17-21`
**Issue:** The `loadPreset` function sets `f1`-`f4` frequencies and bandwidths but skips `f5Freq` and `f5BW`. The `VoiceParams` state includes `f5Freq` and `f5BW`, and the formant response curves and harmonic bars render all five formants. When switching presets, F5 will retain its value from the previous preset (or the initial default), producing an inconsistent voice model.
**Fix:** Add F5 to the preset load, assuming the preset data has `f5` and `f5BW` fields (or compute a reasonable default):
```typescript
function loadPreset(key: string) {
    const preset = VOICE_PRESETS[key];
    if (!preset) return;
    voiceParams.f1Freq = preset.f1; voiceParams.f1BW = preset.f1BW;
    voiceParams.f2Freq = preset.f2; voiceParams.f2BW = preset.f2BW;
    voiceParams.f3Freq = preset.f3; voiceParams.f3BW = preset.f3BW;
    voiceParams.f4Freq = preset.f4; voiceParams.f4BW = preset.f4BW;
    if (preset.f5 != null) {
      voiceParams.f5Freq = preset.f5;
      voiceParams.f5BW = preset.f5BW;
    }
    voiceParams.voicePreset = key;
  }
```

### WR-04: VowelChart snapToVowel computes F4/F5 with magic multipliers instead of data

**File:** `src/lib/components/VowelChart.svelte:115-117`
**Issue:** `snapToVowel` sets `f4Freq = Math.round(data.f3 * 1.25)` and `f5Freq = Math.round(data.f3 * 1.6)`. These magic multipliers are rough approximations and not derived from the Hillenbrand dataset. In contrast, `updateFromPointer` (line 81-83) uses `interpolateHigherFormants` which presumably does a data-driven interpolation. The two code paths produce inconsistent F4/F5 values for the same vowel position.
**Fix:** Use the same `interpolateHigherFormants` function in `snapToVowel`:
```typescript
function snapToVowel(vowel: HillenbrandVowel) {
    const data = vowel[currentGroup];
    voiceParams.f1Freq = data.f1;
    voiceParams.f2Freq = data.f2;
    voiceParams.f3Freq = data.f3;
    const higher = interpolateHigherFormants(data.f1, data.f2, currentGroup);
    voiceParams.f4Freq = higher.f4;
    voiceParams.f5Freq = higher.f5 ?? Math.round(data.f3 * 1.6);
  }
```

## Info

### IN-01: Unused import R1_STRATEGIES in R1StrategyChart.svelte

**File:** `src/lib/charts/R1StrategyChart.svelte:8`
**Issue:** `R1_STRATEGIES` is imported but never referenced in the component.
**Fix:** Remove the import: `import { R1_STRATEGIES } from '../strategies/definitions.ts';`

### IN-02: Unused import R2_STRATEGIES in R2StrategyChart.svelte

**File:** `src/lib/charts/R2StrategyChart.svelte:8`
**Issue:** `R2_STRATEGIES` is imported but never referenced in the component.
**Fix:** Remove the import: `import { R2_STRATEGIES } from '../strategies/definitions.ts';`

### IN-03: Duplicated html/body reset in app.css

**File:** `src/app.css:36-41` and `src/app.css:47-50`
**Issue:** `html, body { margin: 0; padding: 0; }` is declared twice -- once inside `:global()` (lines 36-42) with additional properties, and again as a bare rule (lines 47-50). The first block also sets `height` and `overflow`, while the second only sets `margin` and `padding`. This is redundant and confusing about which rule takes precedence.
**Fix:** Remove lines 47-50 (the bare `html, body` rule) since the `:global(html, body)` block already covers it.

### IN-04: Tooltip.svelte has dark-theme fallback colors inconsistent with light theme

**File:** `src/lib/components/Tooltip.svelte:96-128`
**Issue:** The CSS fallback values use dark-theme colors (e.g., `#2a2a4a`, `#4a4a6a`, `#8a8aaa`, `#e0e0e0`, `#3a3a5a`) while the app uses a white/light theme (`:root` defines `--color-bg: #ffffff`). These fallbacks would appear jarring if any CSS variable failed to resolve. In contrast, `RegionHelp.svelte` uses light-theme fallbacks (`#f5f5f5`, `#cccccc`, etc.) that match the actual theme.
**Fix:** Update fallback values to match the light theme, consistent with `RegionHelp.svelte`:
```css
.tooltip-trigger {
    background: var(--color-surface, #f5f5f5);
    border: 1px solid var(--color-border, #cccccc);
    color: var(--color-text-secondary, #555555);
    /* ... */
}
```

### IN-05: Unused `containerEl` binding in R1StrategyChart and R2StrategyChart

**File:** `src/lib/charts/R1StrategyChart.svelte:27` and `src/lib/charts/R2StrategyChart.svelte:27`
**Issue:** `containerEl` is declared as `$state()` and bound via `bind:this`, but is never read or used in any logic. Only `width` and `height` (via `bind:clientWidth`/`bind:clientHeight`) are actually needed.
**Fix:** Remove the `containerEl` state variable and `bind:this` from both components.

---

_Reviewed: 2026-04-12T10:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
