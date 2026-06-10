<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/epoch-handlers >>
```toml iam
uri-path     = "ha.ka.ba/@lararium/v0.1/tw5/epoch-handlers"
file-path    = "bags/@lararium/v0.1/tw5/epoch-handlers.md"
source-file  = "packages/lararium-tw5/src/epoch-handlers.ts"
type         = "text/x-memetic-wikitext"
register     = "Synthesis"
mana         = 12
manao        = 12
role         = "bag-epoch + rotate-recipe — DXOS-style snapshot-restart on a bag; the only local-first mechanism that bounds CRDT history"
tagspace     = "lararium"
cacheable    = true
retain       = true
```
<<~ &#x0002; >>

<<~ ahu #contract >>

## Contract

Two reactors, both running worker-ward over the catalog accessor
(access≠load), both ending in a reboot-pending alert to affected live wikis:

- **`epoch-bag <bag-url>`** (`makeEpochBagReactor`) — snapshot-restart:
  open the old doc, materialize all tiddlers into a freshly minted doc (no
  history), point the `@catalog` oracle at the new doc URL, register the new
  doc cold with the residency manager, alert every wiki whose recipe stack
  includes the bag. Lossy by design — pre-epoch peers that never synced
  through cannot rebuild the change graph from the new doc alone.
- **`rotate-recipe <slug>`** (`makeRotateRecipeReactor`) — fresh canonical:
  mint an empty doc as the wiki's new canonical bag; the old canonical drops
  to a previous-canon underlay in the recipe stack (content stays readable,
  new writes land in the fresh doc).

<<~/ahu >>

<<~ ahu #invariants >>

## Invariants

**EP-1 — Tombstones survive the epoch (Cassandra rule).** A record carrying
`meta.deleted = true` migrates into the new doc as first-class state, not
history — a deletion in a high bag that unshadows a low bag's copy must
outlive the restart, or the delete silently un-happens.

**EP-2 — Only the oracle moves.** The bag's slot URI never changes across an
epoch; the `@catalog` oracle tiddler's doc URL does. Running islands hold the
old doc handle until reboot — hence the alert.

**EP-3 — No reach-in.** The admin writes docs + catalog records and posts the
alert verb; each island writes its own `@temp` alert tiddler. The admin never
mutates a mounted composite.

**EP-4 — Operator prunes.** The old doc stays in the repo after the epoch;
reclaiming its storage stays an operator act (OS-level or a future GC sprint).

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #engine-watch ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/engine-watch family:relation role:engine-epoch-sibling >>
<<~ pranala #recipe ? -> lar:///ha.ka.ba/@lararium/v0.1/mesh/recipe family:relation role:rewrites-the-stack >>
<<~ pranala #handler-args ? -> lar:///ha.ka.ba/@lararium/v0.1/node/handler-args family:relation role:arg-coercion >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
