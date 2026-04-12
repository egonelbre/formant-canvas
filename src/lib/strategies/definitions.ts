import type { StrategyId, StrategyDefinition } from './types';

export const STRATEGY_DEFINITIONS: Record<StrategyId, StrategyDefinition> = {
  'speech': {
    id: 'speech',
    notation: 'Speech',
    description: 'No formant tracking -- formants free',
    controls: [],
    f0Range: { min: 0, max: Infinity },
    voiceTypes: ['soprano', 'mezzo', 'alto', 'tenor', 'baritone', 'bass', 'child'],
  },
  'r1-f0': {
    id: 'r1-f0',
    notation: 'R1:f0',
    description: 'First formant tracks pitch',
    controls: ['f1'],
    f0Range: { min: 262, max: 1047 },
    voiceTypes: ['soprano', 'mezzo', 'tenor'],
  },
  'r1-2f0': {
    id: 'r1-2f0',
    notation: 'R1:2f0',
    description: 'First formant tracks second harmonic',
    controls: ['f1'],
    f0Range: { min: 196, max: 659 },
    voiceTypes: ['tenor', 'baritone', 'alto', 'mezzo'],
  },
  'r1-3f0': {
    id: 'r1-3f0',
    notation: 'R1:3f0',
    description: 'First formant tracks third harmonic',
    controls: ['f1'],
    f0Range: { min: 65, max: 262 },
    voiceTypes: ['baritone', 'bass'],
  },
  'r2-2f0': {
    id: 'r2-2f0',
    notation: 'R2:2f0',
    description: 'Second formant tracks second harmonic',
    controls: ['f2'],
    f0Range: { min: 262, max: 784 },
    voiceTypes: ['soprano', 'mezzo'],
  },
  'r2-3f0': {
    id: 'r2-3f0',
    notation: 'R2:3f0',
    description: 'Second formant tracks third harmonic',
    controls: ['f2'],
    f0Range: { min: 220, max: 659 },
    voiceTypes: ['tenor', 'alto'],
  },
  'singer-formant': {
    id: 'singer-formant',
    notation: "Singer's formant",
    description: 'F3-F4-F5 cluster for projection',
    controls: ['f3', 'f4', 'f5'],
    f0Range: { min: 0, max: 659 },
    voiceTypes: ['tenor', 'baritone', 'bass'],
  },
};

export interface StrategyPreset {
  id: StrategyId;
  r1Strategy: StrategyId | null;
  r2Strategy: StrategyId | null;
  label: string;
}

export const STRATEGY_PRESETS: StrategyPreset[] = [
  { id: 'speech', r1Strategy: null, r2Strategy: null, label: 'Speech (untuned)' },
  { id: 'r1-f0', r1Strategy: 'r1-f0', r2Strategy: null, label: 'R1:f0' },
  { id: 'r1-2f0', r1Strategy: 'r1-2f0', r2Strategy: null, label: 'R1:2f0' },
  { id: 'r1-3f0', r1Strategy: 'r1-3f0', r2Strategy: null, label: 'R1:3f0' },
  { id: 'r2-2f0', r1Strategy: null, r2Strategy: 'r2-2f0', label: 'R2:2f0' },
  { id: 'r2-3f0', r1Strategy: null, r2Strategy: 'r2-3f0', label: 'R2:3f0' },
  { id: 'singer-formant', r1Strategy: null, r2Strategy: null, label: "Singer's formant" },
  { id: 'r1-f0', r1Strategy: 'r1-f0', r2Strategy: 'r2-2f0', label: 'R1:f0 + R2:2f0' },
];
