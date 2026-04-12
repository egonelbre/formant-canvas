---
phase: 5
slug: pedagogy-ui-polish
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-12
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | UI-02, UI-04 | T-05-01 | N/A | unit | `npx vitest run src/lib/data/tooltips.test.ts src/lib/charts/strategy-chart-math.test.ts --reporter=verbose` | W0 (created by this task) | ⬜ pending |
| 05-01-02 | 01 | 1 | UI-02 | T-05-02 | N/A | manual | `npx vitest run --reporter=verbose` (full suite) | — | ⬜ pending |
| 05-02-01 | 02 | 2 | UI-04 | T-05-03 | N/A | manual | `npx vitest run --reporter=verbose` | — | ⬜ pending |
| 05-02-02 | 02 | 2 | UI-04 | T-05-03 | N/A | manual | `npx vitest run --reporter=verbose` | — | ⬜ pending |
| 05-03-01 | 03 | 3 | UI-01, UI-03, UI-05 | T-05-04, T-05-05 | N/A | manual | `npx vitest run --reporter=verbose` | — | ⬜ pending |
| 05-03-02 | 03 | 3 | UI-01, UI-03 | T-05-05 | N/A | manual | `npx vitest run --reporter=verbose` | — | ⬜ pending |
| 05-04-01 | 04 | 4 | UI-06 | T-05-06, T-05-07 | Cap pointer map to 10 | acceptance | file content checks (`touch-action: none`, `setPointerCapture`, `Map`) | — | ⬜ pending |
| 05-04-02 | 04 | 4 | UI-01 to UI-06 | — | N/A | checkpoint | human-verify (all 5 success criteria) | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Plan 05-01 Task 1 (TDD) creates the Wave 0 test files:
- `src/lib/data/tooltips.test.ts` -- verifies all 7 primary controls have tooltip entries
- `src/lib/charts/strategy-chart-math.test.ts` -- diagonal line computation, scale domain clamping, pitchToNoteName

These are created as part of the RED phase of the TDD task before any production code.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Progressive disclosure hides advanced params | UI-01 | Visual layout behavior | Open app, verify <=7 primary controls visible. Toggle expert mode, verify advanced params appear |
| Tooltips show plain-language text | UI-02 | Content verification | Hover/tap ? icons on all primary controls, read tooltip text |
| Expert mode exposes OQ/tilt/bandwidth | UI-03 | Visual interaction | Toggle expert, verify OQ/spectral tilt/aspiration/F1-F4 BW sliders appear |
| Clean modern aesthetic, dark theme | UI-04 | Subjective visual quality | Screenshot at 1024x700, compare spacing/typography/theme |
| No horizontal scroll at 1024x700 | UI-05 | Viewport behavior | Resize browser to 1024x700, verify no overflow |
| Pointer Events with touch-action: none | UI-06 | DOM attribute verification + acceptance criteria | Inspect draggable elements for `touch-action: none` and pointer event handlers; file content checks in Plan 05-04 Task 1 verify `touch-action: none`, `setPointerCapture`, `Map` presence |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
