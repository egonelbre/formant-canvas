<script lang="ts">
  interface Props {
    rate: number;
    extent: number;
    width?: number;
    height?: number;
  }
  let { rate, extent, width = 160, height = 40 }: Props = $props();

  const NUM_POINTS = 32;

  let points = $derived.by(() => {
    const amplitude = (extent / 100) * (height / 2 - 4);
    const mid = height / 2;
    const pts: string[] = [];

    for (let i = 0; i <= NUM_POINTS; i++) {
      const x = (i / NUM_POINTS) * width;
      const y = extent === 0
        ? mid
        : mid - amplitude * Math.sin(2 * Math.PI * i / NUM_POINTS);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }

    return pts.join(' ');
  });
</script>

<svg
  {width}
  {height}
  viewBox="0 0 {width} {height}"
  class="vibrato-visual"
  aria-label="Vibrato waveform: {rate.toFixed(1)} Hz, {extent} cents"
>
  <polyline
    {points}
    fill="none"
    stroke="var(--color-accent, #6366f1)"
    stroke-width="1.5"
  />
  <text
    x="2"
    y={height - 2}
    class="vibrato-label"
  >{rate.toFixed(1)} Hz</text>
  <text
    x={width - 2}
    y={height - 2}
    class="vibrato-label"
    text-anchor="end"
  >{extent}c</text>
</svg>

<style>
  .vibrato-visual {
    display: block;
  }

  .vibrato-label {
    font-size: 10px;
    fill: var(--color-text-secondary, #8a8aaa);
    font-family: system-ui, -apple-system, sans-serif;
  }
</style>
