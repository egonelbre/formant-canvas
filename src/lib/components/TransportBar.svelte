<script lang="ts">
  import { voiceParams } from '../audio/state.svelte.ts';

  interface Props {
    onplayclick: () => void;
    bridgeInitialized?: boolean;
    expertMode?: boolean;
  }
  let { onplayclick, bridgeInitialized = false, expertMode = false }: Props = $props();
</script>

<div class="transport-bar">
  <button
    class="transport-btn play-btn"
    class:playing={voiceParams.playing}
    onclick={onplayclick}
  >
    {#if voiceParams.playing}
      &#x25A0;
    {:else if !bridgeInitialized}
      Start Audio
    {:else}
      &#x25B6;
    {/if}
  </button>

  <div class="volume-control">
    <div class="volume-header">
      <span class="label">Volume</span>
      <span class="readout">{Math.round(voiceParams.masterGain * 100)}%</span>
    </div>
    <input
      type="range"
      min="0"
      max="1"
      step="0.01"
      value={voiceParams.masterGain}
      oninput={(e: Event) => { voiceParams.masterGain = parseFloat((e.target as HTMLInputElement).value); }}
      class:muted={voiceParams.muted}
      style="touch-action: none;"
    />
  </div>

  <button
    class="transport-btn mute-btn"
    class:muted={voiceParams.muted}
    onclick={() => { voiceParams.muted = !voiceParams.muted; }}
  >
    {#if voiceParams.muted}
      &#x1F507;
    {:else}
      &#x1F50A;
    {/if}
  </button>
</div>

<style>
  .transport-bar {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm, 8px);
  }

  .transport-btn {
    width: 36px;
    height: 36px;
    min-width: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm, 6px);
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 16px;
    cursor: pointer;
  }

  .transport-btn:hover {
    background: var(--color-hover);
  }

  .play-btn {
    font-size: 13px;
    white-space: nowrap;
  }

  .play-btn.playing {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: #ffffff;
  }

  .play-btn:not(.playing) {
    width: auto;
    padding: 0 10px;
  }

  .mute-btn.muted {
    color: var(--color-muted);
  }

  .volume-control {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 80px;
    max-width: 140px;
  }

  .volume-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .label {
    font-size: 11px;
    font-weight: 600;
    line-height: 1.3;
    color: var(--color-text);
  }

  .readout {
    font-family: monospace;
    font-size: 12px;
    color: var(--color-text-secondary);
  }

  input[type="range"] {
    width: 100%;
    cursor: pointer;
  }

  input[type="range"].muted {
    opacity: 0.5;
  }
</style>
