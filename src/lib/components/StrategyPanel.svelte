<script lang="ts">
  import { voiceParams } from '../audio/state.svelte.ts';
  import { R1_STRATEGIES, R2_STRATEGIES, R1_LIST, R2_LIST } from '../strategies/definitions.ts';
  import { pickStrategy } from '../strategies/auto-strategy.ts';
  import type { R1Strategy, R2Strategy, StrategyMode } from '../strategies/types.ts';

  const MODES: { key: StrategyMode; label: string }[] = [
    { key: 'off', label: 'Off' },
    { key: 'overlay', label: 'Overlay' },
    { key: 'locked', label: 'Locked' },
  ];

  function selectR1(id: R1Strategy | null) {
    voiceParams.autoStrategy = false;  // manual pick disables auto
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
      // Apply initial recommendation immediately
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
  <div class="strategy-header">
    <h2 class="section-heading">Vocal Strategy</h2>
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
    <span class="strategy-notation">Speech (untuned)</span>
    <span class="strategy-desc">No formant tracking — formants free</span>
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
    <p class="mode-hint">Formants auto-tune to match pitch. Drag to override temporarily — releases snap back.</p>
  {:else if voiceParams.strategyMode === 'overlay'}
    <p class="mode-hint">Target positions shown visually. Audio unchanged.</p>
  {/if}

  <div class="strategy-group">
    <h3 class="group-heading">R1 — First Formant</h3>
    <div class="strategy-list">
      {#each R1_LIST as id (id)}
        {@const def = R1_STRATEGIES[id]}
        <button
          class="strategy-btn"
          class:active={voiceParams.r1Strategy === id}
          onclick={() => selectR1(id)}
        >
          <span class="strategy-notation">{def.notation}</span>
          <span class="strategy-desc">{def.description}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="strategy-group">
    <h3 class="group-heading">R2 — Second Formant</h3>
    <div class="strategy-list">
      {#each R2_LIST as id (id)}
        {@const def = R2_STRATEGIES[id]}
        <button
          class="strategy-btn"
          class:active={voiceParams.r2Strategy === id}
          onclick={() => selectR2(id)}
        >
          <span class="strategy-notation">{def.notation}</span>
          <span class="strategy-desc">{def.description}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="strategy-group">
    <h3 class="group-heading">Singer's Formant</h3>
    <button
      class="strategy-btn singer-toggle"
      class:active={voiceParams.singerFormant}
      onclick={toggleSingerFormant}
    >
      <span class="strategy-notation">F3-F4-F5 Cluster</span>
      <span class="strategy-desc">Clusters F3/F4/F5 for projection ("ring")</span>
    </button>
  </div>
</section>

<style>
  .strategy-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md, 16px);
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
    padding: 4px 12px;
    font-size: 12px;
    border-radius: var(--radius-pill, 16px);
    background: var(--color-surface, #2a2a4a);
    border: 1px solid var(--color-border, #4a4a6a);
    color: var(--color-text-secondary, #8a8aaa);
    cursor: pointer;
  }

  .auto-btn:hover {
    background: var(--color-hover, #3a3a5a);
    color: var(--color-text, #e0e0e0);
  }

  .auto-btn.auto-active {
    background: var(--color-accent, #6366f1);
    border-color: var(--color-accent, #6366f1);
    color: #fff;
  }

  .mode-toggle {
    display: flex;
    gap: var(--spacing-sm, 8px);
  }

  .mode-chip {
    padding: 8px 16px;
    border-radius: var(--radius-pill, 16px);
    background: var(--color-surface, #2a2a4a);
    border: 1px solid var(--color-border, #4a4a6a);
    color: var(--color-text, #e0e0e0);
    font-size: 14px;
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s, color 0.1s;
  }

  .mode-chip:hover {
    background: var(--color-hover, #3a3a5a);
  }

  .mode-chip.selected {
    background: var(--color-active, #3a3a6a);
    border: 2px solid var(--color-accent, #6366f1);
    color: var(--color-accent, #6366f1);
    padding: 7px 15px;
  }

  .speech-btn {
    margin-bottom: var(--spacing-xs, 4px);
  }

  .mode-hint {
    font-size: 12px;
    color: var(--color-text-secondary, #8a8aaa);
    margin: 0;
    line-height: 1.4;
  }

  .strategy-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs, 4px);
  }

  .group-heading {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-secondary, #8a8aaa);
    margin: 0;
  }

  .strategy-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs, 4px);
  }

  .strategy-btn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    padding: 8px 12px;
    border-radius: var(--radius-sm, 6px);
    background: transparent;
    border: 1px solid transparent;
    color: var(--color-text, #e0e0e0);
    cursor: pointer;
    transition: background 0.1s;
    text-align: left;
  }

  .strategy-btn:hover {
    background: var(--color-hover, #3a3a5a);
  }

  .strategy-btn.active {
    background: var(--color-accent, #6366f1);
    color: #fff;
  }

  .strategy-notation {
    font-size: 14px;
    font-weight: 600;
  }

  .strategy-desc {
    font-size: 12px;
    opacity: 0.7;
  }
</style>
