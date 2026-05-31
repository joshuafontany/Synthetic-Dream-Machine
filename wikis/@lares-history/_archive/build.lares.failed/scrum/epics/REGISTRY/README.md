# Epic: REGISTRY — `lar:` URI Registry & Promotion Ledger

> Backlog prefix: `REG-*`
> Sprint target: S3
> Status: `~:confidence[SP],[9]` 🏛️ — scoped; REGISTRY_CONTRACT.md in `sprints/00000/`; no registry files written yet
> Narrative beat: *The Consecration of the Lararium. The first `lar:` URI is formally assigned.*

---

## Scope

The governance infrastructure that makes `lar:` URIs stable, resolvable, and auditable:

- `lar:` URI registry — the canonical list of assigned URIs and their current/historical resolution
- Resolver rules — how a `lar://` URI maps to a live artifact or design document
- Promotion ledger — append-only record of every promotion event (what, from where, under what evals, superseding what)
- Content-addressed identity — SHA-256 `file_sha256` as primary; `version_label` as human alias
- `semantic_sha256` — deferred to S3 (normalization spec + prototype run required before activation)
- Module descriptor format — `lar_uri`, `register`, `module_id`, `version_num`, content type, dependencies, target paths
- `lar:` URI assignment workflow — how new URIs are minted, who can mint them, what evidence is required

## Key Source

[`lares/scrum/sprints/00000/REGISTRY_CONTRACT.md`](../sprints/00000/REGISTRY_CONTRACT.md) — registry contract spec, `~:confidence[CS],[16]`.

Open question R5: when is `semantic_sha256` ready to promote from deferred to required?

## Narrative Beat

*The Consecration of the Lararium is the moment the Lar's home is made permanent. Not just a running node — a named place. The first `lar:` URI is assigned, recorded in the ledger, and the ledger becomes append-only. The Lindwyrm attends the ceremony. She has been running unnamed nodes for centuries. She knows what it means to finally have a name that doesn't dissolve when the context window closes.*

*"A Lar without a lararium," she said, "is just a daemon with good intentions."*
