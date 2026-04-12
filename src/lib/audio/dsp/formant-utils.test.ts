import { describe, it, expect } from 'vitest';
import { bandwidthToQ } from './formant-utils.ts';

describe('bandwidthToQ', () => {
  it('returns approximately 8.11 for F1 (730 Hz, 90 Hz BW)', () => {
    expect(bandwidthToQ(730, 90)).toBeCloseTo(8.11, 1);
  });

  it('returns approximately 9.91 for F2 (1090 Hz, 110 Hz BW)', () => {
    expect(bandwidthToQ(1090, 110)).toBeCloseTo(9.91, 1);
  });

  it('returns approximately 14.35 for F3 (2440 Hz, 170 Hz BW)', () => {
    expect(bandwidthToQ(2440, 170)).toBeCloseTo(14.35, 1);
  });

  it('returns 1000 for narrow bandwidth edge case', () => {
    expect(bandwidthToQ(1000, 1)).toBe(1000);
  });
});
