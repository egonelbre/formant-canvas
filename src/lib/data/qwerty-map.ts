/**
 * QWERTY keyboard to MIDI note mapping (standard DAW 2-octave layout).
 * Uses event.code strings for layout independence (works on AZERTY, Dvorak, etc.).
 *
 * Lower row: C3-B3 (MIDI 48-59)
 * Upper row: C4-B4 (MIDI 60-71)
 */

/** Base octave for the lower keyboard row */
export const QWERTY_BASE_OCTAVE = 3;

/** Maps event.code to MIDI note number */
export const QWERTY_MAP: Record<string, number> = {
  // Lower row: white keys on ZXCVBNM, black keys on SDGHJK
  KeyZ: 48,   // C3
  KeyS: 49,   // C#3
  KeyX: 50,   // D3
  KeyD: 51,   // D#3
  KeyC: 52,   // E3
  KeyV: 53,   // F3
  KeyG: 54,   // F#3
  KeyB: 55,   // G3
  KeyH: 56,   // G#3
  KeyN: 57,   // A3
  KeyJ: 58,   // A#3
  KeyM: 59,   // B3

  // Upper row: white keys on QWERTYU, black keys on 235679
  KeyQ: 60,    // C4 (middle C)
  Digit2: 61,  // C#4
  KeyW: 62,    // D4
  Digit3: 63,  // D#4
  KeyE: 64,    // E4
  KeyR: 65,    // F4
  Digit5: 66,  // F#4
  KeyT: 67,    // G4
  Digit6: 68,  // G#4
  KeyY: 69,    // A4 (440 Hz)
  Digit7: 70,  // A#4
  KeyU: 71,    // B4
};
