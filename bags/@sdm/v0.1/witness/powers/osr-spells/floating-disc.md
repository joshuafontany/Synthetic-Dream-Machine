<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.1/witness/powers/osr-spells/floating-disc >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.1/witness/powers/osr-spells/floating-disc"
file-path = "bags/@sdm/v0.1/witness/powers/osr-spells/floating-disc.md"
type      = "text/x-memetic-wikitext"

tagspace  = "sdm"
register  = "CS"
confidence = 16
mana      = 11
manao     = 16
manaoio   = 17
cacheable = true
retain    = true
invariant = false
role      = "OSR spell witness for Floating Disc — Basic/Expert/Rules-Cyclopedia provenance, cold-load"
```

<<~&#x0002;>>

# OSR Witness — Floating Disc

<<~ ahu #basic >>
## Basic

```toml witness
name = "Floating Disc"
lane = "Magic-User 1"
range = "0"
duration = "6 turns (1 hour)"
effect = "disc remains within 6 ft"
reversible = false
```

An invisible horizontal platform the size of a small round shield, created at the magic-user's waist height and holding there. It carries up to 5000 cn (500 lb), cannot form in occupied space, and follows the magic-user automatically within 6 ft. It can never be a weapon — no solid existence, moves slowly. At duration's end it vanishes, dropping whatever it bore.
<<~/ahu >>

<<~ ahu #expert >>
## Expert

```toml witness
name = "Floating Disc"
lane = "Magic-User 1"
surface = "spell-list continuity"
standalone-description = false
```

The Expert Set lists MU1 only; the Basic description governs.
<<~/ahu >>

<<~ ahu #cyclopedia >>
## Rules Cyclopedia

```toml witness
name = "Floating Disc"
lane = "Magic-User 1"
range = "0"
duration = "6 turns (1 hour)"
effect = "disc remains within 6 ft"
reversible = false
```

As Basic, with the clarification that the disc follows at the caster's current movement rate and **veers away** from anything it might run into. No saving throw.
<<~/ahu >>

<<~ ahu #analysis >>
## Conversion Analysis

- OSR `Range: 0` (self-following, within 6 ft) → SDM/UVG **R: 30m, point**, a freer force-platform that vanishes past range. The SDM surface widens the leash deliberately.
- `6 turns` → **D: 1 hour** — a long exploration utility, distinct from Read Magic's 10 minutes.
- 5000 cn cargo cap and "never a weapon" anchor it as logistics, not attack — no `attack` hook.
- The RC veer-away / no-save note → soft-collision behaviour (the disc avoids impact). Carries `function/barrier` only when deliberately tilted.
- Occupied-space restriction → cannot conjure inside a creature or packed obstacle.
<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ pranala #template ? -> lar:///ha.ka.ba/@sdm/v0.1/templates/witness/powers/osr-spells family:template role:uses >>
<<~ pranala #witness ? -> lar:///ha.ka.ba/@sdm/v0.1/modules/powers/floating-disc family:provenance role:witness >>
<<~ pranala #source ? -> lar:///ha.ka.ba/@sdm/v0.1/source/becmi/basic family:provenance role:source >>
<<~ pranala #source ? -> lar:///ha.ka.ba/@sdm/v0.1/source/uvg2e/floating-disc family:provenance role:source >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
