# Lares Active Roadmap — Outstanding Work Only

> Updated: 2026-05-29 (M.3 verb-tiddler-dispatch integration gate closed; 248/248 tests)
> Branch: `feature/lararium-node-4`
> Archive source: `wikis/lares-history/last-sprint/{HANDOFF,SESSION,ROADMAP}.md`

This roadmap drops sprint archaeology. Last-sprint documents remain in history;
this file carries only open work and ordering pressure.

## Current Baseline

The branch holds: quine/core, content-addressed genesis + TW5 core boot, admin
VM, command-tiddler CLI, Keyhive concap gate, bag residency, wiki composition,
plugin-tiddler boot, sigil cascade architecture for load-bearing sigils,
save-side splitting, recursive child co-promotion, Node VM / island-thread lift,
the sigils-as-wikitext sprint (filter self-registration, md-file-router,
memetic-parser deny-list trim, `\sigil` pragma stub, `\widget ~` dispatcher,
`~aka`/`~kahea`/`~loulou`/`~pranala-header`/`~pranala` wikitext tiddlers,
5 JS widgets retired, wikirules emit macrocall nodes), T-1 wikirule
collapse (`lar-sigil.ts` single rule, deny list cleared), URI fragment
resolution on all 5 sigil tiddlers, deserializer root-iam fix,
build pipeline clear-before-rebuild, the SharktoothSigil grammar
inversion sprint (grammar-cache.ts reads `lar:///ha.ka.ba/tags/SharktoothSigil`
tiddlers, `BLOCK_CLOSERS` shrunk to 3, `GRAMMAR_NAME_MAP` retired,
`closePatternToTag()` added, 7 sigil TOML blocks removed, `sigil-kau.tid`
created), the lar:-URI namespace + mode= retirement + English alias
sprint (`mode=` retired from all sigil procedures; `$:/tags/Lar/*` →
`lar:///ha.ka.ba/tags/*`; `sigil-procedure/define/widget/function/if/for.tid`
created with `lar-see-also` cross-refs to Hawaiian equivalents; pono defs
for `ahu`, `wehe`, `heihei`, `huli`, `procedure`, `if`, `for` authored),
**and** the concurrency cluster + grammar self-hosting + kumu-device UEFN
alignment sprint (hui/holo/puka/lele sigils + 8 family tiddlers; TOML monolith
shrunk to 1 block; `FamilyRule` tiddlerization in grammar-cache.ts; `KumuListenable.verseKind`
+ `KumuSubscribable.effects`; `uefn-scene.md` architecture spec authored),
**and** the grammar self-hosting completion sprint (`meme-grammar.ts` deleted;
`grammarRulesFromText` retired; `GRAMMAR_TAG` exported from `@lararium/mesh`;
smol-toml as single TW5 library tiddler; `sigil-toml` SharktoothSigil tiddler),
**and** the shared-type extraction and decomposition pass (`mesh → tw5` dep chain
broken without keeping a separate shared-types workspace package; pure types
and isomorphic utils now live back in mesh; 164/164 tests pass), **and** the
vessel ontology scrub + S5 quine closure (command→job + peer→vessel rename;
bags docs prose scrubbed; `/api/health` + CORS deleted from `main.ts`; genesis
two-pass CID smoke-test fixed; `test:quine` script added; `pnpm test:quine`
passes — 65 SharktoothSigil tiddlers in genesis; 39/39 tests pass),
**and** G.SharktoothSigil completion confirmed (65 sigil tiddlers cover the full
vocabulary; zero active `[[sigils]]` TOML blocks remain; wild-magic property holds;
remaining monolith TOML carries documentation data tables only — Path O),
**and** S9 / lararium-browser S4 real boot confirmed (`openBrowserVessel` full boot
sequence: IndexedDBStorageAdapter, WebCrypto Ed25519 keypair, `runFoundingCeremony`
on first boot, Gates A/B/C, `broadcast()` presence, `emit("live")`. Bootstrap
artifact persists to IDB; resume boot rehydrates without re-running ceremony.
19/19 browser tests green in real Chromium via Playwright. ROADMAP Priority 1 closed.),
**and** the TW5-native unified-nalu + WikiRecipe + in-wiki cascade-routing sprint
(turn 30 — yin-collapse law in code: `nalu-engine` startup module owns the unified
queue across all bags + one `wiki.transact()` per frame; `IslandAdaptor` narrowed
to membrane; `WikiRecipe { wikiSlug, canonBags? }` is the one-model recipe for every
wiki; write routing moved from TS prefix code into the wiki via
`lar:///ha.ka.ba/@lararium/config/bag-paths` cascade tiddler; `IslandAccumulator` /
`kernel.applyDelta` / frame-ack / `BagBinding` / `BAG_IDS.scratch+projection+draft` /
`IslandBehavior.writeBagId` / `ProjectionStore` all retired; `ADMIN_BAG_ID` aligned to
`lar:///ha.ka.ba/@admin`; 227/227 tests in node-side packages, browser 19/20
unchanged from pre-pivot).

Do not re-open those arcs unless a test proves drift.

## Planning Law

These planning docs follow one architectural law:

- Browser vessels and node vessels share one operator-vessel contract.
- Every vessel writes local intent first, then syncs over the mesh.
- Capability proof checks happen on the invoking vessel before edge work.
- Verb invocations stay vessel-local scratch; outcome tiddlers carry the durable shared aftermath.
- Node-only behavior counts as edge adaptation, not authority.
- Roadmap order favors vessel-law closure before product-side expansion.
- "vessel" names the lararium identity-and-runtime unit; "peer" names only an Automerge-layer sync participant. Never use "peer" for a lararium vessel.
- "ea" names the sovereignty breath of a vessel — its right to hold, author, and sync its own causal state. "heartbeat" does not carry this meaning and MUST NOT substitute for it.

## Active Priority Order

| Priority | Path | Status | Outcome |
|---|---|---|---|
| — | **T-1** | ✅ Done | `lar-sigil.ts` single rule; deny list cleared; stale build artifacts purged. |
| — | **~ahu** | ✅ Done | `ahu.ts` retired to `sigil-ahu.tid`. |
| — | **~kau** | ✅ Done | `kau.ts` + `render-modes.ts` deleted; `\widget ~kau` + template cascade in `sigil-kau.tid`. Zero JS sigil widgets remain. |
| — | **SharktoothSigil inversion** | ✅ Done | `grammar-cache.ts` reads `lar:///ha.ka.ba/tags/SharktoothSigil` tiddler fields; 7 TOML blocks removed. |
| — | **lar: URI + mode= retirement** | ✅ Done | `$:/tags/Lar/*` → `lar:///ha.ka.ba/tags/*`; `mode=` retired from all sigil procedures; English alias sigils + pono defs authored. |
| — | **Concurrency cluster + grammar self-hosting** | ✅ Done | hui/holo/puka/lele + 8 family tiddlers; TOML monolith = 1 block; wild-magic property holds. |
| — | **Grammar self-hosting completion** | ✅ Done | `meme-grammar.ts` deleted; `grammarRulesFromText` retired; `GRAMMAR_TAG` in `@lararium/mesh`; smol-toml library tiddler; `sigil-toml` SharktoothSigil tiddler; TOML fallback parse path gone. |
| — | **Shared-type decomposition** | ✅ Done | `mesh → tw5` dep chain broken; dissolved temporary shared-types references; shared contracts live in `@lararium/mesh`; 164/164 tests pass. |
| — | **S5 Quine + vessel scrub** | ✅ Done | `pnpm test:quine` passes — 65 SharktoothSigil tiddlers in genesis; peer→vessel prose scrub; `/api/health` + CORS deleted; 39/39 tests. |
| — | **P / Operator-vessel contract** | ✅ Done (docs layer) | `lar-vessel.md` + `open-vessel.md` scrubbed; vocabulary split defined; "vessel" is the lararium runtime unit. `dreamnet-architecture.md` + `kahu.md` authored — five-layer topology locked, kahu role approved. Code layer follows in S9. |
| — | **G.SharktoothSigil** | ✅ Done | 65 sigil tiddlers cover the full vocabulary; `grammar-cache.ts` reads SharktoothSigil-tagged tiddlers only; zero active `[[sigils]]` TOML blocks remain in the monolith. Remaining TOML: documentation data tables (`[[control-slot]]`, `[[lifecycle_values]]`, `[[ladder_5]]`, `[[stances]]`) — corpus hygiene, not grammar migration. |
| — | **lararium-browser S2 + bag-URI YIN** | ✅ Done | island-protocol.ts moved node→mesh (was island-protocol.ts); IslandKernel isomorphic; @lararium/browser scaffolded (S0–S3 architecture landed); bags/ URI schema unified to `@bag/v0.1/lane/rest` everywhere; stale tsc artifacts purged; 188/188 tests. |
| — | **Island Sovereignty Law + GP-3 deprecation sprint** | ✅ Done | Isomorphic law (7+1 clauses) in island-protocol.ts (was island-protocol.ts). BrowserVmManager + browser-wiki-worker.ts fully implemented (Repo-in-Vessel island, rAF+Safari fallback, docBytes teardown). NodeVmManager wired (MessageChannel per island, mainPort.close law, docBytes capture). All GP-3 oracle paths carry superseded markers. 192/192 tests. |
| — | **GP-3 node gate + deletion** | ✅ Done | `repo-in-island.test.ts` (3 tests) passes. `_subscribeDocChanges`, `routeChangeset`, `changesetQueue`, `awaitingAck`, `unsubChange`, `mkFrame` import deleted. NodeVmManager passes `docHandle.url` as `docUrl`. 195/195 green. |
| — | **Identity lattice + keyhive founding ceremony** | ✅ Done | `runFoundingCeremony`, `runDeviceAdmitCore`, `runApplyAdmitPayload` extracted isomorphic into `@lararium/keyhive`. Three-gate lattice A/B/C holds. Two-vessel e2e test (`two-vessel-mesh.test.ts`) 9/9. `lares device-admit` + `lares invite` CLI commands wired. |
| — | **GP-3 browser gate + deletion** | ✅ Done | `browser-repo-in-island.test.ts` (2 tests) passes: cold-boot + docUrl non-null (federation seam open). `browser-wiki-worker.ts` carries no GP-3 fallback. Protocol layer: stale `mkFrame` removed. Stale `mode: "cold"` tests removed. 5/5 browser tests green. (Note: `IslandMsg_FrameAck` itself fully retired in turn 30 — see unified-nalu sprint.) |
| — | **Pono federation pattern** | ✅ Done | `coreBlob: Uint8Array` evicted from `IslandMsg_Manifest`. Boot order inverted in both sovereign island models: Repo first, `handle.whenReady()`, read `blobs[ENGINE_CORE_ID]` from `@lararium` CRDT doc, `mkFault` if absent, `bootTw5` last. `laraiumDocUrl` required on `VesselIslandPool` — `@lararium` binding prepended per island. `blob-sovereignty.test.ts` gates §6. N×island federation O(CRDT-sync). 195/195 tests. |
| — | **YIN ontology + typo closure** | ✅ Done | `runSovereignisland` → `runSovereignWorker` in 3 entry files. `worker: island` → `worker: Worker`. `node-vm-manager.test.ts` → `vessel-island-pool.test.ts`. `vm-manager-echo.mjs` → `vm-pool-echo.mjs`. Fixture binding resolution uses `b.writable`. 195/195. |
| — | **§8 archipelago gate** | ✅ Done | `federation-seam.test.ts` (2 tests): bidirectional in-process Repo pair via `MessageChannelNetworkAdapter`. Island Sovereignty Law §8 written. Gate proof cites node + browser (`browser-repo-in-island.test.ts` test 2). 196/196 tests. |
| — | **S9 / lararium-browser S4 real boot** | ✅ Done | `openBrowserVessel`: WebCrypto Ed25519 keypair (IDB-persisted), `runFoundingCeremony` isomorphic (Buffer→btoa/atob in `ceremony-core.ts` + `admin-event-store.ts`), Gates A/B/C verified in real Chromium, `docHandle.broadcast()` wired. `browser-operator-key.ts` + `open-browser-vessel.ts` + `BrowserVesselIslandPoolOptions.workerScriptUrl` optional. `browser-founding-ceremony.test.ts` 7/7 Playwright. 19/19 browser tests. |
| — | **L / S7.4** | ✅ Done | `AdminAuthGate`: lar:challenge/lar:auth WebSocket handshake; `accessForDoc` concap gate; `peerIdentifierMap` + `queueMicrotask` race fix; MAX_PENDING + contactCard cap + timeout hardening. TODO L.2 (nonce signing) deferred — alpha posture acceptable, see M sprint. 59/59 tests. |
| — | **M.1 / reaction-graph rename + vessel wires** | ✅ Done | `live-protocol.ts` → `reaction-graph.ts` (scope claim: within-island only). M.1 node wire: `eventBus.subscribe("worker.event")` → `adminVm.placeVerb()` after `workerEa`. M.1 browser wire: `onWorkerEvent` → `admin.placeVerb()`. `ReactionGraph` 26-test suite added. Mesh build + tw5 plugin rebuild clean. 243/243 tests. |
| — | **M.2 / verb-as-tiddler-field pipeline** | ✅ Done | `VerbInvocation` gains `fromUri`/`listenable`; `reaction-router.ts` extended with `_verbsByUri` map + verb-field dispatch; `IslandMsg_Event.payload` enriched; `event-routing.test.ts` (3 tests). 246/246 tests. |
| — | **M.3 / full-TW5-boot reaction gate** | ✅ Done | `verb-tiddler-dispatch.test.ts` (2 tests) proves end-to-end: verb-carrying tiddler lands via CRDT → reaction-router nalu fires → `tm-verse-event` → `IslandMsg_Event` with `payload.verb === "promote"` at vessel. Root fix: `declare const $tw` ambient in `reaction-router.ts` + `grammar-cache.ts` — TW5's `evalSandboxed` runs in `vm.createContext({})` where `globalThis.$tw` is undefined; `$tw` parameter injection works. Genesis rebuilt (sha=a3b926…). 248/248 tests. |
| — | **TW5-native unified nalu + WikiRecipe + in-wiki cascade routing** | ✅ Done | `nalu-engine` startup module owns unified queue + frame-aligned drain + one `wiki.transact()` per frame. IslandAdaptor narrowed to membrane (forward `LarTiddlerChange` → `$tw.lares.enqueueNalu` + cross-bag tombstone). One-model `WikiRecipe { wikiSlug, canonBags? }` for every wiki; manifest carries `recipe + resolver` instead of `bagBindings[]`. Write routing moved into the wiki via `lar:///ha.ka.ba/@lararium/config/bag-paths` cascade tiddler — `IslandAdaptor._routeBag` walks `wiki.filterTiddlers` mirroring TW5's `$:/config/FileSystemPaths` pattern. Shadow-tiddler semantics confirmed (multi-bag occupancy by design). Retired: `IslandAccumulator`, `kernel.applyDelta`, frame-ack message, `vm-island-bridge`, `startRenderLoop`, `extractTiddlerDeltaFromPatches`, `allTiddlersFromDoc`, `ProjectionStore` alias, `BAG_IDS.scratch/projection/draft`, `BagBinding`, `IslandBehavior.writeBagId`, `routeWrite()`. `ADMIN_BAG_ID` aligned to `lar:///ha.ka.ba/@admin`. Memes: deleted `island-accumulator.md`, rewrote `island-adaptor.md`, updated `nalu.md`, wrote `nalu-engine.md`. 227/227 tests (mesh 96 + tw5 67 + node 64). Browser 19/20 (pre-existing TW5-boot shim gap, unrelated). |
| 1 | **M / Local intent bridge** | ⬜ Next | M.1–M.3 closed. Remaining: (b) author first real wiki device tiddler (`promote-button`) in genesis that fires `reaction:listenable` edge carrying an ACTION verb (see Priority 2 — `MOVE` likely replaces the old `verb: "promote"` framing); (c) stdio bridge for CLI/daemon local intent path. |
| 2 | **Residency Model Epic** | ⬜ Active | Coordinate-space + query-plan architecture. SPARQL ALL-CAPS ACTION verbs (`ADD COPY MOVE CLEAR DROP LOAD`) + archival audit annotations (`accession deaccession transfer withdrawal …`). Memetic intent: [residency-model.md](../bags/@lares/v0.1/api/lararium/residency-model.md). Sprint plan: [EPIC-RESIDENCY-MODEL.md](EPIC-RESIDENCY-MODEL.md). Sprint 1 ✅ closed 2026-05-30 (memetic intent + reconciliation). Sprints 2–10 queued. |
| 4 | **K / F-arc** | ⬜ Next | TW5 save routing, debounce, projection hygiene for sustained editing across shared peer surfaces. |
| 5 | **R** | ⧾ Verify first | ReactionEngine wiring: changeset application, changed-URI derivation, `RE.onChangeset`, integration tests. |
| 6 | **N** | ⬜ UI shim | `<$lar-action>` widget writes a verb-tiddler carrying an ACTION verb (ADD/COPY/MOVE/CLEAR/DROP/LOAD) — same command-tiddler shape that `lares act` CLI authors. Reflects Residency Model Epic (Priority 2). |
| 7 | **O** | ⬜ Corpus hygiene | Author scaffolded heleuma stubs; keep `lares heleuma --write` aligned. Migrate monolith documentation TOML tables to canonical bag memes. Add `Content-Security-Policy: worker-src 'self'` to Caddyfile and Docker serving layer before any browser vessel goes to production (see `bags/@lararium/v0.1/browser/pono-charter.md` BV-9). |
| 10 | **UEFN scene importer** | ⬜ Queued | .verse class defs + .umap placements + DEB wires → bag of tiddlers + edges. Spec: `bags/@lares/v0.1/api/pono/uefn-scene.md`. |

## Test Flow Harness

- `pnpm test:unit` — package-local Jest suites.
- `pnpm test:flows` — top-level isolated integration flows.
- `pnpm test:tw5-flow` — direct TW5 sync/decompose/promote flow.
- `pnpm --filter @lararium/tw5 exec tsx scripts/smoke-plugin-boot.ts` — plugin
  boot smoke (shadow tiddlers + deserializer probes; all sigil widgets are TW5-native).

## Path ~ahu — Done

`ahu.ts` retired to `tiddlers/sigil-ahu.tid`. `lar-sigil.ts` emits the wikitext child-slot summons path; smoke now checks the sigil tiddler and keeps render probes in integration flow tests.

## Path K — TW5 Routing, Debounce, Projection Hygiene

Goal: live wiki authoring safe under sustained operator editing on any operator peer.

- [ ] Route `$:/state/*` writes to the projection layer, not durable canon/draft.
- [ ] Route `Draft of *` tiddlers to the per-wiki draft bag.
- [ ] Add 300–500ms capture debounce in `MemeSyncAdaptor` / save path.
- [ ] Add idle auto-truncate for noisy projection state.
- [ ] Keep disk sync, CRDT inbound, TW5 UX save, and disk export on the same
      parser/split law.

## Path L — Admin Doc Ingress Trust Gate

Goal: operator vessels federate infrastructure state; non-operator vessels cannot; invalid intent gets rejected before edge work.

- [ ] Gate admin-doc WebSocket ingress on Keyhive `cap=admin` proof.
- [ ] Operator devices only; room peers rejected.
- [ ] Preserve job/receipt coordination surface.
- [ ] Negative smoke: non-infrastructure peer cannot sync admin state.

## Path P — Shared Operator-Vessel Contract

Goal: make all active plan text, boot surfaces, and ceremony docs describe one vessel-shaped architecture instead of a node-centered topology.

- [ ] Write one canonical operator-vessel contract spanning browser vessel and node vessel.
- [ ] Define admin-lane versus active-wiki-lane responsibilities in the package docs.
- [ ] Mark node-only behavior as edge adaptation, not authority law.
- [ ] Add one architecture narrative or diagram that shows the shared lane topology.
- [ ] Remove active planning text that treats node as the default authority center.

Exit criteria:

- browser and node docs read as budget variants of the same vessel
- no active planning doc treats server or node as privileged truth holder

## Path G.SharktoothSigil — ✅ Done

65 SharktoothSigil tiddlers cover the full sigil vocabulary. `grammar-cache.ts`
reads only `lar:///ha.ka.ba/tags/SharktoothSigil`-tagged tiddlers. Zero active
`[[sigils]]` TOML array blocks remain in `memetic-wikitext.tid`. The wild-magic
property holds: adding a sigil means tagging a tiddler; no code change required.

Remaining TOML in the monolith carries documentation data tables only — not grammar:

| Table | Rows | Canonical home |
|---|---|---|
| `[[control-slot]]` | 9 | sourced in `carrier-codec.ts`; inline doc only |
| `[[lifecycle_values]]` | 5 | migrate to pranala bag meme (Path O) |
| `[[ladder_5]]` / `[[ooda_ha_5]]` | 10 | migrate to `bags/@lares/v0.1/api/pono/` (Path O) |
| `[[stances]]` | partial | migrate to stances/syad meme docs (Path O) |

These tables do not feed `grammar-cache.ts`. Migration to bag memes deferred to Path O.

## GP-3 Deprecation Completion Arc

All sites marked `removed GP-3 oracle path` form one removal arc.

**Node gate: ✅ PASSED + DELETED** — 195/195 green.
`routeChangeset`, `changesetQueue`, `_subscribeDocChanges`, `awaitingAck`, `unsubChange` gone.
`NodeVmManager` sends `bagBindings` per-bag (each `BagMode.relational` entry carries a live `AutomergeUrl`).

**Node vessel remnants — ✅ ALL CLEARED:**
- [x] GP-3 fallback `changeset` handler in `lar-wiki-worker.ts` — DELETED.
- [x] `VmSnapshot.tiddlers[]` field — DELETED. `VmSnapshot` is now `{ heads, docBytes?, capturedAt }`.

**Browser gate: ✅ PASSED + DELETED** — 5/5 browser tests green.
`browser-wiki-worker.ts` carries no GP-3 fallback. `browser-sovereign-island-model.ts` handles manifest/teardown only.
`docUrl` non-null test in `browser-repo-in-island.test.ts` (test 2) proves federation seam open.

**Browser vessel remnants — ✅ ALL CLEARED:**
- [x] GP-3 fallback `changeset` handler in `browser-wiki-worker.ts` — never existed (built clean from S19).
- [x] Stale subscription name `"changeset-subscription"` in teardown fixtures → `"doc-handle"`.
- [x] Stale `mode: "cold"` BagBinding tests in `island-protocol.test.ts` — removed.
- [x] `worker-lifecycle.test.ts` — no GP-3 changeset test (built clean from S19).

Protocol layer — ✅ ALL CLEARED (both gates passed):
- [x] `IslandMsg_FrameAck` interface and type union entry — DELETED (node gate sprint).
- [x] `mkFrame` factory — DELETED (node gate sprint).
- [x] `IslandMsg_TeardownAck.snapshotTiddlers` field — DELETED.
- [x] `snapshotTiddlers` param from `mkTeardownAck` opts — DELETED.
- [x] Stale `mode: "cold"` BagBinding tests in `island-protocol.test.ts` — REMOVED.
- [x] `frame:ack` message type entirely retired (turn 30 unified-nalu sprint) — drain timing now lives in the in-wiki nalu engine; vessel does not observe frame ticks. Type guard, factory, fixture sends all removed.
- [x] `BagBinding` type retired (turn 30) — replaced by `WikiRecipe + resolver` in `IslandMsg_Manifest`.

**`docUrl` non-null gate (federation seam) — ✅ DONE:**
`federation-seam.test.ts` proves the door bidirectionally. Island Sovereignty Law §8 written.
`browser-repo-in-island.test.ts` test 2 proves the browser path. Both gates closed.

## Path R — ReactionEngine Completion

Goal: one reactive wiki tick per hot-tier wiki, Verse-compatible for alpha.

Invariants:
1. TW5Engine and ReactionEngine co-locate in the same hot-tier island.
2. MemeSyncAdaptor applies changeset first; RE runs second.
3. RE writes through composite store, never directly through `docHandle.change()`.
4. Device graph derives from wiki tiddlers/pranala edges.
5. Cold-tier slots have no RE.

- [ ] Confirm worker-side changeset application (local Automerge replica vs placeholder URIs).
- [ ] Derive changed URI sets from real changesets → `ReactionEngine.onChangeset`.
- [ ] Expand NodeVmManager integration tests: mount → route → event-forward → unmount.
- [ ] Verify teardown snapshot captures heads + tiddlers atomically.
- [ ] Keep piscina only for stateless parse work; stateful hot wikis stay in dedicated islands.

## Near-Future Product / UX Paths

| Path | Status | Trigger |
|---|---|---|
| **Tier 2 aka preview** | ⬜ Deferred | Node-side OG metadata fetch → `thumbnail`/`og-title`/`og-description` fields. Home: `disk-projector.ts` or `og-metadata-fetcher.ts`. Design record at `bags/@lararium/v0.1/tw5/sigil-aka.md`. |
| **M / Dreamdeck-app** | ⬜ Queued | After admin ingress gate; picks up same-machine peer consolidation deferred from S6.C.5. |
| **S9 / lararium-browser** | 🔶 S4 done | S0–S4 landed. Charter holds. S5 (genesis island in browser, TW5 boot) deferred to dreamdeck-app sprint. |
| **S10 / dreamdeck-tldraw** | ⬜ Queued | tldraw shapes as `lar://` resource containers; edge types first-class. |
| **S11 / dreamdeck-app** | ⬜ Queued | React shell; TW5 + canvas composition; no protocol logic in app layer. |
| **W / CodeMirror 6 + Lezer + LSP** | ⬜ Downstream | After CLI/live wiki authoring stabilizes. |

## Deferred / Research Shelf

- Kowloon Bridge: `KowloonOutbox` draft queue + `KowloonInbox` feed mirror; `elyncia.app` deployment.
- Seitan token circle invites.
- Federated promotion conflict handling between lararia.
- Subduction evaluation for lararium↔lararium federation once shared operator-vessel parity exists.
- Speculative RE execution, rollback, metered/gas execution.
- Wikifier polish: DOCTYPE comment and dash-table round-trip diffs.
- `\sigil` pragma full implementation (parameter schema, pattern, close-pattern, handler field) — may fold into SharktoothSigil tiddler authoring flow directly.
- `~kau` Keyhive UCAN resource + UUID write-back — deferred to action tiddlers when Keyhive WASM lands; widget render path complete.

## Small Open Items

- `heleuma` drift detection should include `uri-path`, not only `file-path`.
- Job-inbox tombstone and volatile job deletion still split across edge and VM paths; decide whether the VM should own the whole retirement rite after audit write.
- Cosmetic legacy names in a few logs/strings (`room` vs `wiki`).
- Some generated/source-file memes still need human-authored content beyond scaffolds.
- `aka`/`kahea` markdown-meme cascade entries: ship `aka-cascade-markdown-meme.tid` and `kahea-cascade-markdown-meme.tid` with appropriate disk-export templates.
