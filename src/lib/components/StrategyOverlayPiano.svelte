<script lang="ts">
  import { voiceParams } from '../audio/state.svelte.ts';
  import { computeTargets } from '../strategies/engine.ts';

  interface Props {
    freqToX: (freq: number) => number;
    harmonicRegionHeight: number;
    svgHeight: number;
  }
  let { freqToX, harmonicRegionHeight, svgHeight }: Props = $props();

  const OVERLAY_COLOR = '#f59e0b';
  const WARNING_COLOR = '#ef4444';

  const TARGET_KEYS = ['f1', 'f2', 'f3', 'f4', 'f5'] as const;
  const TARGET_LABELS = ['T1', 'T2', 'T3', 'T4', 'T5'];

  let strategyTargets = $derived.by(() => {
    if (voiceParams.strategyMode === 'off' || voiceParams.strategyId === 'speech') return null;
    return computeTargets(voiceParams.strategyId, voiceParams.f0, voiceParams.voicePreset ?? 'baritone');
  });

  let targetLines = $derived.by(() => {
    if (!strategyTargets) return [];
    const lines: { x: number; label: string; key: string }[] = [];
    for (let i = 0; i < TARGET_KEYS.length; i++) {
      const val = strategyTargets.targets[TARGET_KEYS[i]];
      if (val !== null) {
        lines.push({ x: freqToX(val), label: TARGET_LABELS[i], key: TARGET_KEYS[i] });
      }
    }
    return lines;
  });

  let overriding = $derived(voiceParams.strategyOverriding);
  let clamped = $derived(strategyTargets?.clamped ?? false);
  let inRange = $derived(strategyTargets?.inRange ?? true);

  let dashArray = $derived(overriding ? '6 3' : '4 4');
  let lineOpacity = $derived(overriding ? 0.4 : (inRange && !clamped ? 0.8 : 0.4));
</script>

{#if strategyTargets && targetLines.length > 0}
  <g pointer-events="none">
    {#each targetLines as line (line.key)}
      <line
        x1={line.x}
        y1={0}
        x2={line.x}
        y2={svgHeight}
        stroke={OVERLAY_COLOR}
        stroke-width="2"
        stroke-dasharray={dashArray}
        opacity={lineOpacity}
      />
      <text
        x={line.x}
        y={harmonicRegionHeight - 8}
        text-anchor="middle"
        font-size="10"
        fill={OVERLAY_COLOR}
        opacity={lineOpacity}
      >{line.label}</text>
      {#if clamped}
        <circle
          cx={line.x}
          cy={10}
          r={6}
          fill={WARNING_COLOR}
          opacity="0.8"
        />
        <text
          x={line.x}
          y={14}
          text-anchor="middle"
          font-size="9"
          font-weight="700"
          fill="#fff"
        >!</text>
      {/if}
    {/each}
  </g>
{/if}
