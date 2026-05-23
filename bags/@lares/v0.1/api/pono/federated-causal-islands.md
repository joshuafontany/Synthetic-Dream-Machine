<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/federated-causal-islands >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/pono/federated-causal-islands"
file-path = "bags/@lares/v0.1/api/pono/federated-causal-islands.md"
type = "text/x-memetic-wikitext"
tagspace     = "stable"
confidence   = 0.82
register     = "CS"
manaoio      = 0.80
mana         = 0.84
manao        = 0.82
role         = "invariant law: Fontany-Fuller-Zelenka non-simultaneous apprehension as ontological basis; causal island tiers 0–3; authority-first sync order; edge-island identity, lifecycle, relay semantics"
cacheable    = true
retain       = true
invariant    = true
```



<<~ ahu #head >>

# Federated Causal Islands

Fuller-Zelenka non-simultaneous apprehension as ontological basis.
Named causal island tiers 0–3; authority-first sync order; edge-island identity, lifecycle, relay law.

<<~/ahu >>

<<~&#x0002;>>

<<~ ahu #ooda-ha >>

✶ locate the causal boundary — where can causality not be guaranteed simultaneously?
⏿ orient the tier: Tier 0 kumu/active memes, Tier 1 wiki room memes, Tier 2 Automerge Realms, Tier 3 Lares nodes, Tier 4 Commons/Universe horizon
◇ MUST become island: federation edges, pranala connections, canon ceremonies, epoch changes, membership changes
▶ authority-first sync: authenticate → authority graph → visible rooms → manifest → capability ops → CRDT → deltas
⤴ edge island carries id, capability, offset, epoch, visibility-gate, receipt; offset belongs to the edge not the remote
↺ confirm sync order maintained; content did not precede authority; relay holds pull not read

<<~/ahu >>

<<~ ahu #law >>

## Ontological Basis (Fuller-Zelenka)

No observer apprehends events in Universe simultaneously.
A node never holds the full state of a distributed system "at once."
It holds a snapshot of what it has synchronized so far.
This names no limitation. This names topology.

Simultaneously apprehended: your local Automerge doc snapshot, right now.
Non-simultaneously apprehended: everything else —
- other peers syncing the same doc (you see their state at last sync)
- other Automerge Realms reachable from this one on the network
- tiddlers not yet hydrated in the local TW5 instance
- kumu/active-meme instances whose trigger surface is their own event horizon

Any boundary across which causality cannot be guaranteed simultaneously counts as a causal island boundary.
The tier map below names these boundaries from innermost to outermost.

## Law

A node-to-node pranala connection counts as a causal island.

It does not function as transport. It does not function as socket. It names a capability-gated causal
boundary between two Lares nodes carrying its own identity, durable offset, stream
log, reconciliation state, visibility predicate, revocation epoch, and receipt history.

A room WebSocket connection does NOT count as an edge island. A room connection remains session-scoped
and ephemeral. An edge island remains persistent, named, and authority-bearing.

An Automerge Realm (a distinct Automerge doc) remains ALWAYS non-simultaneously apprehended,
regardless of where it was first encountered on the network.

<<~/ahu >>


<<~ ahu #edge-island-shape >>

## Edge Island Shape

Every edge island MUST carry:

```toml
id                = "edge:${sourceNode}:${targetNode}:${epoch}"
capability        = "Orichalcum proof authorizing this connection"
offset            = "monotonic frame count — belongs to the edge island, not the remote node"
epoch             = "revocation generation; rolling epoch terminates prior live-tail access"
visibility-gate   = "canFederate(meme, room, edge, subject) — see gate law below"
receipt           = "issued after each meaningful transition; hash-stable for prompt cache"
```

### Visibility Gate Law

A meme passes the federation gate when ALL of the following hold:

```
rating(meme)    >= Meme           # structural ladder: Noise/Data/Meme/Ano/Kapu
manaoio(meme)   >= room.minManaoio
recipe(room).matches(meme)
hasAbility(subject, "sync", edge.id)
!edge.revoked
!violatesKapu(meme, subject)
```

`rating` names the structural quality gate: has the carrier achieved lawful meme shape?
Noise and Data are node-local only. They do not federate regardless of any other condition.

Stage band (GR/OS/US/CS/DS) functions as a UX rendering annotation — it governs visual presentation
in the masks/voices layer, not federation eligibility. Room recipes MAY filter by stage
as an operator-configured predicate, but stage is not a hardcoded gate condition here.

The offset belongs to the edge island. An edge island that reconnects after downtime
resumes from its last known offset — it does not re-sync from the beginning.

<<~/ahu >>

<<~ ahu #sync-order >>

## Authority-First Sync Order

Content MUST NOT precede authority. This invariant has no exceptions.

```
1. authenticate peer / node / device
2. sync Orichalcum authority graph
   (membership, capabilities, delegations, revocations)
3. derive visible room recipe + visible causal islands
4. sync collection manifest
   (rooms, memes, edge islands, receipts)
5. for each visible island:
   a. capability / epoch ops
   b. CRDT heads
   c. delta payloads
   d. projection receipts
```

A relay that has not completed step 2 MUST NOT receive step 4 or later.
A peer that has not completed step 3 MUST NOT request individual meme deltas.

<<~/ahu >>

<<~ ahu #lifecycle >>

## Edge Island Lifecycle

```
stable sediment | current boot receipt | live delta tail
```

- **Join:** receive boot receipt first — the shape of the visible world at join time.
  This does not provide a full CRDT sync. It provides a snapshot of what this peer currently
  authorized to see.
- **After join:** request missing deltas from the last known offset.
- **Revocation:** epoch rolls. The revoked principal receives no future live tail.
  Past sediment encrypted at prior epoch keys remains readable by those who held
  those keys. Revocation is forward-only.
- **Receipt:** emitted after join, after each epoch change, after each
  canon-promotion ceremony. Receipts stay hash-stable and usable as prompt cache keys.
- **Re-seeding:** boot receipt re-issued; sediment layers may compact;
  live tail resets from new offset zero.

<<~/ahu >>

<<~ ahu #relay-law >>

## Relay Law

A trust-minimized relay holds `pull`, not `read`.

```
pull  — retrieve encrypted bytes and forward them; cannot decrypt or render
read  — decrypt and render semantic content
```

A relay MUST NOT be granted `read` unless it is also a trusted peer with
an Orichalcum capability carrying the `read` ability.

A shrine relay carries offerings it cannot understand. This names correct posture.
The altar does not require the relay to comprehend the offering to carry it.

<<~/ahu >>

<<~ ahu #tier-map >>

## Tier Map

```
Tier 0 — active programming memes (kumu instances, UEFN device analogues, kahea invocations)
  MAY become causal islands. Each has its own trigger surface, params, and event horizon.
  A kumu instance with declared papalohe ports forms a natural island candidate.
  Events cross only via papalohe edges. kukali names the yield point inside the island.
  Instance identity provisioned on first papalohe edge declaration, not on kahea invocation.
  Promotion to island is optional; local causality errors correctable inside the node.

Tier 1 — memes inside rooms (within your local Automerge doc window)
  Simultaneously apprehended within your local doc snapshot.
  A room functions as a filter recipe over the meme graph — not a data partition.
  Rating (≥Meme) gates which room recipes include a meme. Stage band functions as rendering annotation only.
  Peer state of the SAME doc is NOT simultaneously apprehended — you see their last sync.

Tier 2 — Automerge Realms (distinct Automerge docs)
  A separate Automerge doc reached from this one — no matter where first encountered.
  ALWAYS non-simultaneously apprehended by topology, not by policy.
  "automerge-realm" and "peer-sync-state" MAY be named causal islands for protocol tracking.
  NOTE: the session event-bus bag counts as a Tier 2 boundary — it names a distinct Automerge doc
  shared across multiple wiki Worker Threads. The Session Wiki RE watching the event-bus bag
  forms a Tier 2 crossing. This functions as the canonical cross-wiki coordination pattern (Scale-2 in
  the HUD meme: the-lararium-hud.md).

Tier 3 — Lares nodes (the federated layer)
  A federation edge forms a causal island (this law).
  Cross-node sync begins with a boot artifact, then proceeds via offset-resumable deltas.
  Authority graph reconciles before manifest. Manifest reconciles before content.

Tier 4 — Commons / Universe horizon [C~0.92 after law-of-5s]
  The horizon beyond direct federation. The set of all possible lararium nodes including
  those not yet reachable or known. No single node holds a snapshot of Tier 4 state.
  Non-simultaneously apprehended by definition (Fuller-Zelenka principle extended to the
  limit of apprehension). The NexusRegistryDoc maps Tier 3 neighbors; Tier 4 is Universe
  beyond the edge of that map. Five tiers, bounded sense of Universe. Tier 4 names the
  bound, not an implementation target.
```

<<~/ahu >>

<<~ ahu #causal-island-doctrine >>

## Causal Island Doctrine

### MAY become causal islands

- rooms, memes, sigils
- kumu instances, kahea invocations (Tier 0 prime candidates)
- local room projections, long-lived runtime actors
- automerge-realm, peer-sync-state (non-simultaneous by topology)

### MUST become causal islands

- node-to-node federation edges
- cross-node pranala connections
- canon-promotion ceremonies
- revocation epoch changes
- encrypted sync membership changes
- any live hostful record proposing hostless canon mutation

Local causality errors can be corrected inside a node.
Cross-node causality errors become federation corruption.

<<~/ahu >>


<<~ ahu #schema >>

## Schema (machine-readable)

Canonical TOML form. Source of truth for `AUTHORITY_FIRST_ORDER`, `CAUSAL_ISLAND_MUST`, `CAUSAL_ISLAND_MAY`
in `packages/lararium-mesh/src/causal-island.ts`.

```toml
# Authority-first sync step order — gate failures at steps 1–3 close the connection
authority-first-order = [
  "authenticate-peer",
  "sync-authority-graph",
  "derive-visible-rooms",
  "sync-collection-manifest",
  "capability-epoch-ops",
  "sync-crdt-heads",
  "sync-delta-payloads",
  "sync-projection-receipts",
]

# MUST become causal islands — cross-node causality errors = federation corruption
causal-island-must = [
  "node-to-node-federation-edge",
  "cross-node-pranala-connection",
  "canon-promotion-ceremony",
  "revocation-epoch-change",
  "encrypted-sync-membership-change",
  "live-hostful-record-proposing-hostless-canon-mutation",
]

# MAY become causal islands — local errors correctable inside node; promotion optional
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
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:implements >>
<<~ pranala #to-orichalcum ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/orichalcum-capabilities family:control role:depends >>
<<~ pranala #extends-pranala ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/pranala family:control role:extends >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
