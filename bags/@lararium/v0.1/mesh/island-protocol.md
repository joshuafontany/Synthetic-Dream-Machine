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
role         = "island message envelope schema: all main ↔ wiki-Worker message types, Worker Sovereignty Law, and envelope factories"
tagspace     = "lararium"
cacheable    = true
retain       = true
```
<<~&#x0002;>>

<<~ ahu #contract >>

## Island Protocol

Discriminated union for all messages crossing the main-thread / wiki-Worker boundary.
Every message MUST carry `schema_version: 1`. Platform-neutral — no Node or browser imports.
Vessel entrypoints (node, browser) bind the I/O; this module names the envelopes only.

### Worker Sovereignty Law — eight clauses

1. Every Worker boots a Repo-in-Worker via a transferred `syncPort` (MessagePort).
2. The Worker derives tiddler state from its own CRDT doc — never from main-thread oracle deltas.
3. The Worker owns its timing. Browser: `requestAnimationFrame` (setTimeout 16ms Safari fallback). Node: `setInterval(16ms).unref()`. Tiddler deltas accumulate; the Worker drains at each frame boundary.
4. `changeset:ack` fires after each rAF/tick drain — frame-completion signal (§4), not a per-batch ACK. Will rename to `frame:ack` in a future schema_version bump.
5. Main-thread `changeset` delivery REMOVED. CRDT sync via `syncPort` is the sole source of tiddler truth.
6. `WorkerMsg_Manifest` carries `syncPort` (transferred), `bagBindings`, `coreBlob`, and `coreHash`.
7. The vessel MUST close `mainPort` at evict/unmount time. Failure leaks the NetworkAdapter silently.
8. Federation seam — when a `relational` BagBinding carries a non-empty `docUrl`, the vessel wires `MessageChannelNetworkAdapter(mainPort)` on the main Repo before manifesting; the Worker calls `repo.find(docUrl).whenReady()` before declaring `ea`. Gate proof: `browser-repo-in-worker.test.ts` test 2.

### Guarantee grades

| Grade | Invariant |
|---|---|
| GP-1 | `schema_version` on every message. Lock at 1; increment on breaking changes. |
| GP-2 | All payloads are plain objects — no class instances, no functions, no DOM. |
| GP-4 | CryptoKey NOT on this surface; key material stays in-thread. |
| GP-5 | Teardown handshake ordering: cancel in-flight work → `teardown:ack`. |

### Message types — Main → Worker

| Type | Purpose |
|---|---|
| `manifest` | Boot materials — `coreBlob`, `syncPort`, `bagBindings`, `pluginTiddlers`, `recipeUri`. |
| `demote` | Soft demotion: hot → cold without full terminate. |
| `teardown` | GP-5 handshake start: Worker completes in-flight work then sends `teardown:ack`. |
| `admin:place-job` | Place a volatile job tiddler in the admin island's TW5 wiki. |
| `admin:job-result` | Deliver delegation result back to the admin Worker. |
| `wiki:place-job` | Place a wiki-scope job in a wiki Worker's TW5 wiki. |

### Message types — Worker → Main

| Type | Purpose |
|---|---|
| `ea` | Sovereignty declaration — TW5 live, Repo synced, first frame ready. |
| `teardown:ack` | GP-5 handshake complete; main calls `worker.terminate()`. Carries optional `docBytes`. |
| `changeset:ack` | Frame-completion signal (§4). Name reflects GP-3 origin; future: `frame:ack`. |
| `event` | Verse-event reaction — `listenable` + `payload` (string/number/boolean values only). |
| `fault` | Worker fault — main MUST mark the slot as evicted. |
| `admin:delegate-job` | Admin Worker delegates a verb to the main-thread handler registry. |
| `wiki:job-result` | Wiki Worker result for a job whose result the main thread awaits. |

### Factories

`mkManifest` · `mkEa` · `mkTeardown` · `mkTeardownAck` · `mkChangesetAck` · `mkFault`
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
