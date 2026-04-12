import { scaleLinear } from 'd3-scale';

/**
 * Create a linear scale mapping pitch Hz to pixel X coordinates.
 * Sundberg reference charts use linear axes (not log).
 */
export function createPitchScale(minHz: number, maxHz: number, widthPx: number) {
  return scaleLinear().domain([minHz, maxHz]).range([0, widthPx]);
}

/**
 * Create a linear scale mapping frequency Hz to pixel Y coordinates.
 * Inverted range for SVG coordinate system (0 = top).
 */
export function createFreqScale(minHz: number, maxHz: number, heightPx: number) {
  return scaleLinear().domain([minHz, maxHz]).range([heightPx, 0]);
}

/**
 * Compute the endpoints of a diagonal line y = harmonic * x on a Sundberg chart,
 * clamped to the given y domain.
 *
 * For each raw endpoint: compute y = harmonic * x, then clamp y to [yDomain.min, yDomain.max].
 * If y was clamped, back-compute x = y / harmonic.
 *
 * @returns Endpoints in Hz coordinates {x1, y1, x2, y2}
 */
export function computeDiagonalLine(
  harmonic: number,
  xDomain: { min: number; max: number },
  yDomain: { min: number; max: number },
): { x1: number; y1: number; x2: number; y2: number } {
  // Start endpoint: x = xDomain.min
  let x1 = xDomain.min;
  let y1 = harmonic * x1;
  if (y1 < yDomain.min) {
    y1 = yDomain.min;
    x1 = y1 / harmonic;
  } else if (y1 > yDomain.max) {
    y1 = yDomain.max;
    x1 = y1 / harmonic;
  }

  // End endpoint: x = xDomain.max
  let x2 = xDomain.max;
  let y2 = harmonic * x2;
  if (y2 < yDomain.min) {
    y2 = yDomain.min;
    x2 = y2 / harmonic;
  } else if (y2 > yDomain.max) {
    y2 = yDomain.max;
    x2 = y2 / harmonic;
  }

  return { x1, y1, x2, y2 };
}

/**
 * Note names in chromatic order starting from C.
 */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/**
 * Convert a frequency in Hz to the nearest note name (e.g. 'A4', 'C4').
 * Uses A4 = 440 Hz as reference, 12-TET tuning.
 */
export function pitchToNoteName(hz: number): string {
  const midiFloat = 69 + 12 * Math.log2(hz / 440);
  const nearestMidi = Math.round(midiFloat);
  const noteIndex = ((nearestMidi % 12) + 12) % 12;
  const octave = Math.floor(nearestMidi / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/**
 * Generate axis tick marks at specific note positions within a range.
 *
 * @param minHz - Minimum frequency
 * @param maxHz - Maximum frequency
 * @param noteNames - Note names to include (e.g. ['C3', 'C4', 'C5'])
 * @returns Array of {hz, label} for tick placement
 */
export function generateAxisTicks(
  minHz: number,
  maxHz: number,
  noteNames: string[],
): Array<{ hz: number; label: string }> {
  const ticks: Array<{ hz: number; label: string }> = [];

  for (const name of noteNames) {
    // Parse note name like "C4" or "A#3"
    const match = name.match(/^([A-G]#?)(\d+)$/);
    if (!match) continue;

    const noteName = match[1];
    const octave = parseInt(match[2], 10);
    const noteIdx = NOTE_NAMES.indexOf(noteName as (typeof NOTE_NAMES)[number]);
    if (noteIdx === -1) continue;

    const midi = (octave + 1) * 12 + noteIdx;
    const hz = 440 * Math.pow(2, (midi - 69) / 12);

    if (hz >= minHz && hz <= maxHz) {
      ticks.push({ hz, label: name });
    }
  }

  return ticks;
}
