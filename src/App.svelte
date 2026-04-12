<script lang="ts">
  import { AudioBridge } from './lib/audio/bridge.ts';
  import { voiceParams } from './lib/audio/state.svelte.ts';
  import { QWERTY_MAP } from './lib/data/qwerty-map.ts';
  import { midiToHz } from './lib/audio/dsp/pitch-utils.ts';
  import TransportBar from './lib/components/TransportBar.svelte';
  import PianoHarmonics from './lib/components/PianoHarmonics.svelte';
  import VowelChart from './lib/components/VowelChart.svelte';
  import PitchSection from './lib/components/PitchSection.svelte';
  import VoicePresets from './lib/components/VoicePresets.svelte';
  import PhonationMode from './lib/components/PhonationMode.svelte';
  import ExpressionControls from './lib/components/ExpressionControls.svelte';
  import StrategyPanel from './lib/components/StrategyPanel.svelte';
  import R1StrategyChart from './lib/charts/R1StrategyChart.svelte';
  import R2StrategyChart from './lib/charts/R2StrategyChart.svelte';
  import VibratoVisual from './lib/components/VibratoVisual.svelte';
  import RegionHelp from './lib/components/RegionHelp.svelte';
  import { computeTargets } from './lib/strategies/engine.ts';
  import { pickStrategy } from './lib/strategies/auto-strategy.ts';

  let expertMode = $state(false);

  const bridge = new AudioBridge();
  let bridgeInitialized = $state(false);

  // Track pressed QWERTY keys (still used for keyboard-driven f0 changes)
  let pressedKeys = $state(new Set<string>());

  // Auto-strategy: reactively update strategy selections as f0/voiceType change
  $effect(() => {
    if (!voiceParams.autoStrategy) return;
    const f0 = voiceParams.f0;
    const preset = voiceParams.voicePreset;
    const rec = pickStrategy(f0, preset ?? 'baritone');
    voiceParams.r1Strategy = rec.r1;
    voiceParams.r2Strategy = rec.r2;
    voiceParams.singerFormant = rec.singerFormant;
  });

  // Strategy locked-mode: auto-tune formants to maintain ratio
  $effect(() => {
    const mode = voiceParams.strategyMode;
    const r1 = voiceParams.r1Strategy;
    const r2 = voiceParams.r2Strategy;
    const sf = voiceParams.singerFormant;
    const f0 = voiceParams.f0;
    const overriding = voiceParams.strategyOverriding;
    const preset = voiceParams.voicePreset;

    if (mode !== 'locked' || overriding) return;
    if (!r1 && !r2 && !sf) return;

    const result = computeTargets(r1, r2, sf, f0, preset ?? 'baritone');
    const t = result.targets;

    if (t.f1 !== null) voiceParams.f1Freq = t.f1;
    if (t.f2 !== null) voiceParams.f2Freq = t.f2;
    if (t.f3 !== null) voiceParams.f3Freq = t.f3;
    if (t.f4 !== null) voiceParams.f4Freq = t.f4;
    if (t.f5 !== null) voiceParams.f5Freq = t.f5;
  });

  // Forward ALL voiceParams changes to audio graph
  $effect(() => {
    void voiceParams.snapshot;
    bridge.syncParams();
  });

  async function handlePlayPause() {
    try {
      if (!bridgeInitialized) {
        await bridge.init();
        bridge.syncParams();
        bridgeInitialized = true;
      }
      if (voiceParams.playing) {
        bridge.stop();
        voiceParams.playing = false;
      } else {
        await bridge.start();
        voiceParams.playing = true;
      }
    } catch (err) {
      console.error('Audio initialization failed:', err);
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    const tag = (document.activeElement?.tagName ?? '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (event.repeat) return;
    if (!voiceParams.playing) return;

    const midi = QWERTY_MAP[event.code];
    if (midi !== undefined) {
      event.preventDefault();
      voiceParams.f0 = midiToHz(midi);
      pressedKeys = new Set([...pressedKeys, event.code]);
    }
  }

  function handleKeyUp(event: KeyboardEvent) {
    if (pressedKeys.has(event.code)) {
      const next = new Set(pressedKeys);
      next.delete(event.code);
      pressedKeys = next;
    }
  }

  // Region help descriptions
  const HELP = {
    controls: 'Controls for voice type, phonation style, vibrato, and vocal strategy. Voice presets set formant frequencies for different singer types. Phonation controls how the vocal folds vibrate. Strategy controls how formants track pitch.',
    vowelChart: 'The vowel space chart shows F1 (openness) vs F2 (frontness). Drag the dot to change the vowel sound. Click IPA symbols to snap to standard vowels. The position determines the timbre of the voice.',
    strategyCharts: 'Sundberg strategy charts show how singers tune their formant resonances relative to pitch harmonics. Diagonal lines represent harmonic frequencies. The shaded region shows the typical range for the selected voice type.',
  };
</script>

<svelte:document onkeydown={handleKeyDown} onkeyup={handleKeyUp} />

<div class="app-grid">
  <!-- HEADER: Transport + Voice chips + expert toggle -->
  <header class="app-header">
    <TransportBar onplayclick={handlePlayPause} {bridgeInitialized} {expertMode} />
    <div class="header-spacer"></div>
    <VoicePresets {expertMode} />
    <div class="header-spacer"></div>
    <label class="expert-toggle">
      <span class="expert-label">Expert</span>
      <input type="checkbox" bind:checked={expertMode} />
      <span class="toggle-track"><span class="toggle-thumb"></span></span>
    </label>
  </header>

  <!-- MAIN: Controls left, Charts right -->
  <div class="app-main">
    <!-- Left: compact controls -->
    <div class="panel panel-controls">
      <RegionHelp text={HELP.controls} />
      <PitchSection {expertMode} />
      <div class="control-group">
        <ExpressionControls {expertMode} />
        <VibratoVisual rate={voiceParams.vibratoRate} extent={voiceParams.vibratoExtent} />
      </div>
      <PhonationMode {expertMode} />
      <StrategyPanel />
    </div>

    <!-- Right: Vowel chart + R1/R2 strategy charts stacked -->
    <div class="panel panel-charts">
      <RegionHelp text={HELP.vowelChart} />
      <VowelChart {expertMode} />
      <div class="strategy-pair">
        <R1StrategyChart
          f0={voiceParams.f0}
          f1Freq={voiceParams.f1Freq}
          r1Strategy={voiceParams.r1Strategy}
          strategyMode={voiceParams.strategyMode}
          voicePreset={voiceParams.voicePreset}
        />
        <R2StrategyChart
          f0={voiceParams.f0}
          f2Freq={voiceParams.f2Freq}
          r2Strategy={voiceParams.r2Strategy}
          strategyMode={voiceParams.strategyMode}
          voicePreset={voiceParams.voicePreset}
        />
      </div>
    </div>
  </div>

  <!-- PIANO: Full width at bottom -->
  <div class="app-piano">
    <PianoHarmonics />
  </div>
</div>

<style>
  .expert-toggle {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    cursor: pointer;
    user-select: none;
  }
  .expert-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text);
  }
  .expert-toggle input[type="checkbox"] {
    display: none;
  }
  .toggle-track {
    width: 36px;
    height: 20px;
    background: var(--color-border);
    border-radius: 10px;
    position: relative;
    transition: background 0.2s;
  }
  .expert-toggle input:checked + .toggle-track {
    background: var(--color-accent);
  }
  .toggle-thumb {
    width: 16px;
    height: 16px;
    background: #ffffff;
    border: 1px solid var(--color-border);
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: transform 0.2s;
  }
  .expert-toggle input:checked + .toggle-track .toggle-thumb {
    transform: translateX(16px);
    border-color: var(--color-accent);
  }
  .panel {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    overflow: hidden;
    min-width: 0;
    min-height: 0;
  }
  .panel-controls {
    flex: 0 0 220px;
    border-right: 1px solid var(--color-border);
    overflow-y: auto;
  }
  .panel-charts {
    flex: 1 1 auto;
    overflow: hidden;
    justify-content: stretch;
  }
  .panel-charts > :global(.vowel-chart-section) {
    flex: 1 1 auto;
    min-height: 0;
  }
  .strategy-pair {
    display: flex;
    gap: var(--spacing-sm);
    width: 100%;
    flex: 0 0 auto;
    height: 5cm;
  }
  .strategy-pair > :global(*) {
    flex: 1;
    min-width: 0;
    height: 100%;
  }
  .control-group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }
</style>
