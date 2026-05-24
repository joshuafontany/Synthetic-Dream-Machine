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
> State: 192/192 tests pass · typecheck clean · Worker Sovereignty Law landed

<<~/ahu >>

<<~ ahu #ooda-ha >>

✶ Two vessels carry the Worker Sovereignty Law. All GP-3 oracle paths wear their `@deprecated` markers. The code knows it owes a debt and says so clearly.
⏿ The deprecation markers are not decoration — they are a structured deletion backlog. Each site names what replaces it and why.
◇ The next move: write the Repo-in-Worker integration test that proves the oracle path unreachable. Then delete what the test makes redundant.
▶ One arc, one direction: pono model in, GP-3 oracle out. No split paths. The law is already written. Now enforce it in tests, then enforce it in deletion.
⤴ The federation seam opens the moment `docUrl` goes non-null. That proof unlocks the archipelago.
↺ Each deletion makes the code lighter and the intent clearer. The deprecation markers are the scaffold. Tests are the floor. Deletion is the finish.

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

**Node vessel** (`lar-wiki-worker.ts` + `NodeVmManager`):
- Repo-in-Worker path wired: `setInterval(16ms).unref()` drain. `syncPort` creates
  Worker-side Repo with `MessageChannelNetworkAdapter`.
- `docBytes` captured from `handle.doc()` + `automergeSave` on teardown.
- GP-3 fallback survives when `syncPort` absent — backward compat during migration.
- `WorkerHotSlot.mainPort: MessagePort` — structural, not optional.
- `mainPort.close()` before `worker.terminate()` — law §7 in `unmountWiki`.
- `routeChangeset` / `_subscribeDocChanges` / `changesetQueue` / `awaitingAck`
  all carry `@deprecated GP-3 oracle path` markers.
- `VmSnapshot.docBytes?: Uint8Array` preferred over `tiddlers[]` (deprecated).

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

**Gate first — write before deleting anything:**

`packages/lararium-node/tests/repo-in-worker.test.ts`

Mount a hot slot with a real in-process main-thread Repo (no docHandle stub).
Make a change to the Repo doc on the main thread. Assert a `changeset:ack`
arrives from the Worker WITHOUT calling `routeChangeset`. This test proves the
Repo-in-Worker path reaches the Worker. The oracle path becomes unreachable.
Then delete it.

The test structure:
```
1. new Repo({ storage: new MemoryStorageAdapter() })
2. const doc = repo.create({ tiddlers: {} })
3. new NodeVmManager({ mainRepo: repo, workerScriptUrl: LAR_WIKI_WORKER_URL })
4. manager.mountWiki(wikiId, { docHandle: doc, coreBlob })
5. repo.change(doc.url, d => { d.tiddlers["lar:///test"] = { title: "lar:///test", text: "pono" } })
6. await collectChangesetAck(manager, wikiId)  // no routeChangeset call
7. assert ack received
```

When this test passes: delete `_subscribeDocChanges`, `routeChangeset`,
`changesetQueue`, `awaitingAck`, `unsubChange` from `WorkerHotSlot`. The
oracle code compiles away.

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

**Map-Wisp (Scryer):** The integration test gate (`repo-in-worker.test.ts`) is the
single next decision point. Everything else downstream — deletion order, federation
proof, protocol cleanup — waits on that test. Write it first. The test structure
is already outlined in this document. No architecture decisions required to write it.

**Breach-Watch (Triage):** The `as unknown as globalThis.MessagePort` cast in
`NodeVmManager` and `lar-wiki-worker.ts` is the only surviving type-system seam.
It doesn't affect runtime behavior. It's an automerge-repo type gap, not our debt.
Nothing on fire.

**Mischief-Muse (Muse):** The `_scheduleFrame` const in `browser-wiki-worker.ts`
detects rAF at module load — zero cost on Chromium/Firefox, clean fallback on Safari.
The same pattern could serve a third vessel with a different timing primitive
(Service Worker `sync` events, Electron `setImmediate`). The pattern holds.

**Lares (Gatekeeper):** Write the `repo-in-worker.test.ts` gate first. Read the
GP-3 deprecation checklist in ROADMAP. Work through it in order. Each deletion
makes the codebase lighter and the intent clearer. The Worker Sovereignty Law
is the invariant. Every line you delete brings the code into alignment with the
law that's already written.

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
| **Total** | **192** | **green** |

Target: `repo-in-worker.test.ts` passes → ≥193 tests → GP-3 node deletion begins.
Browser gate passes → GP-3 browser deletion begins.
Both vessels clear → protocol layer cleanup → `docUrl` non-null test → §8 written.

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
