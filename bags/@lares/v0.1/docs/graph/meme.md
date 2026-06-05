<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/graph/meme >>
```toml iam
uri-path     = "ha.ka.ba/@lares/v0.1/docs/graph/meme"
file-path = "bags/@lares/v0.1/docs/graph/meme.md"
type = "text/x-memetic-wikitext"
tagspace     = "stable"
register     = "Synthesis-Canon"
mana         = 17
manaoio      = 16
manao        = 17
role         = "PranalaEdge, Meme, and MemeGraph data model contracts for the pranala-edge DAG compiler"
status-date  = "2026-04-24"
renamed-from = "ha.ka.ba/@lares/v0.1/docs/graph/loci"

uncertainty-meme-class-name   = "Meme preferred over CarrierMeme or Locus; not yet ratified in code"
uncertainty-graph-class-name  = "MemeGraph preferred over LociGraph, CarrierGraph, or Graph; not yet ratified in code"
uncertainty-locus-subtype     = "Locus remains valid as the subtype name for memes that implement the pono loci interface; distinct from graph node terminology"
```




<<~ ahu #terminology-note>>

## Terminology Note

*A "meme" is any carrier of a lar URI and is the default node in the graph. A "locus" is a meme that implements the loci interface (see canonical interface at its own URI). Use "meme/memes" for general graph structure, reserving "locus/loci" for interface boundaries and in "implements" blocks as required by canonical law. This distinction is intentional and should be preserved in all design docs and specs.*

<<~/ahu >>

<<~ &#x0002; >>


<<~ ahu #ooda-ha >>
✶ observe: the compiler needs three types — an edge, a meme, and a graph — before any walk can proceed.
⏿ orient: Bazel's depset pattern informs meme structure; canonical pranala kānāwai (`lar:///ha.ka.ba/@lares/v0.1/api/pono/pranala`) governs the full PranalaEdge field set and independence law.
◇ decide: frozen dataclasses for PranalaEdge and Meme; a mutable MemeGraph that builds incrementally from carrier reads.
▶ act: specify field-level contracts for each type and the graph's core operations.
⤴ verify: every field carries a type, a source (where the compiler reads it from), and a default.
↺ deeper parser/render concerns route to `pranala-parser` and `traversal` siblings.
<<~/ahu >>

<<~ ahu #prana-edge >>
## PranalaEdge

One typed, directed, acyclic edge between two sockets.
Produced by the pranala parser from carrier source text.
Stored as a frozen dataclass so that edge records remain hashable and sortable.

| Field | Type | Source | Default |
|---|---|---|---|
| `from_uri` | `str` | enclosing carrier URI | required |
| `from_socket` | `str` | `? ->` resolved fragment URI or explicit `FROM` | carrier URI |
| `to_uri` | `str` | resolved from `TO` expression | required |
| `to_socket` | `str` | explicit `TO#fragment` or empty | `""` |
| `family` | `str` | `family` field in TOML or inline sigil | required |
| `lifecycle` | `str` | `lifecycle` field in TOML | `"instance"` |
| `role` | `str \| None` | `role` field in TOML or inline sigil | `None` |
| `traversal` | `str` | `traversal` field; `dir="both"` → `"source-to-target"` | `"source-to-target"` |
| `propagation` | `str` | `propagation` field in TOML | `"none"` |
| `label` | `str` | `label` field in TOML | `""` |
| `payload` | `dict` | `payload` table in TOML; `dir_hint` appended when `dir` present | `{}` |
| `cardinality` | `str \| None` | `cardinality` field in TOML | `None` |
| `polarity` | `str \| None` | `polarity` field in TOML | `None` |
| `status` | `str` | `status` field in TOML | `"declared"` |
| `confidence` | `float \| None` | `confidence` field in TOML | `None` |
| `render_mode` | `str \| None` | `render-mode` field in TOML | `None` |

**Family values:** `control`, `relation`, `dataflow`, `message`, `constraint`, `observe`

**Lifecycle values:** `template`, `instance`, `trace`

**Role values:** `owns`, `references`, `composes`, `constrains`, `implements`, or `None`

**Cardinality values:** `one-to-one`, `one-to-many`, `many-to-one`, `many-to-many`, or `None`

**Polarity values:** `affirming`, `negating`, `contrasting`, `neutral`, or `None`

**Status values (instance lifecycle):** `declared`, `bound`, `observed`, `stale`
- `declared` — edge appears in authored form
- `bound` — all required fields for its family are present
- `observed` — a runtime or tool pass witnessed the edge firing (does not replace `trace` lifecycle)
- `stale` — edge no longer matches the current carrier context

**Independence law (from canonical pranala kānāwai):**
`family`, `role`, `traversal`, and `propagation` are four independent concerns and MUST NOT collapse into each other.
A single `control` edge MAY carry `traversal: source-to-target` AND `propagation: push-back` simultaneously.

**Hydration-critical predicate:**
An edge gates hydration order when `family == "control"`.
`role` carries ownership semantics independently; the boot walk does not require `role` to determine traversal order.

**Sugar-form origins:**
- `<<~ loulou URI >>` → `family="relation"`, `lifecycle="instance"`, `role=None`
- `<<~ aka URI >>` → `family="observe"`, `lifecycle="instance"`, `role=None`
- `<<~ kahea URI >>` → `family="dataflow"`, `lifecycle="instance"`, `role=None`

<<~/ahu >>

<<~ ahu #locus >>
## Meme

One resolved carrier in the graph. Class name `Meme` preferred; `CarrierMeme` is a fallback if module namespace collision requires disambiguation. Decision deferred to Phase 1.
Built from a `CarrierRecord` (ingress result from `carrier.py`) plus content hash.

**Locus (subtype):**
A meme that carries `control/implements` edges pointing to pono interface URIs is a locus. The subtype name `Locus` remains valid for code paths that need to distinguish interface-implementing memes. It does not replace `Meme` as the general node name.

**ECS parallel (UEFN Scene Graph):**
A meme maps to `entity` — a pure URI container with no embedded business logic.
Each `control/implements` edge maps to a `component` attachment — a capability interface the meme declares.
A `lifecycle: template` pranala edge maps to a `prefab` — declared connectivity the compiler stamps into the walk.
The compiler adds and removes memes via `add_meme` / `dispose` semantics (children cascade on dispose).

| Field | Type | Source | Default |
|---|---|---|---|
| `uri` | `str` | resolver output | required |
| `path` | `Path \| None` | resolver path | `None` for virtual |
| `content_hash` | `str` | `SHA256(uri + ":" + file_bytes)` if file-backed, else `SHA256(uri + ":virtual")` | required |
| `metadata` | `dict` | `#iam` TOML extraction | `{}` |
| `implements` | `tuple[str, ...]` | derived from `edges_out` where `role == "implements"` | `()` |
| `shape` | `CarrierShape` | shape validation result from `carrier.py` | required |
| `edges_out` | `list[PranalaEdge]` | pranala parser output from carrier text | `[]` |
| `virtual` | `bool` | resolver flag | `False` |
| `exists` | `bool` | `path.exists()` for file-backed | `False` for virtual |

**Content hash contract:**

```
meme_hash = SHA256(uri + ":" + file_bytes)
```

For virtual memes: `SHA256(uri + ":virtual")`.
The URI prefix prevents hash collisions between memes with identical content.

<<~/ahu >>

<<~ ahu #declared-unresolved >>
## DeclaredUnresolved

A pranala edge pointing to a URI that the resolver cannot locate on disk.
The compiler records it rather than failing, following the temporal KG pattern
(assert with `t_invalid = future`; upgrade when the target resolves).

| Field | Type | Meaning |
|---|---|---|
| `uri` | `str` | the unresolvable target URI |
| `edge` | `PranalaEdge` | the edge that references this URI |
| `severity` | `str` | `"error"` when `family="control"`, else `"warning"` |

Control-family declared-unresolved entries appear in `validation.dag_violations`.
Relation-family entries appear in `validation.declared_unresolved`.
Neither causes the compilation to abort; the artifact remains valid with a `False` `all_exist` flag.

<<~/ahu >>

<<~ ahu #meme-graph >>
## MemeGraph

Adjacency structure over all reachable memes.
Built incrementally as the compiler reads carriers and parses their pranala edges.

**Uncertainty:** class name `MemeGraph` preferred; `Graph` is a plausible shorter form once the module namespace makes the referent clear. Decision deferred to Phase 1.

**Internal structure:**

```
memes: dict[str, Meme]
    uri → meme

adjacency: dict[str, dict[str, list[PranalaEdge]]]
    family → from_uri → [PranalaEdge, ...]
```

**Core operations:**

| Method | Signature | Behaviour |
|---|---|---|
| `add_meme` | `(uri, record, edges)` → `None` | inserts meme; parses edges into adjacency index |
| `successors` | `(uri, family)` → `list[str]` | outbound target URIs for given family |
| `one_hop_relation` | `(control_uris)` → `set[str]` | relation-edge neighbours of every control-reachable meme, excluding already-reachable |
| `detect_cycles` | `()` → `list[list[str]]` | DFS gray/black coloring over all families |
| `topological_sort` | `(uri_set)` → `list[str]` | Kahn's algorithm (in-degree BFS) restricted to given URI set |
| `closure_hash` | `(uri_list, edge_list)` → `str` | SHA256 of sorted meme hashes + serialised edge records |

**Depset traversal orders supported:**

- `postorder` — leaves before roots (dependency resolution order)
- `preorder` — roots before leaves (hydration loading order)
- `topological` — defers shared memes until all parents visited (Bazel default)

The boot compiler uses `topological` for artifact production.

<<~/ahu >>

<<~ ahu #content-store >>
## Content Store — Dual-Index Design

Two virtual MCP resources form the content-address lookup surface.

### `lar:///INDEXES/hashes`

A JSON object mapping every indexed meme URI to its current `meme_hash`.

```json
{
  "lar:///AGENTS": "sha256:abc123...",
  "lar:///LARES": "sha256:def456...",
  "lar:///ha.ka.ba/@lares/v0.1/api/mu/e-prime": "sha256:..."
}
```

Clients poll this resource to check whether any meme has changed since their last hydration.
If all hashes match the client's cached receipt `hash_sequence`, the Anthropic context prefix stays valid — no resend required.

### `lar:///CONTENT/{hash}`

A virtual resource that maps a `meme_hash` value back to the raw carrier text.
`{hash}` is the full hex digest (e.g., `sha256:abc123...`).

The resolver expands `lar:///CONTENT/sha256:{hex}` → reads the matching meme from disk (looked up by reverse hash map) and returns its text.

**Purpose:** a client can request a single meme by content address without knowing its URI path — useful for cache miss fills and cross-session identity.

**Index contract:**

| Index | URI | Content |
|---|---|---|
| URI → hash | `lar:///INDEXES/hashes` | JSON object, all indexed memes |
| hash → text | `lar:///CONTENT/{hash}` | raw carrier text, virtual |

**`hash_sequence` in boot receipt:**

The boot receipt gains a `hash_sequence` field: an ordered list of `{uri, meme_hash, depth}` records in topological (hydration) order.
This lets a client verify the complete minimal-boot prefix byte-for-byte without re-requesting the full artifact.

<<~/ahu >>


<<~ ahu #edges >>
## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/graph >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/graph/traversal >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/graph/pranala-parser >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/pranala >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/loci >>

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #implements-loci ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:control role:implements >>
<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
