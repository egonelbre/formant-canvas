<script lang="ts">
  import { voiceParams } from '../audio/state.svelte.ts';
  import { midiToHz } from '../audio/dsp/pitch-utils.ts';
  import HarmonicBars from './HarmonicBars.svelte';
  import FormantCurves from './FormantCurves.svelte';

  // Piano range: C2 (MIDI 36) to B8 (MIDI 107) — extends to ~5kHz
  // so F2-F4 formant markers are visible on the keyboard
  const START_MIDI = 36;
  const END_MIDI = 107;

  // Layout constants
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

  // Invariant: START_MIDI must be a white key for black-key layout to work correctly
  if (isBlackKey(START_MIDI)) {
    throw new Error(`START_MIDI ${START_MIDI} must be a white key`);
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

  // Pixels per semitone: svgWidth covers only white keys, so adjust for
  // the total semitone span (12 semitones per 7 white keys)
  let pxPerSemitone = $derived(svgWidth / (whiteKeys.length * (12 / 7)));

  /**
   * Convert a frequency in Hz to SVG x coordinate.
   * Maps via MIDI float, interpolating between key centers.
   */
  function freqToX(freq: number): number {
    const midiFloat = 69 + 12 * Math.log2(freq / 440);

    if (midiFloat >= START_MIDI && midiFloat <= END_MIDI) {
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
    }

    // Fallback: linear semitone scale
    return (midiFloat - START_MIDI) * pxPerSemitone;
  }

  /**
   * Convert SVG x coordinate back to frequency in Hz.
   */
  function xToFreq(x: number): number {
    const midiFloat = START_MIDI + x / pxPerSemitone;
    return 440 * Math.pow(2, (midiFloat - 69) / 12);
  }

  // Current f0 highlighted key
  let highlightMidi = $derived(Math.round(69 + 12 * Math.log2(voiceParams.f0 / 440)));

  // C-labels
  const C_LABELS = [
    { midi: 36, label: 'C2' },
    { midi: 48, label: 'C3' },
    { midi: 60, label: 'C4' },
    { midi: 72, label: 'C5' },
    { midi: 84, label: 'C6' },
    { midi: 96, label: 'C7' },
  ];

  function getWhiteKeyFill(midi: number): string {
    if (highlightMidi === midi) return '#6366f1';
    return '#d4d4d8';
  }

  function getBlackKeyFill(midi: number): string {
    if (highlightMidi === midi) return '#6366f1';
    return '#27272a';
  }

  // --- Pointer interaction ---
  // Two modes: dragging on piano keys sets f0, dragging on harmonic region moves formants
  type DragMode = 'none' | 'piano' | 'formant';
  let dragMode = $state<DragMode>('none');
  let dragFormantIndex = $state(-1); // which formant (0-3) is being dragged
  let svgEl: SVGSVGElement | undefined = $state();

  const FORMANT_FREQ_KEYS: ('f1Freq' | 'f2Freq' | 'f3Freq' | 'f4Freq')[] = ['f1Freq', 'f2Freq', 'f3Freq', 'f4Freq'];
  const FORMANT_COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7'];

  // Typical frequency ranges for each formant in speech
  const FORMANT_RANGES: { min: number; max: number }[] = [
    { min: 200, max: 1000 },   // F1
    { min: 600, max: 3000 },   // F2
    { min: 1500, max: 3500 },  // F3
    { min: 2500, max: 5000 },  // F4
  ];

  function pointerToSvg(e: PointerEvent): { svgX: number; svgY: number } | null {
    if (!svgEl) return null;
    const rect = svgEl.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;
    return { svgX: xRatio * svgWidth, svgY: yRatio * SVG_HEIGHT };
  }

  function findNearestFormant(svgX: number): number {
    const freq = xToFreq(svgX);
    let bestIdx = 0;
    let bestDist = Infinity;
    const formants = voiceParams.formants;
    for (let i = 0; i < formants.length; i++) {
      // Compare in log-frequency space for perceptually uniform distance
      const dist = Math.abs(Math.log2(freq) - Math.log2(formants[i].freq));
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  function midiFromSvgX(svgX: number, svgY: number): number | null {
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
    const pos = pointerToSvg(e);
    if (!pos) return;
    svgEl?.setPointerCapture(e.pointerId);

    if (pos.svgY < HARMONIC_REGION_HEIGHT) {
      // Clicking in harmonic region — start formant drag
      dragMode = 'formant';
      dragFormantIndex = findNearestFormant(pos.svgX);
      const freq = xToFreq(pos.svgX);
      voiceParams[FORMANT_FREQ_KEYS[dragFormantIndex]] = Math.round(freq);
    } else {
      // Clicking on piano keys — set f0
      dragMode = 'piano';
      const midi = midiFromSvgX(pos.svgX, pos.svgY);
      if (midi !== null) voiceParams.f0 = midiToHz(midi);
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (dragMode === 'none') return;
    e.preventDefault();
    const pos = pointerToSvg(e);
    if (!pos) return;

    if (dragMode === 'formant') {
      const freq = xToFreq(pos.svgX);
      const clamped = Math.max(100, Math.min(5000, Math.round(freq)));
      voiceParams[FORMANT_FREQ_KEYS[dragFormantIndex]] = clamped;
    } else if (dragMode === 'piano') {
      const midi = midiFromSvgX(pos.svgX, pos.svgY);
      if (midi !== null) voiceParams.f0 = midiToHz(midi);
    }
  }

  function onPointerUp(e: PointerEvent) {
    dragMode = 'none';
    dragFormantIndex = -1;
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
    style="touch-action: none; cursor: {dragMode === 'formant' ? 'ew-resize' : 'default'};"
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
  >
    <!-- Harmonic bars region (0-80px) -->
    <HarmonicBars {freqToX} barRegionHeight={BAR_REGION_HEIGHT} regionBottom={HARMONIC_REGION_HEIGHT} />

    <!-- Formant curves region (0-80px, on top of bars) -->
    <FormantCurves {freqToX} curveRegionHeight={BAR_REGION_HEIGHT} regionBottom={HARMONIC_REGION_HEIGHT} />

    <!-- Formant range band (shown during formant drag) -->
    {#if dragMode === 'formant' && dragFormantIndex >= 0}
      {@const range = FORMANT_RANGES[dragFormantIndex]}
      {@const color = FORMANT_COLORS[dragFormantIndex]}
      <rect
        x={freqToX(range.min)}
        y={0}
        width={freqToX(range.max) - freqToX(range.min)}
        height={SVG_HEIGHT}
        fill={color}
        opacity="0.08"
        pointer-events="none"
      />
      <line
        x1={freqToX(range.min)} y1={0}
        x2={freqToX(range.min)} y2={SVG_HEIGHT}
        stroke={color} stroke-width="1" opacity="0.3" pointer-events="none"
      />
      <line
        x1={freqToX(range.max)} y1={0}
        x2={freqToX(range.max)} y2={SVG_HEIGHT}
        stroke={color} stroke-width="1" opacity="0.3" pointer-events="none"
      />
    {/if}

    <!-- Invisible hit area for formant dragging in harmonic region -->
    <rect
      x={0}
      y={0}
      width={svgWidth}
      height={HARMONIC_REGION_HEIGHT}
      fill="transparent"
      style="cursor: ew-resize;"
    />

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
