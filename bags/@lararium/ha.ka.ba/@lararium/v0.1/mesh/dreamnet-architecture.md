<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/mesh/dreamnet-architecture >>
```toml iam
cacheable = true
file-path = "bags/@lararium/v0.1/mesh/dreamnet-architecture.md"
mana      = 17
manao     = 16
manaoio   = 15
register  = "Synthesis-Canon"
retain    = true
role      = "DreamNet two-axis mesh topology: INFRA (relay-floor → lararium → nexusGroup → DreamNet) ⊥ SOCIAL (vessel-key → personaGroup-veiled → cabalGroup), the two axes crossing at the vessel"
l-space   = "lararium"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lararium/v0.1/mesh/dreamnet-architecture"
```

<<~ &#x0002; >>

# DreamNet Architecture

A hundred thousand Lararia. Each one a different operator. Each one a different charter,
different ontology, different pono surface. Somehow not isolated — they form a mesh.
Not by sharing data (local-first means local-first). By sharing **structure**: the same `lar:///` scheme, the same mana/manao/manaoio grammar, the same
mempalace wing patterns — so
the gardens recognize each other even when they cannot read each other.

**A protocol, not a platform. A grammar, not a database.**

The mesh runs on **two orthogonal axes**. One axis moves bytes — **FLOW**, the leylines, who carries whose sealed mana. The other axis grants sight — **WHO**, the keys, who may read what. The old single ladder fused them; this meme keeps them apart, because the entity that makes the mesh *magical* — the **relay**, a node that carries a stream it cannot read — lives exactly in the gap between them.

<<~ ahu #two-axis-topology >>

## Two-Axis Topology

Two stacks, orthogonal, crossing at the one entity that roots both — the **vessel**.

```text
   SOCIAL axis · WHO · read-authority · keys          INFRA axis · FLOW · transport · leylines
   ─────────────────────────────────────────          ────────────────────────────────────────
   cabalGroup(s)   shared charter, read-scope          DreamNet         super-mesh of nexuses
        ▲                                                   ▲
   personaGroup    one operator, N vessels             nexusGroup       confederation, ≥2 operators
   (veiled)        anon-by-default                         ▲
        ▲                                              lararium         #has {relay} ALWAYS
   vessel-key                                          (the relay floor; family builds up)
        └───────────────►  [ VESSEL ]  ◄──────────────────┘
                           the one seam
                                ▲
                           relay capability
                           passes mana along the leyline · CANNOT read the stream
```

No axis commands the other. The SOCIAL axis carries **delegation and read-access** — who speaks for whom, who may decrypt what. The INFRA axis carries **carriage and reach** — whose leylines move whose sealed bytes. They cross at the vessel (which roots a key *and* anchors a transport endpoint) and at the **invite** (a person admitted socially rides the host's infra). They never nest.

**The delegation model lives whole elsewhere.** The SOCIAL axis *as an identity structure* — each scale a nameless `#has`-stack, the per-vessel key that bonds a vessel to its operator, the signed delegation edge that carries that bond up the scale — stands stated whole at <<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/lararium-identity#five-scale >>. That meme renders the **delegation chain** (`vessel-key → personaGroup → cabalGroup → …`); this meme adds the **orthogonal infra axis** and shows where the two cross, recognize, sync, and gate. The definitions below carry the topology, not the identity model — that one cites home.

<<~/ahu >>

<<~ ahu #the-relay-floor >>

## The Relay Floor

**Every lararium `#has {relay}` — always.** A lararium relays whether or not anyone else ever connects. The relay capability sits at the **floor** of the lararium stack, not beside it.

A bare **"relay"** names a lararium stripped to that one cap: no wiki, no read-bags, no hosted users — only `#has {transport-forward, leyline-peering}`. Still a lararium. The minimal member of the family.

The family **builds up by capability composition** — the `#has`-stack ontology, no subclassing, only added caps:

```text
lararium #has {relay}                              ← the floor · "a relay"
   + operator-sovereignty + wiki-bags + read
   + hosts users  ──────────────────────────────► home node lararium   (users = family)
                                                   QA-lab lararium      (users = teammates + many ephemeral testers)
   + ...                                           any composed surface the operator contracts
```

**Carriage, never sight.** The relay holds `#has-NOT {read}` · `#has-NOT {decrypt}`. The stream rides sealed — encrypted to the cabal/persona read-set (Keyhive), and the relay sits outside it. A lararium forwards your mana *because* it carries the relay floor; it cannot read a byte of what it carries. This single `#has-NOT` enacts the master cut: **FLOW ⊥ WHO**, made into an entity.

**The onion discipline (MUST).** A relay learns only `{next-hop, ciphertext}` — never plaintext, never the full path. Blindness rides the structure (source-routed layered encryption, the Tor rhyme #rhizome-rhymes), never a policy a node may relax.

<<~/ahu >>

<<~ ahu #infra-axis >>

## Infra Axis — Carriage and Reach

The FLOW axis answers *how far do my bytes travel, and over whose leylines* — never *who may read them*.

### lararium

The unit of operator infrastructure. `#has {relay}` always (the floor), plus whatever the operator composes atop it. A lararium runs one or more **vessels** (the runtime units: a node server or a browser tab — see <<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/open-vessel >>). The node vessel, persistent and clocked, enacts the relay; a browser-only lararium relays weakly or not at all (no standing transport endpoint).

A lararium relays at **two ranges, one intrinsic cap**:

- **Intrinsic** — a lararium carries its own users' streams (family, teammates, ephemeral testers). The always-on floor.
- **Nexus-extended** — operators who contract a nexus carry *each other's* users too. The gap-junction between lararia.

### nexusGroup

**≥2 operators contract a nexus.** The threshold sits at the **second sovereign**, never at a user: one operator with N users stays one lararium; a second operator relating crystallizes the nexus. *Two operators under one roof start to form a nexus.*

The contract grants **mutual carriage** — *we relay for each other, and for each other's invited users* — and `#has-NOT {read}` survives the contract intact: carriage extends, sight does not. A nexus contract **declares its kind (MUST)**: **settlement-free PEER** (reciprocal, equal carriage) or asymmetric **TRANSIT** (one lararium carries another's reach); forwarding policy follows the kind (the BGP valley-free rhyme #rhizome-rhymes). Beyond carriage, a nexus may **freely design its internal topology**: mesh, hub-and-spoke, or tiered. Neighborhood-scale lararia may host many relays serving home nodes along the streets; civic-scale lararia may scale that carriage or specialize it. The relay is the atom; the contract arranges the lattice. The DreamNet layer does not prescribe a nexus's internal topology — those decisions live in the nexus's own Automerge docs.

The shrine tiers name the fractal (Gaia → Elyncia): **Household** (home lararium) → **Crossroads** (neighborhood shrine, district relays — the IXP rhyme: a shared leyline-fabric, flat carriage, no per-mana toll) → **Temple** (civic shrine, city-scale carriage). Each tier carries the same relay cap at a wider radius.

The lattice **grows from local flow (SHOULD)** — busy leylines thicken, idle ones decay as the `ea` lease (the Physarum + stigmergy rhyme), one operator dial trading cost against fault-tolerance — never a top-down tree. And it **MUST-NOT** collapse into a single-root drainage where all mana drains up through the tiers to one civic root: that re-introduces a hub and a global-now (the watershed counter-rhyme #rhizome-rhymes). Tiers stay any-to-any across scales.

### DreamNet

The outermost reach. **≥2 nexuses.** No central server, no authority vessel. The DreamNet exists wherever vessels recognize each other's grammar — `lar:///` URI scheme, SharktoothSigil vocabulary, ABILITY_LADDER semantics, genesis artifact CID.

Some nexuses carry degraded connections (network partition, protocol fork). Some evolve oppositional constitutions — different charter values, different grant policies. The protocol stays legible across these boundaries because the **grammar** (not the data) stays shared.

The Amorphous Dreams Cabal holds **kahu** at this layer: guardian of the protocol corpus (`@lararium`, `@lares`, genesis artifact). The Cabal authors grammar revisions and signs them into the corpus bags. Vessels enforce their own founding proofs. No live command crosses the DreamNet layer from the Cabal to any operator. (See <<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/kahu >>.)

<<~/ahu >>

<<~ ahu #social-axis >>

## Social Axis — Delegation and Read

The WHO axis answers *who speaks for whom, and who may decrypt* — never *how far the bytes travel*.

### vessel-key

The root. Each vessel mints its **own** Ed25519 keypair, stored locally (disk `0o600` or WebCrypto), never placed in any synced Automerge doc. The key bonds the vessel to its operator through a **signed delegation edge** (the bond, not the key, makes the relationship). The full identity model stands at <<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/lararium-identity >>.

### personaGroup (veiled)

One operator, N device-vessels. The Keyhive `PersonaGroup` sentinel document proves which vessels speak for the same operator. The group faces the mesh **veiled** — anon by default, a first-class veil, not a deficit (see the veil doctrine at <<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/lararium-identity#the-veil >>). The **device-admit** ceremony transfers membership out-of-band (QR, file, direct message) — no server participates.

### cabalGroup (neighborhood shrine)

Multiple personaGroups who share a charter and a common ontology surface. The Keyhive `MeshCabal` sentinel document proves cabalGroup membership; cabal membership **scopes read** — it decides what a vessel may decrypt off the streams its relays deliver. A cabalGroup holds `cap=admin` on its own infrastructure bags and may author a local corpus extension — new meme namespaces, local sigil tiddlers, charter documents — without permission from the DreamNet layer. The charter lives in the cabal's own Automerge docs; it does not inherit the DreamNet Cabal's grammar, it **shares** it via CRDT propagation from the genesis artifact.

The "neighborhood shrine" framing: a place that carries local ritual, local knowledge, local aesthetic — while recognizing the shared pattern grammar that keeps it legible to neighboring shrines.

### user ≠ operator

A lararium hosts an **operator** (sovereign — founds the lararium, holds the founding key) plus N **users** who ride it (family, teammates, **ephemeral test users**). A user carries a veiled persona, a lease-decaying membership, and read scoped by the cabal — carried by the host's relay, but never sovereign over the lararium. Admission runs **admit-then-sever**: optimistic on contact, the edge cut (per-edge anergy) if it sours, never the peer banned wholesale.

<<~/ahu >>

<<~ ahu #the-seam >>

## The Seam — Where the Axes Cross

The two axes stay orthogonal, yet they touch at exactly two points:

1. **The vessel.** It roots a `vessel-key` (bottom of the SOCIAL axis) *and* anchors a transport endpoint (on the INFRA axis). One entity, two memberships.
2. **The invite.** An invited user gains **read** via cabal membership (SOCIAL) *and* **reach** via the inviter's nexus relays (INFRA). The invite couples the axes without fusing them — read and carriage arrive through separate gates.

The law of the seam: **membership decides read; the nexus decides reach.** A cabal's members may ride *any* nexus's leylines; carriage never implies sight, and sight never implies carriage.

<<~/ahu >>

<<~ ahu #capability-layer >>

## Capability Layer Across Both Axes

The ABILITY_LADDER (Axis 1 — ACCESS) governs all cross-vessel capability claims regardless of which topology axis the actors occupy. Its verbs mirror Keyhive's native Access enum 1:1:

```text
pull → read → edit → admin          (Keyhive-native)
```

Each rung names what an actor may do to a specific Keyhive bag doc. The distinction is *which bag* a capability applies to, not a separate ladder per scale. The relay cap stands **outside** this ladder: it grants carriage of sealed bytes, which the read-ladder never reaches.

| Axis | Scale | Actor | Bag scope | Min rung |
|---|---|---|---|---|
| SOCIAL | vessel | operator | own admin + wiki bags | write (own) |
| SOCIAL | personaGroup | second device | shared admin bag | sync |
| SOCIAL | cabalGroup | cabal member | cabal infrastructure bags | read |
| INFRA | relay floor | any lararium | *(sealed stream — no read)* | forward only |
| INFRA | nexusGroup | nexus-contracted vessel | nexus shared bags | sync or read |
| — | DreamNet corpus | Kahu (Cabal) | `@lararium`, `@lares`, genesis | admin |

<<~/ahu >>

<<~ ahu #local-first-law >>

## Local-First Law

Every write originates inside a sovereign vessel. No scale above the vessel may initiate a write on behalf of a vessel it does not own.

Sync propagates intent outward — vessel to personaGroup to cabalGroup, and carriage outward over the nexus leylines — but the causal author remains the originating vessel. CRDT merge resolves concurrent edits without a coordinator. No vessel holds a lock.

This law does not prevent coordination. It prevents *authority replacement*: no outer scale substitutes its intent for the inner vessel's intent. A relay carries the bytes; it never authors them.

<<~/ahu >>

<<~ ahu #grammar-as-shared-structure >>

## Grammar as Shared Structure

The DreamNet does not share data. It shares structure:

- `lar:///` URI scheme — every meme address points to the same universal namespace.
- SharktoothSigil vocabulary — the grammar rules that keep memetic-wikitext parseable across any vessel without runtime negotiation.
- ABILITY_LADDER — the shared vocabulary of capability semantics.
- Genesis artifact CID — the content-addressed root any vessel verifies from cold.
- mana/manao/manaoio fields — the trust-weight lattice for recipe resolution.

A vessel that imports a bag from a foreign cabalGroup parses its memes, verifies its capability proofs, and reasons about its recipe stack without asking permission. The grammar makes them legible to each other. Nothing else does — and a relay that carries the bag never needs the grammar at all, because it never reads.

<<~/ahu >>

<<~ ahu #gate-model >>

## The Gate Model — One Door per Axis

The old design agonized over a single admin-doc ingress gate (the "Path L" trilemma), because it assumed the connecting node **reads** what it receives. Once the relay carries blind, the one door splits into a **tiered gate — one door per concern**, and the trilemma dissolves:

- **Relay-forward gate** (INFRA · FLOW) — near-open. A relay forwards sealed bytes; it reads nothing, so it guards little. Admit by **lease and rate** (the carriage economy: veil + decaying lease + cost-to-vouch), never by read-credential. This is the door the browser-to-daemon dial should pass.
- **Read gate** (SOCIAL · WHO) — purely a key-set question. Keyhive `accessForDoc` on the cabal/persona read-set decides decryption. No network-layer DID-binding needed; the cryptography gates sight directly.
- **Admin-sync gate** (SOCIAL · WHO, admin scope) — the `PersonaGroup` sentinel: same-operator vessels only.

The earlier cap-wall — an anonymous vessel **DENIED** at the relay door — read as *correct denial of a fused gate*. Split the gate by axis and the denial moves to its right door: carriage opens, read stays sealed, admin stays operator-bound. Authority clears WHO before flow paces HOW-MUCH (`#transport-kernel`).

<<~ ward ? · "the relay-forward gate admits by lease + cost" — the crossing-cost calibration (siege-gate, Sybil-filter) stays an open design, carried with the veil/lease economy at lararium-identity#the-veil; the gate build follows this canon. >>

<<~/ahu >>

<<~ ahu #transport-kernel >>

## Transport — the gate model IS the kernel (kupono intent for the uplift)

When the mesh moves bytes between Lararia, it does NOT need a new transport invention — the **projection-nalu gate model already serves as a transport-protocol kernel** (`lar:///ha.ka.ba/@lararium/v0.1/api/projection-nalu#network-ring`). The uplift lifts that model one ring, the SINK moving local → peer → many:

- **accumulate** → reliable-ordered transport (the reserve serves as the retransmit buffer; CRDT-as-dedup = at-least-once + idempotent; vector clocks order across peers, no global now).
- **coalesce** → **gossip / epidemic** state-sync (newest-wins → last-write-wins, one→many, eventual consistency — the lossy drop stays correct at scale).
- **the servo** → congestion control (AIMD · Nagle self-clock · Net-DIM, already the idiom); the ring adds the one missing piece — **end-to-end backpressure** (the receiver's gate signals the sender).

**Two orthogonal planes — keep distinct (do not overcollapse at the ring):** the gates carry the **FLOW** plane (how much · how often); the cross-peer signed-invocation + lease+fence (#task-handoff) carries the **AUTHORITY** plane (who may · exactly-once). Authority clears WHO before flow paces HOW-MUCH. `role = physics ≠ uniformity`. The relay floor (#the-relay-floor) enacts this same split in the topology: it carries FLOW with zero AUTHORITY.

<<~/ahu >>

<<~ ahu #rhizome-rhymes >>

## Rhizome Rhymes — the territory agreeing with the map

The two-axis relay mesh did not arrive from nowhere; deep knowledge domains already solved its shape. A negentropy swarm dove the domains and the lattice held — territory independently agreeing with the map, and one place it usefully said *no*.

**The blind carriage (Tor onion routing).** A client negotiates a separate key with each relay; the cell wraps in layers, each relay peels exactly one and learns only its next hop. *Carriage never sight, realized as a discipline.* Divergence: Tor picks relays from a public directory with no contract (opposite to the contracted nexus), and its blindness buys path-anonymity where ours buys content-opacity — same mechanism, different threat.

**The contracted topology (BGP / AS peering).** Autonomous systems contract carriage in exactly two relationship-kinds — **settlement-free PEER** (reciprocal, equal) vs **TRANSIT** (asymmetric, paid reach) — meeting at **IXPs** (shared fabrics, flat one-time cost, no per-traffic toll). The contract-kind shapes forwarding directly (the valley-free rule). *The nexus contract's PEER/TRANSIT split and the IXP=civic-shrine read off this rhyme exactly.*

**The topology philosophy (Deleuze & Guattari, rhizome).** Connection + heterogeneity + multiplicity map to any-point-to-any-point contracted topology; **asignifying rupture** — *"shattered at a spot, it starts up again on an old line or a new one"* — names admit-then-sever + re-route-on-failure precisely; cartography ("map not tracing") rhymes with capability-composition over subclassing. The canon adopts **asignifying rupture** as the name for the sever-and-restart move. Honest divergence: pure rhizome resists nested tiers, so DreamNet runs a **rhizome that grows tubers** — saved only while any point still reaches any point across tiers (see the watershed guardrail).

**The grown mesh (Physarum, Tero et al. 2010).** Tubes thicken at high flow, decline at low (`dD/dt = f(|Q|) − D`), a single exponent **γ** tuning between cost-minimal trees (fragile) and looped meshes (resilient) — matching the Tokyo rail net from purely local rules, no global plan. *The relay-mesh grows from local flow-reinforcement, idle leylines decaying as the `ea` lease; one dial (γ) trades cost against fault-tolerance.*

**The lease-as-trace (stigmergy).** Trail strength reinforces on use, decays without — the same law as Physarum at another scale, and the same as Elyncia's *fed node hums, neglected one flickers*. Lease = pheromone.

**The non-kin broker (mycorrhiza).** Hyphae fuse on contact (anastomosis) and relay resources between non-kin plants, possibly taking a cut. *The relay serves non-kin users and MAY meter the carriage; fuse-on-contact is the cheap-leyline primitive.*

**The bounded coupling (gap junctions).** Connexons pass small molecules (< ~1200 Da) while cytoplasms stay distinct — a witness, not a new lever, for *couple-then-decouple-never-merge-interiors*.

**The counter-rhyme (river / watershed).** Horton-Strahler stream order runs a strict tree: all flow drains to one root outlet, no any-to-any, no loops — *precisely what DreamNet is NOT*, yet the shape the shrine-tier fractal could decay into. The river names the failure mode to watch.

**The three-plane geometry (Christaller central place theory).** Settlements nest by a constant **K** that differs by *function* over one settlement field — **K=3 marketing, K=4 transport, K=7 administrative** (the last with indivisible tributary areas). This independently re-derives the three-plane model: **FLOW/transport ↔ K=4 · WHO/membership ↔ K=3 · @daemon-authority ↔ K=7**, three geometries overlapping one shrine-field. <<~ confidence Synthesis 14/20 >> a doctrinal resonance that firms as the DreamNet grows; each plane SHOULD carry its own nesting geometry.

### Normative draws (ratified into this canon)

- **MUST** — a relay learns only `{next-hop, ciphertext}`, never plaintext nor the full path (the onion discipline #the-relay-floor).
- **MUST** — a nexus contract declares its kind: **settlement-free PEER** or asymmetric **TRANSIT**; forwarding policy follows the kind (#infra-axis).
- **MUST-NOT** — the shrine-tiers collapse into a single-root drainage tree; tiers stay any-to-any across scales (the watershed guardrail).
- **SHOULD** — the relay-mesh grow and decay from local flow (Physarum γ + stigmergy), never a top-down tree; expose one cost↔fault-tolerance dial.
- **Design numbers on the table:** live crossing-degree `~ ln(n)` (held canon, #network-edge) · Christaller **K=3/4/7** per plane · Tor **3-hop** · gap-junction selective gate **< ~1200 Da** · power-grid **N-1** fault floor (the mesh survives loss of any single relay).

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/api/projection-nalu#network-ring >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/api/network-edge >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/lararium-identity >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/kahu >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/capability >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/keyhive/keyhive-provider >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/genesis-doc >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/open-vessel >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/operator-peer >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/live-protocol >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/grammar-invariants >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
