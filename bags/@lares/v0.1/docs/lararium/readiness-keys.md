<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lararium/readiness-keys >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/docs/lararium/readiness-keys"
file-path = "bags/@lares/v0.1/docs/lararium/readiness-keys.md"
type  = "text/x-memetic-wikitext"
register      = "CS"
confidence    = 18
mana          = 18
manao         = 17
manaoio       = 17
tagspace      = "stable"
role          = "lararium progressive readiness vocabulary — named shrine-lights, boot doctrine"
cacheable     = true
retain        = true
status-date   = "2026-05-01"
source-symbol = "READINESS_KEYS"
```



<<~ ahu #head >>

# Readiness Keys

Progressive readiness vocabulary for Lararium boot. Replaces a single global
"app ready" gate with a named vector per shrine-light. Each key lights
independently; presence never shares fate with content.

Boot doctrine:

```text
auth → catalog → snapshot → room-content → room-presence
                          ↘ tw-vm → tldraw-doc
                          ↘ mcp-index → disk-projector → kowloon-feed
                          ↘ corpus:<id> ...
                          ↘ projection:<id> ...
```

<<~/ahu >>

<<~&#x0002;>>

<<~ ahu #schema >>

## Schema (machine-readable)

```toml
# Well-known readiness keys — static shrine-lights
well-known = [
  "auth",
  "catalog",
  "snapshot",
  "room-content",
  "room-presence",
  "tw-vm",
  "tldraw-doc",
  "mcp-index",
  "disk-projector",
  "kowloon-feed",
]

# Dynamic key forms — one per live island
# corpus:<id>      e.g. "corpus:sdm-ftls"
# projection:<id>  e.g. "projection:hud-render"
dynamic-forms = ["corpus:<id>", "projection:<id>"]

# Ordering law: auth MUST light before catalog; catalog MUST light before
# room-content and corpus:* keys; presence MUST NOT block content.
# No single "all-ready" gate may be used; UI reveals per shrine-light.
```

<<~/ahu >>

<<~ ahu #law >>

## Readiness Law

* `auth` lights after provider receipt resolves — before any content doc opens.
* `catalog` lights after catalog island materializes — before room/corpus docs open.
* `snapshot` lights after first-paint projection data arrives.
* `room-content` lights after room Automerge doc materializes from IndexedDB or network.
* `room-presence` lights independently — never blocks room-content.
* `tw-vm` lights after TW5 wiki boots and loads from store.
* `tldraw-doc` lights after tldraw projection derives from TW5 state.
* `corpus:<id>` lights per corpus island — independently of other corpora.
* `projection:<id>` lights per projection cache — never grants authority.
* Presence does not share fate with content.
* Corpus readiness does not share fate with shell.
* Projection readiness does not grant authority.

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #to-readiness-ts ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lararium/readiness-keys family:control role:implements >>
<<~ pranala #to-open-phases ? -> lar:///ha.ka.ba/@lararium/tw5/schema/open-phases family:control role:depends >>
<<~ pranala #to-causal-islands ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/causal-islands family:control role:depends >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
