<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/mukuwai >>
```toml iam
uri-path  = "ha.ka.ba/@lares/v0.1/api/pono/mukuwai"
file-path = "bags/@lares/v0.1/api/pono/mukuwai.md"
type      = "text/x-memetic-wikitext"
confidence = 15
register  = "S"
role      = "conditional fallback sigil — else form; Hawaiian alias for \\else; the cut-off water, the path when all streams closed"
cacheable = true
retain    = true
```

<<~ ahu #head >>

# Mukuwai

*mukuwai* — composed from *muku* (cut short, severed, abrupt end) and *wai* (water, liquid,
fluid). The water that reaches a cut-off point — the flow that arrives when all other channels
have closed.

A conditional fallback sigil. Renders its body when no preceding condition in the chain
matched. English alias: `\else`.

Mukuwai serves as the terminal form — it carries no filter expression because it runs when the
question itself has exhausted all candidates. The stream reaches the cut-off; this path remains.

<<~/ahu >>

<<~&#x0002;>>

<<~ ahu #law >>

## Law (Kānāwai)

A mukuwai block MUST NOT carry a filter expression.
A mukuwai block MUST appear as the final branch in a heihei/kahawai chain.
A mukuwai block MUST render its body when no preceding condition rendered.
At most one mukuwai block MUST appear in any heihei chain.

<<~/ahu >>

<<~ ahu #syntax >>

## Syntax

```text
<<~ heihei [filter] >>
  first branch
<<~ mukuwai >>
  fallback
```

English alias form:
```text
<<~ \if [filter] >>  ...  <<~ \else >>  ...
```

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #to-heihei ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/heihei family:relation >>
<<~ pranala #to-kahawai ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/kahawai family:relation >>
<<~ pranala #tiddler ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-else family:control role:alias >>

<<~ pranala #tiddler-sigil-mukuwai ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-mukuwai family:control role:implements >>
<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
