<script lang="ts">
  import { voiceParams } from '../audio/state.svelte.ts';
  import { PHONATION_PRESETS } from '../data/phonation-presets.ts';
  import type { PhonationMode } from '../types.ts';
  import ChipGroup from './ChipGroup.svelte';

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
</section>

<style>
  .phonation-section {
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
</style>
