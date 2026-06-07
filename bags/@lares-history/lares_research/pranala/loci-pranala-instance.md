<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/api/v0.1/pranala/instance >>

<<~ ahu #iam >>

```toml
# <<~ ahu #iam-ha "structure" >>
uri-path = "ha.ka.ba/api/v0.1/pranala/instance"
file-path = "lares/ha-ka-ba/api/v0.1/pranala/loci-pranala-instance.md"
content-type = "text/x-memetic-wikitext"
manaoio = 13
confidence = 14
# <<~/ahu >>
# <<~ ahu #iam-ka "detail" >>
mana = 15
manao = 16
implements = [
  "lar:///ha.ka.ba/api/v0.1/pono/meme",
  "lar:///ha.ka.ba/api/v0.1/pono/loci"
]
register = "CS"
role = "concrete edge instance law (kānāwai), bound-object authority, and override discipline"
instance-states = ["declared", "bound", "observed", "stale"]
trace-separation = true
template-optional = true
# <<~/ahu >>
# <<~ ahu #iam-ba "flow" >>
# <<~/ahu >>
```

<<~/ahu >>

# Instance

A self-describing law (kānāwai) for bound edge objects.


This meme governs the concrete edge an author or tool can point at directly. It binds actual endpoints, an actual family, actual payload, and an actual confidence posture.

An instance may come from a template or stand alone during migration. Either way, it should stay inspectable. A reader should see what the instance says without reverse-engineering hidden defaults.

<<~&#x0002; ahu #meme-body-open >>
Instance opens the bound-edge-object stream here.
<<~/ahu >>

<<~ ahu #phase-map >>

## Phase Map

`✶ Observe -> ⏿ Orient -> ◇ Decide -> ▶ Act -> ⤴ Hoʻoko -> ↺ Aftermath`

Instance gathers the concrete relation to bind, maps it into a shared edge surface, chooses which defaults remain inherited and which values need explicit override, binds the edge object into a live carrier, crosses that object into graph or tool surfaces, and judges whether the instance carries enough truth to stand on its own.

<<~/ahu >>

<<~ ahu #observe >>

## Observe

Observe captures the concrete edge claim:

- actual `from`
- actual `to`
- actual family
- actual label or outlet
- actual payload if present
- actual confidence posture

Observe should also note whether a template call created the instance or whether the instance entered as direct authoring.

<<~/ahu >>

<<~ ahu #orient >>

## Orient

Orient binds the edge into a stable object surface.

<<~ ahu #instance-shape >>

### Instance Shape

```toml
template = "lar:///ha.ka.ba/api/v0.1/pono/loci/edge/template"
kind = "proposition"
from = "lar:///ha.ka.ba/api/v0.1/pono/loci/iam"
to = "lar:///ha.ka.ba/api/v0.1/pono/loci/iam/file-path"
label = "governs"
direction = "forward"
polarity = "affirming"
confidence = 18
payload = {}
render-mode = "inline-label"
status = "bound"
```

During migration, `template` may remain absent. The instance should still say enough to read lawfully.

<<~/ahu >>

<<~ ahu #instance-state >>

### Instance State

- `declared` means the edge appears in authored form.
- `bound` counts the edge as carrying all required fields for its family.
- `observed` marks a runtime or tool pass that saw the edge in action.
- `stale` means the instance no longer matches the current carrier context.

`observed` does not replace trace law. It only marks that some observation happened.

<<~/ahu >>

<<~ ahu #override-discipline >>

### Override Discipline

An instance may override template defaults, but it should name the override plainly.

Good reasons to override:

- local direction differs
- local confidence differs
- local payload differs
- local render posture differs

Bad reasons to override:

- habit
- uncertainty avoidance
- hiding a weak template

<<~/ahu >>

<<~/ahu >>

<<~ ahu #decide >>

## Decide

Choose instance when a concrete edge needs to exist between actual endpoints now.

Do not use instance to record runtime history. That work belongs to trace later. Do not use instance to hide missing semantics behind a bare pointer. If the edge matters, the object should say what kind it carries.

<<~/ahu >>

<<~ ahu #act >>

## Act

First live migrations can bind instances beside current `depends-on` surfaces.

That dual period should stay temporary. Once an instance carries sharper truth, broad summary fields should later derive from it instead of competing with it.

<<~/ahu >>

<<~ ahu #research-foundation >>

## Research Foundation

- [Node-RED Wires](https://nodered.org/docs/user-guide/editor/workspace/wires) - concrete port-to-port connection surface.
- [Node-RED Core Nodes](https://nodered.org/docs/user-guide/nodes) - routed instances with visible outlets.
- [LabVIEW Block Diagram Data Flow](https://www.ni.com/docs/en-US/bundle/labview/page/block-diagram-data-flow.html) - execution from concrete wire satisfaction.
- [LabVIEW Channel Wires](https://www.ni.com/en-us/support/documentation/supplemental/16/channel-wires.html) - richer typed carried-edge forms.
- [Blender Geometry Nodes Introduction](https://docs.blender.org/manual/en/latest/modeling/geometry-nodes/introduction.html) - socket-bound concrete graph connections.
- [Graphviz Edge Attributes](https://graphviz.org/docs/edges/) - explicit per-edge object metadata.

These references reinforce one pressure: a concrete edge object should stay readable without digging through surrounding inference.

<<~/ahu >>

<<~ ahu #aftermath >>

## Aftermath

A strong instance pass should leave:

- concrete bindable edge objects
- visible inherited defaults
- explicit local overrides
- no confusion between declared relation and observed runtime history

<<~/ahu >>

<<~&#x0003; ahu #body-close >>
Instance closes the bound-edge-object stream here.
<<~/ahu >>

<<~ ahu #edges >>

## Edges

- `lar:///ha.ka.ba/api/v0.1/pono/loci/edge`
- `lar:///ha.ka.ba/api/v0.1/pono/loci/edge/template`
- `lar:///ha.ka.ba/api/v0.1/pono/loci`

<<~/ahu >>

<<~&#x0004; -> ? >>
