<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.1/modules/powers/floating-disc >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.1/modules/powers/floating-disc"
file-path = "bags/@sdm/v0.1/modules/powers/floating-disc.md"
type      = "text/x-memetic-wikitext"

title     = "lar:///ha.ka.ba/@sdm/v0.1/modules/powers/floating-disc"
caption   = "Floating Disc"
tags = [
  "@sdm/tags/domain/stuckforce",
  "@sdm/tags/function/cargo",
  "@sdm/tags/function/barrier",
  "@sdm/tags/hook/sustained",
  "@sdm/tags/mount/trait",
]

tagspace  = "sdm"
register  = "CS"
confidence = 16
mana      = 15
manao     = 17
manaoio   = 16
cacheable = true
retain    = true
invariant = false
role      = "Power module: Floating Disc — a stuckforce disc that hauls cargo and tilts into a barrier"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~&#x0002; >>

# Floating Disc

<<~ ahu #has >>
## Composition

<<~ pranala #has ? -> lar:///ha.ka.ba/@sdm/v0.1/components/domain/stuckforce >>
<<~ pranala #has ? -> lar:///ha.ka.ba/@sdm/v0.1/components/function/cargo >>
<<~ pranala #has ? -> lar:///ha.ka.ba/@sdm/v0.1/components/function/barrier >>
<<~ pranala #has ? -> lar:///ha.ka.ba/@sdm/v0.1/components/hook/sustained >>
<<~ pranala #has ? -> lar:///ha.ka.ba/@sdm/v0.1/mount-points/trait >>
<<~/ahu >>

<<~ ahu #default >>

```toml default
canonical-name = "Floating Disc"
epithet = "Shield of the Righteous, Mage's Mule"
p = 2
range = "30m"
target = "point"
duration = "1 hour"
default-mount = "trait"
source = "Ultraviolet Grasslands and the Black City 2e"
```

**P:** 2 · **R:** 30m · **T:** point · **D:** 1 hour

Create a concave disc of stuckforce one metre across. It hovers at waist height, takes a load, and follows or is pushed at a walking pace. Tilt it and it becomes an almost impenetrable barrier — a wall, a bridge, a roof. It veers from collisions rather than ramming. The disc vanishes if it travels more than 30m from the operator, dropping whatever it carried.

### Overcharge

- **x2 — P:4.** The disc spans up to 5m and moves at the operator's spoken command.
- **x4 — P:8.** Two discs, or one that bears a creature safely (a stretcher, a lift).

### Mishaps

On a botched or interfered read, choose one: the disc drops its load; locks into place as raw stuckforce; tilts at the wrong moment; drifts with wind or slope; shears its cargo; or obeys the last command too literally.
<<~/ahu >>

<<~ ahu #variants >>
## Variants

- **Mage's Mule** — cargo-first: salvage, loot, casualty evacuation, caravan logistics. Seats `trait` or `item`.
- **Shield of the Righteous** — barrier-first: tilted cover, bridge-making, corridor denial. Seats `trait`.
- **Stuckforce Relic** — a found disc or pebble-machine holds position until pushed. Seats `item`.
- **Shrine Porter** — a shrine grants cargo support for offerings or pilgrims. Seats `structure`.
<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ pranala #template ? -> lar:///ha.ka.ba/@sdm/v0.1/templates/modules/power family:template role:uses >>
<<~ pranala #projects ? -> lar:///ha.ka.ba/@sdm/v0.1/projections/powers/ftls-card/floating-disc family:render role:projects >>
<<~ pranala #witness ? -> lar:///ha.ka.ba/@sdm/v0.1/witness/powers/osr-spells/floating-disc family:provenance role:witness >>
<<~ pranala #see ? -> lar:///ha.ka.ba/@sdm/v0.1/docs/composition-model family:reference role:see >>

<<~/ahu >>

<<~ ahu #aftermath >>
## Aftermath

- Default load rating in FTLS terms: inventory slots, bulk, or scene logic?
- Do living creatures ride only on overcharge, or at base with care?
- "Follows the operator" is intrinsic here; if a future leash/trigger links two modules, that wants `#composes`.
- `telekinetic` domain (v0.0 carried it alongside stuckforce): promote a component only if a query needs to split force-types.
<<~/ahu >>

<<~&#x0003; >>

<<~&#x0004; -> ? >>
