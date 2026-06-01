<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.0/interfaces/powers/shield-ward >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.0/interfaces/powers/shield-ward"
file-path = "bags/@sdm/v0.0/interfaces/powers/shield-ward.md"
type      = "text/x-memetic-wikitext"
tags      = [
  "lar:///ha.ka.ba/@sdm/tags/function/ward",
  "lar:///ha.ka.ba/@sdm/tags/domain/abjuration",
  "lar:///ha.ka.ba/@sdm/tags/hook/imbued",
]

tagspace = "sdm"
register = "CS"
confidence = 16
mana = 14
manao = 17
manaoio = 15
cacheable = true
retain = true
invariant = false
role = "Power interface meme: close personal ward against attacks and missile-pattern intrusion"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~&#x0002;>>

# Interface — Shield Ward

<<~ ahu #interface >>
## Interface

```toml contract
name = "Shield Ward"
source_alias = "Shield"
operation = "raise-personal-ward"
authz = [
  "capability-bearing operator, bearer, charm, rite, relic, daemon, or defensive oath",
  "permission comes from fictional grant, not class identity",
  "implementations may name grant source: memorized spell, ward charm, armor spirit, shield rite, pact, or stored charge",
]
scope = ["operator body", "skin-close barrier", "incoming attack vector", "duration"]
inputs = ["P budget", "operator anchor", "incoming harm type", "ward posture"]
requires = [
  "operator can raise a personal ward around their own body or a permitted bearer",
  "incoming harm can meet the ward surface before impact",
]
effects = [
  "raise a close personal barrier",
  "improve defense against missiles and other attacks by implementation rule",
  "interfere with missile-pattern spells or force projectiles when the implementation names that hook",
]
maintains = ["duration", "body-following barrier", "defensive facing or full shell as implementation states"]
ends_when = ["duration expires", "ward breaks", "operator drops the posture", "countermagic opens the barrier"]
refuses = ["gear identity", "ordinary carried shield ontology", "default party-wide cover", "unbounded immunity"]
emits = ["observable domain facts for hooks; names remain provisional until browser protocols settle"]
```

`Shield Ward` names this Power interface so `Shield` can remain free for gear, item, and broad defense-effect ontology. A conversion from an OSR `Shield` spell may implement this interface, but another defensive Power may also implement `raise-personal-ward` without inheriting every OSR armor-class detail.

The interface asks three questions:

1. **What incoming harm does the ward reduce, deflect, or nullify?**
2. **Does the ward follow the body, face a direction, or cover an area?**
3. **Which special projectiles, spells, or force patterns trigger extra rules?**

Counterplay may come from flank angles, grapples, area effects, anti-magic, ward fatigue, force overload, owner-locks, or effects that bypass the ward surface.
<<~/ahu >>

<<~ ahu #hooks >>
## Hooks

This worksite names possible play-surface hooks. It does not settle reaction-engine implementation.

```toml hooks
status = "scratch"
surface = "game-session-play-surface"
may_copy_into = ["instanced projection", "session card", "defense badge", "browser protocol draft"]
state = ["ward.duration", "ward.coverage", "ward.missile_rating", "ward.melee_rating", "ward.special_hooks"]
notices = ["raised", "attack-filtered", "missile-deflected", "magic-missile-checked", "broken", "expired"]
filters = ["edge:control:implements[lar:///ha.ka.ba/@sdm/v0.0/interfaces/power] tag:@sdm[function/ward]", "power:operation[raise-personal-ward]"]
adapters = ["tw5 event", "Lararium reaction graph", "browser worker protocol", "VTT active effect", "local-first CRDT patch"]
```

Future hooks may map ward notices to defense badges, attack resolution helpers, or anti-missile prompts.
<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ pranala #implements ? -> lar:///ha.ka.ba/@sdm/v0.0/interfaces/power family:control role:implements >>
<<~ pranala #implemented-by ? -> lar:///ha.ka.ba/@sdm/v0.0/api/powers/shield-ward family:control role:implemented-by >>

<<~/ahu >>

<<~ ahu #residue >>
## Residue

- Decide whether `Shield Ward` should split into `personal-ward` and `missile-filter` interfaces after more defensive Powers arrive.
- Decide how SDM+ should express OSR Armor Class deltas without importing AC as the root ontology.
- Decide whether `Magic Missile` style hooks belong in this interface or only in the OSR implementation.
<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
