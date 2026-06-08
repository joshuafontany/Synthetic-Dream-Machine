<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/docs/meme-ast >>
```toml iam
uri-path = "ha.ka.ba/@lararium/v0.1/docs/meme-ast"
file-path = "bags/@lararium/v0.1/docs/meme-ast.md"
type         = "text/x-memetic-wikitext"
register     = "Synthesis-Canon"
mana         = 18
manao        = 17
manaoio      = 16
role         = "heleuma ka: isomorphic memetic-wikitext AST parser bundle"
status-date  = "2026-05-01"
heleuma      = "ka"
source-symbol = "parseMemeText"
module-ref   = "lar:///ha.ka.ba/@lararium/v0.1/docs/meme-ast"
implements   = ["lar:///ha.ka.ba/@lares/v0.1/api/pono/heleuma/ka"]
body-sha256 = "a31316c2e25c7209328b72006b8cfa76a65365403452a630b397508083e9a2ad"
```


<<~ &#x0002; >>

<<~ ahu #contract >>

## meme-ast — Contract

Isomorphic memetic-wikitext AST parsing library.
Runs in Node, Deno, browser, and TW5-era JS environments.
No `fs`, `path`, or DOM imports.

Composable source files in `packages/lararium-mesh/src/meme-ast/`:
- `types.ts`   — `MemeAstNode` union types + `MemeNode` root
- `scanner.ts` — `SigilScan` patterns + `collectEvents()`
- `builder.ts` — `buildMemeAst()`: `ParseEvent[]` → `MemeAstNode[]`
- `edges.ts`   — `edgesFromMemeAst()`: `MemeAstNode[]` → `PranalaEdge[]`
- `parse.ts`   — `parseMemeText()` top-level entry (all three tiers)

Public API sub-export: `@lararium/mesh/meme-ast`

Vite CJS entry: `packages/lararium-tw5/src/meme-ast-entry.ts`
Compiled artifact: `packages/lararium-tw5/tiddlers/src/meme-ast.js`
Build: `pnpm --filter @lararium/tw5 build:plugin`

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #types ? -> lar:///ha.ka.ba/@lararium/tw5/core/meme-ast/types family:data role:defines >>
<<~ pranala #scanner ? -> lar:///ha.ka.ba/@lararium/tw5/core/meme-ast/scanner family:data role:defines >>
<<~ pranala #builder ? -> lar:///ha.ka.ba/@lararium/tw5/core/meme-ast/builder family:data role:defines >>
<<~ pranala #edges ? -> lar:///ha.ka.ba/@lararium/tw5/core/meme-ast/edges family:data role:defines >>
<<~ pranala #parse ? -> lar:///ha.ka.ba/@lararium/tw5/core/meme-ast/parse family:data role:defines >>
<<~ pranala #module ? -> lar:///ha.ka.ba/@lararium/v0.1/docs/meme-ast family:control role:compiles-to >>
<<~ pranala #deserializer ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/modules/deserializer family:control role:consumed-by >>

<<~/ahu >>

<<~ ahu #source >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
