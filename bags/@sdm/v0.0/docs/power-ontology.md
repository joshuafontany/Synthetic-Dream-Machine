<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@sdm/v0.0/docs/power-ontology >>
```toml iam
uri-path  = "ha.ka.ba/@sdm/v0.0/docs/power-ontology"
file-path = "bags/@sdm/v0.0/docs/power-ontology.md"
type      = "text/x-memetic-wikitext"

tagspace  = "sdm"
register  = "CS"
confidence = 16
mana      = 16
manao     = 17
manaoio   = 15
cacheable = false
retain    = true
invariant = false
role      = "operator/dev doc: causal-island-crossing model, ha.ka.ba activation address schema, and overcharge Ka-shift rationale for SDM Powers"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~&#x0002;>>

# Power Ontology — Operator / Dev Doc

This meme carries the DreamNet/operator framing behind the SDM Powers root meme. It does not surface during play. The game-table surface lives at `lar:///ha.ka.ba/@sdm/v0.0/api/power`.

<<~ ahu #causal-island-model >>
## Causal-Island-Crossing Model

In the lararium DreamNet architecture, every agent, object, and ambient node exists inside a **causal island** — a boundary that governs what state can cross in and out without explicit permission. A Power constitutes a declared crossing event: the initiating island expresses noospheric force that crosses another island's boundary and produces a consequence on the target side.

The three participants in `api/power` map directly onto this model:

| Game term | DreamNet term |
|---|---|
| Source (character, item, structure…) | Initiating causal island |
| Power implementation | Declared crossing affordance |
| Target (inscription, creature, ward…) | Target island surface |

**Why this matters for the system:** the causal-island frame determines routing. A Power that crosses two island boundaries (character → item; item → archive;) needs two address hops in the routing layer. The `#activation` block in the root Power meme describes the activation-insstance URI schema.

**Why this stays out of the game table:** players and referees think in fiction. "I use my grimoire lens to read the rune" does not benefit from the word "causal island." The fiction already names the crossing; the routing layer reads it from there.

<<~/ahu >>

<<~ ahu #activation-address-schema >>
## ha.ka.ba Activation Address — Generation Guidance

The ha.ka.ba activation URI guidance here describes an abstract generation pattern — apply it when a routing or session context actually requires a live crossing address. Do not bake it into individual Power memes or templates.

When a routing or session context requires a live crossing address for a Power event, generate it as a three-slot `ha.ka.ba` address: **Ha (NOUN) · Ka (ADJECTIVE) · Ba (VERB)**. Three dot-separated lowercase words, no hyphens or underscores within a slot. Individual Power memes do not carry this — their stable tagspace address (`lar:///ha.ka.ba/@sdm/v0.0/api/powers/**`) serves as the entry and query node.

```toml activation-schema
# Initiating address template:
address-template = "{ha}.{ka}.{ba}"

# Target response address — referee/system-declared on contested crossings:
target-template  = "{ha}.{ka}.{ba}"
```

**Ha — NOUN (initiating territory):** `character`, `item`, `structure`, `burden`, `daemon`, `shrine`, `faction`

**Ka — ADJECTIVE (condition at activation):** `attuned`, `loaded`, `straining`, `forcing`, `cursed`, `charged`, `spent`, `open`, `sealed`, `hostile` — or any implementation-defined single lowercase word

**Ba — VERB (crossing function):** `reads`, `moves`, `holds`, `scans`, `wards`, `dissolves`, `binds`, `traces`, `opens`, `seals`, `marks`, `channels`

### Overcharge Ka-Shift Law

Overcharge shifts Ka, not Ba. The crossing function stays constant; the condition at activation escalates.

```
standard:      character.attuned.reads
overcharged:   character.{ka}.reads    ← Ka is implementation-defined
```

The standard overcharge vector: **x2 Power** → named rider effect. Beyond that, vectors vary per implementation. The schema constrains the address slot; it does not constrain the overcharge vector shape.

### Storage-Class Ha-Shift Law

Storage class shifts Ha. When an item pays the P cost (rather than the character), the initiating territory becomes `item`. Ba and the target-island address remain unchanged.

```
character-initiated: character.attuned.reads
item-initiated:      item.charged.reads
```

Ha-slot ambiguity arises when both the character and an item participate in the cost. The referee names which Ha applies at the table. This residue sits open in `api/power#residue` pending a referee-guidance ruling.

### World-Powers / NPC Sources

Non-character Ha values (`structure`, `daemon`, `shrine`, `faction`, `burden`) cover world-Powers: an inscription reading back, a ward triggering, a daemon channeling force. The schema handles these without modification — the Ha slot shifts to name the world territory. An individual meme tree entry may follow when world-Power memes enter the bag.

<<~/ahu >>


<<~ ahu #edges >>
## Edges

<<~ loulou lar:///ha.ka.ba/@sdm/v0.0/api/power >>

<<~ pranala #implements ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #documents ? -> lar:///ha.ka.ba/@sdm/v0.0/api/power family:reference role:documents >>
<<~ pranala #uri-law ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/lar-uri family:reference role:see >>
<<~ pranala #loci-law ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:reference role:see >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
