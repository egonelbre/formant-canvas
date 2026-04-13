# Roadmap: Formant Canvas

## Milestones

- **v0.1 Initial Release** — Phases 1-5 (shipped 2026-04-12)
- **v0.2 Voice Model Depth** — Phases 6-9 (in progress)

## Phases

<details>
<summary>v0.1 Initial Release (Phases 1-5) — SHIPPED 2026-04-12</summary>

- [x] Phase 1: Audio Closed Loop (3/3 plans) — completed 2026-04-12
- [x] Phase 2: Voice Controls & Expression (6/6 plans) — completed 2026-04-12
- [x] Phase 3: Linked Visualizations (4/4 plans) — completed 2026-04-12
- [x] Phase 4: Vocal Strategies (4/4 plans) — completed 2026-04-12
- [x] Phase 5: Pedagogy UI & Polish (4/4 plans) — completed 2026-04-12

</details>

### v0.2 Voice Model Depth (In Progress)

- [ ] **Phase 6: LF Glottal Model** - User-selectable LF pulse model with Rd parameterization, band-limited wavetables, and decomposition view
- [ ] **Phase 7: Cascade Formant Filters** - Cascade filter topology with correct Klatt-style amplitude coupling and higher-order resonances
- [ ] **Phase 8: Extended Filter Chain** - Higher formants (F5-F8), nasal pole-zero pair, and improved aspiration noise
- [ ] **Phase 9: Vocal Tract Visualization** - Anatomical midsagittal cross-section with real-time deformation and bidirectional formant manipulation

## Phase Details

### Phase 6: LF Glottal Model
**Goal**: Users can choose a more realistic glottal source and understand how voice quality maps to LF parameters
**Depends on**: Phase 5 (v0.1 complete)
**Requirements**: LF-01, LF-02, LF-03, LF-04
**Success Criteria** (what must be TRUE):
  1. User can switch between Rosenberg and LF glottal pulse models and hear the timbral difference immediately
  2. User can move a single Rd slider from tense to breathy and hear a continuous, natural voice quality change
  3. Voice sounds clean (no aliasing artifacts) when singing at soprano-range f0 (above 500 Hz) with LF selected
  4. User can open a decomposition view that shows how the current Rd value maps to Ra, Rk, Rg, and Ta in real time
**Plans**: 3 plans
Plans:
- [x] 06-01-PLAN.md — LF DSP core: Rd conversion, waveform equations, wavetable generation (TDD)
- [x] 06-02-PLAN.md — Audio engine integration, UI controls, model switching with mute-crossfade
- [ ] 06-03-PLAN.md — LF decomposition view with annotated waveform and R-parameter readouts

### Phase 7: Cascade Formant Filters
**Goal**: Users get more realistic vowel sounds through a cascade filter topology where formant amplitudes are automatically coupled
**Depends on**: Phase 6
**Requirements**: FILT-01, FILT-02, FILT-03
**Success Criteria** (what must be TRUE):
  1. User can switch between parallel and cascade formant filter topologies and hear the difference in vowel quality
  2. In cascade mode, changing F1 frequency automatically affects the relative amplitudes of higher formants (Klatt 1980 behavior) without user adjustment
  3. User can enable higher-order resonances (4th-order) for sharper formant peaks and hear the increased selectivity
**Plans**: TBD

### Phase 8: Extended Filter Chain
**Goal**: Users can shape the voice with higher formants, nasality, and improved noise characteristics
**Depends on**: Phase 7
**Requirements**: FILT-04, FILT-05, FILT-06
**Success Criteria** (what must be TRUE):
  1. User can enable and tune F5-F8 higher formants, hearing their effect on overall spectral brightness and the singer's formant cluster
  2. User can add nasal coloring via a pole-zero filter pair, producing recognizable nasal vowel quality
  3. Aspiration noise has realistic spectral shaping (not flat white noise) and blends naturally with the voiced source
**Plans**: TBD

### Phase 9: Vocal Tract Visualization
**Goal**: Users can see and manipulate an anatomical vocal tract cross-section that deforms in real time as formants change
**Depends on**: Phase 7
**Requirements**: TRACT-01, TRACT-02, TRACT-03
**Success Criteria** (what must be TRUE):
  1. A midsagittal vocal tract cross-section (tongue, palate, pharynx, lips) deforms visibly and smoothly as F1/F2 values change
  2. Key anatomical landmarks (tongue body, tongue tip, palate, pharynx wall, lips, velum) are labeled on the cross-section
  3. User can drag on the vocal tract visualization to change formant values, and the audio, vowel chart, and piano harmonics all update in real time (bidirectional linked manipulation)
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Audio Closed Loop | v0.1 | 3/3 | Complete | 2026-04-12 |
| 2. Voice Controls & Expression | v0.1 | 6/6 | Complete | 2026-04-12 |
| 3. Linked Visualizations | v0.1 | 4/4 | Complete | 2026-04-12 |
| 4. Vocal Strategies | v0.1 | 4/4 | Complete | 2026-04-12 |
| 5. Pedagogy UI & Polish | v0.1 | 4/4 | Complete | 2026-04-12 |
| 6. LF Glottal Model | v0.2 | 0/3 | Planning complete | - |
| 7. Cascade Formant Filters | v0.2 | 0/0 | Not started | - |
| 8. Extended Filter Chain | v0.2 | 0/0 | Not started | - |
| 9. Vocal Tract Visualization | v0.2 | 0/0 | Not started | - |

## Deferred to v2

### Presets, Sharing, Undo/Redo
**Requirements**: SHARE-01, SHARE-02
**Description**: URL-encoded state sharing, 32-step undo/redo history, expanded preset system.

---
*Roadmap created: 2026-04-11*
*v0.1 shipped: 2026-04-12*
*v0.2 roadmap added: 2026-04-13*
