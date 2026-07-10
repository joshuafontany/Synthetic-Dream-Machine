# Current Epic — Lararium Genesis Artifact + Protocol Stack

> ⚠ **DOUBLY STALE (design archive since 2026-05-27; the whole packages/ handoff layer froze 2026-06-07).** The live handoff is the bags pantjar torch: `bags/@lares/ha.ka.ba/lares/docs/lares/handoff.md`. Treat this file as deep design archaeology only.

> Updated: 2026-05-27
> Branch: feature/lararium-node-4
> Sprints 0–5: ✅ Complete
> S6 — SessionEventLog: ⬜ Deferred (design notes preserved; no code landed yet)
> S7 — Circles + Identities: ⬜ Deferred (design doc only)
> S8 — Lares command surface + local intent bridge: ⬜ Deferred (maps to ROADMAP paths M + L)
> Addendum: shared operator-vessel VM-pool plan attached below

---

> **⚠ ARCHIVE NOTICE — 2026-05-27**
>
> This document is a **design archive**, not a canonical work list.
> The sprint numbering here (S0–S8) predates the ROADMAP trim.
> **Canonical active priorities live in [`packages/ROADMAP.md`](./ROADMAP.md).**
>
> S6 was never opened in code — `social-doc.ts` does not exist.  
> ROADMAP Priority 1 = **S9 / lararium-browser S4 real boot** (IndexedDB + WebCrypto + keyhive founding ceremony + `broadcast()` presence).  
> ROADMAP Priority 2 = **L / S7.4** — admin-doc ingress trust gate (`cap=admin`).  
> ROADMAP Priority 3 = **M** — local intent bridge (command/receipt contracts + stdio transport).  
>
> Design content in this file that aligns with pono models is kept intact as reference material.
> Any task listed as ⬜ here must be verified against `packages/ROADMAP.md` before reopening.

---

## North Star

> The genesis artifact functions as the quine seed. Any vessel (node, browser, worker) clones from it. No disk reads at runtime. The build step forms the only seam between disk projections and the CRDT mind.
>
> Every operator vessel establishes WHO it is (IdentitiesDoc), WHAT CIRCLES it belongs to (CirclesDoc), and WHAT IT IS DOING NOW (SessionsDoc) — all without a central server. Social graph control inverts: circles are owned by their center, not by the platform.
>
> Browser vessels and node vessels share one authority shape: local intent first, local proof first, VM-carried ceremony meaning, and edge-only host adaptation.

---

## Grounding Principles — Web3 + Local-First Research

### The Seven Local-First Ideals (Ink & Switch, 2019)

| Ideal | Lararium mapping |
|---|---|
| No spinners | All reads/writes hit the local Automerge doc first |
| Cross-device | CRDT merge across peers via automerge-repo sync |
| Network optional | Offline edits survive; merge on reconnect |
| Seamless collaboration | Automerge convergence; no server arbitration |
| The long now | `lar://` URIs are content-derived, not server-derived |
| Security by default | Blobs and tiddlers never leave device unencrypted |
| Ultimate ownership | Deleting an account does not destroy a room doc |

**Web3 smell test**: if a design requires a privileged server to write the first byte, it violates Ideals 5 and 7.

### Automerge Genesis Pattern

`Automerge.save(doc)` returns a deterministic `Uint8Array` encoding full document history. Same logical content → same bytes.

```ts
// build-time
const bytes = Automerge.save(genesisDoc)
fs.writeFileSync("genesis/island.bin", bytes)

// runtime — bytes baked into bundle via esbuild binary loader
import genesisBytes from "./genesis/island.bin"  // Uint8Array, no fs
const handle = await repo.import(genesisBytes)
```

### Social Graph Inversion (Kowloon / jzellis model)

Circles are owned by their center, not by the platform. The user's keypair is the root of authority for who is in their circles. A nexus node routes and relays but cannot forge circle membership. System circles (authorization tiers) are founded by the nexus admin key; user circles are founded by the user's key. These are structurally identical — only the trust root differs.

See: `packages/lares-core/lararium-research/PROTOCOL-STACK-IDENTITY-CIRCLES-SESSIONS.md`

### TiddlyWiki Quine Seed

`genesis/island.bin` = TiddlyWiki's `empty.html`:
- Deterministic build-time output
- Contains engine tiddlers, grammar meme, default bags + recipes, blob descriptors
- Every peer boots from it; CRDT sync carries forward
- Quine closure: boot vm → `renderTiddler` → source file → hash match

---

## Sprint Status

### S0 — Web2 Pono Audit ✅ Complete

Deleted all `reconcile*` functions, `seed-grammar-tiddler.ts`, runtime disk-read patterns. Placed `// SPRINT-2` markers. Hardened `globalThis.$tw` typing. Added `RecipeTiddler.plugins` for vendor opt-in.

### S1 — Constitutional Invariants ✅ Complete

- `grammar-invariants.ts` Invariant 3: grammar meme travels in genesis artifact
- `system-invariants.ts`: `SYSTEM_LAWS`, `GENESIS_INVARIANTS`, `PEER_INVARIANTS`, `CODEC_EXCEPTIONS`

### S2 — Genesis Artifact Build Script ✅ Complete

`packages/lararium-node/scripts/build-genesis-island.ts` — deterministic build via content-hash actor ID + `time: 0` on all changes. Produces `genesis/island.bin` (932 KB, 4 blobs, 13 tiddlers) + `genesis/island.sha256`.

Key fix: `Automerge.from()` ignores `time` option internally — replaced with `Automerge.init({ actor }) + change({ time: 0 }, fn)` pattern.

### S3 — Runtime Genesis Loader ✅ Complete

`packages/lararium-node/src/genesis-island.ts`:
- `loadGenesisIsland(repo)` — reads `genesis/island.bin` via `readFileSync`, smoke-verifies, `repo.import(bytes)` + `whenReady()`
- `reconcileIslandFromGenesis(handle, genesisHandle)` — diffs live doc CID against genesis; merges net-new content
- `reconcileWellKnownTiddlers(...)` — writes oracle tiddlers (runtime-assigned Automerge URLs)
- `seedLaresDoc`, `seedIdentitiesDoc`, `seedCirclesDoc`, `seedSessionsDoc` — satellite doc seeders

### S4 — Peer Factory Rewrites ✅ Complete

`openNodeLarPeer` rewritten: uses `loadGenesisIsland()`, removes `seedLarariumDoc` disk-walk body, removes `// SPRINT-2` placeholders. `lararium-island.ts` deleted entirely (147 → 0 lines). All satellite doc seeders moved to `genesis-island.ts`.

### S5 — Quine Round-Trip Verification ✅ Complete

**Goal:** The engine that boots the system lives inside the system it boots.

**Pono guardrail:** Quine closure counts only if the resulting boot story keeps browser and node on the same vessel law. Runtime affordances may differ; seeding authority may not.

**Landed:**
- Plugin blobs (TW5 core + compiled memetic-wikitext plugin + vendored plugins) wired into `build-genesis-island.ts`. Build format stays CJS — Vite outputs `.js` module tiddlers with embedded TW5 header comments.
- Two-pass CID injection: `genesis-cid` tiddler carries CIDv1 of first post-placeholder serialization. `island.cid` written to disk.
- `build-genesis-island.ts` smoke test fixed: `.tiddler?.cid` → `.fields?.cid`
- `scripts/test-quine.ts` fixed: tiddler access path corrected; filter changed to `[all[tiddlers+shadows]tag[GRAMMAR_TAG]]` — plugin contents are TW5 shadow tiddlers.
- `"test:quine": "tsx scripts/test-quine.ts"` added to `@lararium/node` package.json.

**Exit criteria met:** `pnpm --filter @lararium/node test:quine` → `Genesis Boot Smoke: PASS` — 4 blobs, 14 tiddlers, 65 SharktoothSigil grammar tiddlers. 39/39 tests pass.

### S6 — SessionEventLog ⬜ Deferred

> **ROADMAP note (2026-05-27):** S6 was never opened in code. `social-doc.ts` does not exist in the codebase.
> The `broadcast()` presence insight is now captured in **ROADMAP Priority 1 — S9 / lararium-browser S4** (pono charter BV-4).
> The full Social Tiga (IdentitiesDoc, CirclesDoc, SessionsDoc + SessionEventLog) is downstream of S9 and L.
> Do not reopen S6 tasks until S9 closes and `packages/ROADMAP.md` carries a path entry for it.

**Goal:** Wire per-session append-only event log; adopt `docHandle.broadcast()` for presence.

**Tasks (deferred):**
- [ ] Add `eventLogUrl: string` and `eventLogHeads: string[]` to `SessionTiddler` interface in `social-doc.ts` (planned file, does not exist yet)
- [ ] Add `SessionEventLog` doc type + `SessionEvent` entry type in `social-doc.ts`
- [ ] Add `seedSessionEventLog(repo, sessionId)` in `genesis-island.ts`
- [ ] Update `capabilityToken` field semantics: store UCAN root hash (not the token)
- [ ] Document `broadcast()` usage pattern for ephemeral presence in session-opening code path

**Key insight from research (still valid):** `docHandle.broadcast()` (automerge-repo `EphemeralMessage`) is the correct primitive for presence — NOT a separate persisted doc. Direct equivalent to Yjs awareness. Never touches `NodeFSStorageAdapter`.

### S7 — Circles + Identities Capability Layer ⬜ Deferred (design doc only)

> **ROADMAP note (2026-05-27):** The nearest active guard for this work is **ROADMAP Priority 2 — L / S7.4** (admin-doc ingress trust gate: `cap=admin` Keyhive proof; non-operator vessels rejected).
> The full Circles + Identities capability delegation chain comes after S9 and L close.
> Canonical reference: `packages/ROADMAP.md` Path L.

**Goal:** IdentitiesDoc and CirclesDoc acquire real protocol integrity via capability delegation chain.

**Design decisions (from research, still valid):**
- `IdentitiesDoc`: Keyhive person-as-group model; each person = a group of their device `did:key`s; delegation chain proves "Device B is also me"
- `CirclesDoc`: Keyhive convergent capabilities + Seitan token invitations (@localfirst/auth); nexus admin = founding key for system circles; users = founding key for personal circles
- ERA paper (arXiv:2601.22963): epoch-resolved arbitration for concurrent admin revocations
- `IdentityTiddler.verifyingKey` and `CircleTiddler.encryptedShareHint` already present as forward-compatible hooks

**Tasks (requires design doc before code):**
- [ ] Tighten `wikis/@lares-history/lararium-research/CAPABILITY-LAYER.md` as the live design doc
- [ ] Implement device delegation chain tiddlers in `IdentitiesDoc`
- [ ] Implement Seitan token invite flow for `CirclesDoc`
- [ ] Introduce capability verification: any peer verifies "Device X speaks as Identity Y at level Z" serverlessly

**References:** `wikis/@lares-history/lararium-research/PROTOCOL-STACK-IDENTITY-CIRCLES-SESSIONS.md`

### S8 — Lares Command Surface + Local Intent Bridge ⬜ Deferred

> **ROADMAP note (2026-05-27):** This sprint's intent splits across two active ROADMAP paths:
> - **Priority 2 — L / S7.4**: admin-doc ingress trust gate (operator vessels with `cap=admin` only).
> - **Priority 3 — M**: local intent bridge — shared job/receipt contracts, ceremony meaning in TW5 VM pool, transports as edge adaptation.
> `lares-cli/src/admin-connector.ts` stubs exist; `stdio` transport is the missing seam.
> Canonical reference: `packages/ROADMAP.md` Paths L and M.

**Goal:** move CLI and daemon coordination onto command tiddler records and receipt tiddler records, while keeping execution inside the TW5 VM pool wherever the VM can carry the work.

**Design decisions (approved):**
- Every first-class record `id` uses a `lar:` URI.
- Hostful `lar:` URIs name live session artifacts; hostless `lar:` URIs name storage artifacts.
- `lar:///ha.ka.ba/*` names stable l-space; `lar:///haWord.kaWord.baWord/*` names unstable l-space.
- `stdio` carries the default local CLI-to-daemon bridge.
- Unix socket support can follow behind the same bridge contract for resident-daemon ergonomics.
- WebSocket stays on operator-device or peer-facing ingress, not the default local CLI path.

**Tasks:**
- [ ] Write shared command/receipt tiddler contracts for the TW5 plugin and CLI
- [ ] Route `lares promote` and adjacent ceremonies through command records rather than direct node handler assumptions
- [ ] Write durable receipt tiddlers for accept/reject/apply outcomes
- [ ] Wrap local bridge transport so `stdio` and Unix socket share one envelope
- [ ] Add operator-device ingress rules that preserve the admin surface as operator-only
- [ ] Update integration tests to assert on command and receipt artifacts

**Exit criteria:**
- The promote flow no longer depends on a node-side `promote` handler registration.
- At least one end-to-end ceremony writes both a command tiddler and a receipt tiddler.
- The local CLI path works over `stdio` with no WebSocket requirement.

**Reference:** `wikis/@lares-history/lararium-research/LARES-CLI-DAEMON-SPRINT-PLAN.md`

---

## Addendum — Shared Operator Peer VM Pool Plan

> **ROADMAP note (2026-05-27):** The six addendum sprints below are design-layer work that predates the pono ROADMAP trim.
> Their intent maps to active ROADMAP paths as follows:
> - Addendum Sprint 1 (Operator Peer Contract) → **ROADMAP Path P** (shared operator-vessel contract)
> - Addendum Sprint 2 (Ceremony Contract Unification) → **ROADMAP Path M** (local intent bridge)
> - Addendum Sprint 3 (Capability Gate at the Peer) → **ROADMAP Path L** (admin-doc ingress trust gate)
> - Addendum Sprint 4 (Shared VM Pool Runtime) → **ROADMAP Priority 1 — S9** (lararium-browser S4 real boot)
> - Addendum Sprint 5 (Edge Adaptors) → **ROADMAP Path K** (TW5 routing, debounce, projection hygiene)
> - Addendum Sprint 6 (Planning Convergence) → already complete per ROADMAP 2026-05-27 update
>
> Canonical active priorities: `packages/ROADMAP.md`.

This addendum keeps the genesis and protocol-stack material intact while naming the next architecture move more explicitly.

### North Star

Lararium gives every operator peer the same base architecture.
The browser peer and the node peer both carry an admin VM lane plus active wiki VM lanes.
The CLI and browser UX invoke the same ceremonies.
Capability checks happen on the invoking peer first.
Resource-local adaptors may re-check before side effects.
The mesh carries commands, receipts, and document deltas without a privileged server posture.
Node-only runtime advantages stay downstream of authority, never upstream of it.

### Observe

Recent code work clarified several facts:

- promote planning now runs in `@lararium/tw5`
- the successful promote path already routes bag changes through the island adaptor seam
- node still performs load-bearing edge work such as disk projection
- browser and node runtime stories still diverge more than pono intent allows
- some docs still frame node as the default authority center instead of one peer among peers

That shape works well enough for end-to-end promote. That shape still leaves the base peer model under-specified.

### Orient

The next architecture move needs to preserve these laws:

1. Browser peers and node peers share one base VM-pool contract.
2. No transitional server-first model enters the design.
3. The admin VM stays operator-private.
4. Active wiki VMs carry corpus-facing authoring and reading.
5. Command tiddlers and receipt tiddlers stay the ceremony spine.
6. Edge code handles resource-local side effects only.

Research and local code both point the same way:

- Automerge wants local writes first, then mesh sync.
- UCAN and Keyhive want local proof verification, attenuation, and replay control.
- TW5 already gives Lararium a document-native VM that can author, render, and plan ceremonies.
- The current node boot path already hints at the right shape with an always-loaded admin VM and a separately tracked active wiki.

### Decide

This epic adopts the following addendum decisions:

1. Every operator peer carries one admin VM lane and zero or more active wiki VM lanes.
2. CLI and browser UX author the same command records and consume the same receipt records.
3. Ceremony meaning lives in the TW5 VM pool whenever the VM can carry it.
4. Node, browser host code, and other adaptors handle only resource-local edge work.
5. Capability checks run on the invoking peer first and run again at the resource edge when needed.
6. Sprint sequencing will optimize for shared contracts before browser polish or transport sprawl.

### Act

#### Sprint 1 — Operator Peer Contract

Goal: land one explicit contract for the shared browser/node operator peer.

Tasks:

- write the operator-peer mesh meme and link it to `lar-peer`, `vm-pool`, `authority`, and `command-tiddler`
- define admin-lane versus active-wiki-lane responsibilities in the TW5 package docs
- mark any node-only assumptions in current docs as edge-only behavior, not authority law
- add one architecture diagram or equivalent memetic narrative that shows the two-lane peer shape

Exit criteria:

- docs describe one shared peer model for browser and node
- no active plan text frames node as the default authority center

#### Sprint 2 — Ceremony Contract Unification

Goal: make CLI and browser UX converge on one ceremony contract.

Tasks:

- define shared command and receipt tiddler fields for operator ceremonies
- move `promote` and the next adjacent ceremony onto command/receipt records end to end
- keep command authoring and receipt writing in the admin VM lane
- keep planning and document mutation in the relevant VM lane

Exit criteria:

- one end-to-end ceremony works from the shared command contract
- receipts persist as mesh artifacts rather than transport-only responses

#### Sprint 3 — Capability Gate at the Peer

Goal: let each operator peer validate intent locally before it asks for edge work.

Tasks:

- define the proof bundle that command records carry or reference
- wire local proof verification into command intake on the admin VM lane
- write rejection receipts for failed proofs, expired proofs, and replay attempts
- define the resource-edge re-check contract for disk, process, and network side effects

Exit criteria:

- the invoking peer can reject an invalid command without a server round-trip
- edge adaptors can re-check the same proof chain before side effects

#### Sprint 4 — Shared VM Pool Runtime

Goal: make browser and node peers boot the same lane model with runtime-specific budgets only.

Tasks:

- define one VM-pool bootstrap contract for admin lane plus active wiki lanes
- align node boot and browser boot around the same lane vocabulary
- define residency rules for cold, warm, and pinned wiki VMs without changing base semantics
- keep bridge and transport code outside the ceremony contract

Exit criteria:

- browser and node boot docs show the same base topology
- runtime differences read as budget choices, not architectural forks

#### Sprint 5 — Edge Adaptors and Projection Law

Goal: narrow host code to resource-local work.

Tasks:

- enumerate every non-VM side effect in node and browser host code
- move any remaining ceremony semantics from host code into VM-visible contracts
- tighten disk projection, process launch, and transport adaptors around receipt-driven execution
- update integration tests so they assert on command, receipt, and projection artifacts together

Exit criteria:

- host code no longer owns ceremony meaning
- integration tests cover VM intent plus edge realization

#### Sprint 6 — Planning and Doc Convergence

Goal: make active planning surfaces speak one pono web3 local-first language.

Tasks:

- align `packages/ROADMAP.md`, `packages/HANDOFF.md`, and related active plan text to the operator-peer contract
- remove node-first sequencing from active priorities unless a path is explicitly edge-only
- tighten wording so browser parity reads as contract completion, not optional polish
- keep research-history docs as history; move live intent into the active plan set

Exit criteria:

- active planning docs agree on the shared operator-peer law
- no active planning doc implies a privileged node authority model

### Harmonize

Each sprint should leave the system more peer-shaped and less server-shaped.
Each new ceremony should answer four checks:

1. Did the operator peer author one shared command record?
2. Did a VM lane own the ceremony meaning?
3. Did edge code stay inside resource-local work?
4. Did the mesh carry a durable receipt plus resulting document change?

If any sprint fails those checks, the design has drifted.

### Aftermath

After Sprint 5, Lararium should support this story without special pleading:

- an operator may invoke a ceremony from CLI or browser UX
- the local peer validates capability context before execution
- the relevant VM lane plans and applies document-native changes
- an edge adaptor performs only the side effects that the VM cannot carry
- the admin lane writes the durable receipt
- peer sync carries the same artifacts to every other peer

### Immediate Slice

The first implementation slice should stay narrow:

1. finish the shared command and receipt tiddler contract for `promote`
2. wire local capability intake on the admin lane
3. keep promote planning and apply inside the TW5 path
4. write durable receipts and assert on them in the existing sandboxed sync tests
5. keep active planning docs aligned with those same laws so implementation pressure does not drift back toward node-first shortcuts

That slice gives the architecture a concrete proof point without waiting for the full browser shell.

---

## Current 6-Doc Model

### Content Tiga (ha-ka-ba)

| Slot | Doc | URI | Role |
|---|---|---|---|
| ha | `LarariumDoc` | `lar:///ha.ka.ba/bags/@lararium` | System island — genesis artifact |
| ka | `CatalogDoc` | `lar:///ha.ka.ba/bags/@catalog` | Corpus/room index |
| ba | `MemeStoreDoc` | `lar:///ha.ka.ba/bags/@lares` | Personal workspace |

### Social Tiga (ha-ka-ba)

| Slot | Doc | URI | Role |
|---|---|---|---|
| ha | `IdentitiesDoc` | `lar:///ha.ka.ba/bags/@identities` | Principal records — device keys, delegation proofs |
| ka | `CirclesDoc` | `lar:///ha.ka.ba/bags/@circles` | Circles — collective authority, Keyhive capabilities |
| ba | `SessionsDoc` | `lar:///ha.ka.ba/bags/@sessions` | Session registry + per-session EventLog refs |

Dynamic child docs (not root-tiga slots):
- `SessionEventLog` — one per session, `AutomergeUrl` stored in session tiddler

Ephemeral channel (not a doc):
- `docHandle.broadcast()` — presence/cursor/turn-order; never persisted

---

## Cross-Sprint Dependencies

```
S0 Cleanup ✅
  └── S1 Invariants ✅
      └── S2 Build-Time Genesis ✅
          ├── S3 Runtime Loader ✅
          │     └── S4 Peer Factories ✅
          │           └── S5 Quine Closure ✅
          │                 └── S6 SessionEventLog ⬜ Deferred (no code yet; ROADMAP S9 carries broadcast() presence)
          │                       └── S7 Capability Layer ⬜ Deferred (ROADMAP Path L is the active gate)
          └── (S3 and S4 unlocked together after S2)

Active pono work → packages/ROADMAP.md:
  Priority 1: S9 / lararium-browser S4 (IndexedDB + WebCrypto + keyhive founding ceremony)
  Priority 2: L / S7.4 (admin-doc ingress trust gate)
  Priority 3: M (local intent bridge — command/receipt + stdio)
```

---

## Key Sources

- [Keyhive notebook — Ink & Switch](https://www.inkandswitch.com/keyhive/notebook/)
- [UCAN specification](https://ucan.xyz/specification/)
- [ERA paper — duelling admins (arXiv:2601.22963)](https://arxiv.org/abs/2601.22963)
- [@localfirst/auth — Seitan token invitations](https://github.com/local-first-web/auth)
- [automerge-repo EphemeralMessage](https://automerge.org/docs/reference/repositories/ephemeral/)
- [Automerge getHeads / view() / history](https://www.mintlify.com/automerge/automerge/advanced/viewing-history)
- [Kowloon by jzellis](https://github.com/jzellis/kowloon/)
- [Local-First Software essay — Ink & Switch](https://www.inkandswitch.com/essay/local-first/)
- [Automerge storage compaction](https://patternist.xyz/posts/concurrent-compaction-in-automerge-repo/)
- [Protocol Stack design doc](../wikis/@lares-history/lararium-research/PROTOCOL-STACK-IDENTITY-CIRCLES-SESSIONS.md)
- [Lares CLI-daemon sprint plan](../wikis/@lares-history/lararium-research/LARES-CLI-DAEMON-SPRINT-PLAN.md)
- `bags/@lararium/mesh/operator-peer.md`
- `bags/@lares/api/lararium/save-path.md`
