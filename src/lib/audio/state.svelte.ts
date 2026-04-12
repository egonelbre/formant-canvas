import type { FormantParams, PhonationMode } from '../types.ts';
import type { StrategyId, StrategyMode } from '../strategies/types.ts';

/**
 * Single source of truth for all voice synthesis parameters.
 * Uses Svelte 5 $state runes for reactivity.
 *
 * Default values: male modal /a/ at 120 Hz (per D-01).
 * This is the ONLY place audio parameter state lives (LINK-02).
 */
export class VoiceParams {
  // Source (per D-01: male modal /a/ at ~120 Hz)
  f0 = $state(120);              // Hz, fundamental frequency
  aspirationLevel = $state(0.03); // 0-1 mix (per D-02: light aspiration)
  openQuotient = $state(0.6);    // Rosenberg OQ

  // Formants (per D-07: all four active; per D-01: male /a/ defaults)
  // Per D-08: parallel topology, independent gains
  f1Freq = $state(730);    f1BW = $state(90);   f1Gain = $state(1.0);
  f2Freq = $state(1090);   f2BW = $state(110);  f2Gain = $state(0.7);
  f3Freq = $state(2440);   f3BW = $state(170);  f3Gain = $state(0.3);
  f4Freq = $state(3300);   f4BW = $state(320);  f4Gain = $state(0.15);
  f5Freq = $state(4200);   f5BW = $state(400);  f5Gain = $state(0.08);

  // Master
  masterGain = $state(0.5);
  playing = $state(false);

  // Vibrato (D-06, D-07)
  vibratoRate = $state(5);        // Hz, LFO frequency
  vibratoExtent = $state(10);     // cents, LFO depth

  // Jitter (D-08)
  jitterAmount = $state(0);       // 0-1, per-cycle random f0 offset

  // Phonation (D-09, D-10)
  phonationMode = $state<PhonationMode>('modal');
  spectralTilt = $state(6);       // dB attenuation at 3 kHz (0-24)

  // Transport (D-14)
  muted = $state(false);

  // Voice preset tracking (D-12)
  voicePreset = $state<string | null>(null);  // null = custom

  // Strategy (Phase 4)
  strategyId = $state<StrategyId>('speech');
  strategyMode = $state<StrategyMode>('off');  // 'off' | 'overlay' | 'locked'
  strategyOverriding = $state(false);  // true during temporary drag override (D-14)

  /** Read all synth-relevant reactive fields to establish dependency tracking.
   *  Co-located here so new parameters only need to be added in one place. */
  get snapshot() {
    return {
      f0: this.f0, f1Freq: this.f1Freq, f1BW: this.f1BW, f1Gain: this.f1Gain,
      f2Freq: this.f2Freq, f2BW: this.f2BW, f2Gain: this.f2Gain,
      f3Freq: this.f3Freq, f3BW: this.f3BW, f3Gain: this.f3Gain,
      f4Freq: this.f4Freq, f4BW: this.f4BW, f4Gain: this.f4Gain,
      f5Freq: this.f5Freq, f5BW: this.f5BW, f5Gain: this.f5Gain,
      masterGain: this.masterGain, aspirationLevel: this.aspirationLevel,
      openQuotient: this.openQuotient, vibratoRate: this.vibratoRate,
      vibratoExtent: this.vibratoExtent, jitterAmount: this.jitterAmount,
      spectralTilt: this.spectralTilt, muted: this.muted,
    };
  }

  /** Get formant params as an array for iteration */
  get formants(): FormantParams[] {
    return [
      { freq: this.f1Freq, bw: this.f1BW, gain: this.f1Gain },
      { freq: this.f2Freq, bw: this.f2BW, gain: this.f2Gain },
      { freq: this.f3Freq, bw: this.f3BW, gain: this.f3Gain },
      { freq: this.f4Freq, bw: this.f4BW, gain: this.f4Gain },
      { freq: this.f5Freq, bw: this.f5BW, gain: this.f5Gain },
    ];
  }
}

/** Singleton instance — the single source of truth for all audio parameters */
export const voiceParams = new VoiceParams();
