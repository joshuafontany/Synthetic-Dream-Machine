# Lararium Protocol Stack — Identity, Groups, Sessions

> Created: 2026-05-05
> Updated: 2026-05-05 (round 2 — 6-doc model codified; presence/eventlog patterns resolved)
> Branch: feature/lararium-node-3
> Status: Design doc — pre-implementation; governs S6–S7 sprint scope
> Context: Synthesized from seven parallel research threads (Zelenka/UCAN/Keyhive, Ink & Switch / Kleppmann, Kowloon / jzellis Circles, Matrix / session semantics, automerge-repo presence primitives, Automerge event log patterns, three-layer ephemeral tiga prior art) + active Automerge quine work (S2–S4 complete, S5 in progress)

---

## North Star

Every Lararium peer establishes who it is (IdentitiesDoc), what authority it holds (CirclesDoc), and what it is doing right now (SessionsDoc), all without a central server. The content it operates on lives in the genesis artifact (LarariumDoc / island). These are distinct protocol concerns requiring distinct document shapes.

The capability layer sits above all. It answers "is this peer allowed to do this?" without contacting any server, by walking a signed delegation chain. This layer is currently absent from the implementation — its absence is what makes the social-tiga docs structurally incomplete.

---

## Current 6-Doc Model (as implemented, S4 complete)

Two tigas (ha-ka-ba) each with three root Automerge docs. All six live in `lararium-mesh/src/`.

### Content Tiga

| Slot | Doc type | URI | Role |
|---|---|---|---|
| **ha** | `LarariumDoc` | `lar:///ha.ka.ba/@lararium` | System island — genesis artifact, TW5 core + plugins, recipes, tiddlers |
| **ka** | `CatalogDoc` | `lar:///ha.ka.ba/@catalog` | Index — corpus entries, room entries, projection entries, cross-doc URL map |
| **ba** | `MemeStoreDoc` (LaresDoc) | `lar:///ha.ka.ba/@lares` | Personal workspace — operator memes, local tiddlers |

### Social Tiga

| Slot | Doc type | URI | Role |
|---|---|---|---|
| **ha** | `IdentitiesDoc` | `lar:///ha.ka.ba/@identities` | Principal records — device keys, delegation proofs |
| **ka** | `CirclesDoc` | `lar:///ha.ka.ba/@circles` | Collective authority — group membership, capability grants |
| **ba** | `SessionsDoc` | `lar:///ha.ka.ba/@sessions` | Live session registry — one tiddler per session |

All six docs: tiddler-first (`tiddlers: Record<string, MutableLarRecord>`), no typed Records outside `tiddlers`. Oracle tiddlers in the island doc point to the other five via `reconcileWellKnownTiddlers()`.

### Is a third tiga needed?

**No new root tiga.** Research (automerge-repo presence primitives, Matrix EDU split, Yjs awareness) confirms the right model:

- **Ephemeral presence** → `docHandle.broadcast()` on the session handle. NOT a separate persisted doc. automerge-repo's native `EphemeralMessage` primitive — transport-coupled, never touches `NodeFSStorageAdapter`, auto-expires on disconnect. Direct equivalent to Yjs awareness.
- **Event log** → one `SessionEventLog` Automerge doc **per session**, created dynamically. Referenced from the session tiddler by `AutomergeUrl` + `getHeads()` snapshot. NOT a root tiga slot.

The six root docs stay. Sessions grow dynamic child docs (one `SessionEventLog` per session). Ephemeral state uses broadcast, not docs.

---

## The Layering

```
┌─────────────────────────────────────────────────────────────────┐
│  Capability Layer (UCAN delegation chain / Keyhive)              │
│    did:key per device → IdentitiesDoc delegation proofs          │
│    invite tokens → CirclesDoc membership                          │
│    session:join tokens → SessionsDoc participation               │
├─────────────────────────────────────────────────────────────────┤
│  Circles Layer (CirclesDoc — social tiga ka)              │
│    Keyhive convergent capabilities                               │
│    Nexus admin = founding key for system circles                  │
│    Users = founding key for personal circles (Kowloon model)     │
│    Seitan token invitations (out-of-band, self-verifying)        │
├─────────────────────────────────────────────────────────────────┤
│  Identity Layer (IdentitiesDoc — social tiga ha)                 │
│    Person-as-group: set of device did:key members                │
│    Delegation chain: "Device B is also me"                       │
│    Scoped per-identity, not a network roster                     │
├─────────────────────────────────────────────────────────────────┤
│  Session Layer (SessionsDoc registry — social tiga ba)           │
│    Root registry CRDT: one tiddler per session                   │
│    Each session tiddler → AutomergeUrl of its SessionEventLog    │
│    Ephemeral presence → docHandle.broadcast() (NO separate doc)  │
│                                                                  │
│    Per-session (dynamic, not root-tiga):                         │
│      SessionEventLog — append-only Automerge doc                 │
│        referenced by { url: AutomergeUrl, heads: string[] }      │
│        in the session tiddler; supports replay via view()        │
├─────────────────────────────────────────────────────────────────┤
│  Content Tiga (ha-ka-ba)                                         │
│    ha  LarariumDoc   — system island + genesis artifact          │
│    ka  CatalogDoc    — corpus/room index, cross-doc URL map      │
│    ba  MemeStoreDoc  — personal workspace (lares)                │
└─────────────────────────────────────────────────────────────────┘
```

Each layer depends on the ones below. A session references identity and group membership to establish who is participating and at what authorization level. Group authority depends on identity to verify that delegation chains are signed by real keys. The content layer (island) is the substrate that all of the above operates on.

---

## Authz Ladder

Four levels, mapping to UCAN capability scopes:

| Level | Keyhive principal | Capability scope |
|---|---|---|
| `user:anon` | No IdentitiesDoc entry; no verified device key | Read-only access to public island content |
| `user` | IdentitiesDoc entry: one or more linked device `did:key`s | Read/write own content; join user-level groups |
| `operator` | `user` + capability grant from a system group admin | Operate nodes; manage deployments; access operator groups |
| `operator:admin` | `operator` + "manage" capability in nexus system group | Add/remove operators; manage system groups; bootstrap new nexus peers |

---

## IdentitiesDoc

### Scope (clarified)

Three incorrect framings collapse into one correct framing:

- **Wrong: device-local key storage** — private keys never replicate; they never leave the device.
- **Wrong: shared roster of all users** — a network-wide user list is a query over CirclesDoc, not a stored collection in a per-identity doc.
- **Correct: delegation proof structure** — IdentitiesDoc holds the evidence that allows any peer to verify "Device X is authorized to speak as Identity Y."

### Model: person-as-group (Keyhive)

Brooklyn Zelenka's Keyhive establishes the canonical framing: *a person is a group whose members are that person's device keys.* Multi-device identity is structurally identical to group membership. No special case, no separate primitive.

Each person (or bot) has one IdentitiesDoc. It contains:

- **Founding device key** — the `did:key` of the first device; the self-sovereign root. Its private key never leaves the device.
- **Device delegation assertions** — "Device B is also me": a signed UCAN token where `iss` = an already-authorized device key and `aud` = the new device's `did:key`. The delegation chain is the proof structure.
- **Nothing else** — not session state, not group memberships, not content.

### Multi-device linking (UCAN / Fission AWAKE)

When a user links a new device:

1. Existing authorized device and new device establish an encrypted channel out-of-band (AWAKE protocol — X25519 ECDH + XChaCha-Poly1305).
2. Existing device issues a full-capability UCAN delegating its `my:` resource (self-authority) to the new device's agent DID.
3. The delegation token is written into IdentitiesDoc as a tiddler.
4. Any peer can now verify "Device B speaks as Identity Y" by walking the chain: new device's key → delegation token signed by founding device key → founding device's did:key.

Private keys never cross the wire. The delegation is the proof, not the key.

### Key rotation

Following Fission WNFS: rotation = add new device individual, remove old one. The revocation event is signed by any remaining authorized device. Keyhive's ERA paper (arXiv:2601.22963) handles the edge case where concurrent revocations create a conflict ("Duelling Devices") via epoch-resolved arbitration.

---

## CirclesDoc

### The Kowloon Inversion (primary model)

From Josh Ellis's Kowloon `CLAUDE.md`:
> "Kowloon has **no follow/unfollow system**. Circles replace the social graph. Adding someone to a circle IS the follow. There are no followers/following counts, no social graph edges."

Circle membership **never federates**. The social graph is sharded — each peer's graph lives exclusively on their local node, cannot be queried from outside, and is never transmitted. No remote node can reconstruct who follows whom. This is the inversion: on centralized platforms the platform owns the graph; here the peer owns the graph.

See full reference: `packages/lares-core/memes/api/v0.1/pono/circles-kowloon.md`

### Two founding modes, same structure

| Mode | `kind` | Founding key | Use case |
|---|---|---|---|
| Nexus-seeded | `"System"` | Nexus `operator:admin` key | Authorization tiers: nexus:anon/user/operator/admin |
| User-created | `"Circle"` | User's root device key | Personal circles, project groups, RPG parties |

These are structurally identical — only the trust root differs. The nexus cannot add users to a user-created circle, and a user cannot add themselves to a nexus system circle without a valid delegation chain.

**System circles auto-seeded at identity boot** (from Kowloon model):
- `@circles/following` — peers the operator actively reads
- `@circles/all-following` — superset: followed nodes + circles
- `@circles/circles` — tracks circle memberships
- `@circles/blocked`, `@circles/muted`

**Nexus authorization circles** (seeded by nexus admin at nexus boot):
- `@circles/nexus:anon`, `@circles/nexus:user`, `@circles/nexus:operator`, `@circles/nexus:admin`

### Circle founding

A circle genesis operation, signed by the founding key, contains:
- The circle's content-addressed ID (derived from genesis event hash — permissionless, no registry)
- The founding key's `did:key`
- The initial capability grants to initial members (UCAN delegations)
- `kind: "Circle" | "System"` and access policy schema

### Membership assertion

Capability delegation, not URL knowledge. A device proves membership by presenting a delegation chain from the circle's founding key (or from an authorized admin) to its own device key. This is revocable and auditable.

### Invite model: Seitan tokens (@localfirst/auth)

Out-of-band invite mechanism from Herb Caudill's `@localfirst/auth`:

1. Existing member with admit rights generates an invite secret key.
2. Distributes the invite token OOB (QR code, DM, link).
3. Recipient presents proof-of-possession of the secret (without revealing it) to any existing member.
4. Any member can validate admission — no server required, no admin online required.

The invite hash IS the secret key derivation; the CRDT signature chain records the admission event.

### Admin vs member distinction

Model as distinct capability levels, not role flags in document state:

- **`manage`** — can issue/revoke member capabilities; modify circle config
- **`write`** — can add content to docs the circle protects
- **`read`** — can read circle-protected content

An admin holds `manage + write + read`. A member holds `write + read` or `read` only. This lives in the capability layer, not in CirclesDoc tiddler fields.

### Addressing on content tiddlers

Kowloon's `to` / `canReply` / `canReact` fields on content objects map to tiddler fields on content tiddlers (planned S7+). Addressing hierarchy:

```
@public          — federated, anyone
@<node-domain>   — this node's members only
<circleId>       — only members of that circle (must be owner's circle)
<did>            — only that identity (direct message)
(blank)          — author only
```

A circle can only be targeted by its owner — enforced at content-write time.

### Duelling admins

ERA paper (arXiv:2601.22963, January 2026): concurrent mutual admin revocations resolve within epoch boundaries. An optional finality node (the nexus) arbitrates in batches without blocking availability. Adjacent to Keyhive proper; the right model for nexus admin conflicts.

### NIP-29 failure case (what to avoid)

Nostr relay-based groups give the relay root authority over all group events — the relay IS the group owner. Lararium's founding-key model avoids this: the nexus routes and relays but cannot forge circle membership or issue capabilities.

---

## SessionsDoc

### The resolved model (post round-2 research)

Research across Matrix, Yjs, automerge-repo native primitives, and event sourcing patterns converges on three distinct concerns — but **not three separate root docs**:

| Concern | Implementation | Automerge doc? | Persisted? |
|---|---|---|---|
| **Session registry** | `SessionsDoc` (existing root, social tiga ba) | Yes — root CRDT | Yes |
| **Per-session metadata + roster** | Tiddler fields inside `SessionsDoc` | Inline in root | Yes |
| **Per-session event log** | `SessionEventLog` — one dynamic doc per session | Yes — child doc | Yes |
| **Ephemeral presence** | `sessionHandle.broadcast()` (EphemeralMessage) | **No** | **No** |

The current `SessionsDoc` as a registry is structurally sound. Each session = one tiddler at `sessionTiddlerUri(id)`. The tiddler's fields hold metadata; its `text` field holds the `AutomergeUrl` of that session's `SessionEventLog`. Ephemeral presence (cursors, ready-state, turn order) flows through the `broadcast()` channel — never written to disk, never in the CRDT.

### SessionsDoc root (registry)

Existing shape: `tiddlers: Record<string, MutableLarRecord>`. Each session tiddler holds:
- `id`, `operatorDid`, `agentId`, `startedAt`, `state` (existing `SessionTiddler` fields)
- `eventLogUrl` — `AutomergeUrl` of the `SessionEventLog` doc for this session
- `eventLogHeads` — `string[]` of `getHeads()` at last known checkpoint (for content-addressed replay)
- `capabilityToken` — UCAN `session:join` root hash (not the token itself — see below)

### SessionEventLog (dynamic child doc, one per session)

One Automerge doc created at session-open time, its URL stored in the session tiddler.

**Shape:**
```ts
interface SessionEventLog extends LarDoc {
  events: SessionEvent[];  // Automerge List — append-only by convention
}

interface SessionEvent {
  id:          string;       // content-addressed: sha256 of payload
  authorDid:   string;       // device DID of authoring peer
  type:        string;       // "message" | "action" | "agent:invoke" | "system"
  payload:     string;       // JSON-encoded event body
  causedBy?:   string[];     // IDs of events this causally follows
  sig?:        string;       // ed25519 signature of id by authorDid's key (planned)
}
```

**Merge semantics:** Automerge List with RGA (Replicated Growable Array). Concurrent appends from two agents both land in the list; ordering is deterministic (actor-ID tiebreak). Each entry carries `causedBy` for causal ordering during replay, independent of list position.

**Replay:** Load the doc via `repo.find(eventLogUrl)`, optionally passing `heads` for a historical snapshot via `Automerge.view(doc, heads)`. Walk the list in stored order; use `causedBy` for causal reconstruction.

**Compaction:** automerge-repo storage compaction (patternist.xyz pattern) — lossless re-encoding of the change history as a compressed snapshot. Write a `compactedAt` checkpoint event into the list when the event count exceeds a threshold; this enables O(1) state reconstruction without full replay while preserving the full append log.

### Ephemeral presence (broadcast — not a doc)

automerge-repo has a first-class `EphemeralMessage` primitive. Use it:

```ts
// Send your presence state (fires over live transport, never stored)
sessionHandle.broadcast({
  type: "presence",
  peerId: repo.peerId,
  identityDid: myDid,
  ready: true,
  cursor: { x, y },
  turnOrder: 3,
});

// Receive all peers' presence
sessionHandle.on("ephemeral-message", ({ peerId, message }) => {
  if (message.type === "presence") updatePresenceMap(peerId, message);
});
```

Direct equivalent to Yjs awareness (`y-protocols`): identity-scoped, transport-coupled, never persisted, auto-expires on peer disconnect. Each peer owns its own presence slot; no peer writes another's. The `sessionId` in the EphemeralMessage wire format serves as the per-peer identity anchor.

**For RPG sessions**: turn order broadcast via presence; confirmed turn resolution written as a `"system"` event in `SessionEventLog`.

### What does NOT belong anywhere in the CRDT

- **Auth tokens** — bearer credentials; storing in a shared CRDT exposes them to all peers
- **UCAN invite tokens** — transmitted OOB, validated cryptographically, never stored as shared content
- **Private keys** — never, under any circumstances
- **Derived state** — render trees, summaries; projections from the event log, not ground truth

### Session invitation (UCAN capability model)

A session owner creates a UCAN delegating `session:join` capability for a specific session ID to a recipient DID. The recipient presents this UCAN to any peer in the session. No server validates it — the capability chain is self-verifying. Any peer that already holds `session:join` or `session:manage` can admit the new participant. The UCAN root hash (not the token) is stored in the session tiddler as `capabilityToken` — a public commitment, not a secret.

Maps to: RPG party invitations, multiplayer lobbies, agent-handoff, operator console handoff.

### AI agent sessions

Electric SQL pattern (April 2026): agent = first-class CRDT peer with its own device DID; opens its own copy of the SessionsDoc and SessionEventLog; participates in `broadcast()` for presence. Its event log entries carry its own `authorDid`. Handoff = pass `session:join` UCAN to new agent instance.

Google ADK session state levels map to:
- `session.state` → `broadcast()` presence payload (ephemeral, per-instance)
- `user:` prefixed state → `IdentitiesDoc` (cross-session, per-identity)
- `app:` prefixed state → `CirclesDoc` or island config (global)
- `Memory` (long-term) → `SessionEventLog` + vector store URL in session tiddler

---

## Genesis Artifact Context (S2–S4 Complete)

The genesis artifact (`genesis/island.bin`) is the content-addressed Automerge binary that every peer boots from. It contains TW5 core blob, vendored plugins, lares plugin blob, system titles, recipes, and bag/blob descriptors. It does NOT contain identity, group, or session state — those are runtime-assigned and live in the satellite docs.

The four-doc model sits on top of the genesis artifact:
- `loadGenesisIsland(repo)` — boots from genesis bytes; returns `DocHandle<LarariumDoc>`
- `seedIdentitiesDoc(repo)` — creates a new IdentitiesDoc; writes self-ref tiddler
- `seedCirclesDoc(repo)` — creates a new CirclesDoc; writes self-ref tiddler
- `seedSessionsDoc(repo)` — creates a new SessionsDoc (to be replaced by S6 three-doc split)

`reconcileWellKnownTiddlers()` writes the Tiga edge oracle tiddlers (runtime-assigned Automerge URLs) into the island handle after boot. These edges are the runtime connections between the content layer and the identity/group/session layers.

**The missing piece**: the capability layer (UCAN delegation chain or Keyhive convergent capabilities) is not yet wired. Until it is, the satellite docs exist but have no structural authority binding — any peer can write any doc. S6 and S7 implement the binding.

---

## Sprint Plan Implications

**S5 — Quine Round-Trip (active, unblocked)**
- Wire `.tw5.cjs` plugin blobs into `build-genesis-island.ts`
- Boot node peer from genesis; render grammar meme via TW5 vm
- Verify rendered output hash matches source tiddler hash
- Write genesis CID as self-ref tiddler into island doc
- This research does not affect S5 scope

**S6 — SessionsDoc + SessionEventLog**

The six root docs stay. The session architecture change is additive, not a teardown:

- `SessionsDoc` root shape: add `eventLogUrl: string` and `eventLogHeads: string[]` fields to `SessionTiddler` interface in `social-doc.ts`
- Add `SessionEventLog` doc type + `SessionEvent` entry type in `social-doc.ts`
- Add `seedSessionEventLog(repo, sessionId)` in `genesis-island.ts` — creates one `SessionEventLog` doc and returns its `AutomergeUrl`
- Replace `capabilityToken` field semantics: store UCAN root hash (not the token)
- Wire `broadcast()` usage into any session-opening code path (no new seeder needed — `broadcast()` is a channel, not a doc)
- Update `reconcileWellKnownTiddlers` signature is unchanged — no new root-level URL to wire

**S7 — Identity + Group Protocol**

Design doc required before code (this document is the precursor):
- `IdentitiesDoc`: implement Keyhive person-as-group model; `IdentityTiddler.verifyingKey` already exists; add device delegation chain tiddlers
- `CirclesDoc`: implement convergent capability grants + Seitan token invitations; nexus admin as founding key for system groups; ERA epoch model for admin conflicts; `CircleTiddler.encryptedShareHint` already present as a forward-compatible hook
- Introduce capability verification layer: any peer can verify "Device X speaks as Identity Y at authority level Z" without contacting a server

---

## Primary Sources

### Identity, Authorization, Capability

| Topic | Source |
|---|---|
| UCAN spec | [ucan.xyz/specification](https://ucan.xyz/specification/) |
| Keyhive notebook | [inkandswitch.com/keyhive/notebook](https://www.inkandswitch.com/keyhive/notebook/) |
| Keyhive GitHub | [github.com/inkandswitch/keyhive](https://github.com/inkandswitch/keyhive) |
| ERA paper (duelling admins) | [arXiv:2601.22963](https://arxiv.org/abs/2601.22963) |
| @localfirst/auth (Seitan tokens) | [github.com/local-first-web/auth](https://github.com/local-first-web/auth) |
| Kleppmann PaPoC 2025 keynote | [martin.kleppmann.com/2025/03/31/papoc-keynote-byzantine](https://martin.kleppmann.com/2025/03/31/papoc-keynote-byzantine.html) |
| p2panda access control CRDT | [p2panda.org/2025/08/27/notes-convergent-access-control-crdt](https://p2panda.org/2025/08/27/notes-convergent-access-control-crdt.html) |
| WNFS / skip ratchet (Fission) | [fission.codes/blog/diving-deeper-webnative-file-system](https://fission.codes/blog/diving-deeper-webnative-file-system/) |
| Local-First Software essay | [inkandswitch.com/essay/local-first](https://www.inkandswitch.com/essay/local-first/) |
| did:key spec | [w3c-ccg.github.io/did-key-spec](https://w3c-ccg.github.io/did-key-spec/) |

### Social Graph and Groups

| Topic | Source |
|---|---|
| Kowloon by jzellis | [github.com/jzellis/kowloon](https://github.com/jzellis/kowloon/) |
| ATProto paper (Kleppmann et al.) | [arxiv.org/abs/2402.03239](https://arxiv.org/html/2402.03239v2) |
| NIP-29 Relay-based Groups (failure case) | [nips.nostr.com/29](https://nips.nostr.com/29) |
| DSNP — Decentralized Social Networking Protocol | [dsnp.org](https://dsnp.org/) |

### Session Semantics and Automerge Patterns

| Topic | Source |
|---|---|
| automerge-repo EphemeralMessage / broadcast | [automerge.org/docs/reference/repositories/ephemeral](https://automerge.org/docs/reference/repositories/ephemeral/) |
| automerge-repo React hooks (useRemoteAwareness) | [automerge.org/automerge-repo/modules/…react-hooks](https://automerge.org/automerge-repo/modules/_automerge_automerge-repo-react-hooks.html) |
| Automerge getHeads / view() / history | [mintlify.com/automerge/advanced/viewing-history](https://www.mintlify.com/automerge/automerge/advanced/viewing-history) |
| Automerge storage compaction pattern | [patternist.xyz/posts/concurrent-compaction-in-automerge-repo](https://patternist.xyz/posts/concurrent-compaction-in-automerge-repo/) |
| Yjs awareness | [docs.yjs.dev/api/about-awareness](https://docs.yjs.dev/api/about-awareness) |
| Matrix spec (state/timeline/ephemeral split) | [spec.matrix.org/v1.1/client-server-api](https://spec.matrix.org/v1.1/client-server-api/) |
| MSC2477 (user-defined ephemeral events) | [github.com/matrix-org/matrix-spec-proposals/pull/2477](https://github.com/matrix-org/matrix-spec-proposals/pull/2477) |
| Electric SQL AI agents as CRDT peers | [electric.ax/blog/2026/04/08/ai-agents-as-crdt-peers-with-yjs](https://electric.ax/blog/2026/04/08/ai-agents-as-crdt-peers-with-yjs) |
| Google ADK session model | [google.github.io/adk-docs/sessions/session](https://google.github.io/adk-docs/sessions/session/) |
| Beelay protocol (no ephemeral tier) | [github.com/automerge/beelay/blob/main/docs/protocol.md](https://github.com/automerge/beelay/blob/main/docs/protocol.md) |
| Willow Protocol data model | [willowprotocol.org/specs/data-model](https://willowprotocol.org/specs/data-model/index.html) |
