<!-- <<~ !DOCTYPE = lar:///ha.ka.ba/@lares/v0.1/api/pono/memetic-wikitext >> -->

<<~ &#x0001; ? -> lar:///ha.ka.ba/@lararium/v0.1/mesh/genesis-doc >>
```toml iam
cacheable   = true
file-path   = "bags/@lararium/v0.1/mesh/genesis-doc.md"
mana        = 18
manao       = 18
manaoio     = 17
register    = "Synthesis"
retain      = true
role        = "Platform-neutral genesis island builder: GenesisInputs → GenesisArtifact. No filesystem, no DOM."
source-file = "packages/lararium-mesh/src/genesis-doc.ts"
tagspace    = "lararium"
type        = "text/x-memetic-wikitext"
uri-path    = "ha.ka.ba/@lararium/v0.1/mesh/genesis-doc"
```

<<~ &#x0002; >>

# Genesis Doc Builder

Platform-neutral genesis island construction. Lives in `@lararium/mesh`.
No filesystem, no DOM, no `@lararium/tw5` dependency.

Callers supply assembled byte inputs. `buildGenesisDoc()` constructs the deterministic
`LarDoc` Automerge binary and runs two-pass CID injection. The artifact bytes write
to any sink: disk, IndexedDB, bundler inline, test fixture.

<<~ ahu #types >>

## Types

| Type | Role |
|---|---|
| `PluginBuildAttestation` | Schema written by `@lararium/tw5` `build-plugin-tiddler.ts`. Promoted to shared mesh contract so the genesis builder and plugin build pipeline speak the same type without coupling `@lararium/node` to `@lararium/tw5`. Format: `"lararium-tw5-plugin-build/v1"`. |
| `GenesisPluginEntry` | One vendored plugin blob plus its optional attestation. All optional fields use `exactOptionalPropertyTypes`. |
| `GenesisInputs` | Full caller-assembled input bag: `actorSeed` (hex), `coreBlob`, `coreVersion`, optional `coreSha256`, `plugins`, `systemTitles`. |
| `GenesisArtifact` | Output: `bytes`, `sha256`, `cid`, `preSha256`. All four fields serve different verification needs. |

<<~/ahu >>

<<~ ahu #invariants >>

## Invariants

**GD-1 — No platform dependencies.**
`buildGenesisDoc()` imports only `@automerge/automerge` and mesh-internal modules.
Zero `fs`, `path`, `worker_threads`, DOM, or `@lararium/tw5` references.

**GD-2 — Caller owns byte acquisition.**
`GenesisInputs.coreBlob` and `GenesisInputs.plugins[*].blob` arrive as `Uint8Array`.
How the caller obtained them — `readFileSync`, `fetch`, bundler inline, test fixture —
is a platform concern outside this module.

**GD-3 — Caller owns systemTitles.**
`buildGenesisDoc()` does not boot a TW5Engine. The caller boots one and passes the
title list. This keeps `@lararium/tw5` out of the mesh dependency graph.

**GD-4 — Two-pass CID injection is honest, not a true fixpoint.**
Pass 1: serialize without the self-ref tiddler → `preSha256`.
Pass 2: inject the genesis-cid tiddler with the witness CID → final bytes.
Invariant: strip the genesis-cid tiddler and hash the result → `preSha256`. Verifiable without fixpoint.

**GD-5 — Determinism via actorSeed.**
The caller derives `actorSeed` as `sha256hex(sorted content hashes of all inputs)`.
Two builds from identical source produce identical `island.sha256`.

<<~/ahu >>

<<~ ahu #layer-split >>

## Layer Split

The three-layer split that governs where genesis code lives:

| Layer | Concern | Lives in |
|---|---|---|
| A | Read blobs from disk / fetch / bundler; derive actorSeed; boot TW5Engine for systemTitles | `@lararium/node` build script, browser build tool, or test harness |
| B | Construct deterministic LarDoc; two-pass CID injection | `@lararium/mesh` (`genesis-doc.ts`) |
| C | Write artifact bytes to disk / IndexedDB / test fixture | Layer A caller |

<<~/ahu >>

<<~ ahu #edges >>

## Edges

<<~ pranala #alignment-plan ? -> lar:///ha.ka.ba/@lararium/v0.1/mesh/alignment-plan family:reference role:implements >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/base-doc >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/lar-uris >>
<<~ loulou lar:///ha.ka.ba/@lararium/v0.1/mesh/crypto >>

<<~/ahu >>

<<~ &#x0003; >>

<<~ &#x0004; -> ? >>
