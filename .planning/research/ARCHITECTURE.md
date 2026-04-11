# Architecture Research

**Domain:** Real-time voice synthesizer + linked visualizations (Svelte + TypeScript + Web Audio API, static web app)
**Researched:** 2026-04-11
**Confidence:** HIGH (Web Audio + Svelte patterns are well-established; DSP choices verified against MDN/Chrome docs)

## TL;DR Recommendation

1. **One source of truth:** a Svelte `$state` store (`voiceState`) holding every audible/visible parameter as plain numbers. UI writes to it, visualizations read from it, and an `AudioBridge` forwards changes to the audio thread.
2. **DSP runs inside a single custom `AudioWorkletProcessor`** (`VoiceProcessor`) for the glottal pulse + formant biquad chain. Formant frequencies, bandwidths, gains, F0, vibrato, and jitter are declared as `AudioParam`s (k-rate is fine for formants; a-rate for F0/vibrato). Non-numeric things (preset IDs, strategy enum, reset) go through `port.postMessage`.
3. **Visualizations run on `requestAnimationFrame`** and read from the *same* `voiceState` store the UI writes to — they never pull data back from the audio thread. This works because the store **is** the audio engine's input, so UI + viz + DSP are all seeing the same parameter snapshot within one microtask.
4. **The "Strategy Engine" is pure functions** (`strategy.ts`) that live on the main thread and rewrite formant targets in the store whenever F0 or the active strategy changes. The audio thread never knows strategies exist — it just sees formants change.
5. **Build order:** State store → Worklet skeleton → UI sliders → Audio bridge (closed loop: slider makes sound) → Visualizations (F1/F2, piano, formant ranges) → Strategy engine → Presets/URL.

This keeps the 60fps viz trivially in sync: there is nothing to sync. The store is authoritative; audio and visuals are both subscribers.

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         UI Layer (Svelte)                            │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌────────────────┐    │
│  │ Sliders  │  │ F1/F2 Chart  │  │ Piano    │  │ Preset Picker  │    │
│  │ (knobs)  │  │ (drag)       │  │ (drag H) │  │ Strategy menu  │    │
│  └────┬─────┘  └──────┬───────┘  └────┬─────┘  └────────┬───────┘    │
│       │ write         │ write         │ write           │ write      │
│       ▼               ▼               ▼                 ▼            │
├──────────────────────────────────────────────────────────────────────┤
│                    State Layer (Svelte $state)                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  voiceState: { f0, vibrato, jitter, formants[4], strategy,...} │  │
│  │  derived:    harmonics[], activeVowelTarget, strategyLocked    │  │
│  └────────┬──────────────────────────┬───────────────────┬────────┘  │
│           │ $effect                  │ $derived          │ $derived  │
│           ▼                          ▼                   ▼           │
│   ┌───────────────┐       ┌──────────────────┐   ┌──────────────┐    │
│   │ AudioBridge   │       │  Strategy Engine │   │ Viz snapshot │    │
│   │ (setTargetAt) │       │  (pure fns)      │   │ (read-only)  │    │
│   └──────┬────────┘       └────────┬─────────┘   └──────┬───────┘    │
│          │                         │ writes back         │          │
│          │                         │ to voiceState       │          │
│          │                         ▼                     │          │
│          │                   voiceState                  │          │
├──────────┼──────────────────────────────────────────────┬─┼──────────┤
│          │                                              │ │          │
│          ▼ AudioParam.setTargetAtTime                    │ ▼ rAF     │
│     (audio thread)                                      (main thread)│
│  ┌─────────────────────────────────────────┐  ┌─────────────────────┐│
│  │ VoiceProcessor (AudioWorklet)           │  │ Visualization Layer ││
│  │  ┌────────────┐ ┌─────────────────┐     │  │  F1/F2, piano,      ││
│  │  │ Glottal    │→│ Formant chain   │→ out│  │  formant ranges,    ││
│  │  │ pulse gen  │ │ (4× biquad BP)  │     │  │  spectrum (opt.)    ││
│  │  └────────────┘ └─────────────────┘     │  └─────────────────────┘│
│  └─────────────────────────────────────────┘                         │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| **State Store** (`src/state/voiceState.svelte.ts`) | Single source of truth for every audible/visible parameter. Plain JS numbers + flags. Exposes typed setters. | Svelte 5 `$state` rune, exported as a module-level class instance (the "Rune Class" pattern) |
| **UI Controls** (`src/ui/controls/*`) | Render sliders/knobs/menus. Write to state store on pointer events. Read from store for display. | Svelte components, no local audio or viz logic |
| **F1/F2 Chart** (`src/ui/viz/VowelChart.svelte`) | Draw vowel space + draggable formant point. Pointer drag writes `formants[0].freq`, `formants[1].freq`. | SVG or Canvas. Subscribes to `$derived(voiceState.formants)`. |
| **Piano / Harmonics** (`src/ui/viz/PianoHarmonics.svelte`) | Draw 88-key piano + harmonics (nF0) + formant peaks overlaid by frequency. Dragging a harmonic = changing F0. | Canvas. Reads `$derived(voiceState.harmonics)` and `formants`. |
| **Formant Range Overlay** (`src/ui/viz/FormantRanges.svelte`) | Show realistic ranges from Peterson-Barney/Hillenbrand tables. | Static data + read-only viz. |
| **Strategy Engine** (`src/domain/strategy.ts`) | Pure functions: `(strategy, f0) → formantTargets`. Also a `$effect` that writes back into `voiceState` when strategy is locked. | TypeScript, zero dependencies. Fully unit-testable. |
| **Audio Bridge** (`src/audio/AudioBridge.ts`) | Owns the `AudioContext`, instantiates the worklet node, and runs a `$effect` that forwards state changes into `AudioParam.setTargetAtTime()` (smooth) and `postMessage` (discrete). | Class, lifecycle tied to a "start audio" user gesture. |
| **VoiceProcessor** (`src/audio/worklets/voice-processor.ts`) | The DSP. Reads its own `AudioParam`s each block, runs glottal pulse gen, feeds a 4-biquad bandpass chain, outputs samples. No knowledge of UI, strategies, vowels, or presets. | `AudioWorkletProcessor` subclass. Registered via `audioWorklet.addModule()`. |
| **Preset System** (`src/domain/presets.ts`) | Named snapshots of `voiceState`. Load = `Object.assign(voiceState, preset)`. URL serialization via compact schema. | Pure data + `URLSearchParams` or base64url. |

### Why this split works

The critical insight: **UI, visualization, and audio are three *subscribers* to the same store.** None of them talks to each other. There is no "pull data back from audio for viz" problem because the viz never wanted audio's data — it wanted the *same parameters* audio is consuming, which are already in the store.

## Recommended Project Structure

```
src/
├── state/
│   ├── voiceState.svelte.ts      # $state rune class — single source of truth
│   ├── derived.svelte.ts         # $derived: harmonics, vowel target, etc.
│   └── schema.ts                 # TypeScript types + default values
├── audio/
│   ├── AudioBridge.ts            # AudioContext + worklet lifecycle + state→param $effect
│   ├── worklets/
│   │   ├── voice-processor.ts    # The AudioWorkletProcessor (compiled separately)
│   │   ├── glottal.ts            # Glottal pulse generator (LF or Rosenberg)
│   │   └── biquad-chain.ts       # 4× bandpass biquad
│   └── index.ts                  # Public API: startAudio(), stopAudio()
├── domain/
│   ├── strategy.ts               # Pure: (strategy, f0) → formant targets. R1:2f, R1:f, ...
│   ├── presets.ts                # Named presets + load/save
│   ├── vowels.ts                 # Peterson-Barney / Hillenbrand tables
│   ├── harmonics.ts              # f0 → harmonic frequencies
│   └── url.ts                    # URL encode/decode state
├── ui/
│   ├── App.svelte
│   ├── controls/                 # Sliders, knobs, menus — dumb widgets
│   │   ├── Slider.svelte
│   │   ├── FormantSliders.svelte
│   │   └── StrategyPicker.svelte
│   └── viz/                      # Visualization components
│       ├── VowelChart.svelte     # F1/F2 diagram with drag
│       ├── PianoHarmonics.svelte # Piano + harmonics + formant peaks
│       ├── FormantRanges.svelte  # Realistic formant range overlay
│       └── useRaf.svelte.ts      # rAF hook for Canvas-based viz
├── lib/
│   ├── dsp/                      # Pure DSP math, reusable in tests
│   │   ├── biquad.ts             # RBJ cookbook coefficients
│   │   └── glottal.ts            # Same pulse gen as worklet, pure
│   └── math.ts
└── main.ts                        # Bootstraps App, attaches to #app
```

### Structure Rationale

- **`state/` at the top** (not under `ui/`): because audio and visuals are peer consumers of state. Putting state under UI would imply UI ownership, which is wrong.
- **`audio/worklets/` is a separate build target:** Vite's `?worker` / `?url` imports for AudioWorklet files — the worklet cannot share Svelte/DOM code. Keep it ruthlessly self-contained.
- **`domain/` holds everything that isn't rendering or DSP:** strategies, presets, vowel tables, URL codec. All pure TS, all unit-testable without a browser.
- **`lib/dsp/` duplicates math that the worklet also uses:** the worklet can import `lib/dsp/biquad.ts` (pure TS, no DOM). This gives you a single source of truth for coefficient math and lets you test it in Vitest without spinning up an `AudioContext`.
- **`ui/controls/` vs `ui/viz/`:** controls write, viz reads. Hard-enforce this split — if a viz component needs to write, it's because it's a direct-manipulation viz (like dragging a formant), which is fine, but the write goes to the store, not to the audio bridge.

## Architectural Patterns

### Pattern 1: Store-as-single-source-of-truth (Svelte 5 Rune Class)

**What:** One module-level class instance holds all reactive state as `$state` fields. UI, audio, and viz all import it and read/write directly. No events, no reducers, no Redux.

**When to use:** Small-to-medium apps (single dev, one window, no server sync) where the overhead of action/reducer plumbing exceeds the benefit.

**Trade-offs:**
- ✅ Dead-simple mental model; every subscriber sees the same thing.
- ✅ Svelte 5's fine-grained reactivity means only affected components re-render.
- ✅ Works across `.svelte` and `.ts` files via `.svelte.ts` extension.
- ❌ No history/undo out of the box (add a ring buffer if needed).
- ❌ Easy to end up with one giant god-store; discipline the schema and use `$derived` aggressively.

**Example:**
```ts
// state/voiceState.svelte.ts
class VoiceState {
  f0 = $state(220);
  vibratoRate = $state(5.5);
  vibratoDepth = $state(0.02);
  jitter = $state(0.005);
  formants = $state([
    { freq: 700, bw: 80,  gain: 0 },
    { freq: 1220, bw: 90, gain: 0 },
    { freq: 2600, bw: 120, gain: 0 },
    { freq: 3300, bw: 200, gain: -6 },
  ]);
  strategy = $state<StrategyId>('none');
  strategyLocked = $state(false);

  // derived (automatically recomputed)
  harmonics = $derived.by(() =>
    Array.from({ length: 16 }, (_, i) => this.f0 * (i + 1))
  );
}

export const voiceState = new VoiceState();
```

### Pattern 2: `AudioParam` for smooth automation, `postMessage` for discrete events

**What:** Every continuous DSP parameter is declared as an `AudioParam` in `parameterDescriptors` so the bridge can call `setTargetAtTime()` for zipper-free smoothing. Non-numeric or event-like things (preset load, voice type switch, reset pulse phase) go through `node.port.postMessage()`.

**When to use:** Any custom AudioWorklet with parameters that change from the UI.

**Trade-offs:**
- ✅ `setTargetAtTime()` gives you free de-zippering; no manual smoothing in the worklet.
- ✅ Sample-accurate (a-rate) or block-accurate (k-rate) — pick per parameter. Formant freqs: k-rate is plenty (128 samples ≈ 2.7ms at 48k). F0 with vibrato: a-rate for smoothness.
- ✅ No main-thread jank even under GC pressure.
- ❌ `AudioParam` only accepts numbers — strategy enums and presets must use postMessage.
- ❌ You must declare every param up front in `parameterDescriptors` (static).

**Example:**
```ts
// audio/worklets/voice-processor.ts
class VoiceProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'f0',        defaultValue: 220, minValue: 40, maxValue: 1200, automationRate: 'a-rate' },
      { name: 'vibRate',   defaultValue: 5.5, automationRate: 'k-rate' },
      { name: 'vibDepth',  defaultValue: 0.02, automationRate: 'k-rate' },
      { name: 'jitter',    defaultValue: 0.005, automationRate: 'k-rate' },
      ...Array.from({ length: 4 }, (_, i) => [
        { name: `f${i+1}Freq`, defaultValue: [700,1220,2600,3300][i], automationRate: 'k-rate' as const },
        { name: `f${i+1}BW`,   defaultValue: [80,90,120,200][i],     automationRate: 'k-rate' as const },
        { name: `f${i+1}Gain`, defaultValue: 0,                       automationRate: 'k-rate' as const },
      ]).flat(),
    ];
  }
  process(_in: Float32Array[][], out: Float32Array[][], params: Record<string, Float32Array>) {
    // ... read params, run glottal + biquad chain, write out[0][0]
    return true;
  }
}
registerProcessor('voice-processor', VoiceProcessor);
```

```ts
// audio/AudioBridge.ts — the $effect that forwards state changes
$effect(() => {
  const p = this.node.parameters;
  const t = this.ctx.currentTime;
  const ramp = 0.02; // 20ms smoothing
  p.get('f0')!.setTargetAtTime(voiceState.f0, t, ramp);
  voiceState.formants.forEach((f, i) => {
    p.get(`f${i+1}Freq`)!.setTargetAtTime(f.freq, t, ramp);
    p.get(`f${i+1}BW`)!.setTargetAtTime(f.bw, t, ramp);
    p.get(`f${i+1}Gain`)!.setTargetAtTime(f.gain, t, ramp);
  });
});
```

### Pattern 3: rAF-driven viz reading state directly (no audio thread round-trip)

**What:** Each visualization uses `requestAnimationFrame` and reads directly from `voiceState` / its `$derived` fields. It does **not** ask the audio thread for anything. For spectrum/waveform viz (optional), tap an `AnalyserNode` placed after the worklet.

**When to use:** Any viz that shows parameters (F1/F2, piano harmonics, formant ranges). Only use `AnalyserNode` when you need actual audio samples (oscilloscope, spectrum).

**Trade-offs:**
- ✅ Trivially in sync — audio and viz are both reading the same numbers the user just set.
- ✅ 60fps is easy; the viz isn't blocked on `postMessage` or `SharedArrayBuffer`.
- ✅ Works offline, testable in jsdom (for non-Canvas bits).
- ❌ You see the *target* state, not the actual DSP state after smoothing. For F1/F2 this is what you want (teaching tool). For a spectrum you'd want the real thing, hence `AnalyserNode`.

**Example:**
```ts
// ui/viz/useRaf.svelte.ts
export function useRaf(draw: () => void) {
  let raf: number;
  const tick = () => { draw(); raf = requestAnimationFrame(tick); };
  $effect(() => {
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });
}
```
```svelte
<!-- ui/viz/VowelChart.svelte -->
<script lang="ts">
  import { voiceState } from '../../state/voiceState.svelte';
  let canvas: HTMLCanvasElement;
  useRaf(() => {
    const ctx = canvas.getContext('2d')!;
    // read voiceState.formants[0].freq, [1].freq — draw point
  });
</script>
```

### Pattern 4: Direct manipulation = inverse mapping to the store

**What:** When the user drags the formant point on the F1/F2 chart, the pointer handler converts pixel coords → Hz and writes to `voiceState.formants[0].freq` / `formants[1].freq`. The audio bridge's `$effect` then picks that up and ramps the `AudioParam`. Zero other wiring.

**When to use:** Any draggable visualization.

**Trade-offs:**
- ✅ Symmetrical: slider and drag write to the exact same field.
- ✅ Unit-testable in isolation (mock the canvas coords).
- ❌ Be careful with `$state` arrays — mutating `formants[0].freq = x` works because Svelte 5 runes proxy objects, but only if `formants` was declared as `$state` with object members. Verify this on setup.

### Pattern 5: Strategy engine as pure function + reactive effect

**What:** `strategy.ts` exports `strategyTargets(strategy: StrategyId, f0: number): FormantTarget[]` as a pure function. A single `$effect` in the bridge watches `(strategy, strategyLocked, f0)` and, when locked, writes the computed targets back into `voiceState.formants`. That write ripples to audio and viz automatically.

**When to use:** Any "derived write-back" — cases where you need `state → pure function → state`.

**Trade-offs:**
- ✅ Strategy logic is 100% testable without audio or UI.
- ✅ Unlocking strategy is trivial: set `strategyLocked = false`, the effect stops writing, user is free to drag formants again.
- ✅ The F1/F2 chart and piano automatically reflect the new formants because they subscribe to the store.
- ❌ Be careful not to create feedback loops: the effect should read `f0` and `strategy` but only write `formants`. Never read `formants` inside the effect that writes to it.

**Example:**
```ts
// domain/strategy.ts
export type StrategyId = 'none' | 'R1:f' | 'R1:2f' | 'R2:2f' | 'R2:3f';

export function strategyTargets(id: StrategyId, f0: number, base: FormantTarget[]): FormantTarget[] {
  switch (id) {
    case 'R1:f':  return [{ ...base[0], freq: f0      }, base[1], base[2], base[3]];
    case 'R1:2f': return [{ ...base[0], freq: f0 * 2  }, base[1], base[2], base[3]];
    case 'R2:2f': return [base[0], { ...base[1], freq: f0 * 2 }, base[2], base[3]];
    case 'R2:3f': return [base[0], { ...base[1], freq: f0 * 3 }, base[2], base[3]];
    default: return base;
  }
}

// audio/AudioBridge.ts (inside class init)
$effect(() => {
  if (!voiceState.strategyLocked || voiceState.strategy === 'none') return;
  const targets = strategyTargets(voiceState.strategy, voiceState.f0, defaultFormants);
  // Only write fields that changed, to avoid ping-pong
  targets.forEach((t, i) => { voiceState.formants[i].freq = t.freq; });
});
```

### Pattern 6: Test seams — pure DSP + a mockable bridge

**What:**
- Make all DSP math pure (`lib/dsp/biquad.ts`, `lib/dsp/glottal.ts`) and import the same module from the worklet. Test it offline with `OfflineAudioContext` or by driving the pure functions with known inputs.
- Hide `AudioContext` behind an `AudioBridge` interface so tests can swap a `NullBridge` that records commands instead of making sound.
- For visualization snapshot tests, use `@testing-library/svelte` + `canvas-mock` or write the viz to SVG and snapshot the serialized SVG.

**Trade-offs:**
- ✅ Unit tests don't need a real audio device or even a browser.
- ✅ CI-friendly.
- ❌ Requires discipline: never `new AudioContext()` outside the bridge.

## Data Flow

### The canonical slider-change flow

```
User drags F1 slider
    │
    ▼
Slider.svelte onInput handler
    │ writes: voiceState.formants[0].freq = 740
    ▼
voiceState ($state)
    ├──► $effect in AudioBridge fires
    │       └──► node.parameters.get('f1Freq').setTargetAtTime(740, now, 0.02)
    │               └──► VoiceProcessor.process() reads new k-rate value next block (~2.7ms)
    │                       └──► biquad coefficients recomputed, audio output changes
    │
    ├──► $derived(harmonics) — unchanged (f0 didn't change)
    │
    ├──► VowelChart.svelte rAF tick reads formants[0].freq — point moves next frame
    │
    └──► PianoHarmonics.svelte rAF tick reads formants — formant peak overlay moves
```

### The vocal-strategy auto-tune flow (the interesting one)

This is the scenario from the milestone context: "pulling the pitch knob causes formants to track a strategy while also updating the F1/F2 chart AND the harmonics-on-piano display."

```
User drags pitch knob
    │
    ▼
PitchKnob.svelte onInput: voiceState.f0 = 330
    │
    ▼
voiceState.f0 changes ── fans out to every subscriber at once ──┐
    │                                                            │
    ├──► $derived(harmonics) recomputes: [330, 660, 990, ...]   │
    │         │                                                  │
    │         └──► PianoHarmonics rAF redraws harmonic markers  │
    │                                                            │
    ├──► AudioBridge $effect for f0 fires                        │
    │         └──► AudioParam 'f0' setTargetAtTime(330)          │
    │                 └──► glottal pulse gen follows new pitch   │
    │                                                            │
    ├──► StrategyEngine $effect fires (reads f0, strategy)       │
    │         │                                                  │
    │         │ strategy is 'R1:2f' and locked                   │
    │         │                                                  │
    │         └──► voiceState.formants[0].freq = 660 ◄───────────┘
    │                     │
    │                     ├──► AudioBridge $effect fires again
    │                     │       └──► AudioParam 'f1Freq' setTargetAtTime(660)
    │                     │
    │                     ├──► VowelChart rAF redraws: F1 point moves up
    │                     │
    │                     └──► PianoHarmonics rAF redraws: F1 peak now sits on 2nd harmonic
    │
    └──► (viz are already redrawing on rAF, so they just pick up the new values)
```

**Key property:** the strategy effect writes to the store, and the store is what the viz reads. There is no "tell the piano to redraw" — the piano is already polling the store every frame.

**Loop prevention:** the strategy effect reads `f0` and `strategy` but only writes `formants[i].freq`. Svelte 5's `$effect` will re-run when its read dependencies change, so writing to an unread field is safe.

### State management summary

```
  ┌─────────────────────────────┐
  │         voiceState          │◄─────── UI writes (sliders, drag, presets)
  │  (Svelte 5 $state class)    │◄─────── Strategy effect writes back
  └───────────┬─────────────────┘
              │ subscribed via $effect / $derived
   ┌──────────┼──────────┬────────────────┐
   ▼          ▼          ▼                ▼
AudioBridge  Viz (rAF)  Strategy      URL encoder
   │         │          engine         (presets)
   ▼
AudioParams (smooth) + postMessage (discrete)
   │
   ▼
VoiceProcessor (audio thread)
```

### Key Data Flows (summary)

1. **Parameter edit → sound + viz:** UI writes store → (a) AudioBridge effect ramps `AudioParam`s → DSP; (b) viz rAF reads store → repaint.
2. **Preset load:** `Object.assign(voiceState, preset)` → all effects fire once → sound + viz update.
3. **URL share:** on state change (debounced), `url.encode(voiceState)` → `history.replaceState`. On load, `url.decode(location)` → seed store before `AudioBridge` init.
4. **Strategy lock + pitch change:** store → strategy effect → store → audio + viz (see diagram above).
5. **Direct-manipulation drag:** pointer → pixel-to-hz inverse → store write → same flow as a slider edit.

## Build Order (what has to exist before what can be tested end-to-end)

This is the dependency order that gives you a **minimum-viable closed loop** as early as possible — the loop being "move a control, hear a change."

### Phase A — Foundations (offline, no sound yet)
1. **`state/voiceState.svelte.ts`** with all fields + defaults.
2. **`lib/dsp/biquad.ts`** (RBJ cookbook bandpass coefficients). Unit-tested.
3. **`lib/dsp/glottal.ts`** (Rosenberg or LF pulse). Unit-tested against `OfflineAudioContext` reference output.
4. **`domain/strategy.ts`**, **`domain/vowels.ts`**, **`domain/harmonics.ts`**. All pure, all unit-tested.

### Phase B — Audio closed loop (hear it)
5. **`audio/worklets/voice-processor.ts`** — worklet registering with parameterDescriptors, importing `lib/dsp/*`. Just produces sound with hardcoded formants.
6. **`audio/AudioBridge.ts`** — creates `AudioContext`, loads worklet, exposes start/stop.
7. **One slider in App.svelte** wired to `voiceState.f0`, plus the `$effect` forwarding `f0` to the worklet. **At this point: move slider → hear pitch change. Closed loop achieved.**
8. Extend the bridge `$effect` to cover all formants + vibrato + jitter.

### Phase C — Visualization (see it)
9. **Piano + harmonics viz** (simplest: f0 → 16 harmonic markers). Confirms the rAF pattern.
10. **F1/F2 vowel chart** with drag. Second viz, confirms direct manipulation writes to store.
11. **Formant range overlay** (static data).

### Phase D — Linking features
12. **Strategy engine effect** (auto-tune mode). Depends on everything above — you need audio + both viz in place to see the three-way sync.
13. **Overlay mode** for strategies (show targets without locking).
14. **Preset system** (named snapshots + picker UI).
15. **URL encode/decode**.

### Phase E — Polish
16. Pedagogy UI: inline explanations, guided presets.
17. Pointer/touch refinements.
18. Spectrum/oscilloscope viz via `AnalyserNode` (optional).

### Why this order

- Steps 1–7 get you to the **Core Value loop** (move thing → hear thing) in the fewest files touched.
- Visualizations come after audio because a silent viz is still useful, but you can't verify a strategy engine or preset without hearing it.
- The strategy engine is deliberately last among linking features: it's the most complex reactive chain and benefits from having everything else working so bugs are easy to localize.
- Presets come after strategies because a preset can include a strategy, not vice versa.

## Scaling Considerations

This is a single-page static app with no users-per-se. "Scale" here means **complexity growth** and **real-time performance**, not concurrent users.

| Scale | Architecture adjustments |
|-------|--------------------------|
| v1 (single voice, 4 formants, 1 AudioContext) | Default pattern above. No optimizations needed. |
| v1.5 (chord mode, multiple simultaneous voices) | Multiple `VoiceProcessor` nodes fed from parallel state slices. Store becomes `voices: VoiceState[]`. |
| v2 (shared formant banks, complex routing) | Consider an `AudioWorkletGlobalScope` message bus; still no backend needed. |
| Research-grade accuracy | Swap `biquad-chain` for a WASM-compiled vocal tract model. The worklet boundary is unchanged — only `lib/dsp` swaps. |

### First bottlenecks

1. **GC pauses in the worklet:** if you allocate inside `process()` you get glitches. Pre-allocate all buffers in the constructor; never `new` anything inside `process()`.
2. **Svelte re-render storms during drag:** if a single drag event writes multiple fields, batch them or use `flushSync`. In practice, Svelte 5's fine-grained reactivity handles this well, but watch for `$derived` chains that recompute unnecessarily.
3. **Canvas fill rate:** the piano viz with 88 keys + harmonic markers at 60fps is trivial on desktop but can be smoother with `OffscreenCanvas` for the static background layer.

## Anti-Patterns

### Anti-Pattern 1: Putting DSP on the main thread with `ScriptProcessorNode`

**What people do:** Use the deprecated `ScriptProcessorNode` because it feels simpler than writing a worklet module.
**Why it's wrong:** It runs on the main thread, competes with UI for CPU, and produces audible glitches the moment you drag a slider. It's deprecated for a reason.
**Do this instead:** `AudioWorkletProcessor` from day one. The build-tool pain (one `?url` import) is worth it.

### Anti-Pattern 2: Storing audio state in the worklet and asking for it back for viz

**What people do:** Treat the worklet as the source of truth and `postMessage` state snapshots to the main thread for viz to render.
**Why it's wrong:** You pay a serialization tax, you get stale data (messages are queued), and you've built two-way sync between worklet and main thread for no reason. Your sliders already know what they wrote.
**Do this instead:** Main thread store is authoritative. Worklet is a pure consumer of `AudioParam`s. Viz reads from the same store the UI writes to.

### Anti-Pattern 3: One `$effect` per parameter

**What people do:** Write a separate `$effect` for `f0`, each formant freq, each bw, each gain, etc.
**Why it's wrong:** Dozens of effects = dozens of micro-tasks per edit. Worse, you forget one and something silently stops updating.
**Do this instead:** One effect in `AudioBridge.ts` that walks all known parameters. If any of them changes, the effect re-runs and forwards everything (cheap, since `setTargetAtTime` is O(1)).

### Anti-Pattern 4: Mixing overlay and auto-tune strategy state

**What people do:** Use one `strategy` field that tries to mean both "what to display" and "what to auto-tune to."
**Why it's wrong:** The user wants to overlay R1:f while actively dragging formants freely — two independent concepts.
**Do this instead:** Two fields: `strategyOverlay: StrategyId` (always shown as a ghost on the chart) and `strategyLock: StrategyId | null` (only written-back when set). The effect only writes formants when `strategyLock` is non-null.

### Anti-Pattern 5: Recomputing biquad coefficients every sample

**What people do:** Inside `process()`, recompute RBJ cookbook coefficients from `freq/bw/gain` every sample even when k-rate params are constant for the whole block.
**Why it's wrong:** Wastes CPU on trig functions; can push you over the block budget at 48k.
**Do this instead:** Check if the current param values differ from cached values; only recompute coefficients on change. With k-rate automation on formants, this means at most once per 128-sample block.

### Anti-Pattern 6: Jitter/vibrato modulation outside the worklet

**What people do:** Implement vibrato on the main thread by wiggling `f0` via `setTargetAtTime` at 5.5 Hz.
**Why it's wrong:** Main thread timing is jittery; you get a lumpy vibrato. Also couples UI thread to audio quality.
**Do this instead:** Vibrato + jitter are implemented inside the worklet, parameterized by rate/depth AudioParams. The UI sets targets; the DSP does the modulation.

### Anti-Pattern 7: Forgetting the user-gesture requirement for AudioContext

**What people do:** `new AudioContext()` at app load.
**Why it's wrong:** Chrome/Safari autoplay policy requires a user gesture; the context starts suspended and silent.
**Do this instead:** Create the context inside a click handler ("Start" button). Keep the rest of the app functional before audio starts — viz can run without sound.

## Integration Points

### External Services

| Service | Integration pattern | Notes |
|---------|---------------------|-------|
| None | This is a static app | No backend for v1 |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI ↔ State Store | Direct import + `$state` read/write | No events; writing a field is the event |
| State Store ↔ AudioBridge | `$effect` reads store → calls `AudioParam.setTargetAtTime` / `postMessage` | Unidirectional: store → audio. Audio never writes store. |
| AudioBridge ↔ VoiceProcessor | `AudioParam` for numbers, `MessagePort` for events | Worklet file must be self-contained; cannot import Svelte |
| State Store ↔ Visualizations | `$derived` + rAF read loop | Unidirectional: store → viz. Viz writes store only via direct-manipulation handlers (same as UI controls). |
| Strategy Engine ↔ State Store | `$effect`: reads `(f0, strategy, strategyLock)`, writes `formants` | Watch for feedback loops; strict read/write separation |
| Preset System ↔ State Store | `Object.assign(voiceState, preset)` | Batched update; all effects fire at end of microtask |

### Testing Seams

| Seam | How to test |
|------|-------------|
| Pure DSP (`lib/dsp/*`) | Vitest with known input arrays and expected outputs |
| Worklet behavior | `OfflineAudioContext` rendering 1s of audio, FFT the output, assert formant peaks are within Hz tolerance |
| Strategy engine | Vitest: pure function, call with every strategy × pitch, assert expected formants |
| State store transitions | Vitest + `flushSync()`: set field, assert `$derived` updated |
| AudioBridge | Mockable: replace `node.parameters` with a spy that records `setTargetAtTime` calls |
| Viz snapshot | `@testing-library/svelte` + jsdom-canvas mock, or render to SVG and snapshot serialized output |
| End-to-end linked updates | Playwright: click slider, wait a frame, assert canvas pixel color at expected F1/F2 coord changed |

## Sources

- [MDN — Background audio processing using AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_AudioWorklet) — worklet parameter descriptors + MessagePort patterns (HIGH confidence)
- [MDN — AudioParamDescriptor](https://developer.mozilla.org/en-US/docs/Web/API/AudioParamDescriptor) — a-rate vs k-rate semantics (HIGH confidence)
- [MDN — AudioWorkletProcessor.parameterDescriptors](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/parameterDescriptors_static) — static descriptor declaration (HIGH confidence)
- [Chrome for Developers — Audio Worklet is now available by default](https://developer.chrome.com/blog/audio-worklet) — production availability, GC-free discipline inside process() (HIGH confidence)
- [Svelte Docs — What are runes?](https://svelte.dev/docs/svelte/what-are-runes) — `$state`, `$derived`, `$effect` semantics (HIGH confidence)
- [DEV — Sharing Runes in Svelte 5 with the Rune Class](https://dev.to/jdgamble555/sharing-runes-in-svelte-5-the-rune-class-505e) — module-level class pattern for shared state (MEDIUM confidence)
- [Svelte Blog — Introducing runes](https://svelte.dev/blog/runes) — reactivity model (HIGH confidence)
- [Jake Lazaroff — Building a Live Coding Audio Playground](https://jakelazaroff.com/words/building-a-live-coding-audio-playground/) — real-world Svelte + Web Audio architecture (MEDIUM confidence)
- Madde synthesizer (KTH) — reference voice model; design inspiration for glottal + formant chain (training data, MEDIUM confidence)
- Robert Bristow-Johnson — Audio EQ Cookbook — biquad bandpass coefficients for the formant filters (training data, HIGH confidence)

---
*Architecture research for: real-time voice synthesizer + linked visualization web app*
*Researched: 2026-04-11*
