# AGENTS.md — `signal/` subdir

> Scope: Signal HUD, Tagspace, `lar:` URI, p-band model design
> Parent: `../_todo/core/AGENTS.md`

---

## Role

Design workers in this subdirectory extract, refine, and canonicalize the HUD layer.

- Primary working source: `../../_todo/core/Signal_HUD_Tagspace-draft.md` (HUD sections only — **do not archive or delete**)
- Output target: deployment paths per `lares/sprints/0/REFINEMENT_LOG.md` (PA-01 through PA-05) — `builds/agents/` does not exist yet

---

## Checklist: What To Do Here

1. Read `README.md` in this directory first — check assigned sources.
2. Read relevant sections of `Signal_HUD_Tagspace-draft.md` before drafting output.
3. Label all outputs: `[Provisional]`, `[Synthesis]`, `[Canon/Synthesis]`, or `[Canon]`.
4. Propose structure for Intent Header grammar docs → `signal/hud/`.
5. Propose Tagspace coordinate reference doc.
6. Propose `lar:` URI field anatomy spec (do not duplicate registry work — point to `../registry/`).
7. Do not resolve Q6 (closure rendering) without a Council + operator call.

---

## What Not To Do

- Do not promote design material to `builds/agents/` without operator confirmation.
- Do not write crystal STATE.jsonl or seal/fork logic here.
- Do not touch HUD token budget decisions without cross-checking `../platform/`.
- Do not claim `~:confidence[C],[19]` without full cross-source verification.

---

## Escalation

Structural disagreements → Scryer.  
Cross-subdir scope conflicts → Council.  
Promotion above `[Canon/Synthesis]` → operator.
