<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/api/v0.1/pranala/control >>

<<~ ahu #iam >>

```toml
# <<~ ahu #iam-ha "structure" >>
uri-path = "ha.ka.ba/api/v0.1/pranala/control"
file-path = "lares/ha-ka-ba/api/v0.1/pranala/loci-pranala-control.md"
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
role = "control-flow edge law (kānāwai), branch authority, and execution-order authority"
# <<~/ahu >>
# <<~ ahu #iam-ba "flow" >>
# <<~/ahu >>
```

<<~/ahu >>

# Control

A self-describing law (kānāwai) for control-flow edges.

<<~ loulou lar:///ha.ka.ba/api/v0.1/pono/loci/edge/control >>

Control edges carry execution order. They name which pulse, branch, outlet, or gate moves next. They should not pretend to carry semantic truth or bulk data at the same time.

This family matters early because it forces discipline. Once control enters the graph, vague dependency language quickly stops helping.

<<~&#x0002; ahu #meme-body-open >>
Control opens the execution-edge stream here.
<<~/ahu >>

<<~ ahu #phase-map >>

## Phase Map

`✶ Observe -> ⏿ Orient -> ◇ Decide -> ▶ Act -> ⤴ Hoʻoko -> ↺ Aftermath`

Control gathers execution-order pressure, maps it into pulse and outlet shape, chooses the lawful branch or gate semantics, binds the route into explicit control edges, crosses those edges into live flows or tools, and judges whether order now reads clearly without semantic overload.

<<~/ahu >>

<<~ ahu #observe >>

## Observe

Observe looks for implied execution:

- one step must happen before another
- one branch fires on true and another on false
- one gate suppresses or opens a route
- one sequence fans control across several outlets
- one reset or loop-back returns control upstream

Observe should separate control claims from nearby data or semantic claims before Orient.

<<~/ahu >>

<<~ ahu #orient >>

## Orient

Orient chooses the control primitive and outlet shape.

<<~ ahu #control-primitives >>

### Control Primitives

- `pulse`
- `branch`
- `sequence`
- `gate`
- `loop-back`
- `reset`

Branch meaning usually belongs to the node or gate. The edge should carry the outlet label that tells a reader which route fired.

<<~/ahu >>

<<~ ahu #edge-shape >>

### Edge Shape

```toml
kind = "control"
from = "lar:///ha.ka.ba/api/v0.1/pono/loci/edge/template"
to = "lar:///ha.ka.ba/api/v0.1/pono/loci/edge/instance"
label = "binds-next"
direction = "forward"
branch-label = "then"
gate = "sequence"
confidence = 18
render-mode = "pulse-wire"
status = "declared"
```

`direction` should default to `forward`. Reverse views may help analysis later, but authoring truth usually reads forward.

<<~/ahu >>

<<~ ahu #branch-posture >>

### Branch Posture

Control edges should show branch choice explicitly:

- `then`
- `else`
- `true`
- `false`
- `default`
- `loop`
- `completed`

Do not hide branch choice in surrounding prose when the graph itself needs to teach the route.

<<~/ahu >>

<<~/ahu >>

<<~ ahu #decide >>

## Decide

Choose control when the edge carries order.

Do not choose control when the edge really says:

- what something means
- what value travels
- what event topic routes
- what observation revealed

If one surface needs both control and data, split them. Mature graph tools keep those wires distinct for a reason.

<<~/ahu >>

<<~ ahu #act >>

## Act

First control seeds should stay small:

- branch
- sequence
- gate

Those three already cover most early graph pressure in authoring and invocation flow.

<<~/ahu >>

<<~ ahu #research-foundation >>

## Research Foundation

- [Unreal Basic Scripting with Blueprints](https://dev.epicgames.com/documentation/en-us/unreal-engine/basic-scripting-with-blueprints-in-unreal-engine?application-version=5.6) - execution wires versus data pins.
- [Unreal Flow Control](https://dev.epicgames.com/documentation/en-us/unreal-engine/flow-control?application-version=4.27) - branch, sequence, gate, loop, and control outlets.
- [Unreal Functions: Pure vs Impure](https://dev.epicgames.com/documentation/en-us/unreal-engine/functions-in-unreal-engine?application-version=5.6) - call sites that require exec versus value-only flow.
- [LabVIEW Block Diagram Data Flow](https://www.ni.com/docs/en-US/bundle/labview/page/block-diagram-data-flow.html) - contrast pressure between execution order and value availability.

These references converge on one lesson: control edges should stay visible and separate.

<<~/ahu >>

<<~ ahu #aftermath >>

## Aftermath

A strong control pass should leave:

- explicit route order
- explicit branch labels
- less confusion between meaning and execution
- clearer node responsibility for gating or fan-out

<<~/ahu >>

<<~&#x0003; ahu #body-close >>
Control closes the execution-edge stream here.
<<~/ahu >>

<<~ ahu #edges >>

## Edges

- `lar:///ha.ka.ba/api/v0.1/pono/loci/edge`
- `lar:///ha.ka.ba/api/v0.1/pono/loci/edge/template`
- `lar:///ha.ka.ba/api/v0.1/pono/loci/edge/instance`

<<~/ahu >>

<<~&#x0004; -> ? >>
