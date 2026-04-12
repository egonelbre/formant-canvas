---
phase: 5
slug: pedagogy-ui-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 05-01-01 | 01 | 1 | UI-01 | — | N/A | manual | visual inspection | — | ⬜ pending |
| 05-01-02 | 01 | 1 | UI-02 | — | N/A | manual | visual inspection | — | ⬜ pending |
| 05-02-01 | 02 | 1 | UI-03 | — | N/A | manual | visual inspection | — | ⬜ pending |
| 05-02-02 | 02 | 1 | UI-04 | — | N/A | manual | viewport check 1024x700 | — | ⬜ pending |
| 05-03-01 | 03 | 2 | UI-05 | — | N/A | manual | touch device testing | — | ⬜ pending |
| 05-03-02 | 03 | 2 | UI-06 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. Phase 5 is primarily UI/layout work verified through visual inspection and manual testing.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Progressive disclosure hides advanced params | UI-01 | Visual layout behavior | Open app, verify ≤7 primary controls visible. Toggle expert mode, verify advanced params appear |
| Tooltips show plain-language text | UI-02 | Content verification | Hover/tap ? icons on all primary controls, read tooltip text |
| Clean modern aesthetic, dark theme | UI-03 | Subjective visual quality | Screenshot at 1024x700, compare spacing/typography/theme |
| No horizontal scroll at 1024×700 | UI-04 | Viewport behavior | Resize browser to 1024×700, verify no overflow |
| Touch drag on all handles | UI-05 | Requires touch device | Use tablet or touch simulator to drag F1/F2 marker, piano keys, sliders |
| Pointer Events with touch-action: none | UI-06 | DOM attribute verification | Inspect draggable elements, verify touch-action: none and pointer event handlers |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
