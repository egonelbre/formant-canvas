/** R1 strategies: control F1 relative to f0 */
export type R1Strategy = 'r1-f0' | 'r1-2f0' | 'r1-3f0';

/** R2 strategies: control F2 relative to f0 */
export type R2Strategy = 'r2-2f0' | 'r2-3f0';

export type StrategyMode = 'off' | 'overlay' | 'locked';

export interface StrategyDefinition {
  notation: string;       // e.g., "R1:f0"
  description: string;    // e.g., "First formant tracks pitch"
  f0Range: { min: number; max: number };
  voiceTypes: string[];
}

export interface StrategyTargets {
  f1: number | null;
  f2: number | null;
  f3: number | null;
  f4: number | null;
  f5: number | null;
}

export interface StrategyResult {
  targets: StrategyTargets;
  inRange: boolean;
  clamped: boolean;
}

/** What the auto-strategy heuristic recommends */
export interface AutoStrategyRecommendation {
  r1: R1Strategy | null;
  r2: R2Strategy | null;
  singerFormant: boolean;
}
