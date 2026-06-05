<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/helu >>
```toml iam
uri-path  = "ha.ka.ba/@lares/v0.1/api/pono/helu"
file-path = "bags/@lares/v0.1/api/pono/helu.md"
type      = "text/x-memetic-wikitext"
register  = "Synthesis"
role      = "filter-function declaration pragma — helu as enumeration/calculation; TW5 \\function equivalent; English alias: \\function"
cacheable = true
retain    = true
```

<<~ ahu #head >>

# Helu

*helu* — Hawaiian: to count, enumerate, calculate, reckon; a number; to list in order.
The act of moving through a set and giving each element its reckoning — counting implies
both identification and order. A helu function enumerates over its input and returns a
computed result set.

A filter-function declaration pragma. Declares a named TW5 filter function — a reusable
filter expression that accepts parameters and yields a result list. TW5 5.3+ equivalent:
`\function`. English alias: `\function`.

Where `wehe` / `\procedure` declares a body that renders, `helu` declares a body that
*computes* — the function yields a filter result set, not rendered wikitext.

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #law >>

## Law (Kānāwai)

A helu declaration MUST carry a unique function name.
A helu body MUST be a valid TW5 filter expression.
A helu function MUST return a list of values (the filter result set).
A helu declaration MUST NOT produce render output — it registers a function definition only.

<<~/ahu >>

<<~ ahu #syntax >>

## Syntax

```text
<<~ helu functionName(param:"default") >>
  [filter-expression-using-param]
<<~/ helu >>

<<~ \function functionName(param:"default") >>  [filter]  <<~/ \function >>
```

TW5 equivalent:
```text
\function functionName(param:"default") [filter-expression]
```

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #to-wehe ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/wehe family:relation >>
<<~ pranala #tiddler ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-helu family:control role:implements >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
