# AGENTS.md — `registry/` subdir

> Scope: `lar:` URI registry and resolver design
> Parent: `../_todo/core/AGENTS.md`

---

## Role

Design workers in this subdirectory define how `lar:` URIs resolve and how the promotion ledger tracks canonical addresses for design units.

---

## Checklist: What To Do Here

1. Read `README.md` in this directory.
2. Read URI Schema section of `../../_todo/core/Signal_HUD_Tagspace-draft.md`.
3. Read RFC 7595 notes in `../../_todo/core/A_deep-research-report.md`.
4. Read `../../_todo/core/C-deep-research-report.md` for URI stamping protocol and TOML registry examples (complements A for registry design).
4. Propose minimal resolver spec: what a `lar://` URI resolves to in practice (file path? crystal ref? nothing at runtime?).
6. Propose alias ledger format (TOML or JSONL, with operator aliases and machine IDs).
7. Propose promotion ledger entry spec: what gets written when a design unit reaches `C~19`.
8. Label all proposals `[Synthesis]` until schema settlement.

---

## What Not To Do

- Do not duplicate URI anatomy documentation — point to `../signal/` for field semantics.
- Do not claim external IANA registration is needed. This is a private URI scheme.
- Do not conflate alias ledger with promotion ledger — they serve different purposes.
- Do not promote registry TOML to deployment paths before signal URI schema settles (`builds/agents/` does not exist yet — deferred to S4 Deployment sprint).

---

## Escalation

URI scheme changes (structural) → signal + operator.  
Promotion ledger format → operator ruling required.  
Alias expansion beyond operators and machines → operator scope call.
