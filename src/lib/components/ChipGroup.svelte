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
    padding: 4px 10px;
    min-height: 32px;
    border-radius: 16px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    font-size: 13px;
    font-weight: 400;
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s, color 0.1s;
  }

  .chip:hover {
    background: var(--color-hover, #3a3a5a);
  }

  .chip.selected {
    background: var(--color-active);
    border: 2px solid var(--color-accent);
    color: var(--color-accent);
    padding: 3px 9px;
  }
</style>
