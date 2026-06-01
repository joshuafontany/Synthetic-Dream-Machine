<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.1/docs/composition-model >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.1/docs/composition-model"
file-path = "bags/@sdm/v0.1/docs/composition-model.md"
type      = "text/x-memetic-wikitext"

tagspace  = "sdm"
register  = "S"
confidence = 13
mana      = 15
manao     = 18
manaoio   = 14
cacheable = true
retain    = true
invariant = false
role      = "operator/dev doctrine: the Powers composition model — entity + module + component + mount-point, one flat #has verb, pattern/instance two-layer split"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~&#x0002;>>

# Composition Model — Operator / Dev Doc

<<~ ahu #thesis >>
## Thesis

The published SDM/VLG/UVG rules already run a composition system: every Power carries P/R/T/D/Ox, carries tags, seats in a slot, and checks one activation protocol. This model **names what already exists**. It gives each piece an address, connects them with one flat verb, and makes the space navigable. It introduces **no new game mechanics**.
<<~/ahu >>

<<~ ahu #four-nouns >>
## Four Nouns

| Noun | What it names | Address space |
|---|---|---|
| **Entity** | A character, item, Site, monster, culture — a thing that holds modules. | instance layer (TW5 data) |
| **Module** | A pattern that does something: a Power, a Site service, an ability. | `modules/**` |
| **Component** | A facet a module carries: domain, function, hook, posture. | `components/{facet}/{slug}` |
| **Mount-point** | Where a module seats on an entity, and the contract that seating implies. | `mount-points/{trait,item,structure,burden}` |

One verb joins them: **`#has`**. Flat. No `family`, no `role`. The target URI path prefix carries the semantics — `components/` vs `mount-points/` — so the edge needs no metadata. A module `#has` components and `#has` a mount-point; an entity `#has` modules.
<<~/ahu >>

<<~ ahu #two-layers >>
## Two Layers — Pattern and Instance

**Never mix layers. Instance state never enters the Pranala graph.**

- **Pattern (stable).** The Pranala `#has` graph + module/component/mount-point memes. What *Read Magic consists of*. Lives in `bags/@sdm/v0.1/**` as memetic-wikitext.
- **Instance (mutable).** TW5 data fields / YAML. What *Lady Aki currently holds*, which variant, what mutated, what locked. Lives in character/entity data, not in the meme graph.

Instance shape (example):

```yaml
traits:
  - uri: lar:///ha.ka.ba/@sdm/v0.1/modules/powers/read-magic
    variant: archive-handshake
    recognized: [spider-silk-runes, archive-of-kell]
    mutations: [spider-folk-webcraft]
    locks: null
sites:
  - uri: lar:///ha.ka.ba/@sdm/v0.1/modules/sites/lindwyrm
    mount: structure
    mobility: true          # a propulsion component is filled
    capacity-spent: { hull: 4, ward: 2, cargo: 3 }   # OGA upgrade economy
    locks: { overcharge-x4: encrypted }
```
<<~/ahu >>

<<~ ahu #mount-points >>
## Mount-Points — Where Modules Seat

Four mount-points. Each changes how a seated module activates, costs, fails, and leaves. Contracts come from the canonical Vastlands Guidebook rules; this model addresses them, it does not rewrite them.

| Mount-point | Capacity | Source |
|---|---|---|
| **Trait** | 7 + Thought slots (fixed) | engraved in body/mind/aura |
| **Item** | 7 + Strength slots (fixed); container sub-rule lets albums/codices hold many per slot | stored in object |
| **Burden** | 20 slots, −1 to all rolls each | curses, afflictions, overflow |
| **Structure (Site)** | **no fixed count** — base attributes + purchasable capacity (OGA upgrade economy) | shrine, ship, domicile, town ward, vehicle |

**Location merges into Structure.** A forest and an airship are the same Site. **Fixed-vs-mobile is a flat `#has` component** (propulsion/mobility), not a mount-point or a type. A Site gains capacity by spending XP + referee resources per attribute, decoupled from Level (OGA "Golden Age Item Upgrading"). See `lar:///ha.ka.ba/@sdm/v0.1/mount-points/structure`.
<<~/ahu >>

<<~ ahu #progressive-disclosure >>
## Progressive Disclosure — Cards as Doorways

Component pills on a card serve two functions at once: a **mnemonic** on paper (a player learns `[ecm-scan]` as a keyword over sessions) and a **doorway** on screen (clicking the pill opens the component tiddler and a filter of every module that shares it). Printed cards carry the mnemonic; digital cards carry both. The `<<tag-pill>>` procedure renders both faces from one source.
<<~/ahu >>

<<~ ahu #practitioner-state >>
## Practitioner State (open pressure)

What a pattern does depends on who holds it, how they stand, and what they maintain. The instance layer MAY carry stance, relationship-state, and paradigm alongside variant/mutation/lock data. This stays open design pressure from the Hawaiian mana-kapu, Sera base-angle-lever, and Chaos Magick research — not yet settled into architecture.
<<~/ahu >>

<<~ ahu #lineage >>
## Design Lineage (condensed)

| Source | Load it carries |
|---|---|
| Ars Magica | Technique+Form grammar → components compose like verbs+nouns |
| Mage | Paradigm pushes back → maps to Corruption/Danger Roll |
| Jaquays | Follow a tag, discover what shares it → the navigable graph |
| ECS / Rust traits | Composition over inheritance → flat `#has` is `has-a`, runtime-mutable |
| Starfinder / Blades | Entity + typed mounts + build-budget slots → the Site model |
| Earthdawn | Kaer / citadel / flying Kila are one warded place → mobility is a property |

Full lineage table lives in the epic. See edges.
<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ pranala #see ? -> lar:///ha.ka.ba/@sdm/v0.1/epic/powers-composition-rewrite family:reference role:see >>
<<~ loulou lar:///ha.ka.ba/@sdm/v0.1/templates/modules/power >>
<<~ loulou lar:///ha.ka.ba/@sdm/v0.1/mount-points/structure >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/pono/meme >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
