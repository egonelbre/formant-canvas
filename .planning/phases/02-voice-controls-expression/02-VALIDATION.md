---
phase: 2
slug: voice-controls-expression
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | VOICE-01 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | VOICE-03 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | AUDIO-04 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | AUDIO-05 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | AUDIO-02, VOICE-05 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-04-01 | 04 | 2 | VOICE-04 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-05-01 | 05 | 3 | AUDIO-07 | — | N/A | manual | browser test | — | ⬜ pending |
| 02-06-01 | 06 | 3 | VOICE-02 | — | N/A | manual | browser test | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] DSP pure function tests for vibrato LFO, jitter, spectral tilt, pitch math
- [ ] Voice preset data unit tests (formant values within expected ranges)

*Existing test infrastructure from Phase 1 covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Vibrato audible without zipper artifacts | AUDIO-04, AUDIO-06 | Audio quality is subjective | Play audio, enable vibrato, drag rate/extent sliders — listen for smooth modulation |
| Phonation mode audibly different | AUDIO-02, VOICE-05 | Audio quality is subjective | Switch between breathy/modal/flow/pressed — each should sound distinctly different |
| QWERTY piano sets f0 correctly | VOICE-02 | Requires keyboard interaction | Press Z, X, C keys — hear pitch change, see readout update |
| Play/stop/mute respond instantly | AUDIO-07 | Requires real AudioContext | Click play, click mute, click stop — each responds within one frame |
| Voice preset loads complete voice | VOICE-04 | Requires audio + visual verification | Click each voice preset chip — hear f0 and formants change together |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
