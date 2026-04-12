<script lang="ts">
  interface Props {
    label: string;
    min: number;
    max: number;
    step: number;
    value: number;
    unit?: string;
    decimals?: number;
    onchange: (value: number) => void;
  }
  let { label, min, max, step, value, unit = '', decimals = 0, onchange }: Props = $props();
</script>

<div class="labeled-slider">
  <div class="header">
    <span class="label">{label}</span>
    <span class="readout">{value.toFixed(decimals)}{unit ? ' ' + unit : ''}</span>
  </div>
  <input
    type="range"
    {min}
    {max}
    {step}
    {value}
    oninput={(e: Event) => onchange(parseFloat((e.target as HTMLInputElement).value))}
    style="touch-action: none;"
  />
</div>

<style>
  .labeled-slider {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm, 8px);
  }

  .header {
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
    font-weight: 400;
    line-height: 1.0;
    color: var(--color-text-secondary, #8a8aaa);
  }

  input[type="range"] {
    width: 100%;
    cursor: pointer;
  }
</style>
