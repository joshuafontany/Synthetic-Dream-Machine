<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/wehe >>
```toml iam
cacheable = true
file-path = "bags/@lares/v0.1/api/pono/wehe.md"
mana      = 17
manao     = 16
manaoio   = 16
namespace = "&#x2299;"
register  = "Synthesis-Canon"
retain    = true
role      = "procedure executor sigil — block-container scope for named procedure/function definitions; Hawaiian alias for \\procedure"
tags      = ["lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-wehe"]
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lares/v0.1/api/pono/wehe"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #head >>

# Wehe

*wehe* — Hawaiian: to open, to untie, to uncover, to unfasten; to solve, to cleanse.
*Wehewehe* (reduplication): to explain, expound, reveal what is mysterious — to make
visible what had remained hidden. The opening action carries with it an act of revelation.

A block-container sigil declaring a named procedure body. `wehe` crosses the boundary from
declaration-space into execution-space: the content inside the block becomes callable by name,
surfacing what otherwise stays undeclared. English alias: `\procedure` (TW5 pragma form).
Sugar for the TW5 `\procedure` pragma, first-class in memetic-wikitext as a block sigil; both forms yield identical parse output.

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #ooda-ha >>

✶ sense the name and param signature — this block defines a callable; note the crossing boundary
⏿ orient: pragma-alias; the declaration serves as the sigil; no render output; body becomes callable body
◇ name MUST be unique in current tiddler scope; params declare positional/named argument surface
▶ emit pragma declaration node; TW5 parser registers the procedure at parse-time
↺ `<<~ kahea name(args) >>` (name-call form) invokes the procedure at render time in any tiddler that transcludes this one; confirm callable registered; no stray render output; body round-trips correctly

<<~/ahu >>

<<~ ahu #law >>

## Law (Kānāwai)

A wehe block MUST declare a name and optional parameter signature.
A wehe block MUST close with `<<~/ wehe >>` (or `<<~/ \procedure >>`).
A wehe block MUST function as a declaration, producing no render output (not a transclusion).
A wehe name MUST be unique within the current tiddler's procedure namespace.
A wehe block SHOULD use the `~` prefix convention for sigil-dispatched procedures: `<<~ wehe ~name(params) >>`.

English alias `\procedure` is semantically identical. Either form MAY appear in operator memes.

<<~/ahu >>

<<~ ahu #syntax >>

## Syntax

Hawaiian form:
```text
<<~ wehe name(param1:"default" param2:"") >>
procedure body
<<~/ wehe >>
```

English alias form (identical semantics):
```text
<<~ \procedure name(param1:"default" param2:"") >>
procedure body
<<~/ \procedure >>
```

`~`-dispatched convention (operator-extension sigils):
```text
<<~ \procedure ~mysigil(uri:"" p1:"") >>
<$tiddler tiddler=<<uri>>>...
<<~/ \procedure >>
```

<<~/ahu >>

<<~ ahu #schema >>

## Schema (machine-readable)

```toml
sigil          = "wehe"
kind           = "pragma-alias"
layer          = "block"
alias          = ["\\procedure"]

open-pattern  = '<<~\s*wehe\s+([\w-]+)(?:\s+([^>]*?))?\s*>>'
close-pattern = '<<~\/wehe\s*>>'

[alias-map]
"\\procedure" = "wehe"
"\\define"    = "wehe"
```

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/kahea >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/wai >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/huli >>

<<~ loulou lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-define >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
