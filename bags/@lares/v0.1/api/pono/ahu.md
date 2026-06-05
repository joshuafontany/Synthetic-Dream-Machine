<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/ahu >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/pono/ahu"
file-path = "bags/@lares/v0.1/api/pono/ahu.md"
type = "text/x-memetic-wikitext"
register     = "Synthesis-Canon"
manaoio      = 18
mana         = 18
manao        = 18
role         = "child-slot sigil — addressable worksite scope boundary; named ahu slots form the meme's tiddler structure"
cacheable    = true
retain       = true
```



<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #head >>

# Ahu

*ahu* — Hawaiian: heap, pile, mound, cairn; altar, shrine; a sacred stone structure.
Used in spiritual and ceremonial contexts — the *ahu* becomes sacred through human intention
and accumulated offering placed upon it. A landmark made from accumulation; addressable because
it has been named and tended.

A child-slot sigil. Each `ahu` block declares a named scope boundary within a meme — an
addressable child tiddler at `parentUri + slot`. The slot name becomes the tiddler title suffix.
Slots compose the structural skeleton of a meme's content; each MAY hold its own TOML iam header (set of tiddler fields)
and wikitext body.

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #ooda-ha >>

✶ sense the slot name — a `#name` anchor; the boundary scope of this content unit
⏿ orient: child-slot, parent-relative addressing; slot name becomes tiddler title suffix
◇ parent at `lar:///uri`; this slot creates child at `lar:///uri#name`; content stays inside boundary
▶ emit child-slot block node; deserializer produces a separate tiddler for each slot
⤴ parent tiddler references child via `<<~ kahea ahu #name >>`; child is independently addressable
↺ confirm round-trip: parent body contains kahea~ahu summons; child has iam fields + content

<<~/ahu >>

<<~ ahu #law >>

## Law (Kānāwai)

An ahu block MUST declare a slot name beginning with `#`.
An ahu block MUST close with `<<~/ahu >>`.
An ahu block MUST be a top-level scope — ahu blocks MUST NOT nest.
An ahu slot MUST produce an independently addressable tiddler at `parentUri + slot`.
A parent tiddler MUST reference each child slot via `<<~ kahea ahu #slot >>` in its body.
Child slot tiddlers MUST NOT duplicate the parent's iam TOML — they carry their own.

The slot name `#head` is conventional for the meme's primary content body.
The slot name `#source-shelf` is conventional for pranala edge declarations.

<<~/ahu >>

<<~ ahu #syntax >>

## Syntax

Decomposed at the wiki's causal island boudnaries:

```text
<<~ ahu #slot-name >>
content body
<<~/ahu >>
```

Compound kahea-ahu summons form (in parent tiddler body after decomposition):
```text
<<~ kahea ahu #slot-name >>
```

Regex (open, canonical):
```
/<<~[^>]*\bahu\s+(#[\w-]+)\s*>>/
```

Close tag: `<<~/ahu >>`

<<~/ahu >>

<<~ ahu #schema >>

## Schema (machine-readable)

```toml
sigil          = "ahu"
kind           = "child-slot"
layer          = "block"
default-family = null

open-pattern  = '<<~[^>]*\bahu\s+(#[\w-]+)\s*>>'
close-pattern = '<<~\/ahu\s*>>'

[captures]
slot = 1
```

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:implements >>
<<~ pranala #to-kahea ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/kahea family:relation >>
<<~ pranala #to-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:relation >>

<<~ pranala #tiddler ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-ahu family:control role:implements >>
<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
