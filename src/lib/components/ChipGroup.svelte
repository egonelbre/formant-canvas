<script lang="ts">
  interface Props {
    options: { key: string; label: string }[];
    selected: string | null;
    onselect: (key: string) => void;
  }
  let { options, selected, onselect }: Props = $props();
</script>

<div class="chip-group">
  {#each options as option (option.key)}
    <button
      class="chip"
      class:selected={selected === option.key}
      onclick={() => onselect(option.key)}
    >
      {option.label}
    </button>
  {/each}
</div>

<style>
  .chip-group {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-sm, 8px);
  }

  .chip {
    padding: 8px 16px;
    min-height: 44px;
    border-radius: 16px;
    background: var(--color-surface, #2a2a4a);
    border: 1px solid var(--color-border, #4a4a6a);
    color: var(--color-text, #e0e0e0);
    font-size: 14px;
    font-weight: 400;
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s, color 0.1s;
  }

  .chip:hover {
    background: var(--color-hover, #3a3a5a);
  }

  .chip.selected {
    background: var(--color-active, #3a3a6a);
    border: 2px solid var(--color-accent, #6366f1);
    color: var(--color-accent, #6366f1);
    /* Compensate for 2px border to prevent layout shift */
    padding: 7px 15px;
  }
</style>
