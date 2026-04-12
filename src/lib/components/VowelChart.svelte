<script lang="ts">
  import { scaleLog } from 'd3-scale';
  import { tweened } from 'svelte/motion';
  import { HILLENBRAND_VOWELS, getActiveVowelRegion, interpolateHigherFormants } from '../data/hillenbrand.ts';
  import type { SpeakerGroup, HillenbrandVowel } from '../data/hillenbrand.ts';
  import { voiceParams } from '../audio/state.svelte.ts';
  import LabeledSlider from './LabeledSlider.svelte';
  import StrategyOverlayVowel from './StrategyOverlayVowel.svelte';

  interface Props {
    expertMode?: boolean;
  }
  let { expertMode = false }: Props = $props();

  // Measure container for responsive sizing
  let containerEl: HTMLDivElement | undefined = $state();
  let cWidth = $state(400);
  let cHeight = $state(400);

  // Minimal margins — labels go inside the plot
  const MARGIN = { left: 4, right: 4, top: 4, bottom: 4 };
  let PLOT_WIDTH = $derived(cWidth - MARGIN.left - MARGIN.right);
  let PLOT_HEIGHT = $derived(cHeight - MARGIN.top - MARGIN.bottom);

  // Log scales
  let f1Scale = $derived(scaleLog().domain([200, 1000]).range([PLOT_HEIGHT, 0]));
  let f2Scale = $derived(scaleLog().domain([600, 3000]).range([0, PLOT_WIDTH]));

  // Axis tick values (fewer for inside labels)
  const f1Ticks = [200, 300, 500, 700, 1000];
  const f2Ticks = [600, 1000, 1500, 2000, 3000];

  // State
  let currentGroup: SpeakerGroup = $state('men');
  let dragging = $state(false);
  let svgEl: SVGSVGElement | undefined = $state();

  const TWEEN_DURATION = 180;
  const tweenedHandleX = tweened(0, { duration: TWEEN_DURATION });
  const tweenedHandleY = tweened(0, { duration: TWEEN_DURATION });

  $effect(() => { tweenedHandleX.set(f2Scale(voiceParams.f2Freq)); });
  $effect(() => { tweenedHandleY.set(f1Scale(voiceParams.f1Freq)); });

  let handleX = $derived($tweenedHandleX);
  let handleY = $derived($tweenedHandleY);

  let activeRegion = $derived(getActiveVowelRegion(voiceParams.f1Freq, voiceParams.f2Freq, currentGroup));

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

  function pointerToPlot(e: PointerEvent): { f1: number; f2: number } | null {
    if (!svgEl) return null;
    const rect = svgEl.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) / rect.width * cWidth;
    const svgY = (e.clientY - rect.top) / rect.height * cHeight;
    const plotX = svgX - MARGIN.left;
    const plotY = svgY - MARGIN.top;
    const f2Hz = Math.max(600, Math.min(3000, f2Scale.invert(plotX)));
    const f1Hz = Math.max(200, Math.min(1000, f1Scale.invert(plotY)));
    return { f1: f1Hz, f2: f2Hz };
  }

  function updateFromPointer(e: PointerEvent) {
    const result = pointerToPlot(e);
    if (!result) return;
    voiceParams.f1Freq = result.f1;
    voiceParams.f2Freq = result.f2;
    const higher = interpolateHigherFormants(result.f1, result.f2, currentGroup);
    voiceParams.f3Freq = higher.f3;
    voiceParams.f4Freq = higher.f4;
  }

  function onPointerDown(e: PointerEvent) {
    e.preventDefault();
    dragging = true;
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
    if (voiceParams.strategyOverriding) {
      voiceParams.strategyOverriding = false;
    }
    svgEl?.releasePointerCapture(e.pointerId);
  }

  function snapToVowel(vowel: HillenbrandVowel) {
    const data = vowel[currentGroup];
    voiceParams.f1Freq = data.f1;
    voiceParams.f2Freq = data.f2;
    voiceParams.f3Freq = data.f3;
    voiceParams.f4Freq = Math.round(data.f3 * 1.25);
    voiceParams.f5Freq = Math.round(data.f3 * 1.6);
  }
</script>

<div class="vowel-chart-section" bind:this={containerEl} bind:clientWidth={cWidth} bind:clientHeight={cHeight}>
  {#if expertMode}
    <div class="formant-readouts">
      <span class="readout">F1: {Math.round(voiceParams.f1Freq)} Hz</span>
      <span class="readout">F2: {Math.round(voiceParams.f2Freq)} Hz</span>
    </div>
  {/if}

  <svg
    bind:this={svgEl}
    class="vowel-chart"
    viewBox="0 0 {cWidth} {cHeight}"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    aria-label="F1/F2 vowel space diagram"
    style="touch-action: none;"
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
  >
    <g transform="translate({MARGIN.left}, {MARGIN.top})">
      <!-- Grid lines -->
      {#each f2Ticks as tick}
        <line
          x1={f2Scale(tick)} y1={0}
          x2={f2Scale(tick)} y2={PLOT_HEIGHT}
          stroke="var(--color-border)" stroke-opacity="0.3" stroke-width="0.5"
        />
      {/each}
      {#each f1Ticks as tick}
        <line
          x1={0} y1={f1Scale(tick)}
          x2={PLOT_WIDTH} y2={f1Scale(tick)}
          stroke="var(--color-border)" stroke-opacity="0.3" stroke-width="0.5"
        />
      {/each}

      <!-- Inside axis labels: F2 along bottom edge, skip first to avoid corner overlap -->
      {#each f2Ticks as tick, i}
        {#if i > 0}
          <text
            x={f2Scale(tick)} y={PLOT_HEIGHT - 4}
            text-anchor="middle" font-size="10" fill="var(--color-text-secondary)" opacity="0.6"
          >{tick}</text>
        {/if}
      {/each}
      <text
        x={PLOT_WIDTH - 2} y={PLOT_HEIGHT - 16}
        text-anchor="end" font-size="10" font-weight="600" fill="var(--color-text-secondary)" opacity="0.5"
      >F2 Hz</text>

      <!-- Inside axis labels: F1 along right edge, skip last (bottom) to avoid corner overlap -->
      {#each f1Ticks as tick, i}
        {#if i < f1Ticks.length - 1}
          <text
            x={PLOT_WIDTH - 4} y={f1Scale(tick) + 4}
            text-anchor="end" font-size="10" fill="var(--color-text-secondary)" opacity="0.6"
          >{tick}</text>
        {/if}
      {/each}
      <text
        x={PLOT_WIDTH - 4} y={14}
        text-anchor="end" font-size="10" font-weight="600" fill="var(--color-text-secondary)" opacity="0.5"
      >F1 Hz</text>

      <!-- Hillenbrand ellipses -->
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

      <!-- Drag handle -->
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

      <!-- Strategy target overlay -->
      <StrategyOverlayVowel {f1Scale} {f2Scale} {handleX} {handleY} />
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
    height: 100%;
    overflow: hidden;
  }

  .vowel-chart {
    width: 100%;
    height: 100%;
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
