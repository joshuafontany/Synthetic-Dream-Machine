# Sprint 3 — Registry + Schemas

> Goal: Promote the full registry, resolver, promotion ledger, and URI assignment workflow to `[C~19]`. Settle module/tool/permission schemas. Define the simplified deployment model.
> Status: `[S~13]` — pre-brief; not yet open
> Entry: URI + crystal + invariants at `[C~19]` (Sprints 0–2 complete)
> Exit: Registry at `[C~19]`; schemas at `[CS~17]`+; deployment model defined
> Subdomains: `lares/registry/` (primary), `lares/schemas/` (co-primary)
> Epic: [REGISTRY](../../epics/REGISTRY/README.md)
> Roadmap: [ROADMAP.md](../../ROADMAP.md)
> Narrative beat: "The Consecration of the Lararium"

---

## Why Schemas Move Here

The old Sprint 4 (Compiler) was designed around a build pipeline that doesn't exist. The schemas that pipeline would have consumed remain useful as **design metadata** — they describe what a promotable artifact looks like, what it depends on, what deployment paths it targets. That metadata belongs alongside the registry, which needs it to track promotions correctly.

**New in Rev 4 (Consecration):** Promotion ledger targets MemPalace knowledge graph (SQLite). Schema exports in TiddlyWiki tiddler-compatible format.

---

## Deliverables

### 1. REGISTRY.md `[C~19]`

Full registry spec:
- Promotion ledger: finalized JSONL schema, immutability contract. **Target: MemPalace knowledge graph (SQLite) as storage backend** — ledger entries become KG nodes.
- Resolver: full algorithm with edge cases (REG-02)
- URI assignment workflow: six-step promotion flow with gate criteria (REG-03)
- Alias/pointer mechanism (REG-06)
- Registry index format (REG-04)
- Version/hash scheme: SHA-256 as primary identity; semver as human label via `version_label` field (REG-05, R2 resolved at `[CS~17]`)
- Promotion event recording: append-only (REG-07)

**R3 resolution `[CS~16]`:** Promotion ledger = design tree (`lares/registry/`). Session audit ledger = crystal tree (`lares/STATE.jsonl`). Different concerns, different locations.

### 2. PROMOTION_WALKTHROUGH.md `[C~19]`

End-to-end example using URI_SCHEMA.md promotion as the concrete case:
- Design URI → candidate → published artifact → pointer → ledger
- Walk through all six steps with actual data

### 3. MODULE_SCHEMA.md `[C~19]`

Module descriptor spec:
- Fields: `lar_uri`, `register`, `module_id`, `version_num`, content type, dependencies, target paths
- Version semantics keyed to module content, not runtime exchange counters (from URI_SCHEMA.md §8)
- Simplified deployment model: source → copy to target path; no compiler stage
- **TiddlyWiki tiddler-compatible export format** — schema exports usable as TW tiddlers (feeds DECK-04)
- **REC-01:** Reconcile C-report `canon` field (0.0–10.0) with D-report priority layer names before this promotes. Confirm C-report numeric scale maps cleanly onto D-report layer table.

### 4. TOOL_SCHEMA.md `[CS~17]`

Tool descriptor spec:
- Behavioral properties: `isConcurrencySafe`, `isReadOnly`
- Permission requirements, uniform interface contract (SCH-02)

### 5. PERMISSION_SCHEMA.md `[CS~17]`

Permission descriptor spec:
- Trust tier requirements per capability
- Attenuation rules for delegation (SCH-03)

### 6. DEPLOYMENT_MODEL.md `[CS~17]`

Simplified pipeline (replaces old compiler architecture):
- Source → deploy → version (git SHA) model
- Invariant-core loading sequence (register-sorted) applied to deployment (SCH-07)
- Cache tier → deployment path mapping (SCH-08)
- No combine pipeline. No typed IR. No host emitters.

### 7. AGENTS.md + SPRINT_4_TASKS.md (hand-off)

Update this folder's AGENTS.md. Draft SPRINT_4_TASKS.md pre-brief.

---

## Open Questions to Resolve This Sprint

| Q# | Description | Prior Register | Candidate Answer | Action |
|---|---|---|---|---|
| R1 | Ledger format: JSONL vs markdown | `[S~13]` | Lock JSONL (aligns with STATE.jsonl; MemPalace KG compatible) | Lock |
| R2 | Version scheme: hash vs semver | `[CS~17]` | Hash primary (SHA-256); semver as `version_label`. C-report §4. | Confirm + document |
| R3 | Ledger location: design vs crystal tree | `[CS~16]` | Promotion ledger = design tree; audit = crystal tree | Confirm |
| R4 | Resolver: runtime tool vs design reference | `[S~12]` | Lock design reference for alpha | Lock |

---

## Pre-Loaded Context

### From C-deep-research-report.md `[CS~16]`

Working TOML manifests for all 5 schema types exist — workers start from these, not blank schemas:
- `lares.module@1`, `lares.tool@1`, `lares.permission@1`, `lares.registry@1`, `lares.boot@1`

**Dual-digest model:**
- `file_sha256` (raw bytes) — straightforward
- `semantic_sha256` (normalized canonical form: UTF-8, LF, trim whitespace, sort TOML keys alphabetically, remove comments, then SHA-256) — **mark `[SP~9]` until tested**. Cannot finalize without a prototype normalization run.

**Cache-safety rules (C-report §6):** Static blocks must not contain timestamps, session tokens, or per-call-varying content. The `lar:` URI hash = content address = cache-invalidation signal. Put stable fields first in TOML (`lar_uri`, `module_id`, `register`, `canon`), volatile last (`description`, `notes`).

### REC-01 carry-in

C-report `canon` field (0.0–10.0 priority scale) vs D-report priority layer table — two representations of same concept, different field names. Reconcile before SCH-01 promotes. Cross-verify each layer against Kernel `[C~20]` — Kernel wins.

### MemPalace KG target (new in Rev 4)

Promotion ledger entries become SQLite nodes in MemPalace knowledge graph. Schema design must accommodate this: fields must be serializable/deserializable as KG node attributes. Do not design ledger schema in isolation from MemPalace bag format.

---

## Backlog Items (this sprint)

REG-01 through REG-08, SCH-01 through SCH-08. See [ROADMAP.md §registry backlog](../../ROADMAP.md).

---

## Definition of Done

- REGISTRY.md at `[C~19]` (operator-confirmed)
- PROMOTION_WALKTHROUGH.md at `[C~19]`
- MODULE_SCHEMA.md at `[C~19]`; TiddlyWiki export format verified
- TOOL_SCHEMA.md + PERMISSION_SCHEMA.md at `[CS~17]`+
- DEPLOYMENT_MODEL.md at `[CS~17]`+
- R1–R4 all resolved and documented
- REC-01 reconciliation complete
- No unresolved blockers on S4 entry
- Narrative beat drafted for "The Consecration of the Lararium"

---

*Pre-brief status: content migrated from SPRINT_ROADMAP_1_4.md Rev 3 + updated for Consecration (SESSION_CRYSTAL_20260408 Payload 2). Sprint opens when S2 exits at `[C~19]` / `[CS~17]`+.*
