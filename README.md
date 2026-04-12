# Formant Canvas

A web-based voice synthesis and visualization tool for exploring how the human voice works.

## What is this?

Formant Canvas lets you manipulate the building blocks of voice -- fundamental frequency, formant filters, vibrato, and phonation type -- and immediately hear and see the results. Every parameter change updates the sound and all visualizations simultaneously: harmonics lighting up on a piano keyboard, a dot moving on the vowel chart, formant range overlays shifting in real time.

This "linked exploration" is the core idea. Instead of reading about how formants shape vowel quality, you drag a formant and watch the vowel change while hearing it happen.

## Who is it for?

Formant Canvas is built for anyone curious about voice acoustics:

- **Singers** exploring how vowel modification and resonance tuning affect their sound
- **Voice teachers** demonstrating formant-harmonic relationships to students
- **Students** learning the basics of source-filter theory hands-on
- **Researchers** who want a quick interactive reference for formant behavior

[Web Page](https://egonelbre.github.io/formant-canvas/)

## Inspiration

The project is inspired by [Madde](https://www.tolvan.com/index.php?p=/madde/index.php), a voice synthesis tool developed by Svante Granqvist at KTH. Formant Canvas aims to bring similar capabilities to the browser with a modern interface built around direct manipulation and guided presets -- no installation required.

## Realism and limitations

Formant Canvas uses **source-filter synthesis**, the standard pedagogical model of voice production. A glottal pulse generator (the "source") feeds into a bank of resonant filters (the "formants") that shape the spectrum — mimicking how the vocal folds produce a buzz and the vocal tract filters it into recognizable vowels.

This is a simplification. Some things to keep in mind:

- **No vocal tract geometry.** Real vowels emerge from the 3D shape of the mouth, tongue, and pharynx. Here, formants are independent frequency knobs — you can dial in combinations that no human vocal tract could physically produce.
- **Simplified source signal.** The glottal pulse is a mathematical approximation. Real glottal waveforms vary with effort, pitch, and vocal fold biomechanics in ways the model does not capture.
- **No nasal or lateral coupling.** Sounds like /m/, /n/, /l/ involve side-branches of the vocal tract (nasal cavity, tongue laterals) that add zeros (anti-resonances) to the spectrum. The model has resonances only.
- **No radiation characteristic.** The real voice is filtered again by the lip opening, which boosts higher frequencies. This is only roughly accounted for.
- **No turbulence noise modeling.** Fricatives (/s/, /f/) and breathy voice involve aerodynamic noise sources at constrictions in the tract. The model focuses on voiced (periodic) sound.
- **Formant bandwidth is approximate.** Real bandwidths depend on vocal tract wall losses, subglottal coupling, and many other factors that are collapsed into simple fixed or estimated values.
- **No source-tract interaction.** In a real voice, the vocal tract resonances feed back into the vocal folds and influence how they vibrate — the source and filter are not truly independent. This nonlinear coupling affects amplitude, pitch stability, and timbre, especially when a harmonic is near a formant peak. The model treats source and filter as a one-way chain, which is the standard simplification but misses these effects.

For its intended purpose — hearing and seeing how formants shape vowel quality, how harmonics interact with resonances, and how pitch and phonation type change the sound — the model is accurate enough to build real intuition. It is not a research-grade voice synthesizer.

## References

Key papers and resources behind the implementation:

- Hillenbrand, J., Getty, L. A., Clark, M. J., & Wheeler, K. (1995). [Acoustic characteristics of American English vowels.](https://doi.org/10.1121/1.411872) *Journal of the Acoustical Society of America*, 97(5), 3099–3111. — Vowel formant data (F1–F3 means and standard deviations for men, women, and children).
- Klatt, D. H. (1980). [Software for a cascade/parallel formant synthesizer.](https://doi.org/10.1121/1.383940) *Journal of the Acoustical Society of America*, 67(3), 971–995. — Spectral tilt modeling and formant synthesis architecture.
- Rosenberg, A. E. (1971). [Effect of glottal pulse shape on the quality of natural vowels.](https://doi.org/10.1121/1.1912431) *Journal of the Acoustical Society of America*, 49(2B), 583–590. — Glottal pulse waveform model.
- Henrich, N., Smith, J., & Wolfe, J. (2011). [Vocal tract resonances in singing: Strategies used by sopranos, altos, tenors, and baritones.](https://www.researchgate.net/publication/50248469_Vocal_tract_resonances_in_singing_Strategies_used_by_sopranos_altos_tenors_and_baritones) *Journal of the Acoustical Society of America*, 129(2), 1024–1035. — Resonance tuning strategies across voice types.
- Bozeman, K. *Practical Vocal Acoustics.* — Pedagogical framework for understanding formant-harmonic interaction in singing.
- Bozeman, K. *Kinesthetic Voice Pedagogy.* — Approaches to teaching voice through somatic awareness and acoustic feedback.
- Bristow-Johnson, R. [Audio EQ Cookbook.](https://www.w3.org/2011/audio/audio-eq-cookbook.html) — Biquad filter coefficient formulas for formant resonators.

## Running locally

Formant Canvas is a static web application. To run it locally:

```
npm install
npm run dev
```

Then open the URL shown in your terminal (usually `http://localhost:5173`). No backend or server-side setup is needed.
