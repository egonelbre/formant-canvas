<script lang="ts">
  import { voiceParams } from '../audio/state.svelte.ts';
  import { formantMagnitude } from '../audio/dsp/formant-response.ts';

  interface Props {
    freqToX: (freq: number) => number;
    curveRegionHeight: number; // 72 (same as bar region)
  }
  let { freqToX, curveRegionHeight }: Props = $props();

  // Formant colors (per UI-SPEC)
  const FORMANT_COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7']; // F1-F4
  const FORMANT_LABELS = ['R1', 'R2', 'R3', 'R4'];

  // Frequency range: C2 (~65 Hz) extended to 5kHz to show F2-F4
  const MIN_FREQ = 65;
  const MAX_FREQ = 5000;
  const SAMPLE_COUNT = 200;

  // Compute response curves -- only recompute when formant params change
  let curveData = $derived.by(() => {
    const formants = voiceParams.formants;

    // Sample frequencies linearly across range
    const freqs: number[] = [];
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      freqs.push(MIN_FREQ + (i / (SAMPLE_COUNT - 1)) * (MAX_FREQ - MIN_FREQ));
    }

    // Compute magnitude for each formant at each frequency
    const curves: { points: { x: number; y: number }[]; color: string; label: string }[] = [];

    // Find global max across all formants and frequencies for normalization
    let globalMax = 0;
    const allAmplitudes: number[][] = [];
    for (let fi = 0; fi < formants.length; fi++) {
      const amps: number[] = [];
      for (const freq of freqs) {
        const amp = formantMagnitude(freq, formants[fi]);
        amps.push(amp);
        if (amp > globalMax) globalMax = amp;
      }
      allAmplitudes.push(amps);
    }
    if (globalMax === 0) globalMax = 1;

    // Build path points for each formant
    for (let fi = 0; fi < formants.length; fi++) {
      const points: { x: number; y: number }[] = [];
      for (let i = 0; i < SAMPLE_COUNT; i++) {
        const x = freqToX(freqs[i]);
        const y = 80 - (allAmplitudes[fi][i] / globalMax) * curveRegionHeight;
        points.push({ x, y });
      }
      curves.push({
        points,
        color: FORMANT_COLORS[fi],
        label: FORMANT_LABELS[fi],
      });
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

  // Formant center markers (dashed vertical lines at F1-F4 center frequencies)
  let centerMarkers = $derived.by(() => {
    const formants = voiceParams.formants;
    const markers: { x: number; color: string; label: string; visible: boolean }[] = [];
    for (let fi = 0; fi < formants.length; fi++) {
      const freq = formants[fi].freq;
      const visible = freq >= MIN_FREQ && freq <= MAX_FREQ;
      markers.push({
        x: visible ? freqToX(freq) : 0,
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
        y1={8}
        x2={marker.x}
        y2={80}
        stroke={marker.color}
        stroke-width="2"
        stroke-dasharray="2 2"
        opacity="0.5"
        pointer-events="none"
      />
      <text
        x={marker.x}
        y={6}
        text-anchor="middle"
        font-size="11"
        font-weight="600"
        fill={marker.color}
        pointer-events="none"
      >{marker.label}</text>
    {/if}
  {/each}
</g>
