<script lang="ts">
  import { scaleLog } from 'd3-scale';
  import { tweened } from 'svelte/motion';
  import { HILLENBRAND_VOWELS, getActiveVowelRegion, interpolateHigherFormants } from '../data/hillenbrand.ts';
  import type { SpeakerGroup, HillenbrandVowel } from '../data/hillenbrand.ts';
  import { voiceParams } from '../audio/state.svelte.ts';
  import LabeledSlider from './LabeledSlider.svelte';
  import VowelChartOverlay from './VowelChartOverlay.svelte';
  import StrategyOverlayVowel from './StrategyOverlayVowel.svelte';

  interface Props {
    expertMode?: boolean;
  }
  let { expertMode = false }: Props = $props();

  // SVG dimensions (per UI-SPEC)
  const SVG_WIDTH = 480;
  const SVG_HEIGHT = 400;
  const MARGIN = { left: 48, right: 24, top: 32, bottom: 48 };
  const PLOT_WIDTH = SVG_WIDTH - MARGIN.left - MARGIN.right; // 408
  const PLOT_HEIGHT = SVG_HEIGHT - MARGIN.top - MARGIN.bottom; // 320

  // Log scales (D-01, D-02)
  const f1Scale = scaleLog().domain([200, 1000]).range([PLOT_HEIGHT, 0]); // F1 up = Cartesian
  const f2Scale = scaleLog().domain([600, 3000]).range([0, PLOT_WIDTH]);  // F2 right

  // Axis tick values
  const f1Ticks = [200, 300, 400, 500, 600, 700, 800, 1000];
  const f2Ticks = [600, 800, 1000, 1500, 2000, 2500, 3000];

  // State
  let currentGroup: SpeakerGroup = $state('men');
  let dragging = $state(false);
  let svgEl: SVGSVGElement | undefined = $state();

  // Tweened handle position — matches audio smoothing (60ms TC ≈ 180ms to 95%)
  // During drag, frequent updates make the tween imperceptible;
  // for strategy-driven jumps, it provides smooth visual glide.
  const TWEEN_DURATION = 180;
  const tweenedHandleX = tweened(f2Scale(voiceParams.f2Freq), { duration: TWEEN_DURATION });
  const tweenedHandleY = tweened(f1Scale(voiceParams.f1Freq), { duration: TWEEN_DURATION });

  $effect(() => {
    tweenedHandleX.set(f2Scale(voiceParams.f2Freq));
  });
  $effect(() => {
    tweenedHandleY.set(f1Scale(voiceParams.f1Freq));
  });

  // Expose both raw (for hit-testing) and tweened (for rendering)
  let handleX = $derived($tweenedHandleX);
  let handleY = $derived($tweenedHandleY);

  // Derived: active vowel region (D-19, RANGE-03)
  let activeRegion = $derived(getActiveVowelRegion(voiceParams.f1Freq, voiceParams.f2Freq, currentGroup));

  // Voice-type overlay: show range for current speaker group

  // Ellipse rendering helpers
  function ellipseCx(vowel: HillenbrandVowel): number {
    return f2Scale(vowel[currentGroup].f2);
  }
  function ellipseCy(vowel: HillenbrandVowel): number {
    return f1Scale(vowel[currentGroup].f1);
  }
  function ellipseRx(vowel: HillenbrandVowel): number {
    const data = vowel[currentGroup];
    return Math.abs(f2Scale(data.f2 + data.f2SD) - f2Scale(data.f2));
  }
  function ellipseRy(vowel: HillenbrandVowel): number {
    const data = vowel[currentGroup];
    return Math.abs(f1Scale(data.f1 + data.f1SD) - f1Scale(data.f1));
  }

  // Pointer-to-SVG coordinate conversion (per PianoKeyboard pattern)
  function pointerToPlot(e: PointerEvent): { f1: number; f2: number } | null {
    if (!svgEl) return null;
    const rect = svgEl.getBoundingClientRect();
    // Convert CSS pixels to viewBox coordinates
    const svgX = (e.clientX - rect.left) / rect.width * SVG_WIDTH;
    const svgY = (e.clientY - rect.top) / rect.height * SVG_HEIGHT;
    // Subtract margins to get plot-local coords
    const plotX = svgX - MARGIN.left;
    const plotY = svgY - MARGIN.top;
    // Invert scales to Hz, clamped to domain
    const f2Hz = Math.max(600, Math.min(3000, f2Scale.invert(plotX)));
    const f1Hz = Math.max(200, Math.min(1000, f1Scale.invert(plotY)));
    return { f1: f1Hz, f2: f2Hz };
  }

  function updateFromPointer(e: PointerEvent) {
    const result = pointerToPlot(e);
    if (!result) return;
    voiceParams.f1Freq = result.f1;
    voiceParams.f2Freq = result.f2;
    // Interpolate F3/F4 from nearest Hillenbrand vowels
    const higher = interpolateHigherFormants(result.f1, result.f2, currentGroup);
    voiceParams.f3Freq = higher.f3;
    voiceParams.f4Freq = higher.f4;
  }

  // Drag handlers (pointer-capture, same pattern as PianoKeyboard)
  function onPointerDown(e: PointerEvent) {
    e.preventDefault();
    dragging = true;
    // D-14: temporarily override strategy when dragging on locked vowel chart
    if (voiceParams.strategyMode === 'locked') {
      voiceParams.strategyOverriding = true;
    }
    svgEl?.setPointerCapture(e.pointerId);
    updateFromPointer(e);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    e.preventDefault();
    updateFromPointer(e);
  }

  function onPointerUp(e: PointerEvent) {
    dragging = false;
    // D-14: release strategy override -- formant snaps back
    if (voiceParams.strategyOverriding) {
      voiceParams.strategyOverriding = false;
    }
    svgEl?.releasePointerCapture(e.pointerId);
  }

  // Vowel preset click (D-09, D-10, D-11)
  function snapToVowel(vowel: HillenbrandVowel) {
    const data = vowel[currentGroup];
    voiceParams.f1Freq = data.f1;
    voiceParams.f2Freq = data.f2;
    voiceParams.f3Freq = data.f3;
    voiceParams.f4Freq = Math.round(data.f3 * 1.25); // estimate F4 from F3
    voiceParams.f5Freq = Math.round(data.f3 * 1.6);  // rough F5 estimate
  }

</script>

<div class="vowel-chart-section">
  {#if expertMode}
    <div class="formant-readouts">
      <span class="readout">F1: {Math.round(voiceParams.f1Freq)} Hz</span>
      <span class="readout">F2: {Math.round(voiceParams.f2Freq)} Hz</span>
    </div>
  {/if}

  <svg
    bind:this={svgEl}
    class="vowel-chart"
    viewBox="0 0 {SVG_WIDTH} {SVG_HEIGHT}"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    aria-label="F1/F2 vowel space diagram"
    style="touch-action: none;"
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
  >
    <!-- Plot area group offset by margins -->
    <g transform="translate({MARGIN.left}, {MARGIN.top})">
      <!-- Grid lines -->
      {#each f2Ticks as tick}
        <line
          x1={f2Scale(tick)} y1={0}
          x2={f2Scale(tick)} y2={PLOT_HEIGHT}
          stroke="var(--color-border)" stroke-opacity="0.4" stroke-width="0.5"
        />
      {/each}
      {#each f1Ticks as tick}
        <line
          x1={0} y1={f1Scale(tick)}
          x2={PLOT_WIDTH} y2={f1Scale(tick)}
          stroke="var(--color-border)" stroke-opacity="0.4" stroke-width="0.5"
        />
      {/each}

      <!-- X-axis (F2) -->
      <line x1={0} y1={PLOT_HEIGHT} x2={PLOT_WIDTH} y2={PLOT_HEIGHT} stroke="var(--color-border)" stroke-width="1" />
      {#each f2Ticks as tick}
        <line
          x1={f2Scale(tick)} y1={PLOT_HEIGHT}
          x2={f2Scale(tick)} y2={PLOT_HEIGHT + 6}
          stroke="var(--color-border)" stroke-width="1"
        />
        <text
          x={f2Scale(tick)} y={PLOT_HEIGHT + 18}
          text-anchor="middle" font-size="11" fill="var(--color-text-secondary)"
        >{tick}</text>
      {/each}
      <text
        x={PLOT_WIDTH / 2} y={PLOT_HEIGHT + 34}
        text-anchor="middle" font-size="12" font-weight="600" fill="var(--color-text-secondary)"
      >F2 (Hz)</text>

      <!-- Y-axis (F1) -->
      <line x1={0} y1={0} x2={0} y2={PLOT_HEIGHT} stroke="var(--color-border)" stroke-width="1" />
      {#each f1Ticks as tick}
        <line
          x1={0} y1={f1Scale(tick)}
          x2={-6} y2={f1Scale(tick)}
          stroke="var(--color-border)" stroke-width="1"
        />
        <text
          x={-10} y={f1Scale(tick)}
          text-anchor="end" dominant-baseline="central" font-size="11" fill="var(--color-text-secondary)"
        >{tick}</text>
      {/each}
      <text
        x={0} y={0}
        text-anchor="middle" font-size="12" font-weight="600" fill="var(--color-text-secondary)"
        transform="translate({-36}, {PLOT_HEIGHT / 2}) rotate(-90)"
      >F1 (Hz)</text>

      <!-- Voice-type overlay polygon -->
      <VowelChartOverlay
        group={currentGroup}
        {f1Scale}
        {f2Scale}
      />

      <!-- Hillenbrand ellipses (D-16, RANGE-01) -->
      {#each HILLENBRAND_VOWELS as vowel (vowel.ipa)}
        <ellipse
          cx={ellipseCx(vowel)}
          cy={ellipseCy(vowel)}
          rx={ellipseRx(vowel)}
          ry={ellipseRy(vowel)}
          fill={activeRegion === vowel.ipa ? 'rgba(37, 99, 235, 0.12)' : 'rgba(0, 0, 0, 0.04)'}
          stroke={activeRegion === vowel.ipa ? 'rgba(37, 99, 235, 0.4)' : 'rgba(0, 0, 0, 0.15)'}
          stroke-width="1"
        />
        <!-- Invisible click target -->
        <circle
          cx={ellipseCx(vowel)}
          cy={ellipseCy(vowel)}
          r="20"
          fill="transparent"
          style="cursor: pointer;"
          role="button"
          aria-label="Set vowel to {vowel.ipa}"
          onclick={(e: MouseEvent) => { e.stopPropagation(); snapToVowel(vowel); }}
        />
        <!-- IPA label -->
        <text
          x={ellipseCx(vowel)}
          y={ellipseCy(vowel)}
          text-anchor="middle"
          dominant-baseline="central"
          font-size="14"
          font-weight="600"
          fill="var(--color-text-secondary)"
          pointer-events="none"
        >{vowel.ipa}</text>
      {/each}

      <!-- Drag handle (D-12, D-13) -->
      <circle
        cx={handleX}
        cy={handleY}
        r="8"
        fill="var(--color-accent)"
        style="cursor: {dragging ? 'grabbing' : 'grab'};"
        role="slider"
        aria-label="Current vowel position"
        aria-valuenow={Math.round(voiceParams.f1Freq)}
        aria-valuemin={200}
        aria-valuemax={1000}
      />

      <!-- Strategy target overlay (D-08) -->
      <StrategyOverlayVowel {f1Scale} {f2Scale} {handleX} {handleY} />

      <!-- Citation (D-18, VOWEL-05) -->
      <text
        x={PLOT_WIDTH}
        y={PLOT_HEIGHT + 44}
        text-anchor="end"
        font-size="11"
        fill="var(--color-text-secondary)"
      >Data: Hillenbrand et al. (1995)</text>
    </g>
  </svg>

  {#if expertMode}
    <div class="expert-formant-params">
      <LabeledSlider label="F1 BW" min={30} max={200} step={1}
        value={voiceParams.f1BW} unit="Hz" decimals={0}
        onchange={(v) => { voiceParams.f1BW = v; }} />
      <LabeledSlider label="F2 BW" min={30} max={250} step={1}
        value={voiceParams.f2BW} unit="Hz" decimals={0}
        onchange={(v) => { voiceParams.f2BW = v; }} />
      <LabeledSlider label="F3 BW" min={50} max={300} step={1}
        value={voiceParams.f3BW} unit="Hz" decimals={0}
        onchange={(v) => { voiceParams.f3BW = v; }} />
      <LabeledSlider label="F4 BW" min={50} max={500} step={1}
        value={voiceParams.f4BW} unit="Hz" decimals={0}
        onchange={(v) => { voiceParams.f4BW = v; }} />
    </div>
  {/if}
</div>

<style>
  .vowel-chart-section {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-height: 100%;
  }

  .vowel-chart {
    width: 100%;
    height: auto;
    display: block;
    flex: 1;
    min-height: 0;
  }

  .formant-readouts {
    display: flex;
    gap: var(--spacing-md, 16px);
    justify-content: center;
  }

  .readout {
    font-family: monospace;
    font-size: 13px;
    color: var(--color-text-secondary);
  }

  .expert-formant-params {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-sm, 8px);
    padding: var(--spacing-sm, 8px);
  }
</style>
