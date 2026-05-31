# Registry Contract — `lar:` URI Resolution & Promotion Ledger

> Domain: `lares/registry/`
> Status: `~:confidence[S],[12]` 🏛️ — working design synthesis; depends on URI schema settlement
> Updated: 2026-04-08
> Source: `lares/README.md` (three-truth model), `Signal_HUD_Tagspace-draft.md` §§ Ephemeral Machine Patterns, Ontology Layer
> Candidate URI: `lar://core/design/registry/contract@S~12`

---

## 1. Purpose

The registry serves as the **historical/governance truth** layer in the three-truth model:

| Truth layer | Location | Role |
|---|---|---|
| Design truth | `lares/**` | Epistemic gradient `[P] → ~:confidence[C],[19+]` |
| Deployment truth | `builds/agents/` | Published, versioned, rollback-ready |
| **Governance truth** | **`registry/`** | What got promoted, from where, under what evals |

The registry holds two artifacts: a **resolver** that maps `lar:` URIs to design objects and deployed builds, and a **promotion ledger** that records every promotion event append-only.

---

## 2. Resolver Rules

### 2.1 Resolution Algorithm

Given a `lar:` URI, the resolver returns the **current active artifact** by:

1. Parse the URI per the URI Schema spec (§3 Component Map)
2. Extract the path (HAKABA address) as the semantic key
3. Look up the semantic key in the registry index
4. If the key has a deployment pointer → return the deployed build artifact
5. If the key has a design pointer only → return the design object with its current register
6. If the key has no entry → return NOT_FOUND

### 2.2 Pointer Types

| Pointer | Target | Meaning |
|---|---|---|
| `design_ref` | `lares/{subdir}/` path | Points to the design object (always present) |
| `build_ref` | `builds/agents/` versioned artifact | Points to the deployed build (present only after promotion) |
| `build_version` | Content hash or version identifier | Identifies the specific deployed version |

### 2.3 Alias / Active Pointer

The registry maintains a **moving alias** per semantic key. The alias always points to the currently active deployed version. Prior versions remain addressable by their `build_version` identifier but are not the default resolution target.

---

## 3. Promotion Ledger Schema

The promotion ledger is append-only. Each entry records a single promotion event.

### 3.1 Ledger Entry Fields

```jsonl
{
  "timestamp": "2026-04-08T12:00:00Z",
  "lar_uri": "lar:///signal/uri-schema",
  "promoted_from_register": "CS~17",
  "promoted_to_register": "C~19",
  "design_source": "lares/modules/uri-schema/URI_SCHEMA.md",
  "build_artifact": "builds/agents/signal/uri-schema-v1.md",
  "file_sha256": "sha256:abc123...",
  "semantic_sha256": null,
  "supersedes": null,
  "eval_summary": "Sprint 0 acceptance: validation rules pass, projection table verified, example set complete",
  "authorized_by": "operator",
  "authorization_tier": "admin"
}
```

### 3.2 Field Definitions

| Field | Type | Required | Description |
|---|---|---|---|
| `timestamp` | ISO-8601 | Yes | When the promotion occurred |
| `lar_uri` | Stable address | Yes | The semantic key being promoted |
| `promoted_from_register` | Register tag | Yes | Register before promotion |
| `promoted_to_register` | Register tag | Yes | Register after promotion |
| `design_source` | File path | Yes | Where the design content lives |
| `build_artifact` | File path | Yes | Where the deployed artifact was published |
| `file_sha256` | SHA-256 hex digest | Yes | Raw-bytes content hash; no normalization; primary integrity check |
| `semantic_sha256` | SHA-256 hex digest or null | No | Normalized content hash (UTF-8, LF, sorted TOML keys, stripped comments); deferred to S3 — null until normalization spec is tested and a prototype run confirms consistent output |
| `supersedes` | Hash/version or null | Yes | The `file_sha256` this replaces (null for first promotion) |
| `eval_summary` | Free text | Yes | Brief description of what was evaluated |
| `authorized_by` | Identity | Yes | Who authorized the promotion |
| `authorization_tier` | `admin` / `operator` | Yes | Trust tier of the authorizer |

### 3.3 Immutability

Ledger entries are append-only. Corrections produce new entries (with `supersedes` pointing to the corrected entry), not edits to past entries. A ledger with modified past entries is corrupt — same immutability contract as `STATE.jsonl`.

---

## 4. REGISTRY.jsonl — Machine Index

Per the crystal system's Pattern B (Ephemeral Machine Patterns), a lightweight index tracks all machines:

```jsonl
{"machine_id":"lares-abc123","lares_address":"lar:///session/main","status":"active","tier":"durable","seq_num":42,"chronometer":"@T.3.2.7"}
{"machine_id":"lares-def456","lares_address":"lar:///task/uri-schema","status":"completed","tier":"ephemeral","seq_num":15,"chronometer":"@O.3.2"}
```

Updated only on status change, spawn, seal, or fork. Subject to 200-line discipline (Claude Code Pattern 5 — L1 cap).

---

## 5. Open Questions

| Q# | Question | Register | Notes |
|---|---|---|---|
| R1 | Ledger file format — JSONL vs structured markdown? | `~:confidence[S],[13]` | JSONL aligns with STATE.jsonl conventions |
| R2 | Build version scheme — content hash vs semver vs both? | `~:confidence[SP],[9]` | Content hash preferred for integrity; semver for human readability |
| R3 | Ledger location — `lares/registry/LEDGER.jsonl` vs `lares/PROMOTION_LEDGER.jsonl`? | `~:confidence[S],[11]` | Design tree vs crystal tree; different audiences |
| R4 | Should the resolver be a runtime tool or a design-time reference? | `~:confidence[S],[12]` | Alpha: design-time reference; future: runtime resolver |
| R5 | When is `semantic_sha256` ready to promote from deferred to required? | `~:confidence[SP],[9]` | Requires: normalization spec written, prototype run executed on at least one real artifact, two independent tools produce identical hash. Until then, `null` in all ledger entries (use `file_sha256` for integrity). |

---

*This document is a working design stub. It settles enough of the registry contract to support URI assignment from sprint 0 outputs. Full registry design follows after the URI schema promotes to `~:confidence[C],[19]`.*
