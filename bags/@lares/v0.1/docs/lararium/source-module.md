<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lararium/source-module >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/docs/lararium/source-module"
file-path = "bags/@lares/v0.1/docs/lararium/source-module.md"
type = "text/x-memetic-wikitext"
tagspace     = "stable"
register     = "Synthesis-Canon"
manaoio      = 15
mana         = 16
manao        = 16
role         = "capability meme for source-module carrier: package TypeScript source files emitted as memes into the graph"
cacheable    = true
retain       = true
```



<<~ ahu #head >>

# Source Module

Verbatim TypeScript source file emitted as a meme into the graph at postbuild time.
Makes monorepo source navigable, queryable, and reactable through lar:/// URIs.

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #ooda-ha >>

✶ detect a postbuild trigger for a priority source file; read verbatim source text
⏿ orient: hash the content; compare against existing carrier in the store
◇ hash matches → no-op; hash differs → overwrite carrier with new source text and built-at timestamp
▶ emit source-module meme at lar:///source/<package>/<path> with origin:operator-import
↺ meme graph now holds current source; agents can read, query, and react to source changes; confirm carrier written; content-hash recorded; no noise or data files emitted

<<~/ahu >>

<<~ ahu #law >>

## Law

A source-module meme carries the verbatim source text of one TypeScript/TSX file
as its body, with structured fields naming its package, path, and exports.

A postbuild script (`write-source-memes.ts`) emits source modules after each `pnpm build`. The script never checks them into `lares/` — it writes them as generated artifacts into the Automerge store at boot.

This makes the monorepo's source navigable through the meme graph:
agents can read, query, and react to source changes as memes.

<<~/ahu >>


<<~ ahu #carrier-shape >>

## Carrier Shape

```toml
uri            = "lar:///source/<package-name>/<relative-src-path>"
               # e.g. lar:///source/lararium-mesh/src/live-protocol.ts

[fields]
package        = "@lararium/mesh"         # pnpm package name
src-path       = "src/live-protocol.ts"   # path relative to package root
lang           = "typescript"             # typescript | tsx | javascript
built-at       = "ISO 8601 timestamp"
content-hash   = "SHA-256 hex of source text"
exports        = ["ReactionGraph", "ReactionBinding", ...]  # named exports
```

The body (`text`) is the verbatim source content.

<<~/ahu >>

<<~ ahu #priority-modules >>

## Priority Modules

These files are the highest-value source-module memes:

```
@lararium/mesh    src/parser.ts           — memetic-wikitext parser
@lararium/mesh    src/ast.ts              — AST node types + LADDER_5/OODA_HA_5
@lararium/mesh    src/causal-island.ts    — causal island doctrine + AuthorityFirstGuard
@lararium/mesh    src/live-protocol.ts    — wire protocol types + ReactionGraph
@lararium/tw5     src/lararium-tw5.ts     — TW5 integration facade
@lararium/app     src/LarariumPanel.tsx   — HUD + TW5 panel component
@lararium/app     src/LarariumShell.tsx   — shell root
```

<<~/ahu >>

<<~ ahu #postbuild-contract >>

## Postbuild Contract

The `write-source-memes.ts` script MUST:

1. Run after each successful build in affected packages.
2. For each priority source file: read, hash, emit a carrier meme into the store.
3. Use origin `{ kind: "operator-import" }` — source memes enter as canon-hydrate peers.
4. Overwrite existing carrier if content-hash differs; no-op if hash matches.
5. Never emit noise or data files — only files with named exports that implement
   invariant capabilities or architectural law.

<<~/ahu >>


<<~ ahu #edges >>

<<~ pranala #has-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:has >>
<<~ pranala #builds-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:has >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
