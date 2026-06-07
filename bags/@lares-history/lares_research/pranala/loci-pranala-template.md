<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/api/v0.1/pranala/template >>

<<~ ahu #iam >>

```toml
# <<~ ahu #iam-ha "structure" >>
uri-path = "ha.ka.ba/api/v0.1/pranala/template"
file-path = "lares/ha-ka-ba/api/v0.1/pranala/loci-pranala-template.md"
content-type = "text/x-memetic-wikitext"
manaoio = 13
confidence = 13
# <<~/ahu >>
# <<~ ahu #iam-ka "detail" >>
mana = 15
manao = 16
implements = [
  "lar:///ha.ka.ba/api/v0.1/pono/meme",
  "lar:///ha.ka.ba/api/v0.1/pono/loci"
]
register = "CS"
role = "template edge sigil law (kānāwai), slot-contract authority, and kahea binding authority"
binding-order = ["invocation", "local-body", "addressed-iam", "session-state", "template-defaults"]
promotion-rule = "repeat-before-promotion"
invocation-surface = "kahea"
# <<~/ahu >>
# <<~ ahu #iam-ba "flow" >>
# <<~/ahu >>
```

<<~/ahu >>

# Template

A self-describing law (kānāwai) for template edge sigils.

<<~ loulou lar:///ha.ka.ba/api/v0.1/pono/loci/edge/template >>

This meme governs the reusable edge form that an author invokes through `kahea`. Template law keeps repeated graph shapes coherent without forcing every edge into boilerplate.

Template law should stay small. It should carry the edge species that repeat enough to deserve slots, defaults, and render posture. It should not swallow every one-off relation just because a template could exist.

<<~&#x0002; ahu #meme-body-open >>
Template opens the reusable-edge-sigil stream here.
<<~/ahu >>

<<~ ahu #phase-map >>

## Phase Map

`✶ Observe -> ⏿ Orient -> ◇ Decide -> ▶ Act -> ⤴ Hoʻoko -> ↺ Aftermath`

Template gathers repeated edge patterns, maps them into slot-bearing reusable forms, chooses which defaults belong in the template and which belong in the call site, binds the template through `kahea`, crosses that binding into concrete instances, and judges whether the template reduced noise without flattening truth.

<<~/ahu >>

<<~ ahu #observe >>

## Observe

Observe looks for edge patterns that repeat with stable meaning:

- same edge family
- same label or outlet naming
- same direction or render posture
- same endpoint class restrictions
- same branch semantics

If only the endpoints vary while the law stays stable, template pressure begins.

<<~/ahu >>

<<~ ahu #orient >>

## Orient

Orient gives the template its slot contract.

<<~ ahu #template-shape >>

### Template Shape

```toml
kind = "proposition"
template-name = "governs"
allowed-from = ["loci", "meme"]
allowed-to = ["loci", "meme"]
required-slots = ["from", "to"]
optional-slots = ["direction", "polarity", "confidence", "payload", "render-mode"]
label-default = "governs"
direction-default = "forward"
render-mode-default = "inline-label"
status-default = "declared"
```

Template fields should declare defaults plainly. Hidden defaults weaken later debugging.

<<~/ahu >>

<<~ ahu #binding-precedence >>

### Binding Precedence

`kahea` binding should follow this order:

1. explicit invocation payload
2. local meme TOML or nearby body detail
3. addressed meme `#iam`
4. session or runtime state
5. template defaults

Later sources may fill gaps. They should not silently overwrite earlier explicit values.

<<~/ahu >>

<<~ ahu #kahea-invocation >>

### Kahea Invocation

````text
<<~ kahea lar:///ha.ka.ba/api/v0.1/pono/loci/edge/template >>
```toml
kind = "proposition"
template-name = "governs"
from = "lar:///ha.ka.ba/api/v0.1/pono/loci/iam"
to = "lar:///ha.ka.ba/api/v0.1/pono/loci/iam/file-path"
confidence = 18
```
````

The call site should fill only what it knows. Template law should fill the lawful defaults and keep the fill order inspectable.

<<~/ahu >>

<<~/ahu >>

<<~ ahu #decide >>

## Decide

Promote a pattern into template only when:

- the pattern repeats
- the repeated shape carries stable meaning
- defaults reduce noise without hiding truth

Keep ad hoc edges as plain instances until repetition justifies promotion. Template sprawl creates the same fog that vague dependency fields created earlier.

<<~/ahu >>

<<~ ahu #act >>

## Act

Seed templates should stay minimal:

- proposition template for `governs`
- control template for branch or sequence outlets
- debug template for reveal or watch edges

Let live authoring test those three before wider canon grows.

<<~/ahu >>

<<~ ahu #research-foundation >>

## Research Foundation

- [VUE Creating Links](https://sites.tufts.edu/vue/01-basic-mapping/creating-links/) - reusable relation presentation with link text.
- [VUE Format Links](https://sites.tufts.edu/vue/02-creating-nodes/c-format-links/) - stable direction and style defaults.
- [Unreal Basic Scripting with Blueprints](https://dev.epicgames.com/documentation/en-us/unreal-engine/basic-scripting-with-blueprints-in-unreal-engine?application-version=5.6) - reusable node-and-wire authoring grammar.
- [Unreal Flow Control](https://dev.epicgames.com/documentation/en-us/unreal-engine/flow-control?application-version=4.27) - repeatable branch and gate shapes.
- [Unreal Functions: Pure vs Impure](https://dev.epicgames.com/documentation/en-us/unreal-engine/functions-in-unreal-engine?application-version=5.6) - visible default behavior per callable form.
- [Graphviz Edge Attributes](https://graphviz.org/docs/edges/) - declarative edge defaults.
- [Graphviz `dir`](https://graphviz.org/docs/attrs/dir/) - explicit direction defaults.

These references support one rule strongly: template defaults should remain explicit and inspectable.

<<~/ahu >>

<<~ ahu #aftermath >>

## Aftermath

A strong template pass should leave:

- fewer repeated edge literals
- clear slot contracts
- inspectable fill order
- no pressure to template every relation immediately

<<~/ahu >>

<<~&#x0003; ahu #body-close >>
Template closes the reusable-edge-sigil stream here.
<<~/ahu >>

<<~ ahu #edges >>

## Edges

- `lar:///ha.ka.ba/api/v0.1/pono/loci/edge`
- `lar:///ha.ka.ba/api/v0.1/pono/loci`
- `lar:///ha.ka.ba/api/v0.1/pono/meme`

<<~/ahu >>

<<~&#x0004; -> ? >>
