<script lang="ts">
  import { voiceParams } from '../audio/state.svelte.ts';
  import { VOICE_PRESETS } from '../data/voice-presets.ts';
  import ChipGroup from './ChipGroup.svelte';

  const options = Object.entries(VOICE_PRESETS).map(([key, p]) => ({ key, label: p.label }));

  function loadPreset(key: string) {
    const preset = VOICE_PRESETS[key];
    if (!preset) return;
    // Only change formant frequencies/bandwidths — preserve current pitch and phonation
    voiceParams.f1Freq = preset.f1; voiceParams.f1BW = preset.f1BW;
    voiceParams.f2Freq = preset.f2; voiceParams.f2BW = preset.f2BW;
    voiceParams.f3Freq = preset.f3; voiceParams.f3BW = preset.f3BW;
    voiceParams.f4Freq = preset.f4; voiceParams.f4BW = preset.f4BW;
    voiceParams.voicePreset = key;
  }
</script>

<section class="voice-section">
  <h2 class="section-heading">Voice</h2>
  <ChipGroup {options} selected={voiceParams.voicePreset} onselect={loadPreset} />
</section>

<style>
  .voice-section {
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
