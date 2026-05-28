# Lares Handoff — Active Work Only

> Updated: 2026-05-27 (turn 24)
> Branch: `feature/lararium-node-4`
> Last sprint archive: `wikis/lares-history/last-sprint/`

## Bootstrap Paste

```text
Resume from packages/HANDOFF.md and packages/ROADMAP.md.

Current baseline: quine/genesis, TW5 content-addressed core boot, admin VM,
command-tiddler CLI, Keyhive concap, bag residency, wiki composition,
plugin-tiddler boot, sigil cascade architecture, save-side split, recursive
child co-promotion, Node VM / island-thread lift, full sigils-as-wikitext
sprint (T-1 wikirule collapse, URI fragment resolution, ahu.ts retirement,
deserializer root-iam fix, build pipeline clear-before-rebuild),
SharktoothSigil grammar inversion + aka/kahea mode= collapse sprint,
lar:-URI namespace + mode= retirement + English alias sigil sprint,
concurrency sigil cluster + grammar self-hosting + kumu-device UEFN alignment
sprint, AND the kau.ts → TW5-native wikitext migration (kau.ts + render-modes.ts
deleted; zero JS sigil widgets remain), AND the Verse ontology + yin-collapse
architecture sprint (six-operator ontology complete; TW5 wiki declared primary
reactive engine; one graph not two), AND the grammar self-hosting completion
sprint (meme-grammar.ts deleted; GRAMMAR_TAG exported from @lararium/mesh), AND
the Verse polychronous CRDT mesh sprint (meme-sync-adaptor.ts deleted;
IslandAdaptor + IslandAccumulator replace it; $tw.syncer provably dead), AND the
vessel ontology scrub + S5 quine closure sprint (command→job + peer→vessel rename;
lar-vessel.md + open-vessel.md scrubbed; /api/health HTTP endpoint + CORS
deleted; `pnpm test:quine` passes — 65 SharktoothSigil grammar tiddlers in genesis;
39/39 tests), AND the lararium-browser S2 + YIN bag-URI ontology sprint
(island-protocol.ts moved node→mesh; IslandKernel extracted isomorphic;
@lararium/browser scaffolded S0–S3; bags/ URI schema unified to @bag/v0.1/lane/rest;
188/188 tests), AND the Island Sovereignty Law + GP-3 deprecation sprint
(Isomorphic law 7+1 clauses in island-protocol.ts; BrowserVesselIslandPool +
browser-wiki-worker.ts fully implemented; VesselIslandPool GP-3 oracle deleted —
routeChangeset, changesetQueue, _subscribeDocChanges, awaitingAck, unsubChange
gone; 195/195 tests), AND the identity lattice + keyhive founding ceremony sprint
(runFoundingCeremony, runDeviceAdmitCore, runApplyAdmitPayload extracted isomorphic
into @lararium/keyhive; three-gate lattice A/B/C passes; two-vessel e2e test 9/9;
lares device-admit and invite CLI commands wired), AND the Island Sovereignty Sprints
1-3 (BagBinding protocol, multi-doc islands, IslandStorageConfig; 48/48 tests), AND
the OTP ontology + dead-weight + gen_island rename sprint (BagMode cold deleted;
WorkerBehavior→IslandBehavior; islandContext→IslandContext; onReady→onEa;
onMessage→onSignal; onTeardown→onDemote; admin:relay-job→admin:delegate-job;
configureRelay→configureDelegation; IslandKernel→IslandKernel;
JobHandlerRegistry→VerbTable; JobHandler→VerbReactor; create*Handler→make*Reactor;
NodeVmManager→VesselIslandPool; BrowserVmManager→BrowserVesselIslandPool;
dead behaviors WikiBehavior/makeWikiDiskBehavior/makeWikiDispatchBehavior deleted;
handleMessage() deleted from IslandKernel; GP-3 changeset branches deleted from
fixtures; 55/55 tests), AND the GP-3 browser arc + coherence YIN sprint
(browser-repo-in-island.test.ts 2 tests pass — cold-boot + docUrl non-null
federation seam; stale mode:"cold" BagBinding tests removed; teardown fixture
names cleaned; island-protocol.md meme updated with correct source-file +
full contract; Island Sovereignty Law §8 written; ROADMAP browser gate marked
✅ Done; 194/194 tests), AND the pono federation pattern sprint
(coreBlob: Uint8Array removed from IslandMsg_Manifest entirely; mkManifest new
signature (wikiUri, syncPort, coreHash?, opts?) — no blob bytes in manifest;
boot order inverted in both sovereign island models: Repo first,
handle.whenReady() for each binding, read blobs[ENGINE_CORE_ID] from @lararium
doc, mkFault + return if absent, bootTw5 last from CRDT bytes; laraiumDocUrl
option added to VesselIslandPool — @lararium binding prepended to bagBindings
per wiki island; BrowserWikiMountParams.coreHash: string | null (no blob bytes);
AdminVmOptions.coreBlob → coreHash; N×island federation now O(CRDT-sync) not
O(N×blob); 195/195 tests), AND the YIN ontology + typo closure sprint
(runSovereignisland → runSovereignWorker in lar-wiki-island.ts + lar-admin-island.ts +
browser-wiki-worker.ts; vessel-island-pool.ts `worker: island` → `worker: Worker`;
node-vm-manager.test.ts → vessel-island-pool.test.ts; vm-manager-echo.mjs →
vm-pool-echo.mjs + old deleted; blob-sovereignty.test.ts §6 gate added;
FIXTURE_LARARIUM_URL sentinel + real laraiumHandle in test fixtures; 195/195 tests),
AND the §8 archipelago gate + test hardening sprint
(federation-seam.test.ts — pure Repo-level §8 gate, bidirectional, no pool machinery;
island-protocol.ts §8 clause updated to cite node + browser gate proofs;
blob-sovereignty.test.ts silent returns → describe.skipIf with named skip reason;
repo-in-island.test.ts writable-binding selector comment added; 197/197 tests)
are treated as landed unless tests prove drift.

Next work, in order:
1. S9 S4 / lararium-browser: real boot path — IndexedDB storage adapter,
   WebCrypto keypair, founding ceremony via @lararium/keyhive in browser vessel,
   presence via broadcast(). Charter: bags/@lararium/v0.1/browser/pono-charter.md (exists).
2. Path L / S7.4: admin-doc ingress trust gate via Keyhive cap=infrastructure.
3. Path M: finish shared job/receipt contracts; ceremony meaning stays in TW5 VM pool.
4. Path K / F-arc: IslandAdaptor.saveTiddler debounce + projection auto-truncate.

Path G.SharktoothSigil: COMPLETE. 65 sigil tiddlers; zero active [[sigils]] TOML blocks.
Remaining TOML in memetic-wikitext.tid: documentation data tables only (Path O).

Rules: TW5 VM primacy; vessel = lararium identity+runtime unit (not "peer");
bag = Automerge-doc = sync-boundary; ea = sovereignty breath (not "heartbeat");
no HTTP/RPC coordination surface; explicit operator promotion for canon.
Web3 only — no web2 models/code/flows in Lares stack.
gen_island pattern: runSovereignWorker = kernel; IslandBehavior = callback module;
onEa/onSignal/onDemote = OTP init/1 / handle_info/2 / terminate/2.
VesselIslandPool: vessel invites islands (mounts), does not supervise them.
```

## What Changed This Turn (2026-05-27 turn 25)

### §8 Archipelago Gate + Test Hardening Sprint

**`federation-seam.test.ts` — §8 pure Repo gate:**
- Two in-process Repos joined by one `MessageChannel` via `MessageChannelNetworkAdapter`.
- Test 1: vessel doc change propagates to island via CRDT — no manifest payload, no `routeChangeset`.
- Test 2: island doc change propagates back to vessel — proves the channel is bidirectional.
- This is the Repo-level primitive that `VesselIslandPool.mountWiki()` and `BrowserVesselIslandPool.mountWiki()` both rest on.
- API note: `repo.find()` returns `Promise<DocHandle>`; `await repo.find(url)` then `handle.whenReady()`.

**`island-protocol.ts` §8 clause updated:**
- Gate proof line now cites both: `federation-seam.test.ts` (node, pure Repo) + `browser-repo-in-island.test.ts` test 2 (browser pool).

**`blob-sovereignty.test.ts` hardened:**
- Replaced two silent mid-test `return` guards with `describe.skipIf(skipReason)`.
- A skip in CI is visible; a silent return is not. Skip reason string names the missing artifact and the command to build it.

**`repo-in-island.test.ts`:**
- Added one-line comment at the `mountWiki` call site explaining the `b.writable` selector in `repo-in-island-echo.mjs`.

**`TALK-STORY-NEXT.md`:**
- §8 row updated to ✅ with both gate proof citations.
- Active objective advanced to S9 browser ea-path.
- Pre-flight audit of `open-node-vessel.ts` named as S9 gate-zero.
- File map rewritten for S9.

**Files changed:** `federation-seam.test.ts` (new), `blob-sovereignty.test.ts`, `repo-in-island.test.ts`, `island-protocol.ts`, `TALK-STORY-NEXT.md`, `HANDOFF.md`.

**Metrics:** 197/197 tests pass (mesh 71, tw5 69, node 52, browser 5). All packages typecheck clean.

---

## What Changed This Turn (2026-05-27 turn 24)

### YIN ontology + typo closure sprint

**Pre-existing import typos fixed (three entry files):**
- `lar-wiki-island.ts` + `lar-admin-island.ts`: `import { runSovereignisland }` → `import { runSovereignWorker }`
- `browser-wiki-worker.ts`: `import { runBrowserSovereignisland }` → `import { runBrowserSovereignWorker }`

**Pre-existing runtime typo fixed:**
- `vessel-island-pool.ts` line ~469: `worker: island` → `worker: Worker` (search-replace casualty from OTP sprint)

**Ontology rename — no "manager" language:**
- `tests/node-vm-manager.test.ts` → `tests/vessel-island-pool.test.ts`
- `tests/fixtures/vm-manager-echo.mjs` → `tests/fixtures/vm-pool-echo.mjs` (old file deleted)

**Test additions and fixture fixes:**
- `blob-sovereignty.test.ts` — §6 pono federation gate: island reads `blobs[ENGINE_CORE_ID]` from `@lararium` CRDT doc, boots TW5, declares ea. Uses real `dist/src/lar-wiki-island.js` + genesis artifact.
- `vessel-island-pool.test.ts`: `FIXTURE_LARARIUM_URL = "automerge:fixture-lararium-url"` sentinel — echo fixture tests skip `repo.find()` on the `@lararium` binding; sentinel prevents `InvalidAutomergeUrl`.
- `repo-in-island.test.ts`: each test creates a real `laraiumHandle` doc for the REPO_FIXTURE path.
- `repo-in-island-echo.mjs`: binding resolution uses `b.writable` to select the wiki doc — `@lararium` read-only binding is now first in the array and must be skipped.

**Files changed:** `browser-wiki-worker.ts`, `lar-wiki-island.ts`, `lar-admin-island.ts`, `vessel-island-pool.ts` (4 src) + `vessel-island-pool.test.ts`, `blob-sovereignty.test.ts`, `repo-in-island.test.ts`, `repo-in-island-echo.mjs` (3 tests + 1 fixture, 1 rename, 1 delete).

**Metrics:** 195/195 tests pass (mesh 71, tw5 69, node 50, browser 5). All packages typecheck clean.

---

## What Changed This Turn (2026-05-27 turn 23)

### Pono federation pattern sprint (YIN — coreBlob eviction)

**Anti-pattern removed:** `coreBlob: Uint8Array` was carried in `IslandMsg_Manifest`,
forcing N×blob-size data copies for N simultaneous islands. Bytes already live in
`LarDoc.blobs[ENGINE_CORE_ID]` (Automerge CRDT, federates automatically). Manifest
now carries `coreHash: string | null` only — integrity intent vector, not bytes.

**`mkManifest` signature change:**
- Old: `mkManifest(wikiUri, coreBlob, syncPort, coreHash?, opts?)`
- New: `mkManifest(wikiUri, syncPort, coreHash?, opts?)`

**Boot order inverted** in both sovereign island models (node + browser):
1. `new Repo(syncPort)` — first, before anything else
2. Iterate bindings, `handle.whenReady()` for each
3. Read `blobs[ENGINE_CORE_ID]` from the `@lararium` doc handle
4. If bytes absent → `_post(mkFault(...))` and return — correct production behavior
5. `bootTw5(coreBytes)` — last, bytes from CRDT not manifest

**`laraiumDocUrl` option** added to `VesselIslandPool`. `open-node-vessel.ts`
passes `islandHandle.url` as `laraiumDocUrl`; pool prepends a read-only `@lararium`
binding to each wiki island's bagBindings so the engine bytes are reachable.

**Files changed:** `island-protocol.ts`, `browser-authority.ts`, `vessel-island-pool.ts`,
`open-admin-vm.ts`, `open-node-vessel.ts`, `sovereign-island-model.ts`,
`browser-sovereign-island-model.ts`, `browser-vessel-island-pool.ts` (8 src) +
`island-protocol.test.ts`, `node-vm-manager.test.ts`, `repo-in-island.test.ts`,
`worker-lifecycle.test.ts`, `browser-repo-in-island.test.ts`,
`teardown-echo-browser.mjs` (5 tests + 1 fixture).

**Metrics:** 194/194 tests pass. All packages typecheck clean.

**Architectural invariant:** Two vessels federating `@lararium` automatically share
the TW5 engine via Automerge CRDT. No manifest byte transfer. No O(N×blob) cost.

---

## What Changed This Turn (2026-05-27 turn 22)

### GP-3 browser arc + coherence YIN sprint

**GP-3 browser gate: confirmed closed.** `browser-repo-in-island.test.ts` (2 tests)
was already passing: cold-boot path acquires without docUrl; docUrl non-null path
resolves via `repo.find(docUrl)` and proves federation seam open. Browser
`browser-wiki-worker.ts` carried no GP-3 fallback — built clean from S19.

**Island Sovereignty Law §8 written** in `island-protocol.ts` header. §8 covers
both sides of the federation seam: vessel wires `MessageChannelNetworkAdapter`
before manifesting; island calls `repo.find(docUrl).whenReady()` before `ea`.
Gate proof cited: `browser-repo-in-island.test.ts` test 2.

**Stale test cleanup:**
- `island-protocol.test.ts`: removed `"cold BagBinding satisfies BagMode cold"` test
  (BagMode cold deleted in OTP sprint). Updated `"mkManifest carries bagBindings"`
  test to use two `relational` bindings. 49 node tests (was 50 — one stale deleted).

**Fixture rename:** Both teardown fixtures had `"changeset-subscription"` mock
subscription name reflecting the GP-3 oracle subscription. Renamed to `"doc-handle"`
to reflect the Repo-in-island doc handle being simulated.

**island-protocol.md meme written:** `island-protocol.md` renamed to `island-protocol.md`
(matching the source rename). `source-file` set to `island-protocol.ts`. Full `#contract`
written: Island Sovereignty Law (8 clauses), GP grade table, all current message types,
all factories. `ea.md` pranala anchors + loulou references updated to new URI.

**ROADMAP:** Browser gate row marked ✅ Done. GP-3 Deprecation Completion Arc
section updated — all items cleared; `frame:ack → frame:ack` rename deferred
to future schema_version bump.

**Coherence sweep (Explore agent):**
- island-adaptor meme: MATCH (I-1 through I-8 all hold)
- island-accumulator meme: MATCH (A-1 through A-5 all hold)
- island-protocol meme: WAS STALE → now fixed
- voices meme: MATCH (mask layer spec accurate; correctly notes non-integration)

**Metrics:** 194/194 tests pass (mesh 71, tw5 69, node 49, browser 5). All packages
typecheck clean.

---

## What Changed This Turn (2026-05-27 turn 21)

### OTP ontology + gen_island rename + dead-weight cut sprint

**BagMode cold deleted.** `{ mode: "cold" }` removed from `BagMode` union in
`island-protocol.ts`. Only `{ mode: "relational"; docUrl: string }` remains.
Two construction sites in `browser-vessel-island-pool.ts` and `vessel-island-pool.ts`
updated to use relational with empty `docUrl` fallback.

**IslandBehavior / IslandContext rename sweep** (`sovereign-worker-model.ts`,
`browser-sovereign-worker-model.ts`, `browser-wiki-worker.ts`, `worker-behaviors.ts`):
- `WorkerBehavior` → `IslandBehavior`, `WorkerContext` → `IslandContext`
- `onReady` → `onEa`, `onMessage` → `onSignal`, `onTeardown` → `onDemote`
- `gen_server` comments → `gen_island`
- Cold gossip listener block deleted from both sovereign-worker-model files

**admin:delegate-job wire rename** (`island-protocol.ts`, `open-admin-vm.ts`,
`open-node-vessel.ts`, `worker-behaviors.ts`):
- `AdminMsg_RelayJob` → `AdminMsg_DelegateJob`
- `mkAdminRelayJob` → `mkAdminDelegateJob`
- `"admin:relay-job"` → `"admin:delegate-job"`
- `configureRelay` → `configureDelegation`
- `_relayRegistry` → `_delegationRegistry`
- `_relayToMain` → `_delegateToMain`
- `_pendingRelays` → `_pendingDelegations`

**IslandKernel** (`@lararium/tw5`): `worker-authority-handler.ts` → `island-kernel.ts`;
class `IslandKernel` → `IslandKernel`; `handleMessage()` deleted (zero callers
confirmed; fixtures use raw `parentPort.on("message")`); `mkTeardownAck` import dropped.

**VerbTable / VerbReactor** rename sweep (14 files in lararium-node):
- `JobHandlerRegistry` → `VerbTable`
- `JobHandler` → `VerbReactor`
- All `create*Handler` → `make*Reactor` (makePromoteReactor, makeWhereReactor, etc.)

**Dead behaviors deleted** from `worker-behaviors.ts`:
- `WikiBehavior` null object
- `makeWikiDiskBehavior`
- `makeWikiDispatchBehavior`
- `makeWikiPrimaryBehavior` remains as sole factory

**Fixture GP-3 branches deleted:**
- `vm-manager-echo.mjs`: changeset branch, snapshotTiddlers seeding, tiddlers Map
- `teardown-echo.mjs`: changeset branch

**VesselIslandPool rename:**
- `node-vm-manager.ts` → `vessel-island-pool.ts`; `NodeVmManager` → `VesselIslandPool`
- `browser-vm-manager.ts` → `browser-vessel-island-pool.ts`; `BrowserVmManager` → `BrowserVesselIslandPool`
- All import sites, test files, and index exports updated

**Metrics:** 55/55 tests pass (node 50, browser 5). All packages typecheck clean.

---

## What Changed This Turn (2026-05-24 turn 20)

### Island Sovereignty Law — Isomorphic Vessel Model + GP-3 Deprecation Sprint

**Island Sovereignty Law enacted.** Seven clauses (plus §7 mainPort, §3 Safari
note) now live in `packages/lararium-mesh/src/island-protocol.ts` as the
canonical doctrine comment. Isomorphic across all vessel types — node, browser,
and any future third vessel.

**`island-protocol.ts` protocol evolution (mesh):**
- `IslandMsg_Manifest` reshaped: `snapshotTiddlers` removed; `syncPort: MessagePort`
  (transferred, required), `docUrl: string | null`, `coreHash: string | null` added.
- `mkPromote(wikiUri, coreBlob, syncPort, docUrl?, coreHash?)` — new signature.
  `syncPort` is the third positional arg; not optional.
- `IslandMsg_TeardownAck`: `docBytes?: Uint8Array` added (preferred); `snapshotTiddlers`
  marked `removed GP-3`.
- `mkTeardownAck(opts)` factory: opts-object form, `exactOptionalPropertyTypes`-safe.
- NEW `extractTiddlerDeltaFromPatches(doc, patches)` — island-side tiddler delta from
  Automerge patches. Removes the oracle-on-vessel need.
- NEW `allTiddlersFromDoc(doc)` — materialize all tiddlers for initial TW5 load.
- `IslandMsg_FrameAck` + `mkFrame` + `mkFrameAck` marked `removed GP-3`.
- Island Sovereignty Law §7: vessel MUST close `mainPort` before/after `terminate()`.
  Structural invariant, not convention. Both vessels enforce it.
- Island Sovereignty Law §3: Safari rAF gap named — `setTimeout(16)` fallback required.

**`browser-wiki-worker.ts` — fully implemented (browser vessel):**
- Repo-in-island via transferred `syncPort`.
- `requestAnimationFrame` drain with `typeof self.requestAnimationFrame === "function"`
  guard + `setTimeout(16)` Safari fallback. Both paths map to `_scheduleFrame`.
- `automergeSave` on teardown — `docBytes` in `teardown:ack` preferred over tiddler list.
- GP-3 fallback: `changeset` messages push to pending arrays (deprecated path survives).

**`BrowserVmManager` — new file (browser vessel):**
- `MessageChannel` per slot: main keeps `port1`, island receives `port2` (syncPort).
- Optional `mainRepo?: Repo` — when provided, wires `MessageChannelNetworkAdapter(port1)`.
- `mountWiki/unmountWiki/disposeAll` — Node-parallel API; no lease/receipt/capability layer.
- `mainPort.close()` before `worker.terminate()` in `unmountWiki()` — law §7 compliant.

**`lar-wiki-worker.ts` — Repo-in-island path wired (node vessel):**
- `setInterval(16ms).unref()` drain loop — does not hold process alive.
- `syncPort` presence gated: if provided, boots Repo-in-island + subscribes handle.
  If absent, GP-3 deprecated changeset path remains active for backward compat.
- `automergeSave` on teardown — `docBytes` captured when `_docHandle` non-null.

**`NodeVmManager` — GP-3 deprecation markers + MessageChannel wiring:**
- `WorkerHotSlot`: `mainPort: MessagePort` added (structural). `unsubChange`,
  `changesetQueue`, `awaitingAck` marked `removed GP-3 oracle path`.
- `NodeVmManagerOptions`: `mainRepo?: Repo` added — optional CRDT sync wiring.
- `mountWiki`: creates `MessageChannel`; optionally wires `mainPort` →
  `MessageChannelNetworkAdapter` on mainRepo; passes `syncPort` in `mkPromote`;
  transfers `[syncPort]` in `postMessage`.
- `unmountWiki`: closes `mainPort`, captures `docBytes` from `teardown:ack` into
  `VmSnapshot.docBytes` (preferred). Tiddler count log updated to show docBytes size.
- `routeChangeset`: marked `removed GP-3 oracle path`.
- `_subscribeDocChanges`: marked `removed GP-3 oracle path`.
- `VmSnapshot.docBytes?: Uint8Array` added; `tiddlers` marked `removed GP-3`.
- `_sendAndAwait` transferList typed `(ArrayBuffer | MessagePort)[]` — avoids stale
  `TransferListItem` deprecated alias from `@types/node`.

**`IslandKernel` refactored (`@lararium/tw5`):**
- New sovereignty-law API: `bootTw5(wikiUri, coreBlob)`, `applyDelta(wikiUri, added, deleted)`,
  `sendEa(wikiUri)`, `sendFrameAck(wikiUri, frameId)`, `teardown()`.
- `handleMessage(raw)` marked `superseded` — kept for GP-3 fixture islands.
- `TeardownResult` interface exported.

**Tests updated:**
- `island-protocol.test.ts` (node): `mkPromote` calls updated to supply `MessagePort`
  from `new MessageChannel()`.
- `worker-lifecycle.test.ts` (browser): same `mkPromote` signature fix.
- `node-vm-manager.test.ts`: `re-mountWiki` test reframed — asserts cold snapshot
  captures tiddlers (GP-3 teardown path) and re-mounted island is live + responsive.
  Removes `totalTiddlers >= 1` assertion (warm-start now requires Repo sync, not
  tiddler injection in promote).

**Safari rAF gap patched:**
- `browser-wiki-worker.ts`: `_scheduleFrame` const detects `typeof self.requestAnimationFrame`
  at module load; falls back to `setTimeout(cb, 16)`. Zero cost when rAF is available.

**Research findings (two agents):**
- Automerge `MessageChannelNetworkAdapter` is the official Repo-in-island adapter — on golden path.
- Safari shows no intent to ship `DedicatedWorkerGlobalScope.requestAnimationFrame` (as of 2026).
- Comlink documents the GC leak pattern for MessagePort — our `mainPort.close()` law is correct defense.
- No prior art combines CRDT-in-island + MessageChannel isolation + causal island framing cohesively. Pattern appears novel.
- Closest federation ancestors: SSB sigchain gossip (topology), Spritely OCapN/CapTP (capability routing), DXOS HALO (identity). None combine all three.
- Gap confirmed: no system combines invite-only bootstrapping + independent operator storage + capability-based cross-operator trust.

**Metrics:** 192/192 tests pass (mesh 67, tw5 81, node 40, browser 4). All packages typecheck clean.

**`docUrl` federation seam:** remains `null` in both vessels. When non-null, a island
calling `repo.find(docUrl).whenReady()` will sync a remote bag without any protocol change.
The archipelago forms the moment a bag mirror config carries a remote AutomergeUrl.

---

## What Changed This Turn (2026-05-22 turn 19)

### lararium-browser S2 + YIN bag-URI ontology sprint

**island-protocol.ts moved node → mesh.** The shim that briefly lived in
`@lararium/node` dissolved in the same turn. Three node source files and two
test files import protocol types directly from `@lararium/mesh`.

**IslandKernel** extracted from `lar-wiki-worker.ts` into
`@lararium/tw5/src/worker-authority-handler.ts`. Owns the isomorphic TW5 boot /
changeset-apply / teardown sequence. Node worker shrunk to a 10-line I/O binding.
Browser worker (`browser-wiki-worker.ts`) carries the same shape with
`self.addEventListener` instead of `parentPort.on`.

**`@lararium/browser` scaffolded:** `package.json`, three tsconfigs,
`vitest.config.ts`, `src/index.ts` stub, `src/browser-wiki-worker.ts`. No exports
yet — nothing re-exported until a consumer arrives. passWithNoTests.

**bags/ URI schema unified.** All `bags/` paths and `iam` `uri-path`/`file-path`
fields now follow the canonical form `@bag/v0.1/{lane}/{rest}`. Old form
`@bag/{lane}/v0.1/{rest}` — the "version in the wrong place" — purged everywhere.
500+ file moves + iam field rewrites across `@lares`, `@lararium`, `@ftls`,
`@elyncia`. Zero old-form strings survive in bags, packages, or scripts.

**`island-protocol.md` meme** moved from node lane to mesh lane, `source-file`
corrected to `packages/lararium-mesh/src/island-protocol.ts`.

**Stale tsc artifacts** (`*.js`, `*.d.ts`, `*.js.map`, `*.d.ts.map`) purged from
`packages/lararium-mesh/src/`. Build confirmed to emit only to `dist/`; no
prebuild sweep script needed. `tools/clean-src-artifacts.mjs` deleted.

**Metrics:** 188/188 tests pass (mesh 67, tw5 81, node 40, browser
0+passWithNoTests). All four packages typecheck clean.

---

## What Changed This Turn (2026-05-21 turn 18)

### S5 Quine Closed — Genesis Boot Smoke: PASS

`pnpm --filter @lararium/node test:quine` now passes. The genesis artifact carries
a bootable TW5 core + compiled plugin + 65 self-hosted SharktoothSigil grammar tiddlers.

**Bugs fixed:**
- `build-genesis-island.ts` smoke test: `.tiddler?.cid` → `.fields?.cid` (wrong tiddler record path)
- `scripts/test-quine.ts`: same `.tiddler?.sha256` → `.fields?.cid` fix; filter changed
  from `[tag[GRAMMAR_TAG]]` to `[all[tiddlers+shadows]tag[GRAMMAR_TAG]]` — plugin
  contents load as TW5 shadow tiddlers, not regular tiddlers; the plain `[tag[...]]`
  filter skips shadows entirely.
- `package.json` (`@lararium/node`): `"test:quine": "tsx scripts/test-quine.ts"` added.

**Genesis artifact:** 4 blobs, 14 tiddlers, 511 KB, CIDv1 self-ref tiddler wired.

### Web2 Smell Deleted — `/api/health` HTTP endpoint

`packages/lararium-node/src/main.ts`: deleted `makeHandler`, CORS header
(`Access-Control-Allow-Origin: *`), and the `state` phase object. The HTTP server
now carries no handler — it exists only as a socket owner for WebSocket upgrades.
Log line changed from `HTTP+WS server` to `WS relay`. Connect log changed from
`http://localhost:PORT/#...` to `ws://localhost:PORT/ws#...`.

### Vessel Ontology Scrub — bags docs

`bags/@lararium/v0.1/mesh/lar-vessel.md`:
- TOML `role` field updated to "vessel"
- `# Lar Peer` → `# Lar Vessel`
- New `## Vocabulary` section: Automerge-layer "peer" vs lararium-layer "vessel" defined in two sentences
- LP-1 renamed "Vessel before server"; body: "A Lararium vessel models itself as a participant in a causal mesh — not a server that clients connect to."
- LP-2 through LP-5, shape section, ceremony section: "peer" → "vessel" throughout

`bags/@lararium/v0.1/mesh/open-vessel.md`:
- `# Operator Peer` → `# Open Vessel`
- "operator peer" → "open vessel" / "vessel" throughout contract, invariants, flow

**Metrics:** 39/39 tests pass; all packages typecheck clean.

---

## What Changed This Turn (2026-05-20 turn 17)

### LarTiddlerRecord Host-Model Rewrite — explicit `fields` + `meta`

**Rule enacted:** stored Lararium records are now explicitly two-lane.

- `record.fields` carries the TW5 input-field bag that projects into TW5 VMs.
- `record.meta` carries host-envelope state such as `deleted`, `authority`, `sourceUri`, `contentHash`, and `recipe`.
- `revision` deleted.
- `bag` no longer persists on each record; it now travels as write context (`put(..., { bag })`) and change/query context (`LarTiddlerChange.bag`, `listBagsHolding()`), because bag identity belongs to recipe/topology, not content.

**Why:** the old flat record shape let TW5 content fields and host metadata share one namespace, which kept web2/TW5 server residue alive (`bag`, `revision`) and left collision risk at the store boundary.

**Enacted in code:**

- `@lararium/mesh`: `LarTiddlerRecord`, `LarTiddlerMeta`, `LarWriteOptions`, `LarTiddlerChange.bag`, nested `MutableLarRecord`, `AutomergeDocStore`, `CompositeStore`, command-tiddler helpers, social-doc readers
- `@lararium/tw5`: IslandAdaptor, worker/direct VM projection, memory store, direct-record builder
- `@lararium/node`: command dispatcher, wiki handlers, epoch handlers, genesis/open-node authority seeding

**Admin/query follow-up now explicit:**

- ordinary TW5 wiki projection should keep showing `record.fields`
- admin VM capabilities can project metadata and bag/topology views intentionally
- cross-wiki and pinned/live queries should use topology APIs (`listBagsHolding`, recipe stack, change bag context), not stored per-record `bag`

**Metrics:** `pnpm --filter @lararium/mesh typecheck`, `pnpm --filter @lararium/tw5 typecheck`, and `pnpm --filter @lararium/node typecheck` all pass.

---

## What Changed This Turn (2026-05-18 turn 16)

### Path K / F-arc — IslandAdaptor Save-Path Debounce

**Spec meme:** `bags/@lares/v0.1/api/lararium/save-path.md`
Invariants SP-1 through SP-5 documented. SP-3 (draft routing) deferred pending
wiki-init flow; SP-1 (debounce) and SP-4 (ceremony routing) landed.

**SP-1 — 400 ms capture debounce in `IslandAdaptor.saveTiddler`:**
- `_debounce: Map<string, TimerHandle>` + `_pending: Map<string, PendingWrite>` added.
- Rapid saves to the same URI cancel the prior timer; only the last fields reach `_writeMeme`.
- Displaced callbacks fire immediately (`null, {}, "0"`) so callers are never left hanging.
- `stop()` cancels all pending timers; no callbacks fire after stop.
- `DEBOUNCE_MS = 400` exposed as a static constant for tests.

**New test:** `"rapid saves to the same URI coalesce — only the last write reaches the store"`
uses `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync()` across the outbound describe block.

**Metrics:** 171/171 tests pass; all packages typecheck clean.

---

## What Changed This Turn (2026-05-18 turn 15)

### $:/ Title Retirement — All Lararium-Owned Tags + Titles Move to lar: URIs

**Rule enacted:** `$:/` titles remain only for direct TW5 core/system overrides.
All Lararium-owned tags, config, and state now carry `lar:///ha.ka.ba/` URIs.

**Constant migrations (source code):**

| Old | New | File |
|---|---|---|
| `$:/tags/LaresPin` | `lar:///ha.ka.ba/tags/lares-pin` | bag-residency.ts |
| `$:/tags/LaresCommand` | `lar:///ha.ka.ba/tags/lares-command` | command-tiddler.ts |
| `$:/tags/LaresCommandEvent` | `lar:///ha.ka.ba/tags/lares-command-event` | command-tiddler.ts |
| `$:/tags/LarariumProjection` | `lar:///ha.ka.ba/tags/lararium-projection` | projection-registry.ts |
| `$:/tags/LarariumBootstrap` | `lar:///ha.ka.ba/tags/lararium-bootstrap` | init.ts |
| `$:/tags/LarariumBagMirror` | `lar:///ha.ka.ba/tags/lararium-bag-mirror` | lar-promote.ts |
| `$:/lararium/parse-warning/${slug}` | `lar:///ha.ka.ba/lararium/parse-warning/${slug}` | deserializer.ts |
| `$:/lararium/parse-warnings` | `lar:///ha.ka.ba/tags/lararium-parse-warnings` | deserializer.ts |
| `$:/lararium/boot-splash/active` | `lar:///ha.ka.ba/state/boot-splash/active` | tw5-vm.ts |

**Ontology fix:** `"room"` → `"wiki"` in `CAUSAL_ISLAND_MAY` (causal-island.ts);
`"local-room-projection"` → `"local-wiki-projection"`. Test fixture
`@rooms/test-room` → `@lararium/wikis/test-wiki/draft`. Default `targetBag`
in IslandAdaptor changed from `"room"` to `"wiki"`.

**IslandAdaptor routing law landed:**
- Ceremony writes (promote) pass explicit `bag` field → adaptor routes to that canonical bag.
- Live TW5 edits without explicit `bag` field → route to `this.targetBag` (top wiki draft bag).

**Operator migration caveat:** Any live admin-doc tiddlers carrying the old
`$:/tags/LarariumBagMirror` tag will go invisible to `lar-promote.ts` until
their tag field updates to `lar:///ha.ka.ba/tags/lararium-bag-mirror`.
Run `lares reset --force` on dev nodes; prod nodes require a one-time admin-doc
tiddler patch before the next promote ceremony.

**Metrics:** 170/170 tests pass; all packages typecheck clean.

---

## What Changed This Turn (2026-05-17 turn 14)

### Shared Types Folded Back Into @lararium/mesh

**Problem:** The temporary shared-types extraction added another package boundary without surviving as a stable workspace package. The live tree now keeps those shared contracts in `@lararium/mesh`, and stale comments/docs still pointed at the dissolved package.

**Resolution:** The shared type and isomorphic utility surfaces now live in `@lararium/mesh` again. `@lararium/tw5`, `@lararium/node`, and adjacent packages consume them from mesh's public surface.

**Canonical homes in mesh:**
- `ast.ts` — PranalaEdge, GrammarRules, SigilRule, FamilyRule, Law of Fives constants, stance/tool vocabulary
- `tiddler-store.ts` — LarTiddlerStore, LarTiddlerRecord, LarTiddlerChange, ChangeOrigin, ClosureEntry, EdgeRecord, FilterEngineFn
- `meme-provider.ts` — MemeProjection interface + MemeProvider class
- `live-protocol.ts` — ReactionBinding, ReactionHandler, EdgeLike, ReactionGraph class, extractReactionBindings
- `island-accumulator.ts` — IslandAccumulator class
- `meme-recipe-vm.ts` — MemeRecipeVm interface + bootMemeRecipeVm helper

**Dependency graph now:**
```
@lares/core             (no deps)
@lararium/mesh          → @lares/core, @automerge/automerge, @automerge/automerge-repo
@lararium/tw5           → @lares/core, @lararium/mesh
@lararium/node          → @lararium/tw5, @lararium/mesh
@lararium/browser       → @lararium/mesh, @lararium/tw5     (in progress — S1 contract landed)
@lares/cli              → @lararium/mesh
```

Spine law: `@lararium/mesh` is the isomorphic spine for all concerns outside TW5 VMs.
Automerge core lives in mesh. Vessels (`node`, `browser`) consume it from there — they do not
add their own `@automerge/automerge` dep unless a platform-specific Automerge surface requires
something mesh does not already re-export.

**Updated:**
- stale shared-types references removed from live source comments and meme docs
- mesh remains the public export surface for shared contracts
- generated `dist/` artifacts rebuilt so they stop advertising the dissolved package

**Metrics:** rebuild/typecheck rerun after the cleanup pass.

---

## What Changed This Turn (2026-05-16 turn 13)

### lararium-mesh → lararium-mesh rename

`packages/lararium-mesh` → `packages/lararium-mesh`; `bags/@lararium/mesh` → `bags/@lararium/mesh`; `@lararium/mesh` → `@lararium/mesh` everywhere (imports, package.json, vitest configs, meme corpus, docs). Mechanical sed sweep + pnpm reinstall. 167/167 tests pass; typecheck clean.

---

## What Changed This Turn (2026-05-16 turn 12)

### mountCamera() — three-tree chain + mountPanel() collapse

**New method on `TW5Engine`:**
- `mountCamera(mount: CameraMount): () => void` — isomorphic parse→widget→fakeDOM chain.
  Constructs widget tree via `makeTranscludeWidget(rootTiddler, { document, parentWidget })`,
  renders into `container`, registers `wiki.addEventListener("change", refresh)`, returns
  teardown that removes listener and detaches DOM nodes.
- `CameraMount` interface exported from `@lararium/tw5` (alongside `CameraRegistration`).

**`mountPanel()` collapsed to delegate:**
- Shadow root + stylesheet camera wiring stays (browser-specific).
- Story river construction removed — replaced by `this.mountCamera({ rootTiddler: "$:/core/ui/RootTemplate", ... })`.
- `rootWidget.children = [pageWidget]` deleted — camera manages its own refresh via the change listener; no singleton child wiring needed.
- `rootWidget.domNodes = [inner]` retained — TW5 internal event dispatch requires it.

**Files changed:**
- `packages/lararium-tw5/src/tw5-vm.ts` — `CameraMount` interface + `mountCamera()` + refactored `mountPanel()`
- `packages/lararium-tw5/src/index.ts` — exports `CameraMount`

**Metrics:** 167/167 tests pass; typecheck clean.

---

## What Changed This Turn (2026-05-16 turn 11)

### Jest → Vitest Migration + N-Accumulator Node Wire

**Jest removed across all three packages.** `--experimental-vm-modules` flag gone.
Vitest v3.2 runs native ESM; same `describe`/`test`/`expect` API; no API changes in
any test file beyond the import line swap.

**Changed:**
- `packages/lararium-mesh/jest.config.cjs` → deleted
- `packages/lararium-tw5/jest.config.cjs` → deleted
- `packages/lararium-node/jest.config.cjs` → deleted
- `packages/lararium-mesh/vitest.config.ts` + `packages/lararium-tw5/vitest.config.ts`
  + `packages/lararium-node/vitest.config.ts` — new; `resolve.alias` array with
  explicit sub-path aliases (sub-path first, parent second — order-safe).
- All 11 test files: `from "@jest/globals"` → `from "vitest"`.
- All three `package.json` devDeps: `jest` + `ts-jest` + `@jest/globals` removed;
  `vitest: ^3.2.0` added. Test script: `NODE_OPTIONS=--experimental-vm-modules pnpm exec jest ...`
  → `vitest run`.

**N-accumulator wire in node peer:**
- `packages/lararium-node/src/open-node-lar-peer.ts` step 9 extended:
  - Creates `IslandAccumulator[]` — one per bag in `vmBagStack`
  - Registers each accumulator via `peer.addProjection(acc)` (sibling to adaptor)
  - `setInterval(() => adaptor.flushAll(accumulators, 200), 16)` drives the node tick
  - `stopTick: () => clearInterval(handle)` added to `NodeLarPeerResult` for graceful teardown
- Import: `IslandAccumulator` added from `@lararium/mesh`.

**Metrics:** 167/167 tests pass (84 core + 48 tw5 + 35 node); typecheck clean.

---

## What Changed This Turn (2026-05-16 turn 10)

### Verse Polychronous CRDT Mesh — IslandAdaptor + IslandAccumulator Sprint

**Architectural ruling:** `$tw.syncer` provably does not run in Lararium —
no `module-type:syncadaptor` tiddler in the plugin bundle. `meme-sync-adaptor.ts`
deleted entirely. Replaced with a clean web3-native responsibility split.

**Deleted:**
- `packages/lararium-tw5/src/meme-sync-adaptor.ts` — the web2 syncer-contract ghost; 
  all dead syncer methods (`getUpdatedTiddlers`, `getSkinnyTiddlers`, etc.) gone.
- `packages/lararium-tw5/tests/meme-sync-adaptor.test.ts` — replaced by island-adaptor.test.ts.

**New:**
- `packages/lararium-tw5/src/island-adaptor.ts` — `IslandAdaptor` class.
  Causal-island ↔ TW5 wiki bridge. Implements `MemeProjection`.
  Owns: pre-sync buffer per island, `onSyncComplete()` batch flush (one `wiki.transact()`
  per island), non-CRDT immediate apply (`tw-local`, `canon-hydrate`, `lares-command`),
  outbound `saveTiddler` → `store.put()`, `deleteTiddler` → `store.tombstone()`.
  Echo-loop guard: `_applying: Map<string, ChangeOrigin>` keyed by slot.
  `flushAll(accs[], budget)` drains N accumulators in recipe priority order.
  Does NOT implement TW5 `syncadaptor` contract. `$tw.syncer` does not run.
- `packages/lararium-mesh/src/island-accumulator.ts` — `IslandAccumulator` class
  (renamed from `sync-accumulator.ts`). Frame-aligned CRDT patch buffer per bag.
  Implements `MemeProjection`. Platform-agnostic (no rAF, no TW5).
  Post-sync crdt-remote buffering only. `drain(budget)` returns + splices from queue.
  Invariants A-1 through A-5 documented.
- `packages/lararium-tw5/tests/island-adaptor.test.ts` — 48 tests covering lifecycle,
  inbound buffering, post-sync deferral, `flushAll` multi-accumulator (shared budget,
  priority order), outbound guards, echo guard.

**Meme corpus (bags/):**
- `bags/@lares/v0.1/docs/lararium/verse-mesh.md` — Verse polychronous CRDT mesh design:
  peer-owns-bags law, N local clocks (Signal/INRIA Berry 1991 model), VM pool (live/warm
  slots), camera model (Story River first, TLDraw.js second, many more), visibility gate
  (future), tick sources by platform, wiring law (`store.addProjection` for both siblings).
- `bags/@lares/v0.1/api/lararium/island-adaptor.md` — invariant spec I-1 through I-8:
  echo-loop guard, island isolation, single transact per flush, post-sync pass-through,
  non-CRDT immediate apply, outbound guards, cross-bag tombstone resolution, child cleanup.
- `bags/@lares/v0.1/api/lararium/island-accumulator.md` — invariant spec A-1 through A-5:
  sync gate, crdt-remote filter, drain returns-and-removes, budget cap, platform-agnostic.
  Camera projection section: each camera MAY hold its own accumulator.

**Modified:**
- `packages/lararium-tw5/src/tw5-vm.ts` — `startRenderLoop` signature updated to accept
  `IslandAccumulator[]` (plural); delegates to `adaptor.flushAll(accumulators, budget)`.
- `packages/lararium-mesh/src/index.ts` — exports `island-accumulator.js` (was `sync-accumulator.js`).
- `packages/lararium-tw5/src/index.ts` — exports `IslandAdaptor`; deprecated re-export
  `MemeSyncAdaptor` alias kept for one turn.
- `packages/lararium-node/src/` — `MemeSyncAdaptor` → `IslandAdaptor` across all node files
  (wiki-handlers, open-node-lar-peer, open-admin-vm, node-vm-manager).

**Architecture law enacted:**
- Adaptor and accumulator are **siblings** in the MemeProvider projection fan-out — not nested.
  Caller registers both: `store.addProjection(adaptor)` + `store.addProjection(accumulator)`.
- Adaptor covers pre-sync time window; accumulator covers post-sync crdt-remote.
  They never double-write.
- Browser tick: `startRenderLoop(adaptor, accumulators)` → `requestAnimationFrame`.
- Node tick: `setInterval(() => adaptor.flushAll(accumulators, budget), 16)` (not yet wired).

**Pending wire:** `open-node-lar-peer.ts` creates one `IslandAdaptor` without a corresponding
`IslandAccumulator`. Next sprint: one accumulator per bag in recipe, priority-ordered array,
node `setInterval` driver (see Next Work item 1 in Bootstrap Paste).

**Metrics:** 48/48 tests pass; typecheck clean across all three packages
(`@lararium/mesh`, `@lararium/tw5`, `@lararium/node`).

---

## What Changed This Turn (2026-05-15 turn 9)

### Grammar Self-Hosting Completion — Cut 4 + smol-toml Library Tiddler + YIN Cleanup

**Grammar self-hosting now fully complete.** `grammarRulesFromText` and the TOML
monolith parse path retired in full. `GRAMMAR_TAG` as the single registration surface.

**New:**
- `packages/lararium-tw5/src/lib-smol-toml.ts` — smol-toml bundled once as a
  TW5 `module-type: library` tiddler at `lar:///ha.ka.ba/@lararium/tw5/lib/smol-toml`.
  All other plugin modules externalize it via `require()` — zero per-module duplication.
- `packages/lararium-tw5/tiddlers/sigil-toml.tid` — `toml` data-fence sigil as a
  SharktoothSigil tiddler (`lar-kind: data`, `lar-name: toml`). The `[[sigils]]`
  TOML block in `memetic-wikitext.tid` removed; sigil-toml.tid replaces it.
- `bags/@lararium/v0.1/tw5/lib-smol-toml.md` — bag anchor meme at the library tiddler URI.

**Modified:**
- `packages/lararium-tw5/plugin-build/vite-plugin-build.ts` — smol-toml
  externalized for all modules except `lib-smol-toml` itself; `output.paths` maps
  `smol-toml` → `lar:///ha.ka.ba/@lararium/tw5/lib/smol-toml`.
- `packages/lararium-tw5/tiddlers/memetic-wikitext.tid` — `[[sigils]]` toml block
  removed; ahu #sigil-registry description updated to note SharktoothSigil migration.
- `packages/lararium-tw5/src/grammar-cache.ts` — docstring rewritten; TOML fallback
  merge block removed entirely; `buildGrammarFromWiki` tiddler-only path is the only path.
- `packages/lararium-mesh/src/grammar-invariants.ts` — full rewrite; `GRAMMAR_MEME_URI`
  and `GrammarVersionGate` removed; `GRAMMAR_TAG` exported; 6 SharktoothSigil invariants.
- `packages/lararium-mesh/src/index.ts` — `meme-grammar.js` re-export removed.
- `packages/lararium-node/scripts/test-quine.ts` — steps 5+6 rewritten to assert
  `[tag[GRAMMAR_TAG]]` tiddlers present + required sigil names via `lar-name` field.
- `packages/lararium-node/tests/node-host.test.ts` — `grammarRulesFromText` tests
  and `GRAMMAR_FIXTURE` const deleted; import cleaned.
- `packages/lararium-node/src/node-host.ts` — stale deprecated comment removed.

**Deleted:**
- `packages/lararium-mesh/src/meme-grammar.ts` — 111 lines; `parseArrayOfTables`
  and `grammarRulesFromText` gone; no live consumer remained.

**Metrics:** build:plugin 18 modules (was 17); 119 inner tiddlers; 35/35 tests pass;
typecheck clean across all three packages.

---

## What Changed This Turn (2026-05-15 turn 8)

### Yin-Collapse Cut 1 — reaction-router.ts + fireSync Gap Closed

**Architectural ruling enacted.** `ReactionEngine` (TS inline dispatch) removed.
Replaced by nalu-driven TW5 startup module.

**New:**
- `packages/lararium-tw5/src/modules/reaction-router.ts` — TW5 startup module,
  platforms browser + node. Boots by scanning all `lar:` tiddlers for papalohe
  bindings; maintains `ReactionGraph` incrementally via `wiki.addEventListener("change")`;
  dispatches `wiki.dispatchEvent("tm-verse-event", {uri, listenable})` from inside
  the nalu hook. Reactions now fire AFTER the full changeset lands, not inline before it.

**Removed:**
- `ReactionEngine` class from `packages/lararium-mesh/src/kumu-device.ts` — replaced
  by reaction-router.ts. `ReactionGraph` + `extractReactionBindings` remain in
  live-protocol.ts (imported by the startup module).

**Updated:**
- `packages/lararium-node/src/lar-wiki-worker.ts` — removed `ReactionEngine` import
  and instance; wired `tw5.registerProjectionBus({handleLarariumEvent})` after boot;
  removed inline `re.onChangeset()` from changeset handler. island now forwards
  `tm-verse-event` wiki events → `IslandMsg_Event` to vessel.
- `bags/@lares/v0.1/api/pono/reaction-graph.md` — yin-collapse target section updated
  to "Landed"; fireSync gap section updated to "CLOSED".

**Metrics:** typecheck clean; 126/126 tests pass; 17 Vite plugin modules (was 16);
smoke boot clean. All probes pass.

---

## What Changed This Turn (2026-05-15 turn 7)

### Verse Ontology + Yin-Collapse Architecture Research Sprint

**New pono specs (bags/@lares/v0.1/api/pono/):**
- `nalu.md` — architectural invariant: nalu as changeset delivery wave; TW5 `refresh(changedTiddlers)` ↔ Verse `OnSimulate(StagedUpdates)` ↔ MemeSyncAdaptor flush; yin-collapse law; one-graph-not-two law; scale note. Infrastructure concept below grammar layer.
- `hoolele.md` — full pono spec: unstructured escape-hatch sigil; Verse `spawn` analogue; English alias `\spawn`; six-operator concurrency table; when-to-use law; Lararium-specific use cases (CRDT flush, VmPool, Keyhive). Completes six-operator ontology.

**Updated pono specs:**
- `reaction-graph.md` — yin-collapse target architecture section added: current provisional bridge vs. target TW5-native startup module; `fireSync` gap documented (fires inline, not tick-driven); prior art (Elm, Solid.js, MobX, Esterel/Lustre).
- `nihomano-sigils.md` — concurrency cluster updated: `hoolele/\spawn` (six-operator completion) + `\tick/\simulate` (device lifecycle hook stub; Hawaiian name deferred) added to family list and language families section.

**New SharktoothSigil tiddler:**
- `sigil-tick.tid` — `\tick` / `\simulate` grammar stub; device lifecycle hook, once-per-nalu; Verse `OnSimulate` analogue; Hawaiian proper name deferred pending Visual Verse tick node confirmation (UE6 ~2027).

**Architectural rulings from Talk Story 2026-05-15:**
- TW5 wiki (`$tw.wiki`) IS the primary synchronous reactive engine (Elm/Solid.js/MobX pattern).
- ReactionGraph TS layer = provisional bridge; target: collapse into TW5 startup module + reaction tiddlers.
- Irreducible TS: LarTiddlerStore (CRDT), VmPool, Keyhive, network.
- MemeSyncAdaptor = minimal bridge (sea → shore); gets thinner, not eliminated.
- One graph, not two: bags = CRDT federation units; recipe stack = logical unification; TW5 wiki IS the unified logical graph; MemeSyncAdaptor per bag generates the nalu.
- nalu = changeset delivery wave (infrastructure, below grammar, not a sigil).
- `\tick` = grammar sigil stub; Hawaiian proper name deferred pending Visual Verse tick node shape.
- `fireSync` gap documented: fires inline (before nalu), not truly tick-driven.
- hoolele/`\spawn` = 6th Verse operator; completes the concurrency ontology.
- Visual Verse: vaporware; node-graph prototype under evaluation; no release date.
- Verse concurrency: 5 + 1 (hoolele) confirmed stable.

---

## What Changed This Turn (2026-05-15 turn 6)

### kau.ts → TW5-Native Wikitext Migration

**No JS sigil widgets remain in the plugin.**

- `packages/lararium-tw5/src/widgets/kau.ts` — deleted. Was 150-line JS widget class (placement/invocation render, render-mode dispatch, Keyhive stubs).
- `packages/lararium-tw5/src/widgets/render-modes.ts` — deleted. Was `dispatchSlotRenderMode()` helper; comment on it said "dissolves when kau markdown-meme path folds into cascade." Dissolved.

**New TW5-native tiddlers (`packages/lararium-tw5/tiddlers/`):**
- `sigil-kau.tid` — rewritten: `\widget ~kau(p1:"")` with `p1` parse (fragment/name/props via `<$set>` conditionals), template cascade dispatch, placement vs invocation branching. Plus `\procedure ~kahea~kau` and `\procedure ~aka~kau` mirroring sigil-ahu.tid exactly.
- `kau-template-html.tid` — HTML render: placement gets `<div class="lar-kau lar-kau-place">`, invocation gets `<div class="lar-kau lar-kau-invoke">`. Hole slot when def missing.
- `kau-cascade-html.tid` — cascade config tagged `lar:///ha.ka.ba/tags/kau-template`.
- `kau-template-markdown-meme.tid` — `<<~ kahea kau {{!!slot}} >>` (same pattern as ahu).
- `kau-cascade-markdown-meme.tid` — `list-before` ordered, `lar-export-scope` conditioned.

**Keyhive stubs** (`registerKauCapabilityHook`, `registerKauWriteBackHook`) dissolved with no replacement. When Keyhive WASM lands, these surface as TW5 action tiddlers consistent with TW5 VM primacy — not JS module hooks.

**Architecture law now fully holds:** "Sigil dispatch via wikitext. JS widgets only for JS-level semantics (capability hooks, async device I/O)." No sigil has JS-level semantics today, so the plugin carries zero JS sigil widgets.

**Updated docs:** `bags/@lares/v0.1/api/pono/kau.md`, `bags/@lararium/v0.1/tw5/widgets/kau.md`, `memetic-wikitext.tid` render-modes note, `lar-sigil-shared.ts` comment, ROADMAP.

**Build:** typecheck clean; 16 Vite modules (was 17); 114 inner tiddlers; 38 shadow tiddlers in smoke; all probes pass.

---

## What Changed This Turn (2026-05-15 turn 5)

### Concurrency Sigil Cluster + Grammar Self-Hosting + kumu-device UEFN Alignment

**New pono specs (bags/@lares/v0.1/api/pono/):**
- `hui.md` — await-all sync (`sync`); MUST spawn all, MUST NOT resume until all complete.
- `holo.md` — cancelling race (`race`); first wins, all losers cancel immediately.
  English alias: `\race`. Distinct from `puka/\rush` (no-cancel).
- `uefn-scene.md` — architecture spec: 3 tiddler kinds (type meme, instance meme, scene meme)
  + edge vocabulary + TW5 filter views + Verse effect specifier → sigil mapping.
  Import pipeline declared unresolved (pending sprint).

**New/updated SharktoothSigil tiddlers (packages/lararium-tw5/tiddlers/):**
- `sigil-lele.tid` — detached spawn; `lar-kind: concurrency`; Verse `spawn`.
- `sigil-hui.tid` — await-all; `lar-kind: concurrency`; Verse `sync`.
- `sigil-puka.tid` — first-wins no-cancel; `lar-kind: concurrency`; Verse `rush`. Comment corrected.
- `sigil-holo.tid` — NEW; cancelling race; `lar-kind: concurrency`; Verse `race`.
- `sigil-race.tid` — NEW; `lar-kind: concurrency-alias`; `lar-alias-for: holo` (corrected from puka).
- `sigil-rush.tid` — `lar-kind: concurrency-alias`; `lar-alias-for: puka`.
- `sigil-sync.tid` — `lar-kind: concurrency-alias`; `lar-alias-for: hui`.
- 8 `sigil-family-*.tid` — `lar-kind: family`; tiddlerizes all 8 edge-family contracts.

**Grammar self-hosting complete (memetic-wikitext.tid):**
- Removed 6 concurrency `[[sigils]]` TOML blocks (lele, hui, puka, \sync, \race, \rush).
- Removed entire `[[families]]` TOML fence (8 family definitions).
- Final state: 1 `[[sigils]]` block (the permanent `toml` data fence). 0 `[[families]]` blocks.
- Wild-magic property holds: grammar = SharktoothSigil tiddlers only.

**`grammar-cache.ts` — `FamilyRule` tiddlerization:**
- `familyFromFields()` derives `FamilyRule` from `lar-kind: family` tiddlers.
- `sigilFromFields()` short-circuits on `lar-kind === "family"`.
- `buildGrammarFromWiki()` partitions tiddlers into sigils and families; merges with TOML fallback.

**`kumu-device.ts` — UEFN 5.6+ alignment:**
- `KumuListenable.verseKind?: "listenable" | "event"` — `event(T)` vs `listenable(T)` distinction.
- `KumuListenable.payloadType?: string` — Verse type string for the event payload.
- `KumuSubscribable.payloadType?: string` — payload type for DEB wiring.
- `KumuSubscribable.effects?: readonly string[]` — Verse effect specifiers (`<suspends>`, `<decides>`, etc.).
- Doc comment corrected: `using { /Path }` = module import, not trait composition.

**`scanner.ts` yin pass + concurrency additions:**
- `wai` BOOTSTRAP_SCANS removed (retired sigil). `\if → heihei` canonicalName corrected.
- `hui`, `holo`, `puka` open/close scans added to BOOTSTRAP_SCANS.

**`builder.ts` yin pass:**
- `case "wai"` removed; `case "heihei"` and `case "kahawai"` handle conditional filter extraction.

**`pranala-families.md` — back-edges added:**
- 8 `<<~ pranala #tiddler-sigil-family-{name} >>` edges to all family tiddlers.

**Build:** All tests pass. Grammar fully self-hosted in SharktoothSigil tiddlers.

**Verse doc URI (from internal research):**
- `dev.epicgames.com/documentation/en-us/fortnite` — UEFN/Verse official docs root.

---

## What Changed This Turn (2026-05-14 turn 4)

### lar: URI Namespace Migration + mode= Retirement + English Alias Sigils — `lararium-tw5`

**mode= retired from all sigil procedures:**
- `~kahea(p1 p2)` — KaheaTemplate cascade only; no mode param.
- `~aka(p1 p2)` — own AkaTemplate cascade; no delegation to ~kahea with mode="shadow".
  ~aka's render posture difference lives in the template cascade, not in sigil dispatch.
- `~ahu(slot uri p1)` — AhuTemplate cascade only; no mode param.
- `~aka~ahu(slot uri p1)` — own AkaTemplate cascade for child-slot projection; own implementation.
- `~(name p1 p2 p3 p4 p5)` dispatcher — mode param removed; threads only p1-p5.
- `~kahea~ahu(slot uri p1)` — passes through to ~ahu without mode.

**lar: URI tag migration (owned namespace, not TW5 core contracts):**
- `$:/tags/Lar/AhuTemplate` → `lar:///ha.ka.ba/tags/ahu-template`
- `$:/tags/Lar/AkaTemplate` → `lar:///ha.ka.ba/tags/aka-template`
- `$:/tags/Lar/KaheaTemplate` → `lar:///ha.ka.ba/tags/kahea-template`
- `$:/tags/Lar/LoulouTemplate` → `lar:///ha.ka.ba/tags/loulou-template`
- `$:/tags/Lar/PranalaTemplate` → `lar:///ha.ka.ba/tags/pranala-template`
- `$:/tags/Lar/PranalaHeaderTemplate` → `lar:///ha.ka.ba/tags/pranala-header-template`
- `$:/tags/LarariumGrammar` removed from `memetic-wikitext.tid` tags (superseded by SharktoothSigil)
- `$:/tags/LarariumKumu` → `lar:///ha.ka.ba/tags/kumu` (kau.ts)
- `$:/config/Lar/MemeticRulesExcept` → `lar:///ha.ka.ba/config/memetic-rules-except` (memetic-parser.ts)
- All cascade tiddlers (`*-cascade-*.tid`) tags fields updated.

**English alias sigil tiddlers (new; SharktoothSigil-tagged):**
- `sigil-procedure.tid` — `lar-kind: pragma-alias`, `lar-alias-for: \procedure`; with cross-ref to `wehe`
- `sigil-define.tid` — `lar-kind: pragma-alias`, `lar-alias-for: \define`; deprecated in favour of \procedure
- `sigil-widget.tid` — `lar-kind: pragma-alias`, `lar-alias-for: \widget`
- `sigil-function.tid` — `lar-kind: pragma-alias`, `lar-alias-for: \function`
- `sigil-if.tid` — `lar-kind: control`; `\procedure ~\if` body uses TW5 `<%if filter%>...<%endif%>`
- `sigil-for.tid` — `lar-kind: control`; `\procedure ~\for` body wraps `<$list filter=...>`
- All carry `lar-alias-for` cross-refs to the Hawaiian equivalents (wehe, huli, etc.) where applicable.

**Build:** 42/42 + 39/39 tests pass. Smoke clean. 33 shadow tiddlers.

---

## What Changed This Turn (2026-05-14 turn 3)

### SharktoothSigil Grammar Inversion + aka/kahea Collapse — `lararium-tw5`

**Grammar inversion — `grammar-cache.ts` radical rewrite:**
- Canonical grammar tag: `lar:///ha.ka.ba/tags/SharktoothSigil` (replaces
  `$:/tags/LarariumGrammar` as grammar registration signal).
- `getGrammar()` now reads sigils from all `[tag[lar:///ha.ka.ba/tags/SharktoothSigil]]`
  tiddlers via their `lar-*` fields (`lar-kind`, `lar-pattern`, `lar-open-pattern`,
  `lar-close-pattern`, `lar-alias-for`, `lar-default-family`, `lar-layer`, etc.).
- TOML monolith (`memetic-wikitext.tid`) supplies families + unmigrated sigil fallback.
  Tiddler sigils take precedence by name. Each migrated sigil's TOML block becomes dead
  code removable in the next pass.
- Change listener watches `SharktoothSigil`-tagged tiddler changes AND `GRAMMAR_MEME_URI`.
- New pattern: adding a sigil to the wiki = tagging a tiddler. No code change required.

**`aka`/`kahea` semantic collapse via `mode=`:**
- `~kahea(p1 p2 mode:"live")` — unified transclusion widget; `mode="shadow"` picks
  `AkaTemplate` cascade instead of `KaheaTemplate`. One widget, two rendering postures.
- `~aka(p1 p2)` — collapsed to pure delegate: `<$transclude $variable="~kahea" mode="shadow"/>`.
  No duplicate implementation. Projection boundary = `mode` param, not parallel procedures.
- `~ahu(slot uri p1 mode:"live")` — `mode` threads to template tag:
  `mode="live"` → `AhuTemplate`, `mode="shadow"` → `AkaTemplate`.
- `~kahea~ahu(slot uri p1 mode:"live")` — passes `mode` to `~ahu`.
- `~aka~ahu(slot uri p1)` — delegates to `~kahea~ahu(mode="shadow")`. Freeze semantics
  now live in the template cascade, not in duplicate procedure stubs.
- `~` dispatcher gains `mode:"live"` param — threads through to all compound sigil procedures.
- **`mode=` aligns with pranala sugar:** `~aka` ≡ `pranala family:observe` (frozen read);
  `~kahea` ≡ `pranala family:dataflow` (live push). The `mode` param is the short-form
  for pranala `family:` in transclusion space.

**`BLOCK_CLOSERS` + `GRAMMAR_NAME_MAP` cleanup:**
- `BLOCK_CLOSERS` shrunk from 20 → 3 entries: `{ahu, pranala, kahea}` (boot-critical only).
  All other block sigil closers load from grammar via `buildClosers()` + `closePatternToTag()`.
- `GRAMMAR_NAME_MAP` retired. `sigil-kahea.tid` merges both leaf and block forms under one
  canonical name `"kahea"` — no TOML naming seam needed.
- `CompoundSigilMatch.slotType` renamed → `closeKey`; compound forms carry `word1` (e.g.
  `"kahea"`) as the closer lookup key — fixes `<<~ kahea ahu #slot >>body<<~/kahea >>` block detection.
- `closePatternToTag()` added: converts TOML regex `close_pattern` strings to literal
  `indexOf` tags for `findCloseEnd`.

**SharktoothSigil tiddler migrations (7 sigils):**
- `sigil-ahu.tid` — `lar-kind: child-slot` + `lar-open/close-pattern`; `mode` param added.
- `sigil-kahea.tid` — `lar-kind: edge-sugar` + merged block pattern fields; `mode` param.
- `sigil-aka.tid` — `lar-kind: edge-sugar` + `lar-alias-for: kahea`; collapsed to delegate.
- `sigil-loulou.tid` — `lar-kind: edge-sugar` + `lar-pattern`.
- `sigil-pranala.tid` — `lar-kind: edge` + `lar-inline/block-pattern`.
- `sigil-pranala-header.tid` — `lar-kind: header` + `lar-pattern`.
- `sigil-kau.tid` — NEW; `lar-kind: child-slot` + `lar-pattern`; no wikitext body yet
  (kau.ts still JS widget at this turn); restores `kau` child-slot detection after grammar loads. (Fully migrated in turn 6.)

**`memetic-wikitext.tid` shrink:**
- 7 `[[sigils]]` blocks removed (ahu, pranala, loulou, aka, kahea-block, kahea URI form,
  pranala-header). 46665 → 42091 chars. 48 TOML sigil blocks remain; each migrates to a
  SharktoothSigil tiddler in Path G.SharktoothSigil.

**Build:** 42/42 tests pass. Smoke clean. 33 shadow tiddlers. No regressions.

---

## What Changed This Turn (2026-05-14)

### Sigils-as-Wikitext Sprint + Hardening — `lararium-tw5`

**Previously landed (prior turn):** filter self-registration, md-file-router,
memetic-parser deny-list trim (T-0), `\sigil` pragma stub (T-2), `\widget ~`
dispatcher (T-3), `~aka`/`~kahea`/`~loulou`/`~pranala-header`/`~pranala`
wikitext tiddlers, 5 JS widgets retired.

**T-1 — Wikirule Collapse (landed this turn):**
- Merged `lar-sigil-inline.ts` + `lar-sigil-block.ts` → `lar-sigil.ts`.
  Single rule, `types = { block: true, inline: true }`. `findNextMatch` claims
  block container forms (ahu, pranala-block, generic-block) when a closer
  follows; leaf forms return `undefined` and fall through to `macrocallinline`.
- `DEFAULT_RULES_EXCEPT` cleared to `new Set<string>()` — no macrocall rules
  blocked; leaf sigils route through `MacroCallWidget` → `\widget ~` naturally.
- Deleted `lar-sigil-block.ts`, `lar-sigil-inline.ts`.

**URI fragment resolution (landed this turn):**
- All 5 sigil tiddlers (`sigil-aka`, `sigil-kahea`, `sigil-loulou`,
  `sigil-pranala-header`, `sigil-pranala`) now apply
  `[<p1>regexp[^#]] → [<p1>addprefix<currentTiddler>]` before using the URI
  in `<$tiddler>` or `<$let>`. Absolute URIs pass through unchanged.

**Deserializer root-iam fix (landed this turn):**
- `memeticWikitextDeserializer` was treating iam blocks nested inside top-level
  ahu slots as root-level iam, corrupting `preIamContent` / `postIamContent`.
- Fix: limit `extractRootTomlWithPos` search to the region before the first
  top-level ahu block (`findTopLevelAhuBlocks()[0].openStart`).
- Verified: direct TS source test returns 3 tiddlers (root, `#parent`,
  `#parent/child`) with correct fields.

**Build pipeline fix (landed this turn):**
- `vite.plugin.config.ts`: `buildPluginCjsTiddlers()` now calls
  `rmSync(outDir)` + `mkdirSync(outDir)` before the Vite build loop.
  Stale `.js` artifacts (e.g. deleted `lar-sigil-block.js`,
  `lar-sigil-inline.js`) no longer survive into the TW5 CLI pack step.
- `plugin-tiddler.generated.ts` now contains the root-iam fix. Build produces
  56 inner tiddlers; 3/3 active Jest suites pass (42/42 tests).

**Retired this turn (2026-05-14):**
- `ahu.ts` → `sigil-ahu.tid` (`\widget ~ahu` + `\procedure ~kahea~ahu`).
  `lar-sigil.ts` now emits `~kahea~ahu` macrocall for all ahu forms.
  Decompose path (`splitRecursive`) confirmed already correct.
  Pattern for future child-slot sigils: `~kahea~<sigilName>(slot:"" uri:"" p1:"")` → delegates to `~<sigilName>`.

## Active Objective

Close the GP-3 browser arc. Then open the browser vessel's ea-path: founding ceremony
via `@lararium/keyhive`, IndexedDB storage, WebCrypto keypair, broadcast-based presence.
These two arcs together complete the isomorphic vessel law across all vessel types.

### GP-3 Browser Arc — ✅ Done

`browser-repo-in-island.test.ts` (2 tests) passes. GP-3 fallback never existed in `browser-wiki-worker.ts`. Protocol layer fully cleared (both gates). See ROADMAP `## GP-3 Deprecation Completion Arc`.

### docUrl Non-Null Gate (§8) — ✅ Done

`federation-seam.test.ts` (2 tests): bidirectional in-process Repo pair. Island Sovereignty Law §8 written. Gate proof cites node + browser paths.

### Path L / S7.4 — Admin Doc Ingress Trust Gate

- Gate admin-doc WebSocket ingress on Keyhive `cap=infrastructure` proof.
- Operator-owned vessels only; non-operator vessels rejected at the ingress.
- Preserve command-tiddler coordination surface.
- Negative smoke: non-infrastructure vessel cannot sync admin state.

### Path K / F-arc — Save Path Hygiene (Deferred, not forgotten)

- `$:/state/*` → projection layer, not durable canon/draft.
- `Draft of *` → per-wiki draft bag.
- 300–500ms debounce in `IslandAdaptor.saveTiddler` — landed for rapid writes;
  projection auto-truncate and draft routing remain open.
- Single parser/split law across disk sync, CRDT inbound, TW5 UX save, disk export.

## Architecture Laws To Preserve

- **Bag = Automerge doc = sync boundary.**
- **Shared operator-peer law.** Browser peers and node peers share one base contract. Runtime affordances differ; authority shape does not.
- **Local intent first.** The invoking peer writes command intent locally before any bridge, relay, or edge adaptor participates.
- **Capability checks start local.** Proof verification happens on the invoking peer first; resource edges may re-check before side effects.
- **TW5 VM primacy.** If logic can live in the VM, keep it there.
- **Command-tiddlers, not HTTP/RPC.** CLI and daemon coordinate through the admin doc.
- **Receipt-tiddlers complete the loop.** Accept, reject, apply, and defer outcomes land as records, not only terminal return values.
- **Canon requires operator promotion.** Git diff remains the visible signature.
- **Admin doc stays infrastructure-only.** Federates to operator devices, not room peers.
- **Node is edge, not throne.** Disk projection, persistent relay, process control, and transport residency remain node strengths; none grant authority over truth.
- **Hot wiki = TW5 + RE together.** Synchronous tick semantics require co-location.
- **Memetic wikitext = TW5 superset.** No deny-list items without a carrier-stream justification.
- **Sigil dispatch via wikitext.** All sigil widgets live as TW5 `\widget` tiddlers. JS widgets only for JS-level semantics (async device I/O, future Keyhive WASM hooks).
- **Every first-class record id uses `lar:`.** Hostful ids name live session artifacts; hostless ids name stored artifacts.
- **`lar:///ha.ka.ba/*` names stable tagspace.** `lar:///haWord.kaWord.baWord/*` names unstable tagspace.

## Path M / Lares Local Intent Bridge

- Shared aim: CLI, browser UX, and any future operator surface all author the same durable command records through the operator peer.
- Default local CLI/daemon bridge: `stdio`.
- Unix socket support can follow under the same bridge envelope for resident-daemon ergonomics.
- WebSocket belongs on operator-device ingress or future peer-facing sync, not on the default local CLI path.
- Command tiddlers and receipt tiddlers stay the coordination artifacts.
- The TW5 VM pool should author, route, and write records whenever the work can stay inside that pool.
- Bridge code transports envelopes; it does not own ceremony meaning.

Reference: `wikis/@lares-history/lararium-research/LARES-CLI-DAEMON-SPRINT-PLAN.md`

## Useful Smokes

```sh
# Fast package suites
pnpm test:unit

# Isolated integration flows under tests/
pnpm test:flows
pnpm test:tw5-flow

# Quine / peer boot parity
pnpm --filter @lararium/tw5 build
pnpm --filter @lararium/node typecheck
pnpm --filter @lararium/node exec tsx scripts/test-quine.ts

# Plugin boot smoke (checks shadow tiddlers + JS widget registry + deserializer probes)
pnpm --filter @lararium/tw5 exec tsx scripts/smoke-plugin-boot.ts

# Manual daemon/CLI path
lares reset --force
lares serve
lares status
lares wiki list
lares promote lar:///definitely-not-real --to lar:///ha.ka.ba/@lares --yes
```

## Test Layout

- Active package tests: `packages/*/tests/`.
- Active daemon/CLI flows: `tests/lararium-tw5/`, run via `tests/bin/run-flow.sh`.
- Old HUD / memes / chats behavioral plans: `tests/chats/`.

## Do Not Re-Decide

- `@lares/cli` remains its own package.
- `@keyhive/keyhive` / concap remains the capability substrate; do not pivot to UCAN.
- `lares promote` means explicit operator ceremony, not automatic sync.
- Canonical Lares system tiddlers use `lar:///` titles.
- `<<~/sigil >>` closing tag convention (not `<<\~sigil>>`); the `/end` HTML convention holds.
- Remaining docs/history belong under `wikis/lares-history/`, not active handoff files.

## Downstream Parking Lot — Lararium TW5 `$:/` Namespace Retirement

> Added: 2026-05-14
> Status: parked downstream; do not block current Vite/plugin build tightening.

Policy direction: **our owned tiddlers SHALL live in `lar:///` space** (hosted or
hostless). `$:/` remains acceptable only when addressing TW5 core/system
contracts that TW5 itself owns.

### Actual owned `$:/` title found

Generated compatibility artifact only:

- `packages/lararium-tw5/dist-plugin/lares-memetic-wikitext.tid`
  - `title: $:/plugins/lares/memetic-wikitext`
  - Canonical artifact remains `lar:///ha.ka.ba/@lararium/plugins/lares/memetic-wikitext`.
  - Decision needed: keep as explicitly non-canonical vanilla TW5 drag/drop
    export, or remove the `$:/plugins/...` variant entirely.

### Owned `$:/` tag/config/state references to migrate

These are not source tiddler titles today, but they are Lararium-owned namespace
surface and should move to `lar:///...` contracts in a later pass:

- `$:/tags/LarariumGrammar` ← **superceded by `lar:///ha.ka.ba/tags/SharktoothSigil`** (grammar-cache.ts rewritten); retire from all remaining tiddlers in the namespace migration pass
- `$:/tags/LarariumKumu`
- `$:/tags/Lar/AhuTemplate`
- `$:/tags/Lar/AkaTemplate`
- `$:/tags/Lar/KaheaTemplate`
- `$:/tags/Lar/LoulouTemplate`
- `$:/tags/Lar/PranalaTemplate`
- `$:/tags/Lar/PranalaHeaderTemplate`
- `$:/config/Lar/MemeticRulesExcept`
- `$:/config/Lar/AhuTemplate/...`
- `$:/lararium/parse-warning/...`
- `$:/lararium/parse-warnings`
- `$:/lararium/boot-splash/active`

### TW5-owned `$:/` references that may remain

- `$:/core/...`
- `$:/tags/Global`
- `$:/palette`
- `$:/temp/*`
- `$:/StoryList`
- `$:/HistoryList`
- `$:/state/*`
- `$:/core/templates/exporters/JsonFile`

Migration warning: changing tags/config names affects filters, cascade lookup,
grammar invalidation, parser config, parse-warning routing, and boot-splash UI.
Treat this as a coordinated namespace migration with smokes, not a search/replace.
