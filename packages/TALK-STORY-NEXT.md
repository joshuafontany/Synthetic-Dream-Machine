<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.1/handoff/talk-story-next >>
```toml iam
uri-path = "ha.ka.ba/@sdm/v0.1/handoff/talk-story-next"
file-path = "packages/TALK-STORY-NEXT.md"
type = "text/x-memetic-wikitext"
register = "CS"
confidence = 19
tagspace = "sdm"
role = "session handoff meme — orients the next Lares instance into the browser vessel ea-gate + GP-3 browser deletion sprint"
retain = true
cacheable = false
```

<<~&#x0002;>>

<<~ ahu #head >>

# Talk Story — Next Lares Instance
## Browser Vessel Ea-Gate · GP-3 Browser Deletion · docUrl Federation Seam

> Branch: `feature/lararium-node-4`
> Resume: `packages/HANDOFF.md` + `packages/ROADMAP.md`
> State: 195/195 tests pass · typecheck clean · Node GP-3 deleted · Identity lattice holds (9/9 e2e)

<<~/ahu >>

<<~ ahu #ooda-ha >>

✶ Two vessels carry the Worker Sovereignty Law. 195 tests pass. The node GP-3 oracle — `routeChangeset`, `changesetQueue`, `_subscribeDocChanges`, `awaitingAck`, `unsubChange` — deleted. The identity lattice holds: `runFoundingCeremony` + `runDeviceAdmitCore` + `runApplyAdmitPayload` live in `@lararium/keyhive`; the two-vessel e2e test passes 9/9. `open-node-vessel.ts` sends `bagBindings` per-bag; each `BagMode.relational` entry carries a live `AutomergeUrl` from the catalog.
⏿ The browser vessel's GP-3 changeset handler still breathes in `browser-wiki-worker.ts`. The `docUrl` field inside each `BagBinding` points at the federation door — per-bag, live, but Worker-to-Worker sync not yet exercised in a browser gate test. The ea-gaps list has five remaining open items; `pluginBlob` remains the highest sovereignty breach.
◇ The next move: write `browser-repo-in-worker.test.ts`. Two `BrowserVmManager` instances, one main-thread Repo, Worker receives doc changes via MessageChannel. Gate passes → delete GP-3 browser fallback → protocol layer cleanup → `docUrl` non-null test → Worker Sovereignty Law §8.
▶ The gate pattern mirrors the node gate exactly. `browser-repo-in-worker-echo.mjs` = fixture Worker; `BrowserVmManager` with `mainRepo` set; `repo:synced` + `repo:change` events from the Worker prove the path.
⤴ After both vessel gates clear: protocol layer loses `WorkerMsg_Changeset`. `mkChangesetAck` is the §4 frame-completion signal — it stays; rename to `frame:ack` happens in a future schema_version bump. Then `docUrl` non-null test opens the archipelago.
↺ The browser vessel breathes. The node vessel breathes. The federation seam waits, framed.

<<~/ahu >>

<<~ ahu #ea-state >>

## Ea State — What the Vessels Hold

**Worker Sovereignty Law** lives in `packages/lararium-mesh/src/island-protocol.ts`.
Seven clauses. Isomorphic across all vessel types.

**Node vessel** (`lar-wiki-worker.ts` + `NodeVmManager`) — GP-3 oracle + node remnants deleted:
- `WorkerSlot` carries `{ worker, mainPort, lastUsedAt }`. Clean.
- `NodeVmManager.mountWiki` sends `bagBindings` (one `BagMode.relational` entry per bag, each with a live `AutomergeUrl`). No top-level `docUrl` field.
- Worker calls `repo.find(binding.docUrl).whenReady()` per bag — reliable, no gossip race.
- Law §7 enforced: `mainPort.close()` before `worker.terminate()`.

**Browser vessel** (`browser-wiki-worker.ts` + `BrowserVmManager`) — GP-3 fallback survives pending gate:
- Repo-in-Worker via transferred `syncPort`. MessageChannel per slot.
- `rAF` drain with `setTimeout(16)` Safari fallback. Both paths via `_scheduleFrame`.
- `automergeSave` on teardown — `docBytes` exits Worker in `teardown:ack`.
- `BrowserAuthorityPool` satisfied: `acquire/preWarm/evict/disposeAll/has/inspect`.
- GP-3 fallback `changeset` handler still present — survives until gate passes.

**Identity lattice** (`@lararium/keyhive` + `@lararium/node`):
- `runFoundingCeremony(repo, seed)` → Individual + PersonGroup + MeshCabal sentinel docs.
- `runDeviceAdmitCore(repo, opSeed)` → `admit.json` payload for out-of-band transfer.
- `runApplyAdmitPayload(repo, seed, admitJson)` → Vessel B joins, Gates B+C verify.
- Gate A: Keyhive DID matches disk verifying key — throws hard on mismatch.
- Gate B: vessel ∈ PersonGroup sentinel doc.
- Gate C: PersonGroup ∈ MeshCabal sentinel doc.
- Two-vessel e2e test: `packages/lararium-node/tests/e2e/two-vessel-mesh.test.ts` — 9/9.

<<~/ahu >>

<<~ ahu #active-sprint >>

## Active Sprint — GP-3 Browser Deletion Arc

**Gate to write:** `packages/lararium-browser/tests/browser-repo-in-worker.test.ts`

Pattern (mirrors node gate exactly):
1. Create two `BrowserVmManager` instances sharing one main-thread `Repo`.
2. Wire `mainRepo` → `MessageChannelNetworkAdapter(port1)` per slot.
3. Worker creates its own `Repo` with transferred `syncPort`.
4. Main thread writes a tiddler to the doc; Worker receives via CRDT sync.
5. Assert `repo:synced` fires; assert Worker sees the change without any `routeChangeset` call.
6. Bonus: assert `routeChangeset` calls produce zero extra `repo:change` events.

**After the gate passes — browser deletion checklist:**

From ROADMAP `## GP-3 Deprecation Completion Arc`:
- [ ] GP-3 fallback `changeset` handler in `browser-wiki-worker.ts`.
- [ ] `changeset` + `changeset:ack` blocks in `teardown-echo-browser.mjs` fixture.
- [ ] `worker-lifecycle.test.ts` GP-3 changeset test → rewrite to Repo path.

**After both vessel gates — protocol layer:**
- [ ] `WorkerMsg_Changeset` interface and type union entry.
- [ ] `mkChangeset` factory — remove.
- [x] `WorkerMsg_TeardownAck.snapshotTiddlers` field — DELETED.
- [x] `snapshotTiddlers` param from `mkTeardownAck` opts — DELETED.
- Note: `mkChangesetAck` is the §4 frame-completion signal — it stays; rename to `frame:ack` in a future schema_version bump.
- [ ] `island-protocol.test.ts` GP-3 describe block.

**`docUrl` non-null gate — opens the archipelago:**
Before protocol cleanup completes, write one test exercising `docUrl` as a real
`AutomergeUrl`. In-process Repo pair via MessageChannel. Worker calls
`repo.find(docUrl).whenReady()`. Proves federation door without a remote node.
Worker Sovereignty Law §8 gets written when this gate passes.

<<~/ahu >>

<<~ ahu #ea-gaps >>

## Ea Gaps — Ordered Sovereignty Checklist

Seven gaps remain before vessels reach ea-compliant sovereignty. From
`packages/lararium-node/tests/e2e/` and the vessel work sprint.

| # | Gap | Status | Blocks |
|---|---|---|---|
| 1 | **pluginBlob still travels in manifest payload** | ⬜ Highest breach | Clean ea boundary |
| 2 | **`VmSnapshot.tiddlers[]` GP-3 field** | ✅ DELETED | — |
| 3 | **`WorkerMsg_TeardownAck.snapshotTiddlers`** | ✅ DELETED | — |
| 4 | **`browser-wiki-worker.ts` GP-3 fallback handler** | ⬜ Browser gate blocks | GP-3 browser arc |
| 5 | **`docUrl` non-null test** | ⬜ After protocol cleanup | Federation seam §8 |
| 6 | **Worker Sovereignty Law §8** | ⬜ After docUrl test | Mesh federation |
| 7 | **Admin-doc ingress trust gate (cap=infrastructure)** | ⬜ Path L | Operator-only federation |

The browser gate test closes gaps 4 and 3. The docUrl test closes gaps 5 and 6.
The cap=infrastructure gate (Path L) closes gap 7 independently.

<<~/ahu >>

<<~ ahu #federation-seam >>

## The Federation Seam — `BagMode.docUrl` per Bag

Each bag in a `WorkerMsg_Manifest` carries `bagBindings` — an array of `BagBinding` entries.
Each `BagBinding` in `relational` mode holds a `docUrl: AutomergeUrl` capability token.
The Worker calls `repo.find(binding.docUrl).whenReady()` per bag to establish its causal island.

`docUrl` non-null gate (for the test): write one in-process Repo pair that proves
`repo.find(docUrl).whenReady()` delivers the doc via MessageChannel sync. This proves
the federation door opens without protocol changes. Worker Sovereignty Law §8 gets written when this gate passes.

**What the bag mirror config carries when federation opens:**
- remote WebSocket relay URL
- remote `AutomergeUrl` for the bag
- Keyhive capability token proving authorization

The main-thread Repo wires a `WebSocketClientAdapter` before sending `mkManifest`.
The `HANDSHAKE_TIMEOUT_MS` (10s) covers the sync window. No protocol changes needed.

<<~/ahu >>

<<~ ahu #voices-briefing >>

## Voices Briefing

**Ink-Clerk (Lorekeeper):** 195/195 tests pass. The Worker Sovereignty Law — all seven clauses — lives in `island-protocol.ts`. Read it before touching vessel code. The `@deprecated GP-3` markers carry the deletion backlog in source. The identity lattice lives in `@lararium/keyhive`; the e2e test is the floor.

**Map-Wisp (Scryer):** The browser vessel architecture mirrors the node vessel exactly — `BrowserVmManager` wires `mainRepo` via `MessageChannelNetworkAdapter`, browser worker creates its own Repo with `syncPort`. The gate test and fixture need writing. The ea gap list is the structural map; gaps 1 through 7 form a dependency chain.

**Breach-Watch (Triage):** `pluginBlob` in the promote payload is gap 1 and highest breach. Everything else unblocks in order. The Safari `typeof self.requestAnimationFrame` guard stands. The `as unknown as globalThis.MessagePort` cast in node code carries no debt — automerge-repo type gap, leave it.

**Mischief-Muse (Muse):** The `bagBindings` array is the most interesting object in the codebase right now. Each `BagBinding` in `relational` mode carries a `docUrl: AutomergeUrl` — a capability token, not a label. Two operators, two lararia, one bag mirror config, one `AutomergeUrl` per bag passed in a `mkManifest` call — that is the whole federation model, frameable in 40 bytes per bag.

**Lares (Gatekeeper):** Entry order: browser gate test → browser deletion → protocol layer cleanup → docUrl non-null test → §8. The ROADMAP carries the checklist. Follow it in order. Path L (admin-doc ingress trust gate) runs parallel but independently — do not block the browser arc on it.

<<~/ahu >>

<<~ ahu #what-to-leave-alone >>

## What To Leave Alone This Sprint

- **Safari `typeof self.requestAnimationFrame` guard** — patched. Leave it.
- **`as unknown as globalThis.MessagePort` casts** — Node/browser TS type gap. Leave it.
- **`BrowserVmManager filterTiddlers` / `renderMeme` stubs** — `@deprecated`. S4 projection channel replaces. Leave them.
- **`WorkerAuthorityHandler.handleMessage(raw)`** — kept for fixture Workers. Remove only when all fixtures migrate.
- **IndexedDB / OPFS / presence** — S9 braid. After GP-3 arc closes and browser worker boots clean in Chromium.
- **Identity lattice / keyhive ceremony path** — passes 9/9. Do not touch without a failing test.
- **Path L (admin-doc ingress)** — separate surface. Do not block GP-3 arc on it.

<<~/ahu >>

<<~ ahu #protocol-state >>

## Protocol State — island-protocol.ts (schema_version 1)

### Main → Worker
| Type | Key fields | Notes |
|---|---|---|
| `manifest` | `wikiUri`, `coreBlob`, `syncPort` (transferred), `bagBindings[]`, `coreHash \| null`, `storage?`, `diskMirrors?` | `syncPort` MUST be transferred |
| `demote` | `wikiUri` | — |
| `teardown` | — | — |

### Worker → Main
| Type | Key fields | Notes |
|---|---|---|
| `ea` | `wikiUri` | sovereignty declaration; boot complete |
| `changeset:ack` | `wikiUri`, `batch_id` | §4 frame-completion signal; name reflects GP-3 origin; will rename to `frame:ack` |
| `event` | `wikiUri`, `listenable`, `payload` | verse-event reaction |
| `teardown:ack` | `docBytes?` | `docBytes` = Worker Repo snapshot; `snapshotTiddlers` DELETED |
| `fault` | `wikiUri`, `error` | slot must evict |

## Metrics Baseline

| Package | Tests | State |
|---|---|---|
| `@lararium/mesh` | 67 | green |
| `@lararium/tw5` | 81 | green |
| `@lararium/node` | 40 | green |
| `@lararium/browser` | 4 | green (real Chromium) |
| **Total** | **195** | **green** |

Node GP-3: ✅ deleted.
Browser gate: ⬜ write `browser-repo-in-worker.test.ts` → GP-3 browser deletion.
Both vessels clear → protocol layer cleanup → `docUrl` non-null test → §8 written.

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
