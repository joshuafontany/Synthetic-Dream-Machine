<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.0/witness/powers/osr-spells/read-magic >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.0/witness/powers/osr-spells/read-magic"
file-path = "bags/@sdm/v0.0/witness/powers/osr-spells/read-magic.md"
type      = "text/x-memetic-wikitext"

tagspace = "sdm"
register = "CS"
confidence = 16
mana = 11
manao = 16
manaoio = 17
cacheable = true
retain = true
invariant = false
role = "OSR spell witness for Read Magic"
```

<<~&#x0002;>>

# OSR Witness — Read Magic

<<~ ahu #basic >>
## Basic Witness

```toml witness
name = "Read Magic"
lane = "Magic-User 1"
range = "0"
duration = "1 turn (10 minutes)"
effect = "the magic-user only"
reversible = false
school = "none in BECMI surface"
```

Literal witness:

```text
Read Magic
Range: 0
Duration: 1 turn
Effect: The magic-user only

This spell will allow the magic-user to
read, not speak, any magical words or
runes, such as those found on magic
scrolls and other items. Unfamiliar
magic writings cannot be understood
without using this spell. However, once a
magic-user reads a scroll or runes with
this spell, that magic can be read or
spoken later (without) using a spell. All
spell books are written in magical words,
and only their owners may read them
without using this spell.
```
<<~/ahu >>

<<~ ahu #expert >>
## Expert Witness

```toml witness
name = "Read Magic"
lane = "Magic-User 1"
surface = "spell-list continuity"
standalone-description = false
```

Literal witness:

```text
Read Magic
[Expert Set sourcing note (MU1): Expert Set (pages 13-14) reproduces the spell list only; no standalone description. Description text in Basic staging -> Spell Lists and Basic Spell Descriptions.]
```
<<~/ahu >>

<<~ ahu #rules-cyclopedia >>
## Rules Cyclopedia Witness

```toml witness
name = "Read Magic"
lane = "Magic-User 1"
range = "0"
duration = "1 turn (10 minutes)"
effect = "the spellcaster only"
reversible = false
school = "none in BECMI surface"
```

Literal witness:

```text
Read Magic
Range: 0
Duration: 1 turn
Effect: The spellcaster only

This spell will allow the spellcaster to read, not
speak, any magical words or runes, such as those
found on scrolls and other items. A spellcaster
cannot understand unfamiliar magic writings
without using this spell. However, once a spell-
caster reads a scroll or runes with this spell, he
can read or speak that magic later without using
a spell.
All spell books are written in magical words,
and only their owners may read them without
using this spell.
```
<<~/ahu >>

<<~ ahu #analysis >>
## Conversion Analysis

- `Range: 0` and self-only effect map to **R: self**.
- `1 turn` maps to **10 minutes** in FTLS exploration language.
- Durable later reading maps to the **recognized** mark.
- Spellbook owner access maps to owner-lock, attunement, or archive permission.
- The old surface defines magical literacy and archive access, not combat output.
- Expert list continuity confirms the spell stayed first-tier; it adds no new rule burden.
<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ pranala #template ? -> lar:///ha.ka.ba/@sdm/v0.0/templates/witness/powers/osr-spells family:template role:uses >>
<<~ pranala #witness ? -> lar:///ha.ka.ba/@sdm/v0.0/api/powers/read-magic family:provenance role:witness >>
<<~ pranala #source ? -> lar:///ha.ka.ba/@sdm/v0.0/source/becmi/basic family:provenance role:source >>
<<~ pranala #source ? -> lar:///ha.ka.ba/@sdm/v0.0/source/becmi/expert family:provenance role:source >>
<<~ pranala #source ? -> lar:///ha.ka.ba/@sdm/v0.0/source/becmi/rules-cyclopedia family:provenance role:source >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
