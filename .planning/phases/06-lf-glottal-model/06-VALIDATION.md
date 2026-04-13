---
phase: 6
slug: lf-glottal-model
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/lib/audio/dsp/lf-model.test.ts src/lib/audio/dsp/lf-wavetable.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/audio/dsp/lf-model.test.ts src/lib/audio/dsp/lf-wavetable.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | LF-02 | — | N/A | unit | `npx vitest run src/lib/audio/dsp/lf-model.test.ts` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | LF-03 | — | N/A | unit | `npx vitest run src/lib/audio/dsp/lf-wavetable.test.ts` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | LF-01 | — | N/A | integration | Manual verification | N/A | ⬜ pending |
| 06-03-01 | 03 | 2 | LF-04 | — | N/A | unit | `npx vitest run src/lib/audio/dsp/lf-model.test.ts` | ❌ W0 | ⬜ pending |
| 06-03-02 | 03 | 2 | LF-03 | — | N/A | manual | Listen test at 800 Hz f0 | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/audio/dsp/lf-model.test.ts` — stubs for LF-02, LF-04 (Rd conversion, decomposition values)
- [ ] `src/lib/audio/dsp/lf-wavetable.test.ts` — stubs for LF-03 (band-limiting verification)
- [ ] No new framework install needed — Vitest already configured

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| LF pulse at 800 Hz f0 has no audible aliasing | LF-03 | Aliasing is perceptual — automated frequency analysis cannot fully judge audibility | 1. Set f0 to 800 Hz 2. Select LF model 3. Sweep Rd from 0.3 to 2.7 4. Listen for metallic/harsh artifacts |
| Model switching produces sound from correct model | LF-01 | Timbral difference is perceptual | 1. Toggle Rosenberg/LF 2. Listen for timbral change 3. Verify pulse visual changes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
