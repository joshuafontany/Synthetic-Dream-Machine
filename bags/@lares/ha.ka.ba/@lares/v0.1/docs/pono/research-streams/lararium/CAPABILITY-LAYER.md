# Capability Layer — Code-Ready Spec

> Date: 2026-05-06
> Branch: feature/lararium-node-3
> Status: S7.0 type stubs complete; S7.1–S7.4 implementation targets
> Source of truth for: S7 sub-sprint work, `@lararium/mesh` type contracts

---

## Invariant

**Membership in a circle IS the capability grant.**

The check is purely local: read `CircleTiddler.memberDids` from the local CRDT,
verify the viewer's DID appears in it. No network call. No token exchange at read time.
No server query. The capability travels with the CRDT; wherever the doc syncs, the
capability follows.

This invariant holds at all three tiers. The tier determines HOW membership was
established and replicated, not HOW it is checked.

---

## Three Tiers

```
Tier 1 — Local CRDT      S7.0–S7.1     CirclesDoc membership, local Lararium only
Tier 2 — Nexus CRDT      S7.2–S7.3     Keyhive Group membership, Nexus-wide CRDT
Tier 3 — Cross-Nexus     S7.4 / S9     UCAN-compatible token, NexusTrustTiddler verified
```

Tier 1 implements now. Tier 2 waits on Keyhive WASM/TS bindings (pre-alpha Rust, 2026-05).
Tier 3 waits on NexusRegistryDoc (S9). **Type surface for all three is declared at S7.0
so implementations slot in without rearchitecting.**

---

## Content Addressing (all tiers)

Every content tiddler carries up to three `ContentAddressing` fields in its `fields` map:

```
to:        "@public" | "circle:{id}" | "group:{lar-uri}" | "@nexus:{pubkey}"
canReply:  same format | absent (inherits `to`)
canReact:  same format | absent (inherits `to`)
```

**`@public`** — no membership check; any peer may read.

**`circle:{id}`** — Tier 1 check: look up `circleTiddlerUri(id)` in local `CirclesDoc`,
read `memberDids`, confirm viewer DID present. Fails closed if tiddler absent.

**`group:{lar-uri}`** — Tier 1/2: resolve lar: URI to a `CircleTiddler` via the local
CRDT (same check as `circle:`, but the circle may be Nexus-scoped with `nexusScope: "nexus"`).

**`@nexus:{pubkey}`** — Tier 2: viewer must hold a `NexusTrustTiddler` for the named
Nexus at `trustLevel: "ally"` AND their `IdentityTiddler.nexusId` matches. Falls back to
`neutral` behavior (reject) if `NexusTrustTiddler` absent.

**`@public`** short-circuits everything. All other tokens require a local CRDT lookup.

---

## Five Identity Planes

```
Plane 0  Device         did:key from Ed25519 device keypair
Plane 1  Operator       did:key from root keypair; Keyhive person-as-group of device keys
Plane 2  Circle         CRDT membership doc; confers read/reply/react capabilities
Plane 3  Nexus          confederation keypair; signs Tier 3 capability tokens
Plane 4  DreamNet       no central authority; trust from Nexus treaty events only
```

S7 implements Planes 0–2. Planes 3–4 are type-stubbed here; implementation is S9.

---

## S7.1 — Device Delegation Chain (Plane 0 → 1)

**Goal:** Any peer verifies "Device D speaks as Operator O" with zero network calls.

### Data shape (already in `social-doc.ts`)

```typescript
DeviceDelegationTiddler {
  kind:                "device-delegation"
  operatorDid:         string        // the operator DID
  deviceDid:           string        // did:key from device keypair
  deviceVerifyingKey:  string        // device Ed25519 pubkey (hex)
  issuedAt:            string        // ISO 8601
  expiresAt?:          string        // ISO 8601 | absent = no expiry
  operatorSignature:   string        // sig by operator key (see below)
}
```

Lives at `deviceDelegationUri(operatorDid, deviceDid)` inside `IdentitiesDoc.tiddlers`.

### Signature payload

```
"device-delegation|{operatorDid}|{deviceDid}|{deviceVerifyingKey}|{issuedAt}"
```

Signed by the operator's root Ed25519 key. Verifiable against `IdentityTiddler.verifyingKey`
from the same `IdentitiesDoc` — arrives via CRDT sync alongside the delegation tiddler.

### Functions to implement (`@lararium/mesh`)

```typescript
// Sign a device delegation (call with operator's private key material)
function buildDeviceDelegation(
  operatorDid:         string,
  operatorPrivKey:     Uint8Array,   // Ed25519 private key bytes
  deviceDid:           string,
  deviceVerifyingKey:  string,
  expiresAt?:          string,
): DeviceDelegationTiddler

// Verify a delegation — call at session open or capability check
function verifyDeviceDelegation(
  delegation:    DeviceDelegationTiddler,
  operatorTiddler: IdentityTiddler,     // holds operatorVerifyingKey
): boolean
```

### Wire into `buildCeremonyTiddlers` (`@lararium/tw5`)

On cold-boot ceremony (when `operatorIdentity` present):
1. Call `buildDeviceDelegation` for the boot device
2. Include resulting tiddler in the ceremony batch written to `IdentitiesDoc`

---

## S7.2 — Circle Invites + Seitan Token (Plane 2, Tier 1/2)

**Goal:** Transfer circle membership across an out-of-band channel with replay protection.

### Token shape (already in `social-doc.ts`)

```typescript
CircleInviteToken {
  iss:       string   // issuing operator DID
  circleId:  string   // target circle ID
  cap:       "join"
  exp:       string   // ISO 8601 expiry
  nonce:     string   // random hex; burned on acceptance
  signature: string   // Ed25519 sig by issuer key (see below)
}
```

### Signature payload

```
"circle-invite|{iss}|{circleId}|{cap}|{exp}|{nonce}"
```

### Functions to implement (`@lararium/node`)

```typescript
// Issue a token
function issueCircleInvite(
  iss:       string,
  privKey:   Uint8Array,
  circleId:  string,
  ttlMs:     number,
): CircleInviteToken

// Accept a token — mutates CirclesDoc + CircleTiddler.nonceBurnSet
async function acceptCircleInvite(
  token:            CircleInviteToken,
  acceptorDid:      string,
  circlesHandle:    DocHandle<CirclesDoc>,
  identitiesHandle: DocHandle<IdentitiesDoc>,  // to verify issuer key
): Promise<{ ok: boolean; reason?: string }>
```

### Accept flow

1. Verify token not expired (`exp > now`)
2. Look up issuer's `IdentityTiddler` in `identitiesHandle` → get `verifyingKey`
3. Verify `signature` over payload (fail closed if no issuer tiddler)
4. Check `CircleTiddler.nonceBurnSet` does NOT contain `token.nonce` (replay guard)
5. Add `acceptorDid` to `CircleTiddler.memberDids`
6. Add `token.nonce` to `CircleTiddler.nonceBurnSet`
7. Recompute and store `CircleTiddler.memberSignature`

---

## S7.3 — Capability Check Surface (TW5-queryable)

**Goal:** `canRead`, `canReply`, `canReact` available as helper functions AND TW5 filters.

### Functions to implement (`@lararium/mesh`)

```typescript
type CapabilityResult = { granted: boolean; tier: 1 | 2 | 3; reason: string }

function canRead(
  viewerDid: string,
  tiddler:   MutableLarRecord,
  store:     LarTiddlerStore,
): CapabilityResult

function canReply(
  viewerDid: string,
  tiddler:   MutableLarRecord,
  store:     LarTiddlerStore,
): CapabilityResult

function canReact(
  viewerDid: string,
  tiddler:   MutableLarRecord,
  store:     LarTiddlerStore,
): CapabilityResult
```

### Algorithm (Tier 1, same for all three; field key varies)

```
1. Read fields.to (or canReply/canReact; fall back to `to` if absent)
2. "@public"           → { granted: true, tier: 1, reason: "public" }
3. "circle:{id}"       → resolve circleTiddlerUri(id) from store
                          → split memberDids, check viewerDid present
4. "group:{lar-uri}"   → resolve lar: URI via store.get(uri)
                          → same memberDids check
5. "@nexus:{pubkey}"   → Tier 2 stub: resolve NexusTrustTiddler; check trustLevel "ally"
                          → check viewerDid's IdentityTiddler.nexusId matches pubkey
6. absent              → treat as "@public" for `to`; treat as inherit-from-`to` for others
7. unknown token       → { granted: false, tier: 1, reason: "unrecognized token" }
```

### TW5 filter operators (`@lararium/tw5`, S7.3)

Register these in the TW5 filter engine so wiki templates can gate display:

```
[can-read<viewer-did>]   — filter: tiddlers the viewer may read
[can-reply<viewer-did>]  — filter: tiddlers the viewer may reply to
[can-react<viewer-did>]  — filter: tiddlers the viewer may react to
```

Usage in wikitext: `<$list filter="[all[tiddlers]can-read<currentUser>]">`

---

## S7.4 — Hostile Mesh Circuit Breakers (Plane 3 → 4)

**Goal:** Prevent inbound content from hostile/unknown Nexus nodes from entering local state.

### `CrdtIngressAdapter` check (on `LarEventBus` crdt-ring)

Before applying any Automerge patch from a remote peer:

1. Identify the patch's actor ID
2. Look up the actor's `IdentityTiddler` → get `nexusId`
3. Look up `NexusTrustTiddler` at `nexusTrustUri(nexusPubkey)` in local store
4. `trustLevel: "hostile"` → drop patch, log, done
5. `trustLevel: "unknown"` or absent → treat as neutral; apply only @public-addressed content
6. `trustLevel: "neutral"` → apply @public content; reject cross-Nexus tokens
7. `trustLevel: "ally"` → full Tier 3 processing

### Nonce burn on inbound cross-Nexus activities

Activities from allied Nexus peers carry `nonce` and `issuedAt`. Before processing:
1. Check `NexusTrustTiddler.nonceBurnSet` for the nonce (LWW-Register field)
2. If present: drop silently (replay)
3. If absent: process, then append nonce to `nonceBurnSet`

### Functions to implement (`@lararium/node`)

```typescript
// Check whether a CRDT patch from a given actor should be applied
function checkIngressTrust(
  actorId:     string,
  store:       LarTiddlerStore,
): { allow: boolean; tier: 1 | 2 | 3 | 0; reason: string }

// Write or update a NexusTrustTiddler
function setNexusTrust(
  nexusId:          string,
  nexusVerifyingKey: string,
  trustLevel:       NexusTrustTiddler["trustLevel"],
  identitiesHandle: DocHandle<IdentitiesDoc>,
): void
```

---

## Type Export Checklist (S7.0 — complete)

All the following are now exported from `@lararium/mesh`:

- [x] `ContentAddressing` interface
- [x] `DeviceDelegationTiddler` interface
- [x] `CircleInviteToken` interface
- [x] `NexusTrustTiddler` interface
- [x] `deviceDelegationUri(operatorDid, deviceDid)` helper
- [x] `nexusTrustUri(nexusPubkey)` helper
- [x] `IdentityTiddler` — `nexusId`, `keyHistory`, `trustTier` added
- [x] `CircleTiddler` — `nexusScope`, `memberSignature`, `nonceBurnSet` added

## Implementation Checklist

### S7.1
- [ ] `buildDeviceDelegation()` in `@lararium/mesh/src/capability.ts`
- [ ] `verifyDeviceDelegation()` in `@lararium/mesh/src/capability.ts`
- [ ] Wire into `buildCeremonyTiddlers` in `@lararium/tw5`

### S7.2
- [ ] `issueCircleInvite()` in `@lararium/node/src/circle-invite.ts`
- [ ] `acceptCircleInvite()` in `@lararium/node/src/circle-invite.ts`

### S7.3
- [ ] `canRead / canReply / canReact` in `@lararium/mesh/src/capability.ts`
- [ ] TW5 filter operators in `@lararium/tw5`

### S7.4
- [ ] `checkIngressTrust()` in `@lararium/node/src/crdt-ingress-adapter.ts`
- [ ] `setNexusTrust()` in `@lararium/node/src/crdt-ingress-adapter.ts`
- [ ] Wire `checkIngressTrust` into `LarEventBusImpl.enqueueToRing` for `crdt-ring`
