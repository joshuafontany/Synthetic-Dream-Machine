<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/lararium/personal-slot-proposal >>
```toml iam
uri-path     = "ha.ka.ba/@lares/v0.1/api/lararium/personal-slot-proposal"
file-path    = "bags/@lares/v0.1/api/lararium/personal-slot-proposal.md"
type         = "text/x-memetic-wikitext"
register     = "S"
confidence   = 13
mana         = 14
manao        = 14
manaoio      = 13
role         = "proposal — a sixth recipe slot @personal carrying operator's cross-device viewing state; resolver binds per recipe-fingerprint (no URI-level scoping)"
tagspace     = "proposal"
status       = "approved"
approved-on  = "2026-05-30"
uri-shape    = "lar:///ha.ka.ba/@personal"
```

<<~&#x0002;>>

<<~ ahu #problem >>

# The @personal slot — proposal (approved)

## The tension that asked for the slot

The WikiRecipe holds five fixed slots:

```
1. @temp          volatile per-island, no CRDT
2. @draft         drafts, CRDT, mesh-shared
3. @<wikiSlug>    operator's wiki content, CRDT, mesh-shared
4. canonBags[]    optional content libraries, CRDT, mesh-shared
5. @lares         personality, CRDT, mesh-shared
6. @lararium      system, CRDT, mesh-shared
```

Two federation scopes only — **device-local** (`@temp`) and **mesh-shared**
(the rest). Nothing in between.

TW5 carries a category of state that lives between those two scopes — the
operator's cross-device viewing state. TW5's own default `$:/config/SyncFilter`
demonstrates the distinction: it excludes `$:/state/*` and `$:/HistoryList`
from sync but **leaves `$:/StoryList` syncable** because the open story
river represents operator intent worth carrying to their other devices.

The missing scope: **the operator's authorised device vessel mesh** — what
Keyhive already names a `PersonGroup`.

<<~/ahu >>

<<~ ahu #proposal >>

## Proposed slot

Insert `@personal` as a fixed slot between `@draft` and `@<wikiSlug>`:

```
1. @temp           volatile per-island, no CRDT
2. @draft          drafts, CRDT, recipe-scoped
3. @personal       cross-device viewing state, CRDT, PersonGroup-scoped + recipe-scoped
4. @<wikiSlug>     operator's wiki content, CRDT, mesh-shared
5. canonBags[]     optional content libraries, CRDT, mesh-shared
6. @lares          personality, CRDT, mesh-shared
7. @lararium       system, CRDT, mesh-shared
```

Slot URI: `lar:///ha.ka.ba/@personal` — top-level, `child[1]` only, per the
bag-tag rule (lar-uri.md). One canonical address.

<<~/ahu >>

<<~ ahu #yang-yin-chao >>

## Yang / Yin / Chao — the design caveat that came with approval

The recipe carries a Tai Chi symmetry around `@<wiki-named-bag>`:

```
              @temp          ┐
              @draft         │  YIN / Podge — every named @bag ABOVE @<wiki>
              @personal      │  belongs to the wiki-recipe-session-instances-set
                             │  (all open instances of this wiki carrying THIS
                             ┘  exact bag-stack BELOW @<wiki>)
        ┌───  @<wiki-named-bag>  ── CHAO / spin / Taiji ─────────────────────┐
        │     the surface where activity accumulates — live multiplayer,    │
        │     multi-session, the shared "space the wiki is."                │
        └───────────────────────────────────────────────────────────────────┘
              canonBags[]    ┐
              @lares         │  YANG / Hodge — every named @bag BELOW @<wiki>
              @lararium      ┘  is structured canon, mesh-shared, read-stable
```

**Above @<wiki> slots** (`@temp`, `@draft`, `@personal`) are keyed by
`(PersonGroup × recipe-fingerprint)`, where the fingerprint covers the entire
below-@<wiki> stack. Two devices share above-wiki state ONLY when their
recipe-fingerprints match.

<<~/ahu >>

<<~ ahu #scoping-mechanism >>

## Scoping mechanism — the resolver binds, the URI doesn't

The slot URI stays generic across all recipes: `lar:///ha.ka.ba/@personal`.
The recipe-fingerprint binding lives in the **`BagResolver` map** carried in
the island manifest, not in the URI.

```typescript
// Recipe A (synthetic-dream-machine + sdm + ftls canon):
resolver["lar:///ha.ka.ba/@personal"] = "automerge:abc..."   // doc α

// Recipe B (synthetic-dream-machine + sdm + ftls + elyncia canon, same operator):
resolver["lar:///ha.ka.ba/@personal"] = "automerge:def..."   // doc β (different)

// Recipe A again, different device, same operator's PersonGroup:
resolver["lar:///ha.ka.ba/@personal"] = "automerge:abc..."   // doc α (shared)
```

The slot URI is the **address**. The Automerge doc the resolver hands you
is the **house at that address right now in this recipe**. Different
recipes deliver to different houses; same recipe across the operator's
device cabal delivers to one shared house.

Same mechanism applies to `@draft`:

```typescript
resolver["lar:///ha.ka.ba/@draft"] = <recipe-A-draft-doc>   // device A
resolver["lar:///ha.ka.ba/@draft"] = <recipe-A-draft-doc>   // device B, same recipe
resolver["lar:///ha.ka.ba/@draft"] = <recipe-B-draft-doc>   // device C, different recipe
```

`@temp` stays per-island (no CRDT, no resolver entry needed — the slot URI
resolves to a fresh MemoryTiddlerStore at boot).

<<~/ahu >>

<<~ ahu #cascade-rules >>

## Cascade rules that activate @personal

The default `lar:///ha.ka.ba/@lararium/config/bag-paths` cascade adds rules
above the `$:/state/` catch-all:

```
[prefix[$:/temp/]then[lar:///ha.ka.ba/@temp]]
[prefix[$:/status/]then[lar:///ha.ka.ba/@temp]]
[prefix[$:/boot/]then[lar:///ha.ka.ba/@temp]]
[prefix[$:/HistoryList]then[lar:///ha.ka.ba/@temp]]
[prefix[$:/state/popup/]then[lar:///ha.ka.ba/@temp]]
[prefix[Draft of ]then[lar:///ha.ka.ba/@draft]]
[prefix[$:/StoryList]then[lar:///ha.ka.ba/@personal]]           ← new
[prefix[$:/state/folded/]then[lar:///ha.ka.ba/@personal]]       ← new
[prefix[$:/state/tab-]then[lar:///ha.ka.ba/@personal]]          ← new
[prefix[$:/palette]then[lar:///ha.ka.ba/@personal]]             ← new (pending Q3)
[prefix[$:/state/]then[lar:///ha.ka.ba/@temp]]
[prefix[lar:]then{lar:///ha.ka.ba/@lararium/config/current-wiki-bag}]
```

The literal slot URI `lar:///ha.ka.ba/@personal` appears in the cascade;
each island's resolver supplies the correct doc URL at boot.

<<~/ahu >>

<<~ ahu #boot-wiring >>

## Vessel boot wiring

The vessel computes the recipe fingerprint at boot — a hash over
`(@<wiki>-doc-id, sorted canonBag doc-ids, @lares-doc-id, @lararium-doc-id)`.
Together with the PersonGroup id (Keyhive), this names one specific
`(PersonGroup × recipe-fingerprint)` pair.

The vessel stores `@personal` doc URLs keyed by that pair. On first use the
vessel mints a fresh Automerge doc and registers it under the pair. On
resume the vessel reads the stored URL.

When the island manifest goes out, the resolver entry
`resolver["lar:///ha.ka.ba/@personal"] = <doc-url>` carries the per-recipe
binding to that island.

Keyhive integration: each `@personal` doc registers under the operator's
PersonGroup cap-chain so only the operator's other devices can sync it.

Same wiring for `@draft` — vessel maintains per-pair draft doc URLs.

<<~/ahu >>

<<~ ahu #migration >>

## Migration sketch (next sprint)

1. Add `PERSONAL_BAG` constant to `wiki-recipe.ts` (`lar:///ha.ka.ba/@personal`).
2. Update `expandRecipe()` to insert `@personal` between `@draft` and the wiki bag.
3. Update default cascade tiddler (`lar-bag-paths.tid`) with @personal rules.
4. Wire vessel boot to compute the recipe fingerprint + resolve/create per-pair `@personal` and `@draft` doc URLs.
5. Inject the resolved URLs into `BagResolver` at manifest time.
6. Keyhive PersonGroup grant + capability check on the `@personal` and `@draft` bags.
7. Tests:
   - Two devices, same recipe, same PersonGroup → write StoryList on device A, observe on device B.
   - Two devices, different recipe, same PersonGroup → write StoryList on device A, device B sees nothing.
   - Two devices, same recipe, different PersonGroup → no cross-talk.
8. Update memory-store.md @personal references.

<<~/ahu >>

<<~ ahu #reconciliation >>

## Reconciliation with the Residency Model (2026-05-30)

The approved [residency-model](residency-model.md) reframes how this proposal lands.
The slot URI, the (PersonGroup × recipe-fingerprint) keying, and the Yang/Yin/Chao
position above `@<wiki>` all survive intact. Two clarifications follow:

1. **Cascade rules become first-write defaults, not authoritative routing.**
   The `@personal` cascade entries in `#cascade-rules` MUST hold as *defaults for
   where a new tiddler first lands* — not as *the one place a tiddler may live*.
   Under the residency model a title MAY have residency in `@personal` AND
   `@<wiki>` AND a canon library simultaneously. The recipe walks priority and
   surfaces the topmost Manifestation; the cascade only decides where the
   first-write goes when no other bag already holds the title.

2. **Migration tests gain +2 cases for multi-bag residency.** The existing 7-test
   plan in `#migration` covers single-bag residency. Add:
   - **Test 8 (multi-bag overlay):** write `$:/StoryList` in `@personal`, then
     `lares act ADD --title $:/StoryList --from @personal --to @<wiki>`. Assert
     resolveAll returns both bags; resolveTopmost picks `@personal` per recipe
     priority; origin-bag field reads `@personal`; the `@<wiki>` Manifestation
     remains visible to `lares wiki resolve $:/StoryList`.
   - **Test 9 (transfer effect record):** `lares act MOVE --title MyNote
     --from @personal --to @<wiki>` produces one `transfer` effect record
     pairing accession (`@<wiki>`) + deaccession (`@personal`); the deaccession
     log persists in `@personal/log/residency/` after the tiddler leaves.

Status remains `approved`. The data-model mechanism (BagResolver bound per
(PersonGroup × recipe-fingerprint)) does not change. Implementation now coordinates
with Sprint 7 of `packages/EPIC-RESIDENCY-MODEL.md` rather than landing as an
independent migration.

<<~/ahu >>

<<~ ahu #open-questions >>

## Open questions (remaining)

Q1 (slot priority order) ✅ approved — `@personal` between `@draft` and `@<wikiSlug>`.
Q2 (one @personal or per-wiki) ✅ resolved — single canonical URI, resolver binds per (PersonGroup × recipe-fingerprint).

Remaining:

3. **`$:/palette` scope.** Does palette belong in `@personal` (operator-across-devices) or `@lares` (personality-across-mesh)? Both readings still valid.
4. **Subscription gesture.** Implicit on PersonGroup membership, or explicit per-wiki toggle?
5. **Fingerprint algorithm.** SHA-256 of `(@<wiki>-doc-id + sorted canonBags doc-ids + @lares-doc-id + @lararium-doc-id)`? Open: should `@lares` and `@lararium` doc-ids participate? Probably yes — different system or personality = different view state context.
6. **@draft scoping** ✅ confirmed — follows the same `(PersonGroup × recipe-fingerprint)` keying as @personal. Locked at slot URI `lar:///ha.ka.ba/@draft`, resolver-bound.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #wiki-recipe ? -> lar:///ha.ka.ba/@lares/v0.1/api/lararium/wiki-recipe family:relation role:extends >>
<<~ pranala #memory-store ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/memory-store family:relation role:resolves-tension-from >>
<<~ pranala #bag-paths ? -> lar:///ha.ka.ba/@lararium/v0.1/config/bag-paths family:relation role:adds-rules-to >>
<<~ pranala #lar-uri-bag-tag ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/lar-uri#bag-tag-rule family:relation role:governed-by >>
<<~ pranala #keyhive ? -> lar:///ha.ka.ba/@lares/v0.1/api/keyhive/person-group family:relation role:scoped-by >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
