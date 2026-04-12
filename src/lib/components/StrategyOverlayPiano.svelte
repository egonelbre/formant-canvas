<script lang="ts">
  import { tweened } from 'svelte/motion';
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

  // Match audio smoothing: setTargetAtTime(_, _, 0.06) reaches ~95% in 180ms
  const TWEEN_DURATION = 180;

  const TARGET_KEYS = ['f1', 'f2', 'f3', 'f4', 'f5'] as const;
  const TARGET_LABELS = ['T1', 'T2', 'T3', 'T4', 'T5'];

  // Named tweened stores for Svelte $ syntax
  const tweenedF1 = tweened(0, { duration: TWEEN_DURATION });
  const tweenedF2 = tweened(0, { duration: TWEEN_DURATION });
  const tweenedF3 = tweened(0, { duration: TWEEN_DURATION });
  const tweenedF4 = tweened(0, { duration: TWEEN_DURATION });
  const tweenedF5 = tweened(0, { duration: TWEEN_DURATION });
  const tweenedStores = [tweenedF1, tweenedF2, tweenedF3, tweenedF4, tweenedF5];

  let strategyTargets = $derived.by(() => {
    if (voiceParams.strategyMode === 'off') return null;
    const r1 = voiceParams.r1Strategy;
    const r2 = voiceParams.r2Strategy;
    const sf = voiceParams.singerFormant;
    if (!r1 && !r2 && !sf) return null;
    return computeTargets(r1, r2, sf, voiceParams.f0, voiceParams.voicePreset ?? 'baritone');
  });

  // Update tweened positions when targets change
  $effect(() => {
    if (!strategyTargets) return;
    for (let i = 0; i < TARGET_KEYS.length; i++) {
      const val = strategyTargets.targets[TARGET_KEYS[i]];
      if (val !== null) {
        tweenedStores[i].set(freqToX(val));
      }
    }
  });

  // Build target lines from tweened positions
  let targetLines = $derived.by(() => {
    if (!strategyTargets) return [];
    const xs = [$tweenedF1, $tweenedF2, $tweenedF3, $tweenedF4, $tweenedF5];
    const lines: { x: number; label: string; key: string }[] = [];
    for (let i = 0; i < TARGET_KEYS.length; i++) {
      if (strategyTargets.targets[TARGET_KEYS[i]] !== null) {
        lines.push({ x: xs[i], label: TARGET_LABELS[i], key: TARGET_KEYS[i] });
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
