# Phase 1: Audio Closed Loop - Research

**Researched:** 2026-04-12
**Domain:** Web Audio API + AudioWorklet DSP, Svelte 5 reactive state, formant synthesis
**Confidence:** HIGH

## Summary

Phase 1 establishes the entire audio pipeline: a Svelte 5 `$state` store holding all voice parameters, an AudioWorklet generating a Rosenberg-style glottal pulse, four parallel BiquadFilterNode formant resonators (F1-F4), and an AudioBridge that forwards state changes to Web Audio params via `setTargetAtTime`. The project is greenfield -- no code exists yet, so this phase also includes Vite project scaffolding.

The core technical risks are: (1) getting the AudioWorklet loaded correctly in Vite with TypeScript, (2) the Rosenberg glottal pulse producing a recognizable vowel-like sound when fed through parallel bandpass formants, and (3) smooth parameter automation without zipper noise. All three are well-understood problems with documented solutions.

**Primary recommendation:** Scaffold a plain Svelte 5 + Vite project, implement the glottal source as a pure function tested in Vitest, wrap it in an AudioWorklet processor, connect four parallel BiquadFilterNodes for F1-F4, and wire the Svelte `$state` store to the audio graph via an AudioBridge class that uses `setTargetAtTime` for all parameter changes.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Default voice is male modal /a/ at ~120 Hz f0 with formants F1~730, F2~1090, F3~2440, F4~3300 Hz
- **D-02:** Glottal source includes light aspiration noise mixed in from Phase 1 (not deferred to Phase 2) for a more natural quality
- **D-03:** Primary control is a combined F1+F2 vowel-axis slider that interpolates between /a/ and /i/ vowel targets -- proves the full store-to-filter path with a dramatic, immediately audible timbral change
- **D-04:** A volume/gain slider is included alongside the vowel slider (trivial GainNode.gain implementation)
- **D-05:** Play/pause toggle button with media-player-style semantics -- familiar interaction pattern
- **D-06:** Audio context resumes on first user gesture per Web Audio API requirements (AUDIO-08)
- **D-07:** All four formants F1-F4 active from Phase 1 -- F3/F4 add the head-resonance quality that makes it sound like a voice rather than a synthetic tone
- **D-08:** Parallel filter topology -- each formant is an independent BiquadFilterNode with outputs summed, matching the Klatt parallel branch. Individual formant gains are independently controllable

### Claude's Discretion
- Phase 1 minimal UI layout (centered card, toolbar, or other arrangement)
- Exact bandwidth defaults for F1-F4
- Aspiration noise level and implementation details
- Vowel interpolation curve (linear vs perceptual)
- Smoothing time constants for `setTargetAtTime`
- AudioWorklet processor file organization

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUDIO-01 | Glottal pulse source generates continuous audio via AudioWorklet, starting from a Rosenberg-style model | Rosenberg C pulse formula documented; AudioWorklet TypeScript pattern with Vite verified |
| AUDIO-03 | Formant filter chain with F1-F4 tunable by center frequency and bandwidth | BiquadFilterNode bandpass type; Q = f/BW conversion; parallel topology pattern documented |
| AUDIO-06 | All continuous parameters smooth over time -- no zipper/click artifacts | `setTargetAtTime` on all AudioParam properties; time constant recommendations documented |
| AUDIO-08 | Audio engine works in Chromium, Firefox, Safari with correct AudioContext resume on gesture | Resume-on-gesture pattern documented; cross-browser AudioWorklet support confirmed |
| LINK-02 | All views read from a single source-of-truth state store; no view maintains its own copy | Svelte 5 `$state` class pattern in `.svelte.ts` files documented |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tech stack:** Svelte 5 + TypeScript, plain Vite (NOT SvelteKit)
- **Audio engine:** Web Audio API with AudioWorklet -- no Tone.js, no ScriptProcessorNode
- **Glottal model:** Rosenberg-style for v1 (LF model deferred to v2)
- **Formant filters:** Native BiquadFilterNode (custom IIR deferred to v2)
- **Parameter passing:** postMessage (NOT SharedArrayBuffer for v1)
- **Visualization:** SVG for most views, Canvas for pixel-pushing (Phase 3+)
- **Testing:** Vitest for unit tests, Playwright for browser integration
- **Do NOT use:** SvelteKit, Tone.js, ScriptProcessorNode, full d3, Chart.js/ECharts/Plotly, Konva, Jest
- **Formant data:** Embed as JSON, do not fetch at runtime

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Svelte | 5.55.3 | UI framework | Runes ($state, $derived, $effect) fit linked audio+visual updates [VERIFIED: npm registry] |
| TypeScript | 6.0.2 | Type safety | Strict mode catches Float32Array vs number[] mismatches [VERIFIED: npm registry] |
| Vite | 8.0.8 | Dev server + bundler | Fast HMR, handles AudioWorklet URL imports [VERIFIED: npm registry] |
| @sveltejs/vite-plugin-svelte | 7.0.0 | Svelte integration for Vite | Official plugin for plain Svelte + Vite setup [VERIFIED: npm registry] |

### Supporting (Phase 1 only)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/audioworklet | 0.0.97 | TS types for AudioWorkletProcessor | Required for writing worklet processors in TypeScript [VERIFIED: npm registry] |

### Not Needed in Phase 1
| Library | Why Deferred |
|---------|-------------|
| svelte-gestures | No drag targets yet -- Phase 3 (vowel chart) |
| d3-scale | No visualization axes -- Phase 3 |
| klatt-syn | Reference only -- read source for algorithm study, not a runtime dep |

**Installation (Phase 1 scaffold):**
```bash
npm create vite@latest formant-canvas -- --template svelte-ts
cd formant-canvas
npm install
npm install -D @types/audioworklet
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    audio/
      state.svelte.ts       # VoiceParams $state class (single source of truth)
      bridge.ts              # AudioBridge: state -> Web Audio param forwarding
      worklet/
        glottal-processor.ts # AudioWorkletProcessor (Rosenberg + aspiration)
      dsp/
        rosenberg.ts         # Pure function: generate one glottal pulse sample
        noise.ts             # Pure function: white noise for aspiration
    types.ts                 # Shared type definitions
  App.svelte                 # Minimal UI: play/pause, vowel slider, gain slider
  main.ts                    # App entry point
  vite-env.d.ts              # Vite type augmentations
```

### Pattern 1: Svelte 5 $state Class for Voice Parameters

**What:** A class with `$state` fields in a `.svelte.ts` file serves as the single source of truth for all audio parameters. Components read/write these fields; the AudioBridge observes changes via `$effect`.

**Why:** Cannot directly export reassignable `$state` from `.svelte.ts` files. A class with reactive fields is the idiomatic Svelte 5 pattern for shared state. [CITED: svelte.dev/docs/svelte/$state]

**Example:**
```typescript
// src/lib/audio/state.svelte.ts
export class VoiceParams {
  // Source
  f0 = $state(120);           // Hz, fundamental frequency
  aspirationLevel = $state(0.03); // 0-1, aspiration noise mix

  // Formants (parallel topology)
  f1Freq = $state(730);       // Hz
  f1BW = $state(90);          // Hz bandwidth
  f1Gain = $state(1.0);       // linear
  f2Freq = $state(1090);
  f2BW = $state(110);
  f2Gain = $state(1.0);
  f3Freq = $state(2440);
  f3BW = $state(170);
  f3Gain = $state(1.0);
  f4Freq = $state(3300);
  f4BW = $state(320);
  f4Gain = $state(1.0);

  // Master
  masterGain = $state(0.5);   // 0-1
  playing = $state(false);
}

// Singleton instance
export const voiceParams = new VoiceParams();
```

**Critical:** This is a plain Svelte app (no SSR), so a module-level singleton is safe -- no server-side state-bleeding concern. [CITED: mainmatter.com/blog/2025/03/11/global-state-in-svelte-5/]

### Pattern 2: AudioBridge (State -> Web Audio Forwarding)

**What:** A bridge class owns the AudioContext and Web Audio node graph. It uses `$effect` to observe VoiceParams changes and forwards them to AudioParam values via `setTargetAtTime`.

**Example:**
```typescript
// src/lib/audio/bridge.ts
import { voiceParams } from './state.svelte.ts';

export class AudioBridge {
  private ctx: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private formants: BiquadFilterNode[] = [];
  private formantGains: GainNode[] = [];
  private masterGain: GainNode | null = null;
  private sumGain: GainNode | null = null;

  async init() {
    this.ctx = new AudioContext();
    // Load worklet
    const workletUrl = new URL('./worklet/glottal-processor.ts', import.meta.url);
    await this.ctx.audioWorklet.addModule(workletUrl);
    // Build graph...
  }

  // Called from $effect in a Svelte component
  syncParams() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const tau = 0.02; // 20ms smoothing time constant

    // Forward formant frequencies
    this.formants[0].frequency.setTargetAtTime(voiceParams.f1Freq, t, tau);
    this.formants[0].Q.setTargetAtTime(
      voiceParams.f1Freq / voiceParams.f1BW, t, tau
    );
    // ... etc for F2, F3, F4, gains, master
  }
}
```

### Pattern 3: AudioWorklet Processor with postMessage

**What:** The worklet processor generates glottal samples. Parameters (f0, aspiration level) arrive via `port.postMessage` from the main thread. The DSP math lives in a pure function that the worklet calls.

**Example:**
```typescript
// src/lib/audio/worklet/glottal-processor.ts
class GlottalProcessor extends AudioWorkletProcessor {
  private phase = 0;
  private f0 = 120;
  private aspirationLevel = 0.03;

  constructor() {
    super();
    this.port.onmessage = (e: MessageEvent) => {
      if (e.data.f0 !== undefined) this.f0 = e.data.f0;
      if (e.data.aspirationLevel !== undefined)
        this.aspirationLevel = e.data.aspirationLevel;
    };
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const output = outputs[0][0];
    for (let i = 0; i < output.length; i++) {
      const sample = rosenbergSample(this.phase, this.f0, sampleRate);
      const noise = (Math.random() * 2 - 1) * this.aspirationLevel;
      output[i] = sample + noise;
      this.phase += this.f0 / sampleRate;
      if (this.phase >= 1.0) this.phase -= 1.0;
    }
    return true;
  }
}

registerProcessor('glottal-processor', GlottalProcessor);
```

### Pattern 4: Parallel Formant Topology (Web Audio Graph)

**What:** Four BiquadFilterNodes (type: "bandpass"), each receiving the glottal source, with outputs summed through a GainNode. This matches the Klatt parallel branch. Each formant has an independent GainNode for amplitude control.

**Graph:**
```
                     +--> BiquadF1 --> GainF1 --+
                     |                          |
GlottalWorklet  -----+--> BiquadF2 --> GainF2 --+--> SumGain --> MasterGain --> destination
                     |                          |
                     +--> BiquadF3 --> GainF3 --+
                     |                          |
                     +--> BiquadF4 --> GainF4 --+
```

**Why parallel, not cascade:** In cascade (series), each filter colors the output of the previous one -- F2's shape depends on F1. In parallel, each formant is independent, making parameter changes predictable and matching the Klatt parallel model. Individual formant gains are directly controllable. [ASSUMED -- based on Klatt 1980 parallel branch description]

### Anti-Patterns to Avoid
- **Component-local audio state:** Never let a slider component own its own `$state` for a frequency. All audio params live in the shared VoiceParams class.
- **Direct AudioParam.value assignment:** Always use `setTargetAtTime` to avoid clicks/zipper noise. Direct `.value =` causes discontinuities.
- **Calling new AudioContext() on page load:** Must wait for user gesture. The AudioContext should be created or resumed inside a click/tap handler.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Formant resonators | Custom IIR filter in worklet | Native `BiquadFilterNode` (bandpass) | Browser-optimized, de-zippered `setTargetAtTime`, zero code [CITED: developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode] |
| Parameter smoothing | Custom exponential smoother | `AudioParam.setTargetAtTime()` | Built into every AudioParam; sample-accurate, runs off main thread [CITED: MDN AudioParam docs] |
| Gain control | Manual amplitude multiplication | `GainNode` | Native, automatable, de-zippered |
| White noise | Custom LFSR/generator in main thread | `Math.random()` in worklet process() | Good enough for aspiration noise at this stage |

## Common Pitfalls

### Pitfall 1: AudioContext Not Resuming
**What goes wrong:** Audio silence on page load; no error in console.
**Why it happens:** Browsers require a user gesture before `AudioContext` can run. Chrome/Firefox create it in "suspended" state.
**How to avoid:** Always call `audioContext.resume()` inside a click/tap handler. Check `audioContext.state` and only build the graph after resume succeeds.
**Warning signs:** `audioContext.state === 'suspended'` persisting after UI interaction. [CITED: developer.chrome.com/blog/audio-worklet]

### Pitfall 2: AudioWorklet TypeScript Not Transpiled by Vite
**What goes wrong:** `SyntaxError` in the browser when loading the worklet -- Vite served raw `.ts` to `addModule()`.
**Why it happens:** The `?url` import suffix does NOT trigger TypeScript transpilation in Vite. The `new URL('./file.ts', import.meta.url)` pattern is needed for proper handling.
**How to avoid:** Use `new URL('./worklet/glottal-processor.ts', import.meta.url)` -- Vite's `new URL` pattern correctly bundles and transpiles. If this still fails, use a `.js` worklet file or the `vite-plugin-worker` package.
**Warning signs:** TypeScript syntax visible in browser devtools network tab for the worklet file. [CITED: github.com/vitejs/vite/issues/9952]

### Pitfall 3: Zipper Noise from Direct AudioParam Assignment
**What goes wrong:** Audible clicks or stepping artifacts when moving a slider.
**Why it happens:** Setting `param.value = x` causes an instantaneous jump. At audio rates, this creates a discontinuity.
**How to avoid:** Always use `param.setTargetAtTime(value, ctx.currentTime, timeConstant)`. A time constant of 0.01-0.05 seconds works well for formant changes. For the vowel slider (which changes multiple params simultaneously), use the same `currentTime` for all calls so they arrive together.
**Warning signs:** Audible artifacts when moving sliders quickly. [CITED: MDN AudioParam.setTargetAtTime docs]

### Pitfall 4: Q-to-Bandwidth Mapping Wrong
**What goes wrong:** Formant sounds too narrow or too wide despite correct frequency.
**Why it happens:** `BiquadFilterNode` bandpass uses Q (quality factor), not bandwidth in Hz. The relationship is `Q = centerFreq / bandwidthHz`.
**How to avoid:** Convert: `biquad.Q.setTargetAtTime(formantFreq / formantBandwidthHz, t, tau)`. Typical formant bandwidths: F1~60-100 Hz, F2~80-120 Hz, F3~120-180 Hz, F4~200-350 Hz.
**Warning signs:** A formant at 730 Hz with BW=90 Hz needs Q = 730/90 = ~8.1, not Q=90. [CITED: webaudio.github.io/Audio-EQ-Cookbook/audio-eq-cookbook.html]

### Pitfall 5: AudioWorklet process() Returning False
**What goes wrong:** Audio stops after a short time.
**Why it happens:** If `process()` returns `false`, the browser removes the worklet node. For continuous synthesis, always return `true`.
**How to avoid:** Ensure `process()` always returns `true` for a continuously playing source.
**Warning signs:** Audio plays briefly then cuts out silently.

### Pitfall 6: Forgetting touch-action on Sliders
**What goes wrong:** On touch devices, dragging a slider causes page scroll instead of parameter change.
**Why it happens:** Default browser touch handling intercepts the gesture.
**How to avoid:** Add `touch-action: none` CSS on slider elements.
**Warning signs:** Works with mouse, broken on tablet/touch.

## Code Examples

### Rosenberg C Glottal Pulse (Pure Function)

The Rosenberg C model generates a glottal volume velocity waveform with two phases:
- **Open phase** (0 <= t < Tp): rising sinusoidal half-period
- **Closing phase** (Tp <= t < T0): falling cosine half-period  
- **Closed phase** (t >= T0): zero output

```typescript
// src/lib/audio/dsp/rosenberg.ts
// Source: Rosenberg (1971), Klatt (1980) KLGLOTT88 variant
// [ASSUMED -- formula from training data, cross-referenced with Klatt literature]

/**
 * Generate one sample of a Rosenberg-style glottal pulse.
 * @param phase - Normalized phase within the glottal period [0, 1)
 * @param openQuotient - Fraction of period that glottis is open (0.4-0.7 typical)
 * @returns Glottal volume velocity sample, range approximately [0, 1]
 */
export function rosenbergSample(
  phase: number,
  openQuotient: number = 0.6
): number {
  if (phase < 0 || phase >= 1) return 0;

  // Tp = peak of pulse (typically 40% of open phase)
  // Tn = total open phase duration
  const Tn = openQuotient;      // open quotient as fraction of period
  const Tp = 0.4 * Tn;          // peak at 40% of open phase (speed quotient ~1.5)

  if (phase < Tp) {
    // Rising phase: half sinusoid
    return 0.5 * (1 - Math.cos(Math.PI * phase / Tp));
  } else if (phase < Tn) {
    // Closing phase: cosine fall
    const closingPhase = (phase - Tp) / (Tn - Tp);
    return Math.cos(Math.PI * 0.5 * closingPhase);
  } else {
    // Closed phase
    return 0;
  }
}
```

### Q from Bandwidth Conversion

```typescript
// src/lib/audio/dsp/formant-utils.ts
// [CITED: webaudio.github.io/Audio-EQ-Cookbook/audio-eq-cookbook.html]

/** Convert formant center frequency + bandwidth (Hz) to BiquadFilterNode Q */
export function bandwidthToQ(centerFreq: number, bandwidthHz: number): number {
  return centerFreq / bandwidthHz;
}
```

### AudioContext Resume on Gesture

```typescript
// [CITED: developer.chrome.com/blog/audio-worklet]
async function handlePlayClick(bridge: AudioBridge) {
  if (!bridge.isInitialized()) {
    await bridge.init(); // Creates AudioContext + loads worklet
  }
  if (bridge.context.state === 'suspended') {
    await bridge.context.resume();
  }
  voiceParams.playing = !voiceParams.playing;
}
```

### Vowel Interpolation (/a/ to /i/)

```typescript
// [ASSUMED -- standard formant values from Peterson & Barney 1952]
const VOWEL_A = { f1: 730, f2: 1090, f3: 2440, f4: 3300 };
const VOWEL_I = { f1: 270, f2: 2290, f3: 3010, f4: 3300 };

/** Interpolate formant frequencies between /a/ and /i/
 *  t=0 -> /a/, t=1 -> /i/
 */
function interpolateVowel(t: number) {
  return {
    f1: VOWEL_A.f1 + t * (VOWEL_I.f1 - VOWEL_A.f1),
    f2: VOWEL_A.f2 + t * (VOWEL_I.f2 - VOWEL_A.f2),
    f3: VOWEL_A.f3 + t * (VOWEL_I.f3 - VOWEL_A.f3),
    f4: VOWEL_A.f4 + t * (VOWEL_I.f4 - VOWEL_A.f4),
  };
}
```

### Vite AudioWorklet Loading

```typescript
// [CITED: github.com/vitejs/vite/issues/9952, vite.dev/guide/features]
// Main thread: load the worklet processor
const workletUrl = new URL(
  '../lib/audio/worklet/glottal-processor.ts',
  import.meta.url
);
await audioContext.audioWorklet.addModule(workletUrl);
const workletNode = new AudioWorkletNode(audioContext, 'glottal-processor');
```

**Fallback if Vite TS transpilation fails:** Rename processor to `.js` and keep a separate `tsconfig` that compiles it, or use the `vite-plugin-worker` package.

## Formant Defaults (Claude's Discretion)

Recommended bandwidth defaults for male /a/ at 120 Hz f0:

| Formant | Freq (Hz) | BW (Hz) | Q | Gain |
|---------|-----------|---------|---|------|
| F1 | 730 | 90 | 8.1 | 1.0 |
| F2 | 1090 | 110 | 9.9 | 0.7 |
| F3 | 2440 | 170 | 14.4 | 0.3 |
| F4 | 3300 | 320 | 10.3 | 0.15 |

Bandwidth values are typical for male modal phonation. Higher formants have wider bandwidths. Gains decrease with frequency to approximate the natural spectral envelope rolloff. [ASSUMED -- values from standard formant synthesis literature; exact tuning will happen during implementation]

## Smoothing Time Constants (Claude's Discretion)

| Parameter | Recommended tau | Rationale |
|-----------|----------------|-----------|
| Formant frequency (F1-F4) | 0.02s (20ms) | Fast enough for slider response, slow enough to avoid clicks |
| Formant Q/bandwidth | 0.02s | Match frequency smoothing |
| Formant gain | 0.01s | Slightly faster for responsive volume |
| Master gain | 0.01s | Responsive volume control |
| f0 (via postMessage) | N/A -- smoothing in worklet | postMessage is ~1-5ms latency; add internal smoothing in the worklet at ~10ms |

[ASSUMED -- standard time constants from audio DSP practice]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ScriptProcessorNode | AudioWorklet | 2018+ (Chrome 66) | Off-main-thread processing, 128-sample blocks, no glitches |
| Svelte stores (writable/readable) | Svelte 5 $state runes | 2024 (Svelte 5) | Direct reactive fields, class-based state, no subscribe boilerplate |
| import url with `?url` suffix | `new URL('./file.ts', import.meta.url)` | 2022+ (Vite) | Proper TS transpilation for worklet files |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Rosenberg C pulse formula (half-sine rise, cosine fall, OQ~0.6) | Code Examples | Wrong pulse shape -- sound quality issue, not blocking; easily adjusted |
| A2 | Parallel formant topology matches Klatt parallel branch | Architecture Patterns | If user wanted cascade, wiring is different -- but D-08 locks parallel |
| A3 | Formant bandwidth defaults (F1=90, F2=110, F3=170, F4=320 Hz) | Formant Defaults | Wrong bandwidths affect sound quality; tunable at runtime |
| A4 | Smoothing time constants (20ms formant, 10ms gain) | Smoothing Time Constants | Too slow = laggy; too fast = clicks. Easy to tune. |
| A5 | `new URL('./file.ts', import.meta.url)` works for AudioWorklet in Vite 8 | Pitfalls | If broken, fallback to .js worklet file or vite-plugin-worker |
| A6 | Vowel formant targets for /a/ and /i/ from Peterson & Barney | Code Examples | Wrong targets = wrong vowel sound; easily corrected from literature |

## Open Questions (RESOLVED)

1. **Vite 8 AudioWorklet TS transpilation** (RESOLVED — conditional)
   - What we know: `new URL('./file.ts', import.meta.url)` was the recommended pattern in Vite 5-6. Vite issue #9952 documented `?url` not transpiling TS.
   - Resolution: Plan 01-02 uses `new URL` pattern as primary approach. Task 1 includes an explicit fallback: if Vite 8 does not transpile the .ts worklet file, rename to .js and strip type annotations. Task 2 (AudioBridge) wraps `addModule()` in try/catch to attempt .ts first, then fall back to .js. Either path produces a working worklet. Risk is fully mitigated.

2. **Anti-aliasing glottal pulse at high f0** (RESOLVED — deferred by design)
   - What we know: At f0 > 300 Hz, naive pulse generation can alias.
   - Resolution: Phase 1 uses male modal voice at 120 Hz f0 (per D-01). At this frequency, aliasing is negligible. Band-limited pulse generation is deferred to Phase 2 when female/child voices are added. No action needed for Phase 1.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite dev server, npm | Yes | v25.5.0 | -- |
| npm | Package management | Yes | 11.8.0 | -- |
| Browser (Chromium) | AudioWorklet runtime | Yes (dev machine) | -- | -- |

No missing dependencies. This is a client-side web app; all runtime dependencies are browser-native.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x |
| Config file | None yet -- Wave 0 creates `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUDIO-01 | Rosenberg pulse generates valid samples | unit | `npx vitest run src/lib/audio/dsp/rosenberg.test.ts -t "generates"` | Wave 0 |
| AUDIO-03 | Q-from-bandwidth conversion correct | unit | `npx vitest run src/lib/audio/dsp/formant-utils.test.ts` | Wave 0 |
| AUDIO-06 | setTargetAtTime used (not direct .value) | code review | Manual review of bridge.ts | manual-only |
| AUDIO-08 | AudioContext resumes on gesture | integration | Playwright smoke test | Wave 0 |
| LINK-02 | Single state store, no component copies | code review | Manual review / grep for local $state audio params | manual-only |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` -- project test configuration
- [ ] `src/lib/audio/dsp/rosenberg.test.ts` -- unit tests for pulse generation
- [ ] `src/lib/audio/dsp/formant-utils.test.ts` -- unit tests for Q/BW conversion
- [ ] Scaffold project with `npm create vite@latest` before any tests can run

## Security Domain

This phase has no authentication, session management, access control, cryptography, or network requests. It is a purely client-side audio synthesis app with no user data.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A |
| V3 Session Management | No | N/A |
| V4 Access Control | No | N/A |
| V5 Input Validation | No | Slider values are bounded by HTML range inputs |
| V6 Cryptography | No | N/A |

No security threats for Phase 1. All state is ephemeral and local.

## Sources

### Primary (HIGH confidence)
- [npm registry] -- All package versions verified via `npm view` on 2026-04-12
- [MDN BiquadFilterNode docs](https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode) -- Filter types, Q parameter, AudioParam properties
- [Svelte $state docs](https://svelte.dev/docs/svelte/$state) -- Class field reactivity, .svelte.ts exports
- [Audio EQ Cookbook](https://webaudio.github.io/Audio-EQ-Cookbook/audio-eq-cookbook.html) -- Q-bandwidth relationship for bandpass filters
- [Chrome AudioWorklet blog](https://developer.chrome.com/blog/audio-worklet) -- AudioWorklet patterns, resume on gesture

### Secondary (MEDIUM confidence)
- [Vite issue #9952](https://github.com/vitejs/vite/issues/9952) -- TS transpilation with `?url` suffix not working; `new URL` pattern as workaround
- [Mainmatter Svelte 5 global state](https://mainmatter.com/blog/2025/03/11/global-state-in-svelte-5/) -- Module-level singleton safety without SSR
- [klatt-syn GitHub](https://github.com/chdh/klatt-syn) -- Reference Klatt synthesizer in TypeScript

### Tertiary (LOW confidence)
- Rosenberg pulse formula details -- from training data, not verified against primary paper. Risk is low (formula is simple and well-known).
- Formant bandwidth defaults -- from training data synthesis literature. Will need tuning by ear.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified against npm registry
- Architecture: HIGH -- patterns well-documented in official Svelte/Web Audio docs
- Pitfalls: HIGH -- known issues with documented solutions
- DSP math (Rosenberg): MEDIUM -- formula from training data, not verified against original paper, but simple enough to validate by listening

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable domain, 30 days)
