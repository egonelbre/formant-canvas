import { describe, it, expect } from 'vitest';
import { PHONATION_PRESETS } from './phonation-presets.ts';
import type { PhonationMode } from '../types.ts';

describe('PHONATION_PRESETS', () => {
  const expectedModes: PhonationMode[] = ['breathy', 'modal', 'flow', 'pressed'];

  it('contains all 4 phonation modes', () => {
    expect(Object.keys(PHONATION_PRESETS)).toHaveLength(4);
    for (const mode of expectedModes) {
      expect(PHONATION_PRESETS).toHaveProperty(mode);
    }
  });

  it('breathy has correct values (OQ=0.7, aspiration=0.15, tilt=18)', () => {
    expect(PHONATION_PRESETS.breathy.openQuotient).toBe(0.7);
    expect(PHONATION_PRESETS.breathy.aspirationLevel).toBe(0.15);
    expect(PHONATION_PRESETS.breathy.spectralTilt).toBe(18);
  });

  it('modal has correct values (OQ=0.6, aspiration=0.03, tilt=6)', () => {
    expect(PHONATION_PRESETS.modal.openQuotient).toBe(0.6);
    expect(PHONATION_PRESETS.modal.aspirationLevel).toBe(0.03);
    expect(PHONATION_PRESETS.modal.spectralTilt).toBe(6);
  });

  it('flow has correct values (OQ=0.55, aspiration=0.02, tilt=3)', () => {
    expect(PHONATION_PRESETS.flow.openQuotient).toBe(0.55);
    expect(PHONATION_PRESETS.flow.aspirationLevel).toBe(0.02);
    expect(PHONATION_PRESETS.flow.spectralTilt).toBe(3);
  });

  it('pressed has correct values (OQ=0.4, aspiration=0.01, tilt=0)', () => {
    expect(PHONATION_PRESETS.pressed.openQuotient).toBe(0.4);
    expect(PHONATION_PRESETS.pressed.aspirationLevel).toBe(0.01);
    expect(PHONATION_PRESETS.pressed.spectralTilt).toBe(0);
  });

  it('all OQ values between 0.3 and 0.8', () => {
    for (const [key, preset] of Object.entries(PHONATION_PRESETS)) {
      expect(preset.openQuotient, `${key} OQ`).toBeGreaterThanOrEqual(0.3);
      expect(preset.openQuotient, `${key} OQ`).toBeLessThanOrEqual(0.8);
    }
  });

  it('all aspiration values between 0 and 1', () => {
    for (const [key, preset] of Object.entries(PHONATION_PRESETS)) {
      expect(preset.aspirationLevel, `${key} aspiration`).toBeGreaterThanOrEqual(0);
      expect(preset.aspirationLevel, `${key} aspiration`).toBeLessThanOrEqual(1);
    }
  });

  it('all spectral tilt values between 0 and 24', () => {
    for (const [key, preset] of Object.entries(PHONATION_PRESETS)) {
      expect(preset.spectralTilt, `${key} tilt`).toBeGreaterThanOrEqual(0);
      expect(preset.spectralTilt, `${key} tilt`).toBeLessThanOrEqual(24);
    }
  });

  it('each preset has a non-empty label', () => {
    for (const [key, preset] of Object.entries(PHONATION_PRESETS)) {
      expect(preset.label, `${key} label`).toBeTruthy();
    }
  });
});
