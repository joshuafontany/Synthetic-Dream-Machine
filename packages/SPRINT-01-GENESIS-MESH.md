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

## Sprint Status — re-oriented 2026-06-24

**✓ SPRINT 1 COMPLETE.** Petnames (`P1`) + the full read-arm (`M1·M2a·M2b·M2c·M3`) shipped, witnessed, committed; the model triangulated across 7+ research dives, survived two adversarial refutations (FFZ-as-causal, epoch-as-revoker), and now lives in the memegraph (`api/pono/convergent-mesh.md` + corrected FFZ/identity memes). The base-canon joiner resolves without ever minting a ghost.

**↯ SPRINT 2 — the converged-model build arm** *(research-complete, unblocked — the proposed next floor)*:
1. `◐` **Epoch-lease primitive** *(the first new DreamNet primitive; routes public revocation around Beelay)*:
   - `▣` **part 1** — `boundEpoch` lease on `device-delegation` **v2** + OPTIONAL `expectedEpoch` verify (epoch=authority, wall-clock=backstop; forging the field fails the signature). `f6a5994d`. 12/12 tests.
   - `▣` **part 2** — the coordinator-free **max-register** counter (`epoch-lease.ts`): per-writer slots, effective=max, never-decreases (no bare-scalar resurrection). `56a9af63`. 5/5 tests.
   - `◐` **part 3** — *scout-corrected:* verb reactors are **SEEDLESS** (the admin signing seed lives only in `verifierFactory`, never in a reactor), so a verb **cannot re-mint** a delegation. → The verb is **`lease-roll {resource}`** — advance the epoch (write this vessel's per-writer slot = `effective+1`), the **revocation-by-non-renewal** action; a pure tw5 reactor (`makeLeaseRollReactor`) writing `@admin/lease-epoch/{resource}/{writer}` over `ctx.composite`, **no seed**, registered in `operator-admin-behavior.ts` beside `bag-epoch`. **"Renew" (re-mint at the current epoch) is NOT a verb** — it needs the seed, so it rides the existing **delegation-mint path** (founding/admit) minting at `boundEpoch = effectiveLeaseEpoch`. Targeted revoke stays on Keyhive `revoke()`. *Design fork surfaced: keep the seed out of verbs (recommended) — confirm before binding the live-admin wiring.*
2. `▢` **Anchor BeeKEM at the contract** — wire Keyhive's existing BeeKEM into the delegation handshake (the private-content forward-secrecy leg; `convergent-mesh#contract-key-agreement`).
3. `▢ M5` — background reconcile (the read-arm's follow-on; mount a still-joining doc when a peer delivers it post-boot).
4. `▢` **YIN + grounding** — the plane-numbering corpus sweep (other plane-numbered memes, e.g. `dreamnet-architecture.md`) · name the **Amorphous Dreams Cabal** (the kahu) in code at the `@mesh/admin-cabal` sentinel.

**⚑ OPERATOR-GATED — Genesis G-arm:** `G-D1`/`G-D2`/`G-D3` rulings unlock `G1`+`G2` (the founding-ceremony rewrite). The **kahu constitutional core** (the keystone the convergence named — the small unamendable revision-set) pairs here as a design+doc piece.

**⏸ BLOCKED — SHRUNK:** the Beelay block now covers only *private-content forward-secrecy* (and `M4` dynamic-patience + the browser-vessel loop). The **public layer** routes around it (Beelay-bypass §).

*The detailed epics + research record (R1–R7, the syntheses) stay below — now also canon in the memegraph, kept here as the build's reasoning trail.*

---

## EPIC P — Petnames *(YIN: collapses to confirm-and-document)*

The model sits **RULED** (capability-is-identity + petnames, 2026-06-24). The parser already carries both regions — `lar:///ha.ka.ba/**` (stable) and `lar:///t1.t2.t3/**` (unstable) — in `packages/lararium-mesh/src/lar-uris.ts`. No new infra births here; the epic *subtracts* to documentation.

- `▣ P1` — **DONE 2026-06-24** (5/5 tests, strict typecheck clean). The doctrine already lived in `lararium-identity.md#capability-and-petnames`; the residue was code lagging the ruling. Added the **naming-layer** classifiers `larRoot` / `isStableLarUri` / `isUnstablePetnameUri` to `lararium-mesh/src/lar-uris.ts` — petnames/TW5-titles-as-`lar:`-URIs are a **separate addressing abstraction** (stable=canonical/permanent, unstable=session/local). **Three axes stay orthogonal** (two operator corrections 2026-06-24): (1) **naming** = the `lar:` URI region; (2) **persistence** = local, every meme but volatile-VM scratch — `isPersistableLarUri` left unchanged; (3) **federation** = controlled by the **residency bag** + capability, NOT the namespace. My first passes fused these; corrected. Witness: `lararium-mesh/tests/lar-uris.test.ts`. *Committed `e775dc06`.*

---

## EPIC M — Mesh Wiki-Joiner *(half-built; lean on what landed)*

The **tideline resolver already landed** — `resolveBootDoc` (`packages/lararium-node/src/repo-helpers.ts`) branches `hearth-private` (fail loud) vs `mesh-shared` (wait, then surface), with `MeshScale` / `Tideline` / `SCALE_PATIENCE_MS` (vessel 3s → dreamnet 90s). The joiner extends this; it does **not** reinvent `findOrThrow` (`packages/lararium-tw5/src/catalog-accessor.ts:68`).

- `▣ M1` — **DONE 2026-06-24** (vocabulary; 7/7 tests, mesh+node tc clean). Relocated `MeshScale` to `@lararium/mesh` (`lar-uris.ts`) — the **residency-bag layer that governs federation** — + `MESH_SCALES` + `parseMeshScale` reader; re-exported from `lararium-node/repo-helpers.ts` for resolver callers. *The loadCorpora read folds into M2 (a read is only meaningful with the use).* *Landmine carried to M2:* scale lives on the **catalog/residency entry** (source bag), NOT the `WikiRecipe`. Assigning `@lararium`/`@lares` an actual scale = a small operator ruling (candidate `dreamnet`).
- `▣ M2a` — **DONE 2026-06-24** (resolver test 3/3 via re-export; mesh build + mesh/node/browser typecheck all exit 0). Moved the resolver to `lararium-mesh/src/boot-resolver.ts` (`resolveBootDoc` + `StillJoining`/`isStillJoining` + `Tideline` + `SCALE_PATIENCE_MS`); wired the mesh barrel; `repo-helpers.ts` keeps `waitHandleLocal` + re-exports the resolver from `@lararium/mesh` (existing node callers untouched). The keel `open-vessel-core.ts` (mesh) can now reach it for M2b.
- `▣ M2b` — **DONE 2026-06-24.** In `assembleVessel` (`open-vessel-core.ts`), replaced the `waitHandle(url, () => blankDoc(repo))` blank-fallback for `@lares`/`@lararium` with `resolveBootDoc({tideline:"mesh-shared", scale:"dreamnet"})` → on `StillJoining`, **skip** the substrate layer (leave the handle `null` — already a valid `VesselCoreAssembly` field), **never mint**. Closes the ghost-gap the keel's own `never mint-it-yourself` comment forbade. Witness: mesh tc+build clean · **33/33 mesh boot tests** (lar-vessel, genesis-intake, causal-island) · node+browser tc clean · resolver 3/3 (the StillJoining behavior the keel now consumes). **No regression** to the `two-vessel-mesh` e2e — *which carries 5 PRE-EXISTING failures (device-admit cap-events, Model-B/Beelay-blocked), identical with my edit stashed.* **Follow-up:** a focused keel unit-test for the StillJoining-skip path (heavy recipe fixture; the skip-branch is trivial + the resolver proves StillJoining-on-absence).
- `▣ M2c` — **DONE 2026-06-24** (node + browser). `loadCorpora` now reads each `@catalog` corpus entry's declared `scale` via `parseMeshScale`; a corpus **declaring a mesh scale** resolves through `resolveBootDoc(mesh-shared, scale)` → on `StillJoining` it **skips its read-only layer** (reconciles later via M5), **never mints**. **Additive — entries with no declared scale keep the exact `waitHandleLocal`+blank path, so default boot is byte-unchanged.** Witness: node+browser+mesh tc clean · 30/30 boot tests · 3/3 resolver. The declared-scale path stays dormant until a corpus actually carries a scale (no live corpus does yet) — exercised by the resolver's own StillJoining test. **The read-arm (M1→M2a→M2b→M2c) is complete.**
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

**Tensions, dispositioned:** plane-numbering (CabalGroup `plane/—`) → **RULED & ENACTED** (operator 2026-06-24): drop absolute plane-indices for **nameless `#has`-stacks of capabilities** (recursive principal-contains-principals, relative scoping — [[has-stack-ontology]]). Enacted in `lararium-identity.md#five-scale` (+ `#provenance` Circle line); `lares normalize --check` clean. *Broader corpus sweep **DONE** (operator 2026-06-27): `dreamnet-architecture.md` rewrote five-layer → two-axis (INFRA⊥SOCIAL, relay-floor); residue swept in `dreamnet-prior-art.md` + `federation.md` + `lararium-identity.md` (delegation tops at cabal, treaty above).* `@lares ∉ @catalog` → resolved KUPONO (above). Aperture↔scale binding → **accepted as doctrinal resonance**, firms as the DreamNet grows from the first seeded lararia (operator).

### Research — prior-art grounding *(web; dispatched 2026-06-24)*

- `▣ R1` — **DONE 2026-06-24** (web prior-art, cited). **Headline: strict GLOBAL plane-numbering = ANTI-PATTERN** (SDSI local-names; Matrix's deliberate refusal of version ordering) → resolve the plane-numbering tension by **dropping absolute plane indices** for **recursive single-primitive nesting** (Keyhive: principal-contains-principals) + relative/by-reach scoping. Strong SUPPORT for the rest: read-cap *diminishes* from write-cap, caps atomic (**Tahoe-LAFS**, 20-yr precedent for the two faces); `pull≠read` = ciphertext-relay vs decrypt (**Keyhive** ability ladder + Beelay); attenuation-only + designation-carries-authority + ban-ambient = the confused-deputy cure (**ocap/POLA, UCAN**); per-vessel-key, person=group-of-device-keys (**SSB** feed-fork lesson). **WARNINGS:** live revocation needs external propagation — prefer expiry/attenuation (UCAN); concurrent add/remove can leak secrets — gate secrets behind removal-acknowledged (p2panda); fan-out + extension drift bite federation (ActivityPub/Matrix). **Thinnest pillar:** Q4 (signing-but-non-commanding kahu over read-only canon) — only Matrix room-versions + IETF as near-analogues; build it knowing precedent is thin. → folded into [[plane-topology-prior-art]].
- `▣ R2` — **DONE 2026-06-24** (web prior-art, cited; verify-phase cross-checked). **Verdict OVERTURNED — the kahu-owned substrate is WELL-GROUNDED**, not the thinnest pillar. Stay in **Family A** (signs/curates-never-commands: EIP/BIP, Matrix room-versions, Debian, Rust editions) — never Family B (owns-therefore-commands: Urbit plutocracy, ENS root, Bluesky PLC). 4 primitives, all in our lineage: (1) ownership=capability not account (Keyhive `Pull<Read<Write<Admin`, absence-of-cap = restriction); (2) revisions=stricter-subset-or-additive over a kelvin-frozen floor (refusing node never legitimately broken); (3) read-only=structural (kahu proposes, never reaches in); (4) self-gov = KERI pre-rotation + per-member caps + threshold-for-root. Densest precedent = **Rust editions + GREASE**. Anti-patterns: tradeable-ownership→plutocracy · ossification (exercise extension points) · signing-pen-as-veto. **OPEN CRUX (genuinely novel design question): who adjudicates revision-type — "stricter-subset" (refuse-and-stay) vs "floor-rewrite" (hard fork)?** Honest claim ceiling: "no single *unilateral* authority, bounded removal window" — never "no authority". → [[kahu-owned-substrate-prior-art]].
- `▣ R3·R4·R5` — **DONE 2026-06-24** — deep-domain dives (beyond crypto, via the `#has`-stack lens) on the three open cruxes; **they CONVERGE** → [[no-global-now-cruxes-converge]]. **R3 revision-adjudication:** structural behavioral-subtyping (Liskov), checked local+per-holder against the *observed* (Hyrum) dependency-subset → fork = "compatibility-graph partitioned," retrospective; small **unamendable constitutional core** (basic-structure/Ausbau); ring-species≅dialect-continuum → run endpoint probes. **R4 revocation:** non-renewal default / active-deletion exception (immune lease, ubiquitin tag); legal **recording-act registry along the delegation lineage**; "completeness" = wrong goal; good-faith holder = correct, not a leak. **R5 membership:** quorum-sensing **threshold+hysteresis over locally-pooled costly signals**; read local-not-census (danger-model beat roster in biology AND AIS); ceiling "verified `#has`-weight within reach as of last sync" (size×reachability confound); cost-bind vs Sybil.

### Synthesis — the three cruxes are ONE shape (the keystone clarifies)

The cruxes collapse to a single pattern: **local · decaying-lease · graded-belief + hysteretic-gate · cost-bound · lineage-scoped**. **Five of six parts already live in the stack** — feed-the-Lar=ratchet (decay), wela→anu (membership fade), Maybe-Logic 0–20 (graded weight), per-vessel-key+delegation (cost/unforgeability + the shared lineage substrate), causal-islands (local-not-global). **The one new piece** = a small **constitutional core + retrospective fork-detection** — which *is the kahu's adjudication role*. → **the revision-adjudication keystone and the kahu collapse into one job.** The forward build assembles parts-on-hand + defines the kahu's core; no longer a green-field invention.

### Refinement pass — score UP *(2026-06-24)* → [[model-refinement-time-and-rhymes]]

- `▣ R6` — **Rhymes (web).** The convergence is a **real pattern integrity**, not Law-of-5s flattery — 5 *falsifiable* independent fields each landed on a piece: **soft-state networking** (the decaying-lease spine — engineering precedent, not analogy), **refcount-vs-tracing GC** (the structural lock — the **constitutional core IS the GC root** that keeps the local lease from Sybil/cycle-gaming; properties 2/5 are safe only *because* of property 6/kahu), Schmitt hysteresis, speciation, costly-signaling. *Refinements:* Markov-blanket epistemic-not-ontological · "forgery-expensive" not "honest-expensive" · forks non-transitive (ring species) · add incarnation/generation counter · island = open-to-throughput/closed-to-authority · metaphysics = vocabulary, never evidence.
- `▣ R7` — **TIME / FFZ (repo).** The fuzzy joint clears into **3 clocks, 3 jobs:** **(c) fork-detection → Automerge** `getHeads`/`drifted` (done, zero new repr); **(a) revocation authority → causal-island epoch + Keyhive revoke** (one gap: an **epoch-keyed lease + renew verb** on the grant token; wall-clock `exp` stays a replay backstop only); **(a)/(b) decay + freshness GRAIN → FFZ** (`ffz-clock.ts`, built-but-dormant). **FFZ DOES apply — as the rhythmic *cadence* a lease decays over (L1=operator-perceptual grain, logical not wall-clock), NOT causal order, and its `ffzMerge` LWW total-order MUST NOT drive revocation/fork decisions.** *Operator's "read the docs" caught it:* the FFZ research over-claimed "epoch-dominance = universal causal ordering"; the code correctly narrows FFZ to rhythm and hands causal order to Automerge. Net: (b)+(c) wiring-grade; (a) = one real build (epoch-lease + renew), FFZ as its decay cadence.

### Beelay-bypass + the epoch=LEASE correction *(adversarial research 2026-06-24)* → [[epoch-lease-not-revoker-beelay-bypass]]

**CORRECTION (refuted "epoch=revocation authority"):** an epoch counter is a **LEASE / liveness-ratchet**, **NOT** a targeted revoker. A **max-register** (merge=max, `(value,writerId)` tiebreak) over an Automerge tiddler is SAFE + coordinator-free for *"re-mint by epoch N or expire"* (the concurrent-collapse to N+1 is fine for liveness). But as a **targeted** revoker it fails *invisibly* — a device that re-mints concurrently with the roll rides the epoch up and survives (Kleppmann "consensus to mint fencing tokens", p2panda concurrent-remove leak, Keyhive's deliberate refusal of epochs). **Targeted revocation = Keyhive convergent membership-removal (`revoke()`, already wired) — the PRIMARY mechanism, not an "exception".**

**Beelay-bypass VERDICT — YES for the foundation:** the **public layer** (base canon `@lares`/`@lararium`, capability-as-identity public *signatures*, the epoch-**lease**, Keyhive convergent-revoke) **all ride public CRDT state over the WS relay — no Beelay.** Beelay shrinks from "the multi-vessel blocker" to its one irreplaceable job: **forward-secrecy of *private* encrypted content's data-keys** (key-agreement, BeeKEM-class) — needed **only for private bags**, never the public base-canon federation.

**Corrected lease build (safe, next):** `boundEpoch` on `device-delegation` **v2** (unwired module — safe to bump) · the **max-register epoch tiddler** (lease/liveness only) · **`cap-renew`** verb in `operator-admin-behavior.ts` (NOT `bag-epoch`) · **OPTIONAL** `expectedEpoch` in verify (keeps the pre-red device-admit path untouched). Targeted revoke stays on Keyhive `revoke()`.

---

## EPIC G — Genesis Ceremony *(boot-critical · operator-gated · moves the hearth true-name)*

The heavy half — now **UNGATED** (G-D1/2/3 ruled). The **KERI pre-rotation hook already sits seated** at keygen (`node-vessel-identity.ts:110-165`) — no change.

### Genesis Rebuild — execution plan *(architect 2026-06-24; transcript `ad9b4f03`)*

**Keystone move:** the signed `device-delegation` edge = the **public, offline-verifiable projection of PersonGroup membership** → **Gate B for a delegated 2nd vessel verifies the edge over public CRDT state, no Beelay** (closes the pre-red two-vessel boot). The Keyhive sentinel docs stay the live graph; the edge is its offline shadow.

- `▣ Phase 0.1` — **DONE.** Export `device-delegation` from the mesh barrel (was built-but-unexported — my v2 was unreachable). mesh tc+build clean.
- `▢ Phase 0.2` — PersonGroup-root key custody: `generateOrLoadPersonGroupRoot(dataDir)` in `node-vessel-identity.ts` → `.lararium-identity/.person-group-root-{login}.json` (wipe-safe, founder-only).
- `▢ Phase 1 (G2+G3)` — `genesis-doc.ts`: split engine/plugins into **two content-CID witnesses** (`genesis-cid-engine`/`genesis-cid-plugins`), **drop the two-pass fixpoint** (region CIDs are inputs); `hearthTrueName=engineCid` (`genesis-artifact.ts`); kahu-ownership stamped on `ROOT_BAGS` + a `@oracle/kahu` witness; split `deriveActorSeed` (engine slow / plugin fast); mirror in `genesis-intake.ts` + `browser-genesis.ts`; `scripted.ts` cleans 2 sidecars.
- `▢ Phase 2 (G1)` — drop `kind="operator"`→`"device"` at `cold-boot-ceremony.ts:105` **AND the tw5 CJS mirror** + the `social-tiddlers.ts:40 ?? "operator"` default; `ceremony-core.ts runFoundingCeremony` mints a signed edge (root→vessel) into the IdentitiesDoc instead of copying the key; `boot-admin-keyhive.ts` Gate B verifies the edge for delegated leaves (`verifyDeviceDelegation` + `expectedEpoch` from `epoch-lease`).
- `▢ Phase 3` — two-vessel personGroup over the **local relay**: `init.ts` mints/persists the root + pins it in `social-bootstrap.json`; `runDeviceAdmitAccept` returns the signed edge (no Beelay); browser receives root-DID + edge, mints its own per-vessel key, boots.
- `▢ Phase 4` — tests: **rewrite `two-vessel-mesh.test.ts`** to the delegated path (proves the pre-red fixed); `blob-sovereignty`/`island-protocol` read two CIDs (plugin tweak bumps `pluginsCid`, `engineCid` stable).

**Landmines:** the CJS cold-boot mirror (tw5) · `?? "operator"` reader default · drop the fixpoint (no clean 2-region fixpoint) · **root seed in `.lararium-identity/` not the wipe zone** · founder-only root (browser never mints its own) · **this fixes PUBLIC 2nd-vessel boot, NOT private forward-secrecy** (still BeeKEM-at-contract, Sprint 2 item 2) — don't misread the green e2e.

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

## ⏸ Blocked — Beelay JS ciphertext transport *(SHRUNK 2026-06-24)*

**The block shrank** (Beelay-bypass §): the **public layer** (base canon, capability-as-identity public *signatures*, the epoch-lease, Keyhive convergent-revoke) routes around Beelay over the WS relay. Beelay's one irreplaceable job = **forward-secrecy of private encrypted content's data-keys** — and **Keyhive already carries BeeKEM**, so even that is *anchor-at-the-contract*, not invent. Still genuinely Beelay-gated:

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

## Decision gates — RULED 2026-06-24 ("invert the control. Mu.") → [[kahu-owned-genesis-personGroup]]

| Gate | Ruling |
|---|---|
| `G-D1` ✓ | **Signed EDGE TIDDLER** (= `device-delegation.ts`, already built). Mesh into **current** Keyhive/Beelay, never deprecated; the edge is the offline projection of Keyhive's live membership graph. |
| `G-D2` ✓ | **ONE doc, kahu-OWNED** — engine (TW5) byte-ratchets SLOW + plugins blob ratchets FASTER; two CID witnesses (`genesis-cid-engine`/`genesis-cid-plugins`) in one causal island. *(The inversion: one doc, one owner = the kahu, two ratchet-SCALES — not two owners.)* |
| `G-D3` ✓ | **`hearthTrueName = engineCid` ALONE** — the engine IS the grammar; plugins compose per-operator (DreamNet-offered), so they never pin the hearth identity. |
| *(carried from shelf)* | `EPIC-TASK-ONTOLOGY` kind-noun fork; `EPIC-VESSEL-COLLAPSE` node/browser divergences. |

**The kahu** = the Amorphous Dream Cabal = the operator's solo personGroup (+ Freyja placeholder), **scaling to consensus/mycelium** as Cabal keys grow. It **owns the genesis doc**; plugins are its DreamNet-wide offerings (Family A: curate, never command). **The genesis rebuild is now UNGATED** — the complete rebuild (operator-granted rewrite-freedom) re-founds with the meshed model; first concrete federation = **node + browser vessels, one personGroup, local relay (no Beelay)**.
