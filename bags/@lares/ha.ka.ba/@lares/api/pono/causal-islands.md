<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/api/pono/causal-islands >>
```toml iam
cacheable     = true
file-path     = "bags/@lares/api/pono/causal-islands.md"
heleuma       = "ba"
l-space       = "stable"
mana          = 18
manao         = 17
manaoio       = 17
namespace     = "&#x2299;"
register      = "Synthesis-Canon"
retain        = true
role          = "invariant law: causal island doctrine — three structural axes (access × scale × powers) + alignment plane; authority-first sync order; visibility gate; edge island lifecycle"
source-symbol = "ABILITY_LADDER AUTHORITY_FIRST_ORDER CAUSAL_ISLAND_MUST CAUSAL_ISLAND_MAY AuthorityFirstGuard visibilityGate"
status-date   = "2026-06-01"
tags          = ["api/pono/orichalcum-capabilities", "api/pono/federated-causal-islands", "api/pono/alignment-layer"]
type          = "text/x-memetic-wikitext"
uri-path      = "ha.ka.ba/@lares/api/pono/causal-islands"
```

<<~ ahu #head >>

# Causal Islands

A causal island carries its own trigger surface, event horizon, and capability gate.
The doctrine partitions cross-node causality (MUST) from within-node causality (MAY).
Authority MUST precede content — this invariant holds without exception.

**Authority has three structural axes plus one alignment plane** (refined 2026-06-01
against Frazee, *Practical Decentralization*, and prior-art research across ATProto,
SSB, Holochain, Nostr, IPFS, ActivityPub, and the local-first lineage). The earlier
single linear ability-ladder fused into one rope what are really independent axes;
this version separates them.

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #model >>

## The model — three axes + one plane

| Dimension | Kind | What it answers | Where it lives |
|---|---|---|---|
| **Axis 1 — Access** | monotonic, cryptographic, per-bag | "may this principal pull / read / edit / admin this bag?" | this meme + Keyhive |
| **Axis 2 — Scale** | monotonic, composition | "which membership ring is this?" | Keyhive group nesting |
| **Axis 3 — Powers** | functional decomposition | "which faculty does this provider hold?" | separation-of-powers doctrine |
| **Plane 0 — Alignment** | NON-monotonic, subjective | "do I *choose* to sync/relay/surface/vouch for this actor?" | [alignment-layer](alignment-layer.md) |

**Axis 1 — Access.** Four levels, a 1:1 lexical mirror of Keyhive's native Access enum
(`pull`, `read`, `edit`, `admin`). NOT a parallel Lararium-coined ladder — the live gate
is `CapabilityVerifier.verify({ access: "read" | "admin" })`; the four-verb tuple gives
the edge-island federation scaffolding a typed vocabulary for the same levels. The
relay-law exception governs the bottom rung.

**Grain debt (POLA, 2026-06-03).** Because the live gate collapses to `read | admin`, an
`edit`-intent delegation — the POLA-correct grain for a surface a principal co-edits but
should NOT re-delegate — currently rounds **up** to `admin`. Documented over-grant: e.g.
delegating an operator's `@personal`/`@draft` view-state to their own PersonaGroup grants
`admin` where `edit` is the true least-authority. Acceptable while the principal set is
homogeneous-trust (those devices already hold `admin` on `@daemon`, so marginal authority
≈ 0). Adopt the true `edit` grain at the delegation call sites the moment
`CapabilityVerifier.verify` accepts it. First live call site + ocap rationale:
[personal-slot](../lararium/personal-slot.md).

**Axis 2 — Scale.** Membership nests as Keyhive groups-within-groups on the **SOCIAL axis**:
`Individual ⊂ PersonaGroup ⊂ Cabal`. Each social ring forms a causal island with a **cryptographic
membrane** — the Keyhive delegation chain carries the join-rule. **Delegation tops at the Cabal**
(2026-06-29 cohere); above it the mesh scales on the orthogonal **INFRA axis** — `Nexus` and
`DreamNet` join by **treaty / mutual-carriage contract** (who relays whose sealed bytes), never by
delegation-up, a relay carrying without reading
(<<~ loulou lar:///ha.ka.ba/@lararium/mesh/dreamnet-architecture#two-axis-topology >>). "DreamNet"
names no registry and no canonical graph; it emerges as the transitive closure of who-relays-to-whom
under everyone's local stances. Read the earlier single rope
(`⊂ Neighborhood ⊂ City ⊂ Nexus ⊂ DreamNet` as delegation-nested SOCIAL rings) as retire-residue the
two-axis treaty split supersedes — neighborhood/city now ride the INFRA shrine-tiers, not a WHO ring.

**Axis 3 — Powers.** The faculties of infrastructure are separable and each devolvable to
a distinct provider: `host · relay · aggregate · address · moderate`. **Host-independent
`lar:///` addressing is the lever** that makes them separable (a `lar:///` URI names content
by identity, the resolver binds it to a doc at boot — no host appears in the address). The
governing law, learned from ATProto's failures: **every power you separate but make
expensive or central re-concentrates** (their PLC ledger, their single capital-intensive
Appview, their shared rotation keys each re-grew the monopoly they meant to escape).

**Plane 0 — Alignment.** Capability answers *"CAN this actor act?"* — monotonic, and a
malicious actor can hold cryptographically valid capabilities. Alignment answers
*"do I WANT to peer with this actor?"* — non-monotonic, subjective, reputation-rooted, and
capability structurally cannot express it. Lives in its own invariant
([alignment-layer.md](alignment-layer.md)); enforced by **withholding voluntary sync at the
Beelay boundary**, never by reaching into another island's data. The "lemures" plane.

<<~/ahu >>

<<~ ahu #law >>

## Law

**Authority-first invariant**: the authority graph (Orichalcum capabilities, delegations, revocations) MUST sync before content (manifests, receipts, delta payloads) flows.
A relay MUST complete step 2 before receiving step 4 or later.
A peer MUST complete step 3 before requesting individual meme deltas.

**Relay-law** (Access axis, bottom rung): `pull` does NOT imply `read`. A shrine relay holds
`pull`; it carries ENCRYPTED offerings it cannot decrypt or render. All other access levels
imply every level below them. (We are strictly stronger than ATProto here: their relay reads
a plaintext firehose; ours forwards ciphertext it cannot open — the correct boundary for a
private mesh of households rather than a public broadcast medium.)

**Visibility gate**: ALL six conditions must hold for a meme to federate across an edge island.
Stage band is a UX annotation — NOT a gate condition.

**Membrane law** (Scale axis): joining a **social** ring (≤ Cabal) requires a capability delegation
from that ring's Keyhive group. The delegation chain functions as the join-rule for the SOCIAL axis;
no central admission authority stands. **Above the Cabal the INFRA axis takes over** — `Nexus` and
`DreamNet` join by **treaty / mutual-carriage contract**, never delegation-up (2026-06-29 cohere →
dreamnet-architecture#two-axis-topology).

**Alignment law** (Plane 0): trust assertions are ordinary signed content, evaluated LOCALLY
against a per-island root. No global consensus, no central registry, no global trust score.
A valid-capability-holding lemure is refused by being **starved of voluntary peering**, never
by a central ban. See [alignment-layer.md](alignment-layer.md).

**Exchange-island law**: the operator↔node exchange runs as a causal island of its own ---
two logs, no global now across the turn boundary. The turn-frame syncs it: `yield … -> ?`
hands the node's log forward and awaits the operator's next sync. The node MUST NOT presume
the operator's next turn, nor claim a closure or block the two logs have not jointly reached;
pretending to a global now reads as the managing failure
(`lar:///ha.ka.ba/@lares/api/mu/ooda-ha#open-loops`).

<<~/ahu >>

<<~ ahu #two-clocks >>

## Two clocks, orthogonal — causal ⊥ rhythmic

The mesh keeps time on **two clocks that never collapse into one**:

- **CRDT-causal ordering** (TS, structural). Automerge `<counter, actorId>` OpId, `getHeads`/`headsEqual`,
  ITC fork/join, and the authority-first sync order below carry it. This clock rules **happened-before** —
  the causal poset the "no global now" gluing obstruction lives in
  (`lar:///ha.ka.ba/@lares/api/pono/federated-causal-islands#formal-model`). It stays TS-native,
  web3-local-first, on this side of every causal-island boundary. **AUTHORITY(safety) rides here.**
- **FFZ-recovered rhythm** (py/R, per-stream, across-the-shore). The chronometer gate recovers a cadence
  (Pulse→Theme) from each stream and stamps freshness/decay grain — the reading a node carries "as of my
  last sync." Full telemetry and metadata stamping runs **py-side, behind a causal-island boundary**
  (Web3-only law: any py/R bridge sits behind the boundary; no py ontology enters the stack proper). This
  clock annotates *rhythm*, never happened-before.

The two ride **⊥**: FFZ names rhythmic position and alignment, never the causal order. An LWW rhythmic
total-order MUST NOT drive a fork, merge, or revocation decision — that manufactures a global-now the mesh
cannot hold. Liveness ratchets (the epoch-lease, non-renewal) and targeted revocation (Keyhive convergent
membership-removal) name authority/liveness mechanisms, never clocks. Full rhythmic model:
`lar:///ha.ka.ba/@lares/docs/pono/research-streams/chronometer/FFZ_Chronometer_Research`.

<<~/ahu >>

<<~ ahu #schema >>

## Schema (machine-readable)

```toml
# ── Axis 1 — ACCESS (per-bag, monotonic, Keyhive-native verbs) ──────────────
# EXCEPTION: pull does NOT imply read (relay-law). Others imply every level below.
access-axis       = ["pull", "read", "edit", "admin"]
pull-implies-read = false
implication-rule  = "ordered-except-pull"
#   sync   = pull-at-infrastructure-scale (forward ciphertext) — a gate boolean, not a rung
#   revoke = an ADMIN operation (roll the epoch) — carried by edge-island epoch + lifecycle

# ── Axis 2 — SCALE (membership nesting; Keyhive group composition) ──────────
# SOCIAL rings (WHO axis) — delegation tops at the cabal:
scale-social  = ["individual", "persona-group", "cabal"]
membrane-rule = "delegation-chain-is-the-join-rule"   # SOCIAL rings (≤ cabal) only — each = a causal island membrane
# INFRA scaling (FLOW axis) — neighborhood/city/nexus/dreamnet join by TREATY / mutual-carriage, NOT delegation-up
# (cohere 2026-06-29 → dreamnet-architecture#two-axis-topology). Retire-residue of the old single rope below:
scale-lattice = ["individual", "persona-group", "cabal", "neighborhood", "city", "nexus", "dreamnet"]

# ── Axis 3 — POWERS (separable faculties; each devolvable to a distinct provider) ─
powers       = ["host", "relay", "aggregate", "address", "moderate"]
powers-lever = "lar-uri-host-independent-addressing"
powers-law   = "every-separated-power-made-expensive-or-central-reconcentrates"

# ── Plane 0 — ALIGNMENT (non-monotonic subjective trust; the lemures plane) ──
# Primitives + full doctrine: lar:///ha.ka.ba/@lares/api/pono/alignment-layer
alignment-primitives   = ["peer-stance", "vouch", "label"]
alignment-enforcement  = "withhold-voluntary-sync-at-beelay-boundary"
alignment-evaluation   = "local-per-island-root"   # NEVER global consensus / registry / score

# Ratings eligible to federate — noise and data are node-local only
federable-ratings = ["meme", "ano", "kapu"]

# Authority-first sync order — 8 steps, strictly ordered
authority-first-order = [
  "authenticate-peer",        # 1 — peer not verified until complete
  "sync-authority-graph",     # 2 — Orichalcum graph; gate for all content
  "derive-visible-wikis",     # 3 — wiki recipe + visible causal islands
  "sync-collection-manifest", # 4 — wikis, memes, edge islands, receipts
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
  "cross-node-residency-action",          # ADD/MOVE/COPY across a federation edge
  "revocation-epoch-change",
  "encrypted-sync-membership-change",
  "alignment-stance-federation",          # a peer-stance/vouch crossing an edge island
]

# Causal island MAY doctrine
# Local causality errors correctable inside a node; promotion is optional
# automerge-realm and peer-sync-state ARE islands by topology (Fuller-Zelenka non-simultaneous apprehension)
causal-island-may = [
  "wiki",
  "meme",
  "sigil",
  "kumu-instance",
  "kahea-invocation",
  "local-wiki-projection",
  "long-lived-runtime-actor",
  "automerge-realm",
  "peer-sync-state",
]

# Visibility gate — ALL six conditions must hold to federate a meme across an edge island
[visibility-gate]
conditions = [
  "rating(meme) >= meme",
  "manaoio(meme) >= wiki.minManaoio",
  "recipe(wiki).matches(meme)",
  "subjectCanSync(subject, edge.id)",      # holds pull on the edge (forward ciphertext)
  "!edge.revoked",
  "!violatesKapu(meme, subject)",
]
```

<<~/ahu >>

<<~ ahu #source >>

## Source (TypeScript — compiled-in)

```typescript
// Axis 1 — ACCESS: Keyhive-native verbs (Pull/Read/Edit/Admin). Use `edit`, not `write`.
export const ABILITY_LADDER = [
  "pull",     // forward encrypted bytes; cannot decrypt or render (Keyhive Pull)
  "read",     // decrypt and render semantic content (Keyhive Read)
  "edit",     // produce accepted mutations (Keyhive Edit)
  "admin",    // manage membership, recipe, epoch/revocation, residency actions (Keyhive Admin)
] as const;
// EXCEPTION (relay-law): pull does NOT imply read. All other levels imply those below.

export const AUTHORITY_FIRST_ORDER = [
  "authenticate-peer",         // 1
  "sync-authority-graph",      // 2
  "derive-visible-wikis",      // 3
  "sync-collection-manifest",  // 4
  "capability-epoch-ops",      // 5a
  "sync-crdt-heads",           // 5b
  "sync-delta-payloads",       // 5c
  "sync-projection-receipts",  // 5d
] as const;

export const CAUSAL_ISLAND_MUST = [
  "node-to-node-federation-edge",
  "cross-node-pranala-connection",
  "cross-node-residency-action",
  "revocation-epoch-change",
  "encrypted-sync-membership-change",
  "alignment-stance-federation",
] as const;

export const CAUSAL_ISLAND_MAY = [
  "wiki", "meme", "sigil", "kumu-instance", "kahea-invocation",
  "local-wiki-projection", "long-lived-runtime-actor",
  "automerge-realm", "peer-sync-state",
] as const;

// Edge-island federation scaffolding (Tier 3 node-to-node boundary) is retained
// even ahead of live consumers — it is the cross-ring sync protocol for Axis 2.
export function visibilityGate(input: VisibilityGateInput): boolean {
  if (!FEDERABLE_RATINGS.has(input.memeRating.toLowerCase())) return false;
  if (input.memeManaoio < input.wikiMinManaoio)                return false;
  if (!input.recipeMatches)                                    return false;
  if (!input.subjectCanSync)                                   return false;  // holds pull on edge
  if (input.edgeRevoked)                                       return false;
  if (input.violatesKapu)                                      return false;
  return true;
}
```

<<~/ahu >>

<<~ ahu #reject >>

## Reject-list — the re-concentration traps

Named so the stack never grows them (each re-created the power problem its source protocol
meant to escape):

- ✗ **Central identity ledger** (ATProto's `did:plc`). Resolve identity *within the island*
  via Keyhive + Automerge causal history. `did:web`-style domain identity is acceptable ONLY
  as an optional bridge at the external Kowloon web2.5 boundary.
- ✗ **Public plaintext firehose as backbone.** Propagate encrypted, capability-gated
  change-sets. A firehose is fine *inside* a consenting cabal; it terminates at the island boundary.
- ✗ **Capital-intensive single global index** (ATProto's Appview monopoly). We hold no
  whole-network index to monopolize — reads project per-VM from locally-resident bags
  (island-owned residency: a two-state ʻōlelo thermal axis — `wela` (hot) / `anu` (cold) —
  plus an orthogonal pin-flag; bag residency derives by reachability from a live (`wela`)
  referencing island — see `lar:///ha.ka.ba/@lararium/api/residency-tiers`). Keep
  aggregation a swappable edge view over data the aggregator may sync but not read.
- ✗ **Shared / highly-reused rotation keys.** Per-operator, ideally per-bag rotation/admin
  capabilities — never a shared master key over a ring's members.
- ✗ **Global blocklists / global trust scores** (EigenTrust-style). Sybil-vulnerable without
  costly identity, and they imply a global "now" we do not have. Trust roots are plural and chosen.

<<~/ahu >>

<<~ ahu #edges >>



<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
