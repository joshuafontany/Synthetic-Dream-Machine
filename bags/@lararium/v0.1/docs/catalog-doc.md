<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/docs/catalog-doc >>
```toml iam
cacheable     = true
file-path     = "bags/@lararium/v0.1/docs/catalog-doc.md"
mana          = 18
manao         = 17
manaoio       = 17
register      = "Synthesis-Canon"
retain        = true
role          = "catalog island doc schema — hallway doc naming all rooms, corpora, recipes, snapshots, projection receipts"
source-symbol = "CatalogDoc"
status-date   = "2026-05-01"
tagspace      = "stable"
type          = "text/x-memetic-wikitext"
uri-path      = "ha.ka.ba/@lararium/v0.1/docs/catalog-doc"
```

<<~ ahu #head >>

# Catalog Doc

The catalog island doc — the hallway. Corpus docs are libraries. Room docs are shrines.

The catalog MUST stay small and warmable. It MUST NOT contain full corpus content.
Every cold boot opens the catalog doc before any room or corpus doc.

Boot order:

```text
auth.ready
  → catalog doc opens (injected URL from server meta, never guessed)
    → catalog.ready
      → room/corpus doc URLs resolved from catalog
        → room-content.ready, corpus:<id>.ready (independently)
```

A peer that has not completed auth MUST NOT receive catalog content.

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #schema >>

## Schema (machine-readable)

```toml
schema-version = "0.1"

# CatalogDoc — top-level fields
[catalog-doc]
fields = [
  "schemaVersion: string",
  "corpora: Record<id, CatalogCorpusEntry>",
  "rooms: Record<id, CatalogRoomEntry>",
  "recipes: Record<id, CatalogRecipeEntry>",
  "projections: Record<id, CatalogProjectionEntry>",
  "capabilityHints?: Record<string, string>",
]

# CatalogCorpusEntry
[corpus-entry]
fields = [
  "id: string",
  "docUrl: AutomergeUrl",
  "snapshotUrl?: string",
  "snapshotHeads?: string[]",
  "label?: string",
  "schemaVersion: string",
  "receiptId?: string",
]

# CatalogRoomEntry
[room-entry]
fields = [
  "id: string",
  "contentDocUrl: AutomergeUrl",
  "presenceDocUrl?: string",
  "snapshotUrl?: string",
  "snapshotHeads?: string[]",
  "label?: string",
  "schemaVersion: string",
  "receiptId?: string",
]

# CatalogRecipeEntry — ordered bag stack, low-priority first (TW5 recipe law)
[recipe-entry]
fields = [
  "id: string",
  "bagStack: string[]",
]

# CatalogProjectionEntry
[projection-entry]
fields = [
  "id: string",
  "projectionType: string",
  "sourceIslandId: string",
  "receiptId: string",
  "url?: string",
]
```

<<~/ahu >>

<<~ ahu #law >>

## Catalog Law

* Catalog URL arrives via `<meta name="lararium-catalog">` injected by the server after auth.
* Catalog URL MUST NOT be guessed from localStorage without a prior server-confirmed value.
* Catalog doc must stay small: no tiddler text bodies, no full corpus content.
* Room docs open by looking up `catalog.rooms[roomId].contentDocUrl`.
* Corpus docs open by looking up `catalog.corpora[corpusId].docUrl`.
* Snapshot URLs from the catalog provide first-paint before live doc readiness.
* `capabilityHints` carries policy summaries for derive-visible-rooms; it does not substitute for a capability proof.
* Automerge URL locates bytes; it does not authorize access.

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #to-readiness-keys ? -> lar:///ha.ka.ba/@lararium/tw5/schema/readiness-keys family:control role:depends >>
<<~ pranala #to-open-phases ? -> lar:///ha.ka.ba/@lararium/tw5/schema/open-phases family:control role:depends >>
<<~ pranala #to-causal-islands ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/causal-islands family:control role:depends >>
<<~ pranala #to-auth-providers ? -> lar:///ha.ka.ba/@lararium/tw5/schema/auth-providers family:control role:depends >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
