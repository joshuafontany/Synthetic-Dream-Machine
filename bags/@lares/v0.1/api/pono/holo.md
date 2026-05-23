<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/holo >>
```toml iam
uri-path  = "ha.ka.ba/@lares/v0.1/api/pono/holo"
file-path = "bags/@lares/v0.1/api/pono/holo.md"
type      = "text/x-memetic-wikitext"
confidence = 0.82
register  = "S"
role      = "cancelling-race sigil — holo as full sprint; Verse race: first wins, losers and their entire subtrees cancelled recursively; English alias: \\race; async-first concurrency sprint pending"
cacheable = true
retain    = true
```

<<~ ahu #head >>

# Holo

*holo* — Hawaiian: to run, sail, glide, flow rapidly; to race at full speed. Used in *holo
i mua* (press forward), *holo wa'a* (canoe racing). The motion commits fully — speed leaves
no quarter for the others.

A cancelling-race sigil. The body of a holo block spawns parallel flows; the first flow to
complete yields its result and all remaining flows cancel immediately. English alias: `\race`.

Verse equivalent: `race` — parallel child flows race; first settler wins; all losers cancel.
Distinct from `puka` (`\rush`), where losers continue running in background.

The holo metaphor holds: in a canoe race, when the lead boat crosses the finish line, the
other boats stop racing. The result propagates back; the contest ends.

Concurrency runtime pending (async-first sprint). Current tiddler registers grammar only.

<<~/ahu >>

<<~&#x0002;>>

<<~ ahu #law >>

## Law (Kānāwai)

A holo block MUST spawn all child flows before any result lands.
A holo block MUST cancel all remaining child flows when the first one completes.
A holo block MUST cancel the entire subtree of each losing arm — not just direct children — recursively.
A holo block MUST propagate the winning result as the block's output.
A holo block MUST NOT resume the containing flow until one child flow completes.

<<~/ahu >>

<<~ ahu #syntax >>

## Syntax

```text
<<~ holo >>
  <<~ lele lar:///target-a >>
  <<~ lele lar:///target-b >>
<<~/holo >>

<<~ \race >>
  <<~ \branch lar:///target-a >>
  <<~ \branch lar:///target-b >>
<<~/\race >>
```

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #tiddler-sigil-holo ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-holo family:control role:implements >>
<<~ pranala #tiddler-sigil-race ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-race family:control role:alias >>
<<~ pranala #to-puka ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/puka family:relation role:contrast >>
<<~ pranala #to-verse-task-tree ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/verse-task-tree family:relation role:governed-by >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
