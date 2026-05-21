<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/v0.1/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lares/api/v0.1/lararium/island-adaptor >>
```toml iam
uri-path    = "ha.ka.ba/@lares/api/v0.1/lararium/island-adaptor"
file-path   = "bags/@lares/api/v0.1/lararium/island-adaptor.md"
type        = "text/x-typescript"
register    = "CS"
confidence  = 0.92
mana        = 0.91
manao       = 0.89
manaoio     = 0.87
role        = "causal-island ↔ TW5 wiki bridge — inbound pre-sync buffer + non-CRDT apply + outbound direct writes"
cacheable   = true
retain      = true
docs        = "lar:///ha.ka.ba/@lares/docs/lararium/verse-mesh"
```

# IslandAdaptor — Invariant

## Identity

`IslandAdaptor` is the causal-island ↔ TW5 wiki bridge.
It implements `MemeProjection` (inbound) and exposes `saveTiddler` / `deleteTiddler` (outbound).
It does NOT implement the TW5 `syncadaptor` module contract.
`$tw.syncer` does not run — no `module-type:syncadaptor` tiddler exists in the plugin bundle.

## Responsibility Split

| Concern | Owner |
|---|---|
| Pre-sync inbound buffer per island | IslandAdaptor |
| `onSyncComplete` batch flush (one `wiki.transact()` per island) | IslandAdaptor |
| Non-CRDT immediate apply (canon-hydrate, lares-command, tw-local echoes) | IslandAdaptor |
| Post-sync crdt-remote buffering | IslandAccumulator (separate projection) |
| rAF-frame drain of post-sync patches | IslandAdaptor.flushAll() |
| Outbound `saveTiddler` → `store.put()` | IslandAdaptor |
| Outbound `deleteTiddler` → `store.tombstone()` | IslandAdaptor |

## Wiring — Callers Register Both Projections

```typescript
const adaptor     = new IslandAdaptor(tw5, store, instanceId, targetBag);
const accumulator = new IslandAccumulator();
store.addProjection(adaptor);       // pre-sync buffer + non-CRDT
store.addProjection(accumulator);   // post-sync crdt-remote
```

The adaptor and accumulator are **siblings** in the projection fan-out,
not nested. Both receive `onUriChanged` from `MemeProvider`.
The adaptor handles everything before sync complete; the accumulator handles
everything after.

## Invariants

**I-1 Echo-loop guard.**
`_applying: Map<string, ChangeOrigin>` remains non-empty for the duration of any inbound apply.
`saveTiddler` and `deleteTiddler` return early (no-op) whenever `_applying.size > 0`.
Multiple concurrent island replays use distinct apply-key slots — they do not interfere.

**I-2 Island isolation.**
One buffer per `edgeIsland` id.
`onSyncComplete(islandId)` drains only that island's buffer.
Multiple islands flush independently.

**I-3 Single transact per flush.**
`onSyncComplete` applies its entire buffer inside one `wiki.transact()` call —
one widget refresh pass per island, not one per tiddler.

**I-4 Post-sync crdt-remote pass-through.**
After `_syncComplete.has(islandId)` returns true, `onUriChanged` returns immediately
for `crdt-remote` origins.
IslandAccumulator holds those changes until the next frame drain.

**I-5 Non-CRDT immediate apply.**
`tw-local`, `canon-hydrate`, `lares-command` origins bypass the sync gate and
apply immediately via `_applyChange`.

**I-6 Outbound guards — saveTiddler.**
Skip if: `_isApplying()` || `$:/temp/` || `$:/` || `Draft of ` || not `lar:` prefix.
All other `lar:` URIs reach `store.put()` via the Path-H auto-split (`splitBodyTiddler`).

**I-7 Cross-bag tombstone resolution.**
On a delete change, if the store exposes `getLive(uri)`, resolve before wiping TW5 —
a tombstone in one bag must not wipe TW5 if another recipe layer still holds a live copy.

**I-8 Child cleanup.**
`deleteTiddler` removes ahu fragment-parent slot children from TW5 under the echo guard
using a dedicated `${instanceId}:child` apply-key slot.

## flushAll — Per-Camera Drain

```typescript
flushAll(accs: IslandAccumulator[], budget = 200): void
```

Drains each accumulator in the array, up to `budget` patches total.
Carries remainder to the next tick.
Each non-empty accumulator drains into one `wiki.transact()` block.
The wiki fires `change` after each transact — all registered widget trees react.

In multi-camera wiring, `startRenderLoop` calls `flushAll([cam.accumulator], cam.budget)`
per camera at each camera's own tick rate.  The adaptor applies the batch to the shared wiki.
Each widget tree's `refresh(changedTiddlers)` selects the relevant subset — view frustum
lives in the tree's root filter, not in the adaptor or accumulator.

<<~&#x0002;>>

<<~&#x0004; -> lar:///ha.ka.ba/@lares/api/v0.1/lararium/island-accumulator >>
<<~&#x0004; -> lar:///ha.ka.ba/@lares/docs/lararium/verse-mesh >>
