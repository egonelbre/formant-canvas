<script lang="ts">
  import { voiceParams } from '../audio/state.svelte.ts';
  import { spectralEnvelope } from '../audio/dsp/formant-response.ts';

  interface Props {
    freqToX: (freq: number) => number;
    barRegionHeight: number; // 72 (80px region minus 8px top margin)
  }
  let { freqToX, barRegionHeight }: Props = $props();

  // Max frequency for B6 (~1976 Hz)
  const MAX_FREQ = 1976;

  // Compute harmonic bars reactively from f0 and formants
  let harmonicBars = $derived.by(() => {
    const f0 = voiceParams.f0;
    const formants = voiceParams.formants;

    // Compute harmonics: n=1 to 24, break when freq > B6
    const harmonics: { n: number; freq: number; amplitude: number }[] = [];
    for (let n = 1; n <= 24; n++) {
      const freq = f0 * n;
      if (freq > MAX_FREQ) break;
      const amplitude = spectralEnvelope(freq, formants);
      harmonics.push({ n, freq, amplitude });
    }

    // Normalize by max amplitude
    let maxAmplitude = 0;
    for (const h of harmonics) {
      if (h.amplitude > maxAmplitude) maxAmplitude = h.amplitude;
    }
    if (maxAmplitude === 0) maxAmplitude = 1;

    // Compute bar geometry
    return harmonics.map(h => {
      const x = freqToX(h.freq);
      const barHeight = (h.amplitude / maxAmplitude) * barRegionHeight;
      const y = 80 - barHeight; // bars grow upward from key top at y=80
      return {
        n: h.n,
        x: x - 2, // center the 4px bar
        y,
        height: barHeight,
        fill: h.n === 1 ? '#6366f1' : '#e0e0e0',
        opacity: h.n === 1 ? 1.0 : 0.8,
      };
    });
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
  {/each}
</g>
