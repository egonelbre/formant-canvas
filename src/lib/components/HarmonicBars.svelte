<script lang="ts">
  import { voiceParams } from '../audio/state.svelte.ts';
  import { topologyAwareEnvelope } from '../audio/dsp/formant-response.ts';

  interface Props {
    freqToX: (freq: number) => number;
    barRegionHeight: number; // 72 (80px region minus 8px top margin)
    regionBottom: number;    // y coordinate of the bottom of the harmonic region
  }
  let { freqToX, barRegionHeight, regionBottom }: Props = $props();

  // Extended frequency range to show harmonics near F2-F4
  const MAX_FREQ = 5000;

  // Compute harmonic bars reactively from f0 and formants
  let harmonicBars = $derived.by(() => {
    const f0 = voiceParams.f0;
    const formants = voiceParams.formants;

    // Compute harmonics: n=1 to 48, break when freq > extended range
    const harmonics: { n: number; freq: number; amplitude: number }[] = [];
    for (let n = 1; n <= 48; n++) {
      const freq = f0 * n;
      if (freq > MAX_FREQ) break;
      const amplitude = topologyAwareEnvelope(freq, formants, voiceParams.filterTopology, voiceParams.filterOrder);
      harmonics.push({ n, freq, amplitude });
    }

    // Normalize by max amplitude
    let maxAmplitude = 0;
    for (const h of harmonics) {
      if (h.amplitude > maxAmplitude) maxAmplitude = h.amplitude;
    }
    if (maxAmplitude === 0) maxAmplitude = 1;

    // Compute bar geometry and labels
    const bars = harmonics.map(h => {
      const x = freqToX(h.freq);
      const barHeight = (h.amplitude / maxAmplitude) * barRegionHeight;
      const y = regionBottom - barHeight; // bars grow upward from key top
      return {
        n: h.n,
        x: x - 2, // center the 4px bar
        centerX: x,
        y,
        height: barHeight,
        fill: h.n === 1 ? '#2563eb' : '#333333',
        opacity: h.n === 1 ? 1.0 : 0.8,
        showLabel: false,
      };
    });

    // Determine which harmonics get labels — skip when too tight
    const MIN_LABEL_GAP = 20; // minimum px between labels
    let lastLabelX = -Infinity;
    for (const bar of bars) {
      if (bar.centerX - lastLabelX >= MIN_LABEL_GAP) {
        bar.showLabel = true;
        lastLabelX = bar.centerX;
      }
    }

    return bars;
  });
</script>

<g class="harmonic-bars">
  {#each harmonicBars as bar (bar.n)}
    <rect
      x={bar.x}
      y={bar.y}
      width={4}
      height={bar.height}
      fill={bar.fill}
      opacity={bar.opacity}
      pointer-events="none"
    />
    {#if bar.showLabel}
      <text
        x={bar.centerX}
        y={bar.y - 3}
        text-anchor="middle"
        font-size="9"
        fill={bar.n === 1 ? '#2563eb' : '#777777'}
        pointer-events="none"
      >{bar.n === 1 ? 'f\u2080' : bar.n + 'f\u2080'}</text>
    {/if}
  {/each}
</g>
