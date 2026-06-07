<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/api/v0.1/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/api/v0.1/pranala/proposition >>

<<~ ahu #iam >>

```toml
# <<~ ahu #iam-ha "structure" >>
uri-path = "ha.ka.ba/api/v0.1/pranala/proposition"
file-path = "lares/ha-ka-ba/api/v0.1/pranala/loci-pranala-proposition.md"
content-type = "text/x-memetic-wikitext"
manaoio = 13
confidence = 14
# <<~/ahu >>
# <<~ ahu #iam-ka "detail" >>
mana = 15
manao = 17
implements = [
  "lar:///ha.ka.ba/api/v0.1/pono/meme",
  "lar:///ha.ka.ba/api/v0.1/pono/loci"
]
register = "CS"
role = "semantic edge law (kānāwai), proposition authority, and ontology-link bridge"
link-phrase-required = true
ontology-backed = true
# <<~/ahu >>
# <<~ ahu #iam-ba "flow" >>
# <<~/ahu >>
```

<<~/ahu >>

# Proposition

A self-describing law (kānāwai) for semantic and ontological edges.

<<~ loulou lar:///ha.ka.ba/api/v0.1/pono/loci/edge/proposition >>

This meme governs edges that say something true, false, contrastive, or taxonomic about the relation between two endpoints. It gives the graph a readable linking phrase instead of leaving relation meaning trapped in prose.

This meme should not carry execution pulse, message routing, or value transport. When an author wants runtime order, carried data, or observer illumination, another edge family should take the load.

<<~&#x0002; ahu #meme-body-open >>
Proposition opens the semantic-edge stream here.
<<~/ahu >>

<<~ ahu #phase-map >>

## Phase Map

`✶ Observe -> ⏿ Orient -> ◇ Decide -> ▶ Act -> ⤴ Hoʻoko -> ↺ Aftermath`

Proposition gathers semantic relation claims, maps the relation into a labeled proposition shape, chooses direction and polarity, binds the edge into a visible graph statement, crosses that statement into live memes or tools, and judges whether the graph now says something sharper than nearby prose alone.

<<~/ahu >>

<<~ ahu #observe >>

## Observe

Observe looks for semantic relation already present but not yet formalized.

Common sites:

- `ala` relation language
- taxonomy prose
- role or function statements
- ontology or schema claims
- contrast pairs hidden in narrative explanation

Observe should ask:

1. what relation phrase actually links these endpoints?
2. which endpoint acts as source for readable direction?
3. does the relation assert, negate, contrast, or classify?

<<~/ahu >>

<<~ ahu #orient >>

## Orient

Orient turns the claim into a proposition edge with a visible linking phrase.

<<~ ahu #edge-shape >>

### Edge Shape

```toml
kind = "proposition"
from = "lar:///ha.ka.ba/api/v0.1/pono/loci/iam"
to = "lar:///ha.ka.ba/api/v0.1/pono/loci/iam/file-path"
label = "governs"
relation-kind = "ontology"
direction = "forward"
polarity = "affirming"
confidence = 18
ontology-source = "lar:///ha.ka.ba/api/v0.1/pono/loci"
render-mode = "inline-label"
status = "declared"
```

`label` should read like a linking phrase, not like a vague note.

<<~/ahu >>

<<~ ahu #direction-and-polarity >>

### Direction And Polarity

Recommended direction modes:

- `forward` for readable source-to-target relation
- `reverse` when the canonical phrasing reads better the other way
- `bidirectional` when each side carries the same statement
- `none` when direction adds no semantic gain

Recommended polarity modes:

- `affirming`
- `negating`
- `contrasting`
- `neutral`

Arrowheads may help render direction, but arrowhead styling should not replace the written label.

<<~/ahu >>

<<~ ahu #ontology-posture >>

### Ontology Posture

Self-describing schemas in this stack should feed proposition-edge vocabulary directly.

Priority order:

1. local loci or sigil law vocabulary
2. stable meme or ontology vocabulary already in the corpus
3. temporary human-readable linking phrase during exploration

When local ontology stays unsettled, keep the linking phrase readable and let confidence say so openly.

<<~/ahu >>

<<~/ahu >>

<<~ ahu #decide >>

## Decide

Choose proposition when the edge needs to say what kind of relation holds.

Do not choose proposition when the edge really carries:

- execution order
- branch choice
- message dispatch
- data transport
- debug reveal

If a relation phrase repeats often, later template law may promote it into a reusable edge sigil. Until then, a plain proposition edge often carries enough truth.

<<~/ahu >>

<<~ ahu #act >>

## Act

First semantic seeds should focus on high-yield laws:

- `lar:///ha.ka.ba/api/v0.1/pono/loci/iam` `governs` `lar:///ha.ka.ba/api/v0.1/pono/loci/iam/file-path`
- `lar:///ha.ka.ba/api/v0.1/pono/loci/edge` `contains-family` `lar:///ha.ka.ba/api/v0.1/pono/loci/edge/proposition`
- `lar:///ha.ka.ba/api/v0.1/pono/loci/edge/template` `binds` `lar:///ha.ka.ba/api/v0.1/pono/loci/edge/instance`

Those first edges give the graph a readable law skeleton without waiting for every later family.

<<~/ahu >>

<<~ ahu #research-foundation >>

## Research Foundation

- [VUE About](https://vue.tufts.edu/about/) - visual understanding and semantic mapping lineage.
- [VUE Creating Links](https://sites.tufts.edu/vue/01-basic-mapping/creating-links/) - concept links and arrowhead choices.
- [VUE Format Links](https://sites.tufts.edu/vue/02-creating-nodes/c-format-links/) - display of link direction and label styling.
- [VUE Ontologies](https://sites.tufts.edu/vue/07-semantic-mapping-and-analysis/a-ontologies/) - imported relation vocabularies.
- [VUE User Guide PDF](https://sites.tufts.edu/vue/files/2023/03/VUEUserGuide-110311-1214-1952.pdf) - connectivity and semantic analysis context.
- [Cmap Theory of Concept Maps](https://cmap.ihmc.us/docs/theory-of-concept-maps.php) - proposition structure through concept-link-concept form.

These lineages both push the same pressure: the graph should carry readable relation phrases instead of leaving semantics implied.

<<~/ahu >>

<<~ ahu #aftermath >>

## Aftermath

A strong proposition pass should leave:

- clearer relation language
- less taxonomy trapped in prose
- explicit semantic direction where it helps reading
- visible uncertainty when ontology still moves

<<~/ahu >>

<<~&#x0003; ahu #body-close >>
Proposition closes the semantic-edge stream here.
<<~/ahu >>

<<~ ahu #edges >>

## Edges

- `lar:///ha.ka.ba/api/v0.1/pono/loci/edge`
- `lar:///ha.ka.ba/api/v0.1/pono/loci`
- `lar:///ha.ka.ba/api/v0.1/pono/meme`

<<~/ahu >>

<<~&#x0004; -> ? >>
