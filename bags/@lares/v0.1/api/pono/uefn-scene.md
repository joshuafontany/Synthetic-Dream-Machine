<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/uefn-scene >>
```toml iam
cacheable = true
file-path = "bags/@lares/v0.1/api/pono/uefn-scene.md"
namespace = "&#x2299;"
register  = "Synthesis"
retain    = true
role      = "UEFN scene decomposition model — Verse scene file → Lararium wiki graph → TW5 filtered views; web3 / NOT Blueprint"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lares/v0.1/api/pono/uefn-scene"
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
Not a pranala edge. Never use `control:has` to express ahu-slot ancestry.

**`control:has`** (N edges per type meme) — Verse class composition. Every URI in a Verse
`class(...)` list becomes one `control:has` edge — the parent class and every interface alike.
`my_device := class(creative_device, challengeable, listenable_t):` → three `control:has` edges
(`creative_device`, `challengeable`, `listenable_t`). The graph holds no privileged is-a parent:
a type *has* its components. Composition only — the `extends` / is-a framing stays retired (web3).

<<~/ahu >>

<<~ ahu #decomposition-law >>

## Decomposition Law

Every UEFN scene element maps to exactly one of three tiddler kinds:

**Type meme** (`lar:///scene-bag/types/{ClassName}`) — one per Verse class definition.
  - `kumu` pragma: element-type declaration
  - `reaction:listenable` edges: OUTPUT event pins (`listenable(T)` fields)
  - `reaction:subscribable` edges: INPUT function pins (public methods of matching arity)
  - `control:has` edges: every URI in the Verse `class(Parent, Iface1, Iface2, ...)` list —
    one edge per item, parent and interfaces alike (no privileged is-a parent)
  - `spatial:contains` edges: nested class relationships

**Instance meme** (`lar:///scene-bag/instances/{placementId}`) — one per placed device.
  - `kahea` edge to its type meme: `<<~ kahea lar:///scene-bag/types/{ClassName} >>`
  - `papalohe` edges: Direct Event Binding wires (`listenable` → subscribable function)
  - Ahu slots: `@editable` property values as child tiddlers

**Scene meme** (`lar:///scene-bag`) — one per scene / level.
  - `spatial:contains` edges: all top-level placed instances
  - `control:has` edge to the base world type (composition, not is-a)

<<~/ahu >>

<<~ ahu #edge-vocabulary >>

## Edge Vocabulary for Scene Graphs

```text
control:has          — Verse class composition: one edge per URI in class(...), parent and
                       interfaces alike (no is-a parent); N edges per type meme
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
(fragment-parent, slot), NOT in pranala edges. Never use `control:has` for
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

# Full component chain for a type (control:has — composition, transitive)
[field:control-has[lar:///types/creative_device]][transitive[control-has]]

# All types that compose a given capability (control:has)
[field:control-has[lar:///types/challengeable]]

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
| Cardinality | `<decides>` | handler is failable (zero or one result) | `heihei` conditional-branch (Verse if/case) |
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
