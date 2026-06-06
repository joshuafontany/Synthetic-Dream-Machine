<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/graph/traversal >>
```toml iam
uri-path     = "ha.ka.ba/@lares/v0.1/docs/graph/traversal"
file-path = "bags/@lares/v0.1/docs/graph/traversal.md"
type = "text/x-memetic-wikitext"
tagspace     = "stable"
register     = "Synthesis-Canon"
mana         = 17
manaoio      = 17
manao        = 17
role         = "three-tier traversal model, DFS cycle detection, Kahn topological sort, and declared-unresolved law for the pranala-edge DAG compiler"
status-date  = "2026-04-24"
```




<<~ ahu #ooda-ha >>
✶ observe: current compiler walks no edges — it enumerates a static list, then scans a carrier index.
⏿ orient: three distinct graph planes require three distinct traversal tiers; collapsing them loses boot ordering guarantees.
◇ decide: Tier 0 declared-core as fast-path, Tier 1 control-edge DFS walk, Tier 2 one-hop relation expansion.
▶ act: specify each tier's algorithm, stopping condition, and artifact contribution.
⤴ verify: Tier 0 and Tier 1 produce the same 14-locus set before any further walk proceeds.
↺ execution planes (dataflow, message, constraint, observe) route to `ast-execution-render`; this locus covers boot and full-boot only.
<<~/ahu >>

<<~ &#x0002; >>


<<~ ahu #graph-planes >>
## Graph Planes

Pranala families form separate graph planes.
Each plane operates by its own rules and gets traversed by its own algorithm.
Collapsing them into one walk — as the current carrier-index scan does — loses the plane distinctions
that the `PRANALA_ALIGNMENT.md` contract names.

| Plane | Families | Boot role | Walk tier |
|---|---|---|---|
| Identity / Provenance | `control` | gates boot order, owns lifetime | Tier 0, Tier 1 |
| Semantic adjacency | `relation` | expands from control-reachable set | Tier 2 |
| Execution | `dataflow`, `message` | live value transport and event routing | post-boot only |
| Validation | `constraint` | declarative rule enforcement | after Tier 1 + 2 settle |
| Inspection | `observe` | debug overlay | never blocks boot |

UE5's HLOD parallel: each layer forms its own hierarchy with its own loading rules,
not a sub-graph inside the actor containment tree.

<<~/ahu >>

<<~ ahu #tier-0 >>
## Tier 0 — Declared Core (Fast Path)

**Source:** control-family pranala edges with `role:owns` parsed directly from the entry carrier (AGENTS).

**Algorithm:**
1. Parse `control`/`owns` pranala edges from `AGENTS`.
2. Resolve each `to_uri` through the resolver.
3. Read each carrier record (shape, metadata, pranala edges).
4. Produce closure entries in parse order (no reordering — depth 0 = entry, depth 1 = direct owns, depth 2 = sub-graph children).

**Depth assignment:** BFS hop count from entry over `control/owns` edges only.

**Role:** fast cold-start path. One-hop edge scan only. O(N) flat resolution.
Structurally correct: the pranala DAG is the source of truth; no separate manifest list to synchronise.

**Cross-validation:** Tier 0 result gets compared against Tier 1 result in the boot receipt.
Discrepancies surface as `validation.declared_vs_walked` with three fields: `in_declared_only`, `in_walked_only`, `match`.

**When to use Tier 0 alone:**
- minimal boot artifact production
- session cold-start where latency matters more than graph fidelity

<<~/ahu >>

<<~ ahu #tier-1 >>
## Tier 1 — Control Closure (Graph Walk)

**Source:** pranala edges parsed from carrier text, family `control`, any lifecycle.

**Algorithm — DFS with gray/black cycle detection (Kahn extension):**

```
Walk(entry_uri):
  color = {}  # WHITE by default
  order = []
  violations = []

  visit(uri):
    if color[uri] == GRAY:
      record cycle back to uri in violations
      return
    if color[uri] == BLACK:
      return
    color[uri] = GRAY
    load carrier(uri) if not in graph
    parse pranala edges(uri) → filter family=control
    for edge in sorted(control_edges_out(uri)):
      visit(edge.to_uri)
    color[uri] = BLACK
    order.prepend(uri)   # postorder → reverse = topo order

  visit(entry_uri)
  return order, violations
```

**Topological sort (Kahn's algorithm)** applied after DFS to produce stable ordering:
1. Build in-degree map over the control-reachable set.
2. Seed queue with zero-in-degree nodes (entry first).
3. Emit each node; decrement in-degrees of successors; enqueue newly-zero nodes.
4. Any node remaining after the queue drains indicates a cycle (caught by DFS coloring first).

**Depth assignment:** BFS hop count from entry URI. Entry = 0. Each hop increments depth.

**Stopping condition:** walk terminates when no new successors remain unvisited.

**Result:**
- `walked_uris` — topologically sorted list of control-reachable carrier URIs
- `dag_violations` — list of cycle paths, each as a list of URIs forming the cycle
- `declared_unresolved` — list of `DeclaredUnresolved` records (control family only at error severity)

**When to use Tier 1:**
- for the new minimal boot artifact (validates Tier 0, replaces static walk)
- as the base set for Tier 2 expansion

<<~/ahu >>

<<~ ahu #tier-2 >>
## Tier 2 — Relation Expansion (One-Hop)

**Source:** pranala edges parsed from carrier text, family `relation`, any lifecycle.

**Algorithm:**

```
RelationExpand(control_uris):
  seen = set(control_uris)
  additional = []
  for uri in control_uris:
    for edge in relation_edges_out(uri):
      target = edge.to_uri
      if target not in seen:
        seen.add(target)
        additional.append((target, depth_of(uri) + 1))
  return additional
```

**One hop only.** The full boot artifact does not recursively expand relation edges.
Relation edges reach semantic neighbours — they do not gate the boot spine.
Recursive expansion belongs to a future graph query surface, not the boot compiler.

**Depth assignment:** `max(depth of control-reachable sources pointing here) + 1`.

**Result appended to full boot artifact:**
- additional closure entries at depth ≥ 2
- `pranala_edges` — flat list of all `PranalaEdge` records traversed in Tier 1 + Tier 2
- `interface_index` — `{interface_uri: [carrier_uri, ...]}` built from all reachable `implements` bundles
- `invariant_index` — `{invariant_uri: [carrier_uri, ...]}` built from carriers implementing invariant interfaces

**When to use Tier 2:**
- full boot artifact
- session initialisation requiring complete graph context rather than just the threshold spine

<<~/ahu >>

<<~ ahu #cycle-law >>
## Cycle Detection Law

Every pranala edge MUST remain acyclic — directly and transitively — within its family.

**Exception (from pranala law):** `relation` edges MAY form mutual parallel pairs (A→B and B→A)
to model genuinely symmetric adjacency. Each edge in the pair remains individually directed.
The cycle detector skips mutual parallel pairs in the `relation` family only.

**DFS coloring rules:**
- `WHITE` — not yet visited
- `GRAY` — currently on the recursion stack (in-progress)
- `BLACK` — fully explored and emitted

Encountering a `GRAY` node during DFS signals a cycle.
The cycle path records every GRAY node from the current node back to the re-encountered node.

**Artifact consequence:**
- Cycles appear in `validation.dag_violations` as paths: `["lar:///A", "lar:///B", "lar:///A"]`.
- A valid artifact carries `validation.dag_violations = []`.
- An artifact with non-empty `dag_violations` remains structurally invalid until the cycle resolves.

<<~/ahu >>

<<~ ahu #forward-refs >>
## Declared-Unresolved Forward References

Following TerminusDB's temporal model: forward references get asserted as `DeclaredUnresolved` records
rather than causing compilation failure. They remain in the graph with `exists = false`.

**Classification by family:**

| Family | Severity | Appears in |
|---|---|---|
| `control` | `"error"` | `validation.dag_violations` |
| `relation` | `"warning"` | `validation.declared_unresolved` |
| other | `"info"` | not surfaced in boot artifacts |

**Upgrade path:** when the target carrier file appears on disk in a future compilation pass,
the `DeclaredUnresolved` record disappears and the full edge resolves normally.
The boot receipt hash changes to reflect the newly resolved carrier.

<<~/ahu >>

<<~ ahu #phase-table >>
## Boot Phase → Graph Plane Assignment

| Phase | Planes active | Families walked | Tier |
|---|---|---|---|
| minimal boot | identity / provenance | `control` (owns, composes, implements) | Tier 0 + Tier 1 |
| full boot | identity + semantic adjacency | `control` + `relation` | Tier 0 + Tier 1 + Tier 2 |
| execution instantiation | execution + AST | `dataflow`, `message` | post-boot |
| validation pass | constraint | `constraint` | post-boot |
| render projection | render targets | all families (propagation read) | post-boot |
| debug / inspection | inspect layer | `observe` | never blocks boot |

<<~/ahu >>


<<~ ahu #edges >>
## Edges

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:has >>
<<~ pranala #implements-loci ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:control role:has >>
<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:has >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/graph >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/graph/nodes >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/graph/artifacts >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium_mcp/hydration >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/pranala >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
