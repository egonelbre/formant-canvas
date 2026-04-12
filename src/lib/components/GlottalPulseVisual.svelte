<script lang="ts">
  interface Props {
    openQuotient: number;
    spectralTilt: number;
    aspirationLevel: number;
    width?: number;
    height?: number;
  }
  let {
    openQuotient,
    spectralTilt,
    aspirationLevel,
    width = 200,
    height = 80,
  }: Props = $props();

  // Measure container
  let cWidth = $state(200);
  let cHeight = $state(80);

  const MARGIN = { left: 2, right: 2, top: 4, bottom: 4 };

  let plotW = $derived(cWidth - MARGIN.left - MARGIN.right);
  let plotH = $derived(cHeight - MARGIN.top - MARGIN.bottom);

  // Generate Rosenberg pulse samples for one period
  let pulsePath = $derived.by(() => {
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
      // Higher tilt = rounder waveform (visual approximation)
      const tiltFactor = 1 - spectralTilt / 48;
      sample = sample * tiltFactor + sample * sample * (1 - tiltFactor);

      const x = MARGIN.left + (i / N) * plotW;
      const y = MARGIN.top + (1 - sample) * plotH;
      points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return points.join(' ');
  });

  // Open/closed phase boundary lines
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

    <!-- Open phase region -->
    <rect
      x={MARGIN.left}
      y={MARGIN.top}
      width={openEnd - MARGIN.left}
      height={plotH}
      fill="var(--color-accent)"
      opacity="0.06"
    />

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
        x1={openEnd} y1={noiseY - 2}
        x2={MARGIN.left + plotW} y2={noiseY - 2}
        stroke="var(--color-text-secondary)"
        stroke-width={Math.max(0.5, aspirationLevel * 6)}
        stroke-dasharray="2,2"
        opacity="0.5"
      />
    {/if}

    <!-- Labels -->
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
  </svg>
</div>

<style>
  .pulse-container {
    width: 100%;
    height: 100%;
    min-height: 40px;
  }
</style>
