<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.1/api/powers/read-magic >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.1/api/powers/read-magic"
file-path = "bags/@sdm/v0.1/api/powers/read-magic.md"
type      = "text/x-memetic-wikitext"

tagspace = "sdm"
register = "CS"
confidence = 0.84
mana = 0.72
manao = 0.86
manaoio = 0.80
cacheable = true
retain = true
invariant = false
role = "Powers API root meme: magical inscription reading and archive-recognition pattern"
```

<<~&#x0002;>>

# Read Magic

<<~ ahu #interface >>
## Interface

`Read Magic` opens one magical inscription to understanding.

Use it when a character, item, daemon, shrine, archive service, rite, or burden tries to read a symbolic surface that ordinary language skill cannot parse: scroll script, spellbook notation, item-runes, shrine glyphs, ward marks, silk-knot ciphers, archive labels, or oldtech magical UI.

The Power answers three play questions:

1. **What does this magical writing say or do?**
2. **Can this operator recognize this pattern later?**
3. **What lock, veil, corruption, or owner-trace pushes back?**

A successful read reveals the active magical meaning. If the surface carries a usable pattern, the operator marks it as **recognized** for later reading unless the pattern changes, gains a veil, changes owner-lock, or belongs to a different archive lineage.

Counterplay may come from owner-locks, living grimoires, ECM veils, corrupted notation, false rune bait, incomplete inscriptions, hostile copy-protection, or daemon honeypots.
<<~/ahu >>

<<~ ahu #default >>
## Default FTLS/SDM Implementation

```toml iam
canonical-name = "Read Magic"
epithet = "First Key, Archive Handshake, Rune-Sight"
p = 2
range = "self"
target = "one magical inscription or encoded magical surface"
duration = "10 minutes"
module = "lar:///ha.ka.ba/@sdm/v0.1/api/modules/knowledge-oracle"
```

**P:** 2 **R:** self  
**T:** one magical inscription or encoded magical surface  
**D:** 10 minutes

You tune your ha-ka-ba pattern to the writing and read its magical interface layer.

On a clean read, the referee gives the active meaning: instruction, warning, spell pattern, command phrase, name, lineage, trigger, ward rule, or archive label. Mark the surface, rune-family, spell-pattern, or notation as **recognized** by this operator.

If resistance matters, resolve an ECM scan contest. On sacrifice, the read succeeds but leaves one trace: owner ping, archive echo, awakened ward, glyph migraine, daemon attention, or false certainty that will matter later.

### Overcharge

**x2 — P:4 total:** Read through one weak veil, damaged inscription, archaic dialect layer, hostile copy-protection mark, or partial archive corruption.

**x4 — P:8 total:** Read a linked inscription set from one archive lineage: a scroll bundle, spellbook section, shrine panel, item rune-chain, or scene of connected glyph-work. Ask one structural question: who wrote this, what Power pattern this encodes, what protects it, or what triggers it.

**x8 — P:16 total; dangerous:** Force-read a sealed, hostile, living, or forbidden archive layer. Learn the active meaning plus one hidden interface fact: command phrase, lock condition, lineage, true owner, concealed rider, or safe activation path. On failure or mishap, the archive reads back.

### Storage

- **Trait:** rune-sight, trained magical literacy, wizard archive discipline.
- **Item:** grimoire lens, scroll-reader, diagnostic charm, spellbook procedure.
- **Structure:** lararium archive service, ship-daemon index, shrine-glyph interface.
- **Burden:** cursed literacy, compulsive glyph-hearing, archive mark that reads you back.
<<~/ahu >>

<<~ ahu #variants >>
## Variants

- **Thread Reading:** spider-folk silk-knot, web-vibration, and woven ward notation.
- **Lararium Archive Handshake:** shrine, wiki, or ship-daemon service reads magical interface layers for authorized operators.
- **Grimoire Lens:** an item pays or focuses the cost through charge, attunement, or risk of breakage.
- **Cursed Literacy:** the operator cannot stop reading magical surfaces; archives may read the operator in return.
<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ loulou lar:///ha.ka.ba/@sdm/v0.1/projections/powers/ftls-card/read-magic >>
<<~ loulou lar:///ha.ka.ba/@sdm/v0.1/witness/powers/osr-spells/read-magic >>
<<~ loulou lar:///ha.ka.ba/@sdm/v0.1/templates/api/powers/powers-root >>

<<~ pranala #template ? -> lar:///ha.ka.ba/@sdm/v0.1/templates/api/powers/powers-root family:template role:uses >>
<<~ pranala #implements ? -> lar:///ha.ka.ba/@sdm/v0.1/api/interfaces/power family:control role:implements >>
<<~ pranala #implements ? -> lar:///ha.ka.ba/@sdm/v0.1/api/interfaces/ecm-scan family:control role:implements >>
<<~ pranala #implements ? -> lar:///ha.ka.ba/@sdm/v0.1/api/interfaces/magic-decode family:control role:implements >>
<<~ pranala #implements ? -> lar:///ha.ka.ba/@sdm/v0.1/api/interfaces/archive-recognition family:control role:implements >>

<<~ pranala #projects ? -> lar:///ha.ka.ba/@sdm/v0.1/projections/powers/ftls-card/read-magic family:render role:projects >>
<<~ pranala #witness ? -> lar:///ha.ka.ba/@sdm/v0.1/witness/powers/osr-spells/read-magic family:provenance role:witness >>
<<~ pranala #module ? -> lar:///ha.ka.ba/@sdm/v0.1/api/modules/knowledge-oracle family:taxonomy role:belongs >>
<<~ pranala #tag ? -> lar:///ha.ka.ba/@sdm/v0.1/api/tags/power family:tag role:has >>
<<~ pranala #tag ? -> lar:///ha.ka.ba/@sdm/v0.1/api/tags/ecm-scan family:tag role:has >>
<<~ pranala #tag ? -> lar:///ha.ka.ba/@sdm/v0.1/api/tags/magic-decode family:tag role:has >>

<<~/ahu >>

<<~ ahu #residue >>
## Residue

- Decide whether recognition binds to exact surface, rune-family, spell-pattern, or archive lineage by default.
- Decide whether hostile archive reading leaves trace only on sacrifice/failure or whenever the target has an owner-lock.
- Split Thread Reading into a Spider Folk webcraft Power when Aki or spider-folk play needs it.
- Decide whether owner-locked spellbooks require permission, contact, or a won ECM scan.
<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
