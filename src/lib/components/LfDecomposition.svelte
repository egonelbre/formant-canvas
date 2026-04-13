<script lang="ts">
  import { rdToDecomposition, computeLfParams, lfDerivativeSample } from '../audio/dsp/lf-model.ts';

  interface Props {
    rd: number;
    f0: number;
  }
  let { rd, f0 }: Props = $props();

  // Reactive decomposition from Rd
  let decomp = $derived(rdToDecomposition(rd, f0));
  let params = $derived(computeLfParams(rd, f0));

  // Responsive width
  let containerWidth = $state(300);

  const SVG_HEIGHT = 120;
  const MARGIN = { left: 40, right: 10, top: 10, bottom: 25 };

  let plotW = $derived(containerWidth - MARGIN.left - MARGIN.right);
  let plotH = $derived(SVG_HEIGHT - MARGIN.top - MARGIN.bottom);

  // Generate 300 sample points and normalize
  let waveformData = $derived.by(() => {
    const N = 300;
    const p = params;
    const samples: number[] = [];

    for (let i = 0; i <= N; i++) {
      const t = (i / N) * p.T0;
      samples.push(lfDerivativeSample(t, p));
    }

    let minVal = Infinity;
    let maxVal = -Infinity;
    for (const s of samples) {
      if (s < minVal) minVal = s;
      if (s > maxVal) maxVal = s;
    }
    const range = maxVal - minVal || 1;

    return { samples, minVal, maxVal, range, count: N };
  });

  // SVG path for the waveform
  let waveformPath = $derived.by(() => {
    const { samples, minVal, range, count } = waveformData;
    const points: string[] = [];
    for (let i = 0; i <= count; i++) {
      const normalized = (samples[i] - minVal) / range;
      const x = MARGIN.left + (i / count) * plotW;
      const y = MARGIN.top + (1 - normalized) * plotH;
      points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return points.join(' ');
  });

  // Timing marker x positions (fraction of T0 mapped to plot)
  let tpX = $derived(MARGIN.left + (params.Tp / params.T0) * plotW);
  let teX = $derived(MARGIN.left + (params.Te / params.T0) * plotW);
  let taEndX = $derived(MARGIN.left + (Math.min(params.Te + params.Ta, params.T0) / params.T0) * plotW);
  let t0X = $derived(MARGIN.left + plotW);

  // Formatted readout values
  let raDisplay = $derived(decomp.Ra.toFixed(3));
  let rkDisplay = $derived(decomp.Rk.toFixed(3));
  let rgDisplay = $derived(decomp.Rg.toFixed(2));
  let taDisplay = $derived((decomp.Ta * 1000).toFixed(2));

  // Label y position (below plot area)
  const labelY = SVG_HEIGHT - 4;
  // Bracket y position for Ta
  let bracketY = $derived(MARGIN.top + plotH * 0.9);
</script>

<div class="lf-decomposition">
  <div class="waveform-container" bind:clientWidth={containerWidth}>
    <svg width={containerWidth} height={SVG_HEIGHT} viewBox="0 0 {containerWidth} {SVG_HEIGHT}">
      <!-- Baseline at zero -->
      {@const zeroY = MARGIN.top + (1 - (0 - waveformData.minVal) / waveformData.range) * plotH}
      <line
        x1={MARGIN.left} y1={zeroY}
        x2={MARGIN.left + plotW} y2={zeroY}
        stroke="var(--color-border)" stroke-width="0.5"
      />

      <!-- Waveform path -->
      <path
        d={waveformPath}
        stroke="var(--color-text)"
        stroke-width="1.5"
        fill="none"
      />

      <!-- Tp marker (max flow) -->
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

      <!-- Te marker (closure instant) -->
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

      <!-- Ta bracket (return phase duration) -->
      <line
        x1={teX} y1={bracketY}
        x2={taEndX} y2={bracketY}
        stroke="var(--color-text-secondary)"
        stroke-width="1"
      />
      <!-- Bracket end caps -->
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
      <!-- Ta label -->
      <text
        x={(teX + taEndX) / 2} y={bracketY - 5}
        text-anchor="middle"
        font-size="9"
        fill="var(--color-text-secondary)"
      >Ta</text>

      <!-- T0 label at end -->
      <text
        x={t0X} y={labelY}
        text-anchor="end"
        font-size="10"
        fill="var(--color-text-secondary)"
      >T0</text>
    </svg>
  </div>

  <!-- Numeric readouts -->
  <div class="readouts">
    <div class="readout">
      <span class="readout-label">Ra</span>
      <span class="readout-value">{raDisplay}</span>
    </div>
    <div class="readout-divider"></div>
    <div class="readout">
      <span class="readout-label">Rk</span>
      <span class="readout-value">{rkDisplay}</span>
    </div>
    <div class="readout-divider"></div>
    <div class="readout">
      <span class="readout-label">Rg</span>
      <span class="readout-value">{rgDisplay}</span>
    </div>
    <div class="readout-divider"></div>
    <div class="readout">
      <span class="readout-label">Ta</span>
      <span class="readout-value">{taDisplay}<span class="readout-unit">ms</span></span>
    </div>
  </div>
</div>

<style>
  .lf-decomposition {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .waveform-container {
    width: 100%;
    overflow: hidden;
  }

  .readouts {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
  }

  .readout {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }

  .readout-label {
    font-size: 9px;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .readout-value {
    font-size: 11px;
    font-family: monospace;
    color: var(--color-text);
  }

  .readout-unit {
    font-size: 9px;
    color: var(--color-text-secondary);
    margin-left: 1px;
  }

  .readout-divider {
    width: 1px;
    height: 12px;
    background: var(--color-border);
  }
</style>
