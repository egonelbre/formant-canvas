import { describe, it, expect } from 'vitest';
import { computeDiagonalLine, createPitchScale, createFreqScale, pitchToNoteName } from './strategy-chart-math.ts';

describe('computeDiagonalLine', () => {
  it('harmonic=1: y = 1*x, clamped to yDomain', () => {
    const result = computeDiagonalLine(1, { min: 65, max: 1047 }, { min: 200, max: 1200 });
    // y1 = 1*65 = 65, clamped to 200, so x1 = 200/1 = 200
    expect(result.x1).toBeCloseTo(200);
    expect(result.y1).toBeCloseTo(200);
    // y2 = 1*1047 = 1047, within yDomain
    expect(result.x2).toBeCloseTo(1047);
    expect(result.y2).toBeCloseTo(1047);
  });

  it('harmonic=2: y = 2*x', () => {
    const result = computeDiagonalLine(2, { min: 65, max: 524 }, { min: 200, max: 1200 });
    // y1 = 2*65 = 130, clamped to 200, x1 = 200/2 = 100
    expect(result.x1).toBeCloseTo(100);
    expect(result.y1).toBeCloseTo(200);
    // y2 = 2*524 = 1048, within yDomain
    expect(result.x2).toBeCloseTo(524);
    expect(result.y2).toBeCloseTo(1048);
  });

  it('harmonic=3: y = 3*x, clamped to yDomain', () => {
    const result = computeDiagonalLine(3, { min: 65, max: 400 }, { min: 200, max: 1200 });
    // y1 = 3*65 = 195, clamped to 200, x1 = 200/3 = 66.67
    expect(result.x1).toBeCloseTo(200 / 3, 1);
    expect(result.y1).toBeCloseTo(200);
    // y2 = 3*400 = 1200, at yDomain max
    expect(result.x2).toBeCloseTo(400);
    expect(result.y2).toBeCloseTo(1200);
  });
});

describe('pitchToNoteName', () => {
  it('440 Hz returns A4', () => {
    expect(pitchToNoteName(440)).toBe('A4');
  });

  it('261.63 Hz returns C4', () => {
    expect(pitchToNoteName(261.63)).toBe('C4');
  });

  it('130.81 Hz returns C3', () => {
    expect(pitchToNoteName(130.81)).toBe('C3');
  });
});

describe('createPitchScale', () => {
  it('returns a d3 scaleLinear with correct domain', () => {
    const scale = createPitchScale(65, 1047, 800);
    expect(scale.domain()).toEqual([65, 1047]);
    expect(scale.range()).toEqual([0, 800]);
  });

  it('maps domain boundaries to range boundaries', () => {
    const scale = createPitchScale(65, 1047, 800);
    expect(scale(65)).toBe(0);
    expect(scale(1047)).toBe(800);
  });
});

describe('createFreqScale', () => {
  it('returns a d3 scaleLinear with inverted Y range for SVG', () => {
    const scale = createFreqScale(200, 1200, 600);
    expect(scale.domain()).toEqual([200, 1200]);
    expect(scale.range()).toEqual([600, 0]);
  });

  it('maps min freq to bottom (heightPx) and max freq to top (0)', () => {
    const scale = createFreqScale(200, 1200, 600);
    expect(scale(200)).toBe(600);
    expect(scale(1200)).toBe(0);
  });
});
