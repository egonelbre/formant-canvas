<script lang="ts">
  import { voiceParams } from '../audio/state.svelte.ts';
  import { midiToHz } from '../audio/dsp/pitch-utils.ts';
  import HarmonicBars from './HarmonicBars.svelte';
  import FormantCurves from './FormantCurves.svelte';

  // Piano range: C2 (MIDI 36) to B6 (MIDI 83) = 5 octaves
  const START_MIDI = 36;
  const END_MIDI = 83;

  // Layout constants (per UI-SPEC Section 2)
  const WHITE_KEY_WIDTH = 14;
  const WHITE_KEY_HEIGHT = 120;
  const BLACK_KEY_WIDTH = 9;
  const BLACK_KEY_HEIGHT = 52;
  const HARMONIC_REGION_HEIGHT = 80;
  const BAR_REGION_HEIGHT = 72; // 80px minus 8px top margin
  const SVG_HEIGHT = HARMONIC_REGION_HEIGHT + WHITE_KEY_HEIGHT; // 200

  // Black key classification: MIDI % 12 in [1,3,6,8,10]
  const BLACK_NOTE_INDICES = new Set([1, 3, 6, 8, 10]);

  function isBlackKey(midi: number): boolean {
    return BLACK_NOTE_INDICES.has(((midi % 12) + 12) % 12);
  }

  // Compute white keys array with positions
  let whiteKeys = $derived.by(() => {
    const keys: { midi: number; x: number }[] = [];
    let xPos = 0;
    for (let midi = START_MIDI; midi <= END_MIDI; midi++) {
      if (!isBlackKey(midi)) {
        keys.push({ midi, x: xPos });
        xPos += WHITE_KEY_WIDTH;
      }
    }
    return keys;
  });

  // Compute black keys with positions (centered on boundary between adjacent white keys)
  let blackKeys = $derived.by(() => {
    const keys: { midi: number; x: number }[] = [];
    const whiteKeyPositions = new Map<number, number>();
    let xPos = 0;
    for (let midi = START_MIDI; midi <= END_MIDI; midi++) {
      if (!isBlackKey(midi)) {
        whiteKeyPositions.set(midi, xPos);
        xPos += WHITE_KEY_WIDTH;
      }
    }
    for (let midi = START_MIDI; midi <= END_MIDI; midi++) {
      if (isBlackKey(midi)) {
        const prevWhite = midi - 1;
        const prevX = whiteKeyPositions.get(prevWhite);
        if (prevX !== undefined) {
          keys.push({
            midi,
            x: prevX + WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2,
          });
        }
      }
    }
    return keys;
  });

  let svgWidth = $derived(whiteKeys.length * WHITE_KEY_WIDTH);

  // Precompute x-center position for every MIDI note in range
  let midiCenterX = $derived.by(() => {
    const centers = new Map<number, number>();
    for (const key of whiteKeys) {
      centers.set(key.midi, key.x + WHITE_KEY_WIDTH / 2);
    }
    for (const key of blackKeys) {
      centers.set(key.midi, key.x + BLACK_KEY_WIDTH / 2);
    }
    return centers;
  });

  /**
   * Convert a frequency in Hz to SVG x coordinate.
   * Maps via MIDI float, linearly interpolating between key centers.
   */
  function freqToX(freq: number): number {
    const midiFloat = 69 + 12 * Math.log2(freq / 440);
    const midiLow = Math.floor(midiFloat);
    const midiHigh = midiLow + 1;
    const frac = midiFloat - midiLow;

    const centers = midiCenterX;
    const xLow = centers.get(midiLow);
    const xHigh = centers.get(midiHigh);

    if (xLow !== undefined && xHigh !== undefined) {
      return xLow + frac * (xHigh - xLow);
    }
    if (xLow !== undefined) return xLow;
    if (xHigh !== undefined) return xHigh;

    // Extrapolate for out-of-range values
    // Use linear scale: each semitone spans roughly WHITE_KEY_WIDTH * 7/12
    const semitonePx = (svgWidth / (END_MIDI - START_MIDI));
    return (midiFloat - START_MIDI) * semitonePx;
  }

  // Current f0 highlighted key
  let highlightMidi = $derived(Math.round(69 + 12 * Math.log2(voiceParams.f0 / 440)));

  // C-labels for C2 (36), C3 (48), C4 (60), C5 (72)
  const C_LABELS = [
    { midi: 36, label: 'C2' },
    { midi: 48, label: 'C3' },
    { midi: 60, label: 'C4' },
    { midi: 72, label: 'C5' },
  ];

  function getWhiteKeyFill(midi: number): string {
    if (highlightMidi === midi) return '#6366f1';
    return '#d4d4d8';
  }

  function getBlackKeyFill(midi: number): string {
    if (highlightMidi === midi) return '#6366f1';
    return '#27272a';
  }

  // Pointer drag support: click or drag across keys to set pitch
  let dragging = $state(false);
  let svgEl: SVGSVGElement | undefined = $state();

  function midiFromPointer(e: PointerEvent): number | null {
    if (!svgEl) return null;
    const rect = svgEl.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;
    const svgX = xRatio * svgWidth;
    const svgY = yRatio * SVG_HEIGHT;

    // Only respond to clicks in the piano key region (y >= 80)
    if (svgY < HARMONIC_REGION_HEIGHT) return null;

    const keyY = svgY - HARMONIC_REGION_HEIGHT;

    // Check black keys first (they're on top)
    if (keyY < BLACK_KEY_HEIGHT) {
      for (const key of blackKeys) {
        if (svgX >= key.x && svgX < key.x + BLACK_KEY_WIDTH) {
          return key.midi;
        }
      }
    }
    // Then white keys
    for (const key of whiteKeys) {
      if (svgX >= key.x && svgX < key.x + WHITE_KEY_WIDTH) {
        return key.midi;
      }
    }
    return null;
  }

  function onPointerDown(e: PointerEvent) {
    e.preventDefault();
    dragging = true;
    svgEl?.setPointerCapture(e.pointerId);
    const midi = midiFromPointer(e);
    if (midi !== null) voiceParams.f0 = midiToHz(midi);
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    e.preventDefault();
    const midi = midiFromPointer(e);
    if (midi !== null) voiceParams.f0 = midiToHz(midi);
  }

  function onPointerUp(e: PointerEvent) {
    dragging = false;
    svgEl?.releasePointerCapture(e.pointerId);
  }
</script>

<div class="section">
  <h2 class="section-heading">Harmonics</h2>
  <svg
    class="piano-harmonics"
    bind:this={svgEl}
    viewBox="0 0 {svgWidth} {SVG_HEIGHT}"
    preserveAspectRatio="xMidYMid meet"
    role="group"
    aria-label="Piano keyboard with harmonics"
    style="touch-action: none;"
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
  >
    <!-- Harmonic bars region (0-80px) -->
    <HarmonicBars {freqToX} barRegionHeight={BAR_REGION_HEIGHT} />

    <!-- Formant curves region (0-80px, on top of bars) -->
    <FormantCurves {freqToX} curveRegionHeight={BAR_REGION_HEIGHT} />

    <!-- White keys (bottom 120px, starting at y=80) -->
    {#each whiteKeys as key (key.midi)}
      <rect
        x={key.x}
        y={HARMONIC_REGION_HEIGHT}
        width={WHITE_KEY_WIDTH}
        height={WHITE_KEY_HEIGHT}
        fill={getWhiteKeyFill(key.midi)}
        stroke="#888888"
        stroke-width="0.5"
        style="cursor: pointer;"
      />
    {/each}

    <!-- Black keys -->
    {#each blackKeys as key (key.midi)}
      <rect
        x={key.x}
        y={HARMONIC_REGION_HEIGHT}
        width={BLACK_KEY_WIDTH}
        height={BLACK_KEY_HEIGHT}
        fill={getBlackKeyFill(key.midi)}
        stroke="#333333"
        stroke-width="0.5"
        style="cursor: pointer;"
      />
    {/each}

    <!-- C-labels below keys -->
    {#each C_LABELS as cl (cl.midi)}
      {@const wk = whiteKeys.find(k => k.midi === cl.midi)}
      {#if wk}
        <text
          x={wk.x + WHITE_KEY_WIDTH / 2}
          y={198}
          text-anchor="middle"
          font-size="11"
          fill="#8a8aaa"
          pointer-events="none"
        >{cl.label}</text>
      {/if}
    {/each}
  </svg>
</div>

<style>
  .piano-harmonics {
    width: 100%;
    height: auto;
    display: block;
  }
</style>
