# Phase 1: Audio Closed Loop - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

A working voice synthesizer in the browser: move a slider, hear the sound change. The Svelte 5 `$state` single-source-of-truth store, AudioWorklet glottal source, BiquadFilterNode F1-F4 formant chain, and audio bridge are all stood up end-to-end so the architecture is proven before any visualization code exists.

</domain>

<decisions>
## Implementation Decisions

### Initial Sound Character
- **D-01:** Default voice is male modal /a/ at ~120 Hz f0 with formants F1~730, F2~1090, F3~2440, F4~3300 Hz
- **D-02:** Glottal source includes light aspiration noise mixed in from Phase 1 (not deferred to Phase 2) for a more natural quality

### Slider & Control Mapping
- **D-03:** Primary control is a combined F1+F2 vowel-axis slider that interpolates between /a/ and /i/ vowel targets — proves the full store-to-filter path with a dramatic, immediately audible timbral change
- **D-04:** A volume/gain slider is included alongside the vowel slider (trivial GainNode.gain implementation)

### Start Audio Interaction
- **D-05:** Play/pause toggle button with media-player-style semantics — familiar interaction pattern
- **D-06:** Audio context resumes on first user gesture per Web Audio API requirements (AUDIO-08)

### Formant Topology
- **D-07:** All four formants F1-F4 active from Phase 1 — F3/F4 add the head-resonance quality that makes it sound like a voice rather than a synthetic tone
- **D-08:** Parallel filter topology — each formant is an independent BiquadFilterNode with outputs summed, matching the Klatt parallel branch. Individual formant gains are independently controllable

### Claude's Discretion
- Phase 1 minimal UI layout (centered card, toolbar, or other arrangement)
- Exact bandwidth defaults for F1-F4
- Aspiration noise level and implementation details
- Vowel interpolation curve (linear vs perceptual)
- Smoothing time constants for `setTargetAtTime`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs — requirements fully captured in decisions above and in the following project-level docs:

### Requirements
- `.planning/REQUIREMENTS.md` — AUDIO-01, AUDIO-03, AUDIO-06, AUDIO-08, LINK-02 define the acceptance criteria for this phase

### Technology Stack
- `CLAUDE.md` §Technology Stack — Full recommended stack, AudioWorklet gotchas, version compatibility, and "What NOT to Use" guidance

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No existing source code — greenfield project. Phase 1 establishes all foundational patterns.

### Established Patterns
- No patterns yet. This phase sets the conventions for:
  - Svelte 5 `$state` rune store shape
  - AudioWorklet processor structure
  - Audio bridge (store -> Web Audio parameter forwarding)
  - Project file layout (src/, lib/, etc.)

### Integration Points
- Vite dev server with `@sveltejs/vite-plugin-svelte` (scaffolding needed)
- AudioWorklet processor loaded via Vite `?worker&url` import pattern
- `BiquadFilterNode` parameter automation via `setTargetAtTime`

</code_context>

<specifics>
## Specific Ideas

- The vowel slider interpolating /a/ to /i/ should produce a clearly audible and dramatic timbral sweep — this is the "proof of life" for the entire architecture
- Light aspiration noise gives the voice a breathy, natural quality from the start rather than a pure synthetic buzz
- Play/pause toggle follows media player conventions users already know

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-audio-closed-loop*
*Context gathered: 2026-04-12*
