<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/v0.1/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/mesh/v0.1/vm-pool >>
```toml iam
uri-path     = "ha.ka.ba/@lararium/mesh/v0.1/vm-pool"
file-path    = "bags/@lararium/mesh/v0.1/vm-pool.md"
type         = "text/x-memetic-wikitext"
register     = "CS"
confidence   = 0.78
mana         = 0.76
role         = "contract for VM lane topology, residency, and handoff inside an operator peer"
tagspace     = "lararium"
cacheable    = true
retain       = true
```
<<~&#x0002;>>

<<~ ahu #head >>

# VM Pool

Topology and residency law for the TW5 VMs that an operator peer keeps available.

<<~/ahu >>

<<~ ahu #contract >>

## Contract

The VM pool gives an operator peer a stable way to host:

- one pinned admin VM lane for operator-private state and ceremonies
- zero or more active wiki VM lanes for corpus-facing work
- cold or warm VM candidates that may load or unload without changing ceremony meaning

The VM pool owns lane lifecycle, residency policy, and handoff between lanes. The VM pool does not redefine ceremony semantics.

<<~/ahu >>

<<~ ahu #invariants >>

## Invariants

### VP-1 — Admin lane always exists

An operator peer keeps one admin VM lane available for command intake, capability materials, durable receipts, and operator-only state.
The pool may restart that VM. The pool may not erase the lane from the peer contract.

### VP-2 — Active wiki lanes stay explicit

Each active wiki VM lane maps to a concrete wiki context.
The pool may pin one or several wiki lanes according to runtime budget.
The pool should not hide wiki selection inside ambient globals.

### VP-3 — Residency changes do not change semantics

Cold, warm, and pinned residency affect latency and memory use.
Residency changes do not change command meaning, receipt shape, or capability law.

### VP-4 — Ceremony work routes to the smallest fitting lane

Command authoring and durable receipt writing route through the admin lane.
Corpus-facing planning, rendering, and document mutation route through the relevant wiki lane.
If a ceremony needs more than one lane, the pool coordinates the handoff.

### VP-5 — Edge work stays outside the pool

The VM pool may request edge adaptors to perform disk, process, keystore, or network work.
The pool does not absorb those side effects into VM identity.

<<~/ahu >>

<<~ ahu #residency >>

## Residency Modes

### pinned

Use for the admin lane and any wiki lane that the operator currently inhabits.

### warm

Use for recently active wiki lanes that the peer expects to revisit soon.

### cold

Use for wiki lanes that the peer can reopen from canonical state when needed.

These modes describe budget, not authority.

<<~/ahu >>

<<~ ahu #handoff >>

## Lane Handoff

1. The admin lane receives or authors a command record.
2. The admin lane checks local capability context.
3. The pool resolves which wiki lane should carry planning or mutation.
4. The target wiki lane performs VM-local work.
5. The pool returns outcomes to the admin lane for durable receipt writing.

This handoff keeps one ceremony path while still letting different lanes own different work.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lararium/mesh/v0.1/operator-peer >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/v0.1/lar-peer >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/v0.1/authority >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/v0.1/command-tiddler >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
