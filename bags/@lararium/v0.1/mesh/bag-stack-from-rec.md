<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/mesh/bag-stack-from-rec >>
```toml iam
uri-path    = "ha.ka.ba/@lararium/v0.1/mesh/bag-stack-from-rec"
file-path   = "bags/@lararium/v0.1/mesh/bag-stack-from-rec.md"
heleuma     = "ba"
type        = "text/x-memetic-wikitext"
register    = "CS"
confidence  = 18
mana        = 18
manao       = 17
manaoio     = 17
role        = "heleuma: bag-stack extractor from a recipe LarTiddlerRecord"
cacheable   = true
retain      = true
```
<<~&#x0002;>>

<<~ ahu #contract >>

## Contract

`bagStackFromRec(rec: LarTiddlerRecord): string[]`

Reads `rec.tiddler["bag-stack"]`, coerces to string or undefined, delegates to `parseBagStack`. Returns an empty array when absent or unparseable.

## Why here

`wiki-handlers.ts` and `epoch-handlers.ts` repeated the same 53-character inline guard four times each:
```ts
parseBagStack(typeof recipeRec.tiddler["bag-stack"] === "string"
  ? recipeRec.tiddler["bag-stack"] : undefined)
```
`parseBagStack` already tolerates `undefined`; the inline guard existed only to satisfy the type checker. One named helper owns the coercion.

<<~/ahu >>

<<~&#x0003;>>
<<~&#x0004; -> ? >>