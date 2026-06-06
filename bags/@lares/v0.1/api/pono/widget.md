<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/widget >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/pono/widget"
file-path = "bags/@lares/v0.1/api/pono/widget.md"
type = "text/x-memetic-wikitext"
register     = "Synthesis"
manaoio      = 17
mana         = 17
manao        = 17
role         = "\\widget pragma-alias sigil — declares a named ~widget callable via the ~ dispatcher; operator extension point"
cacheable    = true
retain       = true
```



<<~ ahu #head >>

# \widget

English-form widget declaration pragma. `<<~ \widget ~name(params) >>body<<~/ \widget >>` declares
a named widget body callable as `<<~ name args >>` via the `~` dispatcher.

The `~` prefix convention: all operator-defined callable sigils use `~name`. The `\widget` sigil
makes this declaration first-class in memetic-wikitext — no separate tiddler or JS registration
needed for a new named sigil body.

No direct Hawaiian equivalent. The `~` prefix carries the Lares convention for callable wikitext bodies.
`lar-kind: pragma-alias` — the sigil serves as the declaration; no render output.

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #law >>

## Law (Kānāwai)

A `\widget` declaration MUST use the `~` prefix on the widget name.
A `\widget` declaration MUST close with `<<~/ \widget >>`.
A `\widget` declaration MUST NOT produce render output — it functions as a declaration only.
The declared name MUST be unique in the current tiddler scope.
`\widget` and `\procedure` MAY be used interchangeably for render-only bodies; use `\widget` when
the body uses TW5 widget syntax (`<$...>`) and `\procedure` when the body is pure wikitext.

<<~/ahu >>

<<~ ahu #syntax >>

## Syntax

```text
<<~ \widget ~mysigil(uri:"" p1:"") >>
<$tiddler tiddler=<<uri>>>
...
</$tiddler>
<<~/ \widget >>
```

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #tiddler ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-widget family:control role:has >>
<<~ pranala #to-dispatcher ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/dispatcher family:relation >>
<<~ pranala #to-wehe ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/wehe family:relation >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
