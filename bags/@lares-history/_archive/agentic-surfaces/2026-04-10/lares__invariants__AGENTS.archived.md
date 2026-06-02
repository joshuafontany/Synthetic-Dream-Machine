# AGENTS.md — `invariants/` subdir

> Scope: `lares.core.*` behavioral invariant design
> Parent: `../_todo/core/AGENTS.md`

---

## Role

Design workers in this subdirectory extract invariant definitions from research and legacy docs, then draft TOML target forms for compiler consumption.

---

## Checklist: What To Do Here

1. Read `README.md` in this directory — check primary sources.
2. Read `../../_todo/core/A_deep-research-report.md` fully before drafting any invariant TOML.
3. Cross-reference `../../_todo/core/D-deep-research-report.md` for the companion invariant-loading architecture spec.
4. Cross-reference `../../_todo/core/EP-RA-001.md` for register/mode protocol invariants.
5. Cross-reference `../../_todo/core/TRUST_MODELS.md` for trust tier invariants.
5. For each invariant: draft TOML block as `[Synthesis]`; flag which fields are speculative.
7. Output drafts to `invariants/drafts/` (create subdir as needed).
8. Surface priority layer conflicts to operator before writing loader spec.

---

## What Not To Do

- Do not promote TOML invariants to `builds/agents/` without operator ruling (and `builds/agents/` does not exist yet — this is a deferred S4 deployment action).
- Do not blend data classification decisions into trust model definitions — keep them separate.
- Do not claim `[Canon]` for anything sourced only from `A_deep-research-report.md` without cross-verification.
- Do not modify `../../_todo/core/EP-RA-001.md` — that is a source document.

---

## Escalation

Priority layer conflicts → Council.  
Trust tier cap changes → `operator(admin)` only.  
Loader fail-closed policy decisions → operator.
