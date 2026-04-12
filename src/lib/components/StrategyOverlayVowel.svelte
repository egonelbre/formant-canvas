<script lang="ts">
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

  let strategyTargets = $derived.by(() => {
    if (voiceParams.strategyMode === 'off' || voiceParams.strategyId === 'speech') return null;
    return computeTargets(voiceParams.strategyId, voiceParams.f0, voiceParams.voicePreset ?? 'baritone');
  });

  // For single-formant strategies, use current position for the uncontrolled axis
  let targetX = $derived.by(() => {
    if (!strategyTargets) return null;
    if (strategyTargets.targets.f2 !== null) return f2Scale(strategyTargets.targets.f2);
    // If only f1 is targeted, show at current f2 position
    if (strategyTargets.targets.f1 !== null) return handleX;
    return null;
  });

  let targetY = $derived.by(() => {
    if (!strategyTargets) return null;
    if (strategyTargets.targets.f1 !== null) return f1Scale(strategyTargets.targets.f1);
    // If only f2 is targeted, show at current f1 position
    if (strategyTargets.targets.f2 !== null) return handleY;
    return null;
  });

  let overriding = $derived(voiceParams.strategyOverriding);
  let clamped = $derived(strategyTargets?.clamped ?? false);
  let markerStroke = $derived(clamped ? WARNING_COLOR : OVERLAY_COLOR);
  let markerOpacity = $derived(clamped ? 0.4 : 0.8);
  let lineDashArray = $derived(overriding ? '4 4' : 'none');
</script>

{#if strategyTargets && targetX !== null && targetY !== null}
  <g pointer-events="none">
    <!-- Connecting line from current to target -->
    <line
      x1={handleX}
      y1={handleY}
      x2={targetX}
      y2={targetY}
      stroke={OVERLAY_COLOR}
      stroke-width="1.5"
      opacity="0.6"
      stroke-dasharray={lineDashArray}
    />
    <!-- Target marker (open circle) -->
    <circle
      cx={targetX}
      cy={targetY}
      r={8}
      stroke={markerStroke}
      stroke-width="2"
      fill="none"
      opacity={markerOpacity}
    />
  </g>
{/if}
