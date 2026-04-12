<script lang="ts">
  import { voiceParams } from '../audio/state.svelte.ts';
  import { R1_STRATEGIES, R2_STRATEGIES, R1_LIST, R2_LIST } from '../strategies/definitions.ts';
  import { pickStrategy } from '../strategies/auto-strategy.ts';
  import type { R1Strategy, R2Strategy, StrategyMode } from '../strategies/types.ts';

  interface Props {
    section?: 'all' | 'mode' | 'r1' | 'r2';
  }
  let { section = 'all' }: Props = $props();

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
    voiceParams.autoStrategy = false;
    voiceParams.strategyMode = mode;
  }

  function selectSpeech() {
    voiceParams.autoStrategy = false;
    voiceParams.r1Strategy = null;
    voiceParams.r2Strategy = null;
    voiceParams.singerFormant = false;
    voiceParams.strategyMode = 'off';
  }

  function selectAuto() {
    voiceParams.autoStrategy = true;
    voiceParams.strategyMode = 'locked';
    const rec = pickStrategy(voiceParams.f0, voiceParams.voicePreset ?? 'baritone');
    voiceParams.r1Strategy = rec.r1;
    voiceParams.r2Strategy = rec.r2;
    voiceParams.singerFormant = rec.singerFormant;
  }

</script>

<section class="strategy-section">
  {#if section === 'all' || section === 'mode'}
    <h2 class="section-heading">Strategy</h2>
    <div class="option-list">
      <button class="option clear-btn" onclick={selectSpeech}>
        Clear
      </button>
      <button class="option" class:active={voiceParams.strategyMode === 'off' && !voiceParams.autoStrategy} onclick={() => selectMode('off')}>
        Manual
      </button>
      <button class="option" class:active={voiceParams.strategyMode === 'overlay' && !voiceParams.autoStrategy} onclick={() => selectMode('overlay')}>
        Overlay
      </button>
      <button class="option" class:active={voiceParams.strategyMode === 'locked' && !voiceParams.autoStrategy} onclick={() => selectMode('locked')} title="Formants auto-tune to match pitch. Drag to override temporarily — snaps back on release.">
        Locked
      </button>
      <button class="option" class:active={voiceParams.autoStrategy} onclick={selectAuto}>
        Auto
      </button>
    </div>
  {/if}

  {#if section === 'all' || section === 'r1'}
    <h3 class="group-heading">R1</h3>
    <div class="option-list">
      {#each R1_LIST as id (id)}
        {@const def = R1_STRATEGIES[id]}
        <button class="option" class:active={voiceParams.r1Strategy === id} onclick={() => selectR1(id)}>
          {def.notation}
        </button>
      {/each}
    </div>
  {/if}

  {#if section === 'all' || section === 'r2'}
    <h3 class="group-heading">R2</h3>
    <div class="option-list">
      {#each R2_LIST as id (id)}
        {@const def = R2_STRATEGIES[id]}
        <button class="option" class:active={voiceParams.r2Strategy === id} onclick={() => selectR2(id)}>
          {def.notation}
        </button>
      {/each}
    </div>
    <h3 class="group-heading">Singer's F</h3>
    <div class="option-list">
      <button class="option" class:active={voiceParams.singerFormant} onclick={toggleSingerFormant}>
        F3-F4-F5
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

  .section-heading {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--color-text);
    margin: 0;
  }

  .group-heading {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-secondary);
    margin: 0;
  }

  .option-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .option {
    display: block;
    width: 100%;
    padding: 4px 8px;
    border-radius: var(--radius-sm, 6px);
    background: transparent;
    border: 1px solid transparent;
    color: var(--color-text);
    cursor: pointer;
    transition: background 0.1s;
    text-align: left;
    font-size: 12px;
    font-weight: 600;
  }

  .option:hover {
    background: var(--color-hover);
  }

  .option.active {
    background: var(--color-accent);
    color: #fff;
  }

  .clear-btn {
    color: var(--color-text-secondary);
    font-weight: 400;
    font-size: 11px;
  }
</style>
