import type { R1Strategy, R2Strategy, StrategyDefinition } from './types';

export const R1_STRATEGIES: Record<R1Strategy, StrategyDefinition> = {
  'r1-f0': {
    notation: 'R1:f0',
    description: 'First formant tracks pitch',
    f0Range: { min: 262, max: 1047 },
    voiceTypes: ['soprano', 'mezzo', 'tenor'],
  },
  'r1-2f0': {
    notation: 'R1:2f0',
    description: 'First formant tracks second harmonic',
    f0Range: { min: 196, max: 659 },
    voiceTypes: ['tenor', 'baritone', 'alto', 'mezzo'],
  },
  'r1-3f0': {
    notation: 'R1:3f0',
    description: 'First formant tracks third harmonic',
    f0Range: { min: 65, max: 262 },
    voiceTypes: ['baritone', 'bass'],
  },
};

export const R2_STRATEGIES: Record<R2Strategy, StrategyDefinition> = {
  'r2-2f0': {
    notation: 'R2:2f0',
    description: 'Second formant tracks second harmonic',
    f0Range: { min: 262, max: 784 },
    voiceTypes: ['soprano', 'mezzo'],
  },
  'r2-3f0': {
    notation: 'R2:3f0',
    description: 'Second formant tracks third harmonic',
    f0Range: { min: 220, max: 659 },
    voiceTypes: ['tenor', 'alto'],
  },
};

export const R1_LIST: R1Strategy[] = ['r1-f0', 'r1-2f0', 'r1-3f0'];
export const R2_LIST: R2Strategy[] = ['r2-2f0', 'r2-3f0'];

/** Singer's formant cluster center frequencies by voice type (Hz) */
export const SINGER_FORMANT_CENTERS: Record<string, number> = {
  bass: 2384,
  baritone: 2454,
  tenor: 2705,
  alto: 2800,
  mezzo: 2900,
  soprano: 3092,
  child: 3200,
};
