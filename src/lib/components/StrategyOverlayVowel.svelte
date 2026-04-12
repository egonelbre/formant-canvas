<script lang="ts">
  import { tweened } from 'svelte/motion';
  import { voiceParams } from '../audio/state.svelte.ts';
  import { computeTargets } from '../strategies/engine.ts';

  interface Props {
    f1Scale: (hz: number) => number;
    f2Scale: (hz: number) => number;
    handleX: number;
    handleY: number;
  }
  let { f1Scale, f2Scale, handleX, handleY }: Props = $props();

  const OVERLAY_COLOR = '#f59e0b';
  const WARNING_COLOR = '#ef4444';

  // Match audio smoothing: setTargetAtTime(_, _, 0.06) reaches ~95% in 180ms
  const TWEEN_DURATION = 180;

  const tweenedTargetX = tweened(0, { duration: TWEEN_DURATION });
  const tweenedTargetY = tweened(0, { duration: TWEEN_DURATION });

  let strategyTargets = $derived.by(() => {
    if (voiceParams.strategyMode === 'off') return null;
    const r1 = voiceParams.r1Strategy;
    const r2 = voiceParams.r2Strategy;
    const sf = voiceParams.singerFormant;
    if (!r1 && !r2 && !sf) return null;
    return computeTargets(r1, r2, sf, voiceParams.f0, voiceParams.voicePreset ?? 'baritone');
  });

  let hasTarget = $derived(strategyTargets !== null && (
    strategyTargets.targets.f1 !== null || strategyTargets.targets.f2 !== null
  ));

  // Update tweened positions when targets change
  $effect(() => {
    if (!strategyTargets) return;
    const t = strategyTargets.targets;
    // X axis = F2
    if (t.f2 !== null) {
      tweenedTargetX.set(f2Scale(t.f2));
    } else if (t.f1 !== null) {
      tweenedTargetX.set(handleX);
    }
    // Y axis = F1
    if (t.f1 !== null) {
      tweenedTargetY.set(f1Scale(t.f1));
    } else if (t.f2 !== null) {
      tweenedTargetY.set(handleY);
    }
  });

  let overriding = $derived(voiceParams.strategyOverriding);
  let clamped = $derived(strategyTargets?.clamped ?? false);
  let markerStroke = $derived(clamped ? WARNING_COLOR : OVERLAY_COLOR);
  let markerOpacity = $derived(clamped ? 0.4 : 0.8);
  let lineDashArray = $derived(overriding ? '4 4' : 'none');
</script>

{#if hasTarget}
  <g pointer-events="none">
    <!-- Connecting line from current to target -->
    <line
      x1={handleX}
      y1={handleY}
      x2={$tweenedTargetX}
      y2={$tweenedTargetY}
      stroke={OVERLAY_COLOR}
      stroke-width="1.5"
      opacity="0.6"
      stroke-dasharray={lineDashArray}
    />
    <!-- Target marker (open circle) -->
    <circle
      cx={$tweenedTargetX}
      cy={$tweenedTargetY}
      r={8}
      stroke={markerStroke}
      stroke-width="2"
      fill="none"
      opacity={markerOpacity}
    />
  </g>
{/if}
