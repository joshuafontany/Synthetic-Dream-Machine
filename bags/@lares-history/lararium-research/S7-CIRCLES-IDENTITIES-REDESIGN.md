# S7 — Circles + Identities Capability Layer: Deep Redesign

> Date: 2026-05-06
> Branch: feature/lararium-node-3
> Research spirits: jzellis/kowloon source audit + DreamNet hostile-mesh threat model

---

## What the Kowloon Audit Confirms

The original S7 design credited jzellis with the social graph inversion. The audit
confirms that credit was accurate and reveals the specific mechanism worth adopting:

**The follow is a local circle add. It never federates. The followed party never knows.**

`shouldFederate.js` explicitly suppresses `Follow`, `Unfollow`, `Block`, `Mute`, and all
Circle operations from federation. Following is a *read-side, local-only operation* — you
place an actor in your `Following` circle and pull their content. No follow request, no
accept/reject, no notification to the followed party unless you choose to tell them.

Visibility works in reverse: the *writer* sets `to` on each content object, naming a
circle ID (or `@public`). Readers with membership in that circle can see it.
The visibility query (`filter.js`, `context.js`) builds a MongoDB `$or` from all circles
the viewer appears in. **Membership in a circle is the capability grant.**

Three addressing slots per object: `to`, `canReply`, `canReact`. These map cleanly to
three distinct capability grants — read access, reply authority, reaction authority — which
Keyhive can represent as separate delegatable capabilities rather than a single ACL field.

Circle membership integrity: Ellis signs each circle over `id|name|to|sortedMemberList`
with the owner's RSA-2048 key. The concept is right; our implementation uses Ed25519
and Keyhive's convergent document model instead.

---

## What the Kowloon Model Cannot Do (the DreamNet Gap)

Ellis' design assumes good-faith servers and server-scoped identity. DreamNet has neither.

| Ellis assumption | DreamNet reality |
|---|---|
| Server = identity anchor (`@user@domain`) | Keypair = identity anchor (`did:key:…`); server is just another peer |
| Block = don't process that actor's inbound activities | Block needs to work at Nexus level; a hostile Nexus may forge or replay signed activities |
| Circle spans one actor on one server | Circle may span multiple lararia in one Nexus, or bridge multiple Nexus confederations |
| Following = local circle add on your own server | Following = local circle add in your local-first CRDTdoc; server may be offline |
| Key type: RSA-2048 PEM, no rotation protocol | Key type: Ed25519; Keyhive handles key rotation + BeeKEM re-encryption on member change |
| Federation: ActivityPub + HTTP Signatures | Federation: Automerge CRDT sync (within Nexus) + explicit treaty events (cross-Nexus) |
| E2E encryption: absent | E2E encryption: Keyhive BeeKEM (planned) |
| Capability delegation: absent | Capability delegation: Keyhive convergent capabilities + UCAN-compatible schemas |

The gap Ellis reveals is not his design's weakness — it is that his problem space (a
single-server ActivityPub community) and our problem space (a hostile multi-Nexus mesh)
constitute fundamentally different threat models.

---

## The Core Principle: Membership as Capability

Ellis' most transferable insight, restated for DreamNet:

> **A Circle is a convergent CRDT document that confers read, reply, and reaction
> capabilities on its members. Membership in a circle IS the capability token.
> The capability is convergent — membership changes replicate to all authorized peers
> without a central authority.**

In Lararium terms:
- A `CircleTiddler` in `CirclesDoc` is the lightweight local membership record.
- For circles that need to span lararia (Nexus-wide groups, cross-peer collaboration),
  the membership document becomes a Keyhive Group document — a convergent CRDT where
  admin membership changes propagate automatically via BeeKEM.
- The `to`, `canReply`, `canReact` fields on content tiddlers reference a circle ID.
  Any peer that can verify membership in that circle can evaluate access locally —
  no remote server query required.

This is capability-as-CRDT-membership, not capability-as-signed-token. The token model
(UCAN) comes in when crossing Nexus trust boundaries, where you cannot assume the
receiver holds the CRDT.

---

## Five Identity Planes (Revised for DreamNet Hostile Mesh)

The original S7 had two planes (identities + circles). DreamNet requires five, addressing
different trust scopes:

```
Plane 0 — Device           did:key from Ed25519 device keypair
Plane 1 — Operator         did:key from operator's root keypair; Keyhive person-as-group
Plane 2 — Circle           local CRDT membership; confers read/reply/react capabilities
Plane 3 — Nexus            confederation keypair; signs Nexus-level capability tokens
Plane 4 — DreamNet         no central authority; trust emerges from Nexus treaty events
```

**Plane 0 — Device (`did:key` from Ed25519)**
The smallest identity unit. Each device/agent carries its own keypair. Operator identity
is a Keyhive Group of their device keys — any device in the group speaks as the operator.
UCAN delegation chain: `Device B can speak as Identity Y at level Z` (S7 target).

**Plane 1 — Operator**
Stable `IdentityTiddler` in `IdentitiesDoc`. `verifyingKey` field = Ed25519 public key
(hex). The Keyhive person-as-group model wraps multiple device keys into one logical
identity. Key rotation: new device added to group; old device revoked via BeeKEM re-wrap.

**Plane 2 — Circle (local membership CRDT)**
`CircleTiddler` in `CirclesDoc` for personal circles (Following, Blocked, Muted, custom).
For Nexus-scoped circles (`nexus:user`, `nexus:operator`, `nexus:admin`): these seed
locally but are Keyhive Group documents — their membership replicates convergently to all
Nexus peers. A peer joining the Nexus gets the current membership state via CRDT sync,
not a central server query.

**Plane 3 — Nexus**
`NexusRegistryDoc` (S9 work, but capability surface designed here). The Nexus keypair
signs capability tokens that cross-Nexus peers can verify offline. A capability token
issued by Nexus A says: "Bearer with DID X may perform action Y on resources owned by
Nexus A." Cross-Nexus: Nexus B checks "do I trust Nexus A?" against its `allies` treaty
set, then verifies the token against Nexus A's public key.

**Plane 4 — DreamNet**
No global authority. A peer that receives content from an unknown Nexus can verify:
(a) the content is signed by a key it has seen before, and (b) the key belongs to a
Nexus in its `allies` set (or is `@public`). Content from hostile or unknown Nexus nodes
lands as unverified foreign content, not as trusted content — it requires explicit
operator acceptance before entering the local CRDT.

---

## Revised Threat Model: Hostile Nexus Operation

Ellis' block model: "don't process inbound activities from this actor."
DreamNet threat: a hostile Nexus may forge activities from actors you trust, replay old
signed content, or send malformed CRDT patches designed to corrupt local state.

S7 must address three threat levels:

**Threat 1 — Hostile actor (Ellis' model covers this)**
Actor-level block: local `blocked` circle. Inbound content from blocked DIDs never
enters the local CRDT. Works entirely at the tiddler level — no server coordination.

**Threat 2 — Hostile Nexus**
Nexus-level trust assertion. Content from a foreign Nexus requires:
1. The sender's Nexus appears in `allies` or content is `@public`
2. The specific activity is signed by a key the receiver has previously seen for that DID
3. The activity's `atNexus` field matches the expected Nexus ID for that DID

Replay attacks: activities carry a `nonce` + `issuedAt`; receiver burns nonces in a
local LWW-Register tiddler. A replayed activity with a seen nonce gets dropped silently.

**Threat 3 — Malformed CRDT Patch**
Automerge's CRDT merge is always-commit within a trusted peer group. The boundary is
the ingress adapter. The `CrdtIngressAdapter` (on the `LarEventBus` crdt-ring) must:
1. Verify the patch's actor ID appears in the Nexus' allowed-actor set
2. Apply size limits (backpressure on ring depth)
3. Drop patches from actors in the `blocked` circle before applying to any DocHandle

---

## Addressing Model (from Ellis, upgraded)

Every content tiddler carries three addressing fields. These do not change from Ellis'
design — the PRINCIPLE transfers (writer declares who can read; membership is checked locally);
the token vocabulary changes from server-scoped strings to keypair-rooted identifiers:

```
to:        string   // "@public" | "@nexus:{pubkey}" | "circle:{id}" | "group:{lar-uri}"
canReply:  string   // same format; defaults to `to` if absent
canReact:  string   // same format; defaults to `to` if absent
```

NOTE: `@domain` (server-scoped web2 token) does NOT appear here.
The web3 equivalent is `@nexus:{pubkey}` — "any authenticated member of this Nexus."
Identity anchors to a keypair, not a server hostname.

These fields live in the tiddler's `fields` map — queryable from TW5 filter syntax with
no TS interop. `[field[to]match[circle:]]` returns all content addressed to a circle.

**Capability check at read time (no network calls — all state is local CRDT):**
1. Read `to` field of tiddler
2. `@public` — pass
3. `@nexus:{pubkey}` — verify viewer's `IdentityTiddler.nexusId` matches (Tier 1/2)
4. `circle:{id}` — check local `CirclesDoc.tiddlers[circleId].fields.memberDids` contains viewer DID
5. `group:{lar-uri}` — resolve lar: URI to `CircleTiddler` in local CRDT → `memberDids` check

---

## Three-Tier Authority Separation (New)

The original S7 had one tier (Keyhive as the single enforcement mechanism). The redesign
proposes three tiers at different trust scopes:

**Tier 1 — Local CRDT (within a single Lararium)**
`CirclesDoc` membership, checked via TW5 filter. No cryptographic proof required.
The peer already holds the authoritative CRDT; membership is immediately readable.
Use for: personal circles, local draft visibility, operator-self content.

**Tier 2 — Nexus CRDT (within a Nexus confederation)**
Keyhive Group document replicated to all Nexus peers. Membership changes propagate
via BeeKEM convergent re-wrap. Any Nexus peer can verify membership locally.
Use for: `nexus:user`, `nexus:operator`, `nexus:admin` circles; collaborative content
within a trusted Nexus; session presence across multiple lararia.

**Tier 3 — Cross-Nexus token (across Nexus boundaries)**
UCAN-compatible capability token, signed by source Nexus keypair.
Receiver verifies: token issuer is in `allies` set, token not expired, nonce not burned.
Use for: cross-Nexus content sharing, guest access, treaty-brokered reads.

This tier model means S7 only needs to implement Tier 1 and stub Tier 2/3. Tier 2 waits
on Keyhive WASM/TS bindings (pre-alpha Rust only as of 2026-05); Tier 3 waits on
`NexusRegistryDoc` (S9). But the type surface for all three should be declared in S7
so code doesn't need rearchitecting when the implementations land.

---

## Revised `CircleTiddler` + `IdentityTiddler` Changes

### IdentityTiddler additions

```typescript
// New fields (add to existing interface):
readonly nexusId?:          string;  // Nexus this identity is primarily registered on
readonly keyHistory?:        string;  // JSON array of {key, rotatedAt} — rotation log
readonly trustTier?:         "local" | "nexus" | "cross-nexus" | "public";
```

### CircleTiddler additions

```typescript
// New fields:
readonly to?:               string;  // who can see the circle's existence
readonly canReply?:         string;  // alias: circle grants reply capability
readonly canReact?:         string;  // alias: circle grants reaction capability
readonly nexusScope?:        string;  // "local" | "nexus:{id}" — replication scope
readonly memberSignature?:   string;  // Ed25519 sig over id|name|to|sortedMemberList
readonly nonceBurnSet?:      string;  // space-separated seen nonces (anti-replay; LWW)
```

### New `NexusTrustTiddler` (stub, S9)

```typescript
interface NexusTrustTiddler {
  readonly kind:          "nexus-trust";
  readonly nexusId:       string;       // lar:///ha.ka.ba/@nexus/{pubkey}
  readonly trustLevel:    "ally" | "neutral" | "hostile" | "unknown";
  readonly since:          string;      // ISO 8601
  readonly treatyRef?:    string;       // AutomergeUrl of treaty doc
  readonly nonceBurnSet?: string;       // seen nonces from this Nexus (anti-replay)
}
```

---

## S7 Implementation Plan (Revised)

### S7.0 — Design doc (this file) + type stubs

- [ ] Add `to`, `canReply`, `canReact` fields to `CircleTiddler` in `social-doc.ts`
- [ ] Add `nexusScope`, `memberSignature` to `CircleTiddler`
- [ ] Add `nexusId`, `keyHistory`, `trustTier` to `IdentityTiddler`
- [ ] Add `NexusTrustTiddler` interface stub to `social-doc.ts`
- [ ] Write `CAPABILITY-LAYER.md` formal design doc (code-ready spec)

### S7.1 — Device delegation chain (Tier 1, local)

- [ ] Implement `DeviceDelegationTiddler` — UCAN-compatible chain proving device→operator
- [ ] Wire into `buildCeremonyTiddlers` in `@lararium/tw5`
- [ ] `verifyDeviceDelegation(deviceDid, operatorDid, tiddlers)` helper in `@lararium/mesh`

### S7.2 — Seitan-style circle invites (Tier 2, within Nexus)

- [ ] Design the invite token: `sign({ iss: nexusDid, circleId, cap: "join", exp, nonce })`
- [ ] `acceptCircleInvite(token, identitiesHandle, circlesHandle)` in `@lararium/node`
- [ ] Token burn on acceptance: write nonce to `CircleTiddler.nonceBurnSet`

### S7.3 — Capability check surface (all tiers, TW5-queryable)

- [ ] `canRead(viewerDid, tiddlerTitle, store)` — Tier 1 CRDT check
- [ ] `canReply(viewerDid, tiddlerTitle, store)` — same pattern
- [ ] `canReact(viewerDid, tiddlerTitle, store)` — same pattern
- [ ] Expose as TW5 filter operators: `[can-read[{currentUser}]]`

### S7.4 — Nexus-level block (hostile mesh, partial Tier 3)

- [ ] `NexusTrustTiddler` write helpers
- [ ] Nonce burn on inbound cross-Nexus activities
- [ ] `CrdtIngressAdapter` actor-ID allow-list check (wire onto `LarEventBus` crdt-ring)

---

## Open Questions (S7 Design Stage)

- **ERA paper (arXiv:2601.22963)** concurrent admin revocation: when two operators
  simultaneously revoke each other from the `nexus:admin` circle, who wins?
  ERA resolves this via epoch events as external arbitration. Does S7 need ERA or can
  LWW-epoch in `ffzMerge` suffice?

- **Personal circles vs. Nexus circles**: personal circles never replicate beyond the
  owning Lararium. Nexus circles replicate to all Nexus peers. Is `nexusScope` field
  sufficient to enforce this, or does the sync adaptor need an explicit filter?

- **`to` on circles vs. `to` on content**: Ellis' `to` on a Circle controls circle
  visibility. `to` on content controls content visibility. Do we want both, or just
  content-level `to`?

- **`@nexus:{pubkey}` vs `circle:nexus:user`**: The system circle `nexus:user` already
  represents "authenticated Nexus member." Is a first-class `@nexus:{pubkey}` addressing
  token needed, or does `circle:nexus:user` subsume it? The token form is more concise
  for cross-Nexus assertions; the circle form keeps everything in the same CRDT membership
  model. Prefer circle form (web3 consistency) unless cross-Nexus verification requires
  the pubkey to be verifiable without access to the local `CirclesDoc`.

---

## Prior Art (additions beyond original S7)

- Ellis, J. (2025). *Kowloon source*, `schema/Circle.js`, `methods/visibility/filter.js`. AGPL-3.0. https://github.com/jzellis/kowloon
- Almeida, P. et al. (2008). *Interval Tree Clocks*. (ITC — convergent identity management)
- Kleppmann, M. & Beresford, A.R. (2017). *A Conflict-Free Replicated JSON Datatype*. IEEE TSE. (Automerge foundation)
- Fett, D. et al. (2020). *UCAN: Authorization Capabilities for an Open World*. (UCAN token model)
- Sandro, B. & Zelenka, B. (2024). *Keyhive: Convergent Capabilities*. Ink & Switch. https://inkandswitch.github.io/keyhive/
- Litt, G. & van Hardenberg, P. (2021). *Peritext: A CRDT for Collaborative Rich Text*. (Ink & Switch, operational context for Keyhive design)
- Francis, N. (2023). *ERA: Epoch-Resolved Arbitration*. arXiv:2601.22963. (Concurrent admin revocation)
- Seitan token pattern: @localfirst/auth — keyless invite token with burn-on-accept semantics
