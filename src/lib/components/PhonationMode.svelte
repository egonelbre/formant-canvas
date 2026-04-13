<script lang="ts">
  import { voiceParams } from '../audio/state.svelte.ts';
  import { audioBridge } from '../audio/bridge.ts';
  import { PHONATION_PRESETS } from '../data/phonation-presets.ts';
  import type { PhonationMode, GlottalModel } from '../types.ts';
  import ChipGroup from './ChipGroup.svelte';
  import LabeledSlider from './LabeledSlider.svelte';
  import GlottalPulseVisual from './GlottalPulseVisual.svelte';

  interface Props {
    expertMode?: boolean;
  }
  let { expertMode = false }: Props = $props();

  // Phonation mode options
  const phonationOptions = Object.entries(PHONATION_PRESETS).map(([key, p]) => ({ key, label: p.label }));

  // Model toggle options (D-01)
  const modelOptions: { key: string; label: string }[] = [
    { key: 'rosenberg', label: 'Rosenberg' },
    { key: 'lf', label: 'LF' },
  ];

  // Rd slider dynamic label (D-04)
  let rdLabel = $derived(
    voiceParams.rd < 0.5 ? 'Pressed' :
    voiceParams.rd < 0.8 ? 'Tense' :
    voiceParams.rd < 1.3 ? 'Modal' :
    voiceParams.rd < 2.0 ? 'Relaxed' :
    'Breathy'
  );

  function loadMode(key: string) {
    const preset = PHONATION_PRESETS[key as PhonationMode];
    if (!preset) return;
    voiceParams.openQuotient = preset.openQuotient;
    voiceParams.aspirationLevel = preset.aspirationLevel;
    voiceParams.spectralTilt = preset.spectralTilt;
    voiceParams.phonationMode = key as PhonationMode;
    // When LF is active, also set Rd from preset (D-06)
    if (voiceParams.glottalModel === 'lf') {
      voiceParams.rd = preset.rd;
    }
  }

  function handleModelSwitch(key: string) {
    // CRITICAL per D-02: route through audioBridge.switchModel() for mute-fade
    audioBridge.switchModel(key as GlottalModel);
  }
</script>

<section class="phonation-section">
  <h2 class="section-heading">Phonation</h2>

  <!-- Model toggle (D-01): Rosenberg | LF -->
  <ChipGroup options={modelOptions} selected={voiceParams.glottalModel} onselect={handleModelSwitch} />

  <!-- Phonation mode buttons -->
  <ChipGroup options={phonationOptions} selected={voiceParams.phonationMode} onselect={loadMode} />

  <GlottalPulseVisual
    openQuotient={voiceParams.openQuotient}
    spectralTilt={voiceParams.spectralTilt}
    aspirationLevel={voiceParams.aspirationLevel}
    glottalModel={voiceParams.glottalModel}
    rd={voiceParams.rd}
    f0={voiceParams.f0}
  />

  {#if expertMode}
    <div class="expert-params">
      {#if voiceParams.glottalModel === 'lf'}
        <!-- LF mode: show Rd slider (D-03) -->
        <LabeledSlider label="Rd ({rdLabel})" min={0.3} max={2.7} step={0.01}
          value={voiceParams.rd} unit="" decimals={2}
          onchange={(v) => { voiceParams.rd = v; }} />
      {:else}
        <!-- Rosenberg mode: show OQ and Spectral Tilt (D-03) -->
        <LabeledSlider label="Open Quotient" min={0.2} max={0.9} step={0.01}
          value={voiceParams.openQuotient} unit="" decimals={2}
          onchange={(v) => { voiceParams.openQuotient = v; }} />
        <LabeledSlider label="Spectral Tilt" min={0} max={24} step={0.5}
          value={voiceParams.spectralTilt} unit="dB" decimals={1}
          onchange={(v) => { voiceParams.spectralTilt = v; }} />
      {/if}
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
