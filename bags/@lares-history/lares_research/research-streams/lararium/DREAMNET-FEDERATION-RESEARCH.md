# DreamNet Federation Research

> Date: 2026-05-06
> Branch: feature/lararium-node-3
> Tasked spirits: four parallel agents — federation topology, UCAN/Keyhive, presence/ephemeral state, invite-seeding + visual graph prior art

---

## 1. Federation Topology — Nexus as Namespace

### Prior Art Comparison

| System | Namespace Identifier | Document Address | Peer Membership Signal | Small-Network Failure Mode |
|---|---|---|---|---|
| Nostr | None (relay URL informal) | `<kind>:<pubkey>:<d-tag>` event | Client config, manual relay list | Relay disappears = content gone; no coherent group without NIP-29 |
| ATProto | PDS hostname + DID | `at://did/lexicon/rkey` — DID-rooted, portable | DID document points at PDS | Crawler centralization; small operator PDS invisible without relay |
| Matrix | `server_name` (DNS label) | `!opaque-id:server_name` — server-namespaced, not portable | Register on homeserver | Room address bound to originating server; server death strands room |
| Spritely/OCapN | Sturdyref (capability URI: netlayer + pubkey + Swiss number) | Capability reference is the address | Possession of sturdyref = membership | No ambient discovery; loss of bootstrap sturdyref = no entry |
| Automerge-repo | StorageId + PeerId (no namespace concept above doc) | `DocumentId` (random UUID-ish) | SharePolicy per peer pair | No broadcast scope; "group" must be built by app layer |
| IPFS/libp2p | Topic string (GossipSub) or CID prefix | CID (immutable) or IPNS key (mutable) | Subscribe to topic | Topic strings unguarded; small swarms drop messages |

### Key Findings

- **Strongest namespace primitive**: a keypair (ATProto DID, OCapN sturdyref). DNS-rooted namespaces (Matrix `server_name`) die with the domain.
- **Most portable document addresses**: ATProto `at://did/…` — DID document can be re-pointed at a new PDS without changing content address.
- **Closest fit for invite-seeded private groups**: OCapN — no ambient discovery; possession of capability = membership. But has no document-sync layer.
- **Automerge handles sync, not groups** — the group concept must be built at the application layer.

### Recommendation for DreamNet

Hybrid: **OCapN capability-as-membership + ATProto DID-rooted portable addresses + Automerge for CRDT sync**.

- **Nexus identifier** = Ed25519 keypair. Public key serves as the namespace root. `lar://<nexus-pubkey>/<doc-id>`.
- **Room address** = `lar://<nexus-pubkey>/<doc-id>` where `<doc-id>` is the Automerge DocumentId. Cross-Nexus content: a signed alias tiddler mapping the foreign `lar://` URI to a local document.
- **Membership** = possession of a signed invite token from the Nexus operator key (OCapN sturdyref model).
- **Cross-Nexus federation** = Nexus A signs a "federation treaty" event readable by both operator keys. Peers in either Nexus can sync the shared room; the room address stays anchored to the creating Nexus.
- **Enforcement** = Automerge-repo `sharePolicy` gate. A peer only syncs a DocumentId if it can present a valid membership token for that document's Nexus.

---

## 2. UCAN + Keyhive — Auth Substrate

### UCAN Status (May 2026)

- **UCAN spec**: v1.0.0-rc.1. Core Delegation and Invocation sub-specs stable. Treated as production-ready by the working group.
- **Best TS library**: `ucanto` (storacha/ucanto) — typed UCAN RPC framework, battle-tested in Storacha/web3.storage production infra. Defines capabilities as typed schemas; delegation chains compose naturally.
- **Gap**: `ucanto` targets hub-spoke topology (client delegates to a service). Does not natively handle P2P mesh where any peer can promote to operator and revocation must propagate without a central index.

### Keyhive (Ink & Switch) — The Answer to the Gap

Brooklyn Zelenka (UCAN co-author) moved to Ink & Switch and is leading **Keyhive**, a capabilities system co-designed with Automerge's CRDT model.

- **Convergent Capabilities ("concap")**: UCAN-CRDT hybrid. Capability token embeds CRDT state, enabling coordination-free delegation and revocation across peers without a central revocation registry.
- **Group Management CRDT**: concurrent group membership with coordination-free revocation.
- **Beelay sync protocol**: Automerge's next network sync layer. Sync servers relay encrypted payloads they cannot read; only Keyhive-granted peers can decrypt. E2EE at the protocol layer.
- **GAIOS**: Ink & Switch's local-first app platform; Keyhive integrated.
- **Status**: Pre-alpha Rust crates (`keyhive_core`, `beelay-core`). FOSDEM 2026 talk covers the Automerge + Keyhive design. No TS/WASM bindings yet.

### Decision for lararium

| Now | Later |
|---|---|
| Node-local Ed25519 operator keypair | Keyhive convergent capabilities |
| `ucanto`-compatible capability schemas (typed, UCAN-aligned surface) | Slot in Keyhive WASM when TS bindings ship |
| No delegation | Coordination-free delegation + revocation via Keyhive |

**Design the capability surface to be Keyhive-compatible now.** The `encryptedShareHint` field on `CircleTiddler` already provides the forward-compatible hook.

### References

- [Keyhive — Ink & Switch](https://www.inkandswitch.com/project/keyhive/)
- [Keyhive lab notebook](https://www.inkandswitch.com/keyhive/notebook/)
- [ucanto — storacha/ucanto](https://github.com/storacha/ucanto)
- [FOSDEM 2026: Automerge + Keyhive](https://fosdem.org/2026/schedule/event/BZ9CAE-automerge/)
- [Brooklyn Zelenka — localfirst.fm ep. 19](https://www.localfirst.fm/19)

---

## 3. Presence and Ephemeral State

### Prior Art

| System | Mechanism | Persistence | Offline? |
|---|---|---|---|
| Automerge Repo | `DocHandle.broadcast()` / `"ephemeral-message"` | None (unreliable broadcast) | No delivery guarantee |
| Yjs awareness | `y-protocols/awareness` — clock/slot mini-CRDT | None (never in Y.Doc) | Local until reconnect |
| tldraw | `TLInstancePresence` records in store — not persisted | Three-tier: document / session / instance_presence | Session tier is device-local |
| Liveblocks/PartyKit | Server-arbitrated JSON presence per connection | Server memory only | Breaks offline; server-authoritative |

### Key Findings

- **Automerge Repo has a built-in ephemeral channel** (`DocHandle.broadcast()`) — CBOR-encoded, scoped to a DocHandle, zero persistence, unreliable delivery. `PeerId` runs per-connection (tab/process), not per stable user identity — single human with two tabs = two PeerIds.
- **Yjs awareness provides the reference design**: each client owns one slot keyed by `clientId`; clock-based LWW; 30s heartbeat; disconnect = null-state broadcast.
- **tldraw enforces session/document boundary at schema level**, not transport level. Record type determines persistence tier.
- **Never write presence into the Automerge document** — pollutes causal history, inflates storage.

### Recommendation for lararium

**`DocHandle.broadcast()` + Yjs-awareness-style slot model, owned by each peer.**

```ts
// Each peer maintains and broadcasts this slot
type PresenceSlot = {
  userId:    string   // stable identity key
  deviceId:  string   // stable per-device key
  cursor:    { x: number; y: number } | null
  viewport:  { x: number; y: number; zoom: number } | null
  selection: string[]  // tiddler titles or shape ids
  clock:     number    // monotonic counter, peer-owned
}
```

- Broadcast on every change via `docHandle.broadcast(slot)`; receive via `on("ephemeral-message")`.
- Apply LWW per `(peerId, deviceId)` key.
- 15–20s heartbeat; expire silent peers after 30s.
- **Session-local state** (camera, draft, focus ring) = never enters `broadcast()`. Lives in non-synced local carrier tiddler.
- **Single-user multi-device** = protocol-identical to multi-user. UI layer distinguishes by `userId`.
- **Do not use short-lived CRDT docs for presence** — CRDT accumulates causal history; presence has no merge semantics.

### Session / Document / Presence Tier (settled)

| Tier | Where it lives | Syncs? | Persists? |
|---|---|---|---|
| document | Automerge CRDT doc | Yes — all peers | Yes — durable |
| session | Local carrier tiddler (non-synced field) | No | Device-local |
| presence | `docHandle.broadcast()` | Broadcast only | No |

---

## 4. Invite-Seeding

### Prior Art

| System | Invite Primitive | Offline-Verifiable? | Can regular user propagate? |
|---|---|---|---|
| ATProto | Opaque server-generated token | No | No — operator only |
| SSB | `(pub-domain, pub-port, pub-pubkey, one-time-secret)` | Yes (pubkey verifiable) | Pub follows back; follow graph is de facto invite |
| Nostr | No formal invite; follow graph only | N/A | N/A |
| UCAN | Capability token with delegation chain | Yes | Yes — with attenuation |

### Recommended Primitive for DreamNet

SSB-style token structure + UCAN-lite signature:

```ts
type NexusInviteToken = {
  iss:   string  // nexus operator DID (Ed25519 pubkey as did:key)
  cap:   "join/nexus"
  exp:   number  // unix timestamp
  nonce: string  // random 32 bytes, single-use
  // signed with operator key
  sig:   string
}
```

- Operator's DID keypair serves as the trust anchor (no central registry).
- Nonce prevents replay; operator burns it on redemption.
- Any peer can verify offline — check signature against known operator pubkey.
- Chain of operators: each operator's DID can be published in a signed "operator list" tiddler, forming a web of trust without a root CA.
- Full UCAN proof chains (attenuation, sub-delegation) can be added later without breaking this surface.

---

## 5. Visual Graph / Spatial Wiki Prior Art

### Prior Art

| System | Key Insight | Data Model | Local-First? |
|---|---|---|---|
| V.U.E. (Tufts, last updated 2015) | Nodes as addressable resource containers; OWL/RDFS edge semantics | Node = digital library object; typed edge labels | No (Java desktop) |
| Kinopio | Spatial position IS semantic; local-first core | `Space → { Card[], Connection[], Box[] }` — cards have `(x, y, z)`; connections have `connectionType` | Yes (localStorage + async server sync) |
| Verse/UEFN visual scripting | No shared mutable state; explicit effect annotations; visual Verse = structured editor over AST | Pure functions + async tasks; effects require `<transacts>`/`<suspends>` | N/A (game engine) |
| tldraw + Obsidian (2024–2025) | Shapes as markdown files with backlinks | One drawing per file; no bidirectional graph DB | Partial |

### Gap DreamDeck Occupies

No existing project treats tldraw shapes as first-class wiki nodes with bidirectional `lar://` links in a graph database sense. That gap marks the exact space DreamDeck fills.

### Five Principles DreamDeck Should Carry Forward

1. **Spatial position carries semantic weight** (Kinopio) — do not throw away XY layout; it encodes relationships the formal graph does not.
2. **Nodes function as resource containers** (V.U.E.) — each canvas node addresses via `lar://` URI and embeds.
3. **Edge types are first-class** (V.U.E. + Kinopio `connectionType`) — typed, colored, named relationships; not just lines.
4. **No shared mutable state at the scripting layer** (Verse) — reactive/functional event model; mutation through explicit transactions.
5. **Export to open formats** (Kinopio JSON Canvas, Obsidian-compatible) — the graph is not a walled garden.

---

## Open Questions (as of 2026-05-06)

| Question | Notes |
|---|---|
| `lar://` URI grammar — `lar:///path` → `lar://<nexus-pubkey>/path` | Structural change to core URI grammar; needs a focused design pass |
| Cross-Nexus federation granularity — room-level or Nexus-level? | No `nexus_id` in schemas yet; more research needed |
| Keyhive TS/WASM bindings ETA | Pre-alpha Rust only; watch Ink & Switch dispatches |
| Beelay sync layer integration with Automerge-repo | Co-designed; watch automerge-repo PRs for auth integration points |
| `@lararium/browser` vs `@lararium/tw5` as broadcast owner | Research suggests transport layer (`@lararium/browser`); schema enforcement is the dividing line |
