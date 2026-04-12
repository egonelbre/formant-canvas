<script lang="ts">
  interface Props {
    text: string;
  }
  let { text }: Props = $props();

  let open = $state(false);
  let triggerEl: HTMLButtonElement | undefined = $state();
  let popoverEl: HTMLDivElement | undefined = $state();
  let popoverStyle = $state('');

  const self = {};

  function toggle() {
    if (!open) {
      document.dispatchEvent(new CustomEvent('tooltipopen', { detail: { source: self } }));
    }
    open = !open;
    if (open) {
      // Position after the DOM updates
      requestAnimationFrame(positionPopover);
    }
  }

  function positionPopover() {
    if (!triggerEl || !popoverEl) return;
    const triggerRect = triggerEl.getBoundingClientRect();
    const popoverRect = popoverEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 6;

    // Default: below and to the right of the trigger
    let top = triggerRect.bottom + gap;
    let left = triggerRect.left;

    // Flip up if would go below viewport
    if (top + popoverRect.height > vh - 8) {
      top = triggerRect.top - popoverRect.height - gap;
    }

    // Shift left if would go off right edge
    if (left + popoverRect.width > vw - 8) {
      left = vw - popoverRect.width - 8;
    }

    // Don't go off left edge
    if (left < 8) left = 8;

    // Don't go off top
    if (top < 8) top = 8;

    popoverStyle = `top:${top}px;left:${left}px`;
  }

  $effect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.region-help')) {
        open = false;
      }
    }

    function handleOtherOpen(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail.source !== self) {
        open = false;
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);
    document.addEventListener('tooltipopen', handleOtherOpen);
    window.addEventListener('resize', () => { open = false; });

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('tooltipopen', handleOtherOpen);
    };
  });
</script>

<span class="region-help">
  <button
    bind:this={triggerEl}
    class="help-trigger"
    type="button"
    onclick={toggle}
    aria-label="Show help"
    aria-expanded={open}
  >?</button>

  {#if open}
    <div
      bind:this={popoverEl}
      class="help-popover"
      role="tooltip"
      style={popoverStyle}
    >
      <p class="help-text">{text}</p>
    </div>
  {/if}
</span>

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

  .help-popover {
    position: fixed;
    background: var(--color-bg, #ffffff);
    border: 1px solid var(--color-border, #cccccc);
    border-radius: var(--radius-sm, 6px);
    padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
    max-width: 300px;
    min-width: 200px;
    font-size: 13px;
    color: var(--color-text, #111111);
    z-index: 1000;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }

  .help-text {
    margin: 0;
    line-height: 1.5;
  }
</style>
