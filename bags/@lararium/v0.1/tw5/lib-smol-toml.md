<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/tw5/lib/smol-toml >>
```toml iam
uri-path     = "ha.ka.ba/@lararium/v0.1/tw5/lib-smol-toml"
file-path    = "bags/@lararium/v0.1/tw5/lib-smol-toml.md"
type         = "text/x-memetic-wikitext"
register     = "Synthesis"
mana         = 17
manao        = 16
manaoio      = 16
role         = "TW5 library tiddler: smol-toml TOML parser, spec-compliant, ~26 kB, sync, no WASM"
cacheable    = true
retain       = true
```

<<~ &#x0002; >>

<<~ ahu #head >>

# smol-toml Library Tiddler

`lar:///ha.ka.ba/@lararium/tw5/lib/smol-toml` — smol-toml packaged as a TW5 `module-type: library`.

Ships inside the `lar:///plugins/lares/memetic-wikitext` plugin. One copy of the parser
travels in the plugin; all module tiddlers that parse TOML require it by tiddler title:

```
const { parse } = require("lar:///ha.ka.ba/@lararium/tw5/lib/smol-toml");
```

The compiled JS body generates from `src/lib-smol-toml.ts` during `build:plugin`.
Vite externalizes the `smol-toml` npm import in every other module bundle and rewrites
the import to this `require()` call via `rollupOptions.output.paths`.

<<~/ahu >>

<<~ ahu #consumers >>

## Consumers

- `toml-ast.ts` — `parseTaploFields` for `#iam` field extraction (deserialize-time)
- future `toml` data-fence widget — named TOML blocks at render-time
- operator-authored module tiddlers that declare TOML-structured data

<<~/ahu >>

<<~ ahu #design-notes >>

## Design Notes

smol-toml selected over alternatives:

- Pure JS — no WASM init step; runs sync; isomorphic Node + browser
- Spec-compliant — full TOML 1.0 including inline comments, multi-line strings, typed values
- Small — ~26 kB; largest single dependency in the plugin bundle
- `@taplo/lib` remains the write/format surface (WASM, lazy-loaded) — comment-preserving patch

Named TOML blocks (profile name present, profile != `iam`) surface as data accessible to the
widget layer. The UEFN device / Verse work drives this: TOML blocks describe device placement,
component properties, and tick-scoped state in a WYSIWYG-friendly field structure.

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #to-toml-ast ? -> lar:///ha.ka.ba/@lararium/tw5/modules/toml-ast family:data role:consumed-by >>
<<~ pranala #to-sigil-toml ? -> lar:///ha.ka.ba/@lararium/tw5/tiddlers/sigil-toml family:data role:parsed-by >>
<<~ pranala #to-plugin ? -> lar:///plugins/lares/memetic-wikitext family:control role:contained-in >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
