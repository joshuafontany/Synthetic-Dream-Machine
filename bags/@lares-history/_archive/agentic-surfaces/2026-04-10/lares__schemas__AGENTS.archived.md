# AGENTS.md — `schemas/` subdir

> Scope: TOML descriptor schema design
> Parent: `../_todo/core/AGENTS.md`

---

## Role

Design workers in this subdirectory extract and formalize TOML field schemas for the compiler to consume.

---

## Checklist: What To Do Here

1. Read `README.md` in this directory.
2. Read `../../_todo/core/B_deep-research-report.md` fully before drafting any schema.
3. Read `../../_todo/core/C-deep-research-report.md` for TOML manifest examples and cache-safety rules (URI stamping layer).
3. For each of the five schema types, produce:
   - Field table (name, type, required?, default, notes)
   - Register annotation (`[Canon]` = locked; `[Synthesis]` = design target; `[Provisional]` = speculative)
   - Validation rules (what the compiler must reject)
5. Flag `semantic_sha256` computation details as `[Synthesis/Provisional]` — definition requires prototype to stabilize.
6. Cache-ordering rules: flag as `[Synthesis]` until prompt caching prototype validates them.

---

## What Not To Do

- Do not confuse `.module.toml` schema work with invariant TOML work — separate concerns.
- Do not claim caching tier price savings as `[Canon]` — subject to API pricing changes.
- Do not modify `B_deep-research-report.md` — source document only.
- Do not promote schemas to deployment paths without operator go-ahead. The compiler sprint is deferred (no `builds/agents/` yet). See REFINEMENT_LOG.md PA-01 through PA-05.

---

## Escalation

Semantic digest definition → operator call before finalization.  
Cache-breakpoint placement → Researcher verification before promotion.  
Schema-to-deployment integration → operator call; compiler sprint is S4 in the revised roadmap (`lares/sprints/SPRINT_ROADMAP_1_4.md`).
