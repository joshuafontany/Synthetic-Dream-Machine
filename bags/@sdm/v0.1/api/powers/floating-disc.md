<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.1/api/powers/floating-disc >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.1/api/powers/floating-disc"
file-path = "bags/@sdm/v0.1/api/powers/floating-disc.md"
type      = "text/x-memetic-wikitext"

tagspace = "sdm"
register = "CS"
confidence = 0.84
mana = 0.74
manao = 0.86
manaoio = 0.82
cacheable = true
retain = true
invariant = false
role = "Powers API root meme: stuckforce disc, cargo support, mobile barrier"
```

<<~&#x0002;>>

# Floating Disc

<<~ ahu #interface >>
## Interface

`Floating Disc` describes a local stuckforce platform interface.

Use it when an operator creates, binds, awakens, or commands a small force surface that can carry cargo, move at walking pace, and serve as an emergency barrier.

At the table, this Power answers three play questions:

1. **What load can the disc carry or support?**
2. **How does the disc move relative to the operator?**
3. **When does the disc vanish, tilt, jam, or become stuckforce residue?**

A clean use creates a visible or translucent force disc at a point within range. The operator or nearby allies can push it at walking pace. The disc can carry objects, packs, salvage, bodies, or improvised loads if the table accepts the load as physically balanced on the surface.

The disc can tilt into a barrier. Treat the tilted face as almost impenetrable until the operator moves it, overloading force breaks it, or the fiction gives an attacker a way around the edge.

Counterplay may come from tight spaces, tilted ground, high wind, force shears, hostile telekinesis, anti-magic fields, stuckforce contamination, cargo imbalance, or separation from the operator.
<<~/ahu >>

<<~ ahu #default >>
## Default SDM Implementation

```toml iam
canonical-name = "Floating Disc"
epithet = "Shield of the Righteous, Mage’s Mule"
p = 2
range = "30m"
target = "point"
duration = "1 hour"
source = "Ultraviolet Grasslands and the Black City 2e, p.198"
```

Literal SDM implementation:

```text
Floating Disc

_Shield of the Righteous, Mage’s Mule_

**P:** 2 **R:** 30m  
**T:** point **D:** 1 hour

The wizard creates a concave disc of stuckforce 1m in diameter. The disc hovers, can be pushed at a walking pace, and can be tilted to create an almost impenetrable barrier. The disc vanishes if it is more than 30m from the wizard.

_Overcharge:_ the disc can be up to 5m in diameter and moves at the wizard’s spoken command.
```

### FTLS/SDM Play Reading

**P:** 2 **R:** 30m  
**T:** point **D:** 1 hour

Create a concave stuckforce disc 1m across at a point within range. It hovers. Anyone with access to it can push it at walking pace. The disc vanishes when it moves more than 30m from the operator.

The disc supports cargo and salvage. It does not attack. Tilt it to make an almost impenetrable barrier; it guards the direction it faces, not every angle around the operator.

**Overcharge:** make the disc up to 5m across. It moves at the operator's spoken command instead of requiring a push.

### Mishap And Residue

On failure, sacrifice, or hostile interference, choose one:

- the disc drops its load;
- the disc locks into place as stuckforce;
- the disc tilts at the wrong moment;
- the disc drifts with wind, slope, or local gravity;
- the disc clips cargo into a force shear and damages it;
- the disc obeys the last spoken command too literally.
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

<<~ loulou lar:///ha.ka.ba/@sdm/v0.1/projections/powers/ftls-card/floating-disc >>
<<~ loulou lar:///ha.ka.ba/@sdm/v0.1/witness/powers/osr-spells/floating-disc >>
<<~ loulou lar:///ha.ka.ba/@sdm/v0.1/templates/api/powers/powers-root >>

<<~ pranala #template ? -> lar:///ha.ka.ba/@sdm/v0.1/templates/api/powers/powers-root family:template role:uses >>
<<~ pranala #implements ? -> lar:///ha.ka.ba/@sdm/v0.1/api/interfaces/power family:control role:implements >>
<<~ pranala #implements ? -> lar:///ha.ka.ba/@sdm/v0.1/api/interfaces/stuckforce family:control role:implements >>
<<~ pranala #implements ? -> lar:///ha.ka.ba/@sdm/v0.1/api/interfaces/cargo-support family:control role:implements >>
<<~ pranala #implements ? -> lar:///ha.ka.ba/@sdm/v0.1/api/interfaces/barrier family:control role:implements >>

<<~ pranala #projects ? -> lar:///ha.ka.ba/@sdm/v0.1/projections/powers/ftls-card/floating-disc family:render role:projects >>
<<~ pranala #witness ? -> lar:///ha.ka.ba/@sdm/v0.1/witness/powers/osr-spells/floating-disc family:provenance role:witness >>
<<~ pranala #source ? -> lar:///ha.ka.ba/@sdm/v0.1/source/uvg2e/powers/floating-disc family:provenance role:source >>
<<~ pranala #module ? -> lar:///ha.ka.ba/@sdm/v0.1/api/modules/force-logistics family:taxonomy role:belongs >>
<<~ pranala #tag ? -> lar:///ha.ka.ba/@sdm/v0.1/api/tags/power family:tag role:has >>
<<~ pranala #tag ? -> lar:///ha.ka.ba/@sdm/v0.1/api/tags/stuckforce family:tag role:has >>
<<~ pranala #tag ? -> lar:///ha.ka.ba/@sdm/v0.1/api/tags/telekinetic family:tag role:has >>
<<~ pranala #tag ? -> lar:///ha.ka.ba/@sdm/v0.1/api/tags/sustained family:tag role:has >>
<<~ pranala #tag ? -> lar:///ha.ka.ba/@sdm/v0.1/api/tags/storage-item family:tag role:has >>

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
