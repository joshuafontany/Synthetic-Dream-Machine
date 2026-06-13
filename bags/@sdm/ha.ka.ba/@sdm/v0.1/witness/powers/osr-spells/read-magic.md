<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.1/witness/powers/osr-spells/read-magic >>
```toml iam
cacheable = true
file-path = "bags/@sdm/ha.ka.ba/@sdm/v0.1/witness/powers/osr-spells/read-magic.md"
invariant = false
mana      = 11
manao     = 16
manaoio   = 17
register  = "Synthesis-Canon"
retain    = true
role      = "OSR spell witness for Read Magic — Basic/Expert/Rules-Cyclopedia provenance, cold-load"
tagspace  = "sdm"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@sdm/v0.1/witness/powers/osr-spells/read-magic"
```

<<~ &#x0002; >>

# OSR Witness — Read Magic

<<~ ahu #basic >>

## Basic

```toml witness
name = "Read Magic"
lane = "Magic-User 1"
range = "0"
duration = "1 turn (10 minutes)"
effect = "the magic-user only"
reversible = false
```

The magic-user may read — not speak — magical words or runes, such as those on scrolls and items. Unfamiliar magic writing cannot be understood without this spell; once read with it, that magic can be read or spoken later without the spell. Spell books are written in magical words, and only their owners may read them without this spell.

<<~/ahu >>

<<~ ahu #expert >>

## Expert

```toml witness
name = "Read Magic"
lane = "Magic-User 1"
surface = "spell-list continuity"
standalone-description = false
```

The Expert Set reproduces the MU1 spell list only; it carries no standalone description. The Basic description governs.

<<~/ahu >>

<<~ ahu #cyclopedia >>

## Rules Cyclopedia

```toml witness
name = "Read Magic"
lane = "Magic-User 1"
range = "0"
duration = "1 turn (10 minutes)"
effect = "the spellcaster only"
reversible = false
```

The spellcaster may read — not speak — magical words or runes on scrolls and items. Unfamiliar magic writing requires the spell; once read with it, that magic reads or speaks later without a spell. Spell books are written in magical words; only their owners read them without this spell.

<<~/ahu >>

<<~ ahu #analysis >>

## Conversion Analysis

- `Range: 0`, self-only → **R: self**.
- `1 turn` → **D: 10 minutes** in FTLS exploration language.
- The durable "read it later without the spell" rule → the SDM **recognized** mark.
- Spell-book owner access → owner-lock, attunement, or archive permission (relay-law: pull ≠ read).
- The source defines magical literacy and archive access, not combat output — Read Magic carries no `attack` hook.
- Expert list continuity confirms first-tier (P:2) and adds no new rule burden.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@sdm/v0.1/templates/witness/powers/osr-spells >>
<<~ loulou lar:///ha.ka.ba/@sdm/v0.1/modules/powers/read-magic >>
<<~ loulou lar:///ha.ka.ba/@sdm/v0.1/source/becmi/basic >>
<<~ loulou lar:///ha.ka.ba/@sdm/v0.1/source/becmi/rules-cyclopedia >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
