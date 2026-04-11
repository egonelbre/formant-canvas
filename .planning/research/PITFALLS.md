# Pitfalls Research

**Domain:** Voice synthesis + real-time Web Audio + linked pedagogical visualization (Svelte)
**Researched:** 2026-04-11
**Confidence:** HIGH for Web Audio / DSP pitfalls (verified with MDN, WebAudio WG issues, practitioner write-ups); MEDIUM-HIGH for voice-science accuracy (literature + authoritative pedagogy sources); MEDIUM for UX-specific direct-manipulation pitfalls.

This document is opinionated. It is intentional about *which* pitfalls Formant Canvas must avoid given its goals (pedagogical accuracy, linked audio+visual exploration, single-developer scope) — not a generic inventory of "bad things that can happen in a web app."

---

## Critical Pitfalls

### Pitfall 1: AudioContext never starts (or silently stays suspended)

**What goes wrong:**
User loads the page, clicks a vowel preset, sees the visualization update — but hears nothing. Or: audio works in development, fails silently in production, fails differently on iOS Safari. On iOS, the ringer switch being set to silent / vibrate kills Web Audio output entirely with no error.

**Why it happens:**
All modern browsers require a user gesture (click/keydown/pointerdown) to start or resume an `AudioContext`. If the context is constructed at page load — which is natural in a Svelte component's `onMount` — it is born in the `suspended` state and stays there. Many tutorials show `new AudioContext()` at module top-level; this is a trap.

**How to avoid:**
- Create the `AudioContext` **lazily**, on the first real user gesture (clicking "Start", pressing a key, tapping a preset).
- Always check `ctx.state === 'suspended'` on every subsequent user interaction and call `ctx.resume()` — Safari will re-suspend on tab-switch, interruption, route changes.
- Gate the UI behind a visible "Start audio" affordance for the first interaction. Do not hide this; users who see muted visuals without explanation think the app is broken.
- On iOS specifically: document the ringer-switch gotcha in the UI (a small "No sound? Check silent switch" hint).
- Show an audible-output state indicator (green "playing" / orange "suspended") in the UI so teachers demoing to a class can diagnose silence in 1 second instead of 30.

**Warning signs:**
- QA reports "no sound on iPad" but it works on desktop.
- Works on first click, then breaks after switching tabs and coming back.
- `ctx.currentTime` is stuck at `0`.
- Console is clean but `AnalyserNode` returns all zeros.

**Phase to address:** Audio engine bootstrap / Phase 1 (foundational audio plumbing). The "Start audio" UX must exist before the first synthesized vowel ships.

---

### Pitfall 2: Zipper noise when dragging formants

**What goes wrong:**
User drags a formant on the F1/F2 chart. The sound crackles, zippers, or makes audible stair-step noises as the filter parameters jump. On rapid drags (the core interaction!) it sounds like a broken robot instead of a smooth vowel transition. This alone can sink the "direct manipulation is the pedagogy" value proposition.

**Why it happens:**
Two independent causes that are often conflated:
1. **`BiquadFilterNode` parameter jumps without automation.** Setting `.frequency.value = X` directly causes an instantaneous coefficient change. Even at 60 Hz update rate, 60 little discontinuities per second is enough to produce audible artifacts, especially on narrow-Q formant filters where the filter state has high energy.
2. **Biquad filter state resets when coefficients change abruptly**, which causes filter ringing / impulse-like glitches.

**How to avoid:**
- For parameters driven from UI drag events, use `setTargetAtTime(value, ctx.currentTime, timeConstant)` with a `timeConstant` around 5–20 ms. This gives exponential smoothing in the audio thread at sample rate — far smoother than any JS-side smoothing.
- Do **not** use `setValueAtTime` for drag updates: it is a hard step.
- `linearRampToValueAtTime` is OK but requires scheduling ahead; `setTargetAtTime` is simpler for drag.
- If you write your own biquad in an AudioWorklet (which you likely will for formant synthesis — see Pitfall 4), smooth coefficients at a-rate inside `process()`, not at k-rate between blocks.
- Test dragging with a sustained vowel at low F1 and high Q. If you can hear clicks, smoothing is insufficient.

**Warning signs:**
- Crackle on every drag event.
- Smooth on slow drags, crunchy on fast drags (you're sample-and-hold, not smoothing).
- Audible discontinuity when releasing a drag (you hit a hard `setValueAtTime`).

**Phase to address:** Audio engine / formant filter phase (before shipping direct-manipulation UI). This is non-negotiable for the core value prop.

---

### Pitfall 3: Aliased glottal pulse making the voice buzz or sound digital

**What goes wrong:**
The synthesized voice sounds buzzy, harsh, or has a metallic "fax machine" quality — especially on high pitches. Users who know what a real voice sounds like immediately reject it. Worse, the F1/F2 visualization looks correct, so the mismatch between "looks right / sounds wrong" destroys user trust.

**Why it happens:**
Glottal-pulse models (Rosenberg, Liljencrants-Fant / LF) are defined in continuous time. If you naively sample them at the audio sample rate — computing the pulse shape at integer sample positions and wrapping at the period — you get aliasing whenever harmonics of f0 exceed Nyquist. At f0 = 500 Hz (soprano territory), the 50th harmonic is 25 kHz, and every harmonic above 22.05 kHz aliases back into the audible band as inharmonic ghosts.

A secondary failure: **DC offset**. LF and Rosenberg pulses do not necessarily have zero mean. Running a biquad chain on a DC-offset signal uses filter headroom on nothing, and can make clipping appear at lower amplitudes than expected. Clicking when source turns on/off (a hard transition from 0 → non-zero DC level) is audible.

**How to avoid:**
- **Use the derivative formulation** (glottal flow derivative, dGF/dt) not the flow itself. The derivative has zero mean by construction over one period (a closed loop integral of a derivative is 0), which removes DC. This is also what LF is natively expressed in.
- **Anti-alias by band-limiting.** Options in rough order of effort:
  - *Easy (acceptable for MVP):* Oversample the pulse generator 2–4x and run a decimating low-pass. Cheap, works well for f0 below ~400 Hz.
  - *Better:* Pre-compute a handful of spectral tables at different f0 and crossfade (polyBLEP / minBLEP / BLIT-style). Harder, sounds cleaner up to whistle register.
  - *Research-grade (overkill here):* Frequency-domain LF model (Gobl 2021) or the Kawahara anti-aliasing filter approach.
- Add a high-pass at 20–40 Hz downstream of everything to catch residual DC — cheap insurance.
- Test at f0 = 800 Hz. If it sounds OK there, it'll sound OK at 200 Hz. If it's broken, you'll hear it instantly.

**Warning signs:**
- Voice sounds OK at C3 but metallic at C5.
- You can hear a high-pitched whistle that doesn't move with f0 (alias mirror).
- Waveform in analyser has non-zero mean line.
- Click at note-on / note-off transitions.

**Phase to address:** Audio engine — the glottal source is the first DSP you write, and aliasing problems compound everything downstream. Do this right once, save yourself rewrites.

---

### Pitfall 4: Using `BiquadFilterNode` for formants (and regretting it)

**What goes wrong:**
You wire F1–F4 as four `BiquadFilterNode`s in cascade with `type='bandpass'`. It works. Then you start tuning and discover:
- Bandpass biquads from `BiquadFilterNode` parameterize by Q, not by bandwidth in Hz — but published formant data is in **bandwidth (Hz)**. You write a conversion. It's wrong at low frequencies.
- Low-Q formants (F1 for open vowels like /ɑ/ has BW ~90 Hz at F1=700 Hz → Q ≈ 7.8) are numerically OK, but narrow formants at low frequency (F1 for /i/, F1=300 Hz, BW=45 Hz → Q ≈ 6.7) can behave poorly across browsers.
- You cannot set raw filter coefficients on `BiquadFilterNode` — you are stuck with the formulas the browser gives you, and different browsers have had historical discrepancies.
- Cascade vs parallel: biquad bandpass in cascade doesn't give you the right vowel spectrum because you lose the "skirt" of each formant. Klatt-style cascade uses **resonator** topology, not isolated bandpasses.

**Why it happens:**
`BiquadFilterNode` looks like it solves the problem because it has a filter that says "bandpass." But formant synthesis is not just "a bandpass filter"; it's a specific resonator topology where the filter represents the resonant mode of a vocal-tract cavity. The literature and Madde/Klatt use **2-pole resonators** (no zeros) with gain-compensation so the overall vocal-tract transfer function has the right shape — a different beast.

**How to avoid:**
- Write a custom **Klatt-style cascade resonator** chain in an `AudioWorkletProcessor`. Each stage is a 2-pole all-pole filter (y[n] = x[n] - a1*y[n-1] - a2*y[n-2]) parameterized directly by center frequency F and -3dB bandwidth B via the standard mapping:
  - `r = exp(-π * B / sr)`
  - `a1 = -2 * r * cos(2π * F / sr)`
  - `a2 = r²`
- Smooth `a1`, `a2` across blocks (or per-sample) to avoid zipper noise (see Pitfall 2).
- Offer an optional parallel topology for users who want to solo a single formant (pedagogically useful: "listen to just F2"), but the default should be cascade.
- Document the BW→Q conversion if you ever expose Q (don't — expose bandwidth in Hz, which is what the literature speaks).
- Keep `BiquadFilterNode` as a fallback / comparison mode only.

**Warning signs:**
- You find yourself writing "BiquadFilterNode Q = F/BW" and the result sounds wrong.
- Different browsers produce audibly different vowels from the same parameters.
- You can't find a Q for F1=300 Hz, BW=45 Hz that sounds right.
- `AnalyserNode` FFT of the output shows formant peaks at the wrong locations or with wildly wrong amplitudes.

**Phase to address:** Phase that introduces the formant filter chain — make the Klatt-style AudioWorklet the baseline from day one. The rewrite cost later is painful.

---

### Pitfall 5: Hard-coded male formant table passed off as "the vowel"

**What goes wrong:**
You grab one of the classic formant tables (Peterson-Barney 1952 "average male" column) and use it as the default for the /i/, /a/, /u/ presets. A voice teacher opens the app and immediately says "those aren't my student's vowels." A soprano opens the app, hits /i/ preset, hears a dark male /i/, and closes the tab.

**Why it happens:**
There is no such thing as "the formants of /a/." There are men's, women's, children's, regional, and individual ranges. Peterson-Barney and Hillenbrand differ by meaningful amounts — Hillenbrand /ɑ/ F2 for females ≈ 1333 Hz vs P-B ≈ 1220 Hz. For sopranos on high notes, **F1 must be actively retuned upward** to track 2f0 or f0 — that's the whole subject of the "vocal strategies" feature. A static table is already wrong before the user touches anything.

**How to avoid:**
- Ship at least **three voice-type baselines** as selectable presets: adult male, adult female, child. Label them honestly ("Hillenbrand adult male, neutral pitch").
- Cite the **source** next to every preset (dataset name, reference, pitch assumption). Teachers will look. Researchers will definitely look.
- Store formants as **ranges** (min/max/typical) per voice type per vowel, not as single values — feeds the "ranges formants can occupy" visualization directly.
- Make the voice-type selector prominent. A sparkling /i/ that sounds wrong because it's using a male preset on a female voice is a first-30-seconds failure.
- Distinguish "vowel target at rest / comfortable pitch" from "vowel under a vocal strategy at f0 = X." When the R1:f0 strategy is active above the passaggio, the F1 displayed is *not* the table value — the UI must make this legible.
- Units: stay in **Hz** everywhere for frequencies and bandwidths. Do not introduce Bark / mel / ERB scales silently — if you use them for axis display (which is pedagogically great, especially for the F1/F2 chart), label the axis clearly.

**Warning signs:**
- User feedback: "my students don't sound like this."
- F1 for /i/ ≥ 400 Hz in your male preset (P-B/H give ~270–340).
- The same preset is loaded regardless of voice type.
- No source cited anywhere in the UI.
- Axis labels say "Bark" without a tooltip explaining what that is.

**Phase to address:** Phase where presets and the F1/F2 chart land. Source citation and voice-type selection should be in the **first** pedagogical-UX phase, not retrofitted later.

---

### Pitfall 6: Vocal strategies that produce unsingable nonsense in auto-tune mode

**What goes wrong:**
User enables R1:f0 (soprano strategy) and sweeps f0 from C3 to C6. At C3 (f0 ≈ 131 Hz), the strategy says "F1 = 131 Hz" — physically impossible; the vocal tract cannot resonate that low. The app dutifully sets F1 to 131 Hz, the filter output is pathological, it clips or silences or makes a sub-bass rumble. The learner concludes R1:f0 is "broken." In reality, the strategy is only meaningful *above the passaggio*, when f0 is near F1's natural value.

**Why it happens:**
R1:f0, R1:2f0, R2:2f0, etc. are strategies real singers use **in specific pitch regions** where the mapping makes physiological sense. Blindly applying them across all pitches ignores the physics and the pedagogy both. The temptation is to make auto-tune a pure mathematical function `F1 = f0` — elegant, wrong, anti-pedagogical.

**How to avoid:**
- Each strategy declares an **applicable range** (e.g., R1:f0 is the soprano upper-range strategy, ~E5 and above for most sopranos). Outside the range, either:
  - **Blend smoothly toward the neutral vowel target** as f0 crosses out of the strategy range (best for auto-tune mode), or
  - **Visually signal "out of range"** and leave the formants at the baseline while showing an overlay saying "this strategy applies above E5" (best for overlay mode).
- Clamp F1 to a physiologically plausible floor (~200 Hz) and similarly for F2, F3, F4. This is a safety net, not the primary fix.
- Show both the **baseline vowel** and the **strategy-tuned** position on the F1/F2 chart simultaneously — the pedagogical point of vocal strategies is the *difference*, which only exists when both are visible.
- In overlay mode, *never* silently change the sound; only draw the target. Overlay mode is for teaching "here's where you would tune if you followed this strategy" — auto-applying would defeat the point.
- Clearly distinguish the two modes in UI with different iconography and copy — "locked" vs "ghost."

**Warning signs:**
- A singer loads R1:f0 and the app sounds unplayable at normal speaking pitch.
- F1 < 200 Hz or > 1200 Hz in any generated preset.
- No visible "this strategy doesn't apply here" state.
- Overlay mode and auto-tune mode look identical.

**Phase to address:** Vocal-strategies phase. Write the applicable-range metadata first, then the tuner. Test with a sweep across the full f0 range as an acceptance criterion.

---

### Pitfall 7: Audio/visual drift — visuals and sound don't actually match

**What goes wrong:**
The user drags the F1 marker. The visual moves at 60 Hz. The audio parameter is scheduled for "now" but due to `setTargetAtTime` smoothing, the audio reaches the target 20 ms later. Or: the audio parameter was set synchronously to a value the visuals haven't yet picked up (the visuals lag the audio). Either way, what the user *sees* and what they *hear* stop being the same parameter. For a tool whose core value is the linkage, this is fatal — the linked exploration becomes uncoupled exploration.

**Why it happens:**
Web Audio has a dedicated, drift-free audio clock (`ctx.currentTime`) and its own thread. Visuals run via `requestAnimationFrame`, pegged to display refresh (~16.67 ms at 60 Hz). rAF is not tied to the audio clock. Moreover, parameter smoothing (necessary for Pitfall 2) introduces intentional lag between "value set" and "value audibly reached." If the UI reads back `.value` synchronously, it gets the *target*, not the *current* smoothed value.

Additionally, on heavy frames (e.g., F1/F2 chart redrawing + piano redrawing + harmonic-ladder redrawing), rAF can drop to 30 Hz while audio keeps running — drift widens.

**How to avoid:**
- **Single source of truth:** The UI state (Svelte `$state`) is the authoritative parameter value. Audio and visuals both consume from it. Audio applies `setTargetAtTime`, visuals render the same target. Accept the ~10 ms smoothing delay — it's below perceptual threshold for tracked parameter changes.
- **Unified smoothing time constant** across domains: if you smooth audio by 10 ms, smooth the visual indicator by the same 10 ms (or not at all, but pick one). Mismatched smoothing is the drift.
- Never read back from `AudioParam.value` for display — always display what the UI state says it is.
- Budget your redraw. Profile with Chrome DevTools Performance tab holding a drag. If a drag-frame exceeds 8 ms JS, you will drop frames on older laptops.
- Prefer `Canvas2D` or `WebGL` for the high-frequency parts (F1/F2 chart, harmonic ladder) — DOM updates at 60 Hz with many nodes will stutter.
- Do not recompute formant filter coefficients on the main thread and postMessage them every frame. The AudioWorklet receives parameter targets, it smooths internally. `postMessage` at 60 Hz is fine for small payloads; at sample rate it is catastrophic (see Pitfall 8).

**Warning signs:**
- Dragging is smooth visually but the sound "chases" the cursor.
- The fundamental on the piano keyboard appears to change before the pitch does (or vice versa).
- Frame profiler shows >16 ms frames during drag.
- Sound behavior depends on framerate.

**Phase to address:** Linked-updates phase — this is the Core Value. Write a performance acceptance test: "drag F2 across full range in 500 ms, no frame drops, audio matches visual within 15 ms."

---

### Pitfall 8: AudioWorklet `postMessage` used as a per-sample transport

**What goes wrong:**
You need to send formant targets, vibrato parameters, and jitter state into the worklet. You use `port.postMessage({ f1, f2, f3, f4, vibRate, vibDepth, jitter })` on every UI event. Works fine in development. Under a sustained drag with 8+ parameters, the main thread stalls, GC kicks in, the audio thread starts buffer-underrunning, the browser emits glitches. Or you do the opposite: try to push analysis results out of the worklet via `postMessage` at sample rate and the main thread melts.

**Why it happens:**
`postMessage` between main thread and `AudioWorkletGlobalScope` goes through a structured-clone queue. It allocates. The audio thread is a real-time thread that must never allocate, never block, and never GC-pause. Mixing these two realities is how you get clicks, pops, and dropouts.

**How to avoid:**
- `postMessage` is fine for **event-rate** data: preset load, topology switch, strategy-mode toggle. Not sample-rate, not even frame-rate-for-many-params.
- For continuous parameter streams, prefer **`AudioWorkletNode` `parameterData` + `AudioParam`s** with `automationRate: 'a-rate'`. These are designed for exactly this — smoothed, lock-free, allocated once.
- For larger shared state (e.g., scope of harmonic amplitudes read back by the UI), use `SharedArrayBuffer` + `Atomics` as a lock-free ring buffer. Requires `COOP/COEP` headers on your static host (cross-origin isolation). Plan for this early — adding COOP/COEP later breaks third-party script inclusion.
- Inside `process()`, never `new` anything, never create closures, never use `.map`/`.filter`/`.forEach` (they allocate). Pre-allocate buffers in the constructor. Loop with `for` and indexed writes.
- Benchmark with Chrome's Web Audio inspector: the worklet should use <20% of the audio-quantum budget. If it's bursting, allocation is almost always the cause.

**Warning signs:**
- Audio glitches during UI interaction but not during idle.
- Main thread memory sawtooth in DevTools (GC pressure).
- Chrome DevTools "long tasks" warning firing during drags.
- Worklet "processor underrun" messages in console.

**Phase to address:** Audio engine plumbing phase. Decide the message-passing architecture *before* writing the first non-trivial worklet.

---

### Pitfall 9: Safari / iOS compatibility discovered at the end

**What goes wrong:**
You build the whole thing on Chromium. Two weeks before launch you open it in Safari and: `AudioWorkletNode` has different timing, `SharedArrayBuffer` isn't enabled because you lack COOP/COEP, a preset that worked in Chrome outputs silence in Safari, the iOS version won't start audio at all, the performance on older iPads is unusable, Pointer Events fire differently.

**Why it happens:**
Safari's Web Audio implementation lags Chromium by 1–2 years. AudioWorklet support only landed in Safari 14.1 (desktop) and iOS 14.5. Edge cases remain. Safari has historically had different behavior for parameter scheduling, suspended-state handling, and the autoplay policy. `setSinkId()` is not supported. WebKit's JavaScript engine has different JIT characteristics; hot paths that are cheap in V8 can be expensive in JavaScriptCore.

**How to avoid:**
- Test on Safari macOS **and** iOS Safari **every phase**, not at the end. Get this into your local dev loop from Phase 1.
- Use a browser-compatibility shim library (`standardized-audio-context`) if you hit persistent differences — it normalizes API quirks. Weigh the dependency cost.
- Set COOP/COEP headers from day one if you will ever need `SharedArrayBuffer`. Retrofitting is painful.
- Profile AudioWorklet CPU on iOS specifically — it's roughly 2–3x more expensive than desktop Chrome for the same code. Design for the ceiling.
- On iOS, handle interruptions (phone call, alarm, Siri, route change when plugging headphones) — the `AudioContext` state transitions to `interrupted` (new in 2025 spec) / `suspended` and your app must resume cleanly.
- Document the Safari-on-silent-switch gotcha prominently.

**Warning signs:**
- "Works in Chrome, doesn't in Safari" bug reports late in development.
- CPU pegged at 100% on iPad.
- Silent audio on iOS with no error.
- Preset loads crash or hang on Safari only.

**Phase to address:** Every phase. Create a "smoke test on Safari + iOS Safari" acceptance step in every phase's definition of done.

---

### Pitfall 10: Pedagogical UI that overwhelms on first run

**What goes wrong:**
The user lands on a page with an F1/F2 chart, a piano, a harmonic ladder, a formant-range overlay, a vocal-strategy selector, four formant sliders, a glottal-source section with LF/Rosenberg tabs, vibrato controls, jitter, voice-type selector, a preset browser, and an "about" panel. They have no idea what to do. They twist knobs at random, get a weird sound, conclude "I don't get it," close the tab. The tool fails at its first mission: *teach*.

**Why it happens:**
The developer (you) has the whole mental model loaded. Every control is meaningful *to you*. To a first-time user — even a voice teacher — the UI is a cockpit. Pedagogical tools especially suffer from this because their audience includes true beginners who need scaffolding, alongside experts who want the cockpit.

**How to avoid:**
- **Progressive disclosure.** First screen: one vowel, one voice type, one draggable marker on the F1/F2 chart, and audible output. Everything else lives behind a "More" or "Advanced" toggle. Default state is the *demonstrable core value*: drag the marker, hear the vowel change, see the piano update. That is the app, in 15 seconds, zero jargon.
- **Presets are not a dump of raw numbers.** They're labeled with what they *teach*: "A soprano tuning R1 to f0 on a high note," "A male /ɑ/ at comfortable pitch," "Vibrato vs no vibrato on the same vowel." Each preset is a mini-lesson.
- **Inline explanations** on hover / focus for every term. Not a separate docs page. "What's F1?" tooltip with 10 words and a link to a longer explanation panel.
- **One guided tour** on first load — skippable, dismissible forever, and actually interactive (click here, hear that, move this).
- **No hidden modes.** Auto-tune vs overlay must be visibly distinct at all times, never a buried toggle. Same for voice type.
- **No silent failure states.** If a parameter is out of range, the UI says so visibly. If a strategy doesn't apply at the current pitch, the UI shows the "not applicable" state (see Pitfall 6).
- Test with a non-developer voice teacher at *every* phase. Watch where they hesitate. Fix the hesitation before adding features.

**Warning signs:**
- A non-developer needs more than 30 seconds to produce a sound.
- First impressions from users describe the UI as "a synth" rather than "a learning tool."
- User feedback includes "what does F1 mean?" — a signal you haven't explained it inline.
- Multiple modes exist but are visually indistinguishable.
- The most common first interaction fails in some mode configuration.

**Phase to address:** Every UI phase, but especially the first "shippable demo" phase. Build the guided-tour + progressive-disclosure skeleton **before** adding advanced features — retrofitting progressive disclosure into a cockpit UI is harder than doing it right first.

---

### Pitfall 11: Accessibility retrofitted (or ignored)

**What goes wrong:**
The app is visual-first and gesture-first — two things that are hostile to assistive tech by default. A student with low vision, a teacher using a screen reader, or a keyboard-only user cannot explore the vowel space. In a pedagogical tool for a sound-based skill (singing), this is especially egregious — blind and low-vision singers exist.

**Why it happens:**
"Accessibility for interactive visualizations" is a research area, not a checkbox, and most audio-viz tutorials skip it entirely. Draggable SVG/canvas elements have no built-in ARIA story. Svelte doesn't solve this for you.

**How to avoid:**
- Every draggable marker is **also** operable by keyboard: arrow keys to nudge, Shift+arrow for larger steps, Enter/space to "grab." Use ARIA `role="slider"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-valuetext` (the last gives the screen reader "F1 at 700 hertz" rather than raw numbers).
- Every preset and strategy is selectable via keyboard and labeled.
- The audio itself is the primary output channel — lean into that. The app is already *more* accessible than a pure visualization because it *sounds* the data. Capitalize: offer a "sonification tour" mode that sweeps through the F1/F2 space audibly.
- Provide a text readout of the current parameter state, live-updating in an `aria-live="polite"` region — "F1 700 Hz, F2 1220 Hz, f0 220 Hz, vowel /a/."
- Respect `prefers-reduced-motion`: disable vibrato-sweep animations and any decorative motion.
- Color contrast on the F1/F2 chart — avoid encoding critical info (e.g., "this is the target") by color alone.
- Do not capture *every* keypress as a global shortcut; leave Tab, Esc, arrow navigation alone for standard focus behavior.

**Warning signs:**
- No keyboard alternative to any drag interaction.
- Screen reader announces "image" or "canvas" for the F1/F2 chart.
- No live region for parameter state.
- Color is load-bearing ("red means out of range").
- The tool is unusable with a screen reader and keyboard only.

**Phase to address:** Every UI phase. Add "keyboard operable" and "screen reader announces state" to the definition of done for every interactive visualization. Do this from Phase 1 — retrofitting ARIA + keyboard into a gesture-first UI is 3–5x the original cost.

---

### Pitfall 12: Voice that "looks right" on the F1/F2 chart but sounds wrong

**What goes wrong:**
The F1/F2 point sits exactly on the published /i/ coordinate. The audio sounds like /ɪ/ or /e/. A voice teacher listens and says "that's not /i/" — and they're correct. The visualization lied, or the audio did, and your pedagogical tool just taught something false.

**Why it happens:**
Vowel identity is not determined by F1 and F2 alone. F3 matters (especially for /i/, rhoticity, and the singer's formant cluster at F3–F5 ~2.4–3.2 kHz). Bandwidth matters — a formant at the right center frequency with too-wide bandwidth sounds like mush. Spectral tilt matters — the glottal source spectrum shapes the perceived "brightness" and indirectly the vowel identity. So does the overall level relationship between F1, F2, F3 (Klatt's "AV", "AH" etc. parameters). Lastly, the vowel diagram is typically in **Bark or mel**, not linear Hz — a point that's "centered on /i/" on a linear plot may be way off on a Bark plot.

**How to avoid:**
- Always synthesize F1–F4 (at minimum F1–F3) — not just F1 and F2. F3 is non-optional for recognizable /i/, /u/, and anything rhotic.
- Use **literature bandwidths** (Klatt's defaults are a reasonable starting point: ~50–130 Hz depending on formant and vowel) — do not leave bandwidth at an arbitrary 100 Hz default.
- Run an acceptance test: generate /i/, /ɛ/, /a/, /ɔ/, /u/ with your default voice type and literature values; record them; verify with at least one trained listener that they're identifiable. Do this *before* building direct-manipulation UI on top.
- Match the F1/F2 chart's axis to the perceptual literature (Bark or mel), not raw Hz. Label clearly.
- When a user drags to a point that's "valid on the chart" but physiologically implausible (e.g., F1 > F2), warn or clamp.
- Include F3 as an editable parameter once users move past the basic view — not buried in a preset.

**Warning signs:**
- /i/ sounds like /ɪ/ or /ɨ/.
- /u/ and /o/ are indistinguishable.
- Only F1 and F2 are synthesized.
- BW is a single global value across all formants and vowels.
- Axis is linear Hz but compared against a literature chart that was in Bark.

**Phase to address:** Audio engine / first vowel-preset phase. The "sounds like a real vowel" acceptance test is a **hard** gate for anything else downstream.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using `BiquadFilterNode` cascade instead of a Klatt resonator AudioWorklet | No worklet plumbing, ship today | Wrong formant shape, browser-dependent sound, Q-vs-BW headaches, eventual rewrite | Only for a throwaway prototype used to validate the UI before any audio work is load-bearing |
| `setValueAtTime` for UI-driven parameters (no smoothing) | Simpler code, direct "set" semantics | Zipper noise, broken direct-manipulation UX, perceived as "feels laggy and glitchy" | Never in the interactive path |
| Single male formant table as universal default | Preset data ready in 10 minutes | Teachers/researchers reject the tool on first use; retrofitting voice types forces UI rework | Never — ship with at least male/female/child presets |
| Reading `AudioParam.value` to drive visuals | Automatic "audio-first" feel | Visuals drift relative to UI state, inconsistent after smoothing, breaks linked-updates invariant | Never |
| Skipping Safari testing until "the end" | Faster Chrome dev loop | Weeks of fixes for subtle Safari issues at the most schedule-critical moment | Never if you claim "runs in the browser" |
| No anti-aliasing on the glottal source ("it's just harmonics, low-pass it") | Cheaper pulse generator | Buzzy voice at high pitches, invalid demos of soprano strategies | Only for f0 < 250 Hz demos |
| `postMessage` for per-frame parameter pushes | No ring-buffer / no COOP-COEP setup | Glitches under load, poor iPad performance, main-thread GC pressure | Event-rate (config) traffic only — never sample or frame rate for many params |
| "We'll add accessibility in v2" | Faster UI MVP | 3–5x retrofit cost, bad reputation in the pedagogy market, excludes real users | Never — accessibility is cheapest when designed in |
| Auto-applying vocal strategies globally (no applicable-range logic) | Simpler mode | Unsingable nonsense outside the intended pitch region, learners conclude strategies are broken | Never — strategies must know their applicable ranges |
| Canvas/SVG drawn on the main thread mixing with heavy state computations | One codepath | Frame drops on drag, visual-audio drift, jank on older machines | OK only if the total per-frame work is profiled well under 8 ms |
| Coefficient updates at k-rate (block boundary) instead of a-rate (per-sample) in worklet | Simpler worklet loop | Audible zipper at fast drags, especially on narrow formants | OK for non-interactive / preset-load transitions only |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `AudioContext` creation | Constructing at module load | Lazy-create on first user gesture; `resume()` check on every interaction |
| `AudioWorklet` module loading | `addModule()` called multiple times, or not awaited | Await `addModule()` exactly once per context before constructing the node; the promise is idempotent but the error on misuse is cryptic |
| Static hosting (for `SharedArrayBuffer`) | Default hosting serves without COOP/COEP | Configure `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` from day one on the deploy target (Netlify/Vercel/Cloudflare Pages all support this) |
| Published formant datasets | Downloading one CSV, not checking whose vowels and pitch | Keep the dataset name, speaker demographics, and recording pitch as metadata in the preset; cite in UI |
| Pointer Events (for drag) | Using `mousedown`/`mousemove` — breaks touch, breaks pen, breaks Safari gesture handling | Use Pointer Events (`pointerdown`/`pointermove`/`pointerup` + `setPointerCapture`) uniformly |
| URL-encoded preset sharing | Naïvely JSON-stringify → Base64 → URL, explodes URL length | Versioned compact encoding; include a schema version byte so old URLs don't break after refactor |
| Browser tab backgrounding | Assuming rAF keeps firing | rAF throttles/pauses when tab is hidden; audio keeps running, visuals stop — resume cleanly when tab returns |
| `AnalyserNode` for harmonic-on-piano display | Using time-domain and computing FFT in JS | Use `getFloatFrequencyData` — it's already FFT-computed by the browser |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full chart redraw per pointer event | 30 fps on drag | Redraw on `requestAnimationFrame` *once* per frame regardless of event count; dirty-flag the UI state | As soon as the user drags fast |
| Recreating AudioWorklet nodes on preset change | CPU spike, audible glitch on every preset click | Reuse nodes; update parameters on existing nodes; tear down only when AudioContext closes | Immediately noticeable when browsing presets |
| DOM-based visualizations with hundreds of nodes | Stutter on updates | Use Canvas2D or WebGL for dense visualizations (F1/F2 chart, harmonic ladder). Use DOM for few-element UI | As soon as harmonic count > ~30 |
| Allocating in `process()` inside AudioWorklet | Audible clicks, GC pauses | Pre-allocate in constructor; avoid array methods; use typed arrays | Within seconds of runtime; gets worse with session length |
| Re-subscribing to Svelte stores / re-running `$effect`s cascade-wide on every param change | Main thread pegged during drag | Fine-grained `$state` per parameter, `$derived` for computed views, localized `$effect` scopes | At ~30+ reactive dependencies or dense update rates |
| Computing Bark-scale conversions per draw call | Hot loop in hot path | Lookup table or inlined polynomial; only needed for display mapping | Immediately at 60 Hz redraw |
| Re-rendering all formant-range ellipses every frame | Redundant paint | Draw static ranges to an offscreen canvas once, composite each frame | When all four formants show ranges |
| Multiple AudioContexts | Ghost contexts consuming CPU after "stop"; scheduling confusion | Exactly one AudioContext for the app lifetime; suspend/resume, don't close/recreate | Immediately on Chrome; Safari worse |
| GC pressure from boxed numbers in hot JS code | Frame-time sawtooth; micro-jank | Use `Float32Array` for coefficient buffers; avoid allocating objects in loops | Older iPads, long sessions |
| Listening to pointer events on `window` without `{ passive: true }` or `setPointerCapture` | Scroll jank, touch-drag weirdness on Safari | Use `setPointerCapture` on the draggable element; avoid preventing scroll unless needed | Safari / iPad touch |

---

## Security Mistakes

For a client-side static synth, the security surface is narrow. What matters:

| Mistake | Risk | Prevention |
|---------|------|------------|
| Parsing shared preset URLs without validation | XSS via a crafted URL ("preset name" field rendered as HTML) | Treat URL-decoded strings as untrusted; always render via text-interpolation, never `innerHTML` / `@html` |
| `SharedArrayBuffer` without cross-origin isolation | Spectre mitigations block SAB → feature silently unavailable | Set COOP/COEP; feature-detect and fall back gracefully (not a security issue per se, but a deploy gotcha with security-origin roots) |
| Embedding third-party analytics that break COOP/COEP | Lose `SharedArrayBuffer` availability; features break | Self-host or skip; any third-party script must be COEP-compatible (`crossorigin` CORP headers) |
| Maximum output level not clamped | Hearing safety risk — a bug that sends the glottal pulse unfiltered at high gain is painful on headphones | Hard output limiter (e.g. `DynamicsCompressorNode` or simple tanh) on the final output bus; never bypassed |
| Surprising autoplay on preset links | User opens shared URL in a classroom and instantly blasts audio | Always require one tap/click before audio starts, even on preset URLs; show a visible "Play" button |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No "what am I hearing?" label | User hears a vowel, can't name it, doesn't learn | Always show the current vowel name + IPA near the output; update as formants drag |
| Hidden vocal-strategy auto-tune mode | User thinks the sound is "broken" when f0 changes unexpectedly shift formants | Prominent mode indicator; always visible toggle; separate visual language for overlay vs auto-tune |
| No undo after a drag | Exploration fear — user doesn't want to ruin their preset | Undo/redo at least for parameter changes; preset "reset" button always visible |
| Invisible drag affordances | User doesn't realize the F1/F2 chart is draggable | Cursor change on hover, drag handles or subtle pulse on first-run; explicit "drag me" hint the first time |
| Jargon without explanation | Non-specialist learners bounce | Tooltip on every term; a persistent "What is [this]?" side panel |
| F1/F2 chart axes unlabeled or Bark-vs-Hz confusion | User thinks literature values "don't match" | Always label axes with scale name; provide Hz/Bark toggle with tooltip |
| No source citation on presets | Researcher loses trust immediately | Cite dataset and speaker group per preset |
| Harmonic ladder that counts harmonics by color only | Colorblind users can't map colors to harmonic number | Number the harmonics; use shape + position in addition to color |
| Vibrato defaulted on "realistic" levels at first load | First impression is wobble, not a clean vowel | Default vibrato off; present as a separate teaching step |
| No way to compare "before / after" a parameter change | User can't learn — they only hear the after | "A/B" toggle that flips between two parameter snapshots |
| F0 controlled only by a number input | User can't *play* pitches naturally | On-screen piano + MIDI keyboard + keyboard shortcuts; scrubbing the fundamental audibly |
| Audio starts / stops abruptly | Click artifacts | Short fade in/out (5–20 ms envelope) on start/stop and on preset swap |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Glottal source:** Often missing anti-aliasing — verify by running at f0 = 800 Hz and checking spectrum for alias ghosts.
- [ ] **Glottal source:** Often missing DC-offset fix — verify the waveform mean is ~0 over a period.
- [ ] **Formant filter:** Often missing per-sample (a-rate) coefficient smoothing — verify by rapid F1 drag on a sustained vowel, no zipper.
- [ ] **Formant filter:** Often missing F3+ — verify /i/ sounds like /i/ and not /ɪ/.
- [ ] **Formant filter:** Often missing literature bandwidths — verify vowel clarity against a trained listener.
- [ ] **F1/F2 chart:** Often missing axis scale label — verify users understand Hz vs Bark.
- [ ] **F1/F2 chart:** Often missing keyboard operability — verify full interaction without a mouse.
- [ ] **Vocal strategies:** Often missing applicable-range metadata — verify R1:f0 degrades gracefully at low f0.
- [ ] **Vocal strategies:** Often missing visual distinction between auto-tune and overlay — verify a new user can tell which mode they're in.
- [ ] **Preset system:** Often missing source citations — verify every preset has a "from [dataset]" tooltip.
- [ ] **Preset system:** Often missing voice-type selection — verify the same preset sounds appropriate on male/female/child.
- [ ] **Linked updates:** Often missing unified smoothing time constant between audio and visuals — verify drag with the ear against the eye.
- [ ] **Audio start:** Often missing the silent-Safari edge case — verify on iOS with silent switch on.
- [ ] **Audio start:** Often missing resume-on-tab-return — verify by backgrounding the tab for 60 s and returning.
- [ ] **UI first run:** Often missing guided tour — verify a first-time user produces sound within 15 seconds without reading docs.
- [ ] **UI first run:** Often missing progressive disclosure — verify the default view shows at most 5–7 primary controls.
- [ ] **Accessibility:** Often missing `aria-live` readout of parameter state — verify a screen-reader user can know what the current vowel is.
- [ ] **Accessibility:** Often missing keyboard alternatives to every drag — verify arrow-key control of every marker.
- [ ] **Output:** Often missing hard limiter on the final bus — verify no preset or extreme parameter can send painful levels to headphones.
- [ ] **Preset sharing:** Often missing schema versioning on the URL format — verify old URLs can still load after a future schema change (or at least degrade gracefully).
- [ ] **Safari / iOS:** Often missing cross-browser smoke test — verify every acceptance-gate demo on Safari macOS and iOS Safari, not just Chrome.
- [ ] **Memory:** Often missing a "leave the app running for an hour" test — verify memory and CPU stay stable over long sessions.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| AudioContext never started | LOW | Add a visible "Start audio" button; add resume-on-interaction guard; ship hotfix |
| Zipper noise on drag | LOW-MEDIUM | Replace direct `.value` writes with `setTargetAtTime(...,10e-3)`; if in custom worklet, add a-rate coefficient smoothing |
| Aliased glottal pulse | MEDIUM | Swap in an oversample-and-decimate wrapper around the pulse generator (can be staged); longer-term move to BLIT/BLEP |
| Wrong formant topology (BiquadFilterNode cascade) | HIGH | Write the Klatt-style worklet; swap behind an `AudioWorkletNode` interface; keep old path behind a feature flag for a release; accept one phase of migration |
| Wrong/misleading vowels (F1/F2 only, no F3) | MEDIUM | Add F3 to the engine and presets; update voice-type tables; audit preset library |
| Vocal strategies producing nonsense | LOW-MEDIUM | Add applicable-range metadata; add blend/clamp logic; update preset descriptions |
| Visual/audio drift | MEDIUM | Refactor parameter flow to single-source-of-truth state; unify smoothing constants; profile drag performance |
| `postMessage` hot-path glitches | MEDIUM | Convert sample/frame-rate params to `AudioParam`s; move large data to `SharedArrayBuffer` ring (requires COOP/COEP — may be a deploy change) |
| Safari-only bugs discovered late | MEDIUM-HIGH | Per-bug triage; prioritize the subset that block core value; potentially ship a "best on Chrome/Firefox" notice and defer Safari-only polish |
| UI overwhelming new users | MEDIUM | Build a dedicated "simple mode" landing view that hides everything except the core loop; progressive disclosure retrofit |
| Accessibility gaps | HIGH if retrofitted | Add ARIA + keyboard ops incrementally, component by component, highest-impact interactive elements first (F1/F2 chart, preset picker, play button) |
| Memory leaks over long sessions | MEDIUM | Audit node lifecycle (reuse, don't recreate); use DevTools heap snapshots to find retaining paths; suspend-don't-close the AudioContext |
| Wrong preset data (male default on soprano app) | LOW | Ship an updated preset pack; add voice-type selector prominently; credit datasets in UI |
| Clipping / painful output | LOW | Insert a `DynamicsCompressorNode` or hard `tanh` limiter at the bus output; hotfix |

---

## Pitfall-to-Phase Mapping

Assuming a roadmap structure along the lines of:
- **P1: Audio engine foundations** (AudioContext, worklet plumbing, output bus, one-button "make a sound")
- **P2: Glottal source + simple formant filter chain** (Klatt resonators, F1–F4, one voice)
- **P3: Vowel presets + F1/F2 direct-manipulation chart** (voice types, data tables, drag UX)
- **P4: Linked visualizations** (piano + harmonics, formant-range overlay, synchronized updates)
- **P5: Vocal strategies** (R1:f0 family, overlay vs auto-tune modes, applicable ranges)
- **P6: Vibrato + jitter** (modulation)
- **P7: Pedagogical UX layer** (guided tour, inline explanations, accessibility hardening)
- **P8: Sharing + polish** (URL presets, cross-browser QA, performance tuning)

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| #1 AudioContext never starts | P1 | Manual test: first click produces sound on Chrome, Firefox, Safari macOS, iOS Safari; tab-return test |
| #2 Zipper noise on drag | P2 (engine) + P3 (UI hookup) | Sustained vowel, rapid F1 drag, no audible clicks; automated spectrum regression on a scripted drag sequence |
| #3 Aliased glottal pulse | P2 | Spectrum check at f0 = 800 Hz shows no inharmonic content; waveform DC ~0 |
| #4 Wrong filter topology | P2 | A/B listening test vs a reference Klatt implementation; literature vowel test (/i/, /ɛ/, /a/, /ɔ/, /u/) identifiable by trained listener |
| #5 Hard-coded male table | P3 | Voice-type selector visible; each voice type ships its own preset set; all presets cite source |
| #6 Vocal strategies nonsense | P5 | F0 sweep from C3 to C6 under each strategy produces plausible sound at all pitches; out-of-range state visible |
| #7 Audio-visual drift | P4 (core linked-updates phase) | Drag F2 fast; audio matches visual within 15 ms; 60 fps sustained; single-source-of-truth param invariant documented |
| #8 `postMessage` hot path | P1 architecture decision + P2 implementation | Architecture doc committed; worklet uses `AudioParam`s for continuous streams; no per-frame postMessage in profile |
| #9 Safari / iOS lag | Every phase | Each phase's definition of done includes a Safari macOS + iOS smoke test |
| #10 Overwhelming UI | P7 (but scaffold from P1) | First-run user test: produces sound in <15 s, names one thing they learned in <60 s |
| #11 Accessibility retrofit | Every UI phase (P3, P4, P5, P7) | Keyboard-only walkthrough completes the core loop; screen reader announces parameter state |
| #12 Vowels sound wrong | P2 (engine) gate, re-verified P3, P5 | Blind-listening acceptance test with ≥1 trained voice listener identifying synthesized vowels |

**Research flags for phases (where deeper ad-hoc research is likely needed):**
- **P2 (engine):** Decide anti-aliasing strategy (BLIT/BLEP vs oversample-decimate) — needs a spike.
- **P2 (engine):** Decide coefficient-smoothing approach (per-sample vs interpolated per-block) — needs a spike.
- **P5 (strategies):** Collect applicable-range literature per strategy per voice type — needs focused literature pass.
- **P8 (sharing):** COOP/COEP deploy config — needs verification on actual target host.

**Phases unlikely to need fresh research (standard patterns):**
- P1 plumbing, P6 vibrato (LFO + random walk are standard), P8 URL-encoding.

---

## Sources

**Web Audio / AudioWorklet:**
- [MDN — Autoplay guide for media and Web Audio APIs](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)
- [MDN — Web Audio API best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- [MDN — BiquadFilterNode](https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode)
- [MDN — AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)
- [MDN — AudioWorkletNode.port](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode/port)
- [MDN — Visualizations with Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API)
- [Paul Adenot — Web Audio API performance and debugging notes](https://padenot.github.io/web-audio-perf/)
- [Loke.dev — Stop Allocating Inside the AudioWorkletProcessor: Lock-Free Ring Buffer for Zero-Jitter Web Audio](https://loke.dev/blog/stop-allocating-inside-audioworkletprocessor)
- [Chrome for Developers — Audio Worklet is now available by default](https://developer.chrome.com/blog/audio-worklet)
- [Matt Montag — Unlock JavaScript Web Audio in Safari and Chrome](https://www.mattmontag.com/web/unlock-web-audio-in-safari-for-ios-and-macos)
- [Soledad Penadés — Using AudioWorklets to generate audio](https://soledadpenades.com/posts/2025/using-audioworklets-to-generate-audio/)
- [Soledad Penadés — Lessons learned updating code that uses Web Audio](https://soledadpenades.com/posts/2024/lessons-learned-updating-code-that-uses-web-audio/)
- [GitHub — WebAudio/web-audio-api issue #2632: AudioWorklet is a real world disaster](https://github.com/WebAudio/web-audio-api/issues/2632)
- [GitHub — WebAudio/web-audio-api issue #373: How to avoid generating garbage in hot paths?](https://github.com/WebAudio/web-audio-api/issues/373)
- [GitHub — WebAudio/web-audio-api issue #904: AudioNode stop/disconnect doesn't free memory](https://github.com/WebAudio/web-audio-api/issues/904)
- [GitHub — chrisguttandin/standardized-audio-context issue #410: Memory leak with AudioContext](https://github.com/chrisguttandin/standardized-audio-context/issues/410)
- [W3C — TPAC 2025: Audio WG update](https://www.w3.org/2025/11/TPAC/demo-audio-wg-update.html)

**DSP / Formant synthesis:**
- [Dennis H. Klatt — Software for a cascade/parallel formant synthesizer (JASA 1980)](https://www.fon.hum.uva.nl/david/ma_ssp/doc/Klatt-1980-JAS000971.pdf)
- [Formant synthesis: Turning cascade into parallel with applications to the Klatt synthesizer](https://www.researchgate.net/publication/243519223_Formant_synthesis_Turning_cascade_into_parallel_with_applications_to_the_Klatt_synthesizer)
- [Audio EQ Cookbook (Robert Bristow-Johnson)](https://webaudio.github.io/Audio-EQ-Cookbook/audio-eq-cookbook.html)
- [EarLevel Engineering — Cascading filters](https://www.earlevel.com/main/2016/09/29/cascading-filters/)
- [Neil Robertson — Design IIR Filters Using Cascaded Biquads](https://www.dsprelated.com/showarticle/1137.php)
- [Wikipedia — Digital biquad filter](https://en.wikipedia.org/wiki/Digital_biquad_filter)
- [Gobl — The LF Model in the Frequency Domain for Glottal Airflow (Interspeech 2021)](https://www.isca-archive.org/interspeech_2021/gobl21_interspeech.pdf)
- [Stochastic models of glottal pulses from Rosenberg and LF models (Speech Communication)](https://www.sciencedirect.com/science/article/abs/pii/S0885230821000322)
- [A hybrid LF-Rosenberg frequency-domain model of the glottal pulse (IEEE)](https://ieeexplore.ieee.org/document/6701892/)
- [Glottal Source Processing: from Analysis to Applications (arXiv)](https://arxiv.org/pdf/1912.12604)

**Voice science / formant data / strategies:**
- [Svante Granqvist — Madde Synthesizer](https://www.tolvan.com/index.php?page=/madde/madde.php)
- [Granqvist — New technology for teaching voice science and pedagogy: the Madde Synthesizer](https://go.gale.com/ps/i.do?id=GALE%7CA282426664)
- [The KTH synthesis of singing (ResearchGate)](https://www.researchgate.net/publication/26450063_The_KTH_synthesis_of_singing)
- [Praat — Peterson & Barney 1952 formant table](https://www.fon.hum.uva.nl/praat/manual/Create_formant_table__Peterson___Barney_1952_.html)
- [Hillenbrand — Acoustic characteristics of American English vowels (1995)](https://pubmed.ncbi.nlm.nih.gov/7759650/)
- [Static measurements of vowel formant frequencies and bandwidths: A review](https://pmc.ncbi.nlm.nih.gov/articles/PMC6002811/)
- [Vowel Acoustic Space Development in Children](https://pmc.ncbi.nlm.nih.gov/articles/PMC2597712/)
- [Corner vowels in males and females ages 4 to 20 years: F1–F4](https://pmc.ncbi.nlm.nih.gov/articles/PMC6850954/)
- [Voice Science — Formant Tuning: Resonance Strategies in Singing](https://www.voicescience.org/lexicon/formant-tuning/)
- [Voice Science — Singer's Formant](https://www.voicescience.org/2025/11/lexicon/singers-formant/)
- [The Perception of Formant Tuning in Soprano Voices (Journal of Voice)](https://www.sciencedirect.com/science/article/abs/pii/S0892199717301200)
- [UNSW — Vocal resonance, resonance tuning and vowel changes (especially for sopranos)](https://newt.phys.unsw.edu.au/jw/soprane.html)
- [Shifting Gears: Formant Tuning Strategies of Elite Operatic Baritones](https://www.academia.edu/32667155/Shifting_Gears_Formant_Tuning_Strategies_of_Elite_Operatic_Baritones)
- [Second Formant Tuning and the Tenor Voice](https://www.academia.edu/35415066/Second_Formant_Tuning_and_The_Tenor_Voice)
- [VoiceScienceWorks — Using Madde to formant tune](https://www.voicescienceworks.org/eyes-in-the-studio/using-madde-to-formant-tune)

**Svelte performance:**
- [Svelte — Introducing runes](https://svelte.dev/blog/runes)
- [Svelte docs — $state](https://svelte.dev/docs/svelte/$state)
- [DEV — Real-world Svelte 5: Handling high-frequency real-time data with Runes](https://dev.to/polliog/real-world-svelte-5-handling-high-frequency-real-time-data-with-runes-3i2f)
- [SitePoint — React 19 Compiler vs Svelte 5: Latency Benchmark Results](https://www.sitepoint.com/react-19-compiler-vs-svelte-5-virtual-dom-latency-benchmark/)

**UX / accessibility:**
- [Nielsen Norman Group — Direct Manipulation: Definition](https://www.nngroup.com/articles/direct-manipulation/)
- [Nielsen Norman Group — Drag–and–Drop: How to Design for Ease of Use](https://www.nngroup.com/articles/drag-drop/)
- [Smart Interface Design Patterns — Drag-and-Drop UX](https://smart-interface-design-patterns.com/articles/drag-and-drop-ux/)
- [Pencil & Paper — Drag & Drop UX Design Best Practices](https://www.pencilandpaper.io/articles/ux-pattern-drag-and-drop)
- [Chart Reader: Accessible Visualization Experiences Designed with Screen Reader Users (CHI 2023)](https://dl.acm.org/doi/10.1145/3544548.3581186)
- [WebAIM — Designing for Screen Reader Compatibility](https://webaim.org/techniques/screenreader/)

---
*Pitfalls research for: Formant Canvas (voice synthesis + linked visualization pedagogy tool)*
*Researched: 2026-04-11*
