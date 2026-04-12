<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    children: Snippet;
  }
  let { title, children }: Props = $props();

  let open = $state(false);

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) open = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') open = false;
  }
</script>

<span class="region-help">
  <button
    class="help-trigger"
    type="button"
    onclick={() => open = true}
    aria-label="Show help for {title}"
  >?</button>
</span>

{#if open}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="backdrop" onclick={handleBackdrop} onkeydown={handleKeydown} role="dialog" aria-modal="true" aria-label="{title}">
    <div class="dialog">
      <button class="close-btn" onclick={() => open = false} aria-label="Close">&times;</button>
      <h1>{title}</h1>
      {@render children()}
    </div>
  </div>
{/if}

<style>
  .region-help {
    position: absolute;
    top: var(--spacing-xs, 4px);
    right: var(--spacing-xs, 4px);
    z-index: 10;
  }

  .help-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    padding: 0;
    border-radius: 50%;
    background: var(--color-surface, #f5f5f5);
    border: 1px solid var(--color-border, #cccccc);
    color: var(--color-text-secondary, #555555);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    line-height: 1;
    opacity: 0.6;
    transition: opacity 0.15s;
  }

  .help-trigger:hover {
    opacity: 1;
    background: var(--color-hover, #e5e5e5);
    color: var(--color-text, #111111);
  }

  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-lg);
  }

  .dialog {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: var(--spacing-lg) var(--spacing-xl);
    max-width: 640px;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
    line-height: 1.5;
  }

  .close-btn {
    position: absolute;
    top: var(--spacing-sm);
    right: var(--spacing-sm);
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: var(--color-text-secondary);
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
  }

  .close-btn:hover {
    background: var(--color-hover);
    color: var(--color-text);
  }

  h1 {
    margin: 0 0 var(--spacing-sm);
    font-size: 20px;
  }

  .dialog :global(h2) {
    margin: var(--spacing-md) 0 var(--spacing-xs);
    font-size: 15px;
  }

  .dialog :global(p) {
    margin: var(--spacing-xs) 0;
    font-size: 14px;
    color: var(--color-text);
  }

  .dialog :global(ul) {
    margin: var(--spacing-xs) 0;
    padding-left: var(--spacing-lg);
    font-size: 14px;
  }

  .dialog :global(li) {
    margin-bottom: var(--spacing-xs);
  }

  .dialog :global(a) {
    color: var(--color-accent);
    text-decoration: none;
  }

  .dialog :global(a:hover) {
    text-decoration: underline;
  }

  .dialog :global(code) {
    font-family: monospace;
    font-size: 13px;
    background: var(--color-surface, #f5f5f5);
    padding: 1px 4px;
    border-radius: 3px;
  }
</style>
