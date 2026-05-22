<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/v0.1/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/mesh/v0.1/open-vessel >>
```toml iam
uri-path     = "ha.ka.ba/@lararium/mesh/v0.1/open-vessel"
file-path    = "bags/@lararium/mesh/v0.1/open-vessel.md"
type         = "text/x-memetic-wikitext"
register     = "CS"
confidence   = 0.81
mana         = 0.79
role         = "contract for the shared browser/node open-vessel VM pool and ceremony path"
tagspace     = "lararium"
cacheable    = true
retain       = true
```
<<~&#x0002;>>

<<~ ahu #head >>

# Open Vessel

Shared VM-pool law for any vessel that carries operator intent.

<<~/ahu >>

<<~ ahu #contract >>

## Contract

An open vessel carries the same base shape on every runtime surface:

- one admin VM lane for operator-private command, capability, and receipt work
- zero or more active wiki VM lanes for corpus-facing authoring and reading
- one ceremony path that the CLI, browser UX, and other local operator tools all invoke

Browser vessels and node vessels share this contract. Runtime budgets, residency, and side effects may differ. Base architecture does not.

<<~/ahu >>

<<~ ahu #invariants >>

## Invariants

### OP-1 — Shared VM topology

Every open vessel loads an admin VM and may load active wiki VMs beside it.
The admin VM owns job authoring, capability materials, durable receipts, and operator-only state.
Active wiki VMs own local reading, editing, rendering, and ceremony views over the wiki corpus.

### OP-2 — One ceremony, many UX surfaces

The CLI and browser app invoke the same ceremony contracts.
UX layers may differ in presentation and local affordance. They do not fork job semantics.

### OP-3 — Local-first capability gate

The invoking vessel checks proofs and capability context before it asks for side effects.
Any executor that touches a resource boundary may re-check the same proof chain at execution time.
This double-check closes resource-local races without turning any single vessel into a standing authority center.

### OP-4 — VM-first execution

If a ceremony can run inside the TW5 VM pool, the vessel keeps that work there.
Code outside the VM handles only resource-local work such as disk projection, process launch, device secret access, and ambient network I/O.

### OP-5 — Mesh-shaped outcomes

Commands, receipts, and resulting document changes flow through the same causal mesh.
Vessels exchange durable artifacts, not privileged RPC verdicts.

<<~/ahu >>

<<~ ahu #flow >>

## Ceremony Flow

1. The operator uses CLI or browser UX to author a job tiddler.
2. The local open vessel writes that command through its admin VM lane.
3. The vessel validates capability context locally.
4. The vessel asks the relevant VM lane to plan and apply document-native work.
5. A resource-local adaptor performs any outside-VM side effect that the ceremony requires.
6. The vessel writes a durable receipt tiddler through the admin VM lane.
7. Mesh sync carries command, receipt, and content deltas to other vessels.

<<~/ahu >>

<<~ ahu #tw5-vs-edge >>

## TW5 VM Space vs Edge Space

### TW5 VM space

- job authoring
- ceremony planning
- tiddler validation
- receipt authoring
- active wiki rendering
- local operator views over pending and completed ceremonies

### edge space outside the VM

- disk projection
- process spawn
- socket or transport plumbing
- device keystore access
- ambient network I/O

The edge may carry out work. The edge does not own ceremony meaning.

<<~/ahu >>

<<~ ahu #example >>

## Example

`lares promote lar:///ha.ka.ba/docs/lares/the-lares-protocols --to @lares`

The CLI and browser command palette both author the same job record. The admin VM validates local authority context. The active wiki VM plans the promote copy and tombstone set. A node-backed adaptor may project the resulting canonical bag change to disk. The admin VM writes the receipt.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lararium/mesh/v0.1/lar-vessel >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/v0.1/vm-pool >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/v0.1/authority >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/v0.1/job-tiddler >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/v0.1/resolver >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>