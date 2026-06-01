<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.0/witness/powers/osr-spells/shield-ward >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.0/witness/powers/osr-spells/shield-ward"
file-path = "bags/@sdm/v0.0/witness/powers/osr-spells/shield-ward.md"
type      = "text/x-memetic-wikitext"

tagspace = "sdm"
register = "CS"
confidence = 16
mana = 12
manao = 17
manaoio = 17
cacheable = true
retain = true
invariant = false
role = "OSR spell witness for Shield, source alias of SDM+ Shield Ward"
```

<<~&#x0002;>>

# OSR Witness — Shield Ward

<<~ ahu #alias >>
## Alias Note

```toml witness
source-name = "Shield"
sdm-power-slot = "Shield Ward"
reason = "Shield remains available as gear, item, and broad defense-effect language in SDM+; Shield Ward names this Power slot."
```
<<~/ahu >>

<<~ ahu #basic >>
## Basic Witness

```toml witness
name = "Shield"
lane = "Magic-User 1"
range = "0"
duration = "2 turn (20 minutes)"
effect = "the magic-user only"
reversible = false
school = "none in BECMI surface"
chapter-06-card-heading = "Shield Ward"
```

Literal witness:

```text
Shield
Range: 0
Duration: 2 turns
Effect: The magic-user only
This spell creates a magical barrier all
around the magic-user (less than an inch
away). It moves with the magic-user.
While the duration lasts, the magic-user
becomes Armor Class 2 against missiles,
and AC 4 against all other attacks.
If a Magic.Missile is shot at a magic-
user protected by this spell, the magic-
user may make a Saving Throw VS.
Spells (one Saving Throw per missile). If
successful, the Magic Missile will have
no effect.
```
<<~/ahu >>

<<~ ahu #expert >>
## Expert Witness

```toml witness
name = "Shield"
lane = "Magic-User 1"
surface = "spell-list continuity"
standalone-description = false
chapter-06-card-heading = "Shield Ward"
```

Literal witness:

```text
Shield
[Expert Set sourcing note (MU1): Expert Set (pages 13-14) reproduces the spell list only; no standalone description. Description text in Basic staging -> Spell Lists and Basic Spell Descriptions.]
```
<<~/ahu >>

<<~ ahu #rules-cyclopedia >>
## Rules Cyclopedia Witness

```toml witness
name = "Shield"
lane = "Magic-User 1"
range = "0"
duration = "2 turns (20 minutes)"
effect = "the spellcaster only"
reversible = false
school = "none in BECMI surface"
chapter-06-card-heading = "Shield Ward"
```

Literal witness:

```text
Shield
Range: 0
Duration: 2 turns
Effect: The spellcaster only
This spell creates a magical barrier all around
the spellcaster (less than an inch away). It moves
with the spellcaster. While the duration lasts,
the spellcaster has an AC of 2 against missiles,
and AC 4 against all other attacks.
If someone shoots a magic missile at a spell-
caster protected by this spell, the spellcaster may
make a saving throw vs. spells (one saving throw
per missile). If the saving throw is successful, the
magic missile has no effect; it hits the barrier and
evaporates.
```
<<~/ahu >>

<<~ ahu #analysis >>
## Conversion Analysis

- Source name `Shield` maps to SDM+ Power slot `Shield Ward`.
- `Range: 0` and self-only effect map to a close personal ward.
- The barrier follows the body and sits less than an inch away; it reads as skin-close force shell, not carried gear.
- Separate AC values against missiles and other attacks point toward typed defensive filtering.
- Magic Missile interaction provides a special anti-spell projectile hook rather than general immunity.
- The name split protects `Shield` for gear, item, and ordinary effect ontology.
<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ pranala #template ? -> lar:///ha.ka.ba/@sdm/v0.0/templates/witness/powers/osr-spells family:template role:uses >>
<<~ pranala #witness ? -> lar:///ha.ka.ba/@sdm/v0.0/api/powers/shield-ward family:provenance role:witness >>
<<~ pranala #source ? -> lar:///ha.ka.ba/@sdm/v0.0/source/becmi/basic family:provenance role:source >>
<<~ pranala #source ? -> lar:///ha.ka.ba/@sdm/v0.0/source/becmi/expert family:provenance role:source >>
<<~ pranala #source ? -> lar:///ha.ka.ba/@sdm/v0.0/source/becmi/rules-cyclopedia family:provenance role:source >>
<<~ pranala #see ? -> lar:///ha.ka.ba/@sdm/tags/function/shield family:relation role:see >>
<<~ pranala #see ? -> lar:///ha.ka.ba/@sdm/tags/function/ward family:relation role:see >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
