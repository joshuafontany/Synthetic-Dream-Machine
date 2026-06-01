<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.0/templates/api/power >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.0/templates/api/power"
file-path = "bags/@sdm/v0.0/templates/api/power.md"
type      = "text/x-memetic-wikitext"

tagspace = "sdm"
register = "CS"
confidence = 17
mana = 15
manao = 17
manaoio = 16
cacheable = true
retain = true
invariant = false
role = "root template meme for RPG-facing /api/powers default implementation memes"
```
<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~&#x0002;>>

# Powers Template

<<~ ahu #intent >>
## Intent

An `/api/powers` meme carries the default playable implementation and primary API surface for one Power slot.

The reusable affordance contract now lives in `interfaces/powers/*`. The root implementation should load during play without dragging render recipes, source archaeology, chat notes, or conversion debate into the hot path. It may link those colder memes through `loulou` edges.

Use this template when adding or refactoring `api/powers/*` default implementations.
<<~/ahu >>

<<~ ahu #required-shape >>
## Required Shape

A Powers API meme carries these ahu:

```text
#implements         link to one or more `interfaces/powers/*` contracts
#default            one canonical/default implementation; header uses canonical Power name
#default/overcharge optional escalation rider for that implementation
#default/mishaps    optional failure, sacrifice, or interference rider
#storage            trait/item/structure/burden homes for the pattern
#variants           named alternatives that still implement the same pattern
#edges              short graph links to templates, projections, witnesses, modules
#residue            open design questions, not hidden assumptions
```

Keep the playable root lean. Let `#default` read like a power entry, not like a quoted code block. Put the reusable contract and hook scratchpad in an interface meme. Put card wording in a projection meme. Put source archaeology in a witness meme.

`#implements` SHOULD carry one or more `pranala family:control role:implements` edges to `interfaces/powers/*`. Do not duplicate the interface URI in `toml iam`; the edge carries canonical graph truth. One OSR spell or SDM Power may implement one interface or several. Split when one spell name bundles several reusable primitives.

Use `#iam.tags` for ordinary TW5 title-tag membership. Do not mirror ordinary tag membership with Pranala edges. `Power` membership does not travel as `kind/power`; it travels as `<<~ pranala ... -> lar:///ha.ka.ba/@sdm/v0.0/interfaces/power family:control role:implements >>`. Use native TW5 tag links in prose only for descriptive facets such as `[[lar:///ha.ka.ba/@sdm/tags/domain/stuckforce]]`. Filter sugar may later expand `[tag:@sdm[domain/stuckforce]]` to `[tag[lar:///ha.ka.ba/@sdm/tags/domain/stuckforce]]`.

<<~/ahu >>

<<~ ahu #writing-law >>
## Writing Law

- Prefer table-action language over design chat.
- Name costs, range, target, duration, constraints, and counterplay directly.
- Keep `authz` in the interface contract. In implementations, name the grant source only when the default text needs it.
- Put queryable implementation facts in the `#default` TOML, then use the canonical Power name as the visible section header.
- Do not explain why the meme-set architecture exists; this template carries that burden.
- A Power may act as spell, trait, item, structure, daemon, rite, burden, or cultural practice when the fiction supports it.
- Durable consequences and unsettled calls go in `#residue`.
<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ pranala #implements ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #see ? -> lar:///ha.ka.ba/@sdm/v0.0/templates/interfaces/power family:template role:see >>
<<~ pranala #see ? -> lar:///ha.ka.ba/@sdm/v0.0/templates/projections/powers/ftls-card family:template role:see >>
<<~ pranala #see ? -> lar:///ha.ka.ba/@sdm/v0.0/templates/witness/powers/osr-spells family:template role:see >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
