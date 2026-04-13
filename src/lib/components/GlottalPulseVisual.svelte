<script lang="ts">
  import type { GlottalModel } from '../types.ts';
  import { rdToDecomposition, computeLfParams, lfDerivativeSample } from '../audio/dsp/lf-model.ts';

  interface Props {
    openQuotient: number;
    spectralTilt: number;
    aspirationLevel: number;
    glottalModel?: GlottalModel;
    rd?: number;
    f0?: number;
    expertMode?: boolean;
    width?: number;
    height?: number;
  }
  let {
    openQuotient,
    spectralTilt,
    aspirationLevel,
    glottalModel = 'rosenberg',
    rd = 1.0,
    f0 = 220,
    expertMode = false,
    width = 200,
    height = 80,
  }: Props = $props();

  // Measure container width (height is fixed via prop)
  let cWidth = $state(200);

  // When LF + expert, reserve extra bottom space for labels
  let showLfAnnotations = $derived(glottalModel === 'lf' && expertMode);
  let svgHeight = $derived(showLfAnnotations ? height + 40 : height);

  const MARGIN = { left: 2, right: 2, top: 4, bottom: 4 };

  let plotW = $derived(cWidth - MARGIN.left - MARGIN.right);
  let plotH = $derived(height - MARGIN.top - MARGIN.bottom);

  // Generate Rosenberg pulse samples for one period
  let rosenbergPath = $derived.by(() => {
    const N = 200;
    const oq = Math.max(0.2, Math.min(0.9, openQuotient));
    const Tn = oq;
    const Tp = 0.4 * Tn;

    const points: string[] = [];
    for (let i = 0; i <= N; i++) {
      const phase = i / N;
      let sample: number;

      if (phase < Tp) {
        sample = 0.5 * (1 - Math.cos(Math.PI * phase / Tp));
      } else if (phase < Tn) {
        sample = Math.cos(Math.PI * 0.5 * ((phase - Tp) / (Tn - Tp)));
      } else {
        sample = 0;
      }

      // Visual indication of spectral tilt: attenuate the sharp edges
      const tiltFactor = 1 - spectralTilt / 48;
      sample = sample * tiltFactor + sample * sample * (1 - tiltFactor);

      const x = MARGIN.left + (i / N) * plotW;
      const y = MARGIN.top + (1 - sample) * plotH;
      points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return points.join(' ');
  });

  // LF params (computed once, used for both path and annotations)
  let lfParams = $derived(computeLfParams(rd, f0));
  let lfDecomp = $derived(rdToDecomposition(rd, f0));

  // Generate LF pulse samples for one period
  let lfPath = $derived.by(() => {
    const N = 200;
    const params = lfParams;
    const samples: number[] = [];

    for (let i = 0; i <= N; i++) {
      const t = (i / N) * params.T0;
      samples.push(lfDerivativeSample(t, params));
    }

    // Normalize to [0, 1] for display
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (const s of samples) {
      if (s < minVal) minVal = s;
      if (s > maxVal) maxVal = s;
    }
    const range = maxVal - minVal || 1;

    const points: string[] = [];
    for (let i = 0; i <= N; i++) {
      const normalized = (samples[i] - minVal) / range;
      const x = MARGIN.left + (i / N) * plotW;
      const y = MARGIN.top + (1 - normalized) * plotH;
      points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return points.join(' ');
  });

  // Select active path based on model
  let pulsePath = $derived(glottalModel === 'lf' ? lfPath : rosenbergPath);

  // Open/closed phase boundary lines (Rosenberg only)
  let openEnd = $derived(MARGIN.left + openQuotient * plotW);

  // LF annotation positions
  let tpX = $derived(MARGIN.left + (lfParams.Tp / lfParams.T0) * plotW);
  let teX = $derived(MARGIN.left + (lfParams.Te / lfParams.T0) * plotW);
  let taEndX = $derived(MARGIN.left + (Math.min(lfParams.Te + lfParams.Ta, lfParams.T0) / lfParams.T0) * plotW);
  let labelY = $derived(height + 14);
  let bracketY = $derived(MARGIN.top + plotH * 0.9);

  // Formatted readouts
  let raDisplay = $derived(lfDecomp.Ra.toFixed(3));
  let rkDisplay = $derived(lfDecomp.Rk.toFixed(3));
  let rgDisplay = $derived(lfDecomp.Rg.toFixed(2));
  let taDisplay = $derived((lfDecomp.Ta * 1000).toFixed(2));
</script>

<div class="pulse-container" bind:clientWidth={cWidth}>
  <svg width={cWidth} height={svgHeight} viewBox="0 0 {cWidth} {svgHeight}">
    <!-- Baseline -->
    <line
      x1={MARGIN.left} y1={MARGIN.top + plotH}
      x2={MARGIN.left + plotW} y2={MARGIN.top + plotH}
      stroke="var(--color-border)" stroke-width="0.5"
    />

    {#if glottalModel === 'rosenberg'}
      <!-- Open phase region (Rosenberg) -->
      <rect
        x={MARGIN.left}
        y={MARGIN.top}
        width={openEnd - MARGIN.left}
        height={plotH}
        fill="var(--color-accent)"
        opacity="0.06"
      />
    {/if}

    <!-- Pulse waveform -->
    <path
      d={pulsePath}
      stroke="var(--color-text)"
      stroke-width="1.5"
      fill="none"
    />

    <!-- Aspiration noise indicator -->
    {#if aspirationLevel > 0.01}
      {@const noiseY = MARGIN.top + plotH * 0.85}
      <line
        x1={glottalModel === 'rosenberg' ? openEnd : MARGIN.left + plotW * 0.7}
        y1={noiseY - 2}
        x2={MARGIN.left + plotW} y2={noiseY - 2}
        stroke="var(--color-text-secondary)"
        stroke-width={Math.max(0.5, aspirationLevel * 6)}
        stroke-dasharray="2,2"
        opacity="0.5"
      />
    {/if}

    <!-- Rosenberg labels -->
    {#if glottalModel === 'rosenberg'}
      <text
        x={MARGIN.left + openQuotient * plotW * 0.5}
        y={MARGIN.top + plotH - 2}
        text-anchor="middle" font-size="8" fill="var(--color-text-secondary)" opacity="0.7"
      >open</text>
      <text
        x={openEnd + (plotW - openEnd + MARGIN.left) * 0.5}
        y={MARGIN.top + plotH - 2}
        text-anchor="middle" font-size="8" fill="var(--color-text-secondary)" opacity="0.7"
      >closed</text>
    {/if}

    <!-- LF annotations (on the same diagram, expert mode only) -->
    {#if showLfAnnotations}
      <!-- Tp marker -->
      <line
        x1={tpX} y1={MARGIN.top}
        x2={tpX} y2={MARGIN.top + plotH}
        stroke="var(--color-accent)"
        stroke-width="1"
        stroke-dasharray="3,3"
      />
      <text
        x={tpX} y={labelY}
        text-anchor="middle"
        font-size="10"
        fill="var(--color-accent)"
      >Tp</text>

      <!-- Te marker -->
      <line
        x1={teX} y1={MARGIN.top}
        x2={teX} y2={MARGIN.top + plotH}
        stroke="var(--color-warning, #e67e22)"
        stroke-width="1"
        stroke-dasharray="3,3"
      />
      <text
        x={teX} y={labelY}
        text-anchor="middle"
        font-size="10"
        fill="var(--color-warning, #e67e22)"
      >Te</text>

      <!-- Ta bracket -->
      <line
        x1={teX} y1={bracketY}
        x2={taEndX} y2={bracketY}
        stroke="var(--color-text-secondary)"
        stroke-width="1"
      />
      <line
        x1={teX} y1={bracketY - 3}
        x2={teX} y2={bracketY + 3}
        stroke="var(--color-text-secondary)"
        stroke-width="1"
      />
      <line
        x1={taEndX} y1={bracketY - 3}
        x2={taEndX} y2={bracketY + 3}
        stroke="var(--color-text-secondary)"
        stroke-width="1"
      />
      <text
        x={(teX + taEndX) / 2} y={bracketY - 5}
        text-anchor="middle"
        font-size="9"
        fill="var(--color-text-secondary)"
      >Ta</text>

      <!-- T0 label -->
      <text
        x={MARGIN.left + plotW} y={labelY}
        text-anchor="end"
        font-size="10"
        fill="var(--color-text-secondary)"
      >T0</text>

      <!-- Readouts row -->
      {@const readoutY = height + 32}
      <text x={MARGIN.left} y={readoutY} font-size="9" fill="var(--color-text-secondary)">
        <tspan font-size="8" text-transform="uppercase">Ra</tspan>
        <tspan dx="2" font-family="monospace" font-size="10" fill="var(--color-text)">{raDisplay}</tspan>
        <tspan dx="8" font-size="8" text-transform="uppercase">Rk</tspan>
        <tspan dx="2" font-family="monospace" font-size="10" fill="var(--color-text)">{rkDisplay}</tspan>
        <tspan dx="8" font-size="8" text-transform="uppercase">Rg</tspan>
        <tspan dx="2" font-family="monospace" font-size="10" fill="var(--color-text)">{rgDisplay}</tspan>
        <tspan dx="8" font-size="8" text-transform="uppercase">Ta</tspan>
        <tspan dx="2" font-family="monospace" font-size="10" fill="var(--color-text)">{taDisplay}</tspan>
        <tspan font-size="8">ms</tspan>
      </text>
    {/if}
  </svg>
</div>

<style>
  .pulse-container {
    width: 100%;
    min-height: 60px;
    overflow: hidden;
  }
</style>
