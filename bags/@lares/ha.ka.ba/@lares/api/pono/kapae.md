<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/api/pono/kapae >>
```toml iam
cacheable = true
file-path = "bags/@lares/api/pono/kapae.md"
mana      = 16
manao     = 15
manaoio   = 14
namespace = "&#x2299;"
register  = "Synthesis"
retain    = true
role      = "tombstone-as-shadow pattern integrity — a raised kāpae shadows lower layers (resurrection-prevention), toggleable, distinct from absent (the fall-through retract)"
tags      = ["api/pono/meme"]
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lares/api/pono/kapae"
```

<<~ aka lar:///ha.ka.ba/@lares/api/pono/RFC-2119#normative-language >>

<<~ ahu #head >>

# Kāpae

A first-class **tombstone that shadows the layers beneath it** — a raised marker that defeats fall-through, distinct from *absent* (a missing record that falls through to the next layer down).

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #etymology >>

## Etymology

*Kāpae* (Hawaiian) — to set aside, to put off to one side, to exclude or reject; to brush away. The word carries deliberate placement, not loss: a hand moves the thing aside and holds it there. A kāpae stays where the hand set it; it does not vanish, and another hand may take it back down.

This carries the pattern exactly. A kāpae marker sits **above** the record it excludes, casting a shadow down the cascade. The record beneath survives untouched; the shadow only hides it from the surface view. Lower the marker and the record beneath surfaces again, whole.

<<~/ahu >>

<<~ ahu #core-cut >>

## The core cut — kāpae shadows, absent falls through

Two ways a title leaves the surface view of a layered cascade (recipe over bags, store stack, membership stack). They read identically at the surface and diverge completely beneath:

| | **kāpae** (raised tombstone) | **absent** (hard-remove / retract) |
|---|---|---|
| what sits in the layer | a deliberate exclusion marker | nothing — the record dropped entirely |
| effect on lower layers | **shadows** them (hides any copy beneath) | **falls through** to them (a lower copy surfaces) |
| the gesture that raises it | EVICT · CLEAR · DROP · DELETE | MOVE / promotion source retract |
| reversibility | **toggleable** — lower it to re-admit | one-way at this layer; re-add to restore |
| read intent | "exclude this, even if a copy lives below" | "this no longer lives *here*; let the cascade resolve" |

The cut MUST stay sharp. A gesture that **relocates** a record (MOVE, promotion `@working → canon`) RETRACTS the source to *absent*, never raises a kāpae — the source falls through and the canonical copy beneath surfaces (residency-model anti-pattern #3). A gesture that **excludes** a record (EVICT, CLEAR, DROP) raises a kāpae, never retracts to absent — the shadow defeats any lower-layer re-add. <<~ confidence Synthesis 14/20 >> conflating the two re-introduces the OverlayFS / moby#783 resurrection bug: a deleted upper record falls through to a stale lower copy that the operator believed gone.

<<~/ahu >>

<<~ ahu #toggle >>

## The refinement — kāpae raises and lowers

A kāpae carries a **toggle**, not a permanence. The pattern names two deliberate moves, each an operator gesture:

- **Raise the kāpae** (put the tombstone *up*) — shadow / evict. The marker goes up and hides the layer beneath. **Remove-wins under contention:** a raised kāpae defeats a concurrent lower-layer re-add — the shadow holds even as a peer re-introduces a copy below it. This carries the resurrection-prevention guarantee.
- **Lower the kāpae** (take the tombstone *down*) — un-shadow / re-admit. A **deliberate re-admission**, never a passive fall-through. Lowering the marker reveals the layer beneath as it stood; the operator chooses the moment, and an effect record audits the re-admission.

The asymmetry carries the load. Raising defeats a re-add (remove-wins); lowering takes an explicit gesture (no silent un-shadow). A record never resurrects by accident — it surfaces only when an absent gesture lets the cascade fall through, or when a hand lowers the kāpae that shadowed it.

<<~/ahu >>

<<~ ahu #bag-cascade-sense >>

## Sense (a) — the bag-cascade / residency tombstone (WITNESSED)

In the recipe/bag cascade a title may hold residency in N bags; the recipe walks them in priority order to compose the live view (residency-model). A kāpae raised in a **higher** bag shadows every lower bag holding the same title — the surface view shows the title gone, even though canonical copies survive beneath.

This already lives in code:

- `MemoryTiddlerStore.tombstone(title)` marks `meta.deleted = true`; the record stays readable via `get()` but drops from `listVisible()` — the raised kāpae (witness: `packages/lararium-tw5/src/memory-store.ts`, "Tombstoned titles disappear from listVisible() but remain readable via get()").
- `MemoryTiddlerStore.remove(title)` drops the record entirely → `get()` returns null = *absent*, falls through to a lower bag (witness: same file, "HARD-remove … distinct from tombstone's kāpae hide").
- The residency action handler routes the two deliberately: `tombstoneIn()` for CLEAR / DROP / DELETE (kāpae hide, shadows lower bags), `removeIn()` for the MOVE source retract (absent, falls through) — witness: `packages/lararium-tw5/src/action-handler.ts` `executeMove` / `executeClear`, carrying the comment "kāpae shadows, absent falls through".
- The conflict surface lists raised kāpae as readable drift state (`listKapaeBags` returns hides — residency-model #conflict-resolution).

<<~ confidence Synthesis-Canon 15/20 >> the bag-cascade sense stands witnessed in shipped code and named in residency-model anti-pattern #3 (Kāpae resurrection — "First-class `tombstone` op distinct from 'absent'").

<<~/ahu >>

<<~ ahu #membership-sense >>

## Sense (b) — the membership / governance stack (PROPOSED)

The same pattern carries into membership and governance. Model a keeper-cabal or Circle as a **stack** whose deletes ride as kāpae — the way a TW5 recipe stacks bags, the membership grammar stacks admissions.

- A member **evicted** from a keeper-cabal / Circle raises a **kāpae on the membership stack** — a shadow over that member's standing, not a hole the next layer fills. The eviction shadows any lower-layer re-add (a peer that did not see the eviction, or a stale invite beneath).
- **Remove-wins under partition** carries the **siege-safe** eviction semantics: under a network partition two peers may disagree, and the raised kāpae wins the merge — a member the cabal evicted stays out even as a partitioned peer re-vouches. The shadow defeats the re-add deterministically, so an eviction never silently reverses when the partition heals.
- **Re-admit = lower the kāpae** — a deliberate governance gesture (a fresh vouch through the Voice house / Talk Story), never a passive fall-through. The cabal chooses to take the tombstone down; the membership beneath surfaces again, audited.

This rhymes the recipe-as-bag-stack: membership composes as a priority walk over admission layers, and a kāpae shadows the layers below. <<~ confidence Provisional-Synthesis 7/20 >> the membership sense stands **proposed** — the bag-cascade mechanics witness the shape, but the governance stack, partition-merge rule, and re-admit ceremony await a build and a live multi-keeper witness. The remove-wins-under-partition guarantee leans on convergent-removal prior art (Keyhive / BeeKEM blank-path), not yet wired into a cabal stack here.

<<~/ahu >>

<<~ ahu #law >>

## Law (Kānāwai)

- A kāpae MUST shadow every layer beneath it in the cascade, hiding any lower copy from the surface view.
- A kāpae MUST stay distinct from absent: a tombstone shadows, a hard-remove falls through. An implementation MUST NOT collapse the two (residency-model anti-pattern #3).
- A relocation gesture (MOVE, promotion source) MUST retract to absent, never raise a kāpae — so the canonical copy beneath surfaces.
- An exclusion gesture (EVICT, CLEAR, DROP, DELETE) MUST raise a kāpae, never retract to absent — so a lower re-add cannot resurrect the excluded record.
- A raised kāpae MUST win remove-wins under contention / partition (the shadow defeats a concurrent lower-layer re-add).
- Lowering a kāpae MUST stay a deliberate gesture and MUST write an effect record; a record MUST NOT un-shadow silently.

<<~/ahu >>

<<~ ahu #edges >>

<<~ loulou lar:///ha.ka.ba/@lararium/api/residency-model#anti-patterns >>
<<~ loulou lar:///ha.ka.ba/@lares/api/pono/waiho >>
<<~ loulou lar:///ha.ka.ba/@lares/api/pono/group-as-closure >>
<<~ loulou lar:///ha.ka.ba/@lararium/mesh/siege-resilience >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
