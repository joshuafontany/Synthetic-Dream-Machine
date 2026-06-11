<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/api/disk-projection >>
```toml iam
uri-path     = "ha.ka.ba/@lararium/v0.1/api/disk-projection"
file-path    = "bags/@lararium/v0.1/api/disk-projection.md"
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
revised-on   = "2026-06-11"
revision-note = "carrier-whole at rest: the .tid-decomposition intent burned to legacy-design-time; grain ladder canonized (disk=whole carrier, doc=record, VM=decomposed)"
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
| **`bags/`** | **seed / canon** — definitions, rules, templates, protocol memes | `@lares`, `@lararium`, `@sdm` (corpus) | disk-leaning (authored seed; round-trips through the store) | whole-carrier `.md` (see #granularity) |
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
3. **The git diff is the operator's signature.** When a residency **MOVE** (the canon ACTION verb) relocates a tiddler between bags, the disk side effect is a file move between surfaces; the diff records the operator's intent.
4. **Debounce.** Projection writes debounce per (bag, tiddler) to bound write amplification (pairs with the outbound save-path debounce).

<<~/ahu >>

<<~ ahu #granularity >>

## Granularity — carrier-whole at rest (operator ruling, 2026-06-11)

**Each stratum carries its own natural grain; grain MUST NOT leak between strata:**

| Stratum | Grain | Why |
|---|---|---|
| **disk** (hands, git, editors) | **whole memetic-wikitext carriers** — one meme, one `.md` | the human edits a document; one meme, one git history |
| **CRDT doc** (database) | record-grain ("tid-sized") | merge granularity, per-ahu fields, addressable `#fragment` children, partial sync |
| **live wiki VM** | decomposed — parent + ahu children as tiddlers | transclusion, per-slot templates, kahea |

**A meme resides on disk as one whole carrier.** Decomposition lives only between the membrane (`memeticWikitextDeserializer`) and the VM; every path back to disk MUST route through the recompose inverse (`expandMemeRefs` / `exportMemeText`). **Fragment files MUST NOT appear on any surface a human edits** — a `#ahu`-grain file on disk constitutes a grain leak (a degraded projection), and the round-trip law holds byte-faithful: anything in the operator's source survives.

*Retired to legacy-design-time (the prior intent here — decompose `bags/` into one `.tid` file per tiddler — burned 2026-06-11):* tid-sized files serve the database, never the operator's hands; managing meme-sized thought as tid-swarms is the exact TW5-community friction that birthed memetic-wikitext. The kupono vectors live in `tests/e2e/carrier-roundtrip.test.ts`.

`wikis/{slug}/` stays memetic-wikitext `.md` on the same law.

<<~/ahu >>

<<~ ahu #projection-routing >>

## Projection routing — tiddler-groups + the standard TW5 path (operator ruling, 2026-06-11)

Write-back routes by **type**, in three rules:

1. **Group rule.** `type: text/x-memetic-wikitext` records form a **tiddler-group** keyed by the carrier parent (a fragment URI belongs to its parent's group). A group MUST write back as **ONE markdown-meme `.md`** — the whole carrier (#granularity). A child's change re-flushes its group, never its own file.
2. **Default rule.** Every other tiddler follows the **standard TW5 path** — `$tw.utils.generateTiddlerFileInfo` semantics, run inside the island's own TW5 VM: `.tid` for tw5-wikitext, content-file + `.meta` sidecar for foreign types, `.json` for unsafe fields. One tiddler, one file, TW5's own format law.
3. **Cascade rule.** Siting and format overrides ride **composable cascade tiddlers inside the wiki** — `lar:///ha.ka.ba/@lararium/config/disk-paths` and `…/config/disk-extensions`, first non-empty filter result wins, per-wiki overlays compose through the recipe (the proven `config/bag-paths` pattern; the lar-native mirror of TW5's `$:/config/FileSystemPaths` / `FileSystemExtensions`).

**What this burns:** the hardcoded `canonicalNamedBagRelPath` fragment siting in `bag-paths.ts` (`toRelMd`'s `frag → base/frag.md` ternary — hole H1's birthplace) and `meme-write.ts`'s per-node flush law (every record its own file). The kupono vectors (`tests/e2e/carrier-roundtrip.test.ts` V3/V4) alarm when the burn lands.

<<~/ahu >>

<<~ ahu #cli >>

## CLI capability

The disk-projection Artifact is operator-driven through the `@lares/cli` surface (alongside `lares wiki` / `lares bag` / `lares act`). The live projector runs inside the vessel (TW5 change → debounce → render → write); the CLI exposes the deliberate snapshot/inspect verbs. A bag mirror is configured by `namedBagMirror(bagId, scope, mirrorRoot)`; the island reconstructs it from the serializable `diskMirrors` manifest field.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/api/residency-model >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/api/residency-tiers >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/api/personal-slot >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/api/save-path >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/api/sync-namespace >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/docs/catalog-doc >>

<<~ pranala #has-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:has >>
<<~ pranala #has-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:has >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
