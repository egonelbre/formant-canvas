export type StrategyId = 'speech' | 'r1-f0' | 'r1-2f0' | 'r1-3f0' | 'r2-2f0' | 'r2-3f0' | 'singer-formant';
export type StrategyMode = 'off' | 'overlay' | 'locked';

export interface StrategyDefinition {
  id: StrategyId;
  notation: string;       // e.g., "R1:f0"
  description: string;    // e.g., "First formant tracks pitch"
  controls: ('f1' | 'f2' | 'f3' | 'f4' | 'f5')[];
  f0Range: { min: number; max: number };
  voiceTypes: string[];
}

export interface StrategyResult {
  targets: {
    f1: number | null;
    f2: number | null;
    f3: number | null;
    f4: number | null;
    f5: number | null;
  };
  inRange: boolean;
  clamped: boolean;
}
