<script lang="ts">
  import type { GlottalModel } from '../types.ts';
  import { computeLfParams, lfDerivativeSample } from '../audio/dsp/lf-model.ts';
  import LfDecomposition from './LfDecomposition.svelte';

  interface Props {
    openQuotient: number;
    spectralTilt: number;
    aspirationLevel: number;
    glottalModel?: GlottalModel;
    rd?: number;
    f0?: number;
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
    width = 200,
    height = 80,
  }: Props = $props();

  // Decomposition panel toggle
  let showDecomposition = $state(false);

  // Measure container
  let cWidth = $state(200);
  let cHeight = $state(80);

  const MARGIN = { left: 2, right: 2, top: 4, bottom: 4 };

  let plotW = $derived(cWidth - MARGIN.left - MARGIN.right);
  let plotH = $derived(cHeight - MARGIN.top - MARGIN.bottom);

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

  // Generate LF pulse samples for one period
  let lfPath = $derived.by(() => {
    const N = 200;
    const params = computeLfParams(rd, f0);
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
</script>

<div class="pulse-container" bind:clientWidth={cWidth} bind:clientHeight={cHeight}>
  <svg width={cWidth} height={cHeight} viewBox="0 0 {cWidth} {cHeight}">
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

    <!-- Labels -->
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
  </svg>

  {#if glottalModel === 'lf'}
    <button
      class="decomp-toggle"
      onclick={() => { showDecomposition = !showDecomposition; }}
    >
      <span class="decomp-chevron">{showDecomposition ? '\u25BC' : '\u25B6'}</span>
      LF Parameters
    </button>

    {#if showDecomposition}
      <LfDecomposition {rd} {f0} />
    {/if}
  {/if}
</div>

<style>
  .pulse-container {
    width: 100%;
    min-height: 60px;
    overflow: hidden;
  }

  .decomp-toggle {
    display: flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    padding: 2px 4px;
    cursor: pointer;
    font-size: 11px;
    color: var(--color-text-secondary);
    line-height: 1;
  }

  .decomp-toggle:hover {
    color: var(--color-text);
  }

  .decomp-chevron {
    font-size: 8px;
  }
</style>
