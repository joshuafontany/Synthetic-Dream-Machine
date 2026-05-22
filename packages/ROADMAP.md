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
passes — 65 SharktoothSigil tiddlers in genesis; 39/39 tests pass).

Do not re-open those arcs unless a test proves drift.

## Planning Law

These planning docs follow one architectural law:

- Browser vessels and node vessels share one operator-vessel contract.
- Every vessel writes local intent first, then syncs over the mesh.
- Capability proof checks happen on the invoking vessel before edge work.
- Command tiddlers and receipt tiddlers remain the durable ceremony spine.
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
| 1 | **L / S7.4** | ⬜ Next | Admin-doc ingress trust gate: operator devices with `cap=infrastructure` only; prove local capability rejection before edge work. |
| 2 | **S9 / lararium-browser** | ⬜ Next | Full browser vessel on the same operator-vessel contract: Automerge, IndexedDB, presence, optional OPFS. |
| 3 | **M / Local intent bridge** | ⬜ Next | Finish shared command/receipt contracts; keep ceremony meaning in the TW5 VM pool; keep `stdio` default and transport secondary. |
| 5 | **K / F-arc** | ⬜ Next | TW5 save routing, debounce, projection hygiene for sustained editing across shared peer surfaces. |
| 6 | **R** | ⧾ Verify first | ReactionEngine wiring: changeset application, changed-URI derivation, `RE.onChangeset`, integration tests. |
| 7 | **G.SharktoothSigil** | ⬜ Next | Migrate remaining TOML sigil blocks in `memetic-wikitext.tid` → SharktoothSigil tiddlers. `grammarRulesFromText` fully retired; `GRAMMAR_TAG` as only registration surface. Talk-story per category. |
| 8 | **N** | ⬜ UI shim | `<$lar-promote>` action-widget writes the same command-tiddler as CLI promote. |
| 9 | **O** | ⬜ Corpus hygiene | Author scaffolded heleuma stubs; keep `lares heleuma --write` aligned. |
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

Goal: operator devices federate infrastructure state; room peers cannot; invalid intent gets rejected before edge work.

- [ ] Gate admin-doc WebSocket ingress on Keyhive `cap=infrastructure` proof.
- [ ] Operator devices only; room peers rejected.
- [ ] Preserve command-tiddler coordination surface.
- [ ] Negative smoke: non-infrastructure peer cannot sync admin state.

## Path P — Shared Operator-Peer Contract

Goal: make all active plan text, boot surfaces, and ceremony docs describe one peer-shaped architecture instead of a node-centered topology.

- [ ] Write one canonical operator-peer contract spanning browser peer and node peer.
- [ ] Define admin-lane versus active-wiki-lane responsibilities in the package docs.
- [ ] Mark node-only behavior as edge adaptation, not authority law.
- [ ] Add one architecture narrative or diagram that shows the shared lane topology.
- [ ] Remove active planning text that treats node as the default authority center.

Exit criteria:

- browser and node docs read as budget variants of the same peer
- no active planning doc treats server or node as privileged truth holder

## Path G.SharktoothSigil — Remaining Sigil Vocabulary

Goal: dissolve `memetic-wikitext.tid` into operator-extensible SharktoothSigil
tiddlers. Each tiddler = `lar-*` fields (grammar) + `\widget` wikitext (render).
When all 48 remaining TOML blocks migrate, the monolith holds families only.

**Governing principle — `mode=` unification:**
`mode="live"` = current rendering posture (default).
`mode="shadow"` = frozen/projection read. Every block-container sigil gets both.
`~aka` ≡ `kahea mode="shadow"` ≡ `pranala family:observe` — the three forms are
the same semantic at different layers of sugar. All future `\widget ~sigilname`
bodies accept `mode` and thread it to their template cascade tag.

**Category 1 — Block container sigils (close_pattern in TOML; highest operator impact):**
Each gets a tiddler with `lar-kind`, `lar-open-pattern`, `lar-close-pattern`, and a
`\widget ~name(p1:"" mode:"live")` body that resolves URI + picks template by mode.

| Sigil | Semantic | Template tag |
|---|---|---|
| `wehe` | outside/exit boundary — content that crosses the scope edge | `$:/tags/Lar/WeheTemplate` |
| `meme` | meme boundary — wraps a complete meme definition inline | `$:/tags/Lar/MemeTemplate` |
| `hui` | group/meeting — collaborative scope boundary | `$:/tags/Lar/HuiTemplate` |
| `heihei` | race/compete — multiple candidate bodies, first wins | `$:/tags/Lar/HeiheiTemplate` |
| `wai` | water/flow — streaming data or time-series scope | `$:/tags/Lar/WaiTemplate` |
| `huli` | search/turn — query or exploration scope | `$:/tags/Lar/HuliTemplate` |
| `puka` | hole/gap — placeholder pending content | `$:/tags/Lar/PukaTemplate` |

`mode="shadow"` on any of these renders the frozen/archived form (aka posture).
No new JS needed. Cascade + `mode` param handles live vs. projection.

**Category 2 — Scope/binding sigils:**
`\let`, `\var`, `\const`, `waiho` — TW5 has native `$let` / `$set`. These sigils are
pragma-aliases mapping `<<~ \let name=val >>` → TW5 `\define` / `$let`. Tiddlers carry
`lar-alias-for` + a `\procedure` body that emits the native TW5 form.
`waiho` (leave/store) = persistent named slot; no direct TW5 equiv; talk-story needed.

**Category 3 — Concurrency sigils:**
`\sync`, `\race`, `\rush` — OODA-HA execution postures. Block containers.
`\sync` = all children must resolve before proceeding (join).
`\race` = first child to resolve wins (select).
`\rush` = priority-ordered fan-out; no join required.
No TW5-native equivalent; template bodies define scheduling intent as metadata.
Actual concurrency execution stays in ReactionEngine (Path R), not in the wikirule.
Tiddler body = declarative metadata emission; RE reads the intent at runtime.

**Category 4 — OODA-HA narrative sigils (former Path G.rest):**
`lele`, `papalohe`, `pae` — HUD-visible phase markers for operator and AI agent flow.
These do NOT render content bodies; they emit a phase-tag node consumed by the
stage panel / LARES HUD.

| Sigil | OODA-HA phase | Semantic |
|---|---|---|
| `lele` | Observe → Orient flow | motion; the reading-across phase |
| `papalohe` | Orient (listen) | perception; the orienting stillness |
| `pae` | Act → Aftermath landing | phase landing; LADDER rung marker |

Template bodies: emit a `data-lar-phase` attribute + phase name. No block body.
`mode="shadow"` = archived phase marker (for projection/history rendering).

**Category 5 — Control/conditional sigils:**
`\if`, `\elif`, `\else`, `\for` — pragma-aliases for TW5 `$list`/`$reveal`/filter forms.
`<<~ \if filter >>body<<~/ \if >>` → `\procedure` that wraps `<$list filter=...>`.
These need careful talk-story: TW5's filter semantics differ from imperative conditionals.
`mode=` irrelevant here (these are control flow, not transclusion posture).

**Category 6 — Pragma/declaration sigils:**
`\procedure`, `\define`, `\widget`, `\function`, `\type`, `\typos` —
TW5 shadow forms for the operator's own sigil/procedure definitions.
`<<~ \procedure name(params) >>body<<~/ \procedure >>` is how an operator declares
a new named procedure in memetic-wikitext. These sigils make the declaration form
first-class in the grammar. Tiddlers carry `lar-kind: pragma-alias`; no `\widget` body
(the sigil IS the declaration mechanism — it produces no render output of its own).

**Category 7 — Edge/data/device/remaining:**
`toml` (data fence), `kumu` (device/canvas widget), `papalohe`, `kukali`, `\suspends`,
`\import`, `\constraint`, `pono` (right-intent marker), `lele`, `ui` (UI boundary),
`hana` (action), `kapu` (gate/cap), `helu` (enumerate), `mukuwai`, `kahawai`, `waiho`,
`\query`, `\guard`, `\task` — each talk-story needed before authoring tiddler bodies.
Priority: surface area used by `sigil-ahu`, `sigil-kahea` cascades first; exotic forms last.

**Migration exit criteria:**
- All 48 TOML `[[sigils]]` blocks removed from `memetic-wikitext.tid`
- `memetic-wikitext.tid` contains only `[[families]]` TOML tables + structural preamble
- `grammarRulesFromText()` call in `grammar-cache.ts` reads families only; sigil path commented out
- 42/42 tests pass; smoke clean

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
| **S9 / lararium-browser parity** | ⬜ Queued | Full browser peer on the same operator-peer contract: Automerge, IndexedDB, presence, optional OPFS. |
| **S10 / dreamdeck-tldraw** | ⬜ Queued | tldraw shapes as `lar://` resource containers; edge types first-class. |
| **S11 / dreamdeck-app** | ⬜ Queued | React shell; TW5 + canvas composition; no protocol logic in app layer. |
| **W / CodeMirror 6 + Lezer + LSP** | ⬜ Downstream | After CLI/live wiki authoring stabilizes. |

## Deferred / Research Shelf

- Kowloon Bridge: `KowloonOutbox` draft queue + `KowloonInbox` feed mirror; `elyncia.app` deployment.
- Seitan token circle invites.
- Federated promotion conflict handling between lararia.
- Subduction evaluation for lararium↔lararium federation once shared operator-peer parity exists.
- Speculative RE execution, rollback, metered/gas execution.
- Wikifier polish: DOCTYPE comment and dash-table round-trip diffs.
- `\sigil` pragma full implementation (parameter schema, pattern, close-pattern, handler field) — may fold into SharktoothSigil tiddler authoring flow directly.
- `~kau` Keyhive UCAN resource + UUID write-back — deferred to action tiddlers when Keyhive WASM lands; widget render path complete.

## Small Open Items

- `heleuma` drift detection should include `uri-path`, not only `file-path`.
- Command-tiddler tombstone happens client-side; decide whether dispatcher should auto-tombstone after audit write.
- Cosmetic legacy names in a few logs/strings (`room` vs `wiki`).
- Some generated/source-file memes still need human-authored content beyond scaffolds.
- `aka`/`kahea` markdown-meme cascade entries: ship `aka-cascade-markdown-meme.tid` and `kahea-cascade-markdown-meme.tid` with appropriate disk-export templates.
