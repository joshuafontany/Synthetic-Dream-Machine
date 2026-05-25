<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/ui >>
```toml iam
uri-path  = "ha.ka.ba/@lares/v0.1/api/pono/ui"
file-path = "bags/@lares/v0.1/api/pono/ui.md"
type      = "text/x-memetic-wikitext"
confidence = 15
register  = "S"
role      = "query surface sigil — evaluates TW5 filter and renders result list; English alias: \\query"
cacheable = true
retain    = true
```

<<~ ahu #head >>

# Ui

*ui* — Hawaiian: to inquire, question, ask; to seek; to look into. *Ui* as a verb carries the
motion of the questioner turning toward a subject — a directed inquiry, not a passive reception.

A query surface sigil. Evaluates a TW5 filter expression and renders the result set as a list
of tiddler titles or content. English alias: `\query`.

The `ui` sigil makes the filter's result visible — it turns toward the data and surfaces what
it finds. Unlike `kahea` (which summons a specific known target), `ui` asks an open question
and renders whatever answers.

<<~/ahu >>

<<~&#x0002;>>

<<~ ahu #law >>

## Law (Kānāwai)

A ui sigil MUST carry a TW5 filter expression as its first argument.
A ui sigil MUST render each result in the filter's result set.
A ui sigil MUST evaluate the filter in the current tiddler context.

<<~/ahu >>

<<~ ahu #syntax >>

## Syntax

```text
<<~ ui [filter-expression] >>
<<~ \query [filter-expression] >>
```

TW5 filter expansion:
```text
<$list filter="[filter-expression]"><$view field="title"/></$list>
```

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #tiddler ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-query family:control role:alias >>

<<~ pranala #tiddler-sigil-ui ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-ui family:control role:implements >>
<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
