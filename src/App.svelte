<script lang="ts">
  import { AudioBridge } from './lib/audio/bridge.ts';
  import { voiceParams } from './lib/audio/state.svelte.ts';
  import { QWERTY_MAP } from './lib/data/qwerty-map.ts';
  import { midiToHz } from './lib/audio/dsp/pitch-utils.ts';
  import TransportBar from './lib/components/TransportBar.svelte';
  import PitchSection from './lib/components/PitchSection.svelte';
  import VoicePresets from './lib/components/VoicePresets.svelte';
  import PhonationMode from './lib/components/PhonationMode.svelte';
  import ExpressionControls from './lib/components/ExpressionControls.svelte';

  const bridge = new AudioBridge();
  let bridgeInitialized = $state(false);

  // Track pressed QWERTY keys for visual highlight on piano
  let pressedKeys = $state(new Set<string>());

  // Forward ALL voiceParams changes to audio graph (AUDIO-06, LINK-02)
  $effect(() => {
    // Read every reactive field to establish Svelte dependency tracking
    void voiceParams.f0;
    void voiceParams.f1Freq; void voiceParams.f1BW; void voiceParams.f1Gain;
    void voiceParams.f2Freq; void voiceParams.f2BW; void voiceParams.f2Gain;
    void voiceParams.f3Freq; void voiceParams.f3BW; void voiceParams.f3Gain;
    void voiceParams.f4Freq; void voiceParams.f4BW; void voiceParams.f4Gain;
    void voiceParams.masterGain;
    void voiceParams.aspirationLevel;
    void voiceParams.openQuotient;
    void voiceParams.vibratoRate;
    void voiceParams.vibratoExtent;
    void voiceParams.jitterAmount;
    void voiceParams.spectralTilt;
    void voiceParams.muted;
    bridge.syncParams();
  });

  // Play/pause handler (D-15: responds instantly)
  async function handlePlayPause() {
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
  <PitchSection {pressedKeys} />
  <VoicePresets />
  <PhonationMode />
  <ExpressionControls />
</main>
