<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/lararium/nalu-engine >>
```toml iam
uri-path    = "ha.ka.ba/@lares/v0.1/api/lararium/nalu-engine"
file-path   = "bags/@lares/v0.1/api/lararium/nalu-engine.md"
type        = "text/x-typescript"
register    = "Synthesis-Canon"
mana        = 18
manao       = 18
manaoio     = 17
role        = "TW5 startup module — unified nalu queue across all CRDT bags + frame-aligned wiki.transact() drain + apply-time echo guard; the in-wiki embodiment of the nalu wave"
cacheable   = true
retain      = true
docs        = "lar:///ha.ka.ba/@lares/v0.1/api/pono/nalu"
implementation = "packages/lararium-tw5/src/modules/nalu-engine.ts"
```

# nalu-engine — Invariant

## Identity

`nalu-engine` is a TW5 `module-type: startup` module written in TS, compiled into the
plugin bundle, and evaluated inside the wiki at boot. It installs the `$tw.lares.*` API
that the TS-side `IslandAdaptor` calls across the membrane.

The wiki IS the reactive engine (yin-collapse law, lar:///ha.ka.ba/@lares/v0.1/api/pono/nalu).
This module is the in-wiki embodiment of the nalu wave.

## $tw.lares.* surface

| Method | Caller | Role |
|---|---|---|
| `enqueueNalu(change)` | IslandAdaptor (per inbound LarTiddlerChange) | Push onto the shared queue, schedule next-frame drain |
| `flushNalu(budget?)` | `buildIslandRecipe` (after initial replay), tests | Drain synchronously up to `budget` (default 200) |
| `isApplyingNalu()` | IslandAdaptor (outbound `saveTiddler` / `deleteTiddler`) | True while the engine holds the apply-time mutex; outbound guards skip |
| `naluPending()` | tests, observability | Current queue depth |

## Position in the stack

```
TS membrane (irreducible — Automerge, network, crypto, storage)
  AutomergeDocStore.handle.on("change") → MemeProvider → projection bus
  IslandAdaptor.onUriChanged — filter own echo + resolve cross-bag tombstone
                              → $tw.lares.enqueueNalu(change)
───────────────────────────────────────────────────────────────────────
TW5 startup module (this spec)
  _queue: LarTiddlerChange[]              ← unified across all CRDT bags
  _scheduleFrame()                        ← rAF (browser) / setTimeout(16) fallback
  _drain(budget)                          ← one wiki.transact() per frame
  _applying flag                          ← read by IslandAdaptor outbound guards
```

## Invariants

**N-1 One queue, all bags.**
The engine holds exactly one `LarTiddlerChange[]` queue. Changes from every CRDT bag,
every origin kind, arrive in `enqueueNalu` and join the same queue in arrival order.
Per-bag accumulators do not exist under unified-nalu.

**N-2 One transact per frame.**
Each `_drain(budget)` call wraps the entire batch in one `wiki.transact()` if the wiki
exposes that method. Widgets receive one `change` event for the whole batch — one nalu
per frame, regardless of bag count or origin mix. This is the Vue 3 / MobX / Yjs / Solid
batch semantics applied at the wiki layer (cf. DriftWatch [PriorArt] 2026-05-29).

**N-3 Frame scheduler — platform-detected, not configured.**
At each enqueue, `_scheduleFrame()` schedules exactly one upcoming drain. If
`globalThis.requestAnimationFrame` exists, rAF; otherwise `setTimeout(16)`. The flag
`_scheduled` prevents duplicate scheduling within one frame window. Browser Workers
without rAF fall back to setTimeout transparently.

**N-4 Apply-time mutex.**
`_applying` is `true` for the duration of one `_drain` call's `wiki.transact()` block,
including synchronous reactions fired by widgets observing the change. IslandAdaptor's
outbound `saveTiddler` / `deleteTiddler` check `isApplyingNalu()` before writing —
suppresses any cascade echo that would re-enter the store.

**N-5 Tiddler fields = record.tiddler + bag.**
For a non-tombstone change, the engine constructs the wiki fields from
`{ ...change.record.tiddler }`, optionally injecting the `bag` field from `change.bag`.
For a tombstone (`record === null` or `record.meta?.deleted === true`), the engine
calls `wiki.deleteTiddler(change.title)`.

**N-6 Remainder carries to the next frame.**
If `_queue.length > budget`, only `budget` patches drain this frame; the engine
re-schedules another frame for the remainder. The wiki sees one transact per scheduled
frame; the queue drains in bounded steps.

**N-7 Idempotent startup.**
`startup()` reads `$tw.lares ?? {}`, installs the four functions, writes back. Safe to
run more than once in tests; subsequent invocations overwrite with identical refs.

## Initial replay path

The recipe drives initial state through this same engine. After the IslandAdaptor
registers as a projection, the recipe calls `AutomergeDocStore.emitInitialReplay()` per
bag, which fires `provider.fireImmediate` per existing tiddler. Each one becomes one
`enqueueNalu` call. The recipe then calls `flushNalu(Number.MAX_SAFE_INTEGER)` to drain
the whole initial-state batch synchronously in one `wiki.transact()`, so the wiki carries
its seed before `behavior.onEa` runs.

This means initial replay and live patches share the same code path. No per-island
pre-sync buffer, no `onSyncComplete` flush machinery in the TS layer. The engine's
queue handles both.

<<~ &#x0002; >>

<<~ &#x0004; -> lar:///ha.ka.ba/@lares/v0.1/api/pono/nalu >>
<<~ &#x0004; -> lar:///ha.ka.ba/@lares/v0.1/api/lararium/island-adaptor >>
<<~ &#x0004; -> lar:///ha.ka.ba/@lares/v0.1/docs/lararium/verse-mesh >>
