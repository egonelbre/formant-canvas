<script lang="ts">
  import { voiceParams } from '../audio/state.svelte.ts';
  import { formatPitchReadout } from '../audio/dsp/pitch-utils.ts';

  interface Props {
    expertMode?: boolean;
  }
  let { expertMode = false }: Props = $props();

  let readoutParts = $derived.by(() => {
    const readout = formatPitchReadout(voiceParams.f0);
    const parts = readout.split(' . ');
    return {
      hz: parts[0] || '',
      note: parts[1] || '',
      cents: parts[2] || '',
    };
  });
</script>

<section class="pitch-section">
  <h2 class="section-heading">Pitch</h2>
  <div class="pitch-readout">
    <span>{readoutParts.hz}</span>
    <span class="separator"> . </span>
    <span class="note-name">{readoutParts.note}</span>
    <span class="separator"> . </span>
    <span>{readoutParts.cents}</span>
  </div>
</section>

<style>
  .pitch-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs, 4px);
  }

  .section-heading {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--color-text);
    margin: 0;
  }

  .pitch-readout {
    font-family: monospace;
    font-size: 13px;
    font-weight: 400;
    line-height: 1.0;
    color: var(--color-text);
    text-align: center;
  }

  .separator {
    color: var(--color-text-secondary);
  }

  .note-name {
    color: var(--color-accent);
    font-weight: 600;
  }
</style>
