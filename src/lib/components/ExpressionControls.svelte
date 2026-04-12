<script lang="ts">
  import { voiceParams } from '../audio/state.svelte.ts';
  import LabeledSlider from './LabeledSlider.svelte';

  interface Props {
    expertMode?: boolean;
  }
  let { expertMode = false }: Props = $props();
</script>

<div class="expression-controls">
  <div class="sliders">
    <LabeledSlider
      label="Vibrato Rate"
      min={0}
      max={10}
      step={0.1}
      value={voiceParams.vibratoRate}
      unit="Hz"
      decimals={1}
      onchange={(v) => { voiceParams.vibratoRate = v; }}
    />
    <LabeledSlider
      label="Vibrato Extent"
      min={0}
      max={100}
      step={1}
      value={voiceParams.vibratoExtent}
      unit="cents"
      decimals={0}
      onchange={(v) => { voiceParams.vibratoExtent = v; }}
    />
    {#if expertMode}
      <LabeledSlider
        label="Jitter"
        min={0}
        max={1}
        step={0.01}
        value={voiceParams.jitterAmount}
        unit=""
        decimals={2}
        onchange={(v) => { voiceParams.jitterAmount = v; }}
      />
    {/if}
  </div>
</div>

<style>
  .expression-controls {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md, 16px);
  }

  .sliders {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md, 16px);
  }
</style>
