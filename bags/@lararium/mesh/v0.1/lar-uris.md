<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/api/v0.1/pono/memetic-wikitext >> -->

<<~&#x0001; ? -> lar:///ha.ka.ba/@lararium/mesh/v0.1/lar-uris >>
```toml iam
uri-path     = "ha.ka.ba/@lararium/mesh/v0.1/lar-uris"
file-path    = "bags/@lararium/mesh/v0.1/lar-uris.md"
type         = "text/x-memetic-wikitext"
register     = "CS"
confidence   = 0.84
mana         = 0.84
role         = "lar:/// namespace root-doc URI constants and builders for the Lararium mesh"
tagspace     = "lararium"
cacheable    = true
retain       = true
```
<<~&#x0002;>>

<<~ ahu #contract >>

## lar:/// Root-Doc Namespace Grammar

Six reserved root-doc identities at pos-1 of the lar:/// path, in two planes:

**Content plane (ha/ka/ba — engine / catalog / persona):**
- `@lararium` — ha: engine bag, grammar, admin wikis, system recipes
- `@catalog`  — ka: corpus discovery, user wikis, corpus recipes
- `@lares`    — ba: persona / doctrine / agent recipes

**Social plane (ha/ka/ba — identity / authority / session):**
- `@identities` — ha: stable principal records (operators, agents, devices)
- `@circles`    — ka: collective authority + durable group membership
- `@sessions`   — ba: live operator-agent session docs

**Position semantics:**
- pos 0 — tagspace host: `ha.ka.ba`
- pos 1 — `@`-prefixed root-doc identity (exactly the six slots above)
- pos 2 — `@`-prefixed child-doc identity OR plain leaf path segment
- pos 3+ — plain leaf path segments, never `@`-prefixed

**Oracle chain (tiddlers field authoritative at every level):**
```
fragment → @lararium tiddlers[CATALOG_DOC_URI]      → @catalog bag
                     tiddlers[LARES_DOC_URI]        → @lares bag
                     tiddlers[IDENTITIES_DOC_URI]   → @identities bag
                     tiddlers[CIRCLES_DOC_URI]      → @circles bag
                     tiddlers[SESSIONS_DOC_URI]     → @sessions bag
@catalog tiddlers[corpusLarUri(slug)]  → corpus child-bag
         tiddlers[wikiLarUri(slug)]    → wiki bag
```

**URI builders exported:**
- `corpusLarUri(slug)` → `lar:///ha.ka.ba/@catalog/@{slug}`
- `wikiLarUri(slug)` → `lar:///ha.ka.ba/@lararium/wikis/{slug}`
- `wikiDraftLarUri(slug)` → `lar:///ha.ka.ba/@lararium/wikis/{slug}/draft`

<<~/ahu >>

<<~ ahu #edges >>
<<~ pranala #see-lar-uri ? -> lar:///ha.ka.ba/@lares/api/v0.1/pono/lar-uri family:ref role:extends >>
<<~/ahu >>
