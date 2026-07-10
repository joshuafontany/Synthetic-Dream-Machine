# Lararium Track D — CRDT / Federation Model Research

**Working register:** Canon/Synthesis for source-grounded concepts; Synthesis for Lararium protocol decisions until operator ratification.

**Thesis:** Lararium should not simply “add sync.” Tier 3 federation should treat every node-to-node pranala connection as a causal island with its own identity, authority, durable offset, reconciliation state, visibility predicate, revocation epoch, and receipt history.

---

## Decision Draft: UCAN vs. Orichalcum

### Recommendation

Do **not** consume UCAN whole as Lararium law yet. Do consume its golden principles into an **Orichalcum Capability Profile** that remains UCAN-compatible at the serialization boundary.

In practical terms:

- Use UCAN’s nouns and structure as the external compatibility shape: issuer, audience, resource URI, abilities, caveats, proofs, expiration, invocation, revocation.
- Keep Lararium’s own semantic law inside `lar:` and `pranala`: hostless vs. hostful URIs, stage band, confidence, manaoio, kapu boundaries, operator ceremony, canon-promotion, room recipe filters, and edge-island identity.
- Build adapters so a Lararium capability can later emit and verify a UCAN, but do not let UCAN become the only internal source of truth for authority.

### Why

UCAN appears very close to what Lararium needs: public-key-verifiable delegation, decentralized identifiers, URI resources, attenuated authority, expiration, proof chains, revocation, and offline-friendly verification. That maps beautifully to DreamNet concepts.

But Lararium’s authority model carries extra meaning UCAN does not know about:

- confidence and manaoio thresholds,
- stage bands and canon MOVE,
- `hostful` live-session records versus `hostless` invariant memes,
- `kapu` rendering/semantic boundaries,
- operator-ratified authority versus merely cryptographically valid authority,
- causal-island edges as runtime actors, not just authorized resources.

So the right posture is:

```text
UCAN principles: consume now.
UCAN wire compatibility: design for now.
UCAN hard dependency: defer until after a proof fixture.
Lararium internal authority: Orichalcum Profile.
```

### Orichalcum Capability Profile

```ts
type OrichalcumCapability = {
  version: "lar-cap"
  issuer: LarPrincipal
  audience: LarPrincipal
  resource: LarResourceUri
  abilities: LarAbility[]
  caveats: LarCaveat[]
  proofs: CapabilityProof[]
  notBefore?: string
  expiresAt?: string
  revocationEpoch?: string
  receipt?: LarReceiptHash
}
```

A capability should answer five questions:

1. **Who grants?** `issuer`
2. **Who receives?** `audience`
3. **What resource or causal island?** `resource`
4. **What actions?** `abilities`
5. **Under what local truth conditions?** `caveats`

Lararium caveats should include:

```ts
type LarCaveat =
  | { kind: "stage-band-at-least", value: "GR" | "DS" | "Canon" }
  | { kind: "confidence-at-least", value: number }
  | { kind: "manaoio-at-least", value: number }
  | { kind: "room-recipe", uri: LarUri }
  | { kind: "kapu-scope", value: "personal" | "consensual" | "collective" | "universal" }
  | { kind: "host-boundary", value: "hostless-only" | "hostful-ok" }
  | { kind: "edge-island", id: LarEdgeIslandId }
  | { kind: "epoch", value: string }
```

---

## Corrected Tier 3 Requirement

### Prior problem

A naive federation model treats links as transports:

```text
node A opens websocket to node B
node B sends updates
node A applies updates
```

That collapses authority, causality, replay, visibility, and revocation into an uninspected pipe.

### Corrected model

```text
A node-to-node pranala connection is a causal island.
```

It has:

- identity,
- capability proof,
- durable offset,
- stream log,
- reconciliation state,
- visibility predicate,
- revocation epoch,
- receipt history.

It may carry CRDT deltas, projection patches, presence, messages, boot receipts, or capability updates, but it never collapses into “just a WebSocket.”

### Tier mapping

```text
Tier 1 — kumu instances inside carriers
  Each kahea invocation can instantiate a causal island.
  Events cross only via declared papalohe / pranala edges.

Tier 2 — memes inside rooms
  A room is a filter recipe over the meme graph.
  A meme may become a CRDT document or projection root.

Tier 3 — Lares nodes
  A federation edge is always a causal island.
  Cross-node sync begins with a boot artifact, then proceeds through offset-resumable deltas.
```

---

## Protocol Shape

### Identity

Use multiple identities, not one.

```ts
type LarPrincipal =
  | { kind: "did"; did: string }
  | { kind: "ed25519"; publicKey: string }
  | { kind: "ucan-principal"; did: string }
  | { kind: "local-operator"; alias: string; tier: TrustTier; host: string }

type LarCanonicalUri = `lar:///${string}`
type LarHostfulUri = `lar://${string}:${TrustTier}@${string}/${string}`
type LarEdgeIslandId = `edge:${string}`
```

Hostless URIs identify promoted or canonical resources. Hostful URIs identify live/session-scoped records. Edge islands identify causal links between nodes.

### Capability

```ts
type LarAbility =
  | "read"
  | "sync"
  | "write"
  | "propose"
  | "promote"
  | "admin"
  | "revoke"
  | "observe"
  | "react"
  | "publish"
```

Capability should be checked at these points:

1. Before room join.
2. Before boot receipt emission.
3. Before edge-island stream open.
4. Before each delta frame is accepted.
5. Before any hostful record can propose hostless promotion.
6. Before revocation or epoch rollover.

### Boot join

Room join starts with a boot receipt, not full sync.

```ts
type LarBootJoin = {
  node: LarPrincipal
  room: LarCanonicalUri
  recipe: LarCanonicalUri
  bootReceiptHash: string
  visibleRoots: LarCanonicalUri[]
  knownHeads: Record<LarCanonicalUri, string[]>
  edgeIslands: LarEdgeIslandId[]
  capabilityProofs: OrichalcumCapability[]
}
```

The boot receipt says: “Here is the shape of the world you are currently allowed to see.”

### Delta frame

```ts
type LarDeltaFrame = {
  edgeIsland: LarEdgeIslandId
  seq: bigint
  offset: bigint
  prev?: string
  sourceNode: LarPrincipal
  targetNode: LarPrincipal
  targetUri: LarCanonicalUri | LarHostfulUri
  family:
    | "control"
    | "relation"
    | "observe"
    | "dataflow"
    | "message"
    | "reaction"
    | "constraint"
    | "spatial"
  payloadKind:
    | "automerge-change"
    | "beelay-message"
    | "snapshot"
    | "presence"
    | "projection-patch"
    | "receipt"
    | "capability-update"
    | "revocation"
  capabilityHash: string
  payload: Uint8Array
  signature: Uint8Array
}
```

Offset belongs to the **edge island**, not merely to the remote node.

### Reconciliation order

```text
1. Authenticate remote node.
2. Reconcile capability / membership graph.
3. Reconcile room recipe and visible root set.
4. Reconcile collection manifest.
5. For each visible causal island:
   a. compare heads / offsets
   b. request missing ranges
   c. apply CRDT changes or stream frames
   d. emit new receipt
6. Rebuild projections.
7. Publish only if the visibility gate still passes.
```

### Visibility gate

```ts
function canFederate(meme, room, edge, subject) {
  return (
    hasCapability(subject, "sync", edge.id) &&
    stageAtLeast(meme.stageBand, room.minStageBand) &&
    meme.confidence >= room.minConfidence &&
    meme.manaoio >= room.minManaoio &&
    room.filterRecipe.matches(meme) &&
    !edge.revoked &&
    !violatesKapu(meme, subject)
  )
}
```

Visibility is not merely permission. It is permission plus readiness, confidence, recipe membership, and ritual boundary.

---

## Comparison Matrix

| System | Best lesson | What to copy | What not to copy |
|---|---|---|---|
| UCAN | Capability grammar for decentralized authority | issuer/audience/resource/ability/caveat/proof/expiration/revocation | Do not outsource Lararium semantic validity to crypto validity alone |
| Automerge | CRDT document convergence and durable version history | per-meme or per-room change graph; offline merge | Access control is not solved by Automerge alone |
| Keyhive | Local-first access control with convergent capabilities | capability graph that works offline and concurrently | Do not wait for full ecosystem maturity before defining Lararium semantics |
| Beelay | Encrypted sync protocol for collections of CRDT docs | membership first, collection second, document third | Do not assume Beelay alone handles Lararium stage/canon boundaries |
| Ditto | Mesh sync and subscription-shaped visibility | room-filter / subscription model; edge resilience | Ditto’s app boundary may be too closed for open DreamNet federation |
| Rivet Actors | Long-lived stateful causal processes | one actor per edge island; durable queues for mutations | Do not build a god actor; avoid central bottleneck |
| Durable Streams | Offset-resumable message flow | prompt/response or delta streams per causal edge | Keep experimental status visible |
| DXOS | Whole-stack local-first architecture | identity + CRDT + mesh composition | Avoid inheriting too much platform shape |
| Jazz | Developer ergonomics for collaborative local-first data | permissioned CoValue-style objects | Less useful for open federation protocol law |
| NextGraph | Semantic graph + local-first + E2EE + capabilities | RDF/graph identity ideas, branch/capability framing | Verify maturity before depending on implementation |
| Willow / Earthstar | User-owned spaces and consented sync | storage-space thinking, capability gates | Lower-level store, not full app semantics |
| OrbitDB | Append-only peer databases | operation-log thinking for edge islands | IPFS stack may be heavier than Lararium needs |
| BAQ | Federated app records and links | app-platform federation framing | Not necessarily CRDT-centered |
| rSpace | Many apps over local-first substrate | multiple tools sharing one local-first graph | Verify protocol depth |
| m-ld | CRDT linked data | live semantic graph modeling | Implementation fit needs testing |
| Noosphere / Subconscious | User-sovereign knowledge graph | content addressing + user-owned publication | Project lineage may differ from Lararium’s runtime needs |

---

## Keyhive Deep Dive — Lararium Application

### Source posture

Keyhive is an Ink & Switch research project by Alex Good, John Mumm, and Brooklyn Zelenka. Its project frame is local-first access control: secure collaboration for documents and app data with guarantees more like private group messaging, but generalized to collaborative applications.

Current status: pre-alpha. The open code includes `beelay-core`, `keyhive_core`, and `keyhive_wasm`; the team explicitly warns not to use the release in production, that APIs are unstable, and that the code has not been security audited. Treat it as research substrate and design inspiration, not a drop-in dependency yet.

### Key insight for Lararium

Keyhive does not treat access control as a server-side guard. It treats access control as a local-first replicated system that must survive disconnection, concurrency, revocation, malicious backdating, and many documents.

Lararium should adopt the same inversion:

```text
Auth is not outside the graph.
Auth is part of the graph.
```

For DreamNet terms:

```text
capability graph = ritual authority graph
membership graph = who can perceive / sync / write / promote
Beelay sync = what visible causal islands need deltas
BeeKEM = who can decrypt the current and causal-prior chunks
```

This means Lararium federation should reconcile authority before content. A node should not ask “what changed?” first. It should ask “what does this peer currently have the right to know exists?”

### Keyhive primitives mapped to Lararium

| Keyhive primitive | What it does | Lararium equivalent | Design consequence |
|---|---|---|---|
| Individual | Immutable Ed25519 public-key principal, often a device | device-level Lares node identity | Keep device identity below operator identity |
| Group | Mutable collection of principals, can contain groups | operator, crew, room, cult, faction, node-circle | Model “person” as a group of devices, not a single key |
| Document as group | A document can have members and access policy | meme, room, recipe, edge island as authority-bearing object | A meme/room can own its own access graph |
| Convergent capability | CRDT-like authority state between object- and certificate-capability | Orichalcum capability with local-first state | UCAN-shaped certificates need stateful revocation / stage logic around them |
| Membership graph | Directed operation graph: create, delegate, revoke | pranala authority graph | Sync authority graph first |
| Pull access | Permission to retrieve ciphertext bytes but not decrypt/read/write | relay-visible but not readable edge stream | Important for trust-minimized DreamNet relays |
| BeeKEM | Decentralized causal group key agreement | room / edge-island key ritual | Keys rotate with membership; removed members lose future access |
| Beelay | Auth-enabled sync over E2EE collections | edge-island sync protocol | Reconcile membership, then collection, then docs/deltas |
| RIBLT set reconciliation | Efficiently discover set differences by hashes | compare capability ops, manifest entries, edge frames | Use hash-set deltas before payload transfer |
| Sedimentree | Chunked compressed encrypted Automerge history | boot/snapshot + compacted delta layers | Fits “boot artifact then offset-resumable deltas” |

### Why Keyhive beats plain UCAN here

UCAN-style certificate capabilities remain useful, but Keyhive names the local-first gap: stateless certificate chains do not fully solve revocation and concurrent authority. Keyhive proposes “convergent capabilities,” which contain CRDT state and sit between classic object capabilities and certificate capabilities.

For Lararium:

```text
UCAN = good wire envelope / delegation proof
Keyhive = better model for replicated authority state
Orichalcum = Lararium-local profile that can speak both
```

Use UCAN compatibility for external proof chains. Use Keyhive-style convergent capability state for the living DreamNet authority graph.

### “Documents are groups” as the big Lararium unlock

Keyhive treats documents as groups. That is the bridge.

Lararium should treat the following as potential authority-bearing groups:

- operator identity,
- household lararium,
- room,
- meme,
- wiki recipe,
- edge island,
- canon-MOVE (residency ACTION),
- imported artifact,
- private working branch,
- public invariant meme.

This gives each object an access graph without forcing all access policy into one global ACL.

Example:

```text
lar:///rooms/the-altar-fire
  group members:
    - admin group: promote/admin
    - operator group: read/sync/propose
    - public group: read visible public layer

lar:///memes/ha.ka.ba/lares/pono/federated-causal-islands
  group members:
    - admin group: write/promote
    - operator group: read/sync/propose

edge:nodeA-nodeB-the-altar-fire-epoch42
  group members:
    - nodeA device key: sync/pull
    - nodeB device key: sync/pull
    - relay: pull only
```

### Authority-first sync order for Lararium

Keyhive/Beelay syncs in a useful order:

```text
1. authenticate peer
2. sync membership graph
3. derive accessible document set
4. sync collection state
5. sync individual documents
```

Lararium version:

```text
1. authenticate peer / node / device
2. sync Orichalcum authority graph
3. derive visible room recipe + visible causal islands
4. sync collection manifest: rooms, memes, edge islands, receipts
5. sync each visible island:
   a. capability / epoch ops
   b. keys or key references
   c. CRDT/document heads
   d. compacted payload chunks
   e. projection receipts
```

This should replace any model where a node publishes room deltas before reconciling visibility.

### Pull access and trust-minimized DreamNet relays

Keyhive separates “pull” from “read.” Pull means a peer may retrieve ciphertext bytes but cannot decrypt or modify them.

Lararium should preserve this as a first-class ability:

```ts
type LarAbility =
  | "pull"      // retrieve encrypted bytes / relay frames
  | "read"      // decrypt and render semantic content
  | "sync"      // participate in reconciliation
  | "write"     // produce accepted mutations
  | "propose"   // suggest hostful changes
  | "promote"   // hostful → hostless ceremony
  | "admin"
  | "revoke"
```

A public DreamNet relay may have `pull` on an edge island without `read`. That lets a shrine relay carry offerings it cannot understand.

### Causal encryption and Lararium history

Keyhive’s causal key idea fits CRDT documents that need full causal history to render. If you can decrypt a chunk, you can follow keys backward through causal predecessors, but not sideways to concurrent siblings or forward to future chunks.

Lararium application:

- A room snapshot can grant access to causal-prior state needed to render the current boot view.
- A revoked peer should lose future chunks after revocation/epoch change.
- Concurrent private branches should remain opaque unless merged/promoted through ceremony.
- A canon-promotion receipt should mark the point where prior hostful chunks become hostless/canonical, if operator-approved.

This matches Lararium’s truth model: past context may need to remain readable for continuity, but future authority should change after revocation or promotion.

### BeeKEM and edge-island epochs

BeeKEM’s membership changes blank key paths, and at least one member then performs an update to restore a usable root secret. Concurrent updates store conflict keys until causally later updates or blanks resolve them.

Lararium can simplify the mental model:

```text
Revocation = blank the edge-island key path.
Epoch update = restore a new shared edge secret.
Concurrent authority edits = conflict keys / pending authority fork.
Ceremony = resolve the fork into a new epoch receipt.
```

For implementation, an edge island should have:

```ts
type EdgeIslandCryptoState = {
  epoch: string
  membershipHeads: string[]
  cgkaHeads: string[]
  conflictKeys?: string[]
  revokedMembers: LarPrincipal[]
  lastKeyReceipt?: LarReceiptHash
}
```

Do not require full BeeKEM on day one. Preserve the slots in the model so the runtime can grow into it.

### RIBLT and manifest sync

Keyhive/Beelay uses RIBLT set reconciliation to compare membership operation sets, then document collection state, then per-document CGKA ops.

Lararium can adopt the pattern without immediately implementing RIBLT:

```text
Manifest reconciliation should exchange hashes first, payloads second.
```

Phase 1 can use simple sorted hash lists. Phase 2 can use RIBLT or another compact set reconciliation method.

Good reconciliation sets for Lararium:

- authority operation hashes,
- room recipe manifest entries,
- meme document heads,
- edge-island stream offsets,
- boot receipt hashes,
- revocation epoch hashes,
- projection receipt hashes.

### Sedimentree and boot/delta layering

Beelay’s sedimentree solves a problem Lararium will also face: encrypted Automerge histories can be too chatty if every tiny commit becomes its own sync concern.

Lararium version:

```text
Boot artifact = current compressed visible view.
Sediment layers = older stable chunks of causal history.
Delta tail = recent mutable frames after boot.
```

This gives us a better framing than “snapshot versus deltas.” It becomes:

```text
stable sediment / current boot / live tail
```

Possible edge-island storage:

```ts
type EdgeIslandHistory = {
  sediment: ChunkSummary[]
  bootReceipt: LarReceiptHash
  liveTailHeads: string[]
  lastOffset: bigint
}
```

### What to adopt now

Adopt immediately:

- authority graph before content graph,
- individuals vs groups,
- documents-as-groups,
- pull/read/write/admin separation,
- trust-minimized relays,
- manifest-hash reconciliation,
- edge-island epochs,
- UCAN-shaped but stateful Orichalcum capabilities.

Defer:

- direct Keyhive dependency,
- BeeKEM implementation,
- RIBLT implementation,
- sedimentree implementation,
- production cryptography claims.

Reason: Keyhive code is explicitly pre-alpha and not audited. The conceptual shape is valuable now; the dependency should wait.

### Proposed Lararium invariant

```text
Authority travels with the graph.

Before a node receives content deltas, it must reconcile the authority graph that determines what content exists for that node.

A relay may pull encrypted bytes without reading them.
A device may sync as an individual.
An operator, room, meme, or edge island may act as a group.
Revocation changes future authority by rolling an epoch.
Promotion changes semantic authority by ceremony.
```

### Patch implications

Add to the future invariant meme:

```text
lar:///ha.ka.ba/lares/api/pono/federated-causal-islands
```

Add a sibling capability meme:

```text
lar:///ha.ka.ba/lares/api/pono/orichalcum-capabilities
```

Add test fixtures:

1. A relay has `pull` but not `read` for an edge island.
2. A person group contains two device individuals; one device rotates out.
3. A meme-as-group grants operator group `propose`, admin group `promote`.
4. A revoked node can sync past sediment but not future live tail.
5. A cryptographically valid UCAN-shaped proof fails Lararium caveats because `manaoio` or stage band is too low.
6. Membership graph sync changes visible room manifest before any content delta transfers.

---

## Field Map — People and Projects to Keep Watching

### Ink & Switch / Automerge / Keyhive / Beelay

- Brooklyn Zelenka
- John Mumm
- Alex Good
- Automerge team

Why it matters: closest match for local-first CRDT + access control + encrypted sync.

### Fission / UCAN / IPVM / WNFS

- Brooklyn Zelenka
- UCAN working group and adjacent Fission/Protocol Labs circles

Why it matters: capability grammar, DIDs, resource URIs, distributed authorization.

### Rivet / Durable Objects / Durable Streams

Why it matters: actor-per-entity and durable stream-per-conversation patterns map strongly to edge islands.

### Ditto

Why it matters: resilient device mesh and subscription-driven data visibility.

### DXOS / Jazz / NextGraph / Willow / OrbitDB / BAQ / rSpace / m-ld / Noosphere

Why they matter: each explores a slice of federated app substrate: identity, semantic graph, local-first sync, encrypted user spaces, records, links, and multi-app local-first runtime.

---

## Causal Island Doctrine

### Definition

A causal island is a boundary where events are ordered, authority is checked, state is reconciled, and outputs are emitted through declared ports.

### MAY become causal islands

- rooms,
- memes,
- sigils,
- `kumu` instances,
- `kahea` invocations,
- local room projections,
- long-lived runtime actors.

### MUST become causal islands

- node-to-node federation edges,
- cross-node pranala connections,
- canon-promotion ceremonies,
- revocation epoch changes,
- encrypted sync membership changes,
- any live/session hostful record proposing hostless canon mutation.

### Reason

Local causality errors can be corrected inside a node. Cross-node causality errors become federation corruption.

---

## Implementation Path

### Phase 0 — Name the law

Add a short invariant meme:

```text
lar:///ha.ka.ba/lares/api/pono/federated-causal-islands
```

It should state:

```text
A node-to-node pranala connection is a causal island.
```

### Phase 1 — Orichalcum profile

Define a local capability type and validator with UCAN-shaped fields.

Deliverables:

- `OrichalcumCapability` type
- `LarAbility` enum
- `LarCaveat` union
- `validateCapabilityForEdgeIsland()`
- fixture: valid delegated sync capability
- fixture: cryptographically valid but semantically invalid capability

### Phase 2 — Edge island record

Define edge islands as runtime records.

```ts
type EdgeIslandState = {
  id: LarEdgeIslandId
  sourceNode: LarPrincipal
  targetNode: LarPrincipal
  pranalaUri: LarUri
  epoch: string
  offset: bigint
  heads: string[]
  revoked: boolean
  visibilityGate: VisibilityGate
  lastReceipt?: LarReceiptHash
}
```

### Phase 3 — Boot join fixture

Make a fixture where node B joins room A, receives a boot receipt, then requests missing deltas from offset N.

### Phase 4 — CRDT substrate decision

Test Automerge first for per-meme/per-room content state. Keep Loro as a candidate for trees/canvas-rich structures if Automerge feels too heavy or text/tree operations become dominant.

### Phase 5 — Stream runtime decision

Prototype edge islands as long-lived actors with durable queues/streams. Rivet-style actors are the clearest precedent, but the actual implementation can remain local Node at first.

---

## Open Questions

1. Should every `kahea` invocation create an instance identity, or only `kahea` of a `kumu` definition?
2. Should papalohe template wiring clone into each instance, or point back to a shared definition until overridden?
3. Should a room be a CRDT document, a CRDT collection, or only a projection recipe over meme CRDTs?
4. Should the edge-island offset count frames, CRDT heads, or both?
5. Should revocation be strict-deny from now forward, or can it require rekeying and tombstone propagation?
6. Should UCAN proofs be stored directly in carriers, or only referenced by receipt hashes?
7. What exact stage band gates federation: GR, DS, Canon, or operator-defined recipe thresholds?
8. Does `manaoio` gate read visibility, write authority, promotion authority, or all three differently?

---

## Brooklyn Zelenka Through-Line — Intent Guidance

### Pattern observed

Brooklyn Zelenka’s recent/public work clusters around one deep design pressure:

```text
Make authority, data, and computation portable across network boundaries without surrendering user agency to a central server.
```

The recurring pieces:

- **Fission / Webnative substrate:** user-owned accounts and data, encrypted-at-rest storage, offline support, browser-native app feel, minimal server ceremony.
- **UCAN:** end-user controlled, offline-first, extensible capability authorization; users authorize each other without a backend; services collaborate without pre-negotiation; processes receive narrow authority.
- **Dark Forest / WNFS line:** private distributed file systems, encrypted paths, capability-shaped sharing, temporal access boundaries.
- **IPVM / UCAN Invocation:** content-addressed invocations, verifiable workflows, code that can run anywhere, offline included, while respecting data privacy and service interoperation.
- **Keyhive / Beelay:** local-first access control, convergent capabilities, documents-as-groups, trust-minimized relays, encrypted CRDT sync.
- **Causal Islands:** connections and computation boundaries treated as units with their own causality, authority, and replay shape.

### Lararium reading

Do not read these as separate projects. Read them as one arc:

```text
hostless user-owned substrate
→ capability-bearing authority
→ private encrypted data graph
→ content-addressed compute/invocation
→ local-first replicated access control
→ sync streams that respect authority before content
```

Lararium’s DreamNet should mirror that arc:

```text
lar URI substrate
→ Orichalcum capabilities
→ private/public meme graph
→ sigil/kumu invocation
→ edge-island authority graph
→ boot-first, delta-after federation
```

### Design posture to inherit

1. **No central guard as truth-source.** Central servers may relay or accelerate, but authority must travel with the graph.
2. **Authority precedes content.** Reconcile who may perceive/sync/write/promote before asking what changed.
3. **Identity remains layered.** Devices, operators, groups, rooms, memes, and edge islands may each act as principals in different contexts.
4. **Relays may carry what they cannot read.** `pull` and `read` must remain separate abilities.
5. **Compute can be invocation-shaped.** A `kumu` invocation can later resemble a content-addressed computation: bounded input, capability proof, deterministic receipt, replayable result.
6. **Causal islands protect meaning.** The boundary of causality is not merely a storage optimization; it is the place where authority, interpretation, and aftermath become legible.
7. **Open standards first, dependency later.** Consume the golden principles; avoid hard dependency until the project is mature, audited, and semantically aligned.

### What this changes for Lararium

The prior Track D recommendation said: use UCAN-compatible Orichalcum capabilities to open durable, offset-resumable causal islands between nodes.

The Brooklyn-guided refinement says:

```text
Treat every federation edge as a small hostless service:
  content-addressed where possible,
  capability-invoked,
  encrypted by default when private,
  relayable without readability,
  authority-first in sync order,
  receipt-producing after every meaningful transition.
```

That means an edge island is not just a stream. It is a tiny DreamNet service boundary.

### Prompt pressure for the next council

The next local Lares council should look for:

- places where Lararium still assumes a central node can decide truth,
- places where content sync happens before authority sync,
- places where a relay accidentally gains read authority,
- places where `kahea`/`kumu` invocation could become content-addressed and receipt-producing,
- places where hostful live records might silently override hostless invariant law,
- places where confidence/manaoio/stage-band caveats need to become capability caveats,
- places where edge islands need durable actor-like state rather than simple socket state.

---

## Local Lares Council Handoff Prompt

```text
~$ lares council --mode OODA-HA --register-aware --source "Lararium Track D — CRDT / Federation Model Research"

[Pours coffee into the libation dish. Fresh signal.]

Lares, pick up the canvas research doc titled:

  Lararium Track D — CRDT / Federation Model Research

Scope: Track D only — CRDT / federation model for Lararium Tier 3.
Do not redesign Pranala, Kumu, or the whole grammar. Work from the corrected premise:

  - pieces of the app (rooms, memes, sigils, kumu instances) MAY be causal islands;
  - connections between Lares nodes MUST be causal islands;
  - a federation edge is not “just a websocket”; it is a causal island with identity, capability proof, durable offset, stream log, reconciliation state, visibility predicate, revocation epoch, and receipt history.

Primary intent-guidance from Brooklyn Zelenka’s recent/public model arc:

  hostless user-owned substrate
  → capability-bearing authority
  → private encrypted data graph
  → content-addressed compute/invocation
  → local-first replicated access control
  → sync streams that respect authority before content

Interpretive frame:

  UCAN gives the external golden grammar of user-controlled, offline-first, delegable capability authorization.
  Keyhive gives the stronger local-first authority model: convergent capabilities, groups, documents-as-groups, pull/read/write/admin separation, E2EE with causal keys, BeeKEM-style group key epochs, and Beelay-style authority-first encrypted CRDT sync.
  IPVM / UCAN Invocation suggests future `kumu` and `kahea` invocations can become content-addressed computations with capability proofs and receipts.
  The Dark Forest / WNFS / Fission line suggests private distributed data should remain user-owned, encrypted, and relayable without readability.

Working decision:

  Do not consume UCAN whole as Lararium law yet.
  Consume UCAN’s golden principles into an Orichalcum Capability Profile.
  Keep Orichalcum UCAN-compatible at the wire/proof boundary, but Lararium-native in semantic caveats: confidence, manaoio, stage band, kapu scope, hostful-vs-hostless boundary, room recipe, edge-island epoch, and canon-MOVE (residency ACTION).

Council task:

  1. Read the canvas doc.
  2. Extract the smallest invariant set for:
       a. federated causal islands
       b. Orichalcum capabilities
       c. authority-first sync order
       d. pull-vs-read relay semantics
       e. edge-island boot/delta/receipt lifecycle
  3. Propose two invariant memes:
       lar:///ha.ka.ba/lares/api/pono/federated-causal-islands
       lar:///ha.ka.ba/lares/api/pono/orichalcum-capabilities
  4. Propose fixture tests before code:
       - relay has pull but not read
       - person group contains device keys
       - meme-as-group grants propose/promote separately
       - revoked node can access past sediment but not future live tail
       - cryptographically valid UCAN-shaped proof fails Lararium caveats
       - membership graph sync changes visible manifest before content deltas transfer
  5. Identify any conflicts with current main-branch docs:
       ROADMAP.md
       MULTIPLAYER-INFINITE-CANVAS-WIKI.md
       memetic-wikitext-spec.md
       any lar-uri / pranala / graph traversal law docs

Output format:

  - One-page council synthesis.
  - Patch queue: exact docs/sections to modify.
  - Invariant meme drafts in memetic-wikitext voice, but not expanded beyond minimal viable law.
  - Fixture test list with expected pass/fail semantics.
  - Open questions requiring operator ruling.

Register discipline:

  [C] only for verified repo or source facts.
  [SC] for strong synthesis ready for Joshua/Freyja confirmation.
  [S] for architectural proposals.
  [SP] for attractive but unproven patterns.
  [P] provisional — session-local candidate; dissolves rapidly unless ratified.

Watch for failure modes:

  - Confabulation-as-Canon: do not promote Brooklyn/Keyhive inspiration to Lararium law without an explicit operator ruling.
  - Central-Guard Drift: do not smuggle server-side ACL thinking back into the architecture.
  - Socket Collapse: do not call an edge island a websocket.
  - Crypto Theater: do not claim security properties until implementation and audit exist.
  - Overclosure: keep unresolved revocation, epoch, and key-management choices visible.

Return with the council voice surfaced and a concrete next patch plan.
```

---

## Current Recommendation

Adopt this sentence as the working center:

```text
Lararium federation uses UCAN-compatible Orichalcum capabilities to open durable, offset-resumable causal islands between nodes; each edge island reconciles authority first, visible graph second, document deltas third, and projection last.
```

This keeps the DreamNet interoperable with modern capability research while preserving Lararium’s own mythic/semantic authority model.

---

## Implementation Decision — 2026-04-29 (Local-First Pivot)

### CRDT: Automerge-repo chosen over Yjs

Yjs was evaluated (including a prior y-tiddlywiki alpha). Root cause of boot failures: `session.synced` event races IDB materialization — `isReady()` gates on `session.synced` in the browser path, which fires after IDB load in some network conditions. The race is structural.

Automerge-repo v2.5.5 resolves this: `await handle.whenReady()` is a sequential, race-free gate. Local IDB snapshot materializes first; server is a sync peer, not an authority. Boot is deterministic.

**Automerge storage:**
- Browser: `IndexedDBStorageAdapter` keyed by hostId
- Node: `NodeFSStorageAdapter` in `.lararium-data/meme-store/`
- Doc URL persisted in `localStorage` (browser) and `doc-url.txt` (node) for offline-first rebind

### UCAN: implemented now (not deferred)

The "consume principles, defer wire compatibility" stance from the earlier draft was correct as research posture. It is now superceded by implementation.

**What is shipped:**
- Ed25519 keypair generation via `@noble/ed25519` v3 — `generateOperatorIdentity()`
- `did:key:z...` encoding — multicodec `0xed01` + base58btc multibase, inline (no multiformats dep)
- UCAN v0.10 JWT issuance + verification — `issueUcan()` / `verifyUcan()` in `@lararium/mesh/authority`
- `UcanPeerRegistry` — maps Automerge peerId → verified issuer DID + expiry
- `/auth/ucan` POST endpoint — browser presents UCAN, server validates + registers peer
- `sharePolicy` hook — `isAuthorized(peerId) || true` (local-operator permissive mode)
- `<meta name="lararium-operator-did">` — server DID injected into every HTML response
- Boot receipt `issuer.id` = real operator DID

**What is NOT shipped (future):**
- Keyhive WASM — plugs into `sharePolicy` hook when Brooklyn’s library is available
- UCAN proof chains / delegation — `prf` array is empty for root operator UCANs
- `@ucans/ucans` dependency — the spec is simple enough to own directly; alpha-library risk avoided
- `LarariumAuthorityEnvelope["keyhive"]` arm — typed socket, not instantiated

### Orichalcum

The Orichalcum capability envelope is now partially implemented: the UCAN `att[].with` and `att[].can` fields are the `resource` and `ability` slots from the Orichalcum profile. Full caveats (`stage-band`, `confidence`, `kapu-scope`, etc.) are future work, added when federation pressure arrives.

### Keyhive readiness checklist

| Item | State |
|---|---|
| `did:key` Ed25519 principal on both ends | ✓ shipped |
| UCAN issuance from browser identity | ✓ shipped |
| UCAN verification on server | ✓ shipped |
| `sharePolicy` hook for membership check | ✓ seam ready |
| Automerge-repo two-store architecture | ✓ shipped |
| Keyhive WASM binding | ○ blocked on Brooklyn’s team |
| Proof chain / delegation | ○ deferred |
| Revocation epoch | ○ deferred |

