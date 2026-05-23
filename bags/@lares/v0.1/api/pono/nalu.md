<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/nalu >>
```toml iam
uri-path    = "ha.ka.ba/@lares/v0.1/api/pono/nalu"
file-path   = "bags/@lares/v0.1/api/pono/nalu.md"
type        = "text/x-memetic-wikitext"
register    = "CS"
confidence  = 0.88
mana        = 0.88
manao       = 0.86
tagspace    = "stable"
role        = "architectural invariant: nalu as changeset delivery wave — the pulse below the grammar; maps TW5 refresh(changedTiddlers) ↔ Verse OnSimulate(StagedUpdates) ↔ MemeSyncAdaptor boundary; yin-collapse law"
cacheable   = true
retain      = true
invariant   = true
status-date = "2026-05-15"
```

<<~&#x0002;>>

<<~ ahu #head >>

# Nalu — The Changeset Wave

*nalu* — Hawaiian: wave, surf; the wave-form that carries energy across distance.
A nalu does not carry one molecule of water — it carries the entire shaped movement
of the sea. The wave arrives as one coherent thing, composed of many.

The nalu is the changeset delivery pulse — the moment when scattered writes become
one consistent observed state delivered to all observers atomically. It is the
architectural invariant below the grammar layer. Operators do not emit nalu; the
engine delivers it.

**Source authority:** Talk Story session 2026-05-15; Book of Verse ch. 14;
TW5 SyncAdaptor contract; Elm Architecture (Czaplicki 2012); UEFN SceneGraph Beta.

<<~/ahu >>

<<~ ahu #the-wave-shape >>

## The Wave Shape — Three Implementations, One Pattern

The nalu appears as the same architectural shape in three layers of the Lararium stack:

```
TW5 layer:
  Multiple wiki.addTiddler() calls    ← scattered writes accumulate
  wiki.enqueueTiddlerEvent(title) ×N  ← change signals queued
  wiki.nextTick(callback)             ← batch boundary: JS call stack empties
  refresh(changedTiddlers)            ← WAVE ARRIVES: all widgets see same state

Verse / UEFN SceneGraph layer:
  Devices fire events, state mutates  ← scattered writes accumulate
  Engine batches between frames       ← batch boundary: simulation tick
  OnSimulate(StagedUpdates)<suspends> ← WAVE ARRIVES: all components see same updates

MemeSyncAdaptor layer (Lararium bridge):
  CRDT merge patches arrive           ← scattered writes (from peers, from CRDT ops)
  Adaptor batches addTiddler() calls  ← batch boundary: per-island flush
  wiki.nextTick flushes to refresh    ← WAVE ARRIVES: TW5 wiki reflects CRDT state
```

**The invariant:** The nalu is not one tiddler change. It is the atomic delivery
of a *batch* of changes to all observers simultaneously. Every observer — every
widget, every reaction handler — receives the same `changedTiddlers` set in the
same synchronous execution context. No observer sees a partial state.

<<~/ahu >>

<<~ ahu #below-the-grammar >>

## Below the Grammar Layer

The nalu is **not** a sigil the operator emits. It is what the engine delivers.

```
Grammar layer (above nalu):
  <<~ lele lar:///target >>    ← sigil declares intent
  <<~ hui >>                   ← sigil declares sync shape
  <<~ kukali trigger >>        ← sigil declares suspension

Nalu layer (below grammar):
  refresh(changedTiddlers)     ← engine delivers consistent state
  OnSimulate(StagedUpdates)    ← engine delivers consistent state
  [no sigil; no operator action; the engine acts]
```

The sigils in the grammar layer express *what should happen* — relationships,
concurrency shapes, reactions. The nalu is *when consistent state arrives* — the
moment all of those relationships become observable.

**The `\tick` sigil (when it lands)** will live at the grammar layer — it will be
a device lifecycle declaration that says "run this procedure every nalu." The nalu
itself has no sigil; the `\tick` sigil hooks into the nalu.

<<~/ahu >>

<<~ ahu #yin-collapse-law >>

## Yin-Collapse Law

**Law:** The TW5 wiki (`$tw.wiki`) IS the primary synchronous reactive engine.
The ReactionGraph TS layer is a provisional bridge to the target architecture,
not the target architecture itself.

**Target architecture:**

```
┌─────────────────────────────────────────────────────┐
│  TW5: $tw.wiki             ← primary reactive engine │
│  TW5: Widget tree          ← refresh = nalu delivery │
│  TW5: SharktoothSigil      ← grammar as tiddlers     │
│  TW5: Reaction startup mod ← routing as startup code │
│  TW5: Reaction tiddlers    ← bindings as tiddler data│
├─────────────────────────────────────────────────────┤
│  TS:  MemeSyncAdaptor      ← minimal bridge (thin)   │
│  TS:  LarTiddlerStore      ← Automerge CRDT          │
│  TS:  VmPool               ← multi-wiki coordination │
│  TS:  Keyhive / network    ← crypto + peers          │
└─────────────────────────────────────────────────────┘
```

**What collapses from TS into TW5:**
- `ReactionGraph` routing table → `family:reaction` pranala tiddlers (already exist)
- `ReactionGraph.fireSync()` → TW5 startup module `addEventListener` on `tm-verse-event`
- `TW5Engine.onVerseEvent()` → startup module `addEventListener` + teardown
- `VerseEventConsumer` interface → startup module closure

**What does NOT collapse (irreducible TS):**
- `LarTiddlerStore` — TW5 has no CRDT; Automerge is irreducible
- Network / WebRTC / WebSocket — browser/Node APIs, not TW5
- Keyhive capabilities — cryptographic operations, not TW5
- `VmPool` multi-wiki coordination — TW5 is single-wiki by design

**The prior art validating this collapse:**
- **Elm Architecture** — one `Model`, one `update` loop, side effects as data (`Cmd`)
  — the wiki IS the model; MemeSyncAdaptor Cmd produces tiddler writes; TW5 is the runtime
- **Vue 3 reactive scheduler** — reactive effects queue, flush on nextTick atomically
  — TW5 `enqueueTiddlerEvent` + `nextTick` + `refresh` is the same pattern
- **MobX transaction/reaction** — `transaction(() => {})` batches mutations, defers
  reactions until batch closes — TW5's nalu IS the MobX transaction close event

<<~/ahu >>

<<~ ahu #one-graph >>

## One Graph, Not Two

The causal islands are bags. Bags stack via TW5 recipe. The TW5 wiki is the
unified logical graph. CRDT provides per-bag physical federation.

```
One wiki graph (logical):
  TW5 recipe = [bag-A, bag-B, bag-C, ...]
  $tw.wiki sees all tiddlers from all bags as one namespace
  filter queries span all bags
  refresh(changedTiddlers) fires once for changes from any bag

Per-bag physical federation (Automerge):
  Each bag = one Automerge document
  CRDT merges happen per-document
  MemeSyncAdaptor bridges each bag's CRDT state → TW5 wiki tiddlers
  Nalu fires when adaptor flushes a batch of tiddler writes
```

**NOT two parallel reactive engines.** The CRDT layer is the distributed persistent
store. TW5 is the live reactive view. The MemeSyncAdaptor is the boundary — it
translates CRDT patch events into tiddler writes that trigger the nalu.

```
CRDT (the sea)
  → MemeSyncAdaptor (the wind)
    → wiki.addTiddler() × N (the swell builds)
      → wiki.nextTick() (the crest forms)
        → refresh(changedTiddlers) (the wave arrives on shore)
```

The shore is the widget tree. The same shore receives waves from any bag.

<<~/ahu >>

<<~ ahu #tw5-scale-note >>

## TW5 Unfiltered Delivery — Scale Note

TW5's `refresh(changedTiddlers)` delivers to ALL widgets in the tree, unfiltered.
Each widget checks `changedTiddlers` via hash lookup (O(1) per widget).

**Performance profile:** 10 VMs × 60 CRDT patches/second × 500 widgets =
300,000 hash lookups/second. This is manageable. Widget render cost (filter
expressions, wikitext) dominates, not the delivery lookup.

**Optimization path (without TW5 core rewrite):** Widget filter expressions
that gate on `tiddler.bag === "bagX"` are hash lookups on a tiddler field.
Fast by default. No per-bag scoping needed in TW5's core refresh cycle.

**When a TW5 core extension becomes necessary:** If VmPool scale reaches
100+ VMs with 1000+ widgets each, or if CRDT patch frequency exceeds 600/second
per VM, re-evaluate. The Stranger's concern (unfiltered delivery at scale) is
real but not yet triggered at current projected scale.

<<~/ahu >>

<<~ ahu #uefn-alignment >>

## UEFN SceneGraph Alignment (Beta, June 2025)

The SceneGraph Beta unifies editor and runtime — all scene elements are now
Verse-addressable. `OnSimulate(StagedUpdates)<suspends>` is the canonical entry
point for per-tick logic across the full unified scene.

**Nalu ↔ OnSimulate mapping (confirmed):**

| TW5 concept | Verse concept | Lararium concept |
|---|---|---|
| `wiki.enqueueTiddlerEvent()` | Event fires during frame | CRDT patch arrives |
| `wiki.nextTick(cb)` | End-of-frame barrier | Per-island adaptor flush |
| `refresh(changedTiddlers)` | `OnSimulate(StagedUpdates)` | **nalu** |
| `changedTiddlers` map | `StagedUpdates` array | changeset batch |
| Widget `refresh()` method | Device `OnSimulate()` method | per-observer delivery |

**Coordinate system note (v36.00):** UEFN transitioned to LUF (Left, Up, Forward)
coordinates. Any `spatial:contains`, `spatial:adjacent`, or `spatial:portal` pranala
edges encoded with FRU orientation assumptions need migration. See `uefn-scene.md`.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #to-verse-task-tree ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/verse-task-tree family:relation >>
<<~ pranala #to-verse-event-lattice ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/verse-event-lattice family:relation >>
<<~ pranala #to-vm-projection-bus ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/vm-projection-bus family:relation role:supersedes >>
<<~ pranala #to-reaction-graph ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/reaction-graph family:relation role:governs >>
<<~ pranala #to-causal-islands ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/causal-islands family:relation >>
<<~ pranala #to-uefn-scene ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/uefn-scene family:relation >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
