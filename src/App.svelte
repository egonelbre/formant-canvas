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
  import Tooltip from './lib/components/Tooltip.svelte';
  import VibratoVisual from './lib/components/VibratoVisual.svelte';
  import { TOOLTIPS } from './lib/data/tooltips.ts';
  import { computeTargets } from './lib/strategies/engine.ts';
  import { pickStrategy } from './lib/strategies/auto-strategy.ts';

  let expertMode = $state(false);

  const bridge = new AudioBridge();
  let bridgeInitialized = $state(false);

  // Track pressed QWERTY keys (still used for keyboard-driven f0 changes)
  let pressedKeys = $state(new Set<string>());

  // Auto-strategy: reactively update strategy selections as f0/voiceType change
  // Shows passaggio transitions (e.g. tenor switching from R1:2f0 to R1:f0)
  $effect(() => {
    if (!voiceParams.autoStrategy) return;
    const f0 = voiceParams.f0;
    const preset = voiceParams.voicePreset;
    const rec = pickStrategy(f0, preset ?? 'baritone');
    voiceParams.r1Strategy = rec.r1;
    voiceParams.r2Strategy = rec.r2;
    voiceParams.singerFormant = rec.singerFormant;
  });

  // Strategy locked-mode: auto-tune formants to maintain ratio (D-11, STRAT-03)
  // Placed BEFORE syncParams $effect so targets are written before audio sync.
  // Only reads f0/r1Strategy/r2Strategy/singerFormant/strategyMode/strategyOverriding/voicePreset --
  // does NOT read formant frequencies it writes to, avoiding circular reactive updates (T-04-03).
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

  // Forward ALL voiceParams changes to audio graph (AUDIO-06, LINK-02)
  // Dependency tracking is consolidated in voiceParams.snapshot (WR-03)
  $effect(() => {
    void voiceParams.snapshot;
    bridge.syncParams();
  });

  // Play/pause handler (D-15: responds instantly)
  async function handlePlayPause() {
    try {
      if (!bridgeInitialized) {
        await bridge.init();
        bridge.syncParams(); // push current reactive state into freshly built graph
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

  // QWERTY keyboard handler (D-03, VOICE-02)
  function handleKeyDown(event: KeyboardEvent) {
    // Don't capture keys when typing in text inputs (Pitfall 3)
    const tag = (document.activeElement?.tagName ?? '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    // Ignore key repeats
    if (event.repeat) return;
    // Only handle when audio is playing
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
</script>

<svelte:document onkeydown={handleKeyDown} onkeyup={handleKeyUp} />

<div class="app-grid">
  <!-- HEADER: Voice chips + expert toggle + transport (D-05, D-14) -->
  <header class="app-header">
    <VoicePresets {expertMode} />
    <div class="header-spacer"></div>
    <label class="expert-toggle">
      <span class="expert-label">Expert</span>
      <input type="checkbox" bind:checked={expertMode} />
      <span class="toggle-track"><span class="toggle-thumb"></span></span>
    </label>
    <TransportBar onplayclick={handlePlayPause} {bridgeInitialized} {expertMode} />
  </header>

  <!-- SIDEBAR: Pitch, Vibrato, Phonation, Strategy (D-06, D-07) -->
  <aside class="app-sidebar">
    <PitchSection {expertMode} />
    <div class="sidebar-section">
      <h2 class="section-heading">Vibrato</h2>
      <ExpressionControls {expertMode} />
      <VibratoVisual rate={voiceParams.vibratoRate} extent={voiceParams.vibratoExtent} />
    </div>
    <PhonationMode {expertMode} />
    <StrategyPanel />
  </aside>

  <!-- CENTER: Piano keyboard with harmonics -->
  <div class="app-piano">
    <PianoHarmonics />
  </div>

  <!-- RIGHT: VowelChart / R2 / R1 stacked (D-03) -->
  <div class="app-charts">
    <VowelChart {expertMode} />
    <R2StrategyChart
      f0={voiceParams.f0}
      f2Freq={voiceParams.f2Freq}
      r2Strategy={voiceParams.r2Strategy}
      strategyMode={voiceParams.strategyMode}
      voicePreset={voiceParams.voicePreset}
    />
    <R1StrategyChart
      f0={voiceParams.f0}
      f1Freq={voiceParams.f1Freq}
      r1Strategy={voiceParams.r1Strategy}
      strategyMode={voiceParams.strategyMode}
      voicePreset={voiceParams.voicePreset}
    />
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
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text);
  }
  .expert-toggle input[type="checkbox"] {
    display: none;
  }
  .toggle-track {
    width: 40px;
    height: 22px;
    background: var(--color-border);
    border-radius: 11px;
    position: relative;
    transition: background 0.2s;
  }
  .expert-toggle input:checked + .toggle-track {
    background: var(--color-accent);
  }
  .toggle-thumb {
    width: 18px;
    height: 18px;
    background: var(--color-text);
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: transform 0.2s;
  }
  .expert-toggle input:checked + .toggle-track .toggle-thumb {
    transform: translateX(18px);
  }
  .sidebar-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }
  .section-heading {
    font-size: 16px;
    font-weight: 600;
    line-height: 1.2;
    margin: 0;
    color: var(--color-text);
  }
</style>
