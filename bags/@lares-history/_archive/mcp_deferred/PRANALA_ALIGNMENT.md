> [!IMPORTANT]
> Consumption status: fully-consumed on 2026-04-23.
> Canonical loci-meme: `lar:///ha.ka.ba/@lares/docs/lararium_mcp/ast-execution-render`.
> This non-meme markdown source may become a safe-delete candidate after link checks confirm no required references remain.

# Pranala Family-to-Graph-Plane Alignment Table

Status date: **April 23, 2026**
Source of truth: `packages/lares-core/memes/api/v0.1/pono/pranala.md`
See also: `EDGE_TAXONOMY.md`, `AST_ENVELOPE.md`

Deliverable for: `MCP-TASK-019`

---

## Purpose

This table names which graph plane each pranala family belongs to during compilation,
what lifecycle roles it carries, and how each maps to TiddlyWiki and Unreal comparators.
The compiler uses this to route edge records into the correct typed graph layer.

---

## Family-to-plane table

| Family | Primary graph plane | Secondary plane | DAG required | TiddlyWiki parallel | Unreal parallel |
|---|---|---|---|---|---|
| `control` | identity / provenance (ownership) + execution hierarchy | — | yes | root-widget ownership, startup order | parent-child entity hierarchy and lifetime |
| `relation` | identity / semantic adjacency | — | yes (per pair) | tiddler reference / transclusion adjacency | entity reference, prefab adjacency |
| `dataflow` | AST → execution, live value transport | — | yes | transclusion / widget-fed value flow | component-fed runtime state, transform flow |
| `message` | execution, event routing | — | yes | widget message bubbling | event / signal routing across entity graph |
| `constraint` | validation layer, declarative rule enforcement | AST | yes | parser or render constraint | layout / physics / rule constraint over entities |
| `observe` | inspection / debug overlay | — | yes | shadow transclusion, refresh watch | editor inspection, debug overlays, observer tools |

---

## Role-to-ownership table

`pranala` carries a `role` field that encodes lifetime and composition pressure.
The compiler uses `role` to assign ownership hierarchy within each plane.

| Role | Lifetime pressure | Compiler action |
|---|---|---|
| `owns` | parent controls child lifetime | add to owned-hierarchy edges; topological sort parent before child |
| `composes` | parent assembles child inline | treat as composition boundary in AST; seed composition frame in execution |
| `implements` | source realizes interface contract | interface must resolve before carrier seeds; record carrier → interface binding |
| `references` | weak pointer to peer | no ordering constraint; record as identity-plane adjacency |
| `constrains` | imposes a rule on target | record as constraint-plane edge; validate after target resolves |

---

## Traversal and propagation

`traversal` and `propagation` operate independently on the same arc.

| Field | Values | Compiler use |
|---|---|---|
| `traversal` | `source-to-target`, `target-to-source`, `none` | determines query walk direction in the graph |
| `propagation` | `push-forward`, `push-back`, `pull`, `none` | determines invalidation direction in the execution graph |

A single edge MAY carry `traversal: source-to-target` and `propagation: push-back` simultaneously.
These fields do not collapse into each other; the compiler must record both.

---

## Boot-phase plane assignment

Minimal boot uses only `control` edges with role `owns` or `composes`.
The compiler walks these edges from `lar:///AGENTS` to produce the required-core closure.

| Phase | Planes active | Families walked |
|---|---|---|
| minimal boot | identity / provenance | `control` (owns, composes) only |
| full boot | identity + relation | `control` + `relation` |
| execution instantiation | execution + AST | `dataflow`, `message` |
| validation pass | constraint | `constraint` |
| render projection | render target | all families (propagation read) |
| debug / inspection | inspect layer | `observe` |

---

## Inventory from current API/docs loci

Current explicit pranala usage found in `packages/lares-core/memes/api/` and `lares/`:

| Source locus | Family | Role | From socket | To socket |
|---|---|---|---|---|
| `lar:///AGENTS#preload-e-prime` | `control` | template | `AGENTS#preload-e-prime` | `e-prime#entry` |
| `lar:///AGENTS#preload-ooda-ha` | `control` | template | `AGENTS#preload-ooda-ha` | `ooda-ha#entry` |
| `lar:///AGENTS#preload-lar-uri` | `control` | template | `AGENTS#preload-lar-uri` | `lar-uri#entry` |
| `lar:///AGENTS#threshold-to-mu` | `control` | template | `AGENTS#threshold-to-mu` | `mu#entry` |
| `lar:///AGENTS#threshold-to-lararium` | `control` | template | `AGENTS#threshold-to-lararium` | `lararium#entry` |
| `lar:///AGENTS#to-lares` | `control` | forward | `AGENTS#to-lares` | `LARES` |

These are the first concrete instances; additional pranala sockets appear throughout the carrier tree
and get indexed when the full-boot closure compiler walks them.

---

## DAG invariant

Every pranala edge in every family MUST remain acyclic — directly and transitively.
The only permitted exception: `relation` edges MAY form mutual parallel pairs (A→B and B→A)
to model genuinely symmetric adjacency. Each edge in such a pair remains individually directed.

The compiler MUST check for DAG violations at compile time.
Boot receipt validation reports any violations in `validation.dag_violations`.

---

## Residue

- Full pranala DAG walk with family-filtered traversal is SPRINT-01 compiler work (MCP-TASK-004 follow-on).
- Current boot closure uses the static `required-core` list from AGENTS; pranala-driven walk comes next.
- Full socket inventory across all api/docs loci is a SPRINT-01 index compiler task.
