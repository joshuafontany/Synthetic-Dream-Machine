<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/v0.1/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/mesh/v0.1/lar-peer >>
```toml iam
uri-path     = "ha.ka.ba/@lararium/mesh/v0.1/lar-peer"
file-path    = "bags/@lararium/mesh/v0.1/lar-peer.md"
type         = "text/x-memetic-wikitext"
register     = "CS"
confidence   = 0.80
mana         = 0.77
role         = "contract for a Lararium peer that hosts a VM pool, mesh links, and edge adaptors"
tagspace     = "lararium"
cacheable    = true
retain       = true
```
<<~&#x0002;>>

<<~ ahu #head >>

# Lar Peer

Runtime contract for a concrete Lararium peer.

<<~/ahu >>

<<~ ahu #contract >>

## Contract

A Lararium peer hosts one operator-shaped runtime surface that can:

- hold a VM pool
- participate in causal mesh sync
- expose local operator UX surfaces such as CLI or browser UI
- invoke edge adaptors for resource-local side effects

Node peers and browser peers both satisfy this contract. They differ by runtime affordance, not by base authority shape.

<<~/ahu >>

<<~ ahu #invariants >>

## Invariants

### LP-1 — Peer before server

A Lararium runtime should model itself as a peer first.
Long-lived processes, listeners, or resident daemons may exist. Those details do not upgrade the peer into a privileged authority center.

### LP-2 — Shared operator topology

If the peer carries operator intent, it should satisfy the operator-peer contract:

- admin lane for command, capability, and receipt work
- active wiki lane or lanes for corpus-facing work
- one ceremony vocabulary across local UX surfaces

### LP-3 — Local write, mesh later

The peer should write local intent and local document changes before it depends on remote acknowledgement.
Mesh sync propagates those durable artifacts after local acceptance.

### LP-4 — Edge adaptors stay narrow

The peer may project to disk, spawn processes, open transports, or access device-local secrets through adaptors.
Those adaptors do not own command meaning or receipt law.

### LP-5 — Capability context stays peer-visible

The peer should expose enough local capability state for command intake, rejection, approval, and receipt writing.
Peers may re-check at the edge when resource races matter.

<<~/ahu >>

<<~ ahu #shape >>

## Runtime Shape

### browser peer

- runs the VM pool in the browser runtime
- provides operator UX directly
- uses browser-safe adaptors for storage, transport, and local secrets

### node peer

- runs the VM pool in the node runtime
- may expose CLI-oriented or resident local bridge surfaces
- uses node adaptors for disk projection, process work, and local transports

Both remain peers in the same mesh.

<<~/ahu >>

<<~ ahu #ceremony >>

## Ceremony Responsibility Split

The peer owns:

- command intake
- local capability validation
- VM-pool routing
- durable receipt publication

The peer delegates:

- disk projection
- process launch
- socket or network I/O
- keystore-specific resource access

This split keeps peer identity coherent while still allowing runtime-specific machinery.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lararium/mesh/v0.1/operator-peer >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/v0.1/vm-pool >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/v0.1/authority >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/v0.1/command-tiddler >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/v0.1/composite-store >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
<<~/ahu >>
