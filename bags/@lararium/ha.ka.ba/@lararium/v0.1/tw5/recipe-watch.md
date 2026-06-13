<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/recipe-watch >>
```toml iam
cacheable   = true
file-path   = "bags/@lararium/v0.1/tw5/recipe-watch.md"
mana        = 11
manao       = 11
register    = "Synthesis"
retain      = true
role        = "recipe-watch — island-side LIVE composition reconcile; the composition class sheds its reboot"
source-file = "packages/lararium-tw5/src/recipe-watch.ts"
tagspace    = "lararium"
type        = "text/x-memetic-wikitext"
uri-path    = "ha.ka.ba/@lararium/v0.1/tw5/recipe-watch"
```

<<~ &#x0002; >>

<<~ ahu #contract >>

## Contract

`startRecipeWatch(ctx)` subscribes the island to the `@catalog` registry doc
(access≠load — watched, never rendered as a layer), reads the island's own
recipe record (`recipeUri("@catalog", slug)`, field `bag-stack`), and applies
the diff to the island's own composite:

- **bag added** → resolve via the catalog oracle, insert the layer above
  `@lares` (library position, below the wiki bag), replay its content into
  the running wiki.
- **bag removed** → `CompositeStore.removeLayerLive`: departed titles
  tombstone to projections, records the bag shadowed resurface.
- **oracle URL moved** (bag epoch / rotate-recipe) → swap the layer's store
  in place at the same cascade position, replay from the new doc.

Reconciles serialize (one at a time; a change mid-run queues one rerun). The
wiki behavior starts it at `onEa`, stops it at demote.

<<~/ahu >>

<<~ ahu #invariants >>

## Invariants

**RW-1 — The island reconciles itself.** The admin writes the catalog and
posts the alert verb; it never mounts or unmounts a live composite. The watch
runs inside the island, over the island's own composite.

**RW-2 — Alert demotes to fallback, here only.** After a successful live
reconcile the island tombstones its own reboot-pending alert in `@temp`. The
alert remains the mechanism for islands that sleep through the change — and
remains the *permanent* mechanism for the epoch class (engine-watch): code
never live-swaps.

**RW-3 — Unregistered bags wait.** A recipe entry whose catalog oracle
resolves to nothing gets skipped — the admin's alert stays standing until the
oracle lands or the operator reboots.

**RW-4 — Structural slots stay structural.** Membership reconcile touches
library bags only; `@temp`/`@draft`/`@personal`/wiki/`@lares`/`@lararium`
never mount or unmount by stack diff. Oracle-move swaps apply to any mounted
CRDT slot the catalog oracles.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/tw5/engine-watch >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/recipe >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/tw5/epoch-handlers >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
