<!-- GSD:project-start source:PROJECT.md -->
## Project

**Formant Canvas**

A web-based voice synthesis and visualization app that lets singers, teachers, learners, and researchers hear and see how the human voice works — glottal source, formant filters, vibrato/jitter — with tightly linked visualizations of harmonics on a piano, formant ranges, vocal strategies (R1:2f, R1:f, R2:2f, etc.), and the F1/F2 vowel diagram. Inspired by Madde, but with a friendlier, modern UI built around direct manipulation and guided presets.

**Core Value:** Linked exploration — audio and visuals are tightly coupled, so changing a parameter is simultaneously heard and seen across every view. If everything else fails, this must work: move a formant and the sound, the vowel chart, and the harmonics-on-piano update together in real time.

### Constraints

- **Tech stack**: Svelte + TypeScript for the UI — reactive runtime fits live-updating readouts; smaller surface than React for a single-developer project
- **Audio engine**: Web Audio API (AudioWorklet for custom DSP like glottal pulse generation); no native install
- **Platform**: Desktop web browsers (Chromium, Firefox, Safari); tablet/multitouch supported via Pointer Events where feasible but not a v1 acceptance criterion
- **Deployment**: Static site — no backend required for v1
- **Accuracy**: Voice model should be recognizable and pedagogically correct (formant frequencies in the right ballpark for standard vowels), but not a research-grade voice model
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

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
| Criterion | SvelteKit + adapter-static | Plain Svelte + Vite |
|-----------|---------------------------|---------------------|
| Bundle overhead | Router, data-loading runtime (~15-25 KB) | Zero — only what you import |
| Routing needs | Overkill — app is a single-screen studio | Matches reality |
| AudioWorklet asset handling | Works, but `+page.ts` data-loading model assumes fetch-able data; you'll fight SSR-by-default | Direct `new URL('./processor.ts?worker&url', import.meta.url)` — clean |
| URL-encoded preset sharing | Works via `$page.url.searchParams` | Works via `window.location.search` + `$state` — trivial |
| Dev experience | Heavier; SSR errors confusing for a pure client app | Lighter; errors are always in the browser where the audio lives |
| Exit cost if requirements change | Migration to plain Vite is painful | Migration *to* SvelteKit is straightforward if you later need routes |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **`svelte-gestures`** | 5.2.x | Pointer-event-based drag / pan / pinch as Svelte actions | Primary drag handler for formant dots on F1/F2 chart and harmonic markers on the piano. Tiny (~3 KB gzipped), pointer-events native, works on tablet. Integrates as `use:drag` action — feels native in Svelte. |
| **`d3-scale`** (cherry-picked from `d3` 7.9.x) | 7.9.x | Linear / log / log2 scales for pixel ↔ Hz ↔ semitone mapping | Essential for the F1/F2 chart (typically log-scale), piano axis (linear in semitones), formant range overlays. **Do not install all of `d3`** — pull only the modules you need. |
| **`d3-shape`** (optional) | 3.x | Path generators for range polygons, vowel region outlines | Use *only* if you need SVG area/line paths for vowel regions. For most plots, manual path strings are fewer dependencies and less mystery. |
| **`klatt-syn`** | 1.0.x | Reference Klatt cascade-parallel formant synthesizer (TS) | **Read the source** to learn the reference algorithms (Klatt 1980 cascade/parallel). Do not use at runtime in an AudioWorklet as-is — it's designed for offline synthesis, not sample-accurate real-time. Use it to bootstrap your own worklet. |
| **`@types/audioworklet`** | 0.0.97 | TypeScript types for `AudioWorkletProcessor`, `registerProcessor` | Required to write worklet processors in TS without `@ts-ignore` everywhere. |
### Audio Engine Building Blocks (native Web Audio, no library)
| Node | Purpose | Notes |
|------|---------|-------|
| **Custom `AudioWorkletNode`** | Glottal pulse generator (LF / Rosenberg / KLGLOTT88) | Implement in TS, compile with Vite `?worker&url`. Pre-allocate all buffers in constructor. See gotchas. |
| **`BiquadFilterNode` (type `bandpass` or `peaking`)** | Individual formant resonators F1–F4 | Cheap, native, de-zippered parameter changes via `setTargetAtTime`. Use **parallel** topology for formants (see rationale). |
| **`IIRFilterNode`** | Alternative for fixed formant coefficients | Use only if you need a filter shape biquad can't produce; no parameter automation. |
| **`GainNode`** | Per-formant amplitude, master volume, vibrato LFO depth | Use `setTargetAtTime` for smooth parameter changes — avoids zipper noise. |
| **`OscillatorNode`** (sine) | Vibrato LFO driving frequency `AudioParam`s | Connect via `.connect(target.detune)` for free FM. |
| **`AnalyserNode`** | Spectrum / waveform visualization feed | For a "what you're hearing" scope view. |
### Visualization: Canvas vs SVG
| View | Medium | Why |
|------|--------|-----|
| **F1/F2 vowel chart** (drag target, few elements) | **SVG with Svelte components** | Vowel region polygons, labeled axes, draggable dots — SVG is declarative, accessible, hit-testable by the browser, and Svelte's reactive model makes it trivial. Performance is fine for <200 elements at 60fps. |
| **Piano keyboard with harmonics** | **SVG** | Mostly static geometry (keys), with a handful of moving markers for harmonics. No Canvas win. |
| **Formant range overlays** | **SVG `<polygon>`** | Static or slowly-changing shapes. Reactive `$derived` for vertices. |
| **Live spectrum / spectrogram** (if added) | **Canvas 2D** | Pixel-pushing 60fps, 512+ bins — SVG chokes here. Use `svelte-canvas` **or** a plain `<canvas bind:this>` + `requestAnimationFrame`. |
| **Waveform scope** (if added) | **Canvas 2D** | Same reason. |
| Library | Why not |
|---------|---------|
| **Chart.js / ECharts / Plotly** | Dashboard libraries. Wrong abstraction for a custom scientific UI where every pixel is bespoke. Huge bundle. |
| **LayerCake** (10.0.x) | Excellent for publication-style D3-in-Svelte bar/line charts. Overkill for our case — we don't want "charts," we want a vowel diagram and a piano. Adds a framework layer with no payoff. |
| **SveltePlot** (0.14.x, 2025) | Observable Plot in Svelte. Same story as LayerCake — beautiful for statistical charts, wrong abstraction for direct-manipulation custom UI. |
| **Full `d3` (7.9.x)** as UI lib | Manipulates the DOM imperatively. Do not mix with Svelte. **Do** cherry-pick `d3-scale` / `d3-shape` / `d3-interpolate` as pure math helpers. |
### Gestures
- Uses Pointer Events under the hood → mouse, touch, stylus all work with one code path
- ~3 KB gzipped, tree-shakable (import only `drag`, `pinch`, etc.)
- Svelte action API (`<circle use:drag={handler}>`) — idiomatic
- Actively maintained; v5 is rewritten on Svelte 5 attachments
| Alternative | Verdict |
|-------------|---------|
| **`@use-gesture/vanilla`** (10.3.x, pmndrs) | Platform-agnostic since v10, works in vanilla JS. But designed around React's hook ergonomics; integration in Svelte means writing wrapper actions anyway. Choose only if you need complex gesture coordination (pinch + rotate + drag simultaneously) — overkill here. |
| **Custom Pointer Events** | Tempting for minimal dependencies. Gotcha: you must set `touch-action: none` on draggable elements (otherwise touch-scroll cancels your pointer stream), and you'll reimplement the "capture pointer on pointerdown, release on pointerup, handle pointercancel" dance. `svelte-gestures` is 3 KB and already got this right. Reach for custom only if it needs to be *zero* dependencies. |
### Voice-Synth Reference Implementations (study, don't depend on)
| Project | What it gives you | Caveats |
|---------|-------------------|---------|
| **`klatt-syn`** (chdh, TS) — [github.com/chdh/klatt-syn](https://github.com/chdh/klatt-syn) | Klatt 1980 cascade-parallel formant synth, clean TS, well-commented. Reference for parallel formant topology, glottal pulse shapes, aspiration noise. | Designed as a single-shot renderer (generates a whole buffer). You'll adapt the per-sample inner loop for the worklet's 128-sample process() method. |
| **Pink Trombone** (Neil Thapen, forks by zakaton/yonatanrozin) — [github.com/yonatanrozin/Modular-Pink-Trombone](https://github.com/yonatanrozin/Modular-Pink-Trombone) | Physical-modeling vocal tract (Kelly-Lochbaum waveguide) + AudioWorklet port. Shows *how* to structure a real-time voice worklet in modern Web Audio. | Physical modeling is a completely different approach from formant synthesis. Study the worklet plumbing (message passing, parameter smoothing), ignore the vocal tract math. |
| **`meSing.js`** (usdivad) — [github.com/usdivad/mesing](https://github.com/usdivad/mesing) | JavaScript singing synthesis using Web Audio + meSpeak.js. | Older ScriptProcessorNode era, not AudioWorklet. Reference only. |
| **Madde** (Svante Granqvist, KTH) | The gold-standard reference the user is targeting. Native-only, no source available. | Read the papers (Granqvist, "New technology for teaching voice science"), not the code. |
### Glottal Pulse Models — Pick One to Start
### DSP Math Helpers
| Need | Recommendation |
|------|----------------|
| **Scales & interpolation** (Hz↔semitone, log F1/F2, color ramps) | `d3-scale` + `d3-interpolate` (cherry-picked, ~5 KB). |
| **FFT** (for analyzer/spectrogram) | **`AnalyserNode.getFloatFrequencyData()`** — built into Web Audio, free. Do not add a JS FFT lib unless you need FFT *inside* the worklet (which you probably don't for this app). |
| **Biquad coefficient computation** (if rolling custom IIR) | Inline the Audio EQ Cookbook formulas (Robert Bristow-Johnson) — ~30 lines of TS. No lib needed. |
| **Envelope generation** (attack/release on vibrato, gain) | `GainNode.gain.setTargetAtTime()` — native, sample-accurate. No lib needed. |
### Vowel Formant Data
- **Peterson & Barney (1952)** — 76 speakers, F0/F1/F2/F3 for 10 vowels. Canonical reference. Data is in the paper; `phonTools` R package has it as `pb52`. Reformat to JSON (~50 KB).
- **Hillenbrand et al. (1995)** — 139 speakers, more vowels, more modern. Data at http://homepages.wmich.edu/~hillenbr/voweldata.html (plain text). `phonTools::h95`. Reformat to JSON (~200 KB).
- **IPA vowel canonical positions** — derive from either dataset's centroid per vowel, or use the standard IPA vowel chart values from Ladefoged & Johnson.
### Development Tools
| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| **Vitest** | 4.1.x | Unit tests for DSP math, scales, preset encoding | Native Vite integration = test config is free. Use Vitest Browser Mode (Playwright provider) for anything that touches `AudioContext`. |
| **Playwright** | 1.59.x | E2E tests via Vitest Browser Mode + cross-browser audio smoke tests | Use the `vitest` Playwright provider (`vitest.config` → `browser.provider: 'playwright'`). One binary drives everything. Audio tests run against real `AudioContext` — mocking AudioWorklet is painful and not worth it. |
| **`svelte-check`** | 4.4.x | TS + Svelte type checking | Run in CI and watch mode. |
| **Prettier** | 3.8.x + `prettier-plugin-svelte` | Formatting | Stock config. |
| **ESLint** | 10.2.x + `eslint-plugin-svelte` 3.17.x | Linting | Svelte 5 runes support is in `eslint-plugin-svelte` v3+. |
- **Unit (Vitest, Node env):** Pure math — scale conversions, biquad coefficient calculations, LF/Rosenberg pulse shapes (compare against golden arrays), preset URL encoding/decoding.
- **Component (Vitest Browser Mode, Playwright provider):** Svelte components that don't need audio — the F1/F2 chart rendering with stub state, the piano keyboard visuals, preset panels.
- **Integration (Playwright):** Real browser, real `AudioContext`. Smoke test: "click start, check `AudioContext.state === 'running'`, move a slider, check no console errors, take a screenshot." Do *not* try to assert on actual audio output — cross-browser determinism is hopeless.
- **AudioWorklet unit testing:** Skip it. Refactor DSP into **plain functions** (pure `(sampleRate, state, params) => nextSample`) that the worklet wraps. Test those plain functions in Node with Vitest. The worklet itself becomes a 30-line harness that's easier to eyeball than to test.
### Deployment: Static Hosting
| Host | Pros | Cons | Pick if |
|------|------|------|---------|
| **GitHub Pages** | Free, zero vendor signup, deploy via GitHub Actions, source-of-truth is your repo | 100 GB/month bandwidth (plenty), no header customization without workarounds | **Default choice.** Matches the "single-dev, open project, no infra" vibe. |
| **Cloudflare Pages** | Fast global CDN, generous free tier, custom headers via `_headers` file, branch previews | Another account to manage | Pick if you need custom response headers (see COOP/COEP note below). |
| **Netlify** | Excellent DX, branch previews, `_headers` file | Free tier has build-minute limits that can bite | Reasonable alternative to Cloudflare. |
| **Vercel** | Smooth DX | Oriented toward SSR / serverless you don't need | Overkill. |
- **GitHub Pages cannot set these headers natively.** Workarounds: the `coi-serviceworker` polyfill (injects a service worker that re-serves everything with the right headers) — ugly but works.
- **Cloudflare Pages / Netlify / Vercel can all set them** via a `_headers` file.
## Installation
# Scaffold (no SvelteKit)
# Core (most will already be installed by the template; lock to these versions)
# Svelte integration for Vite
# Gestures and DSP helpers
# Type defs for AudioWorklet globals
# Reference-only (optional, for studying the algorithms)
# Testing
# Lint + format
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
## Stack Patterns by Variant
- Plain Svelte + Vite, as specified. Minimum deps, fastest iteration.
- Migrate to SvelteKit + adapter-static. Move existing app to `src/routes/+page.svelte` with `export const ssr = false; export const prerender = false`. Prerender the docs pages normally.
- Move deployment to Cloudflare Pages or Netlify (both support `_headers`).
- Set COOP/COEP.
- Use a `SharedArrayBuffer` + Atomics ring buffer between main and worklet. Reference: Loke.dev "Stop Allocating Inside the AudioWorkletProcessor."
- Option A: Pre-compute a waveform library (LF pulses for a grid of Ra/Rk values) at startup, interpolate at runtime — no live implicit-equation solving.
- Option B: Compile a C/C++ LF implementation to WASM, call from worklet via `importScripts`. Adds toolchain overhead; defer until profiled.
## AudioWorklet Gotchas (Influences Stack Choices)
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
## Sources
- **Official docs (HIGH confidence):**
- **Reference implementations (HIGH confidence — source code verified to exist):**
- **DSP theory (HIGH confidence):**
- **Performance notes (HIGH confidence):**
- **Vowel data (HIGH confidence on sources; MEDIUM on "no npm package exists"):**
- **Svelte data viz ecosystem (MEDIUM confidence — blog posts and community convergence):**
- **Madde reference (LOW confidence — single source, old):**
- **Version verification:** Current npm registry values fetched 2026-04-11 via `npm view`. All versions in tables reflect the latest stable at that time.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
