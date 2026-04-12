<script lang="ts">
  let { open = $bindable(false) }: { open: boolean } = $props();

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) open = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') open = false;
  }
</script>

{#if open}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="backdrop" onclick={handleBackdrop} onkeydown={handleKeydown} role="dialog" aria-modal="true" aria-label="About Formant Canvas">
    <div class="dialog">
      <button class="close-btn" onclick={() => open = false} aria-label="Close">&times;</button>

      <h1>Formant Canvas</h1>
      <p>A web-based voice synthesis and visualization tool for exploring how the human voice works.</p>

      <p>
        Formant Canvas lets you manipulate the building blocks of voice &mdash; fundamental frequency,
        formant filters, vibrato, and phonation type &mdash; and immediately hear and see the results.
        Every parameter change updates the sound and all visualizations simultaneously.
      </p>

      <h2>Who is it for?</h2>
      <ul>
        <li><strong>Singers</strong> exploring vowel modification and resonance tuning</li>
        <li><strong>Voice teachers</strong> demonstrating formant-harmonic relationships</li>
        <li><strong>Students</strong> learning source-filter theory hands-on</li>
        <li><strong>Researchers</strong> wanting a quick interactive formant reference</li>
      </ul>

      <h2>Realism and limitations</h2>
      <p>
        Formant Canvas uses <strong>source-filter synthesis</strong>, the standard pedagogical model
        of voice production. A glottal pulse generator feeds into resonant filters that shape the
        spectrum &mdash; mimicking how the vocal folds produce a buzz and the vocal tract filters it
        into recognizable vowels.
      </p>
      <p>This is a simplification:</p>
      <ul>
        <li><strong>No vocal tract geometry.</strong> Formants are independent frequency knobs &mdash; you can dial in combinations no human vocal tract could produce.</li>
        <li><strong>Simplified source signal.</strong> The glottal pulse is a mathematical approximation that doesn't capture the full biomechanical variation of real vocal folds.</li>
        <li><strong>No nasal or lateral coupling.</strong> Sounds like /m/, /n/, /l/ involve anti-resonances the model doesn't have.</li>
        <li><strong>No turbulence noise.</strong> Fricatives and breathy voice involve aerodynamic noise sources not modeled here.</li>
        <li><strong>No source-tract interaction.</strong> In a real voice, vocal tract resonances feed back into the vocal folds. This nonlinear coupling affects amplitude, pitch stability, and timbre. The model treats source and filter as a one-way chain.</li>
      </ul>
      <p>
        For building intuition about how formants shape vowel quality, how harmonics interact with
        resonances, and how pitch and phonation change the sound &mdash; the model is accurate enough.
        It is not a research-grade voice synthesizer.
      </p>

      <h2>Inspiration</h2>
      <p>
        Inspired by <a href="https://www.tolvan.com/index.php?p=/madde/index.php" target="_blank" rel="noopener">Madde</a>,
        a voice synthesis tool by Svante Granqvist at KTH.
      </p>

      <h2>References</h2>
      <ul class="references">
        <li>Hillenbrand, J., Getty, L. A., Clark, M. J., & Wheeler, K. (1995). <a href="https://doi.org/10.1121/1.411872" target="_blank" rel="noopener">Acoustic characteristics of American English vowels.</a> <em>JASA</em>, 97(5), 3099&ndash;3111.</li>
        <li>Klatt, D. H. (1980). <a href="https://doi.org/10.1121/1.383940" target="_blank" rel="noopener">Software for a cascade/parallel formant synthesizer.</a> <em>JASA</em>, 67(3), 971&ndash;995.</li>
        <li>Rosenberg, A. E. (1971). <a href="https://doi.org/10.1121/1.1912431" target="_blank" rel="noopener">Effect of glottal pulse shape on the quality of natural vowels.</a> <em>JASA</em>, 49(2B), 583&ndash;590.</li>
        <li>Henrich, N., Smith, J., & Wolfe, J. (2011). <a href="https://www.researchgate.net/publication/50248469" target="_blank" rel="noopener">Vocal tract resonances in singing: Strategies used by sopranos, altos, tenors, and baritones.</a> <em>JASA</em>, 129(2), 1024&ndash;1035.</li>
        <li>Bozeman, K. <em>Practical Vocal Acoustics.</em></li>
        <li>Bozeman, K. <em>Kinesthetic Voice Pedagogy.</em></li>
        <li>Bristow-Johnson, R. <a href="https://www.w3.org/2011/audio/audio-eq-cookbook.html" target="_blank" rel="noopener">Audio EQ Cookbook.</a></li>
      </ul>

      <p class="source-link">
        <a href="https://github.com/egonelbre/formant-canvas" target="_blank" rel="noopener">Source code on GitHub</a>
      </p>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-lg);
  }

  .dialog {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: var(--spacing-lg) var(--spacing-xl);
    max-width: 640px;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
    line-height: 1.5;
  }

  .close-btn {
    position: absolute;
    top: var(--spacing-sm);
    right: var(--spacing-sm);
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: var(--color-text-secondary);
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
  }

  .close-btn:hover {
    background: var(--color-hover);
    color: var(--color-text);
  }

  h1 {
    margin: 0 0 var(--spacing-sm);
    font-size: 20px;
  }

  h2 {
    margin: var(--spacing-md) 0 var(--spacing-xs);
    font-size: 15px;
  }

  p {
    margin: var(--spacing-xs) 0;
    font-size: 14px;
    color: var(--color-text);
  }

  ul {
    margin: var(--spacing-xs) 0;
    padding-left: var(--spacing-lg);
    font-size: 14px;
  }

  li {
    margin-bottom: var(--spacing-xs);
  }

  .references li {
    font-size: 13px;
    color: var(--color-text-secondary);
  }

  a {
    color: var(--color-accent);
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  .source-link {
    margin-top: var(--spacing-md);
    font-size: 13px;
  }
</style>
