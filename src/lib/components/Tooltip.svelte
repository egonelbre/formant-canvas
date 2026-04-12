<script lang="ts">
  interface Props {
    text: string;
    expert?: string;
    expertMode?: boolean;
  }
  let { text, expert, expertMode = false }: Props = $props();

  let open = $state(false);

  function toggle() {
    if (!open) {
      // Dispatch custom event so other tooltips close
      document.dispatchEvent(new CustomEvent('tooltipopen', { detail: { source: self } }));
    }
    open = !open;
  }

  // Unique identity for this tooltip instance
  const self = {};

  $effect(() => {
    if (!open) return;

    // Close on click outside
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.tooltip-wrapper')) {
        open = false;
      }
    }

    // Close when another tooltip opens
    function handleOtherOpen(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail.source !== self) {
        open = false;
      }
    }

    // Delay listener attachment to avoid catching the opening click
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
    document.addEventListener('tooltipopen', handleOtherOpen);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('tooltipopen', handleOtherOpen);
    };
  });
</script>

<span
  class="tooltip-wrapper"
  role="presentation"
  onmouseenter={() => (open = true)}
  onmouseleave={() => (open = false)}
>
  <button
    class="tooltip-trigger"
    type="button"
    onclick={toggle}
    aria-label="Show help"
    aria-expanded={open}
  >?</button>

  {#if open}
    <div class="tooltip-popover" role="tooltip">
      <p class="tooltip-text">{text}</p>
      {#if expertMode && expert}
        <p class="tooltip-expert">{expert}</p>
      {/if}
    </div>
  {/if}
</span>

<style>
  .tooltip-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  .tooltip-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    min-width: 44px;
    min-height: 44px;
    padding: 0;
    border-radius: 50%;
    background: var(--color-surface, #2a2a4a);
    border: 1px solid var(--color-border, #4a4a6a);
    color: var(--color-text-secondary, #8a8aaa);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    line-height: 1;
    touch-action: manipulation;
  }

  .tooltip-trigger:hover {
    background: var(--color-hover, #3a3a5a);
    color: var(--color-text, #e0e0e0);
  }

  .tooltip-popover {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: var(--spacing-xs, 4px);
    background: var(--color-surface, #2a2a4a);
    border: 1px solid var(--color-border, #4a4a6a);
    border-radius: var(--radius-sm, 6px);
    padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
    max-width: 280px;
    min-width: 200px;
    font-size: 14px;
    color: var(--color-text, #e0e0e0);
    z-index: 100;
    pointer-events: auto;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .tooltip-text {
    margin: 0;
    line-height: 1.4;
  }

  .tooltip-expert {
    margin: var(--spacing-sm, 8px) 0 0 0;
    line-height: 1.4;
    color: var(--color-text-secondary, #8a8aaa);
    font-size: 13px;
  }
</style>
