# Feature Research

**Domain:** Voice synthesis & visualization for singing pedagogy (web app)
**Researched:** 2026-04-11
**Confidence:** HIGH (acoustics, pedagogy, vocal strategies are well-documented); MEDIUM (specific competitive feature sets beyond Madde and Pink Trombone)

## Context

The 7 user-requested features are the skeleton. This document expands each into the concrete sub-features needed to make them credible and useful, then layers on the table-stakes support features, differentiators, and anti-features that together define the product.

The research baseline is anchored in:
- **Madde** (Svante Granqvist / KTH) — the "substance" reference: formant-based synthesis, 6 programmable formants, vibrato, source spectrum control, harmonics display.
- **Pink Trombone** (Neil Thapen) — the "delight" reference: direct manipulation of an articulatory model in the browser.
- **Sing & See / Estill Voiceprint / SpectrumView** — the analyzer ecosystem: what a real-time spectrum UI looks like.
- **Henrich / Smith / Wolfe 2011**, Sundberg, Titze, Miller, Bozeman — formant-tuning strategy literature.
- **Peterson & Barney (1952)**, **Hillenbrand et al. (1995)**, **Fant (1960)** — canonical vowel formant datasets.

---

## 1. Expansion of the 7 User-Requested Features

### 1.1 Glottal pulse synthesis with smoothly changing parameters

The glottal source is the excitation signal that the formant filters shape. For a pedagogy tool, it needs enough parameters to hear the difference between pressed / modal / flow / breathy phonation, but not so many that the UI collapses into jargon.

**Required sub-features:**

| Sub-feature | What it is | Complexity | Notes |
|---|---|---|---|
| LF-model (Liljencrants–Fant) pulse | De-facto standard glottal derivative pulse shape for voice synthesis research | HIGH | Compute offline into a wavetable per Rd value; interpolate between wavetables instead of real-time LF integration |
| Rd shape parameter | Single-knob proxy for LF pulse shape covering breathy→modal→pressed; Fant's "shape parameter" | MEDIUM | This is the single most important source control after pitch; expose prominently |
| Open Quotient (OQ) | Ratio of open phase to period; directly controls low-frequency source spectral tilt | MEDIUM | Can be derived from Rd, or exposed independently in "advanced" mode |
| Spectral tilt (dB/octave) | Overall high-frequency roll-off from glottal closure sharpness; corresponds to return-phase time constant | MEDIUM | Expose as its own slider even if physically coupled to Rd, because singers/teachers think in tilt |
| Skewness / asymmetry | Ratio of opening phase to closing phase; affects "pressed" vs "flow" | LOW | Hideable under advanced mode |
| Source noise / HNR | Additive turbulence noise, pitch-synchronous or continuous | MEDIUM | Models breath-noise; essential for breathy voice demo |
| Level (overall source amplitude) | dB control on excitation | LOW | Needed so students can explore the myth that "loud = change source only" |
| Smooth parameter interpolation | All source params smoothed over ≥10 ms when the user drags | LOW-MEDIUM | Critical — parameter steps are audible as clicks; use `AudioParam.linearRampToValueAtTime` or per-sample smoothing inside the AudioWorklet |
| Preset phonation modes | "Breathy / Modal / Flow / Pressed" as one-click presets that snap Rd, OQ, noise | LOW | Entry point for users who don't yet know what Rd means |

**Pedagogy note:** The user-facing vocabulary should be "breathy ↔ pressed" with "phonation type" as the label, and Rd/OQ/tilt accessible as "show advanced." Calling the main knob "Rd" upfront is a Madde-style jargon wall.

**Dependencies:** Nothing upstream (this is the root of the signal chain).

---

### 1.2 Formant filters (F1–F4 minimum, F5–F6 optional)

**Required sub-features:**

| Sub-feature | What it is | Complexity | Notes |
|---|---|---|---|
| At least F1–F4 independently controllable | Frequency, bandwidth, and (optionally) gain per formant | LOW | Web Audio `BiquadFilterNode` in `bandpass` or a peaking chain works; or compute biquad coefficients from formant frequency + bandwidth via the Klatt/Rabiner formulas inside an AudioWorklet |
| F5 and F6 | Higher-formant cluster used for singer's formant pedagogy | LOW | Madde has 6 formants for this reason — allows demonstrating the 3 kHz cluster |
| Bandwidth per formant | Narrow bandwidth = ringing/resonant, wide = dull | LOW | Bandwidth knob matters pedagogically — singer's-formant demo is a bandwidth-narrowing story |
| Gain per formant | Optional amplitude emphasis | LOW | Many formant synths skip this; useful for pedagogy (e.g. "what if F3 were 6 dB louder?") |
| Formant-chain topology | Cascade (each filter feeds the next, preserves relative levels) vs parallel (sum outputs) | MEDIUM | Cascade is standard for vocal synthesis; parallel is easier to reason about. Cascade recommended (Klatt-style); document the choice |
| Real-time coefficient updates | No zipper noise when dragging on the F1/F2 chart | LOW-MEDIUM | Smooth Hz → coefficient interpolation in the worklet; avoid recomputing coefficients at full sample rate |
| Lip radiation | +6 dB/octave high-shelf at the output representing mouth-opening radiation | LOW | Standard in formant synthesis; one static filter |

**Dependencies:** Requires glottal source (1.1) as input.

---

### 1.3 Voice parameters: vibrato and jitter

**Required sub-features:**

| Sub-feature | What it is | Complexity | Notes |
|---|---|---|---|
| Vibrato rate (Hz) | Typical singing vibrato is 4.5–6.5 Hz; slider 3–9 Hz | LOW | Default to 5.5 Hz — the cross-gender mean in college-music-major normative data |
| Vibrato extent (cents) | Pitch modulation depth; ±25–50 cents is aesthetic ideal; range 0–150 cents | LOW | 0 = straight tone, 100 = a full semitone peak-to-peak |
| Vibrato onset delay | Time before vibrato starts after a note begins | LOW | Distinguishes "straight attack + vibrato decoration" from "immediate vibrato" |
| Vibrato shape | Sine (default) vs. triangle vs. natural (sine + small jitter) | LOW | Natural is sine with ±3% rate jitter — sounds far less robotic |
| Jitter (cycle-to-cycle f0 perturbation) | Random f0 noise, typically specified as % or cents; models pathological or expressive voice | LOW | Useful pedagogy tool: "hear what 1% jitter sounds like" |
| Shimmer (cycle-to-cycle amplitude perturbation) | Amplitude analog of jitter | LOW | Natural partner to jitter; expose even though the user didn't request it — they'll want it for breathy/raspy demos |
| Amplitude tremolo | Slow amplitude modulation synchronized with vibrato | LOW | Real vibrato has amplitude modulation coupled to pitch modulation — model this optionally |

**Pedagogy note:** The trio jitter / shimmer / vibrato depth is where pedagogues explain "vocal tone." Group them in one panel labelled "Expression" or "Micro-variation," not "Noise."

**Dependencies:** Modulates the glottal source (1.1).

---

### 1.4 Fundamental + overtones displayed on a piano keyboard

This is the signature visualization. The piano keyboard makes harmonics musical rather than numeric — a 440 Hz harmonic becomes "A4 on the piano" rather than "1760 Hz on an axis."

**Required sub-features:**

| Sub-feature | What it is | Complexity | Notes |
|---|---|---|---|
| Piano keyboard spanning the hearing-relevant range | At minimum C2–C8 (65 Hz – 4186 Hz); Madde uses C7–B7 as "singer's formant octave" | LOW | SVG or Canvas; 88 keys is fine |
| Harmonic markers on keys | Each harmonic n·f₀ marked on the corresponding key with height or color proportional to amplitude | MEDIUM | Harmonic frequencies rarely land exactly on a key — show the nearest-key with a position offset indicator (cents from the key) |
| Amplitude from spectrum envelope | Harmonic heights computed by sampling the formant-filter magnitude response at each n·f₀ | MEDIUM | No FFT needed — evaluate the analytic biquad magnitude response at each harmonic |
| Fundamental highlight | Distinct color/weight for the f₀ key vs overtones | LOW | Makes "which one is the fundamental" legible |
| Click/drag to set pitch | Clicking a key sets f₀; dragging bends it continuously | LOW | Required for keyboard-driven pitch exploration |
| Formant-frequency markers | Overlay F1–F4 as vertical lines or shaded regions on the keyboard | MEDIUM | Directly visualizes "which harmonic is closest to F1" — the whole point of formant tuning |
| Cent-offset readout | "F1 is 340 cents above H2" | LOW | Makes tuning strategies concrete |
| Logarithmic vs linear frequency toggle | Piano is already log — but advanced users may want Hz labels | LOW | Default log (piano layout), allow Hz scale overlay |

**Dependencies:** Needs f₀ from source (1.1) and formant frequencies from filter bank (1.2).

---

### 1.5 Visualization of ranges that formants can occupy

**Required sub-features:**

| Sub-feature | What it is | Complexity | Notes |
|---|---|---|---|
| Per-vowel formant ellipses on F1/F2 chart | From Hillenbrand/Peterson-Barney, plot standard deviation ellipses for each vowel | MEDIUM | Requires embedding the dataset — both are freely available. Hillenbrand is the modern replacement but both should be selectable |
| Voice-type filter | Male/female/child ellipses — same vowel has different F1/F2 per voice type | LOW | Dataset is already stratified by speaker type |
| Formant-occupancy corridors for higher formants (F3/F4/F5) | Shaded "reasonable range" bands on the piano keyboard view for higher formants | MEDIUM | Less well-documented data than F1/F2 but general ranges are known (F3 ≈ 2.3–3.0 kHz, F4 ≈ 3.0–3.8 kHz, F5 ≈ 3.8–4.5 kHz) |
| "Anatomically plausible" envelope | Warn when the user drags F1/F2 outside any realistic human speaker region | LOW | Tinted background showing the convex hull of real vowel data; outside = "impossible human" region |
| Vowel-cluster labels | IPA symbols positioned at the centroid of each ellipse | LOW | Users need to see "i / ɪ / e / ɛ / æ / a / ɑ / ɔ / o / ʊ / u / ə" at a glance |
| Source selector | Peterson-Barney / Hillenbrand / Fant (Swedish) / custom | LOW | Cite the source in the UI — researchers care |

**Dependencies:** Formant filter bank (1.2); used by F1/F2 diagram (1.7).

---

### 1.6 Vocal strategies (R1:2f₀, R1:f₀, R2:2f₀, …) with auto-tune + overlay

See [§2 Vocal-Strategy Catalogue](#2-vocal-strategy-catalogue) below for the concrete enumeration. Here, the UI-level features.

**Required sub-features:**

| Sub-feature | What it is | Complexity | Notes |
|---|---|---|---|
| Strategy picker | Dropdown/grid of named strategies, each with a short plain-English description | LOW | "R1:2f₀ — tune F1 to the second harmonic (belt)" |
| Overlay mode | Draw lines on the piano view showing where F1/F2 *should* be for the active strategy, without moving them | LOW-MEDIUM | Teaches the concept: "here's where the strategy says F1 should be for this pitch" |
| Auto-tune mode | As f₀ changes, the affected formant(s) automatically track the target ratio | MEDIUM | The pedagogical payoff — users hear the strategy as a living rule, not a static assertion |
| Strategy scope | Per-strategy definition of which formants are tuned and which are free | LOW | R1:2f₀ only constrains F1; F2 is free and the user can still drag it |
| Ratio-line overlays on the piano | Horizontal guide lines marked "f₀, 2f₀, 3f₀, 4f₀, 5f₀" showing the harmonic series above the current note | LOW | Makes "which harmonic F1 is on" literally visible |
| Strategy lock icon per formant | Small lock icon next to F1/F2 in the control panel showing whether it's auto-tuned | LOW | Prevents confusion about "why can't I move F1?" |
| Pitch sweep button | "Play a scale from C3 to C6" — demonstrates how formants move under auto-tune | LOW-MEDIUM | Killer demo for showing the strategy at work across range |

**What "R1:2f₀" notation means.** In the literature (Henrich/Smith/Wolfe 2011; Miller; Bozeman), R1 and R2 mean "first and second vocal-tract resonance" (equivalent to F1/F2 for synthesis purposes). The notation `Rn:mf₀` reads as "n-th resonance tuned to the m-th harmonic of the fundamental." So `R1:2f₀` means F1 = 2·f₀ (belt); `R1:f₀` means F1 = f₀ (high soprano); `R2:3f₀` means F2 = 3·f₀ (one classical tenor strategy).

**Dependencies:** Formant bank (1.2); f₀ (1.1); piano view (1.4) for overlay rendering.

---

### 1.7 F1/F2 vowel diagram with direct manipulation

**Required sub-features:**

| Sub-feature | What it is | Complexity | Notes |
|---|---|---|---|
| 2D chart with F1 (y, inverted: low at bottom) vs F2 (x, inverted: high at left) | Standard IPA-style orientation mirrors tongue position — high tongue = low F1 = top of chart | LOW | Use the phonetic convention, not the "data" convention — teachers expect it |
| Draggable F1/F2 marker | Click and drag the current vowel point; audio and all other views update live | MEDIUM | Core interaction — sets the tone of the whole app |
| Vowel ellipses as background | Hillenbrand/Peterson-Barney ellipses (1.5) layered behind the interactive marker | LOW | Already covered in 1.5 |
| "Snap to vowel" toggle | When on, dragging snaps to the nearest vowel centroid | LOW | Optional — some users want free exploration, others want "put me on /a/" |
| F3/F4 sub-markers or indicators | Small secondary dots or a compact sparkline showing F3, F4 positions relative to their own ranges | LOW-MEDIUM | Otherwise the chart pretends the voice has only 2 formants |
| Voice-type selection | Male/female/child — changes the background ellipses AND default formant ranges | LOW | |
| Trail / path display | Optional breadcrumb showing recent positions, useful for "trace the vowel /aeiou/" exercises | LOW | Defers to v1.x |
| Logarithmic vs Mel/Bark axis | Toggle between Hz (default), log Hz, and Mel or Bark (perceptual) | LOW | Researchers want this |

**Dependencies:** Formant bank (1.2), vowel dataset (1.5).

---

## 2. Vocal-Strategy Catalogue

Concrete enumeration of strategies this app should support, with acoustic definitions. Strategies are listed as "name — rule — range in which it is typically used — notes." Pedagogical usage is anchored in Henrich, Smith, Wolfe (2011) [sopranos/altos/tenors/baritones], Miller (*Resonance in Singing*), Bozeman (*Practical Vocal Acoustics*), and Titze.

### 2.1 R1-based strategies (first-formant tuning)

| Strategy | Rule | Voice type / range | Perceptual label |
|---|---|---|---|
| **Speech / untuned R1** | F1 stays at its "speech" value for the vowel; no tracking of pitch | Any voice below its first passaggio | "Natural speech resonance" |
| **R1:f₀** | F1 = 1·f₀ (F1 tracks the fundamental upward) | Sopranos above ~C5; altos above ~C5 for high vowels | Classical high soprano; vowel opens as pitch rises |
| **R1:2f₀** | F1 = 2·f₀ (F1 tracks the second harmonic) | Belt (chest-mix) at high pitches; tenors around passaggio; altos below C5 for close vowels | **Belt** — "megaphone" configuration; F1 raised by jaw/mouth opening |
| **R1:3f₀** | F1 = 3·f₀ | Tenors and baritones in the mid range for close vowels; "chiaroscuro" | Classical male mid-range |
| **R1:4f₀** | F1 = 4·f₀ | Basses and baritones at low pitches for open vowels | Rare; anchors F1 to 4th harmonic |
| **R1:5f₀** | F1 = 5·f₀ | Very low bass voices | Edge case, enumerate for completeness |

### 2.2 R2-based strategies (second-formant tuning)

| Strategy | Rule | Voice type / range | Perceptual label |
|---|---|---|---|
| **R2:2f₀** | F2 = 2·f₀ | Soprano upper range alongside R1:f₀; alto high range for close vowels | Often combined with R1:f₀ as a dual-resonance strategy |
| **R2:3f₀** | F2 = 3·f₀ | Tenor "second passaggio" strategy (Miller) | Classical tenor upper middle |
| **R2:4f₀** | F2 = 4·f₀ | Tenor and baritone strategies for front vowels | |
| **R2:5f₀** | F2 = 5·f₀ | Front-vowel high-harmonic tuning; some tenor passaggio approaches | |

### 2.3 Combined strategies (dual locks)

| Strategy | Rule | Context |
|---|---|---|
| **R1:f₀ + R2:2f₀** | F1 tracks f₀, F2 tracks 2f₀ | Standard high-soprano dual-tune |
| **R1:2f₀ + R2:3f₀** | F1 on 2nd harmonic, F2 on 3rd | One belt + vowel-forward combination |
| **R1:2f₀ + R2:4f₀** | F1 on 2nd, F2 on 4th | Belt with front-vowel emphasis |
| **R1:3f₀ + R2:5f₀** | F1 on 3rd, F2 on 5th | Tenor classical mid-range strategy |

### 2.4 Specialty / named strategies

| Strategy | Rule | Notes |
|---|---|---|
| **Singer's formant cluster** | F3, F4, F5 pulled together around 2.8–3.2 kHz | Classical "ringing" timbre; implemented by moving F3/F4/F5 toward ~3 kHz and narrowing bandwidths |
| **Whistle register** | Very high f₀ (C6+), F1 above 2f₀, harmonics sparse | Source amplitude changes dominate; pedagogically distinct |
| **Straw phonation / SOVT** | Lip/tube closure modeled as narrow F1, strong low-pass | Popular in vocal training; nice to show as a preset |
| **Twang** | F1 slightly lowered, F2 and epilaryngeal resonance emphasized | Estill-style demonstration |
| **Yawn-sigh / inverted megaphone** | F1 lowered, F2 lowered, widened pharynx | Classical operatic starting posture |

**Implementation requirement:** Each strategy should be expressible as a JSON descriptor — `{ formant: 1, multiplier: 2 }` for `R1:2f₀`, `[{formant:1,multiplier:1},{formant:2,multiplier:2}]` for combined. This lets advanced users define and share custom strategies via URL.

---

## 3. Published vowel formant datasets

The research question: which tables are trustworthy and how do pedagogy apps present them?

### 3.1 Peterson & Barney (1952)
- **Scope:** 76 speakers (33 men, 28 women, 15 children), American English, 10 vowels in /hVd/ context.
- **Data:** F0, F1, F2, F3 reported at the vowel steady-state; full individual datapoints published.
- **Strengths:** Canonical; referenced by virtually every vowel-acoustics paper from 1952–1995. Well-defined speaker pool; still the first-thought reference for "standard American English vowel formants."
- **Weaknesses:** Small speaker count; mid-20th-century recording chain; measured at a single temporal midpoint, so doesn't capture formant movement.

### 3.2 Hillenbrand et al. (1995)
- **Scope:** 139 speakers (45 men, 48 women, 46 children), American English, 12 vowels in /hVd/ context.
- **Data:** F0, F1, F2, F3, F4 reported at multiple time points (20%, 50%, 80% of vowel duration) — captures dynamics.
- **Strengths:** Modern digital recording; larger speaker pool; more vowels; captures time-varying formants. **This is the one most modern pedagogy apps should default to.**
- **Weaknesses:** Still American English only; vowels are more dispersed than Peterson-Barney (harder to classify from static samples).

### 3.3 Fant (1960) — *Acoustic Theory of Speech Production*
- **Scope:** Swedish vowels; smaller speaker base.
- **Strengths:** Canonical for non-English/European pedagogy; historically the source for many singing-textbook vowel tables (Sundberg builds on this).
- **Weaknesses:** Swedish vowel inventory — not directly comparable to the Hillenbrand American English 12-vowel set.

### 3.4 How pedagogy apps typically present this data

1. **Voice-type stratified ellipses** (male / female / child separately) — F1/F2 mean ± 1 standard deviation shown as ellipses on the vowel chart.
2. **IPA labels** at the ellipse centroids, with audio previews.
3. **Source citation visible in the UI** — researchers and academics will not trust an unsourced dataset.
4. **Range ("box") for F3, F4** rather than ellipses — higher formants are less vowel-characteristic and more voice-quality-characteristic.
5. **Log-axis vs linear-axis toggle** — speech scientists want Hz linear, phoneticians want Mel/Bark, singing teachers want whatever's clearest.

**Recommendation for Formant Canvas:** Default to Hillenbrand (1995) because it's the modern standard, but expose Peterson-Barney and Fant as selectable "data source" options for users who want to compare or match a textbook. Cite the source on-screen. Ship the raw CSV bundled as a static JSON import — these datasets are small (<100 KB) and fully public.

---

## 4. Feature Landscape

### 4.1 Table Stakes (Users Expect These)

Features whose absence makes the tool feel unfinished or untrustworthy. A voice synthesis pedagogy app *must* have these to be taken seriously.

| Feature | Why Expected | Complexity | Notes |
|---|---|---|---|
| Real-time audio with no clicks on parameter changes | Otherwise dragging is painful | MEDIUM | Smoothing in the AudioWorklet at audio rate; not control rate. This is the #1 credibility factor |
| Play/stop button, global volume, mute | Obvious but easy to forget | LOW | |
| Keyboard input for pitch (QWERTY "virtual keyboard") | Users will want to type notes to drive f₀ | LOW | Z-key row = natural, A-row = sharps — standard DAW convention |
| MIDI keyboard input (Web MIDI API) | Teachers have MIDI keyboards on their desks | LOW-MEDIUM | Web MIDI supported in Chrome/Edge; fall back gracefully |
| Real-time spectrum display (log-frequency, dB magnitude) | Every analyzer tool has one; users will look for it | MEDIUM | AnalyserNode FFT; 2048-point is enough. Overlay harmonic markers and formant centers |
| Waveform display (oscilloscope view of the source or output) | Pedagogy: "see the glottal pulse shape" | LOW-MEDIUM | Canvas scope at refresh rate; slowable for single-period inspection |
| Spectrogram (time-frequency) | Sing & See / Estill staple | MEDIUM | Scrolling canvas of FFT magnitudes; optional in v1 |
| Presets: vowels | /a, e, i, o, u/ plus the IPA set at minimum | LOW | From Hillenbrand data |
| Presets: voices | Male tenor, baritone, bass, soprano, alto, mezzo, child | LOW | Set f₀ range, source defaults, formant starting values |
| Presets: phonation modes | Breathy / modal / flow / pressed | LOW | See §1.1 |
| Presets: vocal strategies | R1:f₀, R1:2f₀, etc. as one-click choices | LOW | |
| Save / load configurations | Users will tweak for 10 minutes and lose it if there's no save | LOW | Local storage or URL-encoded state — URL is better (shareable) |
| URL sharing | Share a state with a student | LOW | Serialize state to a compressed query string |
| Octave / note / cents readout for f₀ | "You're on A4 + 15 cents" | LOW | |
| Note names on piano keys | C, D, E with octave numbers | LOW | |
| Frequency (Hz) labels toggle | Engineers will want Hz, musicians will want note names | LOW | |
| Pause / freeze visuals | Sometimes you need to explain what's on screen without it moving | LOW | |
| Undo / redo | Direct manipulation + dragging = you will make mistakes you want to reverse | MEDIUM | Small state-history ring buffer |
| Keyboard shortcuts | Accessibility and power-user speed | LOW | Space = play/stop, arrow keys = nudge selected formant, etc. |
| Inline help / "what is this?" tooltips | Pedagogy tool — students won't know what "Rd" or "OQ" means | LOW-MEDIUM | Tooltip with plain-English explanation and a link to a deeper explainer |
| Audio-output device selection (optional) | Lab setups with multiple outputs | LOW | Browser `setSinkId` where supported |

### 4.2 Differentiators (Competitive Advantage)

These are where Formant Canvas beats Madde, Pink Trombone, Sing & See, et al.

| Feature | Value Proposition | Complexity | Notes |
|---|---|---|---|
| **Fully linked visualization** — every view updates when any parameter changes | This is the Core Value from PROJECT.md; no existing tool does this as tightly | MEDIUM-HIGH | Svelte reactivity is well-suited. The engineering challenge is keeping audio ↔ visuals synchronized without visible lag |
| **Drag on the F1/F2 chart to change the vowel** | Madde uses sliders; Pink Trombone uses an articulatory model. Nothing currently lets you drag directly on the phonetic F1/F2 map | MEDIUM | |
| **Drag harmonics on the piano to re-tune a formant** | The inverse interaction: "pull H3 into F1" and the app figures out what formant move does that | MEDIUM-HIGH | Gesture → constraint solver → formant update |
| **Auto-tuning strategies as a live concept** | Madde's overlay approach is static; Formant Canvas makes the strategy *a rule that runs* | MEDIUM | See §1.6 |
| **Pitch-sweep / glissando scrub** | Drag a pitch slider or play a scale to visualize a strategy across a range in 3 seconds | LOW-MEDIUM | Enormous pedagogical win for strategy teaching |
| **"Explain this" tooltips with acoustic rationale** | Madde assumes you know; Formant Canvas teaches as you play | LOW | Each control has a 2-sentence explanation + a "read more" link |
| **Clean, modern, uncluttered UI** | Madde looks like a Windows 98 tool; Sing & See is dense; Pink Trombone is cute but minimal. Formant Canvas can look like a modern web product | MEDIUM | Design debt if neglected |
| **URL-shareable states** | Teachers can send "open this link to see what I mean" | LOW | Much better than "download Madde and load my .txt" |
| **Side-by-side compare mode (v1.x)** | Load two states (e.g. "belt" vs "classical") and A/B them, crossfading audio and visuals | HIGH | Top differentiator for teaching; defer to v1.x |
| **IPA keyboard for vowel input** | Click an IPA symbol, get that vowel's formants | LOW | Trivial given the Hillenbrand dataset is already loaded |
| **Guided lesson mode (v1.x+)** | Scripted walkthroughs: "Here's what belt feels like. Now try R1:2f₀." | MEDIUM-HIGH | Monetizable but defers to after core is stable |
| **Data-source toggle** (Peterson-Barney / Hillenbrand / Fant) | Researchers will love it; competitors don't offer it | LOW | |
| **Keyboard + MIDI + touch all first-class** | Teachers often use iPads | LOW-MEDIUM | Pointer Events + Web MIDI |
| **Export audio clip / WAV** (v1.x) | "Record my belt demo and paste it into a lesson plan" | MEDIUM | MediaRecorder API; defer if tight |

### 4.3 Anti-Features (Commonly Requested or Madde-Inherited, Problematic Here)

Features to explicitly NOT build. Each comes with the reason and what to do instead.

| Anti-Feature | Why Requested / Why Madde Has It | Why Problematic | What to Do Instead |
|---|---|---|---|
| **Dense Windows-95-style control panel with 40+ sliders on screen at once** | Madde's layout; "exposes the model" | Overwhelms novices; sends "this is for experts only" signal | Progressive disclosure: basic controls visible, "advanced" sheet accessible. Group by purpose (Source / Tract / Expression) |
| **Opaque jargon labels in the default view** ("Rd", "OQ", "F1 BW", "EE") | Researcher vocabulary | Novices bounce; alienates singers and teachers | Plain labels in the default view ("breathiness", "vowel resonance 1 width"); expert vocab toggleable via an "Expert mode" switch |
| **6 formants exposed as 6 sliders upfront** | Madde's layout | Nobody needs F5/F6 on their first visit | Show F1/F2 prominently (they define the vowel); F3/F4/F5/F6 available but collapsed |
| **Per-sample-rate or "CD-quality" toggle** | Feels professional | Browser audio is 44.1/48 kHz anyway; just adds a useless choice | Use `AudioContext.sampleRate` as-is |
| **Real-time audio recording / pitch detection / auto-analyze the user's voice** | "It's a voice app, it should listen" | Explicitly out of scope in PROJECT.md; would double the complexity and expose mic permission prompts | Keep it synthesis-only. A separate "Analyzer" app is someone else's project |
| **Real articulatory model à la Pink Trombone** | "Feels more physical" | Fundamentally different model (wave equation on a tract shape), would compete with formant-based approach, and Pink Trombone already does it | Don't reinvent Pink Trombone. Stay formant-based; this is about understanding formants, not articulation |
| **Full DSP plugin framework with load-your-own-filters** | Researcher wishlist | Infinite scope; requires hosted plugin infra | JSON-serializable presets are enough |
| **Generic "synth" features**: ADSR envelopes, LFO routing matrix, delay/reverb, filter types beyond formant | "Make it a real synthesizer" | This is a voice-visualization pedagogy tool, not a music synth | Do the voice thing well. If people want reverb, they can route output elsewhere |
| **Cloud accounts / multi-user / shared presets via backend** | "Classroom management!" | Explicitly out of scope in PROJECT.md; adds auth, privacy, ops, cost | URL sharing covers 95% of the real need |
| **Score-based singing / lyrics / piano-roll sequencing** | "It should sing 'Happy Birthday'" | This is Synthesizer V / Vocaloid territory, not pedagogy | Defer indefinitely — different product category |
| **100+ vowel presets from every language** | "Comprehensive!" | Decision paralysis; bulky data | Ship IPA cardinal vowels + the 12 Hillenbrand vowels. Users can drag to anything else |
| **"AI voice modeling" / neural TTS integration** | 2025 zeitgeist | Opaque, non-pedagogical, undermines the "understand the model" purpose | Explicitly pedagogical, explicitly white-box |
| **Tooltips on everything, always visible** | "Accessible!" | Visual noise; condescending to repeat users | Tooltips on hover/focus only; dedicated "tour" mode for first-time users |
| **Separate windows / detachable panels / multi-monitor layouts** | Madde-style; "pro tool" feel | Complex layout engine; breaks on tablets | Single responsive layout that rearranges for smaller viewports |

---

## 5. Feature Dependencies

```
[Glottal source (1.1)]
    ├──feeds──> [Formant filters (1.2)]
    │               ├──feeds──> [Audio output]
    │               ├──feeds──> [Spectrum display]
    │               ├──feeds──> [Waveform display]
    │               ├──feeds──> [Spectrogram]
    │               ├──amplitude-query──> [Piano harmonic bars (1.4)]
    │               └──frequencies──> [F1/F2 chart (1.7)]
    ├──modulated-by──> [Vibrato / jitter (1.3)]
    └──f₀──> [Piano keyboard (1.4)]
                └──f₀──> [Vocal strategies auto-tune (1.6)]
                              └──overrides──> [Formant filters (1.2)]

[Vowel dataset (Hillenbrand/PB)]
    ├──ellipses──> [F1/F2 chart (1.7)]
    ├──ranges──> [Formant range visualization (1.5)]
    └──presets──> [Vowel preset list]

[Vocal strategy definitions (1.6)]
    ├──overlay-lines──> [Piano keyboard (1.4)]
    ├──auto-tune-rules──> [Formant filters (1.2)]
    └──presets──> [Strategy preset list]

[Preset system]
    ├──snapshots──> [Glottal source state]
    ├──snapshots──> [Formant state]
    ├──snapshots──> [Vibrato/jitter state]
    └──snapshots──> [Active strategy]

[URL serialization] ──round-trips──> [Preset system]
[Save/load] ──round-trips──> [Preset system]
[Undo/redo] ──snapshots──> [Preset system]
```

### Key dependency notes

- **Everything downstream of the glottal source depends on click-free smooth parameter interpolation.** If the source has zipper noise, every visualization that shows it inherits the problem. This is a foundational audio-engineering concern, not a "polish" item.
- **Piano harmonics need formant-filter magnitude response at arbitrary frequencies.** Implementing this analytically (evaluate the biquad transfer function at n·f₀) is much faster and cleaner than FFT-based analysis. Build the analytic evaluator alongside the filter itself.
- **Auto-tune strategies must override user drags gracefully.** When R1:f₀ is active and the user drags F1, either (a) lock the drag and show a "locked by strategy" cursor, or (b) unlock the strategy. Decide this interaction model before shipping strategies — it's easy to get wrong.
- **F1/F2 chart and piano view both display formants.** They must share a single source of truth for formant state; the UI should never get into a state where the two views disagree.
- **Vocal strategies depend on vowel dataset only if you show "snap to vowel" during auto-tune**; otherwise strategies are purely ratio-based and dataset-independent.
- **Spectrogram depends on the AnalyserNode FFT**, which is separate from the analytic harmonic evaluation used for the piano view. The two visual outputs will use different computations of "the spectrum" — document this so users don't expect pixel-perfect agreement between them.

---

## 6. MVP Definition

### Launch With (v1)

Minimum to validate the "linked exploration" core value. If all of these work together, the product works.

- [ ] **Glottal source with Rd-based LF pulse + vibrato + jitter, smooth parameter interpolation** — the sound has to be clean and expressive
- [ ] **F1–F4 formant filter chain** — can be extended to F5–F6 post-launch
- [ ] **F1/F2 vowel chart with direct drag, Hillenbrand background ellipses, IPA labels** — the signature interaction
- [ ] **Piano keyboard with live harmonic bars sampled from the filter response, formant-frequency markers** — the signature visualization
- [ ] **Formant-occupancy ranges drawn on the F1/F2 chart and piano** — basic ellipses for F1/F2 and guide bands for F3/F4
- [ ] **Core vocal strategies: speech, R1:f₀, R1:2f₀, R1:3f₀, R2:2f₀, R2:3f₀, singer's formant cluster** — with both overlay and auto-tune modes
- [ ] **Vowel presets (cardinal 5 + Hillenbrand 12)** and **voice presets (M/F/child)**
- [ ] **Phonation presets (breathy/modal/flow/pressed)**
- [ ] **Vibrato rate/extent/onset controls**
- [ ] **Real-time spectrum display (log-frequency, dB)**
- [ ] **Waveform / oscilloscope view of the output**
- [ ] **Piano/QWERTY keyboard input for f₀**
- [ ] **Cents/notes/Hz readout for f₀**
- [ ] **Play/stop, master volume, mute**
- [ ] **URL-encoded share link**
- [ ] **Undo/redo**
- [ ] **Inline tooltips explaining each control in plain language**
- [ ] **Cite the vowel-data source (Hillenbrand 1995) visibly in the UI**

### Add After Validation (v1.x)

Launch without these, add once the core concept is proven.

- [ ] **Spectrogram view (time-frequency)** — users will ask for it, but the piano + spectrum are enough for v1
- [ ] **Web MIDI input** — straightforward, but only a fraction of users need it
- [ ] **F5–F6 formants** — for advanced singer's-formant pedagogy
- [ ] **Dataset switcher** (Peterson-Barney, Fant, custom) — nice but Hillenbrand is enough for v1
- [ ] **Side-by-side compare mode (two states, crossfade)** — high pedagogical value but high complexity
- [ ] **Pitch-sweep / "play a scale" button** — small code, huge demo value; cut for v1 only if tight
- [ ] **Recording to WAV export** — `MediaRecorder`
- [ ] **Additional strategies: R1:4f₀, R1:5f₀, R2:4f₀, R2:5f₀, combined lock strategies, twang, whistle, SOVT**
- [ ] **Trail/path display on F1/F2 chart**
- [ ] **Log vs Mel vs Bark axis toggle on F1/F2 chart**
- [ ] **Expert-mode toggle** exposing Rd, OQ, spectral tilt, asymmetry independently
- [ ] **Snap-to-vowel toggle**
- [ ] **Keyboard shortcut scheme with on-screen cheat sheet**

### Future Consideration (v2+)

- [ ] **Guided lesson mode** — scripted, curriculum-aligned walkthroughs
- [ ] **Articulatory-to-formant hybrid visualization** (tongue position ↔ F1/F2) — reaches into Pink Trombone territory but has real pedagogical value
- [ ] **Custom strategy editor** — JSON or visual builder for researcher-defined tuning rules
- [ ] **Recording and playback of "formant journeys"** (animated transitions between saved states)
- [ ] **Multi-voice / duet mode** — two voices simultaneously to explain vowel matching and blend
- [ ] **Tablet-first touch interface refinements**
- [ ] **Embeddable widget / iframe** for teachers to embed in LMS pages
- [ ] **Localized UI** (pedagogy has strong non-English-speaking demand: Italian, German, Swedish vocal traditions)

---

## 7. Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---|---|---|---|
| LF glottal pulse with smooth interpolation | HIGH | MEDIUM-HIGH | P1 |
| F1–F4 formant filter chain | HIGH | LOW-MEDIUM | P1 |
| F1/F2 direct-manipulation chart | HIGH | MEDIUM | P1 |
| Piano keyboard with harmonic bars | HIGH | MEDIUM | P1 |
| Vibrato + jitter controls | HIGH | LOW | P1 |
| Core vocal strategies (auto-tune + overlay) | HIGH | MEDIUM | P1 |
| Hillenbrand vowel ellipses | HIGH | LOW | P1 |
| Vowel/voice/phonation/strategy presets | HIGH | LOW | P1 |
| Real-time spectrum display | HIGH | MEDIUM | P1 |
| Waveform display | MEDIUM | LOW | P1 |
| QWERTY keyboard pitch input | MEDIUM | LOW | P1 |
| URL sharing | HIGH | LOW | P1 |
| Tooltips / inline help | HIGH | LOW | P1 |
| Undo/redo | MEDIUM | MEDIUM | P1 |
| Spectrogram | MEDIUM | MEDIUM | P2 |
| Web MIDI input | MEDIUM | LOW | P2 |
| F5–F6 formants | MEDIUM | LOW | P2 |
| Pitch-sweep button | HIGH | LOW-MEDIUM | P2 (candidate P1 if cheap) |
| Side-by-side compare mode | HIGH | HIGH | P2 |
| Data-source switcher | LOW-MEDIUM | LOW | P2 |
| WAV export | MEDIUM | MEDIUM | P2 |
| Expert mode (Rd/OQ/tilt raw) | MEDIUM | LOW | P2 |
| Extended strategy list | MEDIUM | LOW | P2 |
| Guided lessons | HIGH | HIGH | P3 |
| Articulatory visualization | MEDIUM | HIGH | P3 |
| Custom strategy editor | MEDIUM | MEDIUM | P3 |
| Embeddable widget | MEDIUM | MEDIUM | P3 |
| Localization | MEDIUM | MEDIUM | P3 |

**Priority key:**
- **P1** — Must have for launch; cutting it breaks the core value proposition
- **P2** — Should have; launch without if tight, add in 1–3 months
- **P3** — Nice to have; wait for validation

---

## 8. Competitor Feature Analysis

| Feature | Madde | Pink Trombone | Sing & See / Voiceprint | Formant Canvas (planned) |
|---|---|---|---|---|
| Voice synthesis model | Formant (6 formants) | Articulatory (wave-equation tract) | None (analysis only) | Formant (F1–F6, LF source) |
| Runs in browser | No (Windows native) | Yes | Partially (Sing&See native; SpectrumView web) | Yes |
| Direct manipulation of formants | Sliders only | N/A (articulatory) | N/A | **Drag on F1/F2 chart and piano** |
| Vocal strategies | No | No | No (Voiceprint overlays measured resonances) | **Yes — both overlay and auto-tune** |
| Vowel data source | Built-in (unclear origin) | N/A | N/A | **Hillenbrand/PB/Fant, cited and switchable** |
| Piano harmonic view | Yes | No | Spectrogram only | **Yes + formant overlays** |
| Linked visualization | Partially | Partially (tract = sound only) | N/A | **Full linking is the Core Value** |
| Vibrato / jitter | Yes | Limited | N/A | Yes, with natural-variation shaping |
| URL share | No | No | No | **Yes** |
| Pedagogy-oriented copy/tooltips | No | Minimal | Some | **Yes, plain-language default with expert mode** |
| Preset system | Yes (file-based) | Minimal | N/A | **Yes — vowel/voice/phonation/strategy, URL-shareable** |
| Modern UI aesthetic | No (Win95 era) | Minimal whimsy | Dated | **Yes** |
| Real audio input / analysis | No | No | **Yes (core)** | No (out of scope) |
| MIDI input | No | No | Limited | Planned (v1.x) |
| Data-source transparency | No | N/A | N/A | **Yes — cite the dataset on screen** |

**Where Formant Canvas wins:** Linked visualization, direct-manipulation formant chart, vocal-strategy auto-tuning, browser-native, modern UI, URL sharing, pedagogy-first copy.

**Where it loses (by design):** No audio analysis (Sing & See wins), no articulatory model (Pink Trombone wins), less simulation rigor than Praat or VTL. These are explicit non-goals from PROJECT.md.

---

## 9. Open Questions for Downstream Phases

These are things the research couldn't resolve definitively and that should be flagged for phase-level research later:

1. **Biquad-cascade vs parallel formant topology** — well-trodden DSP territory, but the exact coefficients and how to handle coefficient smoothing at audio rate in the AudioWorklet needs a dedicated experiment early.
2. **How zipper-free is `AudioParam.linearRampToValueAtTime` in practice across browsers?** Anecdotally fine but the Web Audio GitHub issue tracker shows mobile AudioWorklet issues; may need per-sample smoothing in the worklet regardless.
3. **Exact shape of Rd → LF parameter curves** — Fant's original paper gives one fit; later literature proposes others. Pick one and document.
4. **UX of constraint-solving when the user drags a harmonic** — "I dragged H3 into the F1 position; what should happen?" needs design exploration. Moving F1 to H3's frequency is one answer; moving f₀ so H3 lands on the existing F1 is another. Probably a mode switch.
5. **Mobile audio worklet support and latency** — known rough edges; may force "desktop Chrome/Firefox first" positioning in v1 (consistent with PROJECT.md constraints).
6. **Licensing of the Hillenbrand dataset** — freely available for research but verify redistribution terms before bundling.
7. **Whether the 3 kHz singer's-formant cluster needs its own dedicated "cluster mode"** control, or whether it's a derived display when F3/F4/F5 are all near 3 kHz.
8. **Curriculum / lesson-mode content design** — deferred to v2, but someone should start noting "what would a 30-minute intro lesson look like?" during v1 development so the content pipeline exists by the time the feature lands.

---

## Sources

- [The MADDE vowel synthesiser — World Voice Day](https://worldvoiceday.org/wvd-edu/the-madde-vowel-synthesiser/)
- [New technology for teaching voice science: the Madde Synthesizer (Granqvist)](https://go.gale.com/ps/i.do?id=GALE%7CA282426664)
- [The KTH synthesis of singing (ResearchGate PDF)](https://www.researchgate.net/publication/26450063_The_KTH_synthesis_of_singing)
- [Using Madde to formant tune — VoiceScienceWorks](https://www.voicescienceworks.org/eyes-in-the-studio/using-madde-to-formant-tune)
- [Pink Trombone (Neil Thapen)](https://dood.al/pinktrombone/)
- [Pink Trombone — Imaginary](https://www.imaginary.org/program/pink-trombone)
- [Formant Tuning: Resonance Strategies in Singing — VoiceScience.org](https://www.voicescience.org/lexicon/formant-tuning/)
- [Singer's Formant — VoiceScience.org](https://www.voicescience.org/lexicon/singers-formant/)
- [Acoustic Strategies — VoiceScienceWorks](http://www.voicescienceworks.org/acoustic-strategies.html)
- [Henrich, Smith, Wolfe (2011): Vocal tract resonances in singing — Strategies used by sopranos, altos, tenors, and baritones](https://newt.phys.unsw.edu.au/jw/reprints/SATB.pdf)
- [Vos et al., The Perception of Formant Tuning in Soprano Voices](https://pure.royalholloway.ac.uk/ws/files/28187915/VosEtAl_FormTuningJVoicePURE.pdf)
- [Formant Tuning Strategies in Professional Male Opera Singers — Journal of Voice](https://www.jvoice.org/article/S0892-1997(12)00209-3/abstract)
- [Shifting Gears: Formant Tuning Strategies of Elite Operatic Baritones](https://www.academia.edu/32667155/Shifting_Gears_Formant_Tuning_Strategies_of_Elite_Operatic_Baritones)
- [Acoustical Theory of Vowel Modification Strategies in Belting (Journal of Voice)](https://www.sciencedirect.com/science/article/abs/pii/S0892199723000048)
- [How to Belt: A Science-Based Guide — VoiceScience.org](https://www.voicescience.org/articles/how-to-belt/)
- [Hillenbrand et al. 1995: Acoustic characteristics of American English vowels (PubMed)](https://pubmed.ncbi.nlm.nih.gov/7759650/)
- [Peterson & Barney (1952) dataset — phonTools R package](https://rdrr.io/cran/phonTools/man/pb52.html)
- [The LF model of the glottal voice source (Fant et al. 1985)](https://www.researchgate.net/figure/The-LF-model-of-the-glottal-voice-source-Fant-et-al-1985_fig1_6298316)
- [Perceptual equivalence of the LF and linear-filter glottal flow models — JASA](https://pubs.aip.org/asa/jasa/article/150/2/1273/615393/Perceptual-equivalence-of-the-Liljencrants-Fant)
- [Spectral correlates of voice open quotient and glottal flow asymmetry (Henrich et al.)](https://www.ee.columbia.edu/~dpwe/papers/HenAD01-glottal.pdf)
- [Glottal Source Processing: from Analysis to Applications (arXiv)](https://arxiv.org/pdf/1912.12604)
- [Glottal Excitation Modeling for the Singing Voice — CCRMA](https://ccrma.stanford.edu/~jos/mus423h/Glottal_Excitation_Modeling_Singing.html)
- [Sing & See features](https://www.singandsee.com/features)
- [Estill Voiceprint](https://estillvoice.com/estillvoiceprint/)
- [Vowels, Vowel Formants and Vowel Modification — SingWise](https://www.singwise.com/articles/vowels-formants-modifications)
- [Acoustic Correlates of the IPA Vowel Diagram — Pfitzinger](https://www.internationalphoneticassociation.org/icphs-proceedings/ICPhS2003/papers/p15_1441.pdf)
- [Vibrato — Wikipedia](https://en.wikipedia.org/wiki/Vibrato)
- [Vibrato Rate and Extent in College Music Majors — Journal of Voice](https://www.sciencedirect.com/science/article/abs/pii/S0892199715002064)
- [Web Audio API — W3C 1.1 spec](https://www.w3.org/TR/webaudio-1.1/)
- [AudioWorklet real-world issues — WebAudio GitHub #2632](https://github.com/WebAudio/web-audio-api/issues/2632)
- [Practical Science in the Studio Part 3 — NATS JOS](https://www.nats.org/_Library/JOS_On_Point/JOS_077_5_2021_633.pdf)

---
*Feature research for: voice-synthesis pedagogy & visualization web app*
*Researched: 2026-04-11*
