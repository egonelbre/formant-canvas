import { describe, it, expect } from 'vitest';
import {
  hzToNote,
  midiToHz,
  sliderToHz,
  hzToSlider,
  formatPitchReadout,
} from './pitch-utils.ts';

describe('hzToNote', () => {
  it('returns A4 for 440 Hz', () => {
    const result = hzToNote(440);
    expect(result.name).toBe('A');
    expect(result.octave).toBe(4);
    expect(result.cents).toBe(0);
  });

  it('returns C4 for ~261.63 Hz', () => {
    const result = hzToNote(261.63);
    expect(result.name).toBe('C');
    expect(result.octave).toBe(4);
    expect(Math.abs(result.cents)).toBeLessThan(1);
  });

  it('returns A#4 for ~466.16 Hz', () => {
    const result = hzToNote(466.16);
    expect(result.name).toBe('A#');
    expect(result.octave).toBe(4);
    expect(Math.abs(result.cents)).toBeLessThan(1);
  });

  it('returns A4 with ~+39 cents for 450 Hz', () => {
    const result = hzToNote(450);
    expect(result.name).toBe('A');
    expect(result.octave).toBe(4);
    expect(result.cents).toBeCloseTo(39, 0);
  });

  it('returns A3 for 220 Hz', () => {
    const result = hzToNote(220);
    expect(result.name).toBe('A');
    expect(result.octave).toBe(3);
    expect(result.cents).toBe(0);
  });

  it('returns C2 for ~65.41 Hz', () => {
    const result = hzToNote(65.41);
    expect(result.name).toBe('C');
    expect(result.octave).toBe(2);
    expect(Math.abs(result.cents)).toBeLessThan(1);
  });
});

describe('midiToHz', () => {
  it('returns 440 for MIDI note 69 (A4)', () => {
    expect(midiToHz(69)).toBeCloseTo(440, 5);
  });

  it('returns ~261.63 for MIDI note 60 (C4)', () => {
    expect(midiToHz(60)).toBeCloseTo(261.63, 1);
  });

  it('returns ~130.81 for MIDI note 48 (C3)', () => {
    expect(midiToHz(48)).toBeCloseTo(130.81, 1);
  });
});

describe('sliderToHz', () => {
  it('returns 55 at position 0', () => {
    expect(sliderToHz(0)).toBeCloseTo(55, 5);
  });

  it('returns 1100 at position 1', () => {
    expect(sliderToHz(1)).toBeCloseTo(1100, 5);
  });

  it('returns geometric mean (~245.97) at position 0.5', () => {
    const expected = Math.sqrt(55 * 1100);
    expect(sliderToHz(0.5)).toBeCloseTo(expected, 1);
  });
});

describe('hzToSlider', () => {
  it('returns 0 for 55 Hz', () => {
    expect(hzToSlider(55)).toBeCloseTo(0, 10);
  });

  it('returns 1 for 1100 Hz', () => {
    expect(hzToSlider(1100)).toBeCloseTo(1, 10);
  });

  it('is the inverse of sliderToHz', () => {
    const positions = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0];
    for (const pos of positions) {
      expect(hzToSlider(sliderToHz(pos))).toBeCloseTo(pos, 10);
    }
  });
});

describe('formatPitchReadout', () => {
  it('formats 220 Hz as "220 Hz . A3 . +0c"', () => {
    expect(formatPitchReadout(220)).toBe('220 Hz . A3 . +0c');
  });

  it('formats 450 Hz with positive cents deviation', () => {
    const result = formatPitchReadout(450);
    expect(result).toMatch(/^450 Hz \. A4 \. \+\d+c$/);
    // Should show +39c approximately
    expect(result).toBe('450 Hz . A4 . +39c');
  });

  it('formats 440 Hz as "440 Hz . A4 . +0c"', () => {
    expect(formatPitchReadout(440)).toBe('440 Hz . A4 . +0c');
  });

  it('formats frequencies with negative cents deviation', () => {
    // 430 Hz is below A4, should show negative cents
    const result = formatPitchReadout(430);
    expect(result).toMatch(/Hz \. (A|G#)4 \. [+-]\d+c$/);
  });
});
