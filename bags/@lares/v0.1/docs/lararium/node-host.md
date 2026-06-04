<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lararium/node-host >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/docs/lararium/node-host"
file-path = "bags/@lares/v0.1/docs/lararium/node-host.md"
type  = "text/x-memetic-wikitext"
register      = "CS"
confidence    = 17
mana          = 17
manao         = 17
manaoio       = 16
tagspace      = "stable"
role          = "lararium-node host: lares/ walker, meme graph loader, interface URI bootstrap list"
cacheable     = true
retain        = true
status-date   = "2026-04-30"
source-symbol = "*"
```



<<~ ahu #head >>

# Node Host

The Lararium node host walks `lares/` at startup, indexes all carrier files
into a `MemeGraph`, and bootstraps the corpus for MCP and Automerge sync.
Three interface URIs load in Phase 1, before the full index builds —
they gate corpus validation and filter evaluation.

<<~/ahu >>

<<~&#x0002; >>

<<~ ahu #law >>

## Law

`LARES_ROOT` resolves relative to the compiled `dist/` directory:
`dist/` → `../../../lares/` = monorepo root `lares/`.

Phase 1 interface loading precedes full index construction.
The three interface URIs below load unconditionally:
they define the structural classification vocabulary the index depends on.

<<~/ahu >>

<<~ ahu #schema >>

## Schema (machine-readable)

```toml
# Phase 1 interface URIs — loaded before index construction
# Source: INTERFACE_URIS in packages/lararium-node/src/node-host.ts
interface-uris = [
  "lar:///ha.ka.ba/@lares/v0.1/api/pono/meme",
  "lar:///ha.ka.ba/@lares/v0.1/api/pono/loci",
  "lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant",
]

# Compiler entry point — first meme loaded by the graph compiler
# Source: ENTRY_URI in packages/lararium-mesh/src/compiler.ts
entry-uri = "lar:///AGENTS"

# Lares root path — relative from compiled dist/, resolves to monorepo lares/
lares-root-from-dist = "../../../lares"
```

<<~/ahu >>

<<~ ahu #http-transport >>

## HTTP Transport

```toml
# Source: packages/lararium-mcp/src/http.ts
default-port = 3737
default-host = "127.0.0.1"
mcp-path     = "/mcp"

# Env overrides
env-port = "LARARIUM_HTTP_PORT"
env-host = "LARARIUM_HTTP_HOST"

# Canvas bridge API paths (fetchCanvas targets in stdio.ts)
canvas-api-rooms = "/api/rooms"
canvas-api-fire  = "/api/fire"

# Write guard env
env-write-mode = "LARARIUM_WRITE_MODE"
write-mode-value-required = "enabled"
```

<<~/ahu >>

<<~ ahu #source >>

## Source

`packages/lararium-node/src/node-host.ts` — not packageable as CJS (Node-only path resolution, `@lares/core` import).

```typescript
/**
 * @deprecated web2-era — all functions dead. See node-host.web2.ts for the original.
 * Rebuild target: meme-node-host.ts
 *   readCarrier        → readMeme (parseMemeText from @lararium/mesh/meme-ast)
 *   compileCarrierIndex → compileMemeIndex (MemeRecord not CarrierRecord)
 *   compileBootArtifact → compileBootArtifact (same shape; new parser)
 *   loadGrammarRules   → grammarRulesFromText (@lararium/mesh/meme-grammar)
 */

import { join } from "path";
import { laresRoot, repoRoot } from "@lares/core";
import { chapelRoot } from "@lares/chapel-perilous-opens";

export const LARES_ROOT        = laresRoot;
export const LARES_MEMES_ROOT  = join(laresRoot, "memes");
export const CHAPEL_MEMES_ROOT = join(chapelRoot, "memes");
export const REPO_ROOT         = repoRoot;

export interface CorpusSource {
  name:   string;
  path:   string;
  bag:    string;
  quine?: true;
}
```

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #corpus-sources ? -> lar:///ha.ka.ba/@lararium/tw5/schema/corpus-sources family:control role:depends >>
<<~ pranala #to-meme ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/meme family:control role:implements >>
<<~ pranala #to-loci ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/loci family:control role:implements >>
<<~ pranala #to-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:implements >>

<<~/ahu >>

<<~&#x0003; >>

<<~&#x0004; -> ? >>
