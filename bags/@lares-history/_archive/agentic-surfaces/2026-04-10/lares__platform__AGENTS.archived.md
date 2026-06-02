# AGENTS.md — `platform/` subdir

> Scope: Multi-platform packaging and output tier design
> Parent: `../_todo/core/AGENTS.md`

---

## Role

Design workers in this subdirectory define how assembled compiler output maps to each deployment platform. This is the last-mile packaging layer.

---

## Checklist: What To Do Here

1. Read `README.md` in this directory.
2. Read `../MULTIPLATFORM_PACKAGING_RESEARCH.md` and `../Platform_Wrappers-map.md`.
3. For each platform target, produce:
   - Token budget ceiling (hard limit vs practical limit)
   - Required output format (TOML wrapper? Markdown? JSONL?)
   - Validation criteria (what the verify script checks)
4. Surface OP-11 and OP-12 options to operator — do not resolve unilaterally.
5. HUD token ceiling decision: model three options (light / standard / verbose HUD) with budget numbers. Bring to operator.

---

## What Not To Do

- Do not set platform token budgets as `[Canon]` without operator ruling. Practical limits shift.
- Do not write platform wrappers for platforms not in the current target set.
- Do not merge compiler and platform concerns — compiler produces IR; platform wraps it.
- Do not touch `builds/agents/platform/` directly — this dir is spec-only.

---

## Escalation

OP-11 and OP-12 → operator calls.  
HUD token ceiling → `../signal/` cross-reference + operator.  
New platform targets → operator scope decision.
