<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.0/witness/powers/osr-spells/floating-disc >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.0/witness/powers/osr-spells/floating-disc"
file-path = "bags/@sdm/v0.0/witness/powers/osr-spells/floating-disc.md"
type      = "text/x-memetic-wikitext"

tagspace = "sdm"
register = "CS"
confidence = 16
mana = 11
manao = 17
manaoio = 17
cacheable = true
retain = true
invariant = false
role = "OSR spell witness for Floating Disc"
```

<<~&#x0002;>>

# OSR Witness — Floating Disc

<<~ ahu #basic >>
## Basic Witness

```toml witness
name = "Floating Disc"
lane = "Magic-User 1"
range = "0"
duration = "6 turns (1 hour)"
effect = "disc remains within 6'"
reversible = false
school = "none in BECMI surface"
```

Literal witness:

```text
Floating Disc
Range: 0
Duration: 6 turns
Effect: Disc remains within 6'
This spell creates an invisible magical
horizontal platform about the size and
shape of a small round shield. It can
carry up to 5000 cn (500 pounds). It
cannot be created in a place occupied by
a creature or object. The floating disc is
created at the height of the magic-user’s
waist, and will always remain at that
height. It will automatically follow the
magic-user, remaining within 6' at all
times. It can never be used as a weapon,
because it has no solid existence and
moves slowly. When the duration ends,
the floating disc will disappear, suddenly
dropping anything upon it.
```
<<~/ahu >>

<<~ ahu #expert >>
## Expert Witness

```toml witness
name = "Floating Disc"
lane = "Magic-User 1"
surface = "spell-list continuity"
standalone-description = false
```

Literal witness:

```text
Floating Disc
[Expert Set sourcing note (MU1): Expert Set (pages 13-14) reproduces the spell list only; no standalone description. Description text in Basic staging -> Spell Lists and Basic Spell Descriptions.]
```
<<~/ahu >>

<<~ ahu #rules-cyclopedia >>
## Rules Cyclopedia Witness

```toml witness
name = "Floating Disc"
lane = "Magic-User 1"
range = "0"
duration = "6 turns (1 hour)"
effect = "disc remains within 6'"
reversible = false
school = "none in BECMI surface"
```

Literal witness:

```text
Floating Disc
Range: 0
Duration: 6 turns
Effect: Disc remains within 6'
This spell creates an invisible magical horizon-
tal platform about the size and shape of a small
round shield. It can carry up to 5000 cn (500
pounds). It cannot be created in a place occupied
by a creature or object. The floating disc is cre-
ated at the height of the spellcaster’s waist, and
will always remain at that height. It will auto-
matically follow the spellcaster at his current
movement rate, remaining within 6' of him at
all times. It can never be used as a weapon, be-
cause it has no solid existence and veers away
from anything it might run into. When the du-
ration ends, the floating disc will disappear, sud-
denly dropping anything upon it. No saving
throw is allowed.
```
<<~/ahu >>

<<~ ahu #analysis >>
## Conversion Analysis

- `Range: 0` maps to an operator-centered force-platform pattern.
- `6 turns` suggests a longer exploration utility duration than `Read Magic`.
- Cargo limit and non-weapon language anchor the Power as burden logistics, not attack.
- The occupied-space restriction blocks conjuring the disc inside a creature, object, or packed obstacle.
- The platform follows at close distance and waist height; separation, stairs, terrain, and forced movement need live FTLS handling.
- The RC veer-away and no-save notes support soft collision behavior: the disc avoids impact rather than ramming.
<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ pranala #template ? -> lar:///ha.ka.ba/@sdm/v0.0/templates/witness/powers/osr-spells family:template role:uses >>
<<~ pranala #witness ? -> lar:///ha.ka.ba/@sdm/v0.0/api/powers/floating-disc family:provenance role:witness >>
<<~ pranala #source ? -> lar:///ha.ka.ba/@sdm/v0.0/source/becmi/basic family:provenance role:source >>
<<~ pranala #source ? -> lar:///ha.ka.ba/@sdm/v0.0/source/becmi/expert family:provenance role:source >>
<<~ pranala #source ? -> lar:///ha.ka.ba/@sdm/v0.0/source/becmi/rules-cyclopedia family:provenance role:source >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
