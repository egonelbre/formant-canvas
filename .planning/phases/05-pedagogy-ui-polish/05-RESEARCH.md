# Phase 5: Pedagogy UI & Polish - Research

**Researched:** 2026-04-12
**Domain:** CSS grid layout, progressive disclosure UI, SVG data visualization, Svelte 5 component architecture
**Confidence:** HIGH

## Summary

Phase 5 transforms the existing single-column stacked layout into a full-screen CSS grid application with a piano keyboard spanning the bottom, R1/R2 Sundberg-style strategy charts and vowel chart stacked on the right, and controls on the left. The phase also adds progressive disclosure (expert mode toggle), pedagogical tooltips with `?` icon triggers, two new R1/R2 strategy chart SVG components, touch target enforcement, and responsive behavior down to 1024x700.

The codebase already has all the building blocks: VoiceParams reactive store, pointer-event drag patterns on PianoHarmonics and VowelChart, ChipGroup/LabeledSlider reusable components, d3-scale for Hz/pitch mapping, strategy engine with definitions and computeTargets. The work is primarily layout restructuring (App.svelte from stacked to grid), two new SVG components (R1StrategyChart, R2StrategyChart), a Tooltip component, expert mode state, and CSS polish.

**Primary recommendation:** Build the full-screen CSS grid layout first (it touches every component's placement), then add the new R1/R2 strategy charts, then layer progressive disclosure/tooltips, and finish with touch/responsive polish.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Full-screen, no-scroll layout filling the viewport
- D-02: Piano keyboard spans full width at bottom
- D-03: Three panels stacked vertically on right sharing vertical frequency axis: C (vowel chart, top), B (R2 strategy, middle), A (R1 strategy, bottom)
- D-04: Formant harmonics graphic above keyboard on left side
- D-05: Voice type selection as chip row along top border
- D-06: Vibrato controls below voice selection with waveform visual
- D-07: Phonation and Strategy panels as separate panels on left
- D-08: Main interaction surfaces (keyboard, panels A/B/C) largest and easiest to reach
- D-09: Sundberg-style R1/R2 charts: resonance Hz on Y vs pitch (notes) on X, diagonal harmonic lines
- D-10: Shaded regions show R1/R2 frequency ranges for selected voice type
- D-11: Voice range indicated on X-axis
- D-12: Current f0 as vertical cursor line on both charts
- D-13: Independent pitch axes on A/B -- not necessarily aligned with keyboard range
- D-14: Single "Expert mode" toggle in transport bar / header area, OFF by default
- D-15: Default view: 7 primary controls (Play/Stop, Volume, Pitch slider, Voice preset, Phonation preset, Vowel chart drag, Strategy selector)
- D-16: Expert mode reveals advanced params inline (OQ/tilt/aspiration in Phonation section, F1-F4 bandwidth near vowel chart)
- D-17: Expert mode shows numeric Hz/dB readouts
- D-18: Rich tooltips with plain-language + pedagogical examples
- D-19: Tooltips via `?` icon button (tap/click to show), hover as convenience on desktop
- D-20: No jargon in default tooltips; technical terms only in expert mode tooltips
- D-21: 44px minimum touch target
- D-22: All draggable elements use Pointer Events with `touch-action: none`
- D-23: Piano multi-touch with last-note priority

### Claude's Discretion
- CSS grid/flexbox implementation details
- Strategy chart visual style (line weights, colors, shading opacity)
- R1/R2 chart f0 cursor update method (live vs debounced)
- Tooltip component implementation (custom vs library)
- Tooltip positioning logic
- Vibrato waveform visual implementation
- Expert toggle placement and styling
- Formant bandwidth slider range and defaults
- Numeric readout formatting
- Dark theme refinements for new components
- Responsive breakpoint behavior

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UI-01 | Default view shows at most 7 primary controls; advanced behind disclosure | Expert mode boolean state + conditional rendering of advanced sliders |
| UI-02 | Every primary control has hover/focus tooltip in plain language | Custom Tooltip component with `?` icon trigger per D-19 |
| UI-03 | Expert mode exposes Rd/OQ/spectral tilt/individual formant bandwidths | LabeledSlider instances conditionally rendered when expertMode is true |
| UI-04 | Clean modern aesthetic, readable typography, dark theme | CSS design tokens already in app.css; extend with layout grid tokens |
| UI-05 | Layout responsive to 1024x700 desktop window | CSS grid with fr units + minmax constraints |
| UI-06 | All draggable elements use Pointer Events with `touch-action: none` | Already implemented on PianoHarmonics, VowelChart, PianoKeyboard; audit and enforce on new components |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Svelte | 5.55.x | UI framework | Already in use, runes for reactive state [VERIFIED: package.json] |
| TypeScript | 6.0.x | Type safety | Already in use [VERIFIED: package.json] |
| Vite | 8.0.x | Build tool | Already in use [VERIFIED: package.json] |
| d3-scale | 4.0.2 | Log/linear scales for Hz/pitch mapping | Already a dependency, needed for new R1/R2 charts [VERIFIED: package.json] |

### Supporting (no new dependencies needed)
| Library | Purpose | Notes |
|---------|---------|-------|
| `svelte/motion` (tweened) | Smooth transitions for cursor positions | Already used in VowelChart and StrategyOverlayPiano [VERIFIED: codebase] |

### No New Dependencies
This phase requires zero new npm packages. All work uses:
- Native CSS Grid/Flexbox for layout
- Existing d3-scale for chart scales
- Existing Svelte 5 patterns ($state, $derived, $effect)
- Custom Tooltip component (no library -- it is a simple popover)
- Pointer Events API (browser native)

**Rationale:** The CLAUDE.md explicitly warns against charting libraries (Chart.js, LayerCake, etc.) and recommends custom SVG with d3-scale for bespoke scientific UI. Tooltip libraries add bundle weight for a component that is ~50 lines of Svelte. [VERIFIED: CLAUDE.md]

## Architecture Patterns

### Recommended Layout Structure

```
App.svelte CSS Grid:
+----------------------------------------------------+
| [Voice chips]              [Expert toggle] [Transport] |  <- header row
+------------+-----------------------------------+----+
| Vibrato    |                                   | C  |  <- main area
| Phonation  |   Formant Harmonics               | B  |
| Strategy   |   (PianoHarmonics)                | A  |
|            |                                   |    |
+------------+-----------------------------------+----+
| [Piano Keyboard - full width]                       |  <- footer row
+----------------------------------------------------+
```

CSS Grid definition (approximate):
```css
.app-grid {
  display: grid;
  grid-template-rows: auto 1fr auto;
  grid-template-columns: 220px 1fr 280px;
  grid-template-areas:
    "header header header"
    "controls harmonics charts"
    "piano  piano   piano";
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}
```
[ASSUMED -- exact values tuned during implementation]

### Pattern 1: Expert Mode State

**What:** A simple boolean `expertMode` in app-level state, NOT in VoiceParams (it is UI state, not audio state).
**When to use:** Controls conditional rendering of advanced sliders and numeric readouts.

```typescript
// In App.svelte or a separate ui-state.svelte.ts
let expertMode = $state(false);
```

Components receive it as a prop:
```svelte
<PhonationMode {expertMode} />
<VowelChart {expertMode} />
```

**Why not in VoiceParams:** VoiceParams is the audio parameter store synced to the AudioBridge. Expert mode is purely a UI concern -- adding it to VoiceParams would trigger unnecessary audio syncs via the snapshot getter. [VERIFIED: state.svelte.ts snapshot getter triggers bridge.syncParams]

### Pattern 2: Tooltip Component

**What:** A reusable `Tooltip.svelte` component with a `?` icon button that shows a popover on click/tap, and optionally on hover for desktop.
**Implementation approach:**

```svelte
<!-- Tooltip.svelte -->
<script lang="ts">
  interface Props { text: string; expert?: string; expertMode?: boolean; }
  let { text, expert, expertMode = false }: Props = $props();
  let open = $state(false);
</script>

<span class="tooltip-wrapper">
  <button class="tooltip-trigger" onclick={() => open = !open}
    onmouseenter={() => open = true} onmouseleave={() => open = false}>
    ?
  </button>
  {#if open}
    <div class="tooltip-popover">{text}
      {#if expertMode && expert}<br/><span class="expert-text">{expert}</span>{/if}
    </div>
  {/if}
</span>
```

Key details:
- Click toggles for touch (D-19)
- mouseenter/mouseleave as convenience for desktop (D-19)
- Two text levels: default (plain language) and expert (technical, shown only in expert mode) (D-20)
- Positioned with CSS `position: absolute` relative to the wrapper
- 44px minimum touch target on the `?` button (D-21)

### Pattern 3: R1/R2 Strategy Charts (Sundberg-style)

**What:** Two new SVG components showing resonance frequency (Hz, Y-axis) vs pitch (musical notes, X-axis) with diagonal lines for harmonic relationships.

Data sources already available:
- `strategies/definitions.ts` -- R1_STRATEGIES has f0Range and notation for each strategy [VERIFIED: codebase]
- `voice-presets.ts` -- formant ranges per voice type for shaded regions [VERIFIED: codebase]
- `voiceParams.f0` -- for the vertical cursor line [VERIFIED: codebase]
- `d3-scale` -- scaleLog/scaleLinear for axes [VERIFIED: installed]

Chart structure:
```
Y-axis: Resonance frequency (Hz) -- linear or log scale
X-axis: Pitch in musical notes (e.g., C3 to C6) -- log scale (Hz underneath)
Diagonal lines: y = n * x (where n is the harmonic number)
Shaded region: voice-type formant range band (e.g., F1 range for soprano)
Vertical cursor: current f0 position
```

The diagonal lines are trivial: for R1:f0, plot y=x; for R1:2f0, plot y=2x; etc. These are straight lines in linear scale, curves in log scale. Use linear scales for both axes to match Sundberg reference style. [ASSUMED -- Sundberg originals use linear axes]

### Pattern 4: Full-Width Piano Keyboard

The existing `PianoHarmonics.svelte` already renders C2-B8 (MIDI 36-107) with harmonic bars above the keyboard. In the new layout:
- PianoHarmonics becomes the bottom row spanning all columns
- The keyboard portion stretches full width via `width: 100%` on the SVG (already set) [VERIFIED: codebase]
- The harmonic bars region sits above the keys within the same SVG

Multi-touch with last-note priority (D-23): The existing pointer capture pattern handles single-pointer drag. For multi-touch, need to track multiple pointer IDs and use the last-received pointerId to set f0 while giving visual feedback on all. This requires changing from single `dragging` boolean to a `Set<number>` of active pointer IDs. [ASSUMED -- implementation detail]

### Anti-Patterns to Avoid
- **Nested scroll containers:** The layout must be `100vh` with `overflow: hidden` on the root. No section should scroll independently unless absolutely necessary for small viewports.
- **Absolute positioning for layout:** Use CSS Grid for the main structure. Absolute positioning only for tooltips and overlays within their containers.
- **Putting UI state in VoiceParams:** Expert mode, tooltip visibility, panel collapse state are UI-only concerns.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hz/pitch/semitone mapping | Custom math | `d3-scale` (scaleLog, scaleLinear) | Already used, handles domain clamping, tick generation [VERIFIED: codebase] |
| Pointer event capture/release | Raw addEventListener | Existing pointer capture pattern from PianoHarmonics/VowelChart | Already debugged, handles cancel, works cross-browser [VERIFIED: codebase] |
| Formant range data | Hardcoded constants | `voice-presets.ts` + `strategies/definitions.ts` | Already contains all voice-type ranges and strategy f0 ranges [VERIFIED: codebase] |
| Smooth visual transitions | Manual requestAnimationFrame | `svelte/motion` tweened stores | Already used for handle/overlay positions [VERIFIED: codebase] |

## Common Pitfalls

### Pitfall 1: CSS Grid Height Collapse on Safari
**What goes wrong:** `height: 100vh` on the grid container doesn't account for Safari's URL bar, causing content to be pushed below the fold.
**Why it happens:** Safari mobile (and sometimes desktop) includes the URL bar in the viewport height calculation.
**How to avoid:** Use `height: 100dvh` (dynamic viewport height) with fallback `height: 100vh` for older browsers. Since this is desktop-first (D-01), this is minor but worth handling.
**Warning signs:** Content cut off at bottom on Safari. [ASSUMED -- known CSS pattern]

### Pitfall 2: Tooltip Positioning at Viewport Edges
**What goes wrong:** Tooltips overflow the viewport when triggered near screen edges.
**Why it happens:** Fixed-offset positioning doesn't account for proximity to viewport boundaries.
**How to avoid:** Calculate available space and flip tooltip direction. For Phase 5, a simple approach: prefer positioning above the trigger; if insufficient space, position below. Left/right edge clamping via `max(0, min(x, viewport-width - tooltip-width))`.
**Warning signs:** Tooltips appear partially off-screen. [ASSUMED]

### Pitfall 3: Expert Mode Toggle Causes Layout Shift
**What goes wrong:** Showing/hiding expert sliders causes the grid to resize, shifting interactive surfaces the user is manipulating.
**Why it happens:** New elements are inserted into the flow, changing heights.
**How to avoid:** Expert controls should expand within their existing panel area (scrollable overflow if needed) rather than changing the grid row heights. Alternatively, use CSS transitions on max-height for smooth reveal.
**Warning signs:** Piano keyboard jumps when toggling expert mode. [ASSUMED]

### Pitfall 4: Multi-Touch Pointer Capture Conflicts
**What goes wrong:** Setting pointer capture on one element while another pointer is already captured causes the first capture to be lost.
**Why it happens:** Each pointer ID can only be captured by one element at a time.
**How to avoid:** For the piano multi-touch (D-23), capture all pointers on the same SVG element. Track active pointer IDs in a Map<number, midi>. The last entry determines f0.
**Warning signs:** Second finger touch kills the first finger's drag interaction. [ASSUMED]

### Pitfall 5: SVG viewBox Responsiveness vs Fixed Dimensions
**What goes wrong:** R1/R2 strategy charts look distorted or have wrong aspect ratio at different grid cell sizes.
**Why it happens:** SVG viewBox with `preserveAspectRatio="xMidYMid meet"` maintains ratio but may not fill the available space.
**How to avoid:** Use `preserveAspectRatio="none"` if the chart should stretch to fill its container, or compute viewBox dimensions dynamically based on the container's actual size. For strategy charts, stretching is probably fine since both axes are independent scales. [ASSUMED]

## Code Examples

### CSS Grid Layout (App.svelte restructure)
```css
/* Source: custom for this project */
:global(html, body) {
  margin: 0;
  padding: 0;
  height: 100dvh;
  height: 100vh; /* fallback */
  overflow: hidden;
}

.app-grid {
  display: grid;
  height: 100dvh;
  height: 100vh;
  grid-template-rows: auto 1fr auto;
  grid-template-columns: minmax(200px, 240px) 1fr minmax(240px, 300px);
  grid-template-areas:
    "header  header    header"
    "sidebar harmonics charts"
    "piano   piano     piano";
  gap: 0;
  overflow: hidden;
}

.header  { grid-area: header; }
.sidebar { grid-area: sidebar; overflow-y: auto; }
.harmonics { grid-area: harmonics; }
.charts  { grid-area: charts; display: flex; flex-direction: column; }
.piano   { grid-area: piano; }
```
[ASSUMED -- exact dimensions tuned during implementation]

### R1 Strategy Chart Component Sketch
```svelte
<!-- Source: derived from strategies/definitions.ts + Sundberg reference -->
<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { voiceParams } from '../audio/state.svelte.ts';
  import { R1_STRATEGIES, R1_LIST } from '../strategies/definitions.ts';
  import { VOICE_PRESETS } from '../data/voice-presets.ts';

  // X-axis: pitch in Hz (rendered as note names)
  // Y-axis: resonance frequency in Hz
  const xScale = scaleLinear().domain([65, 1047]).range([0, PLOT_WIDTH]);  // C2 to C6
  const yScale = scaleLinear().domain([200, 1200]).range([PLOT_HEIGHT, 0]); // F1 range

  // Diagonal lines: for R1:nf0, y = n * x
  // Draw as two points: (xMin, n*xMin) to (xMax, n*xMax), clipped to Y domain
  function diagonalLine(harmonic: number) {
    const x1 = 65, x2 = 1047;
    return {
      x1: xScale(x1), y1: yScale(harmonic * x1),
      x2: xScale(x2), y2: yScale(harmonic * x2),
    };
  }

  // Current f0 cursor
  let cursorX = $derived(xScale(voiceParams.f0));
</script>
```
[ASSUMED -- implementation detail, derived from existing patterns]

### Expert Mode Conditional Rendering
```svelte
<!-- Inside PhonationMode.svelte -->
{#if expertMode}
  <div class="expert-params">
    <LabeledSlider label="Open Quotient" min={0.2} max={0.9} step={0.01}
      value={voiceParams.openQuotient} unit="" decimals={2}
      onchange={(v) => { voiceParams.openQuotient = v; }} />
    <LabeledSlider label="Spectral Tilt" min={0} max={24} step={0.5}
      value={voiceParams.spectralTilt} unit="dB" decimals={1}
      onchange={(v) => { voiceParams.spectralTilt = v; }} />
    <LabeledSlider label="Aspiration" min={0} max={0.5} step={0.01}
      value={voiceParams.aspirationLevel} unit="" decimals={2}
      onchange={(v) => { voiceParams.aspirationLevel = v; }} />
  </div>
{/if}
```
[VERIFIED: LabeledSlider component already exists with this exact API]

### Tooltip Data Structure
```typescript
// Tooltip content for primary controls (D-18, D-20)
export const TOOLTIPS: Record<string, { text: string; expert?: string }> = {
  pitch: {
    text: 'Controls the fundamental frequency -- how high or low the voice sounds. Try 120 Hz for a male voice or 220 Hz for female.',
    expert: 'f0 in Hz. Drives the glottal pulse repetition rate and all harmonic positions.'
  },
  volume: {
    text: 'Controls how loud the voice sounds.',
    expert: 'Master gain (linear 0-1). Applied after formant filtering.'
  },
  voicePreset: {
    text: 'Choose a voice type. Each sets typical formant positions for that voice -- like switching between a soprano and a bass.',
    expert: 'Loads F1-F4 center frequencies and bandwidths from Hillenbrand-derived data for the selected voice type.'
  },
  phonation: {
    text: 'Changes how the vocal folds vibrate. "Breathy" is airy and soft; "Pressed" is tight and intense; "Modal" is normal speaking.',
    expert: 'Sets open quotient, aspiration level, and spectral tilt simultaneously.'
  },
  vowelChart: {
    text: 'Drag the dot to shape the vowel. Moving changes the first and second formant frequencies, which is how your vocal tract shapes different vowel sounds.',
    expert: 'F1 (vertical) and F2 (horizontal) in Hz. Ellipses show Hillenbrand (1995) population data.'
  },
  strategy: {
    text: 'Singing strategies align your formant frequencies with harmonics of your pitch. Sopranos and tenors use this to project over an orchestra.',
    expert: 'R1:nf0 means first resonance tracks the nth harmonic. Locked mode auto-tunes; overlay shows targets only.'
  },
  playStop: {
    text: 'Start or stop the voice synthesis.',
  },
};
```
[ASSUMED -- tooltip text is pedagogical content, will need review]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stacked single-column layout | Full-screen CSS grid | Phase 5 | Complete App.svelte template rewrite |
| All params always visible | Progressive disclosure via expert toggle | Phase 5 | Components gain `expertMode` prop |
| No help text | Rich tooltips with `?` icons | Phase 5 | New Tooltip component, tooltip data module |
| No R1/R2 charts | Sundberg-style strategy visualization | Phase 5 | Two new SVG chart components |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Sundberg originals use linear axes for the resonance-vs-pitch charts | Architecture Patterns (Pattern 3) | Chart might need log scale instead -- visual difference, not functional |
| A2 | CSS Grid `100dvh` handles Safari viewport correctly | Common Pitfalls (1) | Minor -- fallback to `100vh` already planned |
| A3 | Multi-touch piano needs Set<pointerId> tracking | Common Pitfalls (4) | Implementation may be simpler if only visual feedback needed |
| A4 | Expert mode panels should not change grid row heights | Common Pitfalls (3) | If controls panel is already scrollable, layout shift is moot |
| A5 | Tooltip pedagogical text content is appropriate | Code Examples | Text may need domain expert review |
| A6 | Grid column widths (200-240px sidebar, 240-300px charts) are appropriate for 1024x700 | Architecture Patterns | May need tuning -- 1024 - 240 - 300 = 484px for harmonics, tight but workable |

## Open Questions (RESOLVED)

1. **Shared Y-axis for panels A/B/C** _(RESOLVED: independent Y scales per panel with aligned panel widths -- Plan 02 implements separate R1 200-1200 Hz and R2 600-3000 Hz Y domains; D-13 confirms independent axes)_
   - What we know: D-03 says the three right panels share a vertical frequency axis for visual coherence
   - What's unclear: F1 range (200-1000 Hz) and F2 range (600-3000 Hz) differ significantly. The vowel chart has two axes (F1 and F2). Sharing a single Y scale across all three panels requires either: (a) different Y ranges per panel but visually aligned gridlines, or (b) a unified Hz scale that accommodates all three
   - Recommendation: Use independent Y scales per panel but align the panel widths and draw consistent gridlines. The "shared" axis means spatial alignment, not identical scale range

2. **Vibrato waveform visual (D-06)** _(RESOLVED: static SVG sine waveform -- Plan 01 Task 2 creates VibratoVisual.svelte as a static one-cycle sine preview with rate/extent annotations)_
   - What we know: User wants a vibrato waveform visual in the vibrato controls section
   - What's unclear: Whether this means a static waveform preview (showing the LFO shape) or a live animated display of the vibrato modulation
   - Recommendation: Static SVG showing one cycle of the vibrato waveform (sine) with rate/extent parameters annotated. Live animation adds complexity for minimal pedagogy value

3. **Pitch slider vs piano-only pitch control (D-15)** _(RESOLVED: pitch slider added to sidebar -- Plan 03 Task 1 places PitchSection in the sidebar with a dedicated slider)_
   - What we know: D-15 lists "Pitch slider" as one of the 7 primary controls. Currently pitch is set via QWERTY or piano keyboard click
   - What's unclear: Whether a dedicated pitch slider is needed in addition to the piano
   - Recommendation: Add a horizontal pitch slider in the controls sidebar. It provides fine-grained f0 control that complements the discrete piano keys

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | Max 7 primary controls in default view | manual-only | Visual inspection | N/A |
| UI-02 | Tooltips on every primary control | manual-only | Visual inspection | N/A |
| UI-03 | Expert mode exposes OQ/tilt/bandwidth | manual-only | Visual inspection + interaction | N/A |
| UI-04 | Clean modern aesthetic, dark theme | manual-only | Visual inspection | N/A |
| UI-05 | Usable at 1024x700 | manual-only | Resize browser window | N/A |
| UI-06 | Pointer Events with touch-action: none | unit | `npx vitest run` | Wave 0 |

**Note:** This phase is primarily UI layout and visual polish. Most requirements are verifiable only by human inspection. The testable code is limited to:
- Tooltip data module (completeness: every primary control has tooltip text)
- R1/R2 strategy chart math (diagonal line computation, scale setup)
- Expert mode state toggling (if extracted to a module)

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green + human visual verification of all 5 success criteria

### Wave 0 Gaps
- [ ] `src/lib/data/tooltips.test.ts` -- verify all 7 primary controls have tooltip entries
- [ ] `src/lib/charts/__tests__/strategy-chart-math.test.ts` -- diagonal line computation, scale domain clamping

## Security Domain

Not applicable for this phase. All changes are client-side UI layout, CSS, and SVG visualization. No user input is persisted, no external data is fetched, no authentication or access control exists. The phase introduces no new attack surface.

## Sources

### Primary (HIGH confidence)
- Codebase inspection -- all component files, state.svelte.ts, strategies/*, voice-presets.ts, app.css read and analyzed
- package.json -- verified all dependencies and versions
- CLAUDE.md -- project conventions, stack decisions, visualization guidance

### Secondary (MEDIUM confidence)
- CSS Grid layout patterns -- well-established web standards, no version-specific concerns

### Tertiary (LOW confidence)
- Sundberg chart axis conventions (A1) -- based on training knowledge of Sundberg (1987), not verified against the original publication

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all verified from package.json and codebase
- Architecture: HIGH -- layout is CSS Grid (well-understood), new components follow established SVG patterns in codebase
- Pitfalls: MEDIUM -- layout pitfalls are common knowledge but exact behavior at 1024x700 needs testing
- R1/R2 charts: MEDIUM -- math is straightforward but Sundberg visual style details are assumed

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable -- no fast-moving dependencies)
