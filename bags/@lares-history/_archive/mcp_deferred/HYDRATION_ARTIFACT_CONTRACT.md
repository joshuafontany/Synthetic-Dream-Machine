> [!IMPORTANT]
> Consumption status: fully-consumed on 2026-04-23.
> Canonical loci-meme: `lar:///ha.ka.ba/@lares/docs/lararium_mcp/hydration`.
> This non-meme markdown source may become a safe-delete candidate after link checks confirm no required references remain.

# Hydration Artifact Contract — Lararium MCP

Status date: **April 23, 2026**

Deliverable for: `MCP-TASK-003`

---

## Purpose

Defines the shape and content of compiler-produced hydration artifacts.
The compiler produces three artifact classes: **minimal boot**, **full boot**, and **boot receipt**.
Both human-readable (markdown summary) and machine-oriented (JSON) variants are expected.

---

## Artifact classes

### Minimal boot

Scope: required-core closure only (the 14 loci named in `BOOT_LOCI_INVENTORY.md`).
Purpose: fastest cold-start; sufficient for threshold law, OODA-HA, E-Prime, Mu, Lararium, and LARES.

JSON shape:

```json
{
  "artifact": "minimal-boot",
  "compiled_at": "<ISO-8601 UTC timestamp>",
  "entry": "lar:///AGENTS",
  "closure": [
    {
      "uri": "lar:///AGENTS",
      "file_path": "lares/AGENTS.md",
      "kind": "caps-file",
      "virtual": false,
      "exists": true,
      "role": "threshold constitution, boot router",
      "hydration_socket": "entry",
      "implements": ["lar:///ha.ka.ba/@lares/api/v0.1/pono/meme", "lar:///ha.ka.ba/@lares/api/v0.1/pono/invariant"],
      "depth": 0
    }
  ],
  "locus_count": 14,
  "validation": {
    "all_resolved": true,
    "all_exist": true,
    "missing": []
  }
}
```

Fields per closure locus:

| Field | Type | Description |
|---|---|---|
| `uri` | string | canonical `lar:///` URI |
| `file_path` | string | relative path from repo root |
| `kind` | string | `caps-file`, `caps-virtual`, `tuple-stable`, `tuple-unstable` |
| `virtual` | bool | true if compiler-produced rather than file-backed |
| `exists` | bool | true if disk file is present |
| `role` | string | from `#iam.role` |
| `hydration_socket` | string | where this locus enters the boot graph |
| `implements` | string[] | declared interface URIs |
| `depth` | int | hops from entry; 0 = entry itself |

---

### Full boot

Scope: all loci reachable by walking `control` and `relation` edges from the entry locus.
Purpose: complete hydration for session initialization, graph inspection, and index materialization.

JSON shape extends minimal boot:

```json
{
  "artifact": "full-boot",
  "compiled_at": "<ISO-8601 UTC timestamp>",
  "entry": "lar:///AGENTS",
  "closure": [ ],
  "locus_count": "<N>",
  "edge_count": "<E>",
  "pranala_edges": [
    {
      "from": "lar:///AGENTS",
      "to": "lar:///ha.ka.ba/@lares/api/v0.1/mu/e-prime",
      "family": "control",
      "role": "owns",
      "socket_from": "AGENTS#preload-e-prime",
      "socket_to": "e-prime#entry"
    }
  ],
  "interface_index": {
    "lar:///ha.ka.ba/@lares/api/v0.1/pono/meme": ["lar:///AGENTS", "..."]
  },
  "invariant_index": {
    "lar:///ha.ka.ba/@lares/api/v0.1/pono/invariant": ["lar:///ha.ka.ba/@lares/api/v0.1/pono/meme", "..."]
  },
  "validation": {
    "all_resolved": true,
    "all_exist": true,
    "missing": [],
    "dag_violations": []
  }
}
```

Additional fields vs minimal boot:

| Field | Description |
|---|---|
| `edge_count` | total pranala edges traversed |
| `pranala_edges` | typed edge list with family, role, and socket bindings |
| `interface_index` | interface URI → carrier URIs that implement it |
| `invariant_index` | invariant URI → carrier URIs that carry it |
| `validation.dag_violations` | edges that would form cycles; must be empty for a valid artifact |

---

### Boot receipt

Scope: digest summary of the most recent compiled boot (minimal or full).
Purpose: client-facing confirmation, drift detection, and cache invalidation signal.
Stable shape for serialization to MemPalace continuity lane.

JSON shape:

```json
{
  "artifact": "boot-receipt",
  "compiled_at": "<ISO-8601 UTC timestamp>",
  "entry": "lar:///AGENTS",
  "mode": "minimal | full",
  "locus_count": 14,
  "edge_count": 13,
  "sha256": "<hex digest of the serialized closure JSON>",
  "validation": {
    "all_resolved": true,
    "all_exist": true,
    "missing": [],
    "dag_violations": []
  },
  "compaction_notes": ""
}
```

The `sha256` field digests the serialized closure JSON (not the source files).
It serves as a stable cache key for clients that carry the previous receipt.

---

## Human-readable variants

Each artifact class MAY accompany a markdown summary.
Markdown summary for minimal boot:

```markdown
## Minimal boot — <timestamp>

Entry: lar:///AGENTS
Loci: 14 / 14 resolved, 14 / 14 on disk
SHA: <first 12 hex chars>
```

Markdown summary for full boot additionally lists the interface and invariant index counts.

---

## Exposure via MCP resources

| Artifact | MCP resource URI |
|---|---|
| Minimal boot JSON | `lar:///boot/minimal` |
| Full boot JSON | `lar:///boot/full` |
| Boot receipt JSON | `lar:///boot/receipt` |
| Closure trace (full) | `lar:///graph/closure?entry=lar:///AGENTS&mode=full` |

These are virtual `lar:///` roots; the resolver classifies them as `caps-virtual`.
The compiler materializes them on demand.

---

## Compaction rule

If a hydration packet exceeds context limits, the compaction pass:
1. Keeps `closure` entries in full.
2. Truncates `pranala_edges` to control edges only.
3. Drops `interface_index` and `invariant_index` body; keeps counts only.
4. Records the compaction in `compaction_notes`.

Minimal boot is always small enough to avoid compaction.

---

## Residue

- MemPalace persistence lane for the boot receipt is SPRINT-01 work (MCP-STORY-204).
- Closure compiler implementation is SPRINT-01 work (MCP-STORY-103, MCP-TASK-004).
- The resource endpoint for `lar:///boot/**` is included in the existing resource facade but returns a not-yet-compiled stub until the compiler lands.
