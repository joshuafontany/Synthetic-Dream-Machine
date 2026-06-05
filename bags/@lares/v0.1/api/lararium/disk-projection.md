<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/lararium/disk-projection >>
```toml iam
uri-path     = "ha.ka.ba/@lares/v0.1/api/lararium/disk-projection"
file-path    = "bags/@lares/v0.1/api/lararium/disk-projection.md"
type         = "text/x-memetic-wikitext"
tagspace     = "stable"
register     = "Synthesis"
manaoio      = 15
mana         = 17
manao        = 17
namespace    = "ॐ ँ"
role         = "load-bearing invariant — the node vessel's two on-disk projection surfaces: bags/ (seed/canon) vs wikis/ (projection/output); which bags mirror, which ride the sync mesh"
status       = "approved"
approved-on  = "2026-06-02"
cacheable    = true
hydrate      = true
retain       = true
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ &#x0002; >>

<<~ ahu #core-claim >>

# Disk Projection — Seed and Projection Surfaces

Every **`@bag`** is one Automerge document — one CRDT, one coordinate axis of the recipe query plan (see residency-model). The CRDT store is the mind; **disk is a projection of it**.

The node vessel SHALL be able to write an editable, re-readable **Artifact** of a bag's CRDT state to disk (the "disk projection"), and re-ingest operator edits. This rides **two on-disk surfaces**, split by bag *role* — **source vs output**:

| Surface | Role | Bags | Source of record | Format |
|---|---|---|---|---|
| **`bags/`** | **seed / canon** — definitions, rules, templates, protocol memes | `@lares`, `@lararium`, `@sdm` (corpus) | disk-leaning (authored seed; round-trips through the store) | `.md` now → `.tid` later (see #granularity) |
| **`wikis/{slug}/`** | **projection / output** — instantiated playspace content | `@<wikiSlug>` (per-wiki content) | store-leaning (CRDT authoritative; disk is the rendered artifact) | memetic-wikitext `.md` |

The distinction is **definition vs instance**. An FTLS Power Card *definition* (its rules, its template) lives in `bags/@sdm/`; a character's *filled-in* card and their sheet project to `wikis/{slug}/`. `bags/` is the source of the world; `wikis/` is a running instance's output.

<<~/ahu >>

<<~ ahu #bag-roles >>

## Bag roles — which bags project, which ride the mesh

Disk projection is for **content** bags (definitions + instances). **State / view / runtime** bags carry no `BagMirrorConfig` and so never write to disk — they ride the CRDT sync mesh.

| Bag | Role | Disk surface |
|---|---|---|
| `@lares` / `@lararium` / `@sdm` | seed / canon (definitions) | `bags/` |
| `@<wikiSlug>` | wiki content (instance) | `wikis/{slug}/` |
| `@personal` | operator view-state, wiki-instance-bound | **none** — mesh-synced (see #personal) |
| `@draft` | per-wiki working layer | **none** — runtime |
| `@temp` | volatile session layer | **none** — runtime |
| `@admin` | operator's sovereign authority doc | **none** — private; syncs to operator devices via the admin-doc surface |

The projector enforces this structurally: **a bag absent from the mirror list never writes to disk.** A tiddler MAY also opt out per-record with `disk-projection: no`.

<<~/ahu >>

<<~ ahu #personal >>

## @personal — wiki-instance-bound, off-disk

`@personal` holds the operator's view-state for a specific wiki-instance (`$:/StoryList`, `$:/state/folded/*`, `$:/palette`), keyed per **(PersonGroup × recipe-fingerprint)** (see personal-slot). It is NOT canon (not a `bags/` seed) and NOT wiki content (not a `wikis/` instance projection) — it is a **per-operator overlay**.

It carries **no disk mirror.** Rationale:

- **Disk is per-device; @personal is cross-device.** It follows the operator across their devices through the admin-doc / Keyhive CRDT mesh, not through a disk artifact. Projecting it to disk would conflate the two and invite divergence.
- **It still appears in the projection.** A `wikis/{slug}/` projection renders from the live, recipe-resolved view — and the recipe composes `@personal`'s view-state into that view. So the operator's ordering and folds *show up* in the projected wiki without `@personal` itself ever touching disk.

A future debug-only sidecar projection MAY be added behind an explicit flag; it MUST NOT be the default.

<<~/ahu >>

<<~ ahu #projection-law >>

## Projection law

1. **RENDER, not copy** (Fontany-Fuller-Zelenka). Disk projection re-renders the carrier through the TW5 VM (with fakeDOM) from normalized tiddler records — the same pipeline that boots the browser client. It is never a raw string copy of stored bytes.
2. **Store → disk is one direction; ingest is another.** The projector is unidirectional (store → disk). Re-reading operator edits (disk → store) is a **separate file-watcher / ingest path**. The `writing` guard set prevents the projector's own writes from echoing back through ingest.
3. **The git diff is the operator's signature.** When a residency **MOVE** (the canon ACTION verb — NOT a "promotion ceremony"; that ceremony is retired) relocates a tiddler between bags, the disk side effect is a file move between surfaces; the diff records the operator's intent.
4. **Debounce.** Projection writes debounce per (bag, tiddler) to bound write amplification (pairs with the outbound save-path debounce).

<<~/ahu >>

<<~ ahu #granularity >>

## Granularity — `.md` now, `.tid` later

`bags/` currently holds **one meme per `.md` file** (memetic-wikitext). The intent: **decompose into individual tiddlers** — one `*.tid` file per tiddler (`type = text/x-memetic-wikitext`) — once the full **two-vessel mesh** has arrived and per-tiddler sync is load-bearing. The `lar:` address stays stable across the granularity change (file siting is derived; the address does not move).

`wikis/{slug}/` stays memetic-wikitext `.md` for now; it MAY adopt `.tid` later on the same trajectory.

<<~/ahu >>

<<~ ahu #cli >>

## CLI capability

The disk-projection Artifact is operator-driven through the `@lares/cli` surface (alongside `lares wiki` / `lares bag` / `lares act`). The live projector runs inside the vessel (TW5 change → debounce → render → write); the CLI exposes the deliberate snapshot/inspect verbs. A bag mirror is configured by `namedBagMirror(bagId, scope, mirrorRoot)`; the island reconstructs it from the serializable `diskMirrors` manifest field.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/lararium/residency-model >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/lararium/residency-tiers >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/lararium/personal-slot >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/lararium/save-path >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lararium/catalog-doc >>

<<~ pranala #implements-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:implements >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
