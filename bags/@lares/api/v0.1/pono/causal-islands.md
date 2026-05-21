<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/v0.1/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/api/v0.1/pono/causal-islands >>
```toml iam
uri-path = "ha.ka.ba/@lares/api/v0.1/pono/causal-islands"
file-path = "bags/@lares/api/v0.1/pono/causal-islands.md"
type  = "text/x-memetic-wikitext"
register      = "CS"
confidence    = 0.88
mana          = 0.88
manao         = 0.86
manaoio       = 0.84
tagspace      = "stable"
role          = "invariant law: causal island doctrine, MUST/MAY taxonomy, visibility gate, authority-first sync order, edge island lifecycle"
cacheable     = true
retain        = true
invariant     = true
status-date   = "2026-04-30"
heleuma       = "ba"
source-symbol = "ABILITY_LADDER AUTHORITY_FIRST_ORDER CAUSAL_ISLAND_MUST CAUSAL_ISLAND_MAY AuthorityFirstGuard visibilityGate"
body-sha256 = "f9ed8276003e50678b775c174d2c439b43fbd5591845473751b9076ee4c1ebf5"
```



<<~ ahu #head >>

# Causal Islands

A causal island carries its own trigger surface, event horizon, and capability gate.
The doctrine partitions cross-node causality (MUST) from within-node causality (MAY).
Content MUST NOT precede authority — this invariant has no exceptions.

<<~/ahu >>

<<~&#x0002;>>

<<~ ahu #law >>

## Law

**Authority-first invariant**: content (manifests, receipts, delta payloads) MUST NOT flow
until the authority graph (Orichalcum capabilities, delegations, revocations) has synced.
A relay that has not completed step 2 MUST NOT receive step 4 or later.
A peer that has not completed step 3 MUST NOT request individual meme deltas.

**Relay-law**: pull does NOT imply read. A shrine relay holds pull; it carries encrypted
offerings it cannot decrypt or render. All other abilities imply every ability below them.

**Visibility gate**: ALL six conditions must hold for a meme to federate across an edge island.
Stage band is a UX annotation — NOT a gate condition.

<<~/ahu >>

<<~ ahu #schema >>

## Schema (machine-readable)

```toml
# Ability ladder — ordered least to most privileged
# EXCEPTION: pull does NOT imply read (relay-law)
# All other abilities imply every ability below them
ability-ladder = ["pull", "read", "sync", "write", "propose", "promote", "admin", "revoke"]
pull-implies-read = false
implication-rule  = "ordered-except-pull"

# Ratings eligible to federate — noise and data are node-local only
federable-ratings = ["meme", "ano", "kapu"]

# Authority-first sync order — 8 steps, strictly ordered
authority-first-order = [
  "authenticate-peer",        # 1 — peer not verified until complete
  "sync-authority-graph",     # 2 — Orichalcum graph; gate for all content
  "derive-visible-rooms",     # 3 — room recipe + visible causal islands
  "sync-collection-manifest", # 4 — rooms, memes, edge islands, receipts
  "capability-epoch-ops",     # 5a
  "sync-crdt-heads",          # 5b
  "sync-delta-payloads",      # 5c
  "sync-projection-receipts", # 5d
]

# Authority-first guard states
authority-first-states = ["authenticating", "syncing-authority", "syncing-manifest", "live"]

# Edge island lifecycle
edge-island-lifecycle = ["boot-receipt", "live-tail", "sediment", "revoked"]
# boot-receipt — join snapshot issued; peer authorized to see visible world
# live-tail    — receiving delta stream from last known offset
# sediment     — historical compacted state; no longer receiving deltas
# revoked      — epoch rolled; no future live-tail frames for this principal

# Causal island MUST doctrine
# Cross-node causality errors become federation corruption — no local correction possible
causal-island-must = [
  "node-to-node-federation-edge",
  "cross-node-pranala-connection",
  "canon-promotion-ceremony",
  "revocation-epoch-change",
  "encrypted-sync-membership-change",
  "live-hostful-record-proposing-hostless-canon-mutation",
]

# Causal island MAY doctrine
# Local causality errors correctable inside a node; promotion is optional
# automerge-realm and peer-sync-state ARE islands by topology (Fuller-Zelenka non-simultaneous apprehension)
causal-island-may = [
  "room",
  "meme",
  "sigil",
  "kumu-instance",
  "kahea-invocation",
  "local-room-projection",
  "long-lived-runtime-actor",
  "automerge-realm",
  "peer-sync-state",
]

# Visibility gate — ALL six conditions must hold to federate a meme across an edge island
[visibility-gate]
conditions = [
  "rating(meme) >= meme",
  "manaoio(meme) >= room.minManaoio",
  "recipe(room).matches(meme)",
  "hasAbility(subject, sync, edge.id)",
  "!edge.revoked",
  "!violatesKapu(meme, subject)",
]
```

<<~/ahu >>

<<~ ahu #source >>

## Source (TypeScript — compiled-in)

```typescript
export const ABILITY_LADDER = [
  "pull",     // retrieve encrypted bytes and forward; cannot decrypt or render
  "read",     // decrypt and render semantic content
  "sync",     // participate in CRDT reconciliation
  "write",    // produce accepted mutations
  "propose",  // suggest hostful changes (pending; not yet hostless canon)
  "promote",  // hostful → hostless canon-promotion ceremony
  "admin",    // manage room, recipe, edge island membership
  "revoke",   // roll epoch; terminate future live tail for a principal
] as const;

export const AUTHORITY_FIRST_ORDER = [
  "authenticate-peer",         // 1
  "sync-authority-graph",      // 2
  "derive-visible-rooms",      // 3
  "sync-collection-manifest",  // 4
  "capability-epoch-ops",      // 5a
  "sync-crdt-heads",           // 5b
  "sync-delta-payloads",       // 5c
  "sync-projection-receipts",  // 5d
] as const;

export const CAUSAL_ISLAND_MUST = [
  "node-to-node-federation-edge",
  "cross-node-pranala-connection",
  "canon-promotion-ceremony",
  "revocation-epoch-change",
  "encrypted-sync-membership-change",
  "live-hostful-record-proposing-hostless-canon-mutation",
] as const;

export const CAUSAL_ISLAND_MAY = [
  "room",
  "meme",
  "sigil",
  "kumu-instance",
  "kahea-invocation",
  "local-room-projection",
  "long-lived-runtime-actor",
  "automerge-realm",
  "peer-sync-state",
] as const;

export function visibilityGate(input: VisibilityGateInput): boolean {
  if (!FEDERABLE_RATINGS.has(input.memeRating.toLowerCase())) return false;
  if (input.memeManaoio < input.roomMinManaoio)                return false;
  if (!input.recipeMatches)                                    return false;
  if (!input.subjectCanSync)                                   return false;
  if (input.edgeRevoked)                                       return false;
  if (input.violatesKapu)                                      return false;
  return true;
}
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/@lares/api/v0.1/pono/invariant family:control role:implements >>
<<~ pranala #to-orichalcum ? -> lar:///ha.ka.ba/@lares/api/v0.1/pono/orichalcum-capabilities family:control role:extends >>
<<~ pranala #to-federated-causal-islands ? -> lar:///ha.ka.ba/@lares/api/v0.1/pono/federated-causal-islands family:control role:implements >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
