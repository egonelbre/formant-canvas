import { describe, it, expect } from 'vitest';
import { VOICE_PRESETS } from './voice-presets.ts';
import type { VoicePreset } from '../types.ts';

describe('VOICE_PRESETS', () => {
  const expectedKeys = ['soprano', 'mezzo', 'alto', 'tenor', 'baritone', 'bass', 'child'];

  it('contains all 7 voice types', () => {
    expect(Object.keys(VOICE_PRESETS)).toHaveLength(7);
    for (const key of expectedKeys) {
      expect(VOICE_PRESETS).toHaveProperty(key);
    }
  });

  it('soprano has f0Default=260', () => {
    expect(VOICE_PRESETS.soprano.f0Default).toBe(260);
  });

  it('bass has f0Default=98', () => {
    expect(VOICE_PRESETS.bass.f0Default).toBe(98);
  });

  it('child has f0Default=260', () => {
    expect(VOICE_PRESETS.child.f0Default).toBe(260);
  });

  it('all presets have f0Default in valid range (55-1100 Hz)', () => {
    for (const [key, preset] of Object.entries(VOICE_PRESETS)) {
      expect(preset.f0Default, `${key} f0Default`).toBeGreaterThanOrEqual(55);
      expect(preset.f0Default, `${key} f0Default`).toBeLessThanOrEqual(1100);
    }
  });

  it('all presets have formants in ascending order (f1 < f2 < f3 < f4)', () => {
    for (const [key, preset] of Object.entries(VOICE_PRESETS)) {
      expect(preset.f1, `${key} f1 < f2`).toBeLessThan(preset.f2);
      expect(preset.f2, `${key} f2 < f3`).toBeLessThan(preset.f3);
      expect(preset.f3, `${key} f3 < f4`).toBeLessThan(preset.f4);
    }
  });

  it('all presets have positive formant frequencies', () => {
    for (const [key, preset] of Object.entries(VOICE_PRESETS)) {
      expect(preset.f1, `${key} f1`).toBeGreaterThan(0);
      expect(preset.f2, `${key} f2`).toBeGreaterThan(0);
      expect(preset.f3, `${key} f3`).toBeGreaterThan(0);
      expect(preset.f4, `${key} f4`).toBeGreaterThan(0);
    }
  });

  it('all presets have bandwidths between 50 and 500 Hz', () => {
    for (const [key, preset] of Object.entries(VOICE_PRESETS)) {
      for (const bwKey of ['f1BW', 'f2BW', 'f3BW', 'f4BW'] as const) {
        expect(preset[bwKey], `${key} ${bwKey}`).toBeGreaterThanOrEqual(50);
        expect(preset[bwKey], `${key} ${bwKey}`).toBeLessThanOrEqual(500);
      }
    }
  });

  it('each preset has a non-empty label', () => {
    for (const [key, preset] of Object.entries(VOICE_PRESETS)) {
      expect(preset.label, `${key} label`).toBeTruthy();
      expect(typeof preset.label).toBe('string');
    }
  });
});
