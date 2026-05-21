<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/v0.1/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/mesh/v0.1/tiddler-text >>
```toml iam
uri-path    = "ha.ka.ba/@lararium/mesh/v0.1/tiddler-text"
file-path   = "bags/@lararium/mesh/v0.1/tiddler-text.md"
heleuma     = "ba"
type        = "text/x-memetic-wikitext"
register    = "CS"
confidence  = 0.90
mana        = 0.88
manao       = 0.86
manaoio     = 0.83
role        = "heleuma: oracle tiddler text-field reader"
cacheable   = true
retain      = true
```
<<~&#x0002;>>

<<~ ahu #contract >>

## Contract

`tiddlerText(record)` — accepts any `{ tiddler: { text?: unknown } } | null | undefined`, returns `string | null`.

Oracle tiddlers (lararium, catalog, lares, wiki, corpus) carry their payload Automerge URL in `tiddler.text`. This helper centralises the `typeof text === "string"` guard so call sites stay one token.

## Why here

`open-node-lar-peer.ts` defined a local `recordText()`. `wiki-handlers.ts` defined an identical copy. Fifteen-plus inline `typeof rec?.tiddler.text === "string"` guards remain scattered across the node package. This file collapses them.

<<~/ahu >>

<<~&#x0003;>>
<<~&#x0004; -> ? >>
