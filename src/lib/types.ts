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
