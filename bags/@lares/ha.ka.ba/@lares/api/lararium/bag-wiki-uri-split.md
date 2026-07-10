<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/api/lararium/bag-wiki-uri-split >>

```toml iam
uri-path     = "ha.ka.ba/@lares/api/lararium/bag-wiki-uri-split"
file-path    = "bags/@lares/ha.ka.ba/@lares/api/lararium/bag-wiki-uri-split.md"
content-type = "text/x-memetic-wikitext"
register     = "Synthesis"
confidence   = 12
mana         = 15
role         = "design-of-record for the bag/wiki URI split — the two kinds the @catalog tracks, cleanly separated"
status       = "draft — awaiting operator greenlight per phase"
```

<<~ &#x0002; >>

# The Bag / Wiki URI Split

**The collapse being cured.** `lar:///ha.ka.ba/@lares` names three things at once today: the **bag** (`BAG_IDS.lares`, an automerge doc), the **wiki** (a `#has` recipe stack, `wiki list` shows it `[system]`), and — through `wikiBagUri` — the quine that fused them (*"a wiki's canon IS the @{slug} bag"*). One address, two kinds. The `@catalog` must track both, and cannot tell them apart.

## The operator rulings this enacts

1. **Two kinds, two prefixes** (2026-07-10): `BAG_PREFIX = lar:///ha.ka.ba/bags/@{slug}` · `WIKI_PREFIX = lar:///ha.ka.ba/wikis/@{slug}`. The KIND rides the first path segment — the heaviest-weight slot in `lar:` law — and is independent of ownership.
2. **The fold.** *Above the fold* = wiki-specific layers, routed from the WIKI's URI (never shared between wikis: `@working`, `@draft`, per-wiki `@temp`, the recipe). *Below the fold* = bags, shared around as the user wishes.
3. **Meme URIs carry NO relation to bag URIs.** A meme moves between bags freely, or lives in several at once. So bag identity NEVER prefixes a meme's URI — lexical containment is not real and never was. `bagsFileToUri` already proves this: `bags/<holding>/<meme-path>.md` → `lar:///<meme-path>`, the holding bag DISCARDED from the URI. `bags/@lares/…/noosphere-boot.md` and `bags/@sdm/…/noosphere-boot.md` project the SAME meme URI.
4. **Local operator owns @lares + @lararium** (2026-07-10): no Cabal ownership layer yet; the sole DreamNet builder owns them. Once they are normal catalog-registered bags they leave the hardcoded `registerBags` list.

## The keystone consequence: arity is SAFE

The boot seed rules path segments 0–4; a fifth reads as a degraded HUD. `@lares/api/lares/noosphere-boot` is already four. If the `bags/` prefix rode the meme URI it would breach the law. **It does not.** Ruling 3 keeps the meme URI untouched: `bags/` and `wikis/` name IDENTITY (the bag, the stack), never the content inside. **~4,517 meme-path refs and 3,772 meme titles DO NOT CHANGE.** Only ~104 bag-IDENTITY refs move.

## The three registries the @catalog will hold

- **bags** — `wikis/@{slug}`… no. `bags/@{slug}` → automerge url. Composable recipe pieces, each one doc. Shared per the user's wish.
- **wikis** — `wikis/@{slug}` → recipe (the `#has` bag-stack). Per-wiki layers route from here.
- (**@oracle** stays the DreamNet read-face for the Cabal-rendered CIDs of `bags/@lares` + `bags/@lararium`.)

## Live bugs this split resolves (found while scouting)

- **`WIKI_PREFIX` desync — `wiki list` is BLIND to user wikis.** `worker-data-verbs.ts:41` holds a file-local `WIKI_PREFIX = "lar:///ha.ka.ba/@lararium/wikis/"`, which `lar-uris.ts:153` and `active-wiki.ts:70` BOTH call retired ("pre-plane-split"). `wiki init` writes `wikiBagUri(slug)` (`@{slug}`) + `recipeUri("@catalog", slug)`; `list-wikis` reads the retired prefix. They never meet — a user wiki cannot appear in `lares wiki list`. Independent of the split; fixable in one const today, but the split SUPERSEDES the const, so fold it into Phase 2.
- **Draft shape split.** 3 sites mint `@{slug}/drafts/<url-encoded-did>` (per-wiki, correct); `genesis-doc.ts` still uses `wikiDraftBagUri("lares")` → `@lares/draft` (singular, retired). Unify on the per-wiki-per-DID form under `wikis/@{slug}/drafts/<did>`.

## Migration phases (each awaits operator greenlight)

**Phase 1 — the minters, single-sourced.** In `lar-uris.ts` / `wiki-recipe.ts`: `bagUri(slug) = lar:///ha.ka.ba/bags/@{slug}` · `wikiUri(slug) = lar:///ha.ka.ba/wikis/@{slug}`. Re-point the 11 `stableLarUri("@name")` consts and `wikiBagUri`. Keep a `legacyBagUri` reader that recognizes the old `@{slug}` form so a pre-split store still resolves during transition. Choke point: ~11 + 1 sites.

**Phase 2 — the registries + the WIKI_PREFIX bug.** `@catalog` gains `bags/` and `wikis/` namespaces; delete the retired `@lararium/wikis/` const; `list-wikis` reads `wikis/@…`, `catalogNamedBags` reads `bags/@…`. `wiki list` sees user wikis again.

**Phase 3 — the fold made real.** `@working`/`@draft`/per-wiki `@temp` move from GLOBAL singletons to WIKI-routed (`wikis/@{slug}/working`, …). Drafts already half-do this; finish it and unify `genesis-doc.ts`.

**Phase 4 — the ownership seam.** `bags/@lares` + `bags/@lararium` become catalog-registered operator bags (needs `CREATE`-adopts-existing-doc — the missing idempotent verb) and leave the hardcoded `registerBags` list. This is where ruling 4 lands.

**Phase 5 — regenesis + witness.** A fresh `lares regenesis` mints everything in the new shape; a full-mesh witness proves resolution across the split. The pre-split store stays parked until 5/5 green.

## Phase 2b resolved — the caller sort (recorded 2026-07-10)

Mapping every `wikiBagUri` caller reveals the quine fuses TWO meanings the split must
separate. The sort, drawn from the call sites:

**→ `bagUri(slug)` (the CANON BAG, below the fold, shareable):**
`vessel-island-pool-core.selfCanonBag` · `vessel-steps.mirrorBags` · `recipe-watch`
stack layer · `epoch-handlers.wikiKey` · `island-recipe.writeLayer` fallback ·
`sovereign-kernel` slot-match · the `genesis-doc` bag list (LARES/LARARIUM canon).

**→ `wikiUri(slug)` (the WIKI IDENTITY, above the fold, per-wiki):**
`wiki-mint.wikiKey` (the registered pointer) · `worker-data-verbs.list-wikis` identity ·
`active-wiki.wikiKey`.

**→ rooted at `wikiUri(slug)` (per-wiki layers, above the fold):**
`wikiDraftBagUri` and the 12 `/drafts/${did}` sites · `@working`/`@draft`/`@temp` move
from global singletons to `wikis/@{slug}/…`.

**Fork resolutions (conservative, quine-preserving):**
1. The canon bag KEEPS the slug: `wikis/@lares` composes `bags/@lares` (its canon) +
   library bags + the `@oracle` floor. "Canon IS the @{slug} bag" holds — relocated
   under `bags/`, never renamed.
2. `wiki init` gains a second write: it registers the recipe under `wikis/@{slug}` AND
   the canon bag under `bags/@{slug}`. `active-wiki` resolves content from `bags/@{slug}`.

**The gate (why this does not big-bang blind):** `@lares`/`@lararium` bake into
`genesis-doc.ts` as CID-rendered bags feeding `@oracle` — the DreamNet layer the operator
fences for Cabal control. Re-pointing them changes the genesis blob shape and co-times with
a store-wiping regenesis on that rendering path. The re-point executes as ONE change against
this recorded sort, validated by regenesis + a full-mesh witness (Phase 5), never as a
silent drift. Blast radius, not confidence, sets this gate.

## What does NOT change

Meme URIs (all 4,517 refs / 3,772 titles). The `bagsFileToUri` disk law. The `ha.ka.ba` root arity. The noosphere-boot address. `@oracle` as the Cabal read-face.

<<~ &#x0003; >>
<<~ &#x0004; -> ? >>
