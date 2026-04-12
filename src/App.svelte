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
  import LabeledSlider from './lib/components/LabeledSlider.svelte';
  import RegionHelp from './lib/components/RegionHelp.svelte';
  import { computeTargets } from './lib/strategies/engine.ts';
  import { pickStrategy } from './lib/strategies/auto-strategy.ts';

  let expertMode = $state(localStorage.getItem('expertMode') === 'true');

  $effect(() => {
    localStorage.setItem('expertMode', String(expertMode));
  });

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
    pitch: 'Fundamental frequency (pitch) of the voice. Vibrato adds periodic pitch variation. Use the piano keyboard or QWERTY keys to change pitch.',
    formants: 'Resonance bandwidths control how sharp or broad each formant peak is. Narrower bandwidth = more prominent resonance.',
    phonation: 'How the vocal folds vibrate. Modal is normal speech. Breathy adds air noise. Pressed is tight/strained. Expert mode shows Open Quotient, Spectral Tilt, and Aspiration.',
    strategy: 'Vocal strategy determines how formant resonances track pitch harmonics. Singers tune R1/R2 to align with harmonics for projection. Auto selects strategies based on voice type and pitch.',
    vowelChart: 'Vowel space: R1 (openness) vs R2 (frontness). Drag the dot to change timbre, click IPA symbols to snap. Data: Hillenbrand et al. (1995).',
    r1Chart: 'R1 (First Resonance) strategy chart. Diagonal lines show harmonics of f₀. When a strategy is active, the formant tracks the selected harmonic. Shaded region shows typical R1 range for the voice type.',
    r2Chart: 'R2 (Second Resonance) strategy chart. Higher harmonics (2f₀, 3f₀) shown as diagonals. Shaded region shows typical R2 range for the voice type.',
  };

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }
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
    <button class="fullscreen-btn" onclick={toggleFullscreen} aria-label="Toggle fullscreen">&#x26F6;</button>
  </header>

  <!-- PANELS: horizontal control strip -->
  <div class="panels">
    <div class="panel-col">
      <RegionHelp text={HELP.pitch} />
      <PitchSection {expertMode} />
      <ExpressionControls {expertMode} />
      <VibratoVisual rate={voiceParams.vibratoRate} extent={voiceParams.vibratoExtent} />
      {#if expertMode}
        <div class="expert-formant-bw">
          <RegionHelp text={HELP.formants} />
          <h2 class="section-heading">Formants</h2>
          <div class="formant-readouts">
            <span class="readout">R1: {Math.round(voiceParams.f1Freq)} Hz</span>
            <span class="readout">R2: {Math.round(voiceParams.f2Freq)} Hz</span>
          </div>
          <LabeledSlider label="R1 BW" min={30} max={200} step={1}
            value={voiceParams.f1BW} unit="Hz" decimals={0}
            onchange={(v) => { voiceParams.f1BW = v; }} />
          <LabeledSlider label="R2 BW" min={30} max={250} step={1}
            value={voiceParams.f2BW} unit="Hz" decimals={0}
            onchange={(v) => { voiceParams.f2BW = v; }} />
          <LabeledSlider label="R3 BW" min={50} max={300} step={1}
            value={voiceParams.f3BW} unit="Hz" decimals={0}
            onchange={(v) => { voiceParams.f3BW = v; }} />
          <LabeledSlider label="R4 BW" min={50} max={500} step={1}
            value={voiceParams.f4BW} unit="Hz" decimals={0}
            onchange={(v) => { voiceParams.f4BW = v; }} />
        </div>
      {/if}
    </div>
    <div class="panel-col">
      <RegionHelp text={HELP.phonation} />
      <PhonationMode {expertMode} />
    </div>
    <div class="panel-col">
      <RegionHelp text={HELP.strategy} />
      <StrategyPanel section="all" />
    </div>
  </div>

  <!-- PIANO: bottom left -->
  <div class="app-piano">
    <PianoHarmonics />
  </div>

  <!-- RIGHT: vowel chart + resonance charts stacked -->
  <div class="app-right">
    <div class="right-vowel">
      <RegionHelp text={HELP.vowelChart} />
      <VowelChart {expertMode} />
    </div>
    <div class="right-chart right-r2">
      <RegionHelp text={HELP.r2Chart} />
      <R2StrategyChart
        f0={voiceParams.f0}
        f2Freq={voiceParams.f2Freq}
        r2Strategy={voiceParams.r2Strategy}
        strategyMode={voiceParams.strategyMode}
        voicePreset={voiceParams.voicePreset}
      />
    </div>
    <div class="right-chart right-r1">
      <RegionHelp text={HELP.r1Chart} />
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

  .fullscreen-btn {
    width: 32px;
    height: 32px;
    min-width: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    font-size: 16px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    color: var(--color-text-secondary);
    cursor: pointer;
  }
  .fullscreen-btn:hover {
    background: var(--color-hover);
    color: var(--color-text);
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
    position: relative;
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
    /* Heights proportional to octave span: vowel ~2.3oct, R2 ~2.3oct, R1 ~2.6oct */
    grid-template-rows: 2.3fr 2.3fr 2.6fr;
    grid-template-areas:
      "vowels"
      "r2resonance"
      "r1resonance";
    overflow: hidden;
    border-left: 1px solid var(--color-border);
  }
  .right-vowel {
    position: relative;
    grid-area: vowels;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
  }
  .right-chart {
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    border-top: 1px solid var(--color-border);
  }
  .right-r2 {
    grid-area: r2resonance;
  }
  .right-r1 {
    grid-area: r1resonance;
  }
  .expert-formant-bw {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }
  .formant-readouts {
    display: flex;
    gap: var(--spacing-sm);
  }
  .formant-readouts .readout {
    font-family: monospace;
    font-size: 12px;
    color: var(--color-text-secondary);
  }
</style>
