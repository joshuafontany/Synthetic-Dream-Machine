<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/schema/projection-codec >>
```toml iam
uri-path = "ha.ka.ba/@lararium/v0.1/tw5/schema/projection-codec"
file-path = "bags/@lararium/v0.1/tw5/schema/projection-codec.md"
type = "text/x-memetic-wikitext"
register     = "CS"
confidence   = 0.90
mana         = 0.90
manao        = 0.88
manaoio      = 0.86
tagspace     = "invariant"
role         = "invariant law: carrier-codec as projection layer; import and export paths between disk carrier format and canonical LarTiddlerRecord entries"
cacheable    = true
retain       = true
invariant    = true
status-date  = "2026-04-30"
```



<<~ ahu #head >>

# Projection Codec — Law

The carrier codec translates between disk carrier format (memetic-wikitext) and canonical `LarTiddlerRecord` entries. It does not touch the sync path. It does not write to Automerge directly.

<<~/ahu >>

<<~&#x0002;>>

<<~ ahu #law >>

## Law

The projection codec operates at two boundaries only:

### Import boundary (disk → Automerge)

```
carrier file on disk
  → parseCarrier(text, parentUri, parentFields)
  → LarTiddlerRecord[]          ← one record per tiddler (parent + each slot child)
  → Automerge doc (bag)         ← written by hydration layer, not by codec
```

The codec parses. The hydration layer writes. These responsibilities do not mix.

### Export boundary (Automerge → disk)

```
LarTiddlerRecord[] (parent + related children)
  → serializeCarrier(parent, children)
  → carrier text string         ← operator writes this to disk manually
```

The codec serializes. The operator decides when and whether to write to disk. Automerge state does not automatically update disk files.

### What the codec MUST NOT do

- Write to a `LarTiddlerStore` directly
- Accept a `ChangeOrigin` parameter
- Appear in the sync adaptor's write path (`saveTiddler`, `deleteTiddler`)
- Reconstruct carrier text as an intermediate step during a tiddler save

<<~/ahu >>

<<~ ahu #wild-mage >>

## Wild Mage Operator Role

The `.md` files in `lares/`, `ftls/`, `elyncia/`, `wtf/` represent the operator's deliberate pre-projection of canonical tiddler content into carrier format. The operator holds the authority to author these files directly without going through the Automerge write path.

The system treats these files as read-only import sources at hydration time. It does not maintain them as an automatically-updated mirror of Automerge state. Updating them in response to Automerge changes requires an explicit operator-initiated export.

This doctrine makes the Wild Mage's authoring authority explicit rather than implicit — the carrier files reflect the operator's intent at authoring time, not necessarily the current live Automerge state.

<<~/ahu >>

<<~ ahu #api >>

## API Surface (carrier-codec.ts)

```typescript
// Import path
parseCarrier(
  parentUri: string,
  text: string,
  parentFields: Record<string, string | string[]>,
): LarTiddlerRecord[]

// Export path
serializeCarrier(
  parent: { title: string; fields: Record<string, string | string[]>; text: string },
  children: Array<{ title: string; fields: Record<string, string | string[]>; text: string }>,
): string

// Surgical slot editing (export-layer utilities for operator tooling)
replaceCarrierSlot(carrierText: string, slot: string, newBody: string): string | null
removeCarrierSlot(carrierText: string, slot: string): string | null
composeCarrierSlotBody(fields: Record<string, string>, text: string): string
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:implements >>
<<~ pranala #tiddler-record ? -> lar:///ha.ka.ba/@lararium/tw5/schema/tiddler-record family:data role:companion >>
<<~ pranala #source-file ? -> packages/lararium-tw5/src/carrier-codec.ts family:code role:implements >>

<<~/ahu >>

<<~&#x0003;>>

<<~&#x0004; -> ? >>
