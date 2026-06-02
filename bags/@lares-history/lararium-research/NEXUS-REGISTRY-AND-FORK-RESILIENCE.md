# Nexus Registry and Hostile Fork Resilience

> Date: 2026-05-06
> Branch: feature/lararium-node-3
> Tasked spirit: "Hostile fork resilience + NexusRegistryDoc design"
> Canonical grounding: `elyncia/Elyncia_02_The_Lares_DreamNet.md`

## Scale Ladder (canonical, 2026-05-06)

**Lararium** — one operator's infrastructure: a `lararium-node` + browser peers + devices. The household shrine. Has two layers:
- *Stable mesh*: lares/ carriers, genesis artifact → `ha` content tiga
- *Transitory flow*: operators, agents, sessions → social tiga

**Nexus** — a *confederation of lararia* sharing a stable internal mesh. Named by community + place. e.g. "Floating Library of Mu, PNW Branch" — resources may be geographically wider than the name implies, but the confederation represents the local cohort. NOT a single server. NOT a single lararium.

The Nexus keypair serves as the confederation keypair — ideally Keyhive-group-rooted when that ships; a founding-operator key until then. The `NexusRegistryDoc` lives at `lar:///ha.ka.ba/@nexus/<confederation-pubkey>`.

**Within-Nexus sync**: Automerge CRDT — stable, reliable internal mesh.
**Cross-Nexus federation**: explicit treaty, wild-magic-zone hops — unreliable, degraded-state-tolerant. Lives in `allies` field.

"Each node a city of spirits, not a solitary saint — but a city can be besieged." (Elyncia_02)

**Tiers** (per lararium, within a Nexus):
- Household — single `lararium-node`, basic DreamNet access, faint KAIROS signal
- Crossroads — multi-peer local mesh, all 13 aspects accessible, KAIROS detectable
- Temple — civic anchor, ley-line confluence, full aspects + Named Personas + strong KAIROS

The `capabilityFlags` field in `NexusRegistryDoc` reflects which capabilities the confederation currently advertises.

**`NexusRegistryDoc` members field** — the Nexus registry should list constituent lararia (peer pubkeys + their advertised tiers). This field is needed to represent the confederation, not just the founding key. Design for S9.

---

---

## Prior Art Survey

| System | Fork Resistance Mechanism | Key Lesson |
|---|---|---|
| ATProto/Bluesky | `did:plc` tombstoning; Ozone labelers; AppView chooses trusted PDSes; `$type` lexicon versioning ignores unknown types | Trust delegation is explicit and per-consumer |
| Nostr | Follow graph is the trust boundary; clients drop hostile relays; NIP-56 reporting advisory only | Sybil resistance is weak by design — spam is a known cost |
| Matrix | Room versions; `m.room.server_acl` blocks entire homeservers; room upgrades via tombstone + new room | Protocol version is room-level, not server-level; ACLs propagate via CRDT state |
| Secure Scuttlebutt | Append-only signed feeds; invite graph is sybil filter; blocklists are first-class feed content | The invite graph is the sybil filter |
| W3C DID / did:key | Method namespacing makes incompatibility explicit and non-destructive | Method scope = fork scope |
| UCAN/OCapN | Capability chain is unforgeable; hostile forks lack valid tokens; revocation via CID-anchored list | The capability chain IS the federation authorization |

---

## Settled Decisions

**The capability chain is the primary fork resistance.** A hostile fork that lacks valid UCAN/Keyhive capability tokens cannot impersonate or federate. The `NexusRegistryDoc` provides additive protection, not the primary gate.

**`capabilityFlags` forms a monotonic set.** Never negotiate down. A peer claiming an older `protocolVersion` to exploit deprecated behavior is blocked by treating capabilities as append-only.

**Tombstoning is eventual.** Blocked peers are starved of capability tokens regardless of propagation lag. Eventual consistency is sufficient.

**`keyHistory` must be designed in from day one.** Retrofitting key rotation proofs later breaks continuity.

---

## NexusRegistryDoc Schema

Lives at: `lar:///ha.ka.ba/@nexus/<nexus-pubkey>`
Allied registry: `lar:///ha.ka.ba/@nexus/<nexus-pubkey>/allies`

```typescript
type NexusRegistryDoc = {
  // Identity
  nexusId:          string;    // Ed25519 public key, base58btc
  protocolVersion:  string;    // semver, e.g. "0.1.0"
  capabilityFlags:  string[];  // monotonic set — e.g. ["federation/v1", "blob-sync", "ucan-invocation"]

  // Human-readable naming (petname layer 2 — self-asserted, not authoritative)
  displayName:   string;       // operator-signed self-assertion; two Nexuses may share a name
  description?:  string;       // optional operator prose

  // Allied Nexuses — CRDT-merged, LWW per ally
  allies: Record<string, {
    treatyEventCID:   string;    // CID of signed treaty event
    addedAt:          number;    // unix ms for LWW
    capabilityFlags:  string[];  // what this ally advertises
  }>;

  // Blocked / incompatible — operator-signed; peers accept on trust
  blocked: Record<string, {
    nexusId:       string;
    reason:        "hostile" | "incompatible-protocol" | "sybil" | "operator-decision";
    tombstonedAt:  number;       // earliest tombstonedAt wins on concurrent writes
    evidence?:     string;       // CID of signed evidence event, optional
  }>;

  // Key rotation history — required from day one
  keyHistory: Array<{
    publicKey:         string;
    revokedAt?:        number;
    rotationProofCID:  string;  // CID of prior-key-signed rotation event
  }>;
};
```

### URI Resolution

New `@nexus` scope in `resolver.ts`:
- `lar:///ha.ka.ba/@nexus/<pubkey>` → Nexus identity + registry doc
- `lar:///ha.ka.ba/@nexus/<pubkey>/allies` → federated ally sub-doc
- Resolver kind: `"nexus-doc"` (new branch, parallel to `@lares`/`@lararium`/`@catalog`)
- No URI grammar change — triple-slash hostless form retained; `@nexus` is just a new scope segment

---

## Attack Surface

| Attack | Mitigation |
|---|---|
| Key exfiltration | Operator key stays on node peer (not in browser) until Keyhive proves decentralized admin |
| Sybil seeding before invite graph is dense | Invite nonce burned on redemption; operator controls rate of invite issuance |
| Protocol downgrade | `capabilityFlags` is monotonic set; never negotiate below advertised floor |
| Hostile fork impersonation | Cannot forge UCAN/Keyhive capability chain without private key |

---

## Open Questions

- How does a NexusRegistryDoc get bootstrapped into the genesis artifact? (S9 question)
- Should `allies` and `blocked` live in the same doc or be separate satellite docs?
- Keyhive group-as-CRDT-doc: does a Nexus identity doc become a Keyhive group when Keyhive ships TS bindings?
