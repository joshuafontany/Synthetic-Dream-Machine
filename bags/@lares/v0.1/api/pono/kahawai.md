<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/kahawai >>
```toml iam
uri-path  = "ha.ka.ba/@lares/v0.1/api/pono/kahawai"
file-path = "bags/@lares/v0.1/api/pono/kahawai.md"
type      = "text/x-memetic-wikitext"
register  = "Synthesis"
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

Paired with `wai` (`\if`) — wai opens the cascade; kahawai enters when wai's filter failed and a
new filter offers the next candidate. Serial evaluation with a new condition — a stream joining the
water cascade.

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #law >>

## Law (Kānāwai)

A kahawai block MUST carry a filter expression as its first argument.
A kahawai block MUST appear after a wai or kahawai block in the same scope.
A kahawai block MUST render its body only when the filter yields a non-empty result
and no preceding condition in the chain has already rendered.

<<~/ahu >>

<<~ ahu #syntax >>

## Syntax

```text
<<~ wai [first-filter] >>
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

<<~ pranala #to-wai ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/wai family:relation >>
<<~ pranala #to-mukuwai ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/mukuwai family:relation >>
<<~ pranala #tiddler ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-elif family:control role:alias >>

<<~ pranala #tiddler-sigil-kahawai ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-kahawai family:control role:has >>
<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
