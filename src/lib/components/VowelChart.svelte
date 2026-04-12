<script lang="ts">
  import { scaleLog } from 'd3-scale';
  import { HILLENBRAND_VOWELS, getActiveVowelRegion, interpolateHigherFormants } from '../data/hillenbrand.ts';
  import type { SpeakerGroup, HillenbrandVowel } from '../data/hillenbrand.ts';
  import { voiceParams } from '../audio/state.svelte.ts';
  import ChipGroup from './ChipGroup.svelte';
  import VowelChartOverlay from './VowelChartOverlay.svelte';

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
  let overlayGroup = $state<string | null>(null);
  let dragging = $state(false);
  let svgEl: SVGSVGElement | undefined = $state();

  // Derived: drag handle position
  let handleX = $derived(f2Scale(voiceParams.f2Freq));
  let handleY = $derived(f1Scale(voiceParams.f1Freq));

  // Derived: active vowel region (D-19, RANGE-03)
  let activeRegion = $derived(getActiveVowelRegion(voiceParams.f1Freq, voiceParams.f2Freq, currentGroup));

  // Voice-type overlay options
  const overlayOptions = [
    { key: 'none', label: 'None' },
    { key: 'men', label: 'Male Range' },
    { key: 'women', label: 'Female Range' },
    { key: 'child', label: 'Child Range' },
  ];

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
    svgEl?.releasePointerCapture(e.pointerId);
  }

  // Vowel preset click (D-09, D-10, D-11)
  function snapToVowel(vowel: HillenbrandVowel) {
    const data = vowel[currentGroup];
    voiceParams.f1Freq = data.f1;
    voiceParams.f2Freq = data.f2;
    voiceParams.f3Freq = data.f3;
    voiceParams.f4Freq = Math.round(data.f3 * 1.25); // estimate F4 from F3
  }

  function onOverlaySelect(key: string) {
    overlayGroup = key === 'none' ? null : key;
  }
</script>

<div class="vowel-chart-section section">
  <h2 class="section-heading">Vowel Space</h2>

  <!-- Voice-type overlay selector (D-17) -->
  <div class="overlay-selector">
    <span class="overlay-label">Formant Ranges</span>
    <ChipGroup
      options={overlayOptions}
      selected={overlayGroup ?? 'none'}
      onselect={onOverlaySelect}
    />
  </div>

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
          stroke="#4a4a6a" stroke-opacity="0.4" stroke-width="0.5"
        />
      {/each}
      {#each f1Ticks as tick}
        <line
          x1={0} y1={f1Scale(tick)}
          x2={PLOT_WIDTH} y2={f1Scale(tick)}
          stroke="#4a4a6a" stroke-opacity="0.4" stroke-width="0.5"
        />
      {/each}

      <!-- X-axis (F2) -->
      <line x1={0} y1={PLOT_HEIGHT} x2={PLOT_WIDTH} y2={PLOT_HEIGHT} stroke="#4a4a6a" stroke-width="1" />
      {#each f2Ticks as tick}
        <line
          x1={f2Scale(tick)} y1={PLOT_HEIGHT}
          x2={f2Scale(tick)} y2={PLOT_HEIGHT + 6}
          stroke="#4a4a6a" stroke-width="1"
        />
        <text
          x={f2Scale(tick)} y={PLOT_HEIGHT + 18}
          text-anchor="middle" font-size="11" fill="#8a8aaa"
        >{tick}</text>
      {/each}
      <text
        x={PLOT_WIDTH / 2} y={PLOT_HEIGHT + 34}
        text-anchor="middle" font-size="12" font-weight="600" fill="#8a8aaa"
      >F2 (Hz)</text>

      <!-- Y-axis (F1) -->
      <line x1={0} y1={0} x2={0} y2={PLOT_HEIGHT} stroke="#4a4a6a" stroke-width="1" />
      {#each f1Ticks as tick}
        <line
          x1={0} y1={f1Scale(tick)}
          x2={-6} y2={f1Scale(tick)}
          stroke="#4a4a6a" stroke-width="1"
        />
        <text
          x={-10} y={f1Scale(tick)}
          text-anchor="end" dominant-baseline="central" font-size="11" fill="#8a8aaa"
        >{tick}</text>
      {/each}
      <text
        x={0} y={0}
        text-anchor="middle" font-size="12" font-weight="600" fill="#8a8aaa"
        transform="translate({-36}, {PLOT_HEIGHT / 2}) rotate(-90)"
      >F1 (Hz)</text>

      <!-- Voice-type overlay polygon -->
      {#if overlayGroup}
        <VowelChartOverlay
          group={overlayGroup as SpeakerGroup}
          {f1Scale}
          {f2Scale}
        />
      {/if}

      <!-- Hillenbrand ellipses (D-16, RANGE-01) -->
      {#each HILLENBRAND_VOWELS as vowel (vowel.ipa)}
        <ellipse
          cx={ellipseCx(vowel)}
          cy={ellipseCy(vowel)}
          rx={ellipseRx(vowel)}
          ry={ellipseRy(vowel)}
          fill={activeRegion === vowel.ipa ? 'rgba(99, 102, 241, 0.15)' : 'rgba(224, 224, 224, 0.06)'}
          stroke={activeRegion === vowel.ipa ? 'rgba(99, 102, 241, 0.4)' : 'rgba(224, 224, 224, 0.2)'}
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
          fill="#8a8aaa"
          pointer-events="none"
        >{vowel.ipa}</text>
      {/each}

      <!-- Drag handle (D-12, D-13) -->
      <circle
        cx={handleX}
        cy={handleY}
        r="8"
        fill="#6366f1"
        style="cursor: {dragging ? 'grabbing' : 'grab'};"
        role="slider"
        aria-label="Current vowel position"
        aria-valuenow={Math.round(voiceParams.f1Freq)}
        aria-valuemin={200}
        aria-valuemax={1000}
      />

      <!-- Citation (D-18, VOWEL-05) -->
      <text
        x={PLOT_WIDTH}
        y={PLOT_HEIGHT + 44}
        text-anchor="end"
        font-size="11"
        fill="#8a8aaa"
      >Data: Hillenbrand et al. (1995)</text>
    </g>
  </svg>
</div>

<style>
  .vowel-chart-section {
    /* uses .section from app.css */
  }

  .vowel-chart {
    width: 100%;
    height: auto;
    display: block;
  }

  .overlay-selector {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm, 8px);
    margin-bottom: var(--spacing-md, 16px);
  }

  .overlay-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-secondary, #8a8aaa);
    white-space: nowrap;
  }
</style>
