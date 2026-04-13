# Requirements: Formant Canvas

**Defined:** 2026-04-13
**Core Value:** Linked exploration — audio and visuals are tightly coupled, so changing a parameter is simultaneously heard and seen across every view.

## v0.2 Requirements

Requirements for milestone v0.2: Voice Model Depth. Each maps to roadmap phases.

### LF Glottal Model

- [ ] **LF-01**: User can select between Rosenberg and LF glottal pulse models
- [x] **LF-02**: LF model uses Rd parameterization (single tense-to-breathy slider)
- [x] **LF-03**: LF model uses band-limited wavetables to avoid aliasing at high f0
- [ ] **LF-04**: User can see Rd decomposition view showing how Rd maps to underlying LF parameters (Ra, Rk, Rg, Ta)

### Formant Filters

- [ ] **FILT-01**: User can select between parallel and cascade formant filter topologies
- [ ] **FILT-02**: Cascade topology produces correct relative formant amplitudes automatically (Klatt 1980)
- [ ] **FILT-03**: Higher-order resonances (4th-order, two biquads per formant) for sharper peaks
- [ ] **FILT-04**: Formant chain extended to F5-F8 (higher formants)
- [ ] **FILT-05**: Nasal pole-zero filter pair for nasal vowels/consonants
- [ ] **FILT-06**: Improved aspiration noise source with spectral shaping

### Vocal Tract Visualization

- [ ] **TRACT-01**: Anatomical midsagittal cross-section SVG that deforms based on current formant values in real time
- [ ] **TRACT-02**: Anatomical landmark labels (tongue, palate, pharynx, lips, velum) on the cross-section
- [ ] **TRACT-03**: User can drag on the vocal tract visualization to change formants (bidirectional linked manipulation)

## Future Requirements

Deferred to future milestones. Tracked but not in current roadmap.

### Extended Voice Models

- **EXT-01**: Additional glottal pulse models (KLGLOTT88, polynomial approximations)
- **EXT-02**: Full physical vocal tract modeling (Kelly-Lochbaum waveguide)
- **EXT-03**: Shimmer (amplitude perturbation) as a separate micro-variation control

### Advanced Visualizations

- **VIZ-01**: Spectrogram view with formant tracking overlay
- **VIZ-02**: Signal flow diagram visualization showing source-filter chain
- **VIZ-03**: Rd decomposition animated view (parameter space exploration)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Physical vocal tract modeling (Pink Trombone style) | Wrong abstraction — formant synthesis is the core, not waveguide simulation |
| WASM compilation for DSP | No measured need; JS AudioWorklet performance is sufficient for this scope |
| 3D vocal tract rendering | Complexity far exceeds pedagogical value; 2D sagittal section is standard |
| Voice analysis / inverse filtering | Synthesis tool, not analyzer — doubles scope and problem domain |
| Real-time topology switching without crossfade | Risk of clicks; keep graph static, crossfade or mute-switch |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| LF-01 | Phase 6 | Pending |
| LF-02 | Phase 6 | Complete |
| LF-03 | Phase 6 | Complete |
| LF-04 | Phase 6 | Pending |
| FILT-01 | Phase 7 | Pending |
| FILT-02 | Phase 7 | Pending |
| FILT-03 | Phase 7 | Pending |
| FILT-04 | Phase 8 | Pending |
| FILT-05 | Phase 8 | Pending |
| FILT-06 | Phase 8 | Pending |
| TRACT-01 | Phase 9 | Pending |
| TRACT-02 | Phase 9 | Pending |
| TRACT-03 | Phase 9 | Pending |

**Coverage:**
- v0.2 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0

---
*Requirements defined: 2026-04-13*
*Last updated: 2026-04-13 after roadmap creation*
