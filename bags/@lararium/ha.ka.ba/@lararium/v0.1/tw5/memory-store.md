<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/memory-store >>
```toml iam
cacheable   = true
file-path   = "bags/@lararium/v0.1/tw5/memory-store.md"
mana        = 17
manao       = 17
register    = "Synthesis-Canon"
retain      = true
role        = "MemoryTiddlerStore — in-memory LarTiddlerStore, body of the @temp slot in every WikiRecipe"
source-file = "packages/lararium-tw5/src/memory-store.ts"
l-space     = "lararium"
type        = "text/x-memetic-wikitext"
uri-path    = "ha.ka.ba/@lararium/v0.1/tw5/memory-store"
```

<<~ &#x0002; >>

<<~ ahu #contract >>

## Contract

`MemoryTiddlerStore` implements `LarTiddlerStore` with in-memory state and no I/O.
The class itself is unaware of bag identity; it accepts an optional `bagId` only
to emit bag-tagged change events through the projection bus.

Two callers exist:

1. **Tests and fixtures.** Direct construction with optional `bagId`. Test
   helpers `_seed(record)` and `_snapshot()` give synchronous access without
   triggering subscribers.

2. **The `@temp` slot in every booted island.** Constructed by
   `buildIslandRecipe()` at the top of the cascade (highest priority).
   Comes up empty on every island boot; tears down on demote. No CRDT,
   no wire, no disk.

<<~/ahu >>

<<~ ahu #temp-scope >>

## What belongs in @temp

The @temp slot holds **device-vessel-local state that never leaves the island**.
The in-wiki bag-paths cascade (`lar:///ha.ka.ba/@lararium/config/bag-paths`)
routes the following TW5 title patterns to @temp:

| Title pattern | TW5 use | Why @temp |
|---|---|---|
| `$:/temp/*` | Drafts mid-typing, alerts, HTTP request trackers (`wiki.isTemporaryTiddler`) | TW5 designates these as transient by convention |
| `$:/temp/volatile/*` | rAF tick markers, animation frames (`wiki.isVolatileTiddler`) | Sub-frame transience; rebuilds every frame |
| `$:/status/*` | `$:/status/IsLoggedIn`, `$:/status/IsAnonymous`, `$:/status/IsReadOnly`, `$:/status/UserName` | TW5 status flags — per-device login state, not shared identity |
| `$:/boot/*` | TW5 boot config set during startup | Boot-time only; rebuilt each session |
| `$:/HistoryList` | Navigation back-stack (one entry per back-button click) | Per-device interaction history; meaningless across devices |
| `$:/state/*` | UI fold/expand state, selected tabs, popup open-state | Per-device UI state today. The `@personal` slot itself now ships in `expandRecipe` (S7.1+S7.2 landed 2026-05-31), but the cascade rules that would route `$:/state/folded/*`, `$:/state/tab-*`, `$:/StoryList`, and `$:/palette` away from `@temp` still pend S7.3 — the rest stays here until those rules land. |

**No catch-all rule.** The cascade only enumerates patterns it knows the
destination for. Writes whose title matches nothing in the cascade fall out
the bottom with no route — `IslandAdaptor.saveTiddler` skips them. This
leaves the `$:/plugins/*` / `$:/themes/*` / `$:/languages/*` namespaces open
for ceremony-level routing (drag-and-drop plugin install passes an explicit
`bag` override; a future `@personal`-routed plugin install rule fits the
"install once, refresh everywhere" use case the operator wants preserved).

<<~/ahu >>

<<~ ahu #not-temp >>

## What does NOT belong in @temp (the tension)

TW5's default `$:/config/SyncFilter` (`core/wiki/config/SyncFilter.tid`) treats
some `$:/*` patterns as **operator intent worth carrying across devices** —
notably `$:/StoryList` (which tiddlers are open in the story river). The
following patterns represent the operator's cross-device viewing state, and
**they DO want to sync between the operator's devices** but NOT to the
wider mesh:

| Title pattern | Operator intent it carries |
|---|---|
| `$:/StoryList` | Which tiddlers are open right now |
| `$:/state/folded/*` | Fold/expand state per tiddler frame |
| `$:/state/tab-*` | Selected tab per tiddler view (e.g. info-tab |edit-tab) |
| `$:/palette` | Operator's chosen color palette |
| `$:/canvas/viewport/*` (future) | Infinite-canvas pan/zoom position |

These belong in a **`@personal` slot** — a CRDT bag at the canonical URI
`lar:///ha.ka.ba/@personal` (one address, per the bag-tag rule in lar-uri.md).
The vessel's `BagResolver` binds the slot to a different Automerge doc per
`(PersonGroup × recipe-fingerprint)` pair at boot — same recipe + same
operator's device cabal → same doc → shared state; different recipe or
different cabal → different doc → no cross-talk. Approved 2026-05-30; see
the proposal at
[[lar:///ha.ka.ba/@lararium/v0.1/api/personal-slot]] for
boot wiring and the cascade rules that will activate it.

**Landing status (2026-05-31).** S7.1 + S7.2 of EPIC-RESIDENCY-MODEL landed:
`PERSONAL_BAG` exists as a constant in `wiki-recipe.ts` and `expandRecipe()`
now returns the slot URI between `@draft` and the wiki bag. Existing islands
gracefully skip the slot when no resolver entry maps it (per the optional-
slot semantics in `island-recipe.ts` and `sovereign-island-model.ts`), so the
floor stays green pending the remaining S7 stories. Until S7.3 (cascade
rules), S7.4 (recipe-fingerprint), S7.5 (resolver binding), and S7.6 (Keyhive
PersonGroup grant) land, the `$:/state/*` catch-all in the cascade routes
the operator's viewing state to `@temp` — it doesn't yet survive device
boundaries.

<<~/ahu >>

<<~ ahu #invariants >>

## Invariants

**M-1 — No I/O.** No disk writes, no network calls, no IndexedDB. The store
exists entirely within the worker's heap.

**M-2 — Per-island lifetime.** A fresh `MemoryTiddlerStore` materialises at
`buildIslandRecipe()` time and is released when the island demotes.
No persistence across island lifecycles.

**M-3 — Tombstone visibility.** A tombstoned title disappears from
`listVisible()` but `get()` still returns the dead record carrying
`meta.deleted = true`. Tombstones preserve change ordering for projections.

**M-4 — Projection bus participation.** Every `put()` and `tombstone()` emits
a `LarTiddlerChange` carrying the optional `bagId`. Subscribers see the
same change record any AutomergeDocStore would emit.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/lararium/wiki-recipe >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/config/bag-paths >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/tw5/island-recipe >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/lar-uri#bag-tag-rule >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/api/personal-slot >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
