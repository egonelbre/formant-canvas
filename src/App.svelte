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
  import { computeTargets } from './lib/strategies/engine.ts';

  const bridge = new AudioBridge();
  let bridgeInitialized = $state(false);

  // Track pressed QWERTY keys (still used for keyboard-driven f0 changes)
  let pressedKeys = $state(new Set<string>());

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

<main>
  <TransportBar onplayclick={handlePlayPause} {bridgeInitialized} />
  <PianoHarmonics />
  <VowelChart />
  <StrategyPanel />
  <PitchSection />
  <VoicePresets />
  <PhonationMode />
  <ExpressionControls />
</main>
