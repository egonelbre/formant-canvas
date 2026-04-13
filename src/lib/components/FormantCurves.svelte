<script lang="ts">
  import { tweened } from 'svelte/motion';
  import { voiceParams } from '../audio/state.svelte.ts';
  import { formantMagnitude, topologyAwareEnvelope } from '../audio/dsp/formant-response.ts';

  interface Props {
    freqToX: (freq: number) => number;
    curveRegionHeight: number; // 72 (same as bar region)
    regionBottom: number;      // y coordinate of the bottom of the harmonic region
  }
  let { freqToX, curveRegionHeight, regionBottom }: Props = $props();

  // Formant colors (per UI-SPEC)
  const FORMANT_COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#ec4899']; // F1-F5
  const FORMANT_LABELS = ['R1', 'R2', 'R3', 'R4', 'R5'];

  // Frequency range: C2 (~65 Hz) extended to 5kHz to show F2-F4
  const MIN_FREQ = 65;
  const MAX_FREQ = 5000;
  const SAMPLE_COUNT = 200;

  // Compute response curves -- topology-aware
  let curveData = $derived.by(() => {
    const formants = voiceParams.formants;
    const topology = voiceParams.filterTopology;
    const order = voiceParams.filterOrder;

    // Sample frequencies linearly across range
    const freqs: number[] = [];
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      freqs.push(MIN_FREQ + (i / (SAMPLE_COUNT - 1)) * (MAX_FREQ - MIN_FREQ));
    }

    const curves: { points: { x: number; y: number }[]; color: string; label: string }[] = [];

    if (topology === 'cascade') {
      // Cascade: single combined envelope curve (product of all formants)
      const amps: number[] = [];
      let maxAmp = 0;
      for (const freq of freqs) {
        const amp = topologyAwareEnvelope(freq, formants, 'cascade', order);
        amps.push(amp);
        if (amp > maxAmp) maxAmp = amp;
      }
      if (maxAmp === 0) maxAmp = 1;

      const points: { x: number; y: number }[] = [];
      for (let i = 0; i < SAMPLE_COUNT; i++) {
        const x = freqToX(freqs[i]);
        const y = regionBottom - (amps[i] / maxAmp) * curveRegionHeight;
        points.push({ x, y });
      }
      curves.push({ points, color: '#ffffff', label: 'Cascade' });
    } else {
      // Parallel: individual per-formant curves
      let globalMax = 0;
      const allAmplitudes: number[][] = [];
      for (let fi = 0; fi < formants.length; fi++) {
        const amps: number[] = [];
        for (const freq of freqs) {
          let amp = formantMagnitude(freq, formants[fi]);
          if (order === 4) amp = amp * amp;
          amps.push(amp);
          if (amp > globalMax) globalMax = amp;
        }
        allAmplitudes.push(amps);
      }
      if (globalMax === 0) globalMax = 1;

      for (let fi = 0; fi < formants.length; fi++) {
        const points: { x: number; y: number }[] = [];
        for (let i = 0; i < SAMPLE_COUNT; i++) {
          const x = freqToX(freqs[i]);
          const y = regionBottom - (allAmplitudes[fi][i] / globalMax) * curveRegionHeight;
          points.push({ x, y });
        }
        curves.push({
          points,
          color: FORMANT_COLORS[fi],
          label: FORMANT_LABELS[fi],
        });
      }
    }

    return curves;
  });

  // Build SVG path string from points
  function buildPath(points: { x: number; y: number }[]): string {
    if (points.length === 0) return '';
    let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x.toFixed(1)},${points[i].y.toFixed(1)}`;
    }
    return d;
  }

  // Match audio smoothing: setTargetAtTime(_, _, 0.06) reaches ~95% in 180ms
  const TWEEN_DURATION = 180;

  // Tweened x positions for formant center markers (named individually for Svelte $ syntax)
  const tweenedF1X = tweened(0, { duration: TWEEN_DURATION });
  const tweenedF2X = tweened(0, { duration: TWEEN_DURATION });
  const tweenedF3X = tweened(0, { duration: TWEEN_DURATION });
  const tweenedF4X = tweened(0, { duration: TWEEN_DURATION });
  const tweenedF5X = tweened(0, { duration: TWEEN_DURATION });
  const tweenedStores = [tweenedF1X, tweenedF2X, tweenedF3X, tweenedF4X, tweenedF5X];

  // Update tweened positions when formant frequencies change
  $effect(() => {
    const formants = voiceParams.formants;
    for (let fi = 0; fi < formants.length; fi++) {
      const freq = formants[fi].freq;
      if (freq >= MIN_FREQ && freq <= MAX_FREQ) {
        tweenedStores[fi].set(freqToX(freq));
      }
    }
  });

  // Formant center markers (dashed vertical lines at F1-F5 center frequencies)
  let centerMarkers = $derived.by(() => {
    const formants = voiceParams.formants;
    const xs = [$tweenedF1X, $tweenedF2X, $tweenedF3X, $tweenedF4X, $tweenedF5X];
    const markers: { x: number; color: string; label: string; visible: boolean }[] = [];
    for (let fi = 0; fi < formants.length; fi++) {
      const freq = formants[fi].freq;
      const visible = freq >= MIN_FREQ && freq <= MAX_FREQ;
      markers.push({
        x: visible ? xs[fi] : 0,
        color: FORMANT_COLORS[fi],
        label: FORMANT_LABELS[fi],
        visible,
      });
    }
    return markers;
  });
</script>

<g class="formant-curves">
  <!-- Response curves -->
  {#each curveData as curve, i (i)}
    <path
      d={buildPath(curve.points)}
      stroke={curve.color}
      stroke-width="2"
      fill="none"
      opacity="0.7"
      pointer-events="none"
    />
  {/each}

  <!-- Center frequency markers (dashed lines + labels) -->
  {#each centerMarkers as marker, i (i)}
    {#if marker.visible}
      <line
        x1={marker.x}
        y1={regionBottom - curveRegionHeight}
        x2={marker.x}
        y2={regionBottom}
        stroke={marker.color}
        stroke-width="2"
        stroke-dasharray="2 2"
        opacity="0.5"
        pointer-events="none"
      />
      <text
        x={marker.x}
        y={14}
        text-anchor="middle"
        font-size="11"
        font-weight="600"
        fill={marker.color}
        pointer-events="none"
      >{marker.label}</text>
    {/if}
  {/each}
</g>
