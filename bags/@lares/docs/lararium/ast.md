<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/v0.1/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lares/docs/lararium/ast >>
```toml iam
uri-path     = "ha.ka.ba/@lares/docs/lararium/ast"
file-path    = "bags/@lares/docs/lararium/ast.md"
type         = "text/x-memetic-wikitext"
register     = "CS"
confidence   = 0.92
mana         = 0.90
role         = "self-documentation: MemeAstNode union and all parse-time AST node types"
tagspace     = "stable"
cacheable    = true
retain       = true
```
<<~&#x0002;>>

<<~ ahu #contract >>

## MemeAstNode union

Parse-time AST produced by `parseMemeCarrier`. Lives in `@lararium/tw5` so it compiles into the TW5 CJS parser/deserializer modules. No AST trees cross the VM boundary — VMs own projection.

| Type | Description |
|---|---|
| `MemeAstNode` | Union of all node kinds |
| `AhuNode` | `<<~ ahu #frag >>` … `<<~/ahu >>` section |
| `PranalaNode` | `<<~ pranala #id ? -> uri family:X role:Y >>` edge declaration |
| `PranalaSugarNode` | Shorthand pranala (`<<~ loulou uri >>`, `<<~ aka uri >>`) |
| `LeleNode` | `<<~ lele … >>` signal / annotation node |
| `PaeNode` | `<<~ pae … >>` phase boundary |
| `TextNode` | Raw prose / wikitext content |
| `SigilNode` | `<<~ sigil … >>` inline sigil reference |
| `DynamicNode` | `<<~ dyn … >>` runtime-evaluated node |
| `CarrierNode` | Root wrapper produced by `parseMemeCarrier` |

## Compile target

`ast.ts` imports `PranalaEdge`, `GrammarRules`, `SigilRule` from `@lararium/mesh` (no circular dep). All AST node types compile into the `memetic-parser` CJS module.

<<~/ahu >>

<<~&#x0003;>>

<<~ pranala ? -> lar:///ha.ka.ba/@lararium/mesh/v0.1/ast family:dataflow role:receives >>
<<~ pranala ? -> lar:///ha.ka.ba/@lararium/tw5/v0.1/parser family:dataflow role:produces >>

<<~&#x0004; -> ? >>
