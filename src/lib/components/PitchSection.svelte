<script lang="ts">
  import { voiceParams } from '../audio/state.svelte.ts';
  import { formatPitchReadout, midiToHz } from '../audio/dsp/pitch-utils.ts';
  import { QWERTY_MAP } from '../data/qwerty-map.ts';
  import PianoKeyboard from './PianoKeyboard.svelte';

  interface Props {
    pressedKeys?: Set<string>;
  }
  let { pressedKeys = new Set() }: Props = $props();

  let showQwertyLabels = $state(false);

  // Compute which MIDI note is closest to current f0 for highlight
  let highlightMidi = $derived(Math.round(69 + 12 * Math.log2(voiceParams.f0 / 440)));

  // Parse readout into parts for accent coloring on note name
  let readoutParts = $derived.by(() => {
    const readout = formatPitchReadout(voiceParams.f0);
    // Format: "220 Hz . A3 . +0c"
    const parts = readout.split(' . ');
    return {
      hz: parts[0] || '',
      note: parts[1] || '',
      cents: parts[2] || '',
    };
  });

  function handleKeyClick(midi: number) {
    voiceParams.f0 = midiToHz(midi);
  }
</script>

<section class="pitch-section">
  <div class="section-header">
    <h2 class="section-heading">Pitch</h2>
    <button
      class="qwerty-toggle"
      onclick={() => { showQwertyLabels = !showQwertyLabels; }}
      title={showQwertyLabels ? 'Hide keyboard shortcuts' : 'Show keyboard shortcuts'}
    >&#x2328;</button>
  </div>

  <PianoKeyboard
    startMidi={48}
    endMidi={71}
    {highlightMidi}
    {pressedKeys}
    showLabels={showQwertyLabels}
    qwertyMap={QWERTY_MAP}
    onkeyclick={handleKeyClick}
  />

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
    gap: var(--spacing-md, 16px);
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .section-heading {
    font-size: 16px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--color-text, #e0e0e0);
    margin: 0;
  }

  .qwerty-toggle {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-border, #4a4a6a);
    border-radius: var(--radius-sm, 6px);
    background: var(--color-surface, #2a2a4a);
    color: var(--color-text-secondary, #8a8aaa);
    font-size: 16px;
    cursor: pointer;
  }

  .qwerty-toggle:hover {
    background: var(--color-hover, #3a3a5a);
  }

  .pitch-readout {
    font-family: monospace;
    font-size: 14px;
    font-weight: 400;
    line-height: 1.0;
    color: var(--color-text, #e0e0e0);
    text-align: center;
  }

  .separator {
    color: var(--color-text-secondary, #8a8aaa);
  }

  .note-name {
    color: var(--color-accent, #6366f1);
    font-weight: 600;
  }
</style>
