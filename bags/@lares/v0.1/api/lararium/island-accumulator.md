<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/lararium/island-accumulator >>
```toml iam
uri-path    = "ha.ka.ba/@lares/v0.1/api/lararium/island-accumulator"
file-path   = "bags/@lares/v0.1/api/lararium/island-accumulator.md"
type        = "text/x-typescript"
register    = "CS"
confidence  = 0.92
mana        = 0.91
manao       = 0.89
manaoio     = 0.87
role        = "frame-aligned CRDT patch buffer per bag — post-sync crdt-remote queue; drained by IslandAdaptor.flushAll()"
cacheable   = true
retain      = true
docs        = "lar:///ha.ka.ba/@lares/v0.1/docs/lararium/verse-mesh"
```

# IslandAccumulator — Invariant

## Identity

`IslandAccumulator` is the frame-aligned CRDT patch buffer for one bag
in the Verse polychronous mesh.
It implements `MemeProjection`.
It lives in `@lararium/mesh` — platform-agnostic, zero TW5 dependency.

One `IslandAccumulator` instance exists per **bag per booted VM slot**.
A recipe of N bags in a live VM slot holds N accumulators.

## Position in the Mesh

```
Automerge patch → MemeProvider → IslandAdaptor   (pre-sync, non-CRDT)
                              → IslandAccumulator (post-sync crdt-remote)
                                      ↓
                              rAF / setInterval frame boundary
                                      ↓
                              IslandAdaptor.flushAll(accs, budget)
                                      ↓
                              wiki.transact(() => apply batch)
                                      ↓
                              one widget refresh pass → paint
```

## Invariants

**A-1 Sync gate.**
`onUriChanged` enqueues only when `_syncReady === true`.
`_syncReady` becomes true after `onSyncComplete()` fires.
Changes arriving before sync complete pass to `IslandAdaptor` (which buffers them).
The accumulator and adaptor cover disjoint time windows — no double-write.

**A-2 crdt-remote filter.**
`onUriChanged` enqueues only `crdt-remote` origins.
Non-CRDT origins (`tw-local`, `canon-hydrate`, `lares-job`) apply immediately
through `IslandAdaptor._applyChange` — they bypass the accumulator entirely.

**A-3 Drain returns and removes.**
`drain(budget)` returns up to `budget` entries and splices them from `_queue`.
The caller (`IslandAdaptor.flushAll`) owns the apply step.
The accumulator does not touch the TW5 wiki.

**A-4 Budget cap.**
`drain` does not drain more than `budget` entries per call.
`IslandAdaptor.flushAll` distributes a shared `budget` across N accumulators
in recipe priority order — earlier (lower-priority) bags drain first, stopping
when the frame budget exhausts.
Remainder carries to the next tick.

**A-5 Platform-agnostic.**
No `requestAnimationFrame` import.
No TW5 import.
The tick source (rAF, setInterval, manual) lives in the caller.

## API

```typescript
class IslandAccumulator implements MemeProjection {
  onSyncComplete(islandId?: string): void   // arms the gate
  onUriChanged(change: LarTiddlerChange): void  // enqueues post-sync crdt-remote
  drain(budget?: number): LarTiddlerChange[]    // caller applies the batch
  get pending(): number                         // queue depth
  get syncReady(): boolean                      // gate state
}
```

## Camera Projection

Each camera (Story River, TLDraw canvas, mobile view, etc.) that renders from the
same bag stack SHOULD hold its own `IslandAccumulator` instance.
Each accumulator drains at its own camera's tick rate via `drain(budget)`.
All accumulators receive the same CRDT patches from `MemeProvider`.
Cameras see the same causal-ordered state; their frame rates differ.

**Inverted control:** the accumulator does not know about cameras.
It drains into the wiki via `wiki.transact()`.
The wiki fires `change`.
Each camera's widget tree (registered via `wiki.addEventListener`) reacts.
Widget trees with no dependency on the changed tiddlers return in O(1) — no repaint.

**The view frustum** lives in the widget tree's root filter tiddler, not in the accumulator.

**Input + output:** cameras that accept user input wire outbound handlers
(`saveTiddler`, `dispatchEvent`) on their widget tree back through `IslandAdaptor`.
The accumulator carries no identity for this path.

See: `lar:///ha.ka.ba/@lares/v0.1/docs/lararium/verse-mesh` — Multi-Camera Example.

<<~&#x0002;>>

<<~&#x0004; -> lar:///ha.ka.ba/@lares/v0.1/api/lararium/island-adaptor >>
<<~&#x0004; -> lar:///ha.ka.ba/@lares/v0.1/api/lararium/camera-mount >>
<<~&#x0004; -> lar:///ha.ka.ba/@lares/v0.1/docs/lararium/verse-mesh >>
