<script lang="ts">
  import { voiceParams } from '../audio/state.svelte.ts';
  import { VOICE_PRESETS } from '../data/voice-presets.ts';
  import ChipGroup from './ChipGroup.svelte';

  interface Props {
    expertMode?: boolean;
  }
  let { expertMode = false }: Props = $props();

  const options = Object.entries(VOICE_PRESETS).map(([key, p]) => ({ key, label: p.label }));

  function loadPreset(key: string) {
    const preset = VOICE_PRESETS[key];
    if (!preset) return;
    // Only change formant frequencies/bandwidths — preserve current pitch and phonation
    voiceParams.f1Freq = preset.f1; voiceParams.f1BW = preset.f1BW;
    voiceParams.f2Freq = preset.f2; voiceParams.f2BW = preset.f2BW;
    voiceParams.f3Freq = preset.f3; voiceParams.f3BW = preset.f3BW;
    voiceParams.f4Freq = preset.f4; voiceParams.f4BW = preset.f4BW;
    // F5 not in preset data — derive from F4 (typical F5 ≈ F4 * 1.2)
    voiceParams.f5Freq = Math.round(preset.f4 * 1.2);
    voiceParams.f5BW = Math.round(preset.f4BW * 1.1);
    voiceParams.voicePreset = key;
  }
</script>

<div class="voice-chips">
  <ChipGroup {options} selected={voiceParams.voicePreset} onselect={loadPreset} />
</div>

<style>
  .voice-chips {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm, 8px);
  }
</style>
