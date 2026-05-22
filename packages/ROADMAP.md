# Lares Active Roadmap — Outstanding Work Only

> Updated: 2026-05-21 (turn 18)
> Branch: `feature/lararium-node-4`
> Archive source: `wikis/lares-history/last-sprint/{HANDOFF,SESSION,ROADMAP}.md`

This roadmap drops sprint archaeology. Last-sprint documents remain in history;
this file carries only open work and ordering pressure.

## Current Baseline

The branch holds: quine/core, content-addressed genesis + TW5 core boot, admin
VM, command-tiddler CLI, Keyhive concap gate, bag residency, wiki composition,
plugin-tiddler boot, sigil cascade architecture for load-bearing sigils,
save-side splitting, recursive child co-promotion, Node VM / worker-thread lift,
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
remaining monolith TOML carries documentation data tables only — Path O).

Do not re-open those arcs unless a test proves drift.

## Planning Law

These planning docs follow one architectural law:

- Browser vessels and node vessels share one operator-vessel contract.
- Every vessel writes local intent first, then syncs over the mesh.
- Capability proof checks happen on the invoking vessel before edge work.
- Job tiddlers stay vessel-local scratch; receipt tiddlers carry the durable shared aftermath.
- Node-only behavior counts as edge adaptation, not authority.
- Roadmap order favors vessel-law closure before product-side expansion.
- "peer" names an Automerge sync participant; "vessel" names the lararium identity-and-runtime unit.

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
| — | **P / Operator-vessel contract** | ✅ Done (docs layer) | `lar-vessel.md` + `open-vessel.md` scrubbed; vocabulary split defined; "vessel" is the lararium runtime unit. Code layer follows in S9. |
| — | **G.SharktoothSigil** | ✅ Done | 65 sigil tiddlers cover the full vocabulary; `grammar-cache.ts` reads SharktoothSigil-tagged tiddlers only; zero active `[[sigils]]` TOML blocks remain in the monolith. Remaining TOML: documentation data tables (`[[control-slot]]`, `[[lifecycle_values]]`, `[[ladder_5]]`, `[[stances]]`) — corpus hygiene, not grammar migration. |
| 1 | **L / S7.4** | ⬜ Next | Admin-doc ingress trust gate: operator devices with `cap=infrastructure` only; prove local capability rejection before edge work. |
| 2 | **S9 / lararium-browser** | ⬜ Active (S0 charter+deletion-map landed) | Full browser vessel, detached worker-authority pool. Charter: `bags/@lararium/browser/v0.1/pono-charter.md`. Sprint braid S0–S9 in `bags/@lararium/browser/v0.1/full-detached-worker-authority-pool-sprint.md`. |
| 3 | **M / Local intent bridge** | ⬜ Next | Finish shared job/receipt contracts; keep ceremony meaning in the TW5 VM pool; treat transports as edge adaptation, not authority. |
| 4 | **K / F-arc** | ⬜ Next | TW5 save routing, debounce, projection hygiene for sustained editing across shared peer surfaces. |
| 5 | **R** | ⧾ Verify first | ReactionEngine wiring: changeset application, changed-URI derivation, `RE.onChangeset`, integration tests. |
| 6 | **N** | ⬜ UI shim | `<$lar-promote>` action-widget writes the same command-tiddler as CLI promote. |
| 7 | **O** | ⬜ Corpus hygiene | Author scaffolded heleuma stubs; keep `lares heleuma --write` aligned. Migrate monolith documentation TOML tables to canonical bag memes. |
| 10 | **UEFN scene importer** | ⬜ Queued | .verse class defs + .umap placements + DEB wires → bag of tiddlers + edges. Spec: `bags/@lares/api/v0.1/pono/uefn-scene.md`. |

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

- [ ] Gate admin-doc WebSocket ingress on Keyhive `cap=infrastructure` proof.
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
| `[[ladder_5]]` / `[[ooda_ha_5]]` | 10 | migrate to `bags/@lares/api/v0.1/pono/` (Path O) |
| `[[stances]]` | partial | migrate to stances/syad meme docs (Path O) |

These tables do not feed `grammar-cache.ts`. Migration to bag memes deferred to Path O.

## Path R — ReactionEngine Completion

Goal: one reactive wiki tick per hot-tier wiki, Verse-compatible for alpha.

Invariants:
1. TW5Engine and ReactionEngine co-locate in the same hot-tier Worker.
2. MemeSyncAdaptor applies changeset first; RE runs second.
3. RE writes through composite store, never directly through `docHandle.change()`.
4. Device graph derives from wiki tiddlers/pranala edges.
5. Cold-tier slots have no RE.

- [ ] Confirm worker-side changeset application (local Automerge replica vs placeholder URIs).
- [ ] Derive changed URI sets from real changesets → `ReactionEngine.onChangeset`.
- [ ] Expand NodeVmManager integration tests: mount → route → event-forward → unmount.
- [ ] Verify teardown snapshot captures heads + tiddlers atomically.
- [ ] Keep piscina only for stateless parse work; stateful hot wikis stay in dedicated Workers.

## Near-Future Product / UX Paths

| Path | Status | Trigger |
|---|---|---|
| **Tier 2 aka preview** | ⬜ Deferred | Node-side OG metadata fetch → `thumbnail`/`og-title`/`og-description` fields. Home: `disk-projector.ts` or `og-metadata-fetcher.ts`. Design record at `bags/@lararium/tw5/sigil-aka.md`. |
| **M / Dreamdeck-app** | ⬜ Queued | After admin ingress gate; picks up same-machine peer consolidation deferred from S6.C.5. |
| **S9 / lararium-browser** | ⬜ Active | See path S9 above. S0 landed. |
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
