import { describe, it, expect } from 'vitest';
import { QWERTY_MAP, QWERTY_BASE_OCTAVE } from './qwerty-map.ts';

describe('QWERTY_MAP', () => {
  it('exports QWERTY_BASE_OCTAVE = 3', () => {
    expect(QWERTY_BASE_OCTAVE).toBe(3);
  });

  it('maps 24 keys total', () => {
    expect(Object.keys(QWERTY_MAP)).toHaveLength(24);
  });

  it('KeyZ maps to MIDI 48 (C3)', () => {
    expect(QWERTY_MAP['KeyZ']).toBe(48);
  });

  it('KeyS maps to MIDI 49 (C#3)', () => {
    expect(QWERTY_MAP['KeyS']).toBe(49);
  });

  it('KeyM maps to MIDI 59 (B3)', () => {
    expect(QWERTY_MAP['KeyM']).toBe(59);
  });

  it('KeyQ maps to MIDI 60 (C4)', () => {
    expect(QWERTY_MAP['KeyQ']).toBe(60);
  });

  it('Digit2 maps to MIDI 61 (C#4)', () => {
    expect(QWERTY_MAP['Digit2']).toBe(61);
  });

  it('Digit6 maps to MIDI 69 (A4)', () => {
    expect(QWERTY_MAP['Digit6']).toBe(69);
  });

  it('Digit7 maps to MIDI 71 (B4)', () => {
    expect(QWERTY_MAP['Digit7']).toBe(71);
  });

  it('has no duplicate MIDI values', () => {
    const values = Object.values(QWERTY_MAP);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  it('lower row covers C3-B3 (MIDI 48-59)', () => {
    const lowerRow = ['KeyZ', 'KeyS', 'KeyX', 'KeyD', 'KeyC', 'KeyF', 'KeyV', 'KeyG', 'KeyB', 'KeyN', 'KeyJ', 'KeyM'];
    for (const key of lowerRow) {
      expect(QWERTY_MAP[key], `${key}`).toBeGreaterThanOrEqual(48);
      expect(QWERTY_MAP[key], `${key}`).toBeLessThanOrEqual(59);
    }
  });

  it('upper row covers C4-B4 (MIDI 60-71)', () => {
    const upperRow = ['KeyQ', 'Digit2', 'KeyW', 'Digit3', 'KeyE', 'Digit4', 'KeyR', 'Digit5', 'KeyT', 'Digit6', 'KeyY', 'Digit7'];
    for (const key of upperRow) {
      expect(QWERTY_MAP[key], `${key}`).toBeGreaterThanOrEqual(60);
      expect(QWERTY_MAP[key], `${key}`).toBeLessThanOrEqual(71);
    }
  });
});
