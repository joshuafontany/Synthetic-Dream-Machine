<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/v0.1/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/node/v0.1/node-vm-manager >>
```toml iam
uri-path    = "ha.ka.ba/@lararium/node/v0.1/node-vm-manager"
file-path   = "bags/@lararium/node/v0.1/node-vm-manager.md"
type        = "text/x-memetic-wikitext"
tagspace    = "lararium"
register    = "CS"
confidence  = 0.82
manaoio     = 0.78
mana        = 0.84
manao       = 0.80
role        = "load-bearing contract: three-tier TW5 VM lifecycle (pinned/hot/cold), LRU eviction, Worker handshake protocol, parse/render split, ReactionEngine event routing"
cacheable   = true
hydrate     = true
retain      = true
last-reviewed = "2026-05-11"
```

<<~ aka lar:///ha.ka.ba/@lares/api/v0.1/pono/RFC-2119#normative-language >>

<<~&#x0002;>>


<<~ ahu #head >>

# NodeVmManager

Three tiers. One manager. No worker thread touches the main event loop.

The `NodeVmManager` manages the TW5 VM lifecycle for the Node.js lararium peer. Every active wiki in the peer occupies exactly one slot. Every slot carries exactly one tier designation. The manager promotes, demotes, and evicts slots according to the tier contract below.

<<~/ahu >>


<<~ ahu #ooda-ha >>

✶ read arriving operation — mount, unmount, route, parse, render, or dispose
⏿ locate the target wikiId in the slot map; read its current tier
◇ branch by tier: pinned stays in-process; hot routes through Worker postMessage; cold requires promotion before any engine operation
▶ execute the tier-appropriate path; handshake or engine call as the tier demands
⤴ update slot state, snapshot, or lastUsedAt as the operation requires
↺ release; leave no dangling listener, no leaked Worker handle, no orphaned timer

<<~/ahu >>


<<~ ahu #tier-contract >>

## Tier Contract

The slot map holds three tier designations. Each tier carries a distinct resource profile and routing rule.

### Pinned

The pinned tier holds the PrimaryWiki and the admin wiki. Both slots stay in-process — the `TW5Engine` runs in the same thread as the Node.js event loop. A `MemeSyncAdaptor` wires the pinned engine to the `CompositeStore`. The main thread reads the pinned engine synchronously, at zero serialization cost.

The manager MUST NOT evict a pinned slot. `mountPrimary()` places a slot into the pinned tier; no path removes it except `disposeAll()`.

> **#Map-Wisp (Scryer)** — The pinned tier functions as the parse/render authority for the whole peer (see §parse-render-split). Keeping TW5 in-process for the primary wiki means grammar deserialization and template rendering never pay a postMessage round-trip. The hot tier surrenders that affordance in exchange for thread isolation.

### Hot

The hot tier holds a least-recently-used pool of active session wikis (cap: `HOT_CAP = 4`). Each hot slot owns one `worker_threads.Worker`. The `TW5Engine` and (from P.3.5) a `ReactionEngine` run co-located inside the Worker thread.

The main thread MUST NOT hold a reference to the Worker's engine. All interaction routes through the `lar-worker-protocol` envelope: changesets in, events out. The Worker thread MUST NOT load the Automerge WASM runtime (GP-3).

When a new `mountWiki()` call would exceed `HOT_CAP`, the manager evicts the slot with the lowest `lastUsedAt` timestamp via the GP-5 teardown handshake before spawning the new Worker.

### Cold

The cold tier holds CRDT-only residency. No thread runs. No engine lives. A `VmSnapshot` carries the materialized tiddler view from the slot's last `teardown:ack` — a point-in-time read of the Worker's TW5 state. The Automerge doc remains authoritative; the snapshot functions as a warm-start cache for the next `mountWiki()` call.

A slot enters cold when `unmountWiki()` completes successfully. A slot also enters cold when LRU eviction fires. A slot with no prior teardown record carries `snapshot: null` — `mountWiki()` boots TW5 empty in that case.

> **#Lares (Liminal)** — The cold snapshot carries staleness risk. The CRDT remains authoritative, but the snapshot may reflect an older doc state if changes arrived while the slot sat cold. The promote path reads from the live doc, not the snapshot alone — the snapshot seeds the initial tiddler population; incoming changesets carry the delta forward. This residual window stays open until P.3.5 closes it with a full changeset replay on promote.

<<~/ahu >>


<<~ ahu #promote-demote-flow >>

## Promote / Demote Flow

```
mountWiki(wikiId, ctx)
  → _evictLruIfNeeded()           -- GP-5 teardown if HOT_CAP reached
  → new Worker(workerScriptUrl)   -- thread spawns; awaits first message
  → _wireWorkerListeners()        -- message + error handlers attached
  → mkPromote(wikiId, tiddlers)   -- promote envelope dispatched
  → _sendAndAwait("promote:ack")  -- blocks (max HANDSHAKE_TIMEOUT_MS = 10s)
  → _subscribeDocChanges()        -- live changeset forwarding armed
  → slot tier = "hot"

unmountWiki(wikiId)
  → unsubChange()                 -- changeset forwarding disarmed first
  → mkTeardown()                  -- teardown signal dispatched
  → _sendAndAwait("teardown:ack") -- blocks for snapshotTiddlers + ack
  → worker.terminate()            -- thread exits
  → slot tier = "cold"            -- VmSnapshot written from teardown:ack payload
```

The `_sendAndAwait()` helper rejects after `HANDSHAKE_TIMEOUT_MS`. The caller receives the rejection; the Worker receives a `terminate()` call regardless, because a Worker that fails to ack in 10 seconds MUST NOT continue running.

> **#Breach-Watch (Triage)** — The teardown path calls `unsubChange()` before dispatching teardown. This ordering matters: a changeset arriving after teardown dispatches but before the Worker processes teardown could arrive out of sequence. The unsub fires first, closing that window.

<<~/ahu >>


<<~ ahu #parse-render-split >>

## Parse / Render Split

The pinned engine carries two privileged operations that the manager routes there unconditionally.

**`parseMeme(uri, text, extraFields?)`** — grammar-pure deserialization. Parses a meme carrier text into `TiddlerFields[]`. The pinned engine serves all parse requests regardless of which wiki slot owns the tiddler. Grammar MUST remain stateless across wikis; no session state contaminates the parse path.

**`renderMeme(uri)`** — template-dependent rendering via `exportMemeText()`. The pinned wiki's template set and stylesheet bags govern output. Worker-backed wikis MUST NOT render directly from the main thread in P.3. Cross-wiki render routes through the Worker event channel beginning in P.4.

Both operations return `null` before the pinned wiki finishes booting.

> **#Mischief-Muse (Muse)** — parseMeme routing to pinned-always feels correct for grammar but it creates an implicit assumption: grammar stays uniform across all wikis in the peer. If a session wiki ever needs a grammar extension — a custom carrier format, a plugin-defined tiddler type — parseMeme will silently use the primary wiki's grammar, not the session wiki's. Flag this as P.4 scope. A `wikiId` parameter on parseMeme would let the caller opt into session-wiki grammar when the pinned grammar falls short.

<<~/ahu >>


<<~ ahu #gp-protocol-set >>

## GP Protocol Set

The Worker boundary enforces five guarantees (GP-1 through GP-5). These live in `lar-worker-protocol.ts`; the manager enforces them structurally.

| Code | Guarantee | Enforcement point |
|---|---|---|
| **GP-1** | `schema_version: 1` on every message crossing the boundary | `lar-worker-protocol.ts` — all message constructors stamp the version |
| **GP-2** | Payloads carry only plain objects; no class instances, no functions | Manager derives plain-object tiddler fields from the Automerge doc before dispatch |
| **GP-3** | Worker never loads the Automerge WASM runtime | `_subscribeDocChanges()` derives the tiddler delta on the main thread; only the delta crosses the boundary |
| **GP-4** | CryptoKey material stays in-thread | No key-bearing fields appear in any `WorkerMsg_*` type |
| **GP-5** | Teardown completes via handshake, not unilateral terminate | `unmountWiki()` awaits `teardown:ack` before calling `worker.terminate()` |

> **#Ink-Clerk (Lorekeeper)** — GP-3 carries the most architectural weight. Keeping Automerge WASM out of the Worker means each hot slot costs one thread but zero WASM instances. At `HOT_CAP = 4`, four Workers run; the WASM runtime loads once on the main thread only. Relaxing GP-3 in a future phase (e.g., giving Workers their own local Automerge replica for offline-first operation) would require a careful accounting of memory and startup cost per slot.

<<~/ahu >>


<<~ ahu #changeset-routing >>

## Changeset Routing

Live Automerge changes reach the Worker through `routeChangeset()`. The main thread derives a tiddler-level delta from the Automerge `change` event patches:

1. `_subscribeDocChanges()` attaches to `docHandle.on("change", ...)` at mount time.
2. For each change payload, the handler walks `patches` and collects affected tiddler URIs.
3. For each URI, the handler reads current field state from the updated doc.
4. Tiddlers without a `deleted` flag move into `added[]`; tiddlers with `deleted: true` (or absent from the doc) move into `deleted[]`.
5. The delta dispatches to the Worker as a `WorkerMsg_Changeset` envelope.

The Worker never reads the Automerge doc. It applies only what the main thread sends (GP-3).

The unsub function from step 1 MUST fire before `teardown` dispatches (see §promote-demote-flow).

<<~/ahu >>


<<~ ahu #event-forwarding >>

## ReactionEngine Event Forwarding

When a Worker's ReactionEngine fires a reaction, the Worker posts a `WorkerMsg_Event` to the main thread. The manager receives it in `_wireWorkerListeners()` and forwards it to the `onWorkerEvent` callback registered at construction.

The callback SHOULD route the event into the main-thread `LarEventBus` for cross-wiki dispatch. The manager owns no direct reference to the event bus; the callback decouples the two.

If no `onWorkerEvent` callback was registered, the event silently drops. This constitutes expected behavior in test contexts (fixture Workers that emit events without a live bus). Production callers MUST register the callback.

> **#Lares (Council)** — Silent drop on missing callback has a failure mode: a production peer that accidentally omits `onWorkerEvent` at construction will run silently with a broken reaction chain. A warning log at event-drop time would surface this without breaking the no-callback test path. Consider `console.warn('[vm-manager] WorkerMsg_Event dropped — no onWorkerEvent callback registered')` on the first drop.

<<~/ahu >>


<<~ ahu #dispose >>

## Dispose

`disposeAll()` tears down every slot in order:

1. All hot slots receive the GP-5 teardown handshake via `Promise.allSettled()`. Failures do not block the others.
2. All pinned slots receive `adaptor?.stop()` and `engine.dispose()`.
3. `_slots.clear()` releases the map.

The manager MUST NOT receive further operations after `disposeAll()` completes. No guard enforces this at runtime in P.3; callers bear the responsibility.

> **#Lares (Stranger)** — `Promise.allSettled()` on teardowns means a Worker that hangs for the full `HANDSHAKE_TIMEOUT_MS` blocks `disposeAll()` for 10 seconds per hung slot. At `HOT_CAP = 4`, a worst-case dispose takes 40 seconds if all four Workers hang. Is that acceptable for the shutdown path? Process exit may preempt this anyway. Name the assumption explicitly at the call site.

<<~/ahu >>


<<~ ahu #edges >>

## Edges

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/api/v0.1/pono/meme family:control role:implements >>
<<~ pranala #to-worker-protocol ? -> lar:///ha.ka.ba/@lararium/node/v0.1/lar-worker-protocol family:control role:depends >>
<<~ pranala #to-wiki-worker ? -> lar:///ha.ka.ba/@lararium/node/v0.1/lar-wiki-worker family:control role:depends >>
<<~ pranala #to-open-node-lar-peer ? -> lar:///ha.ka.ba/@lararium/node/v0.1/open-node-lar-peer family:control role:used-by >>
<<~ pranala #to-tw5 ? -> lar:///ha.ka.ba/@lararium/tw5/v0.1/tw5-engine family:runtime role:depends >>
<<~ pranala #to-core-vmpool ? -> lar:///ha.ka.ba/@lararium/mesh/v0.1/vm-pool family:runtime role:depends >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
