/**
 * Note names in chromatic order starting from C.
 */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/**
 * Log-scale slider boundaries.
 */
const MIN_HZ = 55;
const MAX_HZ = 1100;
const MIN_LOG = Math.log(MIN_HZ);
const MAX_LOG = Math.log(MAX_HZ);

/**
 * Convert a frequency in Hz to the nearest note name, octave, and cents deviation.
 *
 * Uses A4 = 440 Hz as reference (MIDI note 69).
 *
 * @param hz - Frequency in Hz
 * @returns Object with note name, octave number, and cents deviation from nearest note
 */
export function hzToNote(hz: number): { name: string; octave: number; cents: number } {
  const midiFloat = 69 + 12 * Math.log2(hz / 440);
  const nearestMidi = Math.round(midiFloat);
  const cents = Math.round((midiFloat - nearestMidi) * 100);
  const noteIndex = ((nearestMidi % 12) + 12) % 12;
  const octave = Math.floor(nearestMidi / 12) - 1;

  return {
    name: NOTE_NAMES[noteIndex],
    octave,
    cents,
  };
}

/**
 * Convert a MIDI note number to frequency in Hz.
 *
 * Uses A4 = 440 Hz = MIDI 69 as reference.
 *
 * @param midi - MIDI note number (e.g. 69 = A4)
 * @returns Frequency in Hz
 */
export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Convert a slider position [0, 1] to frequency in Hz using log scale.
 *
 * Maps linearly in log-space so that each semitone occupies equal visual distance.
 * Range: 55 Hz (A1) to 1100 Hz (C6).
 *
 * @param position - Slider position [0, 1]
 * @returns Frequency in Hz
 */
export function sliderToHz(position: number): number {
  return Math.exp(MIN_LOG + position * (MAX_LOG - MIN_LOG));
}

/**
 * Convert a frequency in Hz to a slider position [0, 1] using log scale.
 *
 * Inverse of sliderToHz.
 *
 * @param hz - Frequency in Hz
 * @returns Slider position [0, 1]
 */
export function hzToSlider(hz: number): number {
  return (Math.log(hz) - MIN_LOG) / (MAX_LOG - MIN_LOG);
}

/**
 * Format a frequency as a pitch readout string per D-05.
 *
 * Format: "Hz . NoteName . cents" (e.g. "220 Hz . A3 . +0c")
 *
 * @param hz - Frequency in Hz
 * @returns Formatted readout string
 */
export function formatPitchReadout(hz: number): string {
  const note = hzToNote(hz);
  const sign = note.cents >= 0 ? '+' : '';
  return `${Math.round(hz)} Hz . ${note.name}${note.octave} . ${sign}${note.cents}c`;
}
