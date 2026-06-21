<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ ⊙&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/tiddler-record >>
```toml iam
cacheable     = true
file-path     = "bags/@lares/v0.1/api/pono/tiddler-record.md"
mana          = 18
manao         = 18
manaoio       = 18
namespace     = "&#x2299;"
register      = "Synthesis-Canon"
retain        = true
role          = "invariant law: LarTiddlerRecord as the canonical Automerge storage unit; carrier text as projection artifact only"
source-symbol = "LarTiddlerRecord LarTiddlerStore ChangeOrigin LarTiddlerChange"
status-date   = "2026-04-30"
tags      = ["api/pono/meme"]
l-space       = "stable"
type          = "text/x-memetic-wikitext"
uri-path      = "ha.ka.ba/@lares/v0.1/api/pono/tiddler-record"
```

<<~ ahu #head >>

# Tiddler Record — Canonical Schema Law

One tiddler record maps to one Automerge storage unit, always.
Carrier text functions as a projection artifact — not as an Automerge storage unit.

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #law >>

## Law

Every piece of content stored in an Automerge doc (bag) MUST conform to `LarTiddlerRecord`:

```typescript
interface LarTiddlerRecord {
  title:    string;
  fields:   Record<string, string>;   // all fields except title and text
  text?:    string;                   // tiddler body, absent when empty
  revision?: string;                  // opaque version stamp
  bag?:     string;                   // target bag; routed by multi-doc layer
  deleted?: boolean;                  // tombstone flag
}
```

### One record per tiddler. No exceptions.

A parent carrier tiddler and each of its ahu slot children each occupy their own independent record in the Automerge doc. The `ahu-parent` and `ahu-slot` fields describe the graph relationship between tiddlers as TW5 metadata. They do not govern storage granularity.

### Carrier text does not travel to Automerge

Carrier text (memetic-wikitext format) appears only at the projection boundary:

- **Import path (disk → Automerge):** the projection codec parses carrier text into individual `LarTiddlerRecord` entries, then writes each record independently.
- **Export path (Automerge → disk):** the projection codec serializes a set of related records back into carrier text for operator authoring or archival.

The sync adaptor MUST NOT reconstruct carrier text in the write path. The sync adaptor writes `LarTiddlerRecord` entries only.

### Wild Mage operator doctrine

Files on disk that use carrier format (`.md` files in `lares/`, `ftls/`, `elyncia/`, `wtf/`) represent the operator's pre-projection of canonical content. The operator holds the authority to write these directly. The system imports them as individual tiddler records at hydration time. The carrier file on disk does not update automatically when Automerge state changes — that export remains a deliberate operator action.

<<~/ahu >>

<<~ ahu #schema >>

## Schema (machine-readable)

```toml
# Canonical LarTiddlerRecord field names and types
[tiddler-record]
required = ["title", "fields"]
optional = ["text", "revision", "bag", "deleted"]

[tiddler-record.fields]
type        = "Record<string, string>"
excludes    = ["title", "text"]
note        = "array-valued TW5 fields (e.g. tags) join with spaces at the boundary"

[tiddler-record.bag]
type        = "string"
note        = "routed by multi-doc Automerge layer; absent = adaptor default (targetBag)"

# Storage granularity invariants
[storage-law]
unit                  = "one LarTiddlerRecord per tiddler"
carrier-text-in-store = false
ahu-slot-children     = "independent records — not embedded in parent record"
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/tw5/schema/projection-codec >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/tw5/modules/sync-adaptor >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
