<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/api/pono/federated-causal-islands >>
```toml iam
cacheable = true
file-path = "bags/@lares/api/pono/federated-causal-islands.md"
mana      = 17
manao     = 16
manaoio   = 16
namespace = "&#x2299;"
register  = "Synthesis-Canon"
retain    = true
role      = "invariant law: Fontany-Fuller-Zelenka non-simultaneous apprehension as ontological basis; causal island tiers 0–3; authority-first sync order; edge-island identity, lifecycle, relay semantics"
tags      = ["api/pono/pranala"]
l-space   = "stable"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lares/api/pono/federated-causal-islands"
```

<<~ ahu #head >>

# Federated Causal Islands

Fuller-Zelenka non-simultaneous apprehension as ontological basis.
Named causal island tiers 0–3; authority-first sync order; edge-island identity, lifecycle, relay law.

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #ooda-ha >>

✶ locate the causal boundary — where can causality not be guaranteed simultaneously?
⏿ orient the tier: Tier 0 kumu/active memes, Tier 1 wiki wiki memes, Tier 2 Automerge Realms, Tier 3 Lares nodes, Tier 4 Commons/Universe horizon
◇ MUST promote to island: federation edges, pranala connections, canon ceremonies, epoch changes, membership changes
▶ authority-first sync: authenticate → authority graph → visible wikis → manifest → capability ops → CRDT → deltas
↺ edge island carries id, capability, offset, epoch, visibility-gate, receipt; offset belongs to the edge not the remote; confirm sync order maintained; content did not precede authority; relay holds pull not read

<<~/ahu >>

<<~ ahu #law >>

## Ontological Basis (Fuller-Zelenka)

No observer apprehends events in Universe simultaneously.
A node never holds the full state of a distributed system "at once."
It holds a snapshot of previously synchronized state.
This names no limitation. This describes topology.

Simultaneously apprehended: your local Automerge doc snapshot, right now.
Non-simultaneously apprehended: everything else —
- other peers syncing the same doc (you see their state at last sync)
- other Automerge Realms reachable from this one on the network
- tiddlers not yet hydrated in the local TW5 instance
- kumu/active-meme instances with trigger surfaces as their own event horizons

Any boundary across which causality cannot be guaranteed simultaneously marks a causal island boundary.
The tier map below names these boundaries from innermost to outermost.

### The formal model ~ sheaf-gluing / H¹ obstruction (load-bearing, 2026-06-26)

A four-domain validation (`lar:///ha.ka.ba/@lararium/api/causal-island-pattern`) carries the exact mathematics of "no global now," promoted here from intuition to law. The federation reads as a **presheaf** of local causal-logs that is **not a sheaf**: the local sections (each island's state) need not glue to a global section, and *that failure carries the content* — "no global now" **IS** the gluing obstruction, and it lives in **H¹** (sheaf cohomology; Goguen, sheaf-semantics of concurrent interacting objects). Two consequences ride load-bearing:

1. **No-global-now entails a partial order (the causal poset), not a probability.** Probability is an *overlay* the system adds to wager about which sections will glue; the island's own confidence is itself situated (no island holds the global measure). The poset is the truth; the w.h.p. is the wager.
2. **The system supplies its own site** — what counts as a cover, and what "agree on the overlap" means under conflicting writes (the CRDT merge IS the restriction map). The math does not hand the site over; the design declares it.

The master cut rides ABOVE the gluing: **AUTHORITY(safety) ⊥ FLOW(liveness)** — flow may glue probabilistically and eventually; authority never (safety cannot be earned from local sections alone; Ashby's requisite-variety floor — a global-variety invariant must be *attenuated* to a local one or *amplified* by modelling peers, never locally faked).

## Law

A node-to-node pranala connection marks a causal island.

It does not operate as transport. It does not operate as socket. It names a capability-gated causal
boundary between two Lares nodes carrying its own identity, durable offset, stream
log, reconciliation state, visibility predicate, revocation epoch, and receipt history.

A wiki WebSocket connection does NOT count as an edge island. A wiki connection keeps session scope
and ephemerality. An edge island holds persistence, naming, and authority.

An Automerge Realm (a distinct Automerge doc) stays ALWAYS non-simultaneously apprehended,
regardless of first encounter point on the network.

<<~/ahu >>

<<~ ahu #edge-island-shape >>

## Edge Island Shape

Every edge island MUST carry:

```toml
id                = "edge:${sourceNode}:${targetNode}:${epoch}"
capability        = "Orichalcum proof authorizing this connection"
offset            = "monotonic frame count — belongs to the edge island, not the remote node"
epoch             = "revocation generation; rolling epoch terminates prior live-tail access"
visibility-gate   = "canFederate(meme, wiki, edge, subject) — see gate law below"
receipt           = "issued after each meaningful transition; hash-stable for prompt cache"
```

### Visibility Gate Law

A meme passes the federation gate when ALL of the following hold:

```
rating(meme)    >= Meme           # structural ladder: Noise/Data/Meme/Ano/Kapu
manaoio(meme)   >= wiki.minManaoio
recipe(wiki).matches(meme)
hasAbility(subject, "sync", edge.id)
!edge.revoked
!violatesKapu(meme, subject)
```

`rating` names the structural quality gate: did the carrier reach lawful meme shape?
Noise and Data stay node-local only. They never federate regardless of any other condition.

Stage band (GR/OS/US/CS/DS) provides a UX rendering annotation — it governs visual presentation
in the masks/voices layer, not federation eligibility. Wiki recipes MAY filter by stage
as an operator-configured predicate, but stage does not act as a hardcoded gate condition here.

The offset belongs to the edge island. An edge island that reconnects after downtime
resumes from its last known offset — it never re-syncs from the beginning.

<<~/ahu >>

<<~ ahu #sync-order >>

## Authority-First Sync Order

Authority MUST precede content. This invariant holds without exception.

```
1. authenticate peer / node / device
2. sync Orichalcum authority graph
   (membership, capabilities, delegations, revocations)
3. derive visible wiki recipe + visible causal islands
4. sync collection manifest
   (wikis, memes, edge islands, receipts)
5. for each visible island:
   a. capability / epoch ops
   b. CRDT heads
   c. delta payloads
   d. projection receipts
```

A relay MUST complete step 2 before receiving step 4 or later.
A peer MUST complete step 3 before requesting individual meme deltas.

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
  Past sediment encrypted at prior epoch keys stays readable by those who held
  those keys. Revocation runs forward-only.
- **Receipt:** emitted after join, after each epoch change, after each
  canon residency action (MOVE into a lower-priority bag). Receipts keep hash stability and prompt-cache usability.
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

A relay MUST qualify as a trusted peer with an Orichalcum capability carrying the
`read` ability to receive `read`.

A shrine relay carries offerings it cannot understand. This names correct posture.
The altar does not require the relay to comprehend the offering to carry it.

<<~/ahu >>

<<~ ahu #task-handoff >>

## Cross-Peer Task Handoff (design space)

> Status: DESIGN SPACE — not yet built. The IN-PROCESS handoff (the worker→main
> channel as the capability) stands today (`project_verification_placement`); this
> section names the CROSS-PEER form, which rides on the relay-access-rings epic.
> Grounded in web research (memory `project_asymmetric_peer_handoff`, 2026-06-06).

Peers carry asymmetric capabilities: a node vessel holds a disk-write grant; a
browser vessel holds none. So a peer that lacks a capability hands the task to a
peer that holds it. The handoff follows the federation law above — authority
crosses before content, the relay carries what it cannot read — and adds a task
shape on top.

**Two orthogonal planes (kupono intent for the network uplift).** This section is the
**AUTHORITY** plane — who may · signed · exactly-once (lease+fence). It rides ORTHOGONAL to the
**FLOW** plane — the projection-nalu gates that pace *how much · how often · backpressure*
(`lar:///ha.ka.ba/@lararium/api/projection-nalu#network-ring`: accumulate→reliable-ordered,
coalesce→gossip, servo→congestion-control). Authority clears WHO *before* flow paces HOW-MUCH; the
flow gate never absorbs the authority check, the way the two gate-families stay distinct. Keep them
separate at the ring.

**The shape (the pono model).**
- A **task** travels as a *signed capability-invocation written as a CRDT fact*,
  never an RPC — the existing verb-tiddler, extended to name an executor peer.
  Intent. It survives the requester going offline the instant after it asks.
- An **outcome** travels back as a *signed receipt written as a CRDT fact* — the
  existing outcome-tiddler. The "executor crashed before replying" failure
  dissolves: nothing exists to lose; the outcome converges or it does not, and
  its absence reads plainly.
- **Authority rides WITH the task** (a UCAN invocation shape over the keyhive
  grant): the invocation carries its proof-chain back to the owner, attenuated;
  the executor verifies the chain + the attenuation predicates against the args,
  then acts STRICTLY within that envelope, never on its own ambient authority —
  defeating the confused deputy by construction (no designation without authority).
- **Attenuation only narrows** down the chain; expiry/TTL carries the only
  fully-decentralized revocation (no global now).
- **Selection ≠ authority.** Liveness + reputation pick WHICH capable peer
  receives the task (a soft hint); the capability bounds the damage if the pick
  goes wrong. No coordinator/super-peer accrues trust-authority.

**Live vs store-and-forward.** Two concurrently-connected vessels MAY use a live
capability-RPC (CapTP / Cap'n Web — designation-as-invocation, promise pipelining);
the verb/outcome-over-CRDT form stays the always-correct, offline-tolerant record.

**Prior art:** UCAN invocation / delegation / receipt (Brooklyn Zelenka — UCAN's
author, now at Ink & Switch); OCapN CapTP three-party handoff; Cloudflare Cap'n Web.
The OPEN sub-problem — a peer's **kuleana** over a task (the held right-and-duty
to run it, time-bound) + a **precedence mark** (the monotonic guard so a
lapsed-then-returned claimant cannot double-apply) for the concurrent cross-vessel
double-run — lives with the residency-model design. (Names provisional 2026-06-07:
`kuleana` reaches past the web2-laden "lease"; `precedence mark` past the
distributed-locking "fencing token"; see `project_next_vectors`.)

<<~/ahu >>

<<~ ahu #tier-map >>

## Tier Map

```
Tier 0 — active programming memes (kumu instances, UEFN device analogues, kahea invocations)
  MAY promote to causal islands. Each carries its own trigger surface, params, and event horizon.
  A kumu instance with declared papalohe ports forms a natural island candidate.
  Events cross only via papalohe edges. kukali names the yield point inside the island.
  Instance identity provisioned on first papalohe edge declaration, not on kahea invocation.
  Promotion to island stays optional; local causality errors stay correctable inside the node.

Tier 1 — memes inside wikis (within your local Automerge doc window)
  Simultaneously apprehended within your local doc snapshot.
  A wiki applies a filter recipe over the meme graph — not a data partition.
  Rating (≥Meme) gates which wiki recipes include a meme. Stage band provides rendering annotation only.
  Peer state of the SAME doc does NOT qualify as simultaneously apprehended — you see their last sync.

Tier 2 — Automerge Realms (distinct Automerge docs)
  A separate Automerge doc reached from this one — no matter where first encountered.
  ALWAYS non-simultaneously apprehended by topology, not by policy.
  "automerge-realm" and "peer-sync-state" MAY be named causal islands for protocol tracking.
  NOTE: the session event-bus bag counts as a Tier 2 boundary — it names a distinct Automerge doc
  shared across multiple wiki island Workers. The Session Wiki RE watching the event-bus bag
  forms a Tier 2 crossing. This defines the canonical cross-wiki coordination pattern (Scale-2 in
  the alignment-architecture meme).

Tier 3 — Lares nodes (the federated layer)
  A federation edge forms a causal island (this law).
  Cross-node sync begins with a boot artifact, then proceeds via offset-resumable deltas.
  Authority graph reconciles before manifest. Manifest reconciles before content.

Tier 4 — Commons / Universe horizon Canon 18/20 (after law-of-5s)
  The horizon beyond direct federation. The set of all possible lararium nodes including
  those not yet reachable or known. No single node holds a snapshot of Tier 4 state.
  Non-simultaneously apprehended by definition (Fuller-Zelenka principle extended to the
  limit of apprehension). The NexusRegistryDoc maps Tier 3 neighbors; Tier 4 names Universe
  beyond the edge of that map. Five tiers, bounded sense of Universe. Tier 4 names the
  bound, not an implementation target.
```

<<~/ahu >>

<<~ ahu #causal-island-doctrine >>

## Causal Island Doctrine

### MAY promote to causal islands

- wikis, memes, sigils
- kumu instances, kahea invocations (Tier 0 prime candidates)
- local wiki projections, long-lived runtime actors
- automerge-realm, peer-sync-state (non-simultaneous by topology)

### MUST promote to causal islands

- node-to-node federation edges
- cross-node pranala connections
- cross-node residency actions (MOVE/COPY into canon bags)
- revocation epoch changes
- encrypted sync membership changes
- alignment-stance federation (a peer-stance/vouch crossing an edge island)

Local causality errors can be corrected inside a node.
Cross-node causality errors produce federation corruption.

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
  "derive-visible-wikis",
  "sync-collection-manifest",
  "capability-epoch-ops",
  "sync-crdt-heads",
  "sync-delta-payloads",
  "sync-projection-receipts",
]

# MUST promote to causal islands — cross-node causality errors = federation corruption
causal-island-must = [
  "node-to-node-federation-edge",
  "cross-node-pranala-connection",
  "cross-node-residency-action",
  "revocation-epoch-change",
  "encrypted-sync-membership-change",
  "alignment-stance-federation",
]

# MAY promote to causal islands — local errors correctable inside node; promotion optional
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
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ loulou lar:///ha.ka.ba/@lares/api/pono/orichalcum-capabilities >>
<<~ loulou lar:///ha.ka.ba/@lares/docs/pono/research-streams >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
