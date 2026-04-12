/**
 * Generate a single white noise sample.
 *
 * Returns a uniformly distributed random value in the range [-1, 1].
 * Used for aspiration noise mixed into the glottal source.
 *
 * @returns White noise sample in range [-1, 1]
 */
export function whitenoise(): number {
  return Math.random() * 2 - 1;
}
