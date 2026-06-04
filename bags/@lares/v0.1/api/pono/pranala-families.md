<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/pranala-families >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/api/pono/pranala-families"
file-path = "bags/@lares/v0.1/api/pono/pranala-families.md"
type  = "text/x-memetic-wikitext"
register      = "CS"
confidence    = 18
mana          = 18
manao         = 17
manaoio       = 17
tagspace      = "stable"
role          = "canonical pranala edge-family taxonomy: eight families, role vocabularies, contract flags"
cacheable     = true
retain        = true
invariant     = true
status-date   = "2026-04-30"
source-symbol = "KNOWN_FAMILIES FAMILY_ROLES FAMILY_CONTRACTS"
```



<<~ ahu #head >>

# Pranala Families

Eight edge families form the relational grammar of the meme graph.
Each family names a category of causal or semantic relationship.
Families carry role vocabularies and contract flags governing validation.

<<~/ahu >>

<<~&#x0002; >>

<<~ ahu #law >>

## Law

Every pranala edge MUST declare a family from `KNOWN_FAMILIES`.
Edges with unknown families fail validation at the `error` severity level.

`roleRecommended` families SHOULD use roles from their canonical vocabulary.
Free-form roles are accepted but generate lint warnings.

`confidenceBounded` families (observe) carry confidence constraints:
the edge confidence must not exceed the source node's confidence.

<<~/ahu >>

<<~ ahu #schema >>

## Schema (machine-readable)

Canonical TOML form. Source of truth for pranala family contracts.

```toml
# Eight canonical pranala families — order is declaration order, not priority
known-families = ["control", "relation", "observe", "dataflow", "message", "constraint", "reaction", "spatial"]

# Role vocabularies — roleRecommended families should use these; others accept free-form
[family-roles]
control    = ["owns", "implements", "extends", "configures", "delegates"]
dataflow   = ["reads", "writes", "streams", "buffers", "pipes"]
message    = ["sends", "receives", "publishes", "subscribes", "replies"]
reaction   = ["triggers", "handles", "observes", "throttles", "debounces", "subscription"]
spatial    = ["contains", "portal", "adjacent", "layer"]
# relation, observe, constraint: accept free-form roles

# Contract flags per family
[family-contracts.control]
role-recommended    = true
confidence-bounded  = false

[family-contracts.relation]
role-recommended    = false
confidence-bounded  = false

[family-contracts.observe]
role-recommended    = false
confidence-bounded  = true

[family-contracts.dataflow]
role-recommended    = true
confidence-bounded  = false

[family-contracts.message]
role-recommended    = true
confidence-bounded  = false

[family-contracts.constraint]
role-recommended    = false
confidence-bounded  = false

[family-contracts.reaction]
role-recommended    = true
confidence-bounded  = false

[family-contracts.spatial]
role-recommended    = true
confidence-bounded  = false
```

<<~/ahu >>

<<~ ahu #family-notes >>

## Family Notes

**control** — structural authority edges (owns, implements, extends).
The primary composition grammar. Most meme graphs lead with control edges.

Role semantics (do not conflate):
- `extends`    — single parent class (Verse single inheritance; one edge per type meme)
- `implements` — interface composition (Verse `interface` keyword; N edges allowed per type meme)
- `owns`       — structural ownership / containment at the type level (not spatial instance placement)

These are all distinct from the ahu-slot tree (`fragment-parent` tiddler field),
which expresses document-level parent/child containment and is not a pranala edge.

**relation** — semantic association without directional authority.
Free-form roles; used when the relationship resists categorization.

**observe** — monitoring, measurement, attention edges.
confidence-bounded: an observer cannot claim more confidence than its source.

**dataflow** — data movement and transformation edges.
Used for reads/writes between corpus, store, projection, and service layers.

**message** — async communication edges.
papalohe/kukali/lele widget wiring uses message family edges.

**constraint** — negation, prohibition, boundary edges.
Kapu, scope limits, access denial. Free-form roles accepted.

**reaction** — event-triggered causal edges (papalohe reaction wires).
`reaction-wire` render mode activates for reaction family edges.

**spatial** — containment, portal, adjacency, layer edges.
Unlocks portal-as-graph-edge and multi-level room navigation.

<<~/ahu >>

<<~ ahu #canvas-colors >>

## Canvas Color Map

Canonical tldraw color per family.
Source of truth for `FAMILY_COLORS` in `packages/lararium-tldraw/src/tldraw-shapes.ts`.

```toml
[family-canvas-color]
control    = "blue"
relation   = "grey"
observe    = "green"
dataflow   = "orange"
message    = "yellow"
constraint = "red"
reaction   = "light-green"
spatial    = "light-blue"
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:implements >>
<<~ pranala #to-pranala ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/pranala family:control role:extends >>
<<~ pranala #tiddler-sigil-family-control ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-family-control family:control role:implements >>
<<~ pranala #tiddler-sigil-family-relation ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-family-relation family:control role:implements >>
<<~ pranala #tiddler-sigil-family-observe ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-family-observe family:control role:implements >>
<<~ pranala #tiddler-sigil-family-dataflow ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-family-dataflow family:control role:implements >>
<<~ pranala #tiddler-sigil-family-message ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-family-message family:control role:implements >>
<<~ pranala #tiddler-sigil-family-constraint ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-family-constraint family:control role:implements >>
<<~ pranala #tiddler-sigil-family-reaction ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-family-reaction family:control role:implements >>
<<~ pranala #tiddler-sigil-family-spatial ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-family-spatial family:control role:implements >>

<<~/ahu >>

<<~&#x0003; >>

<<~&#x0004; -> ? >>
