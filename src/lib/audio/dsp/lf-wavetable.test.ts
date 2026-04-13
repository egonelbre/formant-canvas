import { describe, it, expect } from 'vitest';
import {
  fft,
  ifft,
  generateLfWavetable,
  generateLfWavetableSet,
  generateFullWavetableBank,
  OCTAVE_F0_BOUNDARIES,
  RD_GRID,
} from './lf-wavetable.ts';

describe('fft / ifft', () => {
  it('roundtrip preserves a known signal within floating point tolerance', () => {
    const N = 256;
    const real = new Float32Array(N);
    const imag = new Float32Array(N);

    // Create a signal: sum of a few sinusoids
    for (let i = 0; i < N; i++) {
      real[i] =
        Math.sin((2 * Math.PI * 3 * i) / N) +
        0.5 * Math.cos((2 * Math.PI * 7 * i) / N);
    }
    const original = new Float32Array(real);

    // Forward FFT
    fft(real, imag);

    // Inverse FFT
    ifft(real, imag);

    // Compare with original
    for (let i = 0; i < N; i++) {
      expect(real[i]).toBeCloseTo(original[i], 4);
      expect(Math.abs(imag[i])).toBeLessThan(1e-4);
    }
  });

  it('FFT of pure sine has energy at correct bin', () => {
    const N = 256;
    const real = new Float32Array(N);
    const imag = new Float32Array(N);

    const freq = 5;
    for (let i = 0; i < N; i++) {
      real[i] = Math.sin((2 * Math.PI * freq * i) / N);
    }

    fft(real, imag);

    // Bin 5 should have the energy (and bin N-5 for negative frequency)
    const mag5 = Math.sqrt(real[freq] ** 2 + imag[freq] ** 2);
    expect(mag5).toBeGreaterThan(N / 4); // significant energy

    // Other bins should be near zero
    for (let k = 1; k < N / 2; k++) {
      if (k === freq) continue;
      const mag = Math.sqrt(real[k] ** 2 + imag[k] ** 2);
      expect(mag).toBeLessThan(1e-3);
    }
  });
});

describe('generateLfWavetable', () => {
  it('returns Float32Array of correct length with no NaN or Infinity', () => {
    const table = generateLfWavetable(1.0, 2048, 50);
    expect(table).toBeInstanceOf(Float32Array);
    expect(table.length).toBe(2048);
    for (let i = 0; i < table.length; i++) {
      expect(Number.isFinite(table[i])).toBe(true);
      expect(Number.isNaN(table[i])).toBe(false);
    }
  });

  it('band-limits to maxHarmonics=13: no energy above harmonic 13', () => {
    const tableSize = 2048;
    const maxHarmonics = 13;
    const table = generateLfWavetable(1.0, tableSize, maxHarmonics);

    // FFT the result to check spectrum
    const real = new Float32Array(tableSize);
    const imag = new Float32Array(tableSize);
    for (let i = 0; i < tableSize; i++) {
      real[i] = table[i];
    }
    fft(real, imag);

    // Harmonics above maxHarmonics should be zero
    for (let k = maxHarmonics + 1; k < tableSize / 2; k++) {
      const mag = Math.sqrt(real[k] ** 2 + imag[k] ** 2);
      expect(mag).toBeLessThan(1e-4);
    }
  });

  it('preserves low harmonics for high maxHarmonics', () => {
    const tableSize = 2048;
    const table = generateLfWavetable(1.0, tableSize, 436);

    // Should have energy in low harmonics
    const real = new Float32Array(tableSize);
    const imag = new Float32Array(tableSize);
    for (let i = 0; i < tableSize; i++) {
      real[i] = table[i];
    }
    fft(real, imag);

    // Fundamental (bin 1) should have significant energy
    const mag1 = Math.sqrt(real[1] ** 2 + imag[1] ** 2);
    expect(mag1).toBeGreaterThan(0.01);
  });

  it('is periodic: first sample close to circular continuation from last', () => {
    const table = generateLfWavetable(1.0, 2048, 50);
    // Band-limited signal should be smooth and periodic
    const diff = Math.abs(table[0] - table[table.length - 1]);
    // For a band-limited periodic signal, first and last should be close
    // (not identical since last sample is at index N-1, not N which would wrap to 0)
    // But for wavetable playback, table[N] == table[0], so check continuity
    expect(diff).toBeLessThan(0.05);
  });

  it('works for different Rd values without NaN', () => {
    for (const rd of [0.3, 1.0, 2.0, 2.7]) {
      const table = generateLfWavetable(rd, 2048, 50);
      for (let i = 0; i < table.length; i++) {
        expect(Number.isFinite(table[i])).toBe(true);
      }
    }
  });
});

describe('generateLfWavetableSet', () => {
  it('returns 10 tables of length 2048', () => {
    const tables = generateLfWavetableSet(1.0, 48000);
    expect(tables.length).toBe(10);
    for (const table of tables) {
      expect(table).toBeInstanceOf(Float32Array);
      expect(table.length).toBe(2048);
    }
  });

  it('all tables are free of NaN/Infinity', () => {
    const tables = generateLfWavetableSet(1.0, 48000);
    for (const table of tables) {
      for (let i = 0; i < table.length; i++) {
        expect(Number.isFinite(table[i])).toBe(true);
      }
    }
  });
});

describe('generateFullWavetableBank', () => {
  it('returns 10 Rd rows x 10 octave columns', () => {
    const bank = generateFullWavetableBank(48000);
    expect(bank.length).toBe(RD_GRID.length);
    expect(bank.length).toBe(10);
    for (const row of bank) {
      expect(row.length).toBe(10);
      for (const table of row) {
        expect(table).toBeInstanceOf(Float32Array);
        expect(table.length).toBe(2048);
      }
    }
  });
});

describe('constants', () => {
  it('OCTAVE_F0_BOUNDARIES has 11 entries (10 bands)', () => {
    expect(OCTAVE_F0_BOUNDARIES.length).toBe(11);
    // Should be monotonically increasing
    for (let i = 1; i < OCTAVE_F0_BOUNDARIES.length; i++) {
      expect(OCTAVE_F0_BOUNDARIES[i]).toBeGreaterThan(
        OCTAVE_F0_BOUNDARIES[i - 1],
      );
    }
  });

  it('RD_GRID has 10 entries from 0.3 to 2.7', () => {
    expect(RD_GRID.length).toBe(10);
    expect(RD_GRID[0]).toBeCloseTo(0.3, 2);
    expect(RD_GRID[RD_GRID.length - 1]).toBeCloseTo(2.7, 2);
    // Monotonically increasing
    for (let i = 1; i < RD_GRID.length; i++) {
      expect(RD_GRID[i]).toBeGreaterThan(RD_GRID[i - 1]);
    }
  });
});
