<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lares/v0.1/docs/lararium/corpus-sources >>
```toml iam
uri-path = "ha.ka.ba/@lares/v0.1/docs/lararium/corpus-sources"
file-path = "bags/@lares/v0.1/docs/lararium/corpus-sources.md"
type = "text/x-memetic-wikitext"
register     = "Synthesis-Canon"
mana         = 18
manao        = 18
manaoio      = 17
tagspace     = "stable"
role         = "invariant registry: all corpus bag targets in the monorepo; each maps to one Automerge doc"
cacheable    = true
retain       = true
invariant    = true
status-date  = "2026-04-30"
source-symbol = "CORPUS_SOURCES"
```



<<~ ahu #head >>

# Corpus Sources — Registry

Five corpus bag targets compose SDM+.
Each maps to one Automerge doc.
The recipe layer composes them for any given room or view.

<<~/ahu >>

<<~ &#x0002; >>

<<~ ahu #law >>

## Law

A corpus source MUST carry:

```toml
name  — pnpm workspace package name (@lararium/corpus-<slug>)
path  — relative path from monorepo root
bag   — Automerge bag name (matches LarTiddlerRecord["bag"])
```

The loader discovers carrier files by walking the corpus path at hydration time.
It produces `LarTiddlerRecord[]` via the projection codec — one record per tiddler.
Carrier text does not travel to Automerge directly.

The quine-corpus (`lares`) differs: it also defines the infrastructure the machinery reads.
It hydrates before all other corpora. All other corpora treat it as read-only at runtime.

<<~/ahu >>

<<~ ahu #registry >>

## Registry

```toml
[[corpus]]
name  = "@lares/core"
path  = "packages/lares-core/memes"
bag   = "lares"
quine = true
note  = "infrastructure-as-myth corpus; quine-corpus; hydrates first"

[[corpus]]
name  = "@lares/chapel-perilous-opens"
path  = "packages/lares-chapel-perilous-opens/memes"
bag   = "lares"
note  = "unstable tagspace; three-segment tuple-root memes not yet stabilised; URI: lar:///{a.b.c}/**"

[[corpus]]
name  = "@lararium/corpus-elyncia"
path  = "elyncia"
bag   = "elyncia"
note  = "Elyncia game setting — world, factions, NPCs, regions"

[[corpus]]
name  = "@lararium/corpus-ftls"
path  = "ftls"
bag   = "ftls"
note  = "Flying Triremes and Laser Swords rules corpus"

[[corpus]]
name  = "@lararium/corpus-sdm"
path  = "sdm"
bag   = "sdm"
note  = "Synthetic Dream Machine core rules corpus"

[[corpus]]
name  = "@lararium/corpus-wtf"
path  = "wtf"
bag   = "wtf"
note  = "Wizard.Thief.Fighter rules corpus"

[[corpus]]
name     = "@lararium/mesh"
path     = "packages/lararium-mesh/memes"
bag      = "lararium"
uri-rule = "lar:///ha.ka.ba/@lararium/mesh/v{version}/**"
note     = "engine self-doc memes for @lararium/mesh TypeScript symbols"

[[corpus]]
name     = "@lararium/tw5"
path     = "packages/lararium-tw5/memes"
bag      = "lararium"
uri-rule = "lar:///ha.ka.ba/@lararium/tw5/v{version}/**"
note     = "engine self-doc memes for @lararium/tw5 TypeScript symbols + compiled CJS tiddlers"

[[corpus]]
name     = "@lararium/node"
path     = "packages/lararium-node/memes"
bag      = "lararium"
uri-rule = "lar:///ha.ka.ba/@lararium/node/v{version}/**"
note     = "engine self-doc memes for @lararium/node TypeScript symbols"
```

<<~/ahu >>

<<~ ahu #bag-recipe-topology >>

## Bag/Recipe Topology

```
system bag    ← invariant TW5 boot corpus (read-only)
lararium bag    ← TypeScript self-doc memes + compiled CJS tiddlers; URI: lar:///ha.ka.ba/@lararium/{pkg}/v{ver}/**
lares bag     ← infrastructure-as-myth + chapel-perilous-opens unstable tagspace; quine-corpus; read at runtime by machinery
elyncia bag   ← setting content
ftls bag      ← FTLS rules
sdm bag       ← SDM core rules
wtf bag       ← WTF rules
room bag      ← situated meaning: pins, notes, active artifacts
draft bag     ← local high-churn drafts (not synced to peers)
projection    ← rebuildable shadow; receipt-tagged
```

A recipe composes any subset of these bags for a given view.
SDM+ as a combined view composes: lares + elyncia + ftls + sdm + wtf + room.
A FTLS-only table composes: lares + ftls + room.

<<~/ahu >>

<<~ ahu #edges >>

<<~ pranala #implements-invariant ? -> lar:///ha.ka.ba/@lares/v0.1/api/pono/invariant family:control role:implements >>
<<~ pranala #tiddler-record ? -> lar:///ha.ka.ba/@lararium/tw5/schema/tiddler-record family:data role:depends >>
<<~ pranala #projection-codec ? -> lar:///ha.ka.ba/@lararium/v0.1/tw5/schema/projection-codec family:data role:depends >>
<<~ pranala #source-file ? -> packages/lararium-tw5/src/corpus-sources.ts family:code role:implements >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
