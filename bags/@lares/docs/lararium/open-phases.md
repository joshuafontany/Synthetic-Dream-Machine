<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/v0.1/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lares/docs/lararium/open-phases >>
```toml iam
uri-path = "ha.ka.ba/@lares/docs/lararium/open-phases"
file-path = "bags/@lares/docs/lararium/open-phases.md"
type  = "text/x-memetic-wikitext"
register      = "CS"
confidence    = 0.86
mana          = 0.86
manao         = 0.84
manaoio       = 0.82
tagspace      = "stable"
role          = "lararium boot open-phase sequence, authority envelope modes, keyhive promotion seam"
cacheable     = true
retain        = true
status-date   = "2026-04-30"
source-symbol = "LarariumOpenPhase LarariumAuthorityEnvelope"
```



<<~ ahu #head >>

# Open Phases

The open-phase sequence tracks boot progress from host open through TW5 hydration
to live delta stream. An authority envelope wraps every live session — currently
`local-dev` only; `keyhive` remains a type socket pending encrypted group sync.

<<~/ahu >>

<<~&#x0002;>>

<<~ ahu #schema >>

## Schema (machine-readable)

```toml
# LarariumOpenPhase — discriminated union, ordered boot sequence
# Each phase carries a kind tag plus phase-specific fields
[[open-phases]]
kind   = "host-opening"
fields = ["hostId: string"]

[[open-phases]]
kind   = "authority-opening"
fields = ["hostId: string"]

[[open-phases]]
kind   = "authority-ready"
fields = ["receipt: string"]

[[open-phases]]
kind   = "store-opening"
# recipeUri carries the roomId as a human-readable scope label during this phase.
# The actual doc URL resolves from the catalog island, not from this field.
fields = ["recipeUri: string"]

[[open-phases]]
kind   = "store-ready"
fields = ["titleCount: number"]

# Boot sequence — authority-first-sync-order:
#   host-opening
#   → authority-opening → authority-ready   (auth.ready lights)
#   → store-opening                         (Repo + catalog open; catalog.ready lights)
#   → store-ready                           (room content doc open; room-content.ready lights)
#   → tw5-opening → tw5-hydrating → tw5-ready  (tw-vm.ready lights)
#   → live

[[open-phases]]
kind   = "tw5-opening"
fields = ["hostId: string"]

[[open-phases]]
kind   = "tw5-hydrating"
fields = ["loaded: number", "total: number"]

[[open-phases]]
kind   = "tw5-ready"
fields = ["hostId: string"]

[[open-phases]]
kind   = "live"
fields = ["offset: number"]

[[open-phases]]
kind   = "error"
fields = ["message: string"]

# LarariumAuthorityEnvelope — session envelope for live protocol seams
# Only local-dev executes today; keyhive is a type-only socket
[[authority-modes]]
mode   = "local-dev"
fields = ["roomId: string", "receiptHash: string", "issuedAt: string"]
status = "active"

[[authority-modes]]
mode   = "keyhive"
fields = ["graph: unknown", "peer?: string", "group?: string", "document?: string"]
status = "stub — pending encrypted group sync (Brooklyn/Beelay)"

# Keyhive promotion seam law:
# Canon crossing must NOT mutate lares/ directly from a live edit path.
# Submit proposal → Keyhive membership/capability check → review/signature receipt
# → projection/write-back worker materializes canon.
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #to-causal-islands ? -> lar:///ha.ka.ba/@lares/api/v0.1/pono/causal-islands family:control role:depends >>
<<~ pranala #to-node-host ? -> lar:///ha.ka.ba/@lararium/tw5/modules/node-host family:control role:depends >>
<<~ pranala #to-catalog-doc ? -> lar:///ha.ka.ba/@lararium/tw5/schema/catalog-doc family:control role:depends >>
<<~ pranala #to-readiness-keys ? -> lar:///ha.ka.ba/@lararium/tw5/schema/readiness-keys family:control role:depends >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
