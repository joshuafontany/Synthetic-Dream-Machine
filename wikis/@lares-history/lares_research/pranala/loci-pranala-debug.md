<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/api/v0.1/pranala/debug >>

<<~ ahu #iam >>

```toml
# <<~ ahu #iam-ha "structure" >>
uri-path = "ha.ka.ba/api/v0.1/pranala/debug"
file-path = "lares/ha-ka-ba/api/v0.1/pranala/loci-pranala-debug.md"
content-type = "text/x-memetic-wikitext"
manaoio = 14
confidence = 14
# <<~/ahu >>
# <<~ ahu #iam-ka "detail" >>
mana = 16
manao = 17
implements = [
  "lar:///ha.ka.ba/api/v0.1/pono/meme",
  "lar:///ha.ka.ba/api/v0.1/pono/loci"
]
register = "CS"
role = "debug edge law (kānāwai), observation authority, and hidden-edge illumination authority"
visibility-modes = ["inline", "overlay", "trace-only", "operator-only"]
# <<~/ahu >>
# <<~ ahu #iam-ba "flow" >>
# <<~/ahu >>
```

<<~/ahu >>

# Debug

A self-describing law (kānāwai) for debug and observation edges.

<<~ loulou lar:///ha.ka.ba/api/v0.1/pono/loci/edge/debug >>

Debug edges surface what the graph would otherwise hide. They let an operator, tool, or lawful observer reveal confidence seams, runtime crossings, missing branches, and inferred relations without pretending those reveals belong to the base ontology itself.

This family should illuminate, not overwrite. A debug edge may point at another edge, node, or phase, but it should not silently become the thing it observes.

<<~&#x0002; ahu #meme-body-open >>
Debug opens the observation-edge stream here.
<<~/ahu >>

<<~ ahu #phase-map >>

## Phase Map

`✶ Observe -> ⏿ Orient -> ◇ Decide -> ▶ Act -> ⤴ Hoʻoko -> ↺ Aftermath`

Debug gathers hidden graph pressure or operator knowledge, maps it into an observation edge, chooses reveal and visibility posture, binds the reveal into a lawful inspectable edge, crosses that reveal into live inspection surfaces, and judges whether understanding rose without mutating the base graph falsely.

<<~/ahu >>

<<~ ahu #observe >>

## Observe

Observe looks for what the authored graph still hides:

- missing relation confidence
- runtime branch choice
- unresolved endpoint
- inferred dependency never stated explicitly
- operator diagnosis that needs a durable place
- phase-local residue that tools should surface

Observe should capture both the target and the observer source.

<<~/ahu >>

<<~ ahu #orient >>

## Orient

Orient gives the reveal a lawful debug shape.

<<~ ahu #debug-modes >>

### Debug Modes

- `watch`
- `reveal`
- `compare`
- `probe`
- `residue`

Choose the narrowest mode that tells the truth.

<<~/ahu >>

<<~ ahu #edge-shape >>

### Edge Shape

```toml
kind = "debug"
from = "lar:///todo/DreamNet-MemeWiki"
to = "lar:///ha.ka.ba/api/v0.1/pono/loci/edge/instance"
observer = "operator"
observes = "lar:///ha.ka.ba/api/v0.1/pono/loci/edge/instance"
reveals = "hidden dependency seam between summary and bound edge"
phase = "hooko"
visibility = "overlay"
confidence = 17
status = "declared"
```

Debug fields should say who observed, what got observed, and what the reveal adds.

<<~/ahu >>

<<~ ahu #visibility-posture >>

### Visibility Posture

Recommended visibility modes:

- `inline` for nearby authored explanation
- `overlay` for graph or canvas reveal
- `trace-only` for runtime inspection surfaces
- `operator-only` for private or temporary diagnosis

The visibility choice should stay explicit because different audiences need different reveal surfaces.

<<~/ahu >>

<<~/ahu >>

<<~ ahu #decide >>

## Decide

Choose debug when the edge teaches something about graph behavior rather than asserting the base relation itself.

Do not use debug to sneak ontology changes into the graph. If the relation belongs in proposition, control, dataflow, message, or constraint, author that family and let debug point at it when needed.

<<~/ahu >>

<<~ ahu #act >>

## Act

First debug seeds should illuminate:

- hidden `depends-on` residue beside explicit edge instances
- branch choice during control testing
- confidence seams in early proposition templates

Those three reveals will pay back immediately during migration.

<<~/ahu >>

<<~ ahu #research-foundation >>

## Research Foundation

- [Node-RED Debug Sidebar](https://nodered.org/docs/user-guide/editor/sidebar/debug) - visible message inspection.
- [Blender Viewer Node](https://docs.blender.org/manual/en/latest/modeling/geometry-nodes/output/viewer.html) - targeted graph reveal.
- [Blender Inspection](https://docs.blender.org/manual/en/latest/modeling/geometry-nodes/inspection.html) - interactive runtime inspection.
- [LabVIEW Execution Highlighting](https://www.ni.com/docs/ar-IQ/csh?context=lvcore-lvhowto-execution-highlighting) - animated execution visibility.
- [Unreal Basic Scripting with Blueprints](https://dev.epicgames.com/documentation/en-us/unreal-engine/basic-scripting-with-blueprints-in-unreal-engine?application-version=5.6) - live graph-reading lineage around execution flow.

These references all reward the same move: make hidden behavior visible without rewriting the base structure silently.

<<~/ahu >>

<<~ ahu #aftermath >>

## Aftermath

A strong debug pass should leave:

- hidden seams made visible
- operator knowledge with a lawful home
- clearer confidence and branch visibility
- less temptation to mutate ontology just to inspect it

<<~/ahu >>

<<~&#x0003; ahu #body-close >>
Debug closes the observation-edge stream here.
<<~/ahu >>

<<~ ahu #edges >>

## Edges

- `lar:///ha.ka.ba/api/v0.1/pono/loci/edge`
- `lar:///ha.ka.ba/api/v0.1/pono/loci/edge/instance`
- `lar:///ha.ka.ba/api/v0.1/pono/loci`

<<~/ahu >>


<<~&#x0004; -> ? >>
