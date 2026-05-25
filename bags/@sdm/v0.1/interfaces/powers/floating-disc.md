<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.1/interfaces/powers/floating-disc >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.1/interfaces/powers/floating-disc"
file-path = "bags/@sdm/v0.1/interfaces/powers/floating-disc.md"
type      = "text/x-memetic-wikitext"
tags      = [
  "lar:///ha.ka.ba/@sdm/tags/domain/stuckforce",
  "lar:///ha.ka.ba/@sdm/tags/domain/telekinetic",
  "lar:///ha.ka.ba/@sdm/tags/function/cargo",
  "lar:///ha.ka.ba/@sdm/tags/function/barrier",
  "lar:///ha.ka.ba/@sdm/tags/hook/sustained",
]

tagspace = "sdm"
register = "CS"
confidence = 0.82
mana = 0.72
manao = 0.88
manaoio = 0.78
cacheable = true
retain = true
invariant = false
role = "Power interface meme: create a tethered stuckforce platform for cargo, motion, and directional cover"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~&#x0002;>>

# Interface — Floating Disc

<<~ ahu #interface >>
## Interface

```toml contract
name = "Floating Disc"
operation = "create-stuckforce-platform"
authz = [
  "capability-bearing operator, bearer, shrine, daemon, rite, relic, or table consensus",
  "permission comes from fictional grant, not class identity",
  "implementations may name grant source: memorized spell, scroll, relic, pact, stored charge, shrine consent, or daemon delegation",
]
scope = ["operator anchor", "target point", "tether range", "affected load", "surface orientation"]
inputs = ["P budget", "target point", "operator anchor", "surface orientation"]
requires = [
  "target point lies within tether range",
  "space can receive a concave force surface",
  "load can balance on the offered surface",
]
effects = [
  "open a hovering concave stuckforce surface",
  "support cargo, salvage, bodies, or balanced loads",
  "allow walking-pace push movement",
  "tilt into one directional barrier face",
]
maintains = ["duration", "operator-distance tether", "surface continuity", "orientation"]
ends_when = ["duration expires", "disc exceeds tether range", "counterforce breaks the pattern", "mishap collapses the surface"]
refuses = ["class gate", "default attack behavior", "unbounded flight", "omnidirectional shield", "silent permanent infrastructure"]
emits = ["observable domain facts for hooks; names remain provisional until browser protocols settle"]
```

`Floating Disc` names the core primitive because the OSR and SDM slot already carries strong table recognition. Other spells, relics, structures, daemons, and traits may implement this interface when they open the same cargo-and-barrier affordance.

The interface asks three questions:

1. **What load can the disc carry or support?**
2. **How does the disc move relative to the operator anchor?**
3. **When does the disc vanish, tilt, jam, or leave stuckforce residue?**

Counterplay may come from tight spaces, tilted ground, high wind, force shears, hostile telekinesis, anti-magic fields, stuckforce contamination, cargo imbalance, or separation from the operator anchor.
<<~/ahu >>

<<~ ahu #hooks >>
## Hooks

This worksite names possible play-surface hooks. It does not settle reaction-engine implementation.

```toml hooks
status = "scratch"
surface = "game-session-play-surface"
may_copy_into = ["instanced projection", "session card", "VTT adapter", "browser protocol draft"]
state = ["disc.position", "disc.orientation", "disc.load", "disc.tether", "disc.duration"]
notices = ["opened", "pushed", "tilted", "strained", "vanished", "mishap", "residue"]
filters = ["edge:control:implements[lar:///ha.ka.ba/@sdm/v0.1/interfaces/power] tag:@sdm[domain/stuckforce]", "power:operation[create-stuckforce-platform]"]
adapters = ["tw5 event", "Lararium reaction graph", "browser worker protocol", "VTT active effect", "local-first CRDT patch"]
```

Future `papalohe` wires may subscribe to promoted notices when the reaction engine and play surface agree on payload shape.
<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ pranala #implements ? -> lar:///ha.ka.ba/@sdm/v0.1/interfaces/power family:control role:implements >>
<<~ pranala #implemented-by ? -> lar:///ha.ka.ba/@sdm/v0.1/api/powers/floating-disc family:control role:implemented-by >>

<<~/ahu >>

<<~ ahu #residue >>
## Residue

- Decide whether the stable interface name should remain `Floating Disc` or shift to `Stuckforce Platform` after more implementations arrive.
- Decide default load measure: sacks, slots, bulk, carried creature, or scene logic.
- Promote hook notice names only after browser play sessions teach the payload shape.
<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
