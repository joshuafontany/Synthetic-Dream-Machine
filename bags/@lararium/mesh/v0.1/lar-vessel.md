<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/v0.1/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/mesh/v0.1/lar-vessel >>
```toml iam
uri-path     = "ha.ka.ba/@lararium/mesh/v0.1/lar-vessel"
file-path    = "bags/@lararium/mesh/v0.1/lar-vessel.md"
type         = "text/x-memetic-wikitext"
register     = "CS"
confidence   = 0.80
mana         = 0.77
role         = "contract for a Lararium vessel that hosts a VM pool, mesh links, and edge adaptors"
tagspace     = "lararium"
cacheable    = true
retain       = true
```
<<~&#x0002;>>

<<~ ahu #head >>

# Lar Vessel

Runtime contract for a concrete Lararium vessel.

<<~/ahu >>

<<~ ahu #contract >>

## Vocabulary

The word *peer* names an Automerge sync participant — a `Repo` instance in the transport layer.
The word *vessel* names the Lararium identity-and-runtime unit that runs on top of that layer.
Both appear in this codebase at their respective layers.

## Contract

A Lararium vessel hosts one operator-shaped runtime surface that can:

- hold a VM pool
- participate in causal mesh sync
- expose local operator UX surfaces such as CLI or browser UI
- invoke edge adaptors for resource-local side effects

Node vessels and browser vessels both satisfy this contract. They differ by runtime affordance, not by base authority shape.

<<~/ahu >>

<<~ ahu #invariants >>

## Invariants

### LP-1 — Vessel before server

A Lararium vessel models itself as a participant in a causal mesh — not a server that clients connect to.
Long-lived processes, listeners, or resident daemons may exist. Those details do not upgrade the vessel into a privileged authority center.

### LP-2 — Shared operator topology

If the vessel carries operator intent, it should satisfy the operator-vessel contract:

- admin lane for command, capability, and receipt work
- active wiki lane or lanes for corpus-facing work
- one ceremony vocabulary across local UX surfaces

### LP-3 — Local write, mesh later

The vessel should write local intent and local document changes before it depends on remote acknowledgement.
Mesh sync propagates those durable artifacts after local acceptance.

### LP-4 — Edge adaptors stay narrow

The vessel may project to disk, spawn processes, open transports, or access device-local secrets through adaptors.
Those adaptors do not own job meaning or receipt law.

### LP-5 — Capability context stays vessel-visible

The vessel should expose enough local capability state for job intake, rejection, approval, and receipt writing.
Vessels may re-check at the edge when resource races matter.

<<~/ahu >>

<<~ ahu #shape >>

## Runtime Shape

### browser vessel

- runs the VM pool in the browser runtime
- provides operator UX directly
- uses browser-safe adaptors for storage, transport, and local secrets

### node vessel

- runs the VM pool in the node runtime
- may expose CLI-oriented or resident local bridge surfaces
- uses node adaptors for disk projection, process work, and local transports

Both remain participants in the same causal mesh.

<<~/ahu >>

<<~ ahu #ceremony >>

## Ceremony Responsibility Split

The vessel owns:

- job intake
- local capability validation
- VM-pool routing
- durable receipt publication

The vessel delegates:

- disk projection
- process launch
- socket or network I/O
- keystore-specific resource access

This split keeps vessel identity coherent while still allowing runtime-specific machinery.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lararium/mesh/v0.1/operator-vessel >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/v0.1/vm-pool >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/v0.1/authority >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/v0.1/job-tiddler >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/v0.1/composite-store >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
<<~/ahu >>
