<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.1/witness/powers/osr-spells/read-magic >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.1/witness/powers/osr-spells/read-magic"
file-path = "bags/@sdm/v0.1/witness/powers/osr-spells/read-magic.md"
type      = "text/x-memetic-wikitext"

tagspace = "ftls"
register = "CS"
confidence = 0.82
mana = 0.54
manao = 0.82
manaoio = 0.86
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
duration = "1 turn"
effect = "the magic-user only"
reversible = false
school = "none in BECMI surface"
```

Witness reading:

- The spell lets the magic-user read magical words and runes, not speak ordinary languages.
- Scrolls, item runes, and spellbook writing sit inside the expected target set.
- Unfamiliar magical writing requires the spell before it can be understood.
- Once read through the spell, that writing can be read or spoken later without recasting.
- Spellbooks use magical writing. Owners can read their own books without this spell.
<<~/ahu >>

<<~ ahu #expert >>
## Expert Witness

```toml witness
name = "Read Magic"
lane = "Magic-User 1"
surface = "spell-list continuity"
standalone-description = false
```

The Expert surface keeps `Read Magic` in the Magic-User 1 list. It does not add a new body that should override the Basic description.
<<~/ahu >>

<<~ ahu #rules-cyclopedia >>
## Rules Cyclopedia Witness

```toml witness
name = "Read Magic"
lane = "Magic-User 1"
range = "0"
duration = "1 turn"
effect = "the spellcaster only"
reversible = false
school = "none in BECMI surface"
```

Witness reading:

- The compendium wording broadens the actor label from magic-user to spellcaster.
- The target remains magical words and runes on scrolls or other items.
- Unknown magical writing still requires this spell.
- The durable later-reading rule remains intact.
- Spellbook owner access remains a distinct permission clue.
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

<<~ pranala #template ? -> lar:///ha.ka.ba/@sdm/v0.1/templates/witness/powers/osr-spells family:template role:uses >>
<<~ pranala #witness ? -> lar:///ha.ka.ba/@sdm/v0.1/api/powers/read-magic family:provenance role:witness >>
<<~ pranala #source ? -> lar:///ha.ka.ba/@sdm/v0.1/source/becmi/basic family:provenance role:source >>
<<~ pranala #source ? -> lar:///ha.ka.ba/@sdm/v0.1/source/becmi/expert family:provenance role:source >>
<<~ pranala #source ? -> lar:///ha.ka.ba/@sdm/v0.1/source/becmi/rules-cyclopedia family:provenance role:source >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
