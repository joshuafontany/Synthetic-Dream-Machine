> [!IMPORTANT]
> Consumption status: fully-consumed on 2026-04-23.
> Canonical loci-meme: `lar:///ha.ka.ba/@lares/docs/lararium_mcp/ast-execution-render`.
> This non-meme markdown source may become a safe-delete candidate after link checks confirm no required references remain.

# AST Envelope and Node Schema — Lararium MCP

Status date: **April 23, 2026**
Source of truth: `packages/lares-core/memes/api/v0.1/pono/memetic-wikitext.md`, `pranala.md`, `tiddlywiki-filter.md`
Research backing: `research/TIDDLYWIKI_AST_AND_MCP_PARALLELS_2026-04-23.md`

Deliverable for: `MCP-TASK-015`

---

## Four-layer stack

The Lararium compiles carrier source through four distinct graph layers.
Each layer stays typed and separate; none substitutes for another.

```
source text
  ↓
parse / AST graph        — typed nodes, syntax spans, grammar ownership
  ↓
execution graph          — instantiated view/widget nodes, scope, event hooks
  ↓
render projection        — DOM / tldraw / Kowloon / future scene target
```

`lar:///` URIs carry **identity and provenance**; they live above the stack, not inside it.
`pranala` typed edges cross **all planes**; each family belongs to its natural plane.

---

## Identity plane (above the stack)

| Field | Type | Notes |
|---|---|---|
| `uri` | `lar:///` string | canonical carrier address |
| `file_path` | string | relative repo path |
| `iam` | metadata object | extracted `#iam` TOML block |
| `implements` | string[] | declared interface URIs |
| `pranala_edges` | edge[] | typed outbound edges from this carrier |

The identity plane does not carry syntax or execution data.
A carrier record at the identity plane points into the AST layer below it.

---

## AST node schema

Every memetic-wikitext primitive produces at least one AST node.

### Core fields

| Field | Type | Required | Description |
|---|---|---|---|
| `node_id` | string | yes | stable unique ID within a compilation unit; `"{source_uri}#{anchor}"` preferred |
| `type` | string | yes | primitive family: `ahu`, `pranala`, `loulou`, `aka`, `kahea`, `kapu`, `ui`, `hana`, `?` |
| `grammar` | string | yes | `"host"` or a guest grammar key such as `"x-tiddlywiki-filter"` |
| `source_uri` | string | yes | the carrier `lar:///` URI this node was parsed from |
| `source_span` | span object | yes | byte or line offsets in source (see Span below) |
| `anchor` | string or null | no | named fragment anchor if the primitive carries one (`#iam`, `#law`, etc.) |
| `attributes` | object | no | TOML-parsed key-value pairs from the primitive header |
| `children` | node_id[] | no | ordered child node IDs |
| `payload` | string or null | no | body text inside the primitive (for `hana`, guest grammar bodies, etc.) |
| `lowering_hint` | string | no | which execution-graph class this node seeds (see Lowering hints) |

### Span object

```json
{
  "line_start": 42,
  "line_end": 55,
  "char_start": 0,
  "char_end": 120
}
```

Line numbers use 1-based indexing. `char_start` and `char_end` are column offsets within the line.

---

## Primitive-to-type map

| Memetic-wikitext primitive | AST `type` value | Execution lowering hint |
|---|---|---|
| `<<~ ahu #anchor >>` | `ahu` | view-frame or document-section node |
| `<<~ pranala #anchor ? -> target >>` | `pranala` | graph-edge node; lowers into edge record |
| `<<~ loulou target >>` | `loulou` | transclusion reference; lowers into composition frame |
| `<<~ aka target >>` | `aka` | normative reference link; lowers into constraint edge |
| `<<~ kahea mask target >>` | `kahea` | mask invocation; lowers into overlay instantiation |
| `<<~ kapu ... >>` | `kapu` | conditional qualifier; lowers into guard expression |
| `<<~ ui ... >>` | `ui` | UI widget declaration; lowers into widget execution node |
| `<<~ hana #anchor >>` | `hana` | guest grammar worksite; lowers into guest-grammar execution frame |
| `<<~ ? ... >>` | `uncertainty` | uncertainty annotation; carries epistemic metadata |
| `<<~ !DOCTYPE = ... >>` | `doctype` | document-type declaration; identity-layer only, no execution lowering |

---

## Span annotation policy

The parser MUST record source spans for every node.
Spans survive into the execution graph as provenance records.
Render targets MAY use spans for source-map links.

---

## Guest grammar AST envelope

A guest grammar body inside a `hana` worksite produces a **nested** AST node with `grammar` set to the registered grammar key.

```json
{
  "node_id": "lar:///ha.ka.ba/@lares/api/v0.1/pono/meme#skill-worksite",
  "type": "hana",
  "grammar": "host",
  "source_uri": "lar:///ha.ka.ba/@lares/api/v0.1/pono/meme",
  "source_span": {"line_start": 80, "line_end": 95, "char_start": 0, "char_end": 0},
  "anchor": "skill-worksite",
  "attributes": {
    "grammar": "x-tiddlywiki-filter",
    "context": "+currentMeme",
    "profile": "canonical",
    "degrade": "no-op",
    "result-shape": "set"
  },
  "children": ["lar:///ha.ka.ba/@lares/api/v0.1/pono/meme#skill-worksite/guest-body"],
  "payload": null,
  "lowering_hint": "guest-grammar-frame"
}
```

The guest body node:

```json
{
  "node_id": "lar:///ha.ka.ba/@lares/api/v0.1/pono/meme#skill-worksite/guest-body",
  "type": "hana",
  "grammar": "x-tiddlywiki-filter",
  "source_uri": "lar:///ha.ka.ba/@lares/api/v0.1/pono/meme",
  "source_span": {"line_start": 88, "line_end": 92, "char_start": 0, "char_end": 0},
  "anchor": null,
  "attributes": {},
  "children": [],
  "payload": "[all[sigils]links:to[+currentMeme]]",
  "lowering_hint": "x-tiddlywiki-filter-frame"
}
```

The guest body node does NOT expand its payload further in the host AST.
Guest-internal parse detail stays inside the guest grammar's own AST lane.
Host and guest trees stay adjacent, not merged.

---

## Pranala AST node

`pranala` primitives lower into typed edge records rather than document sections.

```json
{
  "node_id": "lar:///AGENTS#preload-e-prime",
  "type": "pranala",
  "grammar": "host",
  "source_uri": "lar:///AGENTS",
  "source_span": {"line_start": 50, "line_end": 65, "char_start": 0, "char_end": 0},
  "anchor": "preload-e-prime",
  "attributes": {
    "family": "control",
    "lifecycle": "template",
    "dir": "both",
    "label": "required-preload",
    "payload": {
      "continue": "lar:///AGENTS#after-e-prime-preload",
      "backlink": "lar:///AGENTS#preload-e-prime",
      "priority": "core",
      "retain": true
    }
  },
  "children": [],
  "payload": null,
  "lowering_hint": "control-edge"
}
```

The `lowering_hint` for a pranala node names its graph-plane target.
Each pranala family lowers into its plane as defined in `EDGE_TAXONOMY.md`.

---

## Validation posture

A node passes minimal validation if:
- `node_id`, `type`, `grammar`, `source_uri`, `source_span` are present
- `type` appears in the primitive-to-type map or the grammar is a registered guest key
- `grammar` is `"host"` or a registered grammar key

A node carrying a `hana` type with a guest grammar key MUST carry `attributes.grammar` matching a registered key.
Malformed guest nodes degrade locally; they do not invalidate the parent parse.

---

## Lowering hints — execution graph targets

| Hint value | Execution-graph class |
|---|---|
| `view-frame` | top-level document section or window |
| `composition-frame` | transclusion composition boundary |
| `graph-edge` | typed edge record (pranala family + role) |
| `constraint-edge` | normative constraint (aka reference) |
| `overlay-frame` | mask/kahea activation frame |
| `guard-expression` | kapu conditional qualifier |
| `ui-widget` | declared interactive UI node |
| `guest-grammar-frame` | hana outer boundary for an admitted guest grammar |
| `x-tiddlywiki-filter-frame` | x-tiddlywiki-filter guest body execution frame |
| `control-edge` | control-family pranala edge |
| `doctype-record` | identity-only; no execution lowering |

---

## MCP exposure

The AST graph exposes as a future compiler tool:

```
lararium.parse_carrier_ast   — parses one carrier and returns its AST nodes
lararium.parse_boot_ast      — parses the full boot closure and returns a combined AST
```

Candidate resources:
```
lar:///ast/carrier?uri=lar:///AGENTS
lar:///ast/boot/minimal
```

These live in SPRINT-02 scope.
The schema defined here fixes the output shape so tool authors can rely on it now.

---

## Residue

- Full parse legality tables belong in `lar:///ha.ka.ba/@lares/api/v0.1/pono/memetic-wikitext` outward.
- Execution graph schema detail lives in `MCP-TASK-017` (MCP-STORY-107).
- Render projection schema lives in `MCP-TASK-018` (MCP-STORY-108).
- TiddlyWiki parse-node mapping into this envelope lives in `TW_AST_MAPPING.md` (MCP-TASK-016).
