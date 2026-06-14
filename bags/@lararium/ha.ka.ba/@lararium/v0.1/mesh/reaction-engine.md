<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/mesh/reaction-engine >>
```toml iam
cacheable   = true
file-path   = "bags/@lararium/v0.1/mesh/reaction-engine.md"
invariant   = true
mana        = 17
manao       = 17
manaoio     = 16
namespace   = "&#x0950; &#x0901;"
register    = "Synthesis-Canon"
retain      = true
role        = "canonical pipeline invariant: five-layer reactive architecture from CRDT patch to observable outcome — nalu, live-query, IslandMsg_Event, CRDT-as-distributed-promise"
status-date = "2026-05-28"
l-space     = "lararium"
type        = "text/x-memetic-wikitext"
uri-path    = "ha.ka.ba/@lararium/v0.1/mesh/reaction-engine"
```

<<~ &#x0002; >>

<<~ ahu #head >>

# Reaction Engine — Canonical Pipeline

Five layers. One reactive engine per island. CRDT = the sea. Nalu = the wave. TW5 = the shore.

No overlay engine. No ReactionEngine class. The TW5 wiki IS the reactive engine; the TS layer holds
only the irreducible (CRDT, network, crypto, multi-wiki coordination). Everything else lives in the nalu.

**Prior art:**
- *LoRe* (2024, arxiv:2304.07133) — "Declarative Dataflow Pipeline": changeset → merge → snapshot → derived state → effects
- *vlcn.io "March to Reactivity"* (2024) — live-query invariant: when a changeset touches a query's dependencies, re-execute incrementally
- *Goblins/OCapN Promise Pipelining* (FOSDEM 2025) — one-way fire law: islands send without waiting for ACK
- *Ink & Switch Local-First* (2019) — CRDT convergence = distributed promise; the sea carries the answer home

<<~/ahu >>

<<~ ahu #pipeline >>

## The Five-Layer Pipeline

```
Layer 1 — CRDT (the sea)
  Automerge document, sovereign per island.
  Every write originates in a sovereign vessel. No coordinator.
  Convergent by law: any two replicas that receive the same operations reach the same state.

Layer 2 — MemeSyncAdaptor (the wind)
  Bridges CRDT patch events → TW5 tiddler writes.
  Batches: accumulates addTiddler() calls across one Automerge patch set.
  Fires wiki.nextTick() when the batch drains.
  This is the only path from CRDT state into TW5. No oracle. No delta delivery from vessel.

Layer 3 — nalu (the wave)
  wiki.nextTick() → wiki.refresh(changedTiddlers) fires atomically.
  All observers see the same changedTiddlers map in the same synchronous context.
  No observer sees partial state. This is the nalu invariant.
  See: lar:///ha.ka.ba/@lares/v0.1/api/pono/nalu

Layer 4 — reaction-router (the shore)
  TW5 startup module. Runs on browser and node platforms.
  Receives the nalu via wiki.addEventListener("change", handler).
  For each changed lar: URI: updates ReactionGraph bindings → fires live-query dispatch.
  Live-query invariant: dispatch fires only for URIs whose bindings include a matching listenable.
  Emits wiki.dispatchEvent("tm-verse-event", { uri, listenable }) per matching binding.
  island-kernel.ts listens → posts IslandMsg_Event to vessel.
  See: packages/lararium-tw5/src/modules/reaction-router.ts

Layer 5 — IslandMsg_Event / CRDT convergence (the crossing)
  IslandMsg_Event carries the signal from island to vessel.
  Promise-pipelining law: island fires without waiting for vessel ACK.
  Vessel routes to VerbDispatcher → placeVerb() → writes outcome tiddler to shared admin CRDT.
  CRDT convergence delivers the outcome tiddler to all connected vessels.
  The converged outcome tiddler IS the return value. No separate response channel.
  See: lar:///ha.ka.ba/@lararium/v0.1/mesh/island-protocol
```

<<~/ahu >>

<<~ ahu #laws >>

## Pipeline Laws

1. **One reactive engine per island.** The TW5 wiki ($tw.wiki) is the reactive engine for its island. No overlay dispatch layer runs beside it.

2. **Islands fire; vessels route; CRDT resolves.** Island → `IslandMsg_Event` → vessel → `placeVerb()` → CRDT write → convergence. This is the full cross-boundary signal path.

3. **Promise-pipelining law.** Islands MUST NOT wait for vessel ACK before firing the next `IslandMsg_Event`. The signal path is one-way fire. Vessels enqueue on receipt; they do not block the island.

4. **CRDT convergence = distributed promise.** A verb written to the shared admin CRDT and a converged outcome tiddler carry the return value across vessel boundaries. No second protocol. No synchronous return channel.

5. **Live-query invariant.** `reaction-router.ts` fires only for `lar:` URIs whose `ReactionGraph` bindings include a matching listenable. Not a full-scan. Incremental per changed URI. This is the vlcn.io live-query pattern applied inside TW5's nalu.

6. **Layer isolation.** MemeSyncAdaptor → TW5 is the only data ingress path. Vessels MUST NOT deliver tiddler deltas directly to islands (Island Sovereignty Law §2).

7. **Irreducible TS layer.** Only four things stay in TS outside TW5: `LarTiddlerStore` (CRDT), network/WebSocket/WebRTC adapters, Keyhive cryptographic operations, `VesselIslandPool` multi-wiki coordination. Everything else belongs in the nalu.

<<~/ahu >>

<<~ ahu #boundary-map >>

## Boundary Map

```
Within-island dispatch (ReactionGraph):
  reaction-router.ts owns this surface.
  ReactionGraph is the routing table.
  fireSync dispatches within one TW5 wiki instance.
  Never addresses another island, vessel, or network.
  See: lar:///ha.ka.ba/@lararium/v0.1/mesh/reaction-graph

Cross-island boundary (IslandMsg_Event):
  island-kernel.ts posts IslandMsg_Event on tm-verse-event.
  VesselIslandPool receives and routes.
  Payload: { wikiUri, listenable, payload: Record<string, string|number|boolean> }
  GP-2 compliant: no class instances, functions, or DOM references.
  See: lar:///ha.ka.ba/@lararium/v0.1/mesh/island-protocol

Cross-vessel boundary (CRDT convergence):
  placeVerb() writes verb tiddler to shared admin CRDT.
  Automerge convergence delivers to all connected vessels.
  Outcome tiddler at @admin/outcomes/<requestId> carries the result.
  No additional protocol layer.
```

<<~/ahu >>

<<~ ahu #verse-alignment >>

## UEFN Verse Alignment

The five-layer pipeline maps onto the Verse simulation model:

| Pipeline layer | Verse equivalent |
|---|---|
| CRDT patch arrives | Device fires event during frame |
| MemeSyncAdaptor flush | End-of-frame state accumulation |
| nalu (`refresh(changedTiddlers)`) | `OnSimulate(StagedUpdates)<suspends>` |
| reaction-router live-query dispatch | Per-device `OnSimulate()` handler |
| IslandMsg_Event | Cross-device signal via Relay device |
| CRDT convergence = outcome | Listenable resolving across session |

The nalu IS `OnSimulate`. The `changedTiddlers` map IS `StagedUpdates`.
One wave. All observers. Same synchronous context.

<<~/ahu >>

<<~ ahu #non-goals >>

## Non-Goals (alpha)

- Cross-cabal routing — the vessel-to-vessel CRDT path is sufficient for alpha. Cabal-layer settlement (which vessel takes ownership of a given task when multiple vessels hold equal capability) remains unspecified. Path M wires the plumbing; cabal-layer logic fills the routing decision later.
- Revocation propagation — capability gate lives at `AdminAuthGate`; propagation protocol deferred (see dreamnet-prior-art.md Gap 1).
- Live query registration API — the live-query invariant describes behavior; a named API for registering queries from outside `reaction-router.ts` is a future surface.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/island-protocol >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/verse-event-lattice >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/dreamnet-prior-art >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/reaction-protocol >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/kumu-device >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/nalu >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/reaction-graph >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
