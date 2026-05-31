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
| 3 | Whiteout resurrection | Sprint 4 | First-class `tombstone` op |
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

### Sprint 2 — Data Model + ACTION Verb URI Shape

**Goal:** Land the ACTION verb surface as types + URI grammar in `@lararium/mesh`, with no behavior wired yet.

**Stories:**

- [ ] **S2.1** — Define `ACTION_VERBS` const array in `@lararium/mesh/src/residency-actions.ts`: `["ADD", "COPY", "MOVE", "CLEAR", "DROP", "LOAD"] as const`. Export `ActionVerb` type.
- [ ] **S2.2** — Define `ResidencyAction` interface — verb, title-arg, from-bag, to-bag (optional), requested-by, listenable, request-id, change-id.
- [ ] **S2.3** — Action URI grammar: design + document the canonical `lar:///` shape for action URIs (e.g. `lar:///@lararium/action/<VERB>/<request-id>`). Cross-reference [lar-uri.md](../bags/@lares/v0.1/api/pono/lar-uri.md).
- [ ] **S2.4** — Parser + validator: `parseResidencyAction(uri)` returns `ResidencyAction | null`; rejects unknown verbs, malformed args.
- [ ] **S2.5** — Verb-tiddler integration: extend `verb-tiddler.ts` (M.2 pipeline) to recognize ACTION verbs alongside the existing verb field.
- [ ] **S2.6** — `change-id` propagation invariant (Anti-pattern #1 defense): every ACTION carries a stable change-id that survives copy/move between bags.
- [ ] **S2.7** — Tests: URI roundtrip; verb-set boundary (no string outside ACTION_VERBS); change-id preservation across COPY.

**Exit criteria:** typecheck clean; new tests pass; the action surface exists as data, no behavior wired yet.

---

### Sprint 3 — Multi-Residency at Recipe Layer

**Goal:** Recipe resolution walks ALL bags holding a title, not just the first; expose `origin-bag` as queryable.

**Stories:**

- [ ] **S3.1** — `WikiRecipe.resolveAll(title)` — returns ordered list of `(bag, manifestation)` pairs for a title across all bags in the recipe.
- [ ] **S3.2** — `WikiRecipe.resolveTopmost(title)` — returns the winning Manifestation per recipe priority (current behavior preserved as default read).
- [ ] **S3.3** — `getOriginBag(title)` helper exposed in `@lararium/tw5` — TW5 `getShadowSource` analog. Returns the bag URI a title's current value came from.
- [ ] **S3.4** — Surface `origin-bag` as a tiddler field on every read in `IslandAdaptor` (Anti-pattern #4 defense).
- [ ] **S3.5** — Recipe pins: add optional `bag-epoch` per slot in the recipe; resolution refuses to read a bag whose current head doesn't match pinned epoch (Anti-pattern #5 defense). Default `bag-epoch = null` = unpinned (current behavior).
- [ ] **S3.6** — Read-time lens hook (Anti-pattern #2 defense): `WikiRecipe.lensFor(title, bag)` returns a lens function — initial implementation = identity; the hook exists so Cambria-style schema lenses can land later without breaking the API.
- [ ] **S3.7** — Tests: same title in N bags → resolveAll returns N entries; resolveTopmost picks per priority; origin-bag field accurate on every read; pinned epoch refuses out-of-date read.

**Exit criteria:** multi-bag residency observable from the read path; origin-bag visible; pin mechanism in place.

---

### Sprint 4 — Effect Record Surface (Archival Audit)

**Goal:** Every ACTION writes an indelible effect tiddler with archival-verb tag. No silent unlink possible.

**Stories:**

- [ ] **S4.1** — Define `EffectRecord` interface: `event-id, archival-verb, action-id, change-id, tiddler-title, bag, actor, timestamp, source-bag?, dest-bag?, disposition?, reason?`.
- [ ] **S4.2** — Effect log location per bag: `lar:///<bag>/log/residency/<event-id>` tiddler. Append-only; retained even after deaccession.
- [ ] **S4.3** — Tombstone op (Anti-pattern #3 defense): explicit `tombstone` field distinct from "absent." Recipe resolution treats tombstone as "intentionally not here," not "fall through to lower bag."
- [ ] **S4.4** — Archival-verb mapping table: every ACTION verb maps to one or two archival annotations (`ADD → accession; MOVE → transfer (= deaccession+accession); CLEAR → deaccession + disposition; …`).
- [ ] **S4.5** — `withEffectRecord(action, fn)` higher-order helper — runs `fn`, writes the effect tiddler, fails atomically if either step fails.
- [ ] **S4.6** — Commit queue (Anti-pattern #6 defense): per-bag queue of pending residency changes; surface visible at `lar:///<bag>/log/queue/`.
- [ ] **S4.7** — Tests: every ACTION produces audit record; tombstone distinct from absent; effect records survive bag rotation; concurrent ACTIONs queue visibly.

**Exit criteria:** no path through ACTION verbs can mutate a bag without an effect record landing first; audit query works.

---

### Sprint 5 — Action Handlers in Node + CLI Surface

**Goal:** Replace `promote-handler.ts` with action-handler.ts dispatching by verb. CLI surface gets an `act` verb (or refactors `promote` → action dispatch).

**Stories:**

- [ ] **S5.1** — Author `@lararium/node/src/action-handler.ts` — dispatches by `ActionVerb`. One handler per verb: `handleAdd`, `handleCopy`, `handleMove`, `handleClear`, `handleDrop`, `handleLoad`.
- [ ] **S5.2** — Each handler invokes `withEffectRecord(...)` from Sprint 4. No bag mutation without effect record.
- [ ] **S5.3** — Refactor `lares promote` CLI verb to a thin shim that constructs a `MOVE` ResidencyAction; mark deprecation in help text; keep working for one milestone.
- [ ] **S5.4** — Add `lares act` CLI surface — operator-facing: `lares act ADD --title <t> --from <bag> --to <bag>`. Parameter validation lifts from S2.4.
- [ ] **S5.5** — Replace 72 `promote` references across `lares-cli`, `lararium-node`, `lararium-mesh` with action-handler dispatch where ceremony-specific; leave generic "promotion" prose alone.
- [ ] **S5.6** — Retire `promote-handler.ts` once all callers migrate.
- [ ] **S5.7** — Tests: each ACTION verb roundtrips through CLI → admin VM verb-tiddler → action-handler → bag mutation + effect record.

**Exit criteria:** `lares promote` still works (shim); `lares act ADD/COPY/MOVE/CLEAR/DROP/LOAD` works; promote-handler.ts deleted; all goldens regenerated.

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
