<script lang="ts">
  import { voiceParams } from '../audio/state.svelte.ts';
  import { STRATEGY_PRESETS, STRATEGY_DEFINITIONS } from '../strategies/definitions.ts';
  import { pickStrategy } from '../strategies/auto-strategy.ts';
  import type { StrategyId, StrategyMode } from '../strategies/types.ts';

  const MODES: { key: StrategyMode; label: string }[] = [
    { key: 'off', label: 'Off' },
    { key: 'overlay', label: 'Overlay' },
    { key: 'locked', label: 'Locked' },
  ];

  function selectStrategy(id: StrategyId) {
    voiceParams.strategyId = id;
  }

  function selectMode(mode: StrategyMode) {
    voiceParams.strategyMode = mode;
  }

  function selectAuto() {
    const id = pickStrategy(voiceParams.f0, voiceParams.voicePreset ?? 'baritone');
    voiceParams.strategyId = id;
  }
</script>

<section class="strategy-section">
  <div class="strategy-header">
    <h2 class="section-heading">Vocal Strategy</h2>
    <button class="auto-btn" onclick={selectAuto}>Auto</button>
  </div>

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

  <div class="strategy-list">
    {#each STRATEGY_PRESETS as preset (preset.label)}
      {@const def = STRATEGY_DEFINITIONS[preset.id]}
      {@const isActive = voiceParams.strategyId === preset.id}
      <button
        class="strategy-btn"
        class:active={isActive}
        onclick={() => selectStrategy(preset.id)}
      >
        <span class="strategy-notation">
          {#if preset.r1Strategy && preset.r2Strategy}
            {STRATEGY_DEFINITIONS[preset.r1Strategy].notation} + {STRATEGY_DEFINITIONS[preset.r2Strategy].notation}
          {:else}
            {def.notation}
          {/if}
        </span>
        <span class="strategy-desc">{def.description}</span>
      </button>
    {/each}
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
    font-size: 16px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--color-text, #e0e0e0);
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
