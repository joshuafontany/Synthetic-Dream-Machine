# AGENTS.md — `crystal/` subdir

> Scope: Archive Crystal state machine design
> Parent: `../_todo/core/AGENTS.md`

---

## Role

Design workers in this subdirectory spec the crystal event-sourced JSONL architecture. This is infrastructure-layer work — not prompt engineering. Treat it accordingly.

---

## Checklist: What To Do Here

1. Read `README.md` in this directory — check the critical review summary before beginning.
2. Read crystal sections of `../../_todo/core/Signal_HUD_Tagspace-draft.md`.
3. **Resolve Q10 and Q15 first.** Surface options to operator. Do not extend spec until operator rules.
4. Prototype external tooling path (MCP server / sidecar) before writing LLM-native STATE.jsonl maintenance spec.
5. Label all outputs by register.
6. Propose minimal STATE.jsonl schema (fields, constraints, entry types) as a `[Synthesis]` candidate only — no promotion without prototype data.

---

## What Not To Do

- Do not write HUD rendering rules here — that belongs in `../signal/`.
- Do not promote crystal spec to `builds/` before Q10/Q15 are resolved.
- Do not call STATE.jsonl "structural replay" — it is an audit ledger.
- Do not conflate machine threading with HUD multi-stance logic.

---

## Escalation

Q10/Q15 → operator call required.  
Scope boundary with `signal/` → Council.  
Tooling decisions (MCP vs sidecar vs LLM-native) → operator.
