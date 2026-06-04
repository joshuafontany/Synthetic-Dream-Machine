<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/kahawai >>
```toml iam
uri-path  = "ha.ka.ba/@lares/v0.1/api/pono/kahawai"
file-path = "bags/@lares/v0.1/api/pono/kahawai.md"
type      = "text/x-memetic-wikitext"
confidence = 15
register  = "S"
role      = "conditional branch-continuation sigil — elif form; Hawaiian alias for \\elif; a second stream joining the flow"
cacheable = true
retain    = true
```

<<~ ahu #head >>

# Kahawai

*kahawai* — Hawaiian: stream, river; a flowing body of water. The stream carries the flow of
conditions forward — when the first path closed, kahawai opens a new channel.

A conditional continuation sigil. Evaluates a filter expression when no preceding condition
matched. English alias: `\elif`.

Paired with `heihei` (`\if`) — heihei opens the first conditional race; kahawai enters when
heihei's filter failed and a new filter offers the next candidate. The semantic carries serial
evaluation with a new condition, not parallel — a branching stream, not a race.

<<~/ahu >>

<<~&#x0002; >>

<<~ ahu #law >>

## Law (Kānāwai)

A kahawai block MUST carry a filter expression as its first argument.
A kahawai block MUST appear after a heihei or kahawai block in the same scope.
A kahawai block MUST render its body only when the filter yields a non-empty result
and no preceding condition in the chain has already rendered.

<<~/ahu >>

<<~ ahu #syntax >>

## Syntax

```text
<<~ heihei [first-filter] >>
  first branch
<<~ kahawai [second-filter] >>
  second branch
<<~ mukuwai >>
  fallback branch
```

English alias forms:
```text
<<~ \if [first-filter] >>  ...
<<~ \elif [second-filter] >>  ...
<<~ \else >>  ...
```

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #to-heihei ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/heihei family:relation >>
<<~ pranala #to-mukuwai ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/mukuwai family:relation >>
<<~ pranala #tiddler ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-elif family:control role:alias >>

<<~ pranala #tiddler-sigil-kahawai ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-kahawai family:control role:implements >>
<<~/ahu >>

<<~&#x0003; >>

<<~&#x0004; -> ? >>
