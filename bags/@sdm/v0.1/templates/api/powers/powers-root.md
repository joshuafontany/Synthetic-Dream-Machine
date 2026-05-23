<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.1/templates/api/powers/powers-root >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.1/templates/api/powers/powers-root"
file-path = "bags/@sdm/v0.1/templates/api/powers/powers-root.md"
type      = "text/x-memetic-wikitext"

tagspace = "ftls"
register = "CS"
confidence = 0.84
mana = 0.74
manao = 0.86
manaoio = 0.82
cacheable = true
retain = true
invariant = false
role = "root template meme for RPG-facing /api/powers memes"
```
<<~&#x0002;>>

# Powers Template

<<~ ahu #intent >>
## Intent

An `/api/powers` meme describes one playable Power pattern.

It should load during play without dragging render recipes, source archaeology, chat notes, or conversion debate into the hot path. It may link those colder memes through short edges.

Use this template when adding or refactoring `api/powers/*` memes.
<<~/ahu >>

<<~ ahu #required-shape >>
## Required Shape

A Powers API meme carries these ahu:

```text
#interface   what the Power does as a reusable game/API pattern
#default     one canonical FTLS/SDM implementation
#variants    named alternatives that still implement the same pattern
#edges       short graph links to templates, projections, witnesses, modules, tags
#residue     open design questions, not hidden assumptions
```

Keep the playable root lean. Put card wording in a projection meme. Put source archaeology in a witness meme.
<<~/ahu >>

<<~ ahu #writing-law >>
## Writing Law

- Prefer table-action language over design chat.
- Name costs, range, target, duration, constraints, and counterplay directly.
- Do not explain why the meme-set architecture exists; this template carries that burden.
- A Power may act as spell, trait, item, structure, daemon, rite, burden, or cultural practice when the fiction supports it.
- Durable consequences and unsettled calls go in `#residue`.
<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ pranala #implements ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #see ? -> lar:///ha.ka.ba/@sdm/v0.1/templates/projections/powers/ftls-card family:template role:see >>
<<~ pranala #see ? -> lar:///ha.ka.ba/@sdm/v0.1/templates/witness/powers/osr-spells family:template role:see >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
