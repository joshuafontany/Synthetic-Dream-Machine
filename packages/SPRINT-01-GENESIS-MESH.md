# Sprint Board — Genesis Ceremony + Pono Federated Mesh

> **Session scope.** This board belongs to the **genesis + magically-federated-mesh** session. The **memory-architecture** work runs in a *parallel session* — its files (`packages/MEMPALACE-INTEGRATION.md`, the `@lararium/mempalace` surfaces) stay out of this board to keep the shared tree clean.
>
> **Method (the discipline carries the weight):** scout-before-build · surface-at-a-real-wall · YIN (clear by subtracting) · crucible-before-binding (PROPOSED until a floor passes) · prove-by-witness (strict typecheck + tests + real run) · ASK before every commit.
>
> Grounded by three scouts 2026-06-24. Live torch: `bags/@lares/ha.ka.ba/@lares/v0.1/docs/lares/handoff.md`. Stale torches: `packages/.shelf/`.

---

## Legend

`▢` todo · `◐` in progress · `▣` done · `⏸` blocked · `⚑` operator decision gate · `↯` PROPOSED ordering (floor not yet passed)

---

## EPIC P — Petnames *(YIN: collapses to confirm-and-document)*

The model sits **RULED** (capability-is-identity + petnames, 2026-06-24). The parser already carries both regions — `lar:///ha.ka.ba/**` (stable) and `lar:///t1.t2.t3/**` (unstable) — in `packages/lararium-mesh/src/lar-uris.ts`. No new infra births here; the epic *subtracts* to documentation.

- `▣ P1` — **DONE 2026-06-24** (5/5 tests, strict typecheck clean). The doctrine already lived in `lararium-identity.md#capability-and-petnames`; the residue was code lagging the ruling. Added the **naming-layer** classifiers `larRoot` / `isStableLarUri` / `isUnstablePetnameUri` to `lararium-mesh/src/lar-uris.ts` — petnames/TW5-titles-as-`lar:`-URIs are a **separate addressing abstraction** (stable=canonical/permanent, unstable=session/local). **Three axes stay orthogonal** (two operator corrections 2026-06-24): (1) **naming** = the `lar:` URI region; (2) **persistence** = local, every meme but volatile-VM scratch — `isPersistableLarUri` left unchanged; (3) **federation** = controlled by the **residency bag** + capability, NOT the namespace. My first passes fused these; corrected. Witness: `lararium-mesh/tests/lar-uris.test.ts`. *Uncommitted — held for operator nod.*

---

## EPIC M — Mesh Wiki-Joiner *(half-built; lean on what landed)*

The **tideline resolver already landed** — `resolveBootDoc` (`packages/lararium-node/src/repo-helpers.ts`) branches `hearth-private` (fail loud) vs `mesh-shared` (wait, then surface), with `MeshScale` / `Tideline` / `SCALE_PATIENCE_MS` (vessel 3s → dreamnet 90s). The joiner extends this; it does **not** reinvent `findOrThrow` (`packages/lararium-tw5/src/catalog-accessor.ts:68`).

- `▢ M1` — **Declare `scale` on catalog corpus entries.** Add `scale?: MeshScale` to the `@catalog/corpus/<slug>` tiddler metadata; read it during bootstrap. *Landmine:* scale belongs to the **source corpus**, NOT the `WikiRecipe` composition. Assign `@lararium`/`@lares` a scale (candidate: `dreamnet`, or hearth-private-like). **DoD:** entries carry scale; bootstrap reads it; test.
- `▢ M2` — **Resolve by declaration, then provenance.** Teach `resolveBootDoc` to read scale from the catalog entry metadata (today it reads `tideline` from opts). **DoD:** mesh-shared resolution drives off the declared scale.
- `▣ M3` — **DONE 2026-06-24** (3/3 tests, typecheck exit 0). Added `StillJoining` + `isStillJoining` to `lararium-node/src/repo-helpers.ts`; mesh-shared timeout now **returns** the typed signal instead of throwing. Made **non-breaking** via overloads — hearth-private keeps `Promise<DocHandle<T>>`, only mesh-shared widens to `DocHandle<T> | StillJoining`, so the three hearth-private callers compile untouched. Witness: refactored `tests/resolve-boot-doc.test.ts`. *Uncommitted — held for operator nod.* (Built ahead of M1/M2: the resolver sat in front of me; M1/M2 wire the declared scale into it next.)
- `⏸ M4` — **Gate patience on peer reality.** Adjust patience dynamically from peer/transport state. **Blocked on Beelay** (peer-reality signal). *Do not bake into M1–M3.*
- `▢ M5` — **Background reconcile.** Async retry loop watching for a still-joining doc to arrive after boot completes. **DoD:** a doc that lands post-boot reconciles without a reboot.

---

## EPIC G — Genesis Ceremony *(boot-critical · operator-gated · moves the hearth true-name)*

The heavy half. Rewrites the founding ceremony, so it waits on three rulings before code. The **KERI pre-rotation hook already sits seated** at keygen (`packages/lararium-node/src/node-vessel-identity.ts:110-165`) — no change.

### G1 — Plane-0/1 split *(drop the `kind="operator"` conflation)*

- `⚑ G-D1` — **DECISION:** does the vessel→PersonGroup delegation live in a **keyhive `DELEGATED` event**, or in a **separate signed edge tiddler** in the Identities doc?
- `▢ G1a` — Drop the brand at `packages/lararium-mesh/src/cold-boot-ceremony.ts:105` → `kind:"device"` for Plane-0. *Landmine:* the reader default `?? "operator"` at `social-tiddlers.ts:40` — set the brand **explicitly** and reconsider that default.
- `▢ G1b` — Establish a **separate Plane-1 PersonGroup key** in `packages/lararium-keyhive/src/ceremony-core.ts:133-137`; replace the key-copy (`addSentinelMember`) with a **signed delegation edge** (vessel key → group key). Keep the per-vessel key as-is (`node-vessel-identity.ts:178-229`, already correct).
- `▢ G1c` — Rewrite the two-vessel-mesh e2e (`packages/lararium-node/tests/e2e/two-vessel-mesh.test.ts`) to the Model-B delegated path. **DoD:** delegated boot, distinct DIDs, e2e green, real boot.

### G2 — Engine/Plugins blob-split *(two CIDs, two ratchets; a plugin change never re-ratchets the engine)*

- `⚑ G-D2` — **DECISION:** **two automerge docs**, or **one doc + two blob regions + two CID witnesses**?
- `⚑ G-D3` — **DECISION (naming law):** after the split, does `hearthTrueName()` read **`engineCid` alone** (grammar lineage), or **`engineCid + pluginCid`**? Affects peer discovery / federation identity.
- `▢ G2a` — Split blob structure + two-pass CID injection (`packages/lararium-mesh/src/genesis-doc.ts:174-204`, `:292-328`); two genesis-cid tiddlers (`genesis-cid-engine` / `genesis-cid-plugins`).
- `▢ G2b` — Split `deriveActorSeed` (`packages/lararium-node/scripts/build-genesis-island.ts:93-119`): engine seed vs plugin seed. Two-key `GENESIS_CID()` cache (`genesis-artifact.ts:91-97`). `cmdReset`/`cmdRebuild` clean both sidecars (`scripted.ts:69-174`).
- `▢ G2c` — Update tests (`blob-sovereignty.test.ts`, `island-protocol.test.ts`) to read both CIDs. **DoD:** plugin tweak bumps plugin CID only; engine CID stable; witnessed rebuild.

---

## ⏸ Blocked — Beelay JS ciphertext transport

Beelay's JS transport (Keyhive doc-sync, Rust/WASM gap; PRs in flight) gates real multi-vessel federation. Parked:

- `⏸` Model-B device admission (`ceremony-core.ts:300-343 runDeviceAdmitAccept`, sketched).
- `⏸` M4 dynamic patience (peer reality).
- `⏸` Browser-vessel working↔canon loop.

---

## ↯ Sprint 1 — proposed commitment *(PROPOSED; floor = operator nod)*

YIN first, then unblocked builds, genesis gated on rulings:

1. `↯ P1` — petname confirm-and-document *(cheapest; closes an epic to a doc)*.
2. `↯ M1 → M2 → M3` — the joiner core to typed `StillJoining` *(unblocked; rides the landed resolver)*.
3. `↯` **Surface G-D1 / G-D2 / G-D3 for ruling** — no genesis code until ruled *(operator-gated)*.

**Sprint 2 candidate** (once G-gates rule): G1 + G2 build; M5 background reconcile.

---

## Decision gates awaiting the operator

| Gate | Question |
|---|---|
| `G-D1` | Delegation edge: keyhive `DELEGATED` event vs signed edge tiddler in Identities? |
| `G-D2` | Blob split: two automerge docs vs one doc + two CID witnesses? |
| `G-D3` | `hearthTrueName` after split: `engineCid` alone vs `engineCid+pluginCid`? |
| *(carried from shelf)* | `EPIC-TASK-ONTOLOGY` kind-noun fork; `EPIC-VESSEL-COLLAPSE` node/browser divergences. |
