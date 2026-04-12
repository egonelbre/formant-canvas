---
phase: 4
slug: vocal-strategies
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
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
| 04-01-01 | 01 | 1 | STRAT-01 | — | N/A | unit | `npx vitest run src/lib/strategies` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | STRAT-02 | — | N/A | unit | `npx vitest run src/lib/strategies` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | STRAT-03 | — | N/A | unit | `npx vitest run src/lib/strategies` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | STRAT-01, STRAT-03 | — | N/A | automated | `npx vitest run --reporter=verbose` | — | ⬜ pending |
| 04-03-01 | 03 | 2 | STRAT-02, STRAT-03, STRAT-04, STRAT-05 | — | N/A | automated | `npx vitest run --reporter=verbose` | — | ⬜ pending |
| 04-04-01 | 04 | 3 | STRAT-01, STRAT-02, STRAT-03, STRAT-04, STRAT-05 | — | N/A | manual | See Plan 04 how-to-verify checklist | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/strategies/__tests__/strategy-engine.test.ts` — stubs for STRAT-01, STRAT-02, STRAT-03 pure function tests
- [ ] `src/lib/strategies/__tests__/auto-strategy.test.ts` — auto-strategy heuristic tests
- [ ] Strategy engine test coverage for all 7 strategy types and range boundary behavior

*Existing vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Overlay targets visible on piano and F1/F2 chart | STRAT-02 | Visual rendering in SVG | Select R1:f0 strategy, set mode to Overlay, verify target lines on piano and target marker on F1/F2 chart |
| Locked mode formant tracking is audible and visible | STRAT-03 | Audio + visual linked update | Select R1:2f0 strategy, set mode to Locked, sweep f0, verify formant tracks and sound changes |
| Drag override with rubber-band snap-back | STRAT-04 | Pointer interaction + visual feedback (manual-verified-only) | In locked mode, drag F1 on F1/F2 chart, verify dashed line on both overlays, release and verify snap-back |
| Out-of-range visual warning | STRAT-03 | Visual indicator at range boundary | In locked mode, push f0 beyond strategy range, verify red/warning indication |
| Complete strategy system integration | STRAT-01 through STRAT-05 | Full interactive verification | Plan 04 how-to-verify checklist covers all STRAT requirements end-to-end |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
