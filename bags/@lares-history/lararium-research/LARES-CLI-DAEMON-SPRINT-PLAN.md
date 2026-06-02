# Lares CLI-Daemon Sprint Plan

> Date: 2026-05-18
> Branch: feature/lararium-node-4
> Status: approved architecture plan; ready for staged implementation
> Scope: local CLI/daemon intent surface, TW5 VM command runtime, operator-device federation boundary

## North Star

Lares keeps authority, intent, execution, and receipts inside the local-first mesh model.
The CLI authors intent. The local daemon carries authority state, sync policy, and long-running side effects. The TW5 VM pool holds command records and receipt records whenever the work can stay inside that pool. Federated peers exchange authority-first causal state, not RPC calls.

## Settled Decisions

### 1. Records, not RPC

Lares uses command tiddlers as intent records and receipt tiddlers as outcome records.
Each record flows through the admin surface as a local-first artifact. Temporary records remain acceptable when the flow only needs short-lived coordination, but the model stays record-shaped throughout.

### 2. `id` law

Every system `id` uses the `lar:` URI scheme.
That rule covers command ids, receipt ids, audience ids, principal ids, session artifact ids, storage artifact ids, and any other first-class record ids.

### 3. `lar:` locality law

Hostful `lar:` URIs identify live session artifacts.
Hostless `lar:` URIs identify hot, warm, or cold storage artifacts, starting with on-disk projections.

Examples:

- hostless stable storage artifact: `lar:///ha.ka.ba/@lares/commands/promote/2026-05-18/...`
- hostful live session artifact: `lar://node.alpha.local/ha.ka.ba/@sessions/live/...`

### 4. tagspace law

Lares keeps two root tagspaces, both following the what.three.words pattern:

- `lar:///ha.ka.ba/*` for stable tagspace
- `lar:///haWord.kaWord.baWord/*` for unstable tagspace

Each word participates in HA / KA / BA ontology measurement. Stable roots carry canonical contracts. Unstable roots carry hot experiments, session-local overlays, or volatile projections.

### 5. TW5 VM primacy

If command authoring, validation, routing, execution, or receipt projection can run inside the TW5 VM pool, Lares keeps that logic there.
TypeScript remains acceptable when it compiles into TW5-native JS tiddlers or when the task cannot run inside the TW5 VM pool.

### 6. bridge choice

Default local CLI/daemon bridge: `stdio`.

`stdio` best matches the pono intent because it keeps the default path local, explicit, least-ambient, and spawn-scoped. That choice avoids a standing port, avoids a socket namespace as the first assumption, and keeps the ceremony close to the operator action that triggered it.

Unix socket support can follow as the resident-daemon upgrade path for:

- multi-command sessions
- multi-client operator tooling
- shell completions or rich local dashboards
- fast reconnect without daemon respawn

WebSocket belongs on a different boundary: operator-device ingress onto the admin surface and future peer-facing sync surfaces. WebSocket does not fit as the default local CLI bridge.

## Runtime Shape

```text
lares CLI
  -> writes command tiddler record intent
  -> sends it through stdio to the local daemon or to a TW5-hosted local bridge
  -> local daemon validates authority context
  -> TW5 VM pool routes and executes what it can
  -> daemon performs non-VM side effects when needed
  -> TW5 VM pool writes receipt tiddler records
  -> peer sync carries authority graph first, then visible docs, then content deltas
```

## Record Contracts

### Command tiddler contract

Command records should carry these minimum fields:

- `id`: `lar:` URI
- `kind`: command kind path such as `/canon/promote` or `/admin/revoke`
- `issuer`: `lar:` URI for the issuing principal or operator device
- `audience`: `lar:` URI for the intended executor surface
- `session`: optional hostful `lar:` URI when the command belongs to a live session
- `target`: zero or more `lar:` URI targets
- `nonce`: replay guard
- `nbf`: optional start time
- `exp`: optional expiry time
- `epoch`: revocation generation when authority-sensitive
- `offset`: causal position when ordering matters
- `proofs`: proof references or serialized proof payloads
- `status`: draft, queued, running, applied, rejected, superseded
- `text`: human-legible operator intent or note

### Receipt tiddler contract

Receipt records should carry these minimum fields:

- `id`: `lar:` URI
- `command`: originating command `lar:` URI
- `kind`: receipt kind path such as `/canon/promote/receipt`
- `issuer`: `lar:` URI for the executor surface
- `audience`: `lar:` URI for the operator or observing surface
- `result`: accepted, rejected, applied, partial, deferred
- `reason`: short machine-facing reason code
- `details`: operator-facing explanation
- `artifacts`: zero or more output `lar:` URIs
- `epoch`: authority generation used at decision time
- `offset`: causal position of the receipt

## Sprint Plan

### Sprint A — URI and record law

Goal: land one canonical contract for `lar:` ids, stable vs unstable roots, hostful vs hostless use, command tiddlers, and receipt tiddlers.

Tasks:

- add shared type and filter helpers for `lar:` id parsing and normalization
- define stable titles for command and receipt templates in the TW5 plugin
- add fixture examples for hostful and hostless ids
- update docs and tests that still treat ids as non-`lar:` strings

Exit criteria:

- every new command/receipt path uses `lar:` ids
- tests cover stable and unstable roots
- docs stop describing command ids as ad hoc strings or UUID-only records

### Sprint B — TW5 VM command runtime

Goal: move command authoring, routing, and receipt writing into the TW5 VM pool wherever the VM can carry the work.

Tasks:

- create command tiddler templates and receipt tiddler templates in `@lararium/tw5`
- route command records through wiki actions, widgets, or procedures rather than direct ESM calls
- keep receipt writing inside the VM for VM-local work
- reserve daemon hooks for filesystem, process, network, and capability-store side effects only

Exit criteria:

- promote, where, and adjacent operator ceremonies author records through the VM path
- at least one end-to-end flow writes both a command tiddler and a receipt tiddler without direct node-side handler logic

### Sprint C — local bridge abstraction

Goal: ship `stdio` as the default local bridge without hard-coding transport semantics into command logic.

Tasks:

- define one bridge envelope for CLI-to-daemon submission and daemon-to-CLI status streaming
- implement `stdio` transport first
- define Unix socket transport behind the same envelope and interface
- keep WebSocket out of the default local CLI path

Exit criteria:

- CLI can submit a command record over `stdio`
- daemon can stream status updates and final receipt refs back over the same bridge
- transport swap does not change command or receipt schema

### Sprint D — capability execution gate

Goal: let Keyhive-backed authority decide whether execution may proceed, while leaving command and receipt records inside the admin surface.

Tasks:

- verify command proofs against the local capability provider boundary
- record authority failures as receipt tiddlers, not thrown-only terminal errors
- keep richer Lararium ability semantics above the current binary Keyhive gate
- add admin-surface ingress checks for operator-owned devices

Exit criteria:

- rejected authority writes a durable receipt record
- operator-device ingress requires infrastructure-grade proof
- room peers fail closed on admin-surface entry

### Sprint E — authority-first peer sync

Goal: align peer sync with the command/receipt model without sliding back into a request/response server posture.

Tasks:

- sync authority graph before command execution on remote effects
- sync visible-doc manifests before content deltas
- treat receipts as causal artifacts that flow through the same mesh
- wrap Automerge Repo network, storage, and ephemeral messaging surfaces behind local interfaces

Exit criteria:

- one multi-peer test demonstrates authority-first ordering
- remote peers accept or reject commands based on current authority and emit receipts into the mesh

### Sprint F — retire old CLI/node assumptions

Goal: remove the remaining web2-smell assumptions from the CLI and daemon source.

Tasks:

- remove direct expectations that the node process exposes a `promote` RPC-style handler
- route promote through command/receipt records
- remove or quarantine stale dist-era behavior that points back to the old handler model
- update tests to assert on records and receipts rather than handler return values

Exit criteria:

- `promote` flow no longer depends on a source-side node handler registration named `promote`
- test harnesses assert against command and receipt artifacts

## First Implementation Slice

The first code slice should stay narrow:

1. define command and receipt tiddler shapes in the TW5 package
2. update CLI `promote` to author a command record instead of expecting a direct handler result
3. let the daemon or TW5 VM write a receipt record for accept/reject
4. update the promote flow test to assert on those records

That slice keeps the architecture honest and gives the current failing promote path a concrete replacement target.

## Transport Guidance

Choose `stdio` first.

Reasons:

- `stdio` keeps the default trust surface smallest
- `stdio` fits spawn-local operator ceremony cleanly
- `stdio` avoids ambient local network assumptions
- `stdio` preserves a simple fallback path for sandboxed or constrained environments

Choose Unix socket second when operator ergonomics need a resident daemon.

Choose WebSocket only where browser participation or operator-device federation actually needs it.

## Do Not Re-Decide

- command tiddlers and receipt tiddlers stay the coordination model
- the admin surface stays operator-only
- Keyhive remains the capability substrate
- UCAN contributes envelope shape and vocabulary, not the substrate
- TW5 VM primacy holds
- every first-class record id uses `lar:`
