<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/uefn-scene >>
```toml iam
uri-path  = "ha.ka.ba/@lares/v0.1/api/pono/uefn-scene"
file-path = "bags/@lares/v0.1/api/pono/uefn-scene.md"
type      = "text/x-memetic-wikitext"
register  = "Synthesis"
role      = "UEFN scene decomposition model — Verse scene file → Lararium wiki graph → TW5 filtered views; web3 / NOT Blueprint"
cacheable = true
retain    = true
```

<<~ ahu #head >>

# UEFN Scene Decomposition

A UEFN game scene file decomposes into a Lararium wiki graph. The graph lives in a
content-addressed Automerge bag. TW5 filters render views of that graph. No Blueprint
inheritance patterns enter this model — only Verse class definitions and DEB wires.

Goal: import a UEFN `.verse` / scene file → bag of tiddlers and pranala edges → any peer
holding the bag can render any filtered view of the scene graph without a running UEFN instance.

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #semantic-separation >>

## Semantic Separation — Three Distinct Layers

These three relationships look similar but operate at different levels. Keep them distinct:

**Ahu-slot tree** (document / tiddler structure) — `fragment-parent` + `slot` fields on tiddlers.
One `.md` file decomposes into a root tiddler and N named slot fragment tiddlers. This is the
meme parent/child/grandchild tree. It expresses *document containment*, not type relationships.
Not a pranala edge. Never use `control:implements` to express ahu-slot ancestry.

**`control:extends`** (one edge per type meme) — Verse single class inheritance.
`my_device := class(creative_device):` → one `control:extends` edge, `toUri = creative_device URI`.
One parent per type. This is an is-a relationship at the Verse type level.

**`control:implements`** (N edges per type meme) — Verse interface composition.
`my_device := class(creative_device, challengeable, listenable_t):` →
one `control:extends` (creative_device) + two `control:implements` (challengeable, listenable_t).
Any number of interface edges per type. This is a can-do relationship at the Verse type level.

<<~/ahu >>

<<~ ahu #decomposition-law >>

## Decomposition Law

Every UEFN scene element maps to exactly one of three tiddler kinds:

**Type meme** (`lar:///scene-bag/types/{ClassName}`) — one per Verse class definition.
  - `kumu` pragma: element-type declaration
  - `reaction:listenable` edges: OUTPUT event pins (`listenable(T)` fields)
  - `reaction:subscribable` edges: INPUT function pins (public methods of matching arity)
  - `control:extends` edge: single parent class URI (Verse `class(Parent, ...)` — first item)
  - `control:implements` edges: interface URIs (Verse `class(Parent, Iface1, Iface2, ...)` — remaining items)
  - `spatial:contains` edges: nested class relationships

**Instance meme** (`lar:///scene-bag/instances/{placementId}`) — one per placed device.
  - `kahea` edge to its type meme: `<<~ kahea lar:///scene-bag/types/{ClassName} >>`
  - `papalohe` edges: Direct Event Binding wires (`listenable` → subscribable function)
  - Ahu slots: `@editable` property values as child tiddlers

**Scene meme** (`lar:///scene-bag`) — one per scene / level.
  - `spatial:contains` edges: all top-level placed instances
  - `control:extends` edge to the base world type (single class parent)

<<~/ahu >>

<<~ ahu #edge-vocabulary >>

## Edge Vocabulary for Scene Graphs

```text
control:extends      — single parent class (my_device ← creative_device); one edge per type meme
control:implements   — interface composition (my_device implements challengeable); N edges per type meme
control:owns         — scene contains instance (spatial root → instance)
reaction:listenable  — device emits this OUTPUT event (payload.listenable = event name;
                       payload.verseKind = "listenable"|"event";
                       payload.payloadType = Verse type string)
reaction:subscribable— device exposes this INPUT handler (payload.subscribable = fn name;
                       payload.payloadType; payload.effects = space-separated specifiers)
papalohe             — DEB wire: fromUri instance.listenable → toUri instance.subscribable
                       (payload.listenable + payload.subscribable both required)
spatial:contains     — scene/room contains device instance
spatial:portal       — portal between areas
spatial:adjacent     — neighboring areas

Note: ahu-slot tree (meme parent/child/grandchild structure) lives in tiddler fields
(fragment-parent, slot), NOT in pranala edges. Never use control:extends/implements for
document-level containment.
```

<<~/ahu >>

<<~ ahu #tiddler-filter-views >>

## TW5 Filter Views

Once the scene decomposes into a bag, TW5 filters render arbitrary views:

```text
# All placed instances of a specific type
[field:kumu-type[lar:///scene-bag/types/button_device]]

# All DEB wires in the scene
[tags[papalohe]]

# Reaction graph from a specific emitter
[field:papalohe-from[lar:///scene-bag/instances/spawn-pad-1]]

# All device types that expose OnActivated
[field:reaction-listenable[OnActivated]]

# Full parent chain for a type (control:extends — single inheritance)
[field:control-extends[lar:///types/creative_device]][transitive[control-extends]]

# All types that implement a given interface (control:implements — interface composition)
[field:control-implements[lar:///types/challengeable]]

# All input handlers whose payload type matches agent
[field:reaction-subscribable-payload[agent]]
```

The bag-as-graph property means any of these queries runs over local Automerge state —
no UEFN process, no Epic servers, no network round-trip.

<<~/ahu >>

<<~ ahu #import-pipeline >>

## Import Pipeline (Declared Unresolved)

The import pipeline converts a UEFN project into a Lararium bag. Sprint pending.

```
uefn-project/
  ├── .verse files          → parse Verse class defs → type memes
  ├── scene.umap            → parse instance placements + @editable values → instance memes
  ├── DEB wires (umap data) → papalohe edges on instance memes
  └── spatial hierarchy     → spatial:contains edges on scene meme
```

Output: one Automerge bag per scene. Bag URI: `lar:///project-slug/scene-slug`.

The importer does not need to run inside UEFN — it reads source files. The output bag
works in any Lararium peer: browser, Node server, TW5 wiki.

### Blocking Constraint — DEB Has No Public Export API

**DEB (Direct Event Binding) wires have no standalone export format.**
Epic stores DEB bindings inside each device actor's property blob within the `.umap`
file (standard Unreal Engine actor serialization). No public API, graph file, or
runtime introspection endpoint exposes them independently.

Two viable import paths, each with limits:

| Path | How | Limit |
|---|---|---|
| **`.umap` binary parse** | Read UE asset file directly; deserialize actor properties to extract DEB arrays | Requires UE asset format knowledge; format can shift across engine versions |
| **Verse relay device** | A custom Verse device placed in the level subscribes to all target events on `OnBegin` and emits its own inventory at runtime | Can only observe events it subscribes to; cannot introspect arbitrary device graphs it wasn't designed for |

**Sprint entry gate:** the import pipeline sprint MUST resolve this path before committing to a DEB extraction approach. No code work begins on the importer until one path is selected and prototyped.

<<~/ahu >>

<<~ ahu #verse-effect-specifiers >>

## Verse Effect Specifiers in the Graph

Verse effects are a **bit-vector** (6 families) propagated upward through call chains.
Effect specifiers on device functions carry semantic meaning in the Lararium graph:

| Family | Specifier | Lararium role | Sigil analogue |
|---|---|---|---|
| Suspension | `<suspends>` | INPUT handler is async; may yield | `kukali` wait posture on subscribable |
| Cardinality | `<decides>` | handler is failable (zero or one result) | `heihei` conditional filter |
| Heap | `<transacts>` | handler reads/writes/allocates; rollback-eligible | `pono` correctness assertion edge |
| Purity | `<computes>` | pure function; no side effects; safe to parallelize | `aka` observe-family (frozen read) |
| Divergence | `<converges>` | handler guaranteed to terminate | (future annotation) |
| Prediction | `<predicts>` | deterministic prediction context | (future annotation) |

**`<no_rollback>` (kapu-layer marker):** side effects survive failure.

**`spawn` hides `<suspends>`:** A `spawn` expression absorbs the `<suspends>` effect
of the spawned function. The calling context does NOT need `<suspends>`. This is the
formal mechanism that makes `spawn` an unstructured escape from the task tree. See
`verse-task-tree` for the tree-topology consequence.

**Safe parallelism rule:** Functions without `<writes>` can execute in parallel
without locks. Use `<computes>` or `<reads>` specifiers on subscribable handlers
to signal parallelism-safety in the graph.

These specifiers appear in `KumuSubscribable.effects` and in `reaction:subscribable`
pranala edge payloads. They feed future Verse code generation from the graph.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #to-kumu ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/kumu family:relation role:uses >>
<<~ pranala #to-papalohe ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/papalohe family:relation role:uses >>
<<~ pranala #to-kumu-device ? -> lar:///ha.ka.ba/@lararium/v0.1/mesh/kumu-device family:control role:has >>
<<~ pranala #to-pranala-families ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/pranala-families family:control role:governed-by >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
