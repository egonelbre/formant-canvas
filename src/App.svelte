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

  let pressedKeys = $state(new Set<string>());

  $effect(() => {
    if (!voiceParams.autoStrategy) return;
    const f0 = voiceParams.f0;
    const preset = voiceParams.voicePreset;
    const rec = pickStrategy(f0, preset ?? 'baritone');
    voiceParams.r1Strategy = rec.r1;
    voiceParams.r2Strategy = rec.r2;
    voiceParams.singerFormant = rec.singerFormant;
  });

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

  const HELP = {
    controls: 'Pitch, phonation, vibrato, and vocal strategy controls. Strategy determines how formants track pitch harmonics.',
    charts: 'Vowel space: F1 (openness) vs F2 (frontness). Drag the dot to change timbre, click IPA symbols to snap. Data: Hillenbrand et al. (1995). Below: Sundberg resonance strategy charts showing formant-harmonic relationships.',
  };
</script>

<svelte:document onkeydown={handleKeyDown} onkeyup={handleKeyUp} />

<div class="app-grid">
  <!-- HEADER -->
  <header class="app-header">
    <VoicePresets {expertMode} />
    <div class="header-spacer"></div>
    <TransportBar onplayclick={handlePlayPause} {bridgeInitialized} {expertMode} />
    <label class="expert-toggle">
      <span class="expert-label">Expert</span>
      <input type="checkbox" bind:checked={expertMode} />
      <span class="toggle-track"><span class="toggle-thumb"></span></span>
    </label>
  </header>

  <!-- PANELS: horizontal control strip -->
  <div class="panels">
    <RegionHelp text={HELP.controls} />
    <div class="panel-col">
      <PitchSection {expertMode} />
      <ExpressionControls {expertMode} />
      <VibratoVisual rate={voiceParams.vibratoRate} extent={voiceParams.vibratoExtent} />
    </div>
    <div class="panel-col">
      <PhonationMode {expertMode} />
    </div>
    <div class="panel-col">
      <StrategyPanel section="all" />
    </div>
  </div>

  <!-- PIANO: bottom left -->
  <div class="app-piano">
    <PianoHarmonics />
  </div>

  <!-- RIGHT: vowel chart + resonance charts stacked -->
  <div class="app-right">
    <RegionHelp text={HELP.charts} />
    <div class="right-vowel">
      <VowelChart {expertMode} />
    </div>
    <div class="right-chart">
      <R2StrategyChart
        f0={voiceParams.f0}
        f2Freq={voiceParams.f2Freq}
        r2Strategy={voiceParams.r2Strategy}
        strategyMode={voiceParams.strategyMode}
        voicePreset={voiceParams.voicePreset}
      />
    </div>
    <div class="right-chart">
      <R1StrategyChart
        f0={voiceParams.f0}
        f1Freq={voiceParams.f1Freq}
        r1Strategy={voiceParams.r1Strategy}
        strategyMode={voiceParams.strategyMode}
        voicePreset={voiceParams.voicePreset}
      />
    </div>
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

  /* Horizontal control panels */
  .panels {
    grid-area: panels;
    position: relative;
    display: flex;
    gap: 1px;
    background: var(--color-border);
    overflow-y: auto;
    overflow-x: hidden;
  }
  .panel-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--color-bg);
    min-width: 0;
    overflow-y: auto;
  }

  /* Right column: vowel + resonance stacked */
  .app-right {
    grid-area: right;
    position: relative;
    display: grid;
    grid-template-rows: 1fr 1fr 1fr;
    grid-template-areas:
      "vowels"
      "r2resonance"
      "r1resonance";
    overflow: hidden;
    border-left: 1px solid var(--color-border);
  }
  .right-vowel {
    grid-area: vowels;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
  }
  .right-chart {
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    border-top: 1px solid var(--color-border);
  }
  .right-chart:nth-child(3) {
    grid-area: r2resonance;
  }
  .right-chart:nth-child(4) {
    grid-area: r1resonance;
  }
</style>
