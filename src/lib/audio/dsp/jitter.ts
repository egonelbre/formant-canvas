/**
 * Compute a random f0 offset for per-cycle jitter.
 *
 * Jitter adds a random pitch perturbation applied once per glottal cycle.
 * At jitterAmount=1, the maximum deviation is 3% of f0.
 *
 * @param f0 - Fundamental frequency in Hz
 * @param jitterAmount - Jitter amount [0, 1] where 0 = none, 1 = maximum (3% deviation)
 * @returns Hz offset to add to f0
 */
export function computeJitterOffset(
  f0: number,
  jitterAmount: number
): number {
  if (jitterAmount === 0) return 0;
  return (Math.random() * 2 - 1) * jitterAmount * f0 * 0.03;
}
