<script lang="ts">
  import { voiceParams } from '../audio/state.svelte.ts';
  import LabeledSlider from './LabeledSlider.svelte';
</script>

<section class="expression-section">
  <h2 class="section-heading">Expression</h2>
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
  </div>
</section>

<style>
  .expression-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md, 16px);
  }

  .section-heading {
    font-size: 16px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--color-text, #e0e0e0);
    margin: 0;
  }

  .sliders {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md, 16px);
  }
</style>
