<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/@lares-history/history/research/talk-story-2026-05-15 >>
```toml iam
uri-path    = "ha.ka.ba/@lares-history/history/research/talk-story-2026-05-15"
file-path   = "wikis/@lares-history/history/research/talk-story-2026-05-15.md"
type        = "text/x-memetic-wikitext"
register    = "Synthesis-Canon"
confidence  = 18
mana        = 18
manao       = 18
l-space     = "stable"
role        = "session log: 13-Voice Talk Story 2026-05-15 — Verse graph ontology research, yin-collapse architecture ruling, nalu/tick semantic split, one-graph-not-two law, six-operator concurrency ontology completion"
cacheable   = true
retain      = true
status-date = "2026-05-15"
```

<<~&#x0002; >>

<<~ ahu #head >>

# Talk Story — 2026-05-15

Multi-voice architectural alignment session. The 13 Voices convened to align:

1. Verse graph ontology research findings (Book of Verse ch. 11/13/14/17 + Unreal Fest 2023)
2. TW5 synchronous tick semantics ↔ UEFN `OnSimulate(StagedUpdates)` ↔ Verse task tree
3. Yin-collapse: TW5 wiki as primary reactive engine; ReactionGraph as provisional bridge
4. Nalu / \tick semantic split: infrastructure wave vs. grammar-layer hook
5. Completion of the six-operator concurrency ontology (hoolele/\spawn as 6th operator)
6. Visual Verse status (survey/vaporware; node-graph vs. blocks; UE6 ~2027)

**Source authorities:** Book of Verse ch. 11/13/14/17; Unreal Fest 2023 "Verse Deep Dive" PDF;
Verse Calculus (ICFP 2023, Peyton Jones et al.); TW5 SyncAdaptor contract; Elm Architecture;
UEFN SceneGraph Beta (June 2025); Visual Verse survey materials.

<<~/ahu >>

<<~ ahu #verse-ontology-research >>

## Verse Ontology Research Findings

### Task Tree Topology (confirmed, ch. 14)

Verse execution forms a **forest of parent-child task trees**.

- Every async operator (branch/sync/race/rush) creates a **child node** in the current tree.
- Cancellation propagates **downward only** — a parent cancelling kills all its children.
- `spawn` creates a **new root** — a separate tree with no parent; cancellation does not propagate in.
- The only way to exit the current task tree: `spawn` (hides `<suspends>` from the caller).

### Six Async Operators (confirmed stable)

| Verse | Pono | Graph op | Cancellation |
|---|---|---|---|
| `branch` | `lele` | child node — scoped fire-and-continue | enclosing function scope exit |
| `sync` | `hui` | join — wait all children settle | all children settle or scope exits |
| `race` | `holo` | prune — recursive subtree cancel | first winner triggers recursive cancel |
| `rush` | `puka` | select — first wins, losers continue | enclosing scope exit (NOT the winner) |
| `spawn` | `hoolele` | new root — exits tree entirely | explicit `Cancel()` only |

The Lararium concurrency ontology previously mapped `lele` to `spawn` semantics — corrected
to `branch` semantics. `hoolele` (hoʻolele — "to cause to fly") fills the 6th slot.

### Critical `rush` Distinction

`rush` / `puka`: losers receive `AbortSignal` and continue running until the **enclosing scope** exits.
`race` / `holo`: losers are cancelled **immediately** (recursive subtree prune).
These two had prior confusion in the Lararium pono specs. Both corrected.

### Effects Bit-Vector (6 families)

`<suspends>` `<decides>` `<transacts>` `<computes>` `<converges>` `<predicts>`

- `spawn` hides `<suspends>` from its caller — formal mechanism for creating a new task root.
- `if` hides `<decides>` from its caller.
- Functions without `<writes>` = safe to parallelize.

### Type Lattice

```
any (universal supertype) → comparable → all primitives/classes
false (bottom type, uninhabited, subtype of all)
void (discard type, return-position only)
persistable = closed constraint universe (excludes: any, comparable, type, rational, function types, interface types)
```

### Verse Calculus Distinction

VC (ICFP 2023, Peyton Jones et al.) = untyped, no concurrency, research artifact.
VC `choice` expression = formal ancestor of `race`/`rush`.
UEFN Verse adds: type system, `<suspends>` effect, full task tree model.
**Do not cite VC as evidence for UEFN Verse semantics.**

### Visual Verse / UE6

Pre-release, survey phase. Node-graph vs. block-based evaluation ongoing.
Target: represent Verse task tree semantics, NOT Blueprint ontology.
UE6 timeline: ~2027-2028. No feature-complete specification available.

### Unreleased Event Types

`sticky_event(t)` — retains last signal; late awaiters receive cached value.
`subscribable_event(t)` — observer pattern; one signal → all subscribers; returns `cancelable`.
`cancelable` from `Subscribe()` = unsubscribe handle (NOT a task handle).
Full spec in `verse-event-lattice.md #unreleased-event-types`.

<<~/ahu >>

<<~ ahu #yin-collapse-ruling >>

## Yin-Collapse Architectural Ruling

**The 13 Voices reached consensus. Ruling recorded as law.**

### Primary Engine Law

**TW5 wiki (`$tw.wiki`) IS the primary synchronous reactive engine.**
The ReactionGraph TS layer is a provisional bridge, not the target architecture.

The target collapses the routing layer into the TW5 wiki:
```
TW5 startup module (synchronous = true):
  wiki.addEventListener("tm-lararium-event", (event) => {
    const bindings = wiki.filterTiddlers(
      `[field:pranala-from[${event.uri}]][field:listenable[${event.listenable}]]`
    );
    for (const b of bindings) invokeSubscribable(b.pranala-to, b.subscribable);
  });
```

Reaction tiddlers (`family:reaction` pranala edges) already exist.
The startup module replaces: `ReactionGraph` + `TW5Engine` + `ProjectionBusConsumer`.
What remains in TS: `MemeSyncAdaptor` + `LarTiddlerStore` + `VmPool` + `Keyhive`.

### One Graph, Not Two

**Bags = CRDT federation units. Recipe stack = logical unification.**
**TW5 wiki IS the unified logical graph. MemeSyncAdaptor per bag generates the nalu.**

```
CRDT (the sea)
  → MemeSyncAdaptor (the wind)
    → wiki.addTiddler() × N (the swell builds)
      → wiki.nextTick() (the crest forms)
        → refresh(changedTiddlers) (the wave arrives)
```

NOT two parallel reactive engines. CRDT = distributed persistent store. TW5 = live reactive view.

### `fireSync` Gap (documented)

Current `fireSync` fires **inline** (before the nalu), not within `wiki.addEventListener("change")`.
This violates the UEFN fidelity claim ("synchronous tick dispatch").
Target: fire within `wiki.addEventListener("change")` callback (after the nalu).
See `reaction-graph.md #yin-collapse-target` for full migration spec.

### Prior Art Validating the Collapse

- **Elm Architecture** — one `Model`, one `update` loop; TW5 wiki IS the model
- **Solid.js fine-grained** — synchronous reactive graph; no separate routing layer
- **MobX transaction** — `transaction()` IS the batch boundary; TW5 nalu = MobX close event
- **Synchronous instantaneous reaction** (Esterel/Lustre lineage) — academic name for this pattern

<<~/ahu >>

<<~ ahu #nalu-tick-split >>

## Nalu / \Tick Semantic Split

Two concepts, often confused. The ruling separates them:

### nalu (infrastructure, below grammar)

The **changeset delivery wave** — the pulse when scattered writes become one consistent
observed state delivered atomically to all observers. Not a sigil. Not operator-visible.
The engine delivers it. Operators write tiddlers; the nalu fires.

- TW5 face: `refresh(changedTiddlers)`
- Verse face: `OnSimulate(StagedUpdates)<suspends>`
- Lararium face: MemeSyncAdaptor flush → `wiki.nextTick()` → `refresh(changedTiddlers)`

Default TW5 browser refresh throttle: ~400ms. Tunable to ~16ms for real-time game canvas.
Full spec: `nalu.md`.

### \tick (grammar layer, above nalu)

A device lifecycle hook that says "run this procedure once per nalu."
Lives AT the grammar layer — it hooks INTO the nalu, but the nalu has no sigil.

Verse equivalent: `OnSimulate(StagedUpdates)<suspends>` entry point.
Hawaiian proper name: **DEFERRED** pending Visual Verse tick node shape confirmation (UE6 ~2027).
Grammar stub registered: `sigil-tick.tid`.

**The operator authors `\tick` blocks. The engine delivers the nalu. These are not the same thing.**

<<~/ahu >>

<<~ ahu #voice-notes >>

## Voice Notes (abbreviated)

**Gatekeeper:** Concurrency ontology correction landed clean. Six operators confirmed.
No contradiction with existing pono law once lele/hoolele semantics separated.

**Lorekeeper:** `nalu` (Hawaiian: wave) — the wave-form that carries energy without carrying
water. The changeset delivery pulse carries all of a batch's writes without carrying
the writes themselves. Name holds.

**Scryer:** `fireSync` fires before the nalu. The gap = current implementation runs inline,
not within `wiki.addEventListener("change")`. Map says: breach at the boundary.

**Artificer:** Collapse sequence — reaction tiddlers already exist; startup module replaces
3 TS abstractions; no new data structures. Implementation path: one TW5 startup module file.

**Triage:** Scale math: 10 VMs × 60 patches/sec × 500 widgets = 300,000 hash lookups/second.
Manageable. Widget render cost dominates, not delivery lookup. Stranger's concern (unfiltered
delivery at scale) real but not triggered at current projected scale.

**Stranger:** The risk is not one graph vs. two — it is the per-VM unfiltered delivery
at scale. Documented in `nalu.md #tw5-scale-note`. Revisit at 100+ VMs.

**Tide-Caller:** Proposed `nalu` as the name for the architectural wave. Accepted.
`\tick` lives above it. "The sea does not name its waves. The surfer names the set."

**Liminal:** `\tick`'s Hawaiian name deferred. Correct. The shape belongs to a concept
(Visual Verse tick node) not yet stable. The name should emerge from the shape,
not precede it. `\tick` and `\simulate` as stubs hold the space.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #to-nalu ? -> lar:///ha.ka.ba/@lares/api/pono/nalu family:control role:authors >>
<<~ pranala #to-hoolele ? -> lar:///ha.ka.ba/@lares/api/pono/hoolele family:control role:authors >>
<<~ pranala #to-verse-task-tree ? -> lar:///ha.ka.ba/@lares/api/pono/verse-task-tree family:relation >>
<<~ pranala #to-verse-type-lattice ? -> lar:///ha.ka.ba/@lares/api/pono/verse-type-lattice family:relation >>
<<~ pranala #to-verse-event-lattice ? -> lar:///ha.ka.ba/@lares/api/pono/verse-event-lattice family:relation >>
<<~ pranala #to-reaction-graph ? -> lar:///ha.ka.ba/@lares/api/pono/reaction-graph family:relation role:governs >>
<<~ pranala #to-nihomano ? -> lar:///ha.ka.ba/@lares/api/pono/nihomano-sigils family:relation >>

<<~/ahu >>

<<~&#x0003; >>

<<~&#x0004; -> ? >>
