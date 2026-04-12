<script lang="ts">
  import { voiceParams } from '../audio/state.svelte.ts';
  import { PHONATION_PRESETS } from '../data/phonation-presets.ts';
  import type { PhonationMode } from '../types.ts';
  import ChipGroup from './ChipGroup.svelte';
  import LabeledSlider from './LabeledSlider.svelte';

  interface Props {
    expertMode?: boolean;
  }
  let { expertMode = false }: Props = $props();

  const options = Object.entries(PHONATION_PRESETS).map(([key, p]) => ({ key, label: p.label }));

  function loadMode(key: string) {
    const preset = PHONATION_PRESETS[key as PhonationMode];
    if (!preset) return;
    voiceParams.openQuotient = preset.openQuotient;
    voiceParams.aspirationLevel = preset.aspirationLevel;
    voiceParams.spectralTilt = preset.spectralTilt;
    voiceParams.phonationMode = key as PhonationMode;
  }
</script>

<section class="phonation-section">
  <h2 class="section-heading">Phonation</h2>
  <ChipGroup {options} selected={voiceParams.phonationMode} onselect={loadMode} />

  {#if expertMode}
    <div class="expert-params">
      <LabeledSlider label="Open Quotient" min={0.2} max={0.9} step={0.01}
        value={voiceParams.openQuotient} unit="" decimals={2}
        onchange={(v) => { voiceParams.openQuotient = v; }} />
      <LabeledSlider label="Spectral Tilt" min={0} max={24} step={0.5}
        value={voiceParams.spectralTilt} unit="dB" decimals={1}
        onchange={(v) => { voiceParams.spectralTilt = v; }} />
      <LabeledSlider label="Aspiration" min={0} max={0.5} step={0.01}
        value={voiceParams.aspirationLevel} unit="" decimals={2}
        onchange={(v) => { voiceParams.aspirationLevel = v; }} />
    </div>
  {/if}
</section>

<style>
  .phonation-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md, 16px);
  }

  .section-heading {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--color-text);
    margin: 0;
  }

  .expert-params {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm, 8px);
  }
</style>
