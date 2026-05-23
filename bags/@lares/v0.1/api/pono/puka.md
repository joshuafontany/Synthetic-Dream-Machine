<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/puka >>
```toml iam
uri-path  = "ha.ka.ba/@lares/v0.1/api/pono/puka"
file-path = "bags/@lares/v0.1/api/pono/puka.md"
type      = "text/x-memetic-wikitext"
confidence = 0.82
register  = "S"
role      = "first-through-the-opening sigil — puka as the gap; Verse rush: first wins, losers continue until enclosing scope exits (NOT cancelled by winner); English alias: \\rush; async-first concurrency sprint pending"
cacheable = true
retain    = true
```

<<~ ahu #head >>

# Puka

*puka* — Hawaiian: hole, opening, gap; doorway, exit. A puka marks where passage happens — the
first thing through the opening wins. The others keep moving; they simply no longer determine
the outcome.

A first-through-the-opening sigil. The body of a puka block spawns parallel flows; the first
flow to complete yields the result and the block continues — but the remaining flows run on in
the background without cancellation. English alias: `\rush`.

Verse equivalent: `rush` — parallel child flows race; first settler wins; losers continue running
in background. Distinct from `race` (which cancels losers immediately). See `holo` for the
cancelling-race form.

The puka metaphor holds: when a fish finds the gap in the net, it passes through. The net
remains open — the others may pass through later or not. The outcome already settled.

Concurrency runtime pending (async-first sprint). Current tiddler registers grammar only.

<<~/ahu >>

<<~&#x0002;>>

<<~ ahu #law >>

## Law (Kānāwai)

A puka block MUST spawn all child flows before any result lands.
A puka block MUST propagate the first completing flow's result as the block's output.
A puka block MUST NOT cancel remaining flows when the winner lands — they continue in background.
A puka block MUST cancel remaining flows when the enclosing async context (function scope) exits.
A puka block MUST NOT resume the containing flow until one child flow completes.
A puka block MUST NOT appear directly inside a `huli` (`\for`) iteration body.

<<~/ahu >>

<<~ ahu #syntax >>

## Syntax

```text
<<~ puka >>
  <<~ lele lar:///target-a >>
  <<~ lele lar:///target-b >>
<<~/puka >>

<<~ \rush >>
  <<~ \branch lar:///target-a >>
  <<~ \branch lar:///target-b >>
<<~/\rush >>
```

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #tiddler-sigil-puka ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-puka family:control role:implements >>
<<~ pranala #tiddler-sigil-rush ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-rush family:control role:alias >>
<<~ pranala #to-holo ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/holo family:relation role:contrast >>
<<~ pranala #to-verse-task-tree ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/verse-task-tree family:relation role:governed-by >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
