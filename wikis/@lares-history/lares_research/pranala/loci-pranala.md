<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/api/v0.1/pranala >>

<<~ ahu #iam >>

```toml
# <<~ ahu #iam-ha "structure" >>
uri-path = "ha.ka.ba/api/v0.1/pranala"
file-path = "lares/ha-ka-ba/api/v0.1/pranala/loci-pranala.md"
content-type = "text/x-memetic-wikitext"
manaoio = 13
confidence = 14
# <<~/ahu >>
# <<~ ahu #iam-ka "detail" >>
mana = 15
manao = 17
implements = [
  "lar:///ha.ka.ba/api/v0.1/pono/meme",
  "lar:///ha.ka.ba/api/v0.1/pono/loci"
]
register = "CS"
role = "root pranala (edge) law (kānāwai), family authority, lifecycle authority, and migration target"
edge-families = ["proposition", "control", "dataflow", "message", "constraint", "debug"]
lifecycle-layers = ["template", "instance", "trace"]
# <<~/ahu >>
# <<~ ahu #iam-ba "flow" >>
# <<~/ahu >>
```

<<~/ahu >>

# Pranala / Edge

A self-describing root law (kānāwai) for explicit graph edges in this stack.

<<~ loulou lar:///ha.ka.ba/api/v0.1/pono/loci/edge >>

This meme gives one outer law for link meaning. It keeps semantic relation, execution order, carried value, message transport, declarative constraint, and observation apart instead of collapsing them into one vague dependency claim.

This meme also keeps family and lifecycle apart. Family answers what an edge means. Lifecycle answers whether an author declares a reusable template, binds a concrete instance, or records an observed trace.

This meme seeds the migration target. Live `#iam` still carries `depends-on` as transitional residue, but new graph work should aim here first.

<<~&#x0002; ahu #meme-body-open >>
Edge opens the explicit-graph law stream here.
<<~/ahu >>

<<~ ahu #phase-map >>

## Phase Map

`✶ Observe -> ⏿ Orient -> ◇ Decide -> ▶ Act -> ⤴ Hoʻoko -> ↺ Aftermath`

Edge gathers hidden relation claims, separates family from lifecycle, chooses the lawful edge kind, binds the chosen shape into authoring practice, crosses that shape into live memes and tools, and judges whether truth density rose while graph fog fell.

<<~/ahu >>

<<~ ahu #observe >>

## Observe

Observe inventories where the current corpus already implies edges without naming them cleanly.

Primary collision sites:

- `depends-on`
- `next`
- `ala` or `aka` semantic relation
- prose-only sequencing
- operator knowledge that never reaches the graph
- runtime flow that only appears in tools or traces

Observe should keep six edge concerns distinct:

- proposition
- control
- dataflow
- message
- constraint
- debug

If one authored line tries to carry more than one concern, Observe should split that pressure before Orient begins.

<<~/ahu >>

<<~ ahu #orient >>

## Orient

Orient keeps family and lifecycle from collapsing into one bucket.

<<~ ahu #edge-families >>

### Edge Families

- `proposition` carries semantic or ontological relation.
- `control` carries execution order, branch, gate, or pulse.
- `dataflow` carries typed value, field, or geometry-like transport.
- `message` carries event or routed message passage.
- `constraint` carries declarative pressure without execution pulse.
- `debug` carries observation, reveal, watch, or operator illumination.

<<~/ahu >>

<<~ ahu #lifecycle-layers >>

### Lifecycle Layers

- `template` declares a reusable edge sigil with slots and defaults.
- `instance` binds one concrete edge between actual endpoints.
- `trace` records an observed edge event, edge failure, or edge firing.

Lifecycle does not replace family. A control-template and a proposition-template differ because family differs first.

<<~/ahu >>

<<~ ahu #shared-fields >>

### Shared Fields

Cross-family edge objects should stay close to one shared surface:

- `kind`
- `from`
- `to`
- `label`
- `direction`
- `polarity`
- `confidence`
- `payload`
- `render-mode`
- `status`

Families may add local fields. Control adds branch and gate semantics. Debug adds `observes` and `reveals`. Proposition adds ontology or relation vocabulary. Shared fields keep the graph readable across families.

<<~/ahu >>

<<~ ahu #migration-posture >>

### Migration Posture

`depends-on` remains lawful as transitional residue in current `#iam`.

That residue should now act as a summary view, not as the sharpest authoring surface. When a relation needs semantics, execution, carried value, runtime reveal, or operator-visible confidence, author the explicit edge object and derive any broad dependency summary later.

<<~/ahu >>

<<~/ahu >>

<<~ ahu #decide >>

## Decide

Decide should follow these rules:

1. choose family before lifecycle
2. keep semantic and runtime edges distinct
3. let nodes own branch meaning when the branch belongs to node logic, not to edge type
4. keep human-readable labels visible even when richer TOML carries more detail
5. derive broad dependency summaries later instead of authoring them first

Do not promote every repeated relation into a template immediately. A plain proposition edge often teaches enough at first pass. Promotion should follow repetition, not anxiety.

<<~/ahu >>

<<~ ahu #act >>

## Act

Seed order for this branch:

1. `lar:///ha.ka.ba/api/v0.1/pono/loci/edge`
2. `lar:///ha.ka.ba/api/v0.1/pono/loci/edge/proposition`
3. `lar:///ha.ka.ba/api/v0.1/pono/loci/edge/template`
4. `lar:///ha.ka.ba/api/v0.1/pono/loci/edge/instance`
5. `lar:///ha.ka.ba/api/v0.1/pono/loci/edge/control`
6. `lar:///ha.ka.ba/api/v0.1/pono/loci/edge/debug`

Second wave should add `dataflow`, `message`, `constraint`, and `trace` after the seed set proves useful on live files.

<<~/ahu >>

<<~ ahu #research-foundation >>

## Research Foundation

Direct prior-art anchors for this edge root:

- [VUE About](https://vue.tufts.edu/about/) - concept-mapping frame and ontology posture.
- [VUE Creating Links](https://sites.tufts.edu/vue/01-basic-mapping/creating-links/) - labeled links and arrowhead options.
- [VUE Format Links](https://sites.tufts.edu/vue/02-creating-nodes/c-format-links/) - link styling and direction display.
- [VUE Ontologies](https://sites.tufts.edu/vue/07-semantic-mapping-and-analysis/a-ontologies/) - imported relation vocabulary.
- [VUE User Guide PDF](https://sites.tufts.edu/vue/files/2023/03/VUEUserGuide-110311-1214-1952.pdf) - connectivity and semantic-map lineage.
- [Cmap Theory of Concept Maps](https://cmap.ihmc.us/docs/theory-of-concept-maps.php) - proposition structure through linking phrases.
- [Unreal Basic Scripting with Blueprints](https://dev.epicgames.com/documentation/en-us/unreal-engine/basic-scripting-with-blueprints-in-unreal-engine?application-version=5.6) - split between exec wires and data pins.
- [Unreal Flow Control](https://dev.epicgames.com/documentation/en-us/unreal-engine/flow-control?application-version=4.27) - branch, sequence, gate, and loop pressure.
- [Unreal Functions: Pure vs Impure](https://dev.epicgames.com/documentation/en-us/unreal-engine/functions-in-unreal-engine?application-version=5.6) - execution dependence versus value relation.
- [Node-RED Wires](https://nodered.org/docs/user-guide/editor/workspace/wires) - port-level routed connections.
- [Node-RED Core Nodes](https://nodered.org/docs/user-guide/nodes) - switch and route behavior.
- [Node-RED Debug Sidebar](https://nodered.org/docs/user-guide/editor/sidebar/debug) - visible runtime inspection.
- [LabVIEW Block Diagram Data Flow](https://www.ni.com/docs/en-US/bundle/labview/page/block-diagram-data-flow.html) - data-arrival execution model.
- [LabVIEW Channel Wires](https://www.ni.com/en-us/support/documentation/supplemental/16/channel-wires.html) - richer carried-transport vocabulary.
- [LabVIEW Execution Highlighting](https://www.ni.com/docs/ar-IQ/csh?context=lvcore-lvhowto-execution-highlighting) - animated runtime reveal.
- [Graphviz Edge Attributes](https://graphviz.org/docs/edges/) - edge-directed render metadata.
- [Graphviz `dir`](https://graphviz.org/docs/attrs/dir/) - forward reverse both none.
- [Blender Geometry Nodes Introduction](https://docs.blender.org/manual/en/latest/modeling/geometry-nodes/introduction.html) - node and socket framing.
- [Blender Geometry Nodes Fields](https://docs.blender.org/manual/en/4.0/modeling/geometry-nodes/fields.html) - carried field semantics.
- [Blender Viewer Node](https://docs.blender.org/manual/en/latest/modeling/geometry-nodes/output/viewer.html) - direct inspection surface.
- [Blender Inspection](https://docs.blender.org/manual/en/latest/modeling/geometry-nodes/inspection.html) - live graph inspection tools.

These tools converge on one repeated lesson: sharp graph work names edge kind explicitly and keeps runtime visibility separate from ontology.

<<~/ahu >>

<<~ ahu #aftermath >>

## Aftermath

A strong edge pass should leave:

- fewer overloaded relation claims
- clearer family boundaries
- visible template versus instance separation
- human-readable labels that still support machine use
- explicit room for operator illumination without ontology drift

<<~/ahu >>

<<~&#x0003; ahu #body-close >>
Edge closes the explicit-graph law stream here.
<<~/ahu >>

<<~ ahu #edges >>

## Edges

- `lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext`
- `lar:///ha.ka.ba/api/v0.1/pono/loci`
- `lar:///ha.ka.ba/api/v0.1/pono/loci/iam`
- `lar:///ha.ka.ba/api/v0.1/pono/meme`

<<~/ahu >>


<<~&#x0004; -> ? >>
