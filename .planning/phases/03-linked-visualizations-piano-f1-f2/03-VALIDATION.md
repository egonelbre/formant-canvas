---
phase: 3
slug: linked-visualizations-piano-f1-f2
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | PIANO-01 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | PIANO-02 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | PIANO-03 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 3-01-04 | 01 | 1 | PIANO-04 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 3-01-05 | 01 | 1 | PIANO-05 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 1 | VOWEL-01 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 1 | VOWEL-02 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 3-02-03 | 02 | 1 | VOWEL-03 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 3-02-04 | 02 | 1 | VOWEL-04 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 3-02-05 | 02 | 1 | VOWEL-05 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 1 | RANGE-01 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 3-03-02 | 03 | 1 | RANGE-02 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 3-03-03 | 03 | 1 | RANGE-03 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 3-04-01 | 04 | 2 | LINK-01 | — | N/A | manual | Browser test | — | ⬜ pending |
| 3-04-02 | 04 | 2 | LINK-03 | — | N/A | manual | Browser test | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Unit tests for formant response math (formant-utils)
- [ ] Unit tests for Hillenbrand data structure and lookups
- [ ] Unit tests for harmonic amplitude computation
- [ ] Unit tests for d3-scale log mapping (Hz to pixel, pixel to Hz)

*Existing infrastructure covers test framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Linked update within one animation frame | LINK-01 | Requires visual confirmation of synchronous rendering | Change any param, verify all views update simultaneously |
| No audio glitches during drag | LINK-03 | Requires auditory confirmation | Drag F1/F2 handle rapidly, listen for clicks/pops |
| Hillenbrand ellipses visible | VOWEL-03 | Visual SVG rendering verification | Open app, verify ellipses render with IPA labels |
| Piano f0 highlight | PIANO-01 | Visual verification | Play a note, verify correct key highlights |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
