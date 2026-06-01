<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.0/api/power >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.0/api/power"
file-path = "bags/@sdm/v0.0/api/power.md"
type      = "text/x-memetic-wikitext"

tagspace  = "sdm"
register  = "CS"
confidence = 17
mana      = 17
manao     = 17
manaoio   = 16
cacheable = true
retain    = true
invariant = true
role      = "SDM Powers ontology root: causal-island-crossing definition, ha.ka.ba activation address schema, storage class taxonomy"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~&#x0002;>>

# Power — Ontology Root

<<~ ahu #definition >>
## Definition

A **Power** names a noospheric affordance: something the character (or an item, structure, daemon, shrine, or faction) activates to produce a consequence in the world.

Three participants:

| Participant | What it does |
|---|---|
| **Source** | Who or what pays the P cost and initiates the Power: character, item, structure, burden, daemon, shrine, or faction. |
| **Implementation** | The named Power affordance — what crossing attempt occurs, what it costs, what it produces. |
| **Target** | What the Power reaches: inscription, creature, object, ward, or ambient field. |

A Power activates when:
1. A grant permits it — learned spell, memorized pattern, stored charge, pact, relic, shrine consent, or life-force expenditure.
2. The P cost pays from Life, Ability Points, Mana, or a named external stream.
3. The fiction permits the consequence to land.

<<~/ahu >>

<<~ ahu #overcharge >>
## Overcharge and Danger

**P Spent > Character Level = DANGEROUS.** Spending more P than the character's current Level triggers a Corruption or Wild Magic Danger Roll. Affinities, negative-Level burdens, and other scalars may modify effective P spent or effective Level — always compare final values.

The standard overcharge vector: **x2 Power** activates a named rider effect. Beyond that, overcharge vectors vary wildly per implementation — stepped multiples, flat additions, bizarre costs, non-numeric conditions. Each Power names its own shape.

<<~/ahu >>

<<~ ahu #activation-uri >>
## Activation URI — Abstract Guidance

Each Power already carries a stable tagspace address at `lar:///ha.ka.ba/@sdm/v0.0/api/powers/**`. That address serves as the entry, tracking, and query node — no additional activation URI schema needs to land on individual Power memes.

When a session or routing context needs a **hostful or hostless activation URI** for a live Power crossing event, generate it against the ha.ka.ba three-slot grammar. Full guidance and rationale live at `lar:///ha.ka.ba/@sdm/v0.0/docs/power-ontology`. Apply that guidance in context; do not bake it into Power memes or templates.

<<~/ahu >>

<<~ ahu #storage-taxonomy >>
## Storage Class Taxonomy

Four storage classes name where a Power pattern homes between activations:

| Class | What it means |
|---|---|
| **Trait** | In the character: trained reflex, magical literacy, innate attunement. |
| **Item** | In a physical carrier: grimoire, lens, relic, charged object. |
| **Structure** | In an ambient node: archive service, ship-daemon, shrine interface, faction rite. |
| **Burden** | Imposed at cost: curse, compulsion, debt, obligation — often involuntary. |

A single Power implementation MAY home in multiple storage classes.

<<~/ahu >>

<<~ ahu #residue >>
## Residue

- **Affinities and Level modifiers.** Affinities, negative-Level burdens, and other scalars affect effective P spent or effective Level. A full modifier list belongs in the character sheet and referee guidance memes, not here.
- **Initiator ambiguity.** When a player describes "I use my grimoire lens to read the rune," the source may be the character (paying P from Life) or the item (paying from charge). The referee calls which source applies. A referee-guidance meme may settle the default posture.
- **World-Powers / NPCs as source.** An inscription that reads back, a ward that triggers, a daemon that channels force — non-character sources activating Powers. The taxonomy handles this; a separate `api/world-power` root or explicit NPC-source convention may follow.
- **Burden-class involuntary activation.** A Burden-class Power may activate against the character's will, with the Burden as source. Resolution posture for involuntary activation needs explicit ruling.
<<~/ahu >>

<<~ ahu #edges >>
## Edges

<<~ loulou lar:///ha.ka.ba/@sdm/v0.0/interfaces/power >>
<<~ loulou lar:///ha.ka.ba/@sdm/v0.0/api/powers/read-magic >>
<<~ loulou lar:///ha.ka.ba/@sdm/v0.0/api/powers/floating-disc >>
<<~ loulou lar:///ha.ka.ba/@sdm/v0.0/api/powers/shield-ward >>

<<~ pranala #implements ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:implements >>
<<~ pranala #docs ? -> lar:///ha.ka.ba/@sdm/v0.0/docs/power-ontology family:reference role:expands >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
