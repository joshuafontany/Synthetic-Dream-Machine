<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/function >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/pono/function"
file-path = "bags/@lares/v0.1/api/pono/function.md"
type = "text/x-memetic-wikitext"
confidence   = 0.85
register     = "S"
manaoio      = 0.83
mana         = 0.85
manao        = 0.83
role         = "\\function pragma-alias sigil — declares a named TW5 filter function (TW5 5.3+); leaf-only"
cacheable    = true
retain       = true
```



<<~ ahu #head >>

# \function

English-form filter-function declaration pragma (TW5 5.3+).
`<<~ \function name(params) >>filter-expression<<~/ \function >>` declares a named filter function
callable in TW5 filter expressions as `[function[name]]` or `[name[args]]`.

No direct Hawaiian equivalent. TW5 filter-function semantics have no natural Hawaiian sigil form in
the current vocabulary. `lar-kind: pragma-alias` — the sigil serves as the declaration; no render output.

<<~/ahu >>

<<~&#x0002;>>

<<~ ahu #law >>

## Law (Kānāwai)

A `\function` declaration MUST carry a valid TW5 filter expression as its body.
A `\function` declaration is leaf-only in practice — filter bodies are inline expressions.
A `\function` name MUST be unique in current tiddler scope.
A `\function` MUST NOT produce render output — it functions as a declaration only.

Note: TW5 `\function` is distinct from `\procedure` — functions return filter results, procedures
return wikitext. Do not use interchangeably.

<<~/ahu >>

<<~ ahu #syntax >>

## Syntax

```text
<<~ \function myFilter(param:"") >>[<param>match[value]]<<~/ \function >>
```

TW5 native equivalent:
```
\function myFilter(param:"")
[<param>match[value]]
\end
```

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #tiddler ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-function family:control role:implements >>
<<~ pranala #to-wehe ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/wehe family:relation >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
