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

  // Tweened x positions for each formant target (indexed by key)
  const tweenedX: Record<string, ReturnType<typeof tweened<number>>> = {
    f1: tweened(0, { duration: TWEEN_DURATION }),
    f2: tweened(0, { duration: TWEEN_DURATION }),
    f3: tweened(0, { duration: TWEEN_DURATION }),
    f4: tweened(0, { duration: TWEEN_DURATION }),
    f5: tweened(0, { duration: TWEEN_DURATION }),
  };

  let strategyTargets = $derived.by(() => {
    if (voiceParams.strategyMode === 'off') return null;
    const r1 = voiceParams.r1Strategy;
    const r2 = voiceParams.r2Strategy;
    const sf = voiceParams.singerFormant;
    if (!r1 && !r2 && !sf) return null;
    return computeTargets(r1, r2, sf, voiceParams.f0, voiceParams.voicePreset ?? 'baritone');
  });

  // Which target keys are active (non-null)
  let activeKeys = $derived.by(() => {
    if (!strategyTargets) return [] as string[];
    const keys: string[] = [];
    for (const k of TARGET_KEYS) {
      if (strategyTargets.targets[k] !== null) keys.push(k);
    }
    return keys;
  });

  // Update tweened positions when targets change
  $effect(() => {
    if (!strategyTargets) return;
    for (const k of TARGET_KEYS) {
      const val = strategyTargets.targets[k];
      if (val !== null) {
        tweenedX[k].set(freqToX(val));
      }
    }
  });

  let overriding = $derived(voiceParams.strategyOverriding);
  let clamped = $derived(strategyTargets?.clamped ?? false);
  let inRange = $derived(strategyTargets?.inRange ?? true);

  let dashArray = $derived(overriding ? '6 3' : '4 4');
  let lineOpacity = $derived(overriding ? 0.4 : (inRange && !clamped ? 0.8 : 0.4));
</script>

{#if strategyTargets && activeKeys.length > 0}
  <g pointer-events="none">
    {#each activeKeys as key, i (key)}
      {@const idx = TARGET_KEYS.indexOf(key as typeof TARGET_KEYS[number])}
      {@const x = $tweenedX[key]}
      <line
        x1={x}
        y1={0}
        x2={x}
        y2={svgHeight}
        stroke={OVERLAY_COLOR}
        stroke-width="2"
        stroke-dasharray={dashArray}
        opacity={lineOpacity}
      />
      <text
        x={x}
        y={harmonicRegionHeight - 8}
        text-anchor="middle"
        font-size="10"
        fill={OVERLAY_COLOR}
        opacity={lineOpacity}
      >{TARGET_LABELS[idx]}</text>
      {#if clamped}
        <circle
          cx={x}
          cy={10}
          r={6}
          fill={WARNING_COLOR}
          opacity="0.8"
        />
        <text
          x={x}
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
