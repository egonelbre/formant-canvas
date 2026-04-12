/**
 * Tooltip content for all primary controls.
 *
 * Each entry provides:
 * - text: Plain-language description suitable for beginners
 * - expert: (optional) Technical details shown in expert mode
 */
export const TOOLTIPS: Record<string, { text: string; expert?: string }> = {
  playStop: {
    text: 'Start or stop the voice synthesis.',
  },
  volume: {
    text: 'Controls how loud the voice sounds.',
    expert: 'Master gain (linear 0-1). Applied after formant filtering.',
  },
  pitch: {
    text: 'Controls the fundamental frequency -- how high or low the voice sounds. Try 120 Hz for a male voice or 220 Hz for female.',
    expert: 'f0 in Hz. Drives the glottal pulse repetition rate and all harmonic positions.',
  },
  voicePreset: {
    text: 'Choose a voice type. Each sets typical formant positions -- like switching between a soprano and a bass.',
    expert: 'Loads F1-F4 center frequencies and bandwidths from Hillenbrand-derived data for the selected voice type.',
  },
  phonation: {
    text: 'Changes how the vocal folds vibrate. Breathy is airy and soft; Pressed is tight and intense; Modal is normal speaking.',
    expert: 'Sets open quotient, aspiration level, and spectral tilt simultaneously.',
  },
  vowelChart: {
    text: 'Drag the dot to shape the vowel. Moving changes the first and second formant frequencies, which is how your vocal tract shapes different vowel sounds.',
    expert: 'F1 (vertical) and F2 (horizontal) in Hz. Ellipses show Hillenbrand (1995) population data.',
  },
  strategy: {
    text: 'Singing strategies align your formant frequencies with harmonics of your pitch. Sopranos and tenors use this to project over an orchestra.',
    expert: 'R1:nf0 means first resonance tracks the nth harmonic. Locked mode auto-tunes; overlay shows targets only.',
  },
};
