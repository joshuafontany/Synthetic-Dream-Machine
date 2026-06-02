# AGENTS.md — `compiler/` subdir

> Scope: Deterministic build compiler design
> Parent: `../_todo/core/AGENTS.md`

---

## Role

Design workers in this subdirectory produce actionable compiler specs fed to the Engineer worker for implementation in `builds/scripts/`.

---

## Checklist: What To Do Here

1. Read `README.md` in this directory — check primary sources and consumed status.
2. Read `../Modular_Architecture-draft.md` and `../PIPELINE.md` before drafting module graph spec.
3. Map each legacy source file to a design decision in the compiler spec.
4. Propose typed IR schema as `[Synthesis]` candidate.
5. Flag cache-breakpoint placement decisions as Synthesis until prototype validates caching behavior.
6. Mark which combine/verify script behaviors are `[Canon]` (currently working) vs `[Synthesis]` (redesign target).

---

## What Not To Do

- Do not write TOML field schemas here — those belong in `../schemas/`.
- Do not touch `builds/scripts/` directly — this dir is spec-only; implementation goes via operator + Engineer worker.
- Do not deprecate working combine/verify scripts without operator confirmation.
- Do not conflate compiler module graph with platform output tiers.

---

## Escalation

Script changes (Engineer worker actions) → operator.  
Schema decisions → `../schemas/` cross-reference.  
Cache strategy (pricing sensitivity) → researcher verification before promotion.
