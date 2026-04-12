export interface FormantParams {
  freq: number;  // Hz, center frequency
  bw: number;    // Hz, bandwidth
  gain: number;  // linear, 0-1
}

export interface VowelTarget {
  f1: number;
  f2: number;
  f3: number;
  f4: number;
}

export type PhonationMode = 'breathy' | 'modal' | 'flow' | 'pressed';

export interface PhonationPreset {
  label: string;
  openQuotient: number;
  aspirationLevel: number;
  spectralTilt: number;
}

export interface VoicePreset {
  label: string;
  f0Default: number;
  f1: number; f2: number; f3: number; f4: number;
  f1BW: number; f2BW: number; f3BW: number; f4BW: number;
}
