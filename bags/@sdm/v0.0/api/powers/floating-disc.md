<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.0/api/powers/floating-disc >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.0/api/powers/floating-disc"
file-path = "bags/@sdm/v0.0/api/powers/floating-disc.md"
type      = "text/x-memetic-wikitext"
tags      = [
  "lar:///ha.ka.ba/@sdm/tags/posture/ritual",
  "lar:///ha.ka.ba/@sdm/tags/storage/item",
  "lar:///ha.ka.ba/@sdm/tags/domain/stuckforce",
  "lar:///ha.ka.ba/@sdm/tags/domain/telekinetic",
  "lar:///ha.ka.ba/@sdm/tags/function/cargo",
  "lar:///ha.ka.ba/@sdm/tags/function/barrier",
  "lar:///ha.ka.ba/@sdm/tags/hook/sustained",
]

tagspace = "sdm"
register = "CS"
confidence = 17
mana = 15
manao = 17
manaoio = 16
cacheable = true
retain = true
invariant = false
role = "Powers API root meme: stuckforce disc, cargo support, mobile barrier"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~&#x0002;>>

# Floating Disc

<<~ ahu #implements >>
## Implements

This root address carries the default SDM/UVG implementation for the `Floating Disc` Power slot and primary API surface.

<<~ loulou lar:///ha.ka.ba/@sdm/v0.0/interfaces/power >>

<<~ loulou lar:///ha.ka.ba/@sdm/v0.0/interfaces/powers/floating-disc >>

<<~ pranala #implements ? -> lar:///ha.ka.ba/@sdm/v0.0/interfaces/power family:control role:implements >>
<<~ pranala #implements ? -> lar:///ha.ka.ba/@sdm/v0.0/interfaces/powers/floating-disc family:control role:implements >>
<<~/ahu >>

<<~ ahu #default >>
```toml iam
canonical-name = "Floating Disc"
epithet = "Shield of the Righteous, Mage’s Mule"
p = 2
range = "30m"
target = "point"
duration = "1 hour"
source = "Ultraviolet Grasslands and the Black City 2e, ~:p[4]"
```

## Floating Disc

_Shield of the Righteous, Mage’s Mule_

**P:** 2 **R:** 30m  
**T:** point **D:** 1 hour

The wizard creates a concave disc of stuckforce 1m in diameter. The disc hovers, can be pushed at a walking pace, and can be tilted to create an almost impenetrable barrier. The disc vanishes if it is more than 30m from the wizard.

<<~ ahu #default/overcharge >>
### Overcharge

**x2 (P:4):** the disc can be up to 5m in diameter and moves at the wizard’s spoken command.
<<~/ahu >>

<<~ ahu #default/mishaps >>
### Mishaps

On failure, sacrifice, or hostile interference, choose one:

- the disc drops its load;
- the disc locks into place as stuckforce;
- the disc tilts at the wrong moment;
- the disc drifts with wind, slope, or local gravity;
- the disc clips cargo into a force shear and damages it;
- the disc obeys the last spoken command too literally.
<<~/ahu >>

<<~/ahu >>

<<~ ahu #storage >>
## Storage

- **Trait:** stuckforce handling, levitant training, wizardly forcecraft.
- **Item:** pebble-sized force-machine, levitant disc focus, cargo charm.
- **Structure:** shrine porter, dockside force cradle, ship-barge array.
- **Burden:** stuckforce scar, command echo, gravity disagreement.
<<~/ahu >>

<<~ ahu #variants >>
## Variants

- **Mage's Mule:** cargo-first implementation for salvage, dungeon loot, medical evacuation, and caravan logistics.
- **Shield of the Righteous:** barrier-first implementation; favors tilted cover, bridge-making, and corridor denial.
- **Later Levitant Barge:** oldtech or machine implementation; uses a force array instead of a wizard's pattern.
- **Stuckforce Relic:** item implementation; a found disc or pebble-machine holds position until pushed, strapped, or awakened.
- **Shrine Porter:** structure implementation; a local shrine grants temporary cargo support for offerings, relics, or pilgrims.
<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ loulou lar:///ha.ka.ba/@sdm/v0.0/projections/powers/ftls-card/floating-disc >>
<<~ loulou lar:///ha.ka.ba/@sdm/v0.0/witness/powers/osr-spells/floating-disc >>
<<~ loulou lar:///ha.ka.ba/@sdm/v0.0/templates/api/power >>
<<~ loulou lar:///ha.ka.ba/@sdm/v0.0/interfaces/powers/floating-disc >>

<<~ pranala #template ? -> lar:///ha.ka.ba/@sdm/v0.0/templates/api/power family:template role:uses >>

<<~ pranala #projects ? -> lar:///ha.ka.ba/@sdm/v0.0/projections/powers/ftls-card/floating-disc family:render role:projects >>
<<~ pranala #witness ? -> lar:///ha.ka.ba/@sdm/v0.0/witness/powers/osr-spells/floating-disc family:provenance role:witness >>
<<~ pranala #source ? -> lar:///ha.ka.ba/@sdm/v0.0/source/uvg2e/powers/floating-disc family:provenance role:source >>
<<~ pranala #module ? -> lar:///ha.ka.ba/@sdm/v0.0/api/modules/force-logistics family:taxonomy role:belongs >>

<<~/ahu >>

<<~ ahu #residue >>
## Residue

- Decide default load rating in FTLS terms: sacks, inventory slots, bulk, or scene logic.
- Decide whether living creatures count as cargo under SDM implementation or only under overcharge/mishap.
- Clarify barrier coverage: one facing, one doorway, one corridor width, or a mobile shield plane.
- Clarify what counts as more than 30m from the operator: edge, center, or any part of the 5m overcharged disc.
- Decide when failed use creates permanent stuckforce.
<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
