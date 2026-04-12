<script lang="ts">
  import { voiceParams } from '../audio/state.svelte.ts';

  interface Props {
    onplayclick: () => void;
    bridgeInitialized?: boolean;
  }
  let { onplayclick, bridgeInitialized = false }: Props = $props();
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
    gap: var(--spacing-md, 16px);
  }

  .transport-btn {
    width: 44px;
    height: 44px;
    min-width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-border, #4a4a6a);
    border-radius: var(--radius-sm, 6px);
    background: var(--color-surface, #2a2a4a);
    color: var(--color-text, #e0e0e0);
    font-size: 18px;
    cursor: pointer;
  }

  .transport-btn:hover {
    background: var(--color-hover, #3a3a5a);
  }

  .play-btn {
    font-size: 14px;
    white-space: nowrap;
  }

  .play-btn.playing {
    background: var(--color-accent, #6366f1);
    border-color: var(--color-accent, #6366f1);
  }

  .play-btn:not(.playing) {
    /* When showing "Start Audio" text, allow wider button */
    width: auto;
    padding: 0 12px;
  }

  .mute-btn.muted {
    color: var(--color-muted, #ef4444);
  }

  .volume-control {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .volume-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .label {
    font-size: 12px;
    font-weight: 600;
    line-height: 1.3;
    color: var(--color-text, #e0e0e0);
  }

  .readout {
    font-family: monospace;
    font-size: 14px;
    color: var(--color-text-secondary, #8a8aaa);
  }

  input[type="range"] {
    width: 100%;
    cursor: pointer;
  }

  input[type="range"].muted {
    opacity: 0.5;
  }
</style>
