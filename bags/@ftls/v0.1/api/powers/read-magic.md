<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@ftls/v0.1/api/powers/read-magic >>
```toml iam
uri-path = "ha.ka.ba/@ftls/v0.1/api/powers/read-magic"
file-path = "bags/@ftls/v0.1/api/powers/read-magic.md"
type = "text/x-memetic-wikitext"

role = "Power interface meme: teaches FTLS power interfaces and that the playable card acts as a projection"
tagspace = "ftls"
register = "CS"
confidence = 0.82
mana = 0.70
manao = 0.84
manaoio = 0.78
cacheable = true
retain = true
invariant = false
```

<<~&#x0002;>>

# Read Magic

<<~ ahu #interface >>
## Interface

`Read Magic` describes a magical-writing decode interface.

At the table, it lets a character, tool, shrine, daemon, or archive service read active symbolic surfaces: scrolls, spellbooks, item-runes, shrine glyphs, encrypted silk-knots, ward marks, and related magical notation.

As an API-style protocol, it exposes a **decode request** against one magical writing surface. The request has an operator, target, cost, local permission state, and output. It does not require wizard-class inheritance. Any valid implementer may satisfy the interface: a learned trait, a spellbook procedure, a diagnostic lens, a lararium archive, a ship-daemon index, a spider-folk thread rite, or a cursed literacy burden.

<<~ ahu #interface/contract >>
### Contract

`Read Magic` accepts:

- **operator:** the being, item, daemon, shrine, archive, or cultural practice invoking the pattern.
- **target:** one magical writing surface or encoded inscription layer.
- **cost:** P:2, paid as Life or available mana.
- **context:** owner-locks, archive lineage, ECM state, damaged/corrupted notation, local permissions, and language/script family.
- **output:** decoded magical meaning and a recognition mark for later reading.

A clean implementation must:

- decode one magical writing surface;
- expose the active inscription layer;
- establish operator recognition for later reading;
- preserve `Read Magic` as the OSR archaeological recognizer;
- route resistance through counterplay when locks, veils, corruption, or archive boundaries matter.

<<~/ahu >>

<<~ ahu #interface/counterplay >>
### Counterplay

Owner-locks, living grimoire refusal, archive permission boundaries, ECM veils, corrupted scripts, false rune bait, incomplete inscriptions, and daemon-authored honeypots can resist this Power.

If the resistance matters, resolve it as an ECM scan contest. On a sacrifice result, the read may succeed while leaving a trace, alerting the owner-lock, or attaching a temporary archive echo to the operator.

<<~/ahu >>

<<~/ahu >>

<<~ ahu #power-card >>
```toml iam
canonical-name = "Read Magic"
role = "Power: magical-writing literacy, ley archive handshake, scroll/spellbook decode pattern, and OSR spell-pattern archaeology"

p = 2
range = "self"
target = "one magical inscription, scroll, spellbook page, item-rune, shrine glyph, or archive mark"
duration = "10 minutes"
module = "lar:///ha.ka.ba/@ftls/v0.1/api/powers/modules/knowledge-and-oracle/detection-and-analysis"

tags = [
  "lar:///ha.ka.ba/@ftls/tags/power",
  "lar:///ha.ka.ba/@ftls/tags/storage/trait",
  "lar:///ha.ka.ba/@ftls/tags/storage/item",
  "lar:///ha.ka.ba/@ftls/tags/storage/structure",
  "lar:///ha.ka.ba/@ftls/tags/oldtech",
  "lar:///ha.ka.ba/@ftls/tags/divination",
  "lar:///ha.ka.ba/@ftls/tags/ecm/scan",
  "lar:///ha.ka.ba/@ftls/tags/magic/decode"
]
```

## Read Magic

_First Key, Archive Handshake, Rune-Sight_

**P:** 2 **R:** self  
**T:** one magical inscription, scroll, spellbook page, item-rune, shrine glyph, or archive mark  
**D:** 10 minutes

You tune your ha-ka-ba pattern to the encrypted writing and read its magical interface layer.

On a clean read, mark the pattern as **recognized** by this operator. The same writing, rune-family, spell-pattern, or archive notation may later be read without activating this Power unless it changes, becomes veiled, becomes owner-locked, or belongs to another archive lineage.

**Tags:** [power] [storage:trait] [storage:item] [storage:structure] [oldtech] [divination] [ecm:scan] [magic:decode]

<<~ ahu #power-card/overcharge >>
### Overcharge

**Overcharge (x2; P:4 total):** Read through one weak ECM veil, damaged inscription, archaic dialect layer, hostile copy-protection mark, or partial archive corruption. On sacrifice, the read succeeds but leaves a trace in the book, shrine, daemon, ward, archive, or owner-lock that resisted it.

**Again (x4; P:8 total):** Read a full linked inscription set from the same archive lineage: one scroll bundle, one spellbook section, one shrine panel, one item’s nested rune-chain, or one scene’s connected glyph-work. You may also ask one structural question: “who wrote this?”, “what Power pattern does this encode?”, “what lock protects it?”, or “what condition triggers it?” On sacrifice, gain a temporary burden such as **Archive Echo**, **Glyph Migraine**, or **Owner-Trace**.

**Again (x8; P:16 total; [dangerous]):** Force-read a sealed, hostile, living, or forbidden archive layer. The referee reveals the active meaning plus one hidden interface fact: a command phrase, lock condition, lineage, true owner, concealed rider, or safe activation path. This counts as dangerous archive intrusion. On failure or mishap, the archive reads back: corruption exposure, false certainty, owner alert, daemon attention, or a cursed literacy burden may follow.

<<~/ahu >>

<<~ ahu #power-card/storage >>
### Storage

- **Trait:** rune-sight, trained magical literacy, wizardly archive discipline.
- **Item:** grimoire lens, spellbook procedure, scroll-reader, diagnostic charm.
- **Structure:** lararium archive service, ship-daemon index, shrine-glyph interface.
- **Burden:** cursed literacy, compulsive glyph-hearing, archive mark that reads you back.

<<~/ahu >>

<<~/ahu >>

<<~ ahu #variants >>
## Variants

<<~/ahu >>

<<~ ahu #osr-witness >>
## OSR Witness

The following child slots preserve old API surfaces: recognizable name, source lane, classic effect language, and implied access model. The current SDM card above is the living implementation; these witnesses preserve archaeology.

Each `OSR context` line records metadata useful to a modern reader but not always printed beside the spell in the original source text.

<<~ ahu #osr-witness/basic >>
### Basic Witness

**OSR context:** Magic-User 1; magical-writing literacy gate; no BECMI school taxonomy; not reversible; personal/self-only utility; required to read unfamiliar scrolls, runes, and spellbooks.

**Source context:** Basic Rules · Spell Lists and Basic Spell Descriptions

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

<<~ ahu #osr-witness/expert >>
### Expert Witness

**OSR context:** Magic-User 1; list witness only; no standalone Expert description; confirms continued presence in the Expert spell-list surface.

**Source context:** Expert Set · Clerical and Magic-User Spell Expansions

```text
Read Magic
[Expert Set sourcing note (MU1): Expert Set (pages 13-14) reproduces the spell list only; no standalone description. Description text in Basic staging -> Spell Lists and Basic Spell Descriptions.]
```

<<~/ahu >>

<<~ ahu #osr-witness/rules-cyclopedia >>
### Rules Cyclopedia Witness

**OSR context:** Magic-User 1; magical-writing literacy gate; no BECMI school taxonomy; not reversible; personal/self-only utility; compendium wording broadens the user label from “magic-user” to “spellcaster.”

**Source context:** Rules Cyclopedia · Scrolls

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

<<~/ahu >>

<<~ ahu #residue >>
## Residue

- Does durable recognition bind to exact inscription, script-family, archive lineage, or Power pattern?
- Does hostile archive reading always leave trace, or only on sacrifice/failure?
- Should Thread Reading remain a variant here, or move to a separate spider-folk webcraft meme that implements the same archive decode interface?
- Should x8 archive intrusion always add `[dangerous]`, or only when the archive is hostile/living/forbidden?

<<~/ahu >>

<<~ ahu #links >>
## Links

<<~ loulou lar:///ha.ka.ba/@ftls/v0.1/api/powers/read-languages >>
<<~ loulou lar:///ha.ka.ba/@ftls/v0.1/api/powers/anti-babylon >>
<<~ loulou lar:///ha.ka.ba/@ftls/v0.1/api/powers/modules/knowledge-and-oracle/detection-and-analysis >>

<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ pranala #implements-power-interface ? -> lar:///ha.ka.ba/@ftls/v0.1/api/interfaces/power family:control role:implements >>
<<~ pranala #implements-ecm-scan ? -> lar:///ha.ka.ba/@ftls/v0.1/api/interfaces/ecm/scan family:control role:implements >>
<<~ pranala #implements-magic-decode ? -> lar:///ha.ka.ba/@ftls/v0.1/api/interfaces/magic/decode family:control role:implements >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>