/**
 * Convert formant center frequency + bandwidth (Hz) to BiquadFilterNode Q value.
 *
 * Q (quality factor) = centerFreq / bandwidth.
 * This is used to set the Q parameter on BiquadFilterNode (bandpass type).
 *
 * Reference: Audio EQ Cookbook (Robert Bristow-Johnson)
 *
 * @param centerFreq - Center frequency in Hz
 * @param bandwidthHz - Bandwidth in Hz
 * @returns Q value for BiquadFilterNode
 */
export function bandwidthToQ(centerFreq: number, bandwidthHz: number): number {
  if (bandwidthHz <= 0) throw new RangeError(`bandwidthHz must be > 0, got ${bandwidthHz}`);
  return centerFreq / bandwidthHz;
}
