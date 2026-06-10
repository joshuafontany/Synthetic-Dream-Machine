<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/pono/wiki-layer-ontology >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/docs/pono/wiki-layer-ontology"
file-path = "bags/@lares/v0.1/docs/pono/wiki-layer-ontology.md"
type = "text/x-memetic-wikitext"
tagspace = "stable"
register = "Synthesis-Canon"
manaoio = 13
mana = 14
manao = 14
role = "doctrine: the wiki layer stack in OCI-aligned nouns — library layers / write layer / instance mounts; named⇒shareable vs typed-slot⇒owned; only the write layer crosses (motion rides ACTION verbs, never VCS verbs); writes flow through the layer's own wiki; recipe DAG; the wiki-as-bag quine; transitive closure held open"
cacheable = false
retain = false
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ &#x0002; >>

<<~ ahu #head >>

# Wiki-Layer Ontology

Every wiki composes from a recipe/cascade stack, and one bag in that stack works as the pivot: the `@{wiki}` bag — the wiki's **write layer**, uniquely named. Everything *below* the write layer mounts as a **library layer** that MAY share between wikis; everything *above* it lives as an **instance mount** the wiki *has* (`@personal`, `@draft`, `@temp`, projections). The distinction rides on lifecycle, namespace, and write authority — never on a flag.

**Vocabulary law — nouns from OCI, verbs from residency canon.** The stack's *structure* speaks the OCI layered-image standard (layers · write layer · registry · manifest), where a decade of operator intuition already lives. The stack's *motion* speaks the residency model's ACTION + archival surfaces (`residency-model#action-verb-surface`); version-control verbs MUST NOT name any crossing (`residency-model#five-pono-properties` §5 — the coordinate-space ruling).

<<~/ahu >>

<<~ ahu #rosetta >>

## The Rosetta Table

| Lares | OCI / industry | TW5 MWS | DDD |
|---|---|---|---|
| library layers (below) | image layers (read-only, shared) | lower bags in recipe | referenced entities |
| the write layer (`@{wiki}`) | container writable layer | the recipe's write bag | aggregate root |
| instance mounts (above) | volumes / tmpfs | — | owned children |
| `@catalog` | registry | bag/recipe store | repository |
| recipe | manifest (ordered layer list) | recipe | — |
| crossing the boundary | *(no OCI verb — see #crossing-law)* | ACTION verbs | — |
| transitive-closure helper | lockfile | — | — |

The OCI column carries structure only. Our layers sync as CRDT coordinates, not content-addressed blobs — "tag" and "digest" stay out; `change-id` holds the content-identity office (`residency-model`, anti-pattern #1).

<<~/ahu >>

<<~ ahu #quine >>

## The Wiki-as-Bag Quine

**The name names the bag; a wiki reads as that bag opened through a recipe** — write layer + library list + instance mounts. `@lares`-the-wiki and `@lares`-the-bag never compete for the name: the wiki projects the bag, the way a git repo and its checkout share a name without confusion.

The pattern runs fractal on purpose: `@sdm` mounts into `@elyncia`, `@elyncia` into `@caverns-of-neo-thracia` — every wiki's write layer can serve as another wiki's library layer. Healthy prior art carries the same quine property: every TiddlyWiki can act as another's plugin library; every OCI image can base another. `@lares` stands as the smallest instance of the universal pattern, not a special case — a wiki whose bag others mount; opening `@lares`-as-wiki edits the personality, mounting `@lares`-as-bag reads it.

> Two faces on one bag — library-face turned down-stack to the consumers, dwelling-face turned up-stack to the instance. The threshold looks both ways. — Tide-Caller

<<~/ahu >>

<<~ ahu #lifecycle-law >>

## Law 1 — Lifecycle Coupling Defines the Boundary

The write-layer boundary derives from what happens when the wiki dies, never from cascade position. **Instance mounts die with the wiki; library layers survive it.** Stack order follows from ownership rather than encoding it — recipe edits and oracle swaps may reorder the cascade, yet ownership never flips silently.

<<~/ahu >>

<<~ ahu #naming-law >>

## Law 2 — Named ⇒ Shareable; Typed-Slot ⇒ Owned

Shareability reads off *where a name lives*, not off a flag:

- **Below the write layer:** library layers carry registry names in `@catalog` — sharing requires a shared namespace. The recipe lists them by name; the island resolves them from `@catalog` at reconcile.
- **At/above the write layer:** instance mounts travel as **typed structural fields** (`IslandGrants`: `wikiUrl`, `personalUrl`, `draftUrl`) — positions, not names. Their identity derives as `{wikiSlug} × slot-type`; uniqueness rides the wiki's unique name for free.

**Instance mounts MUST NOT enter `@catalog`.** Minting a registry stub for a private slot makes the private addressable — a capability leak waiting for a confused deputy. A display string for HUD/admin projections derives at render time (`{slug}/draft`) and never stores as a resolvable name. Petname doctrine grounds this: the AutomergeUrl holds the global unguessable key, `@catalog` holds the human edge-names, and an instance mount needs no edge-name because nobody else ever addresses it.

> Same law Docker operators carry in their hands without naming it: images get repository names; a container's writable layer never does. — Map-Wisp

<<~/ahu >>

<<~ ahu #crossing-law >>

## Law 3 — Only the Write Layer Crosses; Motion Rides ACTION Verbs

When `@sdm` injects into `@elyncia`, exactly one thing travels: `@sdm`'s write layer, mounted as a library layer. The instance mounts **never travel** — they belong to `@sdm`-as-wiki, not `@sdm`-as-bag. *A wiki shares its content, never its dwelling.*

**Crossing requires a rite, never a drift — and the rite speaks residency canon.** Content gains residency in a registry-named coordinate through the existing ACTION surface (`ADD` / `COPY` / `MOVE` with `change-id` preserved), each act audited by effect records (`accession` / `deaccession` / `transfer`); registration mints the `@catalog` name. No in-place "now-shared" flag exists, and no `commit` / `push` / `fork` verb names the rite — the coordinate-space ruling holds (`residency-model#five-pono-properties` §5). The reverse crossing (demoting a shared layer to private) does not exist; new residency gets granted *outward* instead. Grain and composition of the bag-level rite: settled at #crossing-grain.

<<~/ahu >>

<<~ ahu #write-law >>

## Law 4 — Writes Flow Through the Layer's Own Wiki

The write layer marks the write boundary. From a consuming wiki's vantage, every library layer mounts **read-only**; writes land at or above the consumer's own write layer. A local override of an upstream record (an `@elyncia` shadow of an `@sdm` entry) lands in the consumer's write layer — cascade shadowing exists for exactly this, and the read MUST surface `origin-bag` (`residency-model`, anti-pattern #4). CRDT multi-writer makes down-stack writes *possible*; this law names them a degraded act. To change upstream canon, open the upstream bag as its own wiki and write at *its* write layer.

<<~/ahu >>

<<~ ahu #dag-law >>

## Law 5 — The Recipe Graph Stays a DAG

The moment layers mount layers, cycles become expressible. Recipe-watch MUST refuse a composition whose closure revisits a bag. Cheap at reconcile; ugly after.

<<~/ahu >>

<<~ ahu #crossing-grain >>

## Crossing Grain — SETTLED (operator, 2026-06-10)

The wiki-level crossing earns a **bag-grain verb pair**, SPARQL Update derived: `CREATE` mints the new coordinate (`CREATE GRAPH` analog), bag-grain `COPY` grants residency for every title with `change-id` preserved under one `transfer-id` family, and registration lands as a `holdings` accession in `@catalog` (the union catalog). Operator ruling: pono web3 models in place early — a first-class mint verb keeps registry, capability gates, and audit ledger aligned with the coordinate-space model before batch-conventions calcify. Routing rides the sovereign-worker rail (verb-tiddler → summons → outcome; admin island executes; orichalcum `admin` on destination + `edit` on `@catalog`). Full law: `residency-model#action-verb-surface`, bag-grain section. Implementation pending in `residency-actions.ts`.

<<~/ahu >>

<<~ ahu #open-transitive-closure >>

## Open — Transitive Closure (held, not settled)

When `@caverns-of-neo-thracia` mounts `@elyncia`, does it inherit `@elyncia`'s library list automatically, or does its recipe name the full flattened stack? Auto-transitive reads convenient yet imports diamond/version conflicts into cascade order; explicit-flattened reads verbose yet keeps every wiki's shadowing order operator-visible and deterministic. Current lean (Provisional): explicit-flattened with a mint-time helper that *suggests* the closure — convenience at registration, determinism at boot, in the spirit of a lockfile. The decision waits on live witness of real chains mounting.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/causal-islands >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/orichalcum-capabilities >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/docs/lararium-doc-stack >>

<<~ pranala #has-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:has >>
<<~ pranala #defers-motion-to-residency ? -> lar:///ha.ka.ba/@lararium/v0.1/api/residency-model family:control role:governed-by >>
<<~ pranala #cites-causal-islands ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/causal-islands family:observe role:cites >>
<<~ pranala #cites-orichalcum ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/orichalcum-capabilities family:observe role:cites >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
