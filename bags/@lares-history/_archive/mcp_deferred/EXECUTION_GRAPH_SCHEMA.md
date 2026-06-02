> [!IMPORTANT]
> Consumption status: fully-consumed on 2026-04-23.
> Canonical loci-meme: `lar:///ha.ka.ba/@lares/docs/lararium_mcp/ast-execution-render`.
> This non-meme markdown source may become a safe-delete candidate after link checks confirm no required references remain.

# Execution Graph Schema — Lararium MCP

Status date: **April 23, 2026**
Depends on: `AST_ENVELOPE.md`, `EDGE_TAXONOMY.md`, `PRANALA_ALIGNMENT.md`
Research backing: `research/TIDDLYWIKI_AST_AND_MCP_PARALLELS_2026-04-23.md`

Deliverable for: `MCP-TASK-017`

---

## Position in the stack

```
source text
  ↓
AST graph            ← AST_ENVELOPE.md
  ↓
execution graph      ← this document
  ↓
render projection    ← MCP-TASK-018
```

The execution graph holds the **instantiated, live** layer: nodes with scope, hooks, dependency edges,
and refresh semantics.  AST nodes seed execution nodes; they do not become them.

---

## Execution node schema

### Core fields

| Field | Type | Required | Description |
|---|---|---|---|
| `exec_id` | string | yes | stable unique ID; `"{source_uri}#{anchor}/exec"` preferred |
| `ast_node_id` | string or null | yes | the AST node this execution node was seeded from; null for compiler-injected nodes |
| `node_class` | string | yes | execution class (see class table below) |
| `source_uri` | string | yes | the carrier `lar:///` URI this node traces to |
| `scope` | scope object | yes | variable bindings visible to this node |
| `children` | exec_id[] | yes | ordered child execution node IDs (owned hierarchy) |
| `dependency_edges` | dep_edge[] | no | non-owning live-value and event edges |
| `hooks` | hook object | no | event handlers keyed by hook name |
| `state` | object | no | runtime-mutable state; MUST NOT carry source identity |
| `render_hint` | string | no | which render-projection class this node targets |

### Scope object

```json
{
  "parent_exec_id": "lar:///AGENTS#after-mu-handoff/exec",
  "variables": {
    "+currentMeme": "lar:///ha.ka.ba/@lares/api/v0.1/pono/meme",
    "sessionMode": "minimal"
  }
}
```

Variables resolve outward through the owned hierarchy.
A variable defined at depth 0 remains visible to all descendants unless shadowed.

### Dependency edge

```json
{
  "dep_id": "dep:lar:///AGENTS#preload-e-prime->e-prime#entry",
  "from_exec_id": "lar:///AGENTS#preload-e-prime/exec",
  "to_exec_id": "lar:///ha.ka.ba/@lares/api/v0.1/mu/e-prime#entry/exec",
  "pranala_family": "control",
  "pranala_role": "owns",
  "propagation": "push-forward"
}
```

Dependency edges correspond to `pranala` edges compiled into the execution plane.

### Hook object

```json
{
  "on_activate": "exec:resolve-preload",
  "on_refresh": "exec:re-validate-shape",
  "on_deactivate": null
}
```

Hook names correspond to lifecycle events; values name handler identifiers.
Hook handlers do not carry source text; they reference named execution procedures.

---

## Execution node classes

| Class | Seeded from AST type | Lifecycle | TW widget parallel |
|---|---|---|---|
| `view-frame` | `ahu` | activate → render → deactivate | `$tw.Widget` subclass |
| `composition-frame` | `loulou` | activate → resolve transclusion → merge children → render | `$tw.TranscludeWidget` |
| `control-edge` | `pranala` (control family) | activate → resolve target → propagate | `$tw.Widget` ownership edge |
| `constraint-edge` | `aka` | activate → validate → emit diagnostic | normative reference link |
| `overlay-frame` | `kahea` | activate → load mask → apply stage position | `$tw.SetWidget` / variable scope |
| `guard-expression` | `kapu` | evaluate condition → pass or block children | `$tw.IfWidget` |
| `ui-widget` | `ui` | activate → bind events → render → refresh on dependency change | `$tw.ButtonWidget` or similar |
| `guest-grammar-frame` | `hana` (outer) | activate → admit guest body → run guest executor → collect result | `$tw.MacroCallWidget` |
| `filter-execution-frame` | `hana` (x-tiddlywiki-filter inner) | parse filter AST → execute against scope → return result set | `$tw.FilterWidget` |
| `compiler-injected` | null | system-level nodes; no AST source | root widget, boot kernel |

---

## Refresh semantics

The execution graph propagates invalidation along `dataflow` and `message` pranala edges.
Each node carries a refresh contract:

| Field | Description |
|---|---|
| `refresh_triggers` | set of `exec_id`s whose state change triggers re-execution of this node |
| `refresh_policy` | `"selective"` (check changed set) or `"full"` (always re-execute) |
| `last_refreshed` | monotonic counter; used to detect stale children |

On refresh:
1. The triggering dependency fires a push-forward propagation.
2. Each downstream node checks its `refresh_triggers` set.
3. If the triggering node appears in the set, the downstream node re-executes.
4. Children receive refresh only if the parent changed its output.

This mirrors TiddlyWiki `widget.refresh(changedTiddlers)` but operates on `exec_id` sets
rather than tiddler title sets.

---

## Owned hierarchy and lifetime

`control role:owns` edges in the AST lower into the parent-child `children` list in the execution graph.
The owning parent controls child lifetime:

- parent activates → children activate in topological order
- parent deactivates → children deactivate in reverse order
- parent invalidation propagates to children before siblings

Non-owning edges (`relation`, `dataflow`, `message`, `observe`) appear as `dependency_edges`,
not as children.  They never control lifetime.

---

## Boot execution graph seed

The minimal boot compiler seeds the following root execution nodes from the required-core closure:

| Execution node | Class | Source locus |
|---|---|---|
| `boot/root` | `compiler-injected` | — |
| `boot/agents` | `view-frame` | `lar:///AGENTS` |
| `boot/preload-e-prime` | `control-edge` | `lar:///AGENTS#preload-e-prime` |
| `boot/preload-ooda-ha` | `control-edge` | `lar:///AGENTS#preload-ooda-ha` |
| `boot/preload-lar-uri` | `control-edge` | `lar:///AGENTS#preload-lar-uri` |
| `boot/mu` | `view-frame` | `lar:///ha.ka.ba/@lares/api/v0.1/mu` |
| `boot/lararium` | `view-frame` | `lar:///ha.ka.ba/@lares/api/v0.1/lararium` |
| `boot/lares` | `view-frame` | `lar:///LARES` |

Mu children and Lararium children hang under their parent `view-frame` nodes as owned children.

---

## MCP exposure

Execution graph artifacts will expose as future resources and tools:

| Surface | URI / name |
|---|---|
| Boot execution graph (minimal) | `lar:///exec/boot/minimal` |
| Carrier execution graph | `lar:///exec/carrier?uri=...` |
| Compile tool | `lararium.compile_exec_graph` |

These live in SPRINT-02 implementation scope.
The schema here fixes the output shape for tool authors.

---

## Residue

- Full parser implementation lowering AST → execution nodes is SPRINT-02 work (MCP-STORY-204 dependency).
- Message routing and event propagation detail belong in a future `MESSAGE_ROUTING.md`.
- Render projection contract lives in `MCP-TASK-018` (MCP-STORY-108).
- Guest grammar executor implementation (filter execution frame) is post-v1.
