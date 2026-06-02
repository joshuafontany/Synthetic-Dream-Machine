> [!IMPORTANT]
> Consumption status: fully-consumed on 2026-04-23.
> Canonical loci-meme: `lar:///ha.ka.ba/@lares/docs/lararium_mcp/hydration`.
> This non-meme markdown source may become a safe-delete candidate after link checks confirm no required references remain.

# Edge Taxonomy — Lararium MCP

Status date: **April 23, 2026**
Source of truth: `packages/lares-core/memes/api/v0.1/pono/pranala.md`

Deliverable for: `MCP-TASK-002`

---

## Purpose

The MCP compiler must distinguish edges that gate hydration ordering from edges that are optional,
decorative, or runtime-only. This table names each pranala family, its precedence tier, and its
compiler role so the closure algorithm can walk the graph without ambiguity.

---

## Pranala families

| Family | Hydration tier | DAG pressure | Compiler role |
|---|---|---|---|
| `control` | **boot-critical** | strict acyclic required | gates hydration order; owns lifetime |
| `relation` | optional | strict acyclic per pair | semantic adjacency; does not block hydration |
| `dataflow` | runtime | strict acyclic | live value transport; excluded from minimal boot |
| `message` | runtime | strict acyclic | event routing; excluded from minimal boot |
| `constraint` | validation | strict acyclic | declarative rule enforcement; compiler validates, does not walk |
| `observe` | debug | strict acyclic | inspection and shadow; excluded from minimal boot |

---

## Hydration-control edge detail

`control` edges drive the boot sequence.
They carry `role` values that determine ownership and lifetime pressure.

| Role | Meaning | Boot ordering impact |
|---|---|---|
| `owns` | parent owns child lifetime | parent must resolve before child materializes |
| `composes` | parent assembles child inline | child resolves within parent's hydration pass |
| `implements` | source realizes interface contract | interface must resolve before carrier; boot-critical |
| `references` | weak pointer to peer | does not block; peer may resolve independently |
| `constrains` | imposes a rule on target | target must validate against constraint after it resolves |

---

## Adjacency vs control — decision rule

An edge is hydration-critical if and only if its `family` equals `control` **and** its `role` encodes ownership, composition, or interface realization (`owns`, `composes`, `implements`).

All other edges are:
- `relation` → resolved after the identity graph settles
- `dataflow`, `message` → resolved at execution/widget graph stage
- `constraint` → applied during validation after the AST graph settles
- `observe` → deferred to debug/inspection surface; never blocks hydration

---

## Boot closure walk rule

Minimal boot closure:
1. Walk only `control` edges with role `owns` or `composes` from the entry meme.
2. Collect all reachable memes.
3. Resolve in topological order (sources before targets).
4. Stop when the required-core closure is complete.

Full boot closure:
1. Walk all `control` edges.
2. Then walk `relation` edges one hop from each control-reachable meme.
3. Collect and resolve in topological order.
4. Stop when the full pranala graph is exhausted.

`dataflow`, `message`, `constraint`, and `observe` edges enter at their respective graph stages
and do not participate in the boot walk.

---

## Graph plane assignment

| Pranala family | Host graph plane | TiddlyWiki parallel | Unreal parallel |
|---|---|---|---|
| `control` (owns, composes) | identity / provenance, execution hierarchy | root-widget ownership, startup order | parent-child entity hierarchy and lifetime |
| `control` (references, implements) | identity, source | tiddler reference | interface realization |
| `relation` | identity / semantic adjacency | tiddler reference / transclusion adjacency | entity reference, prefab adjacency |
| `dataflow` | AST → execution, live value flow | transclusion / widget-fed value flow | component-fed runtime state or transform flow |
| `message` | execution graph, event routing | widget message bubbling | event or signal routing across entity graph |
| `constraint` | validation layer over AST and execution | parser or render constraint | layout / physics / rule constraint over entities |
| `observe` | debug / inspection overlay | shadow transclusion / refresh watch | editor inspection, debug overlays, observer tools |

---

## Residue

- The full pranala source law lives at `lar:///ha.ka.ba/@lares/api/v0.1/pono/pranala`.
- Lifecycle layers (`template`, `instance`, `trace`) are a compiler-planning concern; this taxonomy stays at the family level.
- Cardinality and propagation fields are compiler inputs but not boot-ordering inputs; defer to SPRINT-01 closure compiler work.
