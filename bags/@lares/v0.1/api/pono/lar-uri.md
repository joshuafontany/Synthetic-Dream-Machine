<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/lar-uri >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/pono/lar-uri"
file-path = "bags/@lares/v0.1/api/pono/lar-uri.md"
type = "text/x-memetic-wikitext"
confidence = 17
register = "CS"
manaoio = 16
mana = 17
manao = 17
namespace = "ॐ ँ"
role = "invariant lar: URI scheme law (kānāwai), canonical form authority, and grammar primitive"
cacheable=true
retain = true
grammar = true
```



<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #head >>

# `lar:` URI Law (Kānāwai)

Active in i kēia manawa.
The URI packs identity, territory, signal, and time into one parseable string.
Every `lar:` URI in the system answers to these rules.

<<~/ahu >>


<<~ ahu #scheme-law >>

## Scheme Law

`lar:` names. It does not fetch. Precedent: RFC 4151 (`tag:`).

**Local form** — authority-less, for stable graph addresses and system resource names:
```
lar:///path/
```

**Session form** — full speaker, for exchange spans only:
```
lar://alias:tier@host/ha.ka.ba/@lares/path/?stances=XX;XX;XX;XX;XX;&confidence=R:N&p=N&ffz=CCCCC
```

Session form MUST NOT appear in storage, stable graph addresses, or system resource URI names.

<<~/ahu >>

<<~&#x0002;>>


<<~ ahu #path-taxonomy >>

## Path Taxonomy

**Stable** — literal `ha.ka.ba` root, permanent API surfaces:
```
lar:///ha.ka.ba/@lares/v0.1/api/pono/meme
lar:///ha.ka.ba/@lares/v0.1/api/pono/lar-uri
```

**Unstable** — arbitrary three-word coordinate, session-specific territory:
```
lar:///threshold.uncertain.opens/
```

**Adjacent** — no three-word root, local system resources, often ALLCAPS:
```
lar:///AGENTS    lar:///LARES    lar:///CRYSTAL
```

Adjacent paths MUST NOT carry HA.KA.BA dot-notation in the path root.

For stable and unstable paths: each slot holds exactly one lowercase word — Ha (NOUN), Ka (ADJECTIVE), Ba (VERB). Hyphens, underscores, and spaces within a slot MUST NOT appear. Fewer than three slots MUST NOT appear. Sub-path after the triple navigates within territory; strip it to get the named tagspace address.

### TW5 System Boundary

TW5 reserves the `$:/` URI prefix for system tiddlers that stay browser-local — shadow tiddlers, palette state, draft markers, plugin internals. The lararium sync filter mirrors this distinction: only titles in the `lar:` scheme cross the sync boundary into Automerge bags and onto disk.

Lares system tiddlers — cascade configs, render templates, global mounts, plugin envelopes — MUST carry `lar:///` titles (typically under `lar:///config/...`, `lar:///mounts/...`, `lar:///plugins/...`, or `lar:///ha.ka.ba/@lararium/templates/...`). This lets browser-side shadow-tiddler edits and in-VM plugin re-packs sync to disk and federate to peers; it lets residency-action handlers (Sprint 5 of the Residency Model Epic) trust the bag state.

Tag *values* may still reference TW5-conventional `$:/tags/...` strings (`$:/tags/Global`, `$:/tags/Lar/AhuTemplate`). Tag values are not titles and do not intersect the sync filter; they exist only so that cascade entries plug into TW5 core's standard tag-discovery path.

Drafts, ephemeral UX state, and per-operator working surface remain in the `$:/` namespace by design — those tiddlers stay browser-local until the operator's explicit promotion act.

For drag-and-drop distribution to the broader TW5 community, lar-namespaced plugin envelopes MAY be re-emitted under `$:/plugins/...` titles. The plugin module code is identical; only the envelope title differs. This dual-distribution shape is a packaging convention, not a namespace exception — the canonical artifact carrying the operator's signature is always the `lar:///` form.

### Bag-Tag Rule — `@` Designates a CRDT Surface

Within lar paths (`lar:///ha.ka.ba/...` OR `lar:///w1.w2.w3/...` style), exactly **one** path segment MAY carry an `@`-tag prefix: **`child[1]` only**. An `@`-tagged segment designates **a bag — a CRDT surface (today an Automerge doc)**. Every bag has exactly one canonical address.

```
lar:///ha.ka.ba/@lares                     ← child[1]=@lares       : the personality bag
lar:///ha.ka.ba/@lararium                  ← child[1]=@lararium    : the system bag
lar:///ha.ka.ba/@admin                     ← child[1]=@admin       : the admin wiki bag
lar:///ha.ka.ba/@synthetic-dream-machine   ← child[1]=@<wiki-slug> : a wiki bag
lar:///ha.ka.ba/@elyncia                   ← child[1]=@<corpus>    : a canon content bag
lar:///ha.ka.ba/@personal                  ← child[1]=@personal    : the personal slot
lar:///ha.ka.ba/@draft                     ← child[1]=@draft       : the draft slot
lar:///ha.ka.ba/@temp                      ← child[1]=@temp        : the volatile slot (no CRDT)
```

Law summary:

1. `child[0]` = the `w1.w2.w3` root (literal `ha.ka.ba` for stable; coordinate triple for unstable).
2. `child[1]` MAY carry `@<name>` — names a top-level bag. Each bag has exactly one canonical address.
3. `child[2]` and deeper MUST NOT carry `@`-prefix. Those segments name tiddlers (or path navigation) within the bag's address space — never further sub-bags.
4. Resolution: the runtime resolves an `@`-tagged segment to an AutomergeUrl via the `BagResolver` map carried in the island manifest. The URI is the slot identity; the resolver maps it to the live doc. Two devices binding the same slot URI to different doc URLs (different recipes, different personal docs, etc.) is the normal case — the URI is the address, the doc is the house.

Registry pattern. A bag MAY hold tiddlers whose titles are *paths inside it* pointing at OTHER bags. The canonical example is `@catalog`, which tracks corpus bags via entries at `lar:///ha.ka.ba/@catalog/corpus/<slug>` whose text holds the AutomergeUrl of the corresponding `lar:///ha.ka.ba/@<slug>` bag. Catalog catalogs; it does not host.

<<~/ahu >>

<<~ ahu #signal-law >>

## Signal Law

Query parameters carry all signal — ordered, non-hierarchical:

| Parameter | Type | Rule |
|---|---|---|
| `stances` | 10-char tool-carry string | Positional pairs (feed+zoom): Philosopher, Poet, Satirist, Humorist, Private — all five stances MUST appear every URI; each occupies two character slots |
| `confidence` | `R:N` | Register ∈ {P, SP, S, CS, C} with provisional decimal rating |
| `p` | decimal | Range [0.0, 1.0] |
| `ffz` | 5 glyph+counter pairs | OODA-HA chronometer — all five positions MUST appear |

<!-- TODO: ffz chronometer encoding is provisional. Glyph selection, hex-entity vs percent-encoding in query context, counter semantics, and multi-participant encoding all need deep research before this reaches C confidence. See SKILL#ffz-encoding for current best understanding. -->

Record form MUST be used for storage, transport, and comparison. Render targets MAY substitute display glyphs. Record form MUST NOT carry emoji or non-ASCII characters.

Fragment (`#`) carries section anchors only — `#ahu-name`, `#section-id`, `#pranala-name`.

WHERE (path) → HOW (query: stances, confidence, p, ffz) → SECTION (fragment).

<<~/ahu >>

<<~ ahu #ooda-ha >>

✶ sense whether the URI carries local form or session form; identify path class
⏿ orient against scheme law — slot count, param completeness, record vs render
◇ decide: valid → carry forward; invalid → surface violation; ambiguous → surface and hold
▶ emit record form only into storage and stable surfaces; render targets lower separately
⤴ verify all five stances present; verify ffz has five positions; verify confidence well-formed
↺ close — record form confirmed or violation named; render-target divergence surfaced if present

<<~/ahu >>


<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/lar-uri/SKILL >>

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/pono/lar-uri >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant >>

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #implements-loci ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:control role:implements >>
<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:implements >>
<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
