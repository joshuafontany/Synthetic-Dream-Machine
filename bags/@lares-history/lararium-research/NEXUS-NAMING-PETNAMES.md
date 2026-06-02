# Nexus Human-Readable Naming — Petname Systems Research

> Date: 2026-05-06
> Branch: feature/lararium-node-3
> Tasked spirit: "Human-readable Nexus directories — petname systems research"

---

## The Core Problem: Zooko's Triangle

Any decentralized name system can have at most two of: human-meaningful, decentralized, secure. This does not resolve — it navigates. The FFZ/DreamNet choice: accept that "human-meaningful" applies locally, so global-unique and secure survive.

---

## Prior Art Survey

| System | Global unique | Human-meaningful | Decentralized | Failure mode |
|---|---|---|---|---|
| Petnames (Miller/Stiegler) | No (local) | Yes (local) | Yes | None — by design |
| ENS (.eth) | Yes | Yes | Partially | Chain dependency, domain squatting |
| ATProto handles | Yes | Yes | Partially | DNS + PLC operator capture |
| Nostr NIP-05 | No | Yes | No | Domain operator can reassign; no bidirectional lock |
| SSB nicknames | No | Yes (local) | Yes | No global discoverability |
| Tor .onion | Yes | No | Yes | No human-readable layer at protocol level |
| Keybase (historical) | Yes | Yes | No | Verification index on centralized server; dead after Zoom acquisition |

### Key Lessons

- **ATProto**: bidirectional DNS TXT + DID claim. Strong for domain-owning operators. Failure modes: DNS compromise, expired domain hijack, PLC registry operator capture.
- **Keybase failure**: proofs stored on a third-party index are only as durable as that company. Never put the naming layer on infrastructure we don't own.
- **SSB/Petnames**: no global discoverability — but that absence functions as a feature for invite-seeded networks. You know the nodes you've been introduced to.
- **ENS**: first-come-first-served global registry. Squatting is a known cost. Chain dependency is a permanent trust assumption.

---

## Settled Decision: Three-Layer Petname Model

### Layer 1 — Key Name (canonical, always)
`lar:///ha.ka.ba/@nexus/<pubkey-base58btc>`

Global, unique, unambiguous, secure. Not human-readable. Never changes. This form grounds all protocol operations.

### Layer 2 — Edge Name (operator self-assertion, not authoritative)
`NexusRegistryDoc.displayName` — a string signed by the Nexus operator keypair.

Two operators can both claim "DreamDeck". That scenario follows correctly and by design. The signature proves only: "this keypair asserts this display name." No global uniqueness enforcement. The display name propagates as a suggestion through the social/federation graph.

### Layer 3 — Petname (user-controlled, locally sovereign)
Client-local mapping `pubkey → petname`, user-editable. Overrides all edge names. No central coordination. No sync. The user names the nodes they know.

### Disambiguation
When two Nexuses share a display name, surface both with truncated pubkey suffix:
- `DreamDeck [ab3f…]`
- `DreamDeck [cc12…]`

User assigns distinct local petnames. No registry arbitration needed.

---

## NexusRegistryDoc — Naming Fields to Add

```typescript
// Add to NexusRegistryDoc (see NEXUS-REGISTRY-AND-FORK-RESILIENCE.md)
displayName:   string;    // operator self-asserted; signed; not globally unique
description?:  string;    // optional operator prose
// NOTE: no global uniqueness enforcement — uniqueness is the petname layer's job
```

---

## What NOT to Build (Yet)

- **ATProto-style DNS verification** — adds DNS trust dependency and operational complexity. Optional operator proof later ("I also control elyncia.app"), not the primary mechanism.
- **ENS-style global registry** — chain dependency, squatting, shared coordination infrastructure. Antithetical to DreamNet's keypair-sovereign model.
- **Nostr NIP-05** — weaker bidirectional binding than ATProto; no urgency.

---

## References

- [Petnames: A humane approach to secure, decentralized naming (Spritely, 2022)](https://files.spritely.institute/papers/petnames.html)
- [Introduction to Petname Systems — Marc Stiegler](https://www.skyhunter.com/marcs/petnames/IntroPetNames.html)
- [Zooko's Triangle — Wikipedia](https://en.wikipedia.org/wiki/Zooko%27s_triangle)
- [ATProto Handle spec](https://atproto.com/specs/handle)
- [NIP-05 — nostr-protocol/nips](https://github.com/nostr-protocol/nips/blob/master/05.md)
- [SSB Identity — Scuttlebutt Handbook](https://handbook.scuttlebutt.nz/concepts/identity)
