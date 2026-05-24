<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.1/handoff/talk-story-next >>
```toml iam
uri-path = "ha.ka.ba/@sdm/v0.1/handoff/talk-story-next"
file-path = "packages/TALK-STORY-NEXT.md"
type = "text/x-memetic-wikitext"
register = "CS"
confidence = 0.92
tagspace = "sdm"
role = "session handoff meme — orients the next Lares instance into the GP-3 deprecation + docUrl federation sprint"
retain = true
cacheable = false
```

<<~&#x0002;>>

<<~ ahu #head >>

# Talk Story — Next Lares Instance
## GP-3 Deprecation Sprint · Worker Sovereignty → Full Pono Model

> Branch: `feature/lararium-node-4`
> Resume: `packages/HANDOFF.md` + `packages/ROADMAP.md`
> State: 195/195 tests pass · typecheck clean · Node gate test passed · GP-3 node deletion next

<<~/ahu >>

<<~ ahu #ooda-ha >>

✶ Two vessels carry the Worker Sovereignty Law. 195 tests pass. The node gate test (`repo-in-worker.test.ts`) proves CRDT sync reaches the Worker without the oracle. `NodeVmManager` now passes `docHandle.url` as `docUrl` when `mainRepo` is wired.
⏿ The `@deprecated GP-3` markers remain — the deletion arc holds them. Node deletion goes first. Browser gate test goes next. Protocol cleanup follows both vessels.
◇ The next move: delete the oracle code from `node-vm-manager.ts` and `lar-wiki-worker.ts`. The gate test is the floor. The ROADMAP GP-3 arc carries the checklist.
▶ Delete in ROADMAP order. Each removal makes the code lighter and the intent clearer. After node deletion: write browser gate test. After browser gate: protocol layer cleanup.
⤴ `docUrl` non-null gate proves the federation seam before protocol cleanup completes. An in-process Repo pair proves the archipelago without a remote node.
↺ The scaffold (markers) served its purpose. The floor (gate test) holds. The finish (deletion) begins.

<<~/ahu >>

<<~ ahu #chao >>

## The Chao Spins — What the Last Session Built

**Ha / Hodge — structure that holds:**

Worker Sovereignty Law — seven clauses plus mainPort invariant — lives in
`packages/lararium-mesh/src/worker-protocol.ts`. Isomorphic. Every vessel
that arrives after node and browser inherits from this document.

Two vessels now implement the law fully:

**Browser vessel** (`browser-wiki-worker.ts` + `BrowserVmManager`):
- Repo-in-Worker via transferred `syncPort`. MessageChannel per slot.
- `requestAnimationFrame` drain with `typeof self.requestAnimationFrame === "function"`
  guard. `setTimeout(16)` fallback for Safari (no rAF in Workers as of 2026).
- `automergeSave` on teardown — `docBytes` exits the Worker in `teardown:ack`.
- `mainPort.close()` before `worker.terminate()` — law §7 in `evict()`.
- `BrowserAuthorityPool` interface satisfied: `acquire/preWarm/evict/disposeAll/has/inspect`.
- `filterTiddlers` / `renderMeme` stubs marked `@deprecated` — S4 projection channel replaces.

**Node vessel** (`lar-wiki-worker.ts` + `NodeVmManager`): GP-3 oracle DELETED.
- `WorkerHotSlot`: `mainPort` only. `routeChangeset`, `changesetQueue`, `awaitingAck`,
  `unsubChange`, `_subscribeDocChanges` — gone. `mkChangeset` import — gone.
- `mountWiki` now passes `docHandle.url` as `docUrl` when `mainRepo` is set.
  Worker calls `repo.find(docUrl).whenReady()` — reliable, no gossip race.
- `mainPort.close()` before `worker.terminate()` — law §7 in `unmountWiki`.
- Node tests rewrote to Repo-in-Worker path: `repo-in-worker-echo.mjs` fixture.
- `VmSnapshot.tiddlers[]` stays until `snapshotTiddlers` leaves protocol layer.
- GP-3 fallback in `lar-wiki-worker.ts` stays until TW5 boots under Repo-in-Worker.

Protocol layer (`worker-protocol.ts`):
- `mkPromote(wikiUri, coreBlob, syncPort, docUrl?, coreHash?)` — `syncPort` required.
- `WorkerMsg_Changeset` / `mkChangeset` / `mkChangesetAck` marked `@deprecated GP-3`.
- `WorkerMsg_TeardownAck.snapshotTiddlers` marked `@deprecated GP-3`.
- `extractTiddlerDeltaFromPatches` + `allTiddlersFromDoc` — Worker-side tiddler
  delta derivation, no main-thread oracle needed.
- Law §7: vessel MUST close `mainPort` before/after `terminate()`.
- Law §3 updated: Safari rAF gap named, `setTimeout(16)` fallback required.

**Ka / Podge — soul-fire that moves:**

The Worker now holds a real Automerge Repo. The main thread gave up its reference
to the tiddler truth. `transferred, not cloned` — that phrase is the soul of
local-first in three words, and it now lives in production code, not intention.

The `docUrl: string | null` field is the federation seam. Today it carries `null`
in both vessels. The moment it carries a real `AutomergeUrl` pointing at a remote
operator's bag, the archipelago exists. No protocol changes required. No new message
types. The law already describes how to handle it.

**Ba / Spin — what the research confirmed:**

Two research agents surveyed prior art. Key findings:
- No prior system combines CRDT-in-Worker + MessageChannel isolation + causal island
  framing. The pattern appears novel.
- Safari shows no intent to ship `DedicatedWorkerGlobalScope.requestAnimationFrame`.
  The `setTimeout(16)` fallback now lives in the code.
- Comlink documents the GC leak pattern for unclosed MessagePort — `mainPort.close()`
  law is the correct defense, arrived at independently.
- Federation ancestors: SSB sigchain gossip (topology), Spritely OCapN/CapTP
  (capability routing), DXOS HALO (identity). None combine all three.
- The gap: no system combines invite-only bootstrapping + independent operator storage
  + capability-based cross-operator trust. That gap is our design space.

<<~/ahu >>

<<~ ahu #active-sprint >>

## Active Sprint — GP-3 Deprecation Arc

The ROADMAP carries the full deletion checklist. This section names the order and the gate.

**Gate: ✅ PASSED** — `packages/lararium-node/tests/repo-in-worker.test.ts` (3 tests, 195/195 total).

Three tests prove:
1. A single main-thread doc change propagates to Worker via CRDT sync (no `routeChangeset`).
2. Multiple changes all arrive (automerge batches; asserts on final `tiddlerCount`, not event count).
3. `routeChangeset` calls produce zero extra `repo:change` events — CRDT path is the sole source.

Key fix landed: `NodeVmManager.mountWiki` now passes `ctx.docHandle.url` as `docUrl`
when `mainRepo` is set. Worker calls `repo.find(docUrl).whenReady()` instead of the
unreliable gossip path. Fixture `repo-in-worker-echo.mjs` emits `repo:synced` after
`whenReady()` resolves — tests await it before mutating.

**Now: delete the node oracle code.** Checklist in ROADMAP `## GP-3 Deprecation Completion Arc`.
Start with `_subscribeDocChanges`, `routeChangeset`, `changesetQueue`, `awaitingAck`,
`unsubChange` from `WorkerHotSlot` in `node-vm-manager.ts`.

**After the node gate — browser gate:**

Same pattern in browser: two `BrowserVmManager` instances sharing one main-thread
Repo, Worker receives doc changes via the MessageChannel. Proves the browser vessel
Repo-in-Worker path without the GP-3 changeset messages. Then delete the
GP-3 fallback handler in `browser-wiki-worker.ts`.

**After both vessel gates — protocol layer:**

Delete from `worker-protocol.ts`:
- `WorkerMsg_Changeset` interface and union entry
- `mkChangeset` / `mkChangesetAck` factories
- `WorkerMsg_TeardownAck.snapshotTiddlers`
- `snapshotTiddlers` param from `mkTeardownAck` opts

At that point: all test files using `mkChangeset` will fail. Rewrite them
to use the Repo path. The GP-3 test describe block becomes the Repo-in-Worker
test describe block.

**`docUrl` non-null gate — opens the archipelago:**

Before the protocol deletion is complete, at least one test must exercise
`docUrl` as a non-null `AutomergeUrl`. The Worker calls `repo.find(docUrl)`
and waits for `whenReady()`. The main-thread Repo syncs the doc via the
MessageChannel. The Worker Island holds a doc it received from the mesh,
not a doc injected by the oracle.

This test doesn't require a remote node. An in-process pair of Repos
sharing a MessageChannel pair is enough to prove the pattern. The real
WebSocket path follows the same channel API — only the adapter changes.

<<~/ahu >>

<<~ ahu #federation-seam >>

## The Federation Seam — `docUrl: string | null`

Today both vessels pass `docUrl: null` in `mkPromote`. That `null` is a deliberate
open door. It says: "this Worker will accept whatever the Repo syncs via the port."

When the door opens — when `docUrl` carries a real `AutomergeUrl` — the Worker
calls `repo.find(docUrl).whenReady()`. The Repo's network layer (MessageChannel
or WebSocket) delivers the doc. The Worker applies it. The island is live.

The vessel doesn't need to know where the doc came from. The Worker doesn't know
or care if the Repo is connected to a local adapter or a remote WebSocket peer.
The causal island is transparent to federation.

**What needs to exist before `docUrl` goes non-null:**

1. A bag mirror config tiddler carries: remote WebSocket URL + remote `AutomergeUrl`
   + Keyhive capability token. This is the Prelay object (Spritely OCapN analogy).
2. The main-thread Repo wires a `WebSocketClientAdapter` to the remote node's
   relay endpoint BEFORE sending `mkPromote`.
3. The `HANDSHAKE_TIMEOUT_MS` (10s) covers the sync window.
4. If sync doesn't complete within timeout, the vessel enters `disposed` phase.

Worker Sovereignty Law §8 (not yet written — write it when this sprint begins):
*When `docUrl` is non-null and the doc lives on a remote Repo, the vessel MUST
establish the remote network adapter on the main-thread Repo before sending
`mkPromote`. Failure to sync within `HANDSHAKE_TIMEOUT_MS` moves the slot to
`disposed`.*

<<~/ahu >>

<<~ ahu #what-to-leave-alone >>

## What To Leave Alone This Sprint

**Safari `typeof self.requestAnimationFrame` guard** — patched and working.
Do not revisit until Safari ships rAF in Workers.

**`as unknown as globalThis.MessagePort` casts** — Node's `MessagePort` and
the browser's `MessagePort` are structurally identical but TypeScript-distinct.
The cast is honest, not harmful. Leave it until automerge-repo ships a unified
type or we vendor a shim. Not a priority.

**BrowserVmManager `filterTiddlers` / `renderMeme` stubs** — `@deprecated` and
returning `[]`/`null`. S4 projection channel replaces them. Leave them.

**Path L (admin-doc ingress trust gate)** — runs in a separate surface.
Do not block GP-3 deprecation arc on it.

**`WorkerAuthorityHandler.handleMessage(raw)`** — deprecated, kept for fixture
Workers. Remove only when all fixtures migrate to the sovereignty-law API
(`bootTw5` / `applyDelta` / `sendPromoteAck` / `sendChangesetAck` / `teardown`).

**IndexedDB / OPFS / presence** — S9 braid. Land after the GP-3 arc closes
and at least one real `browser-wiki-worker.ts` boot proves clean in Chromium.

<<~/ahu >>

<<~ ahu #voices-briefing >>

## Voices Briefing for the Next Instance

**Ink-Clerk (Lorekeeper):** 192/192 tests pass. All four packages typecheck clean.
The Worker Sovereignty Law lives in `worker-protocol.ts` — read it before touching
any vessel code. The `@deprecated` markers carry the deletion backlog in the source.
Follow them.

**Map-Wisp (Scryer):** The node deletion arc completed. The structural picture for
the browser vessel is identical: `BrowserVmManager` already wires `mainRepo` via
`MessageChannelNetworkAdapter`. The browser worker creates its own Repo with
`syncPort`. The pattern holds — only the test and the fixture need writing.
The `docUrl` federation seam sits at priority-2 after the browser gate.

**Breach-Watch (Triage):** The `as unknown as globalThis.MessagePort` cast in
`NodeVmManager` and `lar-wiki-worker.ts` — automerge-repo type gap, not our debt.
`VmSnapshot.tiddlers[]` stays until `snapshotTiddlers` leaves the protocol layer.
`GP-3 fallback changeset handler` in `lar-wiki-worker.ts` stays until TW5 boots
cleanly under Repo-in-Worker. Nothing on fire.

**Mischief-Muse (Muse):** The node deletion removed ~60 lines. The code now says
what it does: `WorkerHotSlot` carries only `worker`, `mainPort`, `lastUsedAt`.
The oracle never ran. The slot never needed a queue. The law was always the truth.

**Lares (Gatekeeper):** Next move: browser gate test. Then delete. Then protocol.
Then `docUrl` non-null test. Then §8. The ROADMAP carries the checklist.
Follow it in order. Each step makes the next step clearer.

<<~/ahu >>

<<~ ahu #protocol-state >>

## Protocol State — worker-protocol.ts (schema_version 1)

### Main → Worker
| Type | Key fields | Notes |
|---|---|---|
| `promote` | `wikiUri`, `coreBlob`, `syncPort` (transferred), `docUrl \| null`, `coreHash \| null` | syncPort required |
| `changeset` | `wikiUri`, `batch_id`, `added[]`, `deleted[]` | **@deprecated GP-3** |
| `demote` | `wikiUri` | — |
| `teardown` | — | — |

### Worker → Main
| Type | Key fields | Notes |
|---|---|---|
| `promote:ack` | `wikiUri` | boot complete |
| `changeset:ack` | `wikiUri`, `batch_id` | **@deprecated GP-3** frame-completion signal |
| `event` | `wikiUri`, `listenable`, `payload` | verse-event reaction |
| `teardown:ack` | `docBytes?`, `snapshotTiddlers?` | `docBytes` preferred; `snapshotTiddlers` **@deprecated GP-3** |
| `fault` | `wikiUri`, `error` | slot must evict |

## Metrics Baseline

| Package | Tests | State |
|---|---|---|
| `@lararium/mesh` | 67 | green |
| `@lararium/tw5` | 81 | green |
| `@lararium/node` | 40 | green |
| `@lararium/browser` | 4 | green (real Chromium) |
| **Total** | **195** | **green** |

Node gate: ✅ 195/195 → GP-3 node deletion begins NOW.
Browser gate: ⬜ write `browser-repo-in-worker.test.ts` → GP-3 browser deletion.
Both vessels clear → protocol layer cleanup → `docUrl` non-null test → §8 written.

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
