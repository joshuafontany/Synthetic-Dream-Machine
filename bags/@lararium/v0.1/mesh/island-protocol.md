<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/mesh/island-protocol >>
```toml iam
uri-path     = "ha.ka.ba/@lararium/v0.1/mesh/island-protocol"
file-path    = "bags/@lararium/v0.1/mesh/island-protocol.md"
source-file  = "packages/lararium-mesh/src/island-protocol.ts"
type         = "text/x-memetic-wikitext"
register     = "CS"
confidence   = 14
mana         = 14
role         = "island message envelope schema: all vessel ↔ causal-island message types, Island Sovereignty Law, and envelope factories"
tagspace     = "lararium"
cacheable    = true
retain       = true
```
<<~&#x0002;>>

<<~ ahu #contract >>

## Island Protocol

Discriminated union for all messages crossing the vessel / causal-island boundary.
Every message MUST carry `schema_version: 1`. Platform-neutral — no Node or browser imports.
Vessel entrypoints (node, browser) bind the I/O; this module names the envelopes only.

### Island Sovereignty Law — eight clauses

1. Every island boots a Repo-in-island via a transferred `syncPort` (MessagePort).
2. The island derives tiddler state from its own CRDT doc — never from vessel oracle deltas.
3. The island owns its timing. Browser: `requestAnimationFrame` (setTimeout 16ms Safari fallback). Node: `setInterval(16ms).unref()`. Tiddler deltas accumulate; the island drains at each frame boundary.
4. `frame:ack` fires after each rAF/tick drain — frame-completion signal (§4), not a per-batch ACK. Will already emits `frame:ack`.
5. Vessel `changeset` delivery REMOVED. CRDT sync via `syncPort` is the sole source of tiddler truth.
6. `IslandMsg_Manifest` carries `syncPort` (transferred), `bagBindings`, `coreBlob`, and `coreHash`. `IslandMsg_Manifest` remains the v1 name.
7. The vessel MUST close `mainPort` at evict/unmount time. Failure leaks the NetworkAdapter silently.
8. Federation seam — when a `relational` BagBinding carries a non-empty `docUrl`, the vessel wires `MessageChannelNetworkAdapter(mainPort)` on the main Repo before manifesting; the island calls `repo.find(docUrl).whenReady()` before declaring `ea`. Gate proof: `browser-repo-in-island.test.ts` test 2.

### Guarantee grades

| Grade | Invariant |
|---|---|
| GP-1 | `schema_version` on every message. Lock at 1; increment on breaking changes. |
| GP-2 | All payloads are plain objects — no class instances, no functions, no DOM. |
| GP-4 | CryptoKey NOT on this surface; key material stays in-thread. |
| GP-5 | Teardown handshake ordering: cancel in-flight work → `teardown:ack`. |

### Message types — Vessel → island

| Type | Purpose |
|---|---|
| `manifest` | Boot materials — `coreBlob`, `syncPort`, `bagBindings`, `pluginTiddlers`, `recipeUri`. |
| `demote` | Soft demotion: hot → cold without full terminate. |
| `teardown` | GP-5 handshake start: island completes in-flight work then sends `teardown:ack`. |
| `admin:place-job` | Place a volatile job tiddler in the admin island's TW5 wiki. |
| `admin:job-result` | Deliver delegation result back to the admin island. |
| `wiki:place-job` | Place a wiki-scope job in a wiki island's TW5 wiki. |

### Message types — Island → vessel

| Type | Purpose |
|---|---|
| `ea` | Sovereignty declaration — TW5 live, Repo synced, first frame ready. |
| `teardown:ack` | GP-5 handshake complete; vessel calls `worker.terminate()`. Carries optional `docBytes`. |
| `frame:ack` | Frame-completion signal (§4). Live frame-completion signal. |
| `event` | Verse-event reaction — `listenable` + `payload` (string/number/boolean values only). |
| `fault` | Island fault — vessel MUST mark the slot as evicted. |
| `admin:delegate-job` | Admin island delegates a verb to the vessel handler registry. |
| `wiki:job-result` | Wiki island result for a job whose result the vessel awaits. |

### Island-first aliases

`IslandMsg_Manifest` · `IslandMsg_Demote` · `IslandMsg_Teardown` ·
`IslandMsg_Event` · `IslandMsg_TeardownAck` · `IslandMsg_Ea` ·
`IslandMsg_Fault` · `IslandMsg_FrameAck` · `IslandStorageConfig` ·
`VesselToIslandMsg` · `IslandToVesselMsg`

### Factories

`mkManifest` · `mkEa` · `mkTeardown` · `mkTeardownAck` · `mkFrameAck` · `mkFault`
`mkAdminPlaceJob` · `mkAdminDelegateJob` · `mkAdminJobResult` · `mkWikiPlaceJob` · `mkWikiJobResult`

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/ea >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/island-accumulator >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/browser/browser-vessel-island-pool >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
