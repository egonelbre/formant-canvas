# Stack Research

**Domain:** Real-time client-side voice synthesizer + scientific visualizer (Svelte + TypeScript, Web Audio API)
**Researched:** 2026-04-11
**Confidence:** HIGH for build tooling and UI-side picks; MEDIUM for DSP libraries (voice synth ecosystem is sparse — most picks are "build it yourself, these are the reference implementations to learn from")

> **Scope note:** Svelte + TypeScript and Web Audio API / AudioWorklet are pre-decided. This document fills in everything else: build tooling, testing, rendering, gestures, DSP helpers, data, and deployment. It does *not* re-examine the UI framework or audio API choice.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Svelte** | 5.55.x | UI framework (pre-decided) | Runes (`$state`, `$derived`, `$effect`) are a near-perfect fit for linked audio+visual updates — one source of truth, everything re-renders. Svelte 5 ships with native TS support (no preprocess step). |
| **TypeScript** | 6.0.x | Type safety across DSP, UI, and data | Non-negotiable for a math-heavy app with many linked parameters. TS 6 strict mode catches Float32Array vs number[] mixups that would otherwise cause silent audio glitches. |
| **Vite** | 8.0.x | Dev server + bundler | De-facto standard for Svelte. Extremely fast HMR (critical when you're tweaking DSP and want audio to restart in <100ms). Handles `?worker` / `?url` imports you need for AudioWorklet processors. |
| **`@sveltejs/vite-plugin-svelte`** | 7.0.x | Svelte integration for Vite | Official plugin. Use this even in the plain-Vite variant (see "Stack Patterns" below). |
| **Web Audio API + AudioWorklet** | browser-native | Real-time DSP + routing (pre-decided) | AudioWorklet runs DSP off the main thread at 128-sample quanta. Chromium, Firefox, and Safari (16.4+) all ship it. See gotchas section. |

### Build Tooling: SvelteKit-static vs Plain Svelte + Vite

**Recommendation: Plain Svelte + Vite** (not SvelteKit)

| Criterion | SvelteKit + adapter-static | Plain Svelte + Vite |
|-----------|---------------------------|---------------------|
| Bundle overhead | Router, data-loading runtime (~15-25 KB) | Zero — only what you import |
| Routing needs | Overkill — app is a single-screen studio | Matches reality |
| AudioWorklet asset handling | Works, but `+page.ts` data-loading model assumes fetch-able data; you'll fight SSR-by-default | Direct `new URL('./processor.ts?worker&url', import.meta.url)` — clean |
| URL-encoded preset sharing | Works via `$page.url.searchParams` | Works via `window.location.search` + `$state` — trivial |
| Dev experience | Heavier; SSR errors confusing for a pure client app | Lighter; errors are always in the browser where the audio lives |
| Exit cost if requirements change | Migration to plain Vite is painful | Migration *to* SvelteKit is straightforward if you later need routes |

**Rationale:** This is a single-screen real-time studio, not a multi-page content site. SvelteKit's value propositions (SSR, file-based routing, server load functions, form actions) are all irrelevant and all forbidden by the "no backend, static site" constraint. Every feature you'd use in SvelteKit (client router, data loading) is something you'd be fighting against with `export const ssr = false` and `export const prerender = false` everywhere. Use plain Svelte + Vite and reclaim the simplicity. **Confidence: HIGH.**

**Escape hatch:** If later you add a marketing page, an /about, or a docs site around the studio, migrate then. `create-svelte` → move `src/App.svelte` contents into `src/routes/+page.svelte` → add `export const ssr = false`. An afternoon of work.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **`svelte-gestures`** | 5.2.x | Pointer-event-based drag / pan / pinch as Svelte actions | Primary drag handler for formant dots on F1/F2 chart and harmonic markers on the piano. Tiny (~3 KB gzipped), pointer-events native, works on tablet. Integrates as `use:drag` action — feels native in Svelte. |
| **`d3-scale`** (cherry-picked from `d3` 7.9.x) | 7.9.x | Linear / log / log2 scales for pixel ↔ Hz ↔ semitone mapping | Essential for the F1/F2 chart (typically log-scale), piano axis (linear in semitones), formant range overlays. **Do not install all of `d3`** — pull only the modules you need. |
| **`d3-shape`** (optional) | 3.x | Path generators for range polygons, vowel region outlines | Use *only* if you need SVG area/line paths for vowel regions. For most plots, manual path strings are fewer dependencies and less mystery. |
| **`klatt-syn`** | 1.0.x | Reference Klatt cascade-parallel formant synthesizer (TS) | **Read the source** to learn the reference algorithms (Klatt 1980 cascade/parallel). Do not use at runtime in an AudioWorklet as-is — it's designed for offline synthesis, not sample-accurate real-time. Use it to bootstrap your own worklet. |
| **`@types/audioworklet`** | 0.0.97 | TypeScript types for `AudioWorkletProcessor`, `registerProcessor` | Required to write worklet processors in TS without `@ts-ignore` everywhere. |

### Audio Engine Building Blocks (native Web Audio, no library)

These are Web Audio nodes you'll compose, not npm packages:

| Node | Purpose | Notes |
|------|---------|-------|
| **Custom `AudioWorkletNode`** | Glottal pulse generator (LF / Rosenberg / KLGLOTT88) | Implement in TS, compile with Vite `?worker&url`. Pre-allocate all buffers in constructor. See gotchas. |
| **`BiquadFilterNode` (type `bandpass` or `peaking`)** | Individual formant resonators F1–F4 | Cheap, native, de-zippered parameter changes via `setTargetAtTime`. Use **parallel** topology for formants (see rationale). |
| **`IIRFilterNode`** | Alternative for fixed formant coefficients | Use only if you need a filter shape biquad can't produce; no parameter automation. |
| **`GainNode`** | Per-formant amplitude, master volume, vibrato LFO depth | Use `setTargetAtTime` for smooth parameter changes — avoids zipper noise. |
| **`OscillatorNode`** (sine) | Vibrato LFO driving frequency `AudioParam`s | Connect via `.connect(target.detune)` for free FM. |
| **`AnalyserNode`** | Spectrum / waveform visualization feed | For a "what you're hearing" scope view. |

**Parallel vs cascade formants:** The DSP literature (Julius Smith, EarLevel) is clear that **parallel** biquads are numerically better for formant filter banks with disjoint resonances — cascade works too but accumulates quantization noise and has pathological gain at the last stage. Use parallel. Each formant gets a `BiquadFilterNode` with `type: 'bandpass'`, all fed from the glottal source, all summed into a shared `GainNode`. **Confidence: HIGH** (DSP consensus).

### Visualization: Canvas vs SVG

**Recommendation: Hybrid — SVG for structural views, Canvas for fast-updating views.**

| View | Medium | Why |
|------|--------|-----|
| **F1/F2 vowel chart** (drag target, few elements) | **SVG with Svelte components** | Vowel region polygons, labeled axes, draggable dots — SVG is declarative, accessible, hit-testable by the browser, and Svelte's reactive model makes it trivial. Performance is fine for <200 elements at 60fps. |
| **Piano keyboard with harmonics** | **SVG** | Mostly static geometry (keys), with a handful of moving markers for harmonics. No Canvas win. |
| **Formant range overlays** | **SVG `<polygon>`** | Static or slowly-changing shapes. Reactive `$derived` for vertices. |
| **Live spectrum / spectrogram** (if added) | **Canvas 2D** | Pixel-pushing 60fps, 512+ bins — SVG chokes here. Use `svelte-canvas` **or** a plain `<canvas bind:this>` + `requestAnimationFrame`. |
| **Waveform scope** (if added) | **Canvas 2D** | Same reason. |

**Do NOT use:** Konva / `svelte-konva` (overkill, adds 200+ KB for what is essentially line-drawing); Three.js / WebGL (this is 2D scientific viz, not 3D); `d3-selection` DOM manipulation (fights Svelte's reactivity — you'll have two systems trying to own the DOM).

**`svelte-canvas`** (0.14.x, by dnass) is a lightweight reactive canvas wrapper (~2 KB). Use it *only* if you need a reactive Canvas layer — it's not a whole graphics framework, just a render-on-state-change primitive. For the spectrum view, plain `<canvas>` + rAF is equally fine and has one fewer dependency.

**Chart libraries considered and rejected:**

| Library | Why not |
|---------|---------|
| **Chart.js / ECharts / Plotly** | Dashboard libraries. Wrong abstraction for a custom scientific UI where every pixel is bespoke. Huge bundle. |
| **LayerCake** (10.0.x) | Excellent for publication-style D3-in-Svelte bar/line charts. Overkill for our case — we don't want "charts," we want a vowel diagram and a piano. Adds a framework layer with no payoff. |
| **SveltePlot** (0.14.x, 2025) | Observable Plot in Svelte. Same story as LayerCake — beautiful for statistical charts, wrong abstraction for direct-manipulation custom UI. |
| **Full `d3` (7.9.x)** as UI lib | Manipulates the DOM imperatively. Do not mix with Svelte. **Do** cherry-pick `d3-scale` / `d3-shape` / `d3-interpolate` as pure math helpers. |

**Confidence: HIGH** on hybrid approach; the Svelte data-viz community (vis4.net, datavisualizationwithsvelte.com) has converged on "D3 for math, Svelte for DOM."

### Gestures

**Recommendation: `svelte-gestures` 5.2.x (Rezi/svelte-gestures)**

- Uses Pointer Events under the hood → mouse, touch, stylus all work with one code path
- ~3 KB gzipped, tree-shakable (import only `drag`, `pinch`, etc.)
- Svelte action API (`<circle use:drag={handler}>`) — idiomatic
- Actively maintained; v5 is rewritten on Svelte 5 attachments

**Alternatives considered:**

| Alternative | Verdict |
|-------------|---------|
| **`@use-gesture/vanilla`** (10.3.x, pmndrs) | Platform-agnostic since v10, works in vanilla JS. But designed around React's hook ergonomics; integration in Svelte means writing wrapper actions anyway. Choose only if you need complex gesture coordination (pinch + rotate + drag simultaneously) — overkill here. |
| **Custom Pointer Events** | Tempting for minimal dependencies. Gotcha: you must set `touch-action: none` on draggable elements (otherwise touch-scroll cancels your pointer stream), and you'll reimplement the "capture pointer on pointerdown, release on pointerup, handle pointercancel" dance. `svelte-gestures` is 3 KB and already got this right. Reach for custom only if it needs to be *zero* dependencies. |

**Important for multitouch tablet support:** On every draggable element, set `touch-action: none` in CSS (or `touch-action: pan-y` if the parent should still scroll vertically). This is the #1 gotcha across both libraries and custom code. **Confidence: HIGH.**

### Voice-Synth Reference Implementations (study, don't depend on)

These are open-source projects to **read for algorithms**, not to import at runtime:

| Project | What it gives you | Caveats |
|---------|-------------------|---------|
| **`klatt-syn`** (chdh, TS) — [github.com/chdh/klatt-syn](https://github.com/chdh/klatt-syn) | Klatt 1980 cascade-parallel formant synth, clean TS, well-commented. Reference for parallel formant topology, glottal pulse shapes, aspiration noise. | Designed as a single-shot renderer (generates a whole buffer). You'll adapt the per-sample inner loop for the worklet's 128-sample process() method. |
| **Pink Trombone** (Neil Thapen, forks by zakaton/yonatanrozin) — [github.com/yonatanrozin/Modular-Pink-Trombone](https://github.com/yonatanrozin/Modular-Pink-Trombone) | Physical-modeling vocal tract (Kelly-Lochbaum waveguide) + AudioWorklet port. Shows *how* to structure a real-time voice worklet in modern Web Audio. | Physical modeling is a completely different approach from formant synthesis. Study the worklet plumbing (message passing, parameter smoothing), ignore the vocal tract math. |
| **`meSing.js`** (usdivad) — [github.com/usdivad/mesing](https://github.com/usdivad/mesing) | JavaScript singing synthesis using Web Audio + meSpeak.js. | Older ScriptProcessorNode era, not AudioWorklet. Reference only. |
| **Madde** (Svante Granqvist, KTH) | The gold-standard reference the user is targeting. Native-only, no source available. | Read the papers (Granqvist, "New technology for teaching voice science"), not the code. |

**"Wafel" was searched but not found** as a public open-source voice synth. If the user is thinking of a specific tool, it may be proprietary or a different name — flag for clarification. **Confidence: MEDIUM** (negative finding from WebSearch only).

### Glottal Pulse Models — Pick One to Start

In order of complexity / realism:

1. **Rosenberg** (1971) — simplest, two-segment polynomial. Parameters: open quotient, return quotient, amplitude. ~10 lines of code. **Start here.** Sounds "buzzy but voice-like," good enough for pedagogy.
2. **KLGLOTT88** (Klatt 1988) — used in Klatt synth. Parameters: open quotient, asymmetry, spectral tilt. Also simple. `klatt-syn` has a working implementation.
3. **LF (Liljencrants-Fant)** — state of the art, four parameters (Ra, Rk, Rg, EE), continuously differentiable. Best sound, hardest to parameterize intuitively. Defer to later phase — requires solving an implicit equation at each pulse or pre-computing a waveform library.

**Recommendation:** Ship **Rosenberg in Phase 1**, add **LF as an upgrade path** once the UI is stable. KLGLOTT88 is a reasonable middle-ground if you want more control without LF's parameter-coupling headaches. **Confidence: HIGH** on the ordering; this is standard practice in textbook speech synthesis courses.

### DSP Math Helpers

| Need | Recommendation |
|------|----------------|
| **Scales & interpolation** (Hz↔semitone, log F1/F2, color ramps) | `d3-scale` + `d3-interpolate` (cherry-picked, ~5 KB). |
| **FFT** (for analyzer/spectrogram) | **`AnalyserNode.getFloatFrequencyData()`** — built into Web Audio, free. Do not add a JS FFT lib unless you need FFT *inside* the worklet (which you probably don't for this app). |
| **Biquad coefficient computation** (if rolling custom IIR) | Inline the Audio EQ Cookbook formulas (Robert Bristow-Johnson) — ~30 lines of TS. No lib needed. |
| **Envelope generation** (attack/release on vibrato, gain) | `GainNode.gain.setTargetAtTime()` — native, sample-accurate. No lib needed. |

**Do NOT add `tone.js` (15.1.x)** — it's a high-level music framework (Part, Transport, instruments). You're building DSP from scratch at a lower level; Tone would add 100+ KB of functionality you don't need and impose its scheduler model on top of yours.

### Vowel Formant Data

**Recommendation: Embed published tables as JSON in `src/data/`.** No npm package exists.

- **Peterson & Barney (1952)** — 76 speakers, F0/F1/F2/F3 for 10 vowels. Canonical reference. Data is in the paper; `phonTools` R package has it as `pb52`. Reformat to JSON (~50 KB).
- **Hillenbrand et al. (1995)** — 139 speakers, more vowels, more modern. Data at http://homepages.wmich.edu/~hillenbr/voweldata.html (plain text). `phonTools::h95`. Reformat to JSON (~200 KB).
- **IPA vowel canonical positions** — derive from either dataset's centroid per vowel, or use the standard IPA vowel chart values from Ladefoged & Johnson.

**Why embed, not fetch:** Tiny (~250 KB uncompressed, <50 KB gzipped), no network round trip, works offline, versionable in git. The "static site, no backend" constraint makes embedding the obvious choice. **Confidence: HIGH.**

**Action item for Phase 1:** Build a one-off script (`scripts/build-vowel-data.ts`) that fetches the raw Hillenbrand `.dat` files, parses them, and emits `src/data/vowels-hillenbrand.json`. Commit both script and output.

### Development Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| **Vitest** | 4.1.x | Unit tests for DSP math, scales, preset encoding | Native Vite integration = test config is free. Use Vitest Browser Mode (Playwright provider) for anything that touches `AudioContext`. |
| **Playwright** | 1.59.x | E2E tests via Vitest Browser Mode + cross-browser audio smoke tests | Use the `vitest` Playwright provider (`vitest.config` → `browser.provider: 'playwright'`). One binary drives everything. Audio tests run against real `AudioContext` — mocking AudioWorklet is painful and not worth it. |
| **`svelte-check`** | 4.4.x | TS + Svelte type checking | Run in CI and watch mode. |
| **Prettier** | 3.8.x + `prettier-plugin-svelte` | Formatting | Stock config. |
| **ESLint** | 10.2.x + `eslint-plugin-svelte` 3.17.x | Linting | Svelte 5 runes support is in `eslint-plugin-svelte` v3+. |

**Testing strategy:**
- **Unit (Vitest, Node env):** Pure math — scale conversions, biquad coefficient calculations, LF/Rosenberg pulse shapes (compare against golden arrays), preset URL encoding/decoding.
- **Component (Vitest Browser Mode, Playwright provider):** Svelte components that don't need audio — the F1/F2 chart rendering with stub state, the piano keyboard visuals, preset panels.
- **Integration (Playwright):** Real browser, real `AudioContext`. Smoke test: "click start, check `AudioContext.state === 'running'`, move a slider, check no console errors, take a screenshot." Do *not* try to assert on actual audio output — cross-browser determinism is hopeless.
- **AudioWorklet unit testing:** Skip it. Refactor DSP into **plain functions** (pure `(sampleRate, state, params) => nextSample`) that the worklet wraps. Test those plain functions in Node with Vitest. The worklet itself becomes a 30-line harness that's easier to eyeball than to test.

**Confidence: HIGH** on the strategy; MEDIUM on specific Vitest Browser Mode maturity (it's been stable since late 2024 but audio-heavy browser tests are still niche — expect to write some custom setup).

### Deployment: Static Hosting

**Recommendation: GitHub Pages** (primary) or **Cloudflare Pages** (if you outgrow Pages)

| Host | Pros | Cons | Pick if |
|------|------|------|---------|
| **GitHub Pages** | Free, zero vendor signup, deploy via GitHub Actions, source-of-truth is your repo | 100 GB/month bandwidth (plenty), no header customization without workarounds | **Default choice.** Matches the "single-dev, open project, no infra" vibe. |
| **Cloudflare Pages** | Fast global CDN, generous free tier, custom headers via `_headers` file, branch previews | Another account to manage | Pick if you need custom response headers (see COOP/COEP note below). |
| **Netlify** | Excellent DX, branch previews, `_headers` file | Free tier has build-minute limits that can bite | Reasonable alternative to Cloudflare. |
| **Vercel** | Smooth DX | Oriented toward SSR / serverless you don't need | Overkill. |

**Critical: COOP/COEP headers for `SharedArrayBuffer`.** If you end up using `SharedArrayBuffer` for zero-copy parameter passing between main thread and AudioWorklet, the page must be served with:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

- **GitHub Pages cannot set these headers natively.** Workarounds: the `coi-serviceworker` polyfill (injects a service worker that re-serves everything with the right headers) — ugly but works.
- **Cloudflare Pages / Netlify / Vercel can all set them** via a `_headers` file.

**Recommendation:** **Avoid `SharedArrayBuffer` for v1.** `postMessage` with transferable `ArrayBuffer` is fast enough for parameter updates at 60 Hz (parameter changes happen at UI speed, not audio rate). Skip the deployment headache. Revisit only if you hit a profiling-proven bottleneck. **Confidence: HIGH.**

---

## Installation

```bash
# Scaffold (no SvelteKit)
npm create vite@latest formant-canvas -- --template svelte-ts
cd formant-canvas

# Core (most will already be installed by the template; lock to these versions)
npm install svelte@^5.55.0 typescript@^6.0.0

# Svelte integration for Vite
npm install -D @sveltejs/vite-plugin-svelte@^7.0.0 svelte-check@^4.4.0

# Gestures and DSP helpers
npm install svelte-gestures@^5.2.0 d3-scale@^4 d3-interpolate@^3

# Type defs for AudioWorklet globals
npm install -D @types/audioworklet@^0.0.97

# Reference-only (optional, for studying the algorithms)
npm install -D klatt-syn@^1.0.8

# Testing
npm install -D vitest@^4.1.0 @vitest/browser@^4.1.0 playwright@^1.59.0 @playwright/test@^1.59.0

# Lint + format
npm install -D prettier@^3.8.0 prettier-plugin-svelte@^3 eslint@^10.2.0 eslint-plugin-svelte@^3.17.0
```

**Key Vite config snippet** (`vite.config.ts`):

```ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  // AudioWorklet processors are loaded via new URL() — Vite handles this.
  worker: { format: 'es' },
  base: '/formant-canvas/', // GitHub Pages subpath; drop if using custom domain
});
```

**Loading a worklet processor** (TS in an ES-module worker):

```ts
// In main thread code
const processorUrl = new URL('./dsp/glottal-processor.ts', import.meta.url);
await audioCtx.audioWorklet.addModule(processorUrl);
const glottal = new AudioWorkletNode(audioCtx, 'glottal-processor');
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Plain Svelte + Vite | SvelteKit + adapter-static | Only if the project grows a marketing site, /docs, or multiple routes — then SvelteKit's router earns its keep. |
| Parallel `BiquadFilterNode`s for formants | Custom IIR inside a single AudioWorklet | Only if you need per-sample parameter automation beyond what `AudioParam.setTargetAtTime` can do, or if you need a filter shape biquad can't produce (rare for formants). Custom IIR gives more control but loses the browser's optimized native implementation. |
| `svelte-gestures` | `@use-gesture/vanilla` | If you need pinch+rotate+drag combined gesture choreography. Not the case for F1/F2 dragging. |
| Cherry-picked `d3-scale` + SVG | LayerCake / SveltePlot | For a traditional chart dashboard. Not for a custom direct-manipulation tool. |
| Rosenberg glottal pulse | LF model | Phase 2+, once the rest of the app is stable. LF is worth it for realism but adds parameter-coupling complexity. |
| Embed vowel data as JSON | Fetch at runtime | Never — the data is 50 KB gzipped and never changes. |
| GitHub Pages | Cloudflare Pages | If you need COOP/COEP for `SharedArrayBuffer`, or you want branch preview deploys. |
| `postMessage` for worklet params | `SharedArrayBuffer` + Atomics | Only if postMessage profiling shows it's a bottleneck (it won't for this app). |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **SvelteKit** (for this project) | Brings SSR, routing, and load-function abstractions you'd immediately disable. Every `ssr = false` is a fight. | Plain Svelte + Vite. |
| **Tone.js** (15.x) | High-level music framework (instruments, Transport, Part). Wrong abstraction layer — you're writing the DSP *below* what Tone offers. Adds 100+ KB. | Raw Web Audio nodes + custom AudioWorklet. |
| **`ScriptProcessorNode`** | Deprecated. Runs on the main thread, causes glitches under load. Some tutorials still reference it. | `AudioWorkletNode` + `AudioWorkletProcessor`. |
| **Full `d3` (7.9.x) as DOM-manipulating UI lib** | Fights Svelte for DOM ownership. Double-maintained state. | Cherry-picked `d3-scale` / `d3-shape` / `d3-interpolate` as pure math; let Svelte render. |
| **Konva / `svelte-konva`** | 200+ KB Canvas framework. You don't need a scene graph for a piano and a scatter plot. | Plain SVG for static shapes, plain `<canvas>` + rAF (or tiny `svelte-canvas`) for pixel-pushing. |
| **Chart.js / ECharts / Plotly / Highcharts** | Dashboard libraries. Their abstraction is "here's your data, I'll make a chart." Yours is "here's my bespoke scientific UI." Wrong fit. | Custom SVG with `d3-scale`. |
| **Jest** | Slower than Vitest, worse Svelte+TS+ESM story, requires transform config. | Vitest. |
| **`create-react-app` / Next.js / anything React-shaped** | Svelte is pre-decided. | — |
| **Web Workers for DSP** (instead of AudioWorklet) | Workers are too coarse-grained (messages arrive in batches, not sample-accurate). They were a 2015 workaround. | `AudioWorkletNode` — purpose-built for this. |
| **LF glottal model in Phase 1** | Four coupled parameters; implementation requires solving implicit equations or table lookup. High risk, low payoff for early iteration. | Rosenberg (or KLGLOTT88) first; LF later. |
| **`SharedArrayBuffer` for parameter passing (v1)** | Forces COOP/COEP headers, which GitHub Pages can't set without a service-worker polyfill. | `postMessage` with structured-clone. Fast enough at UI rates. |

---

## Stack Patterns by Variant

**If you stay within the v1 scope (no routes, no marketing site):**
- Plain Svelte + Vite, as specified. Minimum deps, fastest iteration.

**If scope grows to include a /docs or /about page:**
- Migrate to SvelteKit + adapter-static. Move existing app to `src/routes/+page.svelte` with `export const ssr = false; export const prerender = false`. Prerender the docs pages normally.

**If you later need `SharedArrayBuffer` for performance:**
- Move deployment to Cloudflare Pages or Netlify (both support `_headers`).
- Set COOP/COEP.
- Use a `SharedArrayBuffer` + Atomics ring buffer between main and worklet. Reference: Loke.dev "Stop Allocating Inside the AudioWorkletProcessor."

**If LF glottal model becomes a bottleneck in JS:**
- Option A: Pre-compute a waveform library (LF pulses for a grid of Ra/Rk values) at startup, interpolate at runtime — no live implicit-equation solving.
- Option B: Compile a C/C++ LF implementation to WASM, call from worklet via `importScripts`. Adds toolchain overhead; defer until profiled.

---

## AudioWorklet Gotchas (Influences Stack Choices)

These are real, browser-verified constraints that shaped the picks above:

1. **No allocation in `process()`.** Every `new Float32Array(128)` inside the 3 ms audio budget risks GC pauses that audibly glitch. Pre-allocate all buffers in the constructor. This is why DSP code is best written as plain functions operating on pre-allocated typed arrays — and why you unit-test those functions in Node, not inside the worklet.

2. **Parameter count has a linear cost.** There's per-parameter overhead in the Chromium AudioWorklet bridge. One developer reported dropping from 544 to 96 parameters to fix a perf issue. Lesson: use *one* `AudioWorkletNode` per synth voice with a handful of `AudioParam`s for continuously-automated values (pitch, per-formant freq); send slow-changing config (vowel presets, model selection) via `port.postMessage`. Do **not** expose dozens of parameters.

3. **Sample rate varies.** Desktop is usually 44.1 or 48 kHz, but iOS sometimes runs at 24 kHz. Read `sampleRate` at worklet construction; never hardcode.

4. **Safari had AudioWorklet gaps historically.** Safari 16.4+ (March 2023) supports AudioWorklet properly. Earlier Safaris do not. Smoke-test on real Safari in CI.

5. **Smooth parameter changes require `setTargetAtTime`.** Direct `.value =` assignments cause zipper noise. Use `setTargetAtTime(newValue, audioCtx.currentTime, 0.01)` for all UI-driven changes. The linked-update design means the user will be dragging a lot — this matters.

6. **`postMessage` clones by default.** Large messages copy. For this app's parameter rates (<60 Hz), that's fine. If you send large buffers, use `Transferable` (`port.postMessage(buf, [buf.buffer])`).

7. **Autoplay policy.** `AudioContext` starts suspended until a user gesture. First click must `audioCtx.resume()`. This shapes the "Start" button in the UI.

8. **Per-browser 128-sample mandate.** `AudioWorkletProcessor.process()` is called with exactly 128 frames. On mobile this can cause distortion on weaker devices (reported in Chromium bugs), but for desktop-primary it's fine.

9. **Worklet code runs in a separate global scope** — no DOM, no `window`, no most Web APIs. You can only `import` inside the worklet if you use ES module workers (Vite's `worker.format: 'es'` enables this; see install section).

10. **Hot-module reloading and AudioWorklet don't mix gracefully.** When you edit a worklet file, Vite HMR can't re-register a `registerProcessor` name that's already taken in the same `AudioContext`. Workaround: on HMR, tear down the `AudioContext` and recreate it. Or accept a full-reload for worklet edits. Build this into your dev loop early.

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `svelte@5.55` | `@sveltejs/vite-plugin-svelte@7.0` | Plugin v7 requires Svelte 5. v5 of the plugin is the last Svelte-4-compatible line. |
| `svelte@5.x` | `eslint-plugin-svelte@3.17+` | Runes syntax requires `eslint-plugin-svelte` v3+. |
| `vitest@4.1` | `@vitest/browser@4.1`, `playwright@1.59+` | Browser Mode went stable in late 2024; pair Vitest and `@vitest/browser` on exact matching versions. |
| `svelte-gestures@5.2` | `svelte@5.x` | v5 is built on Svelte 5 attachments. Earlier versions target Svelte 4 actions. |
| `typescript@6.0` | `svelte-check@4.4` | svelte-check 4.4 bundles the TS 6 language service. |
| `klatt-syn@1.0.8` | any — zero runtime deps | Use as reference code, not a runtime dep. |
| `d3-scale@4.x` | ESM-only | Plain imports work with Vite. No ESM interop issues. |

**Node version:** 22 LTS (active LTS as of 2026). Vite 8 requires Node ≥ 20; Vitest 4 requires Node ≥ 20.

---

## Sources

- **Official docs (HIGH confidence):**
  - [Svelte 5 docs — runes](https://svelte.dev/docs/svelte/what-are-runes)
  - [Svelte 5 migration guide](https://svelte.dev/docs/svelte/v5-migration-guide)
  - [SvelteKit — Single-page apps](https://svelte.dev/docs/kit/single-page-apps) — confirms SvelteKit static adapter supports SPAs; also confirms the SSR/prerender opt-outs you'd need.
  - [SvelteKit — Project types](https://svelte.dev/docs/kit/project-types)
  - [MDN — AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)
  - [MDN — Background audio processing using AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_AudioWorklet)
  - [Chrome for Developers — Audio worklet design pattern](https://developer.chrome.com/blog/audio-worklet-design-pattern/)
  - [Audio EQ Cookbook (Bristow-Johnson)](https://webaudio.github.io/Audio-EQ-Cookbook/audio-eq-cookbook.html) — biquad coefficients.
  - [Vitest — Playwright provider config](https://vitest.dev/config/browser/playwright)
  - [Vitest — Browser Mode guide](https://vitest.dev/guide/browser/)

- **Reference implementations (HIGH confidence — source code verified to exist):**
  - [`klatt-syn` (chdh)](https://github.com/chdh/klatt-syn) — Klatt formant synth in TS. NPM: `klatt-syn@1.0.8`.
  - [Modular Pink Trombone (yonatanrozin)](https://github.com/yonatanrozin/Modular-Pink-Trombone) — AudioWorklet port of Pink Trombone.
  - [`meSing.js`](https://github.com/usdivad/mesing) — older reference, ScriptProcessor-era.

- **DSP theory (HIGH confidence):**
  - [Julius Smith — Series and Parallel Filter Sections](https://www.dsprelated.com/freebooks/filters/Series_Parallel_Filter_Sections.html) — parallel vs cascade for formant banks.
  - [EarLevel — Biquads](https://www.earlevel.com/main/2003/02/28/biquads/) — biquad implementation reference.

- **Performance notes (HIGH confidence):**
  - [Casey Primozic — AudioWorklet parameter-count perf pitfall](https://cprimozic.net/blog/webaudio-audioworklet-optimization/)
  - [Paul Adenot — Web Audio API performance notes](https://padenot.github.io/web-audio-perf/)
  - [Loke.dev — Lock-free ring buffer for AudioWorklet](https://loke.dev/blog/stop-allocating-inside-audioworkletprocessor)
  - [Jeff Kaufman — AudioWorklet latency: Firefox vs Chrome](https://www.jefftk.com/p/audioworklet-latency-firefox-vs-chrome)

- **Vowel data (HIGH confidence on sources; MEDIUM on "no npm package exists"):**
  - [Hillenbrand vowel data homepage](http://homepages.wmich.edu/~hillenbr/voweldata.html) — raw `.dat` files, free to use.
  - [phonTools R package — pb52 (Peterson-Barney)](https://rdrr.io/cran/phonTools/man/pb52.html)
  - [phonTools R package — h95 (Hillenbrand)](https://rdrr.io/cran/phonTools/man/h95.html)
  - Searched npm for `peterson-barney`, `hillenbrand`, `vowel-formants`: no maintained package found. Embed as JSON.

- **Svelte data viz ecosystem (MEDIUM confidence — blog posts and community convergence):**
  - [vis4.net — SveltePlot intro](http://www.vis4.net/blog/2025/05/hello-svelteplot/)
  - [Kyran Dale — Bespoke charts with Svelte, D3, LayerCake](https://www.kyrandale.com/bespoke-charts-with-svelte-d3-and-layercake/)
  - [Data Visualization with Svelte (book site)](https://datavisualizationwithsvelte.com/)

- **Madde reference (LOW confidence — single source, old):**
  - [Gale — "New technology for teaching voice science: the Madde Synthesizer"](https://go.gale.com/ps/i.do?id=GALE%7CA282426664) — Granqvist's paper. No public source code.

- **Version verification:** Current npm registry values fetched 2026-04-11 via `npm view`. All versions in tables reflect the latest stable at that time.

---

*Stack research for: Real-time voice synthesizer + visualizer in Svelte + TypeScript*
*Researched: 2026-04-11*
