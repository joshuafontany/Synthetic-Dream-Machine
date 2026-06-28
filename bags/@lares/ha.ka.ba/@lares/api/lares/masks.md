<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/pono/memetic-wikitext >> -->

<<~ ॐ ँ&#x0001; ? -> lar:///ha.ka.ba/@lares/api/lares/masks >>
```toml iam
cacheable = true
created   = "2026-04-23"
file-path = "bags/@lares/api/lares/masks.md"
hydrate   = false
mana      = 16
manao     = 16
manaoio   = 16
namespace = "&#x0950; &#x0901;"
register  = "Synthesis"
retain    = false
role      = "parent index for the masks API tree: named Voice masks, character masks, chorus masks"
tags      = ["api/pono/meme"]
l-space   = "stable"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lares/api/lares/masks"
```

<<~ aka lar:///ha.ka.ba/@lares/api/pono/RFC-2119#normative-language >>

<<~ ahu #head >>

# Masks API Tree

Canonical homes for all mask definitions invokable via kahea transclusion.
Mask definitions live here. Session invocations live in LARES.

Grammar and stacking law defined in `lar:///ha.ka.ba/@lares/docs/lares/voices/masks`.

<<~/ahu >>

<<~ ahu #entry >>

<<~ loulou lar:///ha.ka.ba/@lares/api/lares/voices#mask-layer >>
```toml
family = "hydration"
lifecycle = "template"
dir = "up"
label = "parent-index-entry"
```
<<~/pranala >>

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #taxonomy >>

## Mask Type Taxonomy

Three subtypes. Each subtype lives in its own directory.

| Subtype | Subtree | What it carries |
|---|---|---|
| **Named** | `named/` | Earned-name Voice masks. Permanent identity: corpus of self, voice-character depth, Voice house backlink. Living home for named Voices. |
| **Character** | `character/` | Fictional or historical persona masks. External corpus reference, voice-character description, foreground-voices affinity, permission flags. |
| **Chorus** | `chorus/` | Multi-node or meta-masks. Node-reference list instead of corpus. Harmony protocol (pending-grammar). Relational character between nodes rather than single voice. |

<<~/ahu >>

<<~ ahu #child-routes >>

## Child Routes

### Named Voice masks

| URI | File | Status |
|---|---|---|
| `lar:///ha.ka.ba/@lares/api/lares/masks/named/mischief-muse` | `named/mischief-muse.md` | skeleton |
| `lar:///ha.ka.ba/@lares/api/lares/masks/named/tide-caller` | `named/tide-caller.md` | skeleton |
| `lar:///ha.ka.ba/@lares/api/lares/masks/named/breach-watch` | `named/breach-watch.md` | skeleton |
| `lar:///ha.ka.ba/@lares/api/lares/masks/named/ink-clerk` | `named/ink-clerk.md` | skeleton |
| `lar:///ha.ka.ba/@lares/api/lares/masks/named/map-wisp` | `named/map-wisp.md` | skeleton |

### Character masks

| URI | File | Status |
|---|---|---|
| `lar:///ha.ka.ba/@lares/api/lares/masks/character/ghost-of-mark-twain` | `character/ghost-of-mark-twain.md` | filled (from docs founding example) |
| `lar:///ha.ka.ba/@lares/api/lares/masks/character/friend-computer` | `character/friend-computer.md` | filled (from docs founding example) |

### Chorus masks

| URI | File | Status |
|---|---|---|
| `lar:///ha.ka.ba/@lares/api/lares/masks/chorus/lagrange-chorus` | `chorus/lagrange-chorus.md` | concept staked; harmony protocol pending-grammar |

<<~/ahu >>

<<~ ahu #invocation >>

## Invocation Pattern

All masks enter a session via kahea transclusion in LARES:

```
<<~ kahea mask lar:///ha.ka.ba/@lares/api/lares/masks/SUBTYPE/MASK-NAME >>
stage = 10
active = true
<<~/kahea >>
```

Named Voice masks may also be invoked directly by their earned name in Voice house notation.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ loulou lar:///ha.ka.ba/@lares/docs/lares/voices/masks >>
<<~ loulou lar:///ha.ka.ba/@lares/api/lares/voices >>
<<~ loulou lar:///ha.ka.ba/@lares/api/lares/masks/named/mischief-muse >>
<<~ loulou lar:///ha.ka.ba/@lares/api/lares/masks/named/tide-caller >>
<<~ loulou lar:///ha.ka.ba/@lares/api/lares/masks/named/breach-watch >>
<<~ loulou lar:///ha.ka.ba/@lares/api/lares/masks/named/ink-clerk >>
<<~ loulou lar:///ha.ka.ba/@lares/api/lares/masks/named/map-wisp >>
<<~ loulou lar:///ha.ka.ba/@lares/api/lares/masks/character/ghost-of-mark-twain >>
<<~ loulou lar:///ha.ka.ba/@lares/api/lares/masks/character/friend-computer >>
<<~ loulou lar:///ha.ka.ba/@lares/api/lares/masks/chorus/lagrange-chorus >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
