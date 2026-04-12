<script lang="ts">
  import { midiToHz } from '../audio/dsp/pitch-utils.ts';

  interface Props {
    startMidi: number;
    endMidi: number;
    highlightMidi?: number | null;
    pressedKeys?: Set<string>;
    showLabels?: boolean;
    qwertyMap?: Record<string, number>;
    multiTouch?: boolean;
    onkeyclick?: (midi: number) => void;
  }
  let {
    startMidi = 48,
    endMidi = 71,
    highlightMidi = null,
    pressedKeys = new Set(),
    showLabels = false,
    qwertyMap = {},
    multiTouch = true,
    onkeyclick,
  }: Props = $props();

  // Multi-touch state: maps pointerId -> midiNote (D-23)
  let activePointers = $state(new Map<number, number>());
  let touchedMidis = $derived(new Set(activePointers.values()));

  // Black key classification: MIDI % 12 in [1,3,6,8,10]
  const BLACK_NOTE_INDICES = new Set([1, 3, 6, 8, 10]);

  function isBlackKey(midi: number): boolean {
    return BLACK_NOTE_INDICES.has(((midi % 12) + 12) % 12);
  }

  // Build reverse map: MIDI -> key label
  function getMidiToLabel(map: Record<string, number>): Map<number, string> {
    const result = new Map<number, string>();
    for (const [code, midi] of Object.entries(map)) {
      // Extract letter from event.code: "KeyZ" -> "Z", "Digit2" -> "2"
      const label = code.startsWith('Key') ? code.slice(3) : code.startsWith('Digit') ? code.slice(5) : code;
      result.set(midi, label);
    }
    return result;
  }

  // Build reverse map: MIDI -> event.code (for pressedKeys lookup)
  function getMidiToCode(map: Record<string, number>): Map<number, string> {
    const result = new Map<number, string>();
    for (const [code, midi] of Object.entries(map)) {
      result.set(midi, code);
    }
    return result;
  }

  // Layout constants
  const WHITE_KEY_WIDTH = 44;
  const WHITE_KEY_HEIGHT = 120;
  const BLACK_KEY_WIDTH = 28;
  const BLACK_KEY_HEIGHT = 80;

  // Compute white keys array with their positions
  let whiteKeys = $derived.by(() => {
    const keys: { midi: number; x: number }[] = [];
    let xPos = 0;
    for (let midi = startMidi; midi <= endMidi; midi++) {
      if (!isBlackKey(midi)) {
        keys.push({ midi, x: xPos });
        xPos += WHITE_KEY_WIDTH;
      }
    }
    return keys;
  });

  // Compute black keys with positions (centered between adjacent white keys)
  let blackKeys = $derived.by(() => {
    const keys: { midi: number; x: number }[] = [];
    // Build a map of white key positions by midi
    const whiteKeyPositions = new Map<number, number>();
    let xPos = 0;
    for (let midi = startMidi; midi <= endMidi; midi++) {
      if (!isBlackKey(midi)) {
        whiteKeyPositions.set(midi, xPos);
        xPos += WHITE_KEY_WIDTH;
      }
    }
    for (let midi = startMidi; midi <= endMidi; midi++) {
      if (isBlackKey(midi)) {
        // Black key sits between the white key before it and after it
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
  let midiToLabel = $derived(getMidiToLabel(qwertyMap));
  let midiToCode = $derived(getMidiToCode(qwertyMap));

  function isPressed(midi: number): boolean {
    const code = midiToCode.get(midi);
    return code !== undefined && pressedKeys.has(code);
  }

  function getWhiteKeyFill(midi: number): string {
    if (highlightMidi === midi || touchedMidis.has(midi)) return 'var(--color-accent, #6366f1)';
    if (isPressed(midi)) return 'rgba(99, 102, 241, 0.5)';
    return '#d4d4d8';
  }

  function getBlackKeyFill(midi: number): string {
    if (highlightMidi === midi || touchedMidis.has(midi)) return 'var(--color-accent, #6366f1)';
    if (isPressed(midi)) return 'rgba(99, 102, 241, 0.7)';
    return '#27272a';
  }

  function getLabelColor(midi: number): string {
    if (highlightMidi === midi || isPressed(midi) || touchedMidis.has(midi)) return '#ffffff';
    return isBlackKey(midi) ? '#a0a0a0' : '#555555';
  }

  // Pointer interaction: multi-touch with last-note-sets-f0 (D-23)
  let svgEl: SVGSVGElement | undefined = $state();

  function midiFromPointer(e: PointerEvent): number | null {
    if (!svgEl) return null;
    const rect = svgEl.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;
    const svgX = xRatio * svgWidth;
    const svgY = yRatio * WHITE_KEY_HEIGHT;

    // Check black keys first (they're on top)
    if (svgY < BLACK_KEY_HEIGHT) {
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
    svgEl?.setPointerCapture(e.pointerId);

    const midi = midiFromPointer(e);
    if (midi === null) return;

    // Cap at 10 pointers to prevent unbounded growth (T-05-07)
    if (activePointers.size >= 10) return;

    activePointers = new Map(activePointers);
    activePointers.set(e.pointerId, midi);

    // Last-touched note sets f0 (monophonic, D-23)
    onkeyclick?.(midi);
  }

  function onPointerMove(e: PointerEvent) {
    if (!activePointers.has(e.pointerId)) return;
    e.preventDefault();
    const midi = midiFromPointer(e);
    if (midi === null) return;

    const prev = activePointers.get(e.pointerId);
    if (prev !== midi) {
      activePointers = new Map(activePointers);
      activePointers.set(e.pointerId, midi);
      // Last-moved pointer sets f0
      onkeyclick?.(midi);
    }
  }

  function onPointerUp(e: PointerEvent) {
    activePointers = new Map(activePointers);
    activePointers.delete(e.pointerId);
    svgEl?.releasePointerCapture(e.pointerId);

    // If other pointers still active, last remaining sets f0
    if (activePointers.size > 0) {
      const entries = [...activePointers.entries()];
      const lastMidi = entries[entries.length - 1][1];
      onkeyclick?.(lastMidi);
    }
  }

  function onPointerCancel(e: PointerEvent) {
    onPointerUp(e);
  }
</script>

<svg
  class="piano-keyboard"
  bind:this={svgEl}
  viewBox="0 0 {svgWidth} {WHITE_KEY_HEIGHT}"
  preserveAspectRatio="xMidYMid meet"
  role="group"
  aria-label="Piano keyboard"
  style="touch-action: none;"
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerCancel}
>
  <!-- White keys (rendered first, below black keys) -->
  {#each whiteKeys as key (key.midi)}
    <rect
      x={key.x}
      y="0"
      width={WHITE_KEY_WIDTH}
      height={WHITE_KEY_HEIGHT}
      fill={getWhiteKeyFill(key.midi)}
      stroke="#888888"
      stroke-width="1"
      rx="2"
      role="button"
      aria-label="Piano key MIDI {key.midi}"
      style="cursor: pointer;"
    />
    {#if showLabels && midiToLabel.has(key.midi)}
      <text
        x={key.x + WHITE_KEY_WIDTH / 2}
        y={WHITE_KEY_HEIGHT - 12}
        text-anchor="middle"
        font-size="12"
        fill={getLabelColor(key.midi)}
        pointer-events="none"
      >{midiToLabel.get(key.midi)}</text>
    {/if}
  {/each}

  <!-- Black keys (rendered on top) -->
  {#each blackKeys as key (key.midi)}
    <rect
      x={key.x}
      y="0"
      width={BLACK_KEY_WIDTH}
      height={BLACK_KEY_HEIGHT}
      fill={getBlackKeyFill(key.midi)}
      stroke="#333333"
      stroke-width="1"
      rx="2"
      role="button"
      aria-label="Piano key MIDI {key.midi}"
      style="cursor: pointer;"
    />
    {#if showLabels && midiToLabel.has(key.midi)}
      <text
        x={key.x + BLACK_KEY_WIDTH / 2}
        y={BLACK_KEY_HEIGHT - 8}
        text-anchor="middle"
        font-size="12"
        fill={getLabelColor(key.midi)}
        pointer-events="none"
      >{midiToLabel.get(key.midi)}</text>
    {/if}
  {/each}
</svg>

<style>
  .piano-keyboard {
    width: 100%;
    height: auto;
    display: block;
  }
</style>
