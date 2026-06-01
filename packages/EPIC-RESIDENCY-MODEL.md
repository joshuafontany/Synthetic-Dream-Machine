# Epic — Residency Model

> Created: 2026-05-30 (turn 31)
> Branch: `feature/lararium-node-4`
> Memetic intent: [bags/@lares/v0.1/api/lararium/residency-model.md](../bags/@lares/v0.1/api/lararium/residency-model.md)
> Memory: [project-residency-model-architecture](~/.claude/projects/-home-joshu-Synthetic-Dream-Machine/memory/project_residency_model_architecture.md)
> Supersedes design pivot: [project-stage-commit-push-model](~/.claude/projects/-home-joshu-Synthetic-Dream-Machine/memory/project_stage_commit_push_model.md)

---

## North Star

The recipe/bag + CRDT stack reveals itself as a **coordinate space + query plan**. A bag forms one coordinate axis; the recipe acts as a query plan over `(tiddler-title × bag)`; a tiddler MAY have residency in N bags simultaneously with independent CRDT histories per bag. Operator gestures travel through two surfaces — ALL-CAPS SPARQL-derived ACTION verbs for the gesture (`ADD`, `COPY`, `MOVE`, `CLEAR`, `DROP`, `LOAD`), archival-derived annotations for the effect record (`accession`, `deaccession`, `transfer`, `withdrawal`, `loan`, `holdings`, `reappraisal`, `disposition`).

Pono. Floating Librarians of Mu endorse.

---

## Pono Guardrails — the five properties

Every story in this epic MUST hold all five. Exit checks on every sprint verify them.

1. **Coordinate-first, not timeline-first.** Recipe acts as a query plan over `(title × bag)`, not a merge of branches.
2. **Work-identity preserved across residencies** (FRBR/LRM): title = Work; per-bag CRDT doc = Manifestation; independent histories by design.
3. **Operator-visible coordinate surface.** Every read surfaces origin-bag. TW5 `getShadowSource` analog; CSS DevTools Computed panel gold standard.
4. **Audit-trail discipline.** Every residency change writes an indelible effect record. No silent unlink.
5. **Verb vocabulary from set-algebra + cataloging.** ACTION = SPARQL Update derivation; effect annotations = archival profession derivation. No version-control verbs (stage/commit/push, branch/merge, cherry-pick) enter the canonical surface.

---

## Anti-patterns — defenses MUST exist

Six failure modes surfaced by prior research. Each story that touches the affected surface MUST name its defense.

| # | Anti-pattern | Owning sprint | Defense |
|---|---|---|---|
| 1 | Causal-history severance on copy | Sprint 2 / 5 | Preserve `change-id` across ACTIONs |
| 2 | Schema drift across multi-bag residency | Sprint 3 | Read-time lens hook (Cambria-shaped) |
| 3 | Kāpae resurrection | Sprint 4 | First-class `tombstone` op |
| 4 | Shadow-override confusion (TW5 #570, #9139) | Sprint 8 | Surface `origin-bag` on every read |
| 5 | Recipe-drift poisoning | Sprint 3 | Recipe pins bag-epochs |
| 6 | Concurrent commits into same lower bag | Sprint 4 / 5 | Operator-visible commit queue |

---

## Sprint Plan — OODA-HA cycle flow

Each sprint follows the same OODA-HA shape:

✶ Observe — current state of the touched surface.
⏿ Orient — which pono property and anti-pattern this sprint closes.
◇ Decide — story scope; tasks below.
▶ Act — task list.
⤴ Run — typecheck + tests + smokes.
↺ Aftermath — receipts; what opens next.

Sprint dependencies form a partial order, not a strict line. Sprints 2–4 form a foundational triangle (data + audit + actions). Sprints 5–7 build on the foundation. Sprints 8–10 cover operator surface, doc hygiene, and test alignment — they may run in parallel with later foundational sprints.

---

### Sprint 1 — Memetic Intent + Reconciliation ✅ DONE (2026-05-30 turn 31)

**Goal:** Land the architectural decision as canonical memes + memory before any code.

**Stories:**

- [x] **S1.1** — Author `bags/@lares/v0.1/api/lararium/residency-model.md` as load-bearing invariant meme (confidence 17, status=approved, approved-on 2026-05-30).
- [x] **S1.2** — Save `project_residency_model_architecture.md` to long-term memory.
- [x] **S1.3** — Edit `bags/@lares/v0.1/api/lararium/personal-slot-proposal.md` — add `#reconciliation` ahu block clarifying cascade-rules-as-first-write-defaults under residency model; add +2 tests to migration plan.
- [x] **S1.4** — Mark prior memory `project_stage_commit_push_model.md` superseded; preserve for context.
- [x] **S1.5** — Update `packages/ROADMAP.md` Priority 2 row; update Path N description.
- [x] **S1.6** — Update `packages/HANDOFF.md` with turn 31 entry.
- [x] **S1.7** — Update `packages/TALK-STORY-NEXT.md` rules section to reflect residency-model vocabulary.

**Exit criteria:** memetic intent set; sprint plan published; future agents can resume from these artifacts without re-deriving the architecture.

---

### Sprint 2 — Data Model + ACTION Verb URI Shape ✅ DONE (2026-05-31)

**Goal:** Land the ACTION verb surface as types + URI grammar in `@lararium/mesh`, with no behavior wired yet.

**Stories:**

- [x] **S2.1** — `ACTION_VERBS` const + `ActionVerb` type landed in `packages/lararium-mesh/src/residency-actions.ts`. Subset tuples `TRANSFER_VERBS` (`ADD`/`COPY`/`MOVE`) and `BAG_VERBS` (`CLEAR`/`DROP`) added with matching type guards `isActionVerb` / `isTransferVerb` / `isBagVerb`.
- [x] **S2.2** — `ResidencyAction` lands as a discriminated union with six variants (`AddAction`, `CopyAction`, `MoveAction`, `ClearAction`, `DropAction`, `LoadAction`). Per-verb required fields enforced at the type level.
- [x] **S2.3** — URI grammar RESOLVED: ACTION verbs compose ON TOP of `verb-tiddler.ts` rather than living under a separate prefix. No new URI prefix invented. Documented in `residency-model.md` `#action-verb-surface` and in the source-file header comment. Cross-reference: [lar-uri.md](../bags/@lares/v0.1/api/pono/lar-uri.md).
- [x] **S2.4** — `parseResidencyAction(inv: VerbInvocation): ResidencyAction | null` validates verb membership + per-verb required args. Returns null on any malformed input. `encodeResidencyArgs` provides the symmetric encode path.
- [x] **S2.5** — Verb-tiddler integration extension: NOT REQUIRED. The existing `VerbInvocation` shape already carries `verb`, `args`, `from-uri`, `listenable` — the parser reads through. Composition rather than extension.
- [x] **S2.6** — `change-id` propagation invariant: `newChangeId()` factory + `changeId` field required in `AddAction` / `CopyAction` / `MoveAction` / `LoadAction` at the type level. Validator rejects ADD/COPY/MOVE/LOAD missing change-id. Tests prove change-id survives `encodeResidencyArgs` → `JSON.stringify` → `JSON.parse` → `parseResidencyAction` roundtrip. Handler-layer preservation across bags lands in Sprint 5.
- [x] **S2.7** — `packages/lararium-mesh/tests/residency-actions.test.ts`: **50 test cases** across verb-set membership, per-verb parse/encode roundtrips, missing-arg rejection (all required args, per verb), case-sensitivity (ALL-CAPS canon), retired-triple rejection (stage/commit/push return null), and the change-id preservation gate.

**Exit criteria met:**
- ✅ Workspace typecheck clean (6/6 packages).
- ✅ `@lararium/mesh` tests: **146/146** passing (+50 new).
- ✅ No regression across workspace: 296/297 passing total (1 pre-existing TW5-boot shim gap on `browser-m3-breathing`, unrelated to Sprint 2).
- ✅ Action surface exists as data; zero behavior wired.

**Receipts:**
- New: `packages/lararium-mesh/src/residency-actions.ts` (~210 lines)
- New: `packages/lararium-mesh/tests/residency-actions.test.ts` (~350 lines)
- Edit: `packages/lararium-mesh/src/index.ts` (+1 export)
- Edit: `bags/@lares/v0.1/api/lararium/residency-model.md` (#action-verb-surface URI grammar resolution)
- Edit: `packages/EPIC-RESIDENCY-MODEL.md` (this sprint marker)

---

### Sprint 3 — Multi-Residency at Recipe Layer ✅ DONE (2026-05-31)

**Goal:** Recipe resolution walks ALL bags holding a title, not just the first; expose `origin-bag` as queryable.

**Stories:**

- [x] **S3.1** — `CompositeStore.resolveAll(title): Promise<Array<{bagId, record}>>` lands in `packages/lararium-mesh/src/composite-store.ts`. Returns every (bagId, record) pair holding a live (non-tombstoned) Manifestation of `title`, ordered highest-priority first. Implementation home moved from WikiRecipe to CompositeStore because that abstraction holds the per-bag stores — WikiRecipe stays a pure data interface.
- [x] **S3.2** — `CompositeStore.resolveTopmost(title): Promise<{bagId, record} | null>` lands. Returns the winning pair per recipe priority, or null when no live residency exists. Equivalent to getLive but carries the source bag. Touches residency on hit (C.4 LRU bump).
- [x] **S3.3** — `getOriginBag(wiki, title)` helper landed in `packages/lararium-tw5/src/residency-surface.ts`. Reads the `origin-bag` field from a wiki tiddler; returns null when absent or empty. Exported from `@lararium/tw5`.
- [x] **S3.4** — Nalu engine (`packages/lararium-tw5/src/modules/nalu-engine.ts` `_toFields`) annotates every inbound write with `origin-bag` carrying `change.bag`. The legacy `bag` field stays for outbound write-target override; `origin-bag` carries inbound provenance (dual-field convention, non-breaking).
- [x] **S3.5** — `WikiRecipe.bagEpochs?: ReadonlyMap<SlotUri, Heads>` optional field landed. Interface only — Sprint 3 ships the data shape; enforcement (refuse reads from drift) defers to a future sprint when consumers exist.
- [x] **S3.6** — `RecordLens` type + `identityLens` const + `lensFor(recipe, title, bag)` free function landed in `wiki-recipe.ts`. Default behavior returns `identityLens` for any tuple. Hook only — future Cambria-style lenses can register here without breaking the read API.
- [x] **S3.7** — Tests: `packages/lararium-mesh/tests/residency-resolution.test.ts` (15 cases) covers resolveAll multi-bag ordering, resolveTopmost priority + tombstone-skip, multi-bag residency invariants (N independent Manifestations per title), bagEpochs interface acceptance, lensFor identity default across all six expanded slots. `packages/lararium-tw5/tests/residency-surface.test.ts` (6 cases) covers getOriginBag — missing tiddler, missing field, present field, empty-string field, non-string field, dual-field convention coexistence.

**Exit criteria met:**
- ✅ Workspace typecheck clean (6/6 packages).
- ✅ `@lararium/mesh` tests: **161/161** passing (+15 new from S3.7).
- ✅ `@lararium/tw5` tests: **73/73** passing (+6 new from S3.7).
- ✅ Workspace total: 317/318 (1 pre-existing TW5-boot shim gap on `browser-m3-breathing`, unrelated to Sprint 3).
- ✅ Multi-bag residency observable from the read path via `composite.resolveAll`.
- ✅ Origin-bag surfaces via `getOriginBag` + tiddler-field annotation.
- ✅ bagEpochs + lensFor hooks land for future enforcement.

**Receipts:**
- Edit: `packages/lararium-mesh/src/wiki-recipe.ts` (+bagEpochs field, +RecordLens type, +identityLens, +lensFor)
- Edit: `packages/lararium-mesh/src/composite-store.ts` (+resolveAll, +resolveTopmost)
- Edit: `packages/lararium-tw5/src/modules/nalu-engine.ts` (+origin-bag annotation in _toFields)
- Edit: `packages/lararium-tw5/src/index.ts` (+getOriginBag export)
- New: `packages/lararium-tw5/src/residency-surface.ts` (~40 lines)
- New: `packages/lararium-mesh/tests/residency-resolution.test.ts` (15 tests)
- New: `packages/lararium-tw5/tests/residency-surface.test.ts` (6 tests)
- Edit: `packages/EPIC-RESIDENCY-MODEL.md` (this sprint marker)

**What Sprint 3 deferred (status update 2026-05-31 — partial enactment):**

After three research spirits surveyed Automerge heads patterns, Cambria lens design, and production CRDT epoch-pinning practice, two of the three Sprint 3 deferrals enacted with research-refined shapes; the third (modal-view reader) stays deferred with explicit rationale.

- ✅ **bagEpochs audit landed.** `LarTiddlerStore.getHeads?(): Promise<readonly string[] | null>` optional method added; `AutomergeDocStore.getHeads()` implements via `automerge.getHeads(handle.doc())`; `CompositeStore.auditEpochs(recipe)` reports per-bag `EpochPinState` (`unpinned | matched | drifted | absent | opaque`); `headsEqual(a, b)` helper uses set-semantics (Spirit 1 finding: heads form a mathematical set, not an ordered array; order-sensitive comparison caused sync-loop bugs in prior Automerge releases).
- ✅ **Cambria-style lens registration reworked.** Sprint 3's per-bag lens map (`Map<SlotUri, RecordLens>`) replaced with version-keyed registry (`Map<schemaVersion, RecordLens>`) per Spirit 2 finding: per-bag keys duplicate lenses across bags sharing a schema generation; Cambria's settled model keys by `(sourceVersion, targetVersion)`. `LarTiddlerMeta.schemaVersion?: string` field added; `lensFor(recipe, record)` reads it and looks up the registered lens. Stop-line honored: NO bidirectionality, NO YAML ops, NO embedded-in-doc lens registries — all per the Cambria research stop-line.
- ⏸ **`resolveAllRespectingPins` (modal-view reader) stays deferred — reframed 2026-05-31 as Talk-Story-surfacing layer.** Operator named the architectural principle: the CRDT layer detects + records conflicts; resolution surfaces to operator-agent or cabal Talk Story (see [[project-talk-story-conflict-surfacing]] memory). The modal-view reader becomes a **presentation layer** showing the operator the divergent views — never an arbitration mechanism that picks a winner. Spirit 3 finding still grounds the technical shape: `view(handle, pinnedHeads)` from Repo 2.0 + Loro's checkout cycle UI pattern. **Wait condition (operator-named):** need live multi-operator wiki-mesh scenarios to surface real conflict-cases before designing the UX; abstract design ahead of real cases will build the wrong surface.

**Tests added (Sprint 3 deferred enactment):**
- `headsEqual` set-semantics — 6 cases (identical, order-insensitive, length mismatch, member mismatch, reference equality, empty).
- `auditEpochs` — 10 cases (empty recipe, matched, set-semantic match, drifted, absent, opaque-via-no-getHeads, opaque-via-null-heads, multiple pins independent, drift does NOT affect default reads, EpochPinState discriminated union completeness).
- `lensFor` schema-version lookup — 5 cases (no version, no lenses map, unregistered version, registered version match, multiple versions route correctly).

**Mesh tests: 161 → 180 (+19).** TW5 tests unchanged (73/73). Workspace 317 → 336 (zero regression).

**Anti-pattern to design against next (Spirit 3 finding):** **transitive pin-fragmentation** — each recipe pinning independently means no shared "current" state; security/schema fixes never propagate. Nix flake input re-pinning nixpkgs is the canonical failure mode. Mitigation when pinning becomes operator-facing: support `follow: <parent-recipe>` semantics in the pin model. Not in scope for Sprint 3; named for the follow-up sprint that lands `resolveAllRespectingPins` + detached-view UX.

---

### Sprint 4 — Effect Record Surface (Archival Audit) ✅ DONE (2026-05-31)

**Goal:** Every ACTION writes an indelible effect tiddler with archival-verb tag. No silent unlink possible.

**Stories:**

- [x] **S4.1** — `EffectRecord` interface + `ARCHIVAL_VERBS` const (`accession, deaccession, transfer, withdrawal, loan, holdings, reappraisal, disposition`) + `ArchivalVerb` type + `LARES_EFFECT_RECORD_TAG` landed in `packages/lararium-mesh/src/effect-record.ts`.
- [x] **S4.2** — Effect log URI shape: `lar:///<bag>/log/residency/<event-id>`. Builders `effectLogPrefix(bag)` + `effectRecordUri(bag, eventId)` + predicate `isEffectRecordUri(title)` + `newEventId()` factory + `buildEffectRecordTiddler` + `parseEffectRecord` symmetric roundtrip.
- [x] **S4.3** — Kāpae landed in `CompositeStore.resolveTopmost()` + `getLive()`: tombstone in a higher-priority bag STOPS the cascade (returns null) rather than falling through to lower bags. Anti-pattern #3 defense (kāpae resurrection — OverlayFS/Docker layer pattern adapted to multi-bag CRDT). `resolveAll()` retained as **presence report** (skips tombstones across all layers). New `listKapaeBags(title)` surfaces which bags explicitly hide a title, highest-priority-first.
- [x] **S4.4** — `mapActionToEffects(action, opts?)` pure mapping. Per-verb table:
  - ADD → 1 accession in to-bag
  - COPY → 1 accession in to-bag (`reason: "copy-overwrite"`)
  - MOVE → 2 effects (accession in to-bag + deaccession in from-bag, paired by `transferId`)
  - CLEAR → 1 bag-level disposition (`disposition: "bag-cleared"`)
  - DROP → 1 bag-level disposition (`disposition: "bag-retired"`)
  - LOAD → 1 accession with `source-uri`
- [x] **S4.5** — `withEffectRecord(action, store, mutate, opts?)` higher-order helper: runs mutate, then writes every effect record. Mutate-then-log order means failed mutation produces no effect records (verified by test). **Sprint 4 gap named explicitly in source comment:** atomic batching (one Automerge change for mutation + effect record) belongs to a later sprint that exposes a transactional API on the store.
- [⏸] **S4.6** — **Commit queue (concurrent-action arbitration) DEFERRED.** Spirit 3 research (Round 2) named this as Upwelling's explicitly-unsolved problem; surfacing concurrent-residency conflicts requires proper concurrency design + operator UX. Same shape as the modal-view reader deferral from Sprint 3. Belongs with the follow-up sprint that lands `resolveAllRespectingPins` + transitive-pin-fragmentation mitigation.
- [x] **S4.7** — Tests landed:
  - `packages/lararium-mesh/tests/effect-record.test.ts` (25 cases) — archival verb membership; URI builders; event-id uniqueness; encode/parse roundtrip per shape; per-ACTION-verb mapping correctness; MOVE transferId pairing; audit-coverage invariant (every ACTION produces ≥1 effect); writeEffectRecord through composite; withEffectRecord mutate-then-log order + error path + result passthrough.
  - `residency-resolution.test.ts` kāpae describe block (8 cases) — tombstone-in-HIGH stops cascade; absent-in-HIGH falls through (distinct); tombstone-in-MID with live HIGH returns HIGH; `resolveAll` stays presence report; `listKapaeBags` reports + orders correctly.
  - One Sprint 3 test corrected: `"skips tombstones — returns next live layer below the highest tombstone"` had asserted the OLD (buggy) fall-through behavior; renamed/rewritten to `"absent in HIGH (no put) falls through to the next live layer below"` which tests the correct truly-absent case.

**Exit criteria met:**
- ✅ Workspace typecheck clean (6/6 packages).
- ✅ `@lararium/mesh` tests: **213/213** passing (+33 new from Sprint 4: 25 effect-record + 8 kāpae).
- ✅ TW5: 73/73, Node: 64/64, Browser: 19/20 (1 pre-existing TW5-boot shim gap, unrelated).
- ✅ Workspace total: **369/370** (+33 from Sprint 4, zero regression).
- ✅ No path through ACTION verbs can mutate a bag without an effect record landing first (verified by withEffectRecord tests).
- ✅ Kāpae defends Anti-pattern #3; `listKapaeBags` surfaces hides for operator inspection.

**Receipts:**
- New: `packages/lararium-mesh/src/effect-record.ts` (~280 lines)
- Edit: `packages/lararium-mesh/src/composite-store.ts` (+kāpae in getLive/resolveTopmost, +listKapaeBags)
- Edit: `packages/lararium-mesh/src/index.ts` (+effect-record export)
- New: `packages/lararium-mesh/tests/effect-record.test.ts` (25 tests)
- Edit: `packages/lararium-mesh/tests/residency-resolution.test.ts` (+kāpae section 8 tests; 1 Sprint 3 test corrected)
- Edit: `packages/EPIC-RESIDENCY-MODEL.md` (this sprint marker)

**What Sprint 4 deferred:**
- **S4.6 commit queue — reframed 2026-05-31 as Talk-Story-surfacing layer.** Operator named the architectural principle: the CRDT layer detects + records conflicts; resolution surfaces to operator-agent or cabal Talk Story (see [[project-talk-story-conflict-surfacing]] memory). The commit queue becomes a **presentation layer** showing the operator the contending writes — never an arbitration mechanism that picks ordering or auto-merges intent. Spirit 3 finding (Upwelling's explicitly-unsolved problem of concurrent semantic conflict) still grounds the shape: per-bag commit-queue tiddlers + UX for "your write contends with N pending writes — Talk Story?" **Wait condition (operator-named):** need live multi-operator wiki-mesh scenarios to surface real conflict-cases before designing the UX. Pairs naturally with the deferred modal-view reader; both surface conflicts to Talk Story rather than arbitrate.
- **withEffectRecord atomicity.** Current implementation writes effect records AFTER mutation. If a record-write fails partway through (network partition, store error), the bag carries an inconsistent audit trail. Atomic batching (one Automerge change containing both the residency mutation and the effect-record tiddler) requires a transactional API on the store layer — design space surfaced in the source-file comment for a follow-up sprint.

---

### Sprint 5 — Action Handlers in Node + CLI Surface

**Goal:** Author the ACTION verb handler family in `@lararium/node`; ship `lares act` as the canonical CLI surface for residency gestures.

**Scope refined 2026-05-31:** the prior `lares promote` ceremony retired entirely under the cleanup loop (no deprecation shim — pono cleanliness). Sprint 5 ships the replacement fresh: ACTION verb handlers + `lares act` CLI, both wrapped in `withEffectRecord` for archival audit (Sprint 4 infrastructure).

**Stories:**

- [ ] **S5.1** — Author `@lararium/node/src/action-handler.ts` — dispatches by `ActionVerb`. One handler per verb: `handleAdd`, `handleCopy`, `handleMove`, `handleClear`, `handleDrop`, `handleLoad`.
- [ ] **S5.2** — Each handler invokes `withEffectRecord(...)` from Sprint 4. No bag mutation without effect record.
- [ ] **S5.3** — Register the ACTION verb handler family in `island-behaviors.ts` `makeWikiPrimaryBehavior` (the registration point cleared during the 2026-05-31 cleanup; `_registry.register("ADD", ...)`, etc.).
- [ ] **S5.4** — Add `lares act` CLI surface in `@lares/cli/src/commands/act.ts` — operator-facing: `lares act ADD --title <t> --from <bag> --to <bag>`. Parameter validation lifts from S2.4. Register in `bin/lares.ts` COMMANDS.
- [ ] **S5.5** — Sweep residual `"promote"` strings the cleanup did not touch — search for any remaining ceremony-specific references that landed during Sprint 5 implementation. Generic English usage of "promote" (e.g. "promote a value to type T") stays.
- [ ] **S5.6** — Retire `promotion-ceremony.ts` + `PROMOTION_RECEIPT_TAG` from `@lararium/mesh` — surfaced as Wave-E pono-debt during the 2026-05-31 cleanup; deferred to Sprint 5 because they touch `causal-island.ts` deeply. Effect records (Sprint 4) replace promotion receipts.
- [ ] **S5.7** — Tests: each ACTION verb roundtrips through CLI → admin VM verb-tiddler → action-handler → bag mutation + effect record.

**Exit criteria:** `lares act ADD/COPY/MOVE/CLEAR/DROP/LOAD` works through the full pipeline; `promotion-ceremony.ts` retired; no ceremony-language references remain in active code or memes.

---

### Sprint 6 — Browser Parity

**Goal:** Action surface works identically in `@lararium/browser` vessel.

**Stories:**

- [ ] **S6.1** — Mirror action-handler.ts into browser vessel; verify isomorphic path through admin VM `placeVerb` → action-handler.
- [ ] **S6.2** — Browser test: action verb roundtrips through `openBrowserVessel` → admin VM → action handler → bag mutation + effect record.
- [ ] **S6.3** — Verify three-tier residency (pinned/hot/cold from BagResidencyManager) cooperates with multi-bag residency reads.

**Exit criteria:** browser + node both pass identical action-surface tests; no node-only handler logic.

---

### Sprint 7 — @personal Slot Enactment (Coordinated)

**Goal:** Enact the approved `@personal` proposal under the residency model, with the cascade-as-first-write-defaults reconciliation applied.

**Stories:**

- [ ] **S7.1** — Add `PERSONAL_BAG` constant to `wiki-recipe.ts`: `lar:///ha.ka.ba/@personal`.
- [ ] **S7.2** — Update `expandRecipe()` to insert `@personal` between `@draft` and `@<wikiSlug>` (priority position from the approved proposal).
- [ ] **S7.3** — Update default cascade tiddler `lar:///ha.ka.ba/@lararium/config/bag-paths` with `@personal` rules — explicitly noted as **first-write defaults**, not authoritative routing.
- [ ] **S7.4** — Vessel boot: compute recipe-fingerprint (SHA-256 of canonical encoding of `(@<wiki>-doc-id + sorted canonBags doc-ids + @lares-doc-id + @lararium-doc-id)`) — Open Question Q5 from personal-slot-proposal.
- [ ] **S7.5** — `BagResolver` map gets per-(PersonGroup × recipe-fingerprint) `@personal` and `@draft` URL resolution.
- [ ] **S7.6** — Keyhive PersonGroup grant + capability check on `@personal` and `@draft` bags.
- [ ] **S7.7** — Tests (original 7 from personal-slot-proposal + 2 from residency-model reconciliation):
  - Two devices, same recipe, same PersonGroup → write StoryList on A, observe on B.
  - Two devices, different recipe, same PersonGroup → write StoryList on A, B sees nothing.
  - Two devices, same recipe, different PersonGroup → no cross-talk.
  - Per-device-survival, recipe-fingerprint-isolation, non-member-no-access.
  - **NEW:** Same title in @personal AND @<wiki> simultaneously; recipe priority picks @personal version; origin-bag field reflects @personal.
  - **NEW:** `lares act MOVE --title <t> --from @personal --to @<wiki>` produces transfer effect record; resolveAll shows @<wiki> only after move; deaccession audit retained in @personal log.

**Exit criteria:** @personal slot works; multi-bag residency proven through @personal cooperation with @<wiki> bag.

---

### Sprint 8 — Coordinate-Inspection UI Surface

**Goal:** Operator can answer "which bag did this tiddler come from?" at a glance. CSS DevTools Computed panel sets the reference.

**Stories:**

- [ ] **S8.1** — TW5 widget: `<$lar-origin-bag>` displays origin-bag for current tiddler. Cascade-templateable.
- [ ] **S8.2** — `lares wiki resolve <title>` CLI verb — lists all bags holding `<title>`, with the winning bag highlighted (SPARQL `GRAPH ?g` analog).
- [ ] **S8.3** — TW5 sidebar panel: per-tiddler residency view showing all Manifestations across all bags in the recipe, with change-id and last-edit timestamp.
- [ ] **S8.4** — `lares wiki diff --bump-pins` — shows what would change in the live view if a sprint bumped all bag-epoch pins to current heads (Anti-pattern #5 operator-facing surface).

**Exit criteria:** operator never falls into confusion about which bag a tiddler's current value came from.

---

### Sprint 9 — Doc Meme Sweep

**Goal:** Update existing memes carrying promote-era vocabulary; preserve generic promotion prose where appropriate; tag ceremony-specific references for replacement.

**Stories:**

- [ ] **S9.1** — Sweep `bags/` for `"promote"` prose. Tag each site as (a) ceremony reference (replace with ACTION verb), (b) generic promotion language (leave), (c) docs of removed code (delete). Approximate hit list: `orichalcum-capabilities.md`, `operations-review.md`, `the-lares-protocols.md`, `auth-providers.md`, `HUD-ANATOMY.md`, plus ~13 others surfaced in prior session.
- [ ] **S9.2** — Update `packages/AGENTS.md` Spine section: replace "promote-handler" reference with "action-handler" + ACTION verb family.
- [ ] **S9.3** — Update `tests/AGENTS.md` test-route descriptions: `sync-decompose-promote.sh` → `sync-decompose-action.sh` (or freeze old + author new).
- [ ] **S9.4** — Author `bags/@lares/v0.1/api/lararium/action-handler.md` source-of-truth meme for the handler family.

**Exit criteria:** no doc references promote ceremony as the current model; every ceremony-specific promote reference either replaced or marked historical.

---

### Sprint 10 — Test Golden Regeneration

**Goal:** Test goldens reflect the new action model. Old promote-flow goldens preserved or rewritten with operator review.

**Stories:**

- [ ] **S10.1** — Operator review: decide `tests/expected/bags/**` and `tests/expected/wikis/**` fate per file — archive as `tests/expected/legacy-promote/` or rewrite in place.
- [ ] **S10.2** — Author residency-flow goldens for ACTION verbs (one golden per verb, minimum: ADD, MOVE, CLEAR).
- [ ] **S10.3** — Rename `tests/lararium-tw5/promote/` → `tests/lararium-tw5/residency/`; update `vitest.config.ts` includes pattern.
- [ ] **S10.4** — Update `tests/AGENTS.md`, `packages/AGENTS.md` test-route docs to reference new test directory.
- [ ] **S10.5** — `tests/lararium-tw5/sync/sync-decompose-promote.sh` → either rewrite as `sync-decompose-action.sh` or archive + author fresh flow that exercises ACTION verbs through the CLI.

**Exit criteria:** `pnpm test:flows` green; goldens reflect the residency model; no test asserts on promote-era artifacts.

---

## Cross-sprint dependencies

```
S1 ✅ (memetic intent + reconciliation)
  └── S2 (action verb URI + types)
       ├── S3 (multi-residency + read surface)
       │    └── S7 (@personal enactment) ← waits for S3 + S4
       ├── S4 (effect records + audit) ← runs with S3
       │    └── S5 (action handlers + CLI) ← waits for S2 + S4
       │         └── S6 (browser parity) ← waits for S5
       └── S8 (coordinate-inspection UI) ← can start once S3 lands

S9 (doc meme sweep) — can run in parallel with S5+ (touch different files)
S10 (test golden regeneration) — waits for S5 to settle behavior
```

---

## Pono Exit Criteria for the whole Epic

The Epic closes when all five pono properties hold across the live stack:

1. ✅ Recipe holds provably as a query plan over `(title × bag)` — `WikiRecipe.resolveAll(title)` exists and anchors the spine of the read path.
2. ✅ Tiddler-title Work identity remains queryable independent of any single bag.
3. ✅ Every read surfaces `origin-bag` at the TW5 widget level + CLI `lares wiki resolve` level.
4. ✅ Every residency change has a corresponding effect-record tiddler that survives the change.
5. ✅ No version-control verb (stage/commit/push/branch/merge/cherry-pick/rebase) appears on the canonical action surface.

And all six anti-patterns have a named, tested defense in the code.

---

## Vocabulary Invariants

| Term | Meaning |
|---|---|
| `coordinate` | One axis of the recipe query space — a bag URI |
| `residency` | The state of a tiddler holding a Manifestation in one bag |
| `query plan` | What the recipe carries — an ordered walk over coordinates for read resolution |
| `ACTION verb` | One of `ADD COPY MOVE CLEAR DROP LOAD` — operator gesture surface, ALL CAPS, `lar://` URI addressable |
| `effect record` | Indelible audit tiddler tagged with archival verb, written for every ACTION |
| `archival verb` | One of `accession deaccession transfer withdrawal loan holdings reappraisal disposition` — annotation register for effect records |
| `Work` (FRBR) | The tiddler-title — intellectual identity across bags |
| `Manifestation` (FRBR) | One bag's CRDT doc holding a Work |
| `Item` (FRBR) | A replica at one node/device |
| `origin-bag` | The bag a tiddler's current value came from; surfaced as a tiddler field on every read |
| `bag-epoch` | Pinned head for a bag slot in the recipe; refuses reads if current head drifts |
| `change-id` | Stable identifier that survives ACTION verbs across bags (Gerrit/Mercurial/jj/Sapling pattern) |
| `tombstone` | Explicit "intentionally not here" marker, distinct from "absent" |
