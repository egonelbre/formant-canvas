<script lang="ts">
  import { voiceParams } from '../audio/state.svelte.ts';
  import { R1_STRATEGIES, R2_STRATEGIES, R1_LIST, R2_LIST } from '../strategies/definitions.ts';
  import { pickStrategy } from '../strategies/auto-strategy.ts';
  import type { R1Strategy, R2Strategy, StrategyMode } from '../strategies/types.ts';

  interface Props {
    section?: 'all' | 'mode' | 'r1' | 'r2';
  }
  let { section = 'all' }: Props = $props();

  const MODES: { key: StrategyMode; label: string }[] = [
    { key: 'off', label: 'Off' },
    { key: 'overlay', label: 'Overlay' },
    { key: 'locked', label: 'Locked' },
  ];

  function selectR1(id: R1Strategy | null) {
    voiceParams.autoStrategy = false;
    voiceParams.r1Strategy = voiceParams.r1Strategy === id ? null : id;
  }

  function selectR2(id: R2Strategy | null) {
    voiceParams.autoStrategy = false;
    voiceParams.r2Strategy = voiceParams.r2Strategy === id ? null : id;
  }

  function toggleSingerFormant() {
    voiceParams.autoStrategy = false;
    voiceParams.singerFormant = !voiceParams.singerFormant;
  }

  function selectMode(mode: StrategyMode) {
    voiceParams.strategyMode = mode;
  }

  function clearAll() {
    voiceParams.autoStrategy = false;
    voiceParams.r1Strategy = null;
    voiceParams.r2Strategy = null;
    voiceParams.singerFormant = false;
    voiceParams.strategyMode = 'off';
  }

  let hasAnyStrategy = $derived(
    voiceParams.r1Strategy !== null ||
    voiceParams.r2Strategy !== null ||
    voiceParams.singerFormant
  );

  function toggleAuto() {
    voiceParams.autoStrategy = !voiceParams.autoStrategy;
    if (voiceParams.autoStrategy) {
      const rec = pickStrategy(voiceParams.f0, voiceParams.voicePreset ?? 'baritone');
      voiceParams.r1Strategy = rec.r1;
      voiceParams.r2Strategy = rec.r2;
      voiceParams.singerFormant = rec.singerFormant;
      if (voiceParams.strategyMode === 'off') {
        voiceParams.strategyMode = 'overlay';
      }
    }
  }
</script>

<section class="strategy-section">
  {#if section === 'all' || section === 'mode'}
    <div class="strategy-header">
      <h2 class="section-heading">Strategy</h2>
      <button
        class="auto-btn"
        class:auto-active={voiceParams.autoStrategy}
        onclick={toggleAuto}
      >{voiceParams.autoStrategy ? 'Auto ✓' : 'Auto'}</button>
    </div>

    <button
      class="strategy-btn speech-btn"
      class:active={!hasAnyStrategy}
      onclick={clearAll}
    >
      <span class="strategy-notation">Speech</span>
    </button>

    <div class="mode-toggle">
      {#each MODES as mode (mode.key)}
        <button
          class="mode-chip"
          class:selected={voiceParams.strategyMode === mode.key}
          onclick={() => selectMode(mode.key)}
        >
          {mode.label}
        </button>
      {/each}
    </div>

    {#if voiceParams.strategyMode === 'locked'}
      <p class="mode-hint">Auto-tune formants to pitch. Drag to override.</p>
    {:else if voiceParams.strategyMode === 'overlay'}
      <p class="mode-hint">Targets shown visually.</p>
    {/if}
  {/if}

  {#if section === 'all' || section === 'r1'}
    <div class="strategy-group">
      <h3 class="group-heading">R1</h3>
      <div class="strategy-list">
        {#each R1_LIST as id (id)}
          {@const def = R1_STRATEGIES[id]}
          <button
            class="strategy-btn"
            class:active={voiceParams.r1Strategy === id}
            onclick={() => selectR1(id)}
          >
            <span class="strategy-notation">{def.notation}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if section === 'all' || section === 'r2'}
    <div class="strategy-group">
      <h3 class="group-heading">R2</h3>
      <div class="strategy-list">
        {#each R2_LIST as id (id)}
          {@const def = R2_STRATEGIES[id]}
          <button
            class="strategy-btn"
            class:active={voiceParams.r2Strategy === id}
            onclick={() => selectR2(id)}
          >
            <span class="strategy-notation">{def.notation}</span>
          </button>
        {/each}
      </div>
    </div>

    <div class="strategy-group">
      <h3 class="group-heading">Singer's F</h3>
      <button
        class="strategy-btn singer-toggle"
        class:active={voiceParams.singerFormant}
        onclick={toggleSingerFormant}
      >
        <span class="strategy-notation">F3-F4-F5</span>
      </button>
    </div>
  {/if}
</section>

<style>
  .strategy-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs, 4px);
  }

  .strategy-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .section-heading {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--color-text);
    margin: 0;
  }

  .auto-btn {
    padding: 2px 8px;
    font-size: 11px;
    border-radius: var(--radius-pill, 16px);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text-secondary);
    cursor: pointer;
  }

  .auto-btn:hover {
    background: var(--color-hover);
    color: var(--color-text);
  }

  .auto-btn.auto-active {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: #fff;
  }

  .mode-toggle {
    display: flex;
    gap: var(--spacing-xs, 4px);
  }

  .mode-chip {
    padding: 4px 8px;
    border-radius: var(--radius-pill, 16px);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    font-size: 12px;
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s, color 0.1s;
  }

  .mode-chip:hover {
    background: var(--color-hover);
  }

  .mode-chip.selected {
    background: var(--color-active);
    border: 2px solid var(--color-accent);
    color: var(--color-accent);
    padding: 3px 7px;
  }

  .speech-btn {
    margin-bottom: 0;
  }

  .mode-hint {
    font-size: 11px;
    color: var(--color-text-secondary);
    margin: 0;
    line-height: 1.3;
  }

  .strategy-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .group-heading {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-secondary);
    margin: 0;
  }

  .strategy-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .strategy-btn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    padding: 4px 8px;
    border-radius: var(--radius-sm, 6px);
    background: transparent;
    border: 1px solid transparent;
    color: var(--color-text);
    cursor: pointer;
    transition: background 0.1s;
    text-align: left;
  }

  .strategy-btn:hover {
    background: var(--color-hover);
  }

  .strategy-btn.active {
    background: var(--color-accent);
    color: #fff;
  }

  .strategy-notation {
    font-size: 12px;
    font-weight: 600;
  }
</style>
