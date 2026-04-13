<script lang="ts">
  import { audioBridge } from './lib/audio/bridge.ts';
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
  import HelpDialog from './lib/components/HelpDialog.svelte';
  import AboutDialog from './lib/components/AboutDialog.svelte';
  import { computeTargets } from './lib/strategies/engine.ts';
  import { pickStrategy } from './lib/strategies/auto-strategy.ts';

  let expertMode = $state(localStorage.getItem('expertMode') === 'true');
  let aboutOpen = $state(false);

  $effect(() => {
    localStorage.setItem('expertMode', String(expertMode));
  });

  const bridge = audioBridge;
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
    <button class="about-btn" onclick={() => aboutOpen = true} aria-label="About">?</button>
  </header>

  <AboutDialog bind:open={aboutOpen} />

  <!-- PANELS: horizontal control strip -->
  <div class="panels">
    <div class="panel-col">
      <HelpDialog title="Pitch and Vibrato">
        <p>
          <strong>Fundamental frequency (f0)</strong> is the rate at which the vocal folds vibrate,
          measured in Hertz. A higher f0 means a higher perceived pitch. Adult male voices typically
          range from about 85 to 180 Hz, while adult female voices range from about 165 to 255 Hz.
        </p>
        <p>
          You can change the pitch using the piano keyboard at the bottom of the screen, or by
          pressing the QWERTY keys on your computer keyboard (mapped like a piano).
        </p>
        <h2>Vibrato</h2>
        <p>
          Vibrato is a periodic variation in pitch used by singers to add warmth, projection,
          and expressiveness to sustained notes. The <strong>rate</strong> parameter controls how fast
          the pitch oscillates (typically 5--7 Hz in classical singing), while <strong>extent</strong>
          controls how wide the pitch swings (usually about a semitone).
        </p>
        <p>
          Changing pitch affects which harmonics fall near which formant resonances. This is why
          the same vowel can sound different at different pitches -- the harmonic-formant alignment
          shifts, changing which harmonics get amplified.
        </p>
      </HelpDialog>
      <PitchSection {expertMode} />
      <ExpressionControls {expertMode} />
      <VibratoVisual rate={voiceParams.vibratoRate} extent={voiceParams.vibratoExtent} />
      {#if expertMode}
        <div class="expert-formant-bw">
          <HelpDialog title="Formants">
            <p>
              <strong>Formants</strong> are resonance peaks created by the vocal tract -- the tube-shaped
              airway from the vocal folds to the lips. Each formant is characterized by its
              <strong>frequency</strong> (where the peak is) and its <strong>bandwidth</strong> (how
              wide the peak is).
            </p>
            <h2>4th-order</h2>
            <p>
              Enabling <strong>4th-order</strong> doubles each formant filter (two filters in series
              per formant). This creates sharper resonance peaks with steeper rolloff, increasing the
              contrast between formant peaks and the valleys between them. The effect is a more
              defined, focused sound.
            </p>
            <h2>Bandwidth</h2>
            <p>
              Bandwidth controls how sharp or broad each resonance peak is. A <strong>narrow
              bandwidth</strong> creates a prominent, ringing resonance that strongly amplifies
              harmonics near it. A <strong>wide bandwidth</strong> creates a subtle, damped resonance
              with less effect on the spectrum.
            </p>
            <p>
              R1 through R4 correspond to the first four resonances of the vocal tract. R1 and R2
              primarily determine vowel quality, while R3 and R4 contribute to voice timbre and the
              singer's formant cluster.
            </p>
            <p>
              Trained singers tend to have narrower bandwidths than untrained speakers, which
              contributes to the characteristic "ring" or "ping" of a well-produced singing voice.
            </p>
          </HelpDialog>
          <h2 class="section-heading">Formants</h2>
          <label class="toggle-row">
            <span class="toggle-label">4th-order</span>
            <input type="checkbox" checked={voiceParams.filterOrder === 4}
              onchange={() => audioBridge.toggleFilterOrder(voiceParams.filterOrder === 4 ? 2 : 4)} />
          </label>
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
      <HelpDialog title="Phonation Type">
        <p>
          <strong>Phonation</strong> describes how the vocal folds vibrate -- the voice source
          before it gets filtered by the vocal tract. Different phonation types produce different
          harmonic spectra, which changes the raw material that formants then shape.
        </p>
        <h2>Types</h2>
        <ul>
          <li><strong>Modal:</strong> Normal, efficient vocal fold vibration used in regular speech
          and most singing. The folds close completely during each cycle, producing a rich harmonic
          spectrum.</li>
          <li><strong>Breathy:</strong> The vocal folds don't close completely, letting turbulent air
          through. This adds noise to the signal and weakens higher harmonics, creating an airy,
          intimate quality used in soft speech and some popular singing styles.</li>
          <li><strong>Pressed:</strong> The vocal folds press tightly together with high medial
          compression. This produces a strained, intense quality with strong higher harmonics, used
          for emphasis or emotional intensity.</li>
        </ul>
        <h2>Glottal models</h2>
        <p>
          Two voice source models are available:
        </p>
        <ul>
          <li><strong>Rosenberg:</strong> A simple glottal pulse model with direct control over
          Open Quotient and Spectral Tilt. Good for basic exploration.</li>
          <li><strong>LF (Liljencrants-Fant):</strong> A research-standard glottal model that
          captures the full shape of the glottal flow derivative. Controlled by a single
          <strong>Rd</strong> parameter (0.3&ndash;2.7) that smoothly varies voice quality from
          pressed to breathy. Lower Rd values produce a sharper, more pressed voice; higher values
          produce a softer, breathier quality.</li>
        </ul>
        <h2>Expert parameters</h2>
        <p>
          In expert mode, you can fine-tune the source signal. With <strong>Rosenberg</strong>:
          <strong>Open Quotient</strong> controls what fraction of each glottal cycle the folds
          are open, and <strong>Spectral Tilt</strong> controls how quickly harmonics decrease
          in amplitude. With <strong>LF</strong>: the <strong>Rd</strong> slider controls voice
          quality, and the pulse visual shows timing markers (Tp, Te, Ta) and the underlying
          R-parameters (Ra, Rk, Rg). <strong>Aspiration</strong> adds turbulent noise in both models.
        </p>
      </HelpDialog>
      <PhonationMode {expertMode} />
    </div>
    <div class="panel-col">
      <HelpDialog title="Vocal Strategy">
        <p>
          Trained singers systematically tune their vocal tract resonances to align with harmonics
          of their fundamental frequency. This alignment -- called <strong>resonance tracking</strong>
          or <strong>formant tuning</strong> -- dramatically increases vocal power and projection
          without requiring extra muscular effort from the vocal folds.
        </p>
        <p>
          Different strategies describe which harmonic a resonance tracks. For example,
          <strong>R1:2f0</strong> means the first resonance tracks the second harmonic, while
          <strong>R2:3f0</strong> means the second resonance tracks the third harmonic. The notation
          tells you which resonance (R1 or R2) is tuned to which multiple of f0.
        </p>
        <p>
          <strong>Auto mode</strong> selects strategies based on voice type and current pitch range,
          mimicking what trained singers do naturally. Sopranos use different strategies than basses
          because their pitch ranges interact with formant regions differently.
        </p>
        <p>
          This is the core concept from Kenneth Bozeman's vocal acoustics pedagogy: understanding
          resonance-harmonic relationships is key to efficient, powerful singing across the full
          range.
        </p>
      </HelpDialog>
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
      <HelpDialog title="Vowel Chart (F1/F2 Space)">
        <p>
          The vowel chart maps the two most important formant frequencies: <strong>R1</strong>
          (first resonance, vertical axis) corresponds to jaw openness, and <strong>R2</strong>
          (second resonance, horizontal axis) corresponds to tongue frontness/backness. This maps
          directly to the IPA vowel quadrilateral used in phonetics.
        </p>
        <p>
          Open vowels like "ah" appear at the bottom of the chart (high R1 frequency), while closed
          vowels like "ee" appear at the top (low R1). Front vowels like "ee" appear on the left
          (high R2), while back vowels like "oo" appear on the right (low R2).
        </p>
        <p>
          <strong>Drag the dot</strong> to change the vowel continuously, or <strong>click IPA
          symbols</strong> to snap to standard vowel positions. The data points shown are from
          Hillenbrand et al. (1995), a large-scale acoustic study of American English vowels.
        </p>
        <p>
          The connection between tongue position and formant frequency is the foundation of acoustic
          phonetics. Moving your tongue forward raises R2; opening your jaw raises R1. Every vowel
          in every language can be located in this two-dimensional space.
        </p>
      </HelpDialog>
      <VowelChart {expertMode} />
    </div>
    <div class="right-chart right-r2">
      <HelpDialog title="R2 Strategy Chart">
        <p>
          This chart shows the <strong>second resonance (R2)</strong> frequency on the vertical axis
          versus fundamental frequency (f0) on the horizontal axis. Diagonal lines represent
          harmonics of f0 -- the 2nd, 3rd, 4th harmonic, and so on.
        </p>
        <p>
          When R2 aligns with a harmonic (sits on a diagonal line), the voice gains significant
          energy at that frequency. R2 strategies are important for <strong>vowel modification</strong>
          -- singers adjust R2 to maintain intelligibility and projection as pitch changes, especially
          in the upper range where vowels naturally converge.
        </p>
        <p>
          The <strong>shaded region</strong> shows the typical R2 range for the selected voice type.
          Different voice types have different R2 ranges because of differences in vocal tract length
          and shape.
        </p>
      </HelpDialog>
      <R2StrategyChart
        f0={voiceParams.f0}
        f2Freq={voiceParams.f2Freq}
        r2Strategy={voiceParams.r2Strategy}
        strategyMode={voiceParams.strategyMode}
        voicePreset={voiceParams.voicePreset}
      />
    </div>
    <div class="right-chart right-r1">
      <HelpDialog title="R1 Strategy Chart">
        <p>
          This chart shows the <strong>first resonance (R1)</strong> frequency on the vertical axis
          versus fundamental frequency (f0) on the horizontal axis. Diagonal lines represent
          harmonics of f0 (1x, 2x, etc.).
        </p>
        <p>
          When a resonance "rides" a harmonic -- staying on or near a diagonal line as pitch
          changes -- the voice gains significant power at that frequency. This is the essence of
          resonance tracking: the singer adjusts their vocal tract to keep a formant aligned with
          a specific harmonic.
        </p>
        <p>
          The <strong>shaded region</strong> shows the typical R1 range for the selected voice type.
          Sopranos often tune R1 to the first or second harmonic (<strong>R1:f0</strong> or
          <strong>R1:2f0</strong>) in their upper range -- this is the acoustic basis of
          <strong>vowel modification</strong>, where singers subtly change their vowel to maintain
          resonance alignment at high pitches.
        </p>
      </HelpDialog>
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
  .fullscreen-btn:hover,
  .about-btn:hover {
    background: var(--color-hover);
    color: var(--color-text);
  }

  .about-btn {
    width: 32px;
    height: 32px;
    min-width: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    font-size: 16px;
    font-weight: 700;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    color: var(--color-text-secondary);
    cursor: pointer;
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
  .toggle-row {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: 13px;
    color: var(--color-text);
    cursor: pointer;
    user-select: none;
  }
  .toggle-row .toggle-label {
    font-weight: 400;
  }
  .formant-readouts .readout {
    font-family: monospace;
    font-size: 12px;
    color: var(--color-text-secondary);
  }
</style>
