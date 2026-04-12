---
phase: 1
slug: audio-closed-loop
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.x |
| **Config file** | None yet — Wave 0 creates `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | AUDIO-01 | — | N/A | unit | `npx vitest run src/lib/audio/dsp/rosenberg.test.ts -t "generates"` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | AUDIO-03 | — | N/A | unit | `npx vitest run src/lib/audio/dsp/formant-utils.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | AUDIO-06 | — | N/A | code review | Manual review of bridge.ts | N/A | ⬜ pending |
| TBD | TBD | TBD | AUDIO-08 | — | N/A | integration | Playwright smoke test | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | LINK-02 | — | N/A | code review | Manual review / grep for local $state audio params | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — project test configuration
- [ ] `src/lib/audio/dsp/rosenberg.test.ts` — unit tests for Rosenberg pulse generation (AUDIO-01)
- [ ] `src/lib/audio/dsp/formant-utils.test.ts` — unit tests for Q/BW conversion (AUDIO-03)
- [ ] Scaffold project with `npm create vite@latest` before any tests can run

*Wave 0 is part of the first plan (project scaffolding).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| setTargetAtTime used for all param changes (no direct .value) | AUDIO-06 | Code pattern, not runtime behavior | grep bridge.ts for `.value =` — must not appear for audio params |
| Single state store, no component copies | LINK-02 | Architectural constraint | grep all .svelte files for `$state` audio params — must only exist in state.svelte.ts |
| Audio resumes on gesture after page refresh | AUDIO-08 | Requires real browser interaction | Open app, click play, refresh, click play again — audio should resume |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
