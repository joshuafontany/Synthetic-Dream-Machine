# Lares Handoff — Active Work Only

> Updated: 2026-05-21 (turn 18)
> Branch: `feature/lararium-node-4`
> Last sprint archive: `wikis/lares-history/last-sprint/`

## Bootstrap Paste

```text
Resume from packages/HANDOFF.md and packages/ROADMAP.md.

Current baseline: quine/genesis, TW5 content-addressed core boot, admin VM,
command-tiddler CLI, Keyhive concap, bag residency, wiki composition,
plugin-tiddler boot, sigil cascade architecture, save-side split, recursive
child co-promotion, Node VM / worker-thread lift, full sigils-as-wikitext
sprint (T-1 wikirule collapse, URI fragment resolution, ahu.ts retirement,
deserializer root-iam fix, build pipeline clear-before-rebuild),
SharktoothSigil grammar inversion + aka/kahea mode= collapse sprint,
lar:-URI namespace + mode= retirement + English alias sigil sprint,
concurrency sigil cluster + grammar self-hosting + kumu-device UEFN alignment
sprint, AND the kau.ts → TW5-native wikitext migration (kau.ts + render-modes.ts
deleted; \widget ~kau + template cascade in sigil-kau.tid; zero JS sigil widgets
remain), AND the Verse ontology + yin-collapse architecture sprint (nalu.md,
hoolele.md, verse-task-tree.md, verse-type-lattice.md; six-operator ontology
complete; TW5 wiki declared primary reactive engine; one graph not two; fireSync
gap documented; sigil-tick.tid stub registered), AND the grammar self-hosting
completion sprint (smol-toml as TW5 library tiddler; sigil-toml SharktoothSigil
tiddler; meme-grammar.ts deleted; GRAMMAR_TAG exported from @lararium/mesh;
grammarRulesFromText fully retired), AND the Verse polychronous CRDT mesh sprint
(meme-sync-adaptor.ts deleted; IslandAdaptor + IslandAccumulator replace it;
$tw.syncer provably dead; N-accumulator flushAll + startRenderLoop wired;
verse-mesh.md + island-adaptor.md + island-accumulator.md memes captured;
48/48 tests pass), AND the vessel ontology scrub + S5 quine closure sprint
(command→job + peer→vessel rename complete; lar-vessel.md + open-vessel.md prose
scrubbed with Automerge-peer / lararium-vessel vocabulary split; /api/health
HTTP endpoint + CORS header deleted from main.ts; build-genesis-island.ts
two-pass CID injection smoke-test fixed; test-quine.ts shadow-filter fix;
`pnpm --filter @lararium/node test:quine` passes — 65 SharktoothSigil grammar
tiddlers self-hosted in genesis artifact; 39/39 tests pass) are treated as
landed unless tests prove drift.

Next work, in order:
1. Path L / S7.4: admin-doc ingress trust gate via Keyhive cap=infrastructure.
2. S9 / lararium-browser: browser vessel on same operator-vessel contract — Automerge,
   IndexedDB, presence, optional OPFS.
3. Path K / F-arc: IslandAdaptor.saveTiddler debounce + projection auto-truncate.
4. UEFN scene importer — DEFERRED until after successful browser vessel e2e tests.
   Spec exists at bags/@lares/api/v0.1/pono/uefn-scene.md; do not begin import
   pipeline until browser vessel e2e passes.

Path G.SharktoothSigil: COMPLETE. 65 sigil tiddlers landed; grammar-cache.ts reads
SharktoothSigil-tagged tiddlers only; zero active [[sigils]] TOML blocks remain.
Remaining TOML in memetic-wikitext.tid carries documentation data tables only
(control-slot, lifecycle_values, ladder_5, stances) — corpus hygiene, Path O.

Completed this turn (2026-05-17 turn 14):
- shared-type extraction later decomposed back into @lararium/mesh; mesh ↔ tw5 dep chain remains broken without keeping a separate shared-types package.
- 164/164 tests pass; all four packages typecheck clean.

Rules: preserve TW5 VM primacy, bag=Automerge-doc=sync-boundary, no HTTP/RPC
coordination surface, and explicit operator promotion for canon. Web3 only —
no web2 models/code/flows in Lares stack.
```

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

`bags/@lararium/mesh/v0.1/lar-vessel.md`:
- TOML `role` field updated to "vessel"
- `# Lar Peer` → `# Lar Vessel`
- New `## Vocabulary` section: Automerge-layer "peer" vs lararium-layer "vessel" defined in two sentences
- LP-1 renamed "Vessel before server"; body: "A Lararium vessel models itself as a participant in a causal mesh — not a server that clients connect to."
- LP-2 through LP-5, shape section, ceremony section: "peer" → "vessel" throughout

`bags/@lararium/mesh/v0.1/open-vessel.md`:
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

**Spec meme:** `bags/@lares/api/v0.1/lararium/save-path.md`
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
- `bags/@lares/docs/lararium/verse-mesh.md` — Verse polychronous CRDT mesh design:
  peer-owns-bags law, N local clocks (Signal/INRIA Berry 1991 model), VM pool (live/warm
  slots), camera model (Story River first, TLDraw.js second, many more), visibility gate
  (future), tick sources by platform, wiring law (`store.addProjection` for both siblings).
- `bags/@lares/api/v0.1/lararium/island-adaptor.md` — invariant spec I-1 through I-8:
  echo-loop guard, island isolation, single transact per flush, post-sync pass-through,
  non-CRDT immediate apply, outbound guards, cross-bag tombstone resolution, child cleanup.
- `bags/@lares/api/v0.1/lararium/island-accumulator.md` — invariant spec A-1 through A-5:
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
- `bags/@lararium/tw5/lib-smol-toml.md` — bag anchor meme at the library tiddler URI.

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
  removed inline `re.onChangeset()` from changeset handler. Worker now forwards
  `tm-verse-event` wiki events → `WorkerMsg_Event` to main thread.
- `bags/@lares/api/v0.1/pono/reaction-graph.md` — yin-collapse target section updated
  to "Landed"; fireSync gap section updated to "CLOSED".

**Metrics:** typecheck clean; 126/126 tests pass; 17 Vite plugin modules (was 16);
smoke boot clean. All probes pass.

---

## What Changed This Turn (2026-05-15 turn 7)

### Verse Ontology + Yin-Collapse Architecture Research Sprint

**New pono specs (bags/@lares/api/v0.1/pono/):**
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

**Updated docs:** `bags/@lares/api/v0.1/pono/kau.md`, `bags/@lararium/tw5/widgets/kau.md`, `memetic-wikitext.tid` render-modes note, `lar-sigil-shared.ts` comment, ROADMAP.

**Build:** typecheck clean; 16 Vite modules (was 17); 114 inner tiddlers; 38 shadow tiddlers in smoke; all probes pass.

---

## What Changed This Turn (2026-05-15 turn 5)

### Concurrency Sigil Cluster + Grammar Self-Hosting + kumu-device UEFN Alignment

**New pono specs (bags/@lares/api/v0.1/pono/):**
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

Ship the next alpha stability layer for live wiki authoring and operator-device
federation. The sigils-as-wikitext sprint clears JS surface area and hardens
the TW5 wikitext dispatch chain for the remaining sigil vocabulary.

### Path T-1 / ~ahu — Done

`lar-sigil.ts` now owns the collapsed block+inline wikirule. `ahu.ts` has been
retired to `sigil-ahu.tid`; the boot smoke checks the wikitext sigil tiddler
and leaves rendered sigil behavior to integration flow tests.

### Path K / F-arc — Save Path Hygiene

- `$:/state/*` → projection layer, not durable canon/draft.
- `Draft of *` → per-wiki draft bag.
- 300–500ms debounce in `IslandAdaptor.saveTiddler` (was MemeSyncAdaptor — renamed).
- Idle auto-truncate for noisy projection state.
- Single parser/split law across disk sync, CRDT inbound, TW5 UX save, disk export.

### Path L / S7.4 — Admin Doc Trust Gate

- Gate admin-doc WebSocket ingress on Keyhive `cap=infrastructure` proof.
- Operator-owned devices only; room peers rejected.
- Preserve command-tiddler coordination surface.
- Add positive + negative smokes.

### Path G.SharktoothSigil — Remaining Sigil Vocabulary

48 TOML `[[sigils]]` blocks remain in `memetic-wikitext.tid`. Each migrates
to a SharktoothSigil tiddler (`lar-*` fields + `\widget` wikitext body). When
all migrate, the TOML shrinks to families-only and the grammar monolith dissolves.

Migration order by operator impact (see ROADMAP for talk-story per category):
1. Block-container sigils with `close_pattern` (wehe, meme, hui, heihei, wai, huli, puka)
2. Scope/binding sigils (\let, \var, \const, waiho)
3. Concurrency sigils (\sync, \race, \rush)
4. OODA-HA narrative sigils (lele, papalohe, pae) — Path G.rest renamed into this arc
5. Control/conditional sigils (\if, \else, \elif, \for) — wikitext \procedure bodies
6. Pragma/declaration sigils (\procedure, \define, \widget, \type) — TW5 shadow forms
7. Remaining edge/data/device sigils (kumu, \widget, toml, etc.)

`mode=` aligns across all: live = current rendering posture, shadow = frozen/projection.
Any sigil with a shadow template variant gets `aka`-style behavior automatically.

### Path R — Verify Before Extending

Inspect `node-vm-manager.ts`, `lar-wiki-worker.ts`, and tests before coding:
- Does the Worker apply real Automerge changesets locally?
- Does `routeChangeset()` derive added/deleted URI sets from real changes?
- Does `ReactionEngine.onChangeset()` run after TW5 state updates in Worker?
- Do tests cover mount, route, event-forward, unmount, snapshot capture?

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
