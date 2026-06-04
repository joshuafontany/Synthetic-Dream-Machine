<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/browser/browser-authority >>
```toml iam
uri-path     = "ha.ka.ba/@lararium/v0.1/browser/browser-authority"
file-path    = "bags/@lararium/v0.1/browser/browser-authority.md"
source-file  = "packages/lararium-mesh/src/browser-authority.ts"
type         = "text/x-memetic-wikitext"
register     = "S"
confidence   = 18
mana         = 18
manao        = 18
manaoio      = 18
role         = "Browser island boundary types: BrowserWikiMountParams, BrowserProjectionSnapshot"
tagspace     = "lararium"
cacheable    = true
retain       = true
```

<<~&#x0002; >>

# Browser Island Boundary Types

Data shapes that cross the island boundary. Lives in `@lararium/mesh` — no DOM types, no pool contracts.
The `@lararium/browser` package holds the concrete pool implementation.

<<~ ahu #types >>

## Types

| Type | Role |
|---|---|
| `BrowserWikiMountParams` | What the pool needs to mount a wiki island: coreHash, bagBindings, recipeUri, optional pluginTiddlers |
| `BrowserProjectionSnapshot` | Minimal structured-clone-friendly render inputs crossing the island boundary; shape expands in S4 |

<<~/ahu >>

<<~ ahu #invariants >>

## Invariants

**BA-1 — No DOM types on the boundary surface.**
`BrowserWikiMountParams` and `BrowserProjectionSnapshot` carry zero `HTMLElement`,
`Document`, or `window` references. The pool implementation in `@lararium/browser`
may use DOM APIs for island spawn; the shared contract surface stays platform-neutral.

**BA-2 — No blob bytes in the mount params.**
The island reads `ENGINE_CORE_ID` bytes from the `@lararium` CRDT doc after Repo sync.
`coreHash` carries the SHA-256 hex for integrity; the mesh delivers the actual bytes.
No snapshot bytes transfer between vessel and island at mount time.

**BA-3 — BrowserProjectionSnapshot is structured-clone-friendly.**
No live DOM nodes, no callbacks, no Proxy objects cross the island boundary in a snapshot.
The projection adapter in `@lararium/browser` translates the snapshot into DOM/canvas/HUD output.

<<~/ahu >>

<<~ ahu #open-questions >>

## Open Questions (deferred to S4)

- Exact shape of `BrowserProjectionSnapshot.payload` — which TW5 state crosses the boundary per render cycle.
- Push vs pull projection: worker-initiated snapshot push or host-initiated pull. S4 measurements decide.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #charter ? -> lar:///ha.ka.ba/@lararium/v0.1/browser/pono-charter family:reference role:implements >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/island-protocol >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/browser/browser-vessel-island-pool >>

<<~/ahu >>

<<~&#x0003; >>

<<~&#x0004; -> ? >>
