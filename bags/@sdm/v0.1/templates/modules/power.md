<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.1/templates/modules/power >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.1/templates/modules/power"
file-path = "bags/@sdm/v0.1/templates/modules/power.md"
type      = "text/x-memetic-wikitext"

tagspace  = "sdm"
register  = "CS"
confidence = 15
mana      = 15
manao     = 17
manaoio   = 15
cacheable = true
retain    = true
invariant = false
role      = "root template meme for Power module memes — flat #has composition, lean playable default"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~&#x0002;>>

# Template — Power Module

<<~ ahu #intent >>
## Intent

A Power module meme carries the playable default for one Power and addresses its facets with flat `#has` edges. It loads during play without dragging projection, witness, or design chatter into the hot path.

The canonical SDM Power card (P/R/T/D/Ox + tags) **is** the `#default` block. The `#has` block addresses those tags as components and names the mount-point. That is the whole job.
<<~/ahu >>

<<~ ahu #required-shape >>
## Required Shape

```text
#has         flat Pranala edges to components (components/{facet}/{slug}) and one mount-point
#default     P/R/T/D/Ox, effect text, overcharge, mishaps — canonical Power name as header
#variants    named alternatives that still share the pattern
#edges       #projects, #witness, #template, #see
#aftermath   open questions, not hidden assumptions
```

The TOML `tags` field MUST mirror the `#has` component edges, for TW5-native filter compatibility. Pranala `#has` edges carry graph truth and address the **full meme** (lar: URI); TOML `tags` carry filter sugar and reference the **short tag pointer** (`@sdm/tags/{facet}/{slug}`), which points back to that same meme via its `meme` field.

```toml
tags = ["@sdm/tags/function/ecm-scan", "@sdm/tags/domain/divination", "@sdm/tags/hook/dangerous"]
```
<<~/ahu >>

<<~ ahu #has-law >>
## `#has` Law

- `#has` is **flat**: no `family`, no `role`. The target path prefix carries semantics.
- A module `#has` one mount-point and zero-or-more components.
- Do NOT use the retired `implements` edge, and do NOT link an `interfaces/` meme. That inheritance spine retired with v0.0; v0.1 composes with flat `has`.

```text
<<~ pranala #has ? -> lar:///ha.ka.ba/@sdm/v0.1/components/function/ecm-scan >>
<<~ pranala #has ? -> lar:///ha.ka.ba/@sdm/v0.1/mount-points/trait >>
```
<<~/ahu >>

<<~ ahu #writing-law >>
## Writing Law

- **Heading-naming law.** A visible heading carries content, not the structural ahu id. The H1 is the Power name. `#has` renders as `## Composition`; `#default` carries **no** heading — the statline leads directly under the H1. Never surface `## Has` or `## Default` to a reader.
- **Render-fence law.** Anything meant to render — transclusions, widgets, procedure calls — stays live wikitext, never in a code fence. Fence only what is shown *as text* (TOML data, literal quotes).
- Prefer table-action language over design chat. Name cost, range, target, duration, counterplay directly.
- Keep `#default` reading like a Power entry, not a code block.
- Card wording lives in the projection meme; source archaeology in the witness meme.
- Durable consequences and unsettled calls go in `#aftermath`.
<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ pranala #see ? -> lar:///ha.ka.ba/@sdm/v0.1/docs/composition-model family:reference role:see >>
<<~ pranala #see ? -> lar:///ha.ka.ba/@sdm/v0.1/templates/projections/powers/ftls-card family:template role:see >>
<<~ pranala #see ? -> lar:///ha.ka.ba/@sdm/v0.1/templates/witness/powers/osr-spells family:template role:see >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
