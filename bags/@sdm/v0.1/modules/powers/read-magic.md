<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.1/modules/powers/read-magic >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.1/modules/powers/read-magic"
file-path = "bags/@sdm/v0.1/modules/powers/read-magic.md"
type      = "text/x-memetic-wikitext"

title     = "lar:///ha.ka.ba/@sdm/v0.1/modules/powers/read-magic"
caption   = "Read Magic"
tags = [
  "@sdm/tags/domain/divination",
  "@sdm/tags/function/magic-decode",
  "@sdm/tags/function/ecm-scan",
  "@sdm/tags/function/archive",
  "@sdm/tags/hook/dangerous",
  "@sdm/tags/mount/trait",
]

tagspace  = "sdm"
register  = "CS"
confidence = 16
mana      = 15
manao     = 17
manaoio   = 16
cacheable = true
retain    = true
invariant = false
role      = "Power module: Read Magic — decode a magical inscription's interface layer; the first proof of the v0.1 composition chain"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~&#x0002; >>

# Read Magic

<<~ ahu #has >>
## Composition

Flat composition. The TOML `tags` field mirrors these edges for TW5 filters.

<<~ pranala #has ? -> lar:///ha.ka.ba/@sdm/v0.1/components/domain/divination >>
<<~ pranala #has ? -> lar:///ha.ka.ba/@sdm/v0.1/components/function/magic-decode >>
<<~ pranala #has ? -> lar:///ha.ka.ba/@sdm/v0.1/components/function/ecm-scan >>
<<~ pranala #has ? -> lar:///ha.ka.ba/@sdm/v0.1/components/function/archive >>
<<~ pranala #has ? -> lar:///ha.ka.ba/@sdm/v0.1/components/hook/dangerous >>
<<~ pranala #has ? -> lar:///ha.ka.ba/@sdm/v0.1/mount-points/trait >>
<<~/ahu >>

<<~ ahu #default >>

```toml default
canonical-name = "Read Magic"
epithet = "First Key, Archive Handshake, Rune-Sight"
p = 2
range = "self"
target = "one magical inscription or encoded magical surface"
duration = "10 minutes"
default-mount = "trait"
```

**P:** 2 · **R:** self · **T:** one magical inscription or encoded magical surface · **D:** 10 minutes

Tune your ha-ka-ba pattern to the writing and read its magical interface layer. On a clean read, the referee gives the active meaning — instruction, warning, spell pattern, command phrase, name, lineage, trigger, or ward rule — and the operator marks that surface, rune-family, or notation **recognized**: later reads need no Power.

When something resists, resolve it as an `ecm-scan` contest. On a sacrificed read the meaning still comes, but it leaves one trace: an owner ping, an archive echo, a roused ward, a glyph migraine, or a false certainty that bites later.

### Overcharge

- **x2 — P:4.** Read through one weak veil: a damaged inscription, archaic dialect, or hostile copy-mark.
- **x4 — P:8.** Read a linked inscription set from one archive lineage and ask one structural question: who wrote this, what pattern it encodes, what guards it, or what triggers it.
- **x8 — P:16, `dangerous`.** Force-read a sealed, hostile, or living archive layer. Learn the meaning plus one hidden interface fact — command phrase, lock condition, true owner, or safe activation path. On failure the archive reads back (Danger Roll → Corruption).

### Mishaps

A botched read mis-recognizes: the operator marks the wrong meaning as trusted, rouses what the inscription guards, or carries an owner-trace away unknowing.
<<~/ahu >>

<<~ ahu #variants >>
## Variants

- **Thread Reading** — silk-knot, web-vibration, and woven ward notation (spider-folk). Seats as `trait`.
- **Archive Handshake** — a shrine, wiki, or ship-daemon service reads interface layers for authorized operators. Seats as `structure`.
- **Grimoire Lens** — an item pays or focuses the cost through charge, attunement, or breakage risk. Seats as `item`.
- **Cursed Literacy** — the operator cannot stop reading magical surfaces; archives may read back. Seats as `burden`, carries `hook/dangerous`.
<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ pranala #template ? -> lar:///ha.ka.ba/@sdm/v0.1/templates/modules/power family:template role:uses >>
<<~ pranala #projects ? -> lar:///ha.ka.ba/@sdm/v0.1/projections/powers/ftls-card/read-magic family:render role:projects >>
<<~ pranala #witness ? -> lar:///ha.ka.ba/@sdm/v0.1/witness/powers/osr-spells/read-magic family:provenance role:witness >>
<<~ pranala #see ? -> lar:///ha.ka.ba/@sdm/v0.1/docs/composition-model family:reference role:see >>

<<~/ahu >>

<<~ ahu #aftermath >>
## Aftermath

- Decide whether recognition binds to the exact surface, the rune-family, or the archive lineage by default.
- Decide whether hostile reading leaves a trace only on sacrifice/failure or whenever the target holds an owner-lock.
- `apocrypha` domain: promote a component meme if forbidden-archive queries need the address (the v0.0 root carried it; v0.1 holds it as a header note until a query asks).
- Split Thread Reading into a spider-folk webcraft module when that play needs it.
<<~/ahu >>

<<~&#x0003; >>

<<~&#x0004; -> ? >>
