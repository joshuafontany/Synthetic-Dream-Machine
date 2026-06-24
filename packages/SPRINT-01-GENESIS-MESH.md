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

- `▣ P1` — **DONE 2026-06-24** (5/5 tests, strict typecheck clean). The doctrine already lived in `lararium-identity.md#capability-and-petnames`; the residue was code lagging the ruling. Added the **naming-layer** classifiers `larRoot` / `isStableLarUri` / `isUnstablePetnameUri` to `lararium-mesh/src/lar-uris.ts` — petnames/TW5-titles-as-`lar:`-URIs are a **separate addressing abstraction** (stable=canonical/permanent, unstable=session/local). **Three axes stay orthogonal** (two operator corrections 2026-06-24): (1) **naming** = the `lar:` URI region; (2) **persistence** = local, every meme but volatile-VM scratch — `isPersistableLarUri` left unchanged; (3) **federation** = controlled by the **residency bag** + capability, NOT the namespace. My first passes fused these; corrected. Witness: `lararium-mesh/tests/lar-uris.test.ts`. *Committed `e775dc06`.*

---

## EPIC M — Mesh Wiki-Joiner *(half-built; lean on what landed)*

The **tideline resolver already landed** — `resolveBootDoc` (`packages/lararium-node/src/repo-helpers.ts`) branches `hearth-private` (fail loud) vs `mesh-shared` (wait, then surface), with `MeshScale` / `Tideline` / `SCALE_PATIENCE_MS` (vessel 3s → dreamnet 90s). The joiner extends this; it does **not** reinvent `findOrThrow` (`packages/lararium-tw5/src/catalog-accessor.ts:68`).

- `▣ M1` — **DONE 2026-06-24** (vocabulary; 7/7 tests, mesh+node tc clean). Relocated `MeshScale` to `@lararium/mesh` (`lar-uris.ts`) — the **residency-bag layer that governs federation** — + `MESH_SCALES` + `parseMeshScale` reader; re-exported from `lararium-node/repo-helpers.ts` for resolver callers. *The loadCorpora read folds into M2 (a read is only meaningful with the use).* *Landmine carried to M2:* scale lives on the **catalog/residency entry** (source bag), NOT the `WikiRecipe`. Assigning `@lararium`/`@lares` an actual scale = a small operator ruling (candidate `dreamnet`).
- `▣ M2a` — **DONE 2026-06-24** (resolver test 3/3 via re-export; mesh build + mesh/node/browser typecheck all exit 0). Moved the resolver to `lararium-mesh/src/boot-resolver.ts` (`resolveBootDoc` + `StillJoining`/`isStillJoining` + `Tideline` + `SCALE_PATIENCE_MS`); wired the mesh barrel; `repo-helpers.ts` keeps `waitHandleLocal` + re-exports the resolver from `@lararium/mesh` (existing node callers untouched). The keel `open-vessel-core.ts` (mesh) can now reach it for M2b.
- `◐ M2b` — **Keel base-canon resolution (the operator's "expect them").** In `assembleVessel` (`open-vessel-core.ts`), replace the `waitHandle(url, () => blankDoc(repo))` blank-fallback for `@lares`/`@lararium` with `resolveBootDoc({tideline:"mesh-shared", scale:"dreamnet", label:"@lares (expected base canon)"})` → on `StillJoining`, **skip** the substrate layer + log "expected base canon still joining," never mint. Closes the ghost-gap at `:112,123`. **DoD:** an un-federated base-canon doc skips its layer without a blank; the node disk-fed path stays green; test.
- `▢ M2c` — **loadCorpora optional-corpus branch** (node + browser). For a `@catalog` entry declaring a mesh scale, resolve via `resolveBootDoc(mesh-shared, scale)` tagged **optional** → on `StillJoining`, skip + log; else the current `waitHandleLocal` path. **Additive — entries with no declared scale keep today's path, default boot unchanged.** **DoD:** a declared-but-absent optional corpus skips without a blank; test.
- `▣ M3` — **DONE 2026-06-24** (3/3 tests, typecheck exit 0). Added `StillJoining` + `isStillJoining` to `lararium-node/src/repo-helpers.ts`; mesh-shared timeout now **returns** the typed signal instead of throwing. Made **non-breaking** via overloads — hearth-private keeps `Promise<DocHandle<T>>`, only mesh-shared widens to `DocHandle<T> | StillJoining`, so the three hearth-private callers compile untouched. Witness: refactored `tests/resolve-boot-doc.test.ts`. *Committed `e775dc06`.* (Built ahead of M1/M2: the resolver sat in front of me; M1/M2 wire the declared scale into it next.)
- `⏸ M4` — **Gate patience on peer reality.** Adjust patience dynamically from peer/transport state. **Blocked on Beelay** (peer-reality signal). *Do not bake into M1–M3.*
- `▢ M5` — **Background reconcile.** Async retry loop watching for a still-joining doc to arrive after boot completes. **DoD:** a doc that lands post-boot reconciles without a reboot.

### Model — RATIFIED & grounded *(talk-story moʻolelo, 2026-06-24)*

The pono-evidence spirit confirmed the model's **spine already stands in code + canon** — recognize, don't rebuild.

`<<~ moolelo held:"the planes-of-the-DreamNet model stands grounded; build M2 on the EXISTING read-only/policy machinery, never a parallel design (operator-ratified)" >>`

**Base canon (`@lares` + `@lararium`).**
- **Node.js vessel:** feeds + syncs from **disk** (genesis-backed; unchanged path).
- **Every other Lararium:** pointers ride the genesis `@oracle` doc (well-known `LARES_DOC_URI`/`LARARIUM_DOC_URI` tiddlers — `open-vessel-core.ts:110,121`); content federates from there.
- **Posture "fail gracefully but EXPECT them":** required, not optional → on un-federated content return `StillJoining` tagged **expected**, never hard-fail, never mint. *Found gap:* the keel falls back to `blankDoc(repo)` (`open-vessel-core.ts:112,123`) — a ghost-mint against the very `never mint-it-yourself` comment above it. **M2b closes it.**
- **`@lares` in every wiki = KUPONO** (operator's question answered). Already realized: `@lares` rides the **protocol-invariant plane** (`open-vessel-core.ts:103-134`), mounted as a read-only **substrate layer** in every vessel + every wiki via the recipe cascade — navigational tiddlers appear everywhere **without** polluting each wiki's own writable canon (the read/write two-faces keep them separable). Out of `@catalog` is **correct**: catalog discovers *optional* user oracles; `@lares` is the *non-optional* universal floor. Un-pono only if nav tiddlers were COPIED into each wiki's writable bag (drift) — which we don't.

**Forks resolved (grounded):**
1. **`scale` does NOT split.** The two faces already exist as `readPolicy`/`writePolicy` (`genesis-doc.ts:133 ROOT_BAGS`) + the `pull≠read` ability ladder (`causal-island.ts`) + composite-store single-writable-no-fallthrough (`composite-store.ts:227`). `MeshScale` = the **read-reach/patience** face only; MOVE-authority = `writePolicy` + cap-gate (already coded). M2 leans on this, never duplicates it.
2. **Base canon resolution** — settled above.
3. **MOVE-gating = a DISTINCT forging-ahead epic** (bag-grain promotion into a group-owned bag = "APPROVED, impl pending" `residency-model.md:125`; cap-gate machinery already waits). NOT this sprint — M2 resolves *reads* only.
4. **Amorphous Dreams Cabal = the `@mesh/admin-cabal` sentinel by intent** (`lar-uris.ts`), the **kahu** of base canon (`kahu.md` — signs the grammar treaty, NO live command into vessels). Code-naming + genesis-membership = forging-ahead.

**Tensions, dispositioned:** plane-numbering (CabalGroup `plane/—`) → **RULED & ENACTED** (operator 2026-06-24): drop absolute plane-indices for **nameless `#has`-stacks of capabilities** (recursive principal-contains-principals, relative scoping — [[has-stack-ontology]]). Enacted in `lararium-identity.md#five-scale` (+ `#provenance` Circle line); `lares normalize --check` clean. *Broader corpus sweep pending* (other plane-numbered memes, e.g. `dreamnet-architecture.md`). `@lares ∉ @catalog` → resolved KUPONO (above). Aperture↔scale binding → **accepted as doctrinal resonance**, firms as the DreamNet grows from the first seeded lararia (operator).

### Research — prior-art grounding *(web; dispatched 2026-06-24)*

- `▣ R1` — **DONE 2026-06-24** (web prior-art, cited). **Headline: strict GLOBAL plane-numbering = ANTI-PATTERN** (SDSI local-names; Matrix's deliberate refusal of version ordering) → resolve the plane-numbering tension by **dropping absolute plane indices** for **recursive single-primitive nesting** (Keyhive: principal-contains-principals) + relative/by-reach scoping. Strong SUPPORT for the rest: read-cap *diminishes* from write-cap, caps atomic (**Tahoe-LAFS**, 20-yr precedent for the two faces); `pull≠read` = ciphertext-relay vs decrypt (**Keyhive** ability ladder + Beelay); attenuation-only + designation-carries-authority + ban-ambient = the confused-deputy cure (**ocap/POLA, UCAN**); per-vessel-key, person=group-of-device-keys (**SSB** feed-fork lesson). **WARNINGS:** live revocation needs external propagation — prefer expiry/attenuation (UCAN); concurrent add/remove can leak secrets — gate secrets behind removal-acknowledged (p2panda); fan-out + extension drift bite federation (ActivityPub/Matrix). **Thinnest pillar:** Q4 (signing-but-non-commanding kahu over read-only canon) — only Matrix room-versions + IETF as near-analogues; build it knowing precedent is thin. → folded into [[plane-topology-prior-art]].
- `◐ R2` — **Kahu-owned substrate of the web3 DreamNet protocols** (deeper Q4 dive, operator-requested 2026-06-24). Prior art for a guardian-group OWNING a read-only protocol substrate as a capability: Urbit galaxy/star/planet substrate + OTA governance, AT Protocol lexicons + PLC, EIP/BIP stewardship, ENS root, Holochain DNA, Matrix Foundation. Curate-without-command, substrate forking/exit, guardian membership succession; capture/ossification anti-patterns. Spirit dispatched.

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
