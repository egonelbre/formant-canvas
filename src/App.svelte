<script lang="ts">
  import { AudioBridge } from './lib/audio/bridge.ts';
  import { voiceParams } from './lib/audio/state.svelte.ts';

  const bridge = new AudioBridge();
  let bridgeInitialized = $state(false);

  // Vowel interpolation targets (D-01, D-03)
  const VOWEL_A = { f1: 730, f2: 1090, f3: 2440, f4: 3300 };
  const VOWEL_I = { f1: 270, f2: 2290, f3: 3010, f4: 3300 };

  // Slider position: 0 = /a/, 1 = /i/ (UI-only state, not an audio param)
  let vowelT = $state(0);

  // Interpolate formant frequencies from vowelT and write to voiceParams (LINK-02)
  $effect(() => {
    const t = vowelT;
    voiceParams.f1Freq = VOWEL_A.f1 + t * (VOWEL_I.f1 - VOWEL_A.f1);
    voiceParams.f2Freq = VOWEL_A.f2 + t * (VOWEL_I.f2 - VOWEL_A.f2);
    voiceParams.f3Freq = VOWEL_A.f3 + t * (VOWEL_I.f3 - VOWEL_A.f3);
    voiceParams.f4Freq = VOWEL_A.f4 + t * (VOWEL_I.f4 - VOWEL_A.f4);
  });

  // Forward all voiceParams changes to the audio graph (AUDIO-06)
  $effect(() => {
    // Read all reactive fields to establish Svelte dependencies
    void voiceParams.f0;
    void voiceParams.f1Freq; void voiceParams.f1BW; void voiceParams.f1Gain;
    void voiceParams.f2Freq; void voiceParams.f2BW; void voiceParams.f2Gain;
    void voiceParams.f3Freq; void voiceParams.f3BW; void voiceParams.f3Gain;
    void voiceParams.f4Freq; void voiceParams.f4BW; void voiceParams.f4Gain;
    void voiceParams.masterGain;
    void voiceParams.aspirationLevel;
    void voiceParams.openQuotient;
    bridge.syncParams();
  });

  // Play/pause handler with AudioContext resume on gesture (D-05, D-06, AUDIO-08)
  async function handlePlayPause() {
    if (!bridgeInitialized) {
      await bridge.init();
      bridgeInitialized = true;
    }
    await bridge.resume();
    if (voiceParams.playing) {
      bridge.stop();
      voiceParams.playing = false;
    } else {
      bridge.start();
      voiceParams.playing = true;
    }
  }
</script>

<main>
  <h1>Formant Canvas</h1>
  <p>Phase 1: Audio Closed Loop</p>

  <div class="controls">
    <button data-testid="play-button" onclick={handlePlayPause}>
      {voiceParams.playing ? 'Pause' : 'Play'}
    </button>

    <label>
      Vowel (/a/ — /i/)
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        bind:value={vowelT}
        style="touch-action: none;"
      />
    </label>

    <label>
      Volume
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        bind:value={voiceParams.masterGain}
        style="touch-action: none;"
      />
    </label>
  </div>

  <div class="readout">
    <p>F1: {Math.round(voiceParams.f1Freq)} Hz</p>
    <p>F2: {Math.round(voiceParams.f2Freq)} Hz</p>
    <p>F3: {Math.round(voiceParams.f3Freq)} Hz</p>
    <p>F4: {Math.round(voiceParams.f4Freq)} Hz</p>
    <p>Volume: {Math.round(voiceParams.masterGain * 100)}%</p>
  </div>
</main>
