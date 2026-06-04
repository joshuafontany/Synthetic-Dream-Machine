<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.1/modules/items/porters-pebble >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.1/modules/items/porters-pebble"
file-path = "bags/@sdm/v0.1/modules/items/porters-pebble.md"
type      = "text/x-memetic-wikitext"

title     = "lar:///ha.ka.ba/@sdm/v0.1/modules/items/porters-pebble"
caption   = "Porter's Pebble"
tags = [
  "@sdm/tags/mount/item",
  "@sdm/tags/domain/stuckforce",
]

tagspace  = "sdm"
register  = "CS"
confidence = 15
mana      = 14
manao     = 17
manaoio   = 15
cacheable = true
retain    = true
invariant = false
role      = "Item module: Porter's Pebble — a found stuckforce relic that holds the Floating Disc Power; first proof an item is an entity that #has a Power through the item mount-point (module nesting)"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~&#x0002; >>

# Porter's Pebble

<<~ ahu #has >>
## Composition

An item is **an entity with mount-points**, not a new kind of module. It `#has` the Power it carries and `#has` the `item` mount-point that says *how* that Power is seated in an object. The carried Power keeps its own composition unchanged — this module does **not** re-list Floating Disc's components. That is the whole nesting rule: entity `#has` module; reserve `#composes` for module-to-module wiring.

<<~ pranala #has ? -> lar:///ha.ka.ba/@sdm/v0.1/modules/powers/floating-disc >>
<<~ pranala #has ? -> lar:///ha.ka.ba/@sdm/v0.1/mount-points/item >>
<<~/ahu >>

<<~ ahu #default >>

```toml default
canonical-name = "Porter's Pebble"
epithet = "Stuckforce Relic, the Patient Mule"
holds = "lar:///ha.ka.ba/@sdm/v0.1/modules/powers/floating-disc"
seated-via = "item"
item-slots = 1
p = 2
source = "Ultraviolet Grasslands and the Black City 2e — pebble-machine relic; Floating Disc 'Stuckforce Relic' variant"
```

A smooth, palm-sized pebble of Long Ago make, warm to the touch. Press it and a concave disc of stuckforce unfolds at waist height — the **Floating Disc** Power, run from the relic rather than from the bearer's own practice. The pebble holds the pattern; the bearer need not know the Power.

Per the `item` mount-point: the relic occupies **one inventory slot**, locks its own Life into the object (the pebble powers the disc, not the carrier), and persists until the pebble is dropped, stolen, sundered, or jammed. Pay P from the relic's reserve; a depleted pebble goes inert until it recharges (sunlight, per its Long Ago make).

The carried Floating Disc behaves exactly as its module specifies — same range, duration, overcharge, and mishaps. The pebble changes *who sources the Power and how it is held*, nothing about the Power itself.

### Failure

A botched activation or a sundered pebble follows the `item` mount-point's failure rule: Corruption degrades or curses **the object**, not the bearer — a cracked pebble may drop loads, drift, or lock its disc in place.
<<~/ahu >>

<<~ ahu #variants >>
## Variants

- **Porter's Pebble** — the base relic: one Floating Disc, recharges in sunlight.
- **Caravan Cairn** — a heavier relic seating Floating Disc at its `x2` overcharge by default (5m disc, voice-commanded).
- **Codex-Pebble (container)** — per the `item` container sub-rule, a relic bundling Floating Disc with one or two sibling stuckforce Powers in a single slot.
<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ pranala #template ? -> lar:///ha.ka.ba/@sdm/v0.1/templates/modules/power family:template role:uses >>
<<~ pranala #holds ? -> lar:///ha.ka.ba/@sdm/v0.1/modules/powers/floating-disc family:composition role:holds >>
<<~ pranala #seated-via ? -> lar:///ha.ka.ba/@sdm/v0.1/mount-points/item family:composition role:seated-via >>
<<~ pranala #projects ? -> lar:///ha.ka.ba/@sdm/v0.1/projections/items/ftls-card/porters-pebble family:render role:projects >>
<<~ pranala #witness ? -> lar:///ha.ka.ba/@sdm/v0.1/witness/items/uvg/porters-pebble family:provenance role:witness >>
<<~ pranala #see ? -> lar:///ha.ka.ba/@sdm/v0.1/docs/composition-model family:reference role:see >>

<<~/ahu >>

<<~ ahu #aftermath >>
## Aftermath

- **Nesting decided (Sprint 3).** Item is an entity; it `#has` a Power through the `item` mount-point. No second module type, no `#composes` for entity→module. `#composes` stays reserved for module→module (a Power that triggers or riders another Power).
- **`holds` edge vs `#has`.** This module carries both: the flat `#has` edge proves the uniform shape; the `#holds` relation edge (role:holds) records *which* Power for richer queries. If `#has` alone proves sufficient for card rendering and filters, the `#holds` edge demotes (Principle 6).
- **Container sub-rule** (Codex-Pebble) rides the existing `item` mount-point; it is not a new mount-point. Confirm internal Power cap vs item Level (OGA upgrade economy) when an album becomes an upgradable Hallmark — same open question the `item` mount-point already carries.
<<~/ahu >>

<<~&#x0003; >>

<<~&#x0004; -> ? >>
