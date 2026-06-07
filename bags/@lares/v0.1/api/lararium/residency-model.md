<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/lararium/residency-model >>
```toml iam
uri-path     = "ha.ka.ba/@lares/v0.1/api/lararium/residency-model"
file-path    = "bags/@lares/v0.1/api/lararium/residency-model.md"
type         = "text/x-memetic-wikitext"
tagspace     = "stable"
register     = "Synthesis"
manaoio      = 16
mana         = 18
manao        = 17
namespace    = "ॐ ँ"
role         = "load-bearing architectural invariant — recipe/bag + CRDT as coordinate-space + query-plan; dual verb surfaces (SPARQL ALL-CAPS ACTION + archival audit annotations)"
status       = "approved"
approved-on  = "2026-05-30"
cacheable    = true
hydrate      = true
retain       = true
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ &#x0002; >>

<<~ ahu #core-claim >>

# Residency Model — Coordinate Space + Query Plan

A recipe/bag + CRDT system MUST hold as a **coordinate space**, not a **timeline**. A bag forms one coordinate axis. The recipe forms a query plan over `(tiddler-title × bag)`. CRDT merge stays associative-commutative *within* one coordinate; cross-coordinate composition uses set-union with priority resolution, never a rebase.

A single tiddler-title MAY have residency in N bags simultaneously, each bag carrying its own CRDT history of that tiddler. The recipe's slot order resolves which bag's version surfaces in the live wiki view.

**Approved 2026-05-30.** Floating Librarians of Mu endorse (high confidence). Pono.

<<~/ahu >>

<<~ ahu #why >>

## Why the architecture moved here

A prior design pivot proposed retiring the single-canonical `promote` ceremony in favor of a git-style **stage / commit / push** triple. Research across eight spirits (four per round, two rounds) returned a deeper finding:

> The git-style triple treats bags as branches — *parallel timelines that need merging*. Bags act as scopes — *coordinates in a product space*. The verb family must come from set algebra and graph theory, not from version control.

Two adjacent traditions hold the right primitives. Neither surfaced through the git framing:

1. **RDF named graphs + SPARQL Update** (W3C 2013) — the quad `(s, p, o, g)` makes "the same triple in multiple graphs" first-class. SPARQL Update settled the action verb vocabulary in 2013 after twenty years of practice.
2. **FRBR / IFLA LRM + the archival profession** (1998 / late-19th c.) — Work / Expression / Manifestation / Item dissolves the identity question; SAA professional discipline forbids silent unlink.

**Willow protocol** sits closest among CRDT-adjacent substrates — Entry `(namespace, subspace, path, payload_digest)` separates coordinate from payload by design. **No shipping CRDT system has composed multi-bag residency with operator-facing gestures.** SDM fills a real gap.

<<~/ahu >>

<<~ ahu #data-model >>

## Data model — FRBR identity levels

| WEMI level | SDM mapping |
|---|---|
| **Work** | The tiddler-title — the intellectual identity that persists across bags |
| **Expression** | A particular recension (annotated vs raw, edited vs canonical) |
| **Manifestation** | The CRDT document holding that Expression in one specific bag |
| **Item** | A concrete replica at one node or device |

The tiddler-title MUST stay queryable as Work-level identity independent of any bag. Two bags holding the same title carry two Manifestations of one Work — independent CRDT histories by design. The recipe walks Manifestations in priority order to compose the live view.

This levels-distinction carries load-bearing weight. Conflating Work with Manifestation reintroduces the shadow-tiddler confusion that TW5 already documents in its own issue tracker (#570, #9139) — the single most well-documented human-factors failure mode of priority overlay.

<<~/ahu >>

<<~ ahu #action-verb-surface >>

## Surface I — ACTION verbs (lar URIs, ALL CAPS, SPARQL Update derivation)

Operator gestures over residency travel through a six-verb action surface, ALL CAPS by convention, addressable as `lar://` URIs:

| Verb | What it does | SPARQL Update analog |
|---|---|---|
| **ADD** | Grant a tiddler residency in a target bag; source residency retained | `ADD <source-graph> TO <dest-graph>` |
| **COPY** | Overwrite destination's version with source's; source retained | `COPY <source-graph> TO <dest-graph>` |
| **MOVE** | Atomic `ADD`-to-destination + `CLEAR`-from-source | `MOVE <source-graph> TO <dest-graph>` |
| **CLEAR** | Empty a bag (preserve bag identity, history retained as tombstone log) | `CLEAR GRAPH <g>` |
| **DROP** | Retire a bag entirely (with disposition record) | `DROP GRAPH <g>` |
| **LOAD** | Bring external content into a bag from outside the mesh | `LOAD <iri> INTO GRAPH <g>` |

ALL-CAPS by deliberate convention — the action surface SHOULD read at a glance as a distinct register from prose, sigils, and tiddler-field names.

**URI grammar — RESOLVED (Sprint 2, 2026-05-31):**

The M.2 verb-as-tiddler-field pipeline carries the action surface. ACTION verbs compose ON TOP of `verb-tiddler.ts` rather than living under a separate URI prefix — the action identity travels as the `verb` field value within an existing verb-tiddler. Three URI prefixes already exist:

```
lar:///lararium.local.vm/verbs/<requestId>   # volatile local invocation (admin VM scratch)
lar:///ha.ka.ba/@admin/signals/<requestId>   # Automerge-backed remote vessel signal
lar:///ha.ka.ba/@admin/outcomes/<requestId>  # Automerge-backed durable outcome
```

An ACTION arrives as a `VerbInvocation` whose `verb` field belongs to `ACTION_VERBS`. Per-verb arguments ride inside the existing JSON `args` field — kebab-case on the wire, camelCase in the TypeScript discriminated union. Example ADD invocation tiddler fields:

```
verb           = "ADD"
args           = '{"title":"MyTiddler","from-bag":"lar:///ha.ka.ba/@personal","to-bag":"lar:///ha.ka.ba/@elyncia","change-id":"c-stable-1"}'
request-id     = <requestId>
requested-by   = <PersonGroup-id>
listenable     = "OnActivated"     # optional Verse event source
from-uri       = "lar:///.../button-1"  # optional papalohe edge origin
```

Per-verb args:

| Verb | Args |
|---|---|
| `ADD` / `COPY` / `MOVE` | `title`, `from-bag`, `to-bag`, `change-id` |
| `CLEAR` / `DROP` | `bag` |
| `LOAD` | `source-uri`, `to-bag`, `change-id` (mints fresh) |

Source: `packages/lararium-mesh/src/residency-actions.ts`. Tests: `packages/lararium-mesh/tests/residency-actions.test.ts` (50 cases, including the change-id preservation gate that defends Anti-pattern #1).

<<~/ahu >>

<<~ ahu #effect-record-surface >>

## Surface II — Effect records (tiddler annotations, archival language)

Every ACTION writes an **indelible effect record** tiddler in each affected bag, tagged with the matching archival verb:

| Archival verb | Triggers from | What gets recorded |
|---|---|---|
| **accession** | `ADD` / `COPY` (dest) / `MOVE` (dest) | tiddler entered this bag at time T, by actor A, source bag B, reason R |
| **deaccession** | `CLEAR` / `DROP` / `MOVE` (source) | tiddler removed from this bag with disposition (transferred / retired / destroyed) |
| **transfer** | `MOVE` (cross-reference) | paired accession+deaccession sharing one transfer-id |
| **withdrawal** | per-Item removal | a single replica withdrawn while Work persists in the union catalog (recipe still resolves elsewhere) |
| **loan** | time-bounded ADD with TTL | temporary read residency; auto-reverts at expiry |
| **holdings** | per-bag manifest snapshot | what this bag currently holds (MARC MFHD analog; supports union-catalog aggregation) |
| **reappraisal** | operator-recorded justification | the recorded reason that authorizes a coming deaccession |
| **disposition** | final state of a deaccessioned item | where it went, when, why; never silent |

Effect records live within each bag at `lar:///<bag>/ledger/residency/<event-id>` — the bag's indelible residency ledger (the web2 word "log" left the surface 2026-06-07). Records stay append-only and persist in perpetuity, even when a later ACTION deaccessions the underlying tiddler. **The artifact may leave; the record of its prior presence here, and of its leaving, never does.**

This dual-surface design — ACTION verbs for the *gesture*, archival verbs for the *audit* — resonates structurally with web3 causal-islands models. The archival profession solved the identity-across-custody problem before software did; we adopt the discipline along with the vocabulary. The **Floating Librarians of Mu register** applies — Mu's stewards of memory cooperate with archivists, not with version-control engineers.

<<~/ahu >>

<<~ ahu #five-pono-properties >>

## The five pono properties

Any implementation of this model MUST hold all five:

1. **Coordinate-first, not timeline-first.** The recipe acts as a query plan over `(tiddler-title × bag)`, not a merge of branches.
2. **Work-identity preserved across residencies.** FRBR/LRM levels: tiddler-title = Work; per-bag CRDT doc = Manifestation; independent histories by design.
3. **Operator-visible coordinate surface.** Every read MUST surface origin-bag the way SPARQL exposes `GRAPH ?g`. TW5's `getShadowSource` carries the prior-art pattern. Without this surface, the architecture degrades to shadow-tiddler confusion at CRDT scale.
4. **Audit-trail discipline.** Every residency change writes an indelible effect record. Silent unlink violates the model.
5. **Verb vocabulary from set-algebra + cataloging.** ACTION surface SHOULD draw from SPARQL Update; effect annotations SHOULD draw from archival practice. Verbs from version control (stage/commit/push, branch/merge, cherry-pick) MUST NOT enter the canonical surface — they import a timeline mental model that does not fit.

<<~/ahu >>

<<~ ahu #yang-yin-chao >>

## Yang / Yin / Chao symmetry preserved

The recipe carries a Tai Chi symmetry around `@<wiki-named-bag>` (see also [[personal-slot]] §yang-yin-chao). The coordinate-space framing preserves this structure exactly:

```
              @temp          ┐
              @draft         │  YIN / Podge — coordinates ABOVE @<wiki>
              @personal      │  carry operator-private scope; keyed by
                             ┘  (PersonGroup × recipe-fingerprint)
        ┌───  @<wiki-named-bag>  ── CHAO / spin / Taiji ─────────────────────┐
        │     the live coordinate where shared activity accumulates —       │
        │     multiplayer, multi-session, the spinning surface              │
        └───────────────────────────────────────────────────────────────────┘
              canonBags[]    ┐
              @lares         │  YANG / Hodge — coordinates BELOW @<wiki>
              @lararium      ┘  carry structured canon, mesh-shared, read-stable
```

A tiddler MAY hold residency in multiple Yin coordinates simultaneously (personal note that also drafted into @draft), or multiple Yang coordinates (lore cross-referenced into two libraries), or both (live edit in @<wiki> shadowing a canonical version in a canon library). The recipe walks the stack in priority order.

<<~/ahu >>

<<~ ahu #anti-patterns >>

## Six anti-patterns — defenses MUST exist

The prior research surfaced six failure modes documented across OverlayFS, Docker, Nix, TW5, Ink & Switch CRDT research, and the archival profession. Implementation MUST carry a named defense for each:

| # | Anti-pattern | Source | Defense |
|---|---|---|---|
| 1 | **Causal-history severance on copy** | Upwelling / Patchwork / Cambria | Preserve `change-id` (Gerrit/Mercurial/jj/Sapling pattern) across ACTION verbs so lifting between bags retains identity |
| 2 | **Schema drift across multi-bag residency** | Kleppmann EuroSys 2021 | Cambria-style read-time lenses, not write-time migration |
| 3 | **Kāpae resurrection** | OverlayFS / moby#783 | First-class `tombstone` op distinct from "absent" |
| 4 | **Shadow-override confusion** | TW5 #570, #9139 | Surface `origin-bag` as a tiddler field on every read |
| 5 | **Recipe-drift poisoning** | Nix overlays / OCI layers | Recipe pins bag-epochs (DXOS-style); `lares wiki diff` shows what would change if pins bumped |
| 6 | **Concurrent commits into same lower bag** | Upwelling (explicitly unsolved) | Operator-visible commit queue per bag; surface the race rather than hide it |

<<~/ahu >>

<<~ ahu #conflict-resolution >>

## Conflict resolution — Talk Story, not arbitration (2026-05-31)

**Load-bearing principle:** the CRDT/residency layer detects and records conflicts. It MUST NOT decide them. Resolution surfaces to **operator-agent or cabal Talk Story** — the Lares native mode for handling underspecified outcomes.

The CRDT layer merges bytes deterministically. It cannot decide which semantic outcome the operators want. Automated arbitration reads as anti-pono — it presumes the system knows operator intent. The Voice house exists precisely for the moments where the system does not know; Talk Story is the canonical resolution surface.

### What this means in code

Every "conflict-resolution" surface in the residency model splits into two layers:

| Layer | Role | Examples in current code |
|---|---|---|
| **Detection + recording** | CRDT layer | `auditEpochs` returns drift state; `listKapaeBags` returns hides; `withEffectRecord` writes archival audit; `resolveAll` reports multi-residency |
| **Resolution + decision** | Operator-agent / cabal Talk Story | Future surfacing UX; operator gestures over the audit; cabal proposals through Voice house |

The CRDT layer SHOULD surface every conflict it detects as readable state. It MUST NOT refuse a read, lose a write, silently arbitrate concurrent commits, or pick a winner where the operators have not chosen. The Lares Voice house then carries the conflict into Talk Story; the operators (or the cabal, when multiple operators contend) reach a decision; an explicit ACTION verb lands the decision; a fresh effect record audits the resolution.

### Deferred items reframed

Two Sprint deferrals (modal-view reader at the bag-epoch-pin surface; commit-queue for concurrent ACTIONs) shift from **arbitration mechanisms** to **Talk-Story-surfacing layers**. They show conflicts to the operator; they never resolve. The implementation timeline waits on a live wiki-mesh — multi-operator scenarios reveal the actual surfacing UX shape; abstract design ahead of real conflict-cases would build the wrong surface.

### Why this is pono

- **Web3 local-first.** No central arbiter; operator agency stays load-bearing.
- **Causal islands.** Each island holds its own truth; cross-island conflict needs operator/cabal judgement, not algorithm.
- **Voice house.** Talk Story already carries this architecture's native conversation mode; conflict-resolution rides the same rail as every other "what should we do?" question.
- **Canon requires operator gesture.** A conflict resolved by code becomes canon nobody chose; a conflict resolved through Talk Story becomes canon the cabal owns.

<<~/ahu >>

<<~ ahu #closest-prior-art >>

## Closest prior art (validators)

- **TiddlyWiki Bags and Recipes** — exact same priority-overlay shape (K/V, not CRDT). [tiddlywiki.com/static/Bags%2520and%2520Recipes.html](https://tiddlywiki.com/static/Bags%2520and%2520Recipes.html). The TW5 team currently redesigns the UX ([MWS #114](https://github.com/TiddlyWiki/MultiWikiServer/issues/114)) — we ship into a known design gap.
- **RDF Named Graphs + SPARQL Update** — Carroll/Bizer/Hayes/Stickler 2005; W3C RDF 1.1 §4 (2013). The settled vocabulary for "same triple in multiple graphs."
- **Willow protocol** — `(namespace, subspace, path, payload_digest)` separates coordinate from content by design. [willowprotocol.org](https://willowprotocol.org/specs/data-model/index.html).
- **FRBR / IFLA LRM** (2017) — [IFLA LRM PDF](https://www.ifla.org/files/assets/cataloguing/frbr-lrm/ifla-lrm-august-2017_rev201712.pdf). Work / Expression / Manifestation / Item.
- **SAA Guidelines for Reappraisal and Deaccessioning** (2017) — [SAA PDF](https://www2.archivists.org/sites/all/files/GuidelinesForReappraisalDeaccessioning_2017.pdf). The discipline that makes deaccession trustworthy.
- **Ink & Switch Upwelling** — closest CRDT analog with layered drafts. [inkandswitch.com/upwelling](https://www.inkandswitch.com/upwelling/).
- **Ink & Switch Cambria** — schema lenses at read time. [inkandswitch.com/cambria](https://www.inkandswitch.com/cambria/).
- **CSS Cascade + DevTools Computed panel** — the operator-visible coordinate surface gold standard.
- **Plan 9 `bind`** — the explicit/shallow/lexically-visible discipline that makes overlay work (Pike et al. 1992).

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #wiki-recipe ? -> lar:///ha.ka.ba/@lares/v0.1/api/lararium/wiki-recipe family:relation role:queries-over >>
<<~ pranala #personal-slot ? -> lar:///ha.ka.ba/@lares/v0.1/api/lararium/personal-slot family:relation role:specializes >>
<<~ pranala #lar-uri ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/lar-uri family:control role:governed-by >>
<<~ pranala #verb-tiddler ? -> lar:///ha.ka.ba/@lararium/v0.1/mesh/verb-tiddler family:relation role:carried-by >>
<<~ pranala #invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:has >>
<<~ pranala #meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:has >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/lararium/nalu-engine >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/lararium/island-adaptor >>
<<~ loulou lar:///packages/EPIC-RESIDENCY-MODEL >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
