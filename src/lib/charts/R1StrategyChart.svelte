<script lang="ts">
  import {
    createPitchScale,
    createFreqScale,
    computeDiagonalLine,
    generateAxisTicks,
  } from './strategy-chart-math.ts';
  import { R1_STRATEGIES } from '../strategies/definitions.ts';
  import { VOICE_PRESETS } from '../data/voice-presets.ts';

  import { voiceParams } from '../audio/state.svelte.ts';

  interface Props {
    f0: number;
    f1Freq: number;
    r1Strategy: string | null;
    strategyMode: string;
    voicePreset: string | null;
  }

  let {
    f0,
    f1Freq,
    r1Strategy,
    strategyMode,
    voicePreset,
  }: Props = $props();

  let containerEl: HTMLDivElement | undefined = $state();
  let svgEl: SVGSVGElement | undefined = $state();
  let width = $state(280);
  let height = $state(180);
  let dragging = $state(false);

  // Margins
  const marginLeft = 45;
  const marginRight = 10;
  const marginTop = 20;
  const marginBottom = 25;

  let plotWidth = $derived(width - marginLeft - marginRight);
  let plotHeight = $derived(height - marginTop - marginBottom);

  // Axis domains
  const pitchMin = 65;   // C2
  const pitchMax = 1047; // C6
  const freqMin = 200;
  const freqMax = 1200;

  // Scales
  let xScale = $derived(createPitchScale(pitchMin, pitchMax, plotWidth));
  let yScale = $derived(createFreqScale(freqMin, freqMax, plotHeight));

  // X-axis ticks at note positions
  let xTicks = $derived(
    generateAxisTicks(pitchMin, pitchMax, ['C2', 'C3', 'C4', 'C5', 'C6'])
  );

  // Y-axis ticks
  const yTickValues = [200, 400, 600, 800, 1000, 1200];

  // Diagonal harmonic lines (n=1, 2, 3)
  const harmonics = [
    { n: 1, label: 'f\u2080' },
    { n: 2, label: '2f\u2080' },
    { n: 3, label: '3f\u2080' },
  ];

  let diagonalLines = $derived(
    harmonics.map((h) => {
      const line = computeDiagonalLine(
        h.n,
        { min: pitchMin, max: pitchMax },
        { min: freqMin, max: freqMax },
      );
      return { ...h, ...line };
    })
  );

  // Strategy ID to harmonic number mapping
  const strategyHarmonic: Record<string, number> = {
    'r1-f0': 1,
    'r1-2f0': 2,
    'r1-3f0': 3,
  };

  // Formant range shading
  let formantRange = $derived.by(() => {
    if (!voicePreset || !VOICE_PRESETS[voicePreset]) return null;
    const preset = VOICE_PRESETS[voicePreset];
    const rangeMin = Math.max(freqMin, preset.f1 - 2 * preset.f1BW);
    const rangeMax = Math.min(freqMax, preset.f1 + 2 * preset.f1BW);
    return { min: rangeMin, max: rangeMax };
  });

  // Voice range bracket on X-axis
  const voiceRanges: Record<string, { min: number; max: number }> = {
    soprano:  { min: 262, max: 1047 },
    mezzo:    { min: 196, max: 784 },
    alto:     { min: 175, max: 659 },
    tenor:    { min: 131, max: 524 },
    baritone: { min: 98,  max: 392 },
    bass:     { min: 65,  max: 262 },
    child:    { min: 262, max: 784 },
  };

  let voiceRange = $derived.by(() => {
    if (!voicePreset || !voiceRanges[voicePreset]) return null;
    const range = voiceRanges[voicePreset];
    const label = VOICE_PRESETS[voicePreset]?.label ?? voicePreset;
    return { ...range, label };
  });

  // f0 cursor x position (clamped to plot)
  let f0X = $derived(Math.max(0, Math.min(plotWidth, xScale(f0))));

  // F1 marker y position (clamped to plot)
  let f1Y = $derived(Math.max(0, Math.min(plotHeight, yScale(f1Freq))));

  function pointerToHz(e: PointerEvent): { pitch: number; freq: number } | null {
    if (!svgEl) return null;
    const rect = svgEl.getBoundingClientRect();
    const plotX = (e.clientX - rect.left) / rect.width * width - marginLeft;
    const plotY = (e.clientY - rect.top) / rect.height * height - marginTop;
    const pitch = Math.max(pitchMin, Math.min(pitchMax, xScale.invert(plotX)));
    const freq = Math.max(freqMin, Math.min(freqMax, yScale.invert(plotY)));
    return { pitch, freq };
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

  function updateFromPointer(e: PointerEvent) {
    const result = pointerToHz(e);
    if (!result) return;
    voiceParams.f0 = result.pitch;
    voiceParams.f1Freq = result.freq;
  }
</script>

<div class="chart-container" bind:this={containerEl} bind:clientWidth={width} bind:clientHeight={height}>
<svg
  bind:this={svgEl}
  {width}
  {height}
  viewBox="0 0 {width} {height}"
  preserveAspectRatio="xMidYMid meet"
  role="img"
  aria-label="R1 strategy chart showing first resonance frequency vs pitch"
  style="touch-action: none; cursor: {dragging ? 'grabbing' : 'crosshair'};"
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
>
  <!-- Title -->
  <text
    x={marginLeft + plotWidth / 2}
    y={14}
    text-anchor="middle"
    font-size="12"
    font-weight="600"
    fill="var(--color-text)"
  >R1 (First Resonance)</text>

  <g transform="translate({marginLeft}, {marginTop})">
    <!-- Gridlines -->
    {#each xTicks as tick}
      <line
        x1={xScale(tick.hz)}
        y1={0}
        x2={xScale(tick.hz)}
        y2={plotHeight}
        stroke="var(--color-border)"
        stroke-width="0.5"
        opacity="0.5"
      />
    {/each}
    {#each yTickValues as val}
      <line
        x1={0}
        y1={yScale(val)}
        x2={plotWidth}
        y2={yScale(val)}
        stroke="var(--color-border)"
        stroke-width="0.5"
        opacity="0.5"
      />
    {/each}

    <!-- Formant range shading -->
    {#if formantRange}
      <rect
        x={0}
        y={yScale(formantRange.max)}
        width={plotWidth}
        height={yScale(formantRange.min) - yScale(formantRange.max)}
        fill="var(--color-f1)"
        opacity="0.25"
      />
    {/if}

    <!-- Diagonal harmonic lines -->
    {#each diagonalLines as d}
      {@const isActive = r1Strategy && strategyMode !== 'off' && strategyHarmonic[r1Strategy] === d.n}
      <line
        x1={xScale(d.x1)}
        y1={yScale(d.y1)}
        x2={xScale(d.x2)}
        y2={yScale(d.y2)}
        stroke={isActive ? 'var(--color-accent)' : '#333333'}
        stroke-width={isActive ? 2 : 1}
        opacity={isActive ? 1 : 0.4}
      />
      <!-- Label along diagonal, 75% from start to end -->
      {@const lx = xScale(d.x1) + (xScale(d.x2) - xScale(d.x1)) * 0.75}
      {@const ly = yScale(d.y1) + (yScale(d.y2) - yScale(d.y1)) * 0.75}
      <text
        x={lx + 4}
        y={ly - 5}
        text-anchor="start"
        font-size="13"
        font-weight="600"
        fill={isActive ? 'var(--color-accent)' : '#111111'}
        opacity={isActive ? 1 : 0.7}
      >{d.label}</text>
    {/each}

    <!-- Current f0 cursor -->
    <line
      x1={f0X}
      y1={0}
      x2={f0X}
      y2={plotHeight}
      stroke="var(--color-accent)"
      stroke-width="2"
    />

    <!-- Current F1 marker (horizontal dashed) -->
    <line
      x1={0}
      y1={f1Y}
      x2={plotWidth}
      y2={f1Y}
      stroke="var(--color-f1)"
      stroke-width="1.5"
      stroke-dasharray="4,3"
    />

    <!-- X-axis tick labels -->
    {#each xTicks as tick}
      <text
        x={xScale(tick.hz)}
        y={plotHeight + 16}
        text-anchor="middle"
        font-size="10"
        fill="var(--color-text-secondary)"
      >{tick.label}</text>
    {/each}

    <!-- Y-axis tick labels -->
    {#each yTickValues as val}
      <text
        x={-6}
        y={yScale(val) + 3}
        text-anchor="end"
        font-size="10"
        fill="var(--color-text-secondary)"
      >{val}</text>
    {/each}

    <!-- Voice range bracket -->
    {#if voiceRange}
      {@const bracketX1 = Math.max(0, xScale(voiceRange.min))}
      {@const bracketX2 = Math.min(plotWidth, xScale(voiceRange.max))}
      <line
        x1={bracketX1}
        y1={plotHeight + 22}
        x2={bracketX2}
        y2={plotHeight + 22}
        stroke="var(--color-text-secondary)"
        stroke-width="2"
      />
      <text
        x={(bracketX1 + bracketX2) / 2}
        y={plotHeight + 24}
        text-anchor="middle"
        font-size="8"
        fill="var(--color-text-secondary)"
        dominant-baseline="hanging"
      >{voiceRange.label}</text>
    {/if}
  </g>
</svg>
</div>

<style>
  .chart-container {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
</style>
