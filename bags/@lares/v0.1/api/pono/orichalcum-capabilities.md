<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/orichalcum-capabilities >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/pono/orichalcum-capabilities"
file-path = "bags/@lares/v0.1/api/pono/orichalcum-capabilities.md"
type = "text/x-memetic-wikitext"
tagspace     = "stable"
register     = "Synthesis-Canon"
manaoio      = 16
mana         = 16
manao        = 16
role         = "invariant law: Orichalcum capability profile — UCAN-compatible at wire boundary, Lararium-native semantic caveats; authority-gate law for rooms, edge islands, and canon MOVE"
cacheable    = true
retain       = true
invariant    = true
```



<<~ ahu #head >>

# Orichalcum Capabilities

UCAN-compatible capability proof with Lararium-native semantic caveats.
Authority gate for rooms, edge islands, and canon MOVE.

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #ooda-ha >>

✶ read the capability shape — who grants, who receives, what resource, what abilities, what caveats
⏿ orient the authority ladder: pull/read/write/sync/admin/delegate; locate the principal types
◇ crypto validity is necessary but not sufficient — Lararium caveats must also pass
▶ gate the action at the ability ladder; reject on first caveat failure; emit capability proof
↺ authority travels with the graph; revocation is forward-only; prior keys remain for prior sediment; confirm gate passed; principal seated; caveats cleared; no ambient authority leaks

<<~/ahu >>

<<~ ahu #law >>

## Law

An Orichalcum capability answers five questions:

1. **Who grants?** `issuer` — a `LarPrincipal`
2. **Who receives?** `audience` — a `LarPrincipal`
3. **What resource?** `resource` — a `lar:///` canonical URI or `edge:` island id
4. **What actions?** `abilities` — one or more from the ability ladder (see below)
5. **Under what Lararium truth conditions?** `caveats` — Lararium-native predicates

A cryptographically valid UCAN-shaped proof that fails any Lararium caveat is NOT authorized.
Crypto validity is necessary but not sufficient. Semantic validity requires caveat passage.
Authority travels with the graph. Authority MUST NOT be outsourced to crypto alone.

<<~/ahu >>

<<~ ahu #principal >>

## Principal Shapes

```toml
[[principal_kinds]]
kind        = "did"
description = "W3C DID — external identity, UCAN-compatible"

[[principal_kinds]]
kind        = "ed25519"
description = "raw Ed25519 public key — device-level identity"

[[principal_kinds]]
kind        = "local-operator"
fields      = ["alias", "tier", "host"]
description = "local trust alias — bootstrap identity before full DID ceremony"
```

A person is modeled as a group of device principals.
A room, meme, or edge island may itself act as a group principal with its own access graph.
These are not the same object. Keep device identity below operator identity.

<<~/ahu >>

<<~ ahu #ability-ladder >>

## Ability Ladder

The ladder maps onto the **ACCESS axis** (Axis 1) of the [causal-islands](causal-islands.md)
model — a 1:1 lexical mirror of Keyhive's native Access verbs.

```
pull   — forward encrypted bytes; relay without reading (Keyhive Pull)
         pull does NOT imply read — this is the relay-law exception
read   — decrypt and render semantic content (Keyhive Read)
edit   — produce accepted mutations (Keyhive Edit)
admin  — manage membership, recipe, epoch/revocation, residency actions (Keyhive Admin)
```

Each ability implies all abilities below it in this ladder, EXCEPT:
`pull` does not imply `read`. A relay may hold `pull` without `read`.

```toml
# Ordered least → most privileged. Source of truth for ABILITY_LADDER in
# packages/lararium-mesh/src/causal-island.ts. Keyhive-native verbs.
ability-ladder = [
  "pull",     # forward encrypted bytes; relay without reading (Keyhive Pull)
  "read",     # decrypt and render semantic content (Keyhive Read)
  "edit",     # produce accepted mutations (Keyhive Edit)
  "admin",    # manage membership, recipe, epoch/revocation, residency actions (Keyhive Admin)
]
# Retired rungs: "propose"+"promote" (2026-05-31, ceremonies gone);
#   "sync"+"revoke" (2026-06-01 — sync = pull-at-scale; revoke = an admin op).

# Relay-law exception: pull does NOT imply read
pull-implies-read = false
# All other abilities imply every ability below them
implication-rule = "ordered-except-pull"

# Ratings eligible to federate (structural gate — stage band is NOT a gate)
# Source: FEDERABLE_RATINGS in packages/lararium-mesh/src/causal-island.ts
federable-ratings = ["meme", "ano", "kapu"]
```

<<~/ahu >>

<<~ ahu #caveats >>

## Lararium Caveats

Caveats are Lararium-native predicates evaluated at gate time.
A capability with no caveats is a maximally permissive grant within its ability scope.
Rating band names are Law-of-Fives structural buckets. Stage band carries a UX/rendering annotation only — it does NOT act as a capability gate condition.

### Rating Caveat (structural quality — Law of Fives)

```toml
[[caveats]]
kind    = "rating-at-least"
values  = ["Noise", "Data", "Meme", "Ano", "Kapu"]
note    = """
  Five structural buckets from pono/meme rating posture.
  Noise: raw signal, not machine-usable.
  Data: structure visible, meme law does not yet bind.
  Meme: lawful memetic shape holds; minimum for federation.
  Ano: one or more outward type laws bind the carrier.
  Kapu: invariant kernel; cannot be overridden by lower tiers.
"""
```

A carrier below `Meme` rating MUST NOT federate.
Noise and Data are node-local only.

### Manaoio Caveat (believability weight)

```toml
[[caveats]]
kind    = "manaoio-at-least"
type    = "integer Level [0–20]"
note    = """
  Community-weighted believability. Distinct from confidence (operator-set).
  Three separate thresholds: read / edit / admin.
  Default: 0 / 12 / 16.
"""
```

### Scope and Boundary Caveats

```toml
[[caveats]]
kind    = "room-recipe"
type    = "lar:/// URI — meme must satisfy this recipe's filter"

[[caveats]]
kind    = "kapu-scope"
values  = ["personal", "consensual", "collective", "universal"]
note    = "maps to SCOPE_5 / LADDER_5 social scope; capability valid only within this level"

[[caveats]]
kind    = "host-boundary"
values  = ["hostless-only", "hostful-ok"]
note    = "hostless-only: capability does not extend to live session records"

[[caveats]]
kind    = "edge-island"
type    = "edge: island id"
note    = "capability scoped to one specific edge island"

[[caveats]]
kind    = "epoch"
type    = "epoch string"
note    = "capability invalid after this epoch string; rolls with revocation"
```

### Federation Defaults (operator-configurable per room recipe)

```toml
[federation_defaults]
# Structural gate — rating ladder
min_rating_federate  = "Meme"   # Noise and Data are node-local only

# Believability gate — manaoio scalar
min_manaoio_read     = 0
min_manaoio_propose  = 12
min_manaoio_move     = 16

# Stage band is a UX/rendering annotation only.
# Room recipes MAY include stage-based filter predicates as operator configuration,
# but stage is not a hardcoded capability gate condition.
```

<<~/ahu >>

<<~ ahu #gate-points >>

## Capability Gate Points

A capability MUST be evaluated at these transitions — not deferred:

```
1. room join         — before handleSocketConnect
2. boot receipt emit — before sending the join snapshot
3. edge-island open  — before stream handshake
4. per-delta accept  — capability must still be valid at delta receipt time
5. promotion propose — before a hostful record enters the promotion queue
6. epoch rollover    — before any new live-tail frames are issued
```

Gate failures at steps 1–3 close the connection.
Gate failures at step 4 drop the delta frame and log a receipt violation.
Gate failures at steps 5–6 reject the operation and emit a refusal receipt.

<<~/ahu >>

<<~ ahu #documents-as-groups >>

## Documents as Groups

A room, meme, recipe, or edge island
MAY act as an authority-bearing group with its own access graph.

This means:

```
lar:///rooms/the-altar-fire
  members:
    admin group   → move + admin
    operator group → read + sync + propose
    public group  → read (visible public layer only)

lar:///memes/ha.ka.ba/@lares/pono/some-meme
  members:
    admin group   → write + move
    operator group → read + sync + propose

edge:nodeA:nodeB:altar-fire:epoch42
  members:
    nodeA device key → sync + pull
    nodeB device key → sync + pull
    relay principal  → pull only
```

No global ACL owns these. Authority travels with the graph. Each object owns its own.

<<~/ahu >>

<<~ ahu #ucan-posture >>

## UCAN Posture

```
UCAN principles:        consume now
UCAN wire envelope:     design for now
                        (issuer / audience / resource / ability / caveat / proof / expiry)
UCAN hard dependency:   defer until after proof fixture + semantic alignment audit
Lararium authority:     Orichalcum Profile governs — not UCAN alone
```

UCAN provides the external proof shape. Orichalcum holds the semantic law.

Build adapters so a Lararium capability can emit and verify a UCAN wire proof.
Do not let UCAN wire validity become the internal source of truth for Lararium authority.

A cryptographically valid UCAN that fails a Lararium caveat (rating, manaoio,
kapu-scope, epoch) is not authorized. The caveat gate fires after
the crypto gate, not instead of it.

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #has-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:has >>
<<~ pranala #required-by-federation ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/federated-causal-islands family:control role:required-by >>
<<~ pranala #to-research-streams ? -> lar:///ha.ka.ba/@lares/v0.1/docs/pono/research-streams family:relation role:grounded-by >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
