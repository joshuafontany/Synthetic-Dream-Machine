<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/tw5/tw5-fields-flat >>
```toml iam
cacheable = true
file-path = "bags/@lararium/tw5/tw5-fields-flat.md"
heleuma   = "ka"
mana      = 17
manao     = 17
manaoio   = 16
register  = "Synthesis-Canon"
retain    = true
role      = "heleuma: TW5TiddlerFields → Record<string,string> normaliser"
type      = "text/x-memetic-wikitext"
uri-path  = "ha.ka.ba/@lararium/tw5/tw5-fields-flat"
```

<<~ &#x0002; >>

<<~ ahu #contract >>

## Contract

`tw5FieldsToRecord(fields: TW5TiddlerFields): Record<string, string>`

Normalises a TW5 runtime field bag to a flat string map:
- `Date` → `toISOString()`
- `Array` → space-joined string
- `null | undefined` → skipped
- all others → `String(value)`

## Why here

Before this file, `wiki-handlers.ts` owned `flattenRuntimeTiddlerFields()` (skipped `bag`) and the retired `promote-handler.ts` (deleted 2026-05-31) owned `flattenPromoteFields()` (skipped nulls). Both converted `TW5TiddlerFields → Record<string,string>` before calling `adaptor.saveFields()`. The `IslandAdaptor` owns the `bag` routing decision; neither caller needed to suppress it. `tw5FieldsToRecord` covers both cases cleanly. Normalisation belongs in the tw5 package alongside `TW5TiddlerFields`.

## Promotion path

`heleuma = "ka"` — this logic carries no node/DOM assumptions. Once the wikitext evaluation surface supports typed field iteration, it MAY promote to a TW5 `\function` tiddler.

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
