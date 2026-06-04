<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/mesh/dreamnet-architecture >>
```toml iam
uri-path     = "ha.ka.ba/@lararium/v0.1/mesh/dreamnet-architecture"
file-path    = "bags/@lararium/v0.1/mesh/dreamnet-architecture.md"
type         = "text/x-memetic-wikitext"
register     = "CS"
confidence   = 16
mana         = 17
manao        = 16
manaoio      = 15
role         = "DreamNet five-layer topology: vessel → personGroup → cabalGroup → nexusGroup → DreamNet"
tagspace     = "lararium"
cacheable    = true
retain       = true
```
<<~&#x0002; >>

# DreamNet Architecture

A hundred thousand Lararia. Each one a different operator. Each one a different charter,
different ontology, different pono surface. Somehow not isolated — they form a mesh.
Not by sharing data (local-first means local-first). By sharing **structure**: the same `lar:///` scheme, the same mana/manao/manaoio grammar, the same
mempalace wing patterns — so
the gardens can recognize each other even when they cannot read each other.

**A protocol, not a platform. A grammar, not a database.**

<<~ ahu #five-layer-topology >>

## Five-Layer Topology

```text
┌─────────────────────────────────────────────────────────────┐
│  DreamNet                                                   │
│  multiple Nexuses; some degraded or oppositional            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  NexusGroup                                            │ │
│  │  multiple cabals + independent operators in mesh       │ │
│  │  ┌───────────────────────────────────────────────────┐ │ │
│  │  │  CabalGroup  (neighborhood shrine)                │ │ │
│  │  │  shared charter, shared ontology surface          │ │ │
│  │  │  ┌──────────────────────────────────────────────┐ │ │ │
│  │  │  │  PersonGroup                                 │ │ │ │
│  │  │  │  one operator, N device-vessels              │ │ │ │
│  │  │  │  ┌─────────────────────────────────────────┐ │ │ │ │
│  │  │  │  │  device-vessel                          │ │ │ │ │
│  │  │  │  │  node (server) or browser tab           │ │ │ │ │
│  │  │  │  │  sovereign; authors local causal state  │ │ │ │ │
│  │  │  │  └─────────────────────────────────────────┘ │ │ │ │
│  │  │  └──────────────────────────────────────────────┘ │ │ │
│  │  └───────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

Each layer nests inside the next. No layer commands the one below it. The inner layers
carry sovereignty; the outer layers carry *recognition* — shared grammar, shared
capability proof chains, shared meme-graph reachability.

<<~/ahu >>

<<~ ahu #layer-definitions >>

## Layer Definitions

### device-vessel

The unit of runtime sovereignty. One process: either a node server or a browser tab.
Holds a TW5 admin island (Worker), a Repo (Automerge CRDT sync), and an operator
keypair stored locally (disk or IDB). Authors its own causal state first; syncs
over the mesh second.

A vessel writes local intent before any edge work. Capability proof checks happen
on the invoking vessel. No vessel obeys a live command from any external authority.

Two vessel budgets share one operator-vessel contract:
- **node vessel** — long-running server; persistent disk; WebSocket sync; strong clock.
- **browser vessel** — tab lifetime; IndexedDB; WebCrypto keypair.

Neither budget holds privileged authority over the other. Node is not the truth holder.
Browser is not the lightweight client. They run the same founding ceremony, the same
three-gate lattice, the same capability layer.

### personGroup

One operator, N device-vessels. The Keyhive `PersonGroup` sentinel document proves
which vessels belong to the same human operator. Device-admit ceremony transfers
membership out-of-band (QR code, file, direct message) — no server participates.

A personGroup's vessels share access to the operator's wiki bags. They sync admin
state only among themselves by default. The operator decides which vessels to admit.

### cabalGroup (neighborhood shrine)

Multiple personGroups who share a charter and a common ontology surface. The
Keyhive `MeshCabal` sentinel document proves cabalGroup membership. Gate C.

A cabalGroup holds `cap=admin` on its own infrastructure bags. It may author a local
corpus extension — new meme namespaces, local sigil tiddlers, charter documents —
without any permission from the DreamNet layer. The cabal's charter lives in its
own Automerge docs; it does not inherit the DreamNet Cabal's grammar, it *shares* it
via CRDT propagation from the genesis artifact.

The "neighborhood shrine" framing: a cabalGroup is a place that carries local ritual,
local knowledge, local aesthetic — while recognizing the shared pattern grammar
that makes it legible to neighboring shrines.

### nexusGroup

Multiple cabalGroups plus independent operators who choose to federate in a mesh.
Not a legal entity; not a platform. A cluster of vessels that sync infrastructure
state among themselves by mutual `cap=admin` grant.

A nexusGroup may define a shared genesis artifact variant, a shared bag namespace
extension, or a shared operator-peer routing layer. These decisions live in the
nexusGroup's own Automerge docs. The DreamNet layer does not prescribe nexusGroup
internal governance.

Multiple nexusGroups may form the DreamNet. Some will carry degraded connections
(network partition, protocol fork). Some may evolve oppositional constitutions —
different charter values, different capability grant policies. The protocol remains
legible across these boundaries because the grammar (not the data) stays shared.

### DreamNet

The outermost layer. Multiple nexusGroups. No central server. No authority vessel.
The DreamNet exists wherever vessels recognize each other's grammar — `lar:///` URI
scheme, SharktoothSigil vocabulary, ABILITY_LADDER semantics, genesis artifact CID.

The Amorphous Dreams Cabal holds **kahu** at this layer: guardian of the protocol
corpus (`@lararium`, `@lares`, genesis artifact). The Cabal authors grammar revisions
and signs them into the corpus bags. Vessels enforce their own founding proofs. No
live command crosses the DreamNet layer from the Cabal to any operator.

<<~/ahu >>

<<~ ahu #capability-layer >>

## Capability Layer Across the Topology

The ABILITY_LADDER (Axis 1 — ACCESS) governs all cross-vessel capability claims
regardless of which layer the actors occupy. Its verbs are a 1:1 mirror of Keyhive's
native Access enum:

```text
pull → read → edit → admin          (Keyhive-native)
```

Each rung names what an actor may do to a specific Keyhive bag doc. The same ladder
covers all actors at all topology layers. The distinction is *which bag* a capability
applies to, not a separate ladder per layer.

Key grants by layer:

| Layer | Actor | Typical bag scope | Minimum rung |
|---|---|---|---|
| device-vessel | operator | own admin + wiki bags | write (own bags) |
| personGroup | second device | shared admin bag | sync |
| cabalGroup | cabal member | cabal infrastructure bags | read |
| nexusGroup | federated vessel | nexus shared bags | sync or read |
| DreamNet corpus | Kahu (Cabal) | `@lararium`, `@lares`, genesis | admin |

<<~/ahu >>

<<~ ahu #local-first-law >>

## Local-First Law

Every write originates inside a sovereign vessel. No layer above the device-vessel
may initiate a write on behalf of a vessel it does not own.

Sync propagates intent outward — from vessel to personGroup to cabalGroup to nexus —
but the causal author remains the originating vessel. CRDT merge resolves concurrent
edits without a coordinator. No vessel holds a lock.

This law does not prevent coordination. It prevents *authority replacement*: no outer
layer may substitute its intent for the inner vessel's intent.

<<~/ahu >>

<<~ ahu #grammar-as-shared-structure >>

## Grammar as Shared Structure

The DreamNet does not share data. It shares structure:

- `lar:///` URI scheme — every meme address points to the same universal namespace.
- SharktoothSigil vocabulary — the grammar rules that make memetic-wikitext parseable
  across any vessel without runtime negotiation.
- ABILITY_LADDER — the shared vocabulary of capability semantics.
- Genesis artifact CID — the content-addressed root that any vessel can verify from cold.
- mana/manao/manaoio fields — the trust-weight lattice for recipe resolution.

A vessel that imports a bag from a foreign cabalGroup can parse its memes, verify its
capability proofs, and reason about its recipe stack without asking for permission.
The grammar makes them legible to each other. Nothing else does.

<<~/ahu >>

<<~ ahu #path-l-gate >>

## Path L — Admin-Doc Ingress Gate (open design question)

The admin-doc WebSocket ingress gate needs a Keyhive-backed mechanism to reject
non-operator vessels from syncing admin state. Three candidate approaches:

**A — PersonGroup sentinel membership check**: at WebSocket upgrade, verify the
connecting peer's Individual key appears as a member of a known PersonGroup that
carries `cap=admin` on the admin doc. Requires a peerId ↔ DID binding at the
network layer.

**B — Keyhive `accessForDoc`**: query the Keyhive engine for the connecting peer's
access level on the admin bag doc directly. Depends on `@keyhive/keyhive` API
surface being stable enough to call at sync time.

**C — Defer WebSocket gate; gate only at job-dispatch layer**: the admin doc syncs
to any vessel; capability enforcement happens when jobs arrive. Lower network-layer
complexity; relies on job-dispatch rejection to prevent unauthorized writes.

Design decision pending. Path L is Priority 2 on the active roadmap.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/kahu >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/capability >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/keyhive/keyhive-provider >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/genesis-doc >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/open-vessel >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/operator-peer >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/live-protocol >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/grammar-invariants >>

<<~/ahu >>

<<~&#x0003; >>

<<~&#x0004; -> ? >>
