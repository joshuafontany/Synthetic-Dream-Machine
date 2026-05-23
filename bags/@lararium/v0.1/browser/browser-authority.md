<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/browser/browser-authority >>
```toml iam
uri-path     = "ha.ka.ba/@lararium/v0.1/browser/browser-authority"
file-path    = "bags/@lararium/v0.1/browser/browser-authority.md"
source-file  = "packages/lararium-mesh/src/browser-authority.ts"
type         = "text/x-memetic-wikitext"
register     = "S"
confidence   = 0.91
mana         = 0.91
manao        = 0.89
manaoio      = 0.86
role         = "S1 worker authority contract: BrowserAuthorityLease, BrowserAuthorityPool, BrowserAuthorityReceipt"
tagspace     = "lararium"
cacheable    = true
retain       = true
```

<<~&#x0002;>>

# Browser Authority Contract

S1 worker authority contract. Lives in `@lararium/mesh` — no DOM types, no browser runtime.
The `@lararium/browser` package holds the concrete implementation.

<<~ ahu #types >>

## Types

| Type | Role |
|---|---|
| `BrowserAuthorityId` | Stable key for a pool slot; formatted as a `lar:` URI matching the wiki identity |
| `BrowserAuthorityPhase` | Monotonic boot sequence: `spawned → booting → tw5-ready → store-wired → live → leased → idle → disposing → disposed` |
| `BrowserAuthorityBootParams` | Everything the worker needs to boot: authority ID, core blob, plugin blob, bag stack, recipe URI, optional snapshots for warm start |
| `BrowserAuthorityCapabilities` | Declaration of available operations at current phase; not a permission gate |
| `BrowserAuthorityLease` | Caller handle returned by `pool.acquire()`; all ops are async RPC across the Worker boundary; no DOM types |
| `BrowserProjectionSnapshot` | Minimal structured-clone-friendly render inputs crossing the Worker boundary; shape expanded in S4 |
| `BrowserAuthorityDebugStats` | Diagnostic output: phase, boot duration, lease timestamps, heap hint |
| `BrowserAuthorityReceipt` | Acknowledgment of pool-level operations (acquire, release, evict, dispose, boot) |
| `BrowserAuthorityPool` | Pool contract interface; concrete class lives in `@lararium/browser` |

<<~/ahu >>

<<~ ahu #invariants >>

## Invariants

**BA-1 — No DOM types on the contract surface.**
`BrowserAuthorityLease`, `BrowserAuthorityPool`, and `BrowserAuthorityReceipt` carry zero
`HTMLElement`, `Document`, `shadowRoot`, or `window` references. The concrete pool
implementation in `@lararium/browser` may use DOM APIs for Worker spawn; the shared
contract surface stays platform-neutral.

**BA-2 — Phase order is monotonic.**
A `BrowserAuthorityPhase` never moves backward. An authority that reaches `disposed`
gets a new entry in the pool on the next `acquire` call — it does not resurrect.

**BA-3 — Lease callers do not control Worker lifecycle.**
Calling `lease.release()` returns the authority to the pool. The pool decides whether
the authority stays warm (`idle`) or gets evicted. Callers hold no Worker handle.

**BA-4 — BrowserProjectionSnapshot is structured-clone-friendly.**
No live DOM nodes, no callbacks, no Proxy objects cross the Worker boundary in a snapshot.
The adapter in `@lararium/browser` translates the snapshot into DOM/canvas/HUD output.

**BA-5 — Boot params transfer large blobs, not clone them.**
`coreBlob` and `pluginBlob` are `Uint8Array`; the runtime transfers ownership to the
Worker rather than copying. Snapshots in `bootParams.snapshots` transfer similarly.

<<~/ahu >>

<<~ ahu #open-questions >>

## Open Questions (deferred to S4)

- Exact shape of `BrowserProjectionSnapshot.payload` — what TW5 state needs to cross the boundary per render cycle.
- Whether `projectionSnapshot()` should push snapshots (worker-initiated) or pull (host-initiated). S4 measurements decide.
- `debugStats()` heap reporting: `performance.measureUserAgentSpecificMemory()` is origin-isolated only; document the constraint when wiring S5 metrics.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #charter ? -> lar:///ha.ka.ba/@lararium/v0.1/browser/pono-charter family:reference role:implements >>
<<~ pranala #sprint ? -> lar:///ha.ka.ba/@lararium/v0.1/browser/full-detached-worker-authority-pool-sprint family:reference role:sprint >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/vm-pool >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/meme-recipe-vm >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/lararium-vessel >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
