<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/reaction-graph >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/pono/reaction-graph"
file-path = "bags/@lares/v0.1/api/pono/reaction-graph.md"
type = "text/x-memetic-wikitext"
tagspace     = "stable"
confidence   = 17
register     = "CS"
manaoio      = 16
mana         = 17
manao        = 17
role          = "invariant interface: in-memory reaction graph — subscribe, fire, load, UEFN dispatch semantics"
cacheable     = true
retain        = true
invariant     = true
source-symbol = "ReactionGraph RENDER_MODES REACTION_ROLES"
```



<<~ ahu #head >>

# Reaction Graph

Isomorphic in-memory reaction dispatch layer — runs on server and client.
Routes (fromUri, listenable) → (toUri, subscribable) bindings; wired and subscribed; UEFN dispatch semantics.

<<~/ahu >>

<<~&#x0002;>>

<<~ ahu #ooda-ha >>

✶ read the incoming binding set — fromUri, listenable, toUri, subscribable, source (wired|subscribed)
⏿ orient dispatch mode: fireSync for view-layer; fire/fireAll for async; fireRace/fireRush reserved
◇ load() replaces full set; updateUri() updates one meme's bindings; occupied handler slots survive
▶ route fire call through (fromUri, listenable) → handlers; await or sync per mode
⤴ subscribeOnce bridges to kukali; subscribeByFn wires view-layer actions by name not source
↺ confirm handler slots occupied; kukali suspensions preserved across wiki-change reloads

<<~/ahu >>

<<~ ahu #law >>

## Law

The ReactionGraph is the live reaction dispatch layer.
It is isomorphic (no Node or browser APIs) and runs on both server and client.
It carries static bindings (declared in carrier pranala edges) and dynamic subscriptions (runtime).

A reaction binding is a (fromUri, listenable) → (toUri, subscribable) routing rule.
`fromUri` is the meme that fires. `listenable` is the event name (UEFN OUTPUT pin). `subscribable` is the handler label (UEFN INPUT pin).

The graph is the Tier 0 dispatch surface — all kumu event crossings route through it.

<<~/ahu >>


<<~ ahu #binding-shape >>

## Binding Shape

```toml
fromUri      = "lar:/// source meme URI"
toUri        = "lar:/// target meme URI"
listenable   = "event name (UEFN OUTPUT pin), or null for wildcard"
subscribable = "handler label (subscribeByFn key, UEFN INPUT pin), or null"
role         = "pranala edge role, or null"
source       = "wired | subscribed"
```

`wired` bindings are declared in carrier text as pranala edges with `family:reaction`.
`subscribed` bindings are established at runtime via `subscribe()`.

<<~/ahu >>

<<~ ahu #dispatch-modes >>

## Dispatch Modes

Four fire semantics — all run per (fromUri, trigger):

```
fire / fireAll   — hui: wait for all handlers to complete (async)
fireSync         — UEFN fidelity: synchronous tick dispatch, subscription order
fireRace         — heihei: first handler to settle wins; all continue
fireRush         — puka: first to resolve wins; others receive AbortSignal
```

`fireSync` is the default for view-layer reactions (navigation, zoom, relay).
`fire` / `fireAll` for async workflows (store operations, TW5 hydration).
`fireRace` / `fireRush` reserved for competitive dispatch (future: multi-realm routing).

<<~/ahu >>

<<~ ahu #subscription-api >>

## Subscription API

```
load(bindings)                        — replace full binding set; preserve handler slots
updateUri(uri, bindings)              — incremental update for one meme's bindings
removeUri(uri)                        — remove all bindings for a deleted meme
subscribe(fromUri, listenable, handler) → unsub   — per-(fromUri,listenable) handler
subscribeByFn(fnName, handler) → unsub             — handler for ALL bindings with subscribable=fnName
subscribeOnce(fromUri, listenable) → Promise + cancel()  — kukali bridge primitive
```

`subscribeByFn` is the preferred wiring point for view-layer actions.
Register once; automatically handles bindings that arrive after boot via `updateUri()`.
Equivalent to subscribing to a UEFN Relay device by name rather than by source.

`subscribeOnce` bridges to the `kukali` posture (Verse `suspends` analogue).
The returned Promise resolves when the listenable fires once; `cancel()` rejects it.

<<~/ahu >>

<<~ ahu #update-invariant >>

## Update Invariant

`load()` and `updateUri()` preserve occupied handler slots across binding rebuilds.
A handler registered via `subscribe()` or `subscribeOnce()` survives graph reloads
as long as the (fromUri, listenable) key still exists in the incoming binding set.
Unoccupied slots for removed bindings are dropped; occupied slots are kept.

This preserves in-flight kukali suspensions across TW5 wiki-change events.

<<~/ahu >>


<<~ ahu #schema >>

## Schema (machine-readable)

```toml
# Render modes — canonical values for PranalaEdge.renderMode
# Source: RENDER_MODES in packages/lararium-mesh/src/ast.ts
render-modes = ["papalohe"]
# papalohe: listenable label at source (OUTPUT pin), subscribable label at target (INPUT pin)

# Canonical roles for reaction family edges
# Source: REACTION_ROLES in packages/lararium-mesh/src/ast.ts
reaction-roles = ["listenable", "subscribable", "observes", "throttles", "debounces"]
```

<<~/ahu >>

<<~ ahu #yin-collapse-target >>

## Yin-Collapse Target Architecture

The current ReactionGraph TS implementation is a **provisional bridge**, not the
target architecture. The target collapses the routing layer into the TW5 wiki.

### Landed (2026-05-15) — reaction-router.ts TW5 startup module

`ReactionEngine` (TS, inline dispatch) removed. Replaced by:

```
packages/lararium-tw5/src/modules/reaction-router.ts
  module-type: startup, platforms: ["browser", "node"]

  Boot: scan all lar: tiddlers → build ReactionGraph from papalohe bindings.

  wiki.addEventListener("change", handler):           ← nalu arrives
    → update ReactionGraph bindings for changed URIs
    → wiki.dispatchEvent("tm-verse-event", {uri, listenable})

  Worker path: onVerseEvent consumer receives tm-verse-event
    → posts WorkerMsg_Event to main thread (vm-ring routing)

  Browser path: widget tree handles tm-verse-event directly.
```

`ReactionGraph` and `extractReactionBindings` remain in `live-protocol.ts`
(imported by reaction-router.ts). `ReactionEngine` class removed from
kumu-device.ts. `lar-wiki-worker.ts` now wires `onVerseEvent`
and drops the inline `re.onChangeset()` call.

What remains in TS: MemeSyncAdaptor + LarTiddlerStore + VmPool + Keyhive.

### `fireSync` gap — CLOSED (2026-05-15)

The gap (inline dispatch before nalu) no longer exists. `reaction-router.ts`
fires reactions inside `wiki.addEventListener("change")` — after TW5 coalesces
the batch. Dispatch now happens within the nalu, not before it.

`fireSync` on `ReactionGraph` remains available for direct test use, but the
production dispatch path runs exclusively through the nalu hook.

### Prior art validating the collapse

- **Elm Architecture** — one update function IS the engine; Cmd/Sub = side effects outside
- **Solid.js fine-grained** — synchronous reactive graph, no separate routing layer
- **MobX transaction** — transaction() IS the batch boundary; reactions defer until close
- **Synchronous instantaneous reaction** (Esterel/Lustre lineage) — academic name for this pattern

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:implements >>
<<~ pranala #tier0-dispatch ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/federated-causal-islands family:control role:implements >>
<<~ pranala #depends-pranala ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/pranala family:control role:depends >>
<<~ pranala #to-papalohe ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/papalohe family:dataflow role:reads >>
<<~ pranala #to-kukali ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/kukali family:dataflow role:reads >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
