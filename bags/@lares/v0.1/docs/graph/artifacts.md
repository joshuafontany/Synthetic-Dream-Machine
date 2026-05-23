<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/graph/artifacts >>
```toml iam
uri-path     = "ha.ka.ba/@lares/v0.1/docs/graph/artifacts"
file-path = "bags/@lares/v0.1/docs/graph/artifacts.md"
type = "text/x-memetic-wikitext"
tagspace     = "stable"
register     = "CS"
confidence   = 0.88
mana         = 0.86
manaoio      = 0.82
manao        = 0.86
role         = "content-addressed artifact contract for boot closure compilation — SHA256 scheme, three artifact classes, compaction rules, cache compatibility"
status-date  = "2026-04-24"
```




<<~ ahu #ooda-ha >>
✶ observe: the current boot receipt uses a compilation timestamp as its identity — not content addressing.
⏿ orient: Nix derivations and Bazel action caching both hash inputs; Anthropic prompt caching requires byte-identical prefixes.
◇ decide: SHA256 over canonical carrier bytes plus sorted edge records; timestamp becomes metadata, not identity.
▶ act: specify the hash scheme, three artifact shapes, validation contract, and compaction rule.
⤴ verify: identical source files always produce identical receipt hashes across separate compilation runs.
↺ MemPalace persistence of boot receipts routes to the adapters layer; write-back awaits policy gate.
<<~/ahu >>

<<~&#x0002;>>


<<~ ahu #content-addressing >>
## Content-Addressed Identity

**Problem with timestamp-keyed receipts:**
A timestamp changes every compilation. Two runs over identical source files produce different receipts.
Anthropic's prompt caching requires 100% byte-identical prefixes — a shifting timestamp breaks every cache hit.

**Solution — content-addressed SHA256:**

```
carrier_hash(node):
    if node.virtual:
        SHA256(node.uri.encode() + b":virtual")
    else:
        SHA256(node.uri.encode() + b":" + node.path.read_bytes())

closure_hash(uri_list, edge_list):
    carrier_part = SHA256(
        "\n".join(sorted(carrier_hash(node) for uri in uri_list))
    )
    edge_part = SHA256(
        json.dumps(
            sorted([edge.to_dict() for edge in edge_list], key=lambda e: (e["from_uri"], e["to_uri"])),
            sort_keys=True, separators=(",", ":")
        ).encode()
    )
    SHA256(carrier_part.hexdigest() + ":" + edge_part.hexdigest())
```

**Properties:**
- Identical source files → identical carrier hashes → identical closure hash.
- Any file change → carrier hash changes → closure hash changes → all downstream caches invalidate.
- Edge list changes (new pranala edge in a carrier) → edge part changes → closure hash changes.
- `compiled_at` timestamps remain in artifacts as audit metadata but do not contribute to the hash.

**Anthropic cache compatibility:**
The boot receipt's `sha256` field becomes a stable context cache key.
Clients that carry the previous receipt can compare: if `sha256` matches, the context prefix the LLM already cached remains valid. No need to resend carrier text.

<<~/ahu >>

<<~ ahu #artifact-minimal >>
## Artifact: Minimal Boot

**Scope:** Tier 0 declared-core closure (14 memes from control/owns edges rooted at `AGENTS`).
**MCP resource:** `lar:///boot/minimal`
**Compiler:** `compile_minimal_boot(entry="lar:///AGENTS")`

**JSON shape:**

```json
{
  "artifact": "minimal-boot",
  "compiled_at": "<ISO-8601 UTC>",
  "entry": "lar:///AGENTS",
  "closure": [
    {
      "uri": "lar:///AGENTS",
      "file_path": "lares/AGENTS.md",
      "content_hash": "<sha256>",
      "kind": "caps-file",
      "virtual": false,
      "exists": true,
      "role": "threshold constitution, boot router",
      "hydration_socket": "entry",
      "implements": ["lar:///ha.ka.ba/@lares/v0.1/api/pono/meme", "lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant"],
      "depth": 0
    }
  ],
  "locus_count": 14,
  "validation": {
    "all_resolved": true,
    "all_exist": true,
    "missing": [],
    "dag_violations": [],
    "declared_unresolved": [],
    "declared_vs_walked": {
      "match": true,
      "in_declared_only": [],
      "in_walked_only": []
    }
  },
  "sha256": "<closure_hash>"
}
```

**New fields vs current implementation:**
- `content_hash` per closure entry (was absent)
- `validation.declared_unresolved` (new)
- `validation.declared_vs_walked` (new — Tier 0 vs Tier 1 cross-validation)
- `sha256` at top level (was only in boot receipt)

<<~/ahu >>

<<~ ahu #artifact-full >>
## Artifact: Full Boot

**Scope:** Tier 1 control closure + Tier 2 one-hop relation expansion.
**MCP resource:** `lar:///boot/full`
**Compiler:** `compile_full_boot(entry="lar:///AGENTS")`

**JSON shape extends minimal boot:**

```json
{
  "artifact": "full-boot",
  "compiled_at": "<ISO-8601 UTC>",
  "entry": "lar:///AGENTS",
  "closure": [...],
  "locus_count": "<N>",
  "edge_count": "<E>",
  "pranala_edges": [
    {
      "from_uri": "lar:///AGENTS",
      "from_socket": "lar:///AGENTS#required-preload-e-prime",
      "to_uri": "lar:///ha.ka.ba/@lares/v0.1/api/mu/e-prime",
      "to_socket": "",
      "family": "control",
      "lifecycle": "template",
      "role": null,
      "traversal": "source-to-target",
      "propagation": "none",
      "label": "required-preload",
      "payload": {"continue": "lar:///AGENTS#after-e-prime-preload", "backlink": "lar:///AGENTS#preload-e-prime", "priority": "core", "retain": true, "dir_hint": "both"}
    }
  ],
  "interface_index": {
    "lar:///ha.ka.ba/@lares/v0.1/api/pono/meme": ["lar:///AGENTS", "..."]
  },
  "invariant_index": {
    "lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant": ["lar:///AGENTS", "..."]
  },
  "validation": {
    "all_resolved": true,
    "all_exist": true,
    "missing": [],
    "dag_violations": [],
    "declared_unresolved": []
  },
  "sha256": "<closure_hash>",
  "compiler_note": ""
}
```

**`pranala_edges` now non-empty.** The current stub always returns `[]`. The redesigned compiler populates it from Tier 1 + Tier 2 traversal.

**`interface_index`** maps interface URIs to the carrier URIs that declare them in their `implements` bundle.

**`invariant_index`** maps invariant URIs to carriers that implement invariant interfaces.

<<~/ahu >>

<<~ ahu #artifact-receipt >>
## Artifact: Boot Receipt

**Scope:** digest summary of the most recent minimal boot compilation.
**MCP resource:** `lar:///boot/receipt`
**Compiler:** `compile_boot_receipt(minimal_artifact)`

**JSON shape:**

```json
{
  "artifact": "boot-receipt",
  "compiled_at": "<ISO-8601 UTC>",
  "entry": "lar:///AGENTS",
  "mode": "minimal",
  "locus_count": 14,
  "edge_count": 13,
  "sha256": "<closure_hash — stable cache key>",
  "hash_sequence": [
    {"uri": "lar:///AGENTS", "sha256": "<carrier_hash>", "depth": 0},
    {"uri": "lar:///ha.ka.ba/@lares/v0.1/api/mu/e-prime", "sha256": "<carrier_hash>", "depth": 1}
  ],
  "validation": {
    "all_resolved": true,
    "all_exist": true,
    "missing": [],
    "dag_violations": [],
    "declared_unresolved": [],
    "declared_vs_walked": {"match": true, "in_declared_only": [], "in_walked_only": []}
  },
  "compaction_notes": ""
}
```

**`hash_sequence`** — ordered list of `{uri, sha256, depth}` records in topological (hydration) order.
Each entry mirrors the `content_hash` of the corresponding minimal-boot closure entry.
A client that caches this sequence can verify its Anthropic context prefix is still byte-identical by polling `lar:///INDEXES/hashes` and comparing — without requesting the full artifact.

**`sha256` now uses `closure_hash`** (content-addressed, Tier 0 + carrier bytes)
rather than `SHA256(json.dumps(full_artifact))` (the current implementation).
The new hash stays stable across recompilations of identical source files.

**Cache use:** clients store the receipt and compare `sha256` before requesting a full hydration.
If the hash matches, the LLM context prefix already cached at Anthropic remains valid.

<<~/ahu >>

<<~ ahu #dual-index >>
## Dual-Index Content Resources

Two virtual MCP resources extend the content-address surface beyond the boot artifacts.

| MCP resource | URI | Content |
|---|---|---|
| Hash index | `lar:///INDEXES/hashes` | JSON object: every indexed carrier URI → its `carrier_hash` |
| Content by hash | `lar:///CONTENT/{hash}` | raw carrier text, looked up by reverse hash map |

**`lar:///INDEXES/hashes`** lets a client poll for drift without re-fetching any carrier text.
If every hash in the client's cached `hash_sequence` matches, the Anthropic prompt cache prefix remains valid.

**`lar:///CONTENT/{hash}`** allows a client to fetch a single carrier by content address alone.
This supports cache miss fills and cross-session identity verification without requiring the client to know the carrier's URI path.

**Cache-validity workflow:**

```
1. client holds boot receipt: sha256 + hash_sequence
2. client polls lar:///INDEXES/hashes (lightweight JSON fetch)
3. if all URIs in hash_sequence match — context prefix still valid, skip hydration
4. if any hash differs — identify changed carriers by URI, refetch only those via lar:///CONTENT/{hash}
5. recompile boot receipt, update hash_sequence
```

<<~/ahu >>

<<~ ahu #validation-contract >>
## Validation Contract

Every artifact carries a `validation` object.

| Field | Type | Meaning |
|---|---|---|
| `all_resolved` | `bool` | every URI in the closure resolved through the lar resolver |
| `all_exist` | `bool` | every file-backed carrier exists on disk |
| `missing` | `list[str]` | URIs that resolved but whose files do not exist |
| `dag_violations` | `list[...]` | cycle paths OR control-family declared-unresolved entries |
| `declared_unresolved` | `list[...]` | relation-family declared-unresolved entries (warnings) |
| `declared_vs_walked` | `dict` | Tier 0 vs Tier 1 cross-validation result (minimal boot only) |

A **valid artifact** carries `dag_violations = []`. All other validation fields may carry non-empty lists without invalidating the artifact structurally — they carry diagnostic pressure instead.

<<~/ahu >>

<<~ ahu #compaction >>
## Compaction Rule

When a hydration packet grows past context limits, the compaction pass applies in order:

1. Keep all `closure` entries in full — memes stay intact.
2. Truncate `pranala_edges` to `family: control` edges only.
3. Drop `interface_index` and `invariant_index` body — keep counts only (`interface_count`, `invariant_count`).
4. Record the loss in `compaction_notes` with a brief description of what dropped.

Minimal boot should remain small enough to avoid compaction (14 carriers × ~200 bytes per entry ≈ 2.8 KB).
Full boot may trigger compaction once the relation expansion reaches larger graphs.

<<~/ahu >>


<<~ ahu #edges >>
## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/graph >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/graph/nodes >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/graph/traversal >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium_mcp/hydration >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/graph/nodes >>

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #implements-loci ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:control role:implements >>
<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:implements >>
<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
