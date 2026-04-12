# Pitfalls Research

**Domain:** Adding LF glottal model, cascade formant filters, and vocal tract visualization to an existing Web Audio + Svelte formant synthesizer
**Researched:** 2026-04-13
**Confidence:** HIGH for DSP/filter pitfalls (verified with Web Audio spec, DSP literature, Klatt 1980 paper); MEDIUM for LF model numerics (academic literature, reference implementations); MEDIUM for vocal tract visualization (inverse problem literature, Pink Trombone reference)

This document covers pitfalls specific to the v0.2 upgrade -- adding LF glottal model, cascade formant topology, and vocal tract visualization to the existing Formant Canvas system. For general Web Audio and Svelte pitfalls, see the v0.1 pitfalls (git history).

---

## Critical Pitfalls

### Pitfall 1: LF model implicit equation solver diverges or stalls the AudioWorklet

**What goes wrong:**
The LF (Liljencrants-Fant) glottal model has two implicit equations that must be solved numerically: (1) the parameter epsilon (related to the return phase time constant Ta) requires solving a transcendental equation, and (2) the amplitude scaling factor E0 depends on epsilon. If you implement Newton-Raphson or bisection *inside* the AudioWorklet's `process()` method, two things break: the solver may not converge for certain parameter combinations (especially extreme Ra values), causing NaN propagation through the entire audio chain, and even when it converges, the iteration count is unpredictable -- a single slow convergence can blow through the 128-sample quantum budget and cause audio glitches.

**Why it happens:**
The existing Rosenberg model is a closed-form formula -- `rosenbergSample()` is 6 lines of math with no iteration. Developers naturally try to implement LF the same way: compute parameters on-the-fly per cycle. But the LF model's return phase involves `exp(-epsilon * (T0 - Te))` where epsilon is defined implicitly. This is fundamentally different from Rosenberg.

**How to avoid:**
- Pre-compute LF waveform tables on the main thread, not in the worklet. Build a lookup table indexed by the LF shape parameters (Rd or Ra/Rk/Rg). Send the table to the worklet via `postMessage` (transferable ArrayBuffer).
- Use the Rd parameterization (Fant 1995) instead of raw Ra/Rk/Rg. Rd is a single "voice quality" parameter from ~0.3 (pressed) to ~2.7 (breathy) that deterministically maps to the other three. This collapses the 3D parameter space to 1D, making lookup tables practical.
- Pre-compute a grid of ~50-100 Rd values at startup (takes <50ms). Interpolate between two nearest table entries at runtime -- linear interpolation between adjacent waveform shapes is perceptually smooth.
- Clamp Rd to validated range [0.3, 2.7] in the UI. Outside this range the implicit equations have no real solution.
- Add NaN guards after every LF sample computation: `if (!isFinite(sample)) sample = 0;`. NaN in an AudioWorklet output propagates to all downstream nodes and produces silence or distortion with no error message.

**Warning signs:**
- Occasional clicks or dropouts when sweeping LF parameters quickly
- `NaN` appearing in AnalyserNode data
- Audio worklet `process()` taking >2.9ms per 128-sample block (at 44.1kHz, the budget is ~2.9ms)
- Silence after changing to extreme parameter values

**Phase to address:** LF Glottal Model phase (implement table pre-computation before any worklet integration)

---

### Pitfall 2: Cascade formant chain has uncontrolled gain accumulation causing clipping or silence

**What goes wrong:**
Switching from parallel to cascade (series) filter topology fundamentally changes the gain structure. In the current parallel topology, each BiquadFilterNode's output is independently scaled by a GainNode and summed -- the gains are additive and easily controlled. In cascade topology, the filters multiply: a signal passing through F1, F2, F3, F4, F5 in series accumulates gain at frequencies near formant peaks and attenuation everywhere else. The peak-to-valley ratio can exceed 60-80dB. At formant frequencies the output clips; between formants it's inaudible. Worse: when formant frequencies are close together (e.g., F1 and F2 in /a/), the cascaded peaks compound, producing massive gain spikes.

**Why it happens:**
In the Klatt cascade model, the resonators don't need individual amplitude controls because the *relative* amplitudes come out correct from the cascade topology itself -- but the *absolute* level is wildly different from the parallel version. Developers switching from parallel to cascade often keep the same gain structure and wonder why everything clips.

**How to avoid:**
- Add a normalization gain stage after the cascade chain. Compute the expected peak gain analytically (product of individual resonator peak gains) or measure it empirically and apply the inverse.
- Use constant-peak-gain resonators: place zeros at DC and Nyquist so that the peak gain of each second-order section stays constant as frequency and Q change. The formula is in Julius O. Smith's DSP textbook. This prevents gain from changing unpredictably as formants move.
- Keep the parallel topology available as a fallback. The Klatt synthesizer itself uses cascade for vowels and parallel for fricatives/bursts. You may need both, switchable per phonation context.
- Add a limiter or soft-clipper after the cascade chain as a safety net -- even a simple `Math.tanh(sample * 0.5)` prevents speaker damage during development.
- Update `formant-response.ts`: the current `spectralEnvelope()` function sums magnitudes (parallel model). For cascade, you need to multiply magnitudes. The visualization will be wrong if this isn't updated.

**Warning signs:**
- Harsh distortion when formants are close together
- Output level changes dramatically when moving a single formant
- Visualization (FormantCurves) doesn't match what you hear
- Master gain slider needs to be set to 0.01 to avoid clipping

**Phase to address:** Cascade Filter phase (implement gain normalization from the start, not as an afterthought)

---

### Pitfall 3: Vocal tract visualization is physically impossible for the current formant values

**What goes wrong:**
The formant-to-vocal-tract-shape mapping is an inverse problem -- multiple vocal tract shapes can produce the same formant frequencies, and some formant combinations correspond to *no* physically realizable vocal tract. If you naively interpolate between known vowel shapes based on F1/F2, you get impossible geometries: the tongue passes through the palate, the cross-section goes negative, or the tract has discontinuities that look like a glitch rather than anatomy. Users (especially voice teachers and researchers) will immediately lose trust.

**Why it happens:**
The forward problem (tract shape to formants) is well-defined. The inverse problem (formants to tract shape) is ill-posed: it's underdetermined (infinite solutions) and the solution space has holes (impossible regions). Developers coming from the audio side expect a clean mapping function and are surprised when the math doesn't cooperate.

**How to avoid:**
- Do NOT try to solve the general inverse problem. Use a parameterized articulatory model with a small number of degrees of freedom (tongue body position, tongue tip, jaw, lip rounding -- 4-6 parameters). Maeda's model is the standard reference with 7 parameters.
- Map formant values to articulatory parameters via a pre-computed lookup table derived from published MRI/CT data, not by inverting the acoustic equations at runtime.
- For F1/F2 combinations that don't map to any valid shape, interpolate to the nearest valid configuration and grey out or de-emphasize the visualization to signal uncertainty. Do not show a confidently-drawn impossible shape.
- Keep the visualization explicitly simplified and pedagogical: a schematic midsagittal cross-section with smooth curves, not a photorealistic anatomy. This sets correct expectations and is easier to deform smoothly.
- Use SVG path interpolation (cubic Bezier curves) with control points derived from the articulatory parameters. SVG is already the project's medium for similar complexity visualizations. Constrain control points to prevent self-intersection.

**Warning signs:**
- Tongue outline crosses the palate outline
- Shape doesn't change perceptibly when F1/F2 change by 100Hz+
- Shape changes are discontinuous (jumps between two configurations)
- Voice researchers point out the shape doesn't match what they see on ultrasound/MRI

**Phase to address:** Vocal Tract Visualization phase (design the articulatory model constraints before drawing anything)

---

### Pitfall 4: Switching between parallel and cascade breaks the reactive parameter bridge

**What goes wrong:**
The existing `AudioBridge.buildFormantChain()` creates 5 parallel BiquadFilterNodes with individual GainNodes, all wired from the worklet. `syncParams()` updates all 5 filters' frequency/Q/gain via `setTargetAtTime`. Adding cascade means a completely different graph topology (series chain instead of fan-out). If you try to support both topologies by rebuilding the graph at runtime (disconnecting parallel, reconnecting as cascade), you get: (a) audible pops/clicks from the graph reconnection, (b) orphaned nodes that aren't garbage collected, (c) a race condition where `syncParams()` runs while the graph is half-rebuilt.

**Why it happens:**
The current code assumes a single, static topology. There's no abstraction layer between "voice parameters changed" and "update these specific Web Audio nodes." Adding a second topology means the bridge needs to know which topology is active and route updates differently.

**How to avoid:**
- Build both topologies at init time. Keep both wired up but mute the inactive one via a gain crossfade (e.g., 50ms `setTargetAtTime` ramp to 0 on parallel sum, ramp to 1 on cascade output). This avoids graph reconnection entirely.
- Alternatively, implement cascade filters *inside the AudioWorklet* as custom biquad math rather than using native BiquadFilterNodes. This keeps the graph topology unchanged (worklet -> single output) and moves the parallel/cascade choice into worklet code. Downside: you lose native BiquadFilterNode's optimized implementation and `setTargetAtTime` automation. Upside: topology is invisible to the bridge.
- If you must rebuild the graph, do it during a silent period: ramp master gain to 0, wait for the ramp to complete (use `setTimeout` matching the time constant), rebuild, then ramp back up. Never disconnect nodes while audio is playing.
- Extract the topology concern into a separate class (e.g., `FormantTopology`) that `AudioBridge` delegates to. `syncParams()` should call `topology.update(formantData)` without knowing the internal wiring.

**Warning signs:**
- Clicks or pops when switching between parallel and cascade mode
- Audio continues from the old topology after switching
- Memory leaks (Web Audio nodes are not garbage collected if any reference exists)
- `syncParams()` throws because it references nodes that have been disconnected

**Phase to address:** Cascade Filter phase (design the topology abstraction before implementing the cascade chain)

---

### Pitfall 5: LF model aliasing at soprano f0 values produces audible artifacts

**What goes wrong:**
The LF glottal pulse has a sharp discontinuity at the "return phase" (the abrupt closure of the glottis, parameter Te). In the time domain this is a near-vertical drop. When sampled naively at 44.1kHz, harmonics above Nyquist fold back as aliasing. This is barely noticeable at bass f0 (100Hz, ~441 samples per period) but becomes severe at soprano f0 (800Hz+, ~55 samples per period). The existing Rosenberg model has the same issue but its smoother cosine closure masks it better. LF's steeper return phase makes aliasing much worse.

**Why it happens:**
The Rosenberg pulse closes with a smooth cosine -- its spectral energy falls off relatively fast. The LF pulse's return phase is exponential with a fast time constant, producing much more high-frequency energy. At high f0, fewer samples represent the return phase, and the aliased energy is concentrated in the audible range.

**How to avoid:**
- Use band-limited pulse generation. The frequency-domain approach (Gobl 2021, INTERSPEECH) derives a closed-form spectrum for the LF model using Laplace transforms, avoiding time-domain aliasing entirely. Pre-compute the band-limited waveform per Rd value.
- Alternatively, oversample the glottal pulse generation by 4x within the worklet, then low-pass filter and decimate. This is simpler to implement but costs 4x compute for the pulse generator (not the formant filters). At 128 samples per quantum, you'd generate 512 oversampled samples -- still within budget for a single worklet.
- A pragmatic middle ground: for the pre-computed lookup tables (see Pitfall 1), generate each table entry at 4x oversampling and store the band-limited version. Zero additional runtime cost.
- Test with soprano presets (f0 = 800-1200Hz) from the beginning, not just the male default at 120Hz.

**Warning signs:**
- Buzzy, metallic quality at high pitches that the Rosenberg model doesn't have
- Spectral analysis shows energy at frequencies that don't correspond to harmonics
- Sound quality degrades as f0 increases (opposite of what voices actually do)

**Phase to address:** LF Glottal Model phase (band-limiting must be part of the table pre-computation, not bolted on later)

---

### Pitfall 6: Cascade filter parameter updates cause transient resonance blowup

**What goes wrong:**
When a formant frequency or bandwidth changes in a cascade chain, the transient response of the chain can produce a brief but loud resonance spike. In the parallel topology, each filter's transient is independent and scaled by its own gain. In cascade, a transient in F1 is amplified by F2, F3, F4, and F5 in series -- the spike compounds through the chain. Fast parameter sweeps (dragging a formant on the vowel chart) produce machine-gun-like pops.

**Why it happens:**
`BiquadFilterNode` parameters automated via `setTargetAtTime` change smoothly, but the *filter state* (internal delay line memory) can ring when the filter's center frequency passes through frequencies where the previous state had energy. In parallel, this ringing is attenuated by the per-formant gain. In cascade, each stage's ringing feeds the next stage at full level.

**How to avoid:**
- Use longer time constants for formant frequency changes in cascade mode. The current 60ms (`formantTC = 0.06`) works for parallel but may need 100-150ms for cascade to avoid transient spikes.
- Change formant parameters in sequence, not simultaneously. Move F1 first, let it settle (~2x time constant = 200ms), then F2, etc. This is impractical for real-time dragging, so instead:
- Add inter-stage gain normalization: between each cascade stage, insert a GainNode that compensates for the expected gain at the next stage's center frequency. This limits how much one stage's transient can compound through the chain.
- As a safety net, add a dynamics compressor or simple limiter after the cascade output. `DynamicsCompressorNode` with a fast attack (0.003s) and moderate ratio (8:1) will catch spikes without audibly coloring the sustained sound.
- If implementing cascade as custom biquad math inside the worklet (see Pitfall 4), you can reset the filter state (zero the delay line) when parameters change by more than a threshold. This prevents ringing but introduces a brief silence -- acceptable for preset switches, not for continuous dragging.

**Warning signs:**
- Loud pops or clicks when dragging formants quickly
- Clipping indicator lights up during parameter transitions but not during steady state
- Users report "the cascade mode sounds broken when I move things"

**Phase to address:** Cascade Filter phase (test with rapid parameter sweeps from day one)

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Inline LF solver in the worklet instead of pre-computed tables | Simpler code, no table infrastructure | Unpredictable worklet performance, NaN risk, can't add band-limiting later | Never -- pre-compute from the start |
| Hard-code vocal tract shapes for 10 vowels, interpolate | Avoids the inverse problem entirely | Can't show tract shape for arbitrary F1/F2 combinations; users notice discontinuities at interpolation boundaries | Acceptable as Phase 1 of the visualization -- ship interpolated shapes first, refine the articulatory model later |
| Keep parallel-only topology, simulate cascade with gain adjustments | No graph topology changes needed | Wrong spectral envelope shape (cascade has different anti-resonance behavior), can't teach cascade vs parallel distinction | Never if cascade is a stated feature; acceptable if it's just "improved sound" |
| Duplicate all formant filter code for cascade branch | Ship cascade faster | Two code paths to maintain; bug fixes must be applied twice; `syncParams()` becomes a tangled if/else | Only for initial prototype; refactor to shared `FormantTopology` abstraction within the same phase |
| Use `formant-response.ts` parallel math for cascade visualization | Visualization "works" quickly | Shows wrong spectral envelope for cascade mode; misleading for pedagogical users | Never -- the visualization being wrong defeats the core value |

## Integration Gotchas

| Integration Point | Common Mistake | Correct Approach |
|-------------------|----------------|------------------|
| LF worklet + existing Rosenberg worklet | Creating a second AudioWorkletProcessor class and swapping nodes at runtime (causes click) | Single processor that accepts a `model` parameter ('rosenberg' or 'lf'); switches internal sample generation, no graph change |
| Cascade BiquadFilterNodes + existing `syncParams()` | Updating cascade filter parameters with the same timing and order as parallel | Cascade needs sequential settling; use slightly staggered `setTargetAtTime` start times or longer time constants |
| Vocal tract SVG + existing F1/F2 vowel chart | Making vocal tract and vowel chart independent components that both listen to `voiceParams` separately | Share derived state: vowel chart computes articulatory params, vocal tract reads them. One computation, two visualizations |
| `formant-response.ts` spectral envelope | Keeping the parallel summation formula when cascade is active | Add a `cascadeMagnitude()` function that multiplies individual formant magnitudes; switch based on active topology |
| Voice presets + new LF parameters | Adding Rd/openQuotient to presets as optional fields that default to undefined | Make all presets specify both Rosenberg (openQuotient) and LF (Rd) values; the active model picks its parameters |
| Strategy engine + cascade topology | Strategies auto-tune formant frequencies; cascade responds differently to rapid frequency changes | Add topology-aware smoothing to the strategy engine; cascade mode uses longer transition times |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Newton-Raphson in AudioWorklet `process()` | Sporadic audio dropouts, worse at high f0 | Pre-compute LF tables on main thread | Any f0 where solver needs >3 iterations (~5% of parameter space) |
| Rebuilding Web Audio graph on topology switch | Click/pop, brief silence, memory leak | Build both topologies at init, crossfade between them | Every topology switch |
| SVG vocal tract with too many path nodes (>200) | Sluggish frame rate when formants change rapidly during vibrato | Keep tract outline to <50 path segments; use Bezier curves, not polylines | Vibrato at 6Hz with visual updates at 60fps = 10 redraws per vibrato cycle |
| Cascade filter chain in AudioWorklet (custom biquad) without pre-allocated buffers | GC pauses causing audio glitches | Pre-allocate all Float64Arrays for filter state in constructor; never allocate in `process()` | Immediately, but intermittently (GC timing is unpredictable) |
| Updating vocal tract visualization every `$effect` tick during continuous drag | UI jank, especially on iPad | Throttle vocal tract updates to 30fps even if formant values update at 60fps; use `requestAnimationFrame` gating | When tract SVG complexity exceeds ~30 path elements with smooth curves |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing LF parameters (Ra, Rk, Rg) directly | Unintelligible to singers and teachers; even researchers find the 3-parameter coupling confusing | Expose single Rd parameter as "voice quality" slider from "pressed" to "breathy"; show Ra/Rk/Rg as read-only derived values in an advanced panel |
| Vocal tract shape changes instantaneously when formant changes | Shape "jumps" feel disconnected from the smooth audio transition | Animate tract shape transitions with the same time constant as the audio formant smoothing (60-150ms) |
| No visual indication of cascade vs parallel mode | Users don't understand why the sound changed | Show a small schematic of the filter topology (series arrows vs fan-out) next to the formant curves; highlight which mode is active |
| Vocal tract visualization implies physical accuracy it doesn't have | Teachers show it to students as "this is what your throat looks like" | Add a subtle label: "Simplified model -- approximate shape for these formants" |
| Cascade mode sounds quieter than parallel at same master gain | User thinks cascade is broken | Auto-normalize output level when switching topology; or show a visual indicator explaining the level difference |
| LF model sounds identical to Rosenberg at default settings | User wonders why LF exists | Default to slightly different Rd values that highlight the LF model's strengths (breathy or pressed phonation where Rosenberg sounds generic) |

## "Looks Done But Isn't" Checklist

- [ ] **LF model:** Sounds correct at 120Hz male f0 -- verify it also works at 800Hz+ soprano f0 without aliasing artifacts
- [ ] **LF model:** Works with default Rd -- verify extreme Rd values (0.3 pressed, 2.7 breathy) don't produce NaN or silence
- [ ] **Cascade filters:** Sounds correct at steady state -- verify rapid formant sweeps (drag on vowel chart) don't produce transient pops
- [ ] **Cascade filters:** Output level matches parallel mode -- verify by switching between modes at same parameter values
- [ ] **Vocal tract:** Shape looks correct for /a/ and /i/ -- verify it also handles intermediate/unusual formant combinations without impossible geometry
- [ ] **Vocal tract:** Updates smoothly during vibrato -- verify at 6Hz vibrato rate that the animation doesn't stutter or jump
- [ ] **FormantCurves visualization:** Still correct -- verify it uses cascade math (multiply) not parallel math (sum) when cascade is active
- [ ] **Presets:** All existing presets still work -- verify Rosenberg presets don't silently load LF parameters or vice versa
- [ ] **Strategy engine:** Still works with cascade topology -- verify auto-tuning doesn't cause cascade transient blowup
- [ ] **Safari/iPad:** Test LF + cascade specifically on Safari -- AudioWorklet performance is tighter on iPad; pre-computed tables help here

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| LF solver diverges in worklet (NaN in audio) | LOW | Add NaN guard (`sample = isFinite(sample) ? sample : 0`), then move to pre-computed tables |
| Cascade gain blowup (clipping) | LOW | Add `DynamicsCompressorNode` after cascade output as immediate fix; design proper gain normalization as follow-up |
| Vocal tract shows impossible geometry | MEDIUM | Constrain control points to convex hull of valid shapes; add boundary checking before SVG render |
| Graph rebuild click on topology switch | MEDIUM | Refactor to dual-topology with crossfade; requires audio bridge redesign but existing code stays |
| Aliased LF at high f0 | MEDIUM | Retrofit band-limited tables; requires regenerating all lookup tables but doesn't change worklet interface |
| `formant-response.ts` showing wrong envelope for cascade | LOW | Add `cascadeMagnitude()` function; mechanical change |
| Presets broken by new parameters | LOW | Add migration: existing presets get default Rd=1.0, topology='parallel' |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| LF solver diverges (Pitfall 1) | LF Glottal Model | Unit test: LF table generation completes for all Rd in [0.3, 2.7] at 0.01 steps; no NaN in output |
| Cascade gain blowup (Pitfall 2) | Cascade Filter | Integration test: sweep F1 from 300-900Hz, measure peak output stays within 6dB of steady-state level |
| Impossible vocal tract (Pitfall 3) | Vocal Tract Visualization | Visual test: render tract for all Hillenbrand vowel centroids; manual inspection for self-intersection |
| Topology switch breaks bridge (Pitfall 4) | Cascade Filter | Test: switch parallel<->cascade 100x while audio plays; no clicks, no silence, no console errors |
| LF aliasing at high f0 (Pitfall 5) | LF Glottal Model | Spectral test: at f0=800Hz, no energy peaks between harmonics (aliased content) above -60dB |
| Cascade transient blowup (Pitfall 6) | Cascade Filter | Integration test: drag formant across full range in <500ms; peak output stays within 12dB of steady-state |

## Sources

- Klatt, D.H. (1980). ["Software for a cascade/parallel formant synthesizer"](https://www.fon.hum.uva.nl/david/ma_ssp/doc/Klatt-1980-JAS000971.pdf) -- Journal of the Acoustical Society of America. Canonical reference for cascade vs parallel topology tradeoffs.
- Fant, G., Liljencrants, J., & Lin, Q. (1985). "A four-parameter model of glottal flow" -- STL-QPSR. Original LF model definition.
- Gobl, C. (2021). ["The LF Model in the Frequency Domain for Glottal Airflow Modelling Without Aliasing Distortion"](https://www.isca-archive.org/interspeech_2021/gobl21_interspeech.html) -- INTERSPEECH. Band-limited LF implementation.
- Smith, J.O. ["Constant Peak-Gain Resonator"](https://www.dsprelated.com/freebooks/filters/Constant_Peak_Gain_Resonator.html) -- Introduction to Digital Filters. Gain normalization for cascaded resonators.
- Smith, J.O. ["Formant Filtering Example"](https://ccrma.stanford.edu/~jos/filters/Formant_Filtering_Example.html) -- Introduction to Digital Filters. Cascade formant filter implementation.
- Maeda, S. (1990). "Compensatory Articulation During Speech: Evidence from the Analysis and Synthesis of Vocal-Tract Shapes Using an Articulatory Model" -- Speech Production and Speech Modelling. 7-parameter articulatory model.
- [Pink Trombone (Modular)](https://github.com/yonatanrozin/Modular-Pink-Trombone) -- AudioWorklet vocal tract synthesis reference implementation.
- [klatt-syn](https://github.com/chdh/klatt-syn) -- TypeScript Klatt synthesizer reference. Study cascade/parallel switching.
- [LF model Python implementation](https://github.com/mvsoom/lf-model) -- Reference for implicit equation solving and Rd parameterization.
- [Web Audio API performance notes](https://padenot.github.io/web-audio-perf/) -- AudioWorklet optimization guidance.
- [BiquadFilterNode MDN](https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode) -- Q factor overflow limit (~770.6), gain clipping behavior.
- [Apsipa 2015: Aliasing-free discrete-time glottal source](http://www.apsipa.org/proceedings_2015/pdf/159.pdf) -- Band-limited LF using cosine series.

---
*Pitfalls research for: Formant Canvas v0.2 -- LF glottal model, cascade formant filters, vocal tract visualization*
*Researched: 2026-04-13*
