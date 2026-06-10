<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/mesh/recipe >>
```toml iam
uri-path     = "ha.ka.ba/@lararium/v0.1/mesh/recipe"
file-path    = "bags/@lararium/v0.1/mesh/recipe.md"
source-file  = "packages/lararium-mesh/src/recipe.ts"
type         = "text/x-memetic-wikitext"
register     = "Synthesis"
mana         = 12
manao        = 12
role         = "RecipeTiddler schema + bag-stack parsing — the stored shape of a wiki's composition record"
tagspace     = "lararium"
cacheable    = true
retain       = true
```
<<~ &#x0002; >>

<<~ ahu #contract >>

## Contract

`recipe.ts` owns the **stored** shape of composition — the tiddler records
that describe a wiki as an ordered bag stack — distinct from `wiki-recipe.ts`,
which owns the **runtime** slot model (`WikiRecipe` / `expandRecipe`) an
island mounts from.

- `RecipeTiddler` — `{ title, label, bagStack, writableBag?, plugins?,
  updatedAt, authority, bag }`. `bagStack` orders lowest priority →
  highest (TW5 convention). `plugins` opt vendored TW5 plugin blobs into
  this recipe's VM — never forced into all VMs.
- `BagTiddler` — the per-bag descriptor (label, read/write policy,
  authority, owning bag).
- `recipeUri(bag, name)` / `bagDescriptorUri(bagId)` — stable addresses
  (re-exported from `lar-uris`).
- `parseBagStack(raw)` / `parsePlugins(raw)` — isomorphic field parsing:
  TW5 space-separated list string or JS/JSON array; `[]` for anything else.

<<~/ahu >>

<<~ ahu #where-recipes-live >>

## Where recipes live

Genesis seeds **no** recipes. User wiki recipes live in the user's
`@catalog` (registry), minted per-wiki by init-wiki and read+written via the
catalog accessor (access≠load). `@lararium` stays pure protocol substrate —
a recipe record landing there reads as a design smell.

A recipe change syncs as ordinary data; the running island still holds the
old mount set, so composition changes surface the reboot-pending alert until
a live recipe-watch lands (composition class — see engine-watch for the
epoch class it contrasts with).

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #wiki-recipe ? -> lar:///ha.ka.ba/@lares/v0.1/api/lararium/wiki-recipe family:relation role:runtime-slot-sibling >>
<<~ pranala #genesis-doc ? -> lar:///ha.ka.ba/@lararium/v0.1/mesh/genesis-doc family:relation role:seeds-no-recipes >>
<<~ pranala #engine-watch ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/engine-watch family:reference role:epoch-class-contrast >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
