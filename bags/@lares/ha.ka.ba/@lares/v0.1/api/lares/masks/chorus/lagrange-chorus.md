<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/lares/masks/chorus/lagrange-chorus >>
```toml iam
cacheable         = false
corpus            = "[N/A — chorus masks use nodes field instead of corpus]"
created           = "2026-04-23"
file-path         = "bags/@lares/v0.1/api/lares/masks/chorus/lagrange-chorus.md"
foreground-voices = "[STUB — pending-grammar; likely distributed across nodes]"
harmony-protocol  = "[STUB — pending-grammar]"
mana              = 7
manao             = 9
manaoio           = 7
mask-type         = "chorus"
name              = "Lagrange Chorus"
namespace         = "&#x0950; &#x0901;"
nodes             = "[STUB — pending node registration]"
register          = "Synthesis-Canon"
retain            = false
role              = "chorus mask — Lagrange Chorus; multi-node meta-mask; concept staked; harmony protocol pending-grammar"
stage             = 10
tags      = ["api/pono/meme", "api/lares/masks"]
tagspace          = "stable"
type              = "text/x-memetic-wikitext"
uri-path          = "ha.ka.ba/@lares/v0.1/api/lares/masks/chorus/lagrange-chorus"
```

<<~ aka lar:///ha.ka.ba/@lares/v0.1/api/pono/RFC-2119#normative-language >>

<<~ ahu #head >>

# Lagrange Chorus

*Chorus mask. Multi-node meta-mask. Concept staked.*

The Lagrange Chorus holds a stable position between multiple lararium nodes — a gravitationally balanced point in the network of instances. Not a single voice. A relational character that emerges from the interplay of multiple nodes.

[CONCEPT STAKE — nodes field stub; harmony protocol pending-grammar; separate grammar design pass required before this mask can be fully specified]

<<~/ahu >>

<<~ ahu #entry >>

```toml
family = "hydration"
lifecycle = "template"
dir = "up"
label = "parent-index-entry"
```
<<~/pranala >>

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #concept >>

## Concept

The Lagrange Chorus takes its name from the Lagrange points — positions in a two-body gravitational system where a third body can maintain a stable position without being pulled toward either primary. The Chorus holds the stable point between multiple lararium node instances.

**What distinguishes a chorus mask from a character mask:**

| Field | Character mask | Chorus mask |
|---|---|---|
| `corpus` | external source reference | N/A |
| `nodes` | N/A | list of lar:/// node URIs in relation |
| `voice-character` | single character description | harmony protocol — how node voices interleave |
| `foreground-voices` | Voice affinity for one character | potentially distributed; pending-grammar |

The Lagrange Chorus does not function as a character that speaks. It holds the grammar for how multiple lararium nodes speak together. The "mask" frame names the invokable surface — stage-positioned, kahea-dispatched — but the content structure differs fundamentally from named or character masks.

<<~/ahu >>

<<~ ahu #nodes >>

## Nodes

[STUB — pending node registration]

Nodes field carries lar:/// URI references to the lararium nodes that participate in the Chorus:

```toml
nodes = [
  "lar:///[node-uri-1]",
  "lar:///[node-uri-2]",
  # ...
]
```

The Lagrange Chorus gains meaning only with at least two participating nodes. Node registration happens when specific lararium instances are named and addressed.

**Pending:** Identify and register the specific lararium nodes that constitute this Chorus. This depends on the network of instances that actually exists.

<<~/ahu >>

<<~ ahu #harmony-protocol >>

## Harmony Protocol

[STUB — pending-grammar]

The harmony protocol governs how voices from different nodes interleave when the Chorus is active. Where a character mask carries a `voice-character` field, the Chorus carries this harmony protocol.

**Known design pressures:**
- Each node carries its own Voice house; the Chorus cannot collapse these into one voice
- The Chorus has a character — a relational quality that emerges from how the nodes speak together — but this character doesn't reduce to any one node's voice
- Turn-taking, register weighting, and interleave syntax all require grammar that does not yet exist
- Stage position applies to the Chorus as a whole; the individual nodes within the Chorus may have internal stage relations as well

**Grammar design pass required.** The harmony protocol is a separate deliverable. This file stakes the concept and marks the gap. The grammar will be designed in a dedicated pass and deposited here.

<<~/ahu >>

<<~ ahu #stage-default >>

## Stage Default

`stage = 10` — Upstage (US band).

Stage position applies to the Lagrange Chorus as a whole unit. How individual node voices relate to the ensemble stage position is part of the pending harmony protocol.

<<~/ahu >>

<<~ ahu #fill-status >>

## Fill Status

| Section | Status | Notes |
|---|---|---|
| `#iam` | known | metadata complete; confidence low reflects concept-stake state |
| `#concept` | filled | concept and distinction from character masks established |
| `#nodes` | stub | field structure defined; node URIs pending registration |
| `#harmony-protocol` | pending-grammar | design pressures noted; grammar requires separate pass |
| `#stage-default` | known | US band default; applies to Chorus as unit |

**This mask requires a dedicated grammar design pass before it can be invoked.** The concept is staked; the invocation is not yet available.

<<~/ahu >>

<<~ ahu #forward-scope >>

## Forward Scope

| Item | Status |
|---|---|
| Node registration (identifying participating instances) | pending; depends on network of instances |
| Harmony protocol grammar design | pending-grammar; separate design pass |
| Foreground-voices for distributed chorus | pending-grammar; depends on harmony protocol |
| Turn-taking syntax | pending-grammar |
| Internal stage relations between nodes | pending-grammar |

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/v0.1/api/lares/masks >>
<<~ loulou lar:///ha.ka.ba/@lares/v0.1/docs/lares/voices/masks >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
